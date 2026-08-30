import React from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  User,
  History,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  FileText,
  Lock,
  Sparkles,
  Info
} from 'lucide-react';
import { AuditHistoryEntry, EntityAuditMetadata } from '../types';
import { formatAuditDateTime, formatRelativeAuditTime, generateAuditIntegrityCode } from '../utils/auditTrigger';

interface EntityAuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityName?: string;
  entityTypeLabel?: string;
  recordId?: string;
  metadata?: EntityAuditMetadata;
}

export const EntityAuditHistoryModal: React.FC<EntityAuditHistoryModalProps> = ({
  isOpen,
  onClose,
  title,
  entityName,
  entityTypeLabel = 'السجل',
  recordId = 'N/A',
  metadata,
}) => {
  if (!isOpen) return null;

  const history = metadata?.auditHistory || [];
  const createdDateFormatted = formatAuditDateTime(metadata?.createdAt);
  const updatedDateFormatted = metadata?.updatedAt ? formatAuditDateTime(metadata?.updatedAt) : null;
  const integrityCode = generateAuditIntegrityCode(recordId, metadata?.createdAt || new Date().toISOString(), metadata?.createdBy || 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  سجل التتبع والتريجر الرقابي
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {integrityCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {entityTypeLabel}: <span className="text-slate-200 font-semibold">{entityName || title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Summary Integrity Card */}
          <div className="bg-slate-950/80 rounded-xl border border-indigo-500/20 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>شهادة سلامة وتوثيق البيانات الرقمية (Data Integrity Stamp)</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                سجل محمي وموثق
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">أنشئ بواسطة:</span>
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{metadata?.createdByName || 'مدير النظام'}</span>
                  {metadata?.createdByUsername && (
                    <span className="text-[10px] text-slate-400 font-mono font-normal">({metadata.createdByUsername})</span>
                  )}
                </div>
                <div className="text-[10px] text-indigo-300/90 mt-1">
                  الدور: <strong>{metadata?.createdByRole || 'المدير العام'}</strong>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{createdDateFormatted}</span>
                </div>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">آخر تحديث وتعديل:</span>
                {metadata?.updatedByName ? (
                  <>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{metadata.updatedByName}</span>
                      {metadata.updatedByUsername && (
                        <span className="text-[10px] text-slate-400 font-mono font-normal">({metadata.updatedByUsername})</span>
                      )}
                    </div>
                    <div className="text-[10px] text-cyan-300/90 mt-1">
                      الدور: <strong>{metadata.updatedByRole || 'المسؤول'}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{updatedDateFormatted} ({formatRelativeAuditTime(metadata.updatedAt)})</span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 text-xs italic mt-2">
                    لم يطرأ أي تعديل بعد (بيانات الإنشاء الأصلية ما زالت سارية)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline of Trigger Events */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>سجل الحركات والتعديلات المتسلسلة ({history.length || 1} حدث)</span>
              </h4>
              <span className="text-[11px] text-slate-400">مرتبة من الأحدث إلى الأقدم</span>
            </div>

            {history.length === 0 ? (
              /* Fallback if no detailed history array */
              <div className="relative pr-6 border-r-2 border-slate-800 space-y-4">
                <div className="relative">
                  <div className="absolute -right-[31px] top-1 w-4 h-4 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center"></div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">الإنشاء الأولي في قاعدة البيانات</span>
                      <span className="text-[10px] text-slate-400 font-mono">{createdDateFormatted}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      قام <strong>{metadata?.createdByName || 'المستخدم'}</strong> ({metadata?.createdByRole || 'المسؤول'}) بإنشاء هذا السجل رسمياً في النظام.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative pr-6 border-r-2 border-slate-800 space-y-4">
                {history.map((entry, idx) => (
                  <div key={entry.id || idx} className="relative">
                    <div className={`absolute -right-[31px] top-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                      entry.actionType === 'create'
                        ? 'bg-emerald-500'
                        : entry.actionType === 'delete'
                        ? 'bg-rose-500'
                        : entry.actionType === 'financial'
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}></div>

                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{entry.action}</span>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                            entry.actionType === 'create'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : entry.actionType === 'financial'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                          }`}>
                            {entry.actionType === 'create' ? 'إنشاء' : entry.actionType === 'financial' ? 'عملية مالية' : 'تعديل'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatAuditDateTime(entry.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>بواسطة: <strong className="text-white">{entry.userName}</strong></span>
                        {entry.userRole && (
                          <span className="text-indigo-300 text-[10px]">({entry.userRole})</span>
                        )}
                        {entry.userUsername && (
                          <span className="text-slate-500 font-mono text-[10px]">{entry.userUsername}</span>
                        )}
                      </div>

                      {entry.details && (
                        <p className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg mt-2 border border-slate-800/80">
                          {entry.details}
                        </p>
                      )}

                      {entry.changesSummary && !entry.details && (
                        <p className="text-[10px] text-slate-500 mt-1 italic">
                          {entry.changesSummary}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>نظام التدقيق الرقمي النشط • تتبع التريجر التلقائي مفعل</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-md"
          >
            إغلاق المعاينة
          </button>
        </div>
      </div>
    </div>
  );
};
