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
            <span classN
