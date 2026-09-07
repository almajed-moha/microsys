import fs from 'fs';

let perms = fs.readFileSync('src/utils/permissions.ts', 'utf8');

// The regex replacement probably added it again. Let's just remove the exact string `viewSessions: true,\n        viewSessions: true,`
perms = perms.replace(/viewSessions:\s*(true|false),\s*viewSessions:\s*(true|false),/g, 'viewSessions: $1,');
perms = perms.replace(/viewSessions:\s*(true|false),\s*viewSessions:\s*(true|false),/g, 'viewSessions: $1,'); // Run again just in case

// Remove duplicate keys of viewSessions
perms = perms.replace(/viewSessions:\s*(true|false),\s*viewSessions:\s*(true|false),/g, 'viewSessions: $1,');

fs.writeFileSync('src/utils/permissions.ts', perms);
console.log('fixed permissions duplicates');

