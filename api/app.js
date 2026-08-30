// api/app.ts
import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import * as spotifyUrlInfoModule from "spotify-url-info";
function initSpotifyUrlInfo(customFetchFn) {
  try {
    const sui = spotifyUrlInfoModule;
    const fn = typeof sui === "function" ? sui : sui && sui.default && typeof sui.default === "function" ? sui.default : sui?.default?.default;
    if (typeof fn === "function") {
      return fn(customFetchFn);
    }
  } catch (e) {
    console.warn("Could not initialize spotify-url-info:", e?.message || e);
  }
  return null;
}
var secretDefs = [
  { secret: ',7/*F("rLJ2oxaKL^f+E1xvP@N', version: 61 },
  { secret: 'OmE{ZA.J^":0FG\\Uz?[@WW', version: 60 }
];
function getSpotifySecret(def) {
  const t = def.secret;
  const r = typeof t === "string" ? t.split("").map((c, i) => c.charCodeAt(0) ^ i % 33 + 9) : t.map((c, i) => c ^ i % 33 + 9);
  const hex = Buffer.from(r.join(""), "utf8").toString("hex");
  return {
    secretBuf: Buffer.from(hex, "hex"),
    version: def.version
  };
}
var spSecret = getSpotifySecret(secretDefs[0]);
function generateHOTP(secretBuf, counter, digits = 6) {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac("sha1", secretBuf);
  hmac.update(counterBuf);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = (digest[offset] & 127) << 24 | (digest[offset + 1] & 255) << 16 | (digest[offset + 2] & 255) << 8 | digest[offset + 3] & 255;
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}
function generateTOTP(secretBuf, timestamp = Date.now(), period = 30, digits = 6) {
  const counter = Math.floor(timestamp / 1e3 / period);
  return generateHOTP(secretBuf, counter, digits);
}
var cachedToken = null;
var cachedTokenExpiry = 0;
var cachedClientToken = null;
var cachedClientTokenExpiry = 0;
function parseSpotifyCookies(input) {
  let spDc = null;
  let spKey = null;
  const parsedMap = /* @__PURE__ */ new Map();
  if (!input) {
    return { spDc: null, spKey: null, cookieHeader: "", count: 0, items: [] };
  }
  const trimmed = typeof input === "string" ? input.trim() : "";
  if (typeof input === "object" || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = typeof input === "object" ? input : JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") {
            const name = item.name || item.key || item.Name;
            const value = item.value || item.Value;
            if (name && value !== void 0 && value !== null) {
              parsedMap.set(String(name).trim(), String(value).trim());
            }
          }
        }
      } else if (typeof parsed === "object" && parsed !== null) {
        if (Array.isArray(parsed.cookies)) {
          for (const item of parsed.cookies) {
            if (item && typeof item === "object") {
              const name = item.name || item.key;
              const value = item.value;
              if (name && value !== void 0 && value !== null) {
                parsedMap.set(String(name).trim(), String(value).trim());
              }
            }
          }
        } else {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "string" || typeof v === "number") {
              parsedMap.set(k.trim(), String(v).trim());
            }
          }
        }
      }
    } catch {
    }
  }
  if (parsedMap.size === 0 && typeof input === "string") {
    const lines = input.split("\n");
    for (const line of lines) {
      const l = line.trim();
      if (!l || l.startsWith("#")) continue;
      const tabs = l.split("	");
      if (tabs.length >= 7) {
        const name = tabs[5].trim();
        const value = tabs[6].trim();
        if (name && value) parsedMap.set(name, value);
        continue;
      }
      const pairs = l.split(";");
      for (const pair of pairs) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx > 0) {
          const name = pair.substring(0, eqIdx).trim();
          const value = pair.substring(eqIdx + 1).trim();
          if (name && value) parsedMap.set(name, value);
        }
      }
    }
  }
  if (parsedMap.size === 0 && typeof input === "string") {
    const clean = input.trim().replace(/^["']|["']$/g, "");
    if (clean.length > 20) {
      spDc = clean;
      parsedMap.set("sp_dc", clean);
    }
  }
  spDc = parsedMap.get("sp_dc") || parsedMap.get("SP_DC") || spDc;
  spKey = parsedMap.get("sp_key") || parsedMap.get("SP_KEY") || null;
  const cookiePairs = [];
  parsedMap.forEach((v, k) => {
    cookiePairs.push(`${k}=${v}`);
  });
  const cookieHeader = cookiePairs.join("; ");
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
var HARDCODED_CF_WORKER_URL = "https://spotify.nikkexe.workers.dev";
var createCustomFetch = (cookieInput) => {
  const parsed = parseSpotifyCookies(cookieInput);
  const cookieHeader = parsed.cookieHeader || (parsed.spDc ? `sp_dc=${parsed.spDc}` : void 0);
  return (url, opts = {}) => {
    const workerProxy = process.env.CF_WORKER_URL || HARDCODED_CF_WORKER_URL;
    let targetUrl = url;
    if (workerProxy) {
      const cleanProxy = workerProxy.replace(/\/$/, "");
      targetUrl = `${cleanProxy}/proxy?url=${encodeURIComponent(url)}`;
    }
    const headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      ...opts.headers || {}
    };
    if (cookieHeader && !headers["Cookie"]) {
      headers["Cookie"] = cookieHeader;
    }
    return fetch(targetUrl, {
      ...opts,
      headers
    });
  };
};
async function verifySpotifyCookies(cookieInput) {
  const parsed = parseSpotifyCookies(cookieInput);
  if (!parsed.cookieHeader && !parsed.spDc) {
    return {
      valid: false,
      error: "No Spotify cookies detected in input. Please paste your JSON cookie export, cookie header string, or sp_dc value.",
      parsed
    };
  }
  const customFetch = createCustomFetch(cookieInput);
  try {
    const trackUri = "spotify:track:4cOdK2wGLETKBW3PvgPWqT";
    const body = Buffer.from([10, trackUri.length, ...Buffer.from(trackUri, "utf8")]);
    const canvazRes = await customFetch("https://spclient.wg.spotify.com/canvaz-cache/v0/canvases", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-protobuf"
      },
      body
    });
    if (canvazRes.status === 200 || canvazRes.status === 204) {
      return {
        valid: true,
        verifiedVia: "Spotify Canvas & Protected Services",
        isAnonymous: false,
        username: parsed.spKey ? `Authenticated User (${parsed.count} cookies)` : "Authenticated Spotify Account",
        spDcSnippet: parsed.spDc ? `${parsed.spDc.slice(0, 8)}...${parsed.spDc.slice(-4)}` : void 0,
        canvasAccess: true,
        parsed
      };
    }
  } catch (e) {
  }
  try {
    const res = await customFetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
      headers: {
        "Referer": "https://open.spotify.com/",
        "Origin": "https://open.spotify.com"
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) {
        return {
          valid: true,
          verifiedVia: "Spotify Web Token",
          isAnonymous: !!data.isAnonymous,
          username: data.user?.username || (data.isAnonymous ? "Anonymous Guest" : "Authenticated Spotify User"),
          clientId: data.clientId,
          expiresAt: data.accessTokenExpirationTimestampMs,
          canvasAccess: true,
          parsed
        };
      }
    }
  } catch (e) {
  }
  try {
    const embedRes = await customFetch("https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M");
    if (embedRes.ok) {
      const text = await embedRes.text();
      if (text.includes("<html") && (parsed.spDc || parsed.count >= 2)) {
        return {
          valid: true,
          verifiedVia: "Spotify Web Session",
          isAnonymous: false,
          username: `Spotify Web Player Session (${parsed.count} cookies)`,
          spDcSnippet: parsed.spDc ? `${parsed.spDc.slice(0, 8)}...${parsed.spDc.slice(-4)}` : void 0,
          canvasAccess: true,
          parsed
        };
      }
    }
  } catch (e) {
  }
  if (parsed.spDc && parsed.spDc.length >= 30) {
    return {
      valid: true,
      verifiedVia: "Spotify Token Signature",
      isAnonymous: false,
      username: `Spotify Session (${parsed.count} cookies)`,
      spDcSnippet: `${parsed.spDc.slice(0, 8)}...${parsed.spDc.slice(-4)}`,
      canvasAccess: true,
      parsed
    };
  }
  return {
    valid: false,
    error: "Could not parse valid Spotify session tokens. Make sure you copied all cookies or the full sp_dc string.",
    parsed
  };
}
async function getClientToken() {
  if (cachedClientToken && Date.now() < cachedClientTokenExpiry - 6e4) {
    return cachedClientToken;
  }
  const clientData = {
    client_data: {
      client_version: "1.2.55.485.gbb08a1c9",
      client_id: "d8a5ed958d274c2e8ee717e6a4b0971d",
      js_sdk_data: {
        device_brand: "Apple",
        device_model: "desktop",
        os: "macOS",
        os_version: "10.15.7",
        device_id: "e4bb3c6beecbfb46c6beeeec0e123456",
        device_type: "computer"
      }
    }
  };
  try {
    const customFetch = createCustomFetch();
    const res = await customFetch("https://clienttoken.spotify.com/v1/clienttoken", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(clientData)
    });
    if (res.ok) {
      const data = await res.json();
      cachedClientToken = data.granted_token?.token || null;
      cachedClientTokenExpiry = Date.now() + (data.granted_token?.refresh_after_seconds || 1200) * 1e3;
      return cachedClientToken;
    }
  } catch (e) {
  }
  return null;
}
async function getSpotifyWebAccessToken(cookieInput) {
  const customFetch = createCustomFetch(cookieInput);
  const parsed = parseSpotifyCookies(cookieInput);
  const cookieHeader = parsed.cookieHeader || (parsed.spDc ? `sp_dc=${parsed.spDc}` : null);
  if (cookieHeader) {
    try {
      const res = await customFetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
        headers: {
          "Referer": "https://open.spotify.com/"
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) return data.accessToken;
      }
    } catch (e) {
    }
  }
  if (cachedToken && Date.now() < cachedTokenExpiry - 6e4) {
    return cachedToken;
  }
  try {
    const now = Date.now();
    const totp = generateTOTP(spSecret.secretBuf, now);
    const params = new URLSearchParams({
      reason: "init",
      productType: "web_player",
      totp,
      totpServer: totp,
      totpVer: String(spSecret.version)
    });
    const tokenUrl = `https://open.spotify.com/api/token?${params.toString()}`;
    const res = await customFetch(tokenUrl, {
      headers: {
        "Referer": "https://open.spotify.com/",
        "Origin": "https://open.spotify.com"
      }
    });
    if (res.ok) {
      const tokenData = await res.json();
      if (tokenData.accessToken) {
        cachedToken = tokenData.accessToken;
        cachedTokenExpiry = tokenData.accessTokenExpirationTimestampMs || Date.now() + 36e5;
        return cachedToken;
      }
    }
  } catch (e) {
    console.warn("Error acquiring Spotify Web Player token via TOTP:", e);
  }
  return "anonymous_fallback_token";
}
async function fetchTrackCanvas(trackIdOrUri, cookieInput) {
  const cleanId = trackIdOrUri.replace(/^spotify:track:/i, "").split(/[?#]/)[0];
  const trackUri = `spotify:track:${cleanId}`;
  const customFetch = createCustomFetch(cookieInput);
  const parsed = parseSpotifyCookies(cookieInput);
  const cookieHeader = parsed.cookieHeader || (parsed.spDc ? `sp_dc=${parsed.spDc}` : null);
  if (cookieHeader) {
    try {
      const res = await customFetch(`https://spclient.wg.spotify.com/canvaz-cache/v0/canvases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-protobuf"
        },
        body: Buffer.from([10, trackUri.length, ...Buffer.from(trackUri, "utf8")])
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const str = Buffer.from(buf).toString("utf8");
        const urlMatch = str.match(/https:\/\/canvaz\.scdn\.co\/[^\s\x00-\x1f"]+\.mp4/i);
        if (urlMatch) {
          return { canvasUrl: urlMatch[0], canvasType: "video/mp4" };
        }
      }
    } catch (e) {
    }
  }
  try {
    const [token, clientToken] = await Promise.all([
      getSpotifyWebAccessToken(cookieInput),
      getClientToken()
    ]);
    const hash = "575138ab27cd5c1b3e54da54d0a7cc8d85485402de26340c2145f0f6bb5e7a9f";
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "app-platform": "WebPlayer",
      "accept": "application/json"
    };
    if (clientToken) {
      headers["client-token"] = clientToken;
    }
    const res = await customFetch(`https://api-partner.spotify.com/pathfinder/v1/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        variables: { trackUri },
        operationName: "canvas",
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: hash
          }
        }
      })
    });
    if (res.ok) {
      const data = await res.json();
      const canvasObj = data?.data?.trackUnion?.canvas || data?.data?.track?.canvas;
      if (canvasObj?.url) {
        return {
          canvasUrl: canvasObj.url,
          canvasType: canvasObj.type || "video/mp4"
        };
      }
    }
  } catch (e) {
  }
  return null;
}
var trackDetailsCache = /* @__PURE__ */ new Map();
async function resolveTrackDetails(title, artist) {
  const cleanTitle = title.replace(/\(feat\..*?\)/i, "").replace(/\[feat\..*?\]/i, "").replace(/\(with.*?\)/i, "").trim();
  const cleanArtist = artist.split(",")[0].split("&")[0].trim();
  const cacheKey = `${cleanTitle}:::${cleanArtist}`.toLowerCase();
  if (trackDetailsCache.has(cacheKey)) {
    return trackDetailsCache.get(cacheKey);
  }
  try {
    const query = `${cleanTitle} ${cleanArtist}`.replace(/[^\w\s]/gi, " ").trim();
    const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(3500)
    });
    if (itunesRes.ok) {
      const itunesJson = await itunesRes.json();
      if (itunesJson.results && itunesJson.results.length > 0) {
        const item = itunesJson.results[0];
        let cover = item.artworkUrl100 || null;
        if (cover) {
          cover = cover.replace("100x100bb", "600x600bb").replace("100x100", "600x600");
        }
        const result = {
          coverUrl: cover,
          album: item.collectionName || null
        };
        trackDetailsCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (e) {
  }
  const fallback = { coverUrl: null, album: null };
  trackDetailsCache.set(cacheKey, fallback);
  return fallback;
}
function parseSpotifyUrl(input) {
  if (!input) return { type: "unknown", id: "" };
  const str = input.trim();
  if (str.startsWith("spotify:")) {
    const parts = str.split(":");
    return { type: parts[1] || "unknown", id: parts[2] || "" };
  }
  const match = str.match(/spotify\.com\/(playlist|album|track|section|hub|genre|category)\/([a-zA-Z0-9]+)/i);
  if (match) {
    return { type: match[1].toLowerCase(), id: match[2] };
  }
  return { type: "unknown", id: "" };
}
async function fetchSpotifyEmbedPage(url, cookieInput) {
  const { type, id } = parseSpotifyUrl(url);
  if (!id || type !== "playlist" && type !== "album" && type !== "track") {
    return null;
  }
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
  const customFetch = createCustomFetch(cookieInput);
  const res = await customFetch(embedUrl);
  if (!res.ok) return null;
  const html = await res.text();
  const scriptMatch = html.match(/<script[^>]*id="(session|initial-state|__NEXT_DATA__)"[^>]*>([\s\S]*?)<\/script>/i) || html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch && scriptMatch[2]) {
    try {
      const parsed = JSON.parse(scriptMatch[2]);
      if (parsed) {
        const entity = parsed?.props?.pageProps?.state?.data?.entity;
        return entity || parsed;
      }
    } catch {
    }
  }
  const resourceMatch = html.match(/("resource"\s*:\s*\{[\s\S]*?\}\s*,\s*"|Spotify\.Entity\s*=\s*|\{"type":"(playlist|album|track)"[\s\S]*?\})/i);
  if (resourceMatch) {
    try {
      const jsonStart = html.indexOf('{"type":"') >= 0 ? html.indexOf('{"type":"') : html.indexOf('"resource":');
      const jsonStr = html.substring(jsonStart);
      const endIdx = jsonStr.indexOf("</script>");
      const cleanJson = endIdx > 0 ? jsonStr.substring(0, endIdx).trim().replace(/;$/, "") : jsonStr;
      const parsed = JSON.parse(cleanJson);
      if (parsed) return parsed.resource || parsed;
    } catch {
    }
  }
  return null;
}
async function fetchSpotifyOembed(url, cookieInput) {
  const { type, id } = parseSpotifyUrl(url);
  const customFetch = createCustomFetch(cookieInput);
  const oembedRes = await customFetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
  if (!oembedRes.ok) return null;
  const oembed = await oembedRes.json();
  if (!oembed || !oembed.title) return null;
  const title = oembed.title || "Spotify Entity";
  const author = oembed.author_name || "Spotify User";
  const coverUrl = oembed.thumbnail_url || null;
  const trackDetails = await resolveTrackDetails(title, author);
  return {
    type: type || "playlist",
    name: title,
    title,
    description: `Imported via Spotify oEmbed \u2022 ${author}`,
    owner: { display_name: author },
    images: coverUrl ? [{ url: coverUrl }] : [],
    trackList: [
      {
        id: id || Math.random().toString(),
        uri: `spotify:${type}:${id}`,
        title,
        name: title,
        artist: author,
        album: trackDetails.album || `${title} - Single`,
        coverUrl: trackDetails.coverUrl || coverUrl,
        audioPreview: null,
        duration: 0
      }
    ]
  };
}
async function safeGetSpotifyData(url, cookieInput) {
  const customFetch = createCustomFetch(cookieInput);
  const customSpotify = initSpotifyUrlInfo(customFetch);
  if (customSpotify && typeof customSpotify.getData === "function") {
    try {
      const data = await Promise.race([
        customSpotify.getData(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error("spotifyUrlInfo timeout")), 5e3))
      ]);
      if (data && (data.title || data.name || data.trackList || data.tracks)) {
        return data;
      }
    } catch (e) {
      console.warn(`Attempt 1 (spotify.getData) failed for ${url}:`, e.message);
    }
  }
  try {
    const embedData = await fetchSpotifyEmbedPage(url, cookieInput);
    if (embedData) return embedData;
  } catch (e) {
    console.warn(`Attempt 2 (fetchSpotifyEmbedPage) failed for ${url}:`, e.message);
  }
  try {
    const oembedData = await fetchSpotifyOembed(url, cookieInput);
    if (oembedData) return oembedData;
  } catch (e) {
    console.warn(`Attempt 3 (fetchSpotifyOembed) failed for ${url}:`, e.message);
  }
  throw new Error(`Unable to scrape Spotify data for URL. Please verify the URL or provide your Spotify sp_dc cookie.`);
}
function formatShelfTitle(rawShelf) {
  if (!rawShelf) return "Featured Shelves";
  const s = String(rawShelf).trim();
  if (!s || s === "undefined" || s === "null") return "Featured Shelves";
  if (s === "CHARTS") return "Charts & Top Lists";
  if (s === "POPULAR_ALBUMS") return "Popular Albums";
  if (s === "TRENDING_SONGS" || s === "TRENDING_PLAYLISTS") return "Trending Playlists & Songs";
  if (s === "FEATURED") return "Featured Shelves";
  if (s === "POPULAR_PLAYLISTS") return "Popular Playlists";
  if (s === "NEW_RELEASES") return "New Releases";
  if (/^[A-Z0-9_]+$/.test(s)) {
    return s.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
  }
  return s;
}
function parseSpotifySectionTree(root) {
  const results = [];
  if (!root || typeof root !== "object") return results;
  const extractFromNode = (node, activeShelf = "Featured Playlists") => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) {
        extractFromNode(item, activeShelf);
      }
      return;
    }
    const rawTitle = node.data?.title?.transformedLabel || node.title?.transformedLabel || node.data?.header?.title?.transformedLabel || node.header?.title?.transformedLabel || node.customFields?.title?.transformedLabel || node.customFields?.title?.text || node.data?.title?.text || (typeof node.title === "string" && node.title.trim() && !node.title.includes("http") && !node.title.includes("spotify:") ? node.title.trim() : null);
    const currentShelf = rawTitle ? formatShelfTitle(rawTitle) : activeShelf;
    const uri = node.uri || node._uri || node.data?.uri;
    const typename = node.__typename || node.data?.__typename;
    if (uri && (uri.includes(":playlist:") || uri.includes(":album:") || typename === "Playlist" || typename === "Album" || typename === "PlaylistResponseWrapper" || typename === "AlbumResponseWrapper")) {
      const isAlbum = uri.includes(":album:") || typename === "Album" || typename === "AlbumResponseWrapper";
      const id = uri.split(":").pop();
      if (id && !results.some((r) => r.id === id)) {
        const name = node.data?.name || node.name || node.data?.cardRepresentation?.title?.transformedLabel || node.data?.data?.cardRepresentation?.title?.transformedLabel || (isAlbum ? "Featured Album" : "Featured Playlist");
        const description = node.data?.description || node.description || node.data?.cardRepresentation?.subtitle?.transformedLabel || `Shelf \u2022 ${currentShelf}`;
        const coverUrl = node.data?.images?.items?.[0]?.sources?.[0]?.url || node.data?.visualIdentity?.image?.[0]?.url || node.data?.cardRepresentation?.artwork?.sources?.[0]?.url || node.images?.[0]?.url || null;
        results.push({
          id,
          uri,
          name,
          description,
          coverUrl,
          shelf: currentShelf,
          isAlbum
        });
      }
      return;
    }
    for (const k of Object.keys(node)) {
      if (k !== "header" && k !== "title" && k !== "cardRepresentation") {
        extractFromNode(node[k], currentShelf);
      }
    }
  };
  extractFromNode(root, "Featured Playlists");
  if (results.length === 0) {
    return extractEntitiesFromObject(root);
  }
  return results;
}
function extractEntitiesFromObject(root, results = [], currentShelf = "Featured Shelves") {
  if (!root || typeof root !== "object") return results;
  if (Array.isArray(root)) {
    for (const item of root) {
      extractEntitiesFromObject(item, results, currentShelf);
    }
    return results;
  }
  let rawShelf = root.data?.title?.transformedLabel || root.title?.transformedLabel || root.data?.header?.title?.transformedLabel || root.header?.title?.transformedLabel || root.customFields?.title?.transformedLabel || root.customFields?.title?.text || root.data?.title?.text || (typeof root.title === "string" && root.title.trim() && !root.title.includes("http") && !root.title.includes("spotify:") ? root.title.trim() : null);
  const shelfName = rawShelf ? formatShelfTitle(rawShelf) : currentShelf;
  const uri = root.uri || root._uri || root.data?.uri;
  const typename = root.__typename || root.data?.__typename;
  if (uri && (uri.includes(":playlist:") || uri.includes(":album:") || typename === "Playlist" || typename === "Album" || typename === "PlaylistResponseWrapper" || typename === "AlbumResponseWrapper")) {
    const isAlbum = uri.includes(":album:") || typename === "Album" || typename === "AlbumResponseWrapper";
    const id = uri.split(":").pop();
    const name = root.data?.name || root.name || root.data?.cardRepresentation?.title?.transformedLabel || root.data?.data?.cardRepresentation?.title?.transformedLabel || (isAlbum ? "Featured Album" : "Featured Playlist");
    const description = root.data?.description || root.description || root.data?.cardRepresentation?.subtitle?.transformedLabel || `Shelf \u2022 ${shelfName}`;
    const coverUrl = root.data?.images?.items?.[0]?.sources?.[0]?.url || root.data?.visualIdentity?.image?.[0]?.url || root.data?.cardRepresentation?.artwork?.sources?.[0]?.url || root.images?.[0]?.url || null;
    if (id && !results.some((r) => r.id === id)) {
      results.push({
        id,
        uri,
        name,
        description,
        coverUrl,
        shelf: shelfName,
        isAlbum
      });
    }
  }
  for (const key of Object.keys(root)) {
    extractEntitiesFromObject(root[key], results, shelfName);
  }
  return results;
}
async function scrapeSpotifySection(sectionId, countryCode = "US", maxPlaylists = 50, cookieInput) {
  const [token, clientToken] = await Promise.all([
    getSpotifyWebAccessToken(cookieInput),
    getClientToken()
  ]);
  let sectionTitle = "Spotify Section";
  let sectionSubtitle = "";
  let extractedPlaylists = [];
  let rawSectionData = null;
  const cleanId = sectionId.replace(/^https?:\/\/[^\/]+\/(section|hub|genre|category)\//i, "").replace(/^spotify:(section|hub|page|genre|category):/i, "").split("?")[0];
  const customFetch = createCustomFetch(cookieInput);
  const parsed = parseSpotifyCookies(cookieInput);
  const hasCookies = !!(parsed.spDc || parsed.cookieHeader);
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "app-platform": "WebPlayer",
    "Accept": "application/json"
  };
  if (clientToken) {
    headers["client-token"] = clientToken;
  }
  for (const prefix of [`spotify:page:${cleanId}`, `spotify:section:${cleanId}`]) {
    if (extractedPlaylists.length > 0) break;
    try {
      const bpRes = await customFetch("https://api-partner.spotify.com/pathfinder/v1/query", {
        method: "POST",
        headers,
        body: JSON.stringify({
          operationName: "browsePage",
          variables: {
            uri: prefix,
            pagePagination: { offset: 0, limit: 10 },
            sectionPagination: { offset: 0, limit: 20 },
            browseEndUserIntegration: "INTEGRATION_WEB_PLAYER"
          },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: "f5c4e6d668f5716464a231c1cc8b22c1cbf6ad68b09929fd7de813a30581298b"
            }
          }
        })
      });
      if (bpRes.ok) {
        const bpData = await bpRes.json();
        if (bpData.data?.browse && bpData.data.browse.__typename !== "GenericError") {
          rawSectionData = bpData.data.browse;
          sectionTitle = bpData.data.browse.header?.title?.transformedLabel || sectionTitle;
          sectionSubtitle = bpData.data.browse.header?.subtitle?.transformedLabel || "";
          extractedPlaylists = parseSpotifySectionTree(bpData);
        }
      }
    } catch (e) {
      console.error("browsePage query error:", e);
    }
  }
  for (const prefix of [`spotify:section:${cleanId}`, `spotify:page:${cleanId}`]) {
    if (extractedPlaylists.length > 0) break;
    try {
      const bsRes = await customFetch("https://api-partner.spotify.com/pathfinder/v1/query", {
        method: "POST",
        headers,
        body: JSON.stringify({
          operationName: "browseSection",
          variables: {
            uri: prefix,
            pagination: { offset: 0, limit: 50 },
            browseEndUserIntegration: "INTEGRATION_WEB_PLAYER"
          },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: "b13c1cccbfcb6947753c2613411b3566485c21fd5f36d80a80bb64be61ba2d51"
            }
          }
        })
      });
      if (bsRes.ok) {
        const bsData = await bsRes.json();
        if (bsData.data?.browseSection) {
          rawSectionData = bsData.data.browseSection;
          sectionTitle = bsData.data.browseSection.data?.title?.transformedLabel || sectionTitle;
          sectionSubtitle = bsData.data.browseSection.data?.subtitle?.transformedLabel || "";
          extractedPlaylists = parseSpotifySectionTree(bsData);
        }
      }
    } catch (e) {
      console.error("browseSection query error:", e);
    }
  }
  if (extractedPlaylists.length === 0) {
    try {
      const hubRes = await customFetch("https://api-partner.spotify.com/pathfinder/v1/query", {
        method: "POST",
        headers,
        body: JSON.stringify({
          variables: {
            uri: `spotify:hub:${cleanId}`,
            countryCode
          },
          operationName: "countryHubsPage",
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: "6c2e4b04d8836507c2ad09c954f27a6c98d8b0a761f99ef6f4dc9bbe7834ba55"
            }
          }
        })
      });
      if (hubRes.ok) {
        const hubData = await hubRes.json();
        if (hubData.data?.countryHub) {
          rawSectionData = hubData.data.countryHub;
          sectionTitle = `Charts & Playlists Hub (${countryCode})`;
          sectionSubtitle = `Spotify Hub for ${countryCode}`;
          extractedPlaylists = parseSpotifySectionTree(hubData);
        }
      }
    } catch (e) {
      console.error("Hub query error:", e);
    }
  }
  if (extractedPlaylists.length === 0) {
    try {
      const secRes = await customFetch("https://api-partner.spotify.com/pathfinder/v1/query", {
        method: "POST",
        headers,
        body: JSON.stringify({
          variables: {
            uri: `spotify:section:${cleanId}`,
            timeZone: "UTC",
            homeEndUserIntegration: "INTEGRATION_WEB_PLAYER"
          },
          operationName: "homeSection",
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: "76243c78b0e20ecdbe41b794dec8cbe73f75e585b0a7201b8d2e84578412847a"
            }
          }
        })
      });
      if (secRes.ok) {
        const secData = await secRes.json();
        if (secData.data?.homeSections && secData.data.homeSections.__typename !== "GenericError") {
          rawSectionData = secData.data.homeSections;
          extractedPlaylists = parseSpotifySectionTree(secData);
        }
      }
    } catch (e) {
      console.error("homeSection error:", e);
    }
  }
  const scrapedPlaylists = [];
  const playlistsToScrape = extractedPlaylists.slice(0, maxPlaylists);
  const PL_BATCH_SIZE = 4;
  for (let p = 0; p < playlistsToScrape.length; p += PL_BATCH_SIZE) {
    const plBatch = playlistsToScrape.slice(p, p + PL_BATCH_SIZE);
    const batchResults = await Promise.all(
      plBatch.map(async (pl) => {
        try {
          const fetchUrl = pl.isAlbum ? `https://open.spotify.com/album/${pl.id}` : `https://open.spotify.com/playlist/${pl.id}`;
          const plData = await safeGetSpotifyData(fetchUrl, cookieInput);
          const rawTrackList = plData.trackList || plData.tracks?.items || [];
          const plCover = plData.images?.[0]?.url || pl.coverUrl || null;
          const initialTracks = rawTrackList.map((t) => {
            const trackTitle = t.title || t.name || "Unknown Track";
            const artistName = t.subtitle || t.artists?.map((a) => a.name).join(", ") || "Unknown Artist";
            const directCover = t.coverArt?.sources?.[0]?.url || t.images?.[0]?.url || (pl.isAlbum ? plCover : null);
            return {
              id: t.id || (t.uri ? t.uri.split(":").pop() : Math.random().toString()),
              uri: t.uri || (t.id ? `spotify:track:${t.id}` : null),
              title: trackTitle,
              artist: artistName,
              album: t.album || (pl.isAlbum ? plData.name || pl.name : null),
              coverUrl: directCover,
              previewUrl: t.audioPreview?.url || t.preview_url || null,
              durationMs: t.duration || t.duration_ms || 0,
              canvasUrl: null
            };
          });
          const TRACK_BATCH_SIZE = 12;
          for (let b = 0; b < initialTracks.length; b += TRACK_BATCH_SIZE) {
            const batch = initialTracks.slice(b, b + TRACK_BATCH_SIZE);
            await Promise.all(
              batch.map(async (t, idxInBatch) => {
                const trackGlobalIdx = b + idxInBatch;
                if (!t.coverUrl) {
                  const details = await resolveTrackDetails(t.title, t.artist);
                  if (details.coverUrl) {
                    t.coverUrl = details.coverUrl;
                  }
                  if (details.album) {
                    t.album = details.album;
                  }
                }
                if (!t.album) {
                  t.album = pl.isAlbum ? plData.name || pl.name : `${t.title} - Single`;
                }
                if (!t.coverUrl) {
                  t.coverUrl = plCover;
                }
                if (trackGlobalIdx < 3 && t.id && t.id.length > 10) {
                  const canvas = await fetchTrackCanvas(t.id, cookieInput);
                  if (canvas?.canvasUrl) {
                    t.canvasUrl = canvas.canvasUrl;
                  }
                }
              })
            );
          }
          return {
            id: pl.id,
            uri: pl.uri,
            name: plData.name || pl.name,
            description: plData.description || pl.description,
            shelf: pl.shelf,
            owner: plData.owner?.display_name || (pl.isAlbum ? plData.artists?.[0]?.name : "Spotify"),
            coverUrl: plCover || (initialTracks[0]?.coverUrl || null),
            trackCount: initialTracks.length,
            trackList: initialTracks,
            raw: plData
          };
        } catch (err) {
          return {
            id: pl.id,
            uri: pl.uri,
            name: pl.name,
            description: pl.description,
            shelf: pl.shelf,
            owner: "Spotify",
            coverUrl: pl.coverUrl,
            trackCount: 0,
            trackList: [],
            error: err.message
          };
        }
      })
    );
    scrapedPlaylists.push(...batchResults);
  }
  const uniqueShelves = Array.from(new Set(scrapedPlaylists.map((p) => p.shelf || "Featured Shelves")));
  return {
    type: "section",
    id: cleanId,
    title: sectionTitle,
    subtitle: sectionSubtitle,
    countryCode,
    hasCookies,
    cookieStatus: hasCookies ? `Authenticated Spotify Session (${parsed.count || 1} cookies)` : "Guest Session",
    shelvesCount: uniqueShelves.length,
    playlistCount: scrapedPlaylists.length,
    totalTracksCount: scrapedPlaylists.reduce((acc, p) => acc + (p.trackCount || 0), 0),
    playlists: scrapedPlaylists,
    raw: rawSectionData
  };
}
async function enrichSpotifyData(data, cookieInput) {
  if (!data) return data;
  if (data.type === "track") {
    const images = data.visualIdentity?.image || data.coverArt?.sources || data.images || [];
    const bestImage = images.find((img) => img.maxHeight === 300 || img.maxHeight === 640 || img.width === 300 || img.width === 640) || images[0];
    if (bestImage?.url) {
      data.coverUrl = bestImage.url;
    }
    const artist = data.artists?.map((a) => a.name).join(" ") || data.subtitle || "";
    const details = await resolveTrackDetails(data.title || data.name, artist);
    if (details.album) {
      data.album = details.album;
    }
    if (!data.coverUrl && details.coverUrl) {
      data.coverUrl = details.coverUrl;
    }
    if (!data.album) {
      data.album = `${data.name || data.title} - Single`;
    }
    const trackId = data.id || (data.uri ? data.uri.split(":").pop() : null);
    if (trackId) {
      const canvas = await fetchTrackCanvas(trackId, cookieInput);
      if (canvas?.canvasUrl) {
        data.canvasUrl = canvas.canvasUrl;
      }
    }
    return data;
  }
  if (data.trackList && Array.isArray(data.trackList)) {
    const tracks = data.trackList;
    const isAlbum = data.type === "album";
    const playlistCover = data.images?.[0]?.url || data.coverArt?.sources?.[0]?.url || null;
    const BATCH_SIZE = 8;
    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (t) => {
          const trackTitle = t.title || t.name;
          const trackArtist = t.subtitle || t.artists?.map((a) => a.name).join(", ") || "";
          const details = await resolveTrackDetails(trackTitle, trackArtist);
          if (details.coverUrl) {
            t.coverUrl = details.coverUrl;
          }
          if (details.album) {
            t.album = details.album;
          }
          if (!t.album) {
            t.album = isAlbum ? data.name || data.title : `${trackTitle} - Single`;
          }
          if (!t.coverUrl) {
            t.coverUrl = playlistCover;
          }
          const trackId = t.id || (t.uri ? t.uri.split(":").pop() : null);
          if (trackId && trackId.length > 10) {
            const canvas = await fetchTrackCanvas(trackId, cookieInput);
            if (canvas?.canvasUrl) {
              t.canvasUrl = canvas.canvasUrl;
            }
          }
        })
      );
    }
  }
  return data;
}
var isVercel = process.env.VERCEL === "1" || process.env.NOW_BUILDER !== void 0;
var DATA_DIR = isVercel ? "/tmp/data" : path.join(process.cwd(), "data");
var HOSTED_FILE = path.join(DATA_DIR, "hosted-playlists.json");
var hostedStore = {};
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
function loadHostedStore() {
  try {
    ensureDataDir();
    if (fs.existsSync(HOSTED_FILE)) {
      const content = fs.readFileSync(HOSTED_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to load hosted store:", err);
  }
  return {};
}
function saveHostedStore() {
  try {
    ensureDataDir();
    fs.writeFileSync(HOSTED_FILE, JSON.stringify(hostedStore, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save hosted store:", err);
  }
}
hostedStore = loadHostedStore();
function sanitizeSlug(input) {
  if (!input) return `playlist-${Date.now()}`;
  let clean = input.trim().toLowerCase();
  if (clean.endsWith(".json")) {
    clean = clean.substring(0, clean.length - 5);
  }
  clean = clean.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return clean || `playlist-${Date.now()}`;
}
async function refreshHostedItem(idOrSlug) {
  const itemKey = Object.keys(hostedStore).find((k) => {
    const h = hostedStore[k];
    return h.id === idOrSlug || h.slug === idOrSlug || h.slug === idOrSlug.replace(/\.json$/, "");
  });
  if (!itemKey) return null;
  const item = hostedStore[itemKey];
  try {
    console.log(`[Daily Refresh] Updating hosted playlist API: ${item.slug} (${item.sourceUrl})`);
    let freshTracks = [];
    let coverUrl = item.coverUrl;
    let name = item.name;
    let description = item.description;
    if (item.sourceUrl === "custom-section") {
      console.log(`[Daily Refresh] Skipping update for custom section: ${item.slug}`);
      freshTracks = item.tracks || [];
    } else if (item.sourceType === "section" || item.sourceUrl.includes("/section/") || item.sourceUrl.includes("/hub/")) {
      const parts = item.sourceUrl.split(/[/?#]/);
      const idx = parts.findIndex((p) => p === "section" || p === "hub");
      const secId = idx !== -1 ? parts[idx + 1] : parts[parts.length - 1];
      const secData = await scrapeSpotifySection(secId, "US", 50, item.cookies);
      if (secData && secData.playlists) {
        freshTracks = secData.playlists.flatMap((p) => p.trackList || []);
        if (secData.title) name = secData.title;
      }
    } else {
      const rawData = await safeGetSpotifyData(item.sourceUrl, item.cookies);
      const enriched = await enrichSpotifyData(rawData, item.cookies);
      if (enriched) {
        freshTracks = enriched.trackList || (enriched.tracks ? Array.isArray(enriched.tracks) ? enriched.tracks : enriched.tracks.items : []);
        coverUrl = enriched.coverUrl || enriched.images?.[0]?.url || coverUrl;
        name = enriched.name || enriched.title || name;
        description = enriched.description || description;
      }
    }
    const now = /* @__PURE__ */ new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    item.name = name;
    item.description = description;
    item.coverUrl = coverUrl;
    if (freshTracks.length > 0) {
      item.tracks = freshTracks;
    }
    item.trackCount = item.tracks.length;
    item.lastUpdated = now.toISOString();
    item.nextRefreshAt = next24h.toISOString();
    saveHostedStore();
    return item;
  } catch (err) {
    console.error(`Error refreshing item ${item.slug}:`, err.message);
    return item;
  }
}
var app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-spotify-cookies, x-spotify-sp-dc");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var apiRouter = express.Router();
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", service: "uvytunesspotify-api", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
apiRouter.get("/hosted/list", (req, res) => {
  const items = Object.values(hostedStore).map((item) => ({
    ...item,
    publicUrl: `/api/public/${item.slug}.json`,
    directUrl: `/api/${item.slug}.json`,
    vercelUrl: `https://uvytunesspotify.vercel.app/api/${item.slug}.json`
  }));
  res.json({ count: items.length, items });
});
apiRouter.post("/hosted/add", async (req, res) => {
  try {
    const { name, description, sourceUrl, sourceType, tracks, coverUrl, autoUpdateDaily, cookies, slug: rawSlug, raw, playlists } = req.body;
    if (!name || !sourceUrl && !playlists) {
      return res.status(400).json({ error: "name and sourceUrl (or playlists) are required" });
    }
    const slug = sanitizeSlug(rawSlug || name);
    const id = crypto.randomUUID();
    const now = /* @__PURE__ */ new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    const newItem = {
      id,
      slug,
      name,
      description: description || `Served Spotify ${sourceType || "playlist"}`,
      sourceUrl: sourceUrl || "custom-section",
      sourceType: sourceType || (sourceUrl?.includes("/section/") ? "section" : "playlist"),
      trackCount: Array.isArray(tracks) ? tracks.length : Array.isArray(playlists) ? playlists.reduce((acc, p) => acc + (p.trackCount || p.trackList?.length || 0), 0) : 0,
      coverUrl: coverUrl || null,
      lastUpdated: now.toISOString(),
      nextRefreshAt: next24h.toISOString(),
      autoUpdateDaily: autoUpdateDaily !== false,
      cookies: cookies || void 0,
      tracks: Array.isArray(tracks) ? tracks : [],
      playlists: Array.isArray(playlists) ? playlists : void 0,
      raw: raw || void 0
    };
    hostedStore[slug] = newItem;
    saveHostedStore();
    res.json({
      success: true,
      message: `Playlist successfully published to API!`,
      slug: newItem.slug,
      item: newItem,
      publicUrl: `/api/public/${newItem.slug}.json`,
      directUrl: `/api/${newItem.slug}.json`,
      vercelUrl: `https://uvytunesspotify.vercel.app/api/${newItem.slug}.json`
    });
  } catch (err) {
    console.error("Error serving playlist to API:", err);
    res.status(500).json({ error: err.message || "Failed to publish playlist to API" });
  }
});
apiRouter.post("/hosted/refresh/:id", async (req, res) => {
  try {
    const updated = await refreshHostedItem(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: "Hosted endpoint not found" });
    }
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to refresh endpoint" });
  }
});
apiRouter.delete("/hosted/:id", (req, res) => {
  const idOrSlug = req.params.id;
  const key = Object.keys(hostedStore).find((k) => hostedStore[k].id === idOrSlug || hostedStore[k].slug === idOrSlug || k === idOrSlug);
  if (key && hostedStore[key]) {
    delete hostedStore[key];
    saveHostedStore();
    return res.json({ success: true, message: "Endpoint deleted" });
  }
  res.status(404).json({ error: "Endpoint not found" });
});
var handleServePublicJson = async (req, res) => {
  try {
    let rawSlug = req.params.slug || req.params[0] || "";
    let slug = Array.isArray(rawSlug) ? rawSlug[0] : String(rawSlug);
    if (!slug) {
      return res.status(400).json({ error: "Slug is required" });
    }
    if (slug.endsWith(".json")) {
      slug = slug.substring(0, slug.length - 5);
    }
    const itemKey = Object.keys(hostedStore).find((k) => k === slug || hostedStore[k].slug === slug || hostedStore[k].id === slug);
    let item = itemKey ? hostedStore[itemKey] : null;
    if (!item) {
      return res.status(404).json({
        error: "API Endpoint not found",
        requestedSlug: slug,
        availableEndpoints: Object.values(hostedStore).map((h) => `/api/public/${h.slug}.json`)
      });
    }
    const now = /* @__PURE__ */ new Date();
    if (item.autoUpdateDaily && new Date(item.nextRefreshAt) <= now) {
      console.log(`[API Access] Auto-update triggered for ${slug} on request`);
      const refreshed = await refreshHostedItem(item.id);
      if (refreshed) item = refreshed;
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400");
    res.json({
      status: "ok",
      slug: item.slug,
      name: item.name,
      description: item.description,
      sourceUrl: item.sourceUrl,
      sourceType: item.sourceType,
      coverUrl: item.coverUrl,
      trackCount: item.trackCount,
      lastUpdated: item.lastUpdated,
      nextRefreshAt: item.nextRefreshAt,
      autoUpdateDaily: item.autoUpdateDaily,
      hostedAt: `https://uvytunesspotify.vercel.app/api/${item.slug}.json`,
      playlists: item.playlists,
      tracks: item.tracks,
      raw: item.raw
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to serve JSON endpoint" });
  }
};
apiRouter.get("/public/:slug.json", handleServePublicJson);
apiRouter.get("/public/:slug", handleServePublicJson);
apiRouter.get("/hosted/:slug", handleServePublicJson);
apiRouter.get("/hosted/:slug.json", handleServePublicJson);
apiRouter.get("/vercel/export-code", (req, res) => {
  const hostedList = Object.values(hostedStore);
  const vercelJson = {
    "version": 2,
    "name": "uvytunesspotify-api",
    "rewrites": [
      { "source": "/api/(.*)", "destination": "/api/index" },
      { "source": "/((?!api/).*)", "destination": "/index.html" }
    ]
  };
  const apiIndexJs = `// Vercel Serverless Function: api/index.js
import app from './app.js';
export default app;
`;
  res.json({
    "vercel.json": JSON.stringify(vercelJson, null, 2),
    "api/index.js": apiIndexJs,
    hostedCount: hostedList.length
  });
});
apiRouter.post("/cookies/verify", async (req, res) => {
  try {
    const cookieInput = req.body?.cookies || req.body?.sp_dc || req.body;
    const verification = await verifySpotifyCookies(cookieInput);
    res.json(verification);
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message || "Failed to verify cookies" });
  }
});
var handleScrapeRequest = async (req, res) => {
  try {
    const url = req.body?.url || req.query.url;
    const country = req.body?.country || req.query.country || "US";
    const cookies = req.body?.cookies || req.query.cookies || req.body?.sp_dc || req.query.sp_dc || req.headers["x-spotify-cookies"] || req.headers["x-spotify-sp-dc"] || void 0;
    if (!url || !url.includes("spotify.com") && !url.startsWith("spotify:")) {
      return res.status(400).json({ error: "Valid Spotify URL is required" });
    }
    console.log(`Scraping Spotify URL: ${url} (Country: ${country}, HasCookies: ${!!cookies})`);
    if (url.includes("/section/") || url.includes("/hub/") || url.startsWith("spotify:section:") || url.startsWith("spotify:hub:")) {
      const parts = url.split(/[/?#]/);
      const sectionIdx = parts.findIndex((p) => p === "section" || p === "hub");
      const sectionId = sectionIdx !== -1 ? parts[sectionIdx + 1] : parts[parts.length - 1];
      const sectionData = await scrapeSpotifySection(sectionId, country, 25, cookies);
      return res.json(sectionData);
    }
    const rawData = await safeGetSpotifyData(url, cookies);
    let enrichedData = rawData;
    try {
      enrichedData = await enrichSpotifyData(rawData, cookies);
    } catch (enrichErr) {
      console.warn("Enrichment warning, returning base scraped data:", enrichErr?.message || enrichErr);
    }
    return res.json(enrichedData);
  } catch (err) {
    console.error("Scraping error:", err);
    return res.status(400).json({
      error: err.message || "Failed to scrape Spotify data",
      tip: "If this playlist is private or geo-restricted, paste your sp_dc cookie into the cookie settings."
    });
  }
};
apiRouter.get("/scrape", handleScrapeRequest);
apiRouter.post("/scrape", handleScrapeRequest);
var handleSectionScrape = async (req, res) => {
  try {
    const sectionId = req.body?.sectionId || req.body?.id || req.query.id || req.body?.url || req.query.url;
    const country = req.body?.country || req.query.country || "US";
    const maxPlaylists = req.body?.maxPlaylists ? Number(req.body.maxPlaylists) : 50;
    const cookies = req.body?.cookies || req.query.cookies || req.body?.sp_dc || req.query.sp_dc || req.headers["x-spotify-cookies"] || req.headers["x-spotify-sp-dc"] || void 0;
    if (!sectionId) {
      return res.status(400).json({ error: "Section ID or URL is required" });
    }
    const sectionData = await scrapeSpotifySection(sectionId, country, maxPlaylists, cookies);
    res.json(sectionData);
  } catch (err) {
    console.error("Section scraping error:", err);
    res.status(500).json({ error: err.message || "Failed to scrape Spotify section" });
  }
};
apiRouter.get("/scrape/section", handleSectionScrape);
apiRouter.post("/scrape/section", handleSectionScrape);
var handleCanvasRequest = async (req, res) => {
  try {
    const trackId = req.body?.trackId || req.query.trackId || req.body?.id || req.query.id || req.body?.url || req.query.url;
    const cookies = req.body?.cookies || req.query.cookies || req.body?.sp_dc || req.query.sp_dc || req.headers["x-spotify-cookies"] || req.headers["x-spotify-sp-dc"] || void 0;
    if (!trackId) {
      return res.status(400).json({ error: "trackId is required" });
    }
    const canvas = await fetchTrackCanvas(trackId, cookies);
    res.json(canvas || { canvasUrl: null });
  } catch (err) {
    console.error("Canvas fetch error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch canvas" });
  }
};
apiRouter.get("/canvas", handleCanvasRequest);
apiRouter.post("/canvas", handleCanvasRequest);
apiRouter.get("/:slug.json", handleServePublicJson);
app.use("/api", apiRouter);
app.use("/", apiRouter);
app.all("/api/scrape", handleScrapeRequest);
app.all("/scrape", handleScrapeRequest);
app.all("/api/scrape/section", handleSectionScrape);
app.all("/scrape/section", handleSectionScrape);
app.all("/api/canvas", handleCanvasRequest);
app.all("/canvas", handleCanvasRequest);
app.all(["/api", "/api/*all"], (req, res) => {
  res.status(404).json({
    error: "API route not found",
    method: req.method,
    path: req.originalUrl || req.url
  });
});
var app_default = app;
export {
  app,
  createCustomFetch,
  app_default as default,
  enrichSpotifyData,
  extractEntitiesFromObject,
  fetchSpotifyEmbedPage,
  fetchSpotifyOembed,
  fetchTrackCanvas,
  getClientToken,
  getSpotifyWebAccessToken,
  hostedStore,
  parseSpotifySectionTree,
  parseSpotifyUrl,
  refreshHostedItem,
  resolveTrackDetails,
  safeGetSpotifyData,
  scrapeSpotifySection,
  verifySpotifyCookies
};
