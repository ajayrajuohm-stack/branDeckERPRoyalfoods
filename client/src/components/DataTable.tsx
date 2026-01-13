import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[] | undefined;
  columns: Column<T>[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  isLoading,
  onRowClick,
  emptyMessage = "No records found"
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-48 w-full border rounded-lg flex items-center justify-center text-muted-foreground bg-muted/5">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card overflow-x-auto shadow-sm">
      <Table className="table-dense min-w-[700px]">
        <TableHeader className="bg-muted/40">
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.id}
              onClick={() => onRowClick && onRowClick(item)}
              className={cn("cursor-default", onRowClick && "cursor-pointer hover:bg-muted/30")}
            >
              {columns.map((col, idx) => (
                <TableCell key={idx} className={col.className}>
                  {col.cell
                    ? col.cell(item)
                    : col.accessorKey
                      ? (item[col.accessorKey] as React.ReactNode)
                      : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
