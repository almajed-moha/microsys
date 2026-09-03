import React, { useState } from 'react';
import {
  Search,
  Calendar,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Store,
  CreditCard,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Download,
  SlidersHorizontal,
  DollarSign,
  Tag,
} from 'lucide-react';
import { POSPoint, CardCategory } from '../types';

export interface AdvancedFilterState {
  search: string;
  posPointId: string;
  transactionType: string;
  paymentType: string;
  categoryId?: string;
  datePeriod: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'last_month' | 'quarter' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  minAmount?: string;
  maxAmount?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface AdvancedSearchBarProps {
  filters: AdvancedFilterState;
  onFilterChange: (newFilters: AdvancedFilterState) => void;
  posPoints: POSPoint[];
  categories?: CardCategory[];
  totalResultsCount: number;
  totalAvailableCount: number;
  currency?: string;
  typesList?: { id: string; label: string; icon?: React.ReactNode }[];
  showCategoryFilter?: boolean;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  onOpenComprehensiveExport?: () => void;
  placeholder?: string;
}

export const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  filters,
  onFilterChange,
  posPoints,
  categories = [],
  totalResultsCount,
  totalAvailableCount,
  currency = 'ر.ي',
  typesList,
  showCategoryFilter = false,
  onExportExcel,
  onExportCSV,
  onOpenComprehensiveExport,
  placeholder = 'بحث برقم السند، الموزع، الصنف، السيريال، الملاحظات...',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateField = (field: keyof AdvancedFilterState, value: any) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const handleResetFilters = () => {
    onFilterChange({
      search: '',
      posPointId: 'all',
      transactionType: 'all',
      paymentType: 'all',
      categoryId: 'all',
      datePeriod: 'all',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  // Quick date presets
  const handleDatePeriodSelect = (period: AdvancedFilterState['datePeriod']) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let start = '';
    let end = '';

    if (period === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (period === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      start = yStr;
      end = yStr;
    } else if (period === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      start = past.toISOString().split('T')[0];
      end = todayStr;
    } else if (period === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (period === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
    } else if (period === 'quarter') {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qMonth, 1).toISOString().split('T')[0];
      end = new Date(today.getFullYear(), qMonth + 3, 0).toISOString().split('T')[0];
    } else if (period === 'year') {
      start = `${today.getFullYear()}-01-01`;
      end = `${today.getFullYear()}-12-31`;
    }

    onFilterChange({
      ...filters,
      datePeriod: period,
      startDate: period === 'custom' ? filters.startDate : start,
      endDate: period === 'custom' ? filters.endDate : end,
    });
  };

  // Count active non-default filters
  const activeFiltersCount = [
    Boolean(filters.search.trim()),
    filters.posPointId !== 'all',
    filters.transactionType !== 'all',
    filters.paymentType !== 'all',
    showCategoryFilter && filters.categoryId && filters.categoryId !== 'all',
    filters.datePeriod !== 'all',
    Boolean(filters.minAmount),
    Boolean(filters.maxAmount),
  ].filter(Boolean).length;

  const selectedPOS = posPoints.find((p) => p.id === filters.posPointId);
  const selectedCat = categories.find((c) => c.id === filters.categoryId);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 text-white">
      {/* 1. Main Search & Quick Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateField('search', e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-950 border border-slate-700/90 rounded-xl pr-10 pl-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition shadow-inner"
          />
          {filters.search && (
            <button
              onClick={() => updateField('search', '')}
              className="absolute left-3 top-3 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800 transition"
              title="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Distributor / POS Selector */}
        <div className="w-full lg:w-56">
          <div className="relative">
            <select
              value={filters.posPointId}
              onChange={(e) => updateField('posPointId', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/90 rounded-xl pr-3 pl-8 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer appearance-none shadow-inner"
            >
              <option value="all">🏪 كافة نقاط البيع والموزعين</option>
              {posPoints.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name} {pos.managerName ? `(${pos.managerName})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Transaction Type Filter */}
        {typesList && typesList.length > 0 && (
          <div className="w-full lg:w-48">
            <div className="relative">
              <select
                value={filters.transactionType}
                onChange={(e) => updateField('transactionType', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/90 rounded-xl pr-3 pl-8 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer appearance-none shadow-inner"
              >
                <option value="all">📑 كافة أنواع العمليات</option>
                {typesList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Toggle Advanced Filters Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 ${
              isExpanded || activeFiltersCount > 0
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span>فلترة متقدمة</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-mono">
                {activeFiltersCount}
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Export Actions Menu / Buttons */}
          {(onExportExcel || onOpenComprehensiveExport) && (
            <div className="flex items-center gap-1.5">
              {onOpenComprehensiveExport && (
                <button
                  onClick={onOpenComprehensiveExport}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer"
                  title="تصدير المطابقة المالية الشاملة وإكسيل متكامل"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">تصدير مالي</span>
                </button>
              )}
              {onExportExcel && !onOpenComprehensiveExport && (
                <button
                  onClick={onExportExcel}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition cursor-pointer"
                  title="تنزيل ملف إكسيل"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Date Quick Presets Ribbon */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 ml-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            الفترة:
          </span>
          {[
            { id: 'all', label: 'الكل' },
            { id: 'today', label: 'اليوم' },
            { id: 'yesterday', label: 'أمس' },
            { id: '7days', label: 'آخر 7 أيام' },
            { id: 'month', label: 'هذا الشهر' },
            { id: 'last_month', label: 'الشهر السابق' },
            { id: 'quarter', label: 'الربع الحالي' },
            { id: 'year', label: 'السنة' },
            { id: 'custom', label: 'مخصص' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleDatePeriodSelect(item.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filters.datePeriod === item.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-750 border border-slate-700/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center gap-3 text-xs">
          <div className="text-slate-400">
            النتائج: <span className="text-white font-bold font-mono">{totalResultsCount}</span> من أصل{' '}
            <span className="text-slate-500 font-mono">{totalAvailableCount}</span>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold underline transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة ضبط
            </button>
          )}
        </div>
      </div>

      {/* 3. Collapsible Advanced Filters Drawer */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-in fade-in duration-150">
          {/* Custom Date Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">من تاريخ:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                onFilterChange({
                  ...filters,
                  datePeriod: 'custom',
                  startDate: e.target.value,
                });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">إلى تاريخ:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                onFilterChange({
                  ...filters,
                  datePeriod: 'custom',
                  endDate: e.target.value,
                });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">طريقة السداد / القيد:</label>
            <select
              value={filters.paymentType}
              onChange={(e) => updateField('paymentType', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">كافة طرق السداد (نقدي وآجل)</option>
              <option value="credit">آجل على الحساب (مديونية)</option>
              <option value="cash">نقداً (مدفوع فوري)</option>
            </select>
          </div>

          {/* Category Filter if enabled */}
          {showCategoryFilter && categories.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">فئة الكارت:</label>
              <select
                value={filters.categoryId || 'all'}
                onChange={(e) => updateField('categoryId', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">كافة فئات الكروت</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.wholesalePrice} {currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Min / Max Amount Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">الحد الأدنى للمبلغ ({currency}):</label>
            <input
              type="text" inputMode="decimal"
              value={filters.minAmount || ''}
              onChange={(e) => updateField('minAmount', e.target.value)}
              placeholder="0"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">الحد الأقصى للمبلغ ({currency}):</label>
            <input
              type="text" inputMode="decimal"
              value={filters.maxAmount || ''}
              onChange={(e) => updateField('maxAmount', e.target.value)}
              placeholder="بلا حد"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* 4. Active Badges Ribbon */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-400">الفلاتر المطبقة:</span>

          {filters.search && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px]">
              <span>البحث: "{filters.search}"</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-white"
                onClick={() => updateField('search', '')}
              />
            </span>
          )}

          {filters.posPointId !== 'all' && selectedPOS && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]">
              <Store className="w-3 h-3" />
              <span>الموزع: {selectedPOS.name}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-white"
                onClick={() => updateField('posPointId', 'all')}
              />
            </span>
          )}

          {filters.transactionType !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px]">
              <span>النوع: {typesList?.find((t) => t.id === filters.transactionType)?.label || filters.transactionType}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-white"
                onClick={() => updateField('transactionType', 'all')}
              />
            </span>
          )}

          {filters.paymentType !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px]">
              <CreditCard className="w-3 h-3" />
              <span>السداد: {filters.paymentType === 'cash' ? 'نقدي' : 'آجل'}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-white"
                onClick={() => updateField('paymentType', 'all')}
              />
            </span>
          )}

          {showCategoryFilter && filters.categoryId && filters.categoryId !== 'all' && selectedCat && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px]">
              <Tag className="w-3 h-3" />
              <span>الفئة: {selectedCat.name}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-white"
                onClick={() => updateField('categoryId', 'all')}
              />
            </span>
          )}

          {filters.datePeriod !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px]">
              <Calendar className="w-3 h-3" />
              <span>
                التاريخ:{' '}
                {filters.datePeriod === 'custom'
                  ? `${filters.startDate || '...'} إلى ${filters.endDate || '...'}`
                  : filters.datePeriod}
              </span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-white"
                onClick={() => handleDatePeriodSelect('all')}
              />
            </span>
          )}

          {(filters.minAmount || filters.maxAmount) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px]">
              <DollarSign className="w-3 h-3" />
              <span>
                المبلغ: {filters.minAmount || 0} - {filters.maxAmount || '∞'} {currency}
              </span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-white"
                onClick={() => {
                  onFilterChange({
                    ...filters,
                    minAmount: '',
                    maxAmount: '',
                  });
                }}
              />
            </span>
          )}
        </div>
      )}
    </div>
  );
};
