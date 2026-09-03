#!/bin/bash
sed -i 's/date: d.date,/date: d.date, time: d.time,/' src/components/POSAccountStatementModal.tsx
sed -i 's/date: s.date,/date: s.date, time: s.time,/' src/components/POSAccountStatementModal.tsx
sed -i 's/date: inv.date,/date: inv.date, time: inv.time,/' src/components/POSAccountStatementModal.tsx
sed -i 's/date: p.date,/date: p.date, time: p.time,/' src/components/POSAccountStatementModal.tsx

sed -i 's/<span>{tx.date}<\/span>/<span>{tx.date} {tx.time ? ` - ${tx.time}` : '"'"''"'"'}<\/span>/' src/components/POSAccountStatementModal.tsx
sed -i 's/{row.date}/{row.date} {row.time ? ` - ${row.time}` : '"'"''"'"'}/' src/components/POSAccountStatementModal.tsx
