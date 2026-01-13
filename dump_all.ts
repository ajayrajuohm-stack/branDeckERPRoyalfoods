import "dotenv/config";
import { db } from "./server/db";
import { purchases, supplierPayments, suppliers } from "./shared/schema";
import { eq, asc } from "drizzle-orm";

async function dumpAll() {
    const allSuppliers = await db.select().from(suppliers);
    console.log("SUPPLIERS:");
    console.log(JSON.stringify(allSuppliers, null, 2));

    const allSP = await db.select().from(supplierPayments);
    console.log("ALL SUPPLIER PAYMENTS:");
    console.log(JSON.stringify(allSP, null, 2));

    const allPur = await db.select().from(purchases);
    console.log("ALL PURCHASES:");
    console.log(JSON.stringify(allPur, null, 2));

    process.exit(0);
}

dumpAll();
