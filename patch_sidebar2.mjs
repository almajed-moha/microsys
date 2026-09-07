import fs from 'fs';
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Ensure Users icon is imported
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

if (!code.includes('view="customers"')) {
  // Let's find exactly where to insert it.
  const target = '<div className="pt-4 mt-4 border-t border-slate-700/50">';
  code = code.replace(
    target,
    customerLink + "\n" + target
  );
  fs.writeFileSync('src/components/Sidebar.tsx', code);
  console.log('patched Sidebar links');
} else {
  console.log('already patched');
}
