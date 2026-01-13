import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SupplierExcelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an Excel file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/suppliers", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Import failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Suppliers (Excel)</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <Button onClick={handleUpload} disabled={loading}>
          {loading ? "Importing..." : "Upload & Import"}
        </Button>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {result && (
          <div className="text-sm space-y-1">
            <p>📄 Total rows: {result.total}</p>
            <p className="text-green-600">✅ Success: {result.success}</p>
            <p className="text-red-600">❌ Failed: {result.failed}</p>

            {result.errors?.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold">Errors:</p>
                <ul className="list-disc ml-4">
                  {result.errors.map((e: any, idx: number) => (
                    <li key={idx}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
