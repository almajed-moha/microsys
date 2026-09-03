#!/bin/bash
awk '
/onClick={handleExportPdf}/ {
    print "          <button"
    print "            onClick={() => onOpenStatement('"'"''"'"', '"'"'a4'"'"')}"
    print "            className=\"flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer\""
    print "          >"
    print "            <FileText className=\"w-4 h-4 text-emerald-400\" />"
    print "            <span>كشف حساب عام</span>"
    print "          </button>"
    print "          <button"
    print "            onClick={handleExportPdf}"
    next
}
{ print }
' src/components/POSPointsView.tsx > temp.tsx && mv temp.tsx src/components/POSPointsView.tsx
