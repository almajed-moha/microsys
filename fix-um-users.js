const fs = require('fs');
let code = fs.readFileSync('server/mikrotikClient.ts', 'utf8');

// We need to find `getUserManagerUsers` and modify it.
// Replace:
// return list.filter(u => u && u.name).map(u => ({
// with:
// return list.filter(u => u && (u.name || u.username)).map(u => ({

code = code.replace(/return list\.filter\(u => u && u\.name\)\.map\(u => \(\{/g, "return list.filter(u => u && (u.name || u.username)).map(u => ({");

// Replace mapping inside the REST API logic:
// id: u['.id'] || u.id || u.name,
// name: u.name,
code = code.replace(/id: u\['\.id'\] \|\| u\.id \|\| u\.name,/g, "id: u['.id'] || u.id || u.name || u.username,");
code = code.replace(/name: u\.name,/g, "name: u.name || u.username,");

// Also for binary API logic:
code = code.replace(/return users\.map\(u => \(\{/g, "return users.filter(u => u && (u['name'] || u['username'])).map(u => ({");
code = code.replace(/id: u\['\.id'\] \|\| u\['name'\],/g, "id: u['.id'] || u['name'] || u['username'],");
code = code.replace(/name: u\['name'\],/g, "name: u['name'] || u['username'],");

fs.writeFileSync('server/mikrotikClient.ts', code);
console.log("Done patching name/username");
