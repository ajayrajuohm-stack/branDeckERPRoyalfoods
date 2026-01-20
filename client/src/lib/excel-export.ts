import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export async function exportProductionOrderToExcel(
  run: any,
  companyInfo: any = {
    name: "My Company",
    address: "Address",
    phone: "Phone",
    email: "Email"
  }
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Production Order');

  // Set up columns (A-G)
  worksheet.columns = [
    { key: 'A', width: 25 }, // Label / Item
    { key: 'B', width: 25 }, // Value
    { key: 'C', width: 15 }, // Opening
    { key: 'D', width: 15 }, // Standard
    { key: 'E', width: 15 }, // Actual
    { key: 'F', width: 15 }, // Variance
    { key: 'G', width: 25 }, // Remarks
  ];

  // Colors
  const themeColor = 'FF107C41'; // Excel Green
  const lightFill = 'FFF2F2F2';
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // --- HEADER SECTION ---
  worksheet.mergeCells('A1:B1');
  const companyNameCell = worksheet.getCell('A1');
  companyNameCell.value = companyInfo.name.toUpperCase();
  companyNameCell.font = { bold: true, size: 16, color: { argb: themeColor } };

  worksheet.mergeCells('A2:B4');
  const companyDetailsCell = worksheet.getCell('A2');
  companyDetailsCell.value = `${companyInfo.address}\nPhone: ${companyInfo.phone}\nEmail: ${companyInfo.email}`;
  companyDetailsCell.alignment = { wrapText: true, vertical: 'top' };

  // TITLE BLOCK
  worksheet.mergeCells('D1:G2'); // Extended merge to G
  const titleCell = worksheet.getCell('D1');
  titleCell.value = 'PRODUCTION ORDER';
  titleCell.font = { bold: true, size: 22, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColor } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Order Info
  worksheet.getCell('F3').value = "DATE";
  worksheet.getCell('F3').font = { bold: true };
  worksheet.getCell('F3').alignment = { horizontal: 'right' };
  worksheet.getCell('G3').value = run.productionDate ? format(new Date(run.productionDate), 'dd-MM-yyyy') : '-';
  worksheet.getCell('G3').alignment = { horizontal: 'center' };

  worksheet.getCell('F4').value = "ORDER #";
  worksheet.getCell('F4').font = { bold: true };
  worksheet.getCell('F4').alignment = { horizontal: 'right' };
  worksheet.getCell('G4').value = String(run.id).padStart(6, '0');
  worksheet.getCell('G4').font = { bold: true };
  worksheet.getCell('G4').alignment = { horizontal: 'center' };

  worksheet.addRow([]); // Gap
  worksheet.addRow([]);

  // --- SUMMARY SECTION ---
  const summaryHeaderRow = worksheet.addRow(['PRODUCTION SUMMARY']);
  worksheet.mergeCells(`A${summaryHeaderRow.number}:G${summaryHeaderRow.number}`);
  summaryHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColor } };
  summaryHeaderRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeaderRow.getCell(1).alignment = { horizontal: 'center' };

  const addSummaryRow = (label1: string, val1: any, label2: string, val2: any) => {
    // Adjusted merge ranges for wider layout
    const row = worksheet.addRow([label1, val1, '', '', label2, val2, '']);
    worksheet.mergeCells(`B${row.number}:C${row.number}`); // Merged Value 1
    worksheet.mergeCells(`F${row.number}:G${row.number}`); // Merged Value 2
    row.getCell(1).font = { bold: true };
    row.getCell(5).font = { bold: true };
    [1, 2, 5, 6].forEach(i => row.getCell(i).border = borderStyle);
    return row;
  };

  addSummaryRow('Finished Good', run.outputItemName, 'Order ID', run.id);
  addSummaryRow('Output Qty', `${Number(run.outputQuantity).toFixed(2)}`, 'Warehouse', run.warehouseName);
  addSummaryRow('Batches', run.batchCount, 'Status', 'COMPLETED');

  // Remarks (Main)
  const remarksRow = worksheet.addRow(['Job Remarks', run.remarks || '-']);
  worksheet.mergeCells(`B${remarksRow.number}:G${remarksRow.number}`);
  remarksRow.getCell(1).font = { bold: true };
  [1, 2].forEach(i => remarksRow.getCell(i).border = borderStyle);

  worksheet.addRow([]); // Gap
  worksheet.addRow([]);

  // --- CONSUMPTION TABLE ---
  const tableHeaderRow = worksheet.addRow(['RAW MATERIAL', 'PER BATCH', 'OPENING', 'STANDARD', 'ACTUAL', 'VARIANCE', 'CLOSING STOCK', 'REMARKS']);
  tableHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColor } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = borderStyle;
  });

  // Data rows
  if (run.consumptions && Array.isArray(run.consumptions)) {
    run.consumptions.forEach((c: any, index: number) => {
      const perBatch = Number(c.standardQty) / (Number(run.batchCount) || 1);
      const opening = Number(c.opening || 0);
      const actual = Number(c.actualQty || 0);
      const variance = Number(c.variance || 0);
      const closing = opening - actual - variance;

      const row = worksheet.addRow([
        c.itemName,
        perBatch.toFixed(3),
        opening.toFixed(2),
        Number(c.standardQty).toFixed(2),
        actual.toFixed(2),
        variance.toFixed(2),
        closing.toFixed(2),
        c.remarks || ''
      ]);

      // Alternating row colors
      if (index % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightFill } };
        });
      }

      row.eachCell(cell => cell.border = borderStyle);

      row.getCell(1).alignment = { horizontal: 'left' };
      [2, 3, 4, 5, 6, 7].forEach(i => row.getCell(i).alignment = { horizontal: 'right' });
      row.getCell(8).alignment = { horizontal: 'left', wrapText: true }; // Remarks align left

      // Variance coloring
      if (variance !== 0) {
        row.getCell(6).font = { bold: true, color: { argb: variance < 0 ? 'FFFF0000' : 'FF00B050' } };
      }
    });
  }

  // --- FOOTER ---
  worksheet.addRow([]);
  worksheet.addRow([]);
  const footerRow = worksheet.addRow(['Generated by ERP System • ' + format(new Date(), 'dd MMM yyyy HH:mm')]);
  worksheet.mergeCells(`A${footerRow.number}:F${footerRow.number}`);
  footerRow.getCell(1).alignment = { horizontal: 'center' };
  footerRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF808080' } };

  // Final Blob Generation
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Production_Order_${run.id}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}



