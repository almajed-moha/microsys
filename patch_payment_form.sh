#!/bin/bash
sed -i 's/date: new Date().toISOString().split('"'"'T'"'"')\[0\],/date: new Date().toISOString().split('"'"'T'"'"')[0],\n    time: new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5),/' src/components/PaymentsView.tsx
sed -i 's/date: payment.date,/date: payment.date,\n      time: payment.time || new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5),/' src/components/PaymentsView.tsx
