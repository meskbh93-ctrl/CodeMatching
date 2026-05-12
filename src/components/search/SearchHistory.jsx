import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { History, Search, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SearchHistory({ darkMode, lang, onSelect }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isRTL = lang === "ar";

  const t = {
    ar: {
      title: "سجل عمليات البحث",
      empty: "لا توجد عمليات بحث سابقة",
      mandatory: "إلزامي",
      unspsc: "UNSPSC",
      hs: "HS",
      searchAgain: "بحث مجدد",
      clear: "مسح السجل",
    },
    en: {
      title: "Search History",
      empty: "No previous searches",
      mandatory: "Mandatory",
      unspsc: "UNSPSC",
      hs: "HS",
      searchAgain: "Search again",
      clear: "Clear history",
    },
  }[lang];

  useEffect(() => {
    base44.entities.SearchLog.list("-created_date", 20).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const handleClear = async () => {
    await Promise.all(logs.map((l) => base44.entities.SearchLog.delete(l.id)));
    setLogs([]);
  };

  return (
    <div className={`rounded-2xl border p-5 ${darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}
      dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <History className="w-4 h-4 text-white" />
          </div>
          <h3 className={`font-bold text-base ${darkMode ? "text-white" : "text-slate-800"}`}>{t.title}</h3>
        </div>
        {logs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 text-xs">
            <Trash2 className="w-3.5 h-3.5" />
            {t.clear}
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && logs.length === 0 && (
        <p className={`text-center py-6 text-sm ${darkMode ? "text-gray-500" : "text-slate-400"}`}>{t.empty}</p>
      )}

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl ${
            darkMode ? "bg-gray-800 hover:bg-gray-750" : "bg-slate-50 hover:bg-slate-100"
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Search className={`w-3.5 h-3.5 shrink-0 ${darkMode ? "text-gray-500" : "text-slate-400"}`} />
              <span className={`text-sm font-medium truncate ${darkMode ? "text-gray-200" : "text-slate-700"}`}>{log.query}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex gap-1 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{t.mandatory}: {log.mandatory_count ?? 0}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">{t.unspsc}: {log.unspsc_count ?? 0}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">{t.hs}: {log.hs_count ?? 0}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onSelect(log.query)}
                className={`h-7 px-2 text-xs ${darkMode ? "text-blue-400 hover:bg-gray-700" : "text-blue-600 hover:bg-blue-50"}`}>
                <Search className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}