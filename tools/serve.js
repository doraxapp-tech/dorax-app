// Dorax Finance — a small web server for app/, to see the app on this computer the way it runs when hosted.
//   node tools/serve.js             http://localhost:5173, talking to the Supabase project named in app/config.js
//   node tools/serve.js --preview   the same pages with the stand-in server (tools/preview-backend.js): no Supabase needed, accounts
//                                   stay in this browser, no email is sent. For looking at the app; it is not what goes live.
// The pages are sent with the same headers Vercel sends (vercel.json), so what the browser allows here is what it allows there.
// For logging in against a real Supabase project from here, add http://localhost:5173/** to its Redirect URLs (DEPLOY.md, step 2).
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'app'), PORT = +process.env.PORT || 5173, PREVIEW = process.argv.includes('--preview');
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', webmanifest: 'application/manifest+json' };
/** The headers vercel.json gives a path (its "source" patterns are regular expressions on the whole path). */
function headersFor(url) {
  const out = {}; let rules = []; try { rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers || []; } catch (e) { /* no file: no extra headers */ }
  for (const r of rules) if (new RegExp('^' + r.source + '$').test(url)) for (const h of r.headers) out[h.key] = h.value;
  return out;
}
/** The file vercel.json answers a path with (its "rewrites"): the pages before login have addresses of their own (app/js/ui/pages.js), all answered with index.html. */
function rewriteFor(url) {
  let rules = []; try { rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).rewrites || []; } catch (e) { /* no file: no rewrites */ }
  for (const r of rules) if (new RegExp('^' + r.source + '$').test(url)) return r.destination;
  return url;
}
/** opts.preview: the stand-in server takes the place of config.js. opts.files: { '/path': 'text' } served instead of the file (the tests use it). */
function createServer(opts) {
  const o = opts || {}, files = { ...(o.files || {}) };
  return http.createServer((req, res) => {
    const asked = decodeURIComponent(req.url.split('?')[0]), url = rewriteFor(asked), head = { 'Cache-Control': 'no-store', ...headersFor(asked) };
    if (files[url] != null) { res.writeHead(200, { ...head, 'Content-Type': TYPES[url.split('.').pop()] || TYPES.html }); return res.end(files[url]); }
    if (o.preview && url === '/config.js') { res.writeHead(200, { ...head, 'Content-Type': TYPES.js }); return res.end(fs.readFileSync(path.join(__dirname, 'preview-backend.js'))); }       // the stand-in takes the place of the project's address
    const file = path.join(DIR, url === '/' ? 'index.html' : url);
    if (!file.startsWith(DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, head); return res.end('Not found'); }
    res.writeHead(200, { ...head, 'Content-Type': TYPES[file.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
}
if (require.main === module) { try { require('./build-banks.js').write({ quiet: true }); } catch (e) { console.warn('banks: the list of logos could not be written: ' + e.message); } }
if (require.main === module) createServer({ preview: PREVIEW }).listen(PORT, '127.0.0.1', () => console.log(`Dorax Finance${PREVIEW ? ' (preview: stand-in server, nothing leaves this browser)' : ''}: http://localhost:${PORT}`));
module.exports = { createServer, headersFor, rewriteFor };
