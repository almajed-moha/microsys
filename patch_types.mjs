import fs from 'fs';
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  '  posPointId: string;',
  '  posPointId?: string;'
);
code = code.replace(
  '  posPointId: string;',
  '  posPointId?: string;'
); // Run twice because it's in both InvoiceRecord and PaymentRecord

fs.writeFileSync('src/types.ts', code);
console.log('patched types.ts');