export async function exportToExcel(
  data: any[],
  columns: { header: string; key: string; width?: number }[],
  filename: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 15
  }));

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4CAF50' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  data.forEach(row => {
    worksheet.addRow(row);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// FORMATTED ORDER EXPORT (PO/INVOICE STYLE)
export async function exportOrderToExcel(
  order: any,
  type: 'PURCHASE ORDER' | 'SALES INVOICE',
  companyInfo: any = {
    name: "GimBooks",
    address: "[Street Address]\n[City, ST ZIP]",
    phone: "(000) 000-0000",
    fax: "(000) 000-0000",
    website: "Website"
  }
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type === 'PURCHASE ORDER' ? 'Purchase Order' : 'Sales Invoice');

  // Set up columns (A-E)
  worksheet.columns = [
    { key: 'A', width: 15 }, // Item # / Code
    { key: 'B', width: 35 }, // Description
    { key: 'C', width: 10 }, // Qty
    { key: 'D', width: 15 }, // Unit Price
    { key: 'E', width: 15 }, // Total
  ];

  // --- STYLES ---
  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF0000' } // Red
  } as ExcelJS.Fill;

  const headerFont = {
    color: { argb: 'FFFFFFFF' }, // White
    bold: true,
    size: 11
  };

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // --- TOP HEADER ---
  // Logo placeholder could go here if we had an image
  worksheet.mergeCells('A1:B1');
  const companyNameCell = worksheet.getCell('A1');
  companyNameCell.value = companyInfo.name;
  companyNameCell.font = { bold: true, size: 16, color: { argb: 'FF2D74B4' } }; // Blue-ish

  worksheet.mergeCells('A2:B6');
  const companyDetailsCell = worksheet.getCell('A2');
  companyDetailsCell.value = `${companyInfo.address}\nPhone: ${companyInfo.phone}\nFax: ${companyInfo.fax}\nWebsite: ${companyInfo.website}`;
  companyDetailsCell.alignment = { wrapText: true, vertical: 'top' };

  // TITLE (Big Red Text)
  worksheet.mergeCells('C2:E2');
  const titleCell = worksheet.getCell('C2');
  titleCell.value = type;
  titleCell.font = { bold: true, size: 20, color: { argb: 'FFFF0000' } };
  titleCell.alignment = { horizontal: 'right' };

  // Date and PO #
  worksheet.getCell('D3').value = "DATE";
  worksheet.getCell('D3').font = { bold: true };
  worksheet.getCell('D3').alignment = { horizontal: 'right' };
  worksheet.getCell('E3').value = order.date ? format(new Date(order.date), 'dd-MM-yyyy') : '-';
  worksheet.getCell('E3').alignment = { horizontal: 'right' };

  worksheet.getCell('D4').value = type === 'PURCHASE ORDER' ? "PO #" : "INV #";
  worksheet.getCell('D4').font = { bold: true };
  worksheet.getCell('D4').alignment = { horizontal: 'right' };
  worksheet.getCell('E4').value = `[${order.id || 123456}]`;
  worksheet.getCell('E4').alignment = { horizontal: 'right' };

  // Spacing
  worksheet.addRow([]);

  // --- VENDOR & SHIP TO ---
  const vendorRowIdx = 8;
  const vendorHeaderCell = worksheet.getCell(`A${vendorRowIdx}`);
  vendorHeaderCell.value = type === 'PURCHASE ORDER' ? "VENDOR" : "BILL TO";
  vendorHeaderCell.fill = headerFill;
  vendorHeaderCell.font = headerFont;
  worksheet.mergeCells(`A${vendorRowIdx}:B${vendorRowIdx}`);

  const shipToHeaderCell = worksheet.getCell(`C${vendorRowIdx}`);
  shipToHeaderCell.value = "SHIP TO";
  shipToHeaderCell.fill = headerFill;
  shipToHeaderCell.font = headerFont;
  worksheet.mergeCells(`C${vendorRowIdx}:E${vendorRowIdx}`);

  // Content
  const contentRowIdx = 9;
  worksheet.mergeCells(`A${contentRowIdx}:B${contentRowIdx + 4}`);
  const vendorCell = worksheet.getCell(`A${contentRowIdx}`);

  // Construct Vendor/Bill To Info
  const partyName = type === 'PURCHASE ORDER' ? order.supplier : order.customer;
  const partyContact = type === 'PURCHASE ORDER' ? order.supplierContact : order.customerContact;
  const partyAddress = type === 'PURCHASE ORDER' ? order.supplierAddress : order.customerAddress;
  const partyPhone = type === 'PURCHASE ORDER' ? order.supplierPhone : order.customerPhone;

  vendorCell.value = `[${partyName || 'Company Name'}]\n[${partyContact || 'Contact Person'}]\n[${partyAddress || 'Street Address'}]\nPhone: ${partyPhone || '(000) 000-0000'}`;
  vendorCell.alignment = { wrapText: true, vertical: 'top' };

  // Construct Ship To Info (Warehouse or Customer Address)
  worksheet.mergeCells(`C${contentRowIdx}:E${contentRowIdx + 4}`);
  const shipToCell = worksheet.getCell(`C${contentRowIdx}`);

  // Use Warehouse for Ship To if PO, or Customer Address if Sales
  const shipName = type === 'PURCHASE ORDER' ? `Warehouse: ${order.warehouse}` : (partyName || 'Customer');
  const shipAddress = type === 'PURCHASE ORDER' ? 'Warehouse Address...' : (partyAddress || 'Address...');

  shipToCell.value = `[${shipName}]\n[${shipAddress}]\n[Phone]`;
  shipToCell.alignment = { wrapText: true, vertical: 'top' };

  // Spacing
  worksheet.addRow([]);


  // --- ITEMS TABLE HEADER ---
  const tableHeaderRow = worksheet.addRow(['ITEM #', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']);
  tableHeaderRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center' };
  });

  // --- ITEMS DATA ---
  let totalAmount = 0;

  // Safely handle lineItems if it's undefined or stringified
  const items = Array.isArray(order.lineItems) ? order.lineItems : [];

  // Fill at least 15 rows to look like the template
  const minRows = 15;
  const rowCount = Math.max(items.length, minRows);

  for (let i = 0; i < rowCount; i++) {
    const item = items[i];
    const itemCode = item ? `[${item.itemId}]` : '';
    const desc = item ? (item.item || `Item ${item.itemId}`) : '';
    const qty = item ? Number(item.quantity) : '';
    const rate = item ? Number(item.rate) : '';
    const total = item ? Number(item.amount) : '';

    if (item) totalAmount += Number(item.amount);

    const row = worksheet.addRow([itemCode, desc, qty, rate, total]);

    // Styling
    row.getCell(1).border = { left: { style: 'thin' }, right: { style: 'thin' } }; // Item #
    row.getCell(2).border = { right: { style: 'thin' } }; // Desc
    row.getCell(3).border = { right: { style: 'thin' } }; // Qty
    row.getCell(4).border = { right: { style: 'thin' } }; // Rate
    row.getCell(5).border = { right: { style: 'thin' } }; // Total

    // Alignment
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(5).alignment = { horizontal: 'right' };
  }

  // Bottom border for the last item row
  const lastItemRow = worksheet.lastRow;
  if (lastItemRow) {
    lastItemRow.getCell(1).border = { left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } };
    [2, 3, 4, 5].forEach(c => {
      lastItemRow.getCell(c).border = { right: { style: 'thin' }, bottom: { style: 'thin' } };
    });
  }

  // --- TOTALS SECTION ---
  const subTotal = totalAmount; // Rename for clarity
  const subtotalRow = worksheet.addRow(['', '', '', 'SUBTOTAL', subTotal]);
  subtotalRow.getCell(4).font = { bold: true };
  subtotalRow.getCell(5).numFmt = '0.00';
  subtotalRow.getCell(5).border = borderStyle;

  // Add individual GST rows if they exist
  if (Number(order.cgstAmount) > 0) {
    const cgstRow = worksheet.addRow(['', '', '', 'CGST', Number(order.cgstAmount)]);
    cgstRow.getCell(4).font = { bold: true };
    cgstRow.getCell(5).border = borderStyle;
    cgstRow.getCell(5).alignment = { horizontal: 'right' };
    cgstRow.getCell(5).numFmt = '0.00';
  }
  if (Number(order.sgstAmount) > 0) {
    const sgstRow = worksheet.addRow(['', '', '', 'SGST', Number(order.sgstAmount)]);
    sgstRow.getCell(4).font = { bold: true };
    sgstRow.getCell(5).border = borderStyle;
    sgstRow.getCell(5).alignment = { horizontal: 'right' };
    sgstRow.getCell(5).numFmt = '0.00';
  }
  if (Number(order.igstAmount) > 0) {
    const igstRow = worksheet.addRow(['', '', '', 'IGST', Number(order.igstAmount)]);
    igstRow.getCell(4).font = { bold: true };
    igstRow.getCell(5).border = borderStyle;
    igstRow.getCell(5).alignment = { horizontal: 'right' };
    igstRow.getCell(5).numFmt = '0.00';
  }

  const grandTotal = Number(order.totalAmount) || (subTotal + Number(order.cgstAmount || 0) + Number(order.sgstAmount || 0) + Number(order.igstAmount || 0));

  const totalRow = worksheet.addRow(['', '', '', 'TOTAL', grandTotal]);
  totalRow.getCell(4).font = { bold: true };
  totalRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } }; // Orange/Yellowish

  const totalValCell = totalRow.getCell(5);
  totalValCell.font = { bold: true };
  totalValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } };
  totalValCell.numFmt = '"₹"#,##0.00';
  totalValCell.border = borderStyle;


  // --- COMMENTS SECTION ---
  // Add Comments section on the left
  const commentStartRow = subtotalRow.number;
  const commentLabelCell = worksheet.getCell(`A${commentStartRow}`);
  commentLabelCell.value = "Comments or Special Instructions";
  commentLabelCell.fill = headerFill;
  commentLabelCell.font = headerFont;
  worksheet.mergeCells(`A${commentStartRow}:B${commentStartRow}`);

  // Empty box for comments
  // worksheet.mergeCells(`A${commentStartRow+1}:B${commentStartRow+4}`);


  // --- FOOTER ---
  worksheet.addRow([]);
  worksheet.addRow([]);


  // Generate Blob
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = `${type.replace(' ', '_')}_${order.id || 'Draft'}`;
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function formatPurchasesForExport(purchases: any[], suppliers: any[]) {
  return purchases.map(p => {
    const supplier = suppliers.find(s => s.id === p.supplierId);
    return {
      id: p.id, // Ensure ID is passed for detailed export matching
      date: p.purchaseDate || '',
      supplier: p.supplier || '',
      supplierId: p.supplierId,
      supplierContact: supplier?.personName || '',
      supplierPhone: supplier?.contactInfo || '',
      supplierAddress: supplier?.address || '',
      warehouse: p.warehouse || '',
      itemCount: p.lineItems?.length || 0,
      total: p.totalAmount || 0,
      paid: p.payingAmount || 0,
      pending: (Number(p.totalAmount || 0) - Number(p.payingAmount || 0)).toFixed(2),
      lineItems: p.lineItems // Pass lineItems through
    };
  });
}

