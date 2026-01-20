import { useState, useMemo } from "react";
import {
  usePurchases, useStockTransfers, useItems, useWarehouses, useSuppliers, useUoms, useOwners, useSupplierPayments, useVendorSummary, useOverduePayments, useUpcomingPayments, useAdminSettings
} from "@/hooks/use-erp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ChevronDown, ChevronRight, DollarSign, CreditCard, Building2, Search, X, Download, Upload, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  exportToExcel,
  exportOrderToExcel,
  formatPurchasesForExport,
  formatIssuesForExport,
  formatPaymentsForExport,
  purchaseColumns,
  issueColumns,
  paymentColumns,
  exportPurchasesBulk
} from "@/lib/excel-export";

interface LineItem {
  itemId: number;
  quantity: number;
  rate: number;
  amount: number;
}

// Helper to normalize data from hooks
const normalizeList = (data: any) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

// --- Purchase Form with Multiple Items ---
function PurchaseForm({ onSuccess, initialData }: { onSuccess: () => void; initialData?: any }) {
  const { create, update } = usePurchases();
  const itemsHook = useItems();
  const isEditing = !!initialData;

  const allItems = Array.isArray(itemsHook.list?.data)
    ? itemsHook.list.data
    : Array.isArray(itemsHook.list?.data?.data)
      ? itemsHook.list.data.data
      : [];

  const items = allItems.filter((item: any) =>
    item.categoryType === "RAW"
  );

  const suppliersHook = useSuppliers();

  const suppliers = Array.isArray(suppliersHook.list?.data)
    ? suppliersHook.list.data
    : Array.isArray(suppliersHook.list?.data?.data)
      ? suppliersHook.list.data.data
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
    })) || []
  );
  const [currentItem, setCurrentItem] = useState<{ itemId: string; quantity: string; rate: string }>({
    itemId: "",
    quantity: "",
    rate: ""
  });

  const formSchema = z.object({
    purchaseDate: z.coerce.date(),
    supplierId: z.coerce.number().min(1, "Select supplier"),
    warehouseId: z.coerce.number().min(1, "Select warehouse"),
    payingAmount: z.coerce.number().min(0).default(0),
    dueDate: z.coerce.date().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      purchaseDate: new Date(initialData.purchaseDate),
      supplierId: initialData.supplierId,
      warehouseId: initialData.warehouseId,
      payingAmount: Number(initialData.payingAmount || 0),
      dueDate: initialData.dueDate ? new Date(initialData.dueDate) : undefined,
    } : {
      purchaseDate: new Date(),
      payingAmount: 0,
    }
  });

  const addLineItem = () => {
    const itemId = Number(currentItem.itemId);
    const quantity = Number(currentItem.quantity);
    const rate = Number(currentItem.rate);

    if (!itemId || quantity <= 0 || rate < 0) return;

    const amount = quantity * rate;
    setLineItems([...lineItems, { itemId, quantity, rate, amount }]);
    setCurrentItem({ itemId: "", quantity: "", rate: "" });
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    updated[index].amount = updated[index].quantity * updated[index].rate;
    setLineItems(updated);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const getItemName = (id: number) => allItems?.find((i: any) => i.id === id)?.name || `Item ${id}`;

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (lineItems.length === 0) return;

    const payload = {
      purchaseDate: format(values.purchaseDate, "yyyy-MM-dd"),
      supplierId: values.supplierId,
      warehouseId: values.warehouseId,
      payingAmount: values.payingAmount || 0,
      dueDate: values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : null,
      lineItems: lineItems.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      })),
    };

    if (isEditing) {
      update.mutate(
        { id: initialData.id, ...payload },
        {
          onSuccess: () => {
            setLineItems([]);
            onSuccess();
          },
        }
      );
    } else {
      create.mutate(
        payload,
        {
          onSuccess: () => {
            setLineItems([]);
            onSuccess();
          },
        }
      );
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="purchaseDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date"
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  data-testid="input-purchase-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined} data-testid="select-supplier">
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {suppliers?.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
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
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined} data-testid="select-warehouse">
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
                  <span className="font-mono font-bold text-sm w-20 text-right">{item.amount.toFixed(2)}</span>
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
        </div>

        <div className="p-3 bg-muted rounded-md flex justify-between items-center">
          <span className="text-sm font-medium">Total Amount ({lineItems.length} items):</span>
          <span className="text-lg font-bold text-primary" data-testid="text-total-amount">{totalAmount.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payingAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paying Amount</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} data-testid="input-paying-amount" />
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

        <Button
          type="submit"
          className="w-full"
          disabled={(isEditing ? update.isPending : create.isPending) || lineItems.length === 0}
          data-testid="button-submit-purchase"
        >
          {isEditing
            ? (update.isPending ? "Updating..." : "Update Purchase")
            : (create.isPending ? "Recording..." : "Record Purchase")
          }
        </Button>
      </form>
    </Form>
  );
}

