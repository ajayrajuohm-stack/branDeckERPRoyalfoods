
import "dotenv/config";
import { db } from "./server/db";
import { stockLedger, items, warehouses } from "./shared/schema";
import { eq, sql } from "drizzle-orm";

async function analyzeStock() {
    const ledger = await db.select().from(stockLedger);
    const itemList = await db.select().from(items);
    const whList = await db.select().from(warehouses);

    console.log("--- Stock Ledger Analysis ---");

    const negativeItems = [];

    // Calculate current stock manually to verify
    const balanceMap = new Map();

    for (const entry of ledger) {
        const key = `${entry.itemId}-${entry.warehouseId}`;
        const current = balanceMap.get(key) || 0;
        balanceMap.set(key, current + Number(entry.quantity));
    }

    for (const [key, balance] of balanceMap.entries()) {
        if (balance < 0) {
            const [itemId, whId] = key.split("-").map(Number);
            const item = itemList.find(i => i.id === itemId);
            const wh = whList.find(w => w.id === whId);
            console.log(`Item: ${item?.name} (${itemId}), WH: ${wh?.name} (${whId}), Balance: ${balance}`);

            const entries = ledger.filter(e => e.itemId === itemId && e.warehouseId === whId);
            console.log("  Entries:");
            for (const e of entries) {
                console.log(`    ID: ${e.id}, Qty: ${e.quantity}, Type: ${e.referenceType}, RefID: ${e.referenceId}, Created: ${e.createdAt}`);
            }
        }
    }
}

analyzeStock().catch(console.error);
