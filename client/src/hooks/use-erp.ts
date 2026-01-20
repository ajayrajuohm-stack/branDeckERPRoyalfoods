import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/* =========================================================
   HELPERS
========================================================= */

function normalizeList(res: any) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

/* =========================================================
   GENERIC CRUD HELPER
========================================================= */

function useCrud(
  listUrl: string,
  createUrl: string,
  updateUrl: string,
  deleteUrl: string,
  entityName: string
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: [listUrl],
    queryFn: async () => {
      const res = await fetch(listUrl);
      if (!res.ok) throw new Error(`Failed to fetch ${entityName}`);
      return normalizeList(await res.json());
    },
  });

  const create = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Failed to create ${entityName}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listUrl] });
      toast({ title: "Success", description: `${entityName} created` });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(updateUrl.replace(":id", String(id)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error(`Failed to update ${entityName}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listUrl] });
      toast({ title: "Success", description: `${entityName} updated` });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(deleteUrl.replace(":id", String(id)), {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Failed to delete ${entityName}` }));
        throw new Error(errorData.message || `Failed to delete ${entityName}`);
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listUrl] });
      toast({ title: "Success", description: `${entityName} deleted` });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to delete ${entityName}`,
        variant: "destructive"
      });
    },
  });

  return { list, create, update, remove };
}

/* =========================================================
   MASTERS
========================================================= */

export const useItems = () =>
  useCrud("/api/items", "/api/items", "/api/items/:id", "/api/items/:id", "Item");

export const useCategories = () =>
  useCrud("/api/categories", "/api/categories", "/api/categories/:id", "/api/categories/:id", "Category");

export const useUoms = () =>
  useCrud("/api/uoms", "/api/uoms", "/api/uoms/:id", "/api/uoms/:id", "UOM");

export const useWarehouses = () =>
  useCrud("/api/warehouses", "/api/warehouses", "/api/warehouses/:id", "/api/warehouses/:id", "Warehouse");

export const useSuppliers = () =>
  useCrud("/api/suppliers", "/api/suppliers", "/api/suppliers/:id", "/api/suppliers/:id", "Supplier");

export const useCustomers = () =>
  useCrud("/api/customers", "/api/customers", "/api/customers/:id", "/api/customers/:id", "Customer");

export const useOwners = () =>
  useCrud("/api/owners", "/api/owners", "/api/owners/:id", "/api/owners/:id", "Owner");

export const useExpenseHeads = () =>
  useCrud("/api/expense-heads", "/api/expense-heads", "/api/expense-heads/:id", "/api/expense-heads/:id", "Expense Head");

export const usePaymentMethods = () =>
  useCrud("/api/payment-methods", "/api/payment-methods", "/api/payment-methods/:id", "/api/payment-methods/:id", "Payment Method");

/* =========================================================
   TRANSACTIONS
========================================================= */

export const usePurchases = () => {
  const baseCrud = useCrud("/api/purchases", "/api/purchases", "/api/purchases/:id", "/api/purchases/:id", "Purchase");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete Purchase" }));
        throw new Error(errorData.message || "Failed to delete Purchase");
      }
      return res.json().catch(() => ({}));
    },
    // 🚀 OPTIMISTIC UPDATE: Remove from UI immediately
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/purchases"] });
      const previous = queryClient.getQueryData(["/api/purchases"]);

      queryClient.setQueryData(["/api/purchases"], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.filter((item: any) => item.id !== id);
        if (old.data) return { ...old, data: old.data.filter((item: any) => item.id !== id) };
        return old;
      });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/overdue-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock"] });
      toast({ title: "Success", description: "Purchase deleted" });
    },
    onError: (error: Error, id, context: any) => {
      if (error.message.toLowerCase().includes("not found")) {
        queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
        return;
      }
      if (context?.previous) {
        queryClient.setQueryData(["/api/purchases"], context.previous);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete Purchase",
        variant: "destructive"
      });
    },
  });

  const importExcel = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/purchases/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Import failed" }));
        throw new Error(errorData.message || "Import failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock"] });
      toast({
        title: "Import Success",
        description: `Imported ${data.success} records. Failed: ${data.failed}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { ...baseCrud, remove, importExcel };
};

