// Every text the interface writes must exist in Spanish and Portuguese, with the same {placeholders}.
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = path.join(__dirname, '..', 'app', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(src, 'i18n', 'translations.js'), 'utf8') + '\nthis.TR = TR;', ctx);
const TR = ctx.TR, keys = new Map(TR.map(r => [r[0], r]));
const walk = d => fs.readdirSync(path.join(src, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk('').filter(f => f.endsWith('.js') && !f.endsWith('translations.js'));
const used = new Map();
const strRe = /\b(t|tn)\(\s*((?:[^()'"`]|\([^()]*\))*?)?('((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
for (const f of files) {
  const s = fs.readFileSync(path.join(src, f), 'utf8');
  // t('...')
  for (const m of s.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) add(m[1], f);
  for (const m of s.matchAll(/\btcur\(\s*'((?:[^'\\]|\\.)*)'/g)) add(m[1], f);       // t() with the currency put in (ui/lookups.js)
  for (const m of s.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) add(m[1], f);
  // tn(n, 'one', 'many')
  for (const m of s.matchAll(/\btn\(\s*[^,]+,\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/g)) { add(m[1], f); add(m[2], f); }
}
function add(raw, f) { const k = raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\'); if (!used.has(k)) used.set(k, f); }
let bad = 0;
const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
for (const [k, f] of used) {
  const r = keys.get(k);
  if (!r) { console.log('MISSING', f, JSON.stringify(k)); bad++; continue; }
  for (const i of [1, 2]) { if (!r[i] || !String(r[i]).trim()) { console.log('EMPTY', ['', 'es', 'pt'][i], JSON.stringify(k)); bad++; } else if (ph(r[i]) !== ph(k)) { console.log('PLACEHOLDERS', ['', 'es', 'pt'][i], JSON.stringify(k), '=>', JSON.stringify(r[i])); bad++; } }
}
const dup = TR.length - keys.size;
console.log(`i18n: ${used.size} texts used, ${TR.length} rows (${dup} repeated keys), ${bad} problems`);
process.exit(bad ? 1 : 0);
