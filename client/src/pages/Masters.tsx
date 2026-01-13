
import { useCustomers } from "@/hooks/use-customers";
import { CustomerForm, CustomerEditForm } from "@/components/forms/customer-form";
function normalizeList<T>(input: any): T[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.data)) return input.data;
  return [];
}
import { useState, useEffect } from "react";
import {
  useItems, useCategories, useUoms, useWarehouses,
  useSuppliers, useExpenseHeads, useOwners, usePaymentMethods,
  useBomRecipes, useAdminSettings
} from "@/hooks/use-erp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Trash2, Edit2, Save, Pencil, FileUp, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// --- Generic Master Component with Edit ---
function MasterView({
  title,
  hook,
  columns,
  FormComponent,
  EditFormComponent,
  searchPlaceholder = "Search...",
  onExport,
  importConfig
}: any) {
  const { list, remove } = hook();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);

  const handleImport = async () => {
    if (!importFile || !importConfig) return;

    setImportLoading(true);
    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch(importConfig.endpoint, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success > 0) {
        // Refresh list
        list.refetch();
      }
    } catch (error) {
      console.error("Import failed", error);
    } finally {
      setImportLoading(false);
    }
  };

  const closeImport = () => {
    setIsImportOpen(false);
    setImportFile(null);
    setImportResult(null);
  };

  const rows = Array.isArray(list.data)
    ? list.data
    : Array.isArray(list.data?.data)
      ? list.data.data
      : [];

  const filteredData = rows.filter((item: any) =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );


  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this record?")) {
      remove.mutate(id);
    }
  };

  const actionColumn = {
    header: "Actions",
    className: "w-[100px] text-right",
    cell: (item: any) => (
      <div className="flex justify-end gap-1">
        {EditFormComponent && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); setEditItem(item); }}
            data-testid={`button-edit-${item.id}`}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
          data-testid={`button-delete-${item.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    )
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h2 className="text-xl font-semibold font-display">{title}</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>

          {onExport && (
            <Button variant="outline" onClick={onExport} title="Export to Excel">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}

          {importConfig && (
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileUp className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import {title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Excel File</Label>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button onClick={handleImport} disabled={!importFile || importLoading} className="w-full">
                    {importLoading ? "Importing..." : "Upload & Import"}
                  </Button>

                  {importResult && (
                    <div className="text-sm space-y-1 p-2 bg-muted rounded">
                      <p>Total: {importResult.total}</p>
                      <p className="text-green-600">Success: {importResult.success}</p>
                      <p className="text-red-600">Failed: {importResult.failed}</p>
                      {importResult.errors?.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          <p className="font-semibold">Errors:</p>
                          <ul className="list-disc ml-4 text-xs">
                            {importResult.errors.map((e: any, idx: number) => (
                              <li key={idx}>Row {e.row}: {JSON.stringify(e.error)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-new">
                <Plus className="w-4 h-4 mr-2" /> Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add {title}</DialogTitle>
              </DialogHeader>
              <FormComponent onSuccess={() => setIsOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable
        data={filteredData}
        columns={[...columns, actionColumn]}
        isLoading={list.isLoading}
      />

      {editItem && EditFormComponent && (
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {title}</DialogTitle>
            </DialogHeader>
            <EditFormComponent item={editItem} onSuccess={() => setEditItem(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// --- Forms ---
function SimpleNameForm({ hook, onSuccess, label = "Name" }: any) {
  const { create } = hook();
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ name }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{label}</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} placeholder={`Enter ${label.toLowerCase()}`} data-testid="input-name" />
      </div>
      <Button type="submit" className="w-full" disabled={create.isPending} data-testid="button-submit">
        {create.isPending ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}

function SimpleNameEditForm({ hook, item, onSuccess, label = "Name" }: any) {
  const { update } = hook();
  const [name, setName] = useState(item.name || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({ id: item.id, name }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{label}</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} data-testid="input-name-edit" />
      </div>
      <Button type="submit" className="w-full" disabled={update.isPending} data-testid="button-save">
        {update.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

// Category Form with Type
function CategoryForm({ onSuccess }: { onSuccess: () => void }) {
  const { create } = useCategories();
  const [name, setName] = useState("");
  const [type, setType] = useState("RAW");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ name, type }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Category Name</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} data-testid="input-category-name" />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger data-testid="select-category-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RAW">Raw Material</SelectItem>
            <SelectItem value="SEMI_FINISHED">Semi Finished</SelectItem>
            <SelectItem value="FINISHED">Finished Good</SelectItem>
            <SelectItem value="PACKAGING">Packaging</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={create.isPending} data-testid="button-submit">
        {create.isPending ? "Creating..." : "Create Category"}
      </Button>
    </form>
  );
}

function CategoryEditForm({ item, onSuccess }: { item: any; onSuccess: () => void }) {
  const { update } = useCategories();
  const [name, setName] = useState(item.name || "");
  const [type, setType] = useState(item.type || "RAW");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({ id: item.id, name, type }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Category Name</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} data-testid="input-category-name-edit" />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger data-testid="select-category-type-edit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RAW">Raw Material</SelectItem>
            <SelectItem value="SEMI_FINISHED">Semi Finished</SelectItem>
            <SelectItem value="FINISHED">Finished Good</SelectItem>
            <SelectItem value="PACKAGING">Packaging</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={update.isPending} data-testid="button-save">
        {update.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

function ItemForm({ onSuccess }: { onSuccess: () => void }) {
  const { create } = useItems();
  const categoriesResponse = useCategories().list.data;
  const uomsResponse = useUoms().list.data;

  const categories = Array.isArray(categoriesResponse)
    ? categoriesResponse
    : Array.isArray(categoriesResponse?.data)
      ? categoriesResponse.data
      : [];

  const uoms = Array.isArray(uomsResponse)
    ? uomsResponse
    : Array.isArray(uomsResponse?.data)
      ? uomsResponse.data
      : [];


  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    categoryId: z.coerce.number().min(1, "Category is required"),
    defaultUomId: z.coerce.number().min(1, "UOM is required"),
    reorderLevel: z.coerce.number().min(0).default(0),
    hsnCode: z.string().optional(),
    gstRate: z.coerce.number().min(0).default(0),
    isActive: z.boolean().default(true),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      reorderLevel: 0,
      hsnCode: "",
      gstRate: 0,
      isActive: true,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    create.mutate(values, { onSuccess });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl><Input {...field} data-testid="input-item-name" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultUomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UOM</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-uom">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {uoms?.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center gap-4">
          <FormField
            control={form.control}
            name="reorderLevel"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Reorder Level</FormLabel>
                <FormControl><Input type="number" {...field} data-testid="input-reorder-level" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hsnCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HSN Code</FormLabel>
                <FormControl><Input {...field} data-testid="input-hsn-code" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gstRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GST Rate (%)</FormLabel>
                <FormControl><Input type="number" {...field} data-testid="input-gst-rate" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center gap-4">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2 pt-2">
                <FormLabel>Active</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={create.isPending} data-testid="button-submit">
          {create.isPending ? "Saving..." : "Save Item"}
        </Button>
      </form>
    </Form>
  );
}

function ItemEditForm({ item, onSuccess }: { item: any; onSuccess: () => void }) {
  const { update } = useItems();
  const categories = normalizeList<any>(useCategories().list.data);
  const uoms = normalizeList<any>(useUoms().list.data);


  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    categoryId: z.coerce.number().min(1, "Category is required"),
    defaultUomId: z.coerce.number().min(1, "UOM is required"),
    reorderLevel: z.coerce.number().min(0).default(0),
    hsnCode: z.string().optional(),
    gstRate: z.coerce.number().min(0).default(0),
    isActive: z.boolean().default(true),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: item.name || "",
      categoryId: item.categoryId || 0,
      defaultUomId: item.defaultUomId || 0,
      reorderLevel: Number(item.reorderLevel) || 0,
      hsnCode: item.hsnCode || "",
      gstRate: Number(item.gstRate) || 0,
      isActive: item.isActive ?? true,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    update.mutate({ id: item.id, ...values }, { onSuccess });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl><Input {...field} data-testid="input-item-name-edit" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category-edit">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultUomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UOM</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-uom-edit">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {uoms?.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center gap-4">
          <FormField
            control={form.control}
            name="reorderLevel"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Reorder Level</FormLabel>
                <FormControl><Input type="number" {...field} data-testid="input-reorder-level-edit" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hsnCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HSN Code</FormLabel>
                <FormControl><Input {...field} data-testid="input-hsn-code-edit" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gstRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GST Rate (%)</FormLabel>
                <FormControl><Input type="number" {...field} data-testid="input-gst-rate-edit" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center gap-4">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2 pt-2">
                <FormLabel>Active</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active-edit" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={update.isPending} data-testid="button-save">
          {update.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}

function SupplierForm({ onSuccess }: { onSuccess: () => void }) {
  const { create } = useSuppliers();

  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    personName: z.string().optional(),
    contactInfo: z.string().optional(),
    address: z.string().optional(),
    gstNumber: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", personName: "", contactInfo: "", address: "", gstNumber: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    create.mutate(values, { onSuccess });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Supplier Name</FormLabel>
            <FormControl><Input {...field} data-testid="input-supplier-name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="personName" render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Person</FormLabel>
            <FormControl><Input {...field} placeholder="Person name" data-testid="input-person-name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="contactInfo" render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Number</FormLabel>
            <FormControl><Input {...field} placeholder="Phone / Mobile" data-testid="input-contact" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl><Input {...field} placeholder="City, State" data-testid="input-address" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="gstNumber" render={({ field }) => (
          <FormItem>
            <FormLabel>GST Number</FormLabel>
            <FormControl><Input {...field} placeholder="GSTIN" data-testid="input-gst-number" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={create.isPending} data-testid="button-submit">
          {create.isPending ? "Creating..." : "Create Supplier"}
        </Button>
      </form>
    </Form>
  );
}

function SupplierEditForm({ item, onSuccess }: { item: any; onSuccess: () => void }) {
  const { update } = useSuppliers();

  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    personName: z.string().optional(),
    contactInfo: z.string().optional(),
    address: z.string().optional(),
    gstNumber: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: item.name || "", personName: item.personName || "", contactInfo: item.contactInfo || "", address: item.address || "", gstNumber: item.gstNumber || "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    update.mutate({ id: item.id, ...values }, { onSuccess });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Supplier Name</FormLabel>
            <FormControl><Input {...field} data-testid="input-supplier-name-edit" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="personName" render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Person</FormLabel>
            <FormControl><Input {...field} placeholder="Person name" data-testid="input-person-name-edit" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="contactInfo" render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Number</FormLabel>
            <FormControl><Input {...field} data-testid="input-contact-edit" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl><Input {...field} data-testid="input-address-edit" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="gstNumber" render={({ field }) => (
          <FormItem>
            <FormLabel>GST Number</FormLabel>
            <FormControl><Input {...field} data-testid="input-gst-number-edit" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={update.isPending} data-testid="button-save">
          {update.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}

function OwnerForm({ onSuccess }: { onSuccess: () => void }) {
  const { create } = useOwners();
  const [name, setName] = useState("");
  const [share, setShare] = useState("50");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ name, defaultSharePercentage: share }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Owner Name</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} data-testid="input-owner-name" />
      </div>
      <div className="space-y-2">
        <Label>Share Percentage</Label>
        <Input type="number" min="0" max="100" required value={share} onChange={e => setShare(e.target.value)} data-testid="input-share" />
      </div>
      <Button type="submit" className="w-full" disabled={create.isPending} data-testid="button-submit">
        {create.isPending ? "Creating..." : "Create Owner"}
      </Button>
    </form>
  );
}

function OwnerEditForm({ item, onSuccess }: { item: any; onSuccess: () => void }) {
  const { update } = useOwners();
  const [name, setName] = useState(item.name || "");
  const [share, setShare] = useState(item.defaultSharePercentage || "50");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({ id: item.id, name, defaultSharePercentage: share }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Owner Name</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} data-testid="input-owner-name-edit" />
      </div>
      <div className="space-y-2">
        <Label>Share Percentage</Label>
        <Input type="number" min="0" max="100" required value={share} onChange={e => setShare(e.target.value)} data-testid="input-share-edit" />
      </div>
      <Button type="submit" className="w-full" disabled={update.isPending} data-testid="button-save">
        {update.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

// --- BOM Tab ---
function BomTab() {
  const { list: bomList, create, update, remove } = useBomRecipes();

  // ===============================
  // HOOKS
  // ===============================
  const itemsHook: any = useItems();
  const categoriesHook: any = useCategories();

  // ===============================
  // NORMALIZE ITEMS & CATEGORIES
  // (handles data, data.data, direct array)
  // ===============================
  const itemList: any[] =
    Array.isArray(itemsHook.list?.data?.data)
      ? itemsHook.list.data.data
      : Array.isArray(itemsHook.list?.data)
        ? itemsHook.list.data
        : Array.isArray(itemsHook.list)
          ? itemsHook.list
          : [];

  const categoryList: any[] =
    Array.isArray(categoriesHook.list?.data?.data)
      ? categoriesHook.list.data.data
      : Array.isArray(categoriesHook.list?.data)
        ? categoriesHook.list.data
        : Array.isArray(categoriesHook.list)
          ? categoriesHook.list
          : [];

  // ===============================
  // STATE
  // ===============================
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const [recipeName, setRecipeName] = useState("");
  const [outputItemId, setOutputItemId] = useState("");
  const [outputQty, setOutputQty] = useState("1");
  const [inputLines, setInputLines] = useState<
    { itemId: string; quantity: string }[]
  >([]);

  // ===============================
  // HELPERS
  // ===============================
  const getItemName = (id: number) => {
    const item = itemList.find((i: any) => i.id === id);
    return item ? item.name : `Item ${id}`;
  };

  // ===============================
  // FILTERED ITEMS FOR BOM
  // ===============================
  const rawMaterialItems = itemList.filter((item: any) => {
    const cat = categoryList.find((c: any) => c.id === item.categoryId);
    const type = String(cat?.type || "").toUpperCase();
    return type.includes("RAW") || type.includes("PACKAGING");
  });

  const outputItems = itemList.filter((item: any) => {
    const cat = categoryList.find((c: any) => c.id === item.categoryId);
    const type = String(cat?.type || "").toUpperCase();
    return type.includes("FINISHED") || type.includes("SEMI");
  });

  // ===============================
  // FORM ACTIONS
  // ===============================
  const addInputLine = () => {
    setInputLines([...inputLines, { itemId: "", quantity: "" }]);
  };

  const updateInputLine = (
    index: number,
    field: "itemId" | "quantity",
    value: string
  ) => {
    const updated = [...inputLines];
    updated[index] = { ...updated[index], [field]: value };
    setInputLines(updated);
  };

  const removeInputLine = (index: number) => {
    setInputLines(inputLines.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setRecipeName("");
    setOutputItemId("");
    setOutputQty("1");
    setInputLines([]);
    setEditItem(null);
  };

  const openEdit = (bom: any) => {
    setEditItem(bom);
    setRecipeName(bom.name);
    setOutputItemId(String(bom.outputItemId));
    setOutputQty(String(bom.outputQuantity || "1"));
    setInputLines(
      (bom.lines || []).map((l: any) => ({
        itemId: String(l.itemId),
        quantity: String(l.quantity),
      }))
    );
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lines = inputLines
      .filter((l) => l.itemId && l.quantity)
      .map((l) => ({
        itemId: Number(l.itemId),
        quantity: l.quantity,
      }));

    if (editItem) {
      update.mutate(
        {
          id: editItem.id,
          name: recipeName,
          outputItemId: Number(outputItemId),
          outputQuantity: String(outputQty),
          isActive: editItem.isActive !== undefined ? editItem.isActive : true,
          lines,
        },
        {
          onSuccess: () => {
            setIsOpen(false);
            resetForm();
          },
        }
      );
    } else {
      create.mutate(
        {
          name: recipeName,
          outputItemId: Number(outputItemId),
          outputQuantity: outputQty,
          isActive: true,
          lines,
        },
        {
          onSuccess: () => {
            setIsOpen(false);
            resetForm();
          },
        }
      );
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Bill of Materials (BOM)</h2>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit BOM Recipe" : "Create BOM Recipe"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Recipe Name</Label>
                <Input
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Output Item</Label>
                  <Select
                    value={outputItemId}
                    onValueChange={setOutputItemId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select output item" />
                    </SelectTrigger>
                    <SelectContent>
                      {outputItems.map((item: any) => (
                        <SelectItem
                          key={item.id}
                          value={String(item.id)}
                        >
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Output Quantity</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={outputQty}
                    onChange={(e) => setOutputQty(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Input Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addInputLine}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Input
                  </Button>
                </div>

                <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2">
                  {inputLines.map((line, index) => (
                    <div key={index} className="flex gap-2">
                      <Select
                        value={line.itemId}
                        onValueChange={(v) =>
                          updateInputLine(index, "itemId", v)
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Raw material" />
                        </SelectTrigger>
                        <SelectContent>
                          {rawMaterialItems.map((item: any) => (
                            <SelectItem
                              key={item.id}
                              value={String(item.id)}
                            >
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-24"
                        value={line.quantity}
                        onChange={(e) =>
                          updateInputLine(index, "quantity", e.target.value)
                        }
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInputLine(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!outputItemId || inputLines.length === 0}
              >
                {editItem ? "Save Changes" : "Create Recipe"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={bomList.data}
        isLoading={bomList.isLoading}
        columns={[
          { header: "Recipe Name", accessorKey: "name" },
          {
            header: "Output",
            cell: (row: any) => getItemName(row.outputItemId),
          },
          { header: "Output Qty", accessorKey: "outputQuantity" },
          {
            header: "Inputs",
            cell: (row: any) => row.lines?.length || 0,
          },
          {
            header: "Actions",
            cell: (row: any) => (
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(row)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => remove.mutate(row.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// --- Admin Tab ---
function AdminTab() {
  const { data: adminData, update } = useAdminSettings();
  const [formData, setFormData] = useState({
    adminName: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    gspClientId: '',
    gspClientSecret: '',
    gspUsername: '',
    gspPassword: ''
  });

  useEffect(() => {
    if (adminData.data) {
      setFormData({
        adminName: adminData.data.adminName || 'Asif',
        companyName: adminData.data.companyName || '',
        phone: adminData.data.phone || '',
        email: adminData.data.email || '',
        address: adminData.data.address || '',
        gstNumber: adminData.data.gstNumber || '',
        gspClientId: adminData.data.gspClientId || '',
        gspClientSecret: adminData.data.gspClientSecret || '',
        gspUsername: adminData.data.gspUsername || '',
        gspPassword: adminData.data.gspPassword || ''
      });
    }
  }, [adminData.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(formData);
  };

  if (adminData.isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold font-display">Admin Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Admin Name</Label>
                <Input
                  value={formData.adminName}
                  onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                  data-testid="input-admin-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-business-address"
              />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input
                value={formData.gstNumber}
                onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                data-testid="input-company-gst"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">GST Portal Integration</CardTitle>
          <p className="text-sm text-muted-foreground">Enter GSP/API credentials to fetch E-Way Bills directly from the portal. Leave blank if not using API.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GSP Client ID</Label>
                <Input
                  value={formData.gspClientId || ""}
                  onChange={e => setFormData({ ...formData, gspClientId: e.target.value })}
                  placeholder="Client ID"
                />
              </div>
              <div className="space-y-2">
                <Label>GSP Client Secret</Label>
                <Input
                  type="password"
                  value={formData.gspClientSecret || ""}
                  onChange={e => setFormData({ ...formData, gspClientSecret: e.target.value })}
                  placeholder="Client Secret"
                />
              </div>
              <div className="space-y-2">
                <Label>API Username</Label>
                <Input
                  value={formData.gspUsername || ""}
                  onChange={e => setFormData({ ...formData, gspUsername: e.target.value })}
                  placeholder="API Username"
                />
              </div>
              <div className="space-y-2">
                <Label>API Password</Label>
                <Input
                  type="password"
                  value={formData.gspPassword || ""}
                  onChange={e => setFormData({ ...formData, gspPassword: e.target.value })}
                  placeholder="API Password"
                />
              </div>
            </div>
            <Button onClick={handleSubmit} type="button" disabled={update.isPending} data-testid="button-save-admin-api">
              <Save className="w-4 h-4 mr-2" />
              {update.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Masters() {
  const categories = normalizeList<any>(useCategories().list.data);
  const uoms = normalizeList<any>(useUoms().list.data);

  const getCategoryName = (id: number) => {
    const c = categories.find((c: any) => c.id === id);
    return c ? c.name : "-";
  };

  const getCategoryType = (id: number) => categories?.find((c: any) => c.id === id)?.type || '-';
  const getUomName = (id: number) => {
    const u = uoms.find((u: any) => u.id === id);
    return u ? u.name : "-";
  };

  const customersList = normalizeList<any>(useCustomers().list.data);
  const suppliersList = normalizeList<any>(useSuppliers().list.data);

  const handleExportCustomers = () => {
    const data = customersList.map(c => ({
      name: c.name,
      contactPerson: c.contactPerson,
      contactInfo: c.contactInfo,
      address: c.address,
      shippingAddress: c.shippingAddress,
      gstNumber: c.gstNumber
    }));
    const ws = XLSX.utils.json_to_sheet(data, {
      header: ["name", "contactPerson", "contactInfo", "address", "shippingAddress", "gstNumber"]
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "Customers.xlsx");
  };

  const handleExportSuppliers = () => {
    const data = suppliersList.map(s => ({
      name: s.name,
      personName: s.personName,
      contactInfo: s.contactInfo,
      address: s.address,
      gstNumber: s.gstNumber
    }));
    const ws = XLSX.utils.json_to_sheet(data, {
      header: ["name", "personName", "contactInfo", "address", "gstNumber"]
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
    XLSX.writeFile(wb, "Suppliers.xlsx");
  };


  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-display">Master Data</h1>
        <p className="text-muted-foreground">Manage your inventory definitions and partners.</p>
      </div>

      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-lg flex-wrap">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="uoms">UOMs</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="owners">Owners</TabsTrigger>
          <TabsTrigger value="bom">BOM</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="others">Others</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <MasterView
            title="Items"
            hook={useItems}
            FormComponent={ItemForm}
            EditFormComponent={ItemEditForm}
            columns={[
              { header: "Name", accessorKey: "name", className: "font-medium" },
              { header: "Category", cell: (item: any) => getCategoryName(item.categoryId) },
              { header: "UOM", cell: (item: any) => getUomName(item.defaultUomId) },
              { header: "HSN", accessorKey: "hsnCode" },
              { header: "GST %", accessorKey: "gstRate" },
              { header: "Reorder Lvl", accessorKey: "reorderLevel" },
              {
                header: "Status",
                cell: (item: any) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                )
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="categories">
          <MasterView
            title="Categories"
            hook={useCategories}
            FormComponent={CategoryForm}
            EditFormComponent={CategoryEditForm}
            columns={[
              { header: "Name", accessorKey: "name", className: "font-medium" },
              { header: "Type", accessorKey: "type" },
            ]}
          />
        </TabsContent>

        <TabsContent value="warehouses">
          <MasterView
            title="Warehouses"
            hook={useWarehouses}
            FormComponent={(props: any) => <SimpleNameForm hook={useWarehouses} {...props} label="Warehouse Name" />}
            EditFormComponent={(props: any) => <SimpleNameEditForm hook={useWarehouses} {...props} label="Warehouse Name" />}
            columns={[{ header: "Name", accessorKey: "name" }]}
          />
        </TabsContent>

        <TabsContent value="uoms">
          <MasterView
            title="Units of Measure"
            hook={useUoms}
            FormComponent={(props: any) => <SimpleNameForm hook={useUoms} {...props} label="Unit (e.g., kg, pcs)" />}
            EditFormComponent={(props: any) => <SimpleNameEditForm hook={useUoms} {...props} label="Unit Name" />}
            columns={[{ header: "Name", accessorKey: "name" }]}
          />
        </TabsContent>

        <TabsContent value="suppliers">
          <MasterView
            title="Suppliers"
            hook={useSuppliers}
            FormComponent={SupplierForm}
            EditFormComponent={SupplierEditForm}
            onExport={handleExportSuppliers}
            importConfig={{
              endpoint: "/api/import/suppliers"
            }}
            columns={[
              { header: "Name", accessorKey: "name" },
              { header: "Person", accessorKey: "personName" },
              { header: "Contact", accessorKey: "contactInfo" },
              { header: "Address", accessorKey: "address" },
            ]}
          />
        </TabsContent>

        <TabsContent value="customers">
          <MasterView
            title="Customers"
            hook={useCustomers}
            FormComponent={CustomerForm}
            EditFormComponent={CustomerEditForm}
            onExport={handleExportCustomers}
            importConfig={{
              endpoint: "/api/import/customers"
            }}
            columns={[
              { header: "Name", accessorKey: "name", className: "font-medium" },
              { header: "Contact Person", accessorKey: "contactPerson" },
              { header: "Contact", accessorKey: "contactInfo" },
              { header: "Address", accessorKey: "address" },
            ]}
          />
        </TabsContent>


        <TabsContent value="owners">
          <MasterView
            title="Business Owners"
            hook={useOwners}
            FormComponent={OwnerForm}
            EditFormComponent={OwnerEditForm}
            columns={[
              { header: "Name", accessorKey: "name", className: "font-medium" },
              { header: "Share %", accessorKey: "defaultSharePercentage" },
            ]}
          />
        </TabsContent>

        <TabsContent value="bom">
          <BomTab />
        </TabsContent>

        <TabsContent value="admin">
          <AdminTab />
        </TabsContent>

        <TabsContent value="others">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Expense Heads</CardTitle>
              </CardHeader>
              <CardContent>
                <MasterView
                  title=""
                  hook={useExpenseHeads}
                  FormComponent={(props: any) => <SimpleNameForm hook={useExpenseHeads} {...props} label="Expense Head Name" />}
                  EditFormComponent={(props: any) => <SimpleNameEditForm hook={useExpenseHeads} {...props} label="Expense Head Name" />}
                  columns={[{ header: "Name", accessorKey: "name", className: "font-medium" }]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <MasterView
                  title=""
                  hook={usePaymentMethods}
                  FormComponent={(props: any) => <SimpleNameForm hook={usePaymentMethods} {...props} label="Payment Method Name" />}
                  EditFormComponent={(props: any) => <SimpleNameEditForm hook={usePaymentMethods} {...props} label="Payment Method Name" />}
                  columns={[{ header: "Name", accessorKey: "name", className: "font-medium" }]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
