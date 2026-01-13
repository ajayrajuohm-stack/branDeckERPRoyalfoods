
/**
 * Utility to generate E-Way Bill JSON for the GST Portal
 */

export function generateEwayBillJson(sale: any, companyInfo: any, customerInfo: any) {
    const itemList = sale.lineItems.map((item: any) => {
        // Determine rates based on whether it's interstate
        const isInterstate = Number(sale.igstAmount) > 0;
        const gstRate = Number(item.gstRate || 0);

        return {
            productName: item.item,
            productDesc: item.item,
            hsnCode: Number(item.hsnCode) || 0,
            quantity: Number(item.quantity),
            qtyUnit: "PCS", // Defaulting to PCS, should ideally come from UOM
            taxableAmount: Number(item.amount),
            cgstRate: isInterstate ? 0 : gstRate / 2,
            sgstRate: isInterstate ? 0 : gstRate / 2,
            igstRate: isInterstate ? gstRate : 0,
            cessRate: 0,
        };
    });

    const ewayBill = {
        supplyType: "O",
        subSupplyType: "1",
        docType: "INV",
        docNo: `SALE-${sale.id}`,
        docDate: formatDate(sale.saleDate),
        fromGstin: companyInfo.gstNumber || "",
        fromTrdName: companyInfo.companyName || "",
        fromAddr1: companyInfo.address || "",
        fromPlace: companyInfo.address?.split(',')[0] || "",
        fromPincode: extractPincode(companyInfo.address),
        fromStateCode: 0, // Should be derived from GSTIN
        actualFromStateCode: 0,
        toGstin: customerInfo.gstNumber || "URP",
        toTrdName: customerInfo.name || "",
        toAddr1: customerInfo.address || "",
        toPlace: customerInfo.address?.split(',')[0] || "",
        toPincode: extractPincode(customerInfo.address),
        toStateCode: 0,
        actualToStateCode: 0,
        transactionType: 1,
        dispatchFromPincode: extractPincode(companyInfo.address),
        shipToPincode: extractPincode(customerInfo.address),
        totalValue: Number(sale.totalAmount),
        cgstValue: Number(sale.cgstAmount || 0),
        sgstValue: Number(sale.sgstAmount || 0),
        igstValue: Number(sale.igstAmount || 0),
        cessValue: 0,
        totInvValue: Number(sale.totalAmount) + Number(sale.cgstAmount || 0) + Number(sale.sgstAmount || 0) + Number(sale.igstAmount || 0),
        transId: sale.transporterId || "",
        transName: sale.transporterName || "",
        transDocNo: "",
        transDocDate: "",
        transMode: "1",
        distance: Number(sale.distance || 0),
        vehicleNo: sale.vehicleNumber || "",
        vehicleType: "R",
        itemList: itemList
    };

    return ewayBill;
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function extractPincode(address: string) {
    if (!address) return 0;
    const match = address.match(/\b\d{6}\b/);
    return match ? parseInt(match[0]) : 0;
}

export function downloadJson(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
