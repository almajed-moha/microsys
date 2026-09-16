import React, { useMemo, useState } from 'react';
import {
  FileText, X, Printer, Download, Store, User,
  TrendingUp, TrendingDown, DollarSign, CheckCircle, AlertTriangle, Building2
} from 'lucide-react';
import {
  POSPoint, Customer, InvoiceRecord, PaymentRecord, NetworkSettings
} from '../types';
import { printElementDocument, exportElementToPdf } from '../utils/pdfExport';
import { exportToCSV } from '../utils/storage';

interface ClientStatementReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  posPoints: POSPoint[];
  customers: Customer[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  settings: NetworkSettings;
}

export const ClientStatementReportModal: React.FC<ClientStatementReportModalProps> = ({
  isOpen,
  onClose,
  posPoints,
  customers,
  invoices,
  payments,
  settings
}) => {
  const currency = settings.currencySymbol || 'ر.ي';
  const [filterType, setFilterType] = useState<'all' | 'pos' | 'customer'>('all');

  const reportData = useMemo(() => {
    const posEntities = posPoints.map(pos => ({ type: 'pos' as const, id: pos.id, name: pos.name, debt: pos.currentDebt || 0 }));
    const custEntities = customers.map(cust => ({ type: 'customer' as const, id: cust.id, name: cust.name, debt: cust.balance || 0 }));
    
    let allEntities = [...posEntities, ...custEntities];
    
    if (filterType === 'pos') allEntities = posEntities;
    if (filterType === 'customer') allEntities = custEntities;

    return allEntities.map(entity => {
      // Filter invoices for this entity
      const entityInvoices = invoices.filter(inv => 
        inv.status !== 'cancelled' && 
        (entity.type === 'pos' ? inv.posPointId === entity.id : inv.customerId === entity.id)
      );
      
      const getInvTotal = (inv: InvoiceRecord) => entity.type === 'pos' ? (inv.totalWholesaleAmount || 0) : (inv.totalRetailAmount || 0);

      const salesInvs = entityInvoices.filter(i => i.type === 'sale');
      const returnInvs = entityInvoices.filter(i => i.type === 'return');

      const totalSalesAmount = salesInvs.reduce((sum, inv) => sum + getInvTotal(inv), 0);
      const totalReturnsAmount = returnInvs.reduce((sum, inv) => sum + getInvTotal(inv), 0);
      const netSalesAmount = totalSalesAmount - totalReturnsAmount;

      const totalCredit = salesInvs.filter(i => i.paymentType === 'credit').reduce((sum, inv) => sum + getInvTotal(inv), 0);
      const totalCash = salesInvs.filter(i => i.paymentType === 'cash').reduce((sum, inv) => sum + getInvTotal(inv), 0);
      
      const totalCost = salesInvs.reduce((sum, inv) => sum + (inv.totalCostAmount || 0), 0);
      const returnsCost = returnInvs.reduce((sum, inv) => sum + (inv.totalCostAmount || 0), 0);
      const netCost = totalCost - returnsCost;

      // Payments
      const entityPayments = payments.filter(p => 
        entity.type === 'pos' ? p.posPointId === entity.id : p.customerId === entity.id
      );
      const totalPaid = entityPayments.reduce((sum, p) => sum + p.amount, 0);

      // Book Profit = Net Sales - Net Cost
      const grossProfit = netSalesAmount - netCost;

      // Cash Status = (Cash Sales + Payments Collected) - Net Cost
      // If positive -> Realized Profit. If negative -> Capital Deficit.
      const cashInjected = totalCash + totalPaid;
      const netCashStatus = cashInjected - netCost; 

      return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        currentDebt: entity.debt,
        netSalesAmount,
        totalCredit,
        totalCash,
        totalPaid,
        netCost,
        grossProfit,
        netCashStatus,
      };
    }).sort((a, b) => b.currentDebt - a.currentDebt); 
  }, [posPoints, customers, invoices, payments, filterType]);

  const totals = useMemo(() => {
    return reportData.reduce((acc, curr) => ({
      debt: acc.debt + curr.currentDebt,
      sales: acc.sales + curr.netSalesAmount,
      credit: acc.credit + curr.totalCredit,
      cash: acc.cash + curr.totalCash,
      paid: acc.paid + curr.totalPaid,
      profit: acc.profit + curr.grossProfit,
      cashStatus: acc.cashStatus + curr.netCashStatus,
    }), { debt: 0, sales: 0, credit: 0, cash: 0, paid: 0, profit: 0, cashStatus: 0 });
  }, [reportData]);

  if (!isOpen) return null;

  const handlePrint = () => {
    printElementDocument('client-statement-report-content', { filename: 'تقرير المديونيات والمبيعات الآجلة' });
  };

  const handleExportCSV = () => {
    const data = reportData.map(row => ({
      'الاسم': row.name,
      'النوع': row.type === 'pos' ? 'نقطة بيع' : 'عميل',
      'المديونية (المتبقي)': row.currentDebt,
      'المبيعات الآجلة': row.totalCredit,
      'المبيعات النقدية': row.totalCash,
      'السندات (المسدد)': row.totalPaid,
      'صافي المبيعات': row.netSalesAmount,
      'الربح الدفتري': row.grossProfit,
      'حالة التحصيل (الربح/الخسارة)': row.netCashStatus >= 0 ? 'ربح محقق' : 'عجز/خسارة غير محصلة',
      'قيمة الحالة النقدية': row.netCashStatus
    }));
    exportToCSV(data, `تقرير_المديونيات_والأرباح_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">التقرير التفصيلي للمديونيات والأرباح</h2>
              <p className="text-xs text-slate-400 mt-0.5">مبيعات آجلة، سندات، متبقي العملاء، وحالة الأرباح</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="تصدير Excel"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="طباعة"
            >
              <Printer className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-800/30 border-b border-slate-800 shrink-0 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterType('pos')}
            className={`px-4 py-2 flex items-center gap-2 rounded-lg text-xs font-bold transition ${filterType === 'pos' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
          >
            <Store className="w-3.5 h-3.5" />
            نقاط البيع فقط
          </button>
          <button
            onClick={() => setFilterType('customer')}
            className={`px-4 py-2 flex items-center gap-2 rounded-lg text-xs font-bold transition ${filterType === 'customer' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
          >
            <User className="w-3.5 h-3.5" />
            العملاء فقط
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-5" id="client-statement-report-content">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-300 text-xs border-b border-slate-700">
                    <th className="py-3 px-4 font-bold whitespace-nowrap">الاسم / الجهة</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">المديونية (المتبقي)</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">المبيعات الآجلة</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">السندات (المسدد)</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">مجمل المبيعات</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">الربح الدفتري</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">حالة نهاية الشهر (نقدي)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        لا توجد بيانات متاحة للعرض
                      </td>
                    </tr>
                  ) : (
                    reportData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition group">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          {row.type === 'pos' ? (
                            <Store className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <User className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          <span className="truncate max-w-[150px]" title={row.name}>{row.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">
                            {row.currentDebt.toLocaleString()} {currency}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-amber-400">
                          {row.totalCredit.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-emerald-400">
                          {row.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {row.netSalesAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-400">
                          {row.grossProfit.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {row.netCashStatus >= 0 ? (
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-bold">ربح محقق (+{row.netCashStatus.toLocaleString()})</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-rose-400">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="font-bold">عجز/خسارة ({row.netCashStatus.toLocaleString()})</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reportData.length > 0 && (
                  <tfoot className="bg-slate-800/80 border-t-2 border-slate-700 text-white font-black">
                    <tr>
                      <td className="py-4 px-4 text-left">الإجمالي الكلي:</td>
                      <td className="py-4 px-4 text-rose-400">{totals.debt.toLocaleString()} {currency}</td>
                      <td className="py-4 px-4 text-amber-400">{totals.credit.toLocaleString()} {currency}</td>
                      <td className="py-4 px-4 text-emerald-400">{totals.paid.toLocaleString()} {currency}</td>
                      <td className="py-4 px-4">{totals.sales.toLocaleString()} {currency}</td>
                      <td className="py-4 px-4 text-indigo-400">{totals.profit.toLocaleString()} {currency}</td>
                      <td className="py-4 px-4">
                        {totals.cashStatus >= 0 ? (
                          <span className="text-emerald-400">+{totals.cashStatus.toLocaleString()} {currency}</span>
                        ) : (
                          <span className="text-rose-400">{totals.cashStatus.toLocaleString()} {currency}</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4" /> ماذا يعني "ربح محقق"؟
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                يعني أن إجمالي المبالغ النقدية المحصلة (المبيعات النقدية + السندات) من هذا العميل/الجهة قد تجاوزت القيمة الأصلية (رأس المال/التكلفة) لكافة مسحوباته. المبالغ الإضافية هنا تعتبر أرباحاً فعلية دخلت الخزينة.
              </p>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> ماذا يعني "عجز/خسارة"؟
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                يعني أن المبالغ التي تم تحصيلها حتى الآن لم تغطِّ تكلفة البضاعة التي تم إعطاؤها للعميل/الجهة. لا يزال هناك جزء من رأس المال عالقاً كمديونية لديه ولم يتم استرداده بعد.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
