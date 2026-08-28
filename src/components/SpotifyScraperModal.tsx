import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Link, FileJson, Play, Download, AlertCircle, Music, Layers, ListMusic, Globe, Key, ShieldCheck, CheckCircle2, XCircle, Trash2, HelpCircle, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { UnifiedSection, UnifiedPlaylist, ParsedSpotifyCookies } from '../types';
import { parseSpotifyCookies } from '../utils';

interface SpotifyScraperModalProps {
  onClose: () => void;
  onVisualizePlaylist: (data: any) => void;
  onVisualizeSection: (section: UnifiedSection) => void;
}

export const SpotifyScraperModal: React.FC<SpotifyScraperModalProps> = ({
  onClose,
  onVisualizePlaylist,
  onVisualizeSection,
}) => {
  const [url, setUrl] = useState('');
  const [country, setCountry] = useState('US');
  const [cookieInput, setCookieInput] = useState('');
  const [showCookieManager, setShowCookieManager] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isVerifyingCookies, setIsVerifyingCookies] = useState(false);
  const [cookieVerifyResult, setCookieVerifyResult] = useState<{
    valid: boolean;
    isAnonymous?: boolean;
    username?: string;
    error?: string;
    clientId?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Load saved session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('spotify_user_session_cookies');
      if (saved) {
        setCookieInput(saved);
        const savedInfo = localStorage.getItem('spotify_user_session_info');
        if (savedInfo) {
          setCookieVerifyResult(JSON.parse(savedInfo));
        }
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  // Parse cookies in real-time as user types/pastes
  const parsedCookies: ParsedSpotifyCookies = useMemo(() => {
    return parseSpotifyCookies(cookieInput);
  }, [cookieInput]);

  const quickLinks = [
    {
      label: 'Top Charts Section (US)',
      url: 'https://open.spotify.com/section/0JQ5DAnM3wGh0gz1MXnukA',
      type: 'section'
    },
    {
      label: 'New Music Friday I-Pop',
      url: 'https://open.spotify.com/playlist/37i9dQZF1DWVCuOatqCW5M',
      type: 'playlist'
    },
    {
      label: 'Top 50 - Global',
      url: 'https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF',
      type: 'playlist'
    },
    {
      label: 'Popular Section (Featured Charts)',
      url: 'spotify:section:0JQ5DAzQHECxDlYNI6xD1g',
      type: 'section'
    }
  ];

  const handleVerifyAndSaveCookies = async (inputToVerify = cookieInput) => {
    if (!inputToVerify.trim()) {
      setCookieVerifyResult({
        valid: false,
        error: "Please paste your Spotify cookie JSON, cookie header, or sp_dc string first."
      });
      return;
    }

    setIsVerifyingCookies(true);
    setCookieVerifyResult(null);

    try {
      const res = await fetch("/api/cookies/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies: inputToVerify })
      });

      const data = await res.json();
      setCookieVerifyResult(data);

      if (data.valid) {
        localStorage.setItem('spotify_user_session_cookies', inputToVerify);
        localStorage.setItem('spotify_user_session_info', JSON.stringify(data));
      }
    } catch (err: any) {
      setCookieVerifyResult({
        valid: false,
        error: err.message || "Failed to reach cookie verification service"
      });
    } finally {
      setIsVerifyingCookies(false);
    }
  };

  const handleClearCookies = () => {
    setCookieInput('');
    setCookieVerifyResult(null);
    try {
      localStorage.removeItem('spotify_user_session_cookies');
      localStorage.removeItem('spotify_user_session_info');
    } catch {}
  };

  const handlePasteSampleJson = () => {
    const sample = JSON.stringify([
      {
        "domain": ".spotify.com",
        "name": "sp_dc",
        "value": "AQB_PASTE_YOUR_ACTUAL_SP_DC_COOKIE_HERE",
        "path": "/",
        "secure": true,
        "httpOnly": true
      },
      {
        "domain": ".spotify.com",
        "name": "sp_key",
        "value": "sample-key-uuid",
        "path": "/",
        "secure": true
      },
      {
        "domain": ".spotify.com",
        "name": "sp_m",
        "value": "us",
        "path": "/",
        "secure": true
      }
    ], null, 2);

    setCookieInput(sample);
  };

  const handleScrape = async (targetUrl = url) => {
    const inputUrl = targetUrl.trim();
    if (!inputUrl) return;

    if (!inputUrl.includes('spotify.com') && !inputUrl.startsWith('spotify:')) {
      setError("Please enter a valid Spotify URL or URI (e.g. open.spotify.com/section/... or open.spotify.com/playlist/...)");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const isSection = inputUrl.includes('/section/') || inputUrl.includes('/hub/') || inputUrl.startsWith('spotify:section:') || inputUrl.startsWith('spotify:hub:');
    const hasActiveCookies = parsedCookies.count > 0 || (cookieVerifyResult && cookieVerifyResult.valid);

    if (isSection) {
      setStatusMessage(hasActiveCookies 
        ? "Extracting section shelves with Authenticated Spotify Session (Canvas loops enabled)..." 
        : "Extracting section shelves, playlists & resolving track covers + Canvas videos...");
    } else {
      setStatusMessage(hasActiveCookies 
        ? "Extracting tracks with Authenticated Spotify Session & high-res artwork..." 
        : "Extracting track metadata, resolving individual artwork & checking Canvas videos...");
    }

    try {
      // Use POST request to support large cookie payloads cleanly
      const payload: any = {
        url: inputUrl,
        country: country
      };

      if (cookieInput.trim()) {
        payload.cookies = cookieInput.trim();
      }

      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to scrape Spotify data. Please verify the URL and try again.");
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const handleDownloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    const prefix = result.type === 'section' ? `spotify-section-${result.id || 'export'}` : 'spotify-scrape';
    link.download = `${prefix}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const isSectionResult = result && result.type === 'section' && Array.isArray(result.playlists);
  const isSessionActive = cookieVerifyResult?.valid && !cookieVerifyResult?.isAnonymous;

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans flex justify-center">
      <div className="max-w-4xl w-full pb-24">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors shrink-0"
              title="Go Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#1DB954]">Spotify Section & Playlist Scraper</h1>
              <p className="text-neutral-400 text-sm mt-1">
                Extract complete metadata for Spotify Sections, nested Playlists, Albums, and Tracks
              </p>
            </div>
          </div>

          {/* Session Status Button */}
          <button
            onClick={() => setShowCookieManager(!showCookieManager)}
            className={`text-xs px-3.5 py-2 rounded-full border transition-all flex items-center gap-2 font-medium shrink-0 ${
              isSessionActive
                ? 'bg-[#1DB954]/15 border-[#1DB954]/40 text-[#1DB954] hover:bg-[#1DB954]/25 shadow-sm'
                : parsedCookies.count > 0
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <Key size={14} className={isSessionActive ? 'text-[#1DB954]' : 'text-neutral-400'} />
            <span>
              {isSessionActive
                ? `Authenticated: ${cookieVerifyResult.username || 'Spotify Account'}`
                : parsedCookies.count > 0
                ? `${parsedCookies.count} Cookies Loaded (Unverified)`
                : 'Paste JSON Cookies (Optional)'}
            </span>
            <span className="text-[10px] opacity-75 font-mono">
              {showCookieManager ? '▲' : '▼'}
            </span>
          </button>
        </div>

        <div className="space-y-6">
          {/* Collapsible Cookie Session Manager */}
          {showCookieManager && (
            <div className="bg-[#181818] p-6 rounded-xl border border-neutral-700/80 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Spotify Cookie Session & JSON Importer
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Paste exported JSON cookie arrays from Chrome extensions (Cookie-Editor / EditThisCookie) or raw <code className="text-[#1DB954]">sp_dc</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 bg-neutral-800/70 hover:bg-neutral-800 px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    <HelpCircle size={13} /> {showGuide ? 'Hide Guide' : 'How to export'}
                  </button>
                  {cookieInput && (
                    <button
                      onClick={handleClearCookies}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-md transition-colors"
                    >
                      <Trash2 size={13} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Quick 30-second Export Guide */}
              {showGuide && (
                <div className="p-4 bg-neutral-900/90 rounded-lg border border-neutral-800 text-xs space-y-2 text-neutral-300">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#1DB954]" /> How to get your Spotify JSON cookies in 3 clicks:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-neutral-300 pl-1">
                    <li>Log into <strong className="text-white">open.spotify.com</strong> in your browser.</li>
                    <li>Install the free extension <strong className="text-white">Cookie-Editor</strong> or <strong className="text-white">EditThisCookie</strong>.</li>
                    <li>Click the extension icon on open.spotify.com → click <strong className="text-[#1DB954]">"Export" / "Export as JSON"</strong>.</li>
                    <li>Paste the entire JSON array directly into the box below and click <strong className="text-white">"Verify & Save Session"</strong>.</li>
                  </ol>
                </div>
              )}

              {/* Textarea for JSON / string cookies */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-neutral-300">
                    Paste Cookie JSON Array, Header String, or <code className="text-[#1DB954]">sp_dc</code>:
                  </label>
                  <button
                    onClick={handlePasteSampleJson}
                    className="text-[11px] text-neutral-400 hover:text-[#1DB954] transition-colors underline"
                  >
                    Insert Example JSON Template
                  </button>
                </div>

                <textarea
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder={`[
  {
    "domain": ".spotify.com",
    "name": "sp_dc",
    "value": "AQB_PASTE_YOUR_COOKIE_HERE..."
  },
  {
    "domain": ".spotify.com",
    "name": "sp_key",
    "value": "..."
  }
]`}
                  rows={6}
                  className="w-full bg-[#121212] border border-neutral-700/80 rounded-lg p-3.5 text-xs font-mono text-neutral-200 focus:outline-none focus:border-[#1DB954] transition-colors"
                />
              </div>

              {/* Real-time Parser Analysis Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-neutral-400 font-medium">Detected:</span>
                  <span className={`text-xs px-2.5 py-1 rounded-md font-mono font-medium ${
                    parsedCookies.count > 0 ? 'bg-neutral-800 text-white border border-neutral-700' : 'bg-neutral-800/40 text-neutral-500'
                  }`}>
                    🍪 {parsedCookies.count} cookies
                  </span>

                  {parsedCookies.spDc ? (
                    <span className="text-xs px-2.5 py-1 rounded-md bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954] font-mono flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> sp_dc: {parsedCookies.spDc.slice(0, 8)}...{parsedCookies.spDc.slice(-4)}
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-400 font-mono">
                      sp_dc: None
                    </span>
                  )}

                  {parsedCookies.spKey && (
                    <span className="text-xs px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono">
                      sp_key: present
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerifyAndSaveCookies()}
                    disabled={isVerifyingCookies || !cookieInput.trim()}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md"
                  >
                    {isVerifyingCookies ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} /> Verify & Save Session
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Verification Feedback Banner */}
              {cookieVerifyResult && (
                <div className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                  cookieVerifyResult.valid
                    ? 'bg-[#1DB954]/10 border-[#1DB954]/30 text-neutral-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {cookieVerifyResult.valid ? (
                    <CheckCircle2 size={16} className="text-[#1DB954] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    {cookieVerifyResult.valid ? (
                      <>
                        <p className="font-bold text-[#1DB954]">
                          Authenticated Spotify Session Connected!
                        </p>
                        <p className="text-neutral-300 text-[11px] leading-relaxed">
                          Account: <strong className="text-white">{cookieVerifyResult.username || 'Authenticated User'}</strong> ({cookieVerifyResult.isAnonymous ? 'Guest Token' : 'Full Web Player Access'}). Spotify Canvas MP4 looping videos, regional sections, and authenticated queries are now fully active and will be used automatically.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-red-400">Cookie Verification Failed</p>
                        <p className="text-red-200 text-[11px] leading-relaxed">
                          {cookieVerifyResult.error || "Could not authenticate with provided cookies."} Make sure your <code className="text-white">sp_dc</code> cookie is fresh and not expired.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Input Card */}
          <div className="bg-[#181818] p-6 rounded-xl border border-neutral-800 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-neutral-200">Spotify Link or URI</label>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-neutral-400" />
                <span className="text-xs text-neutral-400">Storefront Region:</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="bg-[#121212] border border-neutral-700 text-xs text-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-[#1DB954]"
                >
                  <option value="US">United States (US)</option>
                  <option value="IN">India (IN)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="SG">Singapore (SG)</option>
                  <option value="DE">Germany (DE)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="AU">Australia (AU)</option>
                  <option value="JP">Japan (JP)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://open.spotify.com/section/... OR playlist/..."
                className="flex-1 bg-[#121212] border border-neutral-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1DB954] transition-colors font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              />

              <button
                onClick={() => handleScrape()}
                disabled={!url.trim() || loading}
                className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 shadow-md"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Link size={18} />
                )}
                Scrape
              </button>
            </div>

            {/* Quick links & Status */}
            <div className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mr-1">Quick Links:</span>
                  {quickLinks.map((ql) => (
                    <button
                      key={ql.label}
                      onClick={() => {
                        setUrl(ql.url);
                        handleScrape(ql.url);
                      }}
                      className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                    >
                      {ql.type === 'section' ? <Layers size={12} className="text-[#1DB954]" /> : <Music size={12} className="text-neutral-400" />}
                      {ql.label}
                    </button>
                  ))}
                </div>

                {!showCookieManager && (
                  <button
                    type="button"
                    onClick={() => setShowCookieManager(true)}
                    className="text-xs text-neutral-400 hover:text-white underline underline-offset-4 flex items-center gap-1"
                  >
                    <Key size={12} className="text-[#1DB954]" />
                    {isSessionActive ? "Manage Spotify Cookies" : "Add JSON Cookies & Canvas"}
                  </button>
                )}
              </div>

              {loading && (
                <div className="text-xs text-[#1DB954] animate-pulse flex items-center gap-2 font-medium bg-[#1DB954]/10 p-2.5 rounded-lg border border-[#1DB954]/20">
                  <div className="w-3.5 h-3.5 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>{statusMessage || "Scraping Spotify metadata and resolving accurate track info..."}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Result Showcase */}
          {result && (
            <div className="bg-[#181818] rounded-xl border border-neutral-800 overflow-hidden shadow-xl flex flex-col">
              {/* Header */}
              <div className="bg-neutral-900 border-b border-neutral-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
                    {isSectionResult ? <Layers size={22} /> : <Music size={22} />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isSectionResult ? `${result.title} (${result.playlistCount} Playlists)` : (result.name || result.title || "Scraped Spotify Data")}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {isSectionResult ? `Total ${result.totalTracksCount} tracks across ${result.playlistCount} playlists` : (result.subtitle || result.owner?.display_name || "Spotify Content")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSectionResult ? (
                    <button
                      onClick={() => onVisualizeSection(result)}
                      className="text-xs flex items-center gap-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black px-4 py-2 rounded-lg transition-colors font-bold shadow-md"
                    >
                      <Layers size={15} /> Visualize Section & Playlists
                    </button>
                  ) : (
                    <button
                      onClick={() => onVisualizePlaylist(result)}
                      className="text-xs flex items-center gap-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black px-4 py-2 rounded-lg transition-colors font-bold shadow-md"
                    >
                      <Play size={15} /> Visualize Playlist
                    </button>
                  )}

                  <button
                    onClick={handleDownloadJSON}
                    className="text-xs flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white px-3.5 py-2 rounded-lg transition-colors border border-neutral-700 font-medium"
                  >
                    <Download size={14} /> Download JSON
                  </button>
                </div>
              </div>

              {/* Section Preview if Section */}
              {isSectionResult && (
                <div className="p-5 bg-neutral-900/40 border-b border-neutral-800">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                    Discovered Playlists in Section:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {result.playlists.map((p: any, idx: number) => (
                      <div key={p.id || idx} className="bg-[#121212] p-3 rounded-lg border border-neutral-800 flex gap-3 items-center">
                        {p.coverUrl ? (
                          <img src={p.coverUrl} alt={p.name} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0">
                            <Music size={18} className="text-neutral-500" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{p.name}</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{p.trackCount} tracks</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JSON preview */}
              <div className="p-4 bg-[#121212] max-h-96 overflow-y-auto">
                <pre className="text-xs text-[#a5d6a7] font-mono leading-relaxed">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

