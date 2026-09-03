#!/bin/bash
awk '
/\{\/\* Date \*\/\}/ {
    print "                {/* Date and Time */}"
    print "                <div className=\"grid grid-cols-2 gap-2\">"
    print "                  <div>"
    print "                    <label className=\"block text-slate-400 font-bold mb-1\">تاريخ الفاتورة *</label>"
    print "                    <input"
    print "                      type=\"date\""
    print "                      value={formDate}"
    print "                      onChange={(e) => {"
    print "                        const newDate = e.target.value;"
    print "                        setFormDate(newDate);"
    print "                        if (!editingInvoice) {"
    print "                          setFormInvoiceNumber("
    print "                            generateNextInvoiceNumber(invoices, createInvoiceType, newDate)"
    print "                          );"
    print "                        }"
    print "                      }}"
    print "                      className=\"w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500\""
    print "                      required"
    print "                    />"
    print "                  </div>"
    print "                  <div>"
    print "                    <label className=\"block text-slate-400 font-bold mb-1\">الوقت *</label>"
    print "                    <input"
    print "                      type=\"time\""
    print "                      value={formTime}"
    print "                      onChange={(e) => setFormTime(e.target.value)}"
    print "                      className=\"w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500\""
    print "                      required"
    print "                    />"
    print "                  </div>"
    print "                </div>"
    in_date = 1
    next
}
in_date && /\{\/\* Payment Method \*\/\}/ {
    in_date = 0
}
in_date { next }
{ print }
' src/components/InvoicesView.tsx > temp.tsx && mv temp.tsx src/components/InvoicesView.tsx
