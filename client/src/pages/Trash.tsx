import { useTrash } from "@/hooks/use-erp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, OctagonAlert } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Trash() {
    const { list, restore, permanentDelete } = useTrash();

    const handleRestore = (type: string, id: number) => {
        if (confirm(`Restore this ${type.toLowerCase()}? Stock will be updated back.`)) {
            restore.mutate({ type, id });
        }
    };

    const handlePermanentDelete = (type: string, id: number) => {
        if (confirm(`DANGER: This will permanently delete this ${type.toLowerCase()} from the database. This cannot be undone. Proceed?`)) {
            permanentDelete.mutate({ type, id });
        }
    };

    if (list.isLoading) return <div className="p-8">Loading Trash...</div>;

    const data = list.data || { purchases: [], sales: [], production: [] };

    const RenderTable = (items: any[], type: string) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entity / Item</TableHead>
                    <TableHead>Amount / Qty</TableHead>
                    <TableHead>Deleted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Trash is empty
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{format(new Date(item.date), "dd MMM yyyy")}</TableCell>
                            <TableCell className="font-medium">{item.entity}</TableCell>
                            <TableCell>{item.amount}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {item.deletedAt ? format(new Date(item.deletedAt), "dd MMM HH:mm") : "-"}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRestore(type, item.id)}
                                    className="bg-green-50 text-green-700 hover:bg-green-100"
                                >
                                    <RotateCcw className="w-4 h-4 mr-1" /> Restore
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePermanentDelete(type, item.id)}
                                    className="text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" /> Permanent Delete
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold font-display flex items-center gap-2">
                    <Trash2 className="w-8 h-8 text-muted-foreground" />
                    Trash / Recycle Bin
                </h1>
                <p className="text-muted-foreground">Deleted transactions are kept here for 30 days. You can restore them or delete them permanently.</p>
            </div>

            <Card className="border-amber-200 bg-amber-50/30">
                <CardContent className="pt-6 flex gap-3 text-amber-800">
                    <OctagonAlert className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">
                        Restoring an item will automatically update your stock levels. Permanent deletion is irreversible.
                    </p>
                </CardContent>
            </Card>

            <Tabs defaultValue="purchases" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                    <TabsTrigger value="purchases">Purchases ({data.purchases.length})</TabsTrigger>
                    <TabsTrigger value="sales">Sales ({data.sales.length})</TabsTrigger>
                    <TabsTrigger value="production">Production ({data.production.length})</TabsTrigger>
                </TabsList>

                <Card className="mt-4">
                    <TabsContent value="purchases" className="mt-0">
                        {RenderTable(data.purchases, "PURCHASE")}
                    </TabsContent>
                    <TabsContent value="sales" className="mt-0">
                        {RenderTable(data.sales, "SALE")}
                    </TabsContent>
                    <TabsContent value="production" className="mt-0">
                        {RenderTable(data.production, "PRODUCTION")}
                    </TabsContent>
                </Card>
            </Tabs>
        </div>
    );
}
