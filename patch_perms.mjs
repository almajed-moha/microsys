import fs from 'fs';

// 1. Patch src/types.ts
let types = fs.readFileSync('src/types.ts', 'utf8');
if (!types.includes('viewSessions: boolean;')) {
  types = types.replace(
    'viewLiveTraffic: boolean;',
    'viewLiveTraffic: boolean;\n  viewSessions: boolean;          // عرض إحصائيات المتصلين'
  );
  fs.writeFileSync('src/types.ts', types);
  console.log('patched types.ts');
}

// 2. Patch src/utils/permissions.ts
let perms = fs.readFileSync('src/utils/permissions.ts', 'utf8');

// replace editMikrotikConfig: true, with editMikrotikConfig: true, viewSessions: true, 
// for the true blocks
perms = perms.replaceAll(
  'viewLiveTraffic: true,',
  'viewLiveTraffic: true,\n      viewSessions: true,'
);
// for the false blocks
perms = perms.replaceAll(
  'viewLiveTraffic: false,',
  'viewLiveTraffic: false,\n      viewSessions: false,'
);

// We should also patch the spacing if needed, but replaceAll covers exact matches.
// Wait, the spacing might vary. Let's use regex.
perms = perms.replace(/viewLiveTraffic:\s*(true|false),/g, (match, val) => {
  return `viewLiveTraffic: ${val},\n          viewSessions: ${val},`;
});

fs.writeFileSync('src/utils/permissions.ts', perms);
console.log('patched permissions.ts');

