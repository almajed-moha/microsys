const fs = require('fs');
let code = fs.readFileSync('src/components/MikrotikLiveView.tsx', 'utf8');

const renderBlock = `
      {/* SUB-VIEW: Daily Network Logs */}
      {activeSubTab === 'daily_logs' && (
        <DailyNetworkLogsView 
          currentDownloadBytes={totalDownloadBytes} 
          currentUploadBytes={totalUploadBytes} 
        />
      )}
`;

code = code.replace(
  /      \{\/\* SUB-VIEW 10: Settings \*\/\}/,
  renderBlock + "\n      {/* SUB-VIEW 10: Settings */}"
);

fs.writeFileSync('src/components/MikrotikLiveView.tsx', code);
