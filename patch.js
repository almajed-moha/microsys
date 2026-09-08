const fs = require('fs');
const path = 'src/services/cloudSync.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  /console\.warn\('Failed to fetch users from cloud:', err\);\s*return \[\];/g,
  "console.error('Failed to fetch users from cloud:', err); throw err;"
);
fs.writeFileSync(path, code);
