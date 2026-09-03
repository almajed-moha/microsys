import fs from 'fs';
let code = fs.readFileSync('src/components/LoginView.tsx', 'utf8');

const oldCode = `    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Find user by email, or fallback to super_admin
        let targetUser = users.find((u) => u.email === firebaseUser.email);
        
        if (!targetUser) {
          // Auto-login as super_admin for demo/development if no email matches
          targetUser = users.find((u) => u.role === 'super_admin') || users[0];
        }

        if (targetUser) {
          executeSuccess(targetUser);
        }
      }
    });`;

const newCode = `    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Find user by email
        let targetUser = users.find((u) => u.email && u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
        
        if (!targetUser) {
          // Sign out immediately so they aren't stuck logged into Firebase auth
          try {
            const { signOut } = await import('firebase/auth');
            await signOut(auth);
          } catch (e) {
            console.error('Failed to sign out unauthorized user', e);
          }
          setErrorMessage('البريد الإلكتروني غير مسجل لدينا. يرجى التواصل مع إدارة النظام.');
          setIsLoggingIn(false);
          return;
        }

        if (targetUser) {
          if (targetUser.status === 'inactive' || targetUser.status === 'suspended') {
             try {
               const { signOut } = await import('firebase/auth');
               await signOut(auth);
             } catch (e) {}
             setErrorMessage('حسابك موقوف حالياً. يرجى مراجعة إدارة النظام.');
             setIsLoggingIn(false);
             return;
          }
          executeSuccess(targetUser);
        }
      }
    });`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/LoginView.tsx', code);
console.log('done');
