// Dorax Finance — checks, and the one-file preview. node tools/build.js   (node tools/build.js --check: the checks only)
// The app in app/ is what gets deployed, as it is: there is nothing to compile. This script does two things:
//   1. checks the list in app/index.html (every file it names exists, every file in js/ and css/ is named, no click is defined twice);
//   2. makes a ONE-FILE PREVIEW of the app that needs no server: dist/dorax-preview.html, to open from disk, and
//      dist/dorax-preview-artifact.html, the same page without its outer skeleton (as a Claude artifact is published).
//      In the preview, tools/preview-backend.js stands in for Supabase: accounts live in the browser that opens it, no email is sent.
//      It is for looking at the app, and for the tests. It is NOT what goes live.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), APP = path.join(ROOT, 'app'), DIST = path.join(ROOT, 'dist');
const read = p => fs.readFileSync(path.join(APP, p));
const html = read('index.html').toString();
const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]), local = styles.filter(h => !/^https?:/.test(h)), remote = styles.filter(h => /^https?:/.test(h));
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const title = (html.match(/<title>[^<]*<\/title>/) || [''])[0];
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<!-- Scripts.')).replace(/<noscript>[\s\S]*?<\/noscript>\n?/, '').trim();
const fail = m => { console.error('build: ' + m); process.exit(1); };

// --- checks: a broken list is caught here, not in the browser
for (const f of [...local, ...scripts]) if (!fs.existsSync(path.join(APP, f))) fail('index.html names a file that does not exist: ' + f);
const walk = d => fs.readdirSync(path.join(APP, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
for (const f of walk('js')) if (!scripts.includes(f)) fail('a script is not listed in index.html: ' + f);
for (const f of walk('css')) if (!local.includes(f)) fail('a stylesheet is not listed in index.html: ' + f);
const css = Buffer.concat(local.map((f, i) => Buffer.concat([read(f).slice(0, -1), Buffer.from(i < local.length - 1 ? '\n' : '')])));      // each file ends with one newline; joined, they are one sheet
const open = (css.toString().match(/{/g) || []).length, close = (css.toString().match(/}/g) || []).length;
if (open !== close) fail(`the stylesheets' braces do not balance (${open} / ${close})`);
const seen = {};
for (const f of scripts.filter(f => /\.actions\.js$/.test(f))) {
  const obj = (read(f).toString().match(/^const \w+_ACTIONS = \{\n([\s\S]*?)\n\};/m) || [])[1] || '';
  for (const m of obj.matchAll(/^  (?:async )?'?([A-Za-z][\w-]*)'?\(/gm)) { if (seen[m[1]]) fail(`the action "${m[1]}" is defined twice: ${seen[m[1]]} and ${f}`); seen[m[1]] = f; }
}
const groups = scripts.filter(f => /\.actions\.js$/.test(f)).map(f => (read(f).toString().match(/^const (\w+_ACTIONS) = \{/m) || [])[1]).filter(Boolean), joined = read('js/app/actions.js').toString();
for (const g of groups) if (!joined.includes('...' + g + ',')) fail(`${g} is not joined into A in js/app/actions.js`);

if (process.argv.includes('--check')) { console.log(`checked: ${scripts.length} scripts, ${local.length} stylesheets, ${Object.keys(seen).length} actions`); process.exit(0); }

// --- the one-file preview: the app's own files, with the stand-in server in place of config.js and the Supabase library
const LIBS = { pdfworker: 'vendor/pdf.worker.min.js', pdf: 'vendor/pdf.min.js', xlsx: 'vendor/xlsx.min.js' };      // carried as text, started on first use (see features/converter/file-readers.js)
const libs = Buffer.concat(Object.entries(LIBS).map(([id, f]) => { const b = read(f); if (/<\/script/i.test(b.toString('latin1'))) fail(f + ' contains a closing script tag'); return Buffer.concat([Buffer.from(`<script type="text/plain" id="lib-${id}">\n`), b, Buffer.from('\n</script>\n')]); }));
const SERVER_FILES = ['config.js', 'vendor/supabase.js'], standIn = fs.readFileSync(path.join(__dirname, 'preview-backend.js'));
for (const f of SERVER_FILES) if (!scripts.includes(f)) fail('index.html no longer lists ' + f + ': the preview build expects to replace it');
const js = Buffer.concat([Buffer.from('\n// ===== tools/preview-backend.js (the stand-in server: preview only) =====\n'), standIn, ...scripts.filter(f => !SERVER_FILES.includes(f)).map(f => Buffer.concat([Buffer.from('\n// ===== ' + f + ' =====\n'), read(f)]))]);
if (/<\/script/i.test(js.toString())) fail('a script contains a closing script tag');
const page = Buffer.concat([Buffer.from(title + '\n' + remote.map(h => `<link rel="stylesheet" href="${h}">`).join('\n') + '\n<style>'), css, Buffer.from('</style>\n' + body + '\n'), libs, Buffer.from('<script>'), js, Buffer.from('</script>\n')]);
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'dorax-preview-artifact.html'), page);
const icon = 'data:image/svg+xml;base64,' + read('assets/icons/favicon.svg').toString('base64');
const shell = Buffer.from(`<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#000000"><link rel="icon" href="${icon}"></head><body>\n`);
fs.writeFileSync(path.join(DIST, 'dorax-preview.html'), Buffer.concat([shell, page, Buffer.from('\n</body></html>\n')]));
console.log(`checked: ${scripts.length} scripts, ${local.length} stylesheets, ${Object.keys(seen).length} actions. Preview: dist/dorax-preview.html, dist/dorax-preview-artifact.html (${Math.round(page.length / 1024)} KB)`);
