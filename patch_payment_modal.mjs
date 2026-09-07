import fs from 'fs';
let code = fs.readFileSync('src/components/PaymentModal.tsx', 'utf8');

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
    '  posPoints,\n  initialPOSId,',
    '  posPoints,\n  customers = [],\n  initialPOSId,'
  );
}

// Add state for entity type and selected customer
if (!code.includes('const [entityType, setEntityType]')) {
  code = code.replace(
    'const [selectedPOSId, setSelectedPOSId] = useState(initialPOSId || (posPoints[0]?.id || \'\'));',
    `const initialEntity = initialPOSId && customers.find(c => c.id === initialPOSId) ? 'customer' : 'pos';
  const [entityType, setEntityType] = useState<'pos' | 'customer'>(initialEntity);
  const [selectedPOSId, setSelectedPOSId] = useState(initialEntity === 'pos' ? (initialPOSId || (posPoints[0]?.id || '')) : (posPoints[0]?.id || ''));
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialEntity === 'customer' ? (initialPOSId || (customers[0]?.id || '')) : (customers[0]?.id || ''));`
  );
}

// Fix selected entity debt
code = code.replace(
  'const selectedPOS = posPoints.find((p) => p.id === selectedPOSId);\n  const currentDebt = selectedPOS?.currentDebt || 0;',
  `const selectedPOS = posPoints.find((p) => p.id === selectedPOSId);
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const currentDebt = entityType === 'pos' ? (selectedPOS?.currentDebt || 0) : (selectedCustomer?.balance || 0);`
);

// Fix handleSubmit
code = code.replace(
  'posPointId: selectedPOSId,',
  `posPointId: entityType === 'pos' ? selectedPOSId : '',\n      customerId: entityType === 'customer' ? selectedCustomerId : '',`
);

// Replace POS Selector with a tabbed Entity Selector
const entitySelectorCode = `{/* Entity Type Tabs */}
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setEntityType('pos')}
              className={\`flex-1 py-1.5 text-xs font-bold rounded-md transition \${entityType === 'pos' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}\`}
            >
              نقاط البيع
            </button>
            <button
              type="button"
              onClick={() => setEntityType('customer')}
              className={\`flex-1 py-1.5 text-xs font-bold rounded-md transition \${entityType === 'customer' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}\`}
            >
              العملاء
            </button>
          </div>
          
          {/* Entity Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {entityType === 'pos' ? 'نقطة البيع المسددة' : 'العميل المسدد'} <span className="text-rose-400">*</span>:
            </label>
            {entityType === 'pos' ? (
              <select
                value={selectedPOSId}
                onChange={(e) => setSelectedPOSId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {posPoints.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name} - (المديونية الحالية: {(pos.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol})
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - (الرصيد: {(c.balance ?? 0).toLocaleString()} {settings.currencySymbol})
                  </option>
                ))}
              </select>
            )}
          </div>`;

code = code.replace(
  /\{?\/\* POS Selector \*\/\s*<div>\s*<label[\s\S]*?<\/select>\s*<\/div>/,
  entitySelectorCode
);

// Fix Preview Condition
code = code.replace(
  '{selectedPOS && (',
  '{(entityType === \'pos\' ? selectedPOS : selectedCustomer) && ('
);

fs.writeFileSync('src/components/PaymentModal.tsx', code);
console.log('patched PaymentModal.tsx');
