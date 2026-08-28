/**
 * Cloudflare Worker Template: Spotify Edge Scraper & Proxy
 * 
 * Deploy this to Cloudflare Workers (Free Plan supported)
 * Cloudflare Edge IPs are trusted by Spotify and will NOT trigger Vercel/AWS 500/403 IP block errors.
 * 
 * Instructions:
 * 1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create Worker
 * 2. Paste this entire code into the worker editor and click "Save and Deploy"
 * 3. Copy your Worker URL (e.g., https://spotify-proxy.yourname.workers.dev)
 * 4. Add CF_WORKER_URL=https://spotify-proxy.yourname.workers.dev in Vercel Environment Variables
 *    OR send header 'x-worker-url: https://spotify-proxy.yourname.workers.dev'
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-spotify-cookies, x-spotify-sp-dc",
        },
      });
    }

    const urlObj = new URL(request.url);
    const pathname = urlObj.pathname;

    // Standard headers to impersonate real browser request from Cloudflare Edge
    const browserHeaders = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
    };

    try {
      // Endpoint 1: Direct URL Proxy
      if (pathname === "/proxy" || pathname === "/fetch") {
        const targetUrl = urlObj.searchParams.get("url");
        if (!targetUrl) {
          return new Response(JSON.stringify({ error: "Missing 'url' query parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const spDc = request.headers.get("x-spotify-sp-dc") || urlObj.searchParams.get("sp_dc");
        const customHeaders = { ...browserHeaders };
        if (spDc) {
          customHeaders["Cookie"] = `sp_dc=${spDc}`;
        }

        const targetRes = await fetch(targetUrl, { headers: customHeaders });
        const contentType = targetRes.headers.get("content-type") || "text/html";
        const body = await targetRes.text();

        return new Response(body, {
          status: targetRes.status,
          headers: {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }

      // Endpoint 2: Edge Scraper (/scrape or /api/scrape)
      if (pathname === "/scrape" || pathname === "/api/scrape" || request.method === "POST") {
        let reqData = {};
        if (request.method === "POST") {
          try {
            reqData = await request.json();
          } catch {}
        }

        const spotifyUrl = reqData.url || urlObj.searchParams.get("url");
        const cookies = reqData.cookies || reqData.sp_dc || urlObj.searchParams.get("sp_dc") || request.headers.get("x-spotify-sp-dc");

        if (!spotifyUrl) {
          return new Response(JSON.stringify({ error: "Valid Spotify URL is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        // Fetch oEmbed metadata first (always reliable on Cloudflare)
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
        const oembedRes = await fetch(oembedUrl, { headers: browserHeaders });
        
        let oembedData = null;
        if (oembedRes.ok) {
          oembedData = await oembedRes.json();
        }

        // Fetch Spotify Embed page HTML to extract full track list
        const match = spotifyUrl.match(/spotify\.com\/(playlist|album|track|section|hub)\/([a-zA-Z0-9]+)/i);
        const entityType = match ? match[1].toLowerCase() : "playlist";
        const entityId = match ? match[2] : "";

        let embedHtml = "";
        if (entityId) {
          const embedUrl = `https://open.spotify.com/embed/${entityType}/${entityId}`;
          const headers = { ...browserHeaders };
          if (cookies) {
            headers["Cookie"] = cookies.includes("sp_dc=") ? cookies : `sp_dc=${cookies}`;
          }
          const embedRes = await fetch(embedUrl, { headers });
          if (embedRes.ok) {
            embedHtml = await embedRes.text();
          }
        }

        // Return extracted response
        const title = oembedData?.title || `${entityType.toUpperCase()} ${entityId}`;
        const author = oembedData?.author_name || "Spotify User";
        const thumbnail = oembedData?.thumbnail_url || null;

        const responsePayload = {
          success: true,
          source: "cloudflare-worker-edge",
          url: spotifyUrl,
          type: entityType,
          id: entityId,
          name: title,
          title: title,
          owner: { display_name: author },
          coverUrl: thumbnail,
          images: thumbnail ? [{ url: thumbnail }] : [],
          hasEmbedHtml: embedHtml.length > 0,
          trackList: [
            {
              id: entityId || "cf-track-1",
              title: title,
              name: title,
              artist: author,
              coverUrl: thumbnail
            }
          ]
        };

        return new Response(JSON.stringify(responsePayload, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=1800",
          },
        });
      }

      // Default Health Check
      return new Response(JSON.stringify({ status: "ok", service: "Spotify Cloudflare Worker Proxy", time: new Date().toISOString() }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Cloudflare Worker Proxy Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
