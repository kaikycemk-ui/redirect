import crypto from 'crypto';

export interface DeviceMetadata {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'other';
  browser: string;
  os: string;
}

/**
 * Gera hash seguro (SHA-256) do IP para não armazenar IP puro
 */
export function hashIp(ip: string): string {
  if (!ip) return 'anonymous';
  const salt = process.env.IP_HASH_SALT || 'leadrouter-privacy-salt';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 32);
}

/**
 * Cria ou recupera session_id anônimo
 */
export function generateAnonymousSessionId(ipHash: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('md5').update(`${ipHash}:${userAgent}:${day}`).digest('hex');
}

/**
 * Validação estrita de URL (Permite apenas http:// e https://)
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Parser de User-Agent simples, ultra-rápido e zero dependências pesadas
 */
export function parseUserAgent(ua: string | null): DeviceMetadata {
  if (!ua) {
    return { deviceType: 'other', browser: 'unknown', os: 'unknown' };
  }

  const uaLower = ua.toLowerCase();

  // 1. Device Type
  let deviceType: DeviceMetadata['deviceType'] = 'desktop';
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(uaLower)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(uaLower)) {
    deviceType = 'tablet';
  } else if (/bot|crawler|spider|facebookexternalhit|whatsapp|preview/i.test(uaLower)) {
    deviceType = 'bot';
  }

  // 2. OS
  let os = 'Other';
  if (/iphone|ipad|ipod/i.test(uaLower)) os = 'iOS';
  else if (/android/i.test(uaLower)) os = 'Android';
  else if (/windows nt/i.test(uaLower)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(uaLower)) os = 'macOS';
  else if (/linux/i.test(uaLower)) os = 'Linux';

  // 3. Browser
  let browser = 'Other';
  if (/edg/i.test(uaLower)) browser = 'Edge';
  else if (/chrome|crios/i.test(uaLower) && !/opr|opera/i.test(uaLower)) browser = 'Chrome';
  else if (/safari/i.test(uaLower) && !/chrome|crios/i.test(uaLower)) browser = 'Safari';
  else if (/firefox|fxios/i.test(uaLower)) browser = 'Firefox';
  else if (/opr|opera/i.test(uaLower)) browser = 'Opera';
  else if (/instagram/i.test(uaLower)) browser = 'Instagram Webview';
  else if (/tiktok/i.test(uaLower)) browser = 'TikTok Webview';

  return { deviceType, browser, os };
}
