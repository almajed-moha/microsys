sed -i '/public static async updateUserManagerUser/i \
  // 16b. Assign/Add Profile to User Manager User\
  public static async assignProfileToUserManagerUser(options: MikroTikConnectionOptions, username: string, profileName: string): Promise<boolean> {\
    if (options.protocol === "demo" || options.host === "demo") return true;\
    const proto = options.protocol || "auto";\
    if (proto === "rest_http" || proto === "rest_https" || proto === "auto") {\
      try {\
        const isHttps = proto === "rest_https" || options.useSsl;\
        const port = options.port || (isHttps ? 443 : 80);\
        const restOpt = { ...options, protocol: (isHttps ? "rest_https" : "rest_http") as any, port };\
        try {\
          // Try v7\
          await fetchRestApi(restOpt, "/user-manager/user-profile", "PUT", { user: username, profile: profileName });\
          return true;\
        } catch (err: any) {\
          // Try v6\
          await fetchRestApi(restOpt, "/tool/user-manager/user/create-and-activate-profile", "POST", { user: username, profile: profileName, customer: "admin" });\
          return true;\
        }\
      } catch {}\
    }\
    // Fallback to RouterOS API\
    const client = await MikroTikAPI.connect(options.host, options.user, options.password, options.port, { useSsl: options.useSsl, timeout: 5000 });\
    try {\
      try {\
        await client.sendSentence(["/user-manager/user-profile/add", `=user=${username}`, `=profile=${profileName}`]);\
      } catch {\
        await client.sendSentence(["/tool/user-manager/user/create-and-activate-profile", `=user=${username}`, `=profile=${profileName}`, "=customer=admin"]);\
      }\
      return true;\
    } catch (e: any) {\
      throw new Error("تعذر إضافة البروفايل: " + e.message);\
    } finally {\
      client.close();\
    }\
  }\
' server/mikrotikClient.ts
