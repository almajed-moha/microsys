import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { CustomersView }')) {
  // Try to find an existing import from './components' to append to
  code = code.replace(
    /import\s+\{([^}]+)\}\s+from\s+'\.\/components';/s,
    (match, p1) => {
      if (!p1.includes('CustomersView')) {
        return `import {${p1}, CustomersView } from './components';`;
      }
      return match;
    }
  );
  fs.writeFileSync('src/App.tsx', code);
  console.log('Fixed imports in App.tsx');
} else {
  console.log('Import already exists');
}
