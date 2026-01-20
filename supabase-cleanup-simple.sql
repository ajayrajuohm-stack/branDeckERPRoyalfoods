-- ============================================
-- SUPABASE DATA CLEANUP SCRIPT (SIMPLE VERSION)
-- Copy and paste this entire script into Supabase SQL Editor
-- ============================================

-- Delete in correct order to avoid foreign key constraints
DELETE FROM stock_ledger;
DELETE FROM production_consumptions;
DELETE FROM production_runs;
DELETE FROM sales_items;
DELETE FROM customer_payments;
DELETE FROM sales;
DELETE FROM purchase_items;
DELETE FROM supplier_payments;
DELETE FROM purchases;
DELETE FROM stock_transfers;

-- Verify deletion (should all show 0)
SELECT 
  (SELECT COUNT(*) FROM stock_ledger) as stock_ledger_count,
  (SELECT COUNT(*) FROM production_runs) as production_count,
  (SELECT COUNT(*) FROM sales) as sales_count,
  (SELECT COUNT(*) FROM purchases) as purchases_count,
  (SELECT COUNT(*) FROM stock_transfers) as transfers_count;
