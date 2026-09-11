import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { MikroTikService, isPrivateIp } from "./server/mikrotikClient";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// =========================================================================
// MIKROTIK REAL LIVE INTEGRATION ENDPOINTS (ROS v6 & v7 COMPATIBLE)
// =========================================================================

// 1. Test Router Connection & Smart Diagnostics
app.post("/api/mikrotik/test-connection", async (req, res) => {
  try {
    const { host, port, protocol, username, password, useSsl, timeoutMs } = req.body;
    if (!host) {
      return res.status(400).json({ success: false, error: "يرجى كتابة عنوان IP أو نطاق المايكروتك" });
    }

    const result = await MikroTikService.testConnection({
      host,
      port: port ? Number(port) : undefined,
      protocol: protocol || 'auto',
      username: username || 'admin',
      password: password || '',
      useSsl: Boolean(useSsl),
      timeoutMs: timeoutMs ? Number(timeoutMs) : 6000,
    });

    res.json(result);
  } catch (error: any) {
    console.warn(`[MikroTik] Test Connection notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "فشل اختبار الاتصال بالمايكروتك",
      diagnostics: error.message,
      isPrivateIp: isPrivateIp(req.body?.host),
    });
  }
});

// 2. Fetch System Resource, CPU, Memory, Uptime
app.post("/api/mikrotik/system-info", async (req, res) => {
  try {
    const options = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان IP غير محدد" });
    }

    const info = await MikroTikService.getSystemInfo(options);
    res.json({ success: true, data: info });
  } catch (error: any) {
    console.warn(`[MikroTik] System Info notice (${req.body?.host}): ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر قراءة بيانات النظام من الراوتر",
      isPrivateIp: isPrivateIp(req.body?.host),
    });
  }
});

// 3. Fetch Active Hotspot Users & Bandwidth Consumption
app.post("/api/mikrotik/active-users", async (req, res) => {
  try {
    const options = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان IP غير محدد" });
    }

    const users = await MikroTikService.getActiveHotspotUsers(options);
    res.json({ success: true, count: users.length, data: users });
  } catch (error: any) {
    console.warn(`[MikroTik] Active Users notice (${req.body?.host}): ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب قائمة المستخدمين المتصلين بالهوتسبوت",
      isPrivateIp: isPrivateIp(req.body?.host),
    });
  }
});

// 3b. Fetch Comprehensive Mikrotik Sessions & Real Callers Statistics
app.post("/api/mikrotik/sessions", async (req, res) => {
  try {
    const options = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان IP غير محدد" });
    }

    const sessionsData = await MikroTikService.getRouterSessions(options);
    res.json({
      success: true,
      data: sessionsData.sessions,
      activeCount: sessionsData.activeCount,
      totalCount: sessionsData.sessions.length,
      summary: sessionsData.summary,
      routerIdentity: sessionsData.routerIdentity,
    });
  } catch (error: any) {
    console.warn(`[MikroTik] Sessions notice (${req.body?.host}): ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب إحصائيات المتصلين وجلسات الراوتر",
      isPrivateIp: isPrivateIp(req.body?.host),
      data: [],
    });
  }
});

// 4. Fetch All Connected Physical Hosts & DHCP Leases
app.post("/api/mikrotik/connected-hosts", async (req, res) => {
  try {
    const options = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان IP غير محدد" });
    }

    const hostsData = await MikroTikService.getConnectedHosts(options);
    res.json({ success: true, data: hostsData });
  } catch (error: any) {
    console.warn(`[MikroTik] Connected Hosts notice (${req.body?.host}): ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب قائمة الأجهزة المتصلة بالشبكة",
      isPrivateIp: isPrivateIp(req.body?.host),
    });
  }
});

// 5. Fetch Network Interfaces & Live Traffic
app.post("/api/mikrotik/interfaces", async (req, res) => {
  try {
    const options = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان IP غير محدد" });
    }

    const interfaces = await MikroTikService.getInterfacesTraffic(options);
    res.json({ success: true, data: interfaces });
  } catch (error: any) {
    console.warn(`[MikroTik] Interfaces notice (${req.body?.host}): ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب واجهات الشبكة وحركة المرور",
      isPrivateIp: isPrivateIp(req.body?.host),
    });
  }
});

