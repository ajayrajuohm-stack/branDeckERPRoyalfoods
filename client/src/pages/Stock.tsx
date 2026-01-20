import { useState } from "react";
import { useStockReport, useWarehouses, useCategories, useDashboardStats, useRebuildInventory } from "@/hooks/use-erp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Warehouse, Search, AlertTriangle, CheckCircle, Download, X, RefreshCw } from "lucide-react";
import { exportToExcel, formatStockForExport, stockColumns } from "@/lib/excel-export";

export default function Stock() {
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("all"); // all, low, out

  const { data: stock, isLoading } = useStockReport(warehouseFilter === "all" ? undefined : warehouseFilter);
  const { data: warehouses } = useWarehouses().list;
  const { data: categories } = useCategories().list;
  const { data: dashboardStats } = useDashboardStats();
  const rebuildInventory = useRebuildInventory();

  const handleRebuild = () => {
    if (confirm("This will recalculate your entire inventory ledger from all active transactions. Use this to fix stock discrepancies. Proceed?")) {
      rebuildInventory.mutate();
    }
  };

  const filteredStock = stock?.filter((item: any) => {
    const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.warehouseName.toLowerCase().includes(search.toLowerCase());

    // Apply stock status filter
    const qty = Number(item.quantity);
    const reorder = Number(item.reorderLevel) || 0;
    const isLow = qty > 0 && qty < reorder;
    const isOut = qty <= 0;

    let matchesStatus = true;
    if (stockStatusFilter === "low") {
      matchesStatus = isLow;
    } else if (stockStatusFilter === "out") {
      matchesStatus = isOut;
    }

    return matchesSearch && matchesStatus;
  });

  const totalItems = dashboardStats?.totalItems || 0;
  const lowStockItems = dashboardStats?.lowStock || 0;
  const outOfStockItems = dashboardStats?.outOfStock || 0;

  const handleCardClick = (filter: string) => {
    if (stockStatusFilter === filter) {
      setStockStatusFilter("all");
    } else {
      setStockStatusFilter(filter);
    }
  };

  const handleExportStock = async () => {
    if (!filteredStock?.length) return;
    const data = filteredStock.map((s: any) => {
      const rawQty = Number(s.quantity);
      const qty = Math.abs(rawQty) < 0.005 ? 0 : rawQty;
      return {
        item: s.itemName || '',
        category: s.categoryName || '-',
        warehouse: s.warehouseName || '',
        quantity: Number(qty.toFixed(2)),
        unit: s.unitName || '-',
        reorder: Number(Number(s.reorderLevel || 0).toFixed(2))
      };
    });

    await exportToExcel(data, [
      { header: 'Item', key: 'item', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Warehouse', key: 'warehouse', width: 20 },
      { header: 'Current Stock', key: 'quantity', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Reorder Level', key: 'reorder', width: 15 }
    ], 'stock_report');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-display">Stock Inventory</h1>
        <p className="text-muted-foreground">View current stock levels across all warehouses.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all ${stockStatusFilter === "all"
            ? "ring-2 ring-primary shadow-lg"
            : "hover:shadow-md"
            }`}
          onClick={() => handleCardClick("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Items</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-items">{totalItems}</div>
            {stockStatusFilter === "all" && (
              <p className="text-xs text-muted-foreground mt-1">Showing all items</p>
            )}
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${stockStatusFilter === "low"
            ? "ring-2 ring-amber-500 shadow-lg"
            : lowStockItems > 0
              ? "hover:shadow-md"
              : "opacity-50"
            }`}
          onClick={() => lowStockItems > 0 && handleCardClick("low")}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500" data-testid="text-low-stock">{lowStockItems}</div>
            {stockStatusFilter === "low" && (
              <p className="text-xs text-amber-600 mt-1">Below reorder level</p>
            )}
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${stockStatusFilter === "out"
            ? "ring-2 ring-destructive shadow-lg"
            : outOfStockItems > 0
              ? "hover:shadow-md"
              : "opacity-50"
            }`}
          onClick={() => outOfStockItems > 0 && handleCardClick("out")}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-out-of-stock">{outOfStockItems}</div>
            {stockStatusFilter === "out" && (
              <p className="text-xs text-destructive mt-1">Zero or negative stock</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="w-5 h-5" />
                Current Stock Levels
              </CardTitle>
              {stockStatusFilter !== "all" && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {stockStatusFilter === "low" ? "Low Stock" : "Out of Stock"} items
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setStockStatusFilter("all")}
                  >
                    <X className="w-3 h-3 mr-1" /> Clear filter
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                  data-testid="input-search-stock"
                />
              </div>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-warehouse-filter">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses?.map((w: any) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleRebuild}
                disabled={rebuildInventory.isPending}
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${rebuildInventory.isPending ? 'animate-spin' : ''}`} />
                Sync Inventory
              </Button>
              <Button variant="outline" onClick={handleExportStock} disabled={!filteredStock?.length} data-testid="button-export-stock">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading stock data...</div>
          ) : filteredStock?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No stock records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Item</th>
                    <th className="p-3 text-left text-sm font-medium">Warehouse</th>
                    <th className="p-3 text-right text-sm font-medium">Current Stock</th>
                    <th className="p-3 text-right text-sm font-medium">Reorder Level</th>
                    <th className="p-3 text-center text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock?.map((item: any, idx: number) => {
                    const rawQty = Number(item.quantity);
                    // Snap to 0 if very close to 0 to avoid -0.00
                    const qty = Math.abs(rawQty) < 0.005 ? 0 : rawQty;
                    const reorder = Number(item.reorderLevel) || 0;
                    const isLow = qty > 0 && qty < reorder;
                    const isOut = qty <= 0;

                    return (
                      <tr
                        key={idx}
                        className="border-b hover-elevate transition-colors"
                        data-testid={`row-stock-${idx}`}
                      >
                        <td className="p-3 font-medium">{item.itemName}</td>
                        <td className="p-3 text-muted-foreground">{item.warehouseName}</td>
                        <td className="p-3 text-right">
                          <span className={`font-mono font-bold text-lg ${isOut ? 'text-destructive' : isLow ? 'text-amber-500' : ''}`}>
                            {qty.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground ml-1">{item.unitName}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm text-muted-foreground">
                            {reorder.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {isOut ? (
                            <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Low Stock</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              In Stock
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
