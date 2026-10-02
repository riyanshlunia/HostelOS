const fs = require('fs');
const src = fs.readFileSync('src/App.tsx', 'utf8');
const lines = src.split('\n');

// Find ComplaintForm
const idx = lines.findIndex(l => l.includes('function ComplaintForm'));
console.log('ComplaintForm at line:', idx);
console.log(lines.slice(idx, idx + 50).map((l,i) => (idx+i)+': '+l).join('\n'));
