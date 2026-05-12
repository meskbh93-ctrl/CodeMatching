import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SmartComparison({ query, mandatoryResults, unspscResults, hsResults, darkMode, lang }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const isRTL = lang === "ar";

  const label = lang === "ar" ? "المقارنة الذكية" : "Smart Comparison";
  const analyzeLabel = lang === "ar" ? "تحليل ذكي للنتائج" : "AI Analysis";
  const loadingLabel = lang === "ar" ? "جارٍ التحليل..." : "Analyzing...";
  const closeLabel = lang === "ar" ? "إغلاق" : "Close";

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const mandatory_sample = mandatoryResults.slice(0, 5).map(p => ({
        name: p.product_name_ar || p.product_name_en,
        code: p.etimad_code,
        sector: p.segment_title_ar || p.sector,
      }));
      const unspsc_sample = unspscResults.slice(0, 5).map(u => ({ title: u.title, code: u.code }));
      const hs_sample = hsResults.slice(0, 5).map(h => ({ name: h.name_ar || h.name_en, code: h.code }));

      const prompt = lang === "ar"
        ? `أنت خبير في أنظمة تصنيف المنتجات. المستخدم بحث عن: "${query}". 
إليك أفضل النتائج من كل نظام:
- القائمة الوطنية الإلزامية: ${JSON.stringify(mandatory_sample)}
- UNSPSC: ${JSON.stringify(unspsc_sample)}
- رموز HS الجمركية: ${JSON.stringify(hs_sample)}
قدّم تحليلاً موجزاً باللغة العربية يوضح:
1. أفضل تطابق في كل نظام
2. العلاقة بين الرموز الثلاثة
3. توصية بالرمز الأنسب لكل غرض (جمارك / مشتريات حكومية / وطني)`
        : `You are an expert in product classification systems. The user searched for: "${query}".
Top results from each system:
- National Mandatory List: ${JSON.stringify(mandatory_sample)}
- UNSPSC: ${JSON.stringify(unspsc_sample)}
- HS Customs Codes: ${JSON.stringify(hs_sample)}
Provide a concise analysis in English covering:
1. Best match in each system
2. Relationship between the three codes
3. Recommendation for the best code per use case (customs / government procurement / national)`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setAnalysis(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-5 ${darkMode ? "bg-gray-900 border-gray-700" : "bg-blue-50 border-blue-200"}`}
      dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h3 className={`font-bold text-base ${darkMode ? "text-white" : "text-slate-800"}`}>{label}</h3>
        </div>
        {!analysis && (
          <Button onClick={handleAnalyze} disabled={loading} size="sm"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white gap-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? loadingLabel : analyzeLabel}
          </Button>
        )}
        {analysis && (
          <Button onClick={() => setAnalysis(null)} variant="ghost" size="sm"
            className={darkMode ? "text-gray-400 hover:bg-gray-800" : "text-slate-500"}>
            <X className="w-4 h-4" />
            {closeLabel}
          </Button>
        )}
      </div>

      {analysis && (
        <div className={`mt-2 text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-4 ${
          darkMode ? "bg-gray-800 text-gray-300" : "bg-white text-slate-700 border border-blue-100"
        }`}>
          {analysis}
        </div>
      )}
    </div>
  );
}