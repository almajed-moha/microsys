#!/bin/bash
sed -i "s/const activePosId = posPoint ? posPoint.id : globalPosId;/const activePosId = posPoint ? posPoint.id : globalPosId;\n  const activePosPoint = posPoint || posPoints.find((p) => p.id === activePosId);/" src/components/POSAccountStatementModal.tsx

sed -i "s/posPoint?.name/activePosPoint?.name/g" src/components/POSAccountStatementModal.tsx
sed -i "s/posPoint?.managerName/activePosPoint?.managerName/g" src/components/POSAccountStatementModal.tsx
sed -i "s/posPoint?.phone/activePosPoint?.phone/g" src/components/POSAccountStatementModal.tsx
sed -i "s/posPoint?.address/activePosPoint?.address/g" src/components/POSAccountStatementModal.tsx
