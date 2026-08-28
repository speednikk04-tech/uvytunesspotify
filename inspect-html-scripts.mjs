import fs from 'fs';

const html = fs.readFileSync('section-page.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];

scriptMatches.forEach((m, idx) => {
  const attrs = m[1];
  const body = m[2];
  console.log(`Script #${idx}: attrs=[${attrs.trim()}] bodyLen=${body.length}`);
  if (body.length > 0 && body.length < 500) {
    console.log(`  Body: ${body}`);
  } else if (body.length >= 500) {
    console.log(`  Body excerpt: ${body.slice(0, 200)}...`);
  }
});

