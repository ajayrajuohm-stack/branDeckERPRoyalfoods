import "dotenv/config";
import { db } from "./server/db";
import { purchases, supplierPayments, suppliers } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkMahesh() {
    const mahesh = await db.select().from(suppliers).where(eq(suppliers.name, "Mahesh Foods")).limit(1);
    if (mahesh.length === 0) {
        console.log("Mahesh Foods not found");
        return;
    }
    const sId = mahesh[0].id;

    const pur = await db.select().from(purchases).where(eq(purchases.supplierId, sId));
    const pay = await db.select().from(supplierPayments).where(eq(supplierPayments.supplierId, sId));

    console.log("PURCHASES:");
    console.log(JSON.stringify(pur, null, 2));
    console.log("PAYMENTS:");
    console.log(JSON.stringify(pay, null, 2));

    process.exit(0);
}

checkMahesh();
