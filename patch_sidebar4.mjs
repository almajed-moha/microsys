import fs from 'fs';
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const newLink = `
    {
      id: 'customers' as NavView,
      permissionModule: 'users' as const, // using users permission for now or you can define customers
      label: 'العملاء والديون',
      icon: Users,
      badge: null,
      color: 'text-amber-400',
      activeBg: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30',
    },
`;

if (!code.includes("id: 'customers' as NavView")) {
    code = code.replace(
        "const navigationItems = [",
        "const navigationItems = [\n" + newLink
    );
    fs.writeFileSync('src/components/Sidebar.tsx', code);
    console.log('patched');
} else {
    console.log('already patched');
}
