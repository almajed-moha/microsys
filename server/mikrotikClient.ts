import http from 'http';
import https from 'https';
import net from 'net';
import tls from 'tls';
import crypto from 'crypto';

export interface MikroTikConnectionOptions {
  host: string;
  port?: number;
  protocol?: 'auto' | 'rest_http' | 'rest_https' | 'api_binary' | 'api_ssl' | 'demo';
  username: string;
  password?: string;
  useSsl?: boolean;
  timeoutMs?: number;
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
  freeMemory: number; // in bytes
  totalMemory: number; // in bytes
  freeHdd: number; // in bytes
  totalHdd: number; // in bytes
  architecture: string;
  boardName: string;
  voltage?: number;
  temperature?: number;
}

export interface HotspotActiveUser {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  idleTime?: string;
  sessionTimeLeft?: string;
  bytesIn: number; // upload
  bytesOut: number; // download
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

export interface MikrotikCallerSession {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  hostName?: string;
  source: 'hotspot' | 'user-manager' | 'dhcp';
  loginTime: string; // ISO date string
  logoutTime: string | null; // ISO string or null if active
  uptime: string;
  idleTime?: string;
  sessionTimeLeft?: string;
  downloadBytes: number;
  uploadBytes: number;
  packetsIn?: number;
  packetsOut?: number;
  loginBy?: string;
  server?: string;
  comment?: string;
  rateLimit?: string;
  terminateCause?: string;
  isActive: boolean;
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
  rxRateBps?: number; // bits per second
  txRateBps?: number; // bits per second
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

// Format bytes helper
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Check if an IP address or hostname is a private/local network address
export function isPrivateIp(host: string): boolean {
  if (!host) return false;
  const clean = host.trim().toLowerCase();
  if (clean === 'localhost' || clean === '127.0.0.1' || clean === '::1') return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  return false;
}

// Safely parse RouterOS date formats: "sep/09/2026 14:15:20", "sep/09 14:15:20", "2026-09-09 14:15:20", etc.
export function parseRouterOSDate(dateStr: string | undefined | null, fallbackMs: number = Date.now()): string {
  if (!dateStr) return new Date(fallbackMs).toISOString();
  const trimmed = String(dateStr).trim();
  if (!trimmed) return new Date(fallbackMs).toISOString();

  // Try direct Date parse
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  // RouterOS format: "mmm/dd/yyyy hh:mm:ss" or "mmm/dd hh:mm:ss"
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const match = trimmed.match(/^([a-zA-Z]{3})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (match) {
    const mStr = match[1].toLowerCase();
    const month = monthMap[mStr] || '01';
    const day = match[2].padStart(2, '0');
    const currentYear = new Date().getFullYear();
    const year = match[3] ? (match[3].length === 2 ? '20' + match[3] : match[3]) : String(currentYear);
    const time = match[4].length === 5 ? match[4] + ':00' : match[4];
    const isoLike = `${year}-${month}-${day}T${time}`;
    const d = new Date(isoLike);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return new Date(fallbackMs).toISOString();
}

// -------------------------------------------------------------
// RouterOS Binary API (Port 8728 / 8729) Length Encoder / Decoder
// -------------------------------------------------------------
class RouterOSBinaryClient {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private host: string;
  private port: number;
  private useSsl: boolean;
  private timeoutMs: number;

  constructor(host: string, port: number = 8728, useSsl: boolean = false, timeoutMs: number = 5000) {
    this.host = host;
    this.port = port;
    this.useSsl = useSsl;
    this.timeoutMs = timeoutMs;
  }

  private encodeLength(len: number): Buffer {
    if (len < 0x80) {
      return Buffer.from([len]);
    } else if (len < 0x4000) {
      const b1 = (len >> 8) | 0x80;
      const b2 = len & 0xff;
      return Buffer.from([b1, b2]);
    } else if (len < 0x200000) {
      const b1 = (len >> 16) | 0xc0;
      const b2 = (len >> 8) & 0xff;
      const b3 = len & 0xff;
      return Buffer.from([b1, b2, b3]);
    } else if (len < 0x10000000) {
      const b1 = (len >> 24) | 0xe0;
      const b2 = (len >> 16) & 0xff;
      const b3 = (len >> 8) & 0xff;
      const b4 = len & 0xff;
      return Buffer.from([b1, b2, b3, b4]);
    } else {
      const b0 = 0xf0;
      const b1 = (len >> 24) & 0xff;
      const b2 = (len >> 16) & 0xff;
      const b3 = (len >> 8) & 0xff;
      const b4 = len & 0xff;
      return Buffer.from([b0, b1, b2, b3, b4]);
    }
  }

  private encodeWord(word: string): Buffer {
    const buf = Buffer.from(word, 'utf-8');
    const lenBuf = this.encodeLength(buf.length);
    return Buffer.concat([lenBuf, buf]);
  }

  private encodeSentence(words: string[]): Buffer {
    const buffers: Buffer[] = words.map(w => this.encodeWord(w));
    buffers.push(Buffer.from([0])); // End of sentence marker
    return Buffer.concat(buffers);
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let isResolved = false;
      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          if (this.socket) {
            this.socket.destroy();
          }
          reject(new Error(`انتهت مهلة الاتصال بالمايكروتك بعد ${this.timeoutMs}ms (${this.host}:${this.port})`));
        }
      }, this.timeoutMs);

      const options: any = {
        host: this.host,
        port: this.port,
        rejectUnauthorized: false, // Allow self-signed router certs
      };

      try {
        if (this.useSsl) {
          this.socket = tls.connect(options, () => {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timer);
              resolve();
            }
          });
        } else {
          this.socket = net.connect(options, () => {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timer);
              resolve();
            }
          });
        }

        this.socket.on('error', (err) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timer);
            reject(new Error(`خطأ شبكة في منفذ API (${this.port}): ${err.message}`));
          }
        });
      } catch (e: any) {
        clearTimeout(timer);
        reject(e);
      }
    });
  }

  public async login(username: string, password: string = ''): Promise<void> {
    if (!this.socket) throw new Error('غير متصل بمنفذ المايكروتك API');

    // First try modern ROS v6.43+ and v7 plain-text login
    const resp1 = await this.sendSentence(['/login', `=name=${username}`, `=password=${password}`]);

    if (resp1.length > 0 && resp1[0]['!trap']) {
      throw new Error(`خطأ تسجيل الدخول بالمايكروتك: ${resp1[0]['message'] || 'اسم المستخدم أو كلمة المرور غير صحيحة'}`);
    }

    // Check if challenge response is required (legacy ROS < 6.43)
    if (resp1.length > 0 && resp1[0]['=ret']) {
      const challengeHex = resp1[0]['=ret'];
      const challenge = Buffer.from(challengeHex, 'hex');
      const md5 = crypto.createHash('md5');
      md5.update(Buffer.from([0]));
      md5.update(Buffer.from(password, 'utf-8'));
      md5.update(challenge);
      const responseHex = '00' + md5.digest('hex');

      const resp2 = await this.sendSentence(['/login', `=name=${username}`, `=response=${responseHex}`]);
      if (resp2.length > 0 && resp2[0]['!trap']) {
        throw new Error(`خطأ تسجيل الدخول: ${resp2[0]['message'] || 'فشل التوثيق'}`);
      }
    }
  }

  public async sendSentence(words: string[]): Promise<Record<string, string>[]> {
    if (!this.socket) throw new Error('المقبس غير متصل');

    const sentenceBuf = this.encodeSentence(words);
    this.socket.write(sentenceBuf);

    return new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0);
      const results: Record<string, string>[] = [];
      let currentSentence: string[] = [];

      const onData = (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);

        while (buffer.length > 0) {
          let pos = 0;
          let len = 0;
          const firstByte = buffer[0];

          if (firstByte === 0) {
            // End of sentence
            buffer = buffer.subarray(1);
            if (currentSentence.length > 0) {
              const sentenceType = currentSentence[0];
              const itemObj: Record<string, string> = { sentenceType };

              for (let i = 1; i < currentSentence.length; i++) {
                const w = currentSentence[i];
                if (w.startsWith('=')) {
                  const eqIdx = w.indexOf('=', 1);
                  if (eqIdx !== -1) {
                    const key = w.substring(1, eqIdx);
                    const val = w.substring(eqIdx + 1);
                    itemObj[key] = val;
                  } else {
                    itemObj[w.substring(1)] = '';
                  }
                } else if (w.startsWith('.tag=')) {
                  itemObj['.tag'] = w.substring(5);
                }
              }

              if (sentenceType === '!re') {
                results.push(itemObj);
              } else if (sentenceType === '!trap') {
                results.push(itemObj);
              } else if (sentenceType === '!done') {
                cleanup();
                resolve(results);
                return;
              }
              currentSentence = [];
            }
            continue;
          }

          // Decode length
          if ((firstByte & 0x80) === 0x00) {
            len = firstByte;
            pos = 1;
          } else if ((firstByte & 0xc0) === 0x80) {
            if (buffer.length < 2) break;
            len = ((firstByte & 0x3f) << 8) | buffer[1];
            pos = 2;
          } else if ((firstByte & 0xe0) === 0xc0) {
            if (buffer.length < 3) break;
            len = ((firstByte & 0x1f) << 16) | (buffer[1] << 8) | buffer[2];
            pos = 3;
          } else if ((firstByte & 0xf0) === 0xe0) {
            if (buffer.length < 4) break;
            len = ((firstByte & 0x0f) << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3];
            pos = 4;
          } else if ((firstByte & 0xf8) === 0xf0) {
            if (buffer.length < 5) break;
            len = (buffer[1] << 24) | (buffer[2] << 16) | (buffer[3] << 8) | buffer[4];
            pos = 5;
          }

          if (buffer.length < pos + len) {
            // Not enough data yet
            break;
          }

          const wordBuf = buffer.subarray(pos, pos + len);
          currentSentence.push(wordBuf.toString('utf-8'));
          buffer = buffer.subarray(pos + len);
        }
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        if (this.socket) {
          this.socket.removeListener('data', onData);
          this.socket.removeListener('error', onError);
        }
      };

      if (this.socket) {
        this.socket.on('data', onData);
        this.socket.on('error', onError);
      }
    });
  }

  public close() {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (_) {}
      this.socket = null;
    }
  }
}

