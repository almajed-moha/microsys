import React, { useState, useMemo } from 'react';
import { Search, Calendar, Download, FileText, Wifi, Clock, Activity, HardDrive } from 'lucide-react';

interface MikrotikSession {
  id: string;
  username: string;
  ipAddress: string;
  macAddress: string;
  loginTime: string; // ISO date string
  logoutTime: string | null; // ISO date string or null if still connected
  downloadBytes: number;
  uploadBytes: number;
}

// Generate some mock data for demonstration
const generateMockSessions = (): MikrotikSession[] => {
  const sessions: MikrotikSession[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Create ~150 random sessions over the past few days
  for (let i = 0; i < 150; i++) {
    // Generate dates within the last 7 days
    const dayOffset = Math.floor(Math.random() * 7);
    const startHour = Math.floor(Math.random() * 23);
    const startMin = Math.floor(Math.random() * 59);
    
    const loginDate = new Date(today);
    loginDate.setDate(today.getDate() - dayOffset);
    loginDate.setHours(startHour, startMin, 0, 0);
    
    // Duration between 5 mins and 12 hours
    const durationMs = Math.floor(Math.random() * 12 * 60 * 60 * 1000) + (5 * 60 * 1000);
    const logoutDate = new Date(loginDate.getTime() + durationMs);
    
    // Some are still active if login was recent and logout is in future relative to now
    let isStillActive = logoutDate > now;
    // Force some active sessions for today
    if (dayOffset === 0 && i % 3 === 0) {
       isStillActive = true;
    }
    
    const download = Math.floor(Math.random() * 1024 * 1024 * 1024 * 3); // Up to 3GB
    const upload = Math.floor(Math.random() * 1024 * 1024 * 500); // Up to 500MB
    
    sessions.push({
      id: `session-${i}`,
      username: `user_${Math.floor(Math.random() * 9000) + 1000}`,
      ipAddress: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      macAddress: `00:1A:2B:${Math.floor(Math.random() * 90) + 10}:C4:D${Math.floor(Math.random() * 9)}`,
      loginTime: loginDate.toISOString(),
      logoutTime: isStillActive ? null : Math.min(logoutDate.getTime(), now.getTime()) > now.getTime() ? null : logoutDate.toISOString(),
      downloadBytes: download,
      uploadBytes: upload,
    });
  }
  return sessions.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
};

const MOCK_SESSIONS = generateMockSessions();

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const MikrotikSessionsView: React.FC = () => {
  const [sessions] = useState<MikrotikSession[]>(MOCK_SESSIONS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date filter
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Search term
      const matchesSearch = session.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            session.ipAddress.includes(searchTerm) ||
                            session.macAddress.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Date range
      const sessionDate = session.loginTime.split('T')[0];
      if (fromDate && sessionDate < fromDate) return false;
      if (toDate && sessionDate > toDate) return false;
      
      return true;
    });
  }, [sessions, searchTerm, fromDate, toDate]);

  // Stats
  const activeNow = filteredSessions.filter(s => !s.logoutTime).length;
  const totalDownload = filteredSessions.reduce((sum, s) => sum + s.downloadBytes, 0);
  const totalUpload = filteredSessions.reduce((sum, s) => sum + s.uploadBytes, 0);
  const totalSessions = filteredSessions.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-teal-600" />
            إحصائيات المتصلين (اليوزر مانجر)
          </h2>
          <p className="text-slate-500">مراقبة الجلسات واستهلاك البيانات للمشتركين</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium">
            <Download size={18} />
            تصدير التقرير
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
            <Wifi size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">المتصلين حالياً</p>
            <p className="text-2xl font-bold text-slate-800">{activeNow}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <HardDrive size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">إجمالي التنزيل (Download)</p>
            <p className="text-2xl font-bold text-slate-800" dir="ltr">{formatBytes(totalDownload)}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">إجمالي الرفع (Upload)</p>
            <p className="text-2xl font-bold text-slate-800" dir="ltr">{formatBytes(totalUpload)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">إجمالي الجلسات</p>
            <p className="text-2xl font-bold text-slate-800">{totalSessions}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">بحث</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="ابحث باسم المستخدم، IP، أو MAC Address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 font-medium bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
        </div>
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">من تاريخ</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="pl-4 pr-10 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 font-medium bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">إلى تاريخ</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="pl-4 pr-10 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 font-medium bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">المستخدم</th>
                <th className="px-6 py-4 font-semibold text-slate-700">عنوان IP / MAC</th>
                <th className="px-6 py-4 font-semibold text-slate-700">وقت الدخول</th>
                <th className="px-6 py-4 font-semibold text-slate-700">وقت الخروج</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-left">التنزيل (Download)</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-left">الرفع (Upload)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={32} className="text-slate-300" />
                      <p>لا توجد جلسات تطابق معايير البحث.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{session.username}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-mono text-sm">{session.ipAddress}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{session.macAddress}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 text-sm">{formatDate(session.loginTime)}</div>
                    </td>
                    <td className="px-6 py-4">
                      {session.logoutTime ? (
                        <div className="text-slate-700 text-sm">{formatDate(session.logoutTime)}</div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          متصل الآن
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 text-left" dir="ltr">
                      {formatBytes(session.downloadBytes)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 text-left" dir="ltr">
                      {formatBytes(session.uploadBytes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-sm text-slate-500 flex justify-between items-center">
          <span>يتم عرض {filteredSessions.length} جلسة</span>
        </div>
      </div>
    </div>
  );
};
