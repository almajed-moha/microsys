import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Plus, Download, Upload, Activity, Save } from 'lucide-react';
import { DailyNetworkLog, getDailyNetworkLogs, deleteDailyNetworkLog, deleteMultipleNetworkLogs, saveDailyNetworkLog } from '../services/networkLogsService';

const formatBytesToHuman = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface Props {
  currentDownloadBytes?: number;
  currentUploadBytes?: number;
}

export const DailyNetworkLogsView: React.FC<Props> = ({ currentDownloadBytes = 0, currentUploadBytes = 0 }) => {
  const [logs, setLogs] = useState<DailyNetworkLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Modal State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [downBytes, setDownBytes] = useState<number>(0);
  const [upBytes, setUpBytes] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getDailyNetworkLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveDailyNetworkLog({
        date,
        downloadBytes: downBytes,
        uploadBytes: upBytes,
        totalBytes: downBytes + upBytes,
        notes
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      alert('تعذر حفظ السجل');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await deleteDailyNetworkLog(id);
      loadData();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`هل أنت متأكد من حذف ${selectedIds.length} سجل؟`)) {
      await deleteMultipleNetworkLogs(selectedIds);
      setSelectedIds([]);
      loadData();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const fillFromCurrent = () => {
    setDownBytes(currentDownloadBytes);
    setUpBytes(currentUploadBytes);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              سجل استهلاك الإنترنت اليومي
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              حفظ وتتبع إجمالي سحب البيانات اليومي والرجوع إليه لاحقاً
            </p>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition"
              >
                <Trash2 className="w-4 h-4" />
                حذف المحدد ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => {
                setDate(new Date().toISOString().split('T')[0]);
                setDownBytes(currentDownloadBytes);
                setUpBytes(currentUploadBytes);
                setNotes('');
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              تسجيل استهلاك اليوم
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700/80">
              <tr>
                <th className="p-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={logs.length > 0 && selectedIds.length === logs.length}
                    onChange={(e) => setSelectedIds(e.target.checked ? logs.map(l => l.id) : [])}
                    className="rounded border-slate-600 bg-slate-700/50 text-indigo-500 focus:ring-indigo-500/30"
                  />
                </th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">التحميل (Download)</th>
                <th className="p-3.5">الرفع (Upload)</th>
                <th className="p-3.5">الإجمالي</th>
                <th className="p-3.5">ملاحظات</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا يوجد سجلات استهلاك مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(log.id)}
                        onChange={() => toggleSelect(log.id)}
                        className="rounded border-slate-600 bg-slate-700/50 text-indigo-500 focus:ring-indigo-500/30"
                      />
                    </td>
                    <td className="p-3.5 font-bold font-mono text-indigo-300">{log.date}</td>
                    <td className="p-3.5 font-mono text-emerald-400" dir="ltr">{formatBytesToHuman(log.downloadBytes)}</td>
                    <td className="p-3.5 font-mono text-blue-400" dir="ltr">{formatBytesToHuman(log.uploadBytes)}</td>
                    <td className="p-3.5 font-bold font-mono text-white" dir="ltr">{formatBytesToHuman(log.totalBytes)}</td>
                    <td className="p-3.5 text-slate-400 text-xs truncate max-w-[150px]">{log.notes || '—'}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                تسجيل استهلاك اليوم
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">تاريخ التسجيل</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">التحميل (بالبايت)</label>
                  <input
                    type="number"
                    value={downBytes}
                    onChange={e => setDownBytes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-emerald-400 font-mono text-sm focus:border-emerald-500 outline-none text-left"
                    dir="ltr"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">{formatBytesToHuman(downBytes)}</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">الرفع (بالبايت)</label>
                  <input
                    type="number"
                    value={upBytes}
                    onChange={e => setUpBytes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-blue-400 font-mono text-sm focus:border-blue-500 outline-none text-left"
                    dir="ltr"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">{formatBytesToHuman(upBytes)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={fillFromCurrent}
                className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-bold flex justify-center items-center gap-2 transition"
              >
                <Activity className="w-4 h-4" />
                تعبئة تلقائية من القراءة الحالية
              </button>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="مثال: استهلاك قبل إعادة تشغيل الراوتر"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition flex justify-center items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  حفظ السجل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
