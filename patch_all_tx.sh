#!/bin/bash
sed -i 's/categoryName: cat?.name || '"'"'غير محدد'"'"',/posPointName: posPoints.find((p) => p.id === d.posPointId)?.name || d.posPointId,\n          categoryName: cat?.name || '"'"'غير محدد'"'"',/g' src/components/POSAccountStatementModal.tsx
sed -i 's/categoryName: cat?.name || '"'"'غير محدد'"'"',/posPointName: posPoints.find((p) => p.id === s.posPointId)?.name || s.posPointId,\n          categoryName: cat?.name || '"'"'غير محدد'"'"',/g' src/components/POSAccountStatementModal.tsx
sed -i 's/categoryName: item.categoryName,/posPointName: posPoints.find((p) => p.id === inv.posPointId)?.name || inv.posPointId,\n            categoryName: item.categoryName,/g' src/components/POSAccountStatementModal.tsx
sed -i "s/categoryName: '-',/posPointName: posPoints.find((p) => p.id === p.posPointId)?.name || p.posPointId,\n        categoryName: '-',/g" src/components/POSAccountStatementModal.tsx
