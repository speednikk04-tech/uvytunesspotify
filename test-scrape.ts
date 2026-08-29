async function run() {
  const res = await fetch("http://127.0.0.1:3000/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" })
  });
  const data = await res.json();
  console.log("Keys:", Object.keys(data));
  console.log("coverUrl:", data.coverUrl);
  console.log("images:", JSON.stringify(data.images));
  console.log("visualIdentity:", JSON.stringify(data.visualIdentity));
  console.log("coverArt:", JSON.stringify(data.coverArt));
}
run();
