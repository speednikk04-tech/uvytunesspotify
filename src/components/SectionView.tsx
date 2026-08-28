import React, { useState } from 'react';
import { Download, ChevronLeft, Music, Play, Layers, ExternalLink, ListMusic, Check, FileJson, Search, X, Server, Globe } from 'lucide-react';
import { UnifiedSection, UnifiedSectionPlaylist, UnifiedPlaylist } from '../types';
import { formatDuration } from '../utils';

interface SectionViewProps {
  section: UnifiedSection;
  onBack: () => void;
  onSelectPlaylist: (playlist: UnifiedPlaylist) => void;
  onServePlaylistToApi?: (playlistData: {
    name: string;
    description?: string;
    sourceUrl: string;
    sourceType?: 'playlist' | 'album' | 'section';
    tracks: any[];
    coverUrl: string | null;
  }) => void;
}

export const SectionView: React.FC<SectionViewProps> = ({ section, onBack, onSelectPlaylist, onServePlaylistToApi }) => {

  const [selectedShelf, setSelectedShelf] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const shelves = Array.from(new Set(section.playlists.map(p => p.shelf).filter(Boolean))) as string[];

  const filteredPlaylists = section.playlists.filter(p => {
    const matchesShelf = selectedShelf === 'all' || p.shelf === selectedShelf;
    if (!matchesShelf) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const nameMatch = p.name.toLowerCase().includes(q);
    const descMatch = (p.description || '').toLowerCase().includes(q);
    const ownerMatch = (p.owner || '').toLowerCase().includes(q);
    const shelfMatch = (p.shelf || '').toLowerCase().includes(q);
    const trackMatch = (p.trackList || []).some(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));

    return nameMatch || descMatch || ownerMatch || shelfMatch || trackMatch;
  });

  const handleDownloadFullSection = () => {
    const blob = new Blob([JSON.stringify(section, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotify-section-${section.id || 'export'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAllTracksCSV = () => {
    const headers = ['Playlist/Album', 'Shelf', '#', 'Title', 'Artist', 'Album', 'Duration', 'Preview URL', 'Cover URL', 'Canvas URL'];
    const rows: string[][] = [];

    section.playlists.forEach((pl) => {
      pl.trackList.forEach((t, idx) => {
        rows.push([
          `"${pl.name.replace(/"/g, '""')}"`,
          `"${(pl.shelf || '').replace(/"/g, '""')}"`,
          String(idx + 1),
          `"${t.title.replace(/"/g, '""')}"`,
          `"${t.artist.replace(/"/g, '""')}"`,
          `"${t.album.replace(/"/g, '""')}"`,
          formatDuration(t.durationMs),
          `"${t.previewUrl || ''}"`,
          `"${t.coverUrl || ''}"`,
          `"${t.canvasUrl || ''}"`
        ]);
      });
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spotify-section-${section.id || 'export'}-all-tracks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSinglePlaylist = (pl: UnifiedSectionPlaylist, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataToExport = {
      type: pl.isAlbum ? 'album' : 'playlist',
      id: pl.id,
      name: pl.name,
      shelf: pl.shelf,
      description: pl.description,
      owner: pl.owner,
      images: pl.coverUrl ? [{ url: pl.coverUrl }] : [],
      trackCount: pl.trackCount,
      trackList: pl.trackList,
      raw: pl.raw
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotify-${pl.isAlbum ? 'album' : 'playlist'}-${pl.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenPlaylist = (pl: UnifiedSectionPlaylist) => {
    onSelectPlaylist({
      title: pl.name,
      author: pl.owner || 'Spotify',
      trackCount: pl.trackCount,
      coverUrl: pl.coverUrl,
      tracks: pl.trackList
    });
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col font-sans">
      {/* Top Section Banner */}
      <div className="bg-gradient-to-b from-[#1e3a2b] via-[#15241c] to-[#121212] p-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-300 hover:text-white bg-black/40 hover:bg-black/60 px-3.5 py-1.5 rounded-full border border-neutral-700 transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <span className="text-xs bg-[#1DB954]/20 text-[#1DB954] font-semibold px-3 py-1 rounded-full border border-[#1DB954]/30 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} /> Spotify Section
            </span>
            {section.countryCode && (
              <span className="text-xs bg-neutral-800 text-neutral-300 font-medium px-2.5 py-1 rounded-full border border-neutral-700">
                Region: {section.countryCode}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Section ID: {section.id}</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">{section.title}</h1>
              <p className="text-sm text-neutral-300 font-normal max-w-2xl mt-1">
                {section.subtitle || "Spotify curated section with nested playlists and high-resolution track metadata."}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-neutral-400 font-medium">
                <span>{section.playlistCount} Playlists & Albums</span>
                <span>•</span>
                <span>{section.totalTracksCount} Total Tracks</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onServePlaylistToApi && (
                <button
                  onClick={() => onServePlaylistToApi({
                    name: section.title,
                    description: section.subtitle || `Spotify Section (${section.playlistCount} playlists)`,
                    sourceUrl: `https://open.spotify.com/section/${section.id}`,
                    sourceType: 'section',
                    tracks: section.playlists.flatMap(p => p.trackList || []),
                    coverUrl: section.playlists[0]?.coverUrl || null
                  })}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 duration-150 text-sm"
                >
                  <Server size={16} />
                  Serve Section to API
                </button>
              )}
              <button
                onClick={handleDownloadFullSection}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2.5 rounded-full border border-neutral-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Download size={15} className="text-[#1DB954]" />
                Section JSON
              </button>
              <button
                onClick={handleExportAllTracksCSV}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2.5 rounded-full border border-neutral-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Download size={15} className="text-[#1DB954]" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shelf Filter if multiple shelves */}
      <div className="max-w-7xl mx-auto w-full px-8 pt-4 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {shelves.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mr-2 shrink-0">Shelves:</span>
            <button
              onClick={() => setSelectedShelf('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                selectedShelf === 'all' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              All ({section.playlists.length})
            </button>
            {shelves.map((sh) => (
              <button
                key={sh}
                onClick={() => setSelectedShelf(sh)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 whitespace-nowrap ${
                  selectedShelf === sh ? 'bg-[#1DB954] text-black' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {sh} ({section.playlists.filter(p => p.shelf === sh).length})
              </button>
            ))}
          </div>
        )}

        {/* Quick Search Bar */}
        <div className="relative flex-1 md:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search playlists or artists..."
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#1DB954] rounded-full py-1.5 pl-9 pr-8 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Playlists Grid */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-8 py-6">
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-neutral-800">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ListMusic size={20} className="text-[#1DB954]" />
            Playlists & Albums ({filteredPlaylists.length})
          </h2>
          <span className="text-xs text-neutral-400">Click any card to explore tracklist and preview audio</span>
        </div>

        {filteredPlaylists.length === 0 ? (
          <div className="bg-[#181818] rounded-xl border border-neutral-800 p-12 text-center my-6">
            <Music size={40} className="mx-auto text-neutral-600 mb-3" />
            <h3 className="text-base font-bold text-white">No playlists found</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
              No playlists matched "{searchQuery}" in the selected shelf. Try clearing your search query or switching shelves.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedShelf('all'); }}
              className="mt-4 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaylists.map((pl, idx) => {
            return (
              <div
                key={pl.id}
                className="bg-[#181818] hover:bg-[#202020] border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  {/* Playlist Card Header */}
                  <div className="flex gap-4 items-start mb-4">
                    <div className="w-24 h-24 bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0 shadow-md relative group/cover">
                      {pl.coverUrl ? (
                        <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-500">
                          <Music size={32} />
                        </div>
                      )}
                      <button
                        onClick={() => handleOpenPlaylist(pl)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center transition-opacity text-white"
                        title="Open in Visual Player"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center text-black shadow-lg">
                          <Play size={18} fill="currentColor" className="ml-0.5" />
                        </div>
                      </button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          pl.isAlbum ? 'bg-indigo-900/60 text-indigo-300' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {pl.isAlbum ? 'Album' : `Playlist #${idx + 1}`}
                        </span>
                        {pl.shelf && (
                          <span className="text-[10px] uppercase font-medium tracking-wider px-2 py-0.5 bg-neutral-800/80 text-neutral-300 rounded truncate">
                            {pl.shelf}
                          </span>
                        )}
                      </div>
                      <h3
                        onClick={() => handleOpenPlaylist(pl)}
                        className="text-base font-bold text-white group-hover:text-[#1DB954] transition-colors truncate cursor-pointer"
                        title={pl.name}
                      >
                        {pl.name}
                      </h3>
                      <p className="text-xs text-neutral-400 line-clamp-2 mt-1 font-normal leading-relaxed">
                        {pl.description || (pl.isAlbum ? "Spotify Album Release" : "Spotify curated playlist")}
                      </p>
                      <p className="text-xs text-neutral-500 mt-2 font-medium">
                        {pl.owner || 'Spotify'} • <span className="text-neutral-300 font-semibold">{pl.trackCount} tracks</span>
                      </p>
                    </div>
                  </div>

                  {/* Preview of first 3 tracks with individual covers */}
                  {pl.trackList && pl.trackList.length > 0 && (
                    <div className="bg-[#121212] rounded-lg p-3 border border-neutral-800/80 mb-4">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2 font-medium">
                        <span>Tracks Preview ({pl.trackList.length} total)</span>
                        <span className="text-[#1DB954] text-[10px]">High-Res Covers</span>
                      </div>
                      <div className="space-y-2">
                        {pl.trackList.slice(0, 3).map((t, tIdx) => (
                          <div key={t.id || tIdx} className="flex items-center justify-between text-xs text-neutral-300 gap-2">
                            <div className="flex items-center gap-2.5 truncate">
                              {t.coverUrl ? (
                                <img src={t.coverUrl} alt={t.title} className="w-6 h-6 rounded object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0 text-[10px] text-neutral-500">
                                  {tIdx + 1}
                                </div>
                              )}
                              <div className="flex flex-col truncate">
                                <span className="truncate font-medium text-white text-xs leading-tight">{t.title}</span>
                                <span className="text-neutral-400 text-[10px] truncate leading-tight">{t.artist}</span>
                              </div>
                            </div>
                            <span className="text-neutral-500 text-[11px] shrink-0 font-mono">
                              {formatDuration(t.durationMs)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-800 gap-2">
                  <button
                    onClick={() => handleOpenPlaylist(pl)}
                    className="flex-1 bg-neutral-800 hover:bg-[#1DB954] text-white hover:text-black font-semibold text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play size={14} fill="currentColor" />
                    Open Player
                  </button>
                  {onServePlaylistToApi && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onServePlaylistToApi({
                          name: pl.name,
                          description: pl.description || `Spotify ${pl.isAlbum ? 'Album' : 'Playlist'}`,
                          sourceUrl: pl.uri ? `https://open.spotify.com/${pl.isAlbum ? 'album' : 'playlist'}/${pl.id}` : `https://open.spotify.com/playlist/${pl.id}`,
                          sourceType: pl.isAlbum ? 'album' : 'playlist',
                          tracks: pl.trackList || [],
                          coverUrl: pl.coverUrl
                        });
                      }}
                      className="bg-emerald-600/20 hover:bg-emerald-500 hover:text-black text-emerald-400 font-semibold text-xs py-2 px-3 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1 shrink-0"
                      title="Serve & Host as Vercel API Endpoint"
                    >
                      <Server size={13} />
                      Serve to API
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDownloadSinglePlaylist(pl, e)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs py-2 px-3 rounded-lg border border-neutral-700 transition-colors flex items-center gap-1 shrink-0"
                    title="Download Playlist JSON"
                  >
                    <FileJson size={14} className="text-[#1DB954]" />
                    JSON
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
