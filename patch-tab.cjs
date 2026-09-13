const fs = require('fs');
let code = fs.readFileSync('src/components/MikrotikLiveView.tsx', 'utf8');

const tabBtn = `
        <button
          onClick={() => setActiveSubTab('daily_logs')}
          className={\`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition \${
            activeSubTab === 'daily_logs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }\`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>سجل الاستهلاك اليومي</span>
        </button>
`;

code = code.replace(
  /        <button\n          onClick=\{\(\) => setActiveSubTab\('settings'\)\}/,
  tabBtn + "\n        <button\n          onClick={() => setActiveSubTab('settings')}"
);

fs.writeFileSync('src/components/MikrotikLiveView.tsx', code);