export function formatIssuesForExport(issues: any[], getItemName: (id: number) => string, getWarehouseName: (id: number) => string) {
  return issues.map(i => ({
    date: i.transferDate || '',
    item: getItemName(i.itemId),
    fromWarehouse: getWarehouseName(i.fromWarehouseId),
    toWarehouse: i.toWarehouseId ? getWarehouseName(i.toWarehouseId) : "Consumed/Issued",
    quantity: i.quantity || 0,
    remarks: i.remarks || ''
  }));
}

export function formatPaymentsForExport(payments: any[], getSupplierName: (id: number) => string, getOwnerName: (id: number) => string) {
  return payments.map(p => ({
    date: p.paymentDate || '',
    supplier: getSupplierName(p.supplierId),
    owner: getOwnerName(p.ownerId),
    method: p.paymentMethod || '',
    amount: p.amount || 0,
    reference: p.referenceNumber || ''
  }));
}

export function formatStockForExport(stock: any[]) {
  return stock.map(s => ({
    item: s.itemName || '',
    category: s.categoryName || '',
    warehouse: s.warehouseName || '',
    quantity: s.quantity || 0,
    unit: s.unitName || ''
  }));
}

export const purchaseColumns = [
  { header: 'Date', key: 'date', width: 15 },
  { header: 'Supplier', key: 'supplier', width: 25 },
  { header: 'Contact Person', key: 'supplierContact', width: 20 },
  { header: 'Phone', key: 'supplierPhone', width: 15 },
  { header: 'Address', key: 'supplierAddress', width: 30 },
  { header: 'Warehouse', key: 'warehouse', width: 20 },
  { header: 'Items', key: 'itemCount', width: 10 },
  { header: 'Total', key: 'total', width: 15 },
  { header: 'Paid', key: 'paid', width: 15 },
  { header: 'Pending', key: 'pending', width: 15 }
];

