import { db } from "../db";
import {
  productionRuns,
  productionConsumptions,
} from "../../shared/schema";
import {
  getCurrentStock,
  postStockLedgerEntry,
} from "./stock";

/**
 * EOD Production Entry
 * - Stock moves ONLY here
 * - Actual consumption drives stock
 */
export async function createEodProductionRun(input: {
  productionDate: string;
  outputItemId: number;
  outputQuantity: number; // ACTUAL OUTPUT
  warehouseId: number;
  consumptions: {
    itemId: number;
    standardQty: number;
    actualQty: number;
  }[];
}) {
  return await db.transaction(async (tx) => {
    /* ===========================
       1. STOCK VALIDATION
    ============================ */

    for (const row of input.consumptions) {
      const available = await getCurrentStock(
        row.itemId,
        input.warehouseId
      );

      if (available < row.actualQty) {
        throw new Error(
          `Insufficient stock for item ${row.itemId}. Available: ${available}`
        );
      }
    }

    /* ===========================
       2. INSERT PRODUCTION RUN
    ============================ */

    const [production] = await tx
      .insert(productionRuns)
      .values({
        productionDate: input.productionDate,
        outputItemId: input.outputItemId,
        outputQuantity: input.outputQuantity.toString(),
        warehouseId: input.warehouseId,
      })
      .returning();

    /* ===========================
       3. RAW MATERIAL CONSUMPTION
    ============================ */

    for (const row of input.consumptions) {
      // Get opening stock for this item
      const openingStock = await getCurrentStock(row.itemId, input.warehouseId);

      // Save consumption record
      await tx.insert(productionConsumptions).values({
        productionRunId: production.id,
        itemId: row.itemId,
        standardQty: row.standardQty.toString(),
        actualQty: row.actualQty.toString(),
        openingStock: openingStock.toString(),
      });

      // Deduct stock (ACTUAL consumption)
      await postStockLedgerEntry({
        itemId: row.itemId,
        warehouseId: input.warehouseId,
        quantity: -row.actualQty,
        referenceType: "PROD_CONSUME",
        referenceId: production.id,
      });
    }

    /* ===========================
       4. FINISHED GOODS OUTPUT
    ============================ */

    await postStockLedgerEntry({
      itemId: input.outputItemId,
      warehouseId: input.warehouseId,
      quantity: input.outputQuantity,
      referenceType: "PROD_OUTPUT",
      referenceId: production.id,
    });

    return production;
  });
}
