const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace(
  'const spotifyUrlInfo = require("spotify-url-info");',
  'import * as spotifyUrlInfoModule from "spotify-url-info";'
);
code = code.replace(
  'const fn = typeof spotifyUrlInfo === "function" ? spotifyUrlInfo : (spotifyUrlInfo && spotifyUrlInfo.default);',
  'const sui = spotifyUrlInfoModule;\n    const fn = typeof sui === "function" ? sui : (sui && (sui as any).default);'
);
fs.writeFileSync('server.ts', code);
