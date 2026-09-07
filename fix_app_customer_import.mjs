import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure Customer type is imported
if (!code.includes('Customer,')) {
  code = code.replace(
    '  CardOrder,',
    '  CardOrder,\n  Customer,'
  );
  fs.writeFileSync('src/App.tsx', code);
  console.log('Added Customer type import');
}

// Update the type of the customers state array to Customer[]
code = fs.readFileSync('src/App.tsx', 'utf8');
if (code.includes('const [customers, setCustomers] = useState<any[]>(() =>')) {
  code = code.replace(
    'const [customers, setCustomers] = useState<any[]>(() =>',
    'const [customers, setCustomers] = useState<Customer[]>(() =>'
  );
  fs.writeFileSync('src/App.tsx', code);
  console.log('Fixed customers state type to Customer[]');
}

