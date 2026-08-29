const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/scrape',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log("Scraped Playlist data keys:", Object.keys(parsed));
      console.log("coverUrl:", parsed.coverUrl);
      console.log("images:", parsed.images);
      console.log("visualIdentity:", parsed.visualIdentity);
      console.log("coverArt:", parsed.coverArt);
    } catch(e) {
      console.error(e);
    }
  });
});

req.write(JSON.stringify({ url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" }));
req.end();
