import {
  RouterSystemInfo,
  HotspotActiveUser,
  HotspotHost,
  RouterInterface,
  DhcpLease,
  MikroTikConfig,
  HotspotUserProfile,
  HotspotConfiguredUser,
  UserManagerUser,
  UserManagerProfile,
  UserManagerLimitation,
  UserManagerRouter,
} from '../types';
import {
  fetchRouterSystemInfo,
  fetchActiveHotspotUsers,
  fetchConfiguredHotspotUsers,
  fetchHotspotUserProfiles,
  fetchConnectedHosts,
  fetchRouterInterfaces,
  fetchUserManagerUsers,
  fetchUserManagerProfiles,
  fetchUserManagerLimitations,
  fetchUserManagerRouters,
} from './mikrotikApi';

export interface MikrotikDataStoreState {
  systemInfo: RouterSystemInfo | null;
  activeUsers: HotspotActiveUser[];
  configuredUsers: HotspotConfiguredUser[];
  userProfiles: HotspotUserProfile[];
  hosts: HotspotHost[];
  dhcpLeases: DhcpLease[];
  interfaces: RouterInterface[];
  trafficHistory: { time: string; rxMbps: number; txMbps: number }[];
  umUsers: UserManagerUser[];
  umProfiles: UserManagerProfile[];
  umLimitations: UserManagerLimitation[];
  umRouters: UserManagerRouter[];
  lastUpdated: string | null;
  isPreloaded: boolean;
  isPreloading: boolean;
  isConnected: boolean;
  error?: string | null;
}

const STORAGE_CACHE_KEY = 'mikrotik_preloaded_data_cache_v1';

// Initial state builder with fallback to fast local session cache
function getInitialStoreState(): MikrotikDataStoreState {
  try {
    const raw = sessionStorage.getItem(STORAGE_CACHE_KEY) || localStorage.getItem(STORAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          systemInfo: parsed.systemInfo || null,
          activeUsers: Array.isArray(parsed.activeUsers) ? parsed.activeUsers : [],
          configuredUsers: Array.isArray(parsed.configuredUsers) ? parsed.configuredUsers : [],
          userProfiles: Array.isArray(parsed.userProfiles) ? parsed.userProfiles : [],
          hosts: Array.isArray(parsed.hosts) ? parsed.hosts : [],
          dhcpLeases: Array.isArray(parsed.dhcpLeases) ? parsed.dhcpLeases : [],
          interfaces: Array.isArray(parsed.interfaces) ? parsed.interfaces : [],
          trafficHistory: Array.isArray(parsed.trafficHistory) ? parsed.trafficHistory : [],
          umUsers: Array.isArray(parsed.umUsers) ? parsed.umUsers : [],
          umProfiles: Array.isArray(parsed.umProfiles) ? parsed.umProfiles : [],
          umLimitations: Array.isArray(parsed.umLimitations) ? parsed.umLimitations : [],
          umRouters: Array.isArray(parsed.umRouters) ? parsed.umRouters : [],
          lastUpdated: parsed.lastUpdated || null,
          isPreloaded: Boolean(parsed.isPreloaded),
          isPreloading: false,
          isConnected: Boolean(parsed.isConnected),
          error: null,
        };
      }
    }
  } catch {}

  return {
    systemInfo: null,
    activeUsers: [],
    configuredUsers: [],
    userProfiles: [],
    hosts: [],
    dhcpLeases: [],
    interfaces: [],
    trafficHistory: [],
    umUsers: [],
    umProfiles: [],
    umLimitations: [],
    umRouters: [],
    lastUpdated: null,
    isPreloaded: false,
    isPreloading: false,
    isConnected: false,
    error: null,
  };
}

let storeState: MikrotikDataStoreState = getInitialStoreState();
const listeners = new Set<(state: MikrotikDataStoreState) => void>();

function persistCacheDebounced(state: MikrotikDataStoreState) {
  try {
    const payload = JSON.stringify({
      systemInfo: state.systemInfo,
      activeUsers: state.activeUsers,
      configuredUsers: state.configuredUsers,
      userProfiles: state.userProfiles,
      hosts: state.hosts,
      dhcpLeases: state.dhcpLeases,
      interfaces: state.interfaces,
      trafficHistory: state.trafficHistory.slice(-20),
      umUsers: state.umUsers,
      umProfiles: state.umProfiles,
      umLimitations: state.umLimitations,
      umRouters: state.umRouters,
      lastUpdated: state.lastUpdated,
      isPreloaded: state.isPreloaded,
      isConnected: state.isConnected,
    });
    sessionStorage.setItem(STORAGE_CACHE_KEY, payload);
    localStorage.setItem(STORAGE_CACHE_KEY, payload);
  } catch {}
}

export function getMikrotikDataStore(): MikrotikDataStoreState {
  return storeState;
}

