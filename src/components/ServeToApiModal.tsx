import React, { useState } from 'react';
import { X, Globe, Check, Copy, ExternalLink, RefreshCw, Server, Sparkles } from 'lucide-react';
import { HostedPlaylistEndpoint, UnifiedTrack } from '../types';

interface ServeToApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistData: {
    name: string;
    description?: string;
    sourceUrl: string;
    sourceType?: 'playlist' | 'album' | 'section';
    tracks: UnifiedTrack[];
    playlists?: any[];
    raw?: any;
    coverUrl: string | null;
  } | null;
  onSuccess?: (endpoint: HostedPlaylistEndpoint) => void;
}

export const ServeToApiModal: React.FC<ServeToApiModalProps> = ({
  isOpen,
  onClose,
  playlistData,
  onSuccess
}) => {
  if (!isOpen || !playlistData) return null;

  const defaultSlug = (playlistData.name || 'playlist')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const [slug, setSlug] = useState<string>(defaultSlug);
  const [autoUpdateDaily, setAutoUpdateDaily] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [publishedEndpoint, setPublishedEndpoint] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cleanSlug = slug.trim().toLowerCase().replace(/\.json$/, '').replace(/[^a-z0-9_-]+/g, '-');
  const vercelUrl = `https://uvytunesspotify.vercel.app/api/${cleanSlug || 'playlist'}.json`;
  const localUrl = `/api/public/${cleanSlug || 'playlist'}.json`;

  const handlePublish = async () => {
    if (!cleanSlug) {
      setError("Please specify a valid slug / endpoint name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const activeCookie = localStorage.getItem('spotify_user_session_cookies') || '';

      const res = await fetch('/api/hosted/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: cleanSlug,
          name: playlistData.name,
          description: playlistData.description,
          sourceUrl: playlistData.sourceUrl,
          sourceType: playlistData.sourceType || 'playlist',
          tracks: playlistData.tracks,
          playlists: playlistData.playlists,
          raw: playlistData.raw,
          coverUrl: playlistData.coverUrl,
          autoUpdateDaily,
          cookies: activeCookie
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to serve playlist to API');
      }

      const data = await res.json();
      setPublishedEndpoint(data);
      if (onSuccess && data.item) {
        onSuccess(data.item);
      }
    } catch (err: any) {
      setError(err.message || "Failed to publish playlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#181818] border border-neutral-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-white font-sans flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900/60 via-neutral-900 to-neutral-900 p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center text-[#1DB954]">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Serve to API</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Host JSON endpoint for Vercel backend integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[75vh]">
          {publishedEndpoint ? (
            <div className="space-y-6">
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-[#1DB954] text-black flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Check size={24} strokeWidth={3} />
                </div>
                <h3 className="text-lg font-bold text-white">Playlist Published Successfully!</h3>
                <p className="text-xs text-neutral-300 mt-1">
                  Your API JSON endpoint is live and configured for daily background synchronization.
                </p>
              </div>

              {/* Vercel Target URL */}
              <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Target Vercel API Endpoint
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/50 px-3 py-2 rounded-lg text-xs font-mono text-emerald-400 border border-neutral-800 truncate">
                    {publishedEndpoint.vercelUrl || vercelUrl}
                  </code>
                  <button
                    onClick={() => handleCopy(publishedEndpoint.vercelUrl || vercelUrl)}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Local Dev URL */}
              <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Live Preview API URL
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/50 px-3 py-2 rounded-lg text-xs font-mono text-neutral-300 border border-neutral-800 truncate">
                    {window.location.origin}{publishedEndpoint.publicUrl || localUrl}
                  </code>
                  <a
                    href={publishedEndpoint.publicUrl || localUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-neutral-700 shrink-0"
                  >
                    <ExternalLink size={14} />
                    Open JSON
                  </a>
                </div>
              </div>

              {/* Details card */}
              <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 space-y-2 text-xs text-neutral-300">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Playlist Title:</span>
                  <span className="font-semibold text-white">{publishedEndpoint.item?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Tracks Served:</span>
                  <span className="font-semibold text-white">{publishedEndpoint.item?.trackCount} tracks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Auto-Update Strategy:</span>
                  <span className="font-semibold text-emerald-400">Every 24 Hours (Daily)</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Selected Playlist Preview */}
              <div className="flex items-center gap-4 bg-neutral-900 p-3.5 rounded-xl border border-neutral-800">
                <div className="w-16 h-16 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0">
                  {playlistData.coverUrl ? (
                    <img src={playlistData.coverUrl} alt={playlistData.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold">
                      {playlistData.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded">
                    {playlistData.sourceType || 'Playlist'}
                  </span>
                  <h4 className="text-sm font-bold text-white truncate mt-1">{playlistData.name}</h4>
                  <p className="text-xs text-neutral-400 font-medium">
                    {playlistData.tracks?.length || 0} tracks available for hosting
                  </p>
                </div>
              </div>

              {/* Slug Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
                  Custom Endpoint Name / Slug (.json)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. playlist-name or top-hits"
                    className="w-full bg-neutral-900 border border-neutral-700 focus:border-[#1DB954] rounded-xl py-2.5 px-4 text-sm text-white placeholder-neutral-500 font-mono focus:outline-none transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-mono">
                    .json
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Endpoint URL: <code className="text-emerald-400 font-mono">{vercelUrl}</code>
                </p>
              </div>

              {/* Daily Auto Refresh Toggle */}
              <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Daily Auto-Refresh</h5>
                    <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                      Automatically re-scrapes Spotify every 24 hours so songs remain fresh whenever fetched from Vercel or local API.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoUpdateDaily}
                    onChange={(e) => setAutoUpdateDaily(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1DB954]"></div>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-xs text-red-300">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-3 rounded-xl transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 rounded-xl transition-colors text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" /> Publishing API...
                    </>
                  ) : (
                    <>
                      <Server size={15} /> Publish to Vercel API
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
