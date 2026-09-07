import fs from 'fs';
let code = fs.readFileSync('src/components/CustomerStatementModal.tsx', 'utf8');

code = code.replace(
  "import { printElementDocument } from '../utils/printUtils';",
  "import { printElementDocument } from '../utils/pdfExport';"
);

fs.writeFileSync('src/components/CustomerStatementModal.tsx', code);
console.log('fixed import');
