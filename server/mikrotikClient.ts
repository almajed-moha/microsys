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

    return users.map(item => ({
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
}
