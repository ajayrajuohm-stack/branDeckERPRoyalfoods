import XLSX from "xlsx";
import { db } from "./db";
import { suppliers, insertSupplierSchema } from "../shared/schema";

/**
 * Import suppliers from Excel file
 *
 * Expected columns (case-sensitive):
 * name | personName | contactInfo | address
 */
export async function importSuppliersFromExcel(filePath: string) {
  // Read file into buffer for Vercel compatibility
  const fs = await import('fs');
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
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
        personName: raw.personName ? String(raw.personName).trim() : undefined,
        contactInfo: raw.contactInfo
          ? String(raw.contactInfo).trim()
          : undefined,
        address: raw.address ? String(raw.address).trim() : undefined,
        gstNumber: raw.gstNumber ? String(raw.gstNumber).trim() : undefined,
      };

      // Validate after normalization
      const parsed = insertSupplierSchema.parse(normalized);

      await db
        .insert(suppliers)
        .values(parsed)
        .onConflictDoNothing(); // skips duplicates safely

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
