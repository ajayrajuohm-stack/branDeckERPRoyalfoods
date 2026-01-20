-- ============================================
-- SUPABASE DATA CLEANUP SCRIPT
-- This script deletes all transaction data while preserving master data
-- Run this in Supabase SQL Editor before deploying
-- ============================================

-- 1. Delete all stock ledger entries (this tracks all inventory movements)
DELETE FROM stock_ledger;

-- 2. Delete all production-related data
DELETE FROM production_consumptions;
DELETE FROM production_runs;

-- 3. Delete all sales-related data
DELETE FROM sales_items;
DELETE FROM sales;
DELETE FROM customer_payments;

-- 4. Delete all purchase-related data
DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM supplier_payments;

-- 5. Delete all stock transfers
DELETE FROM stock_transfers;

-- 6. Reset sequences (optional - this resets auto-increment IDs to 1)
-- Uncomment these if you want IDs to start from 1 again
-- ALTER SEQUENCE purchases_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sales_id_seq RESTART WITH 1;
-- ALTER SEQUENCE production_runs_id_seq RESTART WITH 1;
-- ALTER SEQUENCE stock_ledger_id_seq RESTART WITH 1;

-- ============================================
-- VERIFICATION QUERIES
-- Run these to confirm data is deleted
-- ============================================

-- Check counts (should all be 0)
SELECT 'stock_ledger' as table_name, COUNT(*) as count FROM stock_ledger
UNION ALL
SELECT 'production_runs', COUNT(*) FROM production_runs
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases
UNION ALL
SELECT 'stock_transfers', COUNT(*) FROM stock_transfers;

-- ============================================
-- MASTER DATA PRESERVED
-- The following tables will NOT be affected:
-- - categories
-- - units_of_measure
-- - warehouses
-- - items
-- - suppliers
-- - customers
-- - owners
-- - expense_heads
-- - payment_methods
-- - bom_recipes
-- - bom_lines
-- - admin_settings
-- ============================================
