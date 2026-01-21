var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api/index.ts
import "dotenv/config";
import express from "express";

// api/routes.ts
import multer from "multer";
import path from "path";
import { eq, desc, sql as sql2, and, gte, lte, asc, inArray } from "drizzle-orm";
import { format } from "date-fns";

// api/db.ts
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminSettings: () => adminSettings,
  bomLines: () => bomLines,
  bomLinesRelations: () => bomLinesRelations,
  bomRecipes: () => bomRecipes,
  bomRecipesRelations: () => bomRecipesRelations,
  categories: () => categories,
  customerPayments: () => customerPayments,
  customerPaymentsRelations: () => customerPaymentsRelations,
  customers: () => customers,
  expenseHeads: () => expenseHeads,
  insertAdminSettingsSchema: () => insertAdminSettingsSchema,
  insertBomLineSchema: () => insertBomLineSchema,
  insertBomRecipeSchema: () => insertBomRecipeSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertCustomerPaymentSchema: () => insertCustomerPaymentSchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertExpenseHeadSchema: () => insertExpenseHeadSchema,
  insertItemSchema: () => insertItemSchema,
  insertOwnerSchema: () => insertOwnerSchema,
  insertPaymentMethodSchema: () => insertPaymentMethodSchema,
  insertProductionConsumptionSchema: () => insertProductionConsumptionSchema,
  insertProductionRunSchema: () => insertProductionRunSchema,
  insertPurchaseItemSchema: () => insertPurchaseItemSchema,
  insertPurchaseSchema: () => insertPurchaseSchema,
  insertSaleItemSchema: () => insertSaleItemSchema,
  insertSaleSchema: () => insertSaleSchema,
  insertStockLedgerSchema: () => insertStockLedgerSchema,
  insertSupplierPaymentSchema: () => insertSupplierPaymentSchema,
  insertSupplierSchema: () => insertSupplierSchema,
  insertUomSchema: () => insertUomSchema,
  insertUserSchema: () => insertUserSchema,
  insertWarehouseSchema: () => insertWarehouseSchema,
  items: () => items,
  owners: () => owners,
  paymentMethods: () => paymentMethods,
  productionConsumptions: () => productionConsumptions,
  productionConsumptionsRelations: () => productionConsumptionsRelations,
  productionRuns: () => productionRuns,
  productionRunsRelations: () => productionRunsRelations,
  purchaseItems: () => purchaseItems,
  purchaseItemsRelations: () => purchaseItemsRelations,
  purchases: () => purchases,
  purchasesRelations: () => purchasesRelations,
  sales: () => sales,
  salesItems: () => salesItems,
  salesItemsRelations: () => salesItemsRelations,
  salesRelations: () => salesRelations,
  stockLedger: () => stockLedger,
  stockTransfers: () => stockTransfers,
  stockTransfersRelations: () => stockTransfersRelations,
  supplierPayments: () => supplierPayments,
  supplierPaymentsRelations: () => supplierPaymentsRelations,
  suppliers: () => suppliers,
  unitsOfMeasure: () => unitsOfMeasure,
  users: () => users,
  warehouses: () => warehouses
});
import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  numeric,
  date,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var unitsOfMeasure = pgTable("units_of_measure", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow()
});
var warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow()
});
var categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull().default("RAW"),
  createdAt: timestamp("created_at").defaultNow()
});
var suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  personName: text("person_name"),
  contactInfo: text("contact_info"),
  address: text("address"),
  gstNumber: text("gst_number"),
  createdAt: timestamp("created_at").defaultNow()
});
var customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person"),
  contactInfo: text("contact_info"),
  address: text("address"),
  shippingAddress: text("shipping_address"),
  gstNumber: text("gst_number"),
  createdAt: timestamp("created_at").defaultNow()
});
var expenseHeads = pgTable("expense_heads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow()
});
var owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  defaultSharePercentage: numeric("default_share_percentage").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow()
});
var items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    categoryId: integer("category_id").references(() => categories.id).notNull(),
    defaultUomId: integer("default_uom_id").references(() => unitsOfMeasure.id).notNull(),
    reorderLevel: numeric("reorder_level").notNull().default("0"),
    hsnCode: text("hsn_code"),
    gstRate: numeric("gst_rate").notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow()
  },
  (t) => ({
    uqItemCategory: uniqueIndex("uq_item_category").on(t.name, t.categoryId)
  })
);
var bomRecipes = pgTable("bom_recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  outputItemId: integer("output_item_id").references(() => items.id).notNull(),
  outputQuantity: numeric("output_quantity").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var bomLines = pgTable("bom_lines", {
  id: serial("id").primaryKey(),
  bomRecipeId: integer("bom_recipe_id").references(() => bomRecipes.id, { onDelete: "cascade" }).notNull(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  quantity: numeric("quantity").notNull()
});
var bomRecipesRelations = relations(bomRecipes, ({ many, one }) => ({
  lines: many(bomLines),
  outputItem: one(items, {
    fields: [bomRecipes.outputItemId],
    references: [items.id]
  })
}));
var bomLinesRelations = relations(bomLines, ({ one }) => ({
  recipe: one(bomRecipes, {
    fields: [bomLines.bomRecipeId],
    references: [bomRecipes.id]
  }),
  item: one(items, {
    fields: [bomLines.itemId],
    references: [items.id]
  })
}));
var productionRuns = pgTable("production_runs", {
  id: serial("id").primaryKey(),
  productionDate: date("production_date").notNull(),
  outputItemId: integer("output_item_id").references(() => items.id).notNull(),
  outputQuantity: numeric("output_quantity").notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  batchCount: numeric("batch_count").notNull().default("0"),
  remarks: text("remarks"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var productionConsumptions = pgTable("production_consumptions", {
  id: serial("id").primaryKey(),
  productionRunId: integer("production_run_id").references(() => productionRuns.id, { onDelete: "cascade" }).notNull(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  standardQty: numeric("standard_qty").notNull(),
  actualQty: numeric("actual_qty").notNull(),
  openingStock: numeric("opening_stock").notNull().default("0"),
  variance: numeric("variance").default("0"),
  // Added explicit variance column for persistence if needed
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow()
});
var purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  purchaseDate: date("purchase_date").notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  totalAmount: numeric("total_amount").notNull(),
  payingAmount: numeric("paying_amount").notNull().default("0"),
  dueDate: date("due_date"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").references(() => purchases.id, { onDelete: "cascade" }).notNull(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  quantity: numeric("quantity").notNull(),
  rate: numeric("rate").notNull(),
  amount: numeric("amount").notNull(),
  gstRate: numeric("gst_rate").notNull().default("0"),
  gstAmount: numeric("gst_amount").notNull().default("0")
});
var sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleDate: date("sale_date").notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  totalAmount: numeric("total_amount").notNull(),
  receivedAmount: numeric("received_amount").notNull().default("0"),
  dueDate: date("due_date"),
  // E-Way Bill Fields
  ewayBillNumber: text("eway_bill_number"),
  transporterId: text("transporter_id"),
  transporterName: text("transporter_name"),
  vehicleNumber: text("vehicle_number"),
  distance: numeric("distance"),
  cgstAmount: numeric("cgst_amount").default("0"),
  sgstAmount: numeric("sgst_amount").default("0"),
  igstAmount: numeric("igst_amount").default("0"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var salesItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  quantity: numeric("quantity").notNull(),
  rate: numeric("rate").notNull(),
  amount: numeric("amount").notNull(),
  gstRate: numeric("gst_rate").notNull().default("0"),
  gstAmount: numeric("gst_amount").notNull().default("0")
});
var stockLedger = pgTable("stock_ledger", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  quantity: numeric("quantity").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: integer("reference_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var supplierPayments = pgTable("supplier_payments", {
  id: serial("id").primaryKey(),
  paymentDate: date("payment_date").notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  purchaseId: integer("purchase_id").references(() => purchases.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").references(() => owners.id).notNull(),
  amount: numeric("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  remarks: text("remarks"),
  nextPaymentDate: date("next_payment_date"),
  createdAt: timestamp("created_at").defaultNow()
});
var customerPayments = pgTable("customer_payments", {
  id: serial("id").primaryKey(),
  paymentDate: date("payment_date").notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").references(() => owners.id).notNull(),
  amount: numeric("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  remarks: text("remarks"),
  nextReceiptDate: date("next_receipt_date"),
  createdAt: timestamp("created_at").defaultNow()
});
var stockTransfers = pgTable("stock_transfers", {
  id: serial("id").primaryKey(),
  transferDate: date("transfer_date").notNull(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  fromWarehouseId: integer("from_warehouse_id").references(() => warehouses.id).notNull(),
  toWarehouseId: integer("to_warehouse_id").references(() => warehouses.id),
  // Nullable for Issue/Consume
  quantity: numeric("quantity").notNull(),
  uomId: integer("uom_id").references(() => unitsOfMeasure.id).notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow()
});
var adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  adminName: text("admin_name").notNull().default("Admin"),
  companyName: text("company_name").notNull().default("My Company"),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  gstNumber: text("gst_number").default(""),
  // GST API Credentials
  gspClientId: text("gsp_client_id").default(""),
  gspClientSecret: text("gsp_client_secret").default(""),
  gspUsername: text("gsp_username").default(""),
  gspPassword: text("gsp_password").default(""),
  isServiceActive: boolean("is_service_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow()
});
var purchasesRelations = relations(purchases, ({ many, one }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id]
  }),
  warehouse: one(warehouses, {
    fields: [purchases.warehouseId],
    references: [warehouses.id]
  }),
  items: many(purchaseItems)
}));
var purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id]
  }),
  item: one(items, {
    fields: [purchaseItems.itemId],
    references: [items.id]
  })
}));
var salesRelations = relations(sales, ({ many, one }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id]
  }),
  warehouse: one(warehouses, {
    fields: [sales.warehouseId],
    references: [warehouses.id]
  }),
  items: many(salesItems)
}));
var salesItemsRelations = relations(salesItems, ({ one }) => ({
  sale: one(sales, {
    fields: [salesItems.saleId],
    references: [sales.id]
  }),
  item: one(items, {
    fields: [salesItems.itemId],
    references: [items.id]
  })
}));
var supplierPaymentsRelations = relations(supplierPayments, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierPayments.supplierId],
    references: [suppliers.id]
  }),
  purchase: one(purchases, {
    fields: [supplierPayments.purchaseId],
    references: [purchases.id]
  }),
  owner: one(owners, {
    fields: [supplierPayments.ownerId],
    references: [owners.id]
  })
}));
var customerPaymentsRelations = relations(customerPayments, ({ one }) => ({
  customer: one(customers, {
    fields: [customerPayments.customerId],
    references: [customers.id]
  }),
  sale: one(sales, {
    fields: [customerPayments.saleId],
    references: [sales.id]
  }),
  owner: one(owners, {
    fields: [customerPayments.ownerId],
    references: [owners.id]
  })
}));
var productionRunsRelations = relations(productionRuns, ({ one, many }) => ({
  outputItem: one(items, {
    fields: [productionRuns.outputItemId],
    references: [items.id]
  }),
  warehouse: one(warehouses, {
    fields: [productionRuns.warehouseId],
    references: [warehouses.id]
  }),
  consumptions: many(productionConsumptions)
}));
var productionConsumptionsRelations = relations(productionConsumptions, ({ one }) => ({
  productionRun: one(productionRuns, {
    fields: [productionConsumptions.productionRunId],
    references: [productionRuns.id]
  }),
  item: one(items, {
    fields: [productionConsumptions.itemId],
    references: [items.id]
  })
}));
var stockTransfersRelations = relations(stockTransfers, ({ one }) => ({
  item: one(items, {
    fields: [stockTransfers.itemId],
    references: [items.id]
  }),
  fromWarehouse: one(warehouses, {
    fields: [stockTransfers.fromWarehouseId],
    references: [warehouses.id],
    relationName: "fromWarehouse"
  }),
  toWarehouse: one(warehouses, {
    fields: [stockTransfers.toWarehouseId],
    references: [warehouses.id],
    relationName: "toWarehouse"
  }),
  uom: one(unitsOfMeasure, {
    fields: [stockTransfers.uomId],
    references: [unitsOfMeasure.id]
  })
}));
var insertUomSchema = createInsertSchema(unitsOfMeasure).omit({ id: true });
var insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true });
var insertCategorySchema = createInsertSchema(categories).omit({ id: true });
var insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
var insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
var insertExpenseHeadSchema = createInsertSchema(expenseHeads).omit({ id: true });
var insertOwnerSchema = createInsertSchema(owners).omit({ id: true });
var insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true });
var insertItemSchema = createInsertSchema(items).omit({ id: true });
var insertBomRecipeSchema = createInsertSchema(bomRecipes).omit({ id: true });
var insertBomLineSchema = createInsertSchema(bomLines).omit({ id: true });
var insertProductionRunSchema = createInsertSchema(productionRuns).omit({ id: true });
var insertProductionConsumptionSchema = createInsertSchema(productionConsumptions).omit({ id: true });
var insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true });
var insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true });
var insertStockLedgerSchema = createInsertSchema(stockLedger).omit({ id: true });
var insertSaleSchema = createInsertSchema(sales).omit({ id: true });
var insertSaleItemSchema = createInsertSchema(salesItems).omit({ id: true });
var insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({ id: true });
var insertCustomerPaymentSchema = createInsertSchema(customerPayments).omit({ id: true });
var insertAdminSettingsSchema = createInsertSchema(adminSettings).omit({ id: true });

