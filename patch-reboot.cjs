const fs = require('fs');
let code = fs.readFileSync('server/mikrotikClient.ts', 'utf8');

const replacement = `
        if (command === 'reboot') {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/system/reboot', 'POST', {}).catch(err => console.log('Reboot REST drop:', err.message));
          return { success: true, message: 'تم إرسال أمر إعادة تشغيل الراوتر بنجاح.' };
        }
        if (command === 'shutdown') {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/system/shutdown', 'POST', {}).catch(err => console.log('Shutdown REST drop:', err.message));
          return { success: true, message: 'تم إرسال أمر إيقاف تشغيل الراوتر بنجاح.' };
        }
`;

code = code.replace(
  /        if \(command === 'reboot'\) \{\n          await fetchRestApi\(\{ \.\.\.options, protocol: isHttps \? 'rest_https' : 'rest_http', port \}, '\/system\/reboot', 'POST', \{\}\);\n          return \{ success: true, message: 'تم إرسال أمر إعادة تشغيل الراوتر بنجاح\.' \};\n        \}\n        if \(command === 'shutdown'\) \{\n          await fetchRestApi\(\{ \.\.\.options, protocol: isHttps \? 'rest_https' : 'rest_http', port \}, '\/system\/shutdown', 'POST', \{\}\);\n          return \{ success: true, message: 'تم إرسال أمر إيقاف تشغيل الراوتر بنجاح\.' \};\n        \}/,
  replacement.trim()
);

const binaryReplacement = `
      if (command === 'reboot') {
        client.sendSentence(['/system/reboot']).catch(err => console.log('Reboot Binary drop:', err.message));
        setTimeout(() => client.close(), 500); // Close immediately after sending
        return { success: true, message: 'تم إرسال أمر إعادة تشغيل الراوتر (Reboot) بنجاح.' };
      }
      if (command === 'shutdown') {
        client.sendSentence(['/system/shutdown']).catch(err => console.log('Shutdown Binary drop:', err.message));
        setTimeout(() => client.close(), 500);
        return { success: true, message: 'تم إرسال أمر إيقاف تشغيل الراوتر (Shutdown) بنجاح.' };
      }
`;

code = code.replace(
  /      if \(command === 'reboot'\) \{\n        await client\.sendSentence\(\['\/system\/reboot'\]\);\n        client\.close\(\);\n        return \{ success: true, message: 'تم إرسال أمر إعادة تشغيل الراوتر \(Reboot\) بنجاح\.' \};\n      \}\n      if \(command === 'shutdown'\) \{\n        await client\.sendSentence\(\['\/system\/shutdown'\]\);\n        client\.close\(\);\n        return \{ success: true, message: 'تم إرسال أمر إيقاف تشغيل الراوتر \(Shutdown\) بنجاح\.' \};\n      \}/,
  binaryReplacement.trim()
);

fs.writeFileSync('server/mikrotikClient.ts', code);
