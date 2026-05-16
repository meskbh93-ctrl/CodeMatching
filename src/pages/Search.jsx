import { useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Moon, Sun, Globe, Loader2, SlidersHorizontal, X, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MandatoryResultCard from "@/components/search/MandatoryResultCard";
import UNSPSCResultCard from "@/components/search/UNSPSCResultCard";
import FilterSidebar from "@/components/search/FilterSidebar";
import HSCodeResultCard from "@/components/search/HSCodeResultCard";
import SmartComparison from "@/components/search/SmartComparison";
import ExportButton from "@/components/search/ExportButton";
import SearchHistory from "@/components/search/SearchHistory";

const translations = {
  ar: {
    title: "بحث رمز المنتج",
    subtitle: "ابحث عن أي منتج للحصول على رمزه من القائمة الإلزامية للمنتجات الوطنية وتصنيف UNSPSC",
    placeholder: "أدخل اسم المنتج أو وصفه بالعربية أو الإنجليزية...",
    searchBtn: "بحث",
    mandatory: "القائمة الإلزامية للمنتجات الوطنية",
    unspsc: "تصنيف UNSPSC",
    noResults: "لا توجد نتائج",
    etimadCode: "رمز اعتماد",
    segment: "القطاع",
    description: "الوصف",
    effectiveDate: "تاريخ التطبيق",
    code: "الرمز",
    searching: "جارٍ البحث...",
    searchHint: "اكتب على الأقل حرفين للبحث",
    mandatoryCount: "نتيجة من القائمة الإلزامية",
    unspscCount: "نتيجة من UNSPSC",
    hsCode: "رموز النظام المنسق HS",
    hsCount: "نتيجة من رموز HS",
    filters: "الفلاتر",
    filterBySector: "فلترة حسب القطاع",
    filterByCode: "فلترة حسب رمز اعتماد",
    allSectors: "جميع القطاعات",
    codeSearch: "ابحث برمز اعتماد...",
    clearFilters: "مسح الفلاتر",
    showFilters: "إظهار الفلاتر",
  },
  en: {
    title: "Product Code Search",
    subtitle: "Search for any product to find its code from the National Mandatory Products List and UNSPSC classification",
    placeholder: "Enter product name or description in Arabic or English...",
    searchBtn: "Search",
    mandatory: "National Mandatory Products List",
    unspsc: "UNSPSC Classification",
    noResults: "No results found",
    etimadCode: "Etimad Code",
    segment: "Segment",
    description: "Description",
    effectiveDate: "Effective Date",
    code: "Code",
    searching: "Searching...",
    searchHint: "Type at least 2 characters to search",
    mandatoryCount: "results from Mandatory List",
    unspscCount: "results from UNSPSC",
    hsCode: "HS Harmonized System Codes",
    hsCount: "results from HS Codes",
    filters: "Filters",
    filterBySector: "Filter by Sector",
    filterByCode: "Filter by Etimad Code",
    allSectors: "All Sectors",
    codeSearch: "Search by Etimad code...",
    clearFilters: "Clear Filters",
    showFilters: "Show Filters",
  },
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("ar");
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mandatoryResults, setMandatoryResults] = useState([]);
  const [unspscResults, setUnspscResults] = useState([]);
  const [hsResults, setHsResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [selectedSector, setSelectedSector] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [allSectors, setAllSectors] = useState([]);
  const [rawMandatory, setRawMandatory] = useState([]);

  const t = translations[lang];
  const isRTL = lang === "ar";

  useEffect(() => {
    base44.entities.MandatoryProduct.list("segment_title_ar", 5000).then((all) => {
      const sectors = [...new Set(
        all.map((p) => p.segment_title_ar || p.segment_title_en || p.sector || "").filter(Boolean)
      )].sort();
      setAllSectors(sectors);
    });
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    setSelectedSector("");
    setCodeFilter("");

    try {
      const q = query.trim().toLowerCase();

      // ترجمة الكلمة للغة الأخرى قبل البحث
      let translatedQ = "";
      try {
        const transRes = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const transData = await transRes.json();
        translatedQ = (transData.translated || "").toLowerCase().trim();
      } catch (_) {
        // إذا فشلت الترجمة نكمل بالكلمة الأصلية فقط
      }

      // بناء شروط البحث بالكلمتين (الأصلية والمترجمة)
      const buildOr = (fields) => {
        const terms = [q, translatedQ].filter(Boolean);
        return fields.flatMap((field) =>
          terms.map((term) => ({ [field]: { $regex: term, $options: "i" } }))
        );
      };

      const [allMandatory, unspscFiltered, hsFiltered] = await Promise.all([
        base44.entities.MandatoryProduct.filter(
          {
            $or: buildOr([
              "product_name_ar", "product_name_en",
              "product_desc_ar", "product_desc_en",
              "segment_title_ar", "segment_title_en",
              "etimad_code",
            ]),
          },
          "etimad_code",
          500
        ),
        base44.entities.UNSPSCCode.filter(
          translatedQ
            ? { $or: [{ title: { $regex: q, $options: "i" } }, { title: { $regex: translatedQ, $options: "i" } }] }
            : { title: { $regex: q, $options: "i" } },
          "title",
          100
        ),
        base44.entities.HSCode.filter(
          { $or: buildOr(["name_ar", "name_en"]) },
          "code",
          100
        ),
      ]);

      const scoreMandatory = (p) => {
        const nameAr = (p.product_name_ar || "").toLowerCase();
        const nameEn = (p.product_name_en || "").toLowerCase();
        const terms = [q, translatedQ].filter(Boolean);
        for (const term of terms) {
          if (nameAr === term || nameEn === term) return 3;
          if (nameAr.startsWith(term) || nameEn.startsWith(term)) return 2;
          if (nameAr.includes(term) || nameEn.includes(term)) return 1;
        }
        return 0;
      };

      const mandatoryWithScore = allMandatory.map((p) => ({ ...p, _score: scoreMandatory(p) }));
      mandatoryWithScore.sort((a, b) => b._score - a._score);

      const seen = new Set();
      const uniqueMandatory = mandatoryWithScore.filter((p) => {
        const key = p.etimad_code || p.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setRawMandatory(uniqueMandatory);
      setMandatoryResults(uniqueMandatory);

      const seenCodes = new Set();
      const uniqueUnspsc = unspscFiltered.filter((u) => {
        if (seenCodes.has(u.code)) return false;
        seenCodes.add(u.code);
        return true;
      });

      const seenHs = new Set();
      const uniqueHs = hsFiltered.filter((h) => {
        if (seenHs.has(h.code)) return false;
        seenHs.add(h.code);
        return true;
      });

      setUnspscResults(uniqueUnspsc);
      setHsResults(uniqueHs);
      setShowHistory(false);

      base44.entities.SearchLog.create({
        query: query.trim(),
        mandatory_count: uniqueMandatory.length,
        unspsc_count: uniqueUnspsc.length,
        hs_count: uniqueHs.length,
        lang,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    let filtered = rawMandatory;
    if (selectedSector) {
      filtered = filtered.filter(
        (p) => (p.segment_title_ar || p.segment_title_en || p.sector || "") === selectedSector
      );
    }
    if (codeFilter.trim()) {
      filtered = filtered.filter(
        (p) => p.etimad_code && String(p.etimad_code).toLowerCase().includes(codeFilter.trim().toLowerCase())
      );
    }
    setMandatoryResults(filtered);
  }, [selectedSector, codeFilter, rawMandatory]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const hasActiveFilters = selectedSector || codeFilter;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-950" : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${darkMode ? "bg-gray-900/90 border-gray-800" : "bg-white/80 border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className={`font-bold text-lg ${darkMode ? "text-white" : "text-slate-800"}`}>
              {lang === "ar" ? "بحث المنتجات" : "Product Search"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className={`gap-1 ${darkMode ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-slate-600"}`}>
              <Globe className="w-4 h-4" />
              {lang === "ar" ? "EN" : "عر"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)}
              className={darkMode ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-slate-600"}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${darkMode ? "text-white" : "text-slate-800"}`}>{t.title}</h1>
          <p className={`text-base max-w-2xl mx-auto ${darkMode ? "text-gray-400" : "text-slate-500"}`}>{t.subtitle}</p>
        </div>

        {/* Search Box */}
        <div className={`rounded-2xl p-4 md:p-5 mb-6 shadow-lg ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-slate-200"}`}>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className={`absolute top-3.5 ${isRTL ? "right-3" : "left-3"} w-5 h-5 ${darkMode ? "text-gray-500" : "text-slate-400"}`} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholder}
                className={`${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} h-12 text-base ${darkMode
                  ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400"}`}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || query.trim().length < 2}
              className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.searchBtn}
            </Button>
            {searched && (
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}
                className={`h-12 px-4 rounded-xl relative ${showFilters ? "ring-2 ring-blue-500" : ""} ${darkMode ? "border-gray-700 text-gray-300 bg-gray-800 hover:bg-gray-700" : ""}`}>
                <SlidersHorizontal className="w-5 h-5" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)}
              className={`h-12 px-4 rounded-xl ${showHistory ? "ring-2 ring-violet-500" : ""} ${darkMode ? "border-gray-700 text-gray-300 bg-gray-800 hover:bg-gray-700" : ""}`}>
              <History className="w-5 h-5" />
            </Button>
          </div>
          {!searched && (
            <p className={`mt-2 text-sm ${darkMode ? "text-gray-500" : "text-slate-400"}`}>{t.searchHint}</p>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className={`w-10 h-10 animate-spin ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
            <p className={darkMode ? "text-gray-400" : "text-slate-500"}>{t.searching}</p>
          </div>
        )}

        {showHistory && !loading && (
          <div className="mb-6">
            <SearchHistory darkMode={darkMode} lang={lang} onSelect={(q) => { setQuery(q); setShowHistory(false); }} />
          </div>
        )}

        {!loading && searched && (
          <div className={`flex gap-6 ${isRTL ? "flex-row-reverse" : ""}`}>
            {showFilters && (
              <FilterSidebar
                darkMode={darkMode}
                t={t}
                lang={lang}
                sectors={allSectors}
                selectedSector={selectedSector}
                onSectorChange={setSelectedSector}
                codeFilter={codeFilter}
                onCodeFilterChange={setCodeFilter}
                onClear={() => { setSelectedSector(""); setCodeFilter(""); }}
                hasActiveFilters={hasActiveFilters}
              />
            )}

            <div className="flex-1 min-w-0 space-y-10">
              <div className="flex flex-col gap-4">
                <SmartComparison
                  query={query} mandatoryResults={mandatoryResults}
                  unspscResults={unspscResults} hsResults={hsResults}
                  darkMode={darkMode} lang={lang}
                />
                <div className={`flex justify-end`}>
                  <ExportButton
                    query={query} mandatoryResults={mandatoryResults}
                    unspscResults={unspscResults} hsResults={hsResults}
                    darkMode={darkMode} lang={lang}
                  />
                </div>
              </div>

              {/* Mandatory Results */}
              <section>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                    🇸🇦 {t.mandatory}
                  </h2>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                    {mandatoryResults.length} {t.mandatoryCount}
                  </span>
                </div>
                {mandatoryResults.length === 0 ? (
                  <div className={`text-center py-10 rounded-xl ${darkMode ? "bg-gray-900 text-gray-500" : "bg-white text-slate-400"}`}>
                    {t.noResults}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {mandatoryResults.slice(0, 60).map((p, idx) => (
                      <MandatoryResultCard key={p.id} product={p} lang={lang} darkMode={darkMode} t={t} isRTL={isRTL} isBestMatch={idx === 0 && p._score > 0} />
                    ))}
                  </div>
                )}
              </section>

              {/* UNSPSC Results */}
              <section>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                    🌐 {t.unspsc}
                  </h2>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${darkMode ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                    {unspscResults.length} {t.unspscCount}
                  </span>
                </div>
                {unspscResults.length === 0 ? (
                  <div className={`text-center py-10 rounded-xl ${darkMode ? "bg-gray-900 text-gray-500" : "bg-white text-slate-400"}`}>
                    {t.noResults}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {unspscResults.map((u, idx) => (
                      <UNSPSCResultCard key={u.id} item={u} darkMode={darkMode} t={t} lang={lang} isBestMatch={idx === 0} />
                    ))}
                  </div>
                )}
              </section>

              {/* HS Code Results */}
              <section>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                    🛃 {t.hsCode}
                  </h2>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${darkMode ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                    {hsResults.length} {t.hsCount}
                  </span>
                </div>
                {hsResults.length === 0 ? (
                  <div className={`text-center py-10 rounded-xl ${darkMode ? "bg-gray-900 text-gray-500" : "bg-white text-slate-400"}`}>
                    {t.noResults}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {hsResults.map((h, idx) => (
                      <HSCodeResultCard key={h.id} item={h} darkMode={darkMode} lang={lang} isBestMatch={idx === 0} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