export const useSales = () => {
  const baseCrud = useCrud("/api/sales", "/api/sales", "/api/sales/:id", "/api/sales/:id", "Sale");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sales/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete Sale" }));
        throw new Error(errorData.message || "Failed to delete Sale");
      }
      return res.json().catch(() => ({}));
    },
    // 🚀 OPTIMISTIC UPDATE: Remove from UI immediately
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/sales"] });
      const previous = queryClient.getQueryData(["/api/sales"]);

      queryClient.setQueryData(["/api/sales"], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.filter((item: any) => item.id !== id);
        if (old.data) return { ...old, data: old.data.filter((item: any) => item.id !== id) };
        return old;
      });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/customer-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/overdue-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock"] });
      toast({ title: "Success", description: "Sale deleted" });
    },
    onError: (error: Error, id, context: any) => {
      if (error.message.toLowerCase().includes("not found")) {
        queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
        return;
      }
      if (context?.previous) {
        queryClient.setQueryData(["/api/sales"], context.previous);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete Sale",
        variant: "destructive"
      });
    },
  });

  const importExcel = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/sales/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Import failed" }));
        throw new Error(errorData.message || "Import failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock"] });
      toast({
        title: "Import Success",
        description: `Imported ${data.success} records. Failed: ${data.failed}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { ...baseCrud, remove, importExcel };
};

export const useStockTransfers = () =>
  useCrud("/api/stock-transfers", "/api/stock-transfers", "/api/stock-transfers/:id", "/api/stock-transfers/:id", "Stock Transfer");

/* =========================================================
   PRODUCTION
========================================================= */

export const useProduction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const result = useCrud("/api/production", "/api/production", "/api/production/:id", "/api/production/:id", "Production Run");

  // Override create to also invalidate stock queries
  const create = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        // Include details if available (for stock validation errors)
        const errorMessage = err.details
          ? `${err.message}\n\n${err.details}`
          : err.message || "Failed to create Production Run";
        const error = new Error(errorMessage);
        (error as any).details = err.details;
        (error as any).insufficientItems = err.insufficientItems;
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock"] });
      toast({ title: "Success", description: "Production Run created" });
    },
    onError: (e: Error & { details?: string; insufficientItems?: any[] }) => {
      // Show detailed error message
      const message = e.details || e.message;
      toast({
        title: "Production Failed",
        description: message,
        variant: "destructive",
        duration: e.insufficientItems ? 8000 : 5000, // Longer duration for detailed errors
      });
    },
  });

  // Override update to invalidate stock queries
  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/production/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const contentType = res.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
          const err = await res.json();
          throw new Error(err.message || `Failed to update Production Run`);
        } else {
          const text = await res.text();
          console.error("Non-JSON error response:", text);
          throw new Error(`Server error (${res.status}): Please check connection or server logs.`);
        }
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/detailed-dashboard"] });
      toast({ title: "Success", description: "Production Run updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/production/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete Production Run" }));
        throw new Error(errorData.message || "Failed to delete Production Run");
      }
      return res.json().catch(() => ({}));
    },
    // 🚀 OPTIMISTIC UPDATE: Remove from UI immediately
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/production"] });
      const previousRuns = queryClient.getQueryData(["/api/production"]);

      queryClient.setQueryData(["/api/production"], (old: any) => {
        if (!old) return old;
        // Handle both Array and {data: Array} formats
        if (Array.isArray(old)) return old.filter((run: any) => run.id !== id);
        if (old.data) return { ...old, data: old.data.filter((run: any) => run.id !== id) };
        return old;
      });

      return { previousRuns };
    },
    onSuccess: () => {
      // Invalidate all related data to ensure stock levels are correct
      queryClient.invalidateQueries({ queryKey: ["/api/production"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/detailed-dashboard"] });
      toast({ title: "Success", description: "Production Run deleted" });
    },
    onError: (error: Error, id, context: any) => {
      // 🛡️ SILENT RECOVERY: If it's already "Not Found", it's effectively deleted!
      if (error.message.includes("not found")) {
        queryClient.invalidateQueries({ queryKey: ["/api/production"] });
        return;
      }

      // Rollback if it was a real error
      if (context?.previousRuns) {
        queryClient.setQueryData(["/api/production"], context.previousRuns);
      }

      toast({
        title: "Error",
        description: error.message || "Failed to delete Production Run",
        variant: "destructive"
      });
    },
  });


  return { ...result, create, update, remove };

};

/* =========================================================
   BOM RECIPES
========================================================= */

export function useBomRecipes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ["bom-recipes"],
    queryFn: async () => {
      const res = await fetch("/api/bom-recipes");
      if (!res.ok) throw new Error("Failed to fetch BOM recipes");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/bom-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Create failed" }));
        throw new Error(error.message || "Create failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom-recipes"] });
      toast({ title: "Success", description: "BOM recipe created" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/bom-recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Update failed" }));
        throw new Error(error.message || "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom-recipes"] });
      toast({ title: "Success", description: "BOM recipe updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bom-recipes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message || "Delete failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom-recipes"] });
      toast({ title: "Success", description: "BOM recipe deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return { list, create, update, remove };
}

/* =========================================================
   REPORTS
========================================================= */

export const useStockReport = (warehouseId?: string) =>
  useQuery({
    queryKey: ["/api/reports/stock", warehouseId],
    queryFn: async () => {
      const url = warehouseId
        ? `/api/reports/stock?warehouseId=${warehouseId}`
        : "/api/reports/stock";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load stock report");
      return res.json();
    },
  });

export const useSupplierPaymentReport = (month?: number, year?: number, warehouseId?: string) =>
  useQuery({
    queryKey: ["/api/reports/supplier-payments", month, year, warehouseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (month) params.append("month", month.toString());
      if (year) params.append("year", year.toString());
      if (warehouseId) params.append("warehouseId", warehouseId);
      const url = `/api/reports/supplier-payments${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load supplier payment report");
      return res.json();
    },
  });

export const useCustomerSalesReport = (month?: number, year?: number, warehouseId?: string) =>
  useQuery({
    queryKey: ["/api/reports/customer-sales", month, year, warehouseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (month) params.append("month", month.toString());
      if (year) params.append("year", year.toString());
      if (warehouseId) params.append("warehouseId", warehouseId);
      const url = `/api/reports/customer-sales${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load customer sales report");
      return res.json();
    },
  });

export const useOverduePayments = () =>
  useQuery({
    queryKey: ["/api/reports/overdue-payments"],
    queryFn: async () => {
      const res = await fetch("/api/reports/overdue-payments");
      if (!res.ok) throw new Error("Failed to load overdue payments");
      return res.json();
    },
  });

export const useUpcomingPayments = () =>
  useQuery({
    queryKey: ["/api/reports/upcoming-payments"],
    queryFn: async () => {
      const res = await fetch("/api/reports/upcoming-payments");
      if (!res.ok) throw new Error("Failed to load upcoming payments");
      return res.json();
    },
  });

export const useOverdueSales = () =>
  useQuery({
    queryKey: ["/api/reports/overdue-sales"],
    queryFn: async () => {
      const res = await fetch("/api/reports/overdue-sales");
      if (!res.ok) throw new Error("Failed to load overdue sales");
      return res.json();
    },
  });

export const useUpcomingSales = () =>
  useQuery({
    queryKey: ["/api/reports/upcoming-sales"],
    queryFn: async () => {
      const res = await fetch("/api/reports/upcoming-sales");
      if (!res.ok) throw new Error("Failed to load upcoming sales");
      return res.json();
    },
  });

export const useDashboardStats = () =>
  useQuery({
    queryKey: ["/api/reports/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/reports/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard stats");
      return res.json();
    },
  });

export const useDetailedDashboard = (date?: string, warehouseId?: string) =>
  useQuery({
    queryKey: ["/api/reports/detailed-dashboard", date, warehouseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      if (warehouseId) params.append("warehouseId", warehouseId);
      const url = `/api/reports/detailed-dashboard${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load detailed dashboard");
      return res.json();
    },
  });

/* =========================================================
   SUPPLIER PAYMENTS
========================================================= */

export function useSupplierPayments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ["/api/supplier-payments"],
    queryFn: async () => {
      const res = await fetch("/api/supplier-payments");
      if (!res.ok) throw new Error("Failed to fetch payments");
      return normalizeList(await res.json());
    },
  });

  const create = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save payment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({ title: "Success", description: "Payment added" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/supplier-payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update payment" }));
        throw new Error(errorData.message || "Failed to update payment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({ title: "Success", description: "Payment updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment",
        variant: "destructive"
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/supplier-payments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete payment" }));
        throw new Error(errorData.message || "Failed to delete payment");
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({ title: "Success", description: "Payment deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment",
        variant: "destructive"
      });
    },
  });

  return { list, create, update, remove };
}