export const issueColumns = [
  { header: 'Date', key: 'date', width: 15 },
  { header: 'Item', key: 'item', width: 25 },
  { header: 'From Warehouse', key: 'fromWarehouse', width: 20 },
  { header: 'To Warehouse', key: 'toWarehouse', width: 20 },
  { header: 'Quantity', key: 'quantity', width: 12 },
  { header: 'Remarks', key: 'remarks', width: 30 }
];

export const paymentColumns = [
  { header: 'Date', key: 'date', width: 15 },
  { header: 'Supplier', key: 'supplier', width: 25 },
  { header: 'Paid By', key: 'owner', width: 20 },
  { header: 'Method', key: 'method', width: 12 },
  { header: 'Amount', key: 'amount', width: 15 },
  { header: 'Reference', key: 'reference', width: 20 }
];

export function formatSalesForExport(sales: any[], customers: any[]) {
  return sales.map(s => {
    const customer = customers.find(c => c.id === s.customerId);
    return {
      id: s.id,
      date: s.saleDate || '',
      customer: s.customer || '',
      customerId: s.customerId,
      customerContact: customer?.contactPerson || '',
      customerPhone: customer?.contactInfo || '',
      customerAddress: customer?.address || '',
      warehouse: s.warehouse || '',
      itemCount: s.lineItems?.length || 0,
      total: s.totalAmount || 0,
      received: s.receivedAmount || 0,
      pending: (Number(s.totalAmount || 0) - Number(s.receivedAmount || 0)).toFixed(2),
      lineItems: s.lineItems // Pass lineItems
    };
  });
}

