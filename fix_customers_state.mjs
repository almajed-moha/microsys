import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// I apparently missed adding the state for `customers` because the mock patch failed or was overridden.
const customersState = `
  const [customers, setCustomers] = useState<any[]>(() =>
    loadData(STORAGE_KEYS.CUSTOMERS, mockCustomers || [])
  );
`;

if (!code.includes('const [customers, setCustomers]')) {
  // Let's import mockCustomers if needed, but since it might not be in mockData properly, we can just fallback to []
  const customersStateSafe = `
  const [customers, setCustomers] = useState<any[]>(() =>
    loadData(STORAGE_KEYS.CUSTOMERS, [])
  );
`;
  code = code.replace(
    '  const [orders, setOrders] = useState<CardOrder[]>(() =>',
    customersStateSafe + '\n  const [orders, setOrders] = useState<CardOrder[]>(() =>'
  );
  fs.writeFileSync('src/App.tsx', code);
  console.log('Added customers state');
}
