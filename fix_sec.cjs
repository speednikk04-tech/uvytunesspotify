const fs = require('fs');
let code = fs.readFileSync('src/components/SectionBuilderModal.tsx', 'utf-8');
code = code.replace(
  "name: data.name || data.title || 'Scraped Playlist',",
  "name: data.name || data.title || data.subtitle || 'Scraped Playlist',"
);
fs.writeFileSync('src/components/SectionBuilderModal.tsx', code);
