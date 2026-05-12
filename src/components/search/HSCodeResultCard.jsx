import { Hash, Star } from "lucide-react";

export default function HSCodeResultCard({ item, darkMode, lang, isBestMatch }) {
  const isRTL = lang === "ar";
  const displayName = lang === "ar"
    ? (item.name_ar || item.name_en || "")
    : (item.name_en || item.name_ar || "");

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`rounded-xl border p-4 transition-all hover:shadow-md ${
        isBestMatch
          ? darkMode
            ? "bg-amber-950/60 border-amber-600 ring-2 ring-amber-500/40 shadow-lg"
            : "bg-amber-50 border-amber-400 ring-2 ring-amber-300/50 shadow-lg"
          : darkMode
          ? "bg-gray-900 border-gray-800 hover:border-amber-700"
          : "bg-white border-slate-200 hover:border-amber-300"
      }`}
    >
      {/* Top row: Best Match badge + Code badge */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        {isBestMatch ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
            <Star className="w-3 h-3 fill-current" />
            {lang === "ar" ? "أفضل تطابق" : "Best Match"}
          </span>
        ) : <span />}
        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
          <Hash className="w-3 h-3" />
          {item.code}
        </span>
      </div>

      <p className={`text-sm leading-snug ${darkMode ? "text-gray-200" : "text-slate-700"}`}>
        {displayName || "—"}
      </p>
    </div>
  );
}