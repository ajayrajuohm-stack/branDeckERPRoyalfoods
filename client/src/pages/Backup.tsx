import { useState } from "react";
import { useStockReport, useSupplierPaymentReport, useCustomerSalesReport, useProduction } from "@/hooks/use-erp";
import ExcelJS from 'exceljs';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function Backup() {
    // Filter state
    const currentDate = new Date();
    const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
    const [filterYear, setFilterYear] = useState<number | undefined>(undefined);

    const { data: stock } = useStockReport();
    const { data: supplierPayments } = useSupplierPaymentReport(filterMonth, filterYear);
    const { data: customerSales } = useCustomerSalesReport(filterMonth, filterYear);
    const { list: productionHook } = useProduction();
    const production = productionHook?.data || [];

    const handleExportMasterBackup = async () => {
        const workbook = new ExcelJS.Workbook();

        // Helper to add styled sheet
        const addStyledSheet = (name: string, headers: string[], data: any[]) => {
            const sheet = workbook.addWorksheet(name);

            // Add and style headers
            const headerRow = sheet.addRow(headers);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF3B82F6' } // Light Blue (Tailwind blue-500 approx)
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            // Add data
            data.forEach(item => {
                sheet.addRow(Object.values(item));
            });

            // Auto-fit columns (simple version)
            sheet.columns.forEach(column => {
                column.width = 20;
            });
        };

        // 1. Stock Status
        const stockData = stock?.map((item: any) => {
            const rawQty = Number(item.quantity);
            const qty = Math.abs(rawQty) < 0.005 ? 0 : rawQty;
            return {
                Item: item.itemName,
                Category: item.categoryName,
                Warehouse: item.warehouseName,
                Quantity: Number(qty.toFixed(2)),
                Unit: item.unitName,
                "Reorder Level": Number(Number(item.reorderLevel || 0).toFixed(2)),
                Status: qty <= 0 ? "Out of Stock" : (qty < Number(item.reorderLevel) ? "Low Stock" : "Normal")
            };
        }) || [];
        addStyledSheet("Stock Status", ["Item", "Category", "Warehouse", "Quantity", "Unit", "Reorder Level", "Status"], stockData);

        // 2. Supplier Payments
        const supplierData = supplierPayments?.map((item: any) => ({
            Supplier: item.supplierName,
            "Total Purchases": Number(item.totalPurchases).toFixed(2),
            Paid: Number(item.totalPaid).toFixed(2),
            Balance: Number(item.totalDue).toFixed(2),
        })) || [];
        addStyledSheet("Supplier Payments", ["Supplier", "Total Purchases", "Paid", "Balance"], supplierData);

        // 3. Customer Sales
        const customerData = customerSales?.map((item: any) => ({
            Customer: item.customerName,
            "Total Sales": Number(item.totalSales).toFixed(2),
            Received: Number(item.totalReceived).toFixed(2),
            Balance: Number(item.totalRemaining).toFixed(2),
        })) || [];
        addStyledSheet("Customer Sales", ["Customer", "Total Sales", "Received", "Balance"], customerData);

        // 4. Production Data (Filtered)
        const filteredProduction = production.filter((run: any) => {
            if (!filterMonth && !filterYear) return true;
            const date = new Date(run.productionDate);
            const matchesMonth = filterMonth ? (date.getMonth() + 1) === filterMonth : true;
            const matchesYear = filterYear ? date.getFullYear() === filterYear : true;
            return matchesMonth && matchesYear;
        });

        const productionData = filteredProduction.map((run: any) => ({
            Date: format(new Date(run.productionDate), "dd MMM yyyy"),
            "Finished Good": run.outputItemName,
            Quantity: run.outputQuantity,
            Warehouse: run.warehouseName,
            "Items Consumed": run.consumptions?.map((c: any) => `${c.itemName} (${c.actualQty})`).join(", ") || "None"
        }));
        addStyledSheet("Production History", ["Date", "Finished Good", "Quantity", "Warehouse", "Items Consumed"], productionData);

        // Generate filename and download
        const monthName = filterMonth ? format(new Date(2022, filterMonth - 1), "MMMM") : "All_Time";
        const yearName = filterYear || "";
        const filename = `ERP_Backup_${monthName}_${yearName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold font-display">Data Backup</h1>
                <p className="text-muted-foreground">Download comprehensive Excel reports for your business records.</p>
            </div>

            {/* Month/Year Filter */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium whitespace-nowrap">Filter by Month:</span>
                            <select
                                value={filterMonth || ""}
                                onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : undefined)}
                                className="border rounded px-4 py-2 text-sm bg-background w-40"
                            >
                                <option value="">All Time</option>
                                <option value="1">January</option>
                                <option value="2">February</option>
                                <option value="3">March</option>
                                <option value="4">April</option>
                                <option value="5">May</option>
                                <option value="6">June</option>
                                <option value="7">July</option>
                                <option value="8">August</option>
                                <option value="9">September</option>
                                <option value="10">October</option>
                                <option value="11">November</option>
                                <option value="12">December</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium whitespace-nowrap">Filter by Year:</span>
                            <select
                                value={filterYear || ""}
                                onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : undefined)}
                                className="border rounded px-4 py-2 text-sm bg-background w-40"
                            >
                                <option value="">Select Year</option>
                                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {(filterMonth || filterYear) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setFilterMonth(undefined); setFilterYear(undefined); }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Clear Filters
                            </Button>
                        )}

                        <div className="md:ml-auto">
                            <Button
                                onClick={handleExportMasterBackup}
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                                data-testid="button-master-backup"
                            >
                                <Download className="w-5 h-5 mr-3" />
                                Download Monthly Backup (Excel)
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-dashed">
                <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Download className="w-8 h-8 text-primary" />
                    </div>
                    <div className="max-w-md">
                        <h3 className="text-xl font-bold">Ready to Export</h3>
                        <p className="text-muted-foreground">
                            This backup includes complete data for:
                        </p>
                        <ul className="text-sm text-muted-foreground mt-4 grid grid-cols-2 gap-2">
                            <li className="flex items-center gap-2">✅ Stock Status</li>
                            <li className="flex items-center gap-2">✅ Supplier Payments</li>
                            <li className="flex items-center gap-2">✅ Customer Sales</li>
                            <li className="flex items-center gap-2">✅ Production History</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
