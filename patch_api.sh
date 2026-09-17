sed -i '/export async function updateUserManagerUser/i \
export async function assignProfileToUserManagerUser(config: Partial<MikroTikConfig>, username: string, profileName: string): Promise<boolean> {\
  try {\
    const res = await fetch("/api/mikrotik/um/assign-profile", {\
      method: "POST",\
      headers: { "Content-Type": "application/json" },\
      body: JSON.stringify({ options: config, username, profileName }),\
    });\
    const data = await res.json();\
    return data.success;\
  } catch (error) {\
    console.warn("assignProfileToUserManagerUser error:", error);\
    return false;\
  }\
}\
\
' src/utils/mikrotikApi.ts