// -------------------------------------------------------------
// RouterOS v7 REST API Client (HTTP / HTTPS)
// -------------------------------------------------------------
async function fetchRestApi(
  options: MikroTikConnectionOptions,
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const isHttps = options.protocol === 'rest_https' || options.useSsl;
  const defaultPort = isHttps ? 443 : 80;
  const port = options.port || defaultPort;
  const host = options.host;
  const timeout = options.timeoutMs || 5000;

  const auth = Buffer.from(`${options.username}:${options.password || ''}`).toString('base64');
  const path = endpoint.startsWith('/') ? `/rest${endpoint}` : `/rest/${endpoint}`;

  return new Promise((resolve, reject) => {
    const lib = isHttps ? https : http;
    const reqOptions: http.RequestOptions = {
      hostname: host,
      port: port,
      path: path,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MikroTik-POS-Manager/1.0',
      },
      timeout: timeout,
      agent: isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined,
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve(parsed);
          } catch (e) {
            resolve(data);
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error(`فشل التوثيق بالمايكروتك (رمز ${res.statusCode}): تأكد من صحة اسم المستخدم وكلمة المرور وصلاحية REST API.`));
        } else if (res.statusCode === 404) {
          reject(new Error(`المسار ${endpoint} غير موجود. قد لا يدعم هذا الراوتر ميزة REST API (RouterOS v7+).`));
        } else {
          reject(new Error(`استجابة المايكروتك خطأ ${res.statusCode}: ${data || res.statusMessage}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`انتهت مهلة استجابة REST API من الراوتر (${host}:${port}) بعد ${timeout}ms`));
    });

    req.on('error', (err) => {
      reject(new Error(`فشل الاتصال بـ REST API (${host}:${port}): ${err.message}`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function parseDurationToSeconds(duration?: string): number {
  if (!duration) return 0;
  const str = duration.trim().toLowerCase();
  let total = 0;
  
  const w = str.match(/(\d+)w/);
  const d = str.match(/(\d+)d/);
  const h = str.match(/(\d+)h/);
  const m = str.match(/(\d+)m/);
  const s = str.match(/(\d+)s/);
  
  if (w) total += parseInt(w[1], 10) * 7 * 86400;
  if (d) total += parseInt(d[1], 10) * 86400;
  if (h) total += parseInt(h[1], 10) * 3600;
  if (m) total += parseInt(m[1], 10) * 60;
  if (s) total += parseInt(s[1], 10);
  
  if (total === 0 && str.includes(':')) {
    const parts = str.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      total = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      total = parts[0] * 60 + parts[1];
    }
  }
  return total;
}

// -------------------------------------------------------------
// Unified MikroTik Unified Manager Service
// -------------------------------------------------------------
export class MikroTikService {
  public static async testConnection(options: MikroTikConnectionOptions): Promise<{
    success: boolean;
    protocolUsed: string;
    version?: string;
    identity?: string;
    latencyMs: number;
    details: any;
    diagnostics?: string;
  }> {
    const startTime = Date.now();

    // 1. If demo mode requested, return simulated router info
    if (options.protocol === 'demo' || options.host === 'demo' || options.host === 'simulation') {
      return {
        success: true,
        protocolUsed: 'Simulator / Virtual RouterOS v7.14',
        version: '7.14.3 (stable)',
        identity: 'MikroTik-CloudCore-Demo',
        latencyMs: 12,
        details: {
          board: 'CCR2004-16G-2S+',
          platform: 'MikroTik',
          cpuCount: 4,
          cpuLoad: 18,
          freeMemory: 3420000000,
          totalMemory: 4294967296,
          uptime: '18d 04:12:30',
        },
      };
    }

    // 2. Try selected protocol or Auto-Detect
    const proto = options.protocol || 'auto';

    // Auto Detection Pipeline:
    // A. If port is 80 or 443 or proto is rest -> try REST API
    // B. If port is 8728 or 8729 or proto is api_binary -> try Binary API
    // C. If auto -> try REST API first, then Binary API 8728

    const errors: string[] = [];

    // Attempt REST API
    if (proto === 'auto' || proto === 'rest_http' || proto === 'rest_https') {
      try {
        const restProto = proto === 'rest_https' || options.useSsl ? 'rest_https' : 'rest_http';
        const restPort = options.port || (restProto === 'rest_https' ? 443 : 80);

        const [resInfo, identInfo] = await Promise.all([
          fetchRestApi({ ...options, protocol: restProto, port: restPort }, '/system/resource'),
          fetchRestApi({ ...options, protocol: restProto, port: restPort }, '/system/identity').catch(() => ({ name: 'MikroTik' })),
        ]);

        const latencyMs = Date.now() - startTime;
        const identity = Array.isArray(identInfo) ? identInfo[0]?.name : identInfo?.name || 'MikroTik';
        const resource = Array.isArray(resInfo) ? resInfo[0] : resInfo;

        return {
          success: true,
          protocolUsed: `RouterOS v7 REST API (${restProto === 'rest_https' ? 'HTTPS' : 'HTTP'}:${restPort})`,
          version: resource?.version || 'RouterOS v7',
          identity,
          latencyMs,
          details: resource,
        };
      } catch (err: any) {
        errors.push(`REST API (${options.host}:${options.port || 80}): ${err.message}`);
        if (proto !== 'auto') {
          return {
            success: false,
            protocolUsed: 'RouterOS REST API',
            latencyMs: Date.now() - startTime,
            details: null,
            diagnostics: `فشل الاتصال عبر REST API: ${err.message}. تأكد من تفعيل خدمة www في /ip service وضبط الصلاحيات.`,
          };
        }
      }
    }

    // Attempt Native Binary API (Port 8728 / 8729)
    if (proto === 'auto' || proto === 'api_binary' || proto === 'api_ssl') {
      const apiPort = options.port || (proto === 'api_ssl' || options.useSsl ? 8729 : 8728);
      const useSsl = proto === 'api_ssl' || options.useSsl || apiPort === 8729;
      const client = new RouterOSBinaryClient(options.host, apiPort, useSsl, options.timeoutMs || 5000);

      try {
        await client.connect();
        await client.login(options.username, options.password || '');

        const [resPrint, identPrint] = await Promise.all([
          client.sendSentence(['/system/resource/print']),
          client.sendSentence(['/system/identity/print']).catch(() => []),
        ]);

        client.close();

        const latencyMs = Date.now() - startTime;
        const resource = resPrint[0] || {};
        const identity = identPrint[0]?.['name'] || 'MikroTik';

        return {
          success: true,
          protocolUsed: `MikroTik Binary API (${useSsl ? 'API-SSL' : 'API'}:${apiPort})`,
          version: resource['version'] || 'RouterOS',
          identity,
          latencyMs,
          details: resource,
        };
      } catch (err: any) {
        client.close();
        errors.push(`Binary API (${options.host}:${apiPort}): ${err.message}`);
        if (proto !== 'auto') {
          return {
            success: false,
            protocolUsed: 'RouterOS Binary API',
            latencyMs: Date.now() - startTime,
            details: null,
            diagnostics: `فشل الاتصال عبر منفذ API (${apiPort}): ${err.message}. تأكد من تفعيل الخدمة في المايكروتك بالأمر: /ip service set api disabled=no port=${apiPort}`,
          };
        }
      }
    }

    // If both failed in Auto mode
    const isPrivate = isPrivateIp(options.host);
    const privateIpGuidance = isPrivate
      ? `\n\n💡 ملاحظة هامة حول عنوان الشبكة المحلية (${options.host}):\n` +
        `هذا العنوان ينتمي لنطاق الشبكة الداخلية (LAN/Private IP). للوصول إلى راوترك عبر الإنترنت:\n` +
        `• يمكنك تفعيل ميزة MikroTik Cloud DDNS المجانية من الراوتر: /ip cloud set ddns-enabled=yes ثم نسخ اسم النطاق الظاهر (مثل: xxx.sn.mynetname.net).\n` +
        `• أو تفعيل وضع المحاكاة الافتراضي (Demo Mode) بكتابة "demo" لتجربة كافة لوحات التحكم والرسوم البيانية وتوليد الكروت فوراً دون راوتر.`
      : '';

    return {
      success: false,
      protocolUsed: 'Auto-Detect',
      latencyMs: Date.now() - startTime,
      details: null,
      diagnostics: `تعذر الاتصال بالمايكروتك على ${options.host}:${options.port || '8728'}.\nتفاصيل المحاولات:\n` +
        errors.map(e => `• ${e}`).join('\n') +
        `\n\nخطوات التهيئة في راوتر مايكروتك (WinBox -> New Terminal):\n` +
        `1. تفعيل منفذ API: /ip service set api disabled=no port=8728\n` +
        `2. تفعيل خدمة الويب REST: /ip service set www disabled=no port=80\n` +
        `3. التأكد من فتح الفايروول: /ip firewall filter add chain=input action=accept dst-port=8728,8729,80,443 protocol=tcp place-before=1` +
        privateIpGuidance,
    };
  }

  // Fetch Comprehensive System Status
  public static async getSystemInfo(options: MikroTikConnectionOptions): Promise<RouterSystemInfo> {
    // If demo mode
    if (options.protocol === 'demo' || options.host === 'demo') {
      const cpuRandom = Math.floor(10 + Math.random() * 25);
      return {
        identity: 'MikroTik-CloudCore-Demo',
        version: '7.14.3 (stable)',
        model: 'CCR2004-16G-2S+',
        platform: 'MikroTik RouterOS',
        uptime: '23d 11:42:05',
        cpuLoad: cpuRandom,
        cpuCount: 4,
        cpuFrequency: '1700MHz',
        freeMemory: 3120450000,
        totalMemory: 4294967296,
        freeHdd: 120500000,
        totalHdd: 134217728,
        architecture: 'arm64',
        boardName: 'CCR2004-16G-2S+',
        voltage: 24.2,
        temperature: 41,
      };
    }

    const proto = options.protocol || 'auto';

    // Try REST API first if applicable
    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        const [res, ident] = await Promise.all([
          fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/system/resource'),
          fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/system/identity').catch(() => ({ name: 'MikroTik' })),
        ]);

        const r = Array.isArray(res) ? res[0] : res;
        const id = Array.isArray(ident) ? ident[0]?.name : ident?.name || 'MikroTik';

        return {
          identity: id,
          version: r['version'] || 'RouterOS v7',
          model: r['board-name'] || r['model'] || 'RouterBOARD',
          platform: r['platform'] || 'MikroTik',
          uptime: r['uptime'] || '0s',
          cpuLoad: Number(r['cpu-load']) || 0,
          cpuCount: Number(r['cpu-count']) || 1,
          cpuFrequency: r['cpu-frequency'] ? `${r['cpu-frequency']}MHz` : undefined,
          freeMemory: Number(r['free-memory']) || 0,
          totalMemory: Number(r['total-memory']) || 0,
          freeHdd: Number(r['free-hdd-space']) || 0,
          totalHdd: Number(r['total-hdd-space']) || 0,
          architecture: r['architecture-name'] || 'unknown',
          boardName: r['board-name'] || 'MikroTik',
        };
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API fallback
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    const [resPrint, identPrint] = await Promise.all([
      client.sendSentence(['/system/resource/print']),
      client.sendSentence(['/system/identity/print']).catch(() => []),
    ]);

    client.close();

    const r = resPrint[0] || {};
    const id = identPrint[0]?.['name'] || 'MikroTik';

    return {
      identity: id,
      version: r['version'] || 'RouterOS v6',
      model: r['board-name'] || r['model'] || 'RouterBOARD',
      platform: r['platform'] || 'MikroTik',
      uptime: r['uptime'] || '0s',
      cpuLoad: Number(r['cpu-load']) || 0,
      cpuCount: Number(r['cpu-count']) || 1,
      cpuFrequency: r['cpu-frequency'] ? `${r['cpu-frequency']}MHz` : undefined,
      freeMemory: Number(r['free-memory']) || 0,
      totalMemory: Number(r['total-memory']) || 0,
      freeHdd: Number(r['free-hdd-space']) || 0,
      totalHdd: Number(r['total-hdd-space']) || 0,
      architecture: r['architecture-name'] || 'unknown',
      boardName: r['board-name'] || 'MikroTik',
    };
  }

  // Fetch Active Hotspot Users
  public static async getActiveHotspotUsers(options: MikroTikConnectionOptions): Promise<HotspotActiveUser[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return [
        {
          id: '*1',
          user: '849201',
          address: '10.0.0.154',
          macAddress: 'DC:A6:32:8B:11:4F',
          uptime: '1h 24m 10s',
          idleTime: '12s',
          bytesIn: 45200000, // 43 MB upload
          bytesOut: 489000000, // 466 MB download
          packetsIn: 32000,
          packetsOut: 450000,
          loginBy: 'http-chap',
          comment: 'كارت 200 ريال',
          server: 'hotspot1',
          rateLimit: '4M/2M',
        },
        {
          id: '*2',
          user: '772910',
          address: '10.0.0.182',
          macAddress: '48:5F:99:1C:33:AA',
          uptime: '45m 02s',
          idleTime: '4s',
          bytesIn: 12500000,
          bytesOut: 182000000,
          packetsIn: 11000,
          packetsOut: 140000,
          loginBy: 'mac-cookie',
          comment: 'كارت 100 ريال',
          server: 'hotspot1',
          rateLimit: '3M/1M',
        },
        {
          id: '*3',
          user: '993412',
          address: '10.0.0.201',
          macAddress: 'BC:D0:74:6E:9A:02',
          uptime: '3h 10m 50s',
          idleTime: '2m 15s',
          bytesIn: 180000000,
          bytesOut: 1650000000, // 1.5 GB
          packetsIn: 120000,
          packetsOut: 1400000,
          loginBy: 'http-chap',
          comment: 'كارت 500 ريال',
          server: 'hotspot1',
          rateLimit: '6M/3M',
        },
        {
          id: '*4',
          user: '102948',
          address: '10.0.0.95',
          macAddress: 'F0:18:98:C3:7E:5B',
          uptime: '12m 44s',
          idleTime: '1s',
          bytesIn: 8400000,
          bytesOut: 75000000,
          packetsIn: 6000,
          packetsOut: 55000,
          loginBy: 'http-chap',
          comment: 'كارت 100 ريال',
          server: 'hotspot1',
          rateLimit: '4M/2M',
        },
        {
          id: '*5',
          user: 'admin_wifi',
          address: '10.0.0.2',
          macAddress: '00:E0:4C:68:01:34',
          uptime: '2d 08h 15m',
          idleTime: '0s',
          bytesIn: 890000000,
          bytesOut: 5400000000,
          packetsIn: 650000,
          packetsOut: 4800000,
          loginBy: 'mac',
          comment: 'إدارة الشبكة',
          server: 'hotspot1',
          rateLimit: 'Unlimited',
        },
      ];
    }

    const proto = options.protocol || 'auto';

    // Try REST API
    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        const data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/ip/hotspot/active');
        const list = Array.isArray(data) ? data : [data];

        return list.filter(item => item && (item.user || item.address)).map(item => ({
          id: item['.id'] || item.id || item.user,
          user: item.user || 'Unknown',
          address: item.address || '',
          macAddress: item['mac-address'] || item.macAddress || '',
          uptime: item.uptime || '0s',
          idleTime: item['idle-time'] || item.idleTime,
          sessionTimeLeft: item['session-time-left'],
          bytesIn: Number(item['bytes-in']) || 0,
          bytesOut: Number(item['bytes-out']) || 0,
          packetsIn: Number(item['packets-in']) || 0,
          packetsOut: Number(item['packets-out']) || 0,
          loginBy: item['login-by'] || item.loginBy,
          comment: item.comment,
          server: item.server,
          radius: item.radius === 'true' || item.radius === true,
        }));
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    const users = await client.sendSentence(['/ip/hotspot/active/print']);
    client.close();

    return users.filter(u => u && (u['name'] || u['username'])).map(item => ({
      id: item['.id'] || item['user'],
      user: item['user'] || 'Unknown',
      address: item['address'] || '',
      macAddress: item['mac-address'] || '',
      uptime: item['uptime'] || '0s',
      idleTime: item['idle-time'],
      sessionTimeLeft: item['session-time-left'],
      bytesIn: Number(item['bytes-in']) || 0,
      bytesOut: Number(item['bytes-out']) || 0,
      packetsIn: Number(item['packets-in']) || 0,
      packetsOut: Number(item['packets-out']) || 0,
      loginBy: item['login-by'],
      comment: item['comment'],
      server: item['server'],
      radius: item['radius'] === 'true',
    }));
  }

  // Fetch Connected Hotspot Hosts & DHCP Leases
  public static async getConnectedHosts(options: MikroTikConnectionOptions): Promise<{
    hosts: HotspotHost[];
    leases: DhcpLease[];
  }> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return {
        hosts: [
          { id: '*h1', address: '10.0.0.154', macAddress: 'DC:A6:32:8B:11:4F', authorized: true, bypassed: false, bytesIn: 45200000, bytesOut: 489000000, uptime: '1h 24m', bridgePort: 'wlan1' },
          { id: '*h2', address: '10.0.0.182', macAddress: '48:5F:99:1C:33:AA', authorized: true, bypassed: false, bytesIn: 12500000, bytesOut: 182000000, uptime: '45m', bridgePort: 'wlan1' },
          { id: '*h3', address: '10.0.0.210', macAddress: '3C:22:FB:44:91:01', authorized: false, bypassed: false, bytesIn: 85000, bytesOut: 120000, uptime: '8m', idleTime: '3m', bridgePort: 'ether2' },
          { id: '*h4', address: '10.0.0.215', macAddress: '88:66:5A:11:22:33', authorized: false, bypassed: false, bytesIn: 45000, bytesOut: 60000, uptime: '2m', idleTime: '1m', bridgePort: 'wlan2' },
        ],
        leases: [
          { id: '*l1', address: '10.0.0.154', macAddress: 'DC:A6:32:8B:11:4F', server: 'dhcp1', status: 'bound', hostName: 'Samsung-Galaxy-S23' },
          { id: '*l2', address: '10.0.0.182', macAddress: '48:5F:99:1C:33:AA', server: 'dhcp1', status: 'bound', hostName: 'iPhone-14-Pro' },
          { id: '*l3', address: '10.0.0.210', macAddress: '3C:22:FB:44:91:01', server: 'dhcp1', status: 'bound', hostName: 'Xiaomi-Redmi-Note-12' },
          { id: '*l4', address: '10.0.0.215', macAddress: '88:66:5A:11:22:33', server: 'dhcp1', status: 'bound', hostName: 'HONOR-X9b' },
        ],
      };
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        const [hostsData, leasesData] = await Promise.all([
          fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/ip/hotspot/host').catch(() => []),
          fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/ip/dhcp-server/lease').catch(() => []),
        ]);

        const hList = Array.isArray(hostsData) ? hostsData : [hostsData];
        const lList = Array.isArray(leasesData) ? leasesData : [leasesData];

        const hosts: HotspotHost[] = hList.filter(h => h && h.address).map(h => ({
          id: h['.id'] || h.id || h.address,
          address: h.address,
          macAddress: h['mac-address'] || h.macAddress || '',
          authorized: h.authorized === 'true' || h.authorized === true,
          bypassed: h.bypassed === 'true' || h.bypassed === true,
          bytesIn: Number(h['bytes-in']) || 0,
          bytesOut: Number(h['bytes-out']) || 0,
          uptime: h.uptime || '0s',
          idleTime: h['idle-time'] || h.idleTime,
          bridgePort: h['bridge-port'] || h.bridgePort,
          server: h.server,
          comment: h.comment,
        }));

        const leases: DhcpLease[] = lList.filter(l => l && l.address).map(l => ({
          id: l['.id'] || l.id || l.address,
          address: l.address,
          macAddress: l['mac-address'] || l.macAddress || '',
          server: l.server,
          status: l.status || 'bound',
          hostName: l['host-name'] || l.hostName,
          comment: l.comment,
          expiresAfter: l['expires-after'],
        }));

        return { hosts, leases };
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    const [hRes, lRes] = await Promise.all([
      client.sendSentence(['/ip/hotspot/host/print']).catch(() => []),
      client.sendSentence(['/ip/dhcp-server/lease/print']).catch(() => []),
    ]);
    client.close();

    const hosts: HotspotHost[] = hRes.map(h => ({
      id: h['.id'] || h['address'],
      address: h['address'],
      macAddress: h['mac-address'] || '',
      authorized: h['authorized'] === 'true',
      bypassed: h['bypassed'] === 'true',
      bytesIn: Number(h['bytes-in']) || 0,
      bytesOut: Number(h['bytes-out']) || 0,
      uptime: h['uptime'] || '0s',
      idleTime: h['idle-time'],
      bridgePort: h['bridge-port'],
      server: h['server'],
      comment: h['comment'],
    }));

    const leases: DhcpLease[] = lRes.map(l => ({
      id: l['.id'] || l['address'],
      address: l['address'],
      macAddress: l['mac-address'] || '',
      server: l['server'],
      status: l['status'] || 'bound',
      hostName: l['host-name'],
      comment: l['comment'],
      expiresAfter: l['expires-after'],
    }));

    return { hosts, leases };
  }

  // Fetch Comprehensive Mikrotik Sessions (Active Hotspot users + User Manager sessions + DHCP Hostnames)
  public static async getRouterSessions(options: MikroTikConnectionOptions): Promise<{
    sessions: MikrotikCallerSession[];
    activeCount: number;
    summary: {
      totalDownload: number;
      totalUpload: number;
      activeNow: number;
      totalSessions: number;
    };
    routerIdentity?: string;
  }> {
    // If demo mode explicitly requested
    if (options.protocol === 'demo' || options.host === 'demo' || options.host === 'simulation') {
      const now = Date.now();
      const demoList: MikrotikCallerSession[] = [
        {
          id: '*1',
          user: '849201',
          address: '10.0.0.154',
          macAddress: 'DC:A6:32:8B:11:4F',
          hostName: 'Samsung-Galaxy-S23',
          source: 'hotspot',
          loginTime: new Date(now - 5040 * 1000).toISOString(),
          logoutTime: null,
          uptime: '1h 24m',
          sessionTimeLeft: '4h 36m',
          downloadBytes: 489000000,
          uploadBytes: 45200000,
          packetsIn: 32000,
          packetsOut: 450000,
          loginBy: 'http-chap',
          server: 'hotspot1',
          comment: 'كارت 200 ريال',
          isActive: true,
        },
        {
          id: '*2',
          user: '772910',
          address: '10.0.0.182',
          macAddress: '48:5F:99:1C:33:AA',
          hostName: 'iPhone-14-Pro',
          source: 'hotspot',
          loginTime: new Date(now - 2700 * 1000).toISOString(),
          logoutTime: null,
          uptime: '45m',
          sessionTimeLeft: '2h 15m',
          downloadBytes: 182000000,
          uploadBytes: 12500000,
          packetsIn: 11000,
          packetsOut: 140000,
          loginBy: 'mac-cookie',
          server: 'hotspot1',
          comment: 'كارت 100 ريال',
          isActive: true,
        },
        {
          id: '*3',
          user: '993412',
          address: '10.0.0.201',
          macAddress: 'BC:D0:74:6E:9A:02',
          hostName: 'Xiaomi-Redmi-Note-12',
          source: 'hotspot',
          loginTime: new Date(now - 11400 * 1000).toISOString(),
          logoutTime: null,
          uptime: '3h 10m',
          sessionTimeLeft: '48m',
          downloadBytes: 1650000000,
          uploadBytes: 180000000,
          packetsIn: 120000,
          packetsOut: 1400000,
          loginBy: 'http-chap',
          server: 'hotspot1',
          comment: 'كارت 500 ريال',
          isActive: true,
        },
      ];

      return {
        sessions: demoList,
        activeCount: demoList.length,
        summary: {
          totalDownload: demoList.reduce((acc, s) => acc + s.downloadBytes, 0),
          totalUpload: demoList.reduce((acc, s) => acc + s.uploadBytes, 0),
          activeNow: demoList.length,
          totalSessions: demoList.length,
        },
        routerIdentity: 'MikroTik-Demo',
      };
    }

    // REAL ROUTER: Fetch strictly live callers from router
    const sessions: MikrotikCallerSession[] = [];
    const seenKeys = new Set<string>();

    // 1. Fetch live active hotspot callers
    let activeUsers: HotspotActiveUser[] = [];
    try {
      activeUsers = await this.getActiveHotspotUsers(options);
    } catch (e: any) {
      console.warn('[MikroTik Sessions] getActiveHotspotUsers notice:', e.message);
    }

    // 2. Fetch connected hosts & DHCP leases to resolve device hostnames
    const macToHost = new Map<string, string>();
    const ipToHost = new Map<string, string>();
    try {
      const connected = await this.getConnectedHosts(options);
      if (connected.leases) {
        for (const l of connected.leases) {
          if (l.hostName) {
            if (l.macAddress) macToHost.set(l.macAddress.toUpperCase().trim(), l.hostName);
            if (l.address) ipToHost.set(l.address.trim(), l.hostName);
          }
        }
      }
    } catch (e: any) {
      console.warn('[MikroTik Sessions] getConnectedHosts notice:', e.message);
    }

    // Process real active hotspot callers
    const nowMs = Date.now();
    for (const u of activeUsers) {
      const macClean = (u.macAddress || '').toUpperCase().trim();
      const ipClean = (u.address || '').trim();
      const hostName = macToHost.get(macClean) || ipToHost.get(ipClean) || undefined;
      const durSec = parseDurationToSeconds(u.uptime);
      const loginTime = durSec > 0 ? new Date(nowMs - durSec * 1000).toISOString() : new Date().toISOString();

      const key = `${u.user}_${u.address || u.macAddress}`;
      seenKeys.add(key);

      sessions.push({
        id: u.id || `active-${u.user}-${u.address}`,
        user: u.user,
        address: u.address,
        macAddress: u.macAddress,
        hostName,
        source: 'hotspot',
        loginTime,
        logoutTime: null,
        uptime: u.uptime || '0s',
        idleTime: u.idleTime,
        sessionTimeLeft: u.sessionTimeLeft,
        downloadBytes: u.bytesOut || 0,
        uploadBytes: u.bytesIn || 0,
        packetsIn: u.packetsIn,
        packetsOut: u.packetsOut,
        loginBy: u.loginBy,
        server: u.server,
        comment: u.comment,
        rateLimit: u.rateLimit,
        isActive: true,
      });
    }

    // 3. Try to fetch User Manager sessions (active and historical) if available
    const proto = options.protocol || 'auto';
    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      const isHttps = proto === 'rest_https' || options.useSsl;
      const port = options.port || (isHttps ? 443 : 80);
      try {
        let umData: any[] = [];
        try {
          const res = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/session');
          umData = Array.isArray(res) ? res : (res ? [res] : []);
        } catch {
          try {
            const res = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/session');
            umData = Array.isArray(res) ? res : (res ? [res] : []);
          } catch {}
        }

        for (const s of umData) {
          if (!s || (!s.user && !s['user'])) continue;
          const user = s.user || s['user'];
          const mac = (s['calling-station-id'] || s.callingStationId || s['user-mac'] || '').toUpperCase().trim();
          const ip = s['host-ip'] || s.hostIp || s['user-ip'] || s.address || '';
          const key = `${user}_${ip || mac}`;

          const isActive = s.active === 'true' || s.active === true || s['active'] === 'yes';
          if (isActive && seenKeys.has(key)) {
            continue;
          }

          const fromTime = s['from-time'] || s.fromTime;
          const tillTime = s['till-time'] || s.tillTime;
          const uptime = s.uptime || s['uptime'] || '0s';
          const download = Number(s.download || s['download'] || s['bytes-out']) || 0;
          const upload = Number(s.upload || s['upload'] || s['bytes-in']) || 0;
          const hostName = macToHost.get(mac) || ipToHost.get(ip) || undefined;

          sessions.push({
            id: s['.id'] || s.id || `um-${user}-${s['from-time'] || Math.random()}`,
            user,
            address: ip,
            macAddress: mac,
            hostName,
            source: 'user-manager',
            loginTime: fromTime ? parseRouterOSDate(fromTime, nowMs - parseDurationToSeconds(uptime) * 1000) : new Date(nowMs - parseDurationToSeconds(uptime) * 1000).toISOString(),
            logoutTime: isActive ? null : (tillTime ? parseRouterOSDate(tillTime) : new Date().toISOString()),
            uptime,
            downloadBytes: download,
            uploadBytes: upload,
            terminateCause: s['terminate-cause'] || s.terminateCause,
            isActive,
          });
        }
      } catch {}
    } else if (proto === 'api_binary' || proto === 'api_ssl') {
      try {
        const apiPort = options.port || (options.useSsl ? 8729 : 8728);
        const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 4000);
        await client.connect();
        await client.login(options.username, options.password || '');

        let umRes: any[] = [];
        try {
          umRes = await client.sendSentence(['/user-manager/session/print']);
        } catch {
          try {
            umRes = await client.sendSentence(['/tool/user-manager/session/print']);
          } catch {}
        }
        client.close();

        for (const s of umRes) {
          if (!s || !s['user']) continue;
          const user = s['user'];
          const mac = (s['calling-station-id'] || s['user-mac'] || '').toUpperCase().trim();
          const ip = s['host-ip'] || s['user-ip'] || s['address'] || '';
          const key = `${user}_${ip || mac}`;
          const isActive = s['active'] === 'true' || s['active'] === 'yes';

          if (isActive && seenKeys.has(key)) continue;

          const uptime = s['uptime'] || '0s';
          const download = Number(s['download'] || s['bytes-out']) || 0;
          const upload = Number(s['upload'] || s['bytes-in']) || 0;
          const fromTime = s['from-time'];
          const tillTime = s['till-time'];
          const hostName = macToHost.get(mac) || ipToHost.get(ip) || undefined;

          sessions.push({
            id: s['.id'] || `um-${user}-${Math.random()}`,
            user,
            address: ip,
            macAddress: mac,
            hostName,
            source: 'user-manager',
            loginTime: fromTime ? parseRouterOSDate(fromTime, nowMs - parseDurationToSeconds(uptime) * 1000) : new Date(nowMs - parseDurationToSeconds(uptime) * 1000).toISOString(),
            logoutTime: isActive ? null : (tillTime ? parseRouterOSDate(tillTime) : new Date().toISOString()),
            uptime,
            downloadBytes: download,
            uploadBytes: upload,
            terminateCause: s['terminate-cause'],
            isActive,
          });
        }
      } catch {}
    }

    // Sort: Active users first, then by loginTime desc
    sessions.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime();
    });

    const activeNow = sessions.filter(s => s.isActive).length;
    const totalDownload = sessions.reduce((acc, s) => acc + (s.downloadBytes || 0), 0);
    const totalUpload = sessions.reduce((acc, s) => acc + (s.uploadBytes || 0), 0);

    return {
      sessions,
      activeCount: activeNow,
      summary: {
        totalDownload,
        totalUpload,
        activeNow,
        totalSessions: sessions.length,
      },
    };
  }

  // Fetch Network Interfaces & Live Bandwidth
  public static async getInterfacesTraffic(options: MikroTikConnectionOptions): Promise<RouterInterface[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      const rxSpeed = Math.floor(15000000 + Math.random() * 25000000); // 15 - 40 Mbps
      const txSpeed = Math.floor(3000000 + Math.random() * 8000000); // 3 - 11 Mbps

      return [
        {
          id: '*1',
          name: 'ether1-WAN',
          type: 'ether',
          running: true,
          disabled: false,
          rxByte: 18450200000,
          txByte: 3410200000,
          rxRateBps: rxSpeed,
          txRateBps: txSpeed,
          comment: 'الخط الرئيسي للإنترنت (Fiber / VDSL)',
        },
        {
          id: '*2',
          name: 'bridge-Hotspot',
          type: 'bridge',
          running: true,
          disabled: false,
          rxByte: 3410200000,
          txByte: 18450200000,
          rxRateBps: txSpeed,
          txRateBps: rxSpeed,
          comment: 'شبكة المشتركين والوايرلس',
        },
        {
          id: '*3',
          name: 'ether2-Sector-North',
          type: 'ether',
          running: true,
          disabled: false,
          rxByte: 1200000000,
          txByte: 8500000000,
          rxRateBps: Math.floor(txSpeed * 0.45),
          txRateBps: Math.floor(rxSpeed * 0.45),
          comment: 'بث القطاع الشمالي',
        },
        {
          id: '*4',
          name: 'ether3-Sector-South',
          type: 'ether',
          running: true,
          disabled: false,
          rxByte: 1800000000,
          txByte: 9500000000,
          rxRateBps: Math.floor(txSpeed * 0.55),
          txRateBps: Math.floor(rxSpeed * 0.55),
          comment: 'بث القطاع الجنوبي',
        },
      ];
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        const data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/interface');
        const list = Array.isArray(data) ? data : [data];

        return list.filter(i => i && i.name).map(i => ({
          id: i['.id'] || i.id || i.name,
          name: i.name,
          type: i.type || 'ether',
          running: i.running === 'true' || i.running === true,
          disabled: i.disabled === 'true' || i.disabled === true,
          rxByte: Number(i['rx-byte']) || 0,
          txByte: Number(i['tx-byte']) || 0,
          rxPacket: Number(i['rx-packet']) || 0,
          txPacket: Number(i['tx-packet']) || 0,
          comment: i.comment,
        }));
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    const ifaces = await client.sendSentence(['/interface/print']);
    client.close();

    return ifaces.map(i => ({
      id: i['.id'] || i['name'],
      name: i['name'],
      type: i['type'] || 'ether',
      running: i['running'] === 'true',
      disabled: i['disabled'] === 'true',
      rxByte: Number(i['rx-byte']) || 0,
      txByte: Number(i['tx-byte']) || 0,
      rxPacket: Number(i['rx-packet']) || 0,
      txPacket: Number(i['tx-packet']) || 0,
      comment: i['comment'],
    }));
  }

  // Kick / Disconnect Hotspot User
  public static async kickHotspotUser(options: MikroTikConnectionOptions, userIdOrUser: string): Promise<boolean> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return true;
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        // In RouterOS v7, we can delete or remove active user
        if (userIdOrUser.startsWith('*')) {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/ip/hotspot/active/${encodeURIComponent(userIdOrUser)}`, 'DELETE');
        } else {
          // find id first or remove by user
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/ip/hotspot/active/remove`, 'POST', { numbers: userIdOrUser });
        }
        return true;
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    await client.sendSentence(['/ip/hotspot/active/remove', `=numbers=${userIdOrUser}`]);
    client.close();
    return true;
  }

  // Create Hotspot / User Manager users on MikroTik Router
  public static async createHotspotUsers(
    options: MikroTikConnectionOptions,
    users: Array<{
      name: string;
      password?: string;
      profile?: string;
      limitUptime?: string;
      limitBytesTotal?: number;
      comment?: string;
    }>
  ): Promise<{ success: boolean; createdCount: number; errors?: string[] }> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return { success: true, createdCount: users.length };
    }

    const proto = options.protocol || 'auto';
    let createdCount = 0;
    const errors: string[] = [];

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        for (const user of users) {
          try {
            const body: any = {
              name: user.name,
              password: user.password || user.name,
              profile: user.profile || 'default',
              comment: user.comment || 'Created via POS Web App',
            };
            if (user.limitUptime) body['limit-uptime'] = user.limitUptime;
            if (user.limitBytesTotal) body['limit-bytes-total'] = user.limitBytesTotal;

            await fetchRestApi(
              { ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port },
              '/ip/hotspot/user',
              'PUT',
              body
            );
            createdCount++;
          } catch (itemErr: any) {
            errors.push(`فشل إضافة الكارت ${user.name}: ${itemErr.message}`);
          }
        }
        return { success: createdCount > 0, createdCount, errors: errors.length > 0 ? errors : undefined };
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    for (const user of users) {
      try {
        const words = ['/ip/hotspot/user/add', `=name=${user.name}`, `=password=${user.password || user.name}`, `=profile=${user.profile || 'default'}`];
        if (user.limitUptime) words.push(`=limit-uptime=${user.limitUptime}`);
        if (user.limitBytesTotal) words.push(`=limit-bytes-total=${user.limitBytesTotal}`);
        if (user.comment) words.push(`=comment=${user.comment}`);

        await client.sendSentence(words);
        createdCount++;
      } catch (err: any) {
        errors.push(`فشل إضافة الكارت ${user.name}: ${err.message}`);
      }
    }

    client.close();
    return { success: createdCount > 0, createdCount, errors: errors.length > 0 ? errors : undefined };
  }

  // 8. Fetch Configured Hotspot Users (/ip/hotspot/user)
  public static async getConfiguredHotspotUsers(options: MikroTikConnectionOptions): Promise<any[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return [
        { id: '*u1', name: '849201', profile: 'Profile-200', limitUptime: '2h', limitBytesTotal: 1073741824, bytesIn: 45200000, bytesOut: 489000000, uptime: '1h 24m', disabled: false, comment: 'كارت 200 ريال' },
        { id: '*u2', name: '772910', profile: 'Profile-100', limitUptime: '1h', limitBytesTotal: 524288000, bytesIn: 12500000, bytesOut: 182000000, uptime: '45m', disabled: false, comment: 'كارت 100 ريال' },
        { id: '*u3', name: '993412', profile: 'Profile-500', limitUptime: '6h', limitBytesTotal: 2147483648, bytesIn: 180000000, bytesOut: 1650000000, uptime: '3h 10m', disabled: false, comment: 'كارت 500 ريال' },
        { id: '*u4', name: '102948', profile: 'Profile-100', limitUptime: '1h', limitBytesTotal: 524288000, bytesIn: 8400000, bytesOut: 75000000, uptime: '12m', disabled: false, comment: 'كارت 100 ريال' },
        { id: '*u5', name: '554433', profile: 'Profile-1000', limitUptime: '12h', limitBytesTotal: 5368709120, bytesIn: 0, bytesOut: 0, uptime: '0s', disabled: false, comment: 'كارت 1000 ريال - غير مستخدم' },
        { id: '*u6', name: 'admin_wifi', profile: 'default', limitUptime: '', limitBytesTotal: 0, bytesIn: 890000000, bytesOut: 5400000000, uptime: '2d 08h', disabled: false, comment: 'إدارة الشبكة' },
      ];
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        const data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/ip/hotspot/user');
        const list = Array.isArray(data) ? data : [data];

        return list.filter(u => u && (u.name || u.username)).map(u => ({
          id: u['.id'] || u.id || u.name || u.username,
          name: u.name || u.username,
          password: u.password,
          profile: u.profile || u.group || 'default',
          limitUptime: u['limit-uptime'] || u.limitUptime,
          limitBytesTotal: Number(u['limit-bytes-total']) || 0,
          bytesIn: Number(u['bytes-in']) || 0,
          bytesOut: Number(u['bytes-out']) || 0,
          uptime: u.uptime || '0s',
          disabled: u.disabled === 'true' || u.disabled === true,
          comment: u.comment,
          email: u.email,
        }));
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    const users = await client.sendSentence(['/ip/hotspot/user/print']);
    client.close();

    return users.filter(u => u && (u['name'] || u['username'])).map(u => ({
      id: u['.id'] || u['name'] || u['username'],
      name: u['name'] || u['username'],
      password: u['password'],
      profile: u['profile'] || u['group'] || 'default',
      limitUptime: u['limit-uptime'],
      limitBytesTotal: Number(u['limit-bytes-total']) || 0,
      bytesIn: Number(u['bytes-in']) || 0,
      bytesOut: Number(u['bytes-out']) || 0,
      uptime: u['uptime'] || '0s',
      disabled: u['disabled'] === 'true',
      comment: u['comment'],
      email: u['email'],
    }));
  }

  // 9. Fetch Hotspot User Profiles (/ip/hotspot/user/profile)
  public static async getHotspotUserProfiles(options: MikroTikConnectionOptions): Promise<any[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return [
        { id: '*p1', name: 'default', rateLimit: '3M/1M', sharedUsers: 1, sessionTimeout: '', idleTimeout: '5m', keepaliveTimeout: '2m', statusAutorefresh: '1m', transparentProxy: false },
        { id: '*p2', name: 'Profile-100', rateLimit: '4M/2M', sharedUsers: 1, sessionTimeout: '', idleTimeout: '5m', keepaliveTimeout: '2m', statusAutorefresh: '1m', transparentProxy: false },
        { id: '*p3', name: 'Profile-200', rateLimit: '5M/2M', sharedUsers: 1, sessionTimeout: '', idleTimeout: '5m', keepaliveTimeout: '2m', statusAutorefresh: '1m', transparentProxy: false },
        { id: '*p4', name: 'Profile-500', rateLimit: '6M/3M', sharedUsers: 1, sessionTimeout: '', idleTimeout: '5m', keepaliveTimeout: '2m', statusAutorefresh: '1m', transparentProxy: false },
        { id: '*p5', name: 'Profile-1000', rateLimit: '8M/4M', sharedUsers: 1, sessionTimeout: '', idleTimeout: '5m', keepaliveTimeout: '2m', statusAutorefresh: '1m', transparentProxy: false },
      ];
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        const data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/ip/hotspot/user/profile');
        const list = Array.isArray(data) ? data : [data];

        return list.filter(p => p && p.name).map(p => ({
          id: p['.id'] || p.id || p.name,
          name: p.name,
          rateLimit: p['rate-limit'] || p.rateLimit,
          sharedUsers: p['shared-users'] || p.sharedUsers || 1,
          sessionTimeout: p['session-timeout'] || p.sessionTimeout,
          idleTimeout: p['idle-timeout'] || p.idleTimeout,
          keepaliveTimeout: p['keepalive-timeout'] || p.keepaliveTimeout,
          statusAutorefresh: p['status-autorefresh'] || p.statusAutorefresh,
          transparentProxy: p['transparent-proxy'] === 'true' || p['transparent-proxy'] === true,
          addressPool: p['address-pool'] || p.addressPool,
          onLogin: p['on-login'] || p.onLogin,
          onLogout: p['on-logout'] || p.onLogout,
        }));
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    const profiles = await client.sendSentence(['/ip/hotspot/user/profile/print']);
    client.close();

    return profiles.map(p => ({
      id: p['.id'] || p['name'],
      name: p['name'],
      rateLimit: p['rate-limit'],
      sharedUsers: p['shared-users'] || 1,
      sessionTimeout: p['session-timeout'],
      idleTimeout: p['idle-timeout'],
      keepaliveTimeout: p['keepalive-timeout'],
      statusAutorefresh: p['status-autorefresh'],
      transparentProxy: p['transparent-proxy'] === 'true',
      addressPool: p['address-pool'],
      onLogin: p['on-login'],
      onLogout: p['on-logout'],
    }));
  }

  // 10. Delete Configured Hotspot User (/ip/hotspot/user/remove)
  public static async deleteHotspotUser(options: MikroTikConnectionOptions, userIdOrName: string): Promise<boolean> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return true;
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        if (userIdOrName.startsWith('*')) {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/ip/hotspot/user/${encodeURIComponent(userIdOrName)}`, 'DELETE');
        } else {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/ip/hotspot/user/remove`, 'POST', { numbers: userIdOrName });
        }
        return true;
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    await client.sendSentence(['/ip/hotspot/user/remove', `=numbers=${userIdOrName}`]);
    client.close();
    return true;
  }

  // 10b. Delete Multiple Hotspot Users (/ip/hotspot/user/remove bulk)
  public static async deleteHotspotUsersBulk(
    options: MikroTikConnectionOptions,
    userIdsOrNames: string[]
  ): Promise<{ success: boolean; deletedCount: number; errors?: string[] }> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return { success: true, deletedCount: userIdsOrNames.length };
    }
    if (!userIdsOrNames || userIdsOrNames.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    let deletedCount = 0;
    const errors: string[] = [];
    for (const id of userIdsOrNames) {
      try {
        const ok = await this.deleteHotspotUser(options, id);
        if (ok) deletedCount++;
      } catch (err: any) {
        errors.push(`${id}: ${err.message}`);
      }
    }

    return {
      success: deletedCount > 0 || errors.length === 0,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // 11. Add / Update Hotspot User Profile (/ip/hotspot/user/profile/add or set)
  public static async saveHotspotUserProfile(
    options: MikroTikConnectionOptions,
    profileData: {
      id?: string;
      name: string;
      rateLimit?: string;
      sharedUsers?: number | string;
      statusAutorefresh?: string;
      idleTimeout?: string;
      sessionTimeout?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return { success: true, message: `تم حفظ بروفايل المستخدم (${profileData.name}) بنجاح (وضع المحاكاة).` };
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        const body: any = {
          name: profileData.name,
        };
        if (profileData.rateLimit) body['rate-limit'] = profileData.rateLimit;
        if (profileData.sharedUsers) body['shared-users'] = String(profileData.sharedUsers);
        if (profileData.statusAutorefresh) body['status-autorefresh'] = profileData.statusAutorefresh;
        if (profileData.idleTimeout) body['idle-timeout'] = profileData.idleTimeout;
        if (profileData.sessionTimeout) body['session-timeout'] = profileData.sessionTimeout;

        if (profileData.id && profileData.id.startsWith('*')) {
          await fetchRestApi(
            { ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port },
            `/ip/hotspot/user/profile/${encodeURIComponent(profileData.id)}`,
            'PATCH',
            body
          );
        } else {
          await fetchRestApi(
            { ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port },
            '/ip/hotspot/user/profile',
            'PUT',
            body
          );
        }
        return { success: true, message: `تم حفظ البروفايل ${profileData.name} بنجاح.` };
      } catch (err: any) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    const words = profileData.id
      ? ['/ip/hotspot/user/profile/set', `=numbers=${profileData.id}`, `=name=${profileData.name}`]
      : ['/ip/hotspot/user/profile/add', `=name=${profileData.name}`];

    if (profileData.rateLimit) words.push(`=rate-limit=${profileData.rateLimit}`);
    if (profileData.sharedUsers) words.push(`=shared-users=${profileData.sharedUsers}`);
    if (profileData.statusAutorefresh) words.push(`=status-autorefresh=${profileData.statusAutorefresh}`);
    if (profileData.idleTimeout) words.push(`=idle-timeout=${profileData.idleTimeout}`);
    if (profileData.sessionTimeout) words.push(`=session-timeout=${profileData.sessionTimeout}`);

    await client.sendSentence(words);
    client.close();
    return { success: true, message: `تم حفظ البروفايل ${profileData.name} بنجاح.` };
  }

  // 12. Remote System Control: Reboot / Shutdown / Execute Command
  public static async executeSystemCommand(
    options: MikroTikConnectionOptions,
    command: 'reboot' | 'shutdown' | 'ping' | 'script',
    extraParams?: Record<string, any>
  ): Promise<{ success: boolean; message: string; output?: any }> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      if (command === 'reboot') {
        return { success: true, message: 'تم إرسال أمر إعادة تشغيل الراوتر (Reboot) بنجاح (وضع المحاكاة).' };
      }
      if (command === 'shutdown') {
        return { success: true, message: 'تم إرسال أمر إيقاف تشغيل الراوتر (Shutdown) بنجاح (وضع المحاكاة).' };
      }
      if (command === 'ping') {
        return {
          success: true,
          message: 'نجح فحص الاتصال (Ping)',
          output: [
            { host: extraParams?.address || '8.8.8.8', size: 56, ttl: 57, time: '22ms', status: 'echo reply' },
            { host: extraParams?.address || '8.8.8.8', size: 56, ttl: 57, time: '19ms', status: 'echo reply' },
            { host: extraParams?.address || '8.8.8.8', size: 56, ttl: 57, time: '21ms', status: 'echo reply' },
            { host: extraParams?.address || '8.8.8.8', size: 56, ttl: 57, time: '20ms', status: 'echo reply' },
          ],
        };
      }
      return { success: true, message: 'تم تنفيذ الأمر بنجاح.' };
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        if (command === 'reboot') {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/system/reboot', 'POST', {});
          return { success: true, message: 'تم إرسال أمر إعادة تشغيل الراوتر بنجاح.' };
        }
        if (command === 'shutdown') {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/system/shutdown', 'POST', {});
          return { success: true, message: 'تم إرسال أمر إيقاف تشغيل الراوتر بنجاح.' };
        }
        if (command === 'ping') {
          const res = await fetchRestApi(
            { ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port },
            '/ping',
            'POST',
            { address: extraParams?.address || '8.8.8.8', count: extraParams?.count || 4 }
          );
          return { success: true, message: 'تم استلام نتائج اختبار Ping بنجاح.', output: res };
        }
      } catch (err: any) {
        if (proto !== 'auto') {
          return { success: false, message: `تعذر تنفيذ الأمر: ${err.message}` };
        }
      }
    }

    // Binary API
    try {
      const apiPort = options.port || (options.useSsl ? 8729 : 8728);
      const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
      await client.connect();
      await client.login(options.username, options.password || '');

      if (command === 'reboot') {
        await client.sendSentence(['/system/reboot']);
        client.close();
        return { success: true, message: 'تم إرسال أمر إعادة تشغيل الراوتر (Reboot) بنجاح.' };
      }
      if (command === 'shutdown') {
        await client.sendSentence(['/system/shutdown']);
        client.close();
        return { success: true, message: 'تم إرسال أمر إيقاف تشغيل الراوتر (Shutdown) بنجاح.' };
      }
      if (command === 'ping') {
        const addr = extraParams?.address || '8.8.8.8';
        const count = extraParams?.count || 4;
        const res = await client.sendSentence(['/ping', `=address=${addr}`, `=count=${count}`]);
        client.close();
        return { success: true, message: 'تم فحص Ping بنجاح.', output: res };
      }

      client.close();
      return { success: true, message: 'تم تنفيذ العملية بنجاح.' };
    } catch (err: any) {
      return { success: false, message: `تعذر تنفيذ العملية عبر Binary API: ${err.message}` };
    }
  }

  // ==========================================
  // USER MANAGER (v4 / v5 / v6 / v7) SUITE
  // ==========================================

  public static demoUMUsers: any[] = [
    { id: '*um1', name: 'UM-88401', password: '482', actualProfile: 'UM-Profile-500', customer: 'admin', uptimeUsed: '5h 15m', downloadUsed: 14500000000, uploadUsed: 1200000000, totalBytes: 15700000000, limitUptime: '1d', limitBytesTotal: 25000000000, disabled: false, comment: 'نقطة البقالة المركزية - فئة 500 ريال' },
    { id: '*um2', name: 'UM-88402', password: '915', actualProfile: 'UM-Profile-100', customer: 'admin', uptimeUsed: '1h 45m', downloadUsed: 8320000000, uploadUsed: 650000000, totalBytes: 8970000000, limitUptime: '3h', limitBytesTotal: 10000000000, disabled: false, comment: 'فئة 100 ريال - صالون الحلاقة' },
    { id: '*um3', name: 'UM-88403', password: '234', actualProfile: 'UM-Profile-200', customer: 'admin', uptimeUsed: '7h 20m', downloadUsed: 21500000000, uploadUsed: 1800000000, totalBytes: 23300000000, limitUptime: '1d', limitBytesTotal: 30000000000, disabled: false, comment: 'فئة 200 ريال - كافيه القدس' },
    { id: '*um4', name: 'UM-88404', password: '776', actualProfile: 'UM-Profile-1000', customer: 'admin', uptimeUsed: '0s', downloadUsed: 0, uploadUsed: 0, totalBytes: 0, limitUptime: '3d', limitBytesTotal: 50000000000, disabled: false, comment: 'فئة 1000 ريال - كارت جديد لم يُستخدم' },
    { id: '*um5', name: 'UM-88405', password: '601', actualProfile: 'UM-Profile-500', customer: 'admin', uptimeUsed: '23h 59m', downloadUsed: 12400000000, uploadUsed: 980000000, totalBytes: 13380000000, limitUptime: '1d', limitBytesTotal: 15000000000, disabled: true, comment: 'فئة 500 ريال - منتهي الصلاحية' },
    { id: '*um6', name: 'UM-88406', password: '319', actualProfile: 'UM-Profile-200', customer: 'admin', uptimeUsed: '3h 10m', downloadUsed: 4200000000, uploadUsed: 350000000, totalBytes: 4550000000, limitUptime: '1d', limitBytesTotal: 10000000000, disabled: false, comment: 'فئة 200 ريال - صيدلية الشفاء' },
  ];

  public static demoUMSessions: any[] = [];

  // 13. Get User Manager Users / Vouchers
  public static async getUserManagerUsers(options: MikroTikConnectionOptions): Promise<any[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return [...MikroTikService.demoUMUsers];
    }

    const proto = options.protocol || 'auto';

    // Try REST API (v7 /user-manager/user or v6 /tool/user-manager/user)
    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        let data: any = null;
        try {
          data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/user');
        } catch {
          data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/user');
        }

        const list = Array.isArray(data) ? data : [data];
        return list.filter(u => u && (u.name || u.username)).map(u => ({
          id: u['.id'] || u.id || u.name || u.username,
          name: u.name || u.username,
          password: u.password,
          actualProfile: u['actual-profile'] || u.actualProfile || u.profile || u.group || 'default',
          customer: u.customer || 'admin',
          uptimeUsed: u['uptime-used'] || u.uptimeUsed || u.uptime || '0s',
          downloadUsed: Number(u['download-used'] || u.downloadUsed || u['bytes-out']) || 0,
          uploadUsed: Number(u['upload-used'] || u.uploadUsed || u['bytes-in']) || 0,
          totalBytes: (Number(u['download-used'] || u['bytes-out']) || 0) + (Number(u['upload-used'] || u['bytes-in']) || 0),
          limitUptime: u['limit-uptime'] || u.limitUptime || u['uptime-limit'],
          limitBytesTotal: Number(u['limit-bytes-total'] || u.limitBytesTotal || u['download-limit']) || 0,
          disabled: u.disabled === 'true' || u.disabled === true,
          comment: u.comment,
          sharedUsers: Number(u['shared-users'] || u.sharedUsers) || 1,
        }));
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    let users: any[] = [];
    try {
      users = await client.sendSentence(['/user-manager/user/print']);
    } catch {
      users = await client.sendSentence(['/tool/user-manager/user/print']);
    }
    client.close();

    return users.filter(u => u && (u['name'] || u['username'])).map(u => ({
      id: u['.id'] || u['name'] || u['username'],
      name: u['name'] || u['username'],
      password: u['password'],
      actualProfile: u['actual-profile'] || u['profile'] || u['group'] || 'default',
      customer: u['customer'] || 'admin',
      uptimeUsed: u['uptime-used'] || u['uptime'] || '0s',
      downloadUsed: Number(u['download-used'] || u['bytes-out']) || 0,
      uploadUsed: Number(u['upload-used'] || u['bytes-in']) || 0,
      totalBytes: (Number(u['download-used'] || u['bytes-out']) || 0) + (Number(u['upload-used'] || u['bytes-in']) || 0),
      limitUptime: u['limit-uptime'] || u['uptime-limit'],
      limitBytesTotal: Number(u['limit-bytes-total'] || u['download-limit']) || 0,
      disabled: u['disabled'] === 'true',
      comment: u['comment'],
      sharedUsers: Number(u['shared-users']) || 1,
    }));
  }

  // Mutable Demo Storage for User Manager Profiles & Limitations
  private static demoUMProfiles: any[] = [
    { id: '*ump1', name: 'UM-Profile-100', nameForUsers: 'كارت 100 ريال (1 ساعة / 500 ميجا)', price: 100, validity: '1d', startsAt: 'logon', overrideSharedUsers: 1, owner: 'admin' },
    { id: '*ump2', name: 'UM-Profile-200', nameForUsers: 'كارت 200 ريال (3 ساعات / 1.5 جيجا)', price: 200, validity: '2d', startsAt: 'logon', overrideSharedUsers: 1, owner: 'admin' },
    { id: '*ump3', name: 'UM-Profile-500', nameForUsers: 'كارت 500 ريال (24 ساعة / 3.5 جيجا)', price: 500, validity: '3d', startsAt: 'logon', overrideSharedUsers: 1, owner: 'admin' },
    { id: '*ump4', name: 'UM-Profile-1000', nameForUsers: 'كارت 1000 ريال (3 أيام / 8 جيجا)', price: 1000, validity: '5d', startsAt: 'logon', overrideSharedUsers: 1, owner: 'admin' },
  ];

  private static demoUMLimitations: any[] = [
    { id: '*lim1', name: 'UM-Lim-100', uptimeLimit: '1h', downloadLimit: '500M', rateLimitRx: '2M', rateLimitTx: '4M' },
    { id: '*lim2', name: 'UM-Lim-200', uptimeLimit: '3h', downloadLimit: '1500M', rateLimitRx: '2M', rateLimitTx: '5M' },
    { id: '*lim3', name: 'UM-Lim-500', uptimeLimit: '1d', downloadLimit: '3500M', rateLimitRx: '3M', rateLimitTx: '6M' },
    { id: '*lim4', name: 'UM-Lim-1000', uptimeLimit: '3d', downloadLimit: '8G', rateLimitRx: '4M', rateLimitTx: '8M' },
  ];

  // 14. Get User Manager Profiles
  public static async getUserManagerProfiles(options: MikroTikConnectionOptions): Promise<any[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return [...MikroTikService.demoUMProfiles];
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        let data: any = null;
        try {
          data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/profile');
        } catch {
          data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/profile');
        }

        const list = Array.isArray(data) ? data : [data];
        return list.filter(p => p && p.name).map(p => ({
          id: p['.id'] || p.id || p.name,
          name: p.name,
          nameForUsers: p['name-for-users'] || p.nameForUsers || p.name,
          price: Number(p.price) || 0,
          validity: p.validity || '',
          startsAt: p['starts-at'] || p.startsAt || 'logon',
          overrideSharedUsers: p['override-shared-users'] || p.overrideSharedUsers || 1,
          owner: p.owner || 'admin',
        }));
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    let profiles: any[] = [];
    try {
      profiles = await client.sendSentence(['/user-manager/profile/print']);
    } catch {
      profiles = await client.sendSentence(['/tool/user-manager/profile/print']);
    }
    client.close();

    return profiles.map(p => ({
      id: p['.id'] || p['name'],
      name: p['name'],
      nameForUsers: p['name-for-users'] || p['name'],
      price: Number(p['price']) || 0,
      validity: p['validity'] || '',
      startsAt: p['starts-at'] || 'logon',
      overrideSharedUsers: p['override-shared-users'] || 1,
      owner: p['owner'] || 'admin',
    }));
  }

  // 15. Get User Manager Limitations
  public static async getUserManagerLimitations(options: MikroTikConnectionOptions): Promise<any[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return [...MikroTikService.demoUMLimitations];
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        let data: any = null;
        try {
          data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/limitation');
        } catch {
          data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/limitation');
        }

        const list = Array.isArray(data) ? data : [data];
        return list.filter(l => l && l.name).map(l => ({
          id: l['.id'] || l.id || l.name,
          name: l.name,
          uptimeLimit: l['uptime-limit'] || l.uptimeLimit,
          downloadLimit: l['download-limit'] || l.downloadLimit,
          uploadLimit: l['upload-limit'] || l.uploadLimit,
          totalLimit: l['total-limit'] || l.totalLimit,
          rateLimitRx: l['rate-limit-rx'] || l.rateLimitRx,
          rateLimitTx: l['rate-limit-tx'] || l.rateLimitTx,
        }));
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    let lims: any[] = [];
    try {
      lims = await client.sendSentence(['/user-manager/limitation/print']);
    } catch {
      lims = await client.sendSentence(['/tool/user-manager/limitation/print']);
    }
    client.close();

    return lims.map(l => ({
      id: l['.id'] || l['name'],
      name: l['name'],
      uptimeLimit: l['uptime-limit'],
      downloadLimit: l['download-limit'],
      uploadLimit: l['upload-limit'],
      totalLimit: l['total-limit'],
      rateLimitRx: l['rate-limit-rx'],
      rateLimitTx: l['rate-limit-tx'],
    }));
  }

  // 16. Get User Manager Routers / NAS
  public static async getUserManagerRouters(options: MikroTikConnectionOptions): Promise<any[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return [
        { id: '*r1', name: 'LocalHotspot', ipAddress: '127.0.0.1', sharedSecret: '123456', log: 'auth-fail', disabled: false },
        { id: '*r2', name: 'AP-West-Station', ipAddress: '192.168.88.2', sharedSecret: 'radius123', log: '', disabled: false },
      ];
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        let data: any = null;
        try {
          data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/router');
        } catch {
          data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/router');
        }

        const list = Array.isArray(data) ? data : [data];
        return list.filter(r => r && r.name).map(r => ({
          id: r['.id'] || r.id || r.name,
          name: r.name,
          ipAddress: r['ip-address'] || r.ipAddress || r.address || '127.0.0.1',
          sharedSecret: r['shared-secret'] || r.sharedSecret || '******',
          log: r.log,
          disabled: r.disabled === 'true' || r.disabled === true,
        }));
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    let routers: any[] = [];
    try {
      routers = await client.sendSentence(['/user-manager/router/print']);
    } catch {
      routers = await client.sendSentence(['/tool/user-manager/router/print']);
    }
    client.close();

    return routers.map(r => ({
      id: r['.id'] || r['name'],
      name: r['name'],
      ipAddress: r['ip-address'] || r['address'] || '127.0.0.1',
      sharedSecret: r['shared-secret'] || '******',
      log: r['log'],
      disabled: r['disabled'] === 'true',
    }));
  }

  // 17. Batch Create Users in User Manager
  public static async createUserManagerUsersBatch(
    options: MikroTikConnectionOptions,
    cards: Array<{
      username: string;
      password?: string;
      profile: string;
      customer?: string;
      comment?: string;
    }>
  ): Promise<{ success: boolean; createdCount: number; errors?: string[] }> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return { success: true, createdCount: cards.length };
    }

    let createdCount = 0;
    const errors: string[] = [];
    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        for (const card of cards) {
          try {
            // Check if v7 or v6 endpoint
            const bodyV7: Record<string, any> = {
              name: card.username,
              profile: card.profile || 'default',
              comment: card.comment || 'POS Batch',
            };
            if (card.password !== undefined && card.password !== '') {
              bodyV7.password = card.password;
            }

            try {
              await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/user', 'PUT', bodyV7);
            } catch {
              const bodyV6 = {
                customer: card.customer || 'admin',
                username: card.username,
                password: card.password || '',
                'actual-profile': card.profile,
                comment: card.comment,
              };
              await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/user', 'PUT', bodyV6);
            }
            createdCount++;
          } catch (err: any) {
            errors.push(`فشل إضافة الكارت ${card.username}: ${err.message}`);
          }
        }

        return { success: createdCount > 0, createdCount, errors: errors.length > 0 ? errors : undefined };
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    for (const card of cards) {
      try {
        // Try v7 user-manager syntax first
        try {
          const words = [
            '/user-manager/user/add',
            `=name=${card.username}`,
            `=comment=${card.comment || 'POS Batch'}`,
          ];
          if (card.password) words.push(`=password=${card.password}`);
          if (card.profile) words.push(`=profile=${card.profile}`);
          await client.sendSentence(words);
        } catch {
          // Fallback to v6 /tool/user-manager/user/add
          const wordsV6 = [
            '/tool/user-manager/user/add',
            `=customer=${card.customer || 'admin'}`,
            `=username=${card.username}`,
            `=password=${card.password || ''}`,
          ];
          if (card.comment) wordsV6.push(`=comment=${card.comment}`);
          await client.sendSentence(wordsV6);

          if (card.profile) {
            try {
              await client.sendSentence([
                '/tool/user-manager/user/create-and-activate-profile',
                `=numbers=${card.username}`,
                `=profile=${card.profile}`,
                `=customer=${card.customer || 'admin'}`,
              ]);
            } catch {
              // Ignore if profile already active
            }
          }
        }
        createdCount++;
      } catch (err: any) {
        errors.push(`فشل إضافة الكارت ${card.username}: ${err.message}`);
      }
    }

    client.close();
    return { success: createdCount > 0, createdCount, errors: errors.length > 0 ? errors : undefined };
  }

  // 18. Save User Manager Profile & Limitation
  public static async saveUserManagerProfile(
    options: MikroTikConnectionOptions,
    payload: {
      profileName: string;
      limitationName?: string;
      nameForUsers?: string;
      price?: number;
      validityDays?: number | string;
      uptimeLimit?: string;
      quotaLimit?: string;
      rateLimit?: string;
      startsAt?: string;
      routerOsVersion?: 'v6' | 'v7';
    }
  ): Promise<{ success: boolean; message: string }> {
    const limName = payload.limitationName || `Lim-${payload.profileName}`;
    const rx = payload.rateLimit ? (payload.rateLimit.split('/')[1] || '2M') : '2M';
    const tx = payload.rateLimit ? (payload.rateLimit.split('/')[0] || '4M') : '4M';

    if (options.protocol === 'demo' || options.host === 'demo') {
      // Upsert in demo memory
      const existingProfIndex = MikroTikService.demoUMProfiles.findIndex(
        p => p.name === payload.profileName || p.id === payload.profileName
      );
      const updatedProfile = {
        id: existingProfIndex >= 0 ? MikroTikService.demoUMProfiles[existingProfIndex].id : `*ump_${Date.now()}`,
        name: payload.profileName,
        nameForUsers: payload.nameForUsers || payload.profileName,
        price: Number(payload.price) || 0,
        validity: payload.validityDays ? `${payload.validityDays}d` : '1d',
        startsAt: payload.startsAt || 'logon',
        overrideSharedUsers: 1,
        owner: 'admin',
      };

      if (existingProfIndex >= 0) {
        MikroTikService.demoUMProfiles[existingProfIndex] = updatedProfile;
      } else {
        MikroTikService.demoUMProfiles.push(updatedProfile);
      }

      const existingLimIndex = MikroTikService.demoUMLimitations.findIndex(
        l => l.name === limName || l.name === `Lim-${payload.profileName}`
      );
      const updatedLim = {
        id: existingLimIndex >= 0 ? MikroTikService.demoUMLimitations[existingLimIndex].id : `*lim_${Date.now()}`,
        name: limName,
        uptimeLimit: payload.uptimeLimit || '1d',
        downloadLimit: payload.quotaLimit || '1000M',
        rateLimitRx: rx,
        rateLimitTx: tx,
      };

      if (existingLimIndex >= 0) {
        MikroTikService.demoUMLimitations[existingLimIndex] = updatedLim;
      } else {
        MikroTikService.demoUMLimitations.push(updatedLim);
      }

      return {
        success: true,
        message: `تم ${existingProfIndex >= 0 ? 'تحديث' : 'إنشاء'} بروفايل User Manager (${payload.profileName}) بنجاح.`
      };
    }

    const proto = options.protocol || 'auto';
    const isV7 = payload.routerOsVersion === 'v7';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        if (isV7) {
          // Check if limitation exists to either PUT (create) or PATCH (update)
          try {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/limitation', 'PUT', {
              name: limName,
              'rate-limit-rx': rx,
              'rate-limit-tx': tx,
              'uptime-limit': payload.uptimeLimit || '1d',
              'download-limit': payload.quotaLimit || '1000M',
            });
          } catch {
            // If already exists, attempt to update via PATCH/POST
            try {
              await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/user-manager/limitation/${encodeURIComponent(limName)}`, 'PATCH', {
                'rate-limit-rx': rx,
                'rate-limit-tx': tx,
                'uptime-limit': payload.uptimeLimit || '1d',
                'download-limit': payload.quotaLimit || '1000M',
              });
            } catch {
              // ignore
            }
          }

          // v7 Profile
          try {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/profile', 'PUT', {
              name: payload.profileName,
              'name-for-users': payload.nameForUsers || payload.profileName,
              price: String(payload.price || 0),
              validity: payload.validityDays ? `${payload.validityDays}d` : '1d',
            });
          } catch {
            try {
              await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/user-manager/profile/${encodeURIComponent(payload.profileName)}`, 'PATCH', {
                'name-for-users': payload.nameForUsers || payload.profileName,
                price: String(payload.price || 0),
                validity: payload.validityDays ? `${payload.validityDays}d` : '1d',
              });
            } catch {
              // ignore
            }
          }

          // v7 Profile-Limitation link
          try {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/profile-limitation', 'PUT', {
              profile: payload.profileName,
              limitation: limName,
            });
          } catch {
            // Already linked
          }
        } else {
          // v6 Limitation
          try {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/limitation', 'PUT', {
              name: limName,
              'rate-limit-rx': rx,
              'rate-limit-tx': tx,
              'uptime-limit': payload.uptimeLimit || '1d',
              'download-limit': payload.quotaLimit || '1000M',
            });
          } catch {
            // ignore
          }

          // v6 Profile
          try {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/profile', 'PUT', {
              name: payload.profileName,
              'name-for-users': payload.nameForUsers || payload.profileName,
              price: String(payload.price || 0),
              validity: payload.validityDays ? `${payload.validityDays}d` : '1d',
              'starts-at': payload.startsAt || 'logon',
            });
          } catch {
            // ignore
          }
        }

        return { success: true, message: `تم حفظ بروفايل User Manager (${payload.profileName}) بنجاح.` };
      } catch (err: any) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    try {
      if (isV7) {
        // 1. Check if limitation already exists
        const existingLim = await client.sendSentence([
          '/user-manager/limitation/print',
          `?name=${limName}`,
        ]);

        if (existingLim && existingLim.length > 0 && existingLim[0]['.id']) {
          await client.sendSentence([
            '/user-manager/limitation/set',
            `=.id=${existingLim[0]['.id']}`,
            `=rate-limit-rx=${rx}`,
            `=rate-limit-tx=${tx}`,
            `=uptime-limit=${payload.uptimeLimit || '1d'}`,
            `=download-limit=${payload.quotaLimit || '1000M'}`,
          ]);
        } else {
          await client.sendSentence([
            '/user-manager/limitation/add',
            `=name=${limName}`,
            `=rate-limit-rx=${rx}`,
            `=rate-limit-tx=${tx}`,
            `=uptime-limit=${payload.uptimeLimit || '1d'}`,
            `=download-limit=${payload.quotaLimit || '1000M'}`,
          ]);
        }

        // 2. Check if profile already exists
        const existingProf = await client.sendSentence([
          '/user-manager/profile/print',
          `?name=${payload.profileName}`,
        ]);

        if (existingProf && existingProf.length > 0 && existingProf[0]['.id']) {
          await client.sendSentence([
            '/user-manager/profile/set',
            `=.id=${existingProf[0]['.id']}`,
            `=name-for-users=${payload.nameForUsers || payload.profileName}`,
            `=price=${payload.price || 0}`,
            `=validity=${payload.validityDays ? `${payload.validityDays}d` : '1d'}`,
          ]);
        } else {
          await client.sendSentence([
            '/user-manager/profile/add',
            `=name=${payload.profileName}`,
            `=name-for-users=${payload.nameForUsers || payload.profileName}`,
            `=price=${payload.price || 0}`,
            `=validity=${payload.validityDays ? `${payload.validityDays}d` : '1d'}`,
          ]);
        }

        // 3. Link profile-limitation if not linked
        try {
          await client.sendSentence([
            '/user-manager/profile-limitation/add',
            `=profile=${payload.profileName}`,
            `=limitation=${limName}`,
          ]);
        } catch {
          // already linked
        }
      } else {
        // v6 Binary API
        const existingLimV6 = await client.sendSentence([
          '/tool/user-manager/limitation/print',
          `?name=${limName}`,
        ]);

        if (existingLimV6 && existingLimV6.length > 0 && existingLimV6[0]['.id']) {
          await client.sendSentence([
            '/tool/user-manager/limitation/set',
            `=.id=${existingLimV6[0]['.id']}`,
            `=rate-limit-rx=${rx}`,
            `=rate-limit-tx=${tx}`,
            `=uptime-limit=${payload.uptimeLimit || '1d'}`,
            `=download-limit=${payload.quotaLimit || '1000M'}`,
          ]);
        } else {
          await client.sendSentence([
            '/tool/user-manager/limitation/add',
            `=name=${limName}`,
            `=rate-limit-rx=${rx}`,
            `=rate-limit-tx=${tx}`,
            `=uptime-limit=${payload.uptimeLimit || '1d'}`,
            `=download-limit=${payload.quotaLimit || '1000M'}`,
          ]);
        }

        const existingProfV6 = await client.sendSentence([
          '/tool/user-manager/profile/print',
          `?name=${payload.profileName}`,
        ]);

        if (existingProfV6 && existingProfV6.length > 0 && existingProfV6[0]['.id']) {
          await client.sendSentence([
            '/tool/user-manager/profile/set',
            `=.id=${existingProfV6[0]['.id']}`,
            `=name-for-users=${payload.nameForUsers || payload.profileName}`,
            `=price=${payload.price || 0}`,
            `=validity=${payload.validityDays ? `${payload.validityDays}d` : '1d'}`,
            `=starts-at=${payload.startsAt || 'logon'}`,
          ]);
        } else {
          await client.sendSentence([
            '/tool/user-manager/profile/add',
            `=name=${payload.profileName}`,
            `=name-for-users=${payload.nameForUsers || payload.profileName}`,
            `=price=${payload.price || 0}`,
            `=validity=${payload.validityDays ? `${payload.validityDays}d` : '1d'}`,
            `=starts-at=${payload.startsAt || 'logon'}`,
          ]);
        }

        try {
          await client.sendSentence([
            '/tool/user-manager/profile/limitation/add',
            `=profile=${payload.profileName}`,
            `=limitation=${limName}`,
          ]);
        } catch {
          // ignore
        }
      }

      client.close();
      return { success: true, message: `تم حفظ وتحديث بروفايل User Manager (${payload.profileName}) بنجاح.` };
    } catch (err: any) {
      client.close();
      return { success: false, message: `خطأ أثناء حفظ البروفايل في الراوتر: ${err.message}` };
    }
  }

  // 19. Delete User Manager Profile
  public static async deleteUserManagerProfile(options: MikroTikConnectionOptions, profileIdOrName: string): Promise<boolean> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      MikroTikService.demoUMProfiles = MikroTikService.demoUMProfiles.filter(
        p => p.id !== profileIdOrName && p.name !== profileIdOrName
      );
      return true;
    }

    const proto = options.protocol || 'auto';
    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        try {
          if (profileIdOrName.startsWith('*')) {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/user-manager/profile/${encodeURIComponent(profileIdOrName)}`, 'DELETE');
          } else {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/profile/remove', 'POST', { numbers: profileIdOrName });
          }
        } catch {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/profile/remove', 'POST', { numbers: profileIdOrName });
        }
        return true;
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    try {
      const idParam = profileIdOrName.startsWith('*') ? `=.id=${profileIdOrName}` : `=numbers=${profileIdOrName}`;
      try {
        await client.sendSentence(['/user-manager/profile/remove', idParam]);
      } catch {
        await client.sendSentence(['/tool/user-manager/profile/remove', idParam]);
      }
      client.close();
      return true;
    } catch {
      client.close();
      return false;
    }
  }

  // 19. Delete User Manager User
  public static async deleteUserManagerUser(options: MikroTikConnectionOptions, userIdOrName: string): Promise<boolean> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      MikroTikService.demoUMUsers = MikroTikService.demoUMUsers.filter(u => u.id !== userIdOrName && u.name !== userIdOrName);
      return true;
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        try {
          if (userIdOrName.startsWith('*')) {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/user-manager/user/${encodeURIComponent(userIdOrName)}`, 'DELETE');
          } else {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/user/remove', 'POST', { numbers: userIdOrName });
          }
        } catch {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/user/remove', 'POST', { numbers: userIdOrName });
        }
        return true;
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    try {
      await client.sendSentence(['/user-manager/user/remove', `=numbers=${userIdOrName}`]);
    } catch {
      await client.sendSentence(['/tool/user-manager/user/remove', `=numbers=${userIdOrName}`]);
    }
    client.close();
    return true;
  }

  // 19b. Disconnect Active User Manager User (Terminate sessions)
  public static async disconnectUserManagerUser(options: MikroTikConnectionOptions, userName: string): Promise<boolean> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      const idx = MikroTikService.demoUMSessions.findIndex(s => s.user === userName && s.active);
      if (idx >= 0) {
        MikroTikService.demoUMSessions[idx].active = false;
        MikroTikService.demoUMSessions[idx].terminateCause = 'admin-reset';
        MikroTikService.demoUMSessions[idx].tillTime = new Date().toISOString();
      }
      return true;
    }

    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    try {
      // Hotspot active removal (often UM users are logged in via hotspot)
      try {
        await client.sendSentence(['/ip/hotspot/active/remove', `?user=${userName}`]);
      } catch {}
      // PPP active removal
      try {
        await client.sendSentence(['/ppp/active/remove', `?name=${userName}`]);
      } catch {}
      
      // UM Session removal
      try {
        // v7
        const sessions = await client.sendSentence(['/user-manager/session/print', `?user=${userName}`, '?active=true']);
        for (const s of sessions) {
          if (s['.id']) await client.sendSentence(['/user-manager/session/remove', `=numbers=${s['.id']}`]);
        }
      } catch {
        try {
          // v6
          const sessions = await client.sendSentence(['/tool/user-manager/session/print', `?user=${userName}`, '?active=true']);
          for (const s of sessions) {
            if (s['.id']) await client.sendSentence(['/tool/user-manager/session/remove', `=numbers=${s['.id']}`]);
          }
        } catch {}
      }
    } finally {
      client.close();
    }
    return true;
  }

  // 20. Reset User Manager User Counters
  public static async resetUserManagerUserCounters(options: MikroTikConnectionOptions, userIdOrName: string): Promise<boolean> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      MikroTikService.demoUMUsers = MikroTikService.demoUMUsers.map(u => 
        (u.id === userIdOrName || u.name === userIdOrName) 
          ? { ...u, uptimeUsed: '0s', downloadUsed: 0, uploadUsed: 0, totalBytes: 0 } 
          : u
      );
      return true;
    }

    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    try {
      await client.sendSentence(['/user-manager/user/reset-counters', `=numbers=${userIdOrName}`]);
    } catch {
      try {
        await client.sendSentence(['/tool/user-manager/user/reset-counters', `=numbers=${userIdOrName}`]);
      } catch {
        // ignore
      }
    }
    client.close();
    return true;
  }

  // 20b. Update User Manager User (Username, Password, Profile, Comment, Disabled, Limits)
  public static async updateUserManagerUser(
    options: MikroTikConnectionOptions,
    userData: {
      id?: string;
      name: string;
      password?: string;
      actualProfile?: string;
      disabled?: boolean;
      comment?: string;
      limitUptime?: string;
      limitBytesTotal?: number;
    }
  ): Promise<{ success: boolean; message?: string }> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      const idx = MikroTikService.demoUMUsers.findIndex(u => u.name === userData.name || (userData.id && u.id === userData.id));
      if (idx >= 0) {
        MikroTikService.demoUMUsers[idx] = {
          ...MikroTikService.demoUMUsers[idx],
          password: userData.password !== undefined ? userData.password : MikroTikService.demoUMUsers[idx].password,
          actualProfile: userData.actualProfile || MikroTikService.demoUMUsers[idx].actualProfile,
          disabled: userData.disabled !== undefined ? userData.disabled : MikroTikService.demoUMUsers[idx].disabled,
          comment: userData.comment !== undefined ? userData.comment : MikroTikService.demoUMUsers[idx].comment,
          limitUptime: userData.limitUptime !== undefined ? userData.limitUptime : MikroTikService.demoUMUsers[idx].limitUptime,
          limitBytesTotal: userData.limitBytesTotal !== undefined ? userData.limitBytesTotal : MikroTikService.demoUMUsers[idx].limitBytesTotal,
        };
      }
      return { success: true, message: `تم تحديث بيانات الكارت (${userData.name}) في User Manager بنجاح.` };
    }

    const proto = options.protocol || 'auto';
    const targetId = userData.id || userData.name;

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        const patchBody: any = {};
        if (userData.password !== undefined) patchBody.password = userData.password;
        if (userData.actualProfile) {
          patchBody['actual-profile'] = userData.actualProfile;
          patchBody['profile'] = userData.actualProfile;
        }
        if (userData.disabled !== undefined) patchBody.disabled = userData.disabled ? 'yes' : 'no';
        if (userData.comment !== undefined) patchBody.comment = userData.comment;
        if (userData.limitUptime) patchBody['limit-uptime'] = userData.limitUptime;
        if (userData.limitBytesTotal !== undefined) patchBody['limit-bytes-total'] = String(userData.limitBytesTotal);

        try {
          await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/user-manager/user/${encodeURIComponent(targetId)}`, 'PATCH', patchBody);
        } catch {
          try {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, `/tool/user-manager/user/${encodeURIComponent(targetId)}`, 'PATCH', patchBody);
          } catch {
            await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/user/set', 'POST', { numbers: targetId, ...patchBody });
          }
        }
        return { success: true, message: `تم تحديث بيانات الكارت (${userData.name}) بنجاح.` };
      } catch (err: any) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    const sentences: string[] = [];
    if (userData.password !== undefined) sentences.push(`=password=${userData.password}`);
    if (userData.actualProfile) sentences.push(`=actual-profile=${userData.actualProfile}`);
    if (userData.disabled !== undefined) sentences.push(`=disabled=${userData.disabled ? 'yes' : 'no'}`);
    if (userData.comment !== undefined) sentences.push(`=comment=${userData.comment}`);
    if (userData.limitUptime) sentences.push(`=limit-uptime=${userData.limitUptime}`);
    if (userData.limitBytesTotal !== undefined) sentences.push(`=limit-bytes-total=${userData.limitBytesTotal}`);

    try {
      await client.sendSentence(['/user-manager/user/set', `=numbers=${targetId}`, ...sentences]);
    } catch {
      try {
        const v6Sentences = sentences.map(s => s.startsWith('=actual-profile=') ? s.replace('=actual-profile=', '=profile=') : s);
        await client.sendSentence(['/tool/user-manager/user/set', `=numbers=${targetId}`, ...v6Sentences]);
      } catch (err2: any) {
        client.close();
        throw new Error(`تعذر تعديل الكارت في الراوتر: ${err2.message}`);
      }
    }

    client.close();
    return { success: true, message: `تم تحديث الكارت (${userData.name}) في الراوتر بنجاح.` };
  }

  // 20c. Get User Manager Sessions (History of logins/logouts, download/upload per session)
  public static async getUserManagerSessions(options: MikroTikConnectionOptions, userName?: string): Promise<any[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      const now = Date.now();
      const demoSessions = [
        { id: '*s1', user: 'UM-88401', userIp: '10.0.0.120', userMac: 'AA:BB:CC:11:22:33', fromTime: new Date(now - 3600 * 1000 * 5).toISOString(), tillTime: new Date(now - 3600 * 1000 * 3).toISOString(), uptime: '2h', download: 7200000000, upload: 520000000, totalBytes: 7720000000, active: false, terminateCause: 'user-request' },
        { id: '*s2', user: 'UM-88401', userIp: '10.0.0.120', userMac: 'AA:BB:CC:11:22:33', fromTime: new Date(now - 3600 * 1000 * 1.5).toISOString(), tillTime: null, uptime: '1h 30m', download: 7300000000, upload: 680000000, totalBytes: 7980000000, active: true, terminateCause: '' },
        { id: '*s3', user: 'UM-88402', userIp: '10.0.0.135', userMac: 'B4:CD:27:88:99:11', fromTime: new Date(now - 3600 * 1000 * 4).toISOString(), tillTime: new Date(now - 3600 * 1000 * 2.25).toISOString(), uptime: '1h 45m', download: 8320000000, upload: 650000000, totalBytes: 8970000000, active: false, terminateCause: 'session-timeout' },
        { id: '*s4', user: 'UM-88403', userIp: '10.0.0.142', userMac: 'C8:69:CD:44:55:66', fromTime: new Date(now - 3600 * 1000 * 8).toISOString(), tillTime: new Date(now - 3600 * 1000 * 3).toISOString(), uptime: '5h', download: 15200000000, upload: 1200000000, totalBytes: 16400000000, active: false, terminateCause: 'idle-timeout' },
        { id: '*s5', user: 'UM-88403', userIp: '10.0.0.142', userMac: 'C8:69:CD:44:55:66', fromTime: new Date(now - 3600 * 1000 * 2.3).toISOString(), tillTime: null, uptime: '2h 20m', download: 6300000000, upload: 600000000, totalBytes: 6900000000, active: true, terminateCause: '' },
        { id: '*s6', user: 'UM-88405', userIp: '10.0.0.180', userMac: 'F0:2F:74:12:34:56', fromTime: new Date(now - 3600 * 1000 * 24).toISOString(), tillTime: new Date(now - 3600 * 1000 * 1).toISOString(), uptime: '23h', download: 12400000000, upload: 980000000, totalBytes: 13380000000, active: false, terminateCause: 'quota-reached' },
        { id: '*s7', user: 'UM-88406', userIp: '10.0.0.199', userMac: 'DE:AD:BE:EF:CA:FE', fromTime: new Date(now - 3600 * 1000 * 4.5).toISOString(), tillTime: new Date(now - 3600 * 1000 * 1.4).toISOString(), uptime: '3h 10m', download: 4200000000, upload: 350000000, totalBytes: 4550000000, active: false, terminateCause: 'user-request' },
      ];
      if (userName) {
        return demoSessions.filter(s => s.user.toLowerCase() === userName.toLowerCase());
      }
      return demoSessions;
    }

    const proto = options.protocol || 'auto';
    let rawSessions: any[] = [];

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        try {
          rawSessions = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/user-manager/session');
        } catch {
          rawSessions = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/tool/user-manager/session');
        }
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    if (!rawSessions || rawSessions.length === 0) {
      const apiPort = options.port || (options.useSsl ? 8729 : 8728);
      const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
      await client.connect();
      await client.login(options.username, options.password || '');
      try {
        rawSessions = await client.sendSentence(['/user-manager/session/print']);
      } catch {
        try {
          rawSessions = await client.sendSentence(['/tool/user-manager/session/print']);
        } catch {}
      }
      client.close();
    }

    const list = Array.isArray(rawSessions) ? rawSessions : [];
    const parsed = list.filter((s: any) => s && (s.user || s['user'])).map((s: any) => {
      const user = s.user || s['user'];
      const fromTime = s['from-time'] || s.fromTime;
      const tillTime = s['till-time'] || s.tillTime;
      const uptime = s.uptime || s['uptime'] || '0s';
      const download = Number(s.download || s['download'] || s['bytes-out']) || 0;
      const upload = Number(s.upload || s['upload'] || s['bytes-in']) || 0;
      const active = s.active === 'true' || s.active === true || s['active'] === 'yes';

      return {
        id: s['.id'] || s.id || `um-sess-${user}-${Math.random()}`,
        user,
        userIp: s['host-ip'] || s.hostIp || s['user-ip'] || s.address || '',
        userMac: (s['calling-station-id'] || s.callingStationId || s['user-mac'] || '').toUpperCase().trim(),
        fromTime: parseRouterOSDate(fromTime),
        tillTime: active ? null : parseRouterOSDate(tillTime),
        uptime,
        download,
        upload,
        totalBytes: download + upload,
        active,
        terminateCause: s['terminate-cause'] || s.terminateCause || '',
      };
    });

    if (userName) {
      return parsed.filter(s => s.user.toLowerCase() === userName.toLowerCase());
    }
    return parsed;
  }

  // Get Router Interfaces (with byte counters for WAN reconciliation)
  public static async getRouterInterfaces(options: MikroTikConnectionOptions): Promise<any[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return [
        { name: 'ether1-WAN', type: 'ether', running: true, rxByte: 65420000000, txByte: 8320000000, comment: 'Main ISP Uplink' },
        { name: 'ether2-LAN', type: 'ether', running: true, rxByte: 7800000000, txByte: 58200000000, comment: 'Local Network' },
        { name: 'wlan1', type: 'wlan', running: true, rxByte: 3500000000, txByte: 24500000000, comment: 'Hotspot 2.4G' },
      ];
    }

    const proto = options.protocol || 'auto';
    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        const data = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/interface');
        const list = Array.isArray(data) ? data : [data];
        return list.filter(i => i && i.name).map(i => ({
          id: i['.id'] || i.id || i.name,
          name: i.name,
          type: i.type,
          running: i.running === 'true' || i.running === true,
          disabled: i.disabled === 'true' || i.disabled === true,
          rxByte: Number(i['rx-byte'] || i.rxByte || 0),
          txByte: Number(i['tx-byte'] || i.txByte || 0),
          comment: i.comment,
        }));
      } catch (err) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');
    let ifaces: any[] = [];
    try {
      ifaces = await client.sendSentence(['/interface/print']);
    } finally {
      client.close();
    }
    return ifaces.map(i => ({
      id: i['.id'] || i['name'],
      name: i['name'],
      type: i['type'],
      running: i['running'] === 'true',
      disabled: i['disabled'] === 'true',
      rxByte: Number(i['rx-byte'] || 0),
      txByte: Number(i['tx-byte'] || 0),
      comment: i['comment'],
    }));
  }

  // 20d. Get User Manager Daily Usage Report (Reconciliation between ISP WAN traffic and Card usage)
  public static async getUserManagerDailyReport(options: MikroTikConnectionOptions, targetDate?: string): Promise<any> {
    const chosenDate = targetDate || new Date().toISOString().split('T')[0];

    const [users, allSessions, interfaces] = await Promise.all([
      this.getUserManagerUsers(options).catch(() => []),
      this.getUserManagerSessions(options).catch(() => []),
      this.getRouterInterfaces(options).catch(() => []),
    ]);

    const daySessions = allSessions.filter(s => {
      if (!s.fromTime) return false;
      return s.fromTime.startsWith(chosenDate) || (s.tillTime && s.tillTime.startsWith(chosenDate)) || s.active;
    });

    const userMap = new Map<string, {
      user: string;
      profile: string;
      sessionsCount: number;
      downloadBytes: number;
      uploadBytes: number;
      totalBytes: number;
      uptimeSeconds: number;
      isActiveNow: boolean;
      comment?: string;
    }>();

    for (const s of daySessions) {
      const uName = s.user;
      const prev = userMap.get(uName) || {
        user: uName,
        profile: '',
        sessionsCount: 0,
        downloadBytes: 0,
        uploadBytes: 0,
        totalBytes: 0,
        uptimeSeconds: 0,
        isActiveNow: false,
      };

      prev.sessionsCount += 1;
      prev.downloadBytes += (s.download || 0);
      prev.uploadBytes += (s.upload || 0);
      prev.totalBytes += (s.download || 0) + (s.upload || 0);
      prev.uptimeSeconds += parseDurationToSeconds(s.uptime || '0s');
      if (s.active) prev.isActiveNow = true;

      userMap.set(uName, prev);
    }

    for (const u of users) {
      const existing = userMap.get(u.name);
      if (existing) {
        existing.profile = u.actualProfile || existing.profile;
        existing.comment = u.comment || existing.comment;
      } else if ((u.totalBytes || 0) > 0) {
        userMap.set(u.name, {
          user: u.name,
          profile: u.actualProfile || '',
          sessionsCount: 1,
          downloadBytes: u.downloadUsed || 0,
          uploadBytes: u.uploadUsed || 0,
          totalBytes: (u.downloadUsed || 0) + (u.uploadUsed || 0),
          uptimeSeconds: parseDurationToSeconds(u.uptimeUsed || '0s'),
          isActiveNow: false,
          comment: u.comment,
        });
      }
    }

    const cardsUsage = Array.from(userMap.values()).sort((a, b) => b.totalBytes - a.totalBytes);

    const totalCardsDownload = cardsUsage.reduce((sum, c) => sum + c.downloadBytes, 0);
    const totalCardsUpload = cardsUsage.reduce((sum, c) => sum + c.uploadBytes, 0);
    const totalCardsBytes = totalCardsDownload + totalCardsUpload;

    const wanIf = interfaces.find(i => 
      i.name.toLowerCase().includes('wan') || 
      i.name.toLowerCase().includes('ether1') || 
      i.name.toLowerCase().includes('pppoe') || 
      i.name.toLowerCase().includes('sfp')
    ) || interfaces[0];

    // In demo mode or if interface counters are 0, WAN traffic is cards usage + ~3.5 GB ISP network overhead
    let wanRxByte = wanIf ? (wanIf.rxByte || 0) : 0;
    let wanTxByte = wanIf ? (wanIf.txByte || 0) : 0;
    if (wanRxByte === 0 && wanTxByte === 0) {
      wanRxByte = totalCardsDownload + 2800000000;
      wanTxByte = totalCardsUpload + 700000000;
    }
    const totalWanTraffic = wanRxByte + wanTxByte;

    const overheadBytes = Math.max(0, totalWanTraffic - totalCardsBytes);
    const matchPercentage = totalWanTraffic > 0 
      ? Math.min(100, Math.round((totalCardsBytes / totalWanTraffic) * 100)) 
      : 100;

    return {
      date: chosenDate,
      summary: {
        totalWanBytes: totalWanTraffic,
        wanDownloadBytes: wanRxByte,
        wanUploadBytes: wanTxByte,
        totalCardsBytes,
        cardsDownloadBytes: totalCardsDownload,
        cardsUploadBytes: totalCardsUpload,
        overheadBytes,
        matchPercentage,
        activeCardsNow: cardsUsage.filter(c => c.isActiveNow).length,
        totalActiveCardsToday: cardsUsage.length,
        totalSessionsToday: daySessions.length,
        wanInterfaceName: wanIf?.name || 'WAN-ether1',
      },
      cardsUsage,
      sessions: daySessions,
    };
  }

  // 21. Get Hotspot Servers & Current Operational Status
  public static async getHotspotServers(options: MikroTikConnectionOptions): Promise<any[]> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      return [
        { id: '*1', name: 'hs-server1', interface: 'bridge-lan', profile: 'hsprof1', addressPool: 'hs-pool-1', disabled: false, invalid: false },
        { id: '*2', name: 'hs-server2-5G', interface: 'wlan2', profile: 'hsprof1', addressPool: 'hs-pool-2', disabled: false, invalid: false }
      ];
    }

    const proto = options.protocol || 'auto';

    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);
        const servers = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/ip/hotspot');
        if (Array.isArray(servers)) {
          return servers.map((s: any) => ({
            id: s['.id'] || s.id,
            name: s.name,
            interface: s.interface,
            profile: s.profile,
            addressPool: s['address-pool'] || s.addressPool,
            disabled: s.disabled === true || s.disabled === 'true',
            invalid: s.invalid === true || s.invalid === 'true',
          }));
        }
      } catch (err: any) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    const reply = await client.sendSentence(['/ip/hotspot/print']);
    client.close();

    return reply
      .filter((r: any) => r['.id'] || r['name'])
      .map((r: any) => ({
        id: r['.id'],
        name: r['name'],
        interface: r['interface'],
        profile: r['profile'],
        addressPool: r['address-pool'],
        disabled: r['disabled'] === 'true' || r['disabled'] === true,
        invalid: r['invalid'] === 'true' || r['invalid'] === true,
      }));
  }

  // 22. Set Maintenance State & Programmatic Network Control
  public static async setHotspotMaintenanceAndNetworkState(
    options: MikroTikConnectionOptions,
    params: {
      networkStatus: 'online' | 'maintenance' | 'disabled';
      kickActiveUsers?: boolean;
      maintenanceMessage?: string;
      maintenanceTitle?: string;
    }
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (options.protocol === 'demo' || options.host === 'demo') {
      let msg = '';
      if (params.networkStatus === 'online') {
        msg = 'تم تفعيل الشبكة والهوتسبوت برمجياً بنجاح (وضع المحاكاة). تسجيل الدخول متاح للمستخدمين الآن.';
      } else if (params.networkStatus === 'maintenance') {
        msg = `تم تفعيل وضع الصيانة بنجاح (وضع المحاكاة). رسالة الصيانة: "${params.maintenanceTitle || 'صيانة دورية'}".` +
          (params.kickActiveUsers ? ' تم فصل جميع المشتركين المتصلين لعرض صفحة الصيانة فوراً.' : '');
      } else {
        msg = 'تم إيقاف وتعطيل سيرفرات الهوتسبوت برمجياً بنجاح (وضع المحاكاة).' +
          (params.kickActiveUsers ? ' تم فصل جميع الجلسات النشطة.' : '');
      }
      return { success: true, message: msg, details: { status: params.networkStatus, kicked: params.kickActiveUsers } };
    }

    const proto = options.protocol || 'auto';
    const isDisableAction = params.networkStatus === 'disabled';

    // 1. Kick active users if requested
    let kickedCount = 0;
    if (params.kickActiveUsers) {
      try {
        const activeUsers = await this.getActiveHotspotUsers(options);
        for (const u of activeUsers) {
          if (u.id) {
            try {
              await this.kickHotspotUser(options, u.id);
              kickedCount++;
            } catch {
              // ignore single user kick error
            }
          }
        }
      } catch (err: any) {
        console.warn('Notice while kicking users for maintenance:', err.message);
      }
    }

    // 2. Apply Network Enable/Disable on Hotspot Servers
    if (proto === 'rest_http' || proto === 'rest_https' || proto === 'auto') {
      try {
        const isHttps = proto === 'rest_https' || options.useSsl;
        const port = options.port || (isHttps ? 443 : 80);

        const servers = await fetchRestApi({ ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port }, '/ip/hotspot');
        if (Array.isArray(servers)) {
          for (const s of servers) {
            const sid = s['.id'] || s.id;
            if (sid) {
              await fetchRestApi(
                { ...options, protocol: isHttps ? 'rest_https' : 'rest_http', port },
                `/ip/hotspot/${encodeURIComponent(sid)}`,
                'PATCH',
                { disabled: isDisableAction }
              );
            }
          }
        }

        let resultMsg = isDisableAction
          ? `تم تعطيل سيرفرات الهوتسبوت برمجياً بنجاح.`
          : params.networkStatus === 'maintenance'
          ? `تم تفعيل وتطبيق وضع الصيانة على الراوتر بنجاح.`
          : `تم تفعيل سيرفرات الهوتسبوت واستئناف العمل بشكل طبيعي.`;

        if (kickedCount > 0) {
          resultMsg += ` تم فصل ${kickedCount} مستخدم متصل لتطبيق الحالة فوراً.`;
        }

        return { success: true, message: resultMsg, details: { status: params.networkStatus, kickedCount } };
      } catch (err: any) {
        if (proto !== 'auto') throw err;
      }
    }

    // Binary API
    const apiPort = options.port || (options.useSsl ? 8729 : 8728);
    const client = new RouterOSBinaryClient(options.host, apiPort, options.useSsl || apiPort === 8729, options.timeoutMs || 5000);
    await client.connect();
    await client.login(options.username, options.password || '');

    try {
      const servers = await client.sendSentence(['/ip/hotspot/print']);
      for (const s of servers) {
        const sid = s['.id'];
        if (sid) {
          await client.sendSentence([
            '/ip/hotspot/set',
            `=.id=${sid}`,
            `=disabled=${isDisableAction ? 'yes' : 'no'}`
          ]);
        }
      }

      client.close();

      let resultMsg = isDisableAction
        ? `تم إيقاف وتعطيل سيرفرات الهوتسبوت في راوتر مايكروتك برمجياً بنجاح.`
        : params.networkStatus === 'maintenance'
        ? `تم ضبط وتطبيق وضع الصيانة على راوتر مايكروتك بنجاح.`
        : `تم إعادة تفعيل سيرفرات الهوتسبوت وتنشيط الشبكة بنجاح.`;

      if (kickedCount > 0) {
        resultMsg += ` تم فصل ${kickedCount} جلسة نشطة.`;
      }

      return { success: true, message: resultMsg, details: { status: params.networkStatus, kickedCount } };
    } catch (err: any) {
      client.close();
      return { success: false, message: `تعذر تحديث حالة الشبكة عبر Binary API: ${err.message}` };
    }
  }
}
