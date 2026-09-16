import { HotspotConfiguredUser, UserManagerUser } from '../types';
import {
  getCumulativeSnapshot,
  saveCumulativeSnapshot,
  incrementDailyNetworkLog,
  CumulativeSnapshot
} from '../services/networkLogsService';
import { getLocalDateString } from '../utils/dateUtils';
import { fetchConfiguredHotspotUsers, fetchUserManagerUsers } from '../utils/mikrotikApi';

export const runCumulativeSync = async (config: any): Promise<{ success: boolean; message: string; downAdded: number; upAdded: number; totalAddedBytes: number }> => {
  if (!config || !config.host) return { success: false, message: 'عنوان الراوتر غير مهيأ', downAdded: 0, upAdded: 0, totalAddedBytes: 0 };

  const [hsUsers, umUsers] = await Promise.all([
    fetchConfiguredHotspotUsers(config).catch(() => [] as HotspotConfiguredUser[]),
    fetchUserManagerUsers(config).catch(() => [] as UserManagerUser[]),
  ]);

  if (hsUsers.length === 0 && umUsers.length === 0) {
    return { success: false, message: 'لا يوجد مستخدمين للمزامنة', downAdded: 0, upAdded: 0, totalAddedBytes: 0 };
  }

  const currentSnapshot: CumulativeSnapshot = {
    lastUpdated: new Date().toISOString(),
    users: {}
  };

  hsUsers.forEach(u => {
    currentSnapshot.users[`hs_${u.name || u.id}`] = {
      bytesIn: Number(u.bytesIn || 0),
      bytesOut: Number(u.bytesOut || 0)
    };
  });

  umUsers.forEach(u => {
    currentSnapshot.users[`um_${u.name || u.id}`] = {
      bytesIn: Number(u.uploadUsed || 0), // UM upload is router upload
      bytesOut: Number(u.downloadUsed || 0) // UM download is router download
    };
  });

  const prevSnapshot = await getCumulativeSnapshot();
  
  let totalDownDelta = 0;
  let totalUpDelta = 0;

  if (prevSnapshot) {
    Object.keys(currentSnapshot.users).forEach(key => {
      const current = currentSnapshot.users[key];
      const prev = prevSnapshot.users[key];
      
      if (prev) {
        let dDown = current.bytesOut - prev.bytesOut;
        let dUp = current.bytesIn - prev.bytesIn;
        
        // If counter reset
        if (dDown < 0 || dUp < 0) {
          dDown = current.bytesOut;
          dUp = current.bytesIn;
        }
        
        totalDownDelta += dDown;
        totalUpDelta += dUp;
      } else {
        // New user
        totalDownDelta += current.bytesOut;
        totalUpDelta += current.bytesIn;
      }
    });
  }

  // Save the new snapshot
  await saveCumulativeSnapshot(currentSnapshot);

  // If we have deltas, add them to TODAY'S log
  if (totalDownDelta > 0 || totalUpDelta > 0) {
    const today = getLocalDateString();
    await incrementDailyNetworkLog(today, totalDownDelta, totalUpDelta, {
      routerIdentity: config.host
    });
  }

  return {
    success: true,
    message: 'تم تحديث سجل الاستهلاك الشامل بنجاح',
    downAdded: totalDownDelta,
    upAdded: totalUpDelta,
    totalAddedBytes: totalDownDelta + totalUpDelta
  };
};