/* =========================================================
   CUSTOMER PAYMENTS
========================================================= */

export function useCustomerPayments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ["/api/customer-payments"],
    queryFn: async () => {
      const res = await fetch("/api/customer-payments");
      if (!res.ok) throw new Error("Failed to fetch customer payments");
      return normalizeList(await res.json());
    },
  });

  const create = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/customer-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save customer payment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/customer-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ title: "Success", description: "Payment received" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/customer-payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update receipt" }));
        throw new Error(errorData.message || "Failed to update receipt");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/customer-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ title: "Success", description: "Receipt updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update receipt",
        variant: "destructive"
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/customer-payments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete receipt" }));
        throw new Error(errorData.message || "Failed to delete receipt");
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/customer-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ title: "Success", description: "Receipt deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete receipt",
        variant: "destructive"
      });
    },
  });

  return { list, create, update, remove };
}

/* =========================================================
   VENDOR SUMMARY
========================================================= */

export const useVendorSummary = () =>
  useQuery({
    queryKey: ["/api/vendor-summary"],
    queryFn: async () => {
      const res = await fetch("/api/vendor-summary");
      if (!res.ok) throw new Error("Failed to load summary");
      return normalizeList(await res.json());
    },
  });

/* =========================================================
   CUSTOMER SUMMARY
========================================================= */

export const useCustomerSummary = () =>
  useQuery({
    queryKey: ["/api/customer-summary"],
    queryFn: async () => {
      const res = await fetch("/api/customer-summary");
      if (!res.ok) throw new Error("Failed to load customer summary");
      return normalizeList(await res.json());
    },
  });

/* =========================================================
   ADMIN
========================================================= */

export function useAdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const data = useQuery({
    queryKey: ["/api/admin"],
    queryFn: async () => {
      const res = await fetch("/api/admin");
      if (!res.ok) throw new Error("Failed to load admin settings");
      return res.json();
    },
  });

  const update = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update admin");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      toast({ title: "Success", description: "Admin settings saved" });
    },
  });

  return { data, update };
}

export const useReconcileStock = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/reconcile-stock", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Reconciliation failed" }));
        throw new Error(err.message || "Reconciliation failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/dashboard"] });
      toast({
        title: "Reconciliation Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useStockLedger = (itemId?: number, warehouseId?: number) =>
  useQuery({
    queryKey: ["/api/reports/stock-ledger", itemId, warehouseId],
    queryFn: async () => {
      if (!itemId) return [];
      const url = `/api/reports/stock-ledger/${itemId}${warehouseId ? `?warehouseId=${warehouseId}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load audit trail");
      return normalizeList(await res.json());
    },
    enabled: !!itemId,
  });

export const useWipeStock = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/wipe-stock-ledger", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Wipe failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/dashboard"] });
      toast({ title: "Stock Reset", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};
