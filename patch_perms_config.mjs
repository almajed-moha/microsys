import fs from 'fs';

let perms = fs.readFileSync('src/utils/permissions.ts', 'utf8');

const newField = "{ key: 'viewSessions', label: 'عرض إحصائيات المتصلين وجلسات الاستخدام', description: 'الاطلاع على تقارير تفصيلية عن المتصلين خلال فترات محددة', actionType: 'read' },";

if (!perms.includes("key: 'viewSessions'")) {
  perms = perms.replace(
    "{ key: 'viewLiveTraffic', label: 'مراقبة حركة الباندويث والمنافذ', description: 'عرض الرسوم الحية لمعدل الرفع والتنزيل', actionType: 'read' },",
    "{ key: 'viewLiveTraffic', label: 'مراقبة حركة الباندويث والمنافذ', description: 'عرض الرسوم الحية لمعدل الرفع والتنزيل', actionType: 'read' },\n      " + newField
  );
  fs.writeFileSync('src/utils/permissions.ts', perms);
  console.log('Patched PERMISSION_MODULES_CONFIG');
}
