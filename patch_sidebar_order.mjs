import fs from 'fs';
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const customerRegex = /\{\s*id:\s*'customers'\s*as\s*NavView,[\s\S]*?\},/;
const customerMatch = code.match(customerRegex);

if (customerMatch) {
  // Remove customer entry from its current position
  code = code.replace(customerMatch[0], '');

  // Find payments entry to insert after it
  const paymentsRegex = /\{\s*id:\s*'payments'\s*as\s*NavView,[\s\S]*?\},/;
  
  code = code.replace(paymentsRegex, match => match + '\n    ' + customerMatch[0]);
  
  fs.writeFileSync('src/components/Sidebar.tsx', code);
  console.log('Moved customers entry after payments in Sidebar.tsx');
} else {
  console.log('Customer entry not found');
}
