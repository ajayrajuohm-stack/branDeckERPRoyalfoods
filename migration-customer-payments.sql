-- Migration: Add customer_payments table
-- Run this SQL file in your PostgreSQL database

-- Create customer_payments table
CREATE TABLE IF NOT EXISTS customer_payments (
  id SERIAL PRIMARY KEY,
  payment_date DATE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  owner_id INTEGER NOT NULL REFERENCES owners(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_owner_id ON customer_payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_date ON customer_payments(payment_date);

-- Verify the changes
SELECT 'Customer payments table created successfully!' as status;
