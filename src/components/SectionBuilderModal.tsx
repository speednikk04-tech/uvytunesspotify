import React, { useState } from 'react';
import { X, Search, Plus, Trash2, LayoutList, Layers, Save, RefreshCw } from 'lucide-react';
import { UnifiedSection, UnifiedSectionPlaylist } from '../types';

interface SectionBuilderModalProps {
  onClose: () => void;
  onVisualizeSection: (section: UnifiedSection) => void;
}

export const SectionBuilderModal: React.FC<SectionBuilderModalProps> = ({ onClose, onVisualizeSection }) => {
  const [sectionTitle, setSectionTitle] = useState('My Custom Section');
  const [sectionSubtitle, setSectionSubtitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<UnifiedSectionPlaylist[]>([]);

  const handleAddPlaylist = async () => {
    const url = urlInput.trim();
    if (!url) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const activeCookie = localStorage.getItem('spotify_user_session_cookies') || '';
      
      const payload: any = { url, country: 'US' };
      if (activeCookie) {
        payload.cookies = activeCookie;
      }

      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to scrape playlist`);
      }

      const data = await response.json();
      
      const trackList = data.trackList || (Array.isArray(data.tracks) ? data.tracks : (data.tracks?.items ? data.tracks.items.map((i: any) => i.track || i) : []));
      
      if (!trackList || trackList.length === 0) {
        throw new Error('No tracks found in the provided URL');
      }

      const playlistCover = data.coverUrl 
        || data.images?.[0]?.url 
        || data.visualIdentity?.image?.find((img: any) => img.maxHeight === 300 || img.maxHeight === 640)?.url
        || data.visualIdentity?.image?.[0]?.url
        || (data.coverArt?.sources ? (data.coverArt.sources[2]?.url || data.coverArt.sources[0]?.url) : null)
        || null;

      const newPlaylist: UnifiedSectionPlaylist = {
        id: data.id || data.uri || crypto.randomUUID(),
        uri: data.uri || `spotify:playlist:${crypto.randomUUID()}`,
        name: data.name || data.title || 'Scraped Playlist',
        description: data.description || data.owner?.display_name || 'Custom Added',
        coverUrl: playlistCover,
        trackCount: trackList.length,
        trackList: trackList.map((t: any, idx: number) => {
          const trackSpecificCover = t.coverUrl 
            || t.albumArt
            || t.album?.images?.[0]?.url 
            || t.visualIdentity?.image?.find((img: any) => img.maxHeight === 300 || img.maxHeight === 640)?.url
            || t.visualIdentity?.image?.[0]?.url 
            || t.image?.find((img: any) => img.maxHeight === 300 || img.maxHeight === 640)?.url
            || t.image?.[0]?.url 
            || (t.coverArt?.sources ? (t.coverArt.sources[2]?.url || t.coverArt.sources[0]?.url) : null);
          const finalCover = trackSpecificCover || playlistCover;
          return {
            id: t.id || t.uri || `track-${idx}`,
            uri: t.uri,
            title: t.title || t.name || 'Unknown Title',
            artist: t.artist || t.subtitle || (Array.isArray(t.artists) ? t.artists.map((a: any) => a.name).join(', ') : 'Unknown Artist'),
            album: t.album || 'Spotify Track',
            coverUrl: finalCover,
            previewUrl: t.previewUrl || t.audioPreview?.url || null,
            durationMs: t.durationMs || t.duration || 0,
            canvasUrl: t.canvasUrl || null
          };
        }),
        raw: data.raw || data
      };

      setPlaylists([...playlists, newPlaylist]);
      setUrlInput('');
    } catch (err: any) {
      setError(err.message || "Failed to add playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePlaylist = (index: number) => {
    const updated = [...playlists];
    updated.splice(index, 1);
    setPlaylists(updated);
  };

  const handleVisualize = () => {
    if (playlists.length === 0) {
      setError("Please add at least one playlist to your section.");
      return;
    }

    const customSection: UnifiedSection = {
      type: 'section',
      id: `custom-section-${crypto.randomUUID()}`,
      title: sectionTitle.trim() || 'Custom Section',
      subtitle: sectionSubtitle.trim(),
      playlistCount: playlists.length,
      totalTracksCount: playlists.reduce((acc, p) => acc + p.trackCount, 0),
      playlists: playlists,
      raw: { isCustomSection: true, playlists }
    };

    onVisualizeSection(customSection);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#181818] border border-neutral-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-white font-sans flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center text-[#1DB954]">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Build Custom Section</h2>
              <p className="text-xs text-neutral-400">Combine multiple playlists into a unified folder API</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Section Name</label>
              <input
                type="text"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="e.g. My Workout Mixes"
                className="w-full bg-[#121212] border border-neutral-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1DB954] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Subtitle (Optional)</label>
              <input
                type="text"
                value={sectionSubtitle}
                onChange={(e) => setSectionSubtitle(e.target.value)}
                placeholder="e.g. Best tracks for the gym"
                className="w-full bg-[#121212] border border-neutral-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1DB954] transition-colors"
              />
            </div>
          </div>

          <div className="bg-[#121212] p-4 rounded-xl border border-neutral-800 flex flex-col gap-4">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Add Playlist via Spotify URL</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste Spotify Playlist URL..."
                className="flex-1 bg-[#181818] border border-neutral-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1DB954] transition-colors"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlaylist(); }}
              />
              <button
                onClick={handleAddPlaylist}
                disabled={isLoading || !urlInput.trim()}
                className="bg-[#1DB954] hover:bg-[#1ed760] disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md"
              >
                {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                Add
              </button>
            </div>
            {error && <div className="text-red-400 text-xs mt-1 bg-red-900/20 px-3 py-2 rounded-lg border border-red-900/50">{error}</div>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-neutral-300">Playlists in Section ({playlists.length})</h3>
            </div>
            
            {playlists.length === 0 ? (
              <div className="text-center py-10 bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed">
                <LayoutList size={32} className="mx-auto text-neutral-600 mb-3" />
                <p className="text-sm text-neutral-400">No playlists added yet.</p>
                <p className="text-xs text-neutral-500 mt-1">Paste a Spotify URL above to add one.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {playlists.map((pl, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-[#121212] border border-neutral-800 p-3 rounded-xl hover:border-neutral-700 transition-colors">
                    {pl.coverUrl ? (
                      <img src={pl.coverUrl} alt="Cover" className="w-12 h-12 rounded object-cover shadow-md" />
                    ) : (
                      <div className="w-12 h-12 bg-neutral-800 rounded flex items-center justify-center">
                        <LayoutList size={20} className="text-neutral-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{pl.name}</h4>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">{pl.trackCount} tracks • {pl.description || 'No description'}</p>
                    </div>
                    <button
                      onClick={() => handleRemovePlaylist(idx)}
                      className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Remove from Section"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-900/80 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full font-bold text-sm text-white bg-transparent hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleVisualize}
            disabled={playlists.length === 0}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-black px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg flex items-center gap-2"
          >
            <LayoutList size={16} /> Visualize Section
          </button>
        </div>
      </div>
    </div>
  );
};
