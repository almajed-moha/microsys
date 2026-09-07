export type Currency = 'YER' | 'SAR' | 'USD' | 'IQD' | 'EGP' | 'LYD' | 'OMR' | 'KWD' | 'AED';

export interface AuditHistoryEntry {
  id?: string;
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'financial' | 'security' | 'system';
  userId: string;
  userName: string;
  userRole?: string;
  userUsername?: string;
  timestamp: string; // ISO string
  details?: string;
  changesSummary?: string;
}

export interface EntityAuditMetadata {
  createdAt?: string; // ISO string or YYYY-MM-DD
  createdBy?: string; // User ID
  createdByName?: string; // Full Name
  createdByRole?: string; // Role Title (e.g. "المدير العام", "المحاسب المالي")
  createdByUsername?: string; // Username e.g. "@admin"
  updatedAt?: string; // ISO string
  updatedBy?: string; // User ID
  updatedByName?: string; // Full Name
  updatedByRole?: string; // Role Title
  updatedByUsername?: string; // Username
  auditHistory?: AuditHistoryEntry[];
}

export interface CardCategory extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  name: string; // e.g. "كارت 100 ريال", "كارت 200 ريال", "كارت 500 ريال", "كارت 1000 ريال"
  code: string; // e.g. "100_1H", "200_3H", "500_1D", "1000_3D"
  uptimeLimit: string; // e.g. "1h", "3h", "1d", "3d", "7d", "30d"
  quotaLimit: string; // e.g. "500M", "1.5G", "3.5G", "8G", "15G", "30G"
  rateLimit?: string; // e.g. "3M/1M", "5M/2M" (Download/Upload)
  validityDays: number; // Duration before expiration once activated
  costPrice: number; // سعر التكلفة
  wholesalePrice: number; // سعر الجملة / التوريد للموزع
  retailPrice: number; // سعر البيع للجمهور (100, 200, 500, 1000...)
  mikrotikProfile: string; // Hotspot user profile in RouterOS
  userManagerProfile?: string; // اسم البروفايل في User Manager
  userManagerLimitation?: string; // اسم القيد في User Manager
  sharedUsers?: number; // عدد الأجهزة المتصلة بنفس الكارت
  warehouseStock: number; // رصيد المستودع الرئيسي
  colorTheme: string; // Tailwind color accent
  notes?: string;
}

export interface POSPoint extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  name: string; // e.g. "سوبرماركت البركة"
  managerName: string;
  phone: string;
  address: string;
  maxDebtLimit: number; // سقف المديونية المسموح به
  currentDebt: number; // المديونية الحالية (المستحقات)
  totalCardsDelivered: number; // إجمالي الكروت المسلمة له
  totalCardsSold: number; // إجمالي الكروت المباعة
  totalCashPaid: number; // إجمالي المبالغ المسددة
  status: 'active' | 'suspended';
  pinCode?: string; // رمز PIN السريع لدخول بوابة نقطة البيع
  username?: string;
  password?: string;
  notes?: string;
  createdAt: string;
}

export interface CardOrderItem {
  id?: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitWholesalePrice: number;
  totalWholesalePrice: number;
  unitRetailPrice?: number;
  totalRetailPrice?: number;
}

export type CardOrderStatus = 'pending' | 'approved' | 'processing' | 'delivered' | 'rejected' | 'cancelled';
export type CardOrderPriority = 'normal' | 'urgent' | 'low';

export interface CardOrder extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  orderNumber: string; // e.g. "ORD-2026-001"
  posPointId?: string;
  customerId?: string;
  posPointName: string;
  posManagerName?: string;
  posPhone?: string;
  posAddress?: string;
  items: CardOrderItem[];
  totalQuantity: number;
  totalWholesaleAmount: number;
  totalRetailAmount?: number;
  currentDebtAtRequest?: number;
  status: CardOrderStatus;
  priority: CardOrderPriority;
  requestDate: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  notes?: string; // ملاحظات صاحب نقطة البيع
  adminNotes?: string; // رد الإدارة أو سبب الرفض/التعديل
  processedAt?: string;
  processedBy?: string;
  processedByName?: string;
  convertedInvoiceId?: string; // رقم الفاتورة في حال تم تحويل الطلب
  convertedDispatchId?: string; // رقم الإرسالية
}

