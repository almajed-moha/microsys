const fs = require('fs');
let code = fs.readFileSync('server/mikrotikClient.ts', 'utf8');

code = code.replace(/    console\.log\('\[DEBUG\] Users fetched from', fetchSource, 'Count:', users\.length\);\n    if\(users\.length > 0\) console\.log\('\[DEBUG\] Sample user:', JSON\.stringify\(users\[0\]\)\);\n/g, '');

code = code.replace(/    let fetchSource = '';\n/g, '');
code = code.replace(/      fetchSource = 'v7';\n/g, '');
code = code.replace(/      fetchSource = 'v6';\n/g, '');

fs.writeFileSync('server/mikrotikClient.ts', code);
