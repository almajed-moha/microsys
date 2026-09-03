#!/bin/bash
sed -i 's/date: new Date().toISOString().split('"'"'T'"'"')\[0\],/date: new Date().toISOString().split('"'"'T'"'"')[0],\n    time: new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5),/' src/components/BatchDispatchView.tsx
sed -i 's/date: dispatch.date,/date: dispatch.date,\n      time: dispatch.time || new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5),/' src/components/BatchDispatchView.tsx
