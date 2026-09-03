#!/bin/bash
sed -i 's/<button/<button\n            onClick={() => onOpenStatement('"'"''"'"', '"'"'a4'"'"')}\n            className="flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"\n          >\n            <FileText className="w-4 h-4 text-emerald-400" \/>\n            <span>كشف حساب عام<\/span>\n          <\/button>\n\n          <button/g' src/components/POSPointsView.tsx

# Wait, `sed` with that large replacement block globally will break everything!
