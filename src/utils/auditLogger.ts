import { AppUser, UserActivityLog, NetworkSettings } from '../types';

export const initialActivityLogs: UserActivityLog[] = [
  {
    id: 'log-101',
    userId: 'user-admin',
    userName: 'المدير العام والمالك',
    userRole: 'super_admin',
    userAvatar: '👑',
    userAvatarBg: 'bg-purple-600',
    action: 'تعديل صلاحيات مستخدم',
    actionType: 'security',
    targetModule: 'users',
    targetModuleName: 'المستخدمين والصلاحيات',
    title: 'ترقية صلاحيات حساب مهندس الشبكات',
    details: 'تم منح المهندس عمار الحمادي صلاحية إدارة راوترات المايكروتك وتوليد كروت اليوزر مانجر',
    timestamp: '2026-08-27T10:15:30Z',
    date: '2026-08-27',
    time: '10:15:30',
    ipAddress: '192.168.1.10',
    status: 'warning',
  },
  {
    id: 'log-102',
    userId: 'user-accountant',
    userName: 'أ. عبد الله السعدي',
    userRole: 'accountant',
    userAvatar: '💼',
    userAvatarBg: 'bg-indigo-600',
    action: 'إضافة فاتورة مبيعات',
    actionType: 'create',
    targetModule: 'invoices',
    targetModuleName: 'الفواتير والمبيعات',
    title: 'إصدار فاتورة تسليم كروت رقم INV-2026-009',
    details: 'تسليم 25 كارت فئة 500 ريال لنقطة مركز النور للاتصالات بإجمالي 10,500 ر.ي (آجل)',
    timestamp: '2026-08-27T09:42:10Z',
    date: '2026-08-27',
    time: '09:42:10',
    ipAddress: '192.168.1.15',
    status: 'success',
  },
  {
    id: 'log-103',
    userId: 'user-cashier',
    userName: 'فاطمة القدسي',
    userRole: 'cashier',
    userAvatar: '🏪',
    userAvatarBg: 'bg-emerald-600',
    action: 'تسجيل سند قبض',
    actionType: 'financial',
    targetModule: 'payments',
    targetModuleName: 'سندات القبض والتحصيل',
    title: 'تحصيل دفعة نقدية بقيمة 30,000 ر.ي',
    details: 'سند قبض نقدية من سوبرماركت البركة تحت الحساب (رقم السند PAY-2026-304)',
    timestamp: '2026-08-27T08:30:15Z',
    date: '2026-08-27',
    time: '08:30:15',
    ipAddress: '192.168.1.20',
    status: 'success',
  },
  {
    id: 'log-104',
    userId: 'user-admin',
    userName: 'المدير العام والمالك',
    userRole: 'super_admin',
    userAvatar: '👑',
    userAvatarBg: 'bg-purple-600',
    action: 'حذف سند صرف',
    actionType: 'delete',
    targetModule: 'expenses',
    targetModuleName: 'المصروفات',
    title: 'حذف سند صرف مكرر رقم EXP-2026-088',
    details: 'تم حذف سند صرف بقيمة 5,000 ر.ي لبند صيانة فرعية بعد التأكد من تسجيله سابقاً',
    timestamp: '2026-08-26T19:20:45Z',
    date: '2026-08-26',
    time: '19:20:45',
    ipAddress: '192.168.1.10',
    status: 'danger',
  },
  {
    id: 'log-105',
    userId: 'user-sales1',
    userName: 'سالم بن علي',
    userRole: 'sales_agent',
    userAvatar: '🚚',
    userAvatarBg: 'bg-cyan-600',
    action: 'تسليم دفعة كروت',
    actionType: 'create',
    targetModule: 'pos',
    targetModuleName: 'نقاط البيع والموزعين',
    title: 'توريد كروت لمحل الأمانة فون',
    details: 'تسليم 50 كارت فئة 200 ريال بقيمة جملة 12,000 ر.ي',
    timestamp: '2026-08-26T17:10:00Z',
    date: '2026-08-26',
    time: '17:10:00',
    ipAddress: '10.0.0.45',
    status: 'info',
  },
  {
    id: 'log-106',
    userId: 'user-netadmin',
    userName: 'م. عمار الحمادي',
    userRole: 'network_admin',
    userAvatar: '🌐',
    userAvatarBg: 'bg-blue-600',
    action: 'توليد كروت مايكروتك',
    actionType: 'create',
    targetModule: 'categories',
    targetModuleName: 'فئات الكروت والطباعة',
    title: 'توليد 500 كارت فئة 500 ريال',
    details: 'إنشاء كروت بروفايل User Manager (3 أيام - 3.5GB) مع باركود QR جاهزة للطباعة A4',
    timestamp: '2026-08-26T14:05:22Z',
    date: '2026-08-26',
    time: '14:05:22',
    ipAddress: '192.168.1.50',
    status: 'success',
  },
  {
    id: 'log-107',
    userId: 'user-admin',
    userName: 'المدير العام والمالك',
    userRole: 'super_admin',
    userAvatar: '👑',
    userAvatarBg: 'bg-purple-600',
    action: 'تعديل سقف مديونية',
    actionType: 'update',
    targetModule: 'pos',
    targetModuleName: 'نقاط البيع',
    title: 'رفع سقف مديونية كافتيريا الجامعة',
    details: 'تعديل سقف المديونية من 50,000 ر.ي إلى 100,000 ر.ي بناءً على التزام السداد',
    timestamp: '2026-08-25T16:40:12Z',
    date: '2026-08-25',
    time: '16:40:12',
    ipAddress: '192.168.1.10',
    status: 'warning',
  },
  {
    id: 'log-108',
    userId: 'user-accountant',
    userName: 'أ. عبد الله السعدي',
    userRole: 'accountant',
    userAvatar: '💼',
    userAvatarBg: 'bg-indigo-600',
    action: 'إضافة سند صرف',
    actionType: 'create',
    targetModule: 'expenses',
    targetModuleName: 'المصروفات',
    title: 'تسجيل سند صرف باقة الإنترنت رقم EXP-2026-001',
    details: 'صرف مبلغ 185,000 ر.ي للمزود الرئيسي يمن نت (سعات الجملة الشهرية)',
    timestamp: '2026-08-25T11:00:00Z',
    date: '2026-08-25',
    time: '11:00:00',
    ipAddress: '192.168.1.15',
    status: 'success',
  },
  {
    id: 'log-109',
    userId: 'user-auditor',
    userName: 'د. خالد الزبيري',
    userRole: 'viewer',
    userAvatar: '👁️',
    userAvatarBg: 'bg-amber-600',
    action: 'تصدير تقرير مالي',
    actionType: 'export',
    targetModule: 'invoices',
    targetModuleName: 'التقارير المالية',
    title: 'تصدير كشف المبيعات والمطابقة المحاسبية Excel',
    details: 'تم استخراج وتنزيل كشف الفواتير الشامل لفترة النصف الأول من شهر أغسطس',
    timestamp: '2026-08-25T14:15:33Z',
    date: '2026-08-25',
    time: '14:15:33',
    ipAddress: '192.168.1.80',
    status: 'info',
  },
  {
    id: 'log-110',
    userId: 'user-admin',
    userName: 'المدير العام والمالك',
    userRole: 'super_admin',
    userAvatar: '👑',
    userAvatarBg: 'bg-purple-600',
    action: 'تعديل إعدادات الشبكة',
    actionType: 'settings',
    targetModule: 'settings',
    targetModuleName: 'إعدادات النظام',
    title: 'تحديث بيانات الدعم الفني ورقم الواتساب',
    details: 'تم تحديث رقم خدمة المشتركين وشعار الشبكة في ترويسة الفواتير والكروت',
    timestamp: '2026-08-24T18:00:00Z',
    date: '2026-08-24',
    time: '18:00:00',
    ipAddress: '192.168.1.10',
    status: 'warning',
  },
  {
    id: 'log-111',
    userId: 'user-accountant',
    userName: 'أ. عبد الله السعدي',
    userRole: 'accountant',
    userAvatar: '💼',
    userAvatarBg: 'bg-indigo-600',
    action: 'تسجيل مرتجع كروت',
    actionType: 'update',
    targetModule: 'invoices',
    targetModuleName: 'الفواتير والمرتجعات',
    title: 'إصدار سند مرتجع كروت رقم RET-2026-001',
    details: 'استلام 10 كروت مرتجعة تالفة فئة 100 ر.ي من بقالة السلام وخصمها من مديونية الموزع',
    timestamp: '2026-08-24T12:20:00Z',
    date: '2026-08-24',
    time: '12:20:00',
    ipAddress: '192.168.1.15',
    status: 'warning',
  },
  {
    id: 'log-112',
    userId: 'user-admin',
    userName: 'المدير العام والمالك',
    userRole: 'super_admin',
    userAvatar: '👑',
    userAvatarBg: 'bg-purple-600',
    action: 'إضافة مستخدم جديد',
    actionType: 'create',
    targetModule: 'users',
    targetModuleName: 'المستخدمين والصلاحيات',
    title: 'إنشاء حساب جديد للمدقق الخارجي د. خالد الزبيري',
    details: 'تم تحديد دور المراقب والمدقق مع صلاحيات عرض التقارير وتصدير كشوفات الحساب',
    timestamp: '2026-08-23T09:10:00Z',
    date: '2026-08-23',
    time: '09:10:00',
    ipAddress: '192.168.1.10',
    status: 'success',
  },
];

/**
 * Creates a formatted UserActivityLog item from current active user context
 */
export function buildActivityLog(
  user: AppUser,
  actionOrParams:
    | string
    | {
        action: string;
        actionType: UserActivityLog['actionType'];
        targetModule: UserActivityLog['targetModule'];
        targetModuleName: string;
        title: string;
        details?: string;
        status?: UserActivityLog['status'];
      },
  targetModule?: UserActivityLog['targetModule'],
  targetModuleName?: string,
  title?: string,
  details?: string,
  actionType: UserActivityLog['actionType'] = 'create'
): UserActivityLog {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss

  let action = '';
  let actType: UserActivityLog['actionType'] = 'create';
  let tModule: UserActivityLog['targetModule'] = 'system';
  let tModuleName = 'النظام';
  let itemTitle = '';
  let itemDetails: string | undefined = undefined;
  let itemStatus: UserActivityLog['status'] = 'success';

  if (typeof actionOrParams === 'object') {
    action = actionOrParams.action;
    actType = actionOrParams.actionType;
    tModule = actionOrParams.targetModule;
    tModuleName = actionOrParams.targetModuleName;
    itemTitle = actionOrParams.title;
    itemDetails = actionOrParams.details;
    itemStatus = actionOrParams.status || (actType === 'delete' ? 'danger' : actType === 'security' ? 'warning' : 'success');
  } else {
    action = actionOrParams;
    tModule = targetModule || 'system';
    tModuleName = targetModuleName || 'النظام';
    itemTitle = title || action;
    itemDetails = details;
    actType = actionType;
    itemStatus = actType === 'delete' ? 'danger' : actType === 'security' ? 'warning' : 'success';
  }

  return {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    userAvatar: user.avatar || '👤',
    userAvatarBg: user.avatarBgColor || 'bg-slate-700',
    action,
    actionType: actType,
    targetModule: tModule,
    targetModuleName: tModuleName,
    title: itemTitle,
    details: itemDetails,
    timestamp: now.toISOString(),
    date: dateStr,
    time: timeStr,
    ipAddress: '192.168.1.' + (Math.floor(Math.random() * 80) + 10),
    status: itemStatus,
  };
}

/**
 * Exports Audit Logs into an XML-based formatted Excel sheet (.xls)
 */
export function exportAuditLogsToExcel(logs: UserActivityLog[], settings?: NetworkSettings) {
  const currency = settings?.currencySymbol || 'ر.ي';
  const networkName = settings?.networkName || 'شبكة الفضاء اللاسلكية';
  const exportDate = new Date().toISOString().split('T')[0];
  const exportTime = new Date().toTimeString().split(' ')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#312E81" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="HeaderSub">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#C7D2FE" ss:Italic="1"/>
   <Interior ss:Color="#312E81" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#312E81"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4338CA" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowEven">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowOdd">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DangerTag">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="WarningTag">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#854D0E"/>
   <Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SuccessTag">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#166534"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="InfoTag">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1E40AF"/>
   <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="سجل_النشاط_الرقابي">
  <Table ss:DefaultRowHeight="22" ss:DefaultColumnWidth="120">
   <Column ss:Width="50"/>
   <Column ss:Width="90"/>
   <Column ss:Width="70"/>
   <Column ss:Width="130"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="180"/>
   <Column ss:Width="260"/>
   <Column ss:Width="90"/>

   <Row ss:Height="36">
    <Cell ss:MergeAcross="9" ss:StyleID="HeaderTitle">
     <Data ss:Type="String">${networkName} - سجل نشاط العمليات والرقابة (Audit Log)</Data>
    </Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:MergeAcross="9" ss:StyleID="HeaderSub">
     <Data ss:Type="String">تاريخ التصدير: ${exportDate} الساعة ${exportTime} | إجمالي السجلات: ${logs.length} عملية موثقة</Data>
    </Cell>
   </Row>
   <Row ss:Height="8"/>

   <Row ss:Height="26">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">التاريخ</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">الوقت</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">المستخدم</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">الدور الوظيفي</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">القسم / الوحدة</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">نوع الإجراء</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">عنوان العملية</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">التفاصيل الكاملة للعملية</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">عنوان IP</Data></Cell>
   </Row>`;

  logs.forEach((log, index) => {
    const rowStyle = index % 2 === 0 ? 'RowEven' : 'RowOdd';
    const tagStyle =
      log.status === 'danger'
        ? 'DangerTag'
        : log.status === 'warning'
        ? 'WarningTag'
        : log.status === 'success'
        ? 'SuccessTag'
        : 'InfoTag';

    xml += `
   <Row ss:Height="24">
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${index + 1}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${log.date}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${log.time}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(log.userName)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(log.userRole || '-')}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(log.targetModuleName)}</Data></Cell>
    <Cell ss:StyleID="${tagStyle}"><Data ss:Type="String">${escapeXml(log.action)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(log.title)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(log.details || '-')}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(log.ipAddress || '-')}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `سجل_النشاط_الرقابي_${exportDate}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
