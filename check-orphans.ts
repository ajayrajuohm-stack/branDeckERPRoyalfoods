import { db } from "./server/db";
import { stockLedger, purchases, sales, productionRuns, stockTransfers } from "./shared/schema";
import { eq, inArray, notInArray } from "drizzle-orm";

async function checkOrphans() {
    console.log("Checking for orphaned stock ledger entries...");

    const allEntries = await db.select().from(stockLedger);
    console.log(`Total stock ledger entries: ${allEntries.length}`);

    const types = [...new Set(allEntries.map(e => e.referenceType))];
    console.log(`Reference types found: ${types.join(", ")}`);

    for (const type of types) {
        const entriesOfType = allEntries.filter(e => e.referenceType === type);
        const ids = [...new Set(entriesOfType.map(e => e.referenceId))];

        let parentTable: any;
        if (type === "PURCHASE") parentTable = purchases;
        else if (type === "SALE") parentTable = sales;
        else if (type.startsWith("PRODUCTION")) parentTable = productionRuns;
        else if (type.startsWith("TRANSFER")) parentTable = stockTransfers;

        if (parentTable) {
            const existingParents = await db.select({ id: parentTable.id }).from(parentTable).where(inArray(parentTable.id, ids));
            const existingIds = existingParents.map(p => p.id);
            const orphans = entriesOfType.filter(e => !existingIds.includes(e.referenceId));

            if (orphans.length > 0) {
                console.log(`Found ${orphans.length} orphaned entries for type ${type}`);
                // orphans.forEach(o => console.log(`  - Entry ID ${o.id}, Ref ID ${o.referenceId}`));
            } else {
                console.log(`No orphans found for type ${type}`);
            }
        }
    }
}

checkOrphans().catch(console.error);
