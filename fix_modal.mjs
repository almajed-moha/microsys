import fs from 'fs';
let code = fs.readFileSync('src/components/CustomerStatementModal.tsx', 'utf8');

code = code.replace(
  "printElementDocument('customer-statement-print', \\`كشف_حساب_\\${customer.name}\\`);",
  "printElementDocument('customer-statement-print', `كشف_حساب_${customer.name}`);"
);
// Also another place: 
code = code.replace(
  "className={\\`text-xl font-black \\${finalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}\\`}",
  "className={`text-xl font-black ${finalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}"
);

fs.writeFileSync('src/components/CustomerStatementModal.tsx', code);
console.log('fixed');
