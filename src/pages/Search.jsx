import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Search, Moon, Sun, Globe, Loader2, SlidersHorizontal, History, LogOut, Plus, X, ThumbsUp, ThumbsDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MandatoryResultCard from "@/components/search/MandatoryResultCard";
import UNSPSCResultCard from "@/components/search/UNSPSCResultCard";
import FilterSidebar from "@/components/search/FilterSidebar";
import HSCodeResultCard from "@/components/search/HSCodeResultCard";
import SmartComparison from "@/components/search/SmartComparison";
import ExportButton from "@/components/search/ExportButton";
import SearchHistory from "@/components/search/SearchHistory";

// ─── القاموس المدمج ────────────────────────────────────────────────────────
const BASE_AR_TO_EN = {
  "قطط": "cats", "قط": "cats", "كلاب": "dogs", "كلب": "dogs",
  "خيول": "horses", "حصان": "horses", "أغنام": "sheep", "غنم": "sheep",
  "ماعز": "goats", "خنازير": "swine", "أرانب": "rabbits",
  "أبقار": "cattle", "بقر": "cattle", "طيور": "birds",
  "دجاج": "chicken", "بط": "ducks", "ديك رومي": "turkeys",
  "أوز": "geese", "سمك": "fish", "سلمون": "salmon",
  "روبيان": "shrimp", "جمبري": "shrimp", "نحل": "bees",
  "حشرات": "insects", "دود حرير": "silkworms",
  "تفاح": "apples", "قمح": "wheat", "أرز": "rice", "شعير": "barley",
  "ذرة": "corn", "بطاطا": "potato", "طماطم": "tomatoes",
  "بصل": "onion", "ثوم": "garlic", "زيت": "oil", "سكر": "sugar",
  "ملح": "salt", "دقيق": "flour", "خبز": "bread", "لحم": "meat",
  "لحوم": "meat", "دواجن": "poultry", "ألبان": "dairy",
  "حليب": "milk", "جبن": "cheese", "زبدة": "butter",
  "بيض": "eggs", "عسل": "honey", "تمر": "dates", "قهوة": "coffee",
  "شاي": "tea", "مياه": "water", "عصير": "juice", "بذور": "seeds",
  "شتلات": "seedlings", "علف": "feed", "أعلاف": "feed",
  "حديد": "steel", "صلب": "steel", "خرسانة": "concrete",
  "اسمنت": "cement", "رمل": "sand", "حجارة": "stones",
  "خشب": "wood", "ألومنيوم": "aluminum", "نحاس": "copper",
  "بلاستيك": "plastic", "زجاج": "glass", "طوب": "bricks",
  "دهان": "paint", "أنابيب": "pipes", "أسلاك": "wires",
  "كابلات": "cables", "مسامير": "nails", "براغي": "screws",
  "أدوات": "tools", "معدات": "equipment", "آلات": "machines",
  "مضخات": "pumps", "مولدات": "generators", "محركات": "motors",
  "رافعة": "crane", "جرار": "tractor",
  "أدوية": "medical", "دواء": "drugs", "جراحي": "surgical",
  "مختبر": "laboratory", "تشخيص": "diagnostic", "أسنان": "dental",
  "قلب": "cardiac", "أشعة": "radiology", "تخدير": "anesthesia",
  "ضغط": "pressure", "قسطرة": "catheter", "خياطة": "sutures",
  "قفازات": "gloves", "أقنعة": "masks", "محاقن": "syringes",
  "أسرة": "beds", "كراسي متحركة": "wheelchairs",
  "حاسوب": "computer", "حاسبات": "computers", "كمبيوتر": "computer",
  "طابعة": "printer", "طابعات": "printers", "شبكة": "network",
  "برمجيات": "software", "برنامج": "software", "اتصالات": "communications",
  "هاتف": "phone", "جوال": "mobile", "لابتوب": "laptop",
  "شاشة": "monitor", "خادم": "server", "تخزين": "storage",
  "بيانات": "data", "أمن": "security", "كاميرا": "camera",
  "سيارات": "vehicles", "سيارة": "vehicle", "شاحنة": "truck",
  "شاحنات": "trucks", "حافلة": "bus", "طائرة": "aircraft",
  "سفينة": "ship", "قارب": "boat", "دراجة": "bicycle",
  "خدمات": "services", "صيانة": "maintenance", "تدريب": "training",
  "استشارات": "consulting", "نظافة": "cleaning", "حراسة": "security",
  "نقل": "transport", "شحن": "shipping", "تأمين": "insurance",
  "محاسبة": "accounting", "تدقيق": "audit", "هندسة": "engineering",
  "تصميم": "design", "إنشاء": "construction", "تشييد": "construction",
  "كهربائي": "electrical", "محولات": "transformers",
  "مصابيح": "lighting", "إضاءة": "lighting", "طاقة": "power",
  "بطارية": "battery", "شمسي": "solar", "لوحات": "panels",
  "قرطاسية": "stationery", "ورق": "paper", "أثاث": "furniture",
  "مكاتب": "desks", "كراسي": "chairs", "خزائن": "cabinets",
  "طباعة": "printing",
  "سلامة": "safety", "حريق": "fire", "إطفاء": "fire",
  "وقاية": "protection", "طوارئ": "emergency", "نفايات": "waste",
  "كيماويات": "chemicals", "وقود": "fuel", "بنزين": "gasoline",
  "ديزل": "diesel", "غاز": "gas", "زيوت": "oils",
  "مواد خام": "raw materials", "أحماض": "acid",
};