export interface CardBatchDispatch extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  date: string;
  time?: string;
  posPointId?: string;
  categoryId: string;
  quantity: number;
  unitWholesalePrice: number;
  totalWholesaleValue: number;
  unitRetailPrice: number;
  totalRetailValue: number;
  serialStart?: string;
  serialEnd?: string;
  status: 'delivered' | 'partially_sold' | 'fully_sold' | 'reconciled';
  soldCount: number;
  notes?: string;
}

export interface InvoiceItem {
  id?: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitCostPrice?: number;
  unitWholesalePrice: number;
  totalWholesalePrice: number;
  unitRetailPrice: number;
  totalRetailPrice: number;
  profit?: number;
  serialStart?: string;
  serialEnd?: string;
  notes?: string;
}

export interface InvoiceRecord extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  invoiceNumber: string; // e.g. "INV-2026-001" or "RET-2026-001"
  type: 'sale' | 'return'; // 'sale' = فاتورة مبيعات/تسليم دفعة, 'return' = فاتورة مرتجع كروت
  date: string;
  time?: string;
  timestamp: string; // ISO string
  posPointId?: string;
  posPointName?: string;
  customerId?: string; // ID of the customer (optional for POS)
  items: InvoiceItem[];
  totalQuantity: number;
  totalWholesaleAmount: number; // المبلغ الإجمالي المحتسب على نقطة البيع
  totalRetailAmount: number; // إجمالي القيمة التقديرية بسعر الجمهور
  totalCostAmount?: number; // إجمالي التكلفة
  totalProfit?: number; // إجمالي الربح التقديري
  paymentType: 'credit' | 'cash'; // نقدي أو آجل على الحساب
  status: 'completed' | 'draft' | 'cancelled';
  notes?: string;
  receivedBy?: string; // المستلم
  deliveredBy?: string; // المسلم من الإدارة
  reasonForReturn?: string; // سبب الإرجاع في حال كانت فاتورة مرتجع
}

export interface ExpenseCategory extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  name: string; // e.g. "سعات وباقات الإنترنت الرئيسية (المزود)", "إيجارات الأبراج والمواقع", "الكهرباء والطاقة والمحروقات"
  description?: string;
  icon?: string;
  colorTheme?: string;
  isDefault?: boolean;
}

export interface ExpenseRecord extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  voucherNumber: string; // e.g. "EXP-2026-001"
  date: string;
  time?: string;
  timestamp: string; // ISO string
  categoryId: string;
  categoryName: string;
  title: string; // وصف المصروف / البند
  amount: number; // المبلغ
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'other';
  paidTo?: string; // المدفوع له (الجهة / الفني / المورد)
  referenceNumber?: string; // رقم الحوالة / السند اليدوي
  notes?: string;
  receiptAttachment?: string;
}

export interface FinancialSummary {
  grossSales: number; // إجمالي المبيعات
  returnsTotal: number; // إجمالي المرتجعات
  netSales: number; // صافي المبيعات (المبيعات - المرتجعات)
  totalExpenses: number; // إجمالي المصروفات
  netProfit: number; // صافي الربح الحقيقي (صافي المبيعات - المصروفات)
  totalCashCollected: number; // إجمالي المقبوضات النقدية
  totalPOSDebt: number; // إجمالي مديونيات نقاط البيع
}

export interface SalesRecord extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  date: string;
  time?: string;
  timestamp: string; // ISO string
  posPointId: string;
  customerId?: string;
  customerName?: string;
  categoryId: string;
  quantity: number;
  unitRetailPrice: number;
  totalRetailAmount: number;
  unitWholesalePrice: number;
  totalWholesaleAmount: number;
  profit: number; // Retail - Cost or Retail - Wholesale
  paymentType: 'cash' | 'credit'; // نقدي أو آجل على حساب نقطة البيع
  invoiceNumber: string;
  notes?: string;
}

