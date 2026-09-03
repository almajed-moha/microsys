#!/bin/bash
awk '
/<span>توليد ومزامنة وطباعة الكروت<\/span>/ {
    print "          <span>توليد الكروت</span>"
    print "        </button>"
    print ""
    print "        <button"
    print "          onClick={() => setActiveTab(\"templates\")}"
    print "          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${"
    print "            activeTab === \"templates\""
    print "              ? \"bg-purple-600 text-white shadow-md shadow-purple-600/20\""
    print "              : \"bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800\""
    print "          }`}"
    print "        >"
    print "          <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" className=\"text-cyan-400\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M3 9h18\"/><path d=\"M9 21V9\"/></svg>"
    print "          <span>إدارة القوالب</span>"
    next
}
{ print }
' src/components/UserManagerView.tsx > temp.tsx && mv temp.tsx src/components/UserManagerView.tsx
