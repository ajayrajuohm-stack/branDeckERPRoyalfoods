CREATE TABLE "bom_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"bom_recipe_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bom_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"output_item_id" integer NOT NULL,
	"output_quantity" numeric NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'RAW' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"contact_info" text,
	"address" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "customers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expense_heads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "expense_heads_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category_id" integer NOT NULL,
	"default_uom_id" integer NOT NULL,
	"reorder_level" numeric DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"default_share_percentage" numeric NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "owners_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_methods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "production_consumptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_run_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"standard_qty" numeric NOT NULL,
	"actual_qty" numeric NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_date" date NOT NULL,
	"output_item_id" integer NOT NULL,
	"output_quantity" numeric NOT NULL,
	"warehouse_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric NOT NULL,
	"rate" numeric NOT NULL,
	"amount" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_date" date NOT NULL,
	"supplier_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"total_amount" numeric NOT NULL,
	"pending_amount" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"quantity" numeric NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"person_name" text,
	"contact_info" text,
	"address" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "suppliers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "units_of_measure" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "units_of_measure_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "warehouses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_bom_recipe_id_bom_recipes_id_fk" FOREIGN KEY ("bom_recipe_id") REFERENCES "public"."bom_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_recipes" ADD CONSTRAINT "bom_recipes_output_item_id_items_id_fk" FOREIGN KEY ("output_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_default_uom_id_units_of_measure_id_fk" FOREIGN KEY ("default_uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_consumptions" ADD CONSTRAINT "production_consumptions_production_run_id_production_runs_id_fk" FOREIGN KEY ("production_run_id") REFERENCES "public"."production_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_consumptions" ADD CONSTRAINT "production_consumptions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_output_item_id_items_id_fk" FOREIGN KEY ("output_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_item_category" ON "items" USING btree ("name","category_id");