// 6. Kick / Disconnect Hotspot User
app.post("/api/mikrotik/kick-user", async (req, res) => {
  try {
    const { options, userId } = req.body;
    if (!options?.host || !userId) {
      return res.status(400).json({ success: false, error: "بيانات الاتصال ومعرف المستخدم مطلوبة" });
    }

    await MikroTikService.kickHotspotUser(options, userId);
    res.json({ success: true, message: "تم فصل المستخدم بنجاح من راوتر مايكروتك" });
  } catch (error: any) {
    console.warn(`[MikroTik] Kick User notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر فصل المستخدم من الراوتر",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 7. Bulk Create Hotspot Users on Router
app.post("/api/mikrotik/create-users", async (req, res) => {
  try {
    const { options, users } = req.body;
    if (!options?.host || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, error: "بيانات الراوتر وقائمة الكروت مطلوبة" });
    }

    const result = await MikroTikService.createHotspotUsers(options, users);
    res.json(result);
  } catch (error: any) {
    console.warn(`[MikroTik] Create Users notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر إنشاء الكروت في راوتر مايكروتك",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 8. Fetch All Configured Hotspot Users
app.post("/api/mikrotik/configured-users", async (req, res) => {
  try {
    const options = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان IP غير محدد" });
    }

    const users = await MikroTikService.getConfiguredHotspotUsers(options);
    res.json({ success: true, count: users.length, data: users });
  } catch (error: any) {
    console.warn(`[MikroTik] Configured Users notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب قائمة المستخدمين المسجلين في المايكروتك",
      isPrivateIp: isPrivateIp(req.body?.host),
    });
  }
});

// 9. Fetch Hotspot User Profiles
app.post("/api/mikrotik/user-profiles", async (req, res) => {
  try {
    const options = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان IP غير محدد" });
    }

    const profiles = await MikroTikService.getHotspotUserProfiles(options);
    res.json({ success: true, count: profiles.length, data: profiles });
  } catch (error: any) {
    console.warn(`[MikroTik] Profiles notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب بروفايلات المستخدمين من المايكروتك",
      isPrivateIp: isPrivateIp(req.body?.host),
    });
  }
});

// 10. Delete Configured Hotspot User
app.post("/api/mikrotik/delete-user", async (req, res) => {
  try {
    const { options, userId } = req.body;
    if (!options?.host || !userId) {
      return res.status(400).json({ success: false, error: "بيانات الراوتر ومعرف الكارت مطلوبة" });
    }

    const ok = await MikroTikService.deleteHotspotUser(options, userId);
    res.json({ success: ok, message: "تم حذف الكارت من المايكروتك بنجاح" });
  } catch (error: any) {
    console.warn(`[MikroTik] Delete User notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر حذف الكارت من الراوتر",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 10b. Delete Multiple Hotspot Users (Bulk)
app.post("/api/mikrotik/delete-users-bulk", async (req, res) => {
  try {
    const { options, userIds } = req.body;
    if (!options?.host || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: "بيانات الراوتر وقائمة الكروت مطلوبة" });
    }

    const result = await MikroTikService.deleteHotspotUsersBulk(options, userIds);
    res.json({
      success: result.success,
      deletedCount: result.deletedCount,
      message: `تم حذف ${result.deletedCount} كارت بنجاح من المايكروتك`,
      errors: result.errors,
    });
  } catch (error: any) {
    console.warn(`[MikroTik] Bulk Delete notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر حذف الكروت من الراوتر",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 11. Save / Update Hotspot User Profile
app.post("/api/mikrotik/save-profile", async (req, res) => {
  try {
    const { options, profile } = req.body;
    if (!options?.host || !profile?.name) {
      return res.status(400).json({ success: false, error: "بيانات الراوتر واسم البروفايل مطلوبة" });
    }

    const result = await MikroTikService.saveHotspotUserProfile(options, profile);
    res.json(result);
  } catch (error: any) {
    console.warn(`[MikroTik] Save Profile notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر حفظ بروفايل السرعة في الراوتر",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 12. Remote System Control (Reboot, Shutdown, Ping)
app.post("/api/mikrotik/system-command", async (req, res) => {
  try {
    const { options, command, extraParams } = req.body;
    if (!options?.host || !command) {
      return res.status(400).json({ success: false, error: "بيانات الراوتر والأمر مطلوبة" });
    }

    const result = await MikroTikService.executeSystemCommand(options, command, extraParams);
    res.json(result);
  } catch (error: any) {
    console.warn(`[MikroTik] System Command notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر تنفيذ الأمر على الراوتر",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// ==========================================
// USER MANAGER (اليوزر مانجر) API ENDPOINTS
// ==========================================

// 13. Get UM Users
app.post("/api/mikrotik/um/users", async (req, res) => {
  try {
    const { options } = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "بيانات الاتصال بالراوتر مطلوبة" });
    }
    const users = await MikroTikService.getUserManagerUsers(options);
    res.json({ success: true, data: users });
  } catch (error: any) {
    console.warn(`[MikroTik] UM Users notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب مستخدمي User Manager",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 14. Get UM Profiles
app.post("/api/mikrotik/um/profiles", async (req, res) => {
  try {
    const { options } = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "بيانات الاتصال بالراوتر مطلوبة" });
    }
    const profiles = await MikroTikService.getUserManagerProfiles(options);
    res.json({ success: true, data: profiles });
  } catch (error: any) {
    console.warn(`[MikroTik] UM Profiles notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب بروفايلات User Manager",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 15. Get UM Limitations
app.post("/api/mikrotik/um/limitations", async (req, res) => {
  try {
    const { options } = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "بيانات الاتصال بالراوتر مطلوبة" });
    }
    const lims = await MikroTikService.getUserManagerLimitations(options);
    res.json({ success: true, data: lims });
  } catch (error: any) {
    console.warn(`[MikroTik] UM Limitations notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب قيود User Manager",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 16. Get UM Routers
app.post("/api/mikrotik/um/routers", async (req, res) => {
  try {
    const { options } = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "بيانات الاتصال بالراوتر مطلوبة" });
    }
    const routers = await MikroTikService.getUserManagerRouters(options);
    res.json({ success: true, data: routers });
  } catch (error: any) {
    console.warn(`[MikroTik] UM Routers notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب أجهزة راوتر User Manager",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 17. Batch Create Cards into User Manager
app.post("/api/mikrotik/um/batch-create", async (req, res) => {
  try {
    const { options, cards } = req.body;
    if (!options?.host || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ success: false, error: "بيانات الكروت والاتصال مطلوبة" });
    }
    const result = await MikroTikService.createUserManagerUsersBatch(options, cards);
    res.json(result);
  } catch (error: any) {
    console.warn(`[MikroTik] UM Batch Create notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر إنشاء كروت User Manager",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 18. Save UM Profile & Limitation
app.post("/api/mikrotik/um/save-profile", async (req, res) => {
  try {
    const { options, profileData } = req.body;
    if (!options?.host || !profileData?.profileName) {
      return res.status(400).json({ success: false, error: "اسم البروفايل وبيانات الراوتر مطلوبة" });
    }
    const result = await MikroTikService.saveUserManagerProfile(options, profileData);
    res.json(result);
  } catch (error: any) {
    console.warn(`[MikroTik] UM Save Profile notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر حفظ بروفايل User Manager في الراوتر",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// Delete UM Profile
app.post("/api/mikrotik/um/delete-profile", async (req, res) => {
  try {
    const { options, profileId, profileName } = req.body;
    if (!options?.host || (!profileId && !profileName)) {
      return res.status(400).json({ success: false, error: "معرّف البروفايل والاتصال مطلوبان" });
    }
    const ok = await MikroTikService.deleteUserManagerProfile(options, profileId || profileName);
    res.json({ success: ok });
  } catch (error: any) {
    res.json({ success: false, error: error.message || "تعذر حذف البروفايل من User Manager" });
  }
});

// 19. Delete UM User
app.post("/api/mikrotik/um/delete-user", async (req, res) => {
  try {
    const { options, userId } = req.body;
    if (!options?.host || !userId) {
      return res.status(400).json({ success: false, error: "معرّف الكارت والاتصال مطلوبان" });
    }
    const ok = await MikroTikService.deleteUserManagerUser(options, userId);
    res.json({ success: ok });
  } catch (error: any) {
    res.json({ success: false, error: error.message || "تعذر حذف الكارت من User Manager" });
  }
});

// 20. Reset UM User Counters
app.post("/api/mikrotik/um/reset-user", async (req, res) => {
  try {
    const { options, userId } = req.body;
    if (!options?.host || !userId) {
      return res.status(400).json({ success: false, error: "معرّف الكارت والاتصال مطلوبان" });
    }
    const ok = await MikroTikService.resetUserManagerUserCounters(options, userId);
    res.json({ success: ok });
  } catch (error: any) {
    res.json({ success: false, error: error.message || "تعذر تصفير عدادات الكارت" });
  }
});

// 20b. Update UM User (Edit Card & Change Profile)
app.post("/api/mikrotik/um/update-user", async (req, res) => {
  try {
    const { options, userData } = req.body;
    if (!options?.host || !userData?.name) {
      return res.status(400).json({ success: false, error: "بيانات الكارت والاتصال مطلوبان" });
    }
    const result = await MikroTikService.updateUserManagerUser(options, userData);
    res.json(result);
  } catch (error: any) {
    res.json({ success: false, error: error.message || "تعذر تعديل الكارت في User Manager" });
  }
});

// 20c. Get User Manager Sessions (Per User or All)
app.post("/api/mikrotik/um/sessions", async (req, res) => {
  try {
    const { options, userName } = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان الراوتر غير محدد" });
    }
    const sessions = await MikroTikService.getUserManagerSessions(options, userName);
    res.json({ success: true, data: sessions });
  } catch (error: any) {
    res.json({ success: false, error: error.message || "تعذر جلب جلسات User Manager" });
  }
});

// 20d. Get User Manager Daily Usage Report (Reconciliation with WAN)
app.post("/api/mikrotik/um/daily-report", async (req, res) => {
  try {
    const { options, date } = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان الراوتر غير محدد" });
    }
    const report = await MikroTikService.getUserManagerDailyReport(options, date);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.json({ success: false, error: error.message || "تعذر إعداد تقرير السحب اليومي من User Manager" });
  }
});

// 21. Get Hotspot Servers Status
app.post("/api/mikrotik/hotspot-servers", async (req, res) => {
  try {
    const { options } = req.body;
    if (!options?.host) {
      return res.status(400).json({ success: false, error: "عنوان الراوتر غير محدد" });
    }
    const servers = await MikroTikService.getHotspotServers(options);
    res.json({ success: true, data: servers });
  } catch (error: any) {
    console.warn(`[MikroTik] Hotspot Servers notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر جلب سيرفرات الهوتسبوت من الراوتر",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// 22. Set Maintenance State & Programmatic Network Control
app.post("/api/mikrotik/maintenance-state", async (req, res) => {
  try {
    const { options, networkStatus, kickActiveUsers, maintenanceMessage, maintenanceTitle } = req.body;
    if (!options?.host || !networkStatus) {
      return res.status(400).json({ success: false, error: "بيانات الراوتر وحالة الشبكة مطلوبة" });
    }
    const result = await MikroTikService.setHotspotMaintenanceAndNetworkState(options, {
      networkStatus,
      kickActiveUsers: Boolean(kickActiveUsers),
      maintenanceMessage,
      maintenanceTitle,
    });
    res.json(result);
  } catch (error: any) {
    console.warn(`[MikroTik] Maintenance State notice: ${error.message}`);
    res.json({
      success: false,
      error: error.message || "تعذر تطبيق حالة الصيانة على الراوتر",
      isPrivateIp: isPrivateIp(req.body?.options?.host),
    });
  }
});

// AI Sales & POS Analytics endpoint
app.post("/api/ai/analyze-sales", async (req, res) => {
  try {
    const { sales, posPoints, categories, dispatches, payments, timeRange } = req.body;

    const prompt = `
أنت خبير استشاري ومحلل بيانات متخصص في إدارة وتنمية شبكات المايكروتك (MikroTik ISP & Hotspot Business Specialist).
قم بتحليل بيانات مبيعات كروت الشبكة ونقاط التوزيع التالية وقدم تقريراً استراتيجياً باللغة العربية:

بيانات الفئات:
${JSON.stringify(categories, null, 2)}

بيانات نقاط البيع والموزعين (مع المديونيات):
${JSON.stringify(posPoints, null, 2)}

سجل المبيعات الأخيرة:
${JSON.stringify(sales?.slice(0, 25), null, 2)}

الدفعات المسددة مؤخراً:
${JSON.stringify(payments?.slice(0, 15), null, 2)}

الفترة الزمنية المحددة: ${timeRange || 'كل الفترات'}

المطلوب إعطاء تحليل تنفيذي شامل ومرتب يشمل:
1. **ملخص الأداء المالي والعام**: تقييم إجمالي الإيرادات، هامش الربح، ومعدل دوران الكروت.
2. **أداء نقاط البيع والموزعين**: تحديد أفضل نقاط البيع أداءً، والنقاط التي تعاني من بطء في التصريف، وتقييم مخاطر المديونيات وسقوف الائتمان.
3. **تحليل فئات الكروت**: ما هي الفئات الأكثر ربحية والأكثر طلباً، وهل هناك فئات راكدة تحتاج لإعادة تسعير أو ترويج؟
4. **توصيات وإجراءات فورية مقترحة**: 3-4 خطوات عملية لزيادة المبيعات، تحصيل الديون، وتقليل الهدر في المخزون.
5. **توقع الطلب للفترة القادمة**: نصائح حول الكميات الواجب توليدها وتجهيزها مسبقاً لكل نقطة بيع.

اجعل التقرير عملياً، مشجعاً، ومنظماً بنقاط واضحة وتنسيق Markdown احترافي مع عناوين بارزة.
`;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        temperature: 0.6,
      },
    });

    res.json({
      success: true,
      analysis: response.text,
    });
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "فشل تحليل البيانات عبر الذكاء الاصطناعي",
    });
  }
});

// AI Bundles & Strategic Offers Suggestion endpoint
app.post("/api/ai/suggest-bundles", async (req, res) => {
  try {
    const { categories, currentIssues, networkGoal } = req.body;

    const prompt = `
أنت مهندس شبكات ومستشار تسويق لشبكات الإنترنت اللاسلكي Hotspot (MikroTik).
بناءً على الفئات الحالية:
${JSON.stringify(categories, null, 2)}

الهدف أو التحدي المذكور: ${networkGoal || 'زيادة الأرباح اليومية وجذب مستخدمين جدد'}

اقترح 3-4 باقات أو عروض كروت مايكروتك جديدة ومبتكرة (Creative Hotspot Card Bundles) مثل:
- باقات أوقات الذروة أو باقات السهرة (Night Owl)
- باقات الطلاب وعطلة نهاية الأسبوع
- باقات الألعاب بدون تقطيع (Gaming VIP) مع ضبط سرعات مخصصة
- عروض ترويجية لنقاط البيع لتحفيز الموزعين

لكل فئة مقترحة حدد:
- الاسم الجذاب
- المدة / الوقت (Uptime / Validity)
- حجم البيانات المسموح (Quota)
- السرعة المقترحة (Rate Limit e.g. 8M/3M)
- سعر البيع المقترح وهامش ربح الموزع
- نصيحة تطبيقها في المايكروتك (MikroTik Profile settings)
`;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    res.json({
      success: true,
      suggestions: response.text,
    });
  } catch (error: any) {
    console.error("AI Bundles error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "فشل اقتراح الباقات",
    });
  }
});

// AI MikroTik Script & Technical Assistant endpoint
app.post("/api/ai/mikrotik-assistant", async (req, res) => {
  try {
    const { query, networkContext } = req.body;

    const prompt = `
أنت خبير محترف ومستشار معتمد في شبكات مايكروتك (MikroTik Certified Network Associate MTCNA/MTCRE/MTCWE).
أجب عن استفسار صاحب الشبكة التالي بدقة وقدم الأوامر والسكربتات الصحيحة لـ RouterOS:

استفسار المستخدم:
"${query}"

سياق الشبكة:
${JSON.stringify(networkContext || {}, null, 2)}

قواعد الإجابة:
- قدم شرحاً واضحاً ومباشراً باللغة العربية.
- إذا كان هناك سكربت أو أوامر RouterOS Terminal، ضعها داخل كتل كود (code blocks) جاهزة للنسخ واللصق المباشر في New Terminal في WinBox.
- وضح كيف يتأكد المستخدم من نجاح تطبيق الإعدادات وتجنب الأخطاء الشائعة (مثل تضارب الـ IP، استهلاك المعالج CPU، انتهاء الجلسات Idle Timeout، ومشاركة الكروت Shared Users).
`;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        temperature: 0.4,
      },
    });

    res.json({
      success: true,
      reply: response.text,
      response: response.text,
    });
  } catch (error: any) {
    console.error("AI MikroTik Assistant error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "فشل الحصول على إجابة المساعد الذكي",
    });
  }
});

// Setup Vite or static serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MikroTik POS Server is running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
