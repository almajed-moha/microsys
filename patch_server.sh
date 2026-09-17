sed -i '/\/\/ 20b. Update UM User/i \
// 20a2. Assign Profile to UM User\
app.post("/api/mikrotik/um/assign-profile", async (req, res) => {\
  try {\
    const { options, username, profileName } = req.body;\
    if (!options?.host || !username || !profileName) {\
      return res.status(400).json({ success: false, error: "بيانات ناقصة" });\
    }\
    const result = await MikroTikService.assignProfileToUserManagerUser(options, username, profileName);\
    res.json({ success: result });\
  } catch (error: any) {\
    res.json({ success: false, error: error.message || "تعذر إضافة البروفايل للمستخدم" });\
  }\
});\
\
' server.ts
