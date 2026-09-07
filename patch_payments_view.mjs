import fs from 'fs';
let code = fs.readFileSync('src/components/PaymentsView.tsx', 'utf8');

// Ensure Customer is imported
if (!code.includes('Customer')) {
  code = code.replace(
    "import { POSPoint, PaymentRecord, NetworkSettings } from '../types';",
    "import { POSPoint, PaymentRecord, NetworkSettings, Customer } from '../types';"
  );
}

// Add customers to Props
if (!code.includes('customers?: Customer[]')) {
  code = code.replace(
    'posPoints: POSPoint[];',
    'posPoints: POSPoint[];\n  customers?: Customer[];'
  );
  code = code.replace(
    '  onOpenStatement,',
    '  onOpenStatement,\n  customers = [],'
  );
}

// Replace POS name with POS or Customer Name
code = code.replace(
  'const pos = posPoints.find((p) => p.id === payment.posPointId);',
  `const pos = posPoints.find((p) => p.id === payment.posPointId);
                  const customer = payment.customerId ? customers.find((c) => c.id === payment.customerId) : null;`
);

code = code.replaceAll(
  '<span className="font-bold text-slate-800">{pos?.name || \'نقطة غير معروفة\'}</span>',
  '<span className="font-bold text-slate-800">{customer ? customer.name : (pos?.name || \'غير معروف\')}</span>'
);

code = code.replaceAll(
  '<div className="font-bold text-slate-800">{pos?.name || \'نقطة غير معروفة\'}</div>',
  '<div className="font-bold text-slate-800">{customer ? customer.name : (pos?.name || \'غير معروف\')}</div>'
);

code = code.replaceAll(
  '<p className="font-bold text-slate-800">{pos?.name || \'نقطة غير معروفة\'}</p>',
  '<p className="font-bold text-slate-800">{customer ? customer.name : (pos?.name || \'غير معروف\')}</p>'
);

// Allow clicking on customer name to open statement (if needed, but onOpenStatement takes posId right now, let's just leave it or pass customerId)
// I'll replace pos.id with customer.id if it's a customer
code = code.replace(
  'onClick={() => onOpenStatement(pos.id)}',
  'onClick={() => onOpenStatement(customer ? customer.id : pos.id)}'
);

// We need to make sure pos exists before pos.id in the click handler
code = code.replace(
  'pos && onOpenStatement && (',
  '(pos || customer) && onOpenStatement && ('
);

fs.writeFileSync('src/components/PaymentsView.tsx', code);
console.log('patched PaymentsView.tsx');
