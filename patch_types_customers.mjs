import fs from 'fs';
let code = fs.readFileSync('src/types.ts', 'utf8');

if (!code.includes('customerId?: string; // ID of the customer (optional for POS)')) {
  // Add to InvoiceRecord
  code = code.replace(
    '  posPointId: string;\n  posPointName?: string;',
    '  posPointId: string;\n  posPointName?: string;\n  customerId?: string; // ID of the customer (optional for POS)'
  );
  
  // Add to PaymentRecord
  code = code.replace(
    '  posPointId: string;\n  amount: number;',
    '  posPointId: string;\n  customerId?: string;\n  amount: number;'
  );

  fs.writeFileSync('src/types.ts', code);
  console.log('patched types.ts');
}
