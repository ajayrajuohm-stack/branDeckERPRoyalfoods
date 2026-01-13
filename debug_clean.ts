import "dotenv/config";
import { db } from "./server/db";
import { purchases, supplierPayments, suppliers } from "./shared/schema";
import { eq, asc } from "drizzle-orm";

async function dumpMahesh() {
    const sId = 4; // Mahesh Foods
    const pur = await db.select().from(purchases).where(eq(purchases.supplierId, sId));
    const pay = await db.select().from(supplierPayments).where(eq(supplierPayments.supplierId, sId));

    console.log("=== MAHESH PURCHASES ===");
    pur.forEach(p => console.log(`ID: ${p.id}, Total: ${p.totalAmount}, Paid: ${p.payingAmount}, Date: ${p.purchaseDate}`));

    console.log("=== MAHESH PAYMENTS ===");
    pay.forEach(p => console.log(`ID: ${p.id}, PurID: ${p.purchaseId}, Amount: ${p.amount}, Date: ${p.paymentDate}, Remarks: ${p.remarks}`));

    process.exit(0);
}

dumpMahesh();
