#!/bin/bash
sed -i 's/colSpan={3}/colSpan={!posPoint ? 4 : 3}/g' src/components/POSAccountStatementModal.tsx
