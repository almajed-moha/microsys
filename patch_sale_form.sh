#!/bin/bash
sed -i 's/date: new Date().toISOString().split('"'"'T'"'"')\[0\],/date: new Date().toISOString().split('"'"'T'"'"')[0],\n    time: new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5),/' src/components/SalesView.tsx
sed -i 's/date: sale.date,/date: sale.date,\n      time: sale.time || new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5),/' src/components/SalesView.tsx
