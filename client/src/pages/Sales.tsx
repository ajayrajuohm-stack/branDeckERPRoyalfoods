import { useState, useEffect } from "react";
import {
  useSales, useItems, useWarehouses, useCustomers, useCustomerSummary, useCustomerPayments, useOwners, useStockReport, useOverdueSales, useUpcomingSales, useAdminSettings
} from "@/hooks/use-erp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ChevronDown, ChevronRight, DollarSign, Building2, Search, X, Download, Upload, CreditCard, AlertTriangle, Package, Edit, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/DataTable";
import {
  exportToExcel,
  exportOrderToExcel,
  formatSalesForExport,
  salesColumns,
  exportSalesBulk
} from "@/lib/excel-export";
import { generateEwayBillJson, downloadJson } from "@/lib/eway-bill-utils";
import { EwayBillPrint } from "@/components/EwayBillPrint";
import { SalesPrint } from "@/components/SalesPrint";

interface LineItem {
  itemId: number;
  quantity: number;
  rate: number;
  amount: number;
  gstRate?: number;
  gstAmount?: number;
}

// Helper to normalize data from hooks
const normalizeList = (data: any) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

// --- Sale Form with Multiple Items ---
function SaleForm({ onSuccess, initialData }: { onSuccess: () => void; initialData?: any }) {
  const { create, update } = useSales();
  const itemsHook = useItems();
  const isEditing = !!initialData;

  const allItems = Array.isArray(itemsHook.list?.data)
    ? itemsHook.list.data
    : Array.isArray(itemsHook.list?.data?.data)
      ? itemsHook.list.data.data
      : [];

  // Filter to show only Finished Goods in sales
  const items = allItems.filter((item: any) =>
    item.categoryType === "FINISHED"
  );

  const customersHook = useCustomers();

  const customers = Array.isArray(customersHook.list?.data)
    ? customersHook.list.data
    : Array.isArray(customersHook.list?.data?.data)
      ? customersHook.list.data.data
      : [];

  const warehousesHook = useWarehouses();

  const warehouses = Array.isArray(warehousesHook.list?.data)
    ? warehousesHook.list.data
    : Array.isArray(warehousesHook.list?.data?.data)
      ? warehousesHook.list.data.data
      : [];

  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems?.map((li: any) => ({
      itemId: li.itemId,
      quantity: Number(li.quantity),
      rate: Number(li.rate),
      amount: Number(li.amount),
      gstRate: Number(li.gstRate || 0),
      gstAmount: Number(li.gstAmount || 0),
    })) || []
  );
  const [currentItem, setCurrentItem] = useState<{ itemId: string; quantity: string; rate: string }>({
    itemId: "",
    quantity: "",
    rate: ""
  });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    initialData?.warehouseId ? String(initialData.warehouseId) : ""
  );

  // Fetch stock report for the selected warehouse
  const { data: stockData } = useStockReport(selectedWarehouseId || undefined);

  const formSchema = z.object({
    saleDate: z.coerce.date(),
    customerId: z.coerce.number().min(1, "Select customer"),
    warehouseId: z.coerce.number().min(1, "Select warehouse"),
    receivedAmount: z.coerce.number().min(0).default(0),
    dueDate: z.coerce.date().optional(),
    ewayBillNumber: z.string().optional(),
    transporterId: z.string().optional(),
    transporterName: z.string().optional(),
    vehicleNumber: z.string().optional(),
    distance: z.coerce.number().optional(),
    gstType: z.enum(["CGST/SGST", "IGST"]).default("CGST/SGST"),
    enableGst: z.boolean().default(false),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      saleDate: new Date(initialData.saleDate),
      customerId: initialData.customerId,
      warehouseId: initialData.warehouseId,
      receivedAmount: Number(initialData.receivedAmount || 0),
      dueDate: initialData.dueDate ? new Date(initialData.dueDate) : undefined,
      ewayBillNumber: initialData.ewayBillNumber || "",
      transporterId: initialData.transporterId || "",
      transporterName: initialData.transporterName || "",
      vehicleNumber: initialData.vehicleNumber || "",
      distance: Number(initialData.distance || 0),
      gstType: Number(initialData.igstAmount) > 0 ? "IGST" : "CGST/SGST",
      enableGst: (Number(initialData.cgstAmount) + Number(initialData.sgstAmount) + Number(initialData.igstAmount)) > 0,
    } : {
      saleDate: new Date(),
      receivedAmount: 0,
      gstType: "CGST/SGST",
      enableGst: false,
      ewayBillNumber: "",
      transporterId: "",
      transporterName: "",
      vehicleNumber: "",
      distance: 0,
    }
  });

  // Get available stock for an item in the selected warehouse
  const getAvailableStock = (itemId: number): number => {
    if (!stockData || !selectedWarehouseId) return 0;
    const stockItem = stockData.find((s: any) => s.itemId === itemId && s.warehouseId === Number(selectedWarehouseId));
    return stockItem ? Number(stockItem.quantity || 0) : 0;
  };

  // Get already added quantity for an item
  const getAddedQuantity = (itemId: number): number => {
    return lineItems.filter(li => li.itemId === itemId).reduce((sum, li) => sum + li.quantity, 0);
  };

  // Check if quantity exceeds available stock
  const checkStockAvailability = (itemId: number, requestedQty: number): { available: number; isInsufficient: boolean; remaining: number } => {
    const available = getAvailableStock(itemId);

    // If editing, add back the quantity of this item from the original sale (if it exists)
    // However, since we are fetching FRESH stock data which ALREADY includes the deduction from this sale,
    // we should strictly speaking ADD BACK the original quantity to the 'available' amount to see what would be available if we undid this sale.
    // BUT, simplify for now: assume user is just checking against CURRENT system availability. 
    // This might be tricky for editing. Ideally, we should add back original quantity to 'available'.

    // For now, let's keep it simple. If editing, we might be blocked if we try to increase quantity and stock is 0.
    // But if we keep same quantity, it should be fine?
    // Actually, if we edit, we reverse the old transaction and apply new.
    // So effectively, the available stock IS (Current Stock + Original Quantity).

    let effectiveAvailable = available;
    if (isEditing && initialData.lineItems) {
      const initialItem = initialData.lineItems.find((li: any) => li.itemId === itemId);
      if (initialItem) {
        effectiveAvailable += Number(initialItem.quantity);
      }
    }

    const alreadyAdded = getAddedQuantity(itemId);
    const remaining = effectiveAvailable - alreadyAdded;
    const isInsufficient = requestedQty > remaining;
    return { available: effectiveAvailable, isInsufficient, remaining };
  };

  const addLineItem = () => {
    const itemId = Number(currentItem.itemId);
    const quantity = Number(currentItem.quantity);
    const rate = Number(currentItem.rate);

    if (!itemId || quantity <= 0 || rate < 0) return;

    // Check stock availability
    const { isInsufficient, remaining } = checkStockAvailability(itemId, quantity);

    if (isInsufficient) {
      alert(`Insufficient stock! Available: ${remaining.toFixed(2)}, Requested: ${quantity.toFixed(2)}`);
      return;
    }

    const itemData = items.find((i: any) => i.id === itemId);
    const gstRate = Number(itemData?.gstRate || 0);
    const isGstEnabled = form.getValues("enableGst");

    let finalRate = rate;
    let finalAmount = quantity * rate;
    let gstAmount = 0;

    if (isGstEnabled) {
      // Inclusive Calculation: Rate treated as Inclusive
      // Taxable = Inclusive / (1 + Rate/100)
      const inclusiveAmount = finalAmount;
      const taxableAmount = inclusiveAmount / (1 + (gstRate / 100));
      gstAmount = inclusiveAmount - taxableAmount;
      finalAmount = taxableAmount;
      finalRate = taxableAmount / quantity;
    } else {
      // Exclusive / No GST (if disabled, GST is 0)
      gstAmount = 0;
    }

    setLineItems([...lineItems, { itemId, quantity, rate: finalRate, amount: finalAmount, gstRate, gstAmount } as any]);
    setCurrentItem({ itemId: "", quantity: "", rate: "" });
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: number) => {
    const updated = [...lineItems];
    const updatedItem = { ...updated[index], [field]: value };

    // Recalculate based on current GST mode
    const isGstEnabled = form.getValues("enableGst");
    const itemData = items.find((i: any) => i.id === updatedItem.itemId);
    const gstRate = Number(itemData?.gstRate || 0);

    // If updating Quantity, keep Rate constant. If updating Rate, keep Quantity constant.
    // NOTE: The 'rate' in the input is the one stored. If we stored Taxable Rate, user sees Taxable Rate.
    // If User updates that Taxable Rate, we calculate new Amount.
    // But... if User wants to type Inclusive Rate?
    // The current UI binds 1:1 to stored value. 
    // To properly support "Type Inclusive, Store Taxable", we generally need a transient state or assume the input is what the user *means*.
    // Since we updated addLineItem to convert, the stored rate IS PRETTY WEIRD (decimals).
    // Let's assume for update: simple recalculation of line totals based on stored values.
    // Allow user to edit pure numbers.

    updatedItem.amount = updatedItem.quantity * updatedItem.rate;
    updatedItem.gstRate = gstRate;

    // If GST is enabled, and we are editing, we assume the values in the boxes ARE the taxable values (since that's what we stored).
    // EXCEPT... if we want to "Adjust in amount", the logic implies "Maintain Total".
    // Actually, simpler logic for Edit: 
    // Just Recalculate GST based on the Amount (which is treated as Taxable).
    // If we want "Inclusive behavior" during Edit, it's hard without separate fields.
    // Let's stick to: Amount = Qty * Rate. GST = Amount * Gst%. 
    // Wait, if "Adjust in amount" is the rule, then GST is PART of the total, not added.
    // But in our storage model (Taxable + GST), Total = Taxable + GST.
    // So if the user edits the Rate (Taxable), the GST is added on top.
    // This effectively preserves the "Math" correctness.

    updatedItem.gstAmount = (updatedItem.amount * gstRate) / 100; // Standard Exclusive math on Taxable Base

    // Wait! If I just switched to Taxable storage, then:
    // Taxable Amount * GST Rate = GST Amount.
    // Total = Taxable + GST.
    // This is mathematically correct for the backend.

    updated[index] = updatedItem;
    setLineItems(updated);
  };

  // Effect to handle toggle
  const enableGstValue = form.watch("enableGst");
  useEffect(() => {
    setLineItems(prev => prev.map(item => {
      const gstRate = item.gstRate || 0;
      if (gstRate === 0) return item;

      // If Switching TO Enabled (Inclusive Logic):
      // We assume the current Amount was the "Inclusive Total" (User's perspective)
      // So we strip tax from it.
      if (enableGstValue) {
        // Treat current amount as Gross
        const gross = item.amount;
        const taxable = gross / (1 + gstRate / 100);
        const newGst = gross - taxable;
        return {
          ...item,
          amount: taxable,
          rate: taxable / item.quantity,
          gstAmount: newGst
        };
      } else {
        // Switching TO Disabled (Exclusive / None):
        // The "Amount" currently stored is Taxable.
        // We want to revert to Gross so the user sees the full value again?
        // Taxable + GST = Gross.
        const gross = item.amount + (item.gstAmount || 0);
        return {
          ...item,
          amount: gross,
          rate: gross / item.quantity,
          gstAmount: 0
        };
      }
    }));
  }, [enableGstValue]);

  const subTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const enableGst = form.watch("enableGst");
  const totalGst = enableGst ? lineItems.reduce((sum: any, i: any) => sum + (i.gstAmount || 0), 0) : 0;
  const totalAmount = subTotal + totalGst;

  const getItemName = (id: number) => items?.find((i: any) => i.id === id)?.name || `Item ${id}`;

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (lineItems.length === 0) return;

    const payload = {
      saleDate: format(values.saleDate, "yyyy-MM-dd"),
      customerId: values.customerId,
      warehouseId: values.warehouseId,
      receivedAmount: values.receivedAmount || 0,
      dueDate: values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : null,
      lineItems: lineItems.map((item: any) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        gstRate: item.gstRate,
        gstAmount: item.gstAmount,
      })),
      ewayBillNumber: values.ewayBillNumber,
      transporterId: values.transporterId,
      transporterName: values.transporterName,
      vehicleNumber: values.vehicleNumber,
      distance: values.distance,
      cgstAmount: values.enableGst && values.gstType === "CGST/SGST" ? (lineItems.reduce((sum: any, i: any) => sum + i.gstAmount, 0) / 2) : 0,
      sgstAmount: values.enableGst && values.gstType === "CGST/SGST" ? (lineItems.reduce((sum: any, i: any) => sum + i.gstAmount, 0) / 2) : 0,
      igstAmount: values.enableGst && values.gstType === "IGST" ? lineItems.reduce((sum: any, i: any) => sum + i.gstAmount, 0) : 0,
    };

    const options = {
      onSuccess: () => {
        setLineItems([]);
        form.reset();
        onSuccess();
      },
    };

    if (isEditing) {
      update.mutate({ id: initialData.id, ...payload }, options);
    } else {
      create.mutate(payload, options);
    }
  }

  // Current item stock info
  const currentItemId = Number(currentItem.itemId);
  const currentQty = Number(currentItem.quantity) || 0;
  const currentStockInfo = currentItemId && selectedWarehouseId ? checkStockAvailability(currentItemId, currentQty) : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="saleDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date"
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  data-testid="input-sale-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined} data-testid="select-customer">
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {customers?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="warehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Warehouse</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedWarehouseId(value);
                  }}
                  value={field.value ? String(field.value) : undefined}
                  data-testid="select-warehouse"
                >
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {warehouses?.map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border rounded-md p-4 space-y-4">
          <h4 className="font-semibold text-sm">Line Items</h4>

          {lineItems.length > 0 && (
            <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                  <span className="flex-1 text-sm font-medium">{getItemName(item.itemId)}</span>
                  <div className="flex items-center gap-1 w-48">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, "quantity", Number(e.target.value))}
                      className="h-7 text-xs"
                      title="Quantity"
                    />
                    <span className="text-xs text-muted-foreground">x</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateLineItem(index, "rate", Number(e.target.value))}
                      className="h-7 text-xs"
                      title="Rate"
                    />
                  </div>
                  <div className="flex flex-col items-end w-24">
                    <span className="font-mono font-bold text-sm">{item.amount.toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground">GST: {(item.gstAmount || 0).toFixed(2)} ({item.gstRate || 0}%)</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeLineItem(index)}
                    data-testid={`button-remove-item-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Item</label>
              <Select
                value={currentItem.itemId}
                onValueChange={(v) => setCurrentItem({ ...currentItem, itemId: v })}
              >
                <SelectTrigger data-testid="select-line-item"><SelectValue placeholder="Item..." /></SelectTrigger>
                <SelectContent>
                  {items?.map((i: any) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Qty</label>
              <Input
                type="number"
                step="0.01"
                value={currentItem.quantity}
                onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                placeholder="0"
                data-testid="input-line-quantity"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rate</label>
              <Input
                type="number"
                step="0.01"
                value={currentItem.rate}
                onChange={(e) => setCurrentItem({ ...currentItem, rate: e.target.value })}
                placeholder="0"
                data-testid="input-line-rate"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={addLineItem}
              disabled={!currentItem.itemId || !currentItem.quantity || !currentItem.rate}
              data-testid="button-add-item"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          {/* Stock availability indicator */}
          {currentItemId && selectedWarehouseId && (
            <div className={`p-2 rounded-md border flex items-center gap-2 text-sm ${currentStockInfo?.isInsufficient
              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200'
              : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-200'
              }`}>
              {currentStockInfo?.isInsufficient ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Insufficient stock! Available: {currentStockInfo.remaining.toFixed(2)}</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span>Available stock: {currentStockInfo?.remaining.toFixed(2)}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md space-y-1">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Taxable Value:</span>
            <span>{subTotal.toFixed(2)}</span>
          </div>

          {enableGst && form.watch("gstType") === "CGST/SGST" && (
            <>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>CGST:</span>
                <span>{(totalGst / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>SGST:</span>
                <span>{(totalGst / 2).toFixed(2)}</span>
              </div>
            </>
          )}

          {enableGst && form.watch("gstType") === "IGST" && (
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>IGST:</span>
              <span>{totalGst.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-center border-t pt-1">
            <span className="text-sm font-medium text-green-900 dark:text-green-100">Total Amount ({lineItems.length} items):</span>
            <span className="text-lg font-bold text-green-700 dark:text-green-400" data-testid="text-total-amount">{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="receivedAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Received Amount</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} data-testid="input-received-amount" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Due Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    data-testid="input-due-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border rounded-md p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-sm">E-Way Bill & GST Details</h4>
            <FormField
              control={form.control}
              name="gstType"
              render={({ field }) => (
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="enableGst"
                    render={({ field }) => (
                      <div className="flex items-center gap-2 border-r pr-4 border-gray-300 dark:border-gray-700">
                        <Checkbox id="enable-gst" checked={field.value} onCheckedChange={field.onChange} />
                        <label
                          htmlFor="enable-gst"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Enable GST
                        </label>
                      </div>
                    )}
                  />

                  {form.watch("enableGst") && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Tax Type:</span>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CGST/SGST">CGST/SGST</SelectItem>
                          <SelectItem value="IGST">IGST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="ewayBillNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">E-Way Bill # (Optional)</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs" /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Vehicle Number</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs" placeholder="MH-12-AB-1234" /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="distance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Distance (km)</FormLabel>
                  <FormControl><Input type="number" {...field} className="h-8 text-xs" /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transporterName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Transporter Name</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs" /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transporterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Transporter ID</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs" /></FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>


        <Button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={(isEditing ? update.isPending : create.isPending) || lineItems.length === 0}
          data-testid="button-submit-sale"
        >
          {isEditing
            ? (update.isPending ? "Updating..." : "Update Sale")
            : (create.isPending ? "Recording..." : "Record Sale")
          }
        </Button>
      </form>
    </Form>
  );
}

// --- Customer Receipt Form ---
function CustomerReceiptForm({ onSuccess, initialData }: { onSuccess: () => void; initialData?: any }) {
  const { create, update } = useCustomerPayments();
  const { data: owners } = useOwners().list;
  const customersHook = useCustomers();
  const isEditing = !!initialData;

  const customers = Array.isArray(customersHook.list?.data)
    ? customersHook.list.data
    : Array.isArray(customersHook.list?.data?.data)
      ? customersHook.list.data.data
      : [];

  const formSchema = z.object({
    paymentDate: z.coerce.date(),
    ownerId: z.coerce.number().min(1, "Select who received"),
    customerId: z.coerce.number().min(1, "Select customer"),
    saleId: z.coerce.number().optional().nullable(),
    amount: z.coerce.number().min(0.01, "Enter amount"),
    paymentMethod: z.string().min(1, "Select payment method"),
    remarks: z.string().optional(),
    nextReceiptDate: z.coerce.date().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      paymentDate: new Date(initialData.paymentDate),
      ownerId: initialData.ownerId,
      customerId: initialData.customerId,
      saleId: initialData.saleId,
      amount: Number(initialData.amount),
      paymentMethod: initialData.paymentMethod,
      remarks: initialData.remarks || "",
      nextReceiptDate: initialData.nextReceiptDate ? new Date(initialData.nextReceiptDate) : undefined,
    } : {
      paymentDate: new Date(),
      paymentMethod: "Cash",
      saleId: null,
    }
  });

  const selectedCustomerId = form.watch("customerId");
  const { list: salesHook } = useSales();
  const allSales = Array.isArray(salesHook?.data) ? salesHook.data : (Array.isArray(salesHook?.data?.data) ? salesHook.data.data : []);

  const customerSales = allSales.filter((s: any) =>
    s.customerId === Number(selectedCustomerId) &&
    (Number(s.totalAmount) - Number(s.receivedAmount) > 1 || (isEditing && s.id === initialData.saleId))
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      paymentDate: format(values.paymentDate, "yyyy-MM-dd"),
      ownerId: values.ownerId,
      customerId: values.customerId,
      saleId: values.saleId || null,
      amount: String(values.amount),
      paymentMethod: values.paymentMethod,
      remarks: values.remarks || null,
      nextReceiptDate: values.nextReceiptDate ? format(values.nextReceiptDate, "yyyy-MM-dd") : null,
    };

    if (isEditing) {
      update.mutate({ id: initialData.id, ...payload }, { onSuccess });
    } else {
      create.mutate(payload, { onSuccess });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date"
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  data-testid="input-receipt-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Received By (Owner)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl><SelectTrigger data-testid="select-owner"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {owners?.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Received From (Customer)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl><SelectTrigger data-testid="select-receipt-customer"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {customers?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="saleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Against Sale (Optional)</FormLabel>
              <Select
                onValueChange={(val) => {
                  field.onChange(val === "general" ? null : Number(val));
                  // Auto-fill amount if a sale is selected and amount is 0 or empty
                  if (val !== "general" && (!form.getValues("amount") || form.getValues("amount") === 0)) {
                    const s = customerSales.find((cs: any) => cs.id === Number(val));
                    if (s) {
                      const remaining = Math.max(0, Number(s.totalAmount) - Number(s.receivedAmount));
                      form.setValue("amount", Number(remaining.toFixed(2)));
                    }
                  }
                }}
                value={field.value ? String(field.value) : "general"}
                disabled={!selectedCustomerId}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-receipt-sale">
                    <SelectValue placeholder={selectedCustomerId ? "Select a sale or General" : "Select customer first"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="general">General / No Specific Sale</SelectItem>
                  {customerSales.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      Sale #{s.id} - {format(new Date(s.saleDate), "dd MMM yyyy")} (Bal: ₹{(Number(s.totalAmount) - Number(s.receivedAmount)).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[0.8rem] text-muted-foreground italic">
                Linking to a sale will reduce its remaining balance in the records.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0" {...field} data-testid="input-receipt-amount" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-receipt-method"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nextReceiptDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Receipt Date (if partial)</FormLabel>
                <FormControl>
                  <Input type="date"
                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    data-testid="input-next-receipt-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="remarks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks (Optional)</FormLabel>
                <FormControl><Textarea {...field} data-testid="input-receipt-remarks" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isEditing ? update.isPending : create.isPending} data-testid="button-submit-receipt">
          {isEditing ? (update.isPending ? "Updating..." : "Update Receipt") : (create.isPending ? "Recording..." : "Record Receipt")}
        </Button>
      </form>
    </Form>
  );
}

// --- Sale Row with Expandable Line Items ---
function SaleRow({ sale, items, onDelete, onEdit, onExport, onEwayBill, onPrintEwayBill, onPrintInvoice }: { sale: any; items: any[]; onDelete: (id: number) => void; onEdit: (sale: any) => void; onExport: (sale: any) => void; onEwayBill: (sale: any) => void; onPrintEwayBill: (sale: any) => void; onPrintInvoice: (sale: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const getItemName = (id: number) => items?.find((i: any) => i.id === id)?.name || `Item ${id}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? String(dateStr) : format(date, "dd MMM yyyy");
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this sale? Stock will be reversed.")) {
      onDelete(sale.id);
    }
  };

  // Calculate remaining balance
  const totalAmount = Number(sale.totalAmount) || 0;
  const receivedAmount = Number(sale.receivedAmount) || 0;
  const remaining = totalAmount - receivedAmount;

  // Determine payment status
  const getPaymentStatus = () => {
    if (remaining <= 0) return { label: "Received", variant: "default" as const, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };

    if (!sale.dueDate) return { label: "Partial", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };

    const today = new Date();
    const dueDate = new Date(sale.dueDate);
    const isOverdue = dueDate < today;

    if (isOverdue) return { label: "Overdue", variant: "destructive" as const, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };

    return { label: "Pending", variant: "secondary" as const, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
  };

  const status = getPaymentStatus();

  return (
    <>
      <tr
        className="hover-elevate cursor-pointer border-b transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`row-sale-${sale.id}`}
      >
        <td className="p-3">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </td>
        <td className="p-3">{formatDate(sale.saleDate)}</td>
        <td className="p-3">{sale.customer || "-"}</td>
        <td className="p-3">{sale.warehouse || "-"}</td>
        <td className="p-3 text-center">{sale.lineItems?.length || 0}</td>
        <td className="p-3 font-mono font-bold text-right text-green-700 dark:text-green-400">{totalAmount.toFixed(2)}</td>
        <td className="p-3 font-mono text-right">
          {receivedAmount > 0 ? (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{receivedAmount.toFixed(2)}</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs text-muted-foreground">0.00</Badge>
          )}
        </td>
        <td className="p-3 font-mono text-right">
          {remaining > 0 ? (
            <span className="font-bold text-red-600 dark:text-red-400">{remaining.toFixed(2)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
        <td className="p-3 text-center">
          {sale.dueDate ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs">{formatDate(sale.dueDate)}</span>
              <Badge className={`text-xs ${status.className}`}>{status.label}</Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
        <td className="p-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {/* 
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onExport(sale);
              }}
              title="Export this sale"
              data-testid={`button-export-sale-${sale.id}`}
            >
              <Download className="w-4 h-4 text-green-600" />
            </Button>
            */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPrintInvoice(sale);
              }}
              title="Print Tax Invoice"
              data-testid={`button-print-invoice-${sale.id}`}
            >
              <Printer className="w-4 h-4 text-purple-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPrintEwayBill(sale);
              }}
              title="Print E-Way Bill"
              data-testid={`button-print-eway-bill-${sale.id}`}
            >
              <Printer className="w-4 h-4 text-orange-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEwayBill(sale);
              }}
              title="Generate E-Way Bill JSON"
              data-testid={`button-eway-bill-${sale.id}`}
            >
              <Package className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(sale);
              }}
              data-testid={`button-edit-sale-${sale.id}`}
            >
              <Edit className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              data-testid={`button-delete-sale-${sale.id}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && sale.lineItems?.length > 0 && (
        <tr className="bg-muted/30">
          <td colSpan={10} className="p-0">
            <table className="w-full">
              <tbody>
                {sale.lineItems.map((item: any, idx: number) => (
                  <tr key={idx} className="text-sm border-b border-muted last:border-0">
                    <td className="p-2 pl-10 text-muted-foreground">{idx + 1}.</td>
                    <td className="p-2">{item.item || getItemName(item.itemId)}</td>
                    <td className="p-2 text-muted-foreground">{item.quantity} x {item.rate}</td>
                    <td className="p-2 text-xs text-muted-foreground italic">
                      {Number(item.gstRate) > 0 ? `(GST ${item.gstRate}%)` : ""}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground text-right">
                      {Number(item.gstAmount) > 0 ? `₹${Number(item.gstAmount).toFixed(2)}` : ""}
                    </td>
                    <td className="p-2 font-mono text-right font-semibold">{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
                {(Number(sale.cgstAmount) > 0 || Number(sale.sgstAmount) > 0 || Number(sale.igstAmount) > 0) && (
                  <>
                    <tr className="text-xs border-t border-muted-foreground/20">
                      <td colSpan={5} className="p-2 text-right font-medium">Taxable Value (Sub-Total):</td>
                      <td className="p-2 font-mono text-right font-semibold">
                        {(Number(sale.totalAmount) - (Number(sale.cgstAmount || 0) + Number(sale.sgstAmount || 0) + Number(sale.igstAmount || 0))).toFixed(2)}
                      </td>
                    </tr>
                    {Number(sale.cgstAmount) > 0 && (
                      <tr className="text-xs text-muted-foreground italic">
                        <td colSpan={5} className="p-1 text-right">Add: CGST:</td>
                        <td className="p-1 font-mono text-right">₹{Number(sale.cgstAmount).toFixed(2)}</td>
                      </tr>
                    )}
                    {Number(sale.sgstAmount) > 0 && (
                      <tr className="text-xs text-muted-foreground italic">
                        <td colSpan={5} className="p-1 text-right">Add: SGST:</td>
                        <td className="p-1 font-mono text-right">₹{Number(sale.sgstAmount).toFixed(2)}</td>
                      </tr>
                    )}
                    {Number(sale.igstAmount) > 0 && (
                      <tr className="text-xs text-muted-foreground italic">
                        <td colSpan={5} className="p-1 text-right">Add: IGST:</td>
                        <td className="p-1 font-mono text-right">₹{Number(sale.igstAmount).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="text-sm font-bold bg-muted/50 border-t-2 border-black/10">
                      <td colSpan={5} className="p-2 text-right text-lg">Grand Total (Incl. GST):</td>
                      <td className="p-2 font-mono text-right text-lg text-green-700 dark:text-green-400">₹{Number(sale.totalAmount).toFixed(2)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

// --- Customer Summary Card ---
function CustomerSummaryCard({ customer }: { customer: any }) {
  const totalSales = Number(customer.totalSales || 0);

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          {customer.customer || "Unknown Customer"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Total Sales</span>
          <span className="text-sm font-bold font-mono text-green-700 dark:text-green-400">{totalSales.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Sales Page ---
export default function Sales() {
  const salesHook = useSales();
  const { data: sales, isLoading: sLoading } = salesHook.list;
  const { data: customerSummary } = useCustomerSummary();
  const items = normalizeList(useItems().list.data);
  const warehouses = normalizeList(useWarehouses().list.data);
  const customers = normalizeList(useCustomers().list.data);
  const owners = normalizeList(useOwners().list.data);
  const { data: adminSettingsResult } = useAdminSettings();
  const adminSettings = adminSettingsResult?.data;
  const receiptsHook = useCustomerPayments();
  const { data: receipts, isLoading: receiptsLoading } = receiptsHook.list;
  const { data: overdueSales } = useOverdueSales();
  const { data: upcomingSales } = useUpcomingSales();

  const [sOpen, setSOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [printEwayBillSale, setPrintEwayBillSale] = useState<any>(null);
  const [printInvoiceSale, setPrintInvoiceSale] = useState<any>(null);

  const handlePrintInvoice = (sale: any) => {
    setPrintInvoiceSale(sale);
  };

  const handleEwayBill = (sale: any) => {
    if (!adminSettings?.gstNumber) {
      alert("Please set Company GST Number in Admin Settings (Masters -> Admin) first.");
      return;
    }
    const customer = customers.find((c: any) => c.id === sale.customerId);
    if (!customer) {
      alert("Customer not found.");
      return;
    }
    const ewayBill = generateEwayBillJson(sale, adminSettings, customer);
    downloadJson(ewayBill, `eway-bill-${sale.id}.json`);
  };

  const handlePrintEwayBill = (sale: any) => {
    setPrintEwayBillSale(sale);
  };
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<any>(null);

  const [saleSearch, setSaleSearch] = useState("");
  const [saleDateFilter, setSaleDateFilter] = useState("");
  const [saleCustomerFilter, setSaleCustomerFilter] = useState("all");
  const [saleWarehouseFilter, setSaleWarehouseFilter] = useState("all");
  const [saleMonthFilter, setSaleMonthFilter] = useState("");
  const [customerSummarySearch, setCustomerSummarySearch] = useState("");
  const [receiptMonthFilter, setReceiptMonthFilter] = useState("");



  const matchesMonth = (dateStr: string, monthFilter: string) => {
    if (!monthFilter) return true;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const filterDate = new Date(monthFilter + "-01");
    return date.getFullYear() === filterDate.getFullYear() && date.getMonth() === filterDate.getMonth();
  };

  const filteredSales = sales?.filter((s: any) => {
    const matchesSearch = saleSearch === "" ||
      (s.customer && s.customer.toLowerCase().includes(saleSearch.toLowerCase())) ||
      (s.warehouse && s.warehouse.toLowerCase().includes(saleSearch.toLowerCase()));

    const matchesDate = saleDateFilter === "" || s.saleDate === saleDateFilter;

    const matchesCustomer = saleCustomerFilter === "all" ||
      String(s.customerId) === saleCustomerFilter;

    const matchesWarehouse = saleWarehouseFilter === "all" ||
      String(s.warehouseId) === saleWarehouseFilter;

    const monthMatch = matchesMonth(s.saleDate, saleMonthFilter);

    return matchesSearch && matchesDate && matchesCustomer && matchesWarehouse && monthMatch;
  });

  const filteredCustomerSummary = customerSummary?.filter((c: any) => {
    if (customerSummarySearch === "") return true;
    const customerName = (c.customer || c.customerName || "").toLowerCase();
    return customerName.includes(customerSummarySearch.toLowerCase());
  });

  const filteredReceipts = receipts?.filter((r: any) => matchesMonth(r.paymentDate, receiptMonthFilter));

  const clearSaleFilters = () => {
    setSaleSearch("");
    setSaleDateFilter("");
    setSaleCustomerFilter("all");
    setSaleWarehouseFilter("all");
    setSaleMonthFilter("");
  };

  const hasActiveFilters = saleSearch !== "" || saleDateFilter !== "" || saleCustomerFilter !== "all" || saleWarehouseFilter !== "all" || saleMonthFilter !== "";

  const handleDeleteSale = (id: number) => {
    salesHook.remove.mutate(id);
  };

  const handleEditSale = (sale: any) => {
    setEditingSale(sale);
    setSOpen(true);
  };

  const handleEditReceipt = (receipt: any) => {
    setEditingReceipt(receipt);
    setReceiptOpen(true);
  };

  const handleDeleteReceipt = (id: number) => {
    if (confirm("Are you sure you want to delete this receipt?")) {
      receiptsHook.remove.mutate(id);
    }
  };

  const handleReceiptDialogClose = (open: boolean) => {
    setReceiptOpen(open);
    if (!open) {
      setEditingReceipt(null);
    }
  };

  const handleExportSales = async () => {
    if (!filteredSales?.length) return;
    const data = formatSalesForExport(filteredSales, customers);
    await exportToExcel(data, salesColumns, 'sales');
  };

  const handleBulkExport = async () => {
    if (!sales?.length) return;
    await exportSalesBulk(sales);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      salesHook.importExcel.mutate(file, {
        onSuccess: () => {
          e.target.value = ""; // Reset
        }
      });
    }
  };


  const handleExportSingleSale = async (sale: any) => {
    // Find full customer details
    const customer = customers.find((c: any) => c.id === sale.customerId);

    const orderData = {
      ...sale,
      id: sale.id,
      date: sale.saleDate,
      customer: sale.customer,
      customerContact: customer?.contactPerson,
      customerPhone: customer?.contactInfo,
      customerAddress: customer?.address,
      warehouse: sale.warehouse, // used as Ship To (or maybe default to something else)
      lineItems: sale.lineItems
    };

    const companyInfo = {
      name: adminSettings?.companyName || "My Company",
      address: adminSettings?.address || "",
      phone: adminSettings?.phone || "",
      fax: "",
      website: adminSettings?.email || ""
    };

    await exportOrderToExcel(orderData, 'SALES INVOICE', companyInfo);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? String(dateStr) : format(date, "dd MMM yyyy");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-display">Sales</h1>
        <p className="text-muted-foreground">Record sales and track revenue.</p>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="sales" data-testid="tab-sales">Sales</TabsTrigger>
          <TabsTrigger value="receipts" data-testid="tab-receipts">Receipts</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          {filteredCustomerSummary && filteredCustomerSummary.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Customer Summary</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSummarySearch}
                    onChange={(e) => setCustomerSummarySearch(e.target.value)}
                    className="pl-9 w-[200px]"
                    data-testid="input-search-customers"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredCustomerSummary.map((customer: any, idx: number) => (
                  <CustomerSummaryCard key={idx} customer={customer} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer/warehouse..."
                  value={saleSearch}
                  onChange={(e) => setSaleSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                  data-testid="input-search-sales"
                />
              </div>
              <Input
                type="month"
                value={saleMonthFilter}
                onChange={(e) => setSaleMonthFilter(e.target.value)}
                className="w-[160px]"
                data-testid="input-filter-month"
              />
              <Input
                type="date"
                value={saleDateFilter}
                onChange={(e) => setSaleDateFilter(e.target.value)}
                className="w-[160px]"
                data-testid="input-filter-date"
              />
              <Select value={saleCustomerFilter} onValueChange={setSaleCustomerFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-filter-customer">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers?.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={saleWarehouseFilter} onValueChange={setSaleWarehouseFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-filter-warehouse">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses?.map((w: any) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearSaleFilters} data-testid="button-clear-filters">
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                className="hidden"
                id="sales-import-new"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('sales-import-new')?.click()}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                data-testid="button-import-excel-sales"
              >
                <Upload className="w-4 h-4 mr-1" /> Import Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                className="border-green-600 text-green-600 hover:bg-green-50"
                data-testid="button-bulk-export-sales"
              >
                <Download className="w-4 h-4 mr-1" /> Bulk Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportSales} disabled={!filteredSales?.length} data-testid="button-export-sales">
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
              <Dialog open={sOpen} onOpenChange={(open) => {
                setSOpen(open);
                if (!open) setEditingSale(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" data-testid="button-new-sale">
                    <Plus className="w-4 h-4 mr-1" /> New Sale
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingSale ? "Edit Sale" : "Record Sale"}</DialogTitle></DialogHeader>
                  <SaleForm
                    key={editingSale ? `edit-${editingSale.id}` : 'new'}
                    onSuccess={() => { setSOpen(false); setEditingSale(null); }}
                    initialData={editingSale}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left w-10"></th>
                  <th className="p-3 text-left text-sm font-medium">Date</th>
                  <th className="p-3 text-left text-sm font-medium">Customer</th>
                  <th className="p-3 text-left text-sm font-medium">Warehouse</th>
                  <th className="p-3 text-center text-sm font-medium">Items</th>
                  <th className="p-3 text-right text-sm font-medium">Total</th>
                  <th className="p-3 text-right text-sm font-medium">Received</th>
                  <th className="p-3 text-right text-sm font-medium">Remaining</th>
                  <th className="p-3 text-center text-sm font-medium">Due Date</th>
                  <th className="p-3 text-right text-sm font-medium w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sLoading ? (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filteredSales?.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">
                    {hasActiveFilters ? "No sales match your filters" : "No sales yet"}
                  </td></tr>
                ) : (
                  filteredSales?.map((s: any) => <SaleRow key={s.id} sale={s} items={items || []} onDelete={handleDeleteSale} onEdit={handleEditSale} onExport={handleExportSingleSale} onEwayBill={handleEwayBill} onPrintEwayBill={handlePrintEwayBill} onPrintInvoice={handlePrintInvoice} />)
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          {/* Overdue Receivables Alert */}
          {overdueSales && overdueSales.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Overdue Receivables Alert!</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p className="font-semibold text-xs mb-2">You have {overdueSales.length} overdue receivable(s):</p>
                  <ul className="text-xs space-y-1 ml-4 list-disc">
                    {overdueSales.map((s: any) => (
                      <li key={s.saleId}>
                        <span className="font-bold">{s.customerName}</span>: ₹{Number(s.remainingAmount).toFixed(2)}
                        <span className="ml-2 text-[10px] uppercase">({s.daysOverdue} days overdue)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Upcoming Receivables Alert */}
          {upcomingSales && upcomingSales.length > 0 && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-900 dark:text-green-100 italic">Upcoming Receivables Alert!</AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="mt-2 space-y-1">
                  <p className="font-semibold text-xs text-green-800 dark:text-green-200 mb-2">You have {upcomingSales.length} receivable(s) due within 3 days:</p>
                  <ul className="text-xs space-y-1 ml-4 list-disc text-green-700 dark:text-green-300">
                    {upcomingSales.map((s: any) => (
                      <li key={s.saleId}>
                        <span className="font-bold">{s.customerName}</span>: ₹{Number(s.remainingAmount).toFixed(2)}
                        <span className="ml-2 text-[10px] opacity-80">(Due in {s.daysUntilDue} days)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                type="month"
                value={receiptMonthFilter}
                onChange={(e) => setReceiptMonthFilter(e.target.value)}
                className="w-[160px]"
                data-testid="input-filter-receipt-month"
              />
              {receiptMonthFilter && (
                <Button variant="ghost" size="sm" onClick={() => setReceiptMonthFilter("")} data-testid="button-clear-receipt-filters">
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              )}
            </div>

            <Dialog open={receiptOpen} onOpenChange={handleReceiptDialogClose}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" data-testid="button-new-receipt">
                  <CreditCard className="w-4 h-4 mr-1" /> Record Receipt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingReceipt ? "Edit Customer Receipt" : "Record Customer Receipt"}</DialogTitle>
                </DialogHeader>
                <CustomerReceiptForm
                  onSuccess={() => {
                    setReceiptOpen(false);
                    setEditingReceipt(null);
                  }}
                  initialData={editingReceipt}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card className="overflow-hidden">
            <DataTable
              data={filteredReceipts}
              isLoading={receiptsLoading}
              columns={[
                {
                  header: "Date",
                  accessorKey: "paymentDate",
                  cell: (row: any) => formatDate(row.paymentDate),
                },
                { header: "Received By", accessorKey: "owner" },
                { header: "Customer", accessorKey: "customer" },
                {
                  header: "Against",
                  accessorKey: "saleId",
                  cell: (row: any) => row.saleId ? `Sale #${row.saleId}` : "General"
                },
                {
                  header: "Amount",
                  accessorKey: "amount",
                  className: "text-right font-mono font-bold text-green-700 dark:text-green-400",
                  cell: (row: any) => Number(row.amount).toFixed(2),
                },
                { header: "Method", accessorKey: "paymentMethod" },
                {
                  header: "Next Receipt Date",
                  accessorKey: "nextReceiptDate",
                  cell: (row: any) => row.nextReceiptDate ? formatDate(row.nextReceiptDate) : "-"
                },
                { header: "Remarks", accessorKey: "remarks", className: "text-muted-foreground italic" },
                {
                  header: "Actions",
                  className: "w-24 text-right",
                  cell: (row: any) => (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditReceipt(row)}
                        data-testid={`button-edit-receipt-${row.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReceipt(row.id)}
                        data-testid={`button-delete-receipt-${row.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              emptyMessage="No customer receipts recorded yet"
            />
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!printEwayBillSale} onOpenChange={(open) => !open && setPrintEwayBillSale(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>E-Way Bill Preview</DialogTitle>
          </DialogHeader>
          {printEwayBillSale && (
            <EwayBillPrint
              sale={printEwayBillSale}
              companyInfo={adminSettings}
              customerInfo={customers.find((c: any) => c.id === printEwayBillSale.customerId)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!printInvoiceSale} onOpenChange={(open) => !open && setPrintInvoiceSale(null)}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto p-0">
          {printInvoiceSale && (
            <SalesPrint
              sale={printInvoiceSale}
              companyInfo={adminSettings}
              customerInfo={customers.find((c: any) => c.id === printInvoiceSale.customerId)}
              onClose={() => setPrintInvoiceSale(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