export function subscribeToMikrotikDataStore(listener: (state: MikrotikDataStoreState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateMikrotikDataStore(partial: Partial<MikrotikDataStoreState>) {
  storeState = {
    ...storeState,
    ...partial,
  };
  persistCacheDebounced(storeState);
  listeners.forEach((listener) => {
    try {
      listener(storeState);
    } catch (err) {
      console.warn('Listener error in updateMikrotikDataStore:', err);
    }
  });
}

let activePreloadPromise: Promise<MikrotikDataStoreState> | null = null;

/**
 * Pre-fetch and cache all MikroTik Hotspot, Interface, System, and User Manager data
 * in the background so that upon navigating to the MikroTik view, everything is already loaded
 * and ready for instant viewing!
 */
export async function preloadMikrotikData(
  config: Partial<MikroTikConfig>,
  force = false
): Promise<MikrotikDataStoreState> {
  if (!config || !config.host) {
    return storeState;
  }

  if (activePreloadPromise && !force) {
    return activePreloadPromise;
  }

  updateMikrotikDataStore({ isPreloading: true, error: null });

  activePreloadPromise = (async () => {
    try {
      // Fetch all router endpoints concurrently in the background
      const [
        sysRes,
        actRes,
        confRes,
        profRes,
        hostsRes,
        ifacesRes,
        umUsersRes,
        umProfRes,
        umLimRes,
        umRoutersRes,
      ] = await Promise.allSettled([
        fetchRouterSystemInfo(config),
        fetchActiveHotspotUsers(config),
        fetchConfiguredHotspotUsers(config),
        fetchHotspotUserProfiles(config),
        fetchConnectedHosts(config),
        fetchRouterInterfaces(config),
        fetchUserManagerUsers(config),
        fetchUserManagerProfiles(config),
        fetchUserManagerLimitations(config),
        fetchUserManagerRouters(config),
      ]);

      const systemInfo = sysRes.status === 'fulfilled' && sysRes.value ? sysRes.value : storeState.systemInfo;
      const activeUsers = actRes.status === 'fulfilled' && Array.isArray(actRes.value) ? actRes.value : storeState.activeUsers;
      const configuredUsers = confRes.status === 'fulfilled' && Array.isArray(confRes.value) ? confRes.value : storeState.configuredUsers;
      const userProfiles = profRes.status === 'fulfilled' && Array.isArray(profRes.value) ? profRes.value : storeState.userProfiles;
      
      const hostsData = hostsRes.status === 'fulfilled' && hostsRes.value ? hostsRes.value : null;
      const hosts = hostsData?.hosts ? hostsData.hosts : storeState.hosts;
      const dhcpLeases = hostsData?.leases ? hostsData.leases : storeState.dhcpLeases;

      const interfaces = ifacesRes.status === 'fulfilled' && Array.isArray(ifacesRes.value) && ifacesRes.value.length > 0
        ? ifacesRes.value
        : storeState.interfaces;

      const umUsers = umUsersRes.status === 'fulfilled' && Array.isArray(umUsersRes.value) ? umUsersRes.value : storeState.umUsers;
      const umProfiles = umProfRes.status === 'fulfilled' && Array.isArray(umProfRes.value) ? umProfRes.value : storeState.umProfiles;
      const umLimitations = umLimRes.status === 'fulfilled' && Array.isArray(umLimRes.value) ? umLimRes.value : storeState.umLimitations;
      const umRouters = umRoutersRes.status === 'fulfilled' && Array.isArray(umRoutersRes.value) ? umRoutersRes.value : storeState.umRouters;

      // Compute initial traffic snapshot if interfaces exist
      let trafficHistory = storeState.trafficHistory;
      if (interfaces && interfaces.length > 0) {
        const totalRxBits = interfaces.reduce((acc, i) => acc + (i.rxRateBps || 0), 0);
        const totalTxBits = interfaces.reduce((acc, i) => acc + (i.txRateBps || 0), 0);
        const rxMbps = parseFloat((totalRxBits / 1000000).toFixed(2));
        const txMbps = parseFloat((totalTxBits / 1000000).toFixed(2));

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        trafficHistory = [...trafficHistory, { time: timeStr, rxMbps, txMbps }].slice(-20);
      }

      const nowTimeStr = new Date().toLocaleTimeString('ar-YE');

      updateMikrotikDataStore({
        systemInfo,
        activeUsers,
        configuredUsers,
        userProfiles,
        hosts,
        dhcpLeases,
        interfaces,
        trafficHistory,
        umUsers,
        umProfiles,
        umLimitations,
        umRouters,
        lastUpdated: nowTimeStr,
        isPreloaded: true,
        isPreloading: false,
        isConnected: Boolean(systemInfo || activeUsers.length > 0 || interfaces.length > 0 || umUsers.length > 0),
        error: null,
      });

      return storeState;
    } catch (err: any) {
      console.warn('Background MikroTik data preload completed with notice:', err);
      updateMikrotikDataStore({
        isPreloading: false,
        error: err?.message || 'تعذر تحميل البيانات بالكامل',
      });
      return storeState;
    } finally {
      activePreloadPromise = null;
    }
  })();

  return activePreloadPromise;
}
