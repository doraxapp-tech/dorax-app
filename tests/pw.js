// Shared browser helper for the QC suites.
// The app needs a server (Supabase). The tests give it a stand-in that answers from the browser's own storage (tools/preview-backend.js),
// so every flow can be run without a network: sign-up, the links in the emails, Google, saving, two tabs, a lost connection.
const { chromium } = require('playwright');
const path = require('path');
// What is tested: the app (app/index.html) unless DORAX_TARGET=bundle, which tests the one-file preview (dist/dorax-preview.html; run tools/build.js first).
const TARGET = process.env.DORAX_TARGET === 'bundle' ? 'bundle' : 'app';
const PAGE = TARGET === 'bundle' ? path.join(__dirname, '..', 'dist', 'dorax-preview.html') : path.join(__dirname, '..', 'app', 'index.html');
const FILE = 'file://' + PAGE.replace(/ /g, '%20');
const BACKEND = path.join(__dirname, '..', 'tools', 'preview-backend.js'), FIXTURE = path.join(__dirname, 'fixtures', 'example-account.js');
const TODAY = '2026-10-02';       // the day the example account was written for: the tests run on it unless they ask for another
/** opts.account: 'example' logs in with the test fixture's full account; without it nobody is logged in.
    opts.server: options for the stand-in (confirmEmail, secureEmailChange, google, oauthReload, delay). */
async function open(opts = {}) {
  const browser = opts.browser || await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
  const ctx = opts.ctx || await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, locale: opts.locale || 'en-US', timezoneId: 'America/Sao_Paulo', reducedMotion: opts.motion || process.env.MOTION ? 'no-preference' : 'reduce', hasTouch: !!opts.touch, isMobile: !!opts.mobile, deviceScaleFactor: opts.dpr || 1 });
  if (!opts.ctx) await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage(); page.setDefaultTimeout(+process.env.PW_TIMEOUT || 10000);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.googleapis|ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.addInitScript(o => { window.DORAX_LANG = o.lang || 'en'; if (o.plan) window.DORAX_EXAMPLE_PLAN = true; window.DORAX_TODAY = o.today; window.DORAX_PREVIEW_OPTIONS = o.server; window.DORAX_QUIET = !o.curio; window.DORAX_LOCK_ASK = !!o.lockAsk; window.DORAX_BETA = !!o.beta; window.DORAX_TOURS = !!o.tours; },      // a new person's first visit to each screen: only for the suite about it (opts.tours)      // so do the two notices about the app lock (opts.lockAsk): the other suites are not about them
         // curiosities pop up by themselves a moment after a screen opens: a test that is about them asks for them (opts.curio)
    { lang: opts.lang, plan: opts.plan, curio: !!opts.curio, lockAsk: !!opts.lockAsk, beta: !!opts.beta, tours: !!opts.tours, today: opts.today || TODAY, server: { confirmEmail: true, oauthReload: true, ...(opts.server || {}) } });
  // On a phone the page itself does not scroll: the app's own column does (css/screens/phone.css), and it clips what is wider than it. The suites ask
  // "is anything wider than the screen?" of the page's root (documentElement.scrollWidth), so here the root answers for that column too.
  await page.addInitScript(() => { const d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollWidth'); Object.defineProperty(Element.prototype, 'scrollWidth', { configurable: true, get() { const own = d.get.call(this); if (this !== document.documentElement) return own; const w = document.querySelector('.work'); return w && getComputedStyle(w).overflowX !== 'visible' ? Math.max(own, Math.ceil(w.getBoundingClientRect().left) + d.get.call(w)) : own; } }); });
  if (TARGET === 'app' && !opts.noServer) await page.addInitScript({ path: BACKEND });       // the one-file preview carries its own copy
  await page.goto(opts.url || FILE);
  if (opts.account === 'example') await seed(page, opts.lang || 'en');
  return { browser, ctx, page, errors };
}
/** The fixture's functions (the example account, its statements and spreadsheet) in the page, for the tests that feed them to the app. */
const fixture = page => page.addScriptTag({ path: FIXTURE });
/** Puts the example account on the stand-in server and opens it, the way a returning person finds their account. */
async function seed(page, lang) {
  await fixture(page);
  await page.evaluate(l => { const st = buildDemoState(l); st.settings.lang = l; DORAX_PREVIEW.seed({ email: DEMO_EMAIL, name: st.user.name, data: st }); }, lang);
  await page.reload(); await page.waitForFunction(() => !!UI.session);
  await fixture(page);
}
/** Loads the page again on another address of its own (a link from an email, Google's way back), the way arriving through a link does.
    The address is set without leaving the page first: hopping through an empty page makes the browser start a new process, and what the
    old one had just written to storage is not always there yet. */
async function visit(page, url) {
  await page.evaluate(u => { history.replaceState(null, '', u); }, url); await page.reload();
  await page.waitForFunction(() => typeof STARTED !== 'undefined' && STARTED);
}
/** Opens the newest email of a kind ('signup', 'recovery', 'email_change', 'email_change_current') the way a person does: a page load on its link. */
async function openMail(page, type) {
  const m = await page.evaluate(k => DORAX_PREVIEW.outbox().filter(x => x.type === k).pop(), type);
  if (!m) throw new Error('no ' + type + ' email in the outbox');
  await visit(page, m.link);
  return m;
}
/** A small web server for a folder, to test the app the way it runs when hosted (http), not only opened from disk. extra: { '/path': 'body' }. */
function serve(dir, extra) {
  const http = require('http'), fs = require('fs');
  const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json' };
  const hits = [];
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]); hits.push(url);
    if (extra && extra[url] != null) { res.writeHead(200, { 'Content-Type': TYPES.html }); return res.end(extra[url]); }
    const file = path.join(dir, url === '/' ? 'index.html' : url);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[file.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({ url: 'http://127.0.0.1:' + server.address().port, hits, close: () => new Promise(r => server.close(r)) })));
}
let pass = 0, fail = 0; const fails = [];
function ok(cond, name, detail) { if (cond) pass++; else { fail++; fails.push(name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); console.log('  FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); } }
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name, { got: a, want: b }); }
function done(label) { console.log(`${label}: ${pass} passed, ${fail} failed`); if (fail) process.exitCode = 1; return { pass, fail, fails }; }
module.exports = { open, ok, eq, done, serve, fixture, seed, openMail, visit, FILE, PAGE, TARGET, TODAY };
