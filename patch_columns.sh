#!/bin/bash
sed -i 's/<th className="py-2.5 px-3">التاريخ<\/th>/<th className="py-2.5 px-3">التاريخ<\/th>\n                          {!posPoint \&\& <th className="py-2.5 px-3 text-right">النقطة<\/th>}/g' src/components/POSAccountStatementModal.tsx

sed -i 's/<td className="py-2 px-3 font-mono text-slate-700 font-medium whitespace-nowrap">{row.date}<\/td>/<td className="py-2 px-3 font-mono text-slate-700 font-medium whitespace-nowrap">{row.date}<\/td>\n                            {!posPoint \&\& <td className="py-2 px-3 text-[10px] text-slate-600 font-bold whitespace-nowrap">{row.posPointName}<\/td>}/g' src/components/POSAccountStatementModal.tsx
