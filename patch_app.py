import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """  const handleSaveSettings = (newSettings: NetworkSettings) => {
    const isNetworkAdmin =
      activeUser?.role === 'network_admin' ||
      activeUser?.role === 'system_owner' ||
      activeUser?.role === 'super_admin' ||
      hasPermission(activeUser, 'settings', 'editNetworkProfile', currentTenant);

    const prevSettings = settings;
    let cleanSettings: NetworkSettings;

    if (!isNetworkAdmin) {
      // Non-admins can only save non-network settings
      cleanSettings = {
        ...newSettings,
        isLocked: prevSettings.isLocked,
        mikrotikIp: prevSettings.mikrotikIp,
        mikrotikConfig: prevSettings.mikrotikConfig,
        networkName: prevSettings.networkName,
      };
    } else {
      const cleanHost = (newSettings.mikrotikConfig?.host || newSettings.mikrotikIp || '192.168.88.1').trim();
      const updatedMikrotikConfig = newSettings.mikrotikConfig
        ? {
            ...newSettings.mikrotikConfig,
            host: cleanHost,
            isLocked: true,
            remoteHost: newSettings.mikrotikConfig.remoteHost || (isPrivateIp(cleanHost) ? undefined : cleanHost),
          }
        : undefined;
      cleanSettings = {
        ...newSettings,
        isLocked: true,
        mikrotikIp: cleanHost,
        mikrotikConfig: updatedMikrotikConfig,
      };
    }

    const targetTenantId = activeUser?.role === 'system_owner'
      ? (selectedTenantFilter !== 'all' ? selectedTenantFilter : null)
      : (activeUser?.networkId && activeUser.networkId !== 'system' ? activeUser.networkId : null);"""

pattern = r"  const handleSaveSettings = \(newSettings: NetworkSettings\) => \{.*?const targetTenantId = activeUser\?\.role === 'system_owner'\n\s*\? \(selectedTenantFilter \!== 'all' \? selectedTenantFilter : null\)\n\s*: \(activeUser\?\.networkId && activeUser\.networkId \!== 'system' \? activeUser\.networkId : null\);"

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
