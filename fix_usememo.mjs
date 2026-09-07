import fs from 'fs';
let pv = fs.readFileSync('src/components/PaymentsView.tsx', 'utf8');

pv = pv.replace('  }, [payments, posPoints,\n\n  // Financial Stats', '  }, [payments, posPoints, customers]);\n\n  // Financial Stats');
pv = pv.replace('  }, [payments, posPoints,\n  // Financial Stats', '  }, [payments, posPoints, customers]);\n  // Financial Stats');

fs.writeFileSync('src/components/PaymentsView.tsx', pv);
console.log('fixed usememo');
