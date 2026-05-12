import { Badge } from "@/components/ui/badge";
import { Tag, Calendar, Star } from "lucide-react";

export default function MandatoryResultCard({ product: p, lang, darkMode, t, isRTL, isBestMatch }) {
  const displayName = lang === "ar" ? (p.product_name_ar || p.product_name_en || "") : (p.product_name_en || p.product_name_ar || "");
  const displayDesc = lang === "ar" ? (p.product_desc_ar || p.product_desc_en || "") : (p.product_desc_en || p.product_desc_ar || "");
  const displaySeg = lang === "ar" ? (p.segment_title_ar || p.sector || p.segment_title_en || "") : (p.segment_title_en || p.segment_title_ar || p.sector || "");
  const code = p.etimad_code || "";
  const displayDate = p.effective_date ? String(p.effective_date).split(" ")[0].split("T")[0] : "";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`rounded-xl border p-4 transition-all hover:shadow-md ${
        isBestMatch
          ? darkMode
            ? "bg-blue-950/60 border-blue-600 ring-2 ring-blue-500/40 shadow-lg shadow-blue-900/30"
            : "bg-blue-50 border-blue-400 ring-2 ring-blue-300/50 shadow-lg shadow-blue-100"
          : darkMode
          ? "bg-gray-900 border-gray-800 hover:border-blue-700"
          : "bg-white border-slate-200 hover:border-blue-300"
      }`}
    >
      {/* Top row: Best Match badge + Code badge */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        {isBestMatch ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
            <Star className="w-3 h-3 fill-current" />
            {lang === "ar" ? "أفضل تطابق" : "Best Match"}
          </span>
        ) : <span />}
        {code && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
            <Tag className="w-3 h-3" />
            {code}
          </span>
        )}
      </div>

      <h3 className={`font-semibold text-base leading-snug mb-2 ${darkMode ? "text-white" : "text-slate-800"}`}>
        {displayName || "—"}
      </h3>

      {displaySeg && (
        <div className="mb-2">
          <Badge variant="secondary" className={`text-xs ${darkMode ? "bg-gray-800 text-gray-300 border-gray-700" : "bg-slate-100 text-slate-600"}`}>
            {displaySeg}
          </Badge>
        </div>
      )}

      {displayDesc && (
        <p className={`text-sm leading-relaxed line-clamp-3 mb-3 ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
          {displayDesc}
        </p>
      )}

      {displayDate && (
        <div className={`flex items-center gap-1 text-xs ${darkMode ? "text-gray-500" : "text-slate-400"}`}>
          <Calendar className="w-3 h-3" />
          <span>{t.effectiveDate}: {displayDate}</span>
        </div>
      )}
    </div>
  );
}