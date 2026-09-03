#!/bin/bash
sed -i "s/posPoints.find((p) => p.id === p.posPointId)?.name || p.posPointId/posPoints.find((pos) => pos.id === p.posPointId)?.name || p.posPointId/g" src/components/POSAccountStatementModal.tsx
