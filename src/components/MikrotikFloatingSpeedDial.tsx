import React, { useState, useEffect } from 'react';
import {
  Server,
  Zap,
  Users,
  Activity,
  Layers,
  ChevronUp,
  X,
  RefreshCw,
  Sliders,
  Sparkles,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { NetworkSettings } from '../types';

interface MikrotikFloatingSpeedDialProps {
  settings: NetworkSettings;
  onOpenQuickLauncher: () => void;
  onNavigateToMikrotik: (subTab?: string, umTab?: string) => void;
  activeUsersCount?: number;
  currentView: string;
}

export const MikrotikFloatingSpeedDial: React.FC<MikrotikFloatingSpeedDialProps> = ({
  settings,
  onOpenQuickLauncher,
  onNavigateToMikrotik,
  activeUsersCount = 0,
  currentView,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isConnected = settings.mikrotikConfig?.isLiveConnected ?? false;

  // Listen for global keyboard shortcuts (Alt+M for launcher, Alt+U for user manager, Alt+A for active users, Alt+G for batch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing when typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.altKey && (e.key === 'm' || e.key === 'M' || e.key === 'ة')) {
        e.preventDefault();
        onOpenQuickLauncher();
      } else if (e.altKey && (e.key === 'u' || e.key === 'U' || e.key === 'ع')) {
        e.preventDefault();
        onNavigateToMikrotik('user_manager', 'users');
      } else if (e.altKey && (e.key === 'a' || e.key === 'A' || e.key === 'ش')) {
        e.preventDefault();
        onNavigateToMikrotik('active_users');
      } else if (e.altKey && (e.key === 'g' || e.key === 'G' || e.key === 'ل')) {
        e.preventDefault();
        onNavigateToMikrotik('user_manager', 'batch');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenQuickLauncher, onNavigateToMikrotik]);

  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2 select-none print:hidden">
      {/* Expanded Quick Actions Menu */}
      {isOpen && (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md w-64 flex flex-col gap-1.5 animate-in slide-in-from-bottom-4 fade-in duration-150">
          <div className="flex items-center justify-between px-2 py-1 text-xs border-b border-slate-800 pb-1.5 mb-0.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>إجراءات مايكروتك السريعة</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
          </div>

          {/* 1. User Manager Instant Jump */}
          <button
            type="button"
            onClick={() => {
              onNavigateToMikrotik('user_manager', 'users');
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 transition text-right cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400 shrink-0" />
              <span>اليوزر مانجر (User Manager)</span>
            </div>
            <kbd className="text-[10px] font-mono text-purple-300 px-1 py-0.5 bg-black/30 rounded">Alt+U</kbd>
          </button>

          {/* 2. Instant Batch Card Generator */}
          <button
            type="button"
            onClick={() => {
              onNavigateToMikrotik('user_manager', 'batch');
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 transition text-right cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>توليد كروت سريع (Batch)</span>
            </div>
            <kbd className="text-[10px] font-mono text-amber-300 px-1 py-0.5 bg-black/30 rounded">Alt+G</kbd>
          </button>

          {/* 3. Hotspot Active Users */}
          <button
            type="button"
            onClick={() => {
              onNavigateToMikrotik('active_users');
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 transition text-right cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>المستخدمين النشطين</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black">
              {activeUsersCount}
            </span>
          </button>

          {/* 4. Daily Usage Report */}
          <button
            type="button"
            onClick={() => {
              onNavigateToMikrotik('user_manager', 'daily-report');
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition text-right cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>تقرير الاستهلاك اليومي</span>
            </div>
          </button>

          {/* 5. Open Full Quick Launcher Center */}
          <button
            type="button"
            onClick={() => {
              onOpenQuickLauncher();
              setIsOpen(false);
            }}
            className="mt-1 w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>عرض كافة أقسام مايكروتك (Alt+M)</span>
          </button>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-2xl shadow-xl transition-all duration-200 cursor-pointer border active:scale-95 ${
            isOpen
              ? 'bg-slate-900 text-white border-slate-700 ring-2 ring-indigo-500/50'
              : 'bg-slate-900/95 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700/80 hover:border-indigo-500/50'
          }`}
          title="اختصارات مايكروتك واليوزر مانجر السريعة (Alt+M)"
        >
          <div className="relative flex items-center justify-center">
            <Server className="w-4 h-4 text-purple-400" />
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
          </div>

          <span className="text-xs font-black hidden sm:inline">
            مايكروتك سريع
          </span>

          <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            UM
          </span>

          {isOpen ? (
            <X className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {/* Dedicated 1-Click Launch Button directly to User Manager */}
        <button
          type="button"
          onClick={() => onNavigateToMikrotik('user_manager', 'users')}
          className="p-2 sm:p-2.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/40 shadow-lg transition cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-bold"
          title="دخول فوري ومباشر إلى اليوزر مانجر (Alt+U)"
        >
          <Zap className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="hidden md:inline">اليوزر مانجر</span>
        </button>
      </div>
    </div>
  );
};
