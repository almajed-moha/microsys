#!/bin/bash
sed -i 's/const \[formDate, setFormDate\] = useState<string>(new Date().toISOString().split('"'"'T'"'"')\[0\]);/const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('"'"'T'"'"')[0]);\n  const [formTime, setFormTime] = useState<string>(new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5));/g' src/components/InvoicesView.tsx

sed -i 's/setFormDate(todayStr);/setFormDate(todayStr);\n    setFormTime(new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5));/g' src/components/InvoicesView.tsx

sed -i 's/setFormDate(inv.date);/setFormDate(inv.date);\n    setFormTime(inv.time || new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5));/g' src/components/InvoicesView.tsx

sed -i 's/date: formDate,/date: formDate,\n        time: formTime,/g' src/components/InvoicesView.tsx
