// @ts-nocheck
import { db } from "../db";
import { stockLedger } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Get current stock for an item in a warehouse
 */
export async function getCurrentStock(
  itemId: number,
  warehouseId: number
): Promise<number> {
  const result = await db
    .select({
      qty: sql<number>`COALESCE(SUM(${stockLedger.quantity}), 0)`,
    })
    .from(stockLedger)
    .where(
      sql`${stockLedger.itemId} = ${itemId} AND ${stockLedger.warehouseId} = ${warehouseId}`
    );

  return Number(result[0]?.qty ?? 0);
}

/**
 * Post a stock ledger entry
 * quantity:
 *   +ve → inward
 *   -ve → outward
 */
export async function postStockLedgerEntry(input: {
  itemId: number;
  warehouseId: number;
  quantity: number;
  referenceType: string;
  referenceId: number;
}) {
  await db.insert(stockLedger).values({
    itemId: input.itemId,
    warehouseId: input.warehouseId,
    quantity: input.quantity.toString(),
    referenceType: input.referenceType,
    referenceId: input.referenceId,
  });
}
