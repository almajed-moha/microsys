import fs from 'fs';
let code = fs.readFileSync('src/components/InvoiceReceiptModal.tsx', 'utf8');

// Ensure Customer is imported
if (!code.includes('Customer')) {
  code = code.replace(
    "import { InvoiceRecord, POSPoint, CardCategory, NetworkSettings } from '../types';",
    "import { InvoiceRecord, POSPoint, CardCategory, NetworkSettings, Customer } from '../types';"
  );
}

// Add customer to Props
if (!code.includes('customer?: Customer;')) {
  code = code.replace(
    'posPoint?: POSPoint;',
    'posPoint?: POSPoint;\n  customer?: Customer;'
  );
  code = code.replace(
    '  posPoint,\n  categories,',
    '  posPoint,\n  customer,\n  categories,'
  );
}

// Update the render logic to use customer if available
code = code.replaceAll(
  'invoice.posPointName || posPoint?.name',
  'invoice.posPointName || customer?.name || posPoint?.name'
);

code = code.replaceAll(
  'posPoint?.name',
  '(customer?.name || posPoint?.name)'
);

code = code.replaceAll(
  'posPoint?.managerName',
  '(customer ? customer.name : posPoint?.managerName)'
);

code = code.replaceAll(
  'posPoint?.phone',
  '(customer?.phone || posPoint?.phone)'
);

code = code.replaceAll(
  'posPoint?.address',
  '(customer?.address || posPoint?.address)'
);

code = code.replaceAll(
  'posPoint?.currentDebt',
  '(customer?.balance || posPoint?.currentDebt)'
);

code = code.replace(
  '(posPoint ? `📊 المديونية الحالية للنقطة: ${(posPoint.currentDebt ?? 0).toLocaleString()} ${currency}\\n` : \'\')',
  '((posPoint || customer) ? `📊 المديونية الحالية ${customer ? "للعميل" : "للنقطة"}: ${((customer?.balance || posPoint?.currentDebt) ?? 0).toLocaleString()} ${currency}\\n` : \'\')'
);

fs.writeFileSync('src/components/InvoiceReceiptModal.tsx', code);
console.log('patched InvoiceReceiptModal.tsx');
