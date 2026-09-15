import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the specific lines inside targetTenantId block
pattern = r"                mikrotikConfig: updatedMikrotikConfig,\n                mikrotikIp: cleanHost,"
replacement = r"                mikrotikConfig: cleanSettings.mikrotikConfig,\n                mikrotikIp: cleanSettings.mikrotikIp,"

content = re.sub(pattern, replacement, content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
