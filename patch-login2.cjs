const fs = require('fs');
let code = fs.readFileSync('src/components/LoginView.tsx', 'utf8');

const replacement = `
      try {
        const cloudUsers = await fetchUsersFromCloud();
        
        targetUser = cloudUsers.find(
          (u) =>
            u.username.toLowerCase() === usernameInput.trim().toLowerCase() ||
            (u.phone && u.phone.trim() === usernameInput.trim())
        );
        
        if (!targetUser) {
           // We fetched successfully but didn't find them!
           setErrorMessage('تم الاتصال بالسحابة (يوجد ' + cloudUsers.length + ' مستخدم) لكن لم يتم العثور على: ' + usernameInput);
           setIsLoggingIn(false);
           return;
        }
      } catch (err: any) {
        console.warn('Fallback fetch failed:', err);
        setErrorMessage('تعذر الاتصال بالسحابة: ' + (err.message || ''));
        setIsLoggingIn(false);
        return;
      }
`;

code = code.replace(/      try \{\s*const cloudUsers = await fetchUsersFromCloud\(\);\s*\/\/ DEBUG: show alert with what we found\s*\/\/ alert\('Cloud users found: ' \+ cloudUsers\.length \+ '\\\\nNames: ' \+ cloudUsers\.map\(u => u\.username\)\.join\(', '\)\);\s*targetUser = cloudUsers\.find\([\s\S]*?\} catch \(err: any\) \{[\s\S]*?return;\s*\}/, replacement);
fs.writeFileSync('src/components/LoginView.tsx', code);
