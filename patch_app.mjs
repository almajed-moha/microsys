import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// App.tsx has `<InvoicesView` multiple times? No, just once usually.
// Wait, in `Sidebar`, we pass `customers={scopedCustomers}` maybe.
code = code.replace(
  '<InvoicesView\n                  invoices={scopedInvoices}\n                  posPoints={scopedPOSPoints}',
  '<InvoicesView\n                  invoices={scopedInvoices}\n                  posPoints={scopedPOSPoints}\n                  customers={scopedCustomers}'
);

code = code.replace(
  '<PaymentsView\n                  payments={scopedPayments}\n                  posPoints={scopedPOSPoints}',
  '<PaymentsView\n                  payments={scopedPayments}\n                  posPoints={scopedPOSPoints}\n                  customers={scopedCustomers}'
);

code = code.replace(
  '<PaymentModal\n          posPoints={scopedPOSPoints}',
  '<PaymentModal\n          posPoints={scopedPOSPoints}\n          customers={scopedCustomers}'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx');
