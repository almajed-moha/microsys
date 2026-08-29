import { AppUser, UserActivityLog, NetworkSettings } from '../types';

export const initialActivityLogs: UserActivityLog[] = [];

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
    networkId: user.networkId && user.networkId !== 'system' ? user.networkId : 'net-microsys',
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
export function exportAuditLogsToExcel(logs: UserActivityLog[], settings?: NetworkSettings, tenantNameMap?: Record<string, string>) {
  const currency = settings?.currencySymbol || 'ر.ي';
  const networkName = settings?.networkName || 'إدارة شبكات المايكروتك ونقاط البيع السحابية MicroSys';
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
   <Column ss:Width="45"/>
   <Column ss:Width="85"/>
   <Column ss:Width="70"/>
   <Column ss:Width="130"/>
   <Column ss:Width="110"/>
   <Column ss:Width="115"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="175"/>
   <Column ss:Width="250"/>
   <Column ss:Width="85"/>

   <Row ss:Height="36">
    <Cell ss:MergeAcross="10" ss:StyleID="HeaderTitle">
     <Data ss:Type="String">${networkName} - سجل نشاط العمليات والرقابة (Audit Log)</Data>
    </Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:MergeAcross="10" ss:StyleID="HeaderSub">
     <Data ss:Type="String">تاريخ التصدير: ${exportDate} الساعة ${exportTime} | إجمالي السجلات: ${logs.length} عملية موثقة</Data>
    </Cell>
   </Row>
   <Row ss:Height="8"/>

   <Row ss:Height="26">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">التاريخ</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">الوقت</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">الشبكة الفرعية</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">المستخدم المسؤول</Data></Cell>
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

    const netName = (log.networkId && tenantNameMap && tenantNameMap[log.networkId]) || log.networkId || 'الرئيسية';

    xml += `
   <Row ss:Height="24">
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${index + 1}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${log.date}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${log.time}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(netName)}</Data></Cell>
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
