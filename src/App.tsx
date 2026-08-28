import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileJson, FileText, AlertCircle, Play, Pause, Music, Clock, Download, Volume2, VolumeX, Link, BookOpen, ChevronLeft, LayoutList, Layers, ArrowLeft, Video, Film, Sparkles, X, ExternalLink, Server, Globe } from 'lucide-react';
import { iTunesFeed, iTunesEntry, UnifiedPlaylist, UnifiedTrack, UnifiedSection, UnifiedSectionPlaylist } from './types';
import { formatDuration } from './utils';
import { SectionView } from './components/SectionView';
import { SpotifyScraperModal } from './components/SpotifyScraperModal';
import { ApiDocs } from './components/ApiDocs';
import { ServeToApiModal } from './components/ServeToApiModal';
import { HostedApiManager } from './components/HostedApiManager';

const normalizeData = (parsed: any): { unified: UnifiedPlaylist | null; unifiedSection: UnifiedSection | null; raw: any } => {
  if (!parsed) return { unified: null, unifiedSection: null, raw: null };

  try {
    // 1. Spotify Section format
    if (parsed.type === 'section' && Array.isArray(parsed.playlists)) {
      return {
        unified: null,
        unifiedSection: {
          type: 'section',
          id: parsed.id || 'unknown',
          title: parsed.title || 'Spotify Section',
          subtitle: parsed.subtitle || '',
          countryCode: parsed.countryCode || 'US',
          playlistCount: parsed.playlistCount || parsed.playlists.length,
          totalTracksCount: parsed.totalTracksCount || parsed.playlists.reduce((acc: number, p: any) => acc + (p.trackCount || p.trackList?.length || 0), 0),
          playlists: parsed.playlists.map((pl: any) => ({
            id: pl.id || pl.uri || Math.random().toString(),
            uri: pl.uri,
            name: pl.name || pl.title || 'Playlist',
            description: pl.description || '',
            owner: pl.owner || 'Spotify',
            shelf: pl.shelf || undefined,
            isAlbum: pl.isAlbum || false,
            coverUrl: pl.coverUrl || pl.images?.[0]?.url || null,
            trackCount: pl.trackCount || pl.trackList?.length || 0,
            trackList: (pl.trackList || []).map((t: any) => ({
              id: t.id || (t.uri ? t.uri.split(':').pop() : Math.random().toString()),
              uri: t.uri,
              title: t.title || t.name || 'Unknown Title',
              artist: t.artist || t.subtitle || t.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
              album: t.album || (pl.isAlbum ? pl.name : `${t.title || t.name} - Single`),
              coverUrl: t.coverUrl || (pl.isAlbum ? pl.coverUrl : null) || pl.coverUrl || null,
              previewUrl: t.previewUrl || t.audioPreview?.url || t.preview_url || null,
              durationMs: t.durationMs || t.duration || t.duration_ms || 0,
              canvasUrl: t.canvasUrl || null
            })),
            raw: pl.raw || pl
          })),
          raw: parsed.raw || parsed
        },
        raw: parsed
      };
    }

    // 2. iTunes RSS Feed
    if (parsed.feed && parsed.feed.entry) {
      const headerImage = parsed.feed.icon?.label || parsed.feed.entry?.[0]?.["im:image"]?.[2]?.label || parsed.feed.entry?.[0]?.["im:image"]?.[0]?.label;
      return {
        unifiedSection: null,
        unified: {
          title: parsed.feed.title?.label || 'iTunes RSS Feed',
          author: parsed.feed.author?.name?.label || 'Unknown Author',
          trackCount: parsed.feed.entry.length,
          coverUrl: headerImage || null,
          tracks: parsed.feed.entry.map((track: any) => {
            const links = Array.isArray(track.link) ? track.link : [track.link];
            const previewLinkObj = links?.find((l: any) => l?.attributes?.["im:assetType"] === "preview" || l?.attributes?.type?.startsWith('audio/'));
            const durationMillis = previewLinkObj?.["im:duration"]?.label;
            
            return {
              id: track.id?.attributes?.["im:id"] || track.id?.label || Math.random().toString(),
              title: track["im:name"]?.label || 'Unknown Title',
              artist: track["im:artist"]?.label || 'Unknown Artist',
              album: track["im:collection"]?.["im:name"]?.label || track.category?.attributes?.label || 'Unknown Album',
              coverUrl: track["im:image"]?.[2]?.label || track["im:image"]?.[0]?.label || null,
              previewUrl: previewLinkObj?.attributes?.href || null,
              durationMs: durationMillis ? parseInt(durationMillis, 10) : 0,
            };
          })
        },
        raw: parsed
      };
    }

    // 3. iTunes Search API
    if (parsed.resultCount !== undefined && Array.isArray(parsed.results)) {
      return {
        unifiedSection: null,
        unified: {
          title: 'iTunes Search Results',
          author: 'Search API',
          trackCount: parsed.results.length,
          coverUrl: parsed.results[0]?.artworkUrl100 || null,
          tracks: parsed.results.map((track: any) => ({
            id: track.trackId?.toString() || track.collectionId?.toString() || Math.random().toString(),
            title: track.trackName || track.collectionName || 'Unknown Title',
            artist: track.artistName || 'Unknown Artist',
            album: track.collectionName || 'Unknown Album',
            coverUrl: track.artworkUrl100 || track.artworkUrl60 || null,
            previewUrl: track.previewUrl || null,
            durationMs: track.trackTimeMillis || 0,
          }))
        },
        raw: parsed
      };
    }

    // 4. Spotify Scraped Data (Playlist / Album / Track)
    if (parsed.type && ['playlist', 'album', 'track'].includes(parsed.type)) {
      let tracks: any[] = [];
      if (parsed.type === 'track') {
        tracks = [parsed];
      } else if (parsed.tracks?.items) {
        tracks = parsed.tracks.items.map((item: any) => item.track || item);
      } else if (parsed.trackList) {
        tracks = parsed.trackList;
      }

      const playlistCover = parsed.images?.[0]?.url || parsed.coverArt?.sources?.[0]?.url || parsed.image?.[0]?.url || null;

      return {
        unifiedSection: null,
        unified: {
          title: parsed.name || parsed.title || 'Spotify Data',
          author: parsed.owner?.display_name || parsed.subtitle || parsed.artists?.[0]?.name || 'Spotify User',
          trackCount: tracks.length,
          coverUrl: playlistCover,
          tracks: tracks.map((track: any) => {
            const trackSpecificCover = track.coverUrl 
              || track.albumArt
              || track.album?.images?.[0]?.url 
              || track.visualIdentity?.image?.find((img: any) => img.maxHeight === 300 || img.maxHeight === 640)?.url
              || track.visualIdentity?.image?.[0]?.url 
              || track.image?.find((img: any) => img.maxHeight === 300 || img.maxHeight === 640)?.url
              || track.image?.[0]?.url 
              || (track.coverArt?.sources ? track.coverArt.sources[0]?.url : null);

            const finalCover = trackSpecificCover || playlistCover || null;

            const trackAlbumName = (typeof track.album === 'string' ? track.album : null)
              || track.album?.name
              || (parsed.type === 'album' ? (parsed.name || parsed.title) : null)
              || `${track.name || track.title || 'Unknown'} - Single`;

            return {
              id: track.id || track.uri || track.uid || Math.random().toString(),
              uri: track.uri,
              title: track.name || track.title || 'Unknown Title',
              artist: track.artists?.map((a: any) => a.name).join(', ') || track.subtitle || track.artist || 'Unknown Artist',
              album: trackAlbumName,
              coverUrl: finalCover,
              previewUrl: track.preview_url || track.audioPreview?.url || track.previewUrl || null,
              durationMs: track.duration_ms || track.duration || track.durationMs || 0,
              canvasUrl: track.canvasUrl || null
            };
          })
        },
        raw: parsed
      };
    }

    // Generic / Fallback
    return { unified: null, unifiedSection: null, raw: parsed };
  } catch (e) {
    return { unified: null, unifiedSection: null, raw: parsed };
  }
};

