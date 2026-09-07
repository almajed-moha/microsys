import fs from 'fs';

// 1. InvoicesView.tsx
let inv = fs.readFileSync('src/components/InvoicesView.tsx', 'utf8');
if (!inv.includes('Customer } from')) {
  inv = inv.replace('PaymentRecord } from', 'PaymentRecord, Customer } from');
}
inv = inv.replaceAll('setFormPOSId(posId);', "handleEntityChange(posId, 'pos');");
inv = inv.replaceAll('setFormPOSId(initialPos?.id || \'\');', "if (initialPos) handleEntityChange(initialPos.id, 'pos');");
inv = inv.replaceAll('setFormPOSId(inv.posPointId);', `if (inv.customerId) {
      setFormEntityType('customer');
      setFormEntityId(inv.customerId);
    } else {
      setFormEntityType('pos');
      setFormEntityId(inv.posPointId || '');
    }`);
fs.writeFileSync('src/components/InvoicesView.tsx', inv);

// 2. PaymentsView.tsx
let pay = fs.readFileSync('src/components/PaymentsView.tsx', 'utf8');
if (!pay.includes('Customer } from')) {
  pay = pay.replace('NetworkSettings } from', 'NetworkSettings, Customer } from');
}
fs.writeFileSync('src/components/PaymentsView.tsx', pay);

// 3. InvoiceReceiptModal.tsx
let rec = fs.readFileSync('src/components/InvoiceReceiptModal.tsx', 'utf8');
if (!rec.includes('Customer } from')) {
  rec = rec.replace('NetworkSettings } from', 'NetworkSettings, Customer } from');
}
fs.writeFileSync('src/components/InvoiceReceiptModal.tsx', rec);

console.log('Fixed imports and setFormPOSId');
