const fs = require('fs');
let code = fs.readFileSync('src/components/DailyNetworkLogsView.tsx', 'utf8');

// We will hide the manual registration button since it's fully automatic now.
// We can also remove the modal completely, or just remove the button.

code = code.replace(
  /<button\n              onClick=\{\(\) => \{\n                setDate\(new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\);\n                setDownBytes\(currentDownloadBytes\);\n                setUpBytes\(currentUploadBytes\);\n                setNotes\(''\);\n                setShowModal\(true\);\n              \}\}\n              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600\/20 transition"\n            >\n              <Plus className="w-4 h-4" \/>\n              تسجيل استهلاك اليوم\n            <\/button>/g,
  `
  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20">
    <Activity className="w-4 h-4" />
    تسجيل آلي فعّال
  </div>
  `
);

fs.writeFileSync('src/components/DailyNetworkLogsView.tsx', code);
