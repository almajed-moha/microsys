import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure import CustomersView
if (!code.includes('CustomersView')) {
  code = code.replace(
    '  CardOrdersView,\n} from \'./components\';',
    '  CardOrdersView,\n  CustomersView,\n} from \'./components\';'
  );
}

// Add state for customers is already there from previous patch (mock patch), wait, I added it in `patch_mock.mjs`:
// `const [customers, setCustomers] = useState<any[]>(loadData(STORAGE_KEYS.CUSTOMERS, []));`
// But wait, the type `Customer` needs to be imported if we want typed arrays. Or I can just leave it as any. Let's make sure `Customer` type is imported if needed, but it's any[].

// Add render block in main content
const customersRender = `
        {activeView === 'customers' && (
          <CustomersView
            customers={customers}
            invoices={invoices}
            payments={payments}
            onAddCustomer={(customer) => {
              const updated = [...customers, customer];
              setCustomers(updated);
              saveData(STORAGE_KEYS.CUSTOMERS, updated);
            }}
            onUpdateCustomer={(customer) => {
              const updated = customers.map(c => c.id === customer.id ? customer : c);
              setCustomers(updated);
              saveData(STORAGE_KEYS.CUSTOMERS, updated);
            }}
            onDeleteCustomer={(id) => {
              const updated = customers.filter(c => c.id !== id);
              setCustomers(updated);
              saveData(STORAGE_KEYS.CUSTOMERS, updated);
            }}
          />
        )}
`;

if (!code.includes('activeView === \'customers\'')) {
  code = code.replace(
    "{activeView === 'users' && (",
    customersRender + "\n        {activeView === 'users' && ("
  );
}

fs.writeFileSync('src/App.tsx', code);
console.log('done');
