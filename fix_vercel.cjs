const fs = require('fs');
let code = fs.readFileSync('vercel.json', 'utf-8');
code = code.replace(
  '      "source": "/api/(.*)",\n      "destination": "/api"\n    },\n    {',
  ''
);
fs.writeFileSync('vercel.json', code);
