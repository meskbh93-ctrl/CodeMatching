import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FilterSidebar({
  darkMode, t, lang,
  sectors, selectedSector, onSectorChange,
  codeFilter, onCodeFilterChange,
  onClear, hasActiveFilters,
}) {
  const isRTL = lang === "ar";

  return (
    <div className={`w-64 shrink-0 rounded-2xl border p-4 h-fit sticky top-20 ${
      darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold text-base ${darkMode ? "text-white" : "text-slate-800"}`}>
          {t.filters}
        </h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}
            className={`text-xs h-7 px-2 ${darkMode ? "text-red-400 hover:text-red-300 hover:bg-gray-800" : "text-red-500 hover:text-red-600"}`}>
            <X className="w-3 h-3 me-1" />
            {t.clearFilters}
          </Button>
        )}
      </div>

      {/* Filter by Etimad Code */}
      <div className="mb-5">
        <label className={`block text-xs font-semibold mb-2 uppercase tracking-wide ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
          {t.filterByCode}
        </label>
        <Input
          value={codeFilter}
          onChange={(e) => onCodeFilterChange(e.target.value)}
          placeholder={t.codeSearch}
          dir={isRTL ? "rtl" : "ltr"}
          className={`h-9 text-sm ${darkMode
            ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-600"
            : "bg-slate-50 border-slate-200 placeholder:text-slate-400"}`}
        />
      </div>

      {/* Filter by Sector */}
      <div>
        <label className={`block text-xs font-semibold mb-2 uppercase tracking-wide ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
          {t.filterBySector}
        </label>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          <button
            onClick={() => onSectorChange("")}
            className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedSector === ""
                ? "bg-blue-600 text-white font-medium"
                : darkMode
                  ? "text-gray-300 hover:bg-gray-800"
                  : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.allSectors}
          </button>
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => onSectorChange(s)}
              className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors leading-snug ${
                selectedSector === s
                  ? "bg-blue-600 text-white font-medium"
                  : darkMode
                    ? "text-gray-300 hover:bg-gray-800"
                    : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}