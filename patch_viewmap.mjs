import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('mikrotik_sessions: \'mikrotik\',')) {
  code = code.replace(
    "mikrotik: 'mikrotik',",
    "mikrotik: 'mikrotik',\n      mikrotik_sessions: 'mikrotik',"
  );
  
  // also wait, let's make sure it checks viewSessions if the view is mikrotik_sessions.
  // Actually, hasPermission(activeUser, mod, 'view', currentTenant) only checks the 'view' property.
  // If we want to check 'viewSessions' for 'mikrotik_sessions':
  
  const permissionCheckCode = `
    const mod = viewToModuleMap[view] || 'invoices';
    if (view === 'mikrotik_sessions') {
      return hasPermission(activeUser, 'mikrotik', 'viewSessions', currentTenant);
    }
    return hasPermission(activeUser, mod, 'view', currentTenant);
`;

  code = code.replace(
    "    const mod = viewToModuleMap[view] || 'invoices';\n    return hasPermission(activeUser, mod, 'view', currentTenant);",
    permissionCheckCode
  );

  fs.writeFileSync('src/App.tsx', code);
  console.log('patched viewToModuleMap in App.tsx');
}
