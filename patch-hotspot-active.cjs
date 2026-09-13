const fs = require('fs');
let code = fs.readFileSync('server/mikrotikClient.ts', 'utf8');

code = code.replace(
  /return users\.filter\(u => u && \(u\['name'\] \|\| u\['username'\]\)\)\.map\(item => \(\{/g,
  "return users.filter(item => item && (item['user'] || item['address'])).map(item => ({"
);

fs.writeFileSync('server/mikrotikClient.ts', code);
