import { useState } from "react";
import { useDetailedDashboard, useWarehouses } from "@/hooks/use-erp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Calendar as CalendarIcon,
  Download,
  TrendingUp,
  Box,
  User,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExcelJS from 'exceljs';
import { useToast } from "@/hooks/use-toast";

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  colorClass = "text-primary",
  bgColorClass = "bg-primary/10"
}: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  colorClass?: string;
  bgColorClass?: string;
}) {
  return (
    <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColorClass}`}>
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-display">{value ?? "0"}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");

  const { data: warehouseList } = useWarehouses().list;

  const { data: stats, isLoading: statsLoading } = useDetailedDashboard(
    selectedDate,
    selectedWarehouseId === "all" ? undefined : selectedWarehouseId
  );

  const handleExportExcel = async () => {
    if (!stats) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Business Report');

      // Set page setup for printing
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.5, right: 0.5, top: 0.75, bottom: 0.75,
          header: 0.3, footer: 0.3
        }
      };

      // Company Header
      worksheet.mergeCells('A1:E1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'BUSINESS ACTIVITY REPORT';
      titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF1F4788' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7F3FF' }
      };
      worksheet.getRow(1).height = 30;

      // Date
      worksheet.mergeCells('A2:E2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Report Date: ${format(new Date(selectedDate), "dd MMMM yyyy")}`;
      dateCell.font = { name: 'Calibri', size: 12, bold: true };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 20;

      worksheet.addRow([]);

      // ===== DAY-END STOCK SUMMARY =====
      let currentRow = 4;
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const stockHeaderCell = worksheet.getCell(`A${currentRow}`);
      stockHeaderCell.value = 'DAY-END STOCK SUMMARY (Finished Goods Only)';
      stockHeaderCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      stockHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      stockHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      worksheet.getRow(currentRow).height = 25;
      currentRow++;

      // Table Headers
      const headerRow = worksheet.getRow(currentRow);
      headerRow.values = ['Description', '', 'Calculation', '', 'Available FGs'];
      headerRow.font = { name: 'Calibri', size: 11, bold: true };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };
      headerRow.height = 20;
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
      currentRow++;

      // Opening Stock
      const openingRow = worksheet.getRow(currentRow);
      openingRow.values = ['Opening Stock Balance', '', '—', '', stats.openingStock.toFixed(2)];
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
      openingRow.getCell(5).numFmt = '#,##0.00';
      openingRow.getCell(5).font = { bold: true };
      openingRow.height = 18;
      currentRow++;

      // Production
      const productionRow = worksheet.getRow(currentRow);
      const afterProduction = (stats.openingStock || 0) + (stats.summary?.production?.output || 0);
      productionRow.values = ['(+) Total Production Received', '', `+${(stats.summary?.production?.output || 0).toFixed(2)}`, '', afterProduction.toFixed(2)];
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
      productionRow.getCell(5).numFmt = '#,##0.00';
      productionRow.getCell(5).font = { bold: true };
      productionRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF4E5FF' }
      };
      productionRow.height = 18;
      currentRow++;

      // Sales
      const salesRow = worksheet.getRow(currentRow);
      const afterSales = afterProduction - (stats.summary?.sales?.quantity || 0);
      salesRow.values = ['(-) Total Sales Dispatched', '', `-${(stats.summary?.sales?.quantity || 0).toFixed(2)} Units`, '', afterSales.toFixed(2)];
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
      salesRow.getCell(5).numFmt = '#,##0.00';
      salesRow.getCell(5).font = { bold: true };
      salesRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2F0D9' }
      };
      salesRow.height = 18;
      currentRow++;

      // Final Closing
      const closingRow = worksheet.getRow(currentRow);
      closingRow.values = ['FINAL CLOSING STOCK', '', 'Net Movement', '', stats.closingStock.toFixed(2)];
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
      closingRow.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      closingRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      };
      closingRow.getCell(5).numFmt = '#,##0.00';
      closingRow.height = 22;
      currentRow++;

      // Add borders to stock summary table
      for (let i = 5; i <= currentRow - 1; i++) {
        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
          const cell = worksheet.getCell(`${col}${i}`);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }

      currentRow += 2;

      // ===== DAILY SALES DETAILS =====
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const salesHeaderCell = worksheet.getCell(`A${currentRow}`);
      salesHeaderCell.value = 'DAILY SALES DETAILS';
      salesHeaderCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      salesHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      salesHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      };
      worksheet.getRow(currentRow).height = 22;
      currentRow++;

      // Sales table headers
      const salesTableHeader = worksheet.getRow(currentRow);
      salesTableHeader.values = ['Customer', 'Items Sold', '', '', 'Amount (₹)'];
      salesTableHeader.font = { bold: true };
      salesTableHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2EFDA' }
      };
      worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
      salesTableHeader.height = 18;
      currentRow++;

      const salesStartRow = currentRow;
      if (stats.sales && stats.sales.length > 0) {
        stats.sales.forEach((s: any) => {
          const row = worksheet.getRow(currentRow);
          row.values = [s.customer, s.items, '', '', s.amount.toFixed(2)];
          worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
          row.getCell(5).numFmt = '#,##0.00';
          row.height = 16;
          currentRow++;
        });

        // Sales Total
        const salesTotalRow = worksheet.getRow(currentRow);
        salesTotalRow.values = ['TOTAL SALES', '', '', '', stats.summary?.sales?.amount?.toFixed(2) || '0.00'];
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        salesTotalRow.font = { bold: true };
        salesTotalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9E1F2' }
        };
        salesTotalRow.getCell(5).numFmt = '#,##0.00';
        salesTotalRow.height = 18;
        currentRow++;
      } else {
        const row = worksheet.getRow(currentRow);
        row.values = ['No sales recorded', '', '', '', ''];
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        row.alignment = { horizontal: 'center' };
        row.font = { italic: true, color: { argb: 'FF7F7F7F' } };
        currentRow++;
      }

      // Add borders to sales table
      for (let i = salesStartRow - 2; i < currentRow; i++) {
        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
          const cell = worksheet.getCell(`${col}${i}`);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }

      currentRow += 2;

      // ===== DAILY PRODUCTION DETAILS =====
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const prodHeaderCell = worksheet.getCell(`A${currentRow}`);
      prodHeaderCell.value = 'DAILY PRODUCTION DETAILS';
      prodHeaderCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      prodHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      prodHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF9966FF' }
      };
      worksheet.getRow(currentRow).height = 22;
      currentRow++;

      // Production table headers
      const prodTableHeader = worksheet.getRow(currentRow);
      prodTableHeader.values = ['Finished Good Item', '', '', '', 'Quantity Produced'];
      prodTableHeader.font = { bold: true };
      prodTableHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF4E5FF' }
      };
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      prodTableHeader.height = 18;
      currentRow++;

      const prodStartRow = currentRow;
      if (stats.production && stats.production.length > 0) {
        stats.production.forEach((p: any) => {
          const row = worksheet.getRow(currentRow);
          row.values = [p.item, '', '', '', p.quantity.toFixed(2)];
          worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
          row.getCell(5).numFmt = '#,##0.00';
          row.height = 16;
          currentRow++;
        });

        // Production Total
        const prodTotalRow = worksheet.getRow(currentRow);
        prodTotalRow.values = ['TOTAL PRODUCTION OUTPUT', '', '', '', stats.summary?.production?.output?.toFixed(2) || '0.00'];
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        prodTotalRow.font = { bold: true };
        prodTotalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9E1F2' }
        };
        prodTotalRow.getCell(5).numFmt = '#,##0.00';
        prodTotalRow.height = 18;
        currentRow++;
      } else {
        const row = worksheet.getRow(currentRow);
        row.values = ['No production recorded', '', '', '', ''];
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        row.alignment = { horizontal: 'center' };
        row.font = { italic: true, color: { argb: 'FF7F7F7F' } };
        currentRow++;
      }

      // Add borders to production table
      for (let i = prodStartRow - 2; i < currentRow; i++) {
        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
          const cell = worksheet.getCell(`${col}${i}`);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }

      // Set column widths
      worksheet.getColumn(1).width = 30;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 15;
      worksheet.getColumn(5).width = 18;

      // Set default alignment
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 2) {
          row.eachCell((cell, colNumber) => {
            if (!cell.alignment) {
              cell.alignment = {
                vertical: 'middle',
                horizontal: colNumber === 5 ? 'right' : 'left'
              };
            }
          });
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Business_Report_${selectedDate}.xlsx`;
      link.click();
      toast({ title: "Success", description: "Professional report exported successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: "Export Failed", description: "Could not generate Excel file", variant: "destructive" });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Business Overview</h1>
          <p className="text-muted-foreground">Daily activity and inventory tracking</p>
        </div>

        {/* Filters styled like Reports page */}
        <div className="flex gap-2 items-center bg-muted/30 p-2 rounded-lg border">
          <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {Array.isArray(warehouseList) && warehouseList.map((w: any) => (
                <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto bg-background"
          />

          <Button size="sm" onClick={handleExportExcel} disabled={statsLoading}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Today's Sales"
              value={`₹ ${(stats?.summary?.sales?.amount || 0).toLocaleString()}`}
              icon={DollarSign}
              subtitle={`${stats?.summary?.sales?.count || 0} Orders`}
              colorClass="text-emerald-600"
              bgColorClass="bg-emerald-50 dark:bg-emerald-950/30"
            />
            <StatCard
              title="Today's Production"
              value={(stats?.summary?.production?.output || 0).toLocaleString()}
              icon={Layers}
              subtitle={`${stats?.summary?.production?.count || 0} Batches`}
              colorClass="text-purple-600"
              bgColorClass="bg-purple-50 dark:bg-purple-950/30"
            />
            <StatCard
              title="Total FG Stock"
              value={(stats?.totalFGStock || 0).toLocaleString()}
              icon={Box}
              subtitle="Current system-wide FG inventory"
              colorClass="text-blue-600"
              bgColorClass="bg-blue-50 dark:bg-blue-950/30"
            />
            <StatCard
              title="Closing Stock"
              value={(stats?.closingStock || 0).toLocaleString()}
              icon={Package}
              subtitle={`FG stock as of ${format(new Date(selectedDate), "dd MMM")}`}
              colorClass="text-amber-600"
              bgColorClass="bg-amber-50 dark:bg-amber-950/30"
            />
          </div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" />
              Daily Sales Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Items Sold</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats?.sales?.length > 0 ? stats.sales.map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="p-3 font-medium">{s.customer}</td>
                      <td className="p-3 text-muted-foreground italic truncate max-w-[200px]" title={s.items}>{s.items}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">₹{s.amount.toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No sales recorded for this date</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Production Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Daily Production Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 text-left">FG Item Name</th>
                    <th className="p-3 text-right">Quantity Produced</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats?.production?.length > 0 ? stats.production.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="p-3 font-medium">{p.item}</td>
                      <td className="p-3 text-right font-mono font-bold text-purple-600">{p.quantity.toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} className="p-8 text-center text-muted-foreground">No production recorded for this date</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day End Table Summary */}
      <Card className="border-none shadow-sm overflow-hidden border-t-4 border-primary">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-xl flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Day-End Stock Summary
          </CardTitle>
          <CardDescription>Consolidated inventory movement for {format(new Date(selectedDate), "dd MMM yyyy")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-muted/50 border-b">
                <tr className="text-sm font-bold opacity-70">
                  <th className="p-4 text-left">Description</th>
                  <th className="p-4 text-right">Calculation</th>
                  <th className="p-4 text-right">Available Fgs</th>
                </tr>
              </thead>
              <tbody className="divide-y relative">
                <tr className="hover:bg-muted/5">
                  <td className="p-4 font-medium">Opening Stock Balance</td>
                  <td className="p-4 text-right text-muted-foreground">—</td>
                  <td className="p-4 text-right font-mono font-bold">{(stats?.openingStock || 0).toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-muted/5 text-purple-600">
                  <td className="p-4 font-medium flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    (+) Total Production Received
                  </td>
                  <td className="p-4 text-right">{(stats?.summary?.production?.output || 0).toFixed(2)}</td>
                  <td className="p-4 text-right font-mono font-bold">
                    {((stats?.openingStock || 0) + (stats?.summary?.production?.output || 0)).toFixed(2)}
                  </td>
                </tr>
                <tr className="hover:bg-muted/5 text-emerald-600">
                  <td className="p-4 font-medium flex items-center gap-2">
                    <ShoppingCart className="w-3 h-3" />
                    (-) Total Sales Dispatched
                  </td>
                  <td className="p-4 text-right">
                    {(stats?.summary?.sales?.quantity || 0).toFixed(2)} Units
                  </td>
                  <td className="p-4 text-right font-mono font-bold">
                    {((stats?.openingStock || 0) + (stats?.summary?.production?.output || 0) - (stats?.summary?.sales?.quantity || 0)).toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-primary/10 font-bold text-lg">
                  <td className="p-4 text-primary">FINAL CLOSING STOCK</td>
                  <td className="p-4 text-right">Net Movement</td>
                  <td className="p-4 text-right text-primary font-black font-display">
                    {(stats?.closingStock || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
