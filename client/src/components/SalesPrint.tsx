import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { useReactToPrint } from "react-to-print";

/* 
  Standard GST Invoice Layout (Box Style)
  Matches "OM TRADERS" example
*/

// Props interface for SalesPrint component
interface SalesPrintProps {
    sale: any;
    companyInfo: any;
    customerInfo: any;
    onClose: () => void;
}

export function SalesPrint({ sale, companyInfo, customerInfo, onClose }: SalesPrintProps) {
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        onAfterPrint: onClose,
        documentTitle: `Invoice-${sale.id}`,
    });

    // --- Calculations ---
    const lineItems = sale.lineItems || [];

    // Group Tax Calculations
    const totalTaxable = lineItems.reduce((acc: number, item: any) => acc + Number(item.amount), 0);
    const totalCGST = Number(sale.cgstAmount) || 0;
    const totalSGST = Number(sale.sgstAmount) || 0;
    const totalIGST = Number(sale.igstAmount) || 0;
    const grandTotal = Number(sale.totalAmount) || 0;
    const totalGST = totalCGST + totalSGST + totalIGST;

    // Number to Words (Simple Implementation for now)
    const numberToWords = (num: number): string => {
        // Placeholder - Ideally use a library like 'number-to-words'
        return `Rupees ${num.toFixed(2)} Only`;
    };

    // QR Code Content
    const qrData = `Seller:${companyInfo?.companyName}, Inv:${sale.id}, Date:${sale.saleDate}, Total:${grandTotal.toFixed(2)}`;

    return (
        <div className="flex flex-col h-full bg-white text-black p-4 max-w-[210mm] mx-auto">
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-4 print:hidden">
                <h2 className="text-lg font-bold">Print Preview</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            {/* Printable Area - A4 Size CSS */}
            <div
                ref={componentRef}
                className="border border-black text-[12px] font-sans leading-tight bg-white"
                style={{ minHeight: "297mm", position: "relative" }}
            >
                {/* Header Section */}
                <div className="flex border-b border-black">
                    {/* Left: Company Details */}
                    <div className="w-[60%] p-2 border-r border-black">
                        <h1 className="text-xl font-bold uppercase mb-1">{companyInfo?.companyName || "Company Name"}</h1>
                        <div className="text-[11px] space-y-0.5">
                            <p className="whitespace-pre-line">{companyInfo?.address || "Address Line 1\nCity, State - Zip"}</p>
                            <p><strong>GSTIN/UIN:</strong> {companyInfo?.gstNumber || "----------------"}</p>
                            <p><strong>State Name:</strong> {companyInfo?.state || "Telangana"}, <strong>Code:</strong> {companyInfo?.stateCode || "36"}</p>
                            <p><strong>E-Mail:</strong> {companyInfo?.email || "-"}</p>
                            <p><strong>Contact:</strong> {companyInfo?.phone || "-"}</p>
                        </div>
                    </div>
                    {/* Right: Invoice Details */}
                    <div className="w-[40%] flex flex-col">
                        <div className="flex-1 p-2 space-y-1">
                            <div className="flex justify-between">
                                <span className="font-bold">Invoice No:</span>
                                <span>{sale.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-bold">Date:</span>
                                <span>{sale.saleDate ? format(new Date(sale.saleDate), "dd-MMM-yyyy") : ""}</span>
                            </div>
                            {/* Placeholders for standard fields */}
                            <div className="flex justify-between">
                                <span className="font-bold">Ack No:</span>
                                <span>112628484139735</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-bold">Ack Date:</span>
                                <span>{sale.saleDate ? format(new Date(sale.saleDate), "dd-MMM-yyyy") : ""}</span>
                            </div>
                        </div>
                        <div className="border-t border-black p-1 text-center bg-gray-100">
                            <h2 className="font-bold text-sm">TAX INVOICE</h2>
                        </div>
                    </div>
                </div>

                {/* Parties Section */}
                <div className="flex border-b border-black">
                    {/* Buyer (Bill To) */}
                    <div className="w-[50%] p-2 border-r border-black">
                        <h3 className="font-bold underline mb-1">Buyer (Bill to):</h3>
                        <p className="font-bold">{customerInfo?.name || "Cash Customer"}</p>
                        <p className="whitespace-pre-line">{customerInfo?.address || "-"}</p>
                        <p><strong>GSTIN/UIN:</strong> {customerInfo?.gstNumber || ""}</p>
                        <p><strong>State:</strong> {customerInfo?.state || "Telangana"}, <strong>Code:</strong> {customerInfo?.stateCode || "36"}</p>
                    </div>
                    {/* Consignee (Ship To) */}
                    <div className="w-[50%] p-2">
                        <h3 className="font-bold underline mb-1">Consignee (Ship to):</h3>
                        <p className="font-bold">{customerInfo?.name || "Cash Customer"}</p>
                        <p className="whitespace-pre-line">{customerInfo?.shippingAddress || customerInfo?.address || "-"}</p>
                        <p><strong>GSTIN/UIN:</strong> {customerInfo?.gstNumber || ""}</p>
                        <p><strong>Place of Supply:</strong> {customerInfo?.state || "Telangana"}</p>
                    </div>
                </div>

                {/* Item Table Header */}
                <div className="flex border-b border-black text-center font-bold bg-gray-50">
                    <div className="w-[5%] border-r border-black p-1">Sl</div>
                    <div className="w-[40%] border-r border-black p-1">Description of Goods</div>
                    <div className="w-[10%] border-r border-black p-1">HSN/SAC</div>
                    <div className="w-[5%] border-r border-black p-1">Qty</div>
                    <div className="w-[10%] border-r border-black p-1">Rate</div>
                    <div className="w-[5%] border-r border-black p-1">Per</div>
                    <div className="w-[25%] p-1">Amount</div>
                </div>

                {/* Item Table Body - Height Filler */}
                <div className="flex flex-col border-b border-black" style={{ minHeight: "120mm" }}>
                    {lineItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex border-b border-dotted border-gray-300 last:border-0 text-[11px]">
                            <div className="w-[5%] border-r border-black p-1 text-center">{idx + 1}</div>
                            <div className="w-[40%] border-r border-black p-1 font-semibold">{item.itemName || item.item || "Item Name"}</div>
                            <div className="w-[10%] border-r border-black p-1 text-center">{item.hsnCode || "GENERAL"}</div>
                            <div className="w-[5%] border-r border-black p-1 text-center">{item.quantity}</div>
                            <div className="w-[10%] border-r border-black p-1 text-right">{Number(item.rate).toFixed(2)}</div>
                            <div className="w-[5%] border-r border-black p-1 text-center">{item.unit || "Nos"}</div>
                            <div className="w-[25%] p-1 text-right font-bold">{Number(item.amount).toFixed(2)}</div>
                        </div>
                    ))}
                    {/* Filler to push totals down if few items */}
                    <div className="flex-1 flex">
                        <div className="w-[5%] border-r border-black"></div>
                        <div className="w-[40%] border-r border-black"></div>
                        <div className="w-[10%] border-r border-black"></div>
                        <div className="w-[5%] border-r border-black"></div>
                        <div className="w-[10%] border-r border-black"></div>
                        <div className="w-[5%] border-r border-black"></div>
                        <div className="w-[25%]"></div>
                    </div>
                </div>

                {/* Total & Tax Wordings */}
                <div className="flex border-b border-black">
                    <div className="w-[75%] border-r border-black p-2 flex flex-col justify-between">
                        <div>
                            <div className="flex gap-2 mb-1">
                                <span className="font-bold">Total:</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-bold">Amount Chargeable (in words):</span>
                                <span className="italic">{numberToWords(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-[25%]">
                        <div className="flex justify-between border-b border-black p-1">
                            <span className="font-bold">Taxable Value</span>
                            <span>{totalTaxable.toFixed(2)}</span>
                        </div>
                        {totalCGST > 0 && (
                            <div className="flex justify-between border-b border-black p-1">
                                <span>CGST</span>
                                <span>{totalCGST.toFixed(2)}</span>
                            </div>
                        )}
                        {totalSGST > 0 && (
                            <div className="flex justify-between border-b border-black p-1">
                                <span>SGST</span>
                                <span>{totalSGST.toFixed(2)}</span>
                            </div>
                        )}
                        {totalIGST > 0 && (
                            <div className="flex justify-between border-b border-black p-1">
                                <span>IGST</span>
                                <span>{totalIGST.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-sm bg-gray-100 p-1">
                            <span>Total</span>
                            <span>₹ {grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="flex border-b border-black text-[10px]">
                    {/* Tax Breakdown Table */}
                    <div className="w-[60%] border-r border-black p-2">
                        <h3 className="font-bold underline mb-1">Tax Analysis:</h3>
                        <table className="w-full border-collapse border border-black text-center text-[9px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-0.5" rowSpan={2}>HSN/SAC</th>
                                    <th className="border border-black p-0.5" rowSpan={2}>Taxable Value</th>
                                    {totalCGST > 0 && <th className="border border-black p-0.5" colSpan={2}>Central Tax</th>}
                                    {totalSGST > 0 && <th className="border border-black p-0.5" colSpan={2}>State Tax</th>}
                                    {totalIGST > 0 && <th className="border border-black p-0.5" colSpan={2}>Integrated Tax</th>}
                                    <th className="border border-black p-0.5" rowSpan={2}>Total Tax</th>
                                </tr>
                                <tr className="bg-gray-100">
                                    {totalCGST > 0 && <><th className="border border-black p-0.5">Rate</th><th className="border border-black p-0.5">Amount</th></>}
                                    {totalSGST > 0 && <><th className="border border-black p-0.5">Rate</th><th className="border border-black p-0.5">Amount</th></>}
                                    {totalIGST > 0 && <><th className="border border-black p-0.5">Rate</th><th className="border border-black p-0.5">Amount</th></>}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.values(
                                    lineItems.reduce((acc: any, item: any) => {
                                        const hsn = item.hsnCode || "GENERAL";
                                        if (!acc[hsn]) {
                                            acc[hsn] = {
                                                hsn,
                                                taxable: 0,
                                                gstRate: Number(item.gstRate || 0),
                                                cgst: 0,
                                                sgst: 0,
                                                igst: 0
                                            };
                                        }
                                        acc[hsn].taxable += Number(item.amount);
                                        const itemGstAmt = Number(item.gstAmount || 0);

                                        if (totalIGST > 0) {
                                            acc[hsn].igst += itemGstAmt;
                                        } else {
                                            acc[hsn].cgst += itemGstAmt / 2;
                                            acc[hsn].sgst += itemGstAmt / 2;
                                        }

                                        return acc;
                                    }, {})
                                ).map((row: any, i: number) => (
                                    <tr key={i}>
                                        <td className="border border-black p-0.5">{row.hsn}</td>
                                        <td className="border border-black p-0.5">{row.taxable.toFixed(2)}</td>

                                        {totalCGST > 0 && (
                                            <>
                                                <td className="border border-black p-0.5">{row.gstRate / 2}%</td>
                                                <td className="border border-black p-0.5">{row.cgst.toFixed(2)}</td>
                                            </>
                                        )}
                                        {totalSGST > 0 && (
                                            <>
                                                <td className="border border-black p-0.5">{row.gstRate / 2}%</td>
                                                <td className="border border-black p-0.5">{row.sgst.toFixed(2)}</td>
                                            </>
                                        )}
                                        {totalIGST > 0 && (
                                            <>
                                                <td className="border border-black p-0.5">{row.gstRate}%</td>
                                                <td className="border border-black p-0.5">{row.igst.toFixed(2)}</td>
                                            </>
                                        )}
                                        <td className="border border-black p-0.5">{(row.cgst + row.sgst + row.igst).toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="font-bold bg-gray-50">
                                    <td className="border border-black p-0.5">Total</td>
                                    <td className="border border-black p-0.5">{totalTaxable.toFixed(2)}</td>
                                    {totalCGST > 0 && <><td className="border border-black p-0.5"></td><td className="border border-black p-0.5">{totalCGST.toFixed(2)}</td></>}
                                    {totalSGST > 0 && <><td className="border border-black p-0.5"></td><td className="border border-black p-0.5">{totalSGST.toFixed(2)}</td></>}
                                    {totalIGST > 0 && <><td className="border border-black p-0.5"></td><td className="border border-black p-0.5">{totalIGST.toFixed(2)}</td></>}
                                    <td className="border border-black p-0.5">{totalGST.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="mt-2">
                            <p><u>Declaration:</u></p>
                            <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                        </div>
                    </div>

                    {/* Signatures & Bank */}
                    <div className="w-[40%] text-center">
                        <div className="border-b border-black p-2 h-[80px] flex items-center justify-center">
                            <div className="bg-white border-2 border-dashed border-gray-400 p-1">
                                <QRCodeSVG value={qrData} size={70} />
                            </div>
                            <span className="text-[9px] ml-2 -rotate-90 origin-center text-gray-500">e-Invoice</span>
                        </div>
                        <div className="p-2 flex flex-col justify-end h-[100px]">
                            <p className="font-bold mb-4">For {companyInfo?.companyName || "Company"}</p>
                            <br />
                            <p className="border-t border-black text-[9px] w-[80%] mx-auto pt-1">Authorized Signatory</p>
                        </div>
                    </div>
                </div>

                <div className="text-center text-[9px] p-1 italic">
                    This is a Computer Generated Invoice.
                </div>

            </div>
        </div>
    );
}
