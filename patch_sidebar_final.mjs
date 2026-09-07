import fs from 'fs';
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// The issue might be that the link is not rendering correctly or we missed something.
// Let's check where the link is in the menu.
// In patch_sidebar2.mjs we did: code.replace(target, customerLink + "\n" + target)

// Let's just make absolutely sure it's in the Navigation items list.
const customerLink = `
        <NavItem
          icon={<Users size={20} />}
          label="العملاء والديون"
          view="customers"
          isActive={activeView === 'customers'}
          onClick={() => handleViewSelect('customers')}
          isCollapsed={isCollapsed}
        />
`;

if (!code.includes('label="العملاء والديون"')) {
    const target = 'label="صلاحيات المستخدمين"';
    // We will place it before users
    const parts = code.split(target);
    if(parts.length > 1) {
        fs.writeFileSync('src/components/Sidebar.tsx', parts[0] + 'label="العملاء والديون" view="customers" isActive={activeView === "customers"} onClick={() => handleViewSelect("customers")} isCollapsed={isCollapsed} />' + '\n' + '<NavItem icon={<User size={20} />} ' + target + parts[1]);
        console.log('patched Sidebar');
    }
}
