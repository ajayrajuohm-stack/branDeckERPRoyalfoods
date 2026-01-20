import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  numeric,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* =======================
   AUTHENTICATION
======================= */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

export const unitsOfMeasure = pgTable("units_of_measure", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull().default("RAW"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  personName: text("person_name"),
  contactInfo: text("contact_info"),
  address: text("address"),
  gstNumber: text("gst_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person"),
  contactInfo: text("contact_info"),
  address: text("address"),
  shippingAddress: text("shipping_address"),
  gstNumber: text("gst_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseHeads = pgTable("expense_heads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  defaultSharePercentage: numeric("default_share_percentage").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    categoryId: integer("category_id")
      .references(() => categories.id)
      .notNull(),
    defaultUomId: integer("default_uom_id")
      .references(() => unitsOfMeasure.id)
      .notNull(),
    reorderLevel: numeric("reorder_level").notNull().default("0"),
    hsnCode: text("hsn_code"),
    gstRate: numeric("gst_rate").notNull().default("0"),
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

export const bomRecipes = pgTable("bom_recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  outputItemId: integer("output_item_id")
    .references(() => items.id)
    .notNull(),
  outputQuantity: numeric("output_quantity").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bomLines = pgTable("bom_lines", {
  id: serial("id").primaryKey(),
  bomRecipeId: integer("bom_recipe_id")
    .references(() => bomRecipes.id, { onDelete: "cascade" })
    .notNull(),
  itemId: integer("item_id")
    .references(() => items.id)
    .notNull(),
  quantity: numeric("quantity").notNull(),
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

export const productionRuns = pgTable("production_runs", {
  id: serial("id").primaryKey(),
  productionDate: date("production_date").notNull(),
  outputItemId: integer("output_item_id")
    .references(() => items.id)
    .notNull(),
  outputQuantity: numeric("output_quantity").notNull(),
  warehouseId: integer("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  batchCount: numeric("batch_count").notNull().default("0"),
  remarks: text("remarks"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productionConsumptions = pgTable("production_consumptions", {
  id: serial("id").primaryKey(),
  productionRunId: integer("production_run_id")
    .references(() => productionRuns.id, { onDelete: "cascade" })
    .notNull(),
  itemId: integer("item_id")
    .references(() => items.id)
    .notNull(),
  standardQty: numeric("standard_qty").notNull(),
  actualQty: numeric("actual_qty").notNull(),
  openingStock: numeric("opening_stock").notNull().default("0"),
  variance: numeric("variance").default("0"), // Added explicit variance column for persistence if needed
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =======================
   PURCHASES
======================= */

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  purchaseDate: date("purchase_date").notNull(),
  supplierId: integer("supplier_id")
    .references(() => suppliers.id)
    .notNull(),
  warehouseId: integer("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  totalAmount: numeric("total_amount").notNull(),
  payingAmount: numeric("paying_amount").notNull().default("0"),
  dueDate: date("due_date"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id")
    .references(() => purchases.id, { onDelete: "cascade" })
    .notNull(),
  itemId: integer("item_id")
    .references(() => items.id)
    .notNull(),
  quantity: numeric("quantity").notNull(),
  rate: numeric("rate").notNull(),
  amount: numeric("amount").notNull(),
  gstRate: numeric("gst_rate").notNull().default("0"),
  gstAmount: numeric("gst_amount").notNull().default("0"),
});

/* =======================
   SALES
======================= */

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleDate: date("sale_date").notNull(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  warehouseId: integer("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .references(() => sales.id, { onDelete: "cascade" })
    .notNull(),
  itemId: integer("item_id")
    .references(() => items.id)
    .notNull(),
  quantity: numeric("quantity").notNull(),
  rate: numeric("rate").notNull(),
  amount: numeric("amount").notNull(),
  gstRate: numeric("gst_rate").notNull().default("0"),
  gstAmount: numeric("gst_amount").notNull().default("0"),
});

/* =======================
   STOCK LEDGER
======================= */

export const stockLedger = pgTable("stock_ledger", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .references(() => items.id)
    .notNull(),
  warehouseId: integer("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  quantity: numeric("quantity").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: integer("reference_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =======================
   SUPPLIER PAYMENTS
======================= */

export const supplierPayments = pgTable("supplier_payments", {
  id: serial("id").primaryKey(),
  paymentDate: date("payment_date").notNull(),
  supplierId: integer("supplier_id")
    .references(() => suppliers.id)
    .notNull(),
  purchaseId: integer("purchase_id")
    .references(() => purchases.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id")
    .references(() => owners.id)
    .notNull(),
  amount: numeric("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  remarks: text("remarks"),
  nextPaymentDate: date("next_payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =======================
   CUSTOMER PAYMENTS
======================= */

export const customerPayments = pgTable("customer_payments", {
  id: serial("id").primaryKey(),
  paymentDate: date("payment_date").notNull(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  saleId: integer("sale_id")
    .references(() => sales.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id")
    .references(() => owners.id)
    .notNull(),
  amount: numeric("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  remarks: text("remarks"),
  nextReceiptDate: date("next_receipt_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockTransfers = pgTable("stock_transfers", {
  id: serial("id").primaryKey(),
  transferDate: date("transfer_date").notNull(),
  itemId: integer("item_id")
    .references(() => items.id)
    .notNull(),
  fromWarehouseId: integer("from_warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  toWarehouseId: integer("to_warehouse_id")
    .references(() => warehouses.id), // Nullable for Issue/Consume
  quantity: numeric("quantity").notNull(),
  uomId: integer("uom_id")
    .references(() => unitsOfMeasure.id)
    .notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
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



