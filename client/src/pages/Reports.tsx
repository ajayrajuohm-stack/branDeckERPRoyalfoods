import { useState } from "react";
import {
  useCustomerSalesReport,
  useStockReport,
  useSupplierPaymentReport,
  useDetailedDashboard,
  useWarehouses
} from "@/hooks/use-erp";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const currentMonthIdx = new Date().getMonth() + 1;
  const currentYearVal = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<string>(String(currentYearVal));
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");

  const { list: warehousesList } = useWarehouses();

  // Determine query params
  const queryYear = parseInt(selectedYear);
  const queryMonth = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
  const queryWarehouse = selectedWarehouse === "all" ? undefined : selectedWarehouse;

  const { data: salesReport } = useCustomerSalesReport(queryMonth, queryYear, queryWarehouse);
  const { data: stockReport } = useStockReport(queryWarehouse);
  const { data: supplierReport } = useSupplierPaymentReport(queryMonth, queryYear, queryWarehouse);
  const { data: todayStats } = useDetailedDashboard(format(new Date(), "yyyy-MM-dd"), queryWarehouse);

  // Fetch Sales Trend (Current Year)
  const { data: salesTrend } = useQuery({
    queryKey: ["/api/reports/sales-trend", queryYear, queryWarehouse],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("year", String(queryYear));
      if (queryWarehouse) params.append("warehouseId", queryWarehouse);
      const res = await fetch(`/api/reports/sales-trend?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Sales Trend (Previous Year) for YoY Comparison
  const { data: salesTrendPrev } = useQuery({
    queryKey: ["/api/reports/sales-trend", queryYear - 1, queryWarehouse],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("year", String(queryYear - 1));
      if (queryWarehouse) params.append("warehouseId", queryWarehouse);
      const res = await fetch(`/api/reports/sales-trend?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Calculate Average Denominator
  let avgDenominator = 1;
  if (selectedMonth !== "all") {
    avgDenominator = 1;
  } else {
    // If entire year selected
    if (queryYear === currentYearVal) {
      avgDenominator = currentMonthIdx; // divide by months elapsed so far
    } else {
      avgDenominator = 12; // divide by 12 for past years
    }
  }

  // Value Calculations
  const totalSales = salesReport?.reduce((acc: any, curr: any) => acc + Number(curr.totalSales), 0) || 0;
  const avgSales = totalSales / avgDenominator;

  const totalReceivables = salesReport?.reduce((acc: any, curr: any) => acc + Number(curr.totalRemaining), 0) || 0;

  const totalStockValue = stockReport?.reduce((acc: any, curr: any) => acc + (Number(curr.value) || 0), 0) || 0;

  const totalPayables = supplierReport?.reduce((acc: any, curr: any) => acc + Number(curr.totalDue), 0) || 0;

  // Calculate Sales Trend %
  let trendIndicator = "Stable";
  let trendValue = 0;
  let trendColor = "blue";
  let TrendIcon = TrendingUp;

  if (selectedMonth !== "all") {
    // Month-over-Month (MoM)
    if (salesTrend) {
      const currentMonthNum = parseInt(selectedMonth);
      const currentTotal = salesTrend.find((t: any) => t.month === currentMonthNum)?.total || 0;

      const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
      // For Jan, compare with Dec of prev year if available, else 0
      let prevTotal = 0;
      if (currentMonthNum === 1 && salesTrendPrev) {
        prevTotal = salesTrendPrev.find((t: any) => t.month === 12)?.total || 0;
      } else {
        prevTotal = salesTrend.find((t: any) => t.month === prevMonthNum)?.total || 0;
      }

      if (prevTotal > 0) {
        trendValue = ((currentTotal - prevTotal) / prevTotal) * 100;
        trendIndicator = `${trendValue > 0 ? '+' : ''}${trendValue.toFixed(1)}%`;
      } else if (currentTotal > 0) {
        trendIndicator = "+100%"; // First sale
        trendValue = 100;
      } else {
        trendIndicator = "0%";
      }
    }
  } else {
    // Year-over-Year (YoY)
    if (salesTrend && salesTrendPrev) {
      const currentYearTotal = salesTrend.reduce((acc: number, curr: any) => acc + curr.total, 0);
      const prevYearTotal = salesTrendPrev.reduce((acc: number, curr: any) => acc + curr.total, 0);

      if (prevYearTotal > 0) {
        trendValue = ((currentYearTotal - prevYearTotal) / prevYearTotal) * 100;
        trendIndicator = `${trendValue > 0 ? '+' : ''}${trendValue.toFixed(1)}% YoY`;
      } else if (currentYearTotal > 0) {
        trendIndicator = "+100% YoY";
        trendValue = 100;
      } else {
        trendIndicator = "Stable";
      }
    } else {
      trendIndicator = "Loading...";
    }
  }

  // Set Color and Icon based on Value or Indicator content
  if (trendIndicator.includes("%")) {
    if (trendValue < 0) {
      trendColor = "red";
      TrendIcon = TrendingDown;
    } else if (trendValue > 0) {
      trendColor = "emerald";
      TrendIcon = TrendingUp;
    } else {
      // Stable/Zero
      trendColor = "blue";
      TrendIcon = TrendingUp;
    }
  } else {
    trendColor = "blue";
    TrendIcon = TrendingUp;
  }

  // Process Sales Data for Chart
  const salesChartData = salesReport?.slice(0, 10).map((r: any) => ({
    name: r.customerName.length > 12 ? r.customerName.substring(0, 10) + '...' : r.customerName,
    sales: Number(r.totalSales),
    received: Number(r.totalReceived)
  })) || [];

  // Process Stock Data for Chart
  const stockChartData = stockReport?.slice(0, 8).map((s: any) => ({
    name: s.itemName.length > 12 ? s.itemName.substring(0, 10) + '...' : s.itemName,
    quantity: s.quantity,
    value: s.value
  })) || [];

  // Process Supplier Data for Chart
  const supplierChartData = supplierReport?.slice(0, 10).map((s: any) => ({
    name: s.supplierName.length > 12 ? s.supplierName.substring(0, 10) + '...' : s.supplierName,
    purchases: Number(s.totalPurchases),
    balance: Number(s.totalDue)
  })) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Analytical Reports</h1>
          <p className="text-muted-foreground mt-1">Detailed business intelligence and performance metrics.</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center bg-muted/30 p-2 rounded-lg border">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {format(new Date(2024, i, 1), "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] bg-background">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {Array.from({ length: 30 }, (_, i) => {
                const year = new Date().getFullYear() - i + 10; // Start from 10 years in future
                return (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {((warehousesList?.data as any) || [])?.map((w: any) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="bg-primary/10 p-2 rounded-md">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Avg Sales Monthly"
          value={`₹ ${avgSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={TrendIcon}
          trend={trendIndicator}
          color={trendColor}
        />
        <MetricCard
          title="Total Receivables"
          value={`₹ ${totalReceivables.toLocaleString()}`}
          icon={Users}
          trend="Attention"
          color="emerald"
        />

        <MetricCard
          title="Pending Payables"
          value={`₹ ${totalPayables.toLocaleString()}`}
          icon={ShoppingCart}
          trend="Due"
          color="purple"
        />
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Status</TabsTrigger>
          <TabsTrigger value="financial">Financial Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm border-none bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="text-lg">Customer Sales Performance</CardTitle>
                <CardDescription>Top 10 customers by total sales volume (Current Year)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={70}
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `₹${value / 1000}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [`₹ ${Number(value).toLocaleString()}`, 'Sales']}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} name="Total Sales" />
                    <Bar dataKey="received" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} name="Payment Received" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none">
              <CardHeader>
                <CardTitle className="text-lg">Sales Breakdown</CardTitle>
                <CardDescription>Receivables vs Collection</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Collected', value: salesReport?.reduce((acc: any, curr: any) => acc + Number(curr.totalReceived), 0) || 0 },
                        { name: 'Pending', value: salesReport?.reduce((acc: any, curr: any) => acc + Number(curr.totalRemaining), 0) || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center mt-4 space-y-1">
                  <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Total Sales</p>
                  <p className="text-2xl font-black font-display">
                    ₹ {(salesReport?.reduce((acc: any, curr: any) => acc + Number(curr.totalSales), 0) || 0).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-none bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="text-lg">Current Stock Levels</CardTitle>
                <CardDescription>Inventory quantity for active items</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockChartData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={100} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="quantity" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none">
              <CardHeader>
                <CardTitle className="text-lg">Stock Summary</CardTitle>
                <CardDescription>Warehouse-wise categorization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 mt-4">
                  {stockReport?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full bg-gradient-to-b from-blue-400 to-blue-600`} />
                        <div>
                          <p className="font-semibold text-sm">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">{item.warehouseName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-lg">{item.quantity} {item.unitName}</p>
                        <p className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${item.quantity < item.reorderLevel ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {item.quantity < item.reorderLevel ? 'Low Stock' : 'Optimized'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card className="shadow-sm border-none bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
              <CardTitle className="text-lg">Supplier Liability Management</CardTitle>
              <CardDescription>Outstanding balances and total purchases per supplier</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={70}
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `₹${value / 1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} formatter={(value) => `₹ ${Number(value).toLocaleString()}`} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="purchases" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} name="Total Purchases" />
                  <Bar dataKey="balance" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} name="Outstanding Balance" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/50",
    red: "bg-red-50 text-red-600 dark:bg-red-950/40 border-red-100 dark:border-red-900/50",
  };

  return (
    <Card className="border-none shadow-sm hover:translate-y-[-2px] transition-transform duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-xl scale-110 ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${colorMap[color]}`}>
            {trend}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">{title}</p>
          <p className="text-2xl font-black font-display tracking-tight mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
