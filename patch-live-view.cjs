const fs = require('fs');
let code = fs.readFileSync('src/components/MikrotikLiveView.tsx', 'utf8');

const hookCall = `
  // Auto-track network usage deltas and sync to Firebase
  useNetworkUsageTracker(activeUsers, isConnected);
`;

code = code.replace(
  /  const \[activeSubTab, setActiveSubTab\] = useState</,
  hookCall + "\n  const [activeSubTab, setActiveSubTab] = useState<"
);

fs.writeFileSync('src/components/MikrotikLiveView.tsx', code);
