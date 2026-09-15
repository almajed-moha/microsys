import React from 'react';

interface CircularMetricCardProps {
  id?: string;
  title: string;
  icon: React.ReactNode;
  percent: number;
  type: 'cpu' | 'ram';
  centerLabel?: string;
  statusText?: string;
  details: Array<{
    label: string;
    value: string;
    valueColor?: string;
    title?: string;
  }>;
}

export const CircularMetricCard: React.FC<CircularMetricCardProps> = ({
  id,
  title,
  icon,
  percent,
  type,
  centerLabel = type === 'cpu' ? 'LOAD' : 'USED',
  statusText,
  details,
}) => {
  const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));

  // Determine status & styling thresholds
  let theme = {
    strokeGradientStart: '#10b981', // emerald-500
    strokeGradientEnd: '#06b6d4', // cyan-500
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    statusLabel: statusText || 'مستقر وطبيعي',
    isAlert: false,
  };

  if (type === 'cpu') {
    if (clampedPercent >= 80) {
      theme = {
        strokeGradientStart: '#f43f5e', // rose-500
        strokeGradientEnd: '#e11d48', // rose-600
        textColor: 'text-rose-400',
        badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse',
        statusLabel: statusText || 'استهلاك مرتفع جداً',
        isAlert: true,
      };
    } else if (clampedPercent >= 50) {
      theme = {
        strokeGradientStart: '#f59e0b', // amber-500
        strokeGradientEnd: '#d97706', // amber-600
        textColor: 'text-amber-300',
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        statusLabel: statusText || 'استهلاك متوسط',
        isAlert: false,
      };
    } else {
      theme = {
        strokeGradientStart: '#10b981', // emerald-500
        strokeGradientEnd: '#059669', // emerald-600
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        statusLabel: statusText || 'معالج هادئ ومستقر',
        isAlert: false,
      };
    }
  } else {
    // RAM thresholds
    if (clampedPercent >= 85) {
      theme = {
        strokeGradientStart: '#f43f5e',
        strokeGradientEnd: '#e11d48',
        textColor: 'text-rose-400',
        badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse',
        statusLabel: statusText || 'ذاكرة ممتلئة تقريباً',
        isAlert: true,
      };
    } else if (clampedPercent >= 65) {
      theme = {
        strokeGradientStart: '#f59e0b',
        strokeGradientEnd: '#ea580c',
        textColor: 'text-amber-300',
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        statusLabel: statusText || 'استهلاك ملحوظ',
        isAlert: false,
      };
    } else {
      theme = {
        strokeGradientStart: '#06b6d4', // cyan-500
        strokeGradientEnd: '#3b82f6', // blue-500
        textColor: 'text-cyan-400',
        badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        statusLabel: statusText || 'الذاكرة كافية ومستقرة',
        isAlert: false,
      };
    }
  }

  // SVG Geometry constants
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2; // 44
  const circumference = 2 * Math.PI * radius; // ~276.46
  const strokeDashoffset = circumference - (circumference * clampedPercent) / 100;
  const gradientId = `gauge-gradient-${type}-${id || Math.random().toString(36).substring(2, 7)}`;

  return (
    <div
      id={id}
      className="bg-slate-900/90 p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700/80 transition-all flex flex-col justify-between group relative overflow-hidden"
    >
      {/* Subtle Ambient Glow on Hover/Alert */}
      {theme.isAlert && (
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 group-hover:text-white transition-colors">
            {icon}
          </div>
          <span className="text-slate-200 text-xs font-bold truncate">{title}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap transition-colors ${theme.badgeBg}`}
        >
          {theme.statusLabel}
        </span>
      </div>

      {/* Gauge Body */}
      <div className="mt-3 flex items-center justify-between gap-3">
        {/* Circular Gauge Graphic */}
        <div className="relative flex-shrink-0 w-[90px] h-[90px] sm:w-[96px] sm:h-[96px] flex items-center justify-center select-none">
          <svg
            className="w-full h-full -rotate-90 transform"
            viewBox={`0 0 ${size} ${size}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme.strokeGradientStart} />
                <stop offset="100%" stopColor={theme.strokeGradientEnd} />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className="stroke-slate-800/90"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Live Progress Arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Metric Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <div className="flex items-baseline justify-center">
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none ${theme.textColor}`}>
                {clampedPercent}
              </span>
              <span className={`text-xs font-bold font-mono ml-0.5 ${theme.textColor}`}>%</span>
            </div>
            <span className="text-[9px] font-bold tracking-wider text-slate-400 mt-1 uppercase">
              {centerLabel}
            </span>
          </div>
        </div>

        {/* Technical Specification Columns */}
        <div className="flex-1 min-w-0 space-y-1.5 pl-1">
          {details.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs gap-1"
              title={item.title}
            >
              <span className="text-slate-400 text-[11px] truncate">{item.label}:</span>
              <span
                className={`font-mono text-[11px] font-bold truncate ${
                  item.valueColor || 'text-slate-200'
                }`}
                dir="ltr"
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