// api/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error(
    "\u274C DATABASE_URL is not set!\n\u{1F4A1} Get it from: https://neon.tech\n\u{1F4DD} Add it to Vercel: Dashboard \u2192 Settings \u2192 Environment Variables"
  );
}
if (!process.env.DATABASE_URL.includes("neon.tech") && process.env.NODE_ENV === "production") {
  console.warn("\u26A0\uFE0F Warning: DATABASE_URL does not appear to be a Neon connection string");
}
neonConfig.fetchConnectionCache = true;
var sql = neon(process.env.DATABASE_URL);
var db = drizzle(sql, { schema: schema_exports });
console.log("\u2705 Database configured: Neon PostgreSQL (HTTP mode for Vercel)");

// api/import-transactions.ts
import XLSX from "xlsx";
var formatDate = (val) => {
  if (!val) return null;
  if (typeof val === "number") {
    const date2 = new Date((val - 25569) * 86400 * 1e3);
    return date2.toISOString().split("T")[0];
  }
  if (typeof val === "string") {
    if (val.includes("-")) return val;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return String(val);
};
async function importPurchasesFromExcel(filePath) {
  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  const groups = {};
  rows.forEach((row) => {
    const key = row.ID ? String(row.ID) : `${row.DATE}_${row.SUPPLIER}_${row.WAREHOUSE}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  const errors = [];
  let successCount = 0;
  const supplierMap = {};
  const warehouseMap = {};
  const itemMap = {};
  const allSuppliers = await db.select().from(suppliers);
  allSuppliers.forEach((s) => supplierMap[s.name.toLowerCase()] = s.id);
  const allWarehouses = await db.select().from(warehouses);
  allWarehouses.forEach((w) => warehouseMap[w.name.toLowerCase()] = w.id);
  const allItems = await db.select().from(items);
  allItems.forEach((i) => itemMap[i.name.toLowerCase()] = i.id);
  for (const key in groups) {
    try {
      const groupRows = groups[key];
      const first = groupRows[0];
      const supplierId = supplierMap[String(first.SUPPLIER || "").toLowerCase()];
      const warehouseId = warehouseMap[String(first.WAREHOUSE || "").toLowerCase()];
      if (!supplierId || !warehouseId) {
        throw new Error(`Invalid supplier (${first.SUPPLIER}) or warehouse (${first.WAREHOUSE})`);
      }
      const totalAmount = groupRows.reduce((sum, r) => sum + Number(r.QUANTITY) * Number(r.RATE), 0);
      await db.transaction(async (tx) => {
        const [purchase] = await tx.insert(purchases).values({
          purchaseDate: formatDate(first.DATE) || String(first.DATE),
          supplierId,
          warehouseId,
          totalAmount: String(totalAmount),
          payingAmount: String(first.PAID_AMOUNT || 0),
          dueDate: formatDate(first.DUE_DATE)
        }).returning();
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
            amount: String(amount)
          });
          await tx.insert(stockLedger).values({
            itemId,
            warehouseId,
            quantity: String(qty),
            referenceType: "PURCHASE",
            referenceId: purchase.id
          });
        }
      });
      successCount++;
    } catch (err) {
      errors.push({ key, error: err.message });
    }
  }
  return { total: Object.keys(groups).length, success: successCount, failed: errors.length, errors };
}
async function importSalesFromExcel(filePath) {
  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  const groups = {};
  rows.forEach((row) => {
    const key = row.ID ? String(row.ID) : `${row.DATE}_${row.CUSTOMER}_${row.WAREHOUSE}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  const errors = [];
  let successCount = 0;
  const customerMap = {};
  const warehouseMap = {};
  const itemMap = {};
  const allCustomers = await db.select().from(customers);
  allCustomers.forEach((c) => customerMap[c.name.toLowerCase()] = c.id);
  const allWarehouses = await db.select().from(warehouses);
  allWarehouses.forEach((w) => warehouseMap[w.name.toLowerCase()] = w.id);
  const allItems = await db.select().from(items);
  allItems.forEach((i) => itemMap[i.name.toLowerCase()] = i.id);
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
        const processedItems = groupRows.map((r) => {
          const itemId = itemMap[String(r.ITEM || "").toLowerCase()];
          if (!itemId) throw new Error(`Item not found: ${r.ITEM}`);
          const qty = Number(r.QUANTITY);
          const rate = Number(r.RATE);
          const amount = qty * rate;
          const gstRate = Number(r.GST_RATE || 0);
          const gstAmount = amount * gstRate / 100;
          totalTaxable += amount;
          totalGst += gstAmount;
          return { itemId, qty, rate, amount, gstRate, gstAmount, r };
        });
        const totalAmount = totalTaxable + totalGst;
        const [sale] = await tx.insert(sales).values({
          saleDate: formatDate(first.DATE) || String(first.DATE),
          customerId,
          warehouseId,
          totalAmount: String(totalAmount),
          receivedAmount: String(first.RECEIVED_AMOUNT || 0),
          dueDate: formatDate(first.DUE_DATE),
          cgstAmount: String(totalGst / 2),
          // Default to CGST/SGST split
          sgstAmount: String(totalGst / 2),
          igstAmount: "0",
          ewayBillNumber: first.EWAY_BILL_NO || null
        }).returning();
        for (const item of processedItems) {
          await tx.insert(salesItems).values({
            saleId: sale.id,
            itemId: item.itemId,
            quantity: String(item.qty),
            rate: String(item.rate),
            amount: String(item.amount),
            gstRate: String(item.gstRate),
            gstAmount: String(item.gstAmount)
          });
          await tx.insert(stockLedger).values({
            itemId: item.itemId,
            warehouseId,
            quantity: String(-item.qty),
            referenceType: "SALE",
            referenceId: sale.id
          });
        }
      });
      successCount++;
    } catch (err) {
      errors.push({ key, error: err.message });
    }
  }
  return { total: Object.keys(groups).length, success: successCount, failed: errors.length, errors };
}

// api/utils/cleanup.ts
import { unlink } from "fs";
import { promisify } from "util";
var unlinkAsync = promisify(unlink);
async function cleanupTempFile(filePath) {
  try {
    await unlinkAsync(filePath);
    console.log(`\u2705 Cleaned up temp file: ${filePath}`);
  } catch (error) {
    console.warn(`\u26A0\uFE0F Could not cleanup file ${filePath}:`, error);
  }
}

