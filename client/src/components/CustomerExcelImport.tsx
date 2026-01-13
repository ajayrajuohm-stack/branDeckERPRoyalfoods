import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomerExcelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const upload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/import/customers", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Customers (Excel)</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <Button onClick={upload} disabled={loading}>
          {loading ? "Importing..." : "Upload & Import"}
        </Button>

        {result && (
          <div className="text-sm">
            <p>Total: {result.total}</p>
            <p className="text-green-600">Success: {result.success}</p>
            <p className="text-red-600">Failed: {result.failed}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
