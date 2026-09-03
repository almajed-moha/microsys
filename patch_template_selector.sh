#!/bin/bash
awk '
/\{\/\* Profile Select \*\/\}/ {
    print "              {/* Template Select */}"
    print "              <div>"
    print "                <label className=\"block text-slate-300 font-semibold mb-1.5\">قالب الطباعة (اختياري):</label>"
    print "                <select"
    print "                  value={batchTemplateId}"
    print "                  onChange={(e) => setBatchTemplateId(e.target.value)}"
    print "                  className=\"w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500\""
    print "                >"
    print "                  <option value=\"\">-- القالب الافتراضي --</option>"
    print "                  {templates.map((t) => ("
    print "                    <option key={t.id} value={t.id}>{t.name}</option>"
    print "                  ))}"
    print "                </select>"
    print "              </div>"
}
{ print }
' src/components/UserManagerView.tsx > temp.tsx && mv temp.tsx src/components/UserManagerView.tsx
