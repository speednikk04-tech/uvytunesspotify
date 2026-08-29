import { readFileSync } from 'fs';

function extractCover(data: any) {
  let coverUrl = data.coverUrl 
    || data.images?.[0]?.url 
    || data.visualIdentity?.image?.find((img: any) => img.maxHeight === 300 || img.maxHeight === 640)?.url
    || data.visualIdentity?.image?.[0]?.url
    || (data.coverArt?.sources ? (data.coverArt.sources[2]?.url || data.coverArt.sources[0]?.url) : null);
  return coverUrl;
}