// --- Stock Transfer Form ---
function StockTransferForm({ onSuccess, initialData }: { onSuccess: () => void; initialData?: any }) {
  const { create, update } = useStockTransfers();
  const { data: items } = useItems().list;
  const { data: warehouses } = useWarehouses().list;
  const { data: uoms } = useUoms().list;

  const formSchema = z.object({
    transferDate: z.coerce.date(),
    itemId: z.coerce.number().min(1, "Select Item"),
    fromWarehouseId: z.coerce.number().min(1, "Select Source Warehouse"),
    toWarehouseId: z.coerce.number().optional(), // Nullable for Issue/Consume
    quantity: z.coerce.number().min(0.01, "Quantity must be > 0"),
    uomId: z.coerce.number().min(1, "Select UOM"),
    remarks: z.string().optional(),
  });

  const isEditing = !!initialData;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      transferDate: new Date(initialData.transferDate),
      itemId: initialData.itemId,
      fromWarehouseId: initialData.fromWarehouseId,
      toWarehouseId: initialData.toWarehouseId,
      quantity: Number(initialData.quantity),
      uomId: initialData.uomId,
      remarks: initialData.remarks || "",
    } : {
      transferDate: new Date(),
      remarks: "",
    }
  });

  const watchItem = form.watch("itemId");
  if (watchItem && !form.getValues("uomId")) {
    const item = items?.find((i: any) => String(i.id) === String(watchItem));
    if (item && item.defaultUomId) form.setValue("uomId", item.defaultUomId);
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      ...values,
      transferDate: format(values.transferDate, "yyyy-MM-dd"),
      quantity: String(values.quantity),
      toWarehouseId: values.toWarehouseId ? Number(values.toWarehouseId) : null,
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
          name="transferDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date"
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromWarehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Warehouse</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Source..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {warehouses?.map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toWarehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Warehouse (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Target..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="0">None (Issue/Consume)</SelectItem>
                    {warehouses?.map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="text-[10px] text-muted-foreground">Select 'None' to strictly issue/consume stock out.</div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="itemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select Item..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {items?.map((i: any) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="uomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UOM</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {uoms?.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
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
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Reason for transfer..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isEditing ? update.isPending : create.isPending}>
          {isEditing
            ? (update.isPending ? "Updating..." : "Update Transfer")
            : (create.isPending ? "Submitting..." : "Submit Transfer")
          }
        </Button>
      </form>
    </Form>
  );
}

// --- Payment Form ---
function PaymentForm({ onSuccess, initialData }: { onSuccess: () => void; initialData?: any }) {
  const { create, update } = useSupplierPayments();
  const { data: owners } = useOwners().list;
  const suppliersHook = useSuppliers();
  const isEditing = !!initialData;

  const suppliers = Array.isArray(suppliersHook.list?.data)
    ? suppliersHook.list.data
    : Array.isArray(suppliersHook.list?.data?.data)
      ? suppliersHook.list.data.data
      : [];


  const formSchema = z.object({
    paymentDate: z.coerce.date(),
    ownerId: z.coerce.number().min(1, "Select who paid"),
    supplierId: z.coerce.number().min(1, "Select supplier"),
    purchaseId: z.coerce.number().optional().nullable(),
    amount: z.coerce.number().min(0.01, "Enter amount"),
    paymentMethod: z.string().min(1, "Select payment method"),
    remarks: z.string().optional(),
    nextPaymentDate: z.coerce.date().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      paymentDate: new Date(initialData.paymentDate),
      ownerId: initialData.ownerId,
      supplierId: initialData.supplierId,
      purchaseId: initialData.purchaseId,
      amount: Number(initialData.amount),
      paymentMethod: initialData.paymentMethod,
      remarks: initialData.remarks || "",
      nextPaymentDate: initialData.nextPaymentDate ? new Date(initialData.nextPaymentDate) : undefined,
    } : {
      paymentDate: new Date(),
      paymentMethod: "Cash",
      purchaseId: null,
    }
  });

  const selectedSupplierId = form.watch("supplierId");
  const { list: purchasesHook } = usePurchases();
  const allPurchases = Array.isArray(purchasesHook?.data) ? purchasesHook.data : (Array.isArray(purchasesHook?.data?.data) ? purchasesHook.data.data : []);

  const supplierPurchases = allPurchases.filter((p: any) =>
    p.supplierId === Number(selectedSupplierId) &&
    (Number(p.totalAmount) - Number(p.payingAmount) > 0 || (isEditing && p.id === initialData.purchaseId))
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      paymentDate: format(values.paymentDate, "yyyy-MM-dd"),

      ownerId: values.ownerId,
      supplierId: values.supplierId,
      purchaseId: values.purchaseId || null,
      amount: String(values.amount),
      paymentMethod: values.paymentMethod,
      remarks: values.remarks || null,
      nextPaymentDate: values.nextPaymentDate ? format(values.nextPaymentDate, "yyyy-MM-dd") : null,

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
                  data-testid="input-payment-date"
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
                <FormLabel>Paid By (Owner)</FormLabel>
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
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paid To (Supplier)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl><SelectTrigger data-testid="select-payment-supplier"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {suppliers?.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="purchaseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Against Purchase (Optional)</FormLabel>
              <Select
                onValueChange={(val) => {
                  field.onChange(val === "general" ? null : Number(val));
                  // Auto-fill amount if a purchase is selected and amount is 0 or empty
                  if (val !== "general" && (!form.getValues("amount") || form.getValues("amount") === 0)) {
                    const p = supplierPurchases.find((sp: any) => sp.id === Number(val));
                    if (p) {
                      const remaining = Math.max(0, Number(p.totalAmount) - Number(p.payingAmount));
                      form.setValue("amount", Number(remaining.toFixed(2)));
                    }
                  }
                }}
                value={field.value ? String(field.value) : "general"}
                disabled={!selectedSupplierId}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-payment-purchase">
                    <SelectValue placeholder={selectedSupplierId ? "Select a purchase or General" : "Select supplier first"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="general">General / No Specific Purchase</SelectItem>
                  {supplierPurchases.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      Purchase #{p.id} - {format(new Date(p.purchaseDate), "dd MMM yyyy")} (Bal: ₹{(Number(p.totalAmount) - Number(p.payingAmount)).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[0.8rem] text-muted-foreground italic">
                Linking to a purchase will reduce its remaining balance in the records.
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
                <FormControl><Input type="number" step="0.01" min="0" {...field} data-testid="input-payment-amount" /></FormControl>
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
                  <FormControl><SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger></FormControl>
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
            name="nextPaymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Payment Date (if partial)</FormLabel>
                <FormControl>
                  <Input type="date"
                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    data-testid="input-next-payment-date"
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
                <FormControl><Textarea {...field} data-testid="input-payment-remarks" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isEditing ? update.isPending : create.isPending} data-testid="button-submit-payment">
          {isEditing ? (update.isPending ? "Updating..." : "Update Payment") : (create.isPending ? "Recording..." : "Record Payment")}
        </Button>
      </form>
    </Form>
  );
}

// --- Purchase Row with Expandable Line Items ---
function PurchaseRow({ purchase, items, onDelete, onEdit, onExport }: { purchase: any; items: any[]; onDelete: (id: number) => void; onEdit: (purchase: any) => void; onExport: (purchase: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const getItemName = (id: number) => items?.find((i: any) => i.id === id)?.name || `Item ${id}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? String(dateStr) : format(date, "dd MMM yyyy");
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this purchase?")) {
      onDelete(purchase.id);
    }
  };

  // Calculate remaining balance
  const totalAmount = Number(purchase.totalAmount) || 0;
  const payingAmount = Number(purchase.payingAmount) || 0;
  const remaining = totalAmount - payingAmount;

  // Determine payment status
  const getPaymentStatus = () => {
    if (remaining <= 0) return { label: "Paid", variant: "default" as const, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };

    if (!purchase.dueDate) return { label: "Partial", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };

    const today = new Date();
    const dueDate = new Date(purchase.dueDate);
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
        data-testid={`row-purchase-${purchase.id}`}
      >
        <td className="p-3">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </td>
        <td className="p-3">{formatDate(purchase.purchaseDate)}</td>
        <td className="p-3">{purchase.supplier || "-"}</td>
        <td className="p-3">{purchase.warehouse || "-"}</td>
        <td className="p-3 text-center">{purchase.lineItems?.length || 0}</td>
        <td className="p-3 font-mono font-bold text-right">{totalAmount.toFixed(2)}</td>
        <td className="p-3 font-mono text-right">
          {payingAmount > 0 ? (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{payingAmount.toFixed(2)}</Badge>
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
          {purchase.dueDate ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs">{formatDate(purchase.dueDate)}</span>
              <Badge className={`text-xs ${status.className}`}>{status.label}</Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
        <td className="p-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onExport(purchase);
              }}
              title="Export this purchase"
              data-testid={`button-export-purchase-${purchase.id}`}
            >
              <Download className="w-4 h-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(purchase);
              }}
              data-testid={`button-edit-purchase-${purchase.id}`}
            >
              <Edit className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              data-testid={`button-delete-purchase-${purchase.id}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && purchase.lineItems?.length > 0 && (
        <tr className="bg-muted/30">
          <td colSpan={10} className="p-0">
            <table className="w-full">
              <tbody>
                {purchase.lineItems.map((item: any, idx: number) => (
                  <tr key={idx} className="text-sm border-b border-muted last:border-0">
                    <td className="p-2 pl-10 text-muted-foreground">{idx + 1}.</td>
                    <td className="p-2">{item.item || getItemName(item.itemId)}</td>
                    <td className="p-2 text-muted-foreground">{item.quantity} x {item.rate}</td>
                    <td className="p-2 font-mono text-right">{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

// --- Vendor Summary Card ---
function VendorSummaryCard({ vendor }: { vendor: any }) {
  const totalBill = Number(vendor.totalPurchases || 0);
  const totalPaid = Number(vendor.totalPaid || 0);
  const balance = totalBill - totalPaid;

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          {vendor.supplier || "Unknown Vendor"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Total Bill</span>
          <span className="text-sm font-bold font-mono">{totalBill.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Paid</span>
          <span className="text-sm font-mono text-green-600 dark:text-green-400">{totalPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-2">
          <span className="text-xs font-medium">Balance</span>
          <span className={`text-sm font-bold font-mono ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
            {balance.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Transactions() {
  const { list: purchasesHook, create: createPurchase, remove: removePurchase } = usePurchases();
  const { list: transfersHook, create: createTransfer, remove: removeTransfer } = useStockTransfers();
  const { list: paymentsHook, create: createPayment, remove: removePayment, update: updatePayment } = useSupplierPayments();
  const items = normalizeList(useItems().list.data);
  const warehouses = normalizeList(useWarehouses().list.data);
  const suppliers = normalizeList(useSuppliers().list.data);
  const owners = normalizeList(useOwners().list.data);
  const { data: adminSettings } = useAdminSettings();

  const { data: purchases, isLoading: pLoading } = purchasesHook;
  const { data: transfers, isLoading: tLoading } = transfersHook;
  const { data: payments, isLoading: payLoading } = paymentsHook;
  const { data: vendorSummary } = useVendorSummary();
  const { data: overduePayments } = useOverduePayments();
  const { data: upcomingPayments } = useUpcomingPayments();

  const [pOpen, setPOpen] = useState(false);
  const [iOpen, setIOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [editingTransfer, setEditingTransfer] = useState<any>(null);

  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseDateFilter, setPurchaseDateFilter] = useState("");
  const [purchaseSupplierFilter, setPurchaseSupplierFilter] = useState("all");
  const [purchaseWarehouseFilter, setPurchaseWarehouseFilter] = useState("all");
  const [purchaseMonthFilter, setPurchaseMonthFilter] = useState("");
  const [vendorSummarySearch, setVendorSummarySearch] = useState("");

  const [issueMonthFilter, setIssueMonthFilter] = useState("");
  const [paymentMonthFilter, setPaymentMonthFilter] = useState("");



  const matchesMonth = (dateStr: string, monthFilter: string) => {
    if (!monthFilter) return true;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const filterDate = new Date(monthFilter + "-01");
    return date.getFullYear() === filterDate.getFullYear() && date.getMonth() === filterDate.getMonth();
  };

  const filteredPurchases = purchases?.filter((p: any) => {
    const matchesSearch = purchaseSearch === "" ||
      (p.supplier && p.supplier.toLowerCase().includes(purchaseSearch.toLowerCase())) ||
      (p.warehouse && p.warehouse.toLowerCase().includes(purchaseSearch.toLowerCase()));

    const matchesDate = purchaseDateFilter === "" || p.purchaseDate === purchaseDateFilter;

    const matchesSupplier = purchaseSupplierFilter === "all" ||
      String(p.supplierId) === purchaseSupplierFilter;

    const matchesWarehouse = purchaseWarehouseFilter === "all" ||
      String(p.warehouseId) === purchaseWarehouseFilter;

    const monthMatch = matchesMonth(p.purchaseDate, purchaseMonthFilter);

    return matchesSearch && matchesDate && matchesSupplier && matchesWarehouse && monthMatch;
  });

  const filteredVendorSummary = vendorSummary?.filter((v: any) => {
    if (vendorSummarySearch === "") return true;
    const supplierName = (v.supplier || v.supplierName || "").toLowerCase();
    return supplierName.includes(vendorSummarySearch.toLowerCase());
  });

  const filteredTransfers = transfers?.filter((t: any) => matchesMonth(t.transferDate, issueMonthFilter));
  const filteredPayments = payments?.filter((p: any) => matchesMonth(p.paymentDate, paymentMonthFilter));

  const clearPurchaseFilters = () => {
    setPurchaseSearch("");
    setPurchaseDateFilter("");
    setPurchaseSupplierFilter("all");
    setPurchaseWarehouseFilter("all");
    setPurchaseMonthFilter("");
  };

  const hasActiveFilters = purchaseSearch !== "" || purchaseDateFilter !== "" || purchaseSupplierFilter !== "all" || purchaseWarehouseFilter !== "all" || purchaseMonthFilter !== "";

  const handleDeletePurchase = (id: number) => {
    removePurchase.mutate(id);
  };

  const handleEditPurchase = (purchase: any) => {
    setEditingPurchase(purchase);
    setPOpen(true);
  };

  const handleDeleteTransfer = (id: number) => {
    if (confirm("Are you sure you want to delete this transfer?")) {
      removeTransfer.mutate(id);
    }
  };

  const handleEditTransfer = (transfer: any) => {
    setEditingTransfer(transfer);
    setIOpen(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setPayOpen(true);
  };

  const handleDeletePayment = (id: number) => {
    if (confirm("Are you sure you want to delete this payment?")) {
      removePayment.mutate(id);
    }
  };

  const handlePaymentDialogClose = (open: boolean) => {
    setPayOpen(open);
    if (!open) {
      setEditingPayment(null);
    }
  };


  const getItemName = (id: number) => items?.find((i: any) => i.id === id)?.name || String(id);
  const getWarehouseName = (id: number) => warehouses?.find((w: any) => w.id === id)?.name || String(id);
  const getSupplierName = (id: number) => suppliers?.find((s: any) => s.id === id)?.name || String(id);
  const getOwnerName = (id: number) => owners?.find((o: any) => o.id === id)?.name || String(id);

  const handleExportPurchases = async () => {
    if (!filteredPurchases?.length) return;
    const data = formatPurchasesForExport(filteredPurchases, suppliers);
    await exportToExcel(data, purchaseColumns, 'purchases');
  };

  const handleBulkExport = async () => {
    if (!purchases?.length) return;
    await exportPurchasesBulk(purchases);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      purchasesHook.importExcel.mutate(file, {
        onSuccess: () => {
          e.target.value = ""; // Reset
        }
      });
    }
  };


  const handleExportTransfers = async () => {
    if (!transfers?.length) return;
    const data = formatIssuesForExport(transfers, getItemName, getWarehouseName);
    await exportToExcel(data, issueColumns, 'stock-transfers');
  };

  const handleExportPayments = async () => {
    if (!payments?.length) return;
    const data = formatPaymentsForExport(payments, getSupplierName, getOwnerName);
    await exportToExcel(data, paymentColumns, 'payments');
  };

  const handleExportSinglePurchase = async (purchase: any) => {
    // Find full supplier details
    const supplier = suppliers.find((s: any) => s.id === purchase.supplierId);

    // Construct rich object for export
    const orderData = {
      ...purchase,
      id: purchase.id,
      date: purchase.purchaseDate,
      supplier: purchase.supplier,
      supplierContact: supplier?.personName,
      supplierPhone: supplier?.contactInfo,
      supplierAddress: supplier?.address,
      warehouse: purchase.warehouse, // used as Ship To
      // Line items are already in purchase object from the row data (if passed correctly)
      // But PurchaseRow usually passes the summary purchase object which has lineItems attached if expanded?
      // Actually, filteredPurchases in the parent component has the full object including lineItems.
      lineItems: purchase.lineItems
    };

    const companyInfo = {
      name: adminSettings?.data?.companyName || "My Company",
      address: adminSettings?.data?.address || "",
      phone: adminSettings?.data?.phone || "",
      fax: "", // Admin settings doesn't have fax currently
      website: adminSettings?.data?.email || "" // Using email as contact info
    };

    await exportOrderToExcel(orderData, 'PURCHASE ORDER', companyInfo);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? String(dateStr) : format(date, "dd MMM yyyy");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-display">Purchases</h1>
        <p className="text-muted-foreground">Record purchase orders and supplier payments.</p>
      </div>

      <Tabs defaultValue="purchases" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="purchases" data-testid="tab-purchases">Purchases</TabsTrigger>
          <TabsTrigger value="transfers" data-testid="tab-issues">Stock Transfers</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4">
          {filteredVendorSummary && filteredVendorSummary.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Vendor Summary</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={vendorSummarySearch}
                    onChange={(e) => setVendorSummarySearch(e.target.value)}
                    className="pl-9 w-[200px]"
                    data-testid="input-search-vendors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredVendorSummary.map((vendor: any, idx: number) => (
                  <VendorSummaryCard key={idx} vendor={vendor} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search supplier/warehouse..."
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                  data-testid="input-search-purchases"
                />
              </div>
              <Input
                type="month"
                value={purchaseMonthFilter}
                onChange={(e) => setPurchaseMonthFilter(e.target.value)}
                className="w-[160px]"
                data-testid="input-filter-month"
              />
              <Input
                type="date"
                value={purchaseDateFilter}
                onChange={(e) => setPurchaseDateFilter(e.target.value)}
                className="w-[160px]"
                data-testid="input-filter-date"
              />
              <Select value={purchaseSupplierFilter} onValueChange={setPurchaseSupplierFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-filter-supplier">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers?.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={purchaseWarehouseFilter} onValueChange={setPurchaseWarehouseFilter}>
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
                <Button variant="ghost" size="sm" onClick={clearPurchaseFilters} data-testid="button-clear-filters">
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                className="hidden"
                id="purchases-import-new"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('purchases-import-new')?.click()}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                data-testid="button-import-excel-purchases"
              >
                <Upload className="w-4 h-4 mr-1" /> Import Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                className="border-green-600 text-green-600 hover:bg-green-50"
                data-testid="button-bulk-export-purchases"
              >
                <Download className="w-4 h-4 mr-1" /> Bulk Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPurchases} disabled={!filteredPurchases?.length} data-testid="button-export-purchases">
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
              <Dialog open={pOpen} onOpenChange={(open) => {
                setPOpen(open);
                if (!open) setEditingPurchase(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="button-new-purchase">
                    <Plus className="w-4 h-4 mr-1" /> New Purchase
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingPurchase ? "Edit Purchase" : "Record Purchase"}</DialogTitle></DialogHeader>
                  <PurchaseForm
                    key={editingPurchase ? `edit-${editingPurchase.id}` : 'new'}
                    onSuccess={() => { setPOpen(false); setEditingPurchase(null); }}
                    initialData={editingPurchase}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[900px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left w-10"></th>
                  <th className="p-3 text-left text-sm font-medium">Date</th>
                  <th className="p-3 text-left text-sm font-medium">Supplier</th>
                  <th className="p-3 text-left text-sm font-medium">Warehouse</th>
                  <th className="p-3 text-center text-sm font-medium">Items</th>
                  <th className="p-3 text-right text-sm font-medium">Total</th>
                  <th className="p-3 text-right text-sm font-medium">Paid</th>
                  <th className="p-3 text-right text-sm font-medium">Remaining</th>
                  <th className="p-3 text-center text-sm font-medium">Due Date</th>
                  <th className="p-3 text-right text-sm font-medium w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pLoading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filteredPurchases?.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                    {hasActiveFilters ? "No purchases match your filters" : "No purchases yet"}
                  </td></tr>
                ) : (
                  filteredPurchases?.map((p: any) => <PurchaseRow key={p.id} purchase={p} items={items || []} onDelete={handleDeletePurchase} onEdit={handleEditPurchase} onExport={handleExportSinglePurchase} />)
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                type="month"
                value={issueMonthFilter}
                onChange={(e) => setIssueMonthFilter(e.target.value)}
                className="w-[160px]"
                data-testid="input-filter-issue-month"
              />
              {issueMonthFilter && (
                <Button variant="ghost" size="sm" onClick={() => setIssueMonthFilter("")} data-testid="button-clear-issue-filters">
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportTransfers} disabled={!filteredTransfers?.length} data-testid="button-export-issues">
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
              <Dialog open={iOpen} onOpenChange={(open) => {
                setIOpen(open);
                if (!open) setEditingTransfer(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="button-new-issue">
                    <Plus className="w-4 h-4 mr-1" /> Transfer Stock
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[95vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingTransfer ? "Edit Stock Transfer" : "Transfer Stock"}</DialogTitle></DialogHeader>
                  <StockTransferForm
                    key={editingTransfer ? `edit-${editingTransfer.id}` : 'new'}
                    onSuccess={() => { setIOpen(false); setEditingTransfer(null); }}
                    initialData={editingTransfer}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <DataTable
            data={filteredTransfers}
            isLoading={tLoading}
            columns={[
              {
                header: "Date",
                accessorKey: "transferDate",
                cell: (item: any) => formatDate(item.transferDate)
              },
              { header: "Item", cell: (item: any) => getItemName(item.itemId) },
              { header: "From", cell: (item: any) => getWarehouseName(item.fromWarehouseId) },
              { header: "To", cell: (item: any) => item.toWarehouseId ? getWarehouseName(item.toWarehouseId) : "Consumed/Issued" },
              { header: "Qty", accessorKey: "quantity", className: "font-bold" },
              { header: "Remarks", accessorKey: "remarks", className: "text-muted-foreground italic" },
              {
                header: "Actions",
                className: "w-24 text-right",
                cell: (item: any) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditTransfer(item)}
                      data-testid={`button-edit-issue-${item.id}`}
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteTransfer(item.id)}
                      data-testid={`button-delete-issue-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {/* Overdue Payments Alert */}
          {overduePayments && overduePayments.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Overdue Payments Alert!</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p className="font-semibold text-xs mb-2">You have {overduePayments.length} overdue payment(s):</p>
                  <ul className="text-xs space-y-1 ml-4 list-disc">
                    {overduePayments.map((p: any) => (
                      <li key={p.purchaseId}>
                        <span className="font-bold">{p.supplierName}</span>: ₹{Number(p.remainingAmount).toFixed(2)}
                        <span className="ml-2 text-[10px] uppercase">({p.daysOverdue} days overdue)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Upcoming Payments Alert */}
          {upcomingPayments && upcomingPayments.length > 0 && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100 italic">Upcoming Payments Alert!</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="mt-2 space-y-1">
                  <p className="font-semibold text-xs text-blue-800 dark:text-blue-200 mb-2">You have {upcomingPayments.length} payment(s) due within 7 days:</p>
                  <ul className="text-xs space-y-1 ml-4 list-disc text-blue-700 dark:text-blue-300">
                    {upcomingPayments.map((p: any) => (
                      <li key={p.purchaseId}>
                        <span className="font-bold">{p.supplierName}</span>: ₹{Number(p.remainingAmount).toFixed(2)}
                        <span className="ml-2 text-[10px] opacity-80">(Due in {p.daysUntilDue} days)</span>
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
                value={paymentMonthFilter}
                onChange={(e) => setPaymentMonthFilter(e.target.value)}
                className="w-[160px]"
              />
              {paymentMonthFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaymentMonthFilter("")}
                >
                  Clear
                </Button>
              )}
            </div>

            <Dialog open={payOpen} onOpenChange={handlePaymentDialogClose}>
              <DialogTrigger asChild>
                <Button size="sm">
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPayment ? "Edit Payment to Supplier" : "Record Payment to Supplier"}</DialogTitle>
                </DialogHeader>
                <PaymentForm
                  onSuccess={() => {
                    setPayOpen(false);
                    setEditingPayment(null);
                  }}
                  initialData={editingPayment}
                />
              </DialogContent>
            </Dialog>
          </div>

          <DataTable
            data={filteredPayments}
            isLoading={payLoading}
            columns={[
              {
                header: "Date",
                accessorKey: "paymentDate",
                cell: (row: any) => formatDate(row.paymentDate),
              },
              { header: "Paid By", accessorKey: "owner" },
              { header: "Paid To", accessorKey: "supplier" },
              {
                header: "Against",
                accessorKey: "purchaseId",
                cell: (row: any) => row.purchaseId ? `Purchase #${row.purchaseId}` : "General"
              },
              {
                header: "Amount",
                accessorKey: "amount",
                cell: (row: any) => Number(row.amount).toFixed(2),
              },
              { header: "Method", accessorKey: "paymentMethod" },
              {
                header: "Next Pymt Date",
                accessorKey: "nextPaymentDate",
                cell: (row: any) => row.nextPaymentDate ? formatDate(row.nextPaymentDate) : "-"
              },
              { header: "Remarks", accessorKey: "remarks" },
              {
                header: "Actions",
                className: "w-24 text-right",
                cell: (row: any) => (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditPayment(row)}
                      data-testid={`button-edit-payment-${row.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePayment(row.id)}
                      data-testid={`button-delete-payment-${row.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyMessage="No payments recorded yet"
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}


