-- ============================================
-- SUPABASE DATA CLEANUP SCRIPT
-- This script deletes all transaction data while preserving master data
-- Run this in Supabase SQL Editor before deploying
-- ============================================

-- 1. Delete all stock ledger entries (this tracks all inventory movements)
DELETE FROM "stockLedger";

-- 2. Delete all production-related data
DELETE FROM "productionConsumptions";
DELETE FROM "productionRuns";

-- 3. Delete all sales-related data
DELETE FROM "salesItems";
DELETE FROM sales;
DELETE FROM "customerPayments";

-- 4. Delete all purchase-related data
DELETE FROM "purchaseItems";
DELETE FROM purchases;
DELETE FROM "supplierPayments";

-- 5. Delete all stock transfers
DELETE FROM "stockTransfers";

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
SELECT 'stockLedger' as table_name, COUNT(*) as count FROM "stockLedger"
UNION ALL
SELECT 'productionRuns', COUNT(*) FROM "productionRuns"
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases
UNION ALL
SELECT 'stockTransfers', COUNT(*) FROM "stockTransfers";

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
