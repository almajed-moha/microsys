import fs from 'fs';
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace('  Activity, Wifi,', '  Activity,');

fs.writeFileSync('src/components/Sidebar.tsx', code);
console.log('patched Sidebar.tsx');
