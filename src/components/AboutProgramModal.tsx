import React from 'react';
import {
  Info,
  X,
  Phone,
  MessageSquare,
  Building2,
  ShieldCheck,
  Cpu,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  Globe,
  Award,
} from 'lucide-react';
import { NetworkSettings } from '../types';

interface AboutProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: NetworkSettings;
}

export const AboutProgramModal: React.FC<AboutProgramModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  const developerName = 'ميراب سوفت التقنية';
  const country = 'اليمن';
  const phoneNumber = '773703240';
  const internationalPhone = '967773703240';

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
        {/* Header with decorative background */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 border-b border-slate-800 text-center overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mb-3 border border-white/20">
            <Cpu className="w-9 h-9" />
          </div>

          <h2 className="text-xl font-black text-white">
            حول البرنامج
          </h2>
          <p className="text-xs text-indigo-300 font-medium mt-1">
            نظام إدارة شبكات المايكروتك ونقاط البيع السحابية (MicroSys Pro)
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Main Developer Info Card */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-950 to-purple-950/50 border border-indigo-500/40 rounded-2xl p-4 shadow-inner space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-400">إعداد وتطوير المنظومة:</span>
                <h3 className="text-base font-black text-white">
                  {developerName} - {country}
                </h3>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">هاتف / واتساب:</span>
              </div>
              <span className="text-sm font-black font-mono text-emerald-400 tracking-wider" dir="ltr">
                {phoneNumber}
              </span>
            </div>
          </div>

          {/* Quick Contact Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={`https://wa.me/${internationalPhone}?text=${encodeURIComponent(
                'السلام عليكم ميراب سوفت التقنية، أود الاستفسار حول منظومة إدارة شبكات المايكروتك ونقاط البيع.'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <MessageSquare className="w-4 h-4" />
              <span>واتساب مباشر</span>
            </a>

            <a
              href={`tel:${phoneNumber}`}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold transition flex items-center justify-center gap-2 border border-slate-700"
            >
              <Phone className="w-4 h-4 text-cyan-400" />
              <span>اتصال مباشر</span>
            </a>
          </div>

          {/* Features / Modules Summary */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-300 font-bold border-b border-slate-850 pb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>ميزات وإمكانيات المنظومة:</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>إدارة راوترات المايكروتك مباشرة</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>بوابة موزع ونقاط بيع متكاملة</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>نظام محاسبي ومتابعة مديونيات</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>طباعة حرارية 80/58mm و A4</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>عزل أمني للشبكات الفرعية</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>سجل نشاط ورقابة وتدقيق آلي</span>
              </div>
            </div>
          </div>

          {/* System Version & Rights */}
          <div className="text-center text-[11px] text-slate-500 space-y-0.5 pt-1">
            <p>جميع الحقوق محفوظة © {new Date().getFullYear()} {developerName}</p>
            <p className="font-mono text-[10px] text-slate-600">الإصدار: v3.5 Pro Multi-Tenant & RBAC</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
