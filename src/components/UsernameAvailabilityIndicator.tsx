import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Sparkles, XCircle } from 'lucide-react';
import { UsernameValidationResult } from '../utils/usernameValidator';

interface UsernameAvailabilityIndicatorProps {
  validation: UsernameValidationResult;
  onSelectSuggestion?: (suggestion: string) => void;
  className?: string;
}

export const UsernameAvailabilityIndicator: React.FC<UsernameAvailabilityIndicatorProps> = ({
  validation,
  onSelectSuggestion,
  className = '',
}) => {
  if (validation.status === 'empty') {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-slate-400 mt-1.5 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        <span>اسم المستخدم يجب أن يكون فريداً عبر كافة الشبكات والحسابات ونقاط البيع.</span>
      </div>
    );
  }

  if (validation.status === 'too_short') {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-amber-400 font-medium mt-1.5 ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>{validation.message}</span>
      </div>
    );
  }

  if (validation.status === 'invalid_format') {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-rose-400 font-medium mt-1.5 ${className}`}>
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{validation.message}</span>
      </div>
    );
  }

  if (validation.status === 'taken') {
    return (
      <div className={`space-y-1.5 mt-1.5 ${className}`}>
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="font-bold">{validation.message}</span>
        </div>

        {validation.suggestedUsernames && validation.suggestedUsernames.length > 0 && onSelectSuggestion && (
          <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>اقتراحات متاحة:</span>
            </span>
            {validation.suggestedUsernames.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSelectSuggestion(suggestion)}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors"
                title="اضغط للاستخدام"
              >
                @{suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (validation.status === 'available') {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg mt-1.5 ${className}`}>
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
        <span className="font-bold">{validation.message}</span>
      </div>
    );
  }

  return null;
};