function buildDictionaries(userDict) {
  const AR_TO_EN = { ...BASE_AR_TO_EN };
  const EN_TO_AR = {};
  if (userDict && Array.isArray(userDict)) {
    for (const entry of userDict) {
      AR_TO_EN[entry.word_ar.toLowerCase()] = entry.word_en.toLowerCase();
    }
  }
  for (const [ar, en] of Object.entries(AR_TO_EN)) {
    if (!EN_TO_AR[en]) EN_TO_AR[en] = ar;
  }
  return { AR_TO_EN, EN_TO_AR };
}

function localTranslate(query, AR_TO_EN, EN_TO_AR) {
  const q = query.trim().toLowerCase();
  const isArabic = /[\u0600-\u06FF]/.test(q);
  if (isArabic) {
    if (AR_TO_EN[q]) return AR_TO_EN[q];
    for (const [ar, en] of Object.entries(AR_TO_EN)) {
      if (q.includes(ar) || ar.includes(q)) return en;
    }
  } else {
    if (EN_TO_AR[q]) return EN_TO_AR[q];
    for (const [en, ar] of Object.entries(EN_TO_AR)) {
      if (q.includes(en) || en.includes(q)) return ar;
    }
  }
  return "";
}

const RESULTS_LIMIT = 5;

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
    showMore: "عرض المزيد",
    showLess: "إخفاء",
    noTranslation: "لم يتم العثور على ترجمة لهذه الكلمة",
    addTranslation: "إضافة ترجمة",
    addToDictionary: "أضف إلى قاموسك",
    arabicWord: "الكلمة بالعربي",
    englishWord: "الكلمة بالإنجليزي",
    translationAdded: "تمت إضافة الترجمة للقاموس",
    confirm: "تأكيد النتيجة",
    reject: "رفض النتيجة",
    confirmed: "تم التأكيد",
    rejected: "مرفوضة",
    logout: "خروج",
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
    showMore: "Show More",
    showLess: "Show Less",
    noTranslation: "No translation found for this word",
    addTranslation: "Add Translation",
    addToDictionary: "Add to your dictionary",
    arabicWord: "Arabic word",
    englishWord: "English word",
    translationAdded: "Translation added to dictionary",
    confirm: "Confirm result",
    reject: "Reject result",
    confirmed: "Confirmed",
    rejected: "Rejected",
    logout: "Logout",
  },
};

