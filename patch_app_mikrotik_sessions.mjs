import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { MikrotikSessionsView } from')) {
  // Add import
  code = code.replace(
    'MikrotikLiveView,',
    'MikrotikLiveView,\n  MikrotikSessionsView,'
  );
  
  // Add component rendering
  const renderBlock = `
              {activeView === 'mikrotik_sessions' && (
                <MikrotikSessionsView />
              )}
`;
  code = code.replace(
    '              {activeView === \'mikrotik\' && (',
    renderBlock + '\n              {activeView === \'mikrotik\' && ('
  );

  fs.writeFileSync('src/App.tsx', code);
  console.log('patched App.tsx');
} else {
  console.log('already patched');
}
