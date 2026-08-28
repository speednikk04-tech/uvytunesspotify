export interface iTunesFeed {
  feed: {
    author: {
      name: { label: string };
      uri: { label: string };
    };
    entry: iTunesEntry[];
    updated?: { label: string };
    rights?: { label: string };
    title?: { label: string };
    icon?: { label: string };
    link: { attributes: { rel: string; type: string; href: string } }[];
    id: { label: string };
  };
}

export interface iTunesEntry {
  "im:name": { label: string };
  "im:image": { label: string; attributes: { height: string } }[];
  "im:collection": {
    "im:name": { label: string };
    link: { attributes: { rel: string; type: string; href: string } };
    "im:contentType": {
      "im:contentType": { attributes: { term: string; label: string } };
      attributes: { term: string; label: string };
    };
  };
  "im:price": { label: string; attributes: { amount: string; currency: string } };
  "im:contentType": {
    "im:contentType": { attributes: { term: string; label: string } };
    attributes: { term: string; label: string };
  };
  rights: { label: string };
  title: { label: string };
  link: {
    attributes: { rel: string; type: string; href: string; title?: string; "im:assetType"?: string };
    "im:duration"?: { label: string };
  }[];
  id: { label: string; attributes: { "im:id": string } };
  "im:artist": { label: string; attributes: { href: string } };
  category: { attributes: { "im:id": string; term: string; scheme: string; label: string } };
  "im:releaseDate": { label: string; attributes: { label: string } };
}

export interface UnifiedTrack {
  id: string;
  uri?: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string | null;
  previewUrl: string | null;
  durationMs: number;
  canvasUrl?: string | null;
}

export interface UnifiedPlaylist {
  title: string;
  author: string;
  trackCount: number;
  coverUrl: string | null;
  tracks: UnifiedTrack[];
}

export interface UnifiedSectionPlaylist {
  id: string;
  uri?: string;
  name: string;
  description?: string;
  owner?: string;
  shelf?: string;
  isAlbum?: boolean;
  coverUrl: string | null;
  trackCount: number;
  trackList: UnifiedTrack[];
  raw?: any;
}

export interface UnifiedSection {
  type: 'section';
  id: string;
  title: string;
  subtitle?: string;
  countryCode?: string;
  playlistCount: number;
  totalTracksCount: number;
  playlists: UnifiedSectionPlaylist[];
  raw?: any;
}

export interface ParsedSpotifyCookies {
  spDc: string | null;
  spKey: string | null;
  cookieHeader: string;
  count: number;
  items: Array<{ name: string; valueSnippet: string }>;
  verified?: boolean;
  isAnonymous?: boolean;
  username?: string;
  clientId?: string;
  expiresAt?: number;
  error?: string;
}

export interface HostedPlaylistEndpoint {
  id: string;
  slug: string;
  name: string;
  description?: string;
  sourceUrl: string;
  sourceType: 'playlist' | 'album' | 'section';
  trackCount: number;
  coverUrl: string | null;
  lastUpdated: string;
  nextRefreshAt: string;
  autoUpdateDaily: boolean;
  cookies?: string;
  tracks: UnifiedTrack[];
  raw?: any;
}


