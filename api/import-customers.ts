import XLSX from "xlsx";
import { db } from "./db";
import { customers, insertCustomerSchema } from "../shared/schema";

/**
 * Import customers from Excel file
 *
 * Expected columns (case-sensitive):
 * name | contactPerson | contactInfo | address
 */
export async function importCustomersFromExcel(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<any>(sheet);

  const errors: any[] = [];
  let success = 0;

  for (let i = 0; i < rows.length; i++) {
    try {
      const raw = rows[i];

      /**
       * ✅ NORMALIZE EXCEL DATA
       * Excel converts numbers → number
       * Zod expects strings → convert safely
       */
      const normalized = {
        name: raw.name ? String(raw.name).trim() : undefined,
        contactPerson: raw.contactPerson ? String(raw.contactPerson).trim() : undefined,
        contactInfo: raw.contactInfo ? String(raw.contactInfo).trim() : undefined,
        address: raw.address ? String(raw.address).trim() : undefined,
        shippingAddress: raw.shippingAddress ? String(raw.shippingAddress).trim() : undefined,
        gstNumber: raw.gstNumber ? String(raw.gstNumber).trim() : undefined,
      };

      // Validate after normalization
      const parsed = insertCustomerSchema.parse(normalized);

      await db
        .insert(customers)
        .ignore()
        .values(parsed);

      success++;
    } catch (err: any) {
      errors.push({
        row: i + 2, // Excel row number (header is row 1)
        data: rows[i],
        error: err.errors ?? err.message,
      });
    }
  }

  return {
    total: rows.length,
    success,
    failed: errors.length,
    errors,
  };
}
