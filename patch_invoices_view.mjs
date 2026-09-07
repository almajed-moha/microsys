import fs from 'fs';
let code = fs.readFileSync('src/components/InvoicesView.tsx', 'utf8');

// Imports
if (!code.includes('Customer')) {
  code = code.replace(
    "import { InvoiceRecord, InvoiceItem, CardCategory, POSPoint, ExpenseRecord, NetworkSettings, SalesRecord, PaymentRecord } from '../types';",
    "import { InvoiceRecord, InvoiceItem, CardCategory, POSPoint, ExpenseRecord, NetworkSettings, SalesRecord, PaymentRecord, Customer } from '../types';"
  );
}

// Props
if (!code.includes('customers?: Customer[]')) {
  code = code.replace(
    'posPoints: POSPoint[];',
    'posPoints: POSPoint[];\n  customers?: Customer[];'
  );
  code = code.replace(
    '  settings,\n  expenses,',
    '  settings,\n  customers = [],\n  expenses,'
  );
}

// State
if (!code.includes('formEntityType')) {
  code = code.replace(
    'const [formPOSId, setFormPOSId] = useState<string>(posPoints[0]?.id || \'\');',
    `const [formEntityType, setFormEntityType] = useState<'pos' | 'customer'>('pos');
  const [formEntityId, setFormEntityId] = useState<string>(posPoints[0]?.id || '');`
  );
}

// Edit mode initialization
code = code.replace(
  'setFormPOSId(invoice.posPointId);',
  `if (invoice.customerId) {
        setFormEntityType('customer');
        setFormEntityId(invoice.customerId);
      } else {
        setFormEntityType('pos');
        setFormEntityId(invoice.posPointId || posPoints[0]?.id || '');
      }`
);

// Reset form
code = code.replace(
  'setFormPOSId(posPoints[0]?.id || \'\');',
  `setFormEntityType('pos');
      setFormEntityId(posPoints[0]?.id || '');`
);

// Validation
code = code.replace(
  'if (!formPOSId) {\n      alert(\'يرجى اختيار نقطة البيع أو الموزع.\');',
  `if (!formEntityId) {\n      alert('يرجى اختيار نقطة البيع أو العميل.');`
);

// Entity Name calculation
code = code.replace(
  `const selectedPOS = posPoints.find((p) => p.id === formPOSId);
    const posPointName = selectedPOS ? selectedPOS.name : 'نقطة بيع غير محددة';`,
  `let posPointName = 'غير محدد';
    if (formEntityType === 'pos') {
      const selectedPOS = posPoints.find((p) => p.id === formEntityId);
      posPointName = selectedPOS ? selectedPOS.name : 'نقطة بيع غير محددة';
    } else {
      const selectedCustomer = customers.find(c => c.id === formEntityId);
      posPointName = selectedCustomer ? selectedCustomer.name : 'عميل غير محدد';
    }`
);

// Form update payload (2 occurrences)
code = code.replaceAll(
  'posPointId: formPOSId,',
  `posPointId: formEntityType === 'pos' ? formEntityId : '',
        customerId: formEntityType === 'customer' ? formEntityId : undefined,`
);

// handlePOSChange -> handleEntityChange
code = code.replace(
  `const handlePOSChange = (posId: string) => {
    setFormPOSId(posId);
    
    // Auto-fill ReceivedBy
    const p = posPoints.find((x) => x.id === posId);`,
  `const handleEntityChange = (id: string, type: 'pos' | 'customer' = formEntityType) => {
    setFormEntityId(id);
    setFormEntityType(type);
    
    // Auto-fill ReceivedBy
    const p = type === 'pos' ? posPoints.find((x) => x.id === id) : customers.find((x) => x.id === id);`
);

// UI Select
const entitySelectUI = `{/* Entity Type Tabs */}
                  <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-700 mb-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFormEntityType('pos');
                        if (posPoints[0]) handleEntityChange(posPoints[0].id, 'pos');
                      }}
                      className={\`flex-1 py-1.5 text-xs font-bold rounded-md transition \${formEntityType === 'pos' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}\`}
                    >
                      نقطة بيع / موزع
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormEntityType('customer');
                        if (customers[0]) handleEntityChange(customers[0].id, 'customer');
                      }}
                      className={\`flex-1 py-1.5 text-xs font-bold rounded-md transition \${formEntityType === 'customer' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}\`}
                    >
                      عميل
                    </button>
                  </div>
                  
                  {formEntityType === 'pos' ? (
                    <select
                      value={formEntityId}
                      onChange={(e) => handleEntityChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      required
                    >
                      {posPoints.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={formEntityId}
                      onChange={(e) => handleEntityChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      required
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}`;

code = code.replace(
  /<select\s*value=\{formPOSId\}[\s\S]*?<\/select>/,
  entitySelectUI
);

// We need to fix the title in the invoice table view to show if it is customer or POS.
// The POS column title is "نقطة البيع" => we can leave it as "الجهة المستلمة" or just use `posPointName`. The code currently uses `invoice.posPointName`, which we populated correctly above.

fs.writeFileSync('src/components/InvoicesView.tsx', code);
console.log('patched InvoicesView.tsx');
