import fs from 'fs';

let pm = fs.readFileSync('src/components/PaymentModal.tsx', 'utf8');
const lines = pm.split('\n');
const newLines = [];
let seenCust = false;
let inProps = false;
for (const line of lines) {
  if (line.includes('export const PaymentModal')) {
    inProps = true;
  }
  if (line.includes('}) => {')) {
    inProps = false;
  }
  if (inProps && line.includes('customers = [],')) {
    if (!seenCust) {
      newLines.push(line);
      seenCust = true;
    }
  } else {
    newLines.push(line);
  }
}
fs.writeFileSync('src/components/PaymentModal.tsx', newLines.join('\n'));

console.log('Fixed dupes 2');
