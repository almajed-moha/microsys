const fs = require('fs');
let code = fs.readFileSync('server/mikrotikClient.ts', 'utf8');

const newKick = `
  public static async kickHotspotUser(options: MikroTikConnectionOptions, userIdOrUser: string): Promise<boolean> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return true;
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        if (userIdOrUser.startsWith('*')) {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, \`/ip/hotspot/active/\${encodeURIComponent(userIdOrUser)}\`, 'DELETE');
        } else {
          // If it's a username, we first need to find its internal ID
          const users = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/ip/hotspot/active?user=' + encodeURIComponent(userIdOrUser), 'GET');
          if (Array.isArray(users) && users.length > 0 && users[0]['.id']) {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, \`/ip/hotspot/active/\${encodeURIComponent(users[0]['.id'])}\`, 'DELETE');
          } else {
             // Fallback to remove numbers
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, \`/ip/hotspot/active/remove\`, 'POST', { numbers: userIdOrUser });
          }
        }
        return true;
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 30000);
    await client.connect();
    await client.login(options.username, options.password || '');
    
    let targetId = userIdOrUser;
    if (!targetId.startsWith('*')) {
      const found = await client.sendSentence(['/ip/hotspot/active/print', \`?user=\${userIdOrUser}\`]);
      if (found && found.length > 0 && found[0]['.id']) {
        targetId = found[0]['.id'];
      }
    }
    
    await client.sendSentence(['/ip/hotspot/active/remove', \`=numbers=\${targetId}\`]);
    client.close();
    return true;
  }
`;

code = code.replace(
  /  public static async kickHotspotUser\([\s\S]*?\n    return true;\n  \}/,
  newKick.trim()
);

fs.writeFileSync('server/mikrotikClient.ts', code);
