import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, X, Trash2, Edit, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useBomRecipes,
  useItems,
  useWarehouses,
  useStockReport,
  useProduction,
  useAdminSettings
} from "@/hooks/use-erp";
import { exportProductionOrderToExcel } from "@/lib/excel-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";


/* =====================================================
   PRODUCTION (EOD – EXCEL STYLE)
===================================================== */

// 🔑 SAFE NORMALIZER (IMPORTANT)
function normalizeList<T>(input: any): T[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.data)) return input.data;
  return [];
}

export default function Production() {
  /* =====================
     STATE (must be declared before hooks that use them)
  ====================== */
  const [bomId, setBomId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const { toast } = useToast();

  /* =====================
     HOOKS
  ====================== */
  const bomHook = useBomRecipes();
  const itemsHook = useItems();
  const warehousesHook = useWarehouses();
  const stockHook = useStockReport(warehouseId ? String(warehouseId) : undefined);
  const productionHook = useProduction();
  const { data: adminSettings } = useAdminSettings();

  const companyInfo = {
    name: adminSettings?.data?.companyName || "My Company",
    address: adminSettings?.data?.address || "",
    phone: adminSettings?.data?.phone || "",
    email: adminSettings?.data?.email || ""
  };


  /* =====================
     NORMALIZED DATA ✅
  ====================== */
  const bomList = normalizeList<any>(bomHook.list?.data);
  const itemList = normalizeList<any>(itemsHook.list?.data);
  const warehouseList = normalizeList<any>(warehousesHook.list?.data);
  const stockList = normalizeList<any>(stockHook.data);
  const productionRuns = normalizeList<any>(productionHook.list?.data);

  /* =====================
     REMAINING STATE
  ====================== */
  const [batches, setBatches] = useState<number>(1);
  const [actualOutput, setActualOutput] = useState<number>(0);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [editingRunId, setEditingRunId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState<string>("");
  const [productionDate, setProductionDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  /* =====================
     SELECTED BOM
  ====================== */
  const selectedBom = useMemo(
    () => bomList.find((b) => b.id === bomId),
    [bomId, bomList]
  );

  /* =====================
     HELPERS
  ====================== */
  const getItemName = (id: number) =>
    itemList.find((i) => i.id === id)?.name || `Item ${id}`;

  const getOpeningStock = (itemId: number) => {
    if (!warehouseId) return 0;
    // Use loose comparison or explicit casting to handle potential string/number mismatches
    const stockItem = stockList.find(
      (s: any) => Number(s.itemId) === Number(itemId) && Number(s.warehouseId) === Number(warehouseId)
    );
    return stockItem ? Number(stockItem.quantity || 0) : 0;
  };

  /* =====================
     INITIALIZE CONSUMPTIONS
  ====================== */
  useEffect(() => {
    if (!selectedBom || !selectedBom.lines || selectedBom.lines.length === 0) {
      setConsumptions([]);
      return;
    }

    // Determine correct batches count to use for initialization
    let initialBatches = batches;
    if (editingRunId) {
      const run = productionRuns.find(r => r.id === editingRunId);
      if (run) initialBatches = Number(run.batchCount || 1);
    }

    const rows = selectedBom.lines.map((line: any) => {
      let opening = getOpeningStock(line.itemId);

      // saved opening from editingRunId
      if (editingRunId) {
        const run = productionRuns.find(r => r.id === editingRunId);
        const savedConsumption = run?.consumptions?.find((c: any) => Number(c.itemId) === Number(line.itemId));
        if (savedConsumption && savedConsumption.opening !== undefined) {
          opening = Number(savedConsumption.opening);
        }
      }

      const standardQty = Number(line.quantity) * initialBatches;
      let actualQty = standardQty;

      // saved actual from editingRunId
      if (editingRunId) {
        const run = productionRuns.find(r => r.id === editingRunId);
        const savedConsumption = run?.consumptions?.find((c: any) => Number(c.itemId) === Number(line.itemId));
        if (savedConsumption) {
          actualQty = Number(savedConsumption.actualQty);
        }
      }

      const systemClosing = opening - actualQty;
      let finalClosing = systemClosing;
      let variance = 0;

      if (editingRunId) {
        const run = productionRuns.find(r => r.id === editingRunId);
        const savedConsumption = run?.consumptions?.find((c: any) => Number(c.itemId) === Number(line.itemId));
        if (savedConsumption && savedConsumption.variance !== undefined) {
          variance = Number(savedConsumption.variance);
          finalClosing = systemClosing - variance;
        }
      }

      return {
        id: line.itemId, // Fix for DataTable key
        itemId: line.itemId,
        itemName: getItemName(line.itemId),
        perBatchQty: Number(line.quantity),
        opening,
        standardQty,
        actualQty,
        finalClosing,
        variance,
        remarks: editingRunId
          ? productionRuns.find(r => r.id === editingRunId)?.consumptions?.find((c: any) => Number(c.itemId) === Number(line.itemId))?.remarks || ""
          : "",
      };
    });

    setConsumptions(rows);
  }, [bomId, editingRunId]);
  // Removed batches, stockList, etc. from here

  /* =====================
     SYNC OPENING STOCK & NAMES
  ====================== */
  useEffect(() => {
    if (consumptions.length === 0 || editingRunId) return;

    setConsumptions(prev => prev.map(c => {
      const currentOpening = getOpeningStock(c.itemId);
      // Recalculate closing and variance with new opening
      const systemClosing = currentOpening - c.actualQty;

      return {
        ...c,
        itemName: getItemName(c.itemId),
        opening: currentOpening,
        // When opening changes, system closing changes. 
        // We should adjust variance to keep finalClosing (physical count) stable?
        // Or keep variance stable and let finalClosing move?
        // Usually, if stock updates in background, the calculated System Closing changes.
        // Let's keep the logic simple: update opening and recalculate everything.
        variance: systemClosing - c.finalClosing
      };
    }));
  }, [stockList, warehouseId, itemList]);

  // Added bomId to dependencies to ensure it re-runs when BOM changes

  /* =====================
     UPDATE PER BATCH
  ====================== */
  const updatePerBatch = (index: number, value: number) => {
    const updated = [...consumptions];
    updated[index].perBatchQty = value;
    updated[index].standardQty = value * batches;
    updated[index].actualQty = updated[index].standardQty;

    // Recalculate closing and variance
    const systemClosing = updated[index].opening - updated[index].actualQty;
    updated[index].finalClosing = systemClosing;
    updated[index].variance = 0;

    setConsumptions(updated);
  };

  /* =====================
     UPDATE ACTUAL QTY
  ====================== */
  const updateActual = (index: number, value: number) => {
    const updated = [...consumptions];
    updated[index].actualQty = value;

    // Recalculate System Closing
    const systemClosing = updated[index].opening - value;

    // Variance = System Closing - Final Closing
    updated[index].variance = systemClosing - updated[index].finalClosing;

    setConsumptions(updated);
  };

  /* =====================
     UPDATE FINAL CLOSING
  ====================== */
  const updateFinalClosing = (index: number, value: number) => {
    const updated = [...consumptions];
    updated[index].finalClosing = value;

    // System Closing = Opening - Actual
    const systemClosing = updated[index].opening - updated[index].actualQty;

    // Variance = System Closing - Final Closing
    updated[index].variance = systemClosing - value;

    setConsumptions(updated);
  };


  /* =====================
     OUTPUT CALCULATION
  ====================== */
  const expectedOutput =
    selectedBom && batches
      ? Number(selectedBom.outputQuantity) * batches
      : 0;

  // Output is independent now. We don't validiate or show difference against "expected" 
  // because "expected" was batch-based, which user said is unrelated to final output.
  const outputDifference = 0; // Disabled difference calculation

  /* =====================
     FILTER PRODUCTION RUNS
  ====================== */
  const filteredProductionRuns = productionRuns.filter((run: any) => {
    if (!run.productionDate) return false;

    // Date filter (exact match)
    if (dateFilter !== "") {
      const runDate = run.productionDate.split('T')[0]; // Handle ISO format
      if (runDate !== dateFilter) return false;
    }

    // Month filter (year-month match)
    if (monthFilter !== "") {
      const runDate = run.productionDate.split('T')[0]; // Handle ISO format
      const runYearMonth = runDate.substring(0, 7); // Extract YYYY-MM
      if (runYearMonth !== monthFilter) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setDateFilter("");
    setMonthFilter("");
  };

  const hasActiveFilters = dateFilter !== "" || monthFilter !== "";

  /* =====================
     EDIT PRODUCTION RUN
  ====================== */
  const handleEdit = (run: any) => {
    // Find the BOM that matches this production run
    const matchingBom = bomList.find((bom: any) => bom.outputItemId === run.outputItemId);

    if (matchingBom) {
      setEditingRunId(run.id);
      setBomId(matchingBom.id);
      setWarehouseId(run.warehouseId);
      setActualOutput(Number(run.outputQuantity));
      setBatches(Number(run.batchCount || 1));
      setRemarks(run.remarks || "");
      if (run.productionDate) {
        setProductionDate(format(new Date(run.productionDate), "yyyy-MM-dd"));
      }

      // Note: useEffect will handle setting consumptions based on selectedBom, batches and editingRunId

      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* =====================
     DELETE PRODUCTION RUN
  ====================== */
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this production run? Stock will be reversed.")) {
      productionHook.remove.mutate(id);
    }
  };

  /* =====================
     CANCEL EDIT
  ====================== */
  const handleCancelEdit = () => {
    setEditingRunId(null);
    setBomId(null);
    setWarehouseId(null);
    setBatches(1);
    setActualOutput(0);
    setConsumptions([]);
    setRemarks("");
    setProductionDate(format(new Date(), "yyyy-MM-dd"));
  };

  /* =====================
     SAVE PRODUCTION
  ====================== */
  const handleSave = () => {
    if (!selectedBom || !warehouseId) {
      alert("Please select BOM and Warehouse");
      return;
    }

    if (actualOutput <= 0) {
      alert("Actual Output must be greater than 0");
      return;
    }

    if (!consumptions || consumptions.length === 0) {
      alert("No raw materials found in BOM. Please check BOM configuration.");
      return;
    }

    // 🔐 VALIDATION: WARN BUT ALLOW
    const negativeStockItems = consumptions.filter(c => {
      // Check if Closing Stock (Opening - Actual) will be negative
      return (Number(c.opening) - Number(c.actualQty)) < 0;
    });

    if (negativeStockItems.length > 0) {
      const confirmed = confirm(
        "⚠️ WARNING: Insufficient Stock!\n\n" +
        "The following items will have NEGATIVE stock balance:\n" +
        negativeStockItems.map(i => `- ${i.itemName}: Current ${i.opening}, Consuming ${i.actualQty}`).join("\n") +
        "\n\nDo you want to proceed with NEGATIVE inventory?"
      );

      if (!confirmed) return;
    }

    // If editing, use the update mutation
    if (editingRunId) {
      console.log("Updating production run:", editingRunId);

      const payload = {
        productionDate: productionDate,
        outputItemId: selectedBom.outputItemId,
        outputQuantity: actualOutput,
        warehouseId,
        consumptions: consumptions.map((r) => ({
          itemId: r.itemId,
          standardQty: r.standardQty,
          actualQty: r.actualQty,
          opening: r.opening,
          variance: r.variance,
          remarks: r.remarks,
        })),
        batchCount: batches,
        remarks: remarks,
      };

      productionHook.update.mutate(
        { id: editingRunId, ...payload },
        {
          onSuccess: () => {
            toast({
              title: "Production Updated",
              description: `Run #${editingRunId} updated successfully.`,
            });
            handleCancelEdit(); // Reset form
          },
        }
      );
    } else {
      createProductionRun();
    }
  };

  const createProductionRun = () => {
    console.log("Saving production with data:", {
      productionDate: productionDate,
      outputItemId: selectedBom.outputItemId,
      outputQuantity: actualOutput,
      warehouseId,
      consumptions: consumptions.map((r) => ({
        itemId: r.itemId,
        standardQty: r.standardQty,
        actualQty: r.actualQty,
      })),
    });

    productionHook.create.mutate(
      {
        productionDate: productionDate,
        outputItemId: selectedBom.outputItemId,
        outputQuantity: actualOutput,
        warehouseId,
        consumptions: consumptions.map((r) => ({
          itemId: r.itemId,
          standardQty: r.standardQty,
          actualQty: r.actualQty,
          opening: r.opening, // Send opening stock to backend
          variance: r.variance, // Send variance for stock adjustment
          remarks: r.remarks, // Send remarks
        })),
        batchCount: batches, // Send the batch count explicitely
        remarks: remarks, // Send remarks
      },
      {
        onSuccess: () => {
          toast({
            title: "Production Saved",
            description: `Stock Updated: +${actualOutput} units of ${getItemName(selectedBom.outputItemId)}`,
          });

          // Reset form
          handleCancelEdit();
        },
      }
    );
  };

  /* =====================
     UI
  ====================== */
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Production (EOD) v2</h1>

      {editingRunId && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-900 dark:text-blue-100 font-medium">
                Editing Production Run #{editingRunId}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              Cancel Edit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* HEADER */}
      <Card>
        <CardHeader>
          <CardTitle>Production Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            type="date"
            value={productionDate}
            onChange={(e) => setProductionDate(e.target.value)}
            className="w-full"
          />

          <Select
            onValueChange={(v) => setBomId(Number(v))}
            value={bomId ? String(bomId) : ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select BOM" />
            </SelectTrigger>
            <SelectContent>
              {bomList.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(v) => setWarehouseId(Number(v))}
            value={warehouseId ? String(warehouseId) : ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouseList.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            min={1}
            value={batches}
            onChange={(e) => {
              const val = Number(e.target.value);
              setBatches(val);
              // Update all standard + actual quantities based on current perBatchQty in UI
              setConsumptions(prev => prev.map(c => {
                const std = c.perBatchQty * val;
                const sysClosing = c.opening - std;
                return {
                  ...c,
                  standardQty: std,
                  actualQty: std, // Re-default actual to standard when batches change
                  finalClosing: sysClosing,
                  variance: 0
                };
              }));
            }}
            placeholder="Batches"
          />



        </CardContent>
      </Card>

      {/* OUTPUT SUMMARY */}
      {selectedBom && (
        <Card>
          <CardContent className="flex items-center gap-6 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap">Final Output:</span>
              <Input
                type="number"
                value={actualOutput}
                onChange={(e) => setActualOutput(Number(e.target.value))}
                className="w-32 h-9"
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* RAW MATERIAL TABLE */}
      <DataTable
        data={consumptions}
        columns={[
          { header: "Item", accessorKey: "itemName" },
          {
            header: "Per Batch",
            cell: (row: any) => {
              const index = consumptions.findIndex(r => r.itemId === row.itemId);
              return (
                <Input
                  type="number"
                  step="0.001"
                  value={row.perBatchQty}
                  onChange={(e) => updatePerBatch(index, Number(e.target.value))}
                  className="w-24 h-8"
                />
              );
            }
          },

          { header: "Opening", accessorKey: "opening" },
          { header: "Standard", accessorKey: "standardQty" },
          {
            header: "Actual",
            cell: (row: any) => {
              const index = consumptions.findIndex(
                (r) => r.itemId === row.itemId
              );
              return (
                <Input
                  type="number"
                  value={row.actualQty}
                  onChange={(e) =>
                    updateActual(index, Number(e.target.value))
                  }
                />
              );
            },
          },
          {
            header: "Closing Stock",
            cell: (row: any) => {
              const closing = row.opening - row.actualQty;
              return (
                <div className="font-mono text-center">
                  {closing.toFixed(2)}
                </div>
              );
            },
          },
          {
            header: "Actual Closing",
            cell: (row: any) => {
              const index = consumptions.findIndex((r) => r.itemId === row.itemId);
              return (
                <Input
                  type="number"
                  value={row.finalClosing} // Assumes row.finalClosing is initialized
                  onChange={(e) => updateFinalClosing(index, Number(e.target.value))}
                  className="w-24 h-8"
                />
              );
            },
          },
          {
            header: "Diff",
            cell: (row: any) => (
              <Badge
                variant={row.variance === 0 ? "outline" : row.variance < 0 ? "destructive" : "default"}
                className={`font-mono ${row.variance > 0 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}`}
              >
                {row.variance > 0 ? "+" : ""}{Number(row.variance).toFixed(2)}
              </Badge>
            ),
          },
          {
            header: "Remarks",
            cell: (row: any) => {
              const index = consumptions.findIndex((r) => r.itemId === row.itemId);
              return (
                <Input
                  value={row.remarks || ""}
                  onChange={(e) => {
                    const updated = [...consumptions];
                    updated[index].remarks = e.target.value;
                    setConsumptions(updated);
                  }}
                  className="w-32 h-8"
                  placeholder="Note..."
                />
              );
            }
          },
        ]}
      />

      <Input
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Remarks (Optional)"
        className="mb-4"
      />

      <Button
        onClick={handleSave}
        className="w-full"
        disabled={!selectedBom || !warehouseId || productionHook.create.isPending || productionHook.update.isPending}
      >
        {productionHook.create.isPending || productionHook.update.isPending ? "Processing..." : editingRunId ? "Update Production (EOD)" : "Save Production (EOD)"}
      </Button>

      {/* PRODUCTION RUNS HISTORY */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Production History</CardTitle>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-[160px]"
                placeholder="Filter by date"
              />
              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-[160px]"
                placeholder="Filter by month"
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left w-10"></th>
                  <th className="p-3 text-left text-sm font-medium">Date</th>
                  <th className="p-3 text-left text-sm font-medium">Output Item</th>
                  <th className="p-3 text-center text-sm font-medium">Quantity</th>
                  <th className="p-3 text-left text-sm font-medium">Warehouse</th>
                  <th className="p-3 text-center text-sm font-medium">Batches</th>
                  <th className="p-3 text-left text-sm font-medium">Remarks</th>
                  <th className="p-3 text-right text-sm font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductionRuns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {hasActiveFilters ? "No production runs match your filters" : "No production runs yet"}
                    </td>
                  </tr>
                ) : (
                  filteredProductionRuns.map((run: any) => (
                    <>
                      <tr
                        key={run.id}
                        className="hover-elevate border-b transition-colors"
                      >
                        <td
                          className="p-3 cursor-pointer"
                          onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                        >
                          {expandedRun === run.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="p-3">{run.productionDate ? format(new Date(run.productionDate), "dd MMM yyyy") : "-"}</td>
                        <td className="p-3 font-medium">{run.outputItemName}</td>
                        <td className="p-3 text-center font-mono font-bold text-green-700 dark:text-green-400">
                          {Number(run.outputQuantity).toFixed(2)}
                        </td>
                        <td className="p-3">{run.warehouseName}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="font-mono">
                            {Number(run.batchCount || 1)}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground truncate max-w-[150px]" title={run.remarks}>
                          {run.remarks || "-"}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportProductionOrderToExcel(run, companyInfo);
                              }}
                              title="Download Production Order"
                            >
                              <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(run);
                              }}
                              title="Edit production run"
                            >
                              <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(run.id);
                              }}
                              title="Delete production run"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>

                          </div>
                        </td>
                      </tr>
                      {expandedRun === run.id && run.consumptions?.length > 0 && (
                        <tr className="bg-muted/30">
                          <td colSpan={7} className="p-0">
                            <table className="w-full">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="p-2 pl-10 text-left text-xs font-medium text-muted-foreground">
                                    Raw Material
                                  </th>
                                  <th className="p-2 text-center text-xs font-medium text-muted-foreground">
                                    Per Batch
                                  </th>
                                  <th className="p-2 text-center text-xs font-medium text-muted-foreground">
                                    Standard Qty
                                  </th>
                                  <th className="p-2 text-center text-xs font-medium text-muted-foreground">
                                    Actual Qty
                                  </th>
                                  <th className="p-2 text-center text-xs font-medium text-muted-foreground">
                                    Closing Stock
                                  </th>
                                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {run.consumptions.map((consumption: any, idx: number) => {
                                  // Calculate closing stock: Opening - Actual
                                  // Use saved opening stock if available (for new records), else 0
                                  const opening = Number(consumption.opening || 0);
                                  const closing = opening - Number(consumption.actualQty);

                                  // Calculate Per Batch Qty (Standard / Batches)
                                  // Handle older records where batchCount might be missing (treat as 1 to avoid /0)
                                  const batchCount = Number(run.batchCount) > 0 ? Number(run.batchCount) : 1;
                                  const perBatch = Number(consumption.standardQty) / batchCount;

                                  return (
                                    <tr key={idx} className="text-sm border-b border-muted last:border-0">
                                      <td className="p-2 pl-10">{consumption.itemName}</td>
                                      <td className="p-2 text-center font-mono text-muted-foreground">
                                        {perBatch.toFixed(2)}
                                      </td>
                                      <td className="p-2 text-center font-mono">
                                        {Number(consumption.standardQty).toFixed(2)}
                                      </td>
                                      <td className="p-2 text-center font-mono font-bold">
                                        {Number(consumption.actualQty).toFixed(2)}
                                      </td>
                                      <td className="p-2 text-center">
                                        <Badge variant="outline" className="font-mono">
                                          {closing.toFixed(2)}
                                        </Badge>
                                      </td>
                                      <td className="p-2 text-left text-xs text-muted-foreground">{consumption.remarks || "-"}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
