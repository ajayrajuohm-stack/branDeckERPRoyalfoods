import { db } from "../server/db";
import { 
  unitsOfMeasure, warehouses, categories, suppliers, items, 
  expenseHeads, owners, paymentMethods 
} from "@shared/schema";

async function main() {
  console.log("Seeding database...");

  try {
    // UOMs
    try {
      await db.insert(unitsOfMeasure).values([
        { name: 'kg' }, { name: 'pcs' }, { name: 'ltr' }, { name: 'bag' }, { name: 'box' }
      ]).onConflictDoNothing();
      console.log("✓ UOMs seeded");
    } catch (err) {
      console.error("Error seeding UOMs:", err);
    }

    // Warehouses
    try {
      await db.insert(warehouses).values([
        { name: 'Main Store' }, 
        { name: 'Production Floor' }, 
        { name: 'Finished Goods Store' }
      ]).onConflictDoNothing();
      console.log("✓ Warehouses seeded");
    } catch (err) {
      console.error("Error seeding Warehouses:", err);
    }

    // Categories
    try {
      await db.insert(categories).values([
        { name: 'Raw Material' }, 
        { name: 'Finished Good' }, 
        { name: 'Packaging' },
        { name: 'Consumable' }
      ]).onConflictDoNothing();
      console.log("✓ Categories seeded");
    } catch (err) {
      console.error("Error seeding Categories:", err);
    }

    // Expense Heads
    try {
      await db.insert(expenseHeads).values([
        { name: 'Transport' }, 
        { name: 'Loading/Unloading' }, 
        { name: 'Commission' }
      ]).onConflictDoNothing();
      console.log("✓ Expense Heads seeded");
    } catch (err) {
      console.error("Error seeding Expense Heads:", err);
    }

    // Owners
    try {
      await db.insert(owners).values([
        { name: 'Owner A', defaultSharePercentage: '33.33' },
        { name: 'Owner B', defaultSharePercentage: '33.33' },
        { name: 'Owner C', defaultSharePercentage: '33.34' }
      ]).onConflictDoNothing();
      console.log("✓ Owners seeded");
    } catch (err) {
      console.error("Error seeding Owners:", err);
    }

    // Payment Methods
    try {
      await db.insert(paymentMethods).values([
        { name: 'Cash' }, { name: 'Cheque' }, { name: 'UPI' }, { name: 'Bank Transfer' }
      ]).onConflictDoNothing();
      console.log("✓ Payment Methods seeded");
    } catch (err) {
      console.error("Error seeding Payment Methods:", err);
    }

    // Suppliers
    try {
      await db.insert(suppliers).values([
        { name: 'Supplier A', contactInfo: '1234567890' },
        { name: 'Supplier B', contactInfo: 'Delhi' }
      ]).onConflictDoNothing();
      console.log("✓ Suppliers seeded");
    } catch (err) {
      console.error("Error seeding Suppliers:", err);
    }

    // Items (Need IDs from above, but for simple seed we can just rely on auto-inc if empty or fetch)
    // We'll skip complex item linking for this simple seed script to avoid errors if run multiple times
    // The app allows creating items via UI.

    console.log("\n✅ Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Fatal error during seeding:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
