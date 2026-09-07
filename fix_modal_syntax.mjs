import fs from 'fs';
let code = fs.readFileSync('src/components/CustomerStatementModal.tsx', 'utf8');

code = code.replace(
  "printElementDocument('customer-statement-print', `كشف_حساب_${customer.name}`);",
  "printElementDocument('customer-statement-print', `كشف_حساب_${customer.name}`);"
);

// wait, if it was literal \` inside the file, I need to check what is in the file.
