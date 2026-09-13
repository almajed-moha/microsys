const fs = require('fs');
let code = fs.readFileSync('server/mikrotikClient.ts', 'utf8');

// For REST API mapping in getUserManagerUsers
code = code.replace(
  /return list\.filter\(u => u && \(u\.name \|\| u\.username\)\)\.map\(u => \(\{/g,
  "return list.filter(u => u).map(u => ({"
);
// For binary API mapping in getUserManagerUsers
code = code.replace(
  /return users\.filter\(u => u && \(u\['name'\] \|\| u\['username'\]\)\)\.map\(u => \(\{/g,
  "return users.filter(u => u).map(u => ({"
);

fs.writeFileSync('server/mikrotikClient.ts', code);
