import fs from 'fs';
let code = fs.readFileSync('src/types.ts', 'utf8');

const customerInterface = `
export interface Customer extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  name: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  notes?: string;
  totalPurchases?: number;
  totalPayments?: number;
  balance?: number;
}
`;

if (!code.includes('export interface Customer')) {
  code = code + '\n' + customerInterface;
}

code = code.replace(
  '  posPointId: string;',
  '  posPointId?: string;\n  customerId?: string;'
);

fs.writeFileSync('src/types.ts', code);
console.log('done');
