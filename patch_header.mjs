import fs from 'fs';
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  'users: \'إدارة المستخدمين والأدوار ومصفوفة الصلاحيات\',',
  'users: \'إدارة المستخدمين والأدوار ومصفوفة الصلاحيات\',\n    customers: \'إدارة العملاء والمديونيات\',\n    mikrotik_sessions: \'إحصائيات المتصلين وجلسات المايكروتك\','
);

fs.writeFileSync('src/components/Header.tsx', code);
console.log('patched Header.tsx');
