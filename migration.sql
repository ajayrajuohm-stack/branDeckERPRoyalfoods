-- Migration: Update purchases and sales tables with payment tracking
-- Run this SQL file in your PostgreSQL database

-- Step 1: Rename pending_amount to paying_amount in purchases table
ALTER TABLE purchases RENAME COLUMN pending_amount TO paying_amount;

-- Step 2: Add due_date column to purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS due_date DATE;

-- Step 3: Add received_amount and due_date columns to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS received_amount NUMERIC DEFAULT 0;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS due_date DATE;

-- Step 4: Create supplier_payments table
CREATE TABLE IF NOT EXISTS supplier_payments (
  id SERIAL PRIMARY KEY,
  payment_date DATE NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  owner_id INTEGER NOT NULL REFERENCES owners(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_owner_id ON supplier_payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_purchases_due_date ON purchases(due_date);
CREATE INDEX IF NOT EXISTS idx_sales_due_date ON sales(due_date);

-- Verify the changes
SELECT 'Migration completed successfully!' as status;
