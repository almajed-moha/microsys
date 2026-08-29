import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  TrendingUp,
  PackagePlus,
  Terminal,
  Send,
  Loader2,
  X,
  Copy,
  Check,
  CheckCircle,
  Lightbulb
} from 'lucide-react';
import { CardCategory, POSPoint, SalesRecord, NetworkSettings } from '../types';

interface AIAssistantModalProps {
  categories: CardCategory[];
  posPoints: POSPoint[];
  sales: SalesRecord[];
  settings: NetworkSettings;
  onClose: () => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  categories,
  posPoints,
  sales,
  settings,
  onClose,
}) => {
  const [activeMode, setActiveMode] = useState<'analytics' | 'bundles' | 'mikrotik'>('analytics');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // MikroTik Query
  const [userQuery, setUserQuery] = useState('');

  // 1. Analyze Sales with AI
  const handleAnalyzeSales = async () => {
    setLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch('/api/ai/analyze-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales, posPoints, categories }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiResponse(data.error || 'تعذر استكمال تحليل المبيعات.');
      } else {
        setAiResponse(data.analysis || data.response || 'تم إتمام التحليل بنجاح.');
      }
    } catch (err: any) {
      setAiResponse(`تعذر الاتصال بخدمة الذكاء الاصطناعي: ${err.message || 'خطأ في الشبكة'}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Suggest Bundles with AI
  const handleSuggestBundles = async () => {
    setLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch('/api/ai/suggest-bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: categories || [],
          salesSummary: {
            totalSales: (sales || []).reduce((acc, s) => acc + (s?.totalRetailAmount || 0), 0),
            totalCardsSold: (sales || []).reduce((acc, s) => acc + (s?.quantity || 0), 0),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiResponse(data.error || 'تعذر اقتراح الباقات.');
      } else {
        setAiResponse(data.suggestions || data.response || 'تم توليد مقترحات الباقات بنجاح.');
      }
    } catch (err: any) {
      setAiResponse(`تعذر الاتصال بخدمة الذكاء الاصطناعي: ${err.message || 'خطأ في الشبكة'}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Ask MikroTik Assistant
  const handleAskMikroTik = async (queryText?: string) => {
    const query = queryText || userQuery;
    if (!query.trim()) return;

    setLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch('/api/ai/mikrotik-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiResponse(data.error || 'تعذر معالجة الطلب عبر المساعد الذكي.');
      } else {
        setAiResponse(data.reply || data.response || 'تم توليد الإجابة والسكربت بنجاح.');
      }
    } catch (err: any) {
      setAiResponse(`حدث خطأ أثناء معالجة الطلب: ${err.message || 'خطأ في الشبكة'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!aiResponse) return;
    navigator.clipboard.writeText(aiResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="sticky top-0 z-20 p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-slate-800 flex items-center justify-between gap-2 backdrop-blur-md">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                <span className="truncate">مساعد الذكاء الاصطناعي لشبكات MikroTik</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                  Gemini Pro
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                تحليل ذكي للمبيعات، ابتكار باقات ذات ربحية أعلى، واستشارات فنية لراوترات مايكروتك.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex-shrink-0"
            title="إغلاق النافذة"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 p-4 bg-slate-950/60 border-b border-slate-800 text-xs sticky top-0 z-10 backdrop-blur-xs">
          <button
            onClick={() => {
              setActiveMode('analytics');
              setAiResponse(null);
            }}
            className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
              activeMode === 'analytics'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>تحليل أداء المبيعات والموزعين</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('bundles');
              setAiResponse(null);
            }}
            className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
              activeMode === 'bundles'
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/25'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <PackagePlus className="w-4 h-4" />
            <span>مقترحات الباقات والعروض الذكية</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('mikrotik');
              setAiResponse(null);
            }}
            className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
              activeMode === 'mikrotik'
                ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/25'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>خبير إعداد وسكربتات MikroTik</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs max-h-[60vh] overflow-y-auto">
          {/* 1. Analytics Trigger */}
          {activeMode === 'analytics' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-white text-sm">تحليل البيانات التشغيلية</h4>
                  <p className="text-slate-400 mt-0.5">
                    يقوم الذكاء الاصطناعي بفحص {sales.length} عملية بيع و {posPoints.length} نقطة توزيع لاكتشاف النقاط الأكثر كفاءة والديون المعرضة للمخاطر.
                  </p>
                </div>
                <button
                  onClick={handleAnalyzeSales}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow transition flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>بدء التحليل الفوري</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Bundle Strategy Trigger */}
          {activeMode === 'bundles' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-white text-sm">ابتكار باقات جديدة ذات هامش ربح مرتفع</h4>
                  <p className="text-slate-400 mt-0.5">
                    اقتراح فئات كروت مميزة مثل: باقات الليل (Happy Hour)، باقات الطلاب، أو باقات الألعاب السريعة.
                  </p>
                </div>
                <button
                  onClick={handleSuggestBundles}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow transition flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                  <span>توليد أفكار الباقات</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. MikroTik Interactive Assistant */}
          {activeMode === 'mikrotik' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">
                  اطرح أي سؤال فني أو اطلب سكربت RouterOS محدد:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="مثال: كيف أعمل حظر للمواقع الإباحية في الهوتسبوت؟ أو سكربت لحذف المستخدمين منتهيي الصلاحية"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskMikroTik()}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleAskMikroTik()}
                    disabled={loading || !userQuery}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>إرسال</span>
                  </button>
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-slate-400">أسئلة شائعة جاهزة:</span>
                {[
                  'سكربت حذف كروت الهوتسبوت المنتهية تلقائياً',
                  'توزيع سرعة عادل PCQ لكل المستخدمين',
                  'منع برامج مشاركة النت NetShare و PdaNet',
                  'إعداد صفحة تسجيل الدخول HTTPS و SSL',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setUserQuery(q);
                      handleAskMikroTik(q);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded border border-slate-700/60 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 text-center text-indigo-400 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs font-semibold text-slate-300">
                جاري المعالجة والتحليل بواسطة نموذج Gemini...
              </p>
            </div>
          )}

          {/* AI Response Viewer */}
          {aiResponse && !loading && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Bot className="w-4 h-4" />
                  <span>نتائج وتوصيات الذكاء الاصطناعي:</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
                </button>
              </div>

              <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {aiResponse}
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>إغلاق المساعد</span>
          </button>
        </div>
      </div>
    </div>
  );
};
