import { Hash, Star } from "lucide-react";

export default function UNSPSCResultCard({ item, darkMode, t, lang, isBestMatch }) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all hover:shadow-md ${
        isBestMatch
          ? darkMode
            ? "bg-emerald-950/60 border-emerald-600 ring-2 ring-emerald-500/40 shadow-lg"
            : "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/50 shadow-lg"
          : darkMode
          ? "bg-gray-900 border-gray-800 hover:border-emerald-700"
          : "bg-white border-slate-200 hover:border-emerald-300"
      }`}
    >
      {/* Top row: Best Match badge + Code badge */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        {isBestMatch ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
            <Star className="w-3 h-3 fill-current" />
            {lang === "ar" ? "أفضل تطابق" : "Best Match"}
          </span>
        ) : <span />}
        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm">
          <Hash className="w-3 h-3" />
          {item.code}
        </span>
      </div>

      <h3 className={`font-semibold text-sm leading-snug ${darkMode ? "text-white" : "text-slate-800"}`}>
        {item.title}
      </h3>
      {item.parent_key && (
        <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-slate-400"}`}>
          Key: {item.key} · Parent: {item.parent_key}
        </p>
      )}
    </div>
  );
}