export default function App() {
  const [unifiedData, setUnifiedData] = useState<UnifiedPlaylist | null>(null);
  const [unifiedSection, setUnifiedSection] = useState<UnifiedSection | null>(null);
  const [previousSection, setPreviousSection] = useState<UnifiedSection | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [showRawModal, setShowRawModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentTrack, setCurrentTrack] = useState<UnifiedTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showSpotifyScraper, setShowSpotifyScraper] = useState(false);
  const [showHostedManager, setShowHostedManager] = useState(false);
  const [serveModalData, setServeModalData] = useState<{
    isOpen: boolean;
    playlistData: any;
  }>({ isOpen: false, playlistData: null });
  const [activeCanvasTrack, setActiveCanvasTrack] = useState<UnifiedTrack | null>(null);
  const [fetchingCanvasId, setFetchingCanvasId] = useState<string | null>(null);
  
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const [spotifyCookies, setSpotifyCookies] = useState<string>(() => {
    try {
      return localStorage.getItem('spotify_user_session_cookies') || '';
    } catch {
      return '';
    }
  });

  const handleFetchCanvas = async (track: UnifiedTrack, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (track.canvasUrl) {
      setActiveCanvasTrack(track);
      return;
    }

    setFetchingCanvasId(track.id);
    try {
      const activeCookie = spotifyCookies || localStorage.getItem('spotify_user_session_cookies') || '';
      const res = await fetch(`/api/canvas?trackId=${encodeURIComponent(track.id)}`, {
        headers: activeCookie ? { 'x-spotify-cookies': activeCookie } : {}
      });
      const data = await res.json();
      if (data?.canvasUrl) {
        track.canvasUrl = data.canvasUrl;
        setActiveCanvasTrack({ ...track, canvasUrl: data.canvasUrl });
        if (unifiedData) {
          setUnifiedData({
            ...unifiedData,
            tracks: unifiedData.tracks.map(t => t.id === track.id ? { ...t, canvasUrl: data.canvasUrl } : t)
          });
        }
      } else {
        // Track has no canvas or requires sp_dc - still show preview modal
        setActiveCanvasTrack(track);
      }
    } catch (err) {
      setActiveCanvasTrack(track);
    } finally {
      setFetchingCanvasId(null);
    }
  };

  useEffect(() => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        mediaRef.current.pause();
      }
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleParseJSON = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed) {
        const { unified, unifiedSection: section, raw } = normalizeData(parsed);
        if (section) {
          setUnifiedSection(section);
          setUnifiedData(null);
          setPreviousSection(null);
        } else if (unified) {
          setUnifiedData(unified);
          setUnifiedSection(null);
        }
        setRawData(raw);
        setError(null);
      } else {
        setError("Invalid JSON format.");
      }
    } catch (e) {
      setError("Failed to parse JSON. Please check the format.");
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
    if (e.target.value.trim() === "") {
      setError(null);
    }
  };

  const fetchFromUrl = async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setJsonInput(url);

      if (url.includes('spotify.com') || url.startsWith('spotify:')) {
        const activeCookie = spotifyCookies || localStorage.getItem('spotify_user_session_cookies') || '';
        const response = await fetch(`/api/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, cookies: activeCookie })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const { unified, unifiedSection: section, raw } = normalizeData(data);
        if (section) {
          setUnifiedSection(section);
          setUnifiedData(null);
        } else if (unified) {
          setUnifiedData(unified);
          setUnifiedSection(null);
        }
        setRawData(raw);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      handleParseJSON(text);
    } catch (err: any) {
      setError(`Failed to fetch: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    const input = jsonInput.trim();
    if (!input) return;

    if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('spotify:')) {
      await fetchFromUrl(input);
    } else {
      handleParseJSON(input);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonInput(text);
      handleParseJSON(text);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/json" && file.type !== "text/plain" && !file.name.endsWith('.json') && !file.name.endsWith('.txt')) {
      setError("Please upload a .json or .txt file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonInput(text);
      handleParseJSON(text);
    };
    reader.readAsText(file);
  };

  const togglePlay = (track: UnifiedTrack) => {
    const previewLink = track.previewUrl;
    if (!previewLink) return;

    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleTimeSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (vol > 0) {
      setIsMuted(false);
    }
  };

  const handleDownloadCurrentPlaylistJSON = () => {
    if (!unifiedData) return;
    const blob = new Blob([JSON.stringify(rawData || unifiedData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${unifiedData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-playlist.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCurrentPlaylistCSV = () => {
    if (!unifiedData) return;
    const headers = ['#', 'Title', 'Artist', 'Album', 'Duration', 'Preview URL', 'Cover URL'];
    const rows = unifiedData.tracks.map((t, idx) => [
      idx + 1,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.artist.replace(/"/g, '""')}"`,
      `"${t.album.replace(/"/g, '""')}"`,
      formatDuration(t.durationMs),
      `"${t.previewUrl || ''}"`,
      `"${t.coverUrl || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${unifiedData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-tracks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render Sub-Views
  if (showHostedManager) {
    return (
      <HostedApiManager
        onClose={() => setShowHostedManager(false)}
        onOpenServeModal={() => {
          setShowHostedManager(false);
          setShowSpotifyScraper(true);
        }}
      />
    );
  }

  if (showDocs) {
    return <ApiDocs onClose={() => setShowDocs(false)} onSelectUrl={(url) => { setShowDocs(false); fetchFromUrl(url); }} />;
  }

  if (showSpotifyScraper) {
    return (
      <SpotifyScraperModal
        onClose={() => setShowSpotifyScraper(false)}
        onVisualizePlaylist={(data) => {
          const { unified, unifiedSection: section, raw } = normalizeData(data);
          if (section) {
            setUnifiedSection(section);
            setUnifiedData(null);
          } else if (unified) {
            setUnifiedData(unified);
            setUnifiedSection(null);
          }
          setRawData(raw);
          setShowSpotifyScraper(false);
        }}
        onVisualizeSection={(section) => {
          setUnifiedSection(section);
          setUnifiedData(null);
          setRawData(section.raw || section);
          setShowSpotifyScraper(false);
        }}
      />
    );
  }

  // Section Visualizer View
  if (unifiedSection) {
    return (
      <>
        <SectionView
          section={unifiedSection}
          onBack={() => {
            setUnifiedSection(null);
            setRawData(null);
          }}
          onSelectPlaylist={(playlist) => {
            setPreviousSection(unifiedSection);
            setUnifiedData(playlist);
            setUnifiedSection(null);
          }}
          onServePlaylistToApi={(playlistData) => {
            setServeModalData({
              isOpen: true,
              playlistData
            });
          }}
        />
        <ServeToApiModal
          isOpen={serveModalData.isOpen}
          onClose={() => setServeModalData({ isOpen: false, playlistData: null })}
          playlistData={serveModalData.playlistData}
        />
      </>
    );
  }

  // Playlist Visualizer View
  if (unifiedData) {
    const isVideo = currentTrack?.previewUrl?.includes('video');

    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col font-sans">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Header */}
          <div className="bg-gradient-to-b from-[#1e3a2b] via-neutral-900 to-[#121212] p-8 pb-6">
            {previousSection && (
              <button
                onClick={() => {
                  setUnifiedSection(previousSection);
                  setUnifiedData(null);
                }}
                className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-full border border-neutral-700 mb-6 transition-colors"
              >
                <ChevronLeft size={14} /> Back to Section ({previousSection.title})
              </button>
            )}

            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="w-48 h-48 bg-neutral-800 shadow-2xl flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 border border-neutral-700">
                {unifiedData.coverUrl ? (
                  <img src={unifiedData.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <Music size={64} className="text-neutral-500" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Playlist</span>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">{unifiedData.title}</h1>
                <p className="text-sm text-neutral-300 mt-2 font-medium">
                  {unifiedData.author} • <span className="text-white font-semibold">{unifiedData.trackCount} tracks</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="px-8 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800/80 bg-[#121212]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServeModalData({
                  isOpen: true,
                  playlistData: {
                    name: unifiedData.title,
                    description: `Spotify Playlist by ${unifiedData.author}`,
                    sourceUrl: `https://open.spotify.com/playlist/${unifiedData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    sourceType: 'playlist',
                    tracks: unifiedData.tracks,
                    coverUrl: unifiedData.coverUrl
                  }
                })}
                className="text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-lg"
              >
                <Server size={14} /> Serve to API
              </button>
              <button
                onClick={handleDownloadCurrentPlaylistJSON}
                className="text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-full border border-neutral-700 transition-colors flex items-center gap-1.5"
              >
                <Download size={14} className="text-[#1DB954]" /> JSON
              </button>
              <button
                onClick={handleDownloadCurrentPlaylistCSV}
                className="text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3.5 py-2 rounded-full border border-neutral-700 transition-colors flex items-center gap-1.5"
              >
                <FileText size={14} /> Export CSV
              </button>
              {rawData && (
                <button
                  onClick={() => setShowRawModal(true)}
                  className="text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 px-3.5 py-2 rounded-full border border-neutral-700/80 transition-colors flex items-center gap-1.5"
                >
                  <FileJson size={14} /> View Raw JSON
                </button>
              )}
            </div>

            <button 
              onClick={() => { setUnifiedData(null); setUnifiedSection(null); setRawData(null); }}
              className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors border border-neutral-700 hover:border-neutral-500 rounded-full px-4 py-2"
            >
              Import New Link / JSON
            </button>
          </div>

          {/* Track List */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-[32px_minmax(0,1.5fr)_minmax(0,1fr)_100px_minmax(0,80px)] gap-4 px-4 py-2.5 border-b border-neutral-800 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              <div className="text-right">#</div>
              <div>Title & Artist</div>
              <div>Album</div>
              <div className="text-center">Canvas Video</div>
              <div className="flex justify-end pr-2"><Clock size={15} /></div>
            </div>

            <div className="flex flex-col gap-1">
              {unifiedData.tracks.map((track, index) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                const previewLink = track.previewUrl;
                const hasPreview = !!previewLink;
                const durationMs = track.durationMs;
                const hasCanvas = !!track.canvasUrl;
                const isFetchingCanvas = fetchingCanvasId === track.id;
                
                return (
                  <div 
                    key={track.id || index}
                    className={`grid grid-cols-[32px_minmax(0,1.5fr)_minmax(0,1fr)_100px_minmax(0,80px)] gap-4 px-4 py-2.5 rounded-lg group items-center transition-colors ${
                      isCurrentTrack ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="text-neutral-400 text-sm text-right flex justify-end items-center">
                      {isCurrentTrack && isPlaying ? (
                        <div className="flex items-center gap-0.5 h-3.5">
                          <span className="w-0.5 h-full bg-[#1DB954] animate-pulse" />
                          <span className="w-0.5 h-2 bg-[#1DB954] animate-bounce" />
                          <span className="w-0.5 h-3 bg-[#1DB954] animate-pulse" />
                        </div>
                      ) : (
                        <span className="group-hover:hidden text-xs">{index + 1}</span>
                      )}
                      
                      {!isCurrentTrack && hasPreview && (
                        <button 
                          onClick={() => togglePlay(track)} 
                          className="hidden group-hover:flex text-white hover:text-[#1DB954] transition-colors"
                          title="Play preview"
                        >
                          <Play size={14} fill="currentColor" />
                        </button>
                      )}
                      
                      {isCurrentTrack && (
                        <button 
                          onClick={() => togglePlay(track)} 
                          className={isPlaying ? "hidden group-hover:flex text-[#1DB954]" : "text-[#1DB954]"}
                        >
                          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 overflow-hidden">
                      {track.coverUrl ? (
                        <img 
                          src={track.coverUrl} 
                          alt={track.title}
                          className="w-10 h-10 rounded-md bg-neutral-800 flex-shrink-0 object-cover shadow"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-neutral-800 flex-shrink-0 flex items-center justify-center">
                          <Music size={16} className="text-neutral-500" />
                        </div>
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-[#1DB954]' : 'text-white'}`}>
                          {track.title}
                        </span>
                        <span className="text-xs text-neutral-400 truncate">
                          {track.artist}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-neutral-400 truncate flex items-center font-normal">
                      {track.album}
                    </div>

                    <div className="flex items-center justify-center">
                      {hasCanvas ? (
                        <button
                          onClick={(e) => handleFetchCanvas(track, e)}
                          className="text-[11px] font-bold bg-[#1DB954]/20 hover:bg-[#1DB954] text-[#1DB954] hover:text-black border border-[#1DB954]/40 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all shadow-sm group/cv"
                          title="View Canvas Looping Video"
                        >
                          <Film size={12} className="shrink-0" />
                          <span>Canvas</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleFetchCanvas(track, e)}
                          disabled={isFetchingCanvas}
                          className="text-[11px] text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/80 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                          title="Fetch Canvas Video for this track"
                        >
                          {isFetchingCanvas ? (
                            <div className="w-3 h-3 border border-neutral-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Video size={12} />
                          )}
                          <span>{isFetchingCanvas ? "Loading" : "Canvas"}</span>
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-neutral-400 text-right pr-2 font-mono flex items-center justify-end">
                      {formatDuration(durationMs)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floating Player Bar */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 h-22 bg-[#181818] border-t border-neutral-800 px-6 flex items-center justify-between z-50 shadow-2xl">
            {/* Track Info */}
            <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
              {currentTrack.coverUrl ? (
                <img src={currentTrack.coverUrl} alt="Cover" className="w-14 h-14 rounded-md object-cover flex-shrink-0 shadow-md" />
              ) : (
                <div className="w-14 h-14 rounded-md bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <Music size={24} className="text-neutral-500" />
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate text-white">{currentTrack.title}</span>
                <span className="text-xs text-neutral-400 truncate mt-0.5">{currentTrack.artist}</span>
                <span className="text-[11px] text-neutral-500 truncate">{currentTrack.album}</span>
              </div>
            </div>

            {/* Center Controls */}
            <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => togglePlay(currentTrack)}
                  className="w-10 h-10 rounded-full bg-white hover:scale-105 transition-transform flex items-center justify-center text-black shadow-lg"
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
              </div>

              {/* Progress */}
              <div className="w-full flex items-center gap-3 text-xs text-neutral-400 font-mono">
                <span className="w-10 text-right">{formatDuration(currentTime * 1000)}</span>
                <input 
                  type="range"
                  min="0"
                  max={duration || 30}
                  value={currentTime}
                  onChange={handleTimeSeek}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                />
                <span className="w-10">{formatDuration((duration || 30) * 1000)}</span>
              </div>
            </div>

            {/* Canvas Video Button & Volume Control */}
            <div className="flex items-center justify-end gap-4 w-1/4 min-w-[200px]">
              <button
                onClick={() => handleFetchCanvas(currentTrack)}
                className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-semibold transition-all ${
                  currentTrack.canvasUrl 
                    ? 'bg-[#1DB954] text-black hover:bg-[#1ed760] shadow-md' 
                    : 'bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700'
                }`}
                title="Open Canvas Video Player"
              >
                <Film size={14} />
                <span>Canvas</span>
              </button>

              <div className="flex items-center gap-2">
                <button onClick={() => setIsMuted(!isMuted)} className="text-neutral-400 hover:text-white transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                />
              </div>
            </div>

            {/* Hidden media element for preview audio/video */}
            {isVideo ? (
              <video 
                ref={mediaRef as any}
                src={currentTrack.previewUrl || ''}
                onTimeUpdate={() => setCurrentTime(mediaRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(mediaRef.current?.duration || 0)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            ) : (
              <audio 
                ref={mediaRef as any}
                src={currentTrack.previewUrl || ''}
                onTimeUpdate={() => setCurrentTime(mediaRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(mediaRef.current?.duration || 0)}
                onEnded={() => setIsPlaying(false)}
              />
            )}
          </div>
        )}

        {/* Canvas Video Modal */}
        {activeCanvasTrack && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-fadeIn">
            <div className="bg-[#181818] border border-neutral-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/60">
                <div className="flex items-center gap-2">
                  <Film size={18} className="text-[#1DB954]" />
                  <span className="font-bold text-sm text-white">Spotify Canvas Video</span>
                </div>
                <button
                  onClick={() => setActiveCanvasTrack(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Video Player & Artwork */}
              <div className="p-6 flex flex-col items-center bg-[#121212]">
                {activeCanvasTrack.canvasUrl ? (
                  <div className="relative w-64 h-[440px] rounded-xl overflow-hidden shadow-2xl border border-neutral-700 bg-black">
                    <video
                      src={activeCanvasTrack.canvasUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 rounded text-[10px] font-bold text-[#1DB954] uppercase tracking-wider backdrop-blur-sm">
                      Canvas MP4
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-64 rounded-xl overflow-hidden shadow-2xl border border-neutral-800 bg-neutral-900 flex flex-col items-center justify-center p-4 text-center">
                    {activeCanvasTrack.coverUrl ? (
                      <img src={activeCanvasTrack.coverUrl} alt="Cover" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Music size={48} className="text-neutral-500 mb-2" />
                    )}
                  </div>
                )}

                {/* Track Info */}
                <div className="mt-5 text-center max-w-sm">
                  <h3 className="text-lg font-bold text-white truncate">{activeCanvasTrack.title}</h3>
                  <p className="text-sm text-neutral-400 truncate mt-0.5">{activeCanvasTrack.artist}</p>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">{activeCanvasTrack.album}</p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
                  {activeCanvasTrack.previewUrl && (
                    <button
                      onClick={() => togglePlay(activeCanvasTrack)}
                      className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 text-xs shadow-md"
                    >
                      {currentTrack?.id === activeCanvasTrack.id && isPlaying ? (
                        <>
                          <Pause size={14} fill="currentColor" /> Pause Preview
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="currentColor" /> Play Audio Preview
                        </>
                      )}
                    </button>
                  )}

                  {activeCanvasTrack.canvasUrl && (
                    <a
                      href={activeCanvasTrack.canvasUrl}
                      download={`${activeCanvasTrack.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-canvas.mp4`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2.5 rounded-full border border-neutral-700 transition-colors flex items-center gap-1.5 text-xs"
                    >
                      <Download size={14} /> Download Canvas (.mp4)
                    </a>
                  )}
                </div>

                {!activeCanvasTrack.canvasUrl && (
                  <p className="text-[11px] text-neutral-500 text-center mt-4 max-w-xs leading-relaxed">
                    Note: Spotify restricts Canvas videos on unauthenticated web requests. To guarantee canvas extraction, provide your Spotify <code className="text-neutral-400">sp_dc</code> cookie in Scraper Advanced Options.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Raw JSON Modal */}
        {showRawModal && rawData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
            <div className="bg-[#181818] border border-neutral-800 rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl">
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                <h3 className="font-bold text-sm text-white">Raw JSON Payload</h3>
                <button 
                  onClick={() => setShowRawModal(false)}
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg text-white"
                >
                  Close
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 bg-[#121212]">
                <pre className="text-xs font-mono text-[#a5d6a7] leading-relaxed">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Home / Importer View
  const quickLinks = [
    { label: 'Top 100 Songs (India)', url: 'https://itunes.apple.com/in/rss/topsongs/limit=100/json' },
    { label: 'Top 50 Pop Songs (India)', url: 'https://itunes.apple.com/in/rss/topsongs/genre=14/limit=50/json' },
    { label: 'Top 100 Hip-Hop (US)', url: 'https://itunes.apple.com/us/rss/topsongs/genre=18/limit=100/json' },
    { label: 'Top 50 Podcasts (US)', url: 'https://itunes.apple.com/us/rss/toppodcasts/limit=50/json' },
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full flex flex-col gap-6">
        {/* Branding Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1DB954] to-emerald-400 flex items-center justify-center shadow-xl shadow-green-500/10">
            <Music size={28} className="text-black" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Music Data & Playlist Visualizer</h1>
          <p className="text-sm text-neutral-400 max-w-md">
            Visualize and scrape Spotify Sections, Playlists, iTunes Charts, and Albums with full tracklist and preview playback.
          </p>
        </div>

        {/* Action / Scraper Entry Points */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setShowSpotifyScraper(true)}
            className="p-5 rounded-xl bg-gradient-to-br from-[#181818] to-neutral-900 border border-neutral-800 hover:border-[#1DB954]/50 transition-all text-left flex flex-col justify-between group shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
                  <Layers size={20} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#1DB954]/20 text-[#1DB954] rounded">
                  Scraper
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#1DB954] transition-colors">
                Spotify Scraper
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Scrape Spotify Sections & extract nested playlists & tracklists.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-[#1DB954] font-semibold">
              Launch Scraper <Play size={12} fill="currentColor" />
            </div>
          </button>

          <button
            onClick={() => setShowHostedManager(true)}
            className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/40 hover:border-emerald-400 transition-all text-left flex flex-col justify-between group shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Server size={20} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/30">
                  Vercel API
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                Published APIs
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Manage hosted endpoints at <code className="text-emerald-400">uvytunesspotify.vercel.app</code>
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              Manage APIs <Globe size={12} />
            </div>
          </button>

          <button
            onClick={() => setShowDocs(true)}
            className="p-5 rounded-xl bg-gradient-to-br from-[#181818] to-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all text-left flex flex-col justify-between group shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
                  <BookOpen size={20} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded">
                  Docs
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-neutral-200 transition-colors">
                iTunes API Docs
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Browse unauthenticated RSS feed documentation.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400 font-semibold group-hover:text-white">
              View Docs <ChevronLeft size={14} className="rotate-180" />
            </div>
          </button>
        </div>

        {/* Input Card */}
        <div className="bg-[#181818] p-6 rounded-2xl border border-neutral-800 flex flex-col gap-6 shadow-2xl">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
              isDragging ? 'border-[#1DB954] bg-[#1DB954]/5' : 'border-neutral-700 hover:border-neutral-500 bg-[#121212]'
            }`}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".json,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
              <UploadCloud size={24} className="text-neutral-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Drag & drop your JSON file here</p>
              <p className="text-xs text-neutral-500 mt-1">or click to browse from your computer</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-neutral-800 flex-1" />
            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">or paste URL / JSON</span>
            <div className="h-px bg-neutral-800 flex-1" />
          </div>

          {/* Textarea Input */}
          <div className="flex flex-col gap-3">
            <textarea
              className="w-full h-28 bg-[#121212] border border-neutral-800 rounded-lg p-4 text-xs text-neutral-300 font-mono focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-shadow resize-none"
              placeholder="Paste Spotify Section URL (e.g. open.spotify.com/section/0JQ5DAnM3wGh0gz1MXnukA)&#10;or Playlist URL / iTunes RSS Feed URL"
              value={jsonInput}
              onChange={handleTextareaChange}
            />
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-md border border-red-400/20">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!jsonInput.trim() || isLoading}
              className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Fetching & Visualizing...
                </>
              ) : (
                'Visualize Content'
              )}
            </button>
          </div>
          
          <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Quick Links:</span>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => fetchFromUrl(link.url)}
                  className="flex items-center gap-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1 rounded-full transition-colors"
                >
                  <Link size={12} />
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ServeToApiModal
        isOpen={serveModalData.isOpen}
        onClose={() => setServeModalData({ isOpen: false, playlistData: null })}
        playlistData={serveModalData.playlistData}
      />
    </div>
  );
}
