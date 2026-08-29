import React, { useState, useEffect } from 'react';
import { Server, Globe, RefreshCw, Trash2, ExternalLink, Copy, Check, Download, Code, Sparkles, ChevronLeft, Music, Layers } from 'lucide-react';
import { HostedPlaylistEndpoint } from '../types';

interface HostedApiManagerProps {
  onClose: () => void;
  onOpenServeModal?: () => void;
}

export const HostedApiManager: React.FC<HostedApiManagerProps> = ({ onClose }) => {
  const [endpoints, setEndpoints] = useState<HostedPlaylistEndpoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportCode, setExportCode] = useState<any | null>(null);
  const [selectedJsonView, setSelectedJsonView] = useState<any | null>(null);

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hosted/list');
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        setEndpoints(data.items);
      }
    } catch (err) {
      console.error("Failed to fetch hosted endpoints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleRefreshNow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshingId(id);
    try {
      const res = await fetch(`/api/hosted/refresh/${id}`, { method: 'POST' });
      if (res.ok) {
        await fetchEndpoints();
      }
    } catch (err) {
      console.error("Failed to refresh endpoint:", err);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this hosted API endpoint?")) return;

    try {
      const res = await fetch(`/api/hosted/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEndpoints(prev => prev.filter(item => item.id !== id && item.slug !== id));
      }
    } catch (err) {
      console.error("Failed to delete endpoint:", err);
    }
  };

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleFetchExportCode = async () => {
    try {
      const res = await fetch('/api/vercel/export-code');
      const data = await res.json();
      setExportCode(data);
      setShowExportModal(true);
    } catch (err) {
      console.error("Failed to load Vercel export code:", err);
    }
  };

  const handleDownloadZip = () => {
    if (!exportCode) return;

    const files = [
      { name: 'vercel.json', content: exportCode['vercel.json'] },
      { name: 'api/[slug].js', content: exportCode['api/[slug].js'] },
      { name: 'README.md', content: exportCode['README.md'] }
    ];

    files.forEach(f => {
      const blob = new Blob([f.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name.replace('/', '-');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleInspectJson = async (slug: string) => {
    try {
      const res = await fetch(`/api/public/${slug}.json`);
      const data = await res.json();
      setSelectedJsonView({ slug, data });
    } catch (err) {
      console.error("Failed to inspect JSON:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans flex justify-center">
      <div className="max-w-5xl w-full pb-24">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#1DB954]/20 text-[#1DB954] font-semibold px-3 py-0.5 rounded-full border border-[#1DB954]/30 uppercase tracking-wider flex items-center gap-1">
                  <Server size={12} /> Vercel Hosted API Hub
                </span>
                <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-full border border-neutral-700">
                  Daily Auto-Sync Enabled
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight mt-1">Published JSON Endpoints</h1>
              <p className="text-neutral-400 text-sm mt-0.5">
                Hosted at <code className="text-emerald-400 font-mono">uvytunesspotify.vercel.app/api/:playlist-name.json</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleFetchExportCode}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs px-4 py-2.5 rounded-full border border-neutral-700 transition-colors flex items-center gap-2"
            >
              <Code size={15} className="text-[#1DB954]" />
              Vercel Deployment Code
            </button>
            <button
              onClick={fetchEndpoints}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs p-2.5 rounded-full border border-neutral-700 transition-colors"
              title="Refresh endpoints list"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-emerald-950/50 via-neutral-900 to-neutral-900 border border-emerald-500/30 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-[#1DB954]" /> Daily Automatic Track Synchronization
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Playlists published here are automatically re-scraped and updated every 24 hours. Any consumer requesting <code className="text-emerald-400 font-mono">https://uvytunesspotify.vercel.app/api/playlist-name.json</code> will always receive fresh songs.
            </p>
          </div>
          <div className="bg-black/40 px-4 py-3 rounded-xl border border-neutral-800 shrink-0 text-center">
            <span className="text-2xl font-black text-[#1DB954]">{endpoints.length}</span>
            <span className="text-xs text-neutral-400 block font-medium">Active Endpoints</span>
          </div>
        </div>

        {/* Endpoints List */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin mx-auto text-[#1DB954]" />
            <p className="text-sm text-neutral-400 font-medium">Loading published APIs...</p>
          </div>
        ) : endpoints.length === 0 ? (
          <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-12 text-center my-6 space-y-4">
            <Globe size={48} className="mx-auto text-neutral-600" />
            <h3 className="text-lg font-bold text-white">No APIs Published Yet</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              When exploring Spotify sections or playlists, click the <strong className="text-emerald-400 font-medium">"Serve to API"</strong> button to publish any playlist as a hosted daily-updated JSON endpoint.
            </p>
            <button
              onClick={onClose}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow-md"
            >
              Explore & Publish Playlists
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {endpoints.map((ep) => {
              const vercelUrl = `https://uvytunesspotify.vercel.app/api/${ep.slug}.json`;
              const localUrl = `/api/public/${ep.slug}.json`;

              return (
                <div
                  key={ep.id}
                  className="bg-[#181818] hover:bg-[#1c1c1c] border border-neutral-800 rounded-xl p-5 transition-all space-y-4 group shadow-md"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-700">
                        {ep.coverUrl ? (
                          <img src={ep.coverUrl} alt={ep.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold text-lg">
                            {ep.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs font-mono font-bold text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded">
                            /api/{ep.slug}.json
                          </code>
                          {ep.autoUpdateDaily && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 font-medium px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                              <RefreshCw size={10} className="animate-spin" /> Daily Refresh
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-[#1DB954] transition-colors">
                          {ep.name}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5 font-medium">
                          {ep.playlists ? `${ep.playlists.length} playlists • ` : ''}{ep.trackCount} tracks served • Last updated {new Date(ep.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {ep.playlists && ep.playlists.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-xl">
                            {ep.playlists.map((pl: any, idx: number) => (
                              <span key={idx} className="bg-neutral-800 text-[10px] text-neutral-300 px-2 py-0.5 rounded border border-neutral-700 truncate max-w-[120px]" title={pl.name || pl.title}>
                                {pl.name || pl.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                      <button
                        onClick={() => handleInspectJson(ep.slug)}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs px-3 py-2 rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5"
                        title="View JSON response"
                      >
                        <Code size={14} className="text-[#1DB954]" /> Inspect JSON
                      </button>
                      <button
                        onClick={(e) => handleRefreshNow(ep.id, e)}
                        disabled={refreshingId === ep.id}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs px-3 py-2 rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5"
                        title="Force refresh now"
                      >
                        <RefreshCw size={14} className={refreshingId === ep.id ? 'animate-spin text-[#1DB954]' : ''} />
                        {refreshingId === ep.id ? 'Refreshing...' : 'Refresh Now'}
                      </button>
                      <button
                        onClick={(e) => handleDelete(ep.id, e)}
                        className="bg-neutral-800 hover:bg-red-900/40 text-neutral-400 hover:text-red-400 text-xs p-2 rounded-lg border border-neutral-700 transition-colors"
                        title="Delete endpoint"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Endpoint URLs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-neutral-800/60">
                    <div className="bg-black/40 p-2.5 rounded-lg border border-neutral-800/80 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block">Target Vercel URL</span>
                        <code className="text-xs text-emerald-400 font-mono truncate block">{vercelUrl}</code>
                      </div>
                      <button
                        onClick={(e) => handleCopy(vercelUrl, e)}
                        className="bg-neutral-800 hover:bg-[#1DB954] hover:text-black text-neutral-300 text-xs px-2.5 py-1.5 rounded transition-colors shrink-0 flex items-center gap-1"
                      >
                        {copiedUrl === vercelUrl ? <Check size={12} /> : <Copy size={12} />}
                        {copiedUrl === vercelUrl ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="bg-black/40 p-2.5 rounded-lg border border-neutral-800/80 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block">Dev Preview URL</span>
                        <code className="text-xs text-neutral-300 font-mono truncate block">{window.location.origin}{localUrl}</code>
                      </div>
                      <a
                        href={localUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-2.5 py-1.5 rounded transition-colors shrink-0 flex items-center gap-1 border border-neutral-700"
                      >
                        <ExternalLink size={12} /> Open
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vercel Code Modal */}
        {showExportModal && exportCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#181818] border border-neutral-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden text-white font-sans flex flex-col max-h-[85vh]">
              <div className="bg-neutral-900 p-6 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-[#1DB954]">
                    <Code size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Vercel API Server Code</h3>
                    <p className="text-xs text-neutral-400">Ready to deploy directly to uvytunesspotify.vercel.app</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 font-mono text-xs">
                <div>
                  <span className="text-xs text-neutral-400 font-sans font-bold block mb-1">1. vercel.json (Routing Configuration)</span>
                  <pre className="bg-black/60 p-3 rounded-lg border border-neutral-800 text-emerald-400 overflow-x-auto">
                    {exportCode['vercel.json']}
                  </pre>
                </div>

                <div>
                  <span className="text-xs text-neutral-400 font-sans font-bold block mb-1">2. api/[slug].js (Serverless API Handler)</span>
                  <pre className="bg-black/60 p-3 rounded-lg border border-neutral-800 text-neutral-300 overflow-x-auto max-h-60">
                    {exportCode['api/[slug].js']}
                  </pre>
                </div>
              </div>

              <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex justify-between items-center">
                <span className="text-xs text-neutral-400 font-sans">
                  {exportCode.hostedCount || endpoints.length} endpoints pre-packaged
                </span>
                <button
                  onClick={handleDownloadZip}
                  className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg"
                >
                  <Download size={15} /> Download Vercel API Files
                </button>
              </div>
            </div>
          </div>
        )}

        {/* JSON Inspector Modal */}
        {selectedJsonView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#181818] border border-neutral-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden text-white font-sans flex flex-col max-h-[85vh]">
              <div className="bg-neutral-900 p-6 border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">API JSON Response: /api/{selectedJsonView.slug}.json</h3>
                  <p className="text-xs text-emerald-400 font-mono mt-0.5">Live Served Payload</p>
                </div>
                <button
                  onClick={() => setSelectedJsonView(null)}
                  className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 font-mono text-xs">
                <pre className="bg-black/70 p-4 rounded-xl border border-neutral-800 text-green-400 overflow-x-auto">
                  {JSON.stringify(selectedJsonView.data, null, 2)}
                </pre>
              </div>

              <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex justify-end">
                <button
                  onClick={() => handleCopy(JSON.stringify(selectedJsonView.data, null, 2))}
                  className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs px-5 py-2 rounded-full flex items-center gap-2"
                >
                  <Copy size={14} /> Copy Full JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
