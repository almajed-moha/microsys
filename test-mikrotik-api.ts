import { MikroTikClient } from './server/mikrotikClient';

async function test() {
  const options: any = {
    host: 'demo', // this will hit the demo fallback
    port: 8728,
    protocol: 'auto',
    username: 'admin',
    password: '',
    useSsl: false
  };
  
  const files = await MikroTikClient.getFiles(options);
  console.log("Files:", files.slice(0, 3));
  
  const content = await MikroTikClient.getFileContent(options, 'hotspot/login.html');
  console.log("Content size:", content.size);
}
test();
