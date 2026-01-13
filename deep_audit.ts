import "dotenv/config";
import { db } from "./server/db";
import { purchases, supplierPayments, suppliers } from "./shared/schema";
import { eq, sql } from "drizzle-orm";

async function deepAudit() {
    const result = await db
        .select({
            sId: suppliers.id,
            sName: suppliers.name,
            pId: purchases.id,
            pTotal: purchases.totalAmount,
            pPaid: purchases.payingAmount
        })
        .from(suppliers)
        .leftJoin(purchases, eq(suppliers.id, purchases.supplierId));

    console.log("=== PURCHASE AUDIT ===");
    console.log(JSON.stringify(result, null, 2));

    const pays = await db
        .select({
            id: supplierPayments.id,
            sName: suppliers.name,
            amount: supplierPayments.amount,
            remarks: supplierPayments.remarks
        })
        .from(supplierPayments)
        .leftJoin(suppliers, eq(supplierPayments.supplierId, suppliers.id));

    console.log("=== PAYMENT AUDIT ===");
    console.log(JSON.stringify(pays, null, 2));

    process.exit(0);
}

deepAudit();