export const salesColumns = [
  { header: 'Date', key: 'date', width: 15 },
  { header: 'Customer', key: 'customer', width: 25 },
  { header: 'Contact Person', key: 'customerContact', width: 20 },
  { header: 'Phone', key: 'customerPhone', width: 15 },
  { header: 'Address', key: 'customerAddress', width: 30 },
  { header: 'Warehouse', key: 'warehouse', width: 20 },
  { header: 'Items', key: 'itemCount', width: 10 },
  { header: 'Total', key: 'total', width: 15 },
  { header: 'Received', key: 'received', width: 15 },
  { header: 'Pending', key: 'pending', width: 15 }
];

export const stockColumns = [
  { header: 'Item', key: 'item', width: 25 },
  { header: 'Category', key: 'category', width: 20 },
  { header: 'Warehouse', key: 'warehouse', width: 20 },
  { header: 'Quantity', key: 'quantity', width: 12 },
  { header: 'Unit', key: 'unit', width: 10 }
];

// --- BULK EXPORT FOR IMPORT ---

export async function exportPurchasesBulk(purchases: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Purchases');

  worksheet.columns = [
    { header: 'ID', key: 'ID', width: 10 },
    { header: 'DATE', key: 'DATE', width: 15 },
    { header: 'SUPPLIER', key: 'SUPPLIER', width: 25 },
    { header: 'WAREHOUSE', key: 'WAREHOUSE', width: 20 },
    { header: 'ITEM', key: 'ITEM', width: 25 },
    { header: 'QUANTITY', key: 'QUANTITY', width: 12 },
    { header: 'RATE', key: 'RATE', width: 12 },
    { header: 'PAID_AMOUNT', key: 'PAID_AMOUNT', width: 15 },
    { header: 'DUE_DATE', key: 'DUE_DATE', width: 15 },
  ];

  purchases.forEach(p => {
    p.lineItems.forEach((li: any) => {
      worksheet.addRow({
        ID: p.id,
        DATE: p.purchaseDate || p.date,
        SUPPLIER: p.supplier,
        WAREHOUSE: p.warehouse,
        ITEM: li.item || '',
        QUANTITY: li.quantity,
        RATE: li.rate,
        PAID_AMOUNT: p.payingAmount || p.paid,
        DUE_DATE: p.dueDate || '',
      });
    });
  });

  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Purchases_Bulk_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function exportSalesBulk(sales: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales');

  worksheet.columns = [
    { header: 'ID', key: 'ID', width: 10 },
    { header: 'DATE', key: 'DATE', width: 15 },
    { header: 'CUSTOMER', key: 'CUSTOMER', width: 25 },
    { header: 'WAREHOUSE', key: 'WAREHOUSE', width: 20 },
    { header: 'ITEM', key: 'ITEM', width: 25 },
    { header: 'QUANTITY', key: 'QUANTITY', width: 12 },
    { header: 'RATE', key: 'RATE', width: 12 },
    { header: 'RECEIVED_AMOUNT', key: 'RECEIVED_AMOUNT', width: 15 },
    { header: 'DUE_DATE', key: 'DUE_DATE', width: 15 },
    { header: 'GST_RATE', key: 'GST_RATE', width: 10 },
    { header: 'EWAY_BILL_NO', key: 'EWAY_BILL_NO', width: 20 },
  ];

  sales.forEach(s => {
    s.lineItems.forEach((li: any) => {
      worksheet.addRow({
        ID: s.id,
        DATE: s.saleDate || s.date,
        CUSTOMER: s.customer,
        WAREHOUSE: s.warehouse,
        ITEM: li.item || '',
        QUANTITY: li.quantity,
        RATE: li.rate,
        RECEIVED_AMOUNT: s.receivedAmount || s.received,
        DUE_DATE: s.dueDate || '',
        GST_RATE: li.gstRate || 0,
        EWAY_BILL_NO: s.ewayBillNumber || '',
      });
    });
  });

  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sales_Bulk_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

