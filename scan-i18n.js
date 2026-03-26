const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'client/pages/admin');

function getFiles(d) {
  const results = [];
  for (const i of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, i.name);
    if (i.isDirectory()) results.push(...getFiles(p));
    else if (i.name.endsWith('.vue')) results.push(p);
  }
  return results;
}

const vietRegex = /[\u00C0-\u024F\u1E00-\u1EFF]/;
const files = getFiles(dir);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const hits = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.includes('console.') || trimmed.includes('import ')) continue;
    if (!vietRegex.test(line)) continue;
    
    let cleaned = line.replace(/\$?t\(['"][^'"]*['"]\)/g, '');
    cleaned = cleaned.replace(/\$?t\(['"][^'"]*['"],\s*[^)]+\)/g, '');
    if (!vietRegex.test(cleaned)) continue;
    
    hits.push('  L' + (i + 1) + ': ' + trimmed.substring(0, 110));
  }
  
  if (hits.length > 0) {
    const rel = path.relative(dir, file);
    console.log('\n[' + rel + '] (' + hits.length + ' hardcoded)');
    hits.forEach(function(h) { console.log(h); });
  }
}

console.log('\nScan complete.');
