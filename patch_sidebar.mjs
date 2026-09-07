import fs from 'fs';
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (!code.includes("'mikrotik_sessions'")) {
  // 1. Add to NavView type
  code = code.replace(
    "  | 'mikrotik'",
    "  | 'mikrotik'\n  | 'mikrotik_sessions'"
  );

  // 2. Add to allNavItems array right after mikrotik
  const newLink = `
    {
      id: 'mikrotik_sessions' as NavView,
      permissionModule: 'mikrotik' as const, // Uses mikrotik permissions group
      label: 'إحصائيات المتصلين',
      icon: Activity,
      badge: null,
      color: 'text-teal-400',
      activeBg: 'bg-teal-600 text-white shadow-lg shadow-teal-600/30',
    },`;
    
  code = code.replace(
    "      activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',\n    },",
    "      activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',\n    }," + newLink
  );
  
  // also import Radio if needed, but let's just use Activity or some other icon
  code = code.replace('Activity,', 'Activity, Wifi,');
  code = code.replace('icon: Activity,\n      badge: null,\n      color: \'text-teal-400\',', 'icon: Wifi,\n      badge: null,\n      color: \'text-teal-400\',');

  fs.writeFileSync('src/components/Sidebar.tsx', code);
  console.log('patched Sidebar.tsx');
}
