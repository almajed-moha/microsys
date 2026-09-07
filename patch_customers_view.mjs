import fs from 'fs';
let code = fs.readFileSync('src/components/CustomersView.tsx', 'utf8');

// Import CustomerStatementModal if not already
if (!code.includes('CustomerStatementModal')) {
  code = code.replace(
    'import { Customer, InvoiceRecord, PaymentRecord } from \'../types\';',
    'import { Customer, InvoiceRecord, PaymentRecord } from \'../types\';\nimport { CustomerStatementModal } from \'./CustomerStatementModal\';'
  );
}

// Add state for viewing statement
if (!code.includes('const [statementCustomer, setStatementCustomer]')) {
  code = code.replace(
    'const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);',
    'const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);\n  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);'
  );
}

// Fix input colors
code = code.replace(/text-slate-700/g, 'text-slate-800 font-bold'); // Make labels slightly darker
// Inputs are mostly like: className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
// we need to add text-slate-900 and bg-white
code = code.replaceAll(
  'className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"',
  'className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"'
);
code = code.replaceAll(
  'className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"',
  'className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"'
);
code = code.replaceAll(
  'className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"',
  'className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px] text-slate-900 bg-white"'
);

// Fix delete logic
code = code.replace(
  "if (confirm('هل أنت متأكد من حذف العميل؟')) onDeleteCustomer(customer.id);",
  "if (customer.balance && customer.balance !== 0) { alert('لا يمكن حذف العميل لأن عليه مديونية أو له رصيد متبقي. الرجاء تصفية حسابه أولاً.'); return; } if (confirm('هل أنت متأكد من حذف العميل؟')) onDeleteCustomer(customer.id);"
);

// Open statement button
code = code.replace(
  '<button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center justify-end gap-1 w-full font-medium">',
  '<button onClick={() => setStatementCustomer(customer)} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center justify-end gap-1 w-full font-medium">'
);

// Add the modal component at the end
if (!code.includes('<CustomerStatementModal')) {
  code = code.replace(
    '    </div>\n  );\n};\n',
    `
      {/* Statement Modal */}
      {statementCustomer && (
        <CustomerStatementModal
          customer={statementCustomer}
          invoices={invoices}
          payments={payments}
          onClose={() => setStatementCustomer(null)}
        />
      )}
    </div>
  );
};
`
  );
}

fs.writeFileSync('src/components/CustomersView.tsx', code);
console.log('patched customers view');