// ─── مكون إضافة ترجمة ────────────────────────────────────────────────────────
function AddTranslationModal({ query, lang, darkMode, onAdd, onClose }) {
  const t = translations[lang];
  const isArabic = /[\u0600-\u06FF]/.test(query);
  const [wordAr, setWordAr] = useState(isArabic ? query : "");
  const [wordEn, setWordEn] = useState(!isArabic ? query : "");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!wordAr.trim() || !wordEn.trim()) return;
    setSaving(true);
    try {
      await apiClient.dictionary.add(wordAr.trim(), wordEn.trim());
      onAdd({ word_ar: wordAr.trim(), word_en: wordEn.trim() });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 ${darkMode ? "bg-gray-900 border border-gray-700" : "bg-white border border-slate-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold text-lg ${darkMode ? "text-white" : "text-slate-800"}`}>{t.addToDictionary}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        {done ? (
          <div className="text-center py-4 text-green-600 font-semibold">✓ {t.translationAdded}</div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-slate-600"}`}>{t.arabicWord}</label>
              <Input value={wordAr} onChange={e => setWordAr(e.target.value)} dir="rtl"
                className={darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50"} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-slate-600"}`}>{t.englishWord}</label>
              <Input value={wordEn} onChange={e => setWordEn(e.target.value)} dir="ltr"
                className={darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50"} />
            </div>
            <Button onClick={save} disabled={saving || !wordAr.trim() || !wordEn.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl mt-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 me-1" />{t.addTranslation}</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ملاحظة الترجمة المفقودة ──────────────────────────────────────────────
function NoTranslationBanner({ query, lang, darkMode, onAdd }) {
  const t = translations[lang];
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-4 border ${
      darkMode ? "bg-amber-950/40 border-amber-800 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
    }`}>
      <span className="text-sm">{t.noTranslation}: <strong>"{query}"</strong></span>
      <Button size="sm" variant="outline" onClick={onAdd}
        className={`shrink-0 text-xs gap-1 ${darkMode ? "border-amber-700 text-amber-300 hover:bg-amber-900" : "border-amber-400 text-amber-700"}`}>
        <Plus className="w-3 h-3" />{t.addTranslation}
      </Button>
    </div>
  );
}

// ─── أزرار تأكيد/رفض النتيجة ─────────────────────────────────────────────
function FeedbackButtons({ query, resultType, resultId, lang, darkMode, feedback, onFeedback }) {
  const t = translations[lang];
  const key = `${resultType}_${resultId}`;
  const current = feedback[key];

  const send = async (confirmed) => {
    try {
      await apiClient.feedback.send(query, resultType, resultId, confirmed);
      onFeedback(key, confirmed);
    } catch {}
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        onClick={() => current === true ? null : send(true)}
        title={t.confirm}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
          current === true
            ? "bg-green-500 text-white"
            : darkMode ? "text-gray-500 hover:text-green-400 hover:bg-green-900/30" : "text-slate-400 hover:text-green-600 hover:bg-green-50"
        }`}
      >
        <ThumbsUp className="w-3 h-3" />
        {current === true && <span>{t.confirmed}</span>}
      </button>
      <button
        onClick={() => current === false ? null : send(false)}
        title={t.reject}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
          current === false
            ? "bg-red-500 text-white"
            : darkMode ? "text-gray-500 hover:text-red-400 hover:bg-red-900/30" : "text-slate-400 hover:text-red-600 hover:bg-red-50"
        }`}
      >
        <ThumbsDown className="w-3 h-3" />
        {current === false && <span>{t.rejected}</span>}
      </button>
    </div>
  );
}

