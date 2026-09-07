import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(', CustomersView', 'CustomersView'); // fix the double comma or hanging comma issue
code = code.replace('  , CustomersView }', '  CustomersView\n}'); 

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed syntax in App.tsx');
