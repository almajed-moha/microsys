import fs from 'fs';
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  "| 'orders'\n  | 'pos_portal';",
  "| 'orders'\n  | 'pos_portal'\n  | 'customers';"
);

// Add Users icon to imports if missing
if (!code.includes('Users,')) {
  code = code.replace("User,", "User, Users,");
}

const customerLink = `
            {hasPermission(activeUser, 'users', 'read') && (
              <NavItem
                icon={<Users size={20} />}
                label="العملاء والديون"
                view="customers"
                isActive={activeView === 'customers'}
                onClick={() => handleViewSelect('customers')}
                isCollapsed={isCollapsed}
              />
            )}
`;

code = code.replace(
  "{/* Management Section */}",
  "{/* Management Section */}" + customerLink
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
console.log('done');
