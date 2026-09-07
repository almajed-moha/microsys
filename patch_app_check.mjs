import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
if (code.includes('activeView === \'customers\'')) {
  console.log('App.tsx has customers view active state rendering');
}
