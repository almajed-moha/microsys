import fs from 'fs';
let code = fs.readFileSync('src/components/InvoicesView.tsx', 'utf8');

const regex = /\/\/ Synchronize initial manager name[\s\S]*?const handlePOSChange = \(posId: string\) => \{[\s\S]*?\};\n/m;
const newCode = `  // Synchronize initial manager name when POS changes in form
  const handleEntityChange = (id: string, type: 'pos' | 'customer' = formEntityType) => {
    setFormEntityId(id);
    setFormEntityType(type);
    if (type === 'pos') {
      const selected = posPoints.find((p) => p.id === id);
      if (selected) {
        setFormReceivedBy(selected.managerName || selected.name);
      }
    } else {
      const selected = customers?.find((c) => c.id === id);
      if (selected) {
        setFormReceivedBy(selected.name);
      }
    }
  };
`;

code = code.replace(regex, newCode);

// Also fix: 
// src/components/InvoicesView.tsx(1134,29): error TS2304: Cannot find name 'customers'.
// Wait, why `customers` cannot be found? I added it to props:
// `customers = [],`
if (!code.includes('customers = [],')) {
  code = code.replace('posPoints,\n  settings,', 'posPoints,\n  customers = [],\n  settings,');
}

fs.writeFileSync('src/components/InvoicesView.tsx', code);
console.log('Fixed handleEntityChange');
