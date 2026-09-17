const parseMikrotikUptimeToSeconds = (uptime) => {
  if (!uptime) return 0;
  let totalSec = 0;
  
  const matchW = uptime.match(/(\d+)w/);
  const matchD = uptime.match(/(\d+)d/);
  const matchH = uptime.match(/(\d+)h/);
  const matchM = uptime.match(/(\d+)m/);
  const matchS = uptime.match(/(\d+)s/);

  if (matchW) totalSec += parseInt(matchW[1]) * 7 * 24 * 3600;
  if (matchD) totalSec += parseInt(matchD[1]) * 24 * 3600;
  if (matchH) totalSec += parseInt(matchH[1]) * 3600;
  if (matchM) totalSec += parseInt(matchM[1]) * 60;
  if (matchS) totalSec += parseInt(matchS[1]);

  if (uptime.includes(':')) {
    const parts = uptime.split(/[wd ]/).filter(Boolean).pop()?.split(':') || [];
    if (parts.length === 3) {
      totalSec += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else if (parts.length === 2) {
       totalSec += parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
  }

  return totalSec;
};

console.log("1d:", parseMikrotikUptimeToSeconds("1d"));
console.log("1w3d01:02:03:", parseMikrotikUptimeToSeconds("1w3d01:02:03"));
console.log("23h 59m:", parseMikrotikUptimeToSeconds("23h 59m"));