// api/routes.ts
import { tmpdir } from "os";
import { existsSync, mkdirSync } from "fs";
var uploadDir = process.env.VERCEL ? tmpdir() : "uploads/";
if (!process.env.VERCEL && !existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}
var upload = multer({
  dest: uploadDir,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".xlsx" && ext !== ".xls") {
      cb(new Error("Only Excel files allowed"));
    } else {
      cb(null, true);
    }
  }
});
async function registerRoutes(_server, app2) {
  app2.use(async (req, res, next) => {
    if (!req.path.startsWith("/api") || req.path === "/api/health" || req.path === "/api/login" || req.path === "/api/user" || req.path === "/api/logout" || req.path === "/api/admin" || req.path.startsWith("/api/debug")) {
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
      next();
    }
  });
  console.log("Registering API routes - Version: 1.0.1");
  app2.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  const handleDbError = (err, res) => {
    console.error("Database error:", err);
    let errorMessage = "Internal server error";
    if (err?.code === "23505") errorMessage = "A record with this information already exists";
    else if (err?.code === "23503") errorMessage = "Cannot delete/update because it is referenced by other records.";
    else if (err?.message) errorMessage = err.message;
    res.status(500).json({ message: errorMessage });
  };
  app2.get("/api/debug/inspect-payments", async (_req, res) => {
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
  app2.post("/api/purchases/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const filePath = req.file.path;
      try {
        const result = await importPurchasesFromExcel(filePath);
        res.json(result);
      } finally {
        await cleanupTempFile(filePath);
      }
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.post("/api/sales/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const filePath = req.file.path;
      try {
        const result = await importSalesFromExcel(filePath);
        res.json(result);
      } finally {
        await cleanupTempFile(filePath);
      }
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/debug/sync-balances", async (_req, res) => {
    try {
      console.log("Starting master balance synchronization...");
      await db.delete(supplierPayments).where(sql2`${supplierPayments.remarks} LIKE 'Healed by sync-balances%'`);
      await db.delete(customerPayments).where(sql2`${customerPayments.remarks} LIKE 'Healed by sync-balances%'`);
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
      const dedupe = (list2, table, linkKey) => {
        const seen = /* @__PURE__ */ new Set();
        const toDelete = [];
        for (const p of list2) {
          const key = `${p[linkKey] || "null"}-${Number(p.amount)}-${p.paymentDate}-${p.supplierId || p.customerId}`;
          if (seen.has(key) && (p.remarks || "").indexOf("Initial") === -1) toDelete.push(p.id);
          else seen.add(key);
        }
        return toDelete;
      };
      const spDelete = dedupe(allSPayments, supplierPayments, "purchaseId");
      if (spDelete.length > 0) await db.delete(supplierPayments).where(inArray(supplierPayments.id, spDelete));
      const cpDelete = dedupe(allCPayments, customerPayments, "saleId");
      if (cpDelete.length > 0) await db.delete(customerPayments).where(inArray(customerPayments.id, cpDelete));
      const [finalSP, finalCP] = await Promise.all([db.select().from(supplierPayments), db.select().from(customerPayments)]);
      const pMap = /* @__PURE__ */ new Map();
      allPurchases.forEach((p) => pMap.set(p.id, 0));
      const sMap = /* @__PURE__ */ new Map();
      allSales.forEach((s) => sMap.set(s.id, 0));
      for (const p of finalSP) {
        let targetId = p.purchaseId;
        if (!targetId || allPurchases.find((x) => x.id === targetId)?.supplierId !== p.supplierId) {
          const oldest = allPurchases.find(
            (pur) => pur.supplierId === p.supplierId && Number(pur.totalAmount) - (pMap.get(pur.id) || 0) > 0.01
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
      for (const p of finalCP) {
        let targetId = p.saleId;
        if (!targetId || allSales.find((x) => x.id === targetId)?.customerId !== p.customerId) {
          const oldest = allSales.find(
            (s) => s.customerId === p.customerId && Number(s.totalAmount) - (sMap.get(s.id) || 0) > 0.01
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
            remarks: "Healed by sync-balances (balance gap fix)"
          });
          pMap.set(pur.id, recorded);
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
            remarks: "Healed by sync-balances (balance gap fix)"
          });
          sMap.set(sale.id, recorded);
        }
      }
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
  app2.post("/api/debug/sync-stock", async (_req, res) => {
    try {
      console.log("Starting Optimized Stock Ledger Sync...");
      await db.execute(sql2`
        DELETE FROM stock_ledger 
        WHERE reference_type LIKE 'PRODUCTION%' 
        AND reference_id NOT IN (SELECT id FROM production_runs)
      `);
      await db.execute(sql2`
        DELETE FROM stock_ledger 
        WHERE reference_type LIKE 'PURCHASE%' 
        AND reference_id NOT IN (SELECT id FROM purchases)
      `);
      await db.execute(sql2`
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
  app2.post("/api/debug/rebuild-inventory", async (_req, res) => {
    try {
      console.log("[REBUILD] Starting complete inventory ledger rebuild...");
      await db.transaction(async (tx) => {
        await tx.delete(stockLedger);
        console.log("[REBUILD] Wiped stock_ledger table.");
        const activePurchases = await tx.query.purchases.findMany({
          where: eq(purchases.isDeleted, false),
          with: { items: true }
        });
        for (const p of activePurchases) {
          for (const item of p.items) {
            await tx.insert(stockLedger).values({
              itemId: item.itemId,
              warehouseId: p.warehouseId,
              quantity: String(item.quantity),
              referenceType: "PURCHASE",
              referenceId: p.id,
              createdAt: new Date(p.purchaseDate)
            });
          }
        }
        console.log(`[REBUILD] Re-inserted ${activePurchases.length} active purchases.`);
        const activeSales = await tx.query.sales.findMany({
          where: eq(sales.isDeleted, false),
          with: { items: true }
        });
        for (const s of activeSales) {
          for (const item of s.items) {
            await tx.insert(stockLedger).values({
              itemId: item.itemId,
              warehouseId: s.warehouseId,
              quantity: String(-Math.abs(Number(item.quantity))),
              referenceType: "SALE",
              referenceId: s.id,
              createdAt: new Date(s.saleDate)
            });
          }
        }
        console.log(`[REBUILD] Re-inserted ${activeSales.length} active sales.`);
        const activeProduction = await tx.query.productionRuns.findMany({
          where: eq(productionRuns.isDeleted, false),
          with: { consumptions: true }
        });
        for (const pr of activeProduction) {
          await tx.insert(stockLedger).values({
            itemId: pr.outputItemId,
            warehouseId: pr.warehouseId,
            quantity: String(pr.outputQuantity),
            referenceType: "PRODUCTION",
            referenceId: pr.id,
            createdAt: new Date(pr.productionDate)
          });
          for (const c of pr.consumptions) {
            await tx.insert(stockLedger).values({
              itemId: c.itemId,
              warehouseId: pr.warehouseId,
              quantity: String(-Math.abs(Number(c.actualQty))),
              referenceType: "PRODUCTION_CONSUMPTION",
              referenceId: pr.id,
              createdAt: new Date(pr.productionDate)
            });
          }
        }
        console.log(`[REBUILD] Re-inserted ${activeProduction.length} active production runs.`);
        const transfers = await tx.select().from(stockTransfers);
        for (const t of transfers) {
          await tx.insert(stockLedger).values({
            itemId: t.itemId,
            warehouseId: t.fromWarehouseId,
            quantity: String(-Math.abs(Number(t.quantity))),
            referenceType: "TRANSFER_OUT",
            referenceId: t.id,
            createdAt: new Date(t.transferDate)
          });
          if (t.toWarehouseId) {
            await tx.insert(stockLedger).values({
              itemId: t.itemId,
              warehouseId: t.toWarehouseId,
              quantity: String(Math.abs(Number(t.quantity))),
              referenceType: "TRANSFER_IN",
              referenceId: t.id,
              createdAt: new Date(t.transferDate)
            });
          }
        }
        console.log(`[REBUILD] Re-inserted ${transfers.length} stock transfers.`);
      });
      res.json({ message: "Inventory ledger has been completely rebuilt from active transactions." });
    } catch (err) {
      console.error("[REBUILD] Error:", err);
      handleDbError(err, res);
    }
  });
  const list = async (table, res) => {
    try {
      const rows = await db.select().from(table);
      res.json({ data: rows });
    } catch (err) {
      handleDbError(err, res);
    }
  };
  const create = async (table, data, res) => {
    try {
      if (table === items) {
        console.log("Updating Item:", data);
        if (data.reorderLevel !== void 0) {
          data.reorderLevel = String(data.reorderLevel);
        }
        if (data.gstRate !== void 0) {
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
  const update = async (table, id, data, res) => {
    try {
      if (table === items) {
        console.log("Updating Item ID:", id, "Data:", data);
        if (data.reorderLevel !== void 0) {
          data.reorderLevel = String(data.reorderLevel);
        }
        if (data.gstRate !== void 0) {
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
  const remove = async (table, id, res) => {
    try {
      await db.delete(table).where(eq(table.id, id));
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      handleDbError(err, res);
    }
  };
  app2.get("/api/categories", async (_req, res) => list(categories, res));
  app2.post("/api/categories", async (req, res) => create(categories, req.body, res));
  app2.put("/api/categories/:id", async (req, res) => update(categories, parseInt(req.params.id), req.body, res));
  app2.delete("/api/categories/:id", async (req, res) => remove(categories, parseInt(req.params.id), res));
  app2.get("/api/uoms", async (_req, res) => list(unitsOfMeasure, res));
  app2.post("/api/uoms", async (req, res) => create(unitsOfMeasure, req.body, res));
  app2.put("/api/uoms/:id", async (req, res) => update(unitsOfMeasure, parseInt(req.params.id), req.body, res));
  app2.delete("/api/uoms/:id", async (req, res) => remove(unitsOfMeasure, parseInt(req.params.id), res));
  app2.get("/api/warehouses", async (_req, res) => list(warehouses, res));
  app2.post("/api/warehouses", async (req, res) => create(warehouses, req.body, res));
  app2.put("/api/warehouses/:id", async (req, res) => update(warehouses, parseInt(req.params.id), req.body, res));
  app2.delete("/api/warehouses/:id", async (req, res) => remove(warehouses, parseInt(req.params.id), res));
  app2.get("/api/items", async (_req, res) => {
    try {
      const rows = await db.select({
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
        gstRate: items.gstRate
      }).from(items).leftJoin(categories, eq(items.categoryId, categories.id));
      res.json({ data: rows });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.post("/api/items", async (req, res) => create(items, req.body, res));
  app2.put("/api/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, categoryId, defaultUomId, reorderLevel, hsnCode, gstRate, isActive } = req.body;
      console.log(`[DEBUG] Updating Item ${id}:`, req.body);
      const result = await db.update(items).set({
        name,
        categoryId,
        defaultUomId,
        reorderLevel: String(reorderLevel || 0),
        hsnCode,
        gstRate: String(gstRate || 0),
        isActive
      }).where(eq(items.id, id)).returning();
      if (!result.length) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(result[0]);
    } catch (e) {
      handleDbError(e, res);
    }
  });
  app2.delete("/api/items/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      const references = [];
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
      } catch (checkErr) {
        console.error("Error checking references:", checkErr);
      }
      if (references.length > 0) {
        return res.status(400).json({
          message: `Cannot delete item. It is currently referenced in: ${references.join(", ")}. Please remove these references first.`
        });
      }
      await db.delete(stockLedger).where(eq(stockLedger.itemId, itemId));
      await db.delete(items).where(eq(items.id, itemId));
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      console.error("Delete item error:", err);
      handleDbError(err, res);
    }
  });
  app2.get("/api/suppliers", async (_req, res) => list(suppliers, res));
  app2.post("/api/suppliers", async (req, res) => create(suppliers, req.body, res));
  app2.put("/api/suppliers/:id", async (req, res) => update(suppliers, parseInt(req.params.id), req.body, res));
  app2.delete("/api/suppliers/:id", async (req, res) => remove(suppliers, parseInt(req.params.id), res));
  app2.get("/api/customers", async (_req, res) => list(customers, res));
  app2.post("/api/customers", async (req, res) => create(customers, req.body, res));
  app2.put("/api/customers/:id", async (req, res) => update(customers, parseInt(req.params.id), req.body, res));
  app2.delete("/api/customers/:id", async (req, res) => remove(customers, parseInt(req.params.id), res));
  app2.get("/api/owners", async (_req, res) => list(owners, res));
  app2.post("/api/owners", async (req, res) => create(owners, req.body, res));
  app2.put("/api/owners/:id", async (req, res) => update(owners, parseInt(req.params.id), req.body, res));
  app2.delete("/api/owners/:id", async (req, res) => remove(owners, parseInt(req.params.id), res));
  app2.get("/api/expense-heads", async (_req, res) => list(expenseHeads, res));
  app2.post("/api/expense-heads", async (req, res) => create(expenseHeads, req.body, res));
  app2.put("/api/expense-heads/:id", async (req, res) => update(expenseHeads, parseInt(req.params.id), req.body, res));
  app2.delete("/api/expense-heads/:id", async (req, res) => remove(expenseHeads, parseInt(req.params.id), res));
  app2.get("/api/payment-methods", async (_req, res) => list(paymentMethods, res));
  app2.post("/api/payment-methods", async (req, res) => create(paymentMethods, req.body, res));
  app2.put("/api/payment-methods/:id", async (req, res) => update(paymentMethods, parseInt(req.params.id), req.body, res));
  app2.delete("/api/payment-methods/:id", async (req, res) => remove(paymentMethods, parseInt(req.params.id), res));
  app2.get("/api/purchases", async (_req, res) => {
    const rows = await db.query.purchases.findMany({
      where: (p, { eq: eq3 }) => eq3(p.isDeleted, false),
      with: {
        supplier: true,
        warehouse: true,
        items: {
          with: {
            item: true
          }
        }
      },
      orderBy: (p, { desc: desc2 }) => [desc2(p.purchaseDate)]
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
        amount: i.amount
      }))
    }));
    res.json(formatted);
  });
  app2.post("/api/purchases", async (req, res) => {
    try {
      const {
        purchaseDate,
        supplierId,
        warehouseId,
        payingAmount,
        dueDate,
        lineItems
      } = req.body;
      if (!lineItems || !lineItems.length) {
        return res.status(400).json({ message: "No line items provided" });
      }
      const totalAmount = lineItems.reduce(
        (sum, i) => sum + Number(i.amount),
        0
      );
      const [purchase] = await db.insert(purchases).values({
        purchaseDate,
        supplierId,
        warehouseId,
        totalAmount: String(totalAmount),
        payingAmount: String(payingAmount || 0),
        dueDate: dueDate || null
      }).returning();
      for (const li of lineItems) {
        await db.insert(purchaseItems).values({
          purchaseId: purchase.id,
          itemId: li.itemId,
          quantity: String(li.quantity),
          rate: String(li.rate),
          amount: String(li.amount)
        });
        await db.insert(stockLedger).values({
          itemId: li.itemId,
          warehouseId,
          quantity: String(li.quantity),
          referenceType: "PURCHASE",
          referenceId: purchase.id
        });
      }
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
            remarks: "Initial payment at purchase time"
          });
        }
      }
      res.status(201).json(purchase);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.delete("/api/purchases/:id", async (req, res) => {
    try {
      const purchaseId = parseInt(req.params.id);
      const purchaseItemsData = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
      const [purchase] = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      const itemIds = purchaseItemsData.map((i) => i.itemId);
      console.log(`[DELETE Purchase] ID: ${purchaseId}, Date: ${purchase.purchaseDate}, Item IDs: ${itemIds}`);
      if (itemIds.length > 0) {
        const dependentProduction = await db.select({
          id: productionRuns.id,
          productionDate: productionRuns.productionDate
        }).from(productionRuns).innerJoin(productionConsumptions, eq(productionRuns.id, productionConsumptions.productionRunId)).where(
          and(
            inArray(productionConsumptions.itemId, itemIds),
            sql2`CAST(${productionRuns.productionDate} AS DATE) >= CAST(${purchase.purchaseDate} AS DATE)`,
            eq(productionRuns.isDeleted, false)
          )
        ).limit(1);
        console.log(`[DELETE Purchase] Dependent production found count: ${dependentProduction.length}`);
        if (dependentProduction.length > 0) {
          const formattedDate = format(new Date(dependentProduction[0].productionDate), "dd/MM/yyyy");
          console.log(`[DELETE Purchase] Blocking deletion. Dependent run: ${dependentProduction[0].id} on ${formattedDate}`);
          return res.status(400).json({
            message: `Cannot delete purchase. Production order(s) (e.g., from ${formattedDate}) have been recorded after this purchase using these items. Please delete the associated production orders first to maintain stock integrity.`
          });
        }
      }
      for (const item of purchaseItemsData) {
        await db.insert(stockLedger).values({
          itemId: item.itemId,
          warehouseId: purchase.warehouseId,
          quantity: String(-Math.abs(Number(item.quantity))),
          // Negative to subtract
          referenceType: "PURCHASE_REVERSAL",
          referenceId: purchaseId,
          createdAt: new Date(purchase.purchaseDate)
          // 🎯 Backdate to original date
        });
      }
      await db.update(purchases).set({ isDeleted: true, deletedAt: /* @__PURE__ */ new Date() }).where(eq(purchases.id, purchaseId));
      res.json({ message: "Purchase moved to trash and stock reversed" });
    } catch (err) {
      console.error("Purchase DELETE error:", err);
      handleDbError(err, res);
    }
  });
  app2.put("/api/purchases/:id", async (req, res) => {
    try {
      const purchaseId = parseInt(req.params.id);
      const {
        purchaseDate,
        supplierId,
        warehouseId,
        dueDate,
        lineItems,
        payingAmount
      } = req.body;
      if (!lineItems || !lineItems.length) {
        return res.status(400).json({ message: "No line items provided" });
      }
      await db.transaction(async (tx) => {
        const oldItems = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
        const [oldPurchase] = await tx.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
        if (!oldPurchase) {
          throw new Error("Purchase not found");
        }
        for (const item of oldItems) {
          await tx.insert(stockLedger).values({
            itemId: item.itemId,
            warehouseId: oldPurchase.warehouseId,
            quantity: String(-Math.abs(Number(item.quantity))),
            referenceType: "PURCHASE_UPDATE_REVERSAL",
            referenceId: purchaseId
          });
        }
        await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
        const totalAmount = lineItems.reduce((sum, i) => sum + Number(i.amount), 0);
        const updateData = {
          purchaseDate,
          supplierId,
          warehouseId,
          totalAmount: String(totalAmount),
          dueDate: dueDate || null
        };
        if (payingAmount !== void 0) {
          updateData.payingAmount = String(payingAmount);
        }
        await tx.update(purchases).set(updateData).where(eq(purchases.id, purchaseId));
        for (const li of lineItems) {
          await tx.insert(purchaseItems).values({
            purchaseId,
            itemId: li.itemId,
            quantity: String(li.quantity),
            rate: String(li.rate),
            amount: String(li.amount)
          });
          await tx.insert(stockLedger).values({
            itemId: li.itemId,
            warehouseId,
            quantity: String(li.quantity),
            referenceType: "PURCHASE_UPDATE",
            referenceId: purchaseId
          });
        }
        if (payingAmount !== void 0) {
          await tx.update(supplierPayments).set({
            amount: String(payingAmount),
            supplierId,
            paymentDate: purchaseDate
          }).where(and(
            eq(supplierPayments.purchaseId, purchaseId),
            eq(supplierPayments.remarks, "Initial payment at purchase time")
          ));
        }
      });
      res.json({ message: "Purchase updated successfully" });
    } catch (err) {
      console.error("Purchase UPDATE error:", err);
      res.status(err.message === "Purchase not found" ? 404 : 500).json({ message: err.message });
    }
  });
  app2.get("/api/sales", async (_req, res) => {
    const rows = await db.query.sales.findMany({
      where: (s, { eq: eq3 }) => eq3(s.isDeleted, false),
      with: {
        customer: true,
        warehouse: true,
        items: {
          with: {
            item: true
          }
        }
      },
      orderBy: (s, { desc: desc2 }) => [desc2(s.saleDate)]
    });
    const formatted = rows.map((s) => ({
      ...s,
      customer: s.customer?.name ?? "-",
      warehouse: s.warehouse?.name ?? "-",
      lineItems: s.items.map((i) => ({
        ...i,
        item: i.item?.name ?? "-",
        hsnCode: i.item?.hsnCode ?? "-"
      }))
    }));
    res.json(formatted);
  });
  app2.post("/api/sales", async (req, res) => {
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
      const insufficientStockItems = [];
      for (const li of lineItems) {
        const stockData = await db.select({
          quantity: sql2`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL)`
        }).from(stockLedger).where(
          sql2`${stockLedger.itemId} = ${li.itemId} AND ${stockLedger.warehouseId} = ${warehouseId}`
        );
        const currentStock = Number(stockData[0]?.quantity || 0);
        const requestedQty = Number(li.quantity);
        if (currentStock < requestedQty) {
          const [item] = await db.select().from(items).where(eq(items.id, li.itemId)).limit(1);
          insufficientStockItems.push({
            itemName: item?.name || `Item ${li.itemId}`,
            available: currentStock,
            requested: requestedQty,
            shortage: requestedQty - currentStock
          });
        }
      }
      if (insufficientStockItems.length > 0) {
        const errorMessage = insufficientStockItems.map(
          (item) => `${item.itemName}: Available ${item.available.toFixed(2)}, Requested ${item.requested.toFixed(2)} (Short by ${item.shortage.toFixed(2)})`
        ).join("; ");
        return res.status(400).json({
          message: `Insufficient stock for ${insufficientStockItems.length} item(s)`,
          details: errorMessage,
          insufficientItems: insufficientStockItems
        });
      }
      const subTotal = lineItems.reduce(
        (sum, i) => sum + Number(i.amount),
        0
      );
      const totalAmount = subTotal + Number(cgstAmount || 0) + Number(sgstAmount || 0) + Number(igstAmount || 0);
      const [sale] = await db.insert(sales).values({
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
        igstAmount: String(igstAmount || 0)
      }).returning();
      for (const li of lineItems) {
        await db.insert(salesItems).values({
          saleId: sale.id,
          itemId: li.itemId,
          quantity: String(li.quantity),
          rate: String(li.rate),
          amount: String(li.amount),
          gstRate: String(li.gstRate || 0),
          gstAmount: String(li.gstAmount || 0)
        });
        await db.insert(stockLedger).values({
          itemId: li.itemId,
          warehouseId,
          quantity: String(-Math.abs(Number(li.quantity))),
          // Force negative
          referenceType: "SALE",
          referenceId: sale.id
        });
      }
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
            remarks: "Initial receipt at sale time"
          });
        }
      }
      res.status(201).json(sale);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.delete("/api/sales/:id", async (req, res) => {
    try {
      const saleId = parseInt(req.params.id);
      const saleItemsData = await db.select().from(salesItems).where(eq(salesItems.saleId, saleId));
      const [sale] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      for (const item of saleItemsData) {
        await db.insert(stockLedger).values({
          itemId: item.itemId,
          warehouseId: sale.warehouseId,
          quantity: String(Math.abs(Number(item.quantity))),
          // Positive to add back
          referenceType: "SALE_REVERSAL",
          referenceId: saleId,
          createdAt: new Date(sale.saleDate)
          // 🎯 Backdate to original date
        });
      }
      await db.update(sales).set({ isDeleted: true, deletedAt: /* @__PURE__ */ new Date() }).where(eq(sales.id, saleId));
      res.json({ message: "Sale moved to trash and stock reversed" });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.put("/api/sales/:id", async (req, res) => {
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
        const oldItems = await tx.select().from(salesItems).where(eq(salesItems.saleId, saleId));
        const [oldSale] = await tx.select().from(sales).where(eq(sales.id, saleId)).limit(1);
        if (!oldSale) {
          throw new Error("Sale not found");
        }
        for (const item of oldItems) {
          await tx.insert(stockLedger).values({
            itemId: item.itemId,
            warehouseId: oldSale.warehouseId,
            quantity: String(Math.abs(Number(item.quantity))),
            referenceType: "SALE_UPDATE_REVERSAL",
            referenceId: saleId
          });
        }
        const insufficientStockItems = [];
        for (const li of lineItems) {
          const stockData = await tx.select({
            quantity: sql2`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL)`
          }).from(stockLedger).where(and(eq(stockLedger.itemId, li.itemId), eq(stockLedger.warehouseId, warehouseId)));
          const currentStock = Number(stockData[0]?.quantity || 0);
          const requestedQty = Number(li.quantity);
          if (currentStock < requestedQty) {
            const [item] = await tx.select().from(items).where(eq(items.id, li.itemId)).limit(1);
            insufficientStockItems.push({
              itemName: item?.name || `Item ${li.itemId}`,
              available: currentStock,
              requested: requestedQty
            });
          }
        }
        if (insufficientStockItems.length > 0) {
          throw new Error(`Insufficient stock for items: ${insufficientStockItems.map((i) => i.itemName).join(", ")}`);
        }
        await tx.delete(salesItems).where(eq(salesItems.saleId, saleId));
        const subTotal = lineItems.reduce((sum, i) => sum + Number(i.amount), 0);
        const totalAmount = subTotal + Number(cgstAmount || 0) + Number(sgstAmount || 0) + Number(igstAmount || 0);
        const updateData = {
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
          igstAmount: String(igstAmount || 0)
        };
        if (receivedAmount !== void 0) updateData.receivedAmount = String(receivedAmount);
        await tx.update(sales).set(updateData).where(eq(sales.id, saleId));
        for (const li of lineItems) {
          await tx.insert(salesItems).values({
            saleId,
            itemId: li.itemId,
            quantity: String(li.quantity),
            rate: String(li.rate),
            amount: String(li.amount),
            gstRate: String(li.gstRate || 0),
            gstAmount: String(li.gstAmount || 0)
          });
          await tx.insert(stockLedger).values({
            itemId: li.itemId,
            warehouseId,
            quantity: String(-Math.abs(Number(li.quantity))),
            referenceType: "SALE_UPDATE",
            referenceId: saleId
          });
        }
        if (receivedAmount !== void 0) {
          await tx.update(customerPayments).set({
            amount: String(receivedAmount),
            customerId,
            paymentDate: saleDate
          }).where(and(
            eq(customerPayments.saleId, saleId),
            eq(customerPayments.remarks, "Initial receipt at sale time")
          ));
        }
      });
      res.json({ message: "Sale updated successfully" });
    } catch (err) {
      console.error("Sale UPDATE error:", err);
      res.status(err.message.startsWith("Insufficient stock") ? 400 : err.message === "Sale not found" ? 404 : 500).json({ message: err.message });
    }
  });
  app2.get("/api/customer-summary", async (_req, res) => {
    try {
      const result = await db.select({
        customerId: sales.customerId,
        customer: customers.name,
        totalSales: sql2`COALESCE(SUM(${sales.totalAmount}), 0)`
      }).from(sales).leftJoin(customers, eq(sales.customerId, customers.id)).groupBy(sales.customerId, customers.name).orderBy(desc(sql2`SUM(${sales.totalAmount})`));
      res.json(result);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/supplier-payments", async (_req, res) => {
    try {
      const rows = await db.query.supplierPayments.findMany({
        with: {
          supplier: true,
          owner: true
        },
        orderBy: (sp, { desc: desc2 }) => [desc2(sp.paymentDate)]
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
        purchaseId: sp.purchaseId
      }));
      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.post("/api/supplier-payments", async (req, res) => {
    try {
      const { paymentDate, supplierId, purchaseId, ownerId, amount, paymentMethod, remarks } = req.body;
      let effectivePurchaseId = purchaseId ? Number(purchaseId) : null;
      if (!effectivePurchaseId) {
        const [oldestOutstanding] = await db.select().from(purchases).where(and(
          eq(purchases.supplierId, Number(supplierId)),
          sql2`CAST(${purchases.totalAmount} AS DECIMAL) > CAST(${purchases.payingAmount} AS DECIMAL)`
        )).orderBy(asc(purchases.id)).limit(1);
        if (oldestOutstanding) {
          effectivePurchaseId = oldestOutstanding.id;
        }
      }
      const [payment] = await db.insert(supplierPayments).values({
        paymentDate,
        supplierId,
        purchaseId: effectivePurchaseId,
        ownerId,
        amount: String(amount),
        paymentMethod,
        remarks,
        nextPaymentDate: req.body.nextPaymentDate || null
      }).returning();
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
  app2.put("/api/supplier-payments/:id", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { paymentDate, supplierId, purchaseId, ownerId, amount, paymentMethod, remarks } = req.body;
      const [oldPayment] = await db.select().from(supplierPayments).where(eq(supplierPayments.id, paymentId)).limit(1);
      if (!oldPayment) return res.status(404).json({ message: "Payment not found" });
      let effectivePurchaseId = purchaseId ? Number(purchaseId) : null;
      if (!effectivePurchaseId) {
        const [oldestOutstanding] = await db.select().from(purchases).where(and(
          eq(purchases.supplierId, Number(supplierId)),
          sql2`CAST(${purchases.totalAmount} AS DECIMAL) > CAST(${purchases.payingAmount} AS DECIMAL)`
        )).orderBy(asc(purchases.id)).limit(1);
        if (oldestOutstanding) {
          effectivePurchaseId = oldestOutstanding.id;
        }
      }
      const [payment] = await db.update(supplierPayments).set({
        paymentDate,
        supplierId,
        purchaseId: effectivePurchaseId,
        ownerId,
        amount: String(amount),
        paymentMethod,
        remarks,
        nextPaymentDate: req.body.nextPaymentDate || null
      }).where(eq(supplierPayments.id, paymentId)).returning();
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
  app2.delete("/api/supplier-payments/:id", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const [payment] = await db.select().from(supplierPayments).where(eq(supplierPayments.id, paymentId)).limit(1);
      if (!payment) {
        return res.status(404).json({ message: "Supplier payment not found" });
      }
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
  app2.get("/api/customer-payments", async (_req, res) => {
    try {
      const rows = await db.query.customerPayments.findMany({
        with: {
          customer: true,
          owner: true
        },
        orderBy: (cp, { desc: desc2 }) => [desc2(cp.paymentDate)]
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
        saleId: cp.saleId
      }));
      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.post("/api/customer-payments", async (req, res) => {
    try {
      const { paymentDate, customerId, saleId, ownerId, amount, paymentMethod, remarks } = req.body;
      let effectiveSaleId = saleId ? Number(saleId) : null;
      if (!effectiveSaleId) {
        const [oldestOutstanding] = await db.select().from(sales).where(and(
          eq(sales.customerId, Number(customerId)),
          sql2`CAST(${sales.totalAmount} AS DECIMAL) > CAST(${sales.receivedAmount} AS DECIMAL)`
        )).orderBy(asc(sales.id)).limit(1);
        if (oldestOutstanding) {
          effectiveSaleId = oldestOutstanding.id;
        }
      }
      const [payment] = await db.insert(customerPayments).values({
        paymentDate,
        customerId,
        saleId: effectiveSaleId,
        ownerId,
        amount: String(amount),
        paymentMethod,
        remarks,
        nextReceiptDate: req.body.nextReceiptDate || null
      }).returning();
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
  app2.put("/api/customer-payments/:id", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { paymentDate, customerId, saleId, ownerId, amount, paymentMethod, remarks } = req.body;
      const [oldPayment] = await db.select().from(customerPayments).where(eq(customerPayments.id, paymentId)).limit(1);
      if (!oldPayment) return res.status(404).json({ message: "Receipt not found" });
      let effectiveSaleId = saleId ? Number(saleId) : null;
      if (!effectiveSaleId) {
        const [oldestOutstanding] = await db.select().from(sales).where(and(
          eq(sales.customerId, Number(customerId)),
          sql2`CAST(${sales.totalAmount} AS DECIMAL) > CAST(${sales.receivedAmount} AS DECIMAL)`
        )).orderBy(asc(sales.id)).limit(1);
        if (oldestOutstanding) {
          effectiveSaleId = oldestOutstanding.id;
        }
      }
      const [payment] = await db.update(customerPayments).set({
        paymentDate,
        customerId,
        saleId: effectiveSaleId,
        ownerId,
        amount: String(amount),
        paymentMethod,
        remarks,
        nextReceiptDate: req.body.nextReceiptDate || null
      }).where(eq(customerPayments.id, paymentId)).returning();
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
  app2.delete("/api/customer-payments/:id", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const [payment] = await db.select().from(customerPayments).where(eq(customerPayments.id, paymentId)).limit(1);
      if (!payment) {
        return res.status(404).json({ message: "Customer payment not found" });
      }
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
  app2.get("/api/stock-transfers", async (_req, res) => {
    try {
      const rows = await db.query.stockTransfers.findMany({
        with: {
          item: true,
          fromWarehouse: true,
          toWarehouse: true,
          uom: true
        },
        orderBy: (st, { desc: desc2 }) => [desc2(st.transferDate)]
      });
      res.json(rows);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.post("/api/stock-transfers", async (req, res) => {
    try {
      const { transferDate, itemId, fromWarehouseId, toWarehouseId, quantity, uomId, remarks } = req.body;
      if (!transferDate || !itemId || !fromWarehouseId || !quantity || !uomId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const stockData = await db.select({
        quantity: sql2`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL)`
      }).from(stockLedger).where(
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
      const [transfer] = await db.insert(stockTransfers).values({
        transferDate,
        itemId,
        fromWarehouseId,
        toWarehouseId: toWarehouseId || null,
        quantity: String(quantity),
        uomId,
        remarks
      }).returning();
      await db.insert(stockLedger).values({
        itemId,
        warehouseId: fromWarehouseId,
        quantity: String(-Math.abs(requestedQty)),
        referenceType: "TRANSFER_OUT",
        referenceId: transfer.id
      });
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
  app2.delete("/api/stock-transfers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [transfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, id));
      if (!transfer) return res.status(404).json({ message: "Transfer not found" });
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
  app2.put("/api/stock-transfers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { transferDate, itemId, fromWarehouseId, toWarehouseId, quantity, uomId, remarks } = req.body;
      if (!transferDate || !itemId || !fromWarehouseId || !quantity || !uomId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const [oldTransfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, id));
      if (!oldTransfer) return res.status(404).json({ message: "Transfer not found" });
      const stockData = await db.select({
        quantity: sql2`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL)`
      }).from(stockLedger).where(
        and(
          eq(stockLedger.itemId, itemId),
          eq(stockLedger.warehouseId, fromWarehouseId)
        )
      );
      let currentStock = Number(stockData[0]?.quantity || 0);
      if (oldTransfer.itemId === itemId && oldTransfer.fromWarehouseId === fromWarehouseId) {
        currentStock += Number(oldTransfer.quantity);
      }
      if (currentStock < Number(quantity)) {
        return res.status(400).json({ message: `Insufficient stock! Available: ${currentStock.toFixed(2)}` });
      }
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
      const [updated] = await db.update(stockTransfers).set({
        transferDate,
        itemId,
        fromWarehouseId,
        toWarehouseId: toWarehouseId || null,
        quantity: String(quantity),
        uomId,
        remarks
      }).where(eq(stockTransfers.id, id)).returning();
      res.json(updated);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/reports/stock", async (req, res) => {
    try {
      const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId) : void 0;
      const stockData = await db.select({
        itemId: stockLedger.itemId,
        warehouseId: stockLedger.warehouseId,
        quantity: sql2`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL(20,4))`,
        itemName: items.name,
        warehouseName: warehouses.name,
        unitName: unitsOfMeasure.name,
        reorderLevel: items.reorderLevel,
        categoryName: categories.name
      }).from(stockLedger).leftJoin(items, eq(stockLedger.itemId, items.id)).leftJoin(warehouses, eq(stockLedger.warehouseId, warehouses.id)).leftJoin(unitsOfMeasure, eq(items.defaultUomId, unitsOfMeasure.id)).leftJoin(categories, eq(items.categoryId, categories.id)).groupBy(
        stockLedger.itemId,
        stockLedger.warehouseId,
        items.name,
        warehouses.name,
        unitsOfMeasure.name,
        items.reorderLevel,
        categories.name
      ).where(warehouseId ? eq(stockLedger.warehouseId, warehouseId) : void 0);
      const purchaseRates = await db.select({
        itemId: purchaseItems.itemId,
        totalAmount: sql2`SUM(CAST(${purchaseItems.amount} AS DECIMAL))`,
        totalQty: sql2`SUM(CAST(${purchaseItems.quantity} AS DECIMAL))`
      }).from(purchaseItems).groupBy(purchaseItems.itemId);
      const salesRates = await db.select({
        itemId: salesItems.itemId,
        avgRate: sql2`AVG(CAST(${salesItems.rate} AS DECIMAL))`
      }).from(salesItems).groupBy(salesItems.itemId);
      const rateMap = /* @__PURE__ */ new Map();
      purchaseRates.forEach((p) => {
        const qty = Number(p.totalQty) || 0;
        const amt = Number(p.totalAmount) || 0;
        if (qty > 0) {
          rateMap.set(p.itemId, amt / qty);
        }
      });
      salesRates.forEach((s) => {
        if (!rateMap.has(s.itemId)) {
          rateMap.set(s.itemId, (Number(s.avgRate) || 0) * 0.7);
        }
      });
      const formatted = stockData.map((s) => {
        const qty = Math.abs(Number(s.quantity)) < 1e-4 ? 0 : Number(s.quantity);
        const avgRate = rateMap.get(s.itemId) || 0;
        const stockValue = qty * avgRate;
        return {
          itemId: s.itemId,
          itemName: s.itemName || "Unknown",
          categoryName: s.categoryName || "-",
          warehouseId: s.warehouseId,
          warehouseName: s.warehouseName || "Unknown",
          quantity: qty,
          unitName: s.unitName || "-",
          reorderLevel: Number(s.reorderLevel) || 0,
          avgRate,
          value: stockValue
        };
      });
      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/reports/sales-trend", async (req, res) => {
    try {
      const { year, warehouseId } = req.query;
      const y = year ? Number(year) : (/* @__PURE__ */ new Date()).getFullYear();
      const wId = warehouseId ? Number(warehouseId) : void 0;
      const conditions = [sql2`EXTRACT(YEAR FROM ${sales.saleDate}) = ${y}`];
      if (wId) {
        conditions.push(eq(sales.warehouseId, wId));
      }
      const monthlySales = await db.select({
        month: sql2`EXTRACT(MONTH FROM ${sales.saleDate})`,
        total: sql2`SUM(CAST(${sales.totalAmount} AS DECIMAL))`
      }).from(sales).where(and(...conditions)).groupBy(sql2`EXTRACT(MONTH FROM ${sales.saleDate})`);
      const formatted = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const found = monthlySales.find((r) => Number(r.month) === m);
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
  app2.get("/api/reports/dashboard", async (_req, res) => {
    try {
      const stockData = await db.select({
        itemId: stockLedger.itemId,
        quantity: sql2`CAST(COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0) AS DECIMAL(20,4))`,
        reorderLevel: items.reorderLevel,
        itemName: items.name
      }).from(stockLedger).leftJoin(items, eq(stockLedger.itemId, items.id)).groupBy(stockLedger.itemId, items.name, items.reorderLevel);
      const itemsWithStock = stockData.map((s) => ({
        itemId: s.itemId,
        itemName: s.itemName || "Unknown",
        quantity: Math.abs(Number(s.quantity)) < 1e-4 ? 0 : Number(s.quantity),
        reorderLevel: Number(s.reorderLevel) || 0
      }));
      const totalItems = itemsWithStock.length;
      const lowStockItems = itemsWithStock.filter((item) => item.quantity > 0 && item.quantity < item.reorderLevel);
      const outOfStockItems = itemsWithStock.filter((item) => item.quantity <= 0);
      res.json({
        totalItems,
        lowStock: lowStockItems.length,
        outOfStock: outOfStockItems.length,
        lowStockItems,
        outOfStockItems
      });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/reports/detailed-dashboard", async (req, res) => {
    try {
      const { date: targetDate, warehouseId } = req.query;
      const dateStr = targetDate ? String(targetDate) : format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
      const wId = warehouseId ? Number(warehouseId) : void 0;
      const fgCategories = await db.select().from(categories).where(
        sql2`UPPER(${categories.type}) IN ('FG', 'FINISHED', 'FINISHED_GOODS')`
      );
      const fgCategoryIds = fgCategories.map((c) => c.id);
      let fgItemIds = [];
      if (fgCategoryIds.length > 0) {
        const fgItems = await db.select({ id: items.id }).from(items).where(
          inArray(items.categoryId, fgCategoryIds)
        );
        fgItemIds = fgItems.map((i) => i.id);
      }
      let openingStock = 0;
      if (fgItemIds.length > 0) {
        const openingConditions = [
          sql2`CAST(${stockLedger.createdAt} AS DATE) < ${dateStr}`,
          inArray(stockLedger.itemId, fgItemIds)
        ];
        if (wId) {
          openingConditions.push(eq(stockLedger.warehouseId, wId));
        }
        const openingStockData = await db.select({
          totalQty: sql2`COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0)`
        }).from(stockLedger).where(and(...openingConditions));
        openingStock = Number(openingStockData[0]?.totalQty || 0);
      }
      const purchaseConditionsBase = [
        sql2`CAST(${purchases.purchaseDate} AS DATE) = ${dateStr}`,
        eq(purchases.isDeleted, false)
      ];
      if (wId) purchaseConditionsBase.push(eq(purchases.warehouseId, wId));
      const purchaseData = await db.select({
        count: sql2`COUNT(*)`,
        totalAmount: sql2`COALESCE(SUM(${purchases.totalAmount}), 0)`
      }).from(purchases).where(and(...purchaseConditionsBase));
      const salesConditionsBase = [
        sql2`CAST(${sales.saleDate} AS DATE) = ${dateStr}`,
        eq(sales.isDeleted, false)
      ];
      if (wId) salesConditionsBase.push(eq(sales.warehouseId, wId));
      const salesData = await db.select({
        count: sql2`COUNT(*)`,
        totalAmount: sql2`COALESCE(SUM(${sales.totalAmount}), 0)`
      }).from(sales).where(and(...salesConditionsBase));
      let productionCount = 0;
      let productionOutput = 0;
      if (fgItemIds.length > 0) {
        const prodConditions = [
          sql2`CAST(${productionRuns.productionDate} AS DATE) = ${dateStr}`,
          inArray(productionRuns.outputItemId, fgItemIds),
          eq(productionRuns.isDeleted, false)
        ];
        if (wId) prodConditions.push(eq(productionRuns.warehouseId, wId));
        const productionData = await db.select({
          count: sql2`COUNT(*)`,
          totalOutput: sql2`COALESCE(SUM(${productionRuns.outputQuantity}), 0)`
        }).from(productionRuns).where(and(...prodConditions));
        productionCount = Number(productionData[0]?.count || 0);
        productionOutput = Number(productionData[0]?.totalOutput || 0);
      }
      const detailedSales = await db.query.sales.findMany({
        where: and(...salesConditionsBase),
        with: {
          customer: true,
          items: {
            with: { item: true }
          }
        }
      });
      const detailedProdConditions = [
        sql2`CAST(${productionRuns.productionDate} AS DATE) = ${dateStr}`,
        eq(productionRuns.isDeleted, false)
      ];
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
        const fgStockResult = await db.select({
          total: sql2`COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0)`
        }).from(stockLedger).where(and(...currentStockConditions));
        fgStockCurrent = Number(fgStockResult[0]?.total || 0);
      }
      let totalSoldFGQty = 0;
      if (fgItemIds.length > 0) {
        const soldQtyConditions = [
          sql2`CAST(${sales.saleDate} AS DATE) = ${dateStr}`,
          inArray(salesItems.itemId, fgItemIds)
        ];
        if (wId) soldQtyConditions.push(eq(sales.warehouseId, wId));
        const totalSoldFGQtyResult = await db.select({
          total: sql2`COALESCE(SUM(CAST(${salesItems.quantity} AS DECIMAL)), 0)`
        }).from(salesItems).innerJoin(sales, eq(salesItems.saleId, sales.id)).where(and(
          ...soldQtyConditions,
          eq(sales.isDeleted, false)
        ));
        totalSoldFGQty = Number(totalSoldFGQtyResult[0]?.total || 0);
      }
      let closingFGStock = 0;
      if (fgItemIds.length > 0) {
        const closingConditions = [
          sql2`CAST(${stockLedger.createdAt} AS DATE) <= ${dateStr}`,
          inArray(stockLedger.itemId, fgItemIds)
          // 🎯 CRITICAL: Only filter by FG items!
        ];
        if (wId) closingConditions.push(eq(stockLedger.warehouseId, wId));
        const closingFGStockResult = await db.select({
          total: sql2`COALESCE(SUM(CAST(${stockLedger.quantity} AS DECIMAL)), 0)`
        }).from(stockLedger).where(and(...closingConditions));
        closingFGStock = Number(closingFGStockResult[0]?.total || 0);
      }
      res.json({
        date: dateStr,
        openingStock,
        summary: {
          purchases: {
            count: Number(purchaseData[0]?.count || 0),
            amount: Number(purchaseData[0]?.totalAmount || 0)
          },
          sales: {
            count: Number(salesData[0]?.count || 0),
            amount: Number(salesData[0]?.totalAmount || 0),
            quantity: totalSoldFGQty
            // FG-only quantity for report
          },
          production: {
            count: productionCount,
            output: productionOutput
          }
        },
        sales: detailedSales.map((s) => ({
          id: s.id,
          customer: s.customer?.name || "Cash",
          amount: Number(s.totalAmount),
          items: s.items.map((i) => `${i.item?.name} (${i.quantity})`).join(", ")
        })),
        production: detailedProduction.map((p) => ({
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
  app2.get("/api/debug/stock-ledger", async (_req, res) => {
    try {
      const ledgerEntries = await db.select().from(stockLedger);
      res.json(ledgerEntries);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/debug/fg-categories", async (_req, res) => {
    try {
      const allCategories = await db.select().from(categories);
      const fgCategories = await db.select().from(categories).where(
        sql2`UPPER(${categories.type}) IN ('FG', 'FINISHED', 'FINISHED_GOODS')`
      );
      res.json({
        allCategories,
        fgCategories,
        fgCategoryIds: fgCategories.map((c) => c.id)
      });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/reports/supplier-payments", async (req, res) => {
    try {
      const { month, year, warehouseId } = req.query;
      const wId = warehouseId ? Number(warehouseId) : void 0;
      let startDate, endDate;
      if (year || month) {
        const y = year ? Number(year) : (/* @__PURE__ */ new Date()).getFullYear();
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
      const purchaseConditions = [eq(suppliers.id, purchases.supplierId)];
      if (startDate && endDate) {
        purchaseConditions.push(gte(purchases.purchaseDate, startDate));
        purchaseConditions.push(lte(purchases.purchaseDate, endDate));
      }
      if (wId) {
        purchaseConditions.push(eq(purchases.warehouseId, wId));
      }
      const purchaseData = await db.select({
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        totalPurchases: sql2`CAST(COALESCE(SUM(${purchases.totalAmount}), 0) AS DECIMAL)`,
        totalPayingAmount: sql2`CAST(COALESCE(SUM(${purchases.payingAmount}), 0) AS DECIMAL)`
      }).from(suppliers).leftJoin(purchases, and(...purchaseConditions)).groupBy(suppliers.id, suppliers.name);
      let paymentWhere = void 0;
      if (startDate && endDate) {
        paymentWhere = and(gte(supplierPayments.paymentDate, startDate), lte(supplierPayments.paymentDate, endDate));
      }
      const paymentData = await db.select({
        supplierId: supplierPayments.supplierId,
        totalPayments: sql2`CAST(COALESCE(SUM(${supplierPayments.amount}), 0) AS DECIMAL)`
      }).from(supplierPayments).where(paymentWhere).groupBy(supplierPayments.supplierId);
      const formatted = purchaseData.map((p) => {
        const totalPurchases = Number(p.totalPurchases) || 0;
        const totalPaid = Number(p.totalPayingAmount) || 0;
        const remaining = totalPurchases - totalPaid;
        return {
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          totalPurchases,
          totalPaid,
          totalDue: remaining
        };
      }).sort((a, b) => b.totalPurchases - a.totalPurchases);
      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/reports/overdue-payments", async (_req, res) => {
    try {
      const today = format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
      const purchasesWithDue = await db.query.purchases.findMany({
        with: {
          supplier: true
        },
        orderBy: (p, { asc: asc2 }) => [asc2(p.dueDate)]
      });
      const paymentData = await db.select({
        supplierId: supplierPayments.supplierId,
        totalPayments: sql2`CAST(COALESCE(SUM(${supplierPayments.amount}), 0) AS DECIMAL)`
      }).from(supplierPayments).groupBy(supplierPayments.supplierId);
      const overdue = purchasesWithDue.filter((p) => p.dueDate && p.dueDate <= today).map((p) => {
        const payment = paymentData.find((pm) => pm.supplierId === p.supplierId);
        const totalPayments = Number(payment?.totalPayments) || 0;
        const totalAmount = Number(p.totalAmount) || 0;
        const payingAmount = Number(p.payingAmount) || 0;
        const remainingAmount = totalAmount - payingAmount;
        if (remainingAmount > 0 && p.dueDate) {
          const daysOverdue = Math.floor(
            ((/* @__PURE__ */ new Date()).getTime() - new Date(p.dueDate).getTime()) / (1e3 * 60 * 60 * 24)
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
            isOverdue: true
          };
        }
        return null;
      }).filter(Boolean);
      res.json(overdue);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/reports/upcoming-payments", async (_req, res) => {
    try {
      const todayStr = format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
      const sevenDaysLater = new Date((/* @__PURE__ */ new Date()).getTime() + 7 * 24 * 60 * 60 * 1e3);
      const sevenDaysStr = format(sevenDaysLater, "yyyy-MM-dd");
      const purchasesWithDue = await db.query.purchases.findMany({
        with: {
          supplier: true
        },
        orderBy: (p, { asc: asc2 }) => [asc2(p.dueDate)]
      });
      const paymentData = await db.select({
        supplierId: supplierPayments.supplierId,
        totalPayments: sql2`CAST(COALESCE(SUM(${supplierPayments.amount}), 0) AS DECIMAL)`
      }).from(supplierPayments).groupBy(supplierPayments.supplierId);
      const upcoming = purchasesWithDue.filter((p) => p.dueDate && p.dueDate > todayStr && p.dueDate <= sevenDaysStr).map((p) => {
        const payment = paymentData.find((pm) => pm.supplierId === p.supplierId);
        const totalPayments = Number(payment?.totalPayments) || 0;
        const totalAmount = Number(p.totalAmount) || 0;
        const payingAmount = Number(p.payingAmount) || 0;
        const remainingAmount = totalAmount - payingAmount;
        if (remainingAmount > 0 && p.dueDate) {
          const daysUntilDue = Math.ceil(
            (new Date(p.dueDate).getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60 * 60 * 24)
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
            daysUntilDue
          };
        }
        return null;
      }).filter(Boolean);
      res.json(upcoming);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/reports/customer-sales", async (req, res) => {
    try {
      const { month, year, warehouseId } = req.query;
      const wId = warehouseId ? Number(warehouseId) : void 0;
      let startDate, endDate;
      if (year || month) {
        const y = year ? Number(year) : (/* @__PURE__ */ new Date()).getFullYear();
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
      const salesConditions = [eq(customers.id, sales.customerId)];
      if (startDate && endDate) {
        salesConditions.push(gte(sales.saleDate, startDate));
        salesConditions.push(lte(sales.saleDate, endDate));
      }
      if (wId) {
        salesConditions.push(eq(sales.warehouseId, wId));
      }
      const salesData = await db.select({
        customerId: customers.id,
        customerName: customers.name,
        totalSales: sql2`CAST(COALESCE(SUM(${sales.totalAmount}), 0) AS DECIMAL)`,
        totalReceivedAmount: sql2`CAST(COALESCE(SUM(${sales.receivedAmount}), 0) AS DECIMAL)`
      }).from(customers).leftJoin(sales, and(...salesConditions)).groupBy(customers.id, customers.name);
      let paymentWhere = void 0;
      if (startDate && endDate) {
        paymentWhere = and(gte(customerPayments.paymentDate, startDate), lte(customerPayments.paymentDate, endDate));
      }
      const paymentData = await db.select({
        customerId: customerPayments.customerId,
        totalPayments: sql2`CAST(COALESCE(SUM(${customerPayments.amount}), 0) AS DECIMAL)`
      }).from(customerPayments).where(paymentWhere).groupBy(customerPayments.customerId);
      const formatted = salesData.map((c) => {
        const totalSales = Number(c.totalSales ?? 0) || 0;
        const totalReceived = Number(c.totalReceivedAmount ?? 0) || 0;
        const remaining = totalSales - totalReceived;
        return {
          customerId: c.customerId,
          customerName: c.customerName,
          totalSales,
          totalReceived,
          totalRemaining: remaining
        };
      }).sort((a, b) => b.totalSales - a.totalSales);
      res.json(formatted);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/reports/overdue-sales", async (_req, res) => {
    try {
      const today = format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
      const salesWithDue = await db.query.sales.findMany({
        with: {
          customer: true
        },
        orderBy: (s, { asc: asc2 }) => [asc2(s.dueDate)]
      });
      const overdue = salesWithDue.filter((s) => s.dueDate && s.dueDate <= today).map((s) => {
        const totalAmount = Number(s.totalAmount) || 0;
        const receivedAmount = Number(s.receivedAmount) || 0;
        const remainingAmount = totalAmount - receivedAmount;
        if (remainingAmount > 0 && s.dueDate) {
          const daysOverdue = Math.floor(
            ((/* @__PURE__ */ new Date()).getTime() - new Date(s.dueDate).getTime()) / (1e3 * 60 * 60 * 24)
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
            isOverdue: true
          };
        }
        return null;
      }).filter(Boolean);
      res.json(overdue);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/reports/upcoming-sales", async (_req, res) => {
    try {
      const todayStr = format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
      const threeDaysLater = new Date((/* @__PURE__ */ new Date()).getTime() + 3 * 24 * 60 * 60 * 1e3);
      const threeDaysStr = format(threeDaysLater, "yyyy-MM-dd");
      const salesWithDue = await db.query.sales.findMany({
        with: {
          customer: true
        },
        orderBy: (s, { asc: asc2 }) => [asc2(s.dueDate)]
      });
      const upcoming = salesWithDue.filter((s) => s.dueDate && s.dueDate > todayStr && s.dueDate <= threeDaysStr).map((s) => {
        const totalAmount = Number(s.totalAmount) || 0;
        const receivedAmount = Number(s.receivedAmount) || 0;
        const remainingAmount = totalAmount - receivedAmount;
        if (remainingAmount > 0 && s.dueDate) {
          const daysUntilDue = Math.ceil(
            (new Date(s.dueDate).getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60 * 60 * 24)
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
            daysUntilDue
          };
        }
        return null;
      }).filter(Boolean);
      res.json(upcoming);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/bom-recipes", async (_req, res) => {
    const data = await db.query.bomRecipes.findMany({
      with: { lines: true }
    });
    res.json(data);
  });
  app2.post("/api/bom-recipes", async (req, res) => {
    try {
      const { name, outputItemId, outputQuantity, isActive, lines } = req.body;
      const result = await db.insert(bomRecipes).values({ name, outputItemId, outputQuantity, isActive }).returning();
      const recipe = Array.isArray(result) ? result[0] : result;
      if (lines?.length) {
        await db.insert(bomLines).values(
          lines.map((l) => ({
            bomRecipeId: recipe.id,
            itemId: l.itemId,
            quantity: String(l.quantity)
          }))
        );
      }
      res.status(201).json(recipe);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.put("/api/bom-recipes/:id", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const { name, outputItemId, outputQuantity, isActive, lines } = req.body;
      if (!name || !outputItemId || !outputQuantity) {
        return res.status(400).json({ message: "Missing required fields: name, outputItemId, outputQuantity" });
      }
      const updateData = {
        name,
        outputItemId: Number(outputItemId),
        outputQuantity: String(outputQuantity)
      };
      if (isActive !== void 0) {
        updateData.isActive = Boolean(isActive);
      }
      const result = await db.update(bomRecipes).set(updateData).where(eq(bomRecipes.id, recipeId)).returning();
      const updated = Array.isArray(result) ? result[0] : result;
      if (!updated) {
        return res.status(404).json({ message: "BOM recipe not found" });
      }
      await db.delete(bomLines).where(eq(bomLines.bomRecipeId, recipeId));
      if (lines && Array.isArray(lines) && lines.length > 0) {
        await db.insert(bomLines).values(
          lines.map((l) => ({
            bomRecipeId: recipeId,
            itemId: Number(l.itemId),
            quantity: String(l.quantity)
          }))
        );
      }
      const updatedRecipe = await db.query.bomRecipes.findFirst({
        where: (bom, { eq: eq3 }) => eq3(bom.id, recipeId),
        with: { lines: true }
      });
      res.json(updatedRecipe);
    } catch (err) {
      console.error("BOM update error:", err);
      handleDbError(err, res);
    }
  });
  app2.delete("/api/bom-recipes/:id", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      await db.delete(bomLines).where(eq(bomLines.bomRecipeId, recipeId));
      await db.delete(bomRecipes).where(eq(bomRecipes.id, recipeId));
      res.json({ message: "BOM recipe deleted successfully" });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.post("/api/production", async (req, res) => {
    try {
      const { productionDate, outputItemId, outputQuantity, warehouseId, consumptions, batchCount } = req.body;
      console.log("Production POST request:", {
        productionDate,
        outputItemId,
        outputQuantity,
        warehouseId,
        consumptionsCount: consumptions?.length || 0
      });
      if (!productionDate || !outputItemId || !warehouseId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!outputQuantity || Number(outputQuantity) <= 0) {
        return res.status(400).json({ message: "Output quantity must be greater than 0" });
      }
      const [run] = await db.insert(productionRuns).values({
        productionDate,
        outputItemId,
        outputQuantity: String(outputQuantity),
        warehouseId,
        batchCount: String(batchCount || 0),
        // Save batch count
        remarks: req.body.remarks || null
        // Save remarks
      }).returning();
      console.log("Production run created:", run.id);
      if (consumptions?.length) {
        console.log(`Processing ${consumptions.length} consumptions...`);
        for (const consumption of consumptions) {
          await db.insert(productionConsumptions).values({
            productionRunId: run.id,
            itemId: consumption.itemId,
            standardQty: String(consumption.standardQty),
            actualQty: String(consumption.actualQty),
            openingStock: String(consumption.opening || 0),
            // Save opening stock
            variance: String(consumption.variance || 0),
            // Save variance
            remarks: consumption.remarks || null
            // Save line-wise remarks
          });
          await db.insert(stockLedger).values({
            itemId: consumption.itemId,
            warehouseId,
            quantity: String(-Math.abs(Number(consumption.actualQty))),
            referenceType: "PRODUCTION_CONSUMPTION",
            referenceId: run.id,
            createdAt: new Date(productionDate)
            // Use production date for ledger
          });
          const variance = Number(consumption.variance || 0);
          if (variance !== 0) {
            await db.insert(stockLedger).values({
              itemId: consumption.itemId,
              warehouseId,
              quantity: String(-variance),
              // Invert variance for adjustment (Positive variance = missing stock = negative adjustment)
              referenceType: "PRODUCTION_ADJUSTMENT",
              referenceId: run.id,
              createdAt: new Date(productionDate)
              // Use production date
            });
            console.log(`Adjusting item ${consumption.itemId} by ${-variance} due to variance.`);
          }
          console.log(`Consumed item ${consumption.itemId}: -${consumption.actualQty}`);
        }
      } else {
        console.warn("No consumptions provided!");
      }
      await db.insert(stockLedger).values({
        itemId: outputItemId,
        warehouseId,
        quantity: String(outputQuantity),
        referenceType: "PRODUCTION",
        referenceId: run.id,
        createdAt: new Date(productionDate)
        // Use production date
      });
      console.log(`Produced item ${outputItemId}: +${outputQuantity} (Manual Entry)`);
      res.status(201).json(run);
    } catch (err) {
      console.error("Production POST error:", err);
      handleDbError(err, res);
    }
  });
  app2.get("/api/production", async (_req, res) => {
    try {
      const runs = await db.query.productionRuns.findMany({
        where: (pr, { eq: eq3 }) => eq3(pr.isDeleted, false),
        orderBy: (pr, { desc: desc2 }) => [desc2(pr.productionDate)]
      });
      const formattedRuns = await Promise.all(
        runs.map(async (run) => {
          const [outputItem] = await db.select({ name: items.name }).from(items).where(eq(items.id, run.outputItemId)).limit(1);
          const [warehouse] = await db.select({ name: warehouses.name }).from(warehouses).where(eq(warehouses.id, run.warehouseId)).limit(1);
          const consumptions = await db.query.productionConsumptions.findMany({
            where: (pc, { eq: eq3 }) => eq3(pc.productionRunId, run.id)
          });
          const consumptionDetails = await Promise.all(
            consumptions.map(async (c) => {
              const [item] = await db.select({ name: items.name }).from(items).where(eq(items.id, c.itemId)).limit(1);
              return {
                itemId: c.itemId,
                itemName: item?.name || "Unknown",
                standardQty: c.standardQty,
                actualQty: c.actualQty,
                opening: c.openingStock,
                // Return saved opening stock
                variance: c.variance,
                // Return saved variance
                remarks: c.remarks
                // Return saved remarks
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
            createdAt: run.createdAt
          };
        })
      );
      res.json({ data: formattedRuns });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.delete("/api/production/:id", async (req, res) => {
    try {
      const runId = Number(req.params.id);
      if (isNaN(runId)) {
        return res.status(400).json({ message: "Invalid production run ID" });
      }
      console.log(`[DELETE] Received request to delete production run ID: ${runId}`);
      await db.transaction(async (tx) => {
        const found = await tx.select().from(productionRuns).where(eq(productionRuns.id, runId));
        console.log(`[DELETE] Step 1: Found ${found.length} records in database for ID ${runId}`);
        if (found.length === 0) {
          const globalFound = await db.select().from(productionRuns).where(eq(productionRuns.id, runId));
          console.log(`[DELETE] Global check: Found ${globalFound.length} records outside transaction`);
          throw new Error("Production run not found");
        }
        const run = found[0];
        console.log(`[DELETE Production] ID: ${runId}, Date: ${run.productionDate}, Output Item: ${run.outputItemId}`);
        const dependentSales = await tx.select({
          id: sales.id,
          saleDate: sales.saleDate
        }).from(sales).innerJoin(salesItems, eq(sales.id, salesItems.saleId)).where(
          and(
            eq(salesItems.itemId, run.outputItemId),
            sql2`CAST(${sales.saleDate} AS DATE) >= CAST(${run.productionDate} AS DATE)`,
            eq(sales.isDeleted, false)
          )
        ).limit(1);
        console.log(`[DELETE Production] Dependent sales found count: ${dependentSales.length}`);
        if (dependentSales.length > 0) {
          const formattedDate = format(new Date(dependentSales[0].saleDate), "dd/MM/yyyy");
          console.log(`[DELETE Production] Blocking deletion. Dependent sale: ${dependentSales[0].id} on ${formattedDate}`);
          throw new Error(
            `Cannot delete production order. Sale(s) (e.g., from ${formattedDate}) have been recorded after this production using the produced items. Please delete the associated sales first to maintain stock integrity.`
          );
        }
        const relatedEntries = await tx.select().from(stockLedger).where(
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
            createdAt: new Date(run.productionDate)
            // 🎯 Backdate to original date
          });
        }
        const updated = await tx.update(productionRuns).set({ isDeleted: true, deletedAt: /* @__PURE__ */ new Date() }).where(eq(productionRuns.id, runId)).returning();
        if (updated.length === 0) {
          throw new Error("Failed to move production run to trash");
        }
        console.log(`Production run ${runId} moved to trash successfully`);
      });
      res.json({ message: "Production run moved to trash and stock reversed" });
    } catch (err) {
      console.error("Production DELETE error:", err);
      if (err.message === "Production run not found") {
        return res.status(404).json({ message: err.message });
      }
      handleDbError(err, res);
    }
  });
  app2.put("/api/production/:id", async (req, res) => {
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
        const [oldRun] = await tx.select().from(productionRuns).where(eq(productionRuns.id, runId)).limit(1);
        if (!oldRun) {
          throw new Error("Production run not found");
        }
        const relatedEntries = await tx.select().from(stockLedger).where(
          and(
            eq(stockLedger.referenceId, runId),
            sql2`${stockLedger.referenceType} LIKE 'PRODUCTION%'`
          )
        );
        for (const entry of relatedEntries) {
          await tx.insert(stockLedger).values({
            itemId: entry.itemId,
            warehouseId: entry.warehouseId,
            quantity: String(-Number(entry.quantity)),
            referenceType: "PRODUCTION_UPDATE_REVERSAL",
            referenceId: runId,
            createdAt: entry.createdAt
            // Match original entry's date for consistent reporting
          });
        }
        await tx.delete(productionConsumptions).where(eq(productionConsumptions.productionRunId, runId));
        await tx.update(productionRuns).set({
          productionDate,
          outputItemId,
          outputQuantity: String(outputQuantity),
          warehouseId,
          batchCount: String(batchCount || 0),
          remarks: remarks || null
        }).where(eq(productionRuns.id, runId));
        if (consumptions?.length) {
          for (const consumption of consumptions) {
            await tx.insert(productionConsumptions).values({
              productionRunId: runId,
              itemId: consumption.itemId,
              standardQty: String(consumption.standardQty),
              actualQty: String(consumption.actualQty),
              openingStock: String(consumption.opening || 0),
              variance: String(consumption.variance || 0),
              // Save variance
              remarks: consumption.remarks || null
            });
            await tx.insert(stockLedger).values({
              itemId: consumption.itemId,
              warehouseId,
              quantity: String(-Math.abs(Number(consumption.actualQty))),
              referenceType: "PRODUCTION_CONSUMPTION",
              referenceId: runId,
              createdAt: new Date(productionDate)
              // Use production date
            });
            const variance = Number(consumption.variance || 0);
            if (variance !== 0) {
              await tx.insert(stockLedger).values({
                itemId: consumption.itemId,
                warehouseId,
                quantity: String(-variance),
                referenceType: "PRODUCTION_ADJUSTMENT",
                referenceId: runId,
                createdAt: new Date(productionDate)
                // Use production date
              });
            }
          }
        }
        await tx.insert(stockLedger).values({
          itemId: outputItemId,
          warehouseId,
          quantity: String(outputQuantity),
          referenceType: "PRODUCTION",
          referenceId: runId,
          createdAt: new Date(productionDate)
          // Use production date
        });
      });
      res.json({ message: "Production run updated successfully" });
    } catch (err) {
      console.error("Production UPDATE error:", err);
      handleDbError(err, res);
    }
  });
  app2.get("/api/admin", async (_req, res) => {
    try {
      let [settings] = await db.select().from(adminSettings).limit(1);
      if (!settings) {
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
  app2.patch("/api/admin", async (req, res) => {
    try {
      const payload = req.body;
      let [settings] = await db.select().from(adminSettings).limit(1);
      if (!settings) {
        [settings] = await db.insert(adminSettings).values(payload).returning();
      } else {
        [settings] = await db.update(adminSettings).set({ ...payload, updatedAt: /* @__PURE__ */ new Date() }).where(eq(adminSettings.id, settings.id)).returning();
      }
      res.json(settings);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/trash", async (_req, res) => {
    try {
      const trashedPurchases = await db.query.purchases.findMany({
        where: eq(purchases.isDeleted, true),
        with: { supplier: true }
      });
      const trashedSales = await db.query.sales.findMany({
        where: eq(sales.isDeleted, true),
        with: { customer: true }
      });
      const trashedProduction = await db.query.productionRuns.findMany({
        where: eq(productionRuns.isDeleted, true),
        with: { outputItem: true }
      });
      const response = {
        purchases: trashedPurchases.map((p) => ({
          id: p.id,
          date: p.purchaseDate,
          entity: p.supplier?.name || "-",
          amount: p.totalAmount,
          deletedAt: p.deletedAt,
          type: "PURCHASE"
        })),
        sales: trashedSales.map((s) => ({
          id: s.id,
          date: s.saleDate,
          entity: s.customer?.name || "-",
          amount: s.totalAmount,
          deletedAt: s.deletedAt,
          type: "SALE"
        })),
        production: trashedProduction.map((pr) => ({
          id: pr.id,
          date: pr.productionDate,
          entity: pr.outputItem?.name || "-",
          amount: pr.outputQuantity,
          deletedAt: pr.deletedAt,
          type: "PRODUCTION"
        }))
      };
      res.json(response);
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.post("/api/trash/restore/:type/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const type = req.params.type;
      await db.transaction(async (tx) => {
        if (type === "PURCHASE") {
          const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, id)).limit(1);
          if (!purchase) throw new Error("Purchase not found");
          await tx.update(purchases).set({ isDeleted: false, deletedAt: null }).where(eq(purchases.id, id));
          const itemsRelated = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));
          for (const item of itemsRelated) {
            await tx.insert(stockLedger).values({
              itemId: item.itemId,
              warehouseId: purchase.warehouseId,
              quantity: String(item.quantity),
              referenceType: "PURCHASE_RESTORE",
              referenceId: id
            });
          }
        } else if (type === "SALE") {
          const [sale] = await tx.select().from(sales).where(eq(sales.id, id)).limit(1);
          if (!sale) throw new Error("Sale not found");
          await tx.update(sales).set({ isDeleted: false, deletedAt: null }).where(eq(sales.id, id));
          const itemsRelated = await tx.select().from(salesItems).where(eq(salesItems.saleId, id));
          for (const item of itemsRelated) {
            await tx.insert(stockLedger).values({
              itemId: item.itemId,
              warehouseId: sale.warehouseId,
              quantity: String(-Math.abs(Number(item.quantity))),
              referenceType: "SALE_RESTORE",
              referenceId: id
            });
          }
        } else if (type === "PRODUCTION") {
          const [run] = await tx.select().from(productionRuns).where(eq(productionRuns.id, id)).limit(1);
          if (!run) throw new Error("Production run not found");
          await tx.update(productionRuns).set({ isDeleted: false, deletedAt: null }).where(eq(productionRuns.id, id));
          await tx.insert(stockLedger).values({
            itemId: run.outputItemId,
            warehouseId: run.warehouseId,
            quantity: String(run.outputQuantity),
            referenceType: "PRODUCTION_RESTORE",
            referenceId: id
          });
          const consumptions = await tx.select().from(productionConsumptions).where(eq(productionConsumptions.productionRunId, id));
          for (const c of consumptions) {
            await tx.insert(stockLedger).values({
              itemId: c.itemId,
              warehouseId: run.warehouseId,
              quantity: String(-Math.abs(Number(c.actualQty))),
              referenceType: "PRODUCTION_CONSUMPTION_RESTORE",
              referenceId: id
            });
          }
        }
      });
      res.json({ message: "Successfully restored from trash" });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.delete("/api/trash/permanent/:type/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const type = req.params.type;
      await db.transaction(async (tx) => {
        if (type === "PURCHASE") {
          await tx.delete(stockLedger).where(eq(stockLedger.referenceId, id)).where(sql2`${stockLedger.referenceType} LIKE 'PURCHASE%'`);
          await tx.delete(purchases).where(eq(purchases.id, id));
        } else if (type === "SALE") {
          await tx.delete(stockLedger).where(eq(stockLedger.referenceId, id)).where(sql2`${stockLedger.referenceType} LIKE 'SALE%'`);
          await tx.delete(sales).where(eq(sales.id, id));
        } else if (type === "PRODUCTION") {
          await tx.delete(stockLedger).where(eq(stockLedger.referenceId, id)).where(sql2`${stockLedger.referenceType} LIKE 'PRODUCTION%'`);
          await tx.delete(productionRuns).where(eq(productionRuns.id, id));
        }
      });
      res.json({ message: "Permanently deleted and history cleaned" });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.get("/api/admin/fix-ledger-dates", async (_req, res) => {
    try {
      console.log("[FIX] Starting stock ledger date fix...");
      let fixedCount = 0;
      const pReversals = await db.select().from(stockLedger).where(eq(stockLedger.referenceType, "PURCHASE_REVERSAL"));
      for (const rev of pReversals) {
        const [p] = await db.select().from(purchases).where(eq(purchases.id, rev.referenceId)).limit(1);
        if (p) {
          await db.update(stockLedger).set({ createdAt: new Date(p.purchaseDate) }).where(eq(stockLedger.id, rev.id));
          fixedCount++;
        }
      }
      const sReversals = await db.select().from(stockLedger).where(eq(stockLedger.referenceType, "SALE_REVERSAL"));
      for (const rev of sReversals) {
        const [s] = await db.select().from(sales).where(eq(sales.id, rev.referenceId)).limit(1);
        if (s) {
          await db.update(stockLedger).set({ createdAt: new Date(s.saleDate) }).where(eq(stockLedger.id, rev.id));
          fixedCount++;
        }
      }
      const prReversals = await db.select().from(stockLedger).where(eq(stockLedger.referenceType, "PRODUCTION_REVERSAL"));
      for (const rev of prReversals) {
        const [pr] = await db.select().from(productionRuns).where(eq(productionRuns.id, rev.referenceId)).limit(1);
        if (pr) {
          await db.update(stockLedger).set({ createdAt: new Date(pr.productionDate) }).where(eq(stockLedger.id, rev.id));
          fixedCount++;
        }
      }
      res.json({ message: `Successfully fixed ${fixedCount} ledger entries. Opening balance should now be correct.` });
    } catch (err) {
      handleDbError(err, res);
    }
  });
  app2.post("/api/admin/rebuild-inventory", async (_req, res) => {
    try {
      console.log("[REBUILD] Starting complete inventory ledger rebuild...");
      await db.transaction(async (tx) => {
        await tx.delete(stockLedger);
        console.log("[REBUILD] Wiped stock_ledger table.");
        const activePurchases = await tx.query.purchases.findMany({
          where: eq(purchases.isDeleted, false),
          with: { items: true }
        });
        for (const p of activePurchases) {
          for (const item of p.items) {
            await tx.insert(stockLedger).values({
              itemId: item.itemId,
              warehouseId: p.warehouseId,
              quantity: String(item.quantity),
              referenceType: "PURCHASE",
              referenceId: p.id,
              createdAt: new Date(p.purchaseDate)
            });
          }
        }
        console.log(`[REBUILD] Re-inserted ${activePurchases.length} active purchases.`);
        const activeSales = await tx.query.sales.findMany({
          where: eq(sales.isDeleted, false),
          with: { items: true }
        });
        for (const s of activeSales) {
          for (const item of s.items) {
            await tx.insert(stockLedger).values({
              itemId: item.itemId,
              warehouseId: s.warehouseId,
              quantity: String(-Math.abs(Number(item.quantity))),
              referenceType: "SALE",
              referenceId: s.id,
              createdAt: new Date(s.saleDate)
            });
          }
        }
        console.log(`[REBUILD] Re-inserted ${activeSales.length} active sales.`);
        const activeProduction = await tx.query.productionRuns.findMany({
          where: eq(productionRuns.isDeleted, false),
          with: { consumptions: true }
        });
        for (const pr of activeProduction) {
          await tx.insert(stockLedger).values({
            itemId: pr.outputItemId,
            warehouseId: pr.warehouseId,
            quantity: String(pr.outputQuantity),
            referenceType: "PRODUCTION",
            referenceId: pr.id,
            createdAt: new Date(pr.productionDate)
          });
          for (const c of pr.consumptions) {
            await tx.insert(stockLedger).values({
              itemId: c.itemId,
              warehouseId: pr.warehouseId,
              quantity: String(-Math.abs(Number(c.actualQty))),
              referenceType: "PRODUCTION_CONSUMPTION",
              referenceId: pr.id,
              createdAt: new Date(pr.productionDate)
            });
          }
        }
        console.log(`[REBUILD] Re-inserted ${activeProduction.length} active production runs.`);
        const transfers = await tx.select().from(stockTransfers);
        for (const t of transfers) {
          await tx.insert(stockLedger).values({
            itemId: t.itemId,
            warehouseId: t.fromWarehouseId,
            quantity: String(-Math.abs(Number(t.quantity))),
            referenceType: "TRANSFER_OUT",
            referenceId: t.id,
            createdAt: new Date(t.transferDate)
          });
          if (t.toWarehouseId) {
            await tx.insert(stockLedger).values({
              itemId: t.itemId,
              warehouseId: t.toWarehouseId,
              quantity: String(Math.abs(Number(t.quantity))),
              referenceType: "TRANSFER_IN",
              referenceId: t.id,
              createdAt: new Date(t.transferDate)
            });
          }
        }
        console.log(`[REBUILD] Re-inserted ${transfers.length} stock transfers.`);
      });
      res.json({ message: "Inventory ledger has been completely rebuilt from active transactions." });
    } catch (err) {
      console.error("[REBUILD] Error:", err);
      handleDbError(err, res);
    }
  });
}

// api/auth.ts
import cookieSession from "cookie-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { eq as eq2 } from "drizzle-orm";
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = scryptSync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  app2.use(cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "erp-secret-key"],
    maxAge: 24 * 60 * 60 * 1e3,
    // 24 hours
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true
  }));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq2(users.username, username)).limit(1);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const [user] = await db.select().from(users).where(eq2(users.id, id)).limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).send("Username and password are required");
      }
      const [existingUser] = await db.select().from(users).where(eq2(users.username, username)).limit(1);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }
      const hashedPassword = await hashPassword(password);
      const [user] = await db.insert(users).values({
        username,
        password: hashedPassword
      }).returning();
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).send("Invalid username or password");
      req.login(user, (err2) => {
        if (err2) return next(err2);
        res.status(200).json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// api/index.ts
import cors from "cors";
console.log("\u{1F680} Royal Foods ERP - Vercel Serverless + Neon PostgreSQL");
console.log("\u{1F4CD} Environment:", process.env.NODE_ENV || "development");
var app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: false }));
function log(message, source = "express") {
  const time = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  console.log(`${time} [${source}] ${message}`);
}
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
    return originalJson.call(this, body);
  };
  next();
});
setupAuth(app);
registerRoutes(null, app).catch((e) => {
  console.error("Failed to register routes:", e);
});
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
});
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    platform: "Vercel Serverless",
    database: "Neon PostgreSQL",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
console.log("\u2705 Royal Foods ERP configured for Vercel Serverless + Neon PostgreSQL");
console.log("\u{1F5C4}\uFE0F Database: Neon (HTTP mode)");
console.log("\u{1F680} Platform: Vercel Serverless Functions");
var index_default = app;
export {
  index_default as default
};
