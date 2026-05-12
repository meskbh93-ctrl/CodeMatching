import { FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function toCSV(query, mandatoryResults, unspscResults, hsResults, lang) {
  const rows = [];
  const isAr = lang === "ar";

  rows.push(["Source", "Code", "Name AR", "Name EN", "Sector/Category"].join(","));

  mandatoryResults.forEach((p) => {
    rows.push([
      isAr ? "القائمة الإلزامية" : "Mandatory List",
      p.etimad_code || "",
      `"${(p.product_name_ar || "").replace(/"/g, '""')}"`,
      `"${(p.product_name_en || "").replace(/"/g, '""')}"`,
      `"${(p.segment_title_ar || p.sector || "").replace(/"/g, '""')}"`,
    ].join(","));
  });

  unspscResults.forEach((u) => {
    rows.push([
      "UNSPSC",
      u.code || "",
      "",
      `"${(u.title || "").replace(/"/g, '""')}"`,
      "",
    ].join(","));
  });

  hsResults.forEach((h) => {
    rows.push([
      isAr ? "رموز HS" : "HS Codes",
      h.code || "",
      `"${(h.name_ar || "").replace(/"/g, '""')}"`,
      `"${(h.name_en || "").replace(/"/g, '""')}"`,
      "",
    ].join(","));
  });

  return "\uFEFF" + rows.join("\n"); // BOM for Arabic UTF-8
}

export default function ExportButton({ query, mandatoryResults, unspscResults, hsResults, darkMode, lang }) {
  const isRTL = lang === "ar";
  const label = lang === "ar" ? "تصدير" : "Export";
  const csvLabel = lang === "ar" ? "تصدير CSV" : "Export CSV";
  const printLabel = lang === "ar" ? "طباعة / PDF" : "Print / PDF";

  const handleCSV = () => {
    const csv = toCSV(query, mandatoryResults, unspscResults, hsResults, lang);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `search_${query.replace(/\s+/g, "_")}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm"
          className={`gap-1.5 ${darkMode ? "border-gray-700 text-gray-300 bg-gray-800 hover:bg-gray-700" : ""}`}>
          <FileDown className="w-4 h-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? "start" : "end"}>
        <DropdownMenuItem onClick={handleCSV} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4 text-green-600" />
          {csvLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
          <FileDown className="w-4 h-4 text-blue-600" />
          {printLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}