export interface PaymentRecord extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  date: string;
  time?: string;
  timestamp: string;
  posPointId: string;
  customerId?: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'other';
  referenceNumber?: string;
  receivedBy?: string;
  notes?: string;
}

export interface CardElementStyle {
  color?: string;
  fontFamily?: 'cairo' | 'tajawal' | 'almarai' | 'ibm' | 'mono';
  fontSize?: number | string;
  fontWeight?: 'normal' | 'semibold' | 'bold' | 'black';
  backgroundColor?: string;
}

export interface CardTemplate extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  name: string; // e.g. "قالب كروت فئة 500 ريال الذهبي", "قالب باقة VIP 1000", "قالب A4 - 18 كارت"
  description?: string;
  categoryId?: string; // فئة مقترنة اختيارياً
  
  // Design & Background
  backgroundType: 'custom_image' | 'gradient' | 'minimal_light' | 'dark_neon' | 'golden_luxury' | 'cyan_tech' | 'emerald_pro';
  backgroundImageUrl?: string; // Data URL or Image URL uploaded by user
  bgFit?: 'cover' | 'contain' | 'fill';
  bgOpacity?: number; // 0.1 to 1.0
  themeColor: string; // Tailwind color or Hex
  accentColor?: string;
  borderColor?: string;

  // Frame Corner Style: 'rounded' (مستدير) or 'sharp' (مركن / زوايا حادة 90 درجة)
  cardCornerStyle?: 'rounded' | 'sharp';
  cardBorderRadius?: number; // in px, e.g. 14 for rounded, 0 for sharp

  // Design Archetype Style
  designStyle?: 'voucher_badge' | 'standard' | 'modern';
  badgeColor?: string; // Color of the side badge (default #dc2626)
  priceCircleBg?: string; // Color of circle inside badge (default #ffffff)
  priceTextColor?: string; // Color of price text inside circle (default #dc2626)
  websiteUrl?: string; // Login / check balance URL (e.g. www.j.net)
  validityText?: string; // e.g. "٤ أيام"

  // A4 Printing & Grid Setup
  cardsPerPage: number; // calculated gridCols * gridRows
  gridCols: number; // Columns count (e.g. 1, 2, 3, 4, 5)
  gridRows: number; // Rows count (e.g. 1, 2, 3, 4, 5, 6, 7, 8)
  dimensionMode?: 'auto_grid' | 'custom_mm'; // Auto-calculated based on rows/cols or custom mm
  cardWidthMm?: number; // In millimeters
  cardHeightMm?: number; // In millimeters
  pageMarginMm?: number; // Margin around paper (default 5mm)
  cardGapMm?: number; // Gap between cards (default 2mm)
  orientation: 'portrait' | 'landscape';
  paperSize: 'A4' | 'A5' | 'Letter' | 'Thermal80mm';
  showCutLines: boolean;
  cutLineStyle?: 'dashed' | 'solid' | 'dots' | 'none';

  // Card Content & Fields Visibility
  showQrCode: boolean;
  qrPosition: 'right' | 'left' | 'bottom-right' | 'bottom-left' | 'center';
  qrSize: 'sm' | 'md' | 'lg';
  qrHasWhiteBg: boolean;

  showNetworkName: boolean;
  showNetworkSlogan: boolean;
  showCategoryName: boolean;
  showPrice: boolean;
  showValidity: boolean;
  showQuota: boolean;
  showSpeed: boolean;
  showSerial: boolean;
  showSupportPhone: boolean;
  showInstructions: boolean;
  showFooterBanner?: boolean;
  showPosName?: boolean;
  showPrintDate?: boolean;
  showCodeLabel?: boolean; // When false, renders strictly only the code with zero extra text labels
  fontFamily?: 'cairo' | 'tajawal' | 'almarai' | 'ibm' | 'mono';
  bgOverlayOpacity?: number; // 0 to 0.8
  elementPositions?: Record<string, { x: number; y: number }>;
  elementStyles?: Record<string, CardElementStyle>; // Per-element custom font, color, size, and weight

  // Typography & Code Layout
  codeBoxStyle: 'transparent' | 'solid-bg' | 'rounded-white' | 'dark-box' | 'amber-box' | 'glassmorphism' | 'clean-border';
  codeTextColor: string; // '#0f172a', '#ffffff', etc.
  codeFontSize: number | string;
  codeLetterSpacing: 'normal' | 'wide' | 'widest';

  createdAt: string;
  isDefault?: boolean;
}

export interface GeneratedVoucher {
  id: string;
  networkId?: string;
  username: string;
  password?: string;
  categoryId: string;
  categoryName: string;
  profile: string;
  price: number;
  serial: string;
  batchCode: string;
  createdAt: string;
  status: 'available' | 'assigned' | 'used';
  posPointId?: string;
  posPointName?: string;
  dispatchId?: string;
  templateId?: string;
  templateName?: string;
  codeLength?: number;
}

export interface MikroTikConfig {
  host: string; // e.g. "192.168.88.1" or "10.0.0.1" or DNS
  port: number; // e.g. 8728 (API), 8729 (API-SSL), 80 (REST), 443 (REST-SSL)
  protocol: 'auto' | 'rest_http' | 'rest_https' | 'api_binary' | 'api_ssl' | 'demo';
  username: string;
  password?: string;
  useSsl: boolean;
  timeoutMs?: number;
  autoRefreshInterval: number; // in seconds (0 = disabled, 3, 5, 10, 30)
  isLiveConnected?: boolean;
  lastConnectedAt?: string;
  routerModel?: string;
  routerOsVersion?: string;
  routerIdentity?: string;
}

export interface RouterSystemInfo {
  identity: string;
  version: string;
  model: string;
  platform: string;
  uptime: string;
  cpuLoad: number;
  cpuCount: number;
  cpuFrequency?: string;
  freeMemory: number;
  totalMemory: number;
  freeHdd: number;
  totalHdd: number;
  architecture: string;
  boardName: string;
  voltage?: number;
  temperature?: number;
}

export interface HotspotUserProfile {
  id: string;
  name: string;
  rateLimit?: string;
  sharedUsers?: number | string;
  sessionTimeout?: string;
  idleTimeout?: string;
  keepaliveTimeout?: string;
  statusAutorefresh?: string;
  transparentProxy?: boolean;
  addressPool?: string;
  onLogin?: string;
  onLogout?: string;
}

export interface HotspotConfiguredUser {
  id: string;
  name: string;
  password?: string;
  profile: string;
  limitUptime?: string;
  limitBytesTotal?: number;
  bytesIn?: number;
  bytesOut?: number;
  uptime?: string;
  disabled?: boolean;
  comment?: string;
  email?: string;
}

export interface UserManagerUser {
  id: string;
  name: string;
  password?: string;
  customer?: string;
  actualProfile?: string;
  group?: string;
  sharedUsers?: number;
  limitUptime?: string;
  limitBytesTotal?: number;
  uptimeUsed?: string;
  downloadUsed?: number;
  uploadUsed?: number;
  totalBytes?: number;
  disabled?: boolean;
  comment?: string;
  callerId?: string;
  email?: string;
  phone?: string;
  otpSecret?: string;
  lastSeen?: string;
}

export interface UserManagerProfile {
  id: string;
  name: string;
  nameForUsers?: string;
  price?: number;
  validity?: string;
  startsAt?: string;
  overrideSharedUsers?: string | number;
  owner?: string;
  limitations?: string[];
}

export interface UserManagerLimitation {
  id: string;
  name: string;
  downloadLimit?: number | string;
  uploadLimit?: number | string;
  totalLimit?: number | string;
  uptimeLimit?: string;
  rateLimitRx?: string | number;
  rateLimitTx?: string | number;
  rateLimitMinRx?: string | number;
  rateLimitMinTx?: string | number;
  resetCountersAt?: string;
  owner?: string;
}

export interface UserManagerRouter {
  id: string;
  name: string;
  ipAddress: string;
  sharedSecret: string;
  log?: string;
  disabled?: boolean;
}

export interface UserManagerSession {
  id: string;
  user: string;
  nasIp?: string;
  nasPort?: string;
  userIp?: string;
  userMac?: string;
  fromTime?: string;
  tillTime?: string;
  uptime?: string;
  download?: number;
  upload?: number;
  active?: boolean;
  terminateCause?: string;
}

export interface HotspotActiveUser {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  idleTime?: string;
  sessionTimeLeft?: string;
  bytesIn: number; // Upload
  bytesOut: number; // Download
  packetsIn?: number;
  packetsOut?: number;
  loginBy?: string;
  comment?: string;
  server?: string;
  rateLimit?: string;
  radius?: boolean;
}

export interface HotspotHost {
  id: string;
  address: string;
  macAddress: string;
  authorized: boolean;
  bypassed: boolean;
  bytesIn: number;
  bytesOut: number;
  uptime: string;
  idleTime?: string;
  bridgePort?: string;
  server?: string;
  comment?: string;
}

export interface RouterInterface {
  id: string;
  name: string;
  type: string;
  running: boolean;
  disabled: boolean;
  rxByte: number;
  txByte: number;
  rxPacket?: number;
  txPacket?: number;
  rxRateBps?: number;
  txRateBps?: number;
  comment?: string;
}

export interface DhcpLease {
  id: string;
  address: string;
  macAddress: string;
  server?: string;
  status: string;
  hostName?: string;
  comment?: string;
  expiresAfter?: string;
}

export type TenantAllowedModule =
  | 'dashboard'
  | 'invoices'
  | 'orders'
  | 'expenses'
  | 'payments'
  | 'pos'
  | 'categories'
  | 'mikrotik'
  | 'users'
  | 'pos_portal'
  | 'settings'
  | 'backup'
  | 'ai_assistant';

export interface NetworkTenant {
  id: string;
  name: string;
  adminUsername: string;
  adminPassword?: string;
  status: 'active' | 'suspended';
  subscriptionPlan?: 'monthly' | 'yearly' | 'custom' | 'lifetime';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  createdAt: string;
  settings: NetworkSettings;
  // صلاحيات وقوائم مدير الشبكة المحددة من قبل مالك النظام
  accessMode?: 'all' | 'custom'; // 'all' = جميع القوائم والواجهات، 'custom' = قوائم مخصصة
  allowedModules?: TenantAllowedModule[]; // مصفوفة القوائم والواجهات المسموحة
  notes?: string;
}

export interface MaintenanceSettings {
  enabled: boolean; // هل وضع الصيانة مفعل حالياً؟
  networkStatus: 'online' | 'maintenance' | 'disabled'; // حالة الشبكة: online = قيد التشغيل, maintenance = وضع الصيانة, disabled = معطلة برمجياً
  title: string; // عنوان رسالة الصيانة
  message: string; // نص رسالة الصيانة للمستخدمين
  expectedReturnTime?: string; // الوقت المتوقع لانتهاء الصيانة والعودة
  showCountdown?: boolean; // تفعيل العداد التنازلي
  targetReturnTimestamp?: string; // التوقيت المستهدف للعداد التنازلي ISO string
  supportContact?: string; // هاتف الدعم الفني
  whatsappNumber?: string; // رقم الواتساب المباشر
  severity: 'scheduled' | 'urgent' | 'upgrade' | 'isp_outage' | 'notice'; // نوع الصيانة
  kickActiveUsersOnEnable?: boolean; // فصل المستخدمين النشطين فوراً عند التفعيل
  themeStyle: 'warning_amber' | 'danger_red' | 'tech_blue' | 'modern_dark' | 'emerald_pro'; // المظهر البصري لصفحة الهوتسبوت
  allowBypassedIps?: string; // عناوين IP المستثناة من حظر الصيانة
  lastUpdated?: string;
  updatedBy?: string;
}

export interface NetworkSettings {
  autoBackupToDrive?: boolean;
  autoBackupIntervalHours?: number;
  networkName: string; // اسم الشبكة الرئيسي
  networkSlogan: string;
  logoUrl?: string; // رابط الشعار (اختياري)
  currency: string;
  currencySymbol: string;
  hotspotDns: string; // e.g. "net.wifi" or "10.0.0.1"
  loginPageUrl: string;
  supportPhone: string;
  whatsappNumber: string;
  autoReconciliation: boolean;
  enableQrCodeOnCards: boolean;
  mikrotikIp?: string;
  mikrotikConfig?: MikroTikConfig;
  themeMode?: 'dark' | 'light' | 'system'; // الوضع الليلي أو النهاري
  invoiceFooterText?: string; // نص تذييل الفواتير وسندات القبض والصرف والتسليم الرسمية (ورق A4)
  cashierFooterText?: string; // نص تذييل إيصالات الكاشير الحرارية (80mm)
  statementFooterText?: string; // نص تذييل كشوفات الحسابات والتقارير المالية
  maintenanceSettings?: MaintenanceSettings; // إعدادات وضع الصيانة والتحكم بحالة الشبكة
}

export interface POSCardInventory {
  posPointId: string;
  categoryId: string;
  dispatched: number;
  sold: number;
  remaining: number;
}

// ==========================================
// User & Granular Permission System Types
// ==========================================

export type UserRole =
  | 'system_owner'      // مالك النظام (مدير كل الشبكات)
  | 'super_admin'       // المدير العام (كامل الصلاحيات)
  | 'accountant'        // المحاسب المالي
  | 'sales_agent'       // مندوب التوزيع والمبيعات
  | 'cashier'           // أمين الصندوق
  | 'network_admin'     // مسؤول الشبكات والدعم الفني
  | 'viewer'            // مراقب ومدقق
  | 'pos_agent'         // صاحب نقطة البيع والموزع
  | 'custom';           // مخصص

export interface OrdersPermissions {
  view: boolean;                  // عرض طلبات الكروت
  createOrder: boolean;           // إنشاء طلب كروت جديد
  processOrder: boolean;          // معالجة وتحويل الطلب إلى فاتورة وتسليم
  rejectOrder: boolean;           // رفض أو إلغاء الطلب
  exportOrders: boolean;          // تصدير الطلبات
}

// الصلاحيات الدقيقة لكل شاشة وفروعها الفرعية
export interface DashboardPermissions {
  view: boolean;                  // الوصول لشاشة لوحة التحكم
  viewFinancialMetrics: boolean;  // عرض إجمالي المبيعات، الصافي، التحصيلات
  viewProfits: boolean;           // عرض صافي الأرباح وهوامش الربح الحساسة
  viewIncomeStatement: boolean;   // استعراض قائمة الدخل والتقرير المالي المحاسبي
  viewDebtsSummary: boolean;      // عرض إجمالي مديونيات الموزعين
  viewRevenueCharts: boolean;     // عرض الرسوم البيانية والإحصائيات
  exportReports: boolean;         // تصدير التقارير المالية
}

export interface InvoicesPermissions {
  view: boolean;                  // عرض الفواتير
  createSaleInvoice: boolean;     // إنشاء فاتورة مبيعات/تسليم
  createReturnInvoice: boolean;   // إنشاء فاتورة مرتجع
  editInvoice: boolean;           // تعديل الفواتير السابقة
  cancelOrDeleteInvoice: boolean; // إلغاء أو حذف الفواتير
  printInvoice: boolean;          // طباعة الفواتير A4 والحراري
  viewCostAndProfit: boolean;     // رؤية أسعار التكلفة وصافي الأرباح
  exportInvoices: boolean;        // تصدير الفواتير Excel/CSV
}

export interface ExpensesPermissions {
  view: boolean;                  // عرض المصروفات
  viewIncomeStatement: boolean;   // استعراض قائمة الدخل وتحليل الأرباح والخسائر
  addExpense: boolean;            // إضافة سند صرف جديد
  editExpense: boolean;           // تعديل سندات الصرف
  deleteExpense: boolean;         // حذف سندات الصرف
  manageCategories: boolean;      // إدارة وتعديل بنود وتصنيفات المصاريف
  printReceipt: boolean;          // طباعة سند الصرف الفردي
  printExpenseReport: boolean;    // طباعة كشف تقرير المصروفات الشامل
  printIncomeStatement: boolean;  // طباعة وتصدير قائمة الدخل المحاسبية الرسمية
}

export interface PaymentsPermissions {
  view: boolean;                  // عرض سندات القبض
  addPayment: boolean;            // إضافة سند قبض وتحصيل جديد
  deletePayment: boolean;         // حذف سند قبض
  printReceipt: boolean;          // طباعة السند الحراري والرسمي
  printPOSStatement: boolean;     // طباعة وتوليد كشف حساب نقطة البيع
  exportPayments: boolean;        // تصدير سجل التحصيلات
}

export interface POSPermissions {
  view: boolean;                  // عرض نقاط البيع والموزعين
  addPOS: boolean;                // إضافة نقطة بيع جديدة
  editPOS: boolean;               // تعديل بيانات وسقف مديونية الموزع
  deletePOS: boolean;             // حذف نقطة بيع
  quickDispatchCards: boolean;    // تسليم وتوريد كروت سريعة
  quickPayment: boolean;          // قبض دفعة سريعة
  viewAccountStatement: boolean;  // استعراض كشف الحساب التفصيلي
  exportPOSData: boolean;         // تصدير بيانات الموزعين
}

export interface CategoriesPermissions {
  view: boolean;                  // عرض الفئات والمخزون
  addCategory: boolean;           // إضافة فئة كروت جديدة
  editCategory: boolean;          // تعديل الفئات والمواصفات
  editPrices: boolean;            // تعديل أسعار التكلفة والجملة والتجزئة
  deleteCategory: boolean;        // حذف فئة
  generateVouchers: boolean;      // توليد وطباعة الكروت A4/حراري
  exportMikrotikScript: boolean;  // تصدير أوامر وسكربتات المايكروتك
  manageTemplates: boolean;       // تصميم وتعديل قوالب الكروت
}

export interface MikrotikPermissions {
  view: boolean;                  // عرض مركز مراقبة المايكروتك
  disconnectUsers: boolean;       // فصل وطرد المشتركين النشطين
  editMikrotikConfig: boolean;    // تعديل إعدادات وبيانات الاتصال بالراوتر
  viewLiveTraffic: boolean;
  viewSessions: boolean;          // عرض إحصائيات المتصلين       // مراقبة الباندويث المباشر والمنافذ
  rebootRouter: boolean;          // إرسال أوامر إعادة تشغيل الراوتر
}

export interface UsersAndPermissionsModulePermissions {
  view: boolean;                  // عرض شاشة المستخدمين والصلاحيات
  addUser: boolean;               // إضافة مستخدم جديد
  editUser: boolean;              // تعديل بيانات وصلاحيات المستخدمين
  deleteUser: boolean;            // حذف أو تجميد مستخدم
  changeUserRoles: boolean;       // تغيير القوالب والأدوار
  switchActiveUser: boolean;      // التبديل وتجربة المستخدمين
}

export interface SystemTenantsPermissions {
  view: boolean;                  // عرض الشبكات (Tenants)
  manage: boolean;                // إضافة وتعديل الشبكات
}

export interface SettingsPermissions {
  view: boolean;                  // فتح نافذة الإعدادات
  editNetworkProfile: boolean;    // تعديل بيانات وشعار وأرقام الشبكة
  backupAndRestore: boolean;      // عمل نسخة احتياطية واستعادة البيانات
  resetDatabase: boolean;         // تصفير وإعادة ضبط قاعدة البيانات
  useAIAssistant: boolean;        // استخدام المساعد الذكي AI
}

// الهيكل الكامل لصلاحيات المستخدم
export interface UserPermissions {
  dashboard: DashboardPermissions;
  invoices: InvoicesPermissions;
  orders: OrdersPermissions;
  expenses: ExpensesPermissions;
  payments: PaymentsPermissions;
  pos: POSPermissions;
  categories: CategoriesPermissions;
  mikrotik: MikrotikPermissions;
  usersAndPermissions: UsersAndPermissionsModulePermissions;
  settings: SettingsPermissions;
  systemTenants?: SystemTenantsPermissions;
}

export interface AppUser {
  id: string;
  networkId?: string;             // معرف الشبكة (للتمييز بين الشبكات في وضع SaaS)
  name: string;                   // الاسم الكامل للمستخدم
  username: string;               // اسم الدخول (e.g. admin, accountant, sales1)
  password?: string;              // كلمة المرور
  pinCode?: string;               // رمز PIN السريع المكون من 4-6 أرقام
  email?: string;
  phone?: string;
  role: UserRole;                 // الدور الرئيسي
  posPointId?: string;            // ربط المستخدم بنقطة بيع محددة (للموزعين)
  customRoleName?: string;        // المسمى الوظيفي المخصص (e.g. مدير الفرع، محصل الميدان)
  avatar?: string;                // أيقونة المستخدم أو الصورة
  avatarBgColor?: string;         // لون خلفية الأيقونة
  status: 'active' | 'inactive' | 'suspended';
  permissions: UserPermissions;   // مصفوفة الصلاحيات الدقيقة
  assignedPOSPointIds?: string[]; // حصر المندوب بنقاط بيع معينة (اختياري)
  maxDiscountPercent?: number;    // الحد الأقصى للخصم المسموح به
  notes?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface UserActivityLog {
  id: string;
  networkId?: string;
  userId: string;
  userName: string;
  userRole?: UserRole | string;
  userAvatar?: string;
  userAvatarBg?: string;
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'auth' | 'settings' | 'security' | 'financial' | 'export' | 'system';
  targetModule: 'invoices' | 'orders' | 'expenses' | 'payments' | 'pos' | 'categories' | 'users' | 'settings' | 'mikrotik' | 'auth' | 'backup' | 'system';
  targetModuleName: string;
  title: string;
  details?: string;
  timestamp: string; // ISO string e.g. "2026-08-27T14:14:00Z"
  date: string;
  time: string; // HH:mm:ss
  ipAddress?: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
}

export interface SystemDatabaseBackupCounts {
  tenants?: number;
  users?: number;
  categories?: number;
  posPoints?: number;
  invoices?: number;
  expenses?: number;
  expenseCategories?: number;
  dispatches?: number;
  sales?: number;
  payments?: number;
  orders?: number;
  templates?: number;
  vouchers?: number;
  activityLogs?: number;
}

export interface SystemDatabaseBackupData {
  tenants?: NetworkTenant[];
  users?: AppUser[];
  categories?: CardCategory[];
  posPoints?: POSPoint[];
  invoices?: InvoiceRecord[];
  expenses?: ExpenseRecord[];
  expenseCategories?: ExpenseCategory[];
  dispatches?: CardBatchDispatch[];
  sales?: SalesRecord[];
  payments?: PaymentRecord[];
  orders?: CardOrder[];
  settings?: NetworkSettings;
  templates?: CardTemplate[];
  vouchers?: GeneratedVoucher[];
  activityLogs?: UserActivityLog[];
}

export interface SystemDatabaseBackup {
  version: string;
  app: string;
  backupType: 'full_system' | 'single_network';
  exportDate: string;
  timestamp: string;
  exportedBy?: {
    id?: string;
    name?: string;
    username?: string;
    role?: string;
  };
  networkId?: string;
  networkName?: string;
  counts: SystemDatabaseBackupCounts;
  data: SystemDatabaseBackupData;
  schemaSignature?: string;
}



export interface Customer extends EntityAuditMetadata {
  id: string;
  networkId?: string;
  name: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  notes?: string;
  totalPurchases?: number;
  totalPayments?: number;
  balance?: number;
}
