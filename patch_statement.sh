#!/bin/bash
sed -i 's/posPoint: POSPoint;/posPoint?: POSPoint | null;\n  posPoints?: POSPoint[];/' src/components/POSAccountStatementModal.tsx

sed -i 's/  posPoint,/  posPoint,\n  posPoints = [],/' src/components/POSAccountStatementModal.tsx

sed -i "s/const fullInventory = useMemo(() => calculatePOSInventory(posPoint.id, dispatches, sales), \[posPoint.id, dispatches, sales\]);/const [globalPosId, setGlobalPosId] = useState<string>('all');\n  const activePosId = posPoint ? posPoint.id : globalPosId;\n\n  const fullInventory = useMemo(() => calculatePOSInventory(activePosId, dispatches, sales), [activePosId, dispatches, sales]);/" src/components/POSAccountStatementModal.tsx

sed -i 's/calculatePOSBalance(posPoint.id/calculatePOSBalance(activePosId/' src/components/POSAccountStatementModal.tsx
sed -i 's/\[posPoint.id/\[activePosId/' src/components/POSAccountStatementModal.tsx

# For POS transactions filter
sed -i "s/const posSales = sales.filter((s) => s.posPointId === posPoint.id);/const posSales = activePosId === 'all' ? sales : sales.filter((s) => s.posPointId === activePosId);/" src/components/POSAccountStatementModal.tsx
sed -i "s/const posPayments = payments.filter((p) => p.posPointId === posPoint.id);/const posPayments = activePosId === 'all' ? payments : payments.filter((p) => p.posPointId === activePosId);/" src/components/POSAccountStatementModal.tsx
sed -i "s/const posDispatches = dispatches.filter((d) => d.posPointId === posPoint.id);/const posDispatches = activePosId === 'all' ? dispatches : dispatches.filter((d) => d.posPointId === activePosId);/" src/components/POSAccountStatementModal.tsx
sed -i "s/const posInvoices = invoices.filter((i) => i.posPointId === posPoint.id && i.status !== 'cancelled');/const posInvoices = invoices.filter((i) => i.status !== 'cancelled' \&\& (activePosId === 'all' || i.posPointId === activePosId));/" src/components/POSAccountStatementModal.tsx

# Also, update display names:
sed -i "s/posPoint.name/posPoint?.name || 'كافة الموزعين'/g" src/components/POSAccountStatementModal.tsx
sed -i "s/posPoint.managerName/posPoint?.managerName || 'الإدارة'/g" src/components/POSAccountStatementModal.tsx
sed -i "s/posPoint.phone/posPoint?.phone || ''/g" src/components/POSAccountStatementModal.tsx
sed -i "s/posPoint.address/posPoint?.address || ''/g" src/components/POSAccountStatementModal.tsx
sed -i "s/posPoint.id/activePosId/g" src/components/POSAccountStatementModal.tsx

# Clean up any bad replacements due to global sed:
# wait, replacing posPoint.name globally is a bit dangerous if it's inside `posPoint?.name || 'كافة الموزعين'`, but there shouldn't be any currently.

