import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '  const scopedActivityLogs = useMemo(() => ',
  '  const scopedCustomers = useMemo(() => \n    (activeUser?.networkId && activeUser.networkId !== \'system\')\n      ? customers.filter((c) => c.networkId === activeUser.networkId)\n      : customers,\n  [customers, activeUser?.networkId]);\n\n  const scopedActivityLogs = useMemo(() => '
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx scopedCustomers');
