#!/bin/bash
sed -i 's/date: string;/date: string;\n    time: string;/' src/components/ExpensesView.tsx
sed -i 's/date: new Date().toISOString().split('"'"'T'"'"')\[0\],/date: new Date().toISOString().split('"'"'T'"'"')[0],\n      time: new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5),/' src/components/ExpensesView.tsx
sed -i 's/date: expense.date,/date: expense.date,\n      time: expense.time || new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5),/' src/components/ExpensesView.tsx
sed -i 's/date: formData.date,/date: formData.date,\n      time: formData.time,/' src/components/ExpensesView.tsx
