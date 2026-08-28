import React from 'react';
import { ChevronLeft, Play } from 'lucide-react';

interface ApiDocsProps {
  onClose: () => void;
  onSelectUrl: (url: string) => void;
}

export const ApiDocs: React.FC<ApiDocsProps> = ({ onClose, onSelectUrl }) => {
  const EndpointParam = ({ name, type, desc }: { name: string; type: string; desc: string }) => (
    <div className="flex gap-4 py-3 border-b border-neutral-800 last:border-0 items-start">
      <div className="w-1/4">
        <code className="text-sm font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded">{name}</code>
      </div>
      <div className="w-1/6 text-xs text-neutral-500 uppercase font-semibold mt-0.5">{type}</div>
      <div className="flex-1 text-sm text-neutral-300">{desc}</div>
    </div>
  );

  const ExampleLink = ({ title, url }: { title: string; url: string }) => (
    <div
      className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-700 hover:border-green-500/50 transition-colors cursor-pointer group"
      onClick={() => onSelectUrl(url)}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-white font-medium group-hover:text-green-400 transition-colors">{title}</h4>
        <div className="flex items-center gap-1 text-xs text-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={12} fill="currentColor" /> Try it
        </div>
      </div>
      <code className="text-xs text-neutral-400 font-mono break-all bg-black/30 p-2 rounded block">{url}</code>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans flex justify-center">
      <div className="max-w-4xl w-full pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">iTunes Legacy RSS API</h1>
            <p className="text-neutral-400 text-sm mt-1">Unauthenticated Charts Feed Documentation</p>
          </div>
        </div>

        <div className="space-y-12">
          {/* Overview Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-neutral-800 pb-2">Overview</h2>
            <p className="text-neutral-300 text-sm leading-relaxed mb-4">
              Apple provides unauthenticated RSS feeds for iTunes top charts. While these are considered legacy and not officially documented in their modern API specs, they remain widely used for simple chart fetching without requiring API keys or OAuth.
            </p>
            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-2">Endpoint Pattern</p>
              <code className="text-sm font-mono text-green-400 break-all">
                https://itunes.apple.com/<span className="text-white">{"{country}"}</span>/rss/<span className="text-white">{"{chartType}"}</span>/[genre=<span className="text-white">{"{id}"}</span>/]limit=<span className="text-white">{"{n}"}</span>/<span className="text-white">{"{format}"}</span>
              </code>
            </div>
          </section>

          {/* Parameters */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-neutral-800 pb-2">Path Parameters</h2>
            <div className="bg-[#181818] rounded-lg border border-neutral-800 px-4">
              <EndpointParam name="country" type="string" desc="The two-letter ISO country code (e.g., 'us', 'in', 'gb', 'jp'). Controls the storefront." />
              <EndpointParam name="chartType" type="string" desc="The type of chart. e.g., 'topsongs', 'topalbums', 'topmusicvideos', 'toppodcasts', 'topmovies', 'topfreeapplications'." />
              <EndpointParam name="genre" type="integer" desc="(Optional) Filter by iTunes genre ID. Example: 'genre=14' for Pop." />
              <EndpointParam name="limit" type="integer" desc="Number of results to return. Standard limits: 10, 25, 50, 100, 200 (Max)." />
              <EndpointParam name="explicit" type="boolean" desc="(Optional) Add 'explicit=true' to the path to include explicit content (default depends on storefront)." />
              <EndpointParam name="format" type="string" desc="Response format. Always use 'json' for this application." />
            </div>
          </section>

          {/* Chart Types Table */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-neutral-800 pb-2">Supported Chart Types</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#181818] p-4 rounded-lg border border-neutral-800">
                <h3 className="text-green-500 font-semibold mb-2 text-sm uppercase tracking-wider">Music</h3>
                <ul className="text-sm text-neutral-300 space-y-1 font-mono">
                  <li>topsongs</li>
                  <li>topalbums</li>
                  <li>topmusicvideos</li>
                  <li>newreleases</li>
                </ul>
              </div>
              <div className="bg-[#181818] p-4 rounded-lg border border-neutral-800">
                <h3 className="text-green-500 font-semibold mb-2 text-sm uppercase tracking-wider">Podcasts</h3>
                <ul className="text-sm text-neutral-300 space-y-1 font-mono">
                  <li>toppodcasts</li>
                  <li>topaudiopodcasts</li>
                  <li>topvideopodcasts</li>
                </ul>
              </div>
              <div className="bg-[#181818] p-4 rounded-lg border border-neutral-800">
                <h3 className="text-green-500 font-semibold mb-2 text-sm uppercase tracking-wider">Apps & Software</h3>
                <ul className="text-sm text-neutral-300 space-y-1 font-mono">
                  <li>topfreeapplications</li>
                  <li>toppaidapplications</li>
                  <li>topgrossingapplications</li>
                </ul>
              </div>
              <div className="bg-[#181818] p-4 rounded-lg border border-neutral-800">
                <h3 className="text-green-500 font-semibold mb-2 text-sm uppercase tracking-wider">Movies & TV Shows</h3>
                <ul className="text-sm text-neutral-300 space-y-1 font-mono">
                  <li>topmovies</li>
                  <li>toptvepisodes</li>
                  <li>toptvseasons</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Genres Table */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-neutral-800 pb-2">Common Music Genre IDs</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { id: 2, name: "Blues" },
                { id: 4, name: "Children's Music" },
                { id: 6, name: "Country" },
                { id: 7, name: "Electronic" },
                { id: 11, name: "Jazz" },
                { id: 14, name: "Pop" },
                { id: 15, name: "R&B/Soul" },
                { id: 18, name: "Hip-Hop/Rap" },
                { id: 20, name: "Alternative" },
                { id: 21, name: "Rock" },
                { id: 27, name: "J-Pop" },
                { id: 51, name: "K-Pop" },
              ].map(genre => (
                <div key={genre.id} className="bg-[#181818] p-3 rounded-lg border border-neutral-800 flex justify-between items-center">
                  <span className="text-sm font-medium">{genre.name}</span>
                  <code className="text-xs text-neutral-500 font-mono">{genre.id}</code>
                </div>
              ))}
            </div>
          </section>

          {/* Interactive Examples */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-neutral-800 pb-2">Interactive Examples</h2>
            <p className="text-neutral-400 text-sm mb-4">Click any example below to instantly visualize it in the player.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ExampleLink title="Top 100 Songs (India)" url="https://itunes.apple.com/in/rss/topsongs/limit=100/json" />
              <ExampleLink title="Top 100 Albums (India)" url="https://itunes.apple.com/in/rss/topalbums/limit=100/json" />
              <ExampleLink title="Top 50 Pop Songs (India)" url="https://itunes.apple.com/in/rss/topsongs/genre=14/limit=50/json" />
              <ExampleLink title="Top 100 Hip-Hop (US)" url="https://itunes.apple.com/us/rss/topsongs/genre=18/limit=100/json" />
              <ExampleLink title="Top 50 Podcasts (US)" url="https://itunes.apple.com/us/rss/toppodcasts/limit=50/json" />
              <ExampleLink title="Top 25 Free Apps (US)" url="https://itunes.apple.com/us/rss/topfreeapplications/limit=25/json" />
              <ExampleLink title="Top 50 Movies (GB)" url="https://itunes.apple.com/gb/rss/topmovies/limit=50/json" />
              <ExampleLink title="Top 25 Audiobooks (US)" url="https://itunes.apple.com/us/rss/topaudiobooks/limit=25/json" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
