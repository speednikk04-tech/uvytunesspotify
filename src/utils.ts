import { ParsedSpotifyCookies } from './types';

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function parseSpotifyCookies(input: any): ParsedSpotifyCookies {
  let spDc: string | null = null;
  let spKey: string | null = null;
  const parsedMap = new Map<string, string>();

  if (!input) {
    return { spDc: null, spKey: null, cookieHeader: '', count: 0, items: [] };
  }

  const trimmed = typeof input === 'string' ? input.trim() : '';

  // Case 1: JSON array or JSON object
  if (typeof input === 'object' || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = typeof input === 'object' ? input : JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object') {
            const name = item.name || item.key || item.Name;
            const value = item.value || item.Value;
            if (name && value !== undefined && value !== null) {
              parsedMap.set(String(name).trim(), String(value).trim());
            }
          }
        }
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.cookies)) {
          for (const item of parsed.cookies) {
            if (item && typeof item === 'object') {
              const name = item.name || item.key;
              const value = item.value;
              if (name && value !== undefined && value !== null) {
                parsedMap.set(String(name).trim(), String(value).trim());
              }
            }
          }
        } else {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string' || typeof v === 'number') {
              parsedMap.set(k.trim(), String(v).trim());
            }
          }
        }
      }
    } catch {
      // Not valid JSON, continue with string parsing
    }
  }

  // Case 2: Standard HTTP Cookie header or Netscape tab-separated file format
  if (parsedMap.size === 0 && typeof input === 'string') {
    const lines = input.split('\n');
    for (const line of lines) {
      const l = line.trim();
      if (!l || l.startsWith('#')) continue;

      // Netscape tab format: domain flag path secure exp name value
      const tabs = l.split('\t');
      if (tabs.length >= 7) {
        const name = tabs[5].trim();
        const value = tabs[6].trim();
        if (name && value) parsedMap.set(name, value);
        continue;
      }

      // Semicolon-separated pairs
      const pairs = l.split(';');
      for (const pair of pairs) {
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
          const name = pair.substring(0, eqIdx).trim();
          const value = pair.substring(eqIdx + 1).trim();
          if (name && value) parsedMap.set(name, value);
        }
      }
    }
  }

  // Case 3: Raw sp_dc token string (e.g., "AQB...")
  if (parsedMap.size === 0 && typeof input === 'string') {
    const clean = input.trim().replace(/^["']|["']$/g, '');
    if (clean.length > 20) {
      spDc = clean;
      parsedMap.set('sp_dc', clean);
    }
  }

  spDc = parsedMap.get('sp_dc') || parsedMap.get('SP_DC') || spDc;
  spKey = parsedMap.get('sp_key') || parsedMap.get('SP_KEY') || null;

  const cookiePairs: string[] = [];
  parsedMap.forEach((v, k) => {
    cookiePairs.push(`${k}=${v}`);
  });
  const cookieHeader = cookiePairs.join('; ');

  return {
    spDc,
    spKey,
    cookieHeader,
    count: parsedMap.size,
    items: Array.from(parsedMap.entries()).map(([name, value]) => ({
      name,
      valueSnippet: value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value
    }))
  };
}

