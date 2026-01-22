// @ts-nocheck
import XLSX from "xlsx";
import { db } from "./db.js";
import { cleanupTempFile } from "./cleanup.js";
import {
    purchases, purchaseItems, sales, salesItems,
    suppliers, customers, warehouses, items, stockLedger
} from "./schema.js";
import { eq, and } from "drizzle-orm";

/**
 * Helper function to format Excel dates
 */
const formatDate = (val: any) => {
    if (!val) return null;
    if (typeof val === 'number') {
        // Excel serial date
        const date = new Date((val - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    if (typeof val === 'string') {
        if (val.includes('-')) return val; // Already YYYY-MM-DD
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return String(val);
};

/**
 * Import Purchases from Excel
 * Expected columns:
 * ID | DATE | SUPPLIER | WAREHOUSE | ITEM | QUANTITY | RATE | PAID_AMOUNT | DUE_DATE
 */
export async function importPurchasesFromExcel(filePath: string) {
    // Read file into buffer for Vercel compatibility
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    // 1. Group rows by ID or Date+Supplier+Warehouse
    const groups: Record<string, any[]> = {};
    rows.forEach(row => {
        const key = row.ID ? String(row.ID) : `${row.DATE}_${row.SUPPLIER}_${row.WAREHOUSE}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });

    const errors: any[] = [];
    let successCount = 0;

    // Cache for lookups
    const supplierMap: Record<string, number> = {};
    const warehouseMap: Record<string, number> = {};
    const itemMap: Record<string, number> = {};

    const allSuppliers = await db.select().from(suppliers);
    allSuppliers.forEach(s => supplierMap[s.name.toLowerCase()] = s.id);

    const allWarehouses = await db.select().from(warehouses);
    allWarehouses.forEach(w => warehouseMap[w.name.toLowerCase()] = w.id);

    const allItems = await db.select().from(items);
    allItems.forEach(i => itemMap[i.name.toLowerCase()] = i.id);

    for (const key in groups) {
        try {
            const groupRows = groups[key];
            const first = groupRows[0];

            const supplierId = supplierMap[String(first.SUPPLIER || "").toLowerCase()];
            const warehouseId = warehouseMap[String(first.WAREHOUSE || "").toLowerCase()];

            if (!supplierId || !warehouseId) {
                throw new Error(`Invalid supplier (${first.SUPPLIER}) or warehouse (${first.WAREHOUSE})`);
            }

            const totalAmount = groupRows.reduce((sum, r) => sum + (Number(r.QUANTITY) * Number(r.RATE)), 0);

            await db.transaction(async (tx) => {
                // Create Purchase
                const [result] = await tx.insert(purchases).values({
                    purchaseDate: formatDate(first.DATE) || String(first.DATE),
                    supplierId,
                    warehouseId,
                    totalAmount: String(totalAmount),
                    payingAmount: String(first.PAID_AMOUNT || 0),
                    dueDate: formatDate(first.DUE_DATE),
                });
                const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, result.insertId));

                for (const r of groupRows) {
                    const itemId = itemMap[String(r.ITEM || "").toLowerCase()];
                    if (!itemId) throw new Error(`Item not found: ${r.ITEM}`);

                    const qty = Number(r.QUANTITY);
                    const rate = Number(r.RATE);
                    const amount = qty * rate;

                    await tx.insert(purchaseItems).values({
                        purchaseId: purchase.id,
                        itemId,
                        quantity: String(qty),
                        rate: String(rate),
                        amount: String(amount),
                    });

                    // Stock Entry
                    await tx.insert(stockLedger).values({
                        itemId,
                        warehouseId,
                        quantity: String(qty),
                        referenceType: "PURCHASE",
                        referenceId: purchase.id,
                    });
                }
            });
            successCount++;
        } catch (err: any) {
            errors.push({ key, error: err.message });
        }
    }

    return { total: Object.keys(groups).length, success: successCount, failed: errors.length, errors };
}

/**
 * Import Sales from Excel
 * Expected columns:
 * ID | DATE | CUSTOMER | WAREHOUSE | ITEM | QUANTITY | RATE | RECEIVED_AMOUNT | DUE_DATE | GST_RATE
 */
export async function importSalesFromExcel(filePath: string) {
    // Read file into buffer for Vercel compatibility
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    const groups: Record<string, any[]> = {};
    rows.forEach(row => {
        const key = row.ID ? String(row.ID) : `${row.DATE}_${row.CUSTOMER}_${row.WAREHOUSE}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });

    const errors: any[] = [];
    let successCount = 0;

    const customerMap: Record<string, number> = {};
    const warehouseMap: Record<string, number> = {};
    const itemMap: Record<string, number> = {};

    const allCustomers = await db.select().from(customers);
    allCustomers.forEach(c => customerMap[c.name.toLowerCase()] = c.id);

    const allWarehouses = await db.select().from(warehouses);
    allWarehouses.forEach(w => warehouseMap[w.name.toLowerCase()] = w.id);

    const allItems = await db.select().from(items);
    allItems.forEach(i => itemMap[i.name.toLowerCase()] = i.id);

    for (const key in groups) {
        try {
            const groupRows = groups[key];
            const first = groupRows[0];

            const customerId = customerMap[String(first.CUSTOMER || "").toLowerCase()];
            const warehouseId = warehouseMap[String(first.WAREHOUSE || "").toLowerCase()];

            if (!customerId || !warehouseId) {
                throw new Error(`Invalid customer (${first.CUSTOMER}) or warehouse (${first.WAREHOUSE})`);
            }

            await db.transaction(async (tx) => {
                let totalTaxable = 0;
                let totalGst = 0;

                // Pre-calculate totals for the Sale header
                const processedItems = groupRows.map(r => {
                    const itemId = itemMap[String(r.ITEM || "").toLowerCase()];
                    if (!itemId) throw new Error(`Item not found: ${r.ITEM}`);
                    const qty = Number(r.QUANTITY);
                    const rate = Number(r.RATE);
                    const amount = qty * rate;
                    const gstRate = Number(r.GST_RATE || 0);
                    const gstAmount = (amount * gstRate) / 100;

                    totalTaxable += amount;
                    totalGst += gstAmount;

                    return { itemId, qty, rate, amount, gstRate, gstAmount, r };
                });

                const totalAmount = totalTaxable + totalGst;

                const [result] = await tx.insert(sales).values({
                    saleDate: formatDate(first.DATE) || String(first.DATE),
                    customerId,
                    warehouseId,
                    totalAmount: String(totalAmount),
                    receivedAmount: String(first.RECEIVED_AMOUNT || 0),
                    dueDate: formatDate(first.DUE_DATE),
                    cgstAmount: String(totalGst / 2), // Default to CGST/SGST split
                    sgstAmount: String(totalGst / 2),
                    igstAmount: "0",
                    ewayBillNumber: first.EWAY_BILL_NO || null,
                });
                const [sale] = await tx.select().from(sales).where(eq(sales.id, result.insertId));

                for (const item of processedItems) {
                    await tx.insert(salesItems).values({
                        saleId: sale.id,
                        itemId: item.itemId,
                        quantity: String(item.qty),
                        rate: String(item.rate),
                        amount: String(item.amount),
                        gstRate: String(item.gstRate),
                        gstAmount: String(item.gstAmount),
                    });

                    await tx.insert(stockLedger).values({
                        itemId: item.itemId,
                        warehouseId,
                        quantity: String(-item.qty),
                        referenceType: "SALE",
                        referenceId: sale.id,
                    });
                }
            });
            successCount++;
        } catch (err: any) {
            errors.push({ key, error: err.message });
        }
    }

    return { total: Object.keys(groups).length, success: successCount, failed: errors.length, errors };
}
