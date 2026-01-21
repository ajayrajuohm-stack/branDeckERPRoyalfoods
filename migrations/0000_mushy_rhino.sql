CREATE TABLE `admin_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`admin_name` varchar(255) NOT NULL DEFAULT 'Admin',
	`company_name` varchar(255) NOT NULL DEFAULT 'My Company',
	`phone` varchar(255) NOT NULL DEFAULT '',
	`email` varchar(255) NOT NULL DEFAULT '',
	`address` varchar(255) NOT NULL DEFAULT '',
	`gst_number` varchar(255) DEFAULT '',
	`gsp_client_id` varchar(255) DEFAULT '',
	`gsp_client_secret` varchar(255) DEFAULT '',
	`gsp_username` varchar(255) DEFAULT '',
	`gsp_password` varchar(255) DEFAULT '',
	`is_service_active` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `admin_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bom_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bom_recipe_id` int NOT NULL,
	`item_id` int NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	CONSTRAINT `bom_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bom_recipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`output_item_id` int NOT NULL,
	`output_quantity` decimal(10,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bom_recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL DEFAULT 'RAW',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `customer_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_date` date NOT NULL,
	`customer_id` int NOT NULL,
	`sale_id` int,
	`owner_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`payment_method` varchar(255) NOT NULL,
	`remarks` varchar(255),
	`next_receipt_date` date,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `customer_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contact_person` varchar(255),
	`contact_info` varchar(255),
	`address` varchar(255),
	`shipping_address` varchar(255),
	`gst_number` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `expense_heads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `expense_heads_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_heads_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category_id` int NOT NULL,
	`default_uom_id` int NOT NULL,
	`reorder_level` decimal(10,2) NOT NULL DEFAULT '0',
	`hsn_code` varchar(255),
	`gst_rate` decimal(10,2) NOT NULL DEFAULT '0',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `items_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_item_category` UNIQUE(`name`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`default_share_percentage` decimal(10,2) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `owners_id` PRIMARY KEY(`id`),
	CONSTRAINT `owners_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_methods_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `production_consumptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`production_run_id` int NOT NULL,
	`item_id` int NOT NULL,
	`standard_qty` decimal(10,2) NOT NULL,
	`actual_qty` decimal(10,2) NOT NULL,
	`opening_stock` decimal(10,2) NOT NULL DEFAULT '0',
	`variance` decimal(10,2) DEFAULT '0',
	`remarks` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `production_consumptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`production_date` date NOT NULL,
	`output_item_id` int NOT NULL,
	`output_quantity` decimal(10,2) NOT NULL,
	`warehouse_id` int NOT NULL,
	`batch_count` decimal(10,2) NOT NULL DEFAULT '0',
	`remarks` varchar(255),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `production_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_id` int NOT NULL,
	`item_id` int NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`rate` decimal(10,2) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`gst_rate` decimal(10,2) NOT NULL DEFAULT '0',
	`gst_amount` decimal(10,2) NOT NULL DEFAULT '0',
	CONSTRAINT `purchase_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_date` date NOT NULL,
	`supplier_id` int NOT NULL,
	`warehouse_id` int NOT NULL,
	`total_amount` decimal(10,2) NOT NULL,
	`paying_amount` decimal(10,2) NOT NULL DEFAULT '0',
	`due_date` date,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_date` date NOT NULL,
	`customer_id` int NOT NULL,
	`warehouse_id` int NOT NULL,
	`total_amount` decimal(10,2) NOT NULL,
	`received_amount` decimal(10,2) NOT NULL DEFAULT '0',
	`due_date` date,
	`eway_bill_number` varchar(255),
	`transporter_id` varchar(255),
	`transporter_name` varchar(255),
	`vehicle_number` varchar(255),
	`distance` decimal(10,2),
	`cgst_amount` decimal(10,2) DEFAULT '0',
	`sgst_amount` decimal(10,2) DEFAULT '0',
	`igst_amount` decimal(10,2) DEFAULT '0',
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_id` int NOT NULL,
	`item_id` int NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`rate` decimal(10,2) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`gst_rate` decimal(10,2) NOT NULL DEFAULT '0',
	`gst_amount` decimal(10,2) NOT NULL DEFAULT '0',
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`warehouse_id` int NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`reference_type` varchar(255) NOT NULL,
	`reference_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `stock_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transfer_date` date NOT NULL,
	`item_id` int NOT NULL,
	`from_warehouse_id` int NOT NULL,
	`to_warehouse_id` int,
	`quantity` decimal(10,2) NOT NULL,
	`uom_id` int NOT NULL,
	`remarks` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `stock_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_date` date NOT NULL,
	`supplier_id` int NOT NULL,
	`purchase_id` int,
	`owner_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`payment_method` varchar(255) NOT NULL,
	`remarks` varchar(255),
	`next_payment_date` date,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `supplier_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`person_name` varchar(255),
	`contact_info` varchar(255),
	`address` varchar(255),
	`gst_number` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `units_of_measure` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `units_of_measure_id` PRIMARY KEY(`id`),
	CONSTRAINT `units_of_measure_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`),
	CONSTRAINT `warehouses_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `bom_lines` ADD CONSTRAINT `bom_lines_bom_recipe_id_bom_recipes_id_fk` FOREIGN KEY (`bom_recipe_id`) REFERENCES `bom_recipes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_lines` ADD CONSTRAINT `bom_lines_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_recipes` ADD CONSTRAINT `bom_recipes_output_item_id_items_id_fk` FOREIGN KEY (`output_item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_payments` ADD CONSTRAINT `customer_payments_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_payments` ADD CONSTRAINT `customer_payments_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_payments` ADD CONSTRAINT `customer_payments_owner_id_owners_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_default_uom_id_units_of_measure_id_fk` FOREIGN KEY (`default_uom_id`) REFERENCES `units_of_measure`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_consumptions` ADD CONSTRAINT `production_consumptions_production_run_id_production_runs_id_fk` FOREIGN KEY (`production_run_id`) REFERENCES `production_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_consumptions` ADD CONSTRAINT `production_consumptions_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_runs` ADD CONSTRAINT `production_runs_output_item_id_items_id_fk` FOREIGN KEY (`output_item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_runs` ADD CONSTRAINT `production_runs_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD CONSTRAINT `stock_ledger_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_from_warehouse_id_warehouses_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_to_warehouse_id_warehouses_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_uom_id_units_of_measure_id_fk` FOREIGN KEY (`uom_id`) REFERENCES `units_of_measure`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_owner_id_owners_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;