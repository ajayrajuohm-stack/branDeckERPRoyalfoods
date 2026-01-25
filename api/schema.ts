// @ts-nocheck
import {
  mysqlTable,
  varchar,
  int,
  boolean,
  timestamp,
  decimal,
  date,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* =======================
   AUTHENTICATION
======================= */

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

/* =======================
   MASTERS
======================= */

export const unitsOfMeasure = mysqlTable("units_of_measure", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warehouses = mysqlTable("warehouses", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 255 }).notNull().default("RAW"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = mysqlTable("suppliers", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  personName: varchar("person_name", { length: 255 }),
  contactInfo: varchar("contact_info", { length: 255 }),
  address: varchar("address", { length: 255 }),
  gstNumber: varchar("gst_number", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = mysqlTable("customers", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactInfo: varchar("contact_info", { length: 255 }),
  address: varchar("address", { length: 255 }),
  shippingAddress: varchar("shipping_address", { length: 255 }),
  gstNumber: varchar("gst_number", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseHeads = mysqlTable("expense_heads", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const owners = mysqlTable("owners", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  defaultSharePercentage: decimal("default_share_percentage", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentMethods = mysqlTable("payment_methods", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const items = mysqlTable(
  "items",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull(),
    categoryId: int("category_id")
      .references(() => categories.id)
      .notNull(),
    defaultUomId: int("default_uom_id")
      .references(() => unitsOfMeasure.id)
      .notNull(),
    reorderLevel: decimal("reorder_level", { precision: 10, scale: 2 }).notNull().default("0"),
    hsnCode: varchar("hsn_code", { length: 255 }),
    gstRate: decimal("gst_rate", { precision: 10, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    uqItemCategory: uniqueIndex("uq_item_category").on(t.name, t.categoryId),
  })
);

/* =======================
   BOM
======================= */

export const bomRecipes = mysqlTable("bom_recipes", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  outputItemId: int("output_item_id")
    .references(() => items.id)
    .notNull(),
  outputQuantity: decimal("output_quantity", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bomLines = mysqlTable("bom_lines", {
  id: int("id").primaryKey().autoincrement(),
  bomRecipeId: int("bom_recipe_id")
    .references(() => bomRecipes.id, { onDelete: "cascade" })
    .notNull(),
  itemId: int("item_id")
    .references(() => items.id)
    .notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
});

export const bomRecipesRelations = relations(bomRecipes, ({ many, one }) => ({
  lines: many(bomLines),
  outputItem: one(items, {
    fields: [bomRecipes.outputItemId],
    references: [items.id],
  }),
}));

export const bomLinesRelations = relations(bomLines, ({ one }) => ({
  recipe: one(bomRecipes, {
    fields: [bomLines.bomRecipeId],
    references: [bomRecipes.id],
  }),
  item: one(items, {
    fields: [bomLines.itemId],
    references: [items.id],
  }),
}));

/* =======================
   PRODUCTION
======================= */

export const productionRuns = mysqlTable("production_runs", {
  id: int("id").primaryKey().autoincrement(),
  productionDate: date("production_date").notNull(),
  outputItemId: int("output_item_id")
    .references(() => items.id)
    .notNull(),
  outputQuantity: decimal("output_quantity", { precision: 10, scale: 2 }).notNull(),
  warehouseId: int("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  batchCount: decimal("batch_count", { precision: 10, scale: 2 }).notNull().default("0"),
  remarks: varchar("remarks", { length: 255 }),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productionConsumptions = mysqlTable("production_consumptions", {
  id: int("id").primaryKey().autoincrement(),
  productionRunId: int("production_run_id")
    .references(() => productionRuns.id, { onDelete: "cascade" })
    .notNull(),
  itemId: int("item_id")
    .references(() => items.id)
    .notNull(),
  standardQty: decimal("standard_qty", { precision: 10, scale: 2 }).notNull(),
  actualQty: decimal("actual_qty", { precision: 10, scale: 2 }).notNull(),
  openingStock: decimal("opening_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  variance: decimal("variance", { precision: 10, scale: 2 }).default("0"), // Added explicit variance column for persistence if needed
  remarks: varchar("remarks", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =======================
   PURCHASES
======================= */

export const purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),
  purchaseDate: date("purchase_date").notNull(),
  supplierId: int("supplier_id")
    .references(() => suppliers.id)
    .notNull(),
  warehouseId: int("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  payingAmount: decimal("paying_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  dueDate: date("due_date"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseItems = mysqlTable("purchase_items", {
  id: int("id").primaryKey().autoincrement(),
  purchaseId: int("purchase_id")
    .references(() => purchases.id, { onDelete: "cascade" })
    .notNull(),
  itemId: int("item_id")
    .references(() => items.id)
    .notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).notNull().default("0"),
});

/* =======================
   SALES
======================= */

export const sales = mysqlTable("sales", {
  id: int("id").primaryKey().autoincrement(),
  saleDate: date("sale_date").notNull(),
  customerId: int("customer_id")
    .references(() => customers.id)
    .notNull(),
  warehouseId: int("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  receivedAmount: decimal("received_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  dueDate: date("due_date"),
  // E-Way Bill Fields
  ewayBillNumber: varchar("eway_bill_number", { length: 255 }),
  transporterId: varchar("transporter_id", { length: 255 }),
  transporterName: varchar("transporter_name", { length: 255 }),
  vehicleNumber: varchar("vehicle_number", { length: 255 }),
  distance: decimal("distance", { precision: 10, scale: 2 }),
  cgstAmount: decimal("cgst_amount", { precision: 10, scale: 2 }).default("0"),
  sgstAmount: decimal("sgst_amount", { precision: 10, scale: 2 }).default("0"),
  igstAmount: decimal("igst_amount", { precision: 10, scale: 2 }).default("0"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesItems = mysqlTable("sale_items", {
  id: int("id").primaryKey().autoincrement(),
  saleId: int("sale_id")
    .references(() => sales.id, { onDelete: "cascade" })
    .notNull(),
  itemId: int("item_id")
    .references(() => items.id)
    .notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).notNull().default("0"),
});

/* =======================
   STOCK LEDGER
======================= */

export const stockLedger = mysqlTable("stock_ledger", {
  id: int("id").primaryKey().autoincrement(),
  itemId: int("item_id")
    .references(() => items.id)
    .notNull(),
  warehouseId: int("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  referenceType: varchar("reference_type", { length: 255 }).notNull(),
  referenceId: int("reference_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =======================
   SUPPLIER PAYMENTS
======================= */

export const supplierPayments = mysqlTable("supplier_payments", {
  id: int("id").primaryKey().autoincrement(),
  paymentDate: date("payment_date").notNull(),
  supplierId: int("supplier_id")
    .references(() => suppliers.id)
    .notNull(),
  purchaseId: int("purchase_id")
    .references(() => purchases.id, { onDelete: "cascade" }),
  ownerId: int("owner_id")
    .references(() => owners.id)
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 255 }).notNull(),
  remarks: varchar("remarks", { length: 255 }),
  nextPaymentDate: date("next_payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =======================
   CUSTOMER PAYMENTS
======================= */

export const customerPayments = mysqlTable("customer_payments", {
  id: int("id").primaryKey().autoincrement(),
  paymentDate: date("payment_date").notNull(),
  customerId: int("customer_id")
    .references(() => customers.id)
    .notNull(),
  saleId: int("sale_id")
    .references(() => sales.id, { onDelete: "cascade" }),
  ownerId: int("owner_id")
    .references(() => owners.id)
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 255 }).notNull(),
  remarks: varchar("remarks", { length: 255 }),
  nextReceiptDate: date("next_receipt_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockTransfers = mysqlTable("stock_transfers", {
  id: int("id").primaryKey().autoincrement(),
  transferDate: date("transfer_date").notNull(),
  itemId: int("item_id")
    .references(() => items.id)
    .notNull(),
  fromWarehouseId: int("from_warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  toWarehouseId: int("to_warehouse_id")
    .references(() => warehouses.id), // Nullable for Issue/Consume
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  uomId: int("uom_id")
    .references(() => unitsOfMeasure.id)
    .notNull(),
  remarks: varchar("remarks", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSettings = mysqlTable("admin_settings", {
  id: int("id").primaryKey().autoincrement(),
  adminName: varchar("admin_name", { length: 255 }).notNull().default("Admin"),
  companyName: varchar("company_name", { length: 255 }).notNull().default("My Company"),
  phone: varchar("phone", { length: 255 }).notNull().default(""),
  email: varchar("email", { length: 255 }).notNull().default(""),
  address: varchar("address", { length: 255 }).notNull().default(""),
  gstNumber: varchar("gst_number", { length: 255 }).default(""),
  // GST API Credentials
  gspClientId: varchar("gsp_client_id", { length: 255 }).default(""),
  gspClientSecret: varchar("gsp_client_secret", { length: 255 }).default(""),
  gspUsername: varchar("gsp_username", { length: 255 }).default(""),
  gspPassword: varchar("gsp_password", { length: 255 }).default(""),
  isServiceActive: boolean("is_service_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});


/* =======================
   PURCHASE RELATIONS ✅
======================= */

export const purchasesRelations = relations(purchases, ({ many, one }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  warehouse: one(warehouses, {
    fields: [purchases.warehouseId],
    references: [warehouses.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  item: one(items, {
    fields: [purchaseItems.itemId],
    references: [items.id],
  }),
}));

/* =======================
   SALES RELATIONS
======================= */

export const salesRelations = relations(sales, ({ many, one }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  warehouse: one(warehouses, {
    fields: [sales.warehouseId],
    references: [warehouses.id],
  }),
  items: many(salesItems),
}));

export const salesItemsRelations = relations(salesItems, ({ one }) => ({
  sale: one(sales, {
    fields: [salesItems.saleId],
    references: [sales.id],
  }),
  item: one(items, {
    fields: [salesItems.itemId],
    references: [items.id],
  }),
}));

/* =======================
   SUPPLIER PAYMENTS RELATIONS
======================= */

export const supplierPaymentsRelations = relations(supplierPayments, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierPayments.supplierId],
    references: [suppliers.id],
  }),
  purchase: one(purchases, {
    fields: [supplierPayments.purchaseId],
    references: [purchases.id],
  }),
  owner: one(owners, {
    fields: [supplierPayments.ownerId],
    references: [owners.id],
  }),
}));

/* =======================
   CUSTOMER PAYMENTS RELATIONS
======================= */

export const customerPaymentsRelations = relations(customerPayments, ({ one }) => ({
  customer: one(customers, {
    fields: [customerPayments.customerId],
    references: [customers.id],
  }),
  sale: one(sales, {
    fields: [customerPayments.saleId],
    references: [sales.id],
  }),
  owner: one(owners, {
    fields: [customerPayments.ownerId],
    references: [owners.id],
  }),
}));


/* =======================
   PRODUCTION RELATIONS ✅
======================= */

export const productionRunsRelations = relations(productionRuns, ({ one, many }) => ({
  outputItem: one(items, {
    fields: [productionRuns.outputItemId],
    references: [items.id],
  }),
  warehouse: one(warehouses, {
    fields: [productionRuns.warehouseId],
    references: [warehouses.id],
  }),
  consumptions: many(productionConsumptions),
}));

export const productionConsumptionsRelations = relations(productionConsumptions, ({ one }) => ({
  productionRun: one(productionRuns, {
    fields: [productionConsumptions.productionRunId],
    references: [productionRuns.id],
  }),
  item: one(items, {
    fields: [productionConsumptions.itemId],
    references: [items.id],
  }),
}));

export const stockTransfersRelations = relations(stockTransfers, ({ one }) => ({
  item: one(items, {
    fields: [stockTransfers.itemId],
    references: [items.id],
  }),
  fromWarehouse: one(warehouses, {
    fields: [stockTransfers.fromWarehouseId],
    references: [warehouses.id],
    relationName: "fromWarehouse",
  }),
  toWarehouse: one(warehouses, {
    fields: [stockTransfers.toWarehouseId],
    references: [warehouses.id],
    relationName: "toWarehouse",
  }),
  uom: one(unitsOfMeasure, {
    fields: [stockTransfers.uomId],
    references: [unitsOfMeasure.id],
  }),
}));


/* =======================
   INSERT SCHEMAS
======================= */

export const insertUomSchema = createInsertSchema(unitsOfMeasure).omit({ id: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertExpenseHeadSchema = createInsertSchema(expenseHeads).omit({ id: true });
export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true });

export const insertBomRecipeSchema = createInsertSchema(bomRecipes).omit({ id: true });
export const insertBomLineSchema = createInsertSchema(bomLines).omit({ id: true });

export const insertProductionRunSchema =
  createInsertSchema(productionRuns).omit({ id: true });

export const insertProductionConsumptionSchema =
  createInsertSchema(productionConsumptions).omit({ id: true });

export const insertPurchaseSchema =
  createInsertSchema(purchases).omit({ id: true });

export const insertPurchaseItemSchema =
  createInsertSchema(purchaseItems).omit({ id: true });

export const insertStockLedgerSchema =
  createInsertSchema(stockLedger).omit({ id: true });

export const insertSaleSchema =
  createInsertSchema(sales).omit({ id: true });

export const insertSaleItemSchema =
  createInsertSchema(salesItems).omit({ id: true });

export const insertSupplierPaymentSchema =
  createInsertSchema(supplierPayments).omit({ id: true });

export const insertCustomerPaymentSchema =
  createInsertSchema(customerPayments).omit({ id: true });

export const insertAdminSettingsSchema = createInsertSchema(adminSettings).omit({ id: true });



