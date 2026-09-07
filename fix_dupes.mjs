import fs from 'fs';

let pm = fs.readFileSync('src/components/PaymentModal.tsx', 'utf8');
pm = pm.replace('  customers = [],\n  customers = [],', '  customers = [],');
fs.writeFileSync('src/components/PaymentModal.tsx', pm);

let pv = fs.readFileSync('src/components/PaymentsView.tsx', 'utf8');
pv = pv.replace('  customers = [],\n  customers = [],', '  customers = [],');
// just in case they are not adjacent:
const lines = pv.split('\n');
const newLines = [];
let seenCust = false;
for (const line of lines) {
  if (line.includes('customers = [],')) {
    if (!seenCust) {
      newLines.push(line);
      seenCust = true;
    }
  } else {
    newLines.push(line);
  }
}
fs.writeFileSync('src/components/PaymentsView.tsx', newLines.join('\n'));

console.log('Fixed dupes');
