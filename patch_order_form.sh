#!/bin/bash
sed -i 's/const \[newOrderNotes, setNewOrderNotes\] = useState('"'"''"'"');/const [newOrderNotes, setNewOrderNotes] = useState('"'"''"'"');\n  const [newOrderDate, setNewOrderDate] = useState(new Date().toISOString().split('"'"'T'"'"')[0]);\n  const [newOrderTime, setNewOrderTime] = useState(new Date().toISOString().split('"'"'T'"'"')[1].substring(0, 5));/' src/components/OrdersManagementView.tsx

sed -i 's/requestDate: new Date().toISOString().split('"'"'T'"'"')\[0\],/requestDate: newOrderDate,\n        time: newOrderTime,/' src/components/OrdersManagementView.tsx

