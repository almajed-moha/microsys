import fs from 'fs';
let code = fs.readFileSync('src/components/DatabaseBackupModal.tsx', 'utf8');

const oldStateStr = `  const [exportScope, setExportScope] = useState<'full' | 'current'>(
    activeUser?.role === 'system_owner' && selectedTenantFilter === 'all' ? 'full' : 'current'
  );`;

const newStateStr = `  const [selectedExportNetworkId, setSelectedExportNetworkId] = useState<string>('all');`;

if (code.includes(oldStateStr)) {
  code = code.replace(oldStateStr, newStateStr);
} else {
  console.error("String not found!");
}

// Remove the `setExportScope` leftover in the code if any
code = code.replace(/setExportScope\('full'\)/g, "setSelectedExportNetworkId('all')");
code = code.replace(/setExportScope\('current'\)/g, "setSelectedExportNetworkId(currentTenant?.id || '')");

fs.writeFileSync('src/components/DatabaseBackupModal.tsx', code);
console.log('done');