// ─── قسم النتائج مع عرض المزيد ───────────────────────────────────────────
function ResultSection({ title, count, countLabel, badgeClass, children, totalCount, lang, darkMode }) {
  const [expanded, setExpanded] = useState(false);
  const t = translations[lang];

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{title}</h2>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${badgeClass}`}>
          {count} {countLabel}
        </span>
      </div>
      {children(expanded)}
      {totalCount > RESULTS_LIMIT && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`mt-3 flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all ${
            darkMode ? "text-blue-400 hover:bg-gray-800" : "text-blue-600 hover:bg-blue-50"
          }`}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? t.showLess : `${t.showMore} (${totalCount - RESULTS_LIMIT})`}
        </button>
      )}
    </section>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────
export default function SearchPage() {
  const { user, logout } = useAuth();
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

  const [userDict, setUserDict] = useState([]);
  const [showAddTranslation, setShowAddTranslation] = useState(false);
  const [noTranslationFound, setNoTranslationFound] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  const [feedback, setFeedback] = useState({});
  const [rejectedIds, setRejectedIds] = useState({ mandatory: new Set(), unspsc: new Set(), hs: new Set() });

  const t = translations[lang];
  const isRTL = lang === "ar";

  useEffect(() => {
    apiClient.dictionary.list()
      .then(data => setUserDict(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const { AR_TO_EN, EN_TO_AR } = buildDictionaries(userDict);

  useEffect(() => {
    base44.entities.MandatoryProduct.list("segment_title_ar", 5000).then((all) => {
      const sectors = [...new Set(
        all.map((p) => p.segment_title_ar || p.segment_title_en || p.sector || "").filter(Boolean)
      )].sort();
      setAllSectors(sectors);
    });
  }, []);

  const handleFeedback = (key, confirmed) => {
    setFeedback(prev => ({ ...prev, [key]: confirmed }));
    if (!confirmed) {
      const [type, ...rest] = key.split("_");
      const id = rest.join("_");
      setRejectedIds(prev => ({
        ...prev,
        [type]: new Set([...prev[type], id]),
      }));
    }
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    setSelectedSector("");
    setCodeFilter("");
    setFeedback({});
    setLastQuery(query.trim());

    try {
      const q = query.trim().toLowerCase();
      const translatedQ = localTranslate(q, AR_TO_EN, EN_TO_AR);
      setNoTranslationFound(!translatedQ);

      const buildOr = (fields) => {
        const terms = [q, translatedQ].filter(Boolean);
        return fields.flatMap((field) =>
          terms.map((term) => ({ [field]: { $regex: term, $options: "i" } }))
        );
      };

      let rejectedData = { mandatory: new Set(), unspsc: new Set(), hs: new Set() };
      try {
        const rej = await apiClient.feedback.getRejected(q);
        for (const r of rej) {
          if (r.result_type === "mandatory") rejectedData.mandatory.add(r.result_id);
          else if (r.result_type === "unspsc") rejectedData.unspsc.add(r.result_id);
          else if (r.result_type === "hs") rejectedData.hs.add(r.result_id);
        }
      } catch {}
      setRejectedIds(rejectedData);

      const [allMandatory, unspscFiltered, hsFiltered] = await Promise.all([
        base44.entities.MandatoryProduct.filter(
          { $or: buildOr(["product_name_ar", "product_name_en", "product_desc_ar", "product_desc_en", "segment_title_ar", "segment_title_en", "etimad_code"]) },
          "etimad_code", 500
        ),
        base44.entities.UNSPSCCode.filter(
          translatedQ
            ? { $or: [{ title: { $regex: q, $options: "i" } }, { title: { $regex: translatedQ, $options: "i" } }] }
            : { title: { $regex: q, $options: "i" } },
          "title", 100
        ),
        base44.entities.HSCode.filter(
          { $or: buildOr(["name_ar", "name_en"]) },
          "code", 100
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

      const mandatoryWithScore = allMandatory.map(p => ({ ...p, _score: scoreMandatory(p) }));
      mandatoryWithScore.sort((a, b) => b._score - a._score);

      const seen = new Set();
      const uniqueMandatory = mandatoryWithScore
        .filter(p => { const key = p.etimad_code || p.id; if (seen.has(key)) return false; seen.add(key); return true; })
        .filter(p => !rejectedData.mandatory.has(String(p.id)));

      const seenCodes = new Set();
      const uniqueUnspsc = unspscFiltered
        .filter(u => { if (seenCodes.has(u.code)) return false; seenCodes.add(u.code); return true; })
        .filter(u => !rejectedData.unspsc.has(String(u.id)));

      const seenHs = new Set();
      const uniqueHs = hsFiltered
        .filter(h => { if (seenHs.has(h.code)) return false; seenHs.add(h.code); return true; })
        .filter(h => !rejectedData.hs.has(String(h.id)));

      setRawMandatory(uniqueMandatory);
      setMandatoryResults(uniqueMandatory);
      setUnspscResults(uniqueUnspsc);
      setHsResults(uniqueHs);
      setShowHistory(false);

      try {
        await apiClient.entities.SearchLog.create({
          query: query.trim(), mandatory_count: uniqueMandatory.length,
          unspsc_count: uniqueUnspsc.length, hs_count: uniqueHs.length, lang,
        });
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, AR_TO_EN, EN_TO_AR]);

  useEffect(() => {
    let filtered = rawMandatory
      .filter(p => !rejectedIds.mandatory.has(String(p.id)));
    if (selectedSector) {
      filtered = filtered.filter(p => (p.segment_title_ar || p.segment_title_en || p.sector || "") === selectedSector);
    }
    if (codeFilter.trim()) {
      filtered = filtered.filter(p => p.etimad_code && String(p.etimad_code).toLowerCase().includes(codeFilter.trim().toLowerCase()));
    }
    setMandatoryResults(filtered);
  }, [selectedSector, codeFilter, rawMandatory, rejectedIds.mandatory]);

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSearch(); };
  const hasActiveFilters = selectedSector || codeFilter;

  const handleAddTranslation = (entry) => {
    setUserDict(prev => [...prev, entry]);
    setShowAddTranslation(false);
    setNoTranslationFound(false);
  };

  const visibleUnspsc = unspscResults.filter(u => !rejectedIds.unspsc.has(String(u.id)));
  const visibleHs = hsResults.filter(h => !rejectedIds.hs.has(String(h.id)));

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-950" : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
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
            {user && (
              <span className={`text-xs px-2 py-1 rounded-lg hidden sm:block ${darkMode ? "bg-gray-800 text-gray-300" : "bg-slate-100 text-slate-500"}`}>
                {user.email}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className={`gap-1 ${darkMode ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-slate-600"}`}>
              <Globe className="w-4 h-4" />
              {lang === "ar" ? "EN" : "عر"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)}
              className={darkMode ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-slate-600"}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} title={t.logout}
              className={darkMode ? "text-gray-400 hover:text-red-400 hover:bg-gray-800" : "text-slate-400 hover:text-red-600"}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${darkMode ? "text-white" : "text-slate-800"}`}>{t.title}</h1>
          <p className={`text-base max-w-2xl mx-auto ${darkMode ? "text-gray-400" : "text-slate-500"}`}>{t.subtitle}</p>
        </div>

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
                {hasActiveFilters && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />}
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
          <>
            {noTranslationFound && (
              <NoTranslationBanner
                query={lastQuery} lang={lang} darkMode={darkMode}
                onAdd={() => setShowAddTranslation(true)}
              />
            )}
            <div className={`flex gap-6 ${isRTL ? "flex-row-reverse" : ""}`}>
              {showFilters && (
                <FilterSidebar
                  darkMode={darkMode} t={t} lang={lang} sectors={allSectors}
                  selectedSector={selectedSector} onSectorChange={setSelectedSector}
                  codeFilter={codeFilter} onCodeFilterChange={setCodeFilter}
                  onClear={() => { setSelectedSector(""); setCodeFilter(""); }}
                  hasActiveFilters={hasActiveFilters}
                />
              )}

              <div className="flex-1 min-w-0 space-y-10">
                <div className="flex flex-col gap-4">
                  <SmartComparison query={query} mandatoryResults={mandatoryResults}
                    unspscResults={visibleUnspsc} hsResults={visibleHs} darkMode={darkMode} lang={lang} />
                  <div className="flex justify-end">
                    <ExportButton query={query} mandatoryResults={mandatoryResults}
                      unspscResults={visibleUnspsc} hsResults={visibleHs} darkMode={darkMode} lang={lang} />
                  </div>
                </div>

                <ResultSection
                  title={`🇸🇦 ${t.mandatory}`} count={mandatoryResults.length}
                  countLabel={t.mandatoryCount} totalCount={mandatoryResults.length}
                  badgeClass={darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}
                  lang={lang} darkMode={darkMode}
                >
                  {(expanded) => mandatoryResults.length === 0 ? (
                    <div className={`text-center py-10 rounded-xl ${darkMode ? "bg-gray-900 text-gray-500" : "bg-white text-slate-400"}`}>{t.noResults}</div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {mandatoryResults.slice(0, expanded ? undefined : RESULTS_LIMIT).map((p, idx) => (
                        <div key={p.id}>
                          <MandatoryResultCard product={p} lang={lang} darkMode={darkMode} t={t} isRTL={isRTL} isBestMatch={idx === 0 && p._score > 0} />
                          <FeedbackButtons
                            query={lastQuery.toLowerCase()} resultType="mandatory" resultId={String(p.id)}
                            lang={lang} darkMode={darkMode} feedback={feedback} onFeedback={handleFeedback}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </ResultSection>

                <ResultSection
                  title={`🌐 ${t.unspsc}`} count={visibleUnspsc.length}
                  countLabel={t.unspscCount} totalCount={visibleUnspsc.length}
                  badgeClass={darkMode ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-700"}
                  lang={lang} darkMode={darkMode}
                >
                  {(expanded) => visibleUnspsc.length === 0 ? (
                    <div className={`text-center py-10 rounded-xl ${darkMode ? "bg-gray-900 text-gray-500" : "bg-white text-slate-400"}`}>{t.noResults}</div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {visibleUnspsc.slice(0, expanded ? undefined : RESULTS_LIMIT).map((u, idx) => (
                        <div key={u.id}>
                          <UNSPSCResultCard item={u} darkMode={darkMode} t={t} lang={lang} isBestMatch={idx === 0} />
                          <FeedbackButtons
                            query={lastQuery.toLowerCase()} resultType="unspsc" resultId={String(u.id)}
                            lang={lang} darkMode={darkMode} feedback={feedback} onFeedback={handleFeedback}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </ResultSection>

                <ResultSection
                  title={`🛃 ${t.hsCode}`} count={visibleHs.length}
                  countLabel={t.hsCount} totalCount={visibleHs.length}
                  badgeClass={darkMode ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-700"}
                  lang={lang} darkMode={darkMode}
                >
                  {(expanded) => visibleHs.length === 0 ? (
                    <div className={`text-center py-10 rounded-xl ${darkMode ? "bg-gray-900 text-gray-500" : "bg-white text-slate-400"}`}>{t.noResults}</div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {visibleHs.slice(0, expanded ? undefined : RESULTS_LIMIT).map((h, idx) => (
                        <div key={h.id}>
                          <HSCodeResultCard item={h} darkMode={darkMode} lang={lang} isBestMatch={idx === 0} />
                          <FeedbackButtons
                            query={lastQuery.toLowerCase()} resultType="hs" resultId={String(h.id)}
                            lang={lang} darkMode={darkMode} feedback={feedback} onFeedback={handleFeedback}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </ResultSection>
              </div>
            </div>
          </>
        )}
      </main>

      {showAddTranslation && (
        <AddTranslationModal
          query={lastQuery} lang={lang} darkMode={darkMode}
          onAdd={handleAddTranslation}
          onClose={() => setShowAddTranslation(false)}
        />
      )}
    </div>
  );
}
