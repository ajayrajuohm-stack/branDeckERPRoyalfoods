import { z } from "zod";
import {
  insertUomSchema,
  insertWarehouseSchema,
  insertCategorySchema,
  insertItemSchema,
  insertSupplierSchema,
  insertCustomerSchema,
  insertExpenseHeadSchema,
  insertOwnerSchema,
  insertPaymentMethodSchema,
  insertBomRecipeSchema,
  insertProductionRunSchema,

  unitsOfMeasure,
  warehouses,
  categories,
  items,
  suppliers,
  customers,
  expenseHeads,
  owners,
  paymentMethods,
  bomRecipes,
  productionRuns,
} from "./schema";

/* =========================================
   ERROR SCHEMAS
========================================= */

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  business: z.object({
    message: z.string(),
  }),
};

/* =========================================
   CRUD GENERATOR
========================================= */

const createCrudEndpoints = (
  resource: string,
  schema: z.AnyZodObject,
  entity: any
) => ({
  list: {
    method: "GET" as const,
    path: `/api/${resource}`,
    responses: {
      200: z.array(z.custom<typeof entity>()),
    },
  },
  create: {
    method: "POST" as const,
    path: `/api/${resource}`,
    input: schema,
    responses: {
      201: z.custom<typeof entity>(),
      400: errorSchemas.validation,
    },
  },
  update: {
    method: "PUT" as const,
    path: `/api/${resource}/:id`,
    input: schema.partial(),
    responses: {
      200: z.custom<typeof entity>(),
      404: errorSchemas.notFound,
    },
  },
  delete: {
    method: "DELETE" as const,
    path: `/api/${resource}/:id`,
    responses: {
      204: z.void(),
      400: errorSchemas.business,
    },
  },
});

/* =========================================
   API MAP (CLEAN & VALID)
========================================= */

export const api = {
  /* ===== MASTERS ===== */

  uoms: createCrudEndpoints(
    "uoms",
    insertUomSchema,
    unitsOfMeasure.$inferSelect
  ),

  warehouses: createCrudEndpoints(
    "warehouses",
    insertWarehouseSchema,
    warehouses.$inferSelect
  ),

  categories: createCrudEndpoints(
    "categories",
    insertCategorySchema,
    categories.$inferSelect
  ),

  items: createCrudEndpoints(
    "items",
    insertItemSchema,
    items.$inferSelect
  ),

  suppliers: createCrudEndpoints(
    "suppliers",
    insertSupplierSchema,
    suppliers.$inferSelect
  ),

  customers: createCrudEndpoints(
    "customers",
    insertCustomerSchema,
    customers.$inferSelect
  ),

  expenseHeads: createCrudEndpoints(
    "expense-heads",
    insertExpenseHeadSchema,
    expenseHeads.$inferSelect
  ),

  owners: createCrudEndpoints(
    "owners",
    insertOwnerSchema,
    owners.$inferSelect
  ),

  paymentMethods: createCrudEndpoints(
    "payment-methods",
    insertPaymentMethodSchema,
    paymentMethods.$inferSelect
  ),

  /* ===== BOM ===== */

  bomRecipes: createCrudEndpoints(
    "bom-recipes",
    insertBomRecipeSchema,
    bomRecipes.$inferSelect
  ),

  /* ===== PRODUCTION ===== */

  production: createCrudEndpoints(
    "production",
    insertProductionRunSchema,
    productionRuns.$inferSelect
  ),
};
