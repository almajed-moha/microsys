import fs from 'fs';
let code = fs.readFileSync('src/components/LoginView.tsx', 'utf8');

code = code.replace(
  "import { onAuthStateChanged } from 'firebase/auth';",
  "import { onAuthStateChanged, signOut } from 'firebase/auth';"
);

code = code.replace(/const { signOut } = await import\('firebase\/auth'\);/g, "");

fs.writeFileSync('src/components/LoginView.tsx', code);
console.log('done');
