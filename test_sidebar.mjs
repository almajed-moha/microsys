import fs from 'fs';
const code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
if(code.includes('view="customers"')){
  console.log('found view="customers"');
} else {
  console.log('NOT FOUND');
}
