import React, { useState } from 'react';
import {
  User,
  Clock,
  ShieldCheck,
  History,
  Info,
  CheckCircle2,
  FileText,
  Lock,
  Sparkles
} from 'lucide-react';
import { EntityAuditMetadata } from '../types';
import { formatAuditDateTime, formatRelativeAuditTime } from '../utils/auditTrigger';
import { EntityAuditHistoryModal } from './EntityAuditHistoryModal';

interface RecordAuditInfoProps {
  metadata?: EntityAuditMetadata;
  recordTitle?: string;
  recordTypeLabel?: string;
  recordId?: string;
  variant?: 'card-footer' | 'compact-row' | 'modal-banner' | 'receipt-stamp' | 'badge-only';
  className?: string;
  showHistoryButton?: boolean;
}

export const RecordAuditInfo: React.FC<RecordAuditInfoProps> = ({
  metadata,
  recordTitle = 'السجل',
  recordTypeLabel = 'السجل',
  recordId = 'N/A',
  variant = 'card-footer',
  className = '',
  showHistoryButton = true,
}) => {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const creatorName = metadata?.createdByName || 'مدير النظام';
  const creatorRole = metadata?.createdByRole || 'المدير العام';
  const creatorUsername = metadata?.createdByUsername;
  const createdDate = metadata?.createdAt ? formatAuditDateTime(metadata.createdAt) : null;
  const createdRelative = metadata?.createdAt ? formatRelativeAuditTime(metadata.createdAt) : null;

  const updaterName = metadata?.updatedByName;
  const updaterRole = metadata?.updatedByRole;
  const updatedDate = metadata?.updatedAt ? formatAuditDateTime(metadata.updatedAt) : null;
  const updatedRelative = metadata?.updatedAt ? formatRelativeAuditTime(metadata.updatedAt) : null;

  // 1. Receipt Stamp (للطباعة في الفواتير وسندات القبض والصرف الرسمية)
  if (variant === 'receipt-stamp') {
    return (
      <div className={`text-[10px] text-slate-500 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between gap-2 flex-wrap ${className}`}>
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 no-print" />
          <span>توثيق النظام: أنشئ بواسطة <strong>{creatorName}</strong> ({creatorRole}) {createdDate ? `في ${createdDate}` : ''}</span>
        </div>
        {updaterName && (
          <span className="text-[9px] text-slate-400">
            • آخر مراجعة: {updaterName} ({updatedDate})
          </span>
        )}
        <span className="font-mono text-[9px] text-slate-400 no-print">
          [ختم سلامة البيانات الرقمي - Verified CDC Trigger]
        </span>
      </div>
    );
  }

  // 2. Badge Only (للقوائم السريعة والجداول)
  if (variant === 'badge-only') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsHistoryModalOpen(true)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-800 text-[10px] text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer ${className}`}
          title={`أنشئ بواسطة: ${creatorName} (${creatorRole})`}
        >
          <User className="w-2.5 h-2.5 text-indigo-400" />
          <span className="truncate max-w-[110px]">{creatorName}</span>
          <History className="w-2.5 h-2.5 text-slate-500 hover:text-indigo-400" />
        </button>

        {isHistoryModalOpen && (
          <EntityAuditHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            title={recordTitle}
            entityName={recordTitle}
            entityTypeLabel={recordTypeLabel}
            recordId={recordId}
            metadata={metadata}
          />
        )}
      </>
    );
  }

  // 3. Compact Row (لصفوف الجداول)
  if (variant === 'compact-row') {
    return (
      <>
        <div className={`flex flex-col text-[11px] leading-tight ${className}`}>
          <div className="flex items-center gap-1 text-slate-200">
            <span className="font-semibold truncate max-w-[130px]">{creatorName}</span>
            {creatorUsername && (
              <span className="text-[10px] text-slate-500 font-mono font-normal">({creatorUsername})</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
            <span className="text-indigo-400/90">{creatorRole}</span>
            {createdRelative && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500">{createdRelative}</span>
              </>
            )}
            {showHistoryButton && (
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-indigo-400 hover:text-indigo-300 p-0.5 transition cursor-pointer"
                title="معاينة سجل التريجر وتاريخ التعديلات"
              >
                <History className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {isHistoryModalOpen && (
          <EntityAuditHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            title={recordTitle}
            entityName={recordTitle}
            entityTypeLabel={recordTypeLabel}
            recordId={recordId}
            metadata={metadata}
          />
        )}
      </>
    );
  }

  // 4. Modal Banner (داخل نوافذ التعديل والتفاصيل والمعاينة)
  if (variant === 'modal-banner') {
    return (
      <>
        <div className={`bg-slate-950/80 p-3 rounded-xl border border-indigo-500/20 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <span>أنشئ بواسطة:</span>
                <span className="text-indigo-300">{creatorName}</span>
                {creatorUsername && <span className="text-slate-400 font-mono text-[11px]">({creatorUsername})</span>}
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-normal">
                  {creatorRole}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                {createdDate && <span>التاريخ: <strong className="font-mono text-slate-300">{createdDate}</strong></span>}
                {updaterName && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span>آخر تعديل: <strong className="text-cyan-300">{updaterName}</strong> ({updatedRelative || updatedDate})</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {showHistoryButton && (
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-[11px] font-bold transition self-end sm:self-center cursor-pointer shrink-0"
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل التتبع والعمليات</span>
            </button>
          )}
        </div>

        {isHistoryModalOpen && (
          <EntityAuditHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            title={recordTitle}
            entityName={recordTitle}
            entityTypeLabel={recordTypeLabel}
            recordId={recordId}
            metadata={metadata}
          />
        )}
      </>
    );
  }

  // 5. Default Card Footer (أسفل بطاقات الفئات ونقاط البيع والطلبات)
  return (
    <>
      <div className={`px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between gap-2 ${className}`}>
        <div className="flex items-center gap-1.5 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">المنشئ: </span>
            <span className="font-semibold text-slate-200">{creatorName}</span>
            <span className="text-[10px] text-indigo-300/80 mr-1">({creatorRole})</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {createdRelative && (
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline" title={createdDate || ''}>
              {createdRelative}
            </span>
          )}
          {showHistoryButton && (
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 text-[10px]"
              title="معاينة التريجر وتاريخ التعديلات الكامل"
            >
              <History className="w-3 h-3 text-indigo-400" />
              <span className="hidden md:inline">التريجر</span>
            </button>
          )}
        </div>
      </div>

      {isHistoryModalOpen && (
        <EntityAuditHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          title={recordTitle}
          entityName={recordTitle}
          entityTypeLabel={recordTypeLabel}
          recordId={recordId}
          metadata={metadata}
        />
      )}
    </>
  );
};
