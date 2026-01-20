import { Express } from "express";
import multer from "multer";
import path from "path";
import { eq, desc, sql, and, gte, lte, asc, inArray } from "drizzle-orm";
import { format } from "date-fns";


import { db } from "./db";
import { getCurrentStock } from "./storage/stock";
import { importPurchasesFromExcel, importSalesFromExcel } from "./import-transactions";

import {
  categories,
  unitsOfMeasure,
  warehouses,
  items,
  suppliers,
  customers,
  owners,
  expenseHeads,
  paymentMethods,
  bomRecipes,
  bomLines,
  productionRuns,
  productionConsumptions,
  purchases,
  purchaseItems,
  stockLedger,
  sales,
  salesItems,
  supplierPayments,
  customerPayments,
  stockTransfers,
  adminSettings,
} from "@shared/schema";


/* =======================
   MULTER CONFIG
======================= */
const upload = multer({
  dest: "uploads/",
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".xlsx" && ext !== ".xls") {
      cb(new Error("Only Excel files allowed"));
    } else {
      cb(null, true);
    }
  },
});

export async function registerRoutes(_server: any, app: Express) {
  /* =======================
     SERVICE STATUS MIDDLEWARE
  ======================= */
  app.use(async (req, res, next) => {
    // Skip status check for non-API routes or public auth routes
    if (!req.path.startsWith("/api") ||
      req.path === "/api/health" ||
      req.path === "/api/login" ||
      req.path === "/api/user" ||
      req.path === "/api/logout" ||
      req.path === "/api/admin") {
      return next();
    }

    try {
      const [settings] = await db.select().from(adminSettings).limit(1);
      if (settings && settings.isServiceActive === false) {
        return res.status(403).json({
          message: "Service Suspended. Please contact support.",
          isServiceSuspended: true
        });
      }
      next();
    } catch (err) {
      console.error("Error checking service status:", err);
      next(); // Fail-safe: let it pass if DB check fails
    }
  });

  /* =======================
     HEALTH
  ======================= */
  console.log("Registering API routes - Version: 1.0.1");
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  /* =======================
     ERROR HANDLER
  ======================= */
  const handleDbError = (err: any, res: any) => {
    console.error("Database error:", err);
    let errorMessage = "Internal server error";
    if (err?.code === "23505") errorMessage = "A record with this information already exists";
    else if (err?.code === "23503") errorMessage = "Cannot delete/update because it is referenced by other records.";
    else if (err?.message) errorMessage = err.message;
    res.status(500).json({ message: errorMessage });
  };

  // 🔹 DEBUG: INSPECT DATABASE STATE (PAYMENTS/PURCHASES)
  app.get("/api/debug/inspect-payments", async (_req, res) => {
    try {
      const [sp, cp, p, s] = await Promise.all([
        db.select().from(supplierPayments),
        db.select().from(customerPayments),
        db.select().from(purchases).orderBy(asc(purchases.id)),
        db.select().from(sales).orderBy(asc(sales.id))
      ]);
      res.json({ supplierPayments: sp, customerPayments: cp, purchases: p, sales: s });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 IMPORT PURCHASES
  app.post("/api/purchases/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const result = await importPurchasesFromExcel(req.file.path);
      res.json(result);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 IMPORT SALES
  app.post("/api/sales/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const result = await importSalesFromExcel(req.file.path);
      res.json(result);
    } catch (err) {
      handleDbError(err, res);
    }
  });


  // 🔹 SYNC BALANCES (FIX OUT-OF-SYNC PAYMENTS)
  app.get("/api/debug/sync-balances", async (_req, res) => {
    try {
      console.log("Starting master balance synchronization...");

      // 1. DELETE OLD HEALING RECORDS to start from a clean state of truth
      await db.delete(supplierPayments).where(sql`${supplierPayments.remarks} LIKE 'Healed by sync-balances%'`);
      await db.delete(customerPayments).where(sql`${customerPayments.remarks} LIKE 'Healed by sync-balances%'`);

      // 2. FETCH EVERYTHING
      const [allPurchases, allSPayments, allSales, allCPayments, allOwners] = await Promise.all([
        db.select().from(purchases).orderBy(asc(purchases.id)),
        db.select().from(supplierPayments),
        db.select().from(sales).orderBy(asc(sales.id)),
        db.select().from(customerPayments),
        db.select().from(owners).limit(1)
      ]);
      const owner = allOwners.length > 0 ? allOwners[0] : null;

      if (!owner) {
        console.warn("Sync Balances: No owner found in database. 'Healing' inserts will be skipped.");
      }

      // 3. AGGRESSIVE DEDUPLICATION: Kill exact duplicates (same amount, month, invoice)
      // We do this before linking to ensure we don't 'reify' duplicates.
      const dedupe = (list: any[], table: any, linkKey: string) => {
        const seen = new Set<string>();
        const toDelete: number[] = [];
        for (const p of list) {
          const key = `${p[linkKey] || 'null'}-${Number(p.amount)}-${p.paymentDate}-${p.supplierId || p.customerId}`;
          if (seen.has(key) && (p.remarks || "").indexOf("Initial") === -1) toDelete.push(p.id);
          else seen.add(key);
        }
        return toDelete;
      };

      const spDelete = dedupe(allSPayments, supplierPayments, 'purchaseId');
      if (spDelete.length > 0) await db.delete(supplierPayments).where(inArray(supplierPayments.id, spDelete));

      const cpDelete = dedupe(allCPayments, customerPayments, 'saleId');
      if (cpDelete.length > 0) await db.delete(customerPayments).where(inArray(customerPayments.id, cpDelete));

      // Refresh data after dedupe
      const [finalSP, finalCP] = await Promise.all([db.select().from(supplierPayments), db.select().from(customerPayments)]);

      // 4. RESET BALANCES IN MEMORY (Greedy re-calculation)
      const pMap = new Map<number, number>(); // purchaseId -> currentPayingAmount
      allPurchases.forEach(p => pMap.set(p.id, 0));

      const sMap = new Map<number, number>(); // saleId -> currentReceivedAmount
      allSales.forEach(s => sMap.set(s.id, 0));

      // 5. PROCESS SUPPLIER PAYMENTS
      for (const p of finalSP) {
        let targetId = p.purchaseId;
        // If unlinked, or linked to a purchase of a different supplier (sanity check)
        if (!targetId || (allPurchases.find(x => x.id === targetId)?.supplierId !== p.supplierId)) {
          // Greedy link to oldest outstanding purchase
          const oldest = allPurchases.find(pur =>
            pur.supplierId === p.supplierId &&
            (Number(pur.totalAmount) - (pMap.get(pur.id) || 0) > 0.01)
          );
          if (oldest) {
            targetId = oldest.id;
            await db.update(supplierPayments).set({ purchaseId: targetId }).where(eq(supplierPayments.id, p.id));
          }
        }
        if (targetId) {
          pMap.set(targetId, (pMap.get(targetId) || 0) + Number(p.amount));
        }
      }

      // 6. PROCESS CUSTOMER RECEIPTS
      for (const p of finalCP) {
        let targetId = p.saleId;
        if (!targetId || (allSales.find(x => x.id === targetId)?.customerId !== p.customerId)) {
          const oldest = allSales.find(s =>
            s.customerId === p.customerId &&
            (Number(s.totalAmount) - (sMap.get(s.id) || 0) > 0.01)
          );
          if (oldest) {
            targetId = oldest.id;
            await db.update(customerPayments).set({ saleId: targetId }).where(eq(customerPayments.id, p.id));
          }
        }
        if (targetId) {
          sMap.set(targetId, (sMap.get(targetId) || 0) + Number(p.amount));
        }
      }

      // 7. HEAL REMAINING GAPS (If user had recorded a balance without a payment record)
      // This is the safety net.
      for (const pur of allPurchases) {
        const recorded = Number(pur.payingAmount) || 0;
        const linked = pMap.get(pur.id) || 0;
        const gap = recorded - linked;

        if (gap > 0.01 && owner) {
          console.log(`Healing Purchase #${pur.id}: adding back ${gap}`);
          await db.insert(supplierPayments).values({
            paymentDate: pur.purchaseDate,
            supplierId: pur.supplierId,
            purchaseId: pur.id,
            ownerId: owner.id,
            amount: String(gap),
            paymentMethod: "Cash",
            remarks: "Healed by sync-balances (balance gap fix)",
          });
          pMap.set(pur.id, recorded); // Now in sync
        }
      }

      for (const sale of allSales) {
        const recorded = Number(sale.receivedAmount) || 0;
        const linked = sMap.get(sale.id) || 0;
        const gap = recorded - linked;

        if (gap > 0.01 && owner) {
          console.log(`Healing Sale #${sale.id}: adding back ${gap}`);
          await db.insert(customerPayments).values({
            paymentDate: sale.saleDate,
            customerId: sale.customerId,
            saleId: sale.id,
            ownerId: owner.id,
            amount: String(gap),
            paymentMethod: "Cash",
            remarks: "Healed by sync-balances (balance gap fix)",
          });
          sMap.set(sale.id, recorded);
        }
      }

      // 8. FINAL WRITE-BACK TO TABLES
      // This ensures reports and transaction lists see the same aggregated truth.
      for (const [id, amt] of Array.from(pMap.entries())) {
        await db.update(purchases).set({ payingAmount: String(amt) }).where(eq(purchases.id, id));
      }
      for (const [id, amt] of Array.from(sMap.entries())) {
        await db.update(sales).set({ receivedAmount: String(amt) }).where(eq(sales.id, id));
      }

      res.json({ message: "Master synchronization complete. Balances are now consistent across all reports and lists." });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 SYNC STOCK LEVELS
  // Optimized bulk cleanup using SQL to prevent timeouts
  app.post("/api/debug/sync-stock", async (_req, res) => {
    try {
      console.log("Starting Optimized Stock Ledger Sync...");

      // 1. Purge PRODUCTION orphans (entries where run no longer exists)
      await db.execute(sql`
        DELETE FROM stock_ledger 
        WHERE reference_type LIKE 'PRODUCTION%' 
        AND reference_id NOT IN (SELECT id FROM production_runs)
      `);

      // 2. Purge PURCHASE orphans
      await db.execute(sql`
        DELETE FROM stock_ledger 
        WHERE reference_type LIKE 'PURCHASE%' 
        AND reference_id NOT IN (SELECT id FROM purchases)
      `);

      // 3. Purge SALE orphans
      await db.execute(sql`
        DELETE FROM stock_ledger 
        WHERE reference_type LIKE 'SALE%' 
        AND reference_id NOT IN (SELECT id FROM sales)
      `);

      console.log("Stock Ledger Sync Complete.");
      res.json({
        message: "Stock synchronized successfully. All orphaned entries from deleted transactions have been purged. Your stock levels are now accurate."
      });
    } catch (err) {
      console.error("Sync Stock Error:", err);
      handleDbError(err, res);
    }
  });

  /* =======================
     GENERIC LIST
  ======================= */
  const list = async (table: any, res: any) => {
    try {
      const rows = await db.select().from(table);
      res.json({ data: rows });
    } catch (err) {
      handleDbError(err, res);
    }
  };

  /* =======================
     MASTERS - CRUD OPERATIONS
  ======================= */

  // Generic CREATE function
  const create = async (table: any, data: any, res: any) => {
    try {
      // Ensure numeric fields are properly formatted for items table
      if (table === items) {
        console.log("Updating Item:", data);
        if (data.reorderLevel !== undefined) {
          data.reorderLevel = String(data.reorderLevel);
        }
        if (data.gstRate !== undefined) {
          data.gstRate = String(data.gstRate);
        }
      }

      const result = await db.insert(table).values(data).returning();
      const inserted = Array.isArray(result) ? result[0] : result;
      res.status(201).json(inserted);
    } catch (err) {
      handleDbError(err, res);
    }
  };

  // Generic UPDATE function
  const update = async (table: any, id: number, data: any, res: any) => {
    try {
      // Ensure numeric fields are properly formatted for items table
      if (table === items) {
        console.log("Updating Item ID:", id, "Data:", data);
        if (data.reorderLevel !== undefined) {
          data.reorderLevel = String(data.reorderLevel);
        }
        if (data.gstRate !== undefined) {
          data.gstRate = String(data.gstRate);
        }
      }

      const result = await db.update(table).set(data).where(eq(table.id, id)).returning();
      const updated = Array.isArray(result) ? result[0] : result;
      if (!updated) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.json(updated);
    } catch (err) {
      handleDbError(err, res);
    }
  };

  // Generic DELETE function
  const remove = async (table: any, id: number, res: any) => {
    try {
      await db.delete(table).where(eq(table.id, id));
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      handleDbError(err, res);
    }
  };

  // Categories
  app.get("/api/categories", async (_req, res) => list(categories, res));
  app.post("/api/categories", async (req, res) => create(categories, req.body, res));
  app.put("/api/categories/:id", async (req, res) => update(categories, parseInt(req.params.id), req.body, res));
  app.delete("/api/categories/:id", async (req, res) => remove(categories, parseInt(req.params.id), res));

  // UOMs
  app.get("/api/uoms", async (_req, res) => list(unitsOfMeasure, res));
  app.post("/api/uoms", async (req, res) => create(unitsOfMeasure, req.body, res));
  app.put("/api/uoms/:id", async (req, res) => update(unitsOfMeasure, parseInt(req.params.id), req.body, res));
  app.delete("/api/uoms/:id", async (req, res) => remove(unitsOfMeasure, parseInt(req.params.id), res));

  // Warehouses
  app.get("/api/warehouses", async (_req, res) => list(warehouses, res));
  app.post("/api/warehouses", async (req, res) => create(warehouses, req.body, res));
  app.put("/api/warehouses/:id", async (req, res) => update(warehouses, parseInt(req.params.id), req.body, res));
  app.delete("/api/warehouses/:id", async (req, res) => remove(warehouses, parseInt(req.params.id), res));

  // Items (with category join for filtering)
  app.get("/api/items", async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: items.id,
          name: items.name,
          categoryId: items.categoryId,
          defaultUomId: items.defaultUomId,
          reorderLevel: items.reorderLevel,
          isActive: items.isActive,
          createdAt: items.createdAt,
          categoryType: categories.type,
          categoryName: categories.name,
          hsnCode: items.hsnCode,
          gstRate: items.gstRate,
        })
        .from(items)
        .leftJoin(categories, eq(items.categoryId, categories.id));
      res.json({ data: rows });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app.post("/api/items", async (req, res) => create(items, req.body, res));
  app.put("/api/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, categoryId, defaultUomId, reorderLevel, hsnCode, gstRate, isActive } = req.body;

      console.log(`[DEBUG] Updating Item ${id}:`, req.body);

      const result = await db.update(items)
        .set({
          name,
          categoryId,
          defaultUomId,
          reorderLevel: String(reorderLevel || 0),
          hsnCode,
          gstRate: String(gstRate || 0),
          isActive
        })
        .where(eq(items.id, id))
        .returning();

      if (!result.length) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json(result[0]);
    } catch (e) {
      handleDbError(e, res);
    }
  });
  app.delete("/api/items/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);

      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      // Check if item exists
      const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Check for references in active transactions only
      // Stock ledger is just an audit trail, so we don't block deletion based on it
      const references: string[] = [];

      try {
        const bomRecipeCheck = await db.select().from(bomRecipes).where(eq(bomRecipes.outputItemId, itemId)).limit(1);
        if (bomRecipeCheck.length > 0) references.push("BOM recipes (as output item)");

        const bomLineCheck = await db.select().from(bomLines).where(eq(bomLines.itemId, itemId)).limit(1);
        if (bomLineCheck.length > 0) references.push("BOM lines");

        const productionRunCheck = await db.select().from(productionRuns).where(eq(productionRuns.outputItemId, itemId)).limit(1);
        if (productionRunCheck.length > 0) references.push("Production runs (as output item)");

        const productionConsumptionCheck = await db.select().from(productionConsumptions).where(eq(productionConsumptions.itemId, itemId)).limit(1);
        if (productionConsumptionCheck.length > 0) references.push("Production consumptions");

        const purchaseItemCheck = await db.select().from(purchaseItems).where(eq(purchaseItems.itemId, itemId)).limit(1);
        if (purchaseItemCheck.length > 0) references.push("Purchase items");

        const saleItemCheck = await db.select().from(salesItems).where(eq(salesItems.itemId, itemId)).limit(1);
        if (saleItemCheck.length > 0) references.push("Sale items");

        // Note: Stock ledger entries are not checked - they're just audit trail
        // Items can be deleted even if they have stock ledger history
      } catch (checkErr) {
        console.error("Error checking references:", checkErr);
        // Continue with deletion attempt - database constraints will catch it if needed
      }

      // If item is referenced in active transactions, return error with details
      if (references.length > 0) {
        return res.status(400).json({
          message: `Cannot delete item. It is currently referenced in: ${references.join(", ")}. Please remove these references first.`
        });
      }

      // Delete stock ledger entries first (they're just audit trail)
      // This allows deletion even if item has stock history
      await db.delete(stockLedger).where(eq(stockLedger.itemId, itemId));

      // Safe to delete the item
      await db.delete(items).where(eq(items.id, itemId));
      res.json({ message: "Deleted successfully" });
    } catch (err: any) {
      console.error("Delete item error:", err);
      handleDbError(err, res);
    }
  });

  // Suppliers
  app.get("/api/suppliers", async (_req, res) => list(suppliers, res));
  app.post("/api/suppliers", async (req, res) => create(suppliers, req.body, res));
  app.put("/api/suppliers/:id", async (req, res) => update(suppliers, parseInt(req.params.id), req.body, res));
  app.delete("/api/suppliers/:id", async (req, res) => remove(suppliers, parseInt(req.params.id), res));

  // Customers
  app.get("/api/customers", async (_req, res) => list(customers, res));
  app.post("/api/customers", async (req, res) => create(customers, req.body, res));
  app.put("/api/customers/:id", async (req, res) => update(customers, parseInt(req.params.id), req.body, res));
  app.delete("/api/customers/:id", async (req, res) => remove(customers, parseInt(req.params.id), res));

  // Owners
  app.get("/api/owners", async (_req, res) => list(owners, res));
  app.post("/api/owners", async (req, res) => create(owners, req.body, res));
  app.put("/api/owners/:id", async (req, res) => update(owners, parseInt(req.params.id), req.body, res));
  app.delete("/api/owners/:id", async (req, res) => remove(owners, parseInt(req.params.id), res));

  // Expense Heads
  app.get("/api/expense-heads", async (_req, res) => list(expenseHeads, res));
  app.post("/api/expense-heads", async (req, res) => create(expenseHeads, req.body, res));
  app.put("/api/expense-heads/:id", async (req, res) => update(expenseHeads, parseInt(req.params.id), req.body, res));
  app.delete("/api/expense-heads/:id", async (req, res) => remove(expenseHeads, parseInt(req.params.id), res));

  // Payment Methods
  app.get("/api/payment-methods", async (_req, res) => list(paymentMethods, res));
  app.post("/api/payment-methods", async (req, res) => create(paymentMethods, req.body, res));
  app.put("/api/payment-methods/:id", async (req, res) => update(paymentMethods, parseInt(req.params.id), req.body, res));
  app.delete("/api/payment-methods/:id", async (req, res) => remove(paymentMethods, parseInt(req.params.id), res));

  /* =======================
     PURCHASES
  ======================= */

  // 🔹 GET PURCHASES (WITH JOINS)
  app.get("/api/purchases", async (_req, res) => {
    const rows = await db.query.purchases.findMany({
      with: {
        supplier: true,
        warehouse: true,
        items: {
          with: {
            item: true,
          },
        },
      },
      orderBy: (p, { desc }) => [desc(p.purchaseDate)],
    });

    const formatted = rows.map((p) => ({
      id: p.id,
      purchaseDate: p.purchaseDate,
      supplierId: p.supplierId,
      warehouseId: p.warehouseId,
      supplier: p.supplier?.name ?? "-",
      warehouse: p.warehouse?.name ?? "-",
      totalAmount: p.totalAmount,
      payingAmount: p.payingAmount,
      dueDate: p.dueDate,
      lineItems: p.items.map((i) => ({
        itemId: i.itemId,
        item: i.item?.name ?? "-",
        quantity: i.quantity,
        rate: i.rate,
        amount: i.amount,
      })),
    }));

    res.json(formatted);
  });

  // 🔹 CREATE PURCHASE
  app.post("/api/purchases", async (req, res) => {
    try {
      const {
        purchaseDate,
        supplierId,
        warehouseId,
        payingAmount,
        dueDate,
        lineItems,
      } = req.body;

      if (!lineItems || !lineItems.length) {
        return res.status(400).json({ message: "No line items provided" });
      }

      const totalAmount = lineItems.reduce(
        (sum: number, i: any) => sum + Number(i.amount),
        0
      );

      const [purchase] = await db
        .insert(purchases)
        .values({
          purchaseDate,
          supplierId,
          warehouseId,
          totalAmount: String(totalAmount),
          payingAmount: String(payingAmount || 0),
          dueDate: dueDate || null,
        })
        .returning();

      for (const li of lineItems) {
        await db.insert(purchaseItems).values({
          purchaseId: purchase.id,
          itemId: li.itemId,
          quantity: String(li.quantity),
          rate: String(li.rate),
          amount: String(li.amount),
        });

        await db.insert(stockLedger).values({
          itemId: li.itemId,
          warehouseId,
          quantity: String(li.quantity),
          referenceType: "PURCHASE",
          referenceId: purchase.id,
        });
      }

      // 🔹 CREATE INITIAL PAYMENT RECORD (if payingAmount > 0)
      if (Number(payingAmount) > 0) {
        const [owner] = await db.select().from(owners).limit(1);
        if (owner) {
          await db.insert(supplierPayments).values({
            paymentDate: purchaseDate,
            supplierId,
            purchaseId: purchase.id,
            ownerId: owner.id,
            amount: String(payingAmount),
            paymentMethod: "Cash",
            remarks: "Initial payment at purchase time",
          });
        }
      }

      res.status(201).json(purchase);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 DELETE PURCHASE
  app.delete("/api/purchases/:id", async (req, res) => {
    try {
      const purchaseId = parseInt(req.params.id);

      // Get purchase items before deleting to reverse stock
      const purchaseItemsData = await db
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.purchaseId, purchaseId));

      const [purchase] = await db
        .select()
        .from(purchases)
        .where(eq(purchases.id, purchaseId))
        .limit(1);

      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      // Reverse stock ledger entries (subtract the quantities that were added)
      for (const item of purchaseItemsData) {
        await db.insert(stockLedger).values({
          itemId: item.itemId,
          warehouseId: purchase.warehouseId,
          quantity: String(-Math.abs(Number(item.quantity))), // Negative to subtract
          referenceType: "PURCHASE_REVERSAL",
          referenceId: purchaseId,
        });
      }

      // Delete purchase (cascade will delete purchase items)
      await db.delete(purchases).where(eq(purchases.id, purchaseId));

      res.json({ message: "Purchase deleted and stock reversed" });
    } catch (err) {
      console.error("Purchase DELETE error:", err);
      handleDbError(err, res);
    }
  });

  // 🔹 UPDATE PURCHASE
  app.put("/api/purchases/:id", async (req, res) => {
    try {
      const purchaseId = parseInt(req.params.id);
      const {
        purchaseDate,
        supplierId,
        warehouseId,
        dueDate,
        lineItems,
        payingAmount,
      } = req.body;

      if (!lineItems || !lineItems.length) {
        return res.status(400).json({ message: "No line items provided" });
      }

      await db.transaction(async (tx) => {
        // 1. Get old data for reversal
        const oldItems = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
        const [oldPurchase] = await tx.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);

        if (!oldPurchase) {
          throw new Error("Purchase not found");
        }

        // 2. Reverse stock impact in OLD warehouse
        for (const item of oldItems) {
          await tx.insert(stockLedger).values({
            itemId: item.itemId,
            warehouseId: oldPurchase.warehouseId,
            quantity: String(-Math.abs(Number(item.quantity))),
            referenceType: "PURCHASE_UPDATE_REVERSAL",
            referenceId: purchaseId,
          });
        }

        // 3. Delete old items
        await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));

        // 4. Update main purchase record
        const totalAmount = lineItems.reduce((sum: number, i: any) => sum + Number(i.amount), 0);

        const updateData: any = {
          purchaseDate,
          supplierId,
          warehouseId,
          totalAmount: String(totalAmount),
          dueDate: dueDate || null,
        };

        if (payingAmount !== undefined) {
          updateData.payingAmount = String(payingAmount);
        }

        await tx.update(purchases).set(updateData).where(eq(purchases.id, purchaseId));

        // 5. Insert new items and ledger entries in NEW warehouse
        for (const li of lineItems) {
          await tx.insert(purchaseItems).values({
            purchaseId,
            itemId: li.itemId,
            quantity: String(li.quantity),
            rate: String(li.rate),
            amount: String(li.amount),
          });

          await tx.insert(stockLedger).values({
            itemId: li.itemId,
            warehouseId,
            quantity: String(li.quantity),
            referenceType: "PURCHASE_UPDATE",
            referenceId: purchaseId,
          });
        }

        // 6. Update Initial Payment record if it exists and payingAmount was updated
        if (payingAmount !== undefined) {
          await tx.update(supplierPayments)
            .set({
              amount: String(payingAmount),
              supplierId,
              paymentDate: purchaseDate
            })
            .where(and(
              eq(supplierPayments.purchaseId, purchaseId),
              eq(supplierPayments.remarks, "Initial payment at purchase time")
            ));
        }
      });

      res.json({ message: "Purchase updated successfully" });
    } catch (err: any) {
      console.error("Purchase UPDATE error:", err);
      res.status(err.message === "Purchase not found" ? 404 : 500).json({ message: err.message });
    }
  });

  /* =======================
     SALES
  ======================= */

  // 🔹 GET SALES (WITH JOINS)
  app.get("/api/sales", async (_req, res) => {
    const rows = await db.query.sales.findMany({
      with: {
        customer: true,
        warehouse: true,
        items: {
          with: {
            item: true,
          },
        },
      },
      orderBy: (s, { desc }) => [desc(s.saleDate)],
    });

    const formatted = rows.map((s) => ({
      ...s,
      customer: s.customer?.name ?? "-",
      warehouse: s.warehouse?.name ?? "-",
      lineItems: s.items.map((i) => ({
        ...i,
        item: i.item?.name ?? "-",
        hsnCode: i.item?.hsnCode ?? "-",
      })),
    }));

    res.json(formatted);
  });

  // 🔹 CREATE SALE
  app.post("/api/sales", async (req, res) => {
    try {
      const {
        saleDate,
        customerId,
        warehouseId,
        receivedAmount,
        dueDate,
        lineItems,
        ewayBillNumber,
        transporterId,
        transporterName,
        vehicleNumber,
        distance,
        cgstAmount,
        sgstAmount,
        igstAmount
      } = req.body;

      if (!lineItems || !lineItems.length) {
        return res.status(400).json({ message: "No line items provided" });
      }

      // 🔐 STOCK VALIDATION: Check if sufficient stock is available
      const insufficientStockItems: any[] = [];

      for (const li of lineItems) {
        // Calculate current stock for this item in the selected warehouse
        const stockData = await db
          .select({
            quantity: sql<number>`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL)`,
          })
          .from(stockLedger)
          .where(
            sql`${stockLedger.itemId} = ${li.itemId} AND ${stockLedger.warehouseId} = ${warehouseId}`
          );

        const currentStock = Number(stockData[0]?.quantity || 0);
        const requestedQty = Number(li.quantity);

        if (currentStock < requestedQty) {
          // Get item name for error message
          const [item] = await db.select().from(items).where(eq(items.id, li.itemId)).limit(1);
          insufficientStockItems.push({
            itemName: item?.name || `Item ${li.itemId}`,
            available: currentStock,
            requested: requestedQty,
            shortage: requestedQty - currentStock,
          });
        }
      }

      // If any items have insufficient stock, return error
      if (insufficientStockItems.length > 0) {
        const errorMessage = insufficientStockItems
          .map(
            (item) =>
              `${item.itemName}: Available ${item.available.toFixed(2)}, Requested ${item.requested.toFixed(2)} (Short by ${item.shortage.toFixed(2)})`
          )
          .join("; ");

        return res.status(400).json({
          message: `Insufficient stock for ${insufficientStockItems.length} item(s)`,
          details: errorMessage,
          insufficientItems: insufficientStockItems,
        });
      }

      // Stock is sufficient, proceed with sale
      const subTotal = lineItems.reduce(
        (sum: number, i: any) => sum + Number(i.amount),
        0
      );
      const totalAmount = subTotal + Number(cgstAmount || 0) + Number(sgstAmount || 0) + Number(igstAmount || 0);

      const [sale] = await db
        .insert(sales)
        .values({
          saleDate,
          customerId,
          warehouseId,
          totalAmount: String(totalAmount),
          receivedAmount: String(receivedAmount || 0),
          dueDate: dueDate || null,
          ewayBillNumber: ewayBillNumber || null,
          transporterId: transporterId || null,
          transporterName: transporterName || null,
          vehicleNumber: vehicleNumber || null,
          distance: distance ? String(distance) : null,
          cgstAmount: String(cgstAmount || 0),
          sgstAmount: String(sgstAmount || 0),
          igstAmount: String(igstAmount || 0),
        })
        .returning();

      for (const li of lineItems) {
        await db.insert(salesItems).values({
          saleId: sale.id,
          itemId: li.itemId,
          quantity: String(li.quantity),
          rate: String(li.rate),
          amount: String(li.amount),
          gstRate: String(li.gstRate || 0),
          gstAmount: String(li.gstAmount || 0),
        });

        // CRITICAL: Negative quantity for stock reduction
        await db.insert(stockLedger).values({
          itemId: li.itemId,
          warehouseId,
          quantity: String(-Math.abs(Number(li.quantity))), // Force negative
          referenceType: "SALE",
          referenceId: sale.id,
        });
      }

      // 🔹 CREATE INITIAL RECEIPT RECORD (if receivedAmount > 0)
      if (Number(receivedAmount) > 0) {
        const [owner] = await db.select().from(owners).limit(1);
        if (owner) {
          await db.insert(customerPayments).values({
            paymentDate: saleDate,
            customerId,
            saleId: sale.id,
            ownerId: owner.id,
            amount: String(receivedAmount),
            paymentMethod: "Cash",
            remarks: "Initial receipt at sale time",
          });
        }
      }

      res.status(201).json(sale);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 DELETE SALE
  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const saleId = parseInt(req.params.id);

      // Get sale items before deleting to reverse stock
      const saleItemsData = await db
        .select()
        .from(salesItems)
        .where(eq(salesItems.saleId, saleId));

      const [sale] = await db
        .select()
        .from(sales)
        .where(eq(sales.id, saleId))
        .limit(1);

      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      // Reverse stock ledger entries (add back stock with positive quantities)
      for (const item of saleItemsData) {
        await db.insert(stockLedger).values({
          itemId: item.itemId,
          warehouseId: sale.warehouseId,
          quantity: String(Math.abs(Number(item.quantity))), // Positive to add back
          referenceType: "SALE_REVERSAL",
          referenceId: saleId,
        });
      }

      // Delete sale (cascade will delete sale items)
      await db.delete(sales).where(eq(sales.id, saleId));

      res.json({ message: "Sale deleted and stock reversed" });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 UPDATE SALE
  app.put("/api/sales/:id", async (req, res) => {
    try {
      const saleId = parseInt(req.params.id);
      const {
        saleDate,
        customerId,
        warehouseId,
        receivedAmount,
        dueDate,
        lineItems,
        ewayBillNumber,
        transporterId,
        transporterName,
        vehicleNumber,
        distance,
        cgstAmount,
        sgstAmount,
        igstAmount
      } = req.body;

      if (!lineItems || !lineItems.length) {
        return res.status(400).json({ message: "No line items provided" });
      }

      await db.transaction(async (tx) => {
        // 1. Get old data
        const oldItems = await tx.select().from(salesItems).where(eq(salesItems.saleId, saleId));
        const [oldSale] = await tx.select().from(sales).where(eq(sales.id, saleId)).limit(1);

        if (!oldSale) {
          throw new Error("Sale not found");
        }

        // 2. Reverse stock (add back) in OLD warehouse
        for (const item of oldItems) {
          await tx.insert(stockLedger).values({
            itemId: item.itemId,
            warehouseId: oldSale.warehouseId,
            quantity: String(Math.abs(Number(item.quantity))),
            referenceType: "SALE_UPDATE_REVERSAL",
            referenceId: saleId,
          });
        }

        // 3. Stock Validation for NEW items
        const insufficientStockItems: any[] = [];
        for (const li of lineItems) {
          const stockData = await tx
            .select({
              quantity: sql<number>`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL)`,
            })
            .from(stockLedger)
            .where(and(eq(stockLedger.itemId, li.itemId), eq(stockLedger.warehouseId, warehouseId)));

          const currentStock = Number(stockData[0]?.quantity || 0);
          const requestedQty = Number(li.quantity);

          if (currentStock < requestedQty) {
            const [item] = await tx.select().from(items).where(eq(items.id, li.itemId)).limit(1);
            insufficientStockItems.push({
              itemName: item?.name || `Item ${li.itemId}`,
              available: currentStock,
              requested: requestedQty,
            });
          }
        }

        if (insufficientStockItems.length > 0) {
          throw new Error(`Insufficient stock for items: ${insufficientStockItems.map(i => i.itemName).join(", ")}`);
        }

        // 4. Delete old items
        await tx.delete(salesItems).where(eq(salesItems.saleId, saleId));

        // 5. Update main record
        const subTotal = lineItems.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
        const totalAmount = subTotal + Number(cgstAmount || 0) + Number(sgstAmount || 0) + Number(igstAmount || 0);

        const updateData: any = {
          saleDate,
          customerId,
          warehouseId,
          totalAmount: String(totalAmount),
          dueDate: dueDate || null,
          ewayBillNumber: ewayBillNumber || null,
          transporterId: transporterId || null,
          transporterName: transporterName || null,
          vehicleNumber: vehicleNumber || null,
          distance: distance ? String(distance) : null,
          cgstAmount: String(cgstAmount || 0),
          sgstAmount: String(sgstAmount || 0),
          igstAmount: String(igstAmount || 0),
        };
        if (receivedAmount !== undefined) updateData.receivedAmount = String(receivedAmount);

        await tx.update(sales).set(updateData).where(eq(sales.id, saleId));

        // 6. Insert new items and ledger entries in NEW warehouse
        for (const li of lineItems) {
          await tx.insert(salesItems).values({
            saleId,
            itemId: li.itemId,
            quantity: String(li.quantity),
            rate: String(li.rate),
            amount: String(li.amount),
            gstRate: String(li.gstRate || 0),
            gstAmount: String(li.gstAmount || 0),
          });

          await tx.insert(stockLedger).values({
            itemId: li.itemId,
            warehouseId,
            quantity: String(-Math.abs(Number(li.quantity))),
            referenceType: "SALE_UPDATE",
            referenceId: saleId,
          });
        }

        // 7. Update Initial Receipt record if it exists
        if (receivedAmount !== undefined) {
          await tx.update(customerPayments)
            .set({
              amount: String(receivedAmount),
              customerId,
              paymentDate: saleDate
            })
            .where(and(
              eq(customerPayments.saleId, saleId),
              eq(customerPayments.remarks, "Initial receipt at sale time")
            ));
        }
      });

      res.json({ message: "Sale updated successfully" });
    } catch (err: any) {
      console.error("Sale UPDATE error:", err);
      res.status(err.message.startsWith("Insufficient stock") ? 400 : (err.message === "Sale not found" ? 404 : 500)).json({ message: err.message });
    }
  });

  // 🔹 CUSTOMER SUMMARY
  app.get("/api/customer-summary", async (_req, res) => {
    try {
      const result = await db
        .select({
          customerId: sales.customerId,
          customer: customers.name,
          totalSales: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        })
        .from(sales)
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .groupBy(sales.customerId, customers.name)
        .orderBy(desc(sql`SUM(${sales.totalAmount})`));

      res.json(result);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  /* =======================
     SUPPLIER PAYMENTS
  ======================= */

  // 🔹 GET SUPPLIER PAYMENTS (WITH JOINS)
  app.get("/api/supplier-payments", async (_req, res) => {
    try {
      const rows = await db.query.supplierPayments.findMany({
        with: {
          supplier: true,
          owner: true,
        },
        orderBy: (sp, { desc }) => [desc(sp.paymentDate)],
      });

      const formatted = rows.map((sp) => ({
        id: sp.id,
        paymentDate: sp.paymentDate,
        supplierId: sp.supplierId,
        ownerId: sp.ownerId,
        supplier: sp.supplier?.name ?? "-",
        owner: sp.owner?.name ?? "-",
        amount: sp.amount,
        paymentMethod: sp.paymentMethod,
        remarks: sp.remarks,
        nextPaymentDate: sp.nextPaymentDate,
        purchaseId: sp.purchaseId,
      }));

      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 CREATE SUPPLIER PAYMENT
  app.post("/api/supplier-payments", async (req, res) => {
    try {
      const { paymentDate, supplierId, purchaseId, ownerId, amount, paymentMethod, remarks } = req.body;
      let effectivePurchaseId = purchaseId ? Number(purchaseId) : null;

      // Smart Auto-allocation if "General" is chosen
      if (!effectivePurchaseId) {
        // Find oldest purchase for this supplier with balance > 0
        const [oldestOutstanding] = await db.select().from(purchases)
          .where(and(
            eq(purchases.supplierId, Number(supplierId)),
            sql`CAST(${purchases.totalAmount} AS DECIMAL) > CAST(${purchases.payingAmount} AS DECIMAL)`
          ))
          .orderBy(asc(purchases.id))
          .limit(1);

        if (oldestOutstanding) {
          effectivePurchaseId = oldestOutstanding.id;
        }
      }

      const [payment] = await db
        .insert(supplierPayments)
        .values({
          paymentDate,
          supplierId,
          purchaseId: effectivePurchaseId,
          ownerId,
          amount: String(amount),
          paymentMethod,
          remarks,
          nextPaymentDate: req.body.nextPaymentDate || null,
        })
        .returning();

      // Update linked purchase balance
      if (effectivePurchaseId) {
        const [purchase] = await db.select().from(purchases).where(eq(purchases.id, effectivePurchaseId)).limit(1);
        if (purchase) {
          const newPayingAmount = (Number(purchase.payingAmount) || 0) + Number(amount);
          await db.update(purchases).set({ payingAmount: String(newPayingAmount) }).where(eq(purchases.id, effectivePurchaseId));
        }
      }

      res.status(201).json(payment);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 UPDATE SUPPLIER PAYMENT
  app.put("/api/supplier-payments/:id", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { paymentDate, supplierId, purchaseId, ownerId, amount, paymentMethod, remarks } = req.body;

      const [oldPayment] = await db.select().from(supplierPayments).where(eq(supplierPayments.id, paymentId)).limit(1);
      if (!oldPayment) return res.status(404).json({ message: "Payment not found" });

      let effectivePurchaseId = purchaseId ? Number(purchaseId) : null;

      // Smart Auto-allocation if "General" is chosen or switched to
      if (!effectivePurchaseId) {
        const [oldestOutstanding] = await db.select().from(purchases)
          .where(and(
            eq(purchases.supplierId, Number(supplierId)),
            sql`CAST(${purchases.totalAmount} AS DECIMAL) > CAST(${purchases.payingAmount} AS DECIMAL)`
          ))
          .orderBy(asc(purchases.id))
          .limit(1);

        if (oldestOutstanding) {
          effectivePurchaseId = oldestOutstanding.id;
        }
      }

      const [payment] = await db
        .update(supplierPayments)
        .set({
          paymentDate,
          supplierId,
          purchaseId: effectivePurchaseId,
          ownerId,
          amount: String(amount),
          paymentMethod,
          remarks,
          nextPaymentDate: req.body.nextPaymentDate || null,
        })
        .where(eq(supplierPayments.id, paymentId))
        .returning();

      // Sync purchase balances
      if (oldPayment.purchaseId) {
        const [oldPurchase] = await db.select().from(purchases).where(eq(purchases.id, oldPayment.purchaseId)).limit(1);
        if (oldPurchase) {
          const revertPayingAmount = (Number(oldPurchase.payingAmount) || 0) - (Number(oldPayment.amount) || 0);
          await db.update(purchases).set({ payingAmount: String(revertPayingAmount) }).where(eq(purchases.id, oldPayment.purchaseId));
        }
      }

      if (effectivePurchaseId) {
        const [newPurchase] = await db.select().from(purchases).where(eq(purchases.id, effectivePurchaseId)).limit(1);
        if (newPurchase) {
          const updatePayingAmount = (Number(newPurchase.payingAmount) || 0) + Number(amount);
          await db.update(purchases).set({ payingAmount: String(updatePayingAmount) }).where(eq(purchases.id, effectivePurchaseId));
        }
      }

      res.json(payment);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 DELETE SUPPLIER PAYMENT
  app.delete("/api/supplier-payments/:id", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);

      const [payment] = await db
        .select()
        .from(supplierPayments)
        .where(eq(supplierPayments.id, paymentId))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ message: "Supplier payment not found" });
      }

      // Revert purchase balance before deleting
      if (payment.purchaseId) {
        const [purchase] = await db.select().from(purchases).where(eq(purchases.id, payment.purchaseId)).limit(1);
        if (purchase) {
          const revertPayingAmount = (Number(purchase.payingAmount) || 0) - (Number(payment.amount) || 0);
          await db.update(purchases).set({ payingAmount: String(revertPayingAmount) }).where(eq(purchases.id, payment.purchaseId));
        }
      }

      await db.delete(supplierPayments).where(eq(supplierPayments.id, paymentId));

      res.json({ message: "Supplier payment deleted" });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  /* =======================
     CUSTOMER PAYMENTS
  ======================= */

  // 🔹 GET CUSTOMER PAYMENTS (WITH JOINS)
  app.get("/api/customer-payments", async (_req, res) => {
    try {
      const rows = await db.query.customerPayments.findMany({
        with: {
          customer: true,
          owner: true,
        },
        orderBy: (cp, { desc }) => [desc(cp.paymentDate)],
      });

      const formatted = rows.map((cp) => ({
        id: cp.id,
        paymentDate: cp.paymentDate,
        customerId: cp.customerId,
        ownerId: cp.ownerId,
        customer: cp.customer?.name ?? "-",
        owner: cp.owner?.name ?? "-",
        amount: cp.amount,
        paymentMethod: cp.paymentMethod,
        remarks: cp.remarks,
        nextReceiptDate: cp.nextReceiptDate,
        saleId: cp.saleId,
      }));

      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 CREATE CUSTOMER PAYMENT
  app.post("/api/customer-payments", async (req, res) => {
    try {
      const { paymentDate, customerId, saleId, ownerId, amount, paymentMethod, remarks } = req.body;
      let effectiveSaleId = saleId ? Number(saleId) : null;

      // Smart Auto-allocation if "General" is chosen
      if (!effectiveSaleId) {
        // Find oldest sale for this customer with balance > 0
        const [oldestOutstanding] = await db.select().from(sales)
          .where(and(
            eq(sales.customerId, Number(customerId)),
            sql`CAST(${sales.totalAmount} AS DECIMAL) > CAST(${sales.receivedAmount} AS DECIMAL)`
          ))
          .orderBy(asc(sales.id))
          .limit(1);

        if (oldestOutstanding) {
          effectiveSaleId = oldestOutstanding.id;
        }
      }

      const [payment] = await db
        .insert(customerPayments)
        .values({
          paymentDate,
          customerId,
          saleId: effectiveSaleId,
          ownerId,
          amount: String(amount),
          paymentMethod,
          remarks,
          nextReceiptDate: req.body.nextReceiptDate || null,
        })
        .returning();

      // Update linked sale balance
      if (effectiveSaleId) {
        const [sale] = await db.select().from(sales).where(eq(sales.id, effectiveSaleId)).limit(1);
        if (sale) {
          const newReceivedAmount = (Number(sale.receivedAmount) || 0) + Number(amount);
          await db.update(sales).set({ receivedAmount: String(newReceivedAmount) }).where(eq(sales.id, effectiveSaleId));
        }
      }

      res.status(201).json(payment);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 UPDATE CUSTOMER PAYMENT
  app.put("/api/customer-payments/:id", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { paymentDate, customerId, saleId, ownerId, amount, paymentMethod, remarks } = req.body;

      const [oldPayment] = await db.select().from(customerPayments).where(eq(customerPayments.id, paymentId)).limit(1);
      if (!oldPayment) return res.status(404).json({ message: "Receipt not found" });

      let effectiveSaleId = saleId ? Number(saleId) : null;

      // Smart Auto-allocation if "General" is chosen
      if (!effectiveSaleId) {
        const [oldestOutstanding] = await db.select().from(sales)
          .where(and(
            eq(sales.customerId, Number(customerId)),
            sql`CAST(${sales.totalAmount} AS DECIMAL) > CAST(${sales.receivedAmount} AS DECIMAL)`
          ))
          .orderBy(asc(sales.id))
          .limit(1);

        if (oldestOutstanding) {
          effectiveSaleId = oldestOutstanding.id;
        }
      }

      const [payment] = await db
        .update(customerPayments)
        .set({
          paymentDate,
          customerId,
          saleId: effectiveSaleId,
          ownerId,
          amount: String(amount),
          paymentMethod,
          remarks,
          nextReceiptDate: req.body.nextReceiptDate || null,
        })
        .where(eq(customerPayments.id, paymentId))
        .returning();

      // Sync sale balances
      if (oldPayment.saleId) {
        const [oldSale] = await db.select().from(sales).where(eq(sales.id, oldPayment.saleId)).limit(1);
        if (oldSale) {
          const revertReceivedAmount = (Number(oldSale.receivedAmount) || 0) - (Number(oldPayment.amount) || 0);
          await db.update(sales).set({ receivedAmount: String(revertReceivedAmount) }).where(eq(sales.id, oldPayment.saleId));
        }
      }

      if (effectiveSaleId) {
        const [newSale] = await db.select().from(sales).where(eq(sales.id, effectiveSaleId)).limit(1);
        if (newSale) {
          const updateReceivedAmount = (Number(newSale.receivedAmount) || 0) + Number(amount);
          await db.update(sales).set({ receivedAmount: String(updateReceivedAmount) }).where(eq(sales.id, effectiveSaleId));
        }
      }

      res.json(payment);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // 🔹 DELETE CUSTOMER PAYMENT
  app.delete("/api/customer-payments/:id", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);

      const [payment] = await db
        .select()
        .from(customerPayments)
        .where(eq(customerPayments.id, paymentId))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ message: "Customer payment not found" });
      }

      // Revert sale balance before deleting
      if (payment.saleId) {
        const [sale] = await db.select().from(sales).where(eq(sales.id, payment.saleId)).limit(1);
        if (sale) {
          const revertReceivedAmount = (Number(sale.receivedAmount) || 0) - (Number(payment.amount) || 0);
          await db.update(sales).set({ receivedAmount: String(revertReceivedAmount) }).where(eq(sales.id, payment.saleId));
        }
      }

      await db.delete(customerPayments).where(eq(customerPayments.id, paymentId));

      res.json({ message: "Customer payment deleted" });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  /* =======================
     STOCK TRANSFERS
  ======================= */

  app.get("/api/stock-transfers", async (_req, res) => {
    try {
      const rows = await db.query.stockTransfers.findMany({
        with: {
          item: true,
          fromWarehouse: true,
          toWarehouse: true,
          uom: true
        },
        orderBy: (st, { desc }) => [desc(st.transferDate)]
      });
      res.json(rows);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  app.post("/api/stock-transfers", async (req, res) => {
    try {
      const { transferDate, itemId, fromWarehouseId, toWarehouseId, quantity, uomId, remarks } = req.body;

      if (!transferDate || !itemId || !fromWarehouseId || !quantity || !uomId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // 1. Check Stock in From Warehouse
      const stockData = await db
        .select({
          quantity: sql<number>`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL)`,
        })
        .from(stockLedger)
        .where(
          and(
            eq(stockLedger.itemId, itemId),
            eq(stockLedger.warehouseId, fromWarehouseId)
          )
        );

      const currentStock = Number(stockData[0]?.quantity || 0);
      const requestedQty = Number(quantity);

      if (currentStock < requestedQty) {
        return res.status(400).json({ message: `Insufficient stock in source warehouse! Available: ${currentStock.toFixed(2)}` });
      }

      // 2. Insert Transfer Record
      const [transfer] = await db.insert(stockTransfers).values({
        transferDate,
        itemId,
        fromWarehouseId,
        toWarehouseId: toWarehouseId || null,
        quantity: String(quantity),
        uomId,
        remarks
      }).returning();

      // 3. Deduct from Source
      await db.insert(stockLedger).values({
        itemId,
        warehouseId: fromWarehouseId,
        quantity: String(-Math.abs(requestedQty)),
        referenceType: "TRANSFER_OUT",
        referenceId: transfer.id
      });

      // 4. Add to Target (if exists)
      if (toWarehouseId) {
        await db.insert(stockLedger).values({
          itemId,
          warehouseId: toWarehouseId,
          quantity: String(Math.abs(requestedQty)),
          referenceType: "TRANSFER_IN",
          referenceId: transfer.id
        });
      }

      res.status(201).json(transfer);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // DELETE Stock Transfer
  app.delete("/api/stock-transfers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [transfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, id));

      if (!transfer) return res.status(404).json({ message: "Transfer not found" });

      // Revert Stock
      await db.insert(stockLedger).values({
        itemId: transfer.itemId,
        warehouseId: transfer.fromWarehouseId,
        quantity: String(transfer.quantity),
        referenceType: "TRANSFER_REV_OUT",
        referenceId: transfer.id
      });

      if (transfer.toWarehouseId) {
        await db.insert(stockLedger).values({
          itemId: transfer.itemId,
          warehouseId: transfer.toWarehouseId,
          quantity: String(-Number(transfer.quantity)),
          referenceType: "TRANSFER_REV_IN",
          referenceId: transfer.id
        });
      }

      await db.delete(stockTransfers).where(eq(stockTransfers.id, id));
      res.json({ message: "Transfer deleted and stock reverted" });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // UPDATE Stock Transfer
  app.put("/api/stock-transfers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { transferDate, itemId, fromWarehouseId, toWarehouseId, quantity, uomId, remarks } = req.body;

      if (!transferDate || !itemId || !fromWarehouseId || !quantity || !uomId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const [oldTransfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, id));
      if (!oldTransfer) return res.status(404).json({ message: "Transfer not found" });

      // 1. Check Availability (considering the revert of old transfer)
      const stockData = await db
        .select({
          quantity: sql<number>`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL)`,
        })
        .from(stockLedger)
        .where(
          and(
            eq(stockLedger.itemId, itemId),
            eq(stockLedger.warehouseId, fromWarehouseId)
          )
        );

      let currentStock = Number(stockData[0]?.quantity || 0);

      // If we are modifying the same item/warehouse context, credit back the old amount for availability check
      if (oldTransfer.itemId === itemId && oldTransfer.fromWarehouseId === fromWarehouseId) {
        currentStock += Number(oldTransfer.quantity);
      }

      if (currentStock < Number(quantity)) {
        return res.status(400).json({ message: `Insufficient stock! Available: ${currentStock.toFixed(2)}` });
      }

      // 2. Revert Old Stock
      await db.insert(stockLedger).values({
        itemId: oldTransfer.itemId,
        warehouseId: oldTransfer.fromWarehouseId,
        quantity: String(oldTransfer.quantity),
        referenceType: "TRANSFER_REV_OUT",
        referenceId: oldTransfer.id
      });

      if (oldTransfer.toWarehouseId) {
        await db.insert(stockLedger).values({
          itemId: oldTransfer.itemId,
          warehouseId: oldTransfer.toWarehouseId,
          quantity: String(-Number(oldTransfer.quantity)),
          referenceType: "TRANSFER_REV_IN",
          referenceId: oldTransfer.id
        });
      }

      // 3. Apply New Stock
      await db.insert(stockLedger).values({
        itemId,
        warehouseId: fromWarehouseId,
        quantity: String(-Math.abs(Number(quantity))),
        referenceType: "TRANSFER_OUT",
        referenceId: id
      });

      if (toWarehouseId) {
        await db.insert(stockLedger).values({
          itemId,
          warehouseId: toWarehouseId,
          quantity: String(Math.abs(Number(quantity))),
          referenceType: "TRANSFER_IN",
          referenceId: id
        });
      }

      // 4. Update Record
      const [updated] = await db.update(stockTransfers).set({
        transferDate, itemId, fromWarehouseId, toWarehouseId: toWarehouseId || null, quantity: String(quantity), uomId, remarks
      }).where(eq(stockTransfers.id, id)).returning();

      res.json(updated);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  /* =======================
     STOCK REPORT
  ======================= */
  // Stock Report
  app.get("/api/reports/stock", async (req, res) => {
    try {
      const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;

      // 1. Get Stock Quantities
      const stockData = await db
        .select({
          itemId: stockLedger.itemId,
          warehouseId: stockLedger.warehouseId,
          quantity: sql<string>`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL(20,4))`,
          itemName: items.name,
          warehouseName: warehouses.name,
          unitName: unitsOfMeasure.name,
          reorderLevel: items.reorderLevel,
          categoryName: categories.name,
        })
        .from(stockLedger)
        .leftJoin(items, eq(stockLedger.itemId, items.id))
        .leftJoin(warehouses, eq(stockLedger.warehouseId, warehouses.id))
        .leftJoin(unitsOfMeasure, eq(items.defaultUomId, unitsOfMeasure.id))
        .leftJoin(categories, eq(items.categoryId, categories.id))
        .groupBy(
          stockLedger.itemId,
          stockLedger.warehouseId,
          items.name,
          warehouses.name,
          unitsOfMeasure.name,
          items.reorderLevel,
          categories.name
        )
        .where(warehouseId ? eq(stockLedger.warehouseId, warehouseId) : undefined);

      // 2. Get Average Purchase Rates (Weighted Average)
      const purchaseRates = await db
        .select({
          itemId: purchaseItems.itemId,
          totalAmount: sql<number>`SUM(CAST(${purchaseItems.amount} AS DECIMAL))`,
          totalQty: sql<number>`SUM(CAST(${purchaseItems.quantity} AS DECIMAL))`
        })
        .from(purchaseItems)
        .groupBy(purchaseItems.itemId);

      // 3. Get Last Sales Rates (Fallback for manufactured items/FGs)
      // We take the MAX(rate) as a proxy for "latest/standard selling price" to value FG stock if no purchase history exists
      const salesRates = await db
        .select({
          itemId: salesItems.itemId,
          avgRate: sql<number>`AVG(CAST(${salesItems.rate} AS DECIMAL))`
        })
        .from(salesItems)
        .groupBy(salesItems.itemId);

      const rateMap = new Map<number, number>();

      // Populate map with Purchase Rates first
      purchaseRates.forEach(p => {
        const qty = Number(p.totalQty) || 0;
        const amt = Number(p.totalAmount) || 0;
        if (qty > 0) {
          rateMap.set(p.itemId, amt / qty);
        }
      });

      // Fill gaps with Sales Rates
      salesRates.forEach(s => {
        if (!rateMap.has(s.itemId)) {
          // Use 70% of Sales Rate as conservative "Cost" estimate for FGs 
          // (assuming ~30% margin)
          rateMap.set(s.itemId, (Number(s.avgRate) || 0) * 0.7);
        }
      });

      const formatted = stockData.map(s => {
        const qty = Math.abs(Number(s.quantity)) < 0.0001 ? 0 : Number(s.quantity);
        const avgRate = rateMap.get(s.itemId) || 0;
        const stockValue = qty * avgRate;

        return {
          itemId: s.itemId,
          itemName: s.itemName || 'Unknown',
          categoryName: s.categoryName || '-',
          warehouseId: s.warehouseId,
          warehouseName: s.warehouseName || 'Unknown',
          quantity: qty,
          unitName: s.unitName || '-',
          reorderLevel: Number(s.reorderLevel) || 0,
          avgRate: avgRate,
          value: stockValue
        };
      });

      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // Sales Trend Report
  app.get("/api/reports/sales-trend", async (req, res) => {
    try {
      const { year, warehouseId } = req.query;
      const y = year ? Number(year) : new Date().getFullYear();
      const wId = warehouseId ? Number(warehouseId) : undefined;

      const conditions = [sql`EXTRACT(YEAR FROM ${sales.saleDate}) = ${y}`];
      if (wId) {
        conditions.push(eq(sales.warehouseId, wId));
      }

      const monthlySales = await db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${sales.saleDate})`,
          total: sql<number>`SUM(CAST(${sales.totalAmount} AS DECIMAL))`
        })
        .from(sales)
        .where(and(...conditions))
        .groupBy(sql`EXTRACT(MONTH FROM ${sales.saleDate})`);

      const formatted = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const found = monthlySales.find(r => Number(r.month) === m);
        return {
          month: m,
          total: Number(found?.total || 0)
        };
      });

      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // Dashboard stats
  app.get("/api/reports/dashboard", async (_req, res) => {
    try {
      // Get all stock data grouped by item
      const stockData = await db
        .select({
          itemId: stockLedger.itemId,
          quantity: sql<string>`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL(20,4))`,
          reorderLevel: items.reorderLevel,
          itemName: items.name,
        })
        .from(stockLedger)
        .leftJoin(items, eq(stockLedger.itemId, items.id))
        .groupBy(stockLedger.itemId, items.name, items.reorderLevel);

      const itemsWithStock = stockData.map(s => ({
        itemId: s.itemId,
        itemName: s.itemName || 'Unknown',
        quantity: Math.abs(Number(s.quantity)) < 0.0001 ? 0 : Number(s.quantity),
        reorderLevel: Number(s.reorderLevel) || 0,
      }));

      // Calculate counts
      const totalItems = itemsWithStock.length;
      const lowStockItems = itemsWithStock.filter(item => item.quantity > 0 && item.quantity < item.reorderLevel);
      const outOfStockItems = itemsWithStock.filter(item => item.quantity <= 0);

      res.json({
        totalItems,
        lowStock: lowStockItems.length,
        outOfStock: outOfStockItems.length,
        lowStockItems,
        outOfStockItems,
      });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // Detailed Dashboard Report
  app.get("/api/reports/detailed-dashboard", async (req, res) => {
    try {
      const { date: targetDate, warehouseId } = req.query;
      const dateStr = targetDate ? String(targetDate) : format(new Date(), "yyyy-MM-dd");
      const wId = warehouseId ? Number(warehouseId) : undefined;

      // 0. Find FG Categories by TYPE field
      const fgCategories = await db.select().from(categories).where(
        sql`UPPER(${categories.type}) IN ('FG', 'FINISHED', 'FINISHED_GOODS')`
      );
      const fgCategoryIds = fgCategories.map(c => c.id);

      // 0b. Find all Item IDs that belong to FG categories
      let fgItemIds: number[] = [];
      if (fgCategoryIds.length > 0) {
        const fgItems = await db.select({ id: items.id }).from(items).where(
          inArray(items.categoryId, fgCategoryIds)
        );
        fgItemIds = fgItems.map(i => i.id);
      }

      let openingStock = 0;
      if (fgItemIds.length > 0) {
        const openingConditions = [
          sql`CAST(${stockLedger.createdAt} AS DATE) < ${dateStr}`,
          inArray(stockLedger.itemId, fgItemIds)
        ];
        if (wId) {
          openingConditions.push(eq(stockLedger.warehouseId, wId));
        }

        const openingStockData = await db
          .select({
            totalQty: sql<string>`COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0)`,
          })
          .from(stockLedger)
          .where(and(...openingConditions));
        openingStock = Number(openingStockData[0]?.totalQty || 0);
      }

      const purchaseConditionsBase = [sql`CAST(${purchases.purchaseDate} AS DATE) = ${dateStr}`];
      if (wId) purchaseConditionsBase.push(eq(purchases.warehouseId, wId));

      const purchaseData = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<string>`COALESCE(SUM(${purchases.totalAmount}), 0)`,
        })
        .from(purchases)
        .where(and(...purchaseConditionsBase));

      const salesConditionsBase = [sql`CAST(${sales.saleDate} AS DATE) = ${dateStr}`];
      if (wId) salesConditionsBase.push(eq(sales.warehouseId, wId));

      const salesData = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        })
        .from(sales)
        .where(and(...salesConditionsBase));

      let productionCount = 0;
      let productionOutput = 0;
      if (fgItemIds.length > 0) {
        const prodConditions = [
          sql`CAST(${productionRuns.productionDate} AS DATE) = ${dateStr}`,
          inArray(productionRuns.outputItemId, fgItemIds)
        ];
        if (wId) prodConditions.push(eq(productionRuns.warehouseId, wId));

        const productionData = await db
          .select({
            count: sql<number>`COUNT(*)`,
            totalOutput: sql<string>`COALESCE(SUM(${productionRuns.outputQuantity}), 0)`,
          })
          .from(productionRuns)
          .where(and(...prodConditions));
        productionCount = Number(productionData[0]?.count || 0);
        productionOutput = Number(productionData[0]?.totalOutput || 0);
      }

      // 5. Detailed Lists for Table (Using CAST for robustness)
      const detailedSales = await db.query.sales.findMany({
        where: and(...salesConditionsBase),
        with: {
          customer: true,
          items: {
            with: { item: true }
          }
        }
      });

      const detailedProdConditions = [sql`CAST(${productionRuns.productionDate} AS DATE) = ${dateStr}`];
      if (wId) detailedProdConditions.push(eq(productionRuns.warehouseId, wId));

      const detailedProduction = await db.query.productionRuns.findMany({
        where: and(...detailedProdConditions),
        with: {
          outputItem: true
        }
      });

      let fgStockCurrent = 0;
      if (fgItemIds.length > 0) {
        const currentStockConditions = [inArray(stockLedger.itemId, fgItemIds)];
        if (wId) currentStockConditions.push(eq(stockLedger.warehouseId, wId));

        const fgStockResult = await db
          .select({
            total: sql<string>`COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0)`,
          })
          .from(stockLedger)
          .where(and(...currentStockConditions));
        fgStockCurrent = Number(fgStockResult[0]?.total || 0);
      }

      let totalSoldFGQty = 0;
      if (fgItemIds.length > 0) {
        const soldQtyConditions = [
          sql`CAST(${sales.saleDate} AS DATE) = ${dateStr}`,
          inArray(salesItems.itemId, fgItemIds)
        ];
        if (wId) soldQtyConditions.push(eq(sales.warehouseId, wId));

        const totalSoldFGQtyResult = await db
          .select({
            total: sql<string>`COALESCE(SUM(CAST(${salesItems.quantity} AS DECIMAL)), 0)`,
          })
          .from(salesItems)
          .innerJoin(sales, eq(salesItems.saleId, sales.id))
          .where(and(...soldQtyConditions));
        totalSoldFGQty = Number(totalSoldFGQtyResult[0]?.total || 0);
      }

      let closingFGStock = 0;
      if (fgItemIds.length > 0) {
        const closingConditions = [
          sql`CAST(${stockLedger.createdAt} AS DATE) <= ${dateStr}`,
          inArray(stockLedger.itemId, fgItemIds)
        ];
        if (wId) closingConditions.push(eq(stockLedger.warehouseId, wId));

        const closingFGStockResult = await db
          .select({
            total: sql<string>`COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0)`,
          })
          .from(stockLedger)
          .where(and(...closingConditions));
        closingFGStock = Number(closingFGStockResult[0]?.total || 0);
      }

      res.json({
        date: dateStr,
        openingStock: openingStock,
        summary: {
          purchases: {
            count: Number(purchaseData[0]?.count || 0),
            amount: Number(purchaseData[0]?.totalAmount || 0),
          },
          sales: {
            count: Number(salesData[0]?.count || 0),
            amount: Number(salesData[0]?.totalAmount || 0),
            quantity: totalSoldFGQty // FG-only quantity for report
          },
          production: {
            count: productionCount,
            output: productionOutput,
          }
        },
        sales: detailedSales.map(s => ({
          id: s.id,
          customer: s.customer?.name || "Cash",
          amount: Number(s.totalAmount),
          items: s.items.map(i => `${i.item?.name} (${i.quantity})`).join(", ")
        })),
        production: detailedProduction.map(p => ({
          id: p.id,
          item: p.outputItem?.name || "Unknown",
          quantity: Number(p.outputQuantity)
        })),
        totalFGStock: fgStockCurrent,
        closingStock: closingFGStock
      });
    } catch (err) {
      handleDbError(err, res);
    }
  });


  // Debug endpoint to check stock ledger
  app.get("/api/debug/stock-ledger", async (_req, res) => {
    try {
      const ledgerEntries = await db.select().from(stockLedger);
      res.json(ledgerEntries);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // Debug endpoint to check FG categories
  app.get("/api/debug/fg-categories", async (_req, res) => {
    try {
      const allCategories = await db.select().from(categories);
      const fgCategories = await db.select().from(categories).where(
        sql`UPPER(${categories.type}) IN ('FG', 'FINISHED', 'FINISHED_GOODS')`
      );
      res.json({
        allCategories,
        fgCategories,
        fgCategoryIds: fgCategories.map(c => c.id)
      });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // Supplier Payment Report
  app.get("/api/reports/supplier-payments", async (req, res) => {
    try {
      const { month, year, warehouseId } = req.query;
      const wId = warehouseId ? Number(warehouseId) : undefined;
      let startDate, endDate;

      if (year || month) {
        const y = year ? Number(year) : new Date().getFullYear();
        if (month) {
          const m = Number(month);
          const fmtM = m < 10 ? `0${m}` : m;
          startDate = `${y}-${fmtM}-01`;
          const lastDay = new Date(y, m, 0).getDate();
          endDate = `${y}-${fmtM}-${lastDay}`;
        } else {
          startDate = `${y}-01-01`;
          endDate = `${y}-12-31`;
        }
      }

      // Filter for purchases JOIN
      const purchaseConditions = [eq(suppliers.id, purchases.supplierId)];
      if (startDate && endDate) {
        purchaseConditions.push(gte(purchases.purchaseDate, startDate));
        purchaseConditions.push(lte(purchases.purchaseDate, endDate));
      }
      if (wId) {
        purchaseConditions.push(eq(purchases.warehouseId, wId));
      }

      // Get all suppliers with their purchase totals and paying amounts
      const purchaseData = await db
        .select({
          supplierId: suppliers.id,
          supplierName: suppliers.name,
          totalPurchases: sql<string>`CAST(COALESCE(SUM(${purchases.totalAmount}), 0) AS DECIMAL)`,
          totalPayingAmount: sql<string>`CAST(COALESCE(SUM(${purchases.payingAmount}), 0) AS DECIMAL)`,
        })
        .from(suppliers)
        .leftJoin(purchases, and(...purchaseConditions))
        .groupBy(suppliers.id, suppliers.name);

      // Filter for payments WHERE
      let paymentWhere = undefined;
      if (startDate && endDate) {
        paymentWhere = and(gte(supplierPayments.paymentDate, startDate), lte(supplierPayments.paymentDate, endDate));
      }

      // Get all supplier payments grouped by supplier
      const paymentData = await db
        .select({
          supplierId: supplierPayments.supplierId,
          totalPayments: sql<string>`CAST(COALESCE(SUM(${supplierPayments.amount}), 0) AS DECIMAL)`,
        })
        .from(supplierPayments)
        .where(paymentWhere)
        .groupBy(supplierPayments.supplierId);

      // Combine the data
      const formatted = purchaseData.map(p => {
        const totalPurchases = Number(p.totalPurchases) || 0;
        // 🔹 Match the Transaction List exactly by using totalPayingAmount from purchases table
        const totalPaid = Number(p.totalPayingAmount) || 0;
        const remaining = totalPurchases - totalPaid;

        return {
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          totalPurchases,
          totalPaid,
          totalDue: remaining,
        };
      }).sort((a, b) => b.totalPurchases - a.totalPurchases);

      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // Overdue Payments Alert
  app.get("/api/reports/overdue-payments", async (_req, res) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Get all purchases with due dates

      const purchasesWithDue = await db.query.purchases.findMany({
        with: {
          supplier: true,
        },
        orderBy: (p, { asc }) => [asc(p.dueDate)],
      });

      // Get all supplier payments grouped by supplier
      const paymentData = await db
        .select({
          supplierId: supplierPayments.supplierId,
          totalPayments: sql<string>`CAST(COALESCE(SUM(${supplierPayments.amount}), 0) AS DECIMAL)`,
        })
        .from(supplierPayments)
        .groupBy(supplierPayments.supplierId);

      // Calculate overdue payments
      const overdue = purchasesWithDue
        .filter(p => p.dueDate && p.dueDate <= today)
        .map(p => {
          const payment = paymentData.find(pm => pm.supplierId === p.supplierId);
          const totalPayments = Number(payment?.totalPayments) || 0;

          // Calculate remaining for this specific purchase
          const totalAmount = Number(p.totalAmount) || 0;
          const payingAmount = Number(p.payingAmount) || 0;

          // Get payments specific to this supplier (simplified - you may want to track per-purchase payments)
          const remainingAmount = totalAmount - payingAmount;

          if (remainingAmount > 0 && p.dueDate) {
            const daysOverdue = Math.floor(
              (new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
              purchaseId: p.id,
              purchaseDate: p.purchaseDate,
              supplierName: p.supplier?.name ?? "-",
              supplierId: p.supplierId,
              totalAmount,
              paidAmount: payingAmount,
              remainingAmount,
              dueDate: p.dueDate,
              daysOverdue,
              isOverdue: true,
            };
          }
          return null;
        })
        .filter(Boolean);

      res.json(overdue);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // Upcoming Payments Alert (Due within 7 days)
  app.get("/api/reports/upcoming-payments", async (_req, res) => {
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const sevenDaysLater = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
      const sevenDaysStr = format(sevenDaysLater, "yyyy-MM-dd");

      // Get all purchases with due dates in the next 7 days
      const purchasesWithDue = await db.query.purchases.findMany({
        with: {
          supplier: true,
        },
        orderBy: (p, { asc }) => [asc(p.dueDate)],
      });

      // Get all supplier payments grouped by supplier
      const paymentData = await db
        .select({
          supplierId: supplierPayments.supplierId,
          totalPayments: sql<string>`CAST(COALESCE(SUM(${supplierPayments.amount}), 0) AS DECIMAL)`,
        })
        .from(supplierPayments)
        .groupBy(supplierPayments.supplierId);

      // Calculate upcoming payments (due within 7 days, not yet overdue)
      const upcoming = purchasesWithDue
        .filter(p => p.dueDate && p.dueDate > todayStr && p.dueDate <= sevenDaysStr)
        .map(p => {
          const payment = paymentData.find(pm => pm.supplierId === p.supplierId);
          const totalPayments = Number(payment?.totalPayments) || 0;

          const totalAmount = Number(p.totalAmount) || 0;
          const payingAmount = Number(p.payingAmount) || 0;
          const remainingAmount = totalAmount - payingAmount;

          if (remainingAmount > 0 && p.dueDate) {
            const daysUntilDue = Math.ceil(
              (new Date(p.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
              purchaseId: p.id,
              purchaseDate: p.purchaseDate,
              supplierName: p.supplier?.name ?? "-",
              supplierId: p.supplierId,
              totalAmount,
              paidAmount: payingAmount,
              remainingAmount,
              dueDate: p.dueDate,
              daysUntilDue,
            };
          }
          return null;
        })
        .filter(Boolean);

      res.json(upcoming);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // Customer Sales Report
  app.get("/api/reports/customer-sales", async (req, res) => {
    try {
      const { month, year, warehouseId } = req.query;
      const wId = warehouseId ? Number(warehouseId) : undefined;
      let startDate, endDate;

      if (year || month) {
        const y = year ? Number(year) : new Date().getFullYear();
        if (month) {
          const m = Number(month);
          const fmtM = m < 10 ? `0${m}` : m;
          startDate = `${y}-${fmtM}-01`;
          const lastDay = new Date(y, m, 0).getDate();
          endDate = `${y}-${fmtM}-${lastDay}`;
        } else {
          startDate = `${y}-01-01`;
          endDate = `${y}-12-31`;
        }
      }

      // Filter for sales JOIN
      const salesConditions = [eq(customers.id, sales.customerId)];
      if (startDate && endDate) {
        salesConditions.push(gte(sales.saleDate, startDate));
        salesConditions.push(lte(sales.saleDate, endDate));
      }
      if (wId) {
        salesConditions.push(eq(sales.warehouseId, wId));
      }

      // Get all customers with their sales totals and received amounts
      const salesData = await db
        .select({
          customerId: customers.id,
          customerName: customers.name,
          totalSales: sql<string>`CAST(COALESCE(SUM(${sales.totalAmount}), 0) AS DECIMAL)`,
          totalReceivedAmount: sql<string>`CAST(COALESCE(SUM(${sales.receivedAmount}), 0) AS DECIMAL)`,
        })
        .from(customers)
        .leftJoin(sales, and(...salesConditions))
        .groupBy(customers.id, customers.name);

      // Filter for payments WHERE
      let paymentWhere = undefined;
      if (startDate && endDate) {
        paymentWhere = and(gte(customerPayments.paymentDate, startDate), lte(customerPayments.paymentDate, endDate));
      }

      // Get all customer payments grouped by customer
      const paymentData = await db
        .select({
          customerId: customerPayments.customerId,
          totalPayments: sql<string>`CAST(COALESCE(SUM(${customerPayments.amount}), 0) AS DECIMAL)`,
        })
        .from(customerPayments)
        .where(paymentWhere)
        .groupBy(customerPayments.customerId);

      // Combine the data
      const formatted = salesData.map(c => {
        const totalSales = Number(c.totalSales ?? 0) || 0;
        // 🔹 Match the Transaction List exactly by using totalReceivedAmount from sales table
        const totalReceived = Number(c.totalReceivedAmount ?? 0) || 0;
        const remaining = totalSales - totalReceived;

        return {
          customerId: c.customerId,
          customerName: c.customerName,
          totalSales,
          totalReceived,
          totalRemaining: remaining,
        };
      }).sort((a, b) => b.totalSales - a.totalSales);

      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // Overdue Sales Receivables Alert
  app.get("/api/reports/overdue-sales", async (_req, res) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Get all sales with due dates

      const salesWithDue = await db.query.sales.findMany({
        with: {
          customer: true,
        },
        orderBy: (s, { asc }) => [asc(s.dueDate)],
      });

      // Calculate overdue sales
      const overdue = salesWithDue
        .filter(s => s.dueDate && s.dueDate <= today)
        .map(s => {
          // Calculate remaining for this specific sale
          const totalAmount = Number(s.totalAmount) || 0;
          const receivedAmount = Number(s.receivedAmount) || 0;
          const remainingAmount = totalAmount - receivedAmount;

          if (remainingAmount > 0 && s.dueDate) {
            const daysOverdue = Math.floor(
              (new Date().getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
              saleId: s.id,
              saleDate: s.saleDate,
              customerName: s.customer?.name ?? "-",
              customerId: s.customerId,
              totalAmount,
              receivedAmount,
              remainingAmount,
              dueDate: s.dueDate,
              daysOverdue,
              isOverdue: true,
            };
          }
          return null;
        })
        .filter(Boolean);

      res.json(overdue);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  // Upcoming Sales Receivables Alert (Due within next 3 days)
  app.get("/api/reports/upcoming-sales", async (_req, res) => {
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const threeDaysLater = new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000);
      const threeDaysStr = format(threeDaysLater, "yyyy-MM-dd");

      // Get all sales with due dates
      const salesWithDue = await db.query.sales.findMany({
        with: {
          customer: true,
        },
        orderBy: (s, { asc }) => [asc(s.dueDate)],
      });

      // Calculate upcoming sales
      const upcoming = salesWithDue
        .filter(s => s.dueDate && s.dueDate > todayStr && s.dueDate <= threeDaysStr)
        .map(s => {
          const totalAmount = Number(s.totalAmount) || 0;
          const receivedAmount = Number(s.receivedAmount) || 0;
          const remainingAmount = totalAmount - receivedAmount;

          if (remainingAmount > 0 && s.dueDate) {
            const daysUntilDue = Math.ceil(
              (new Date(s.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
              saleId: s.id,
              saleDate: s.saleDate,
              customerName: s.customer?.name ?? "-",
              customerId: s.customerId,
              totalAmount,
              receivedAmount,
              remainingAmount,
              dueDate: s.dueDate,
              daysUntilDue,
            };
          }
          return null;
        })
        .filter(Boolean);

      res.json(upcoming);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  /* =======================
     BOM
  ======================= */
  app.get("/api/bom-recipes", async (_req, res) => {
    const data = await db.query.bomRecipes.findMany({
      with: { lines: true },
    });
    res.json(data);
  });

  app.post("/api/bom-recipes", async (req, res) => {
    try {
      const { name, outputItemId, outputQuantity, isActive, lines } = req.body;

      const result = await db
        .insert(bomRecipes)
        .values({ name, outputItemId, outputQuantity, isActive })
        .returning();
      const recipe = Array.isArray(result) ? result[0] : result;

      if (lines?.length) {
        await db.insert(bomLines).values(
          lines.map((l: any) => ({
            bomRecipeId: recipe.id,
            itemId: l.itemId,
            quantity: String(l.quantity),
          }))
        );
      }

      res.status(201).json(recipe);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  app.put("/api/bom-recipes/:id", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const { name, outputItemId, outputQuantity, isActive, lines } = req.body;

      // Validate required fields
      if (!name || !outputItemId || !outputQuantity) {
        return res.status(400).json({ message: "Missing required fields: name, outputItemId, outputQuantity" });
      }

      // Update the recipe - convert outputQuantity to string for numeric field
      const updateData: any = {
        name,
        outputItemId: Number(outputItemId),
        outputQuantity: String(outputQuantity),
      };

      // Only update isActive if provided
      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      const result = await db
        .update(bomRecipes)
        .set(updateData)
        .where(eq(bomRecipes.id, recipeId))
        .returning();

      const updated = Array.isArray(result) ? result[0] : result;
      if (!updated) {
        return res.status(404).json({ message: "BOM recipe not found" });
      }

      // Delete existing lines
      await db.delete(bomLines).where(eq(bomLines.bomRecipeId, recipeId));

      // Insert new lines
      if (lines && Array.isArray(lines) && lines.length > 0) {
        await db.insert(bomLines).values(
          lines.map((l: any) => ({
            bomRecipeId: recipeId,
            itemId: Number(l.itemId),
            quantity: String(l.quantity),
          }))
        );
      }

      // Fetch updated recipe with lines
      const updatedRecipe = await db.query.bomRecipes.findFirst({
        where: (bom, { eq }) => eq(bom.id, recipeId),
        with: { lines: true },
      });

      res.json(updatedRecipe);
    } catch (err) {
      console.error("BOM update error:", err);
      handleDbError(err, res);
    }
  });

  app.delete("/api/bom-recipes/:id", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);

      // Delete lines first (cascade should handle this, but being explicit)
      await db.delete(bomLines).where(eq(bomLines.bomRecipeId, recipeId));

      // Delete the recipe
      await db.delete(bomRecipes).where(eq(bomRecipes.id, recipeId));

      res.json({ message: "BOM recipe deleted successfully" });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  /* =======================
     PRODUCTION
  ======================= */
  app.post("/api/production", async (req, res) => {
    try {
      const { productionDate, outputItemId, outputQuantity, warehouseId, consumptions, batchCount } = req.body;

      console.log("Production POST request:", {
        productionDate,
        outputItemId,
        outputQuantity,
        warehouseId,
        consumptionsCount: consumptions?.length || 0,
      });

      if (!productionDate || !outputItemId || !warehouseId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!outputQuantity || Number(outputQuantity) <= 0) {
        return res.status(400).json({ message: "Output quantity must be greater than 0" });
      }

      // 🔐 STOCK VALIDATION: Removed to allow negative stock (auditable deficit)
      // The frontend now warns the user, but we allow the transaction to proceed
      // so that physical production can be recorded even if system stock is lagging.
      /*
      if (consumptions?.length) {
        // ... (validation logic removed) ...
      }
      */

      // 1. Create production run
      const [run] = await db
        .insert(productionRuns)
        .values({
          productionDate,
          outputItemId,
          outputQuantity: String(outputQuantity),
          warehouseId,
          batchCount: String(batchCount || 0), // Save batch count
          remarks: req.body.remarks || null, // Save remarks
        })
        .returning();

      console.log("Production run created:", run.id);

      // 2. Process consumptions (raw materials)
      if (consumptions?.length) {
        console.log(`Processing ${consumptions.length} consumptions...`);
        for (const consumption of consumptions) {
          // Insert production consumption record
          await db.insert(productionConsumptions).values({
            productionRunId: run.id,
            itemId: consumption.itemId,
            standardQty: String(consumption.standardQty),
            actualQty: String(consumption.actualQty),
            openingStock: String(consumption.opening || 0), // Save opening stock
            variance: String(consumption.variance || 0), // Save variance
            remarks: consumption.remarks || null, // Save line-wise remarks
          });

          // Create NEGATIVE stock ledger entry (consuming actual raw materials entered)
          await db.insert(stockLedger).values({
            itemId: consumption.itemId,
            warehouseId,
            quantity: String(-Math.abs(Number(consumption.actualQty))),
            referenceType: "PRODUCTION_CONSUMPTION",
            referenceId: run.id,
            createdAt: new Date(productionDate), // Use production date for ledger
          });

          // Handle Variance / Stock Adjustment (if Actual Closing != System Closing)
          // Front-end sends 'variance' which is (SystemClosing - FinalClosing)
          // If Variance is +10 (System 100, Closing 90), we are short 10. We need to DEDUCT 10.
          // If Variance is -10 (System 100, Closing 110), we have 10 extra. We need to ADD 10.
          const variance = Number(consumption.variance || 0);
          if (variance !== 0) {
            await db.insert(stockLedger).values({
              itemId: consumption.itemId,
              warehouseId,
              quantity: String(-variance), // Invert variance for adjustment (Positive variance = missing stock = negative adjustment)
              referenceType: "PRODUCTION_ADJUSTMENT",
              referenceId: run.id,
              createdAt: new Date(productionDate), // Use production date
            });
            console.log(`Adjusting item ${consumption.itemId} by ${-variance} due to variance.`);
          }

          console.log(`Consumed item ${consumption.itemId}: -${consumption.actualQty}`);
        }
      } else {
        console.warn("No consumptions provided!");
      }

      // 3. Create POSITIVE stock ledger entry for output (finished goods produced)
      // This uses the Manual "Total Output" entered by the user, NOT the batch count.
      await db.insert(stockLedger).values({
        itemId: outputItemId,
        warehouseId,
        quantity: String(outputQuantity),
        referenceType: "PRODUCTION",
        referenceId: run.id,
        createdAt: new Date(productionDate), // Use production date
      });

      console.log(`Produced item ${outputItemId}: +${outputQuantity} (Manual Entry)`);

      res.status(201).json(run);
    } catch (err) {
      console.error("Production POST error:", err);
      handleDbError(err, res);
    }
  });

  app.get("/api/production", async (_req, res) => {
    try {
      const runs = await db.query.productionRuns.findMany({
        orderBy: (pr, { desc }) => [desc(pr.productionDate)],
      });

      // Get item names and consumptions for each run
      const formattedRuns = await Promise.all(
        runs.map(async (run) => {
          // Get output item name
          const [outputItem] = await db
            .select({ name: items.name })
            .from(items)
            .where(eq(items.id, run.outputItemId))
            .limit(1);

          // Get warehouse name
          const [warehouse] = await db
            .select({ name: warehouses.name })
            .from(warehouses)
            .where(eq(warehouses.id, run.warehouseId))
            .limit(1);

          // Get consumptions
          const consumptions = await db.query.productionConsumptions.findMany({
            where: (pc, { eq }) => eq(pc.productionRunId, run.id),
          });

          const consumptionDetails = await Promise.all(
            consumptions.map(async (c) => {
              const [item] = await db
                .select({ name: items.name })
                .from(items)
                .where(eq(items.id, c.itemId))
                .limit(1);
              return {
                itemId: c.itemId,
                itemName: item?.name || "Unknown",
                standardQty: c.standardQty,
                actualQty: c.actualQty,
                opening: c.openingStock, // Return saved opening stock
                variance: c.variance, // Return saved variance
                remarks: c.remarks, // Return saved remarks
              };
            })
          );

          return {
            id: run.id,
            productionDate: run.productionDate,
            outputItemId: run.outputItemId,
            outputItemName: outputItem?.name || "Unknown",
            outputQuantity: run.outputQuantity,
            warehouseId: run.warehouseId,
            warehouseName: warehouse?.name || "Unknown",
            consumptions: consumptionDetails,
            batchCount: run.batchCount,
            remarks: run.remarks,
            createdAt: run.createdAt,
          };
        })
      );

      res.json({ data: formattedRuns });
    } catch (err) {
      handleDbError(err, res);
    }
  });

  // DELETE production run and reverse stock
  app.delete("/api/production/:id", async (req, res) => {
    try {
      const runId = Number(req.params.id);
      if (isNaN(runId)) {
        return res.status(400).json({ message: "Invalid production run ID" });
      }

      console.log(`[DELETE] Received request to delete production run ID: ${runId}`);

      await db.transaction(async (tx) => {
        // 1. Get production run details
        const found = await tx
          .select()
          .from(productionRuns)
          .where(eq(productionRuns.id, runId));

        console.log(`[DELETE] Step 1: Found ${found.length} records in database for ID ${runId}`);

        if (found.length === 0) {
          // Also try to check if it exists in db without transaction to be sure
          const globalFound = await db.select().from(productionRuns).where(eq(productionRuns.id, runId));
          console.log(`[DELETE] Global check: Found ${globalFound.length} records outside transaction`);
          throw new Error("Production run not found");
        }

        const run = found[0];


        // 2. Reverse stock ledger entries
        // IMPORTANT: Only reverse original PRODUCTION/CONSUMPTION entries, 
        // DO NOT reverse previous reversals or updates to avoid feedback loops if called multiple times.
        const relatedEntries = await tx
          .select()
          .from(stockLedger)
          .where(
            and(
              eq(stockLedger.referenceId, runId),
              inArray(stockLedger.referenceType, [
                "PRODUCTION",
                "PRODUCTION_CONSUMPTION",
                "PRODUCTION_ADJUSTMENT"
              ])
            )
          );

        console.log(`Reversing ${relatedEntries.length} entries for production run ${runId}...`);

        for (const entry of relatedEntries) {
          await tx.insert(stockLedger).values({
            itemId: entry.itemId,
            warehouseId: entry.warehouseId,
            quantity: String(-Number(entry.quantity)),
            referenceType: "PRODUCTION_REVERSAL",
            referenceId: runId,
            createdAt: entry.createdAt,
          });
        }

        // 3. Delete the production run (cascade will delete consumption records)
        const deleted = await tx.delete(productionRuns).where(eq(productionRuns.id, runId)).returning();

        if (deleted.length === 0) {
          throw new Error("Failed to delete production run record");
        }

        console.log(`Production run ${runId} deleted successfully`);
      });

      res.json({ message: "Production run deleted and stock reversed" });
    } catch (err: any) {
      console.error("Production DELETE error:", err);
      // Return 404 if not found, else 500
      if (err.message === "Production run not found") {
        return res.status(404).json({ message: err.message });
      }
      handleDbError(err, res);
    }
  });


  // UPDATE production run
  app.put("/api/production/:id", async (req, res) => {
    try {
      const runId = parseInt(req.params.id);
      const { productionDate, outputItemId, outputQuantity, warehouseId, consumptions, batchCount, remarks } = req.body;

      if (!productionDate || !outputItemId || !warehouseId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!outputQuantity || Number(outputQuantity) <= 0) {
        return res.status(400).json({ message: "Output quantity must be greater than 0" });
      }

      await db.transaction(async (tx) => {
        // 1. Get old production run
        const [oldRun] = await tx.select().from(productionRuns).where(eq(productionRuns.id, runId)).limit(1);

        if (!oldRun) {
          throw new Error("Production run not found");
        }

        const relatedEntries = await tx
          .select()
          .from(stockLedger)
          .where(
            and(
              eq(stockLedger.referenceId, runId),
              sql`${stockLedger.referenceType} LIKE 'PRODUCTION%'`
            )
          );

        for (const entry of relatedEntries) {
          await tx.insert(stockLedger).values({
            itemId: entry.itemId,
            warehouseId: entry.warehouseId,
            quantity: String(-Number(entry.quantity)),
            referenceType: "PRODUCTION_UPDATE_REVERSAL",
            referenceId: runId,
            createdAt: entry.createdAt, // Match original entry's date for consistent reporting
          });
        }

        // 3. Delete old consumptions
        await tx.delete(productionConsumptions).where(eq(productionConsumptions.productionRunId, runId));

        // 4. Update production run
        await tx.update(productionRuns)
          .set({
            productionDate,
            outputItemId,
            outputQuantity: String(outputQuantity),
            warehouseId,
            batchCount: String(batchCount || 0),
            remarks: remarks || null,
          })
          .where(eq(productionRuns.id, runId));

        // 5. Process NEW consumptions (raw materials)
        if (consumptions?.length) {
          for (const consumption of consumptions) {
            // Insert production consumption record
            await tx.insert(productionConsumptions).values({
              productionRunId: runId,
              itemId: consumption.itemId,
              standardQty: String(consumption.standardQty),
              actualQty: String(consumption.actualQty),
              openingStock: String(consumption.opening || 0),
              variance: String(consumption.variance || 0), // Save variance
              remarks: consumption.remarks || null,
            });

            // Create NEGATIVE stock ledger entry (consuming raw materials)
            await tx.insert(stockLedger).values({
              itemId: consumption.itemId,
              warehouseId,
              quantity: String(-Math.abs(Number(consumption.actualQty))),
              referenceType: "PRODUCTION_CONSUMPTION",
              referenceId: runId,
              createdAt: new Date(productionDate), // Use production date
            });

            // Handle Variance / Stock Adjustment
            const variance = Number(consumption.variance || 0);
            if (variance !== 0) {
              await tx.insert(stockLedger).values({
                itemId: consumption.itemId,
                warehouseId,
                quantity: String(-variance),
                referenceType: "PRODUCTION_ADJUSTMENT",
                referenceId: runId,
                createdAt: new Date(productionDate), // Use production date
              });
            }
          }
        }

        // 6. Create POSITIVE stock ledger entry for NEW output
        await tx.insert(stockLedger).values({
          itemId: outputItemId,
          warehouseId,
          quantity: String(outputQuantity),
          referenceType: "PRODUCTION",
          referenceId: runId,
          createdAt: new Date(productionDate), // Use production date
        });
      });

      res.json({ message: "Production run updated successfully" });
    } catch (err: any) {
      console.error("Production UPDATE error:", err);
      handleDbError(err, res);
    }
  });

  /* =======================
     ADMIN SETTINGS
  ======================= */
  app.get("/api/admin", async (_req, res) => {
    try {
      let [settings] = await db.select().from(adminSettings).limit(1);
      if (!settings) {
        // Create default settings if they don't exist
        [settings] = await db.insert(adminSettings).values({
          adminName: "Admin",
          companyName: "My Company",
          phone: "",
          email: "",
          address: ""
        }).returning();
      }
      res.json(settings);
    } catch (err) {
      handleDbError(err, res);
    }
  });

  app.patch("/api/admin", async (req, res) => {
    try {
      const payload = req.body;
      let [settings] = await db.select().from(adminSettings).limit(1);

      if (!settings) {
        [settings] = await db.insert(adminSettings).values(payload).returning();
      } else {
        [settings] = await db.update(adminSettings)
          .set({ ...payload, updatedAt: new Date() })
          .where(eq(adminSettings.id, settings.id))
          .returning();
      }
      res.json(settings);
    } catch (err) {
      handleDbError(err, res);
    }
  });


}

