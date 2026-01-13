
import "dotenv/config";
import { db } from "./server/db";
import { stockLedger, productionRuns } from "./shared/schema";
import { eq, inArray, sql } from "drizzle-orm";

async function healStockLedger() {
    console.log("--- Healing Stock Ledger ---");

    // 1. Get all production-related entries
    const entries = await db.select().from(stockLedger).where(
        sql`${stockLedger.referenceType} IN ('PRODUCTION', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_ADJUSTMENT', 'PRODUCTION_REVERSAL')`
    );

    // 2. Get all existing production runs
    const runs = await db.select({ id: productionRuns.id }).from(productionRuns);
    const existingRunIds = new Set(runs.map(r => r.id));

    // 3. Group by referenceId
    const groups = new Map();
    for (const e of entries) {
        const refId = e.referenceId;
        if (!groups.has(refId)) groups.set(refId, []);
        groups.get(refId).push(e);
    }

    let healedCount = 0;

    for (const [refId, groupEntries] of groups.entries()) {
        // If the production run is deleted
        if (!existingRunIds.has(refId)) {
            console.log(`Checking deleted Production Run #${refId}...`);

            // Group by item and warehouse to check balance
            const balanceMap = new Map();
            for (const e of groupEntries) {
                const key = `${e.itemId}-${e.warehouseId}`;
                const current = balanceMap.get(key) || 0;
                balanceMap.set(key, current + Number(e.quantity));
            }

            for (const [key, balance] of balanceMap.entries()) {
                if (Math.abs(balance) > 0.0001) {
                    const [itemId, warehouseId] = key.split("-").map(Number);
                    console.log(`  Mismatch found for Item ${itemId} in WH ${warehouseId}: Current Balance ${balance}. Fixing...`);

                    // Add a reversal entry to bring it to 0
                    await db.insert(stockLedger).values({
                        itemId,
                        warehouseId,
                        quantity: String(-balance),
                        referenceType: "PRODUCTION_REVERSAL",
                        referenceId: refId,
                    });
                    healedCount++;
                }
            }
        }
    }

    console.log(`--- Healing Complete. Added ${healedCount} missing reversal entries. ---`);
}

healStockLedger().catch(console.error);
