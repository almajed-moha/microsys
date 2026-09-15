import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Target exactly this leftover chunk
pattern = r"    const cleanSettings: NetworkSettings = \{\s*\.\.\.newSettings,\s*isLocked: true,\s*mikrotikIp: cleanHost,\s*mikrotikConfig: updatedMikrotikConfig,\s*\};\s*setSettings\(cleanSettings\);"
replacement = "    setSettings(cleanSettings);"

content = re.sub(pattern, replacement, content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
