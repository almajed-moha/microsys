import fs from 'fs';
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const target = 'label="صلاحيات المستخدمين"';
if (code.includes(target) && !code.includes('label="العملاء والديون"')) {
    code = code.replace(
        '<NavItem\n                icon={<User size={20} />}\n                label="صلاحيات المستخدمين"',
        '<NavItem\n                icon={<Users size={20} />}\n                label="العملاء والديون"\n                view="customers"\n                isActive={activeView === \'customers\'}\n                onClick={() => handleViewSelect(\'customers\')}\n                isCollapsed={isCollapsed}\n              />\n              <NavItem\n                icon={<User size={20} />}\n                label="صلاحيات المستخدمين"'
    );
    fs.writeFileSync('src/components/Sidebar.tsx', code);
    console.log('patched');
} else {
    console.log('not found or already patched');
}
