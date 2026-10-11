// QC of the addresses of the pages before login (owner, 2026-10-07: "separate the pages of the landing": one address per page, in Portuguese).
// The app is served over http the way it is hosted (tools/serve.js answers with the headers and the rewrites of vercel.json), with the stand-in server.
//   1. vercel.json sends every page's address to index.html, and nothing else; an address that is no page is "not found";
//   2. each address opens its own page, with its own title, and survives a reload;
//   3. the links between pages are real links to those addresses; a click changes the page and the address without loading the site again;
//      Back and Forward follow, what was typed in a form survives a look at the terms, Back on the home page returns to where it was read;
//   4. Ctrl + click opens the page in another tab;
//   5. logging in from /entrar opens the app at the root; Back does not bring the login back; logging out returns to the home page's address;
//      the emails and Google always send the person back to the root;
//   6. somebody logged in who opens /privacidade gets the app, with the text in its side panel;
//   7. opened from disk there are no addresses and the pages work as before.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { open, ok, eq, done, fixture } = require('./pw.js');
const { createServer, rewriteFor } = require('../tools/serve.js');

const PATHS = { landing: '', login: 'entrar', signup: 'criar-conta', forgot: 'recuperar-senha', privacy: 'privacidade', terms: 'termos', contact: 'contato' };
const MARK = { landing: '.lp-hero', login: '#au-pass', signup: '#au-name', forgot: '[data-a="auth-forgot-send"]', privacy: '#legal-title', terms: '#legal-title', contact: '#contact-title' };
const TITLE = { landing: 'Dorax Finance', login: 'Log in · Dorax Finance', signup: 'Create account · Dorax Finance', forgot: 'Choose a new password · Dorax Finance', privacy: 'Privacy policy · Dorax Finance', terms: 'Terms of use · Dorax Finance', contact: 'Contact · Dorax Finance' };

(async () => {
  // ---------- 1. the hosting rules ----------
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  eq([(vercel.rewrites || []).length, vercel.trailingSlash], [1, false], 'vercel.json: one rewrite, and no address ends in a slash');
  for (const [v, p] of Object.entries(PATHS)) if (p) eq(rewriteFor('/' + p), '/index.html', `vercel.json: /${p} is answered with index.html`);
  eq(['/', '/css/base/tokens.css', '/entrar/x', '/entrarx', '/sw.js'].map(rewriteFor), ['/', '/css/base/tokens.css', '/entrar/x', '/entrarx', '/sw.js'], 'vercel.json: nothing else is rewritten');

  const web = createServer({ preview: true }); await new Promise(r => web.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + web.address().port;
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
  const context = async () => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', bypassCSP: true }); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); return ctx; };
  const at = p => p.evaluate(() => location.pathname + location.hash);
  const started = p => p.waitForFunction(() => typeof STARTED !== 'undefined' && STARTED);

  let ctx = await context();
  let { page, errors } = await open({ browser, ctx, url: BASE + '/', noServer: true, lang: 'en' });
  const miss = await page.request.get(BASE + '/nao-existe'); eq(miss.status(), 404, 'an address that is no page: not found');

  // ---------- 2. each address is its page ----------
  for (const [v, p] of Object.entries(PATHS)) {
    const res = await page.goto(BASE + '/' + p); await started(page); await page.waitForSelector(MARK[v]);
    eq([res.status(), await at(page), await page.title(), await page.evaluate(() => PAGES.shown())], [200, '/' + p, TITLE[v], v], `/${p}: the ${v} page, with its title`);
    if (v === 'privacy' || v === 'terms') ok(new RegExp(v === 'privacy' ? 'Privacy' : 'Terms').test(await page.locator('#legal-title').innerText()), `/${p}: the right text`);
    ok(/noindex/.test(res.headers()['x-robots-tag'] || '') && /script-src 'self'/.test(res.headers()['content-security-policy'] || ''), `/${p}: sent with the headers of vercel.json`);
    ok(await page.evaluate(() => [...document.styleSheets].filter(s => s.href && s.href.startsWith(location.origin + '/css/') && s.cssRules.length).length) >= 40, `/${p}: the styles arrived (the files are found from this address)`);
    await page.reload(); await started(page); await page.waitForSelector(MARK[v]);
    eq([await at(page), await page.evaluate(() => PAGES.shown())], ['/' + p, v], `/${p}: still there after a reload`);
    // every link to a page is a real link to that page's address
    const links = await page.evaluate(() => [...document.querySelectorAll('#public [data-a="pub-go"]')].map(a => [a.tagName, a.getAttribute('href'), a.dataset.v]));
    ok(links.length > 0 && links.every(([tag, href, to]) => tag === 'A' && href === '/' + ({ landing: '', login: 'entrar', signup: 'criar-conta', forgot: 'recuperar-senha', privacy: 'privacidade', terms: 'termos', contact: 'contato' })[to]), `/${p}: its links to other pages are links to their addresses`, links.filter(l => l[0] !== 'A'));
  }
  await page.goto(BASE + '/index.html'); await started(page); await page.waitForSelector(MARK.landing);
  eq(await page.evaluate(() => [PAGES.on, PAGES.shown(), PAGES.root().replace(location.origin, '')]), [true, 'landing', '/'], '/index.html is the home page too');

  // ---------- 3. moving between pages ----------
  await page.goto(BASE + '/'); await started(page); await page.evaluate(() => { window.__same = true; });      // lost if the site is ever loaded again
  await page.click('.lp-actions [data-v="login"]'); await page.waitForSelector(MARK.login);
  eq([await at(page), await page.title(), await page.evaluate(() => window.__same)], ['/entrar', TITLE.login, true], 'home → Log in: the address and the title change, the site is not loaded again');
  await page.click('.auth-alt [data-v="signup"]'); await page.waitForSelector(MARK.signup); eq(await at(page), '/criar-conta', 'Log in → Create account');
  await page.fill('#au-name', 'Marta'); await page.fill('#au-email', 'marta@example.org');
  await page.click('.accept [data-v="terms"]'); await page.waitForSelector(MARK.terms); eq([await at(page), await page.title()], ['/termos', TITLE.terms], 'Create account → Terms of use');
  await page.goBack(); await page.waitForSelector(MARK.signup);
  eq([await at(page), await page.inputValue('#au-name'), await page.inputValue('#au-email'), await page.evaluate(() => window.__same)], ['/criar-conta', 'Marta', 'marta@example.org', true], 'Back from the terms: the form, with what was typed');
  await page.goBack(); await page.waitForSelector(MARK.login); eq(await at(page), '/entrar', 'Back again: the login');
  await page.goBack(); await page.waitForSelector(MARK.landing); eq([await at(page), await page.title()], ['/', TITLE.landing], 'Back again: the home page');
  await page.goForward(); await page.waitForSelector(MARK.login); eq(await at(page), '/entrar', 'Forward: the login');
  await page.click('.auth-back'); await page.waitForSelector(MARK.landing); eq(await at(page), '/', '"Home" on the login: the home page');
  // Back on the home page returns to where it was being read
  await page.evaluate(() => document.querySelector('.lp-foot').scrollIntoView()); const y = await page.evaluate(() => window.scrollY);
  await page.click('.lp-foot [data-v="privacy"]'); await page.waitForSelector(MARK.privacy); eq([await at(page), await page.evaluate(() => window.scrollY)], ['/privacidade', 0], 'the footer → Privacy policy, from its top');
  await page.goBack(); await page.waitForSelector(MARK.landing); ok(y > 500 && Math.abs(await page.evaluate(() => window.scrollY) - y) < 4, 'Back: the home page, where it was being read', [y, await page.evaluate(() => window.scrollY)]);
  // a section of the home page is still a section, not a page
  await page.click('.lp-nav [data-id="lp-faq"]'); eq(await at(page), '/', 'a section of the home page keeps the home page\'s address');

  // ---------- 4. Ctrl + click: another tab ----------
  const [tab] = await Promise.all([ctx.waitForEvent('page'), page.click('.lp-actions [data-v="signup"]', { modifiers: ['Control'] })]);
  await started(tab); await tab.waitForSelector(MARK.signup);
  eq([await at(tab), await at(page), await page.evaluate(() => PAGES.shown())], ['/criar-conta', '/', 'landing'], 'Ctrl + click: the page opens in another tab, this one stays');
  await tab.close();

  // ---------- 5. logging in and out ----------
  await fixture(page); await page.evaluate(() => { const st = buildDemoState('en'); DORAX_PREVIEW.seed({ email: DEMO_EMAIL, name: st.user.name, data: st, password: 'UmaSenha2026' }); });
  await page.click('.lp-actions [data-v="login"]'); await page.waitForSelector(MARK.login);
  eq(await page.evaluate(() => PAGES.root()), BASE + '/', 'on /entrar, the emails and Google send the person back to the root');
  await page.fill('#au-email', 'demo@example.com'); await page.fill('#au-pass', 'UmaSenha2026'); await page.click('[data-a="auth-login"]'); await page.waitForFunction(() => !!UI.session);
  eq([await at(page), await page.title()], ['/#dashboard', 'Dorax Finance'], 'logged in from /entrar: the app, at the root');
  await page.evaluate(() => navigate('plan')); eq(await at(page), '/#plan', 'the app\'s screens stay after the "#"');
  await page.goBack(); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [!!UI.session, location.pathname, document.getElementById('public').hidden]), [true, '/', true], 'Back: the app stays, the login does not come back');
  await page.evaluate(() => A.logout()); await page.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing');
  eq([await at(page), await page.title()], ['/', TITLE.landing], 'logged out: the home page, at its address');
  // creating an account: "check your email" is a moment of that page, and the link in the email leads to the root
  await page.goto(BASE + '/criar-conta'); await started(page);
  await page.fill('#au-name', 'Caio'); await page.fill('#au-email', 'caio@example.org'); await page.fill('#au-pass', 'CaioSenha2026'); await page.check('#au-accept'); await page.click('[data-a="auth-signup"]');
  await page.waitForFunction(() => UI.pub.screen === 'sent'); eq(await at(page), '/criar-conta', '"confirm your email" keeps the address it happened on');
  const mail = await page.evaluate(() => DORAX_PREVIEW.outbox().filter(x => x.type === 'signup').pop());
  await page.goto(mail.link); await started(page); await page.waitForFunction(() => UI.pub.screen === 'onboard');
  eq(await page.evaluate(() => [location.pathname, /access_token/.test(location.href)]), ['/', false], 'the link in the email: the first-time setup, at the root, with a clean address');
  await page.evaluate(() => SERVER.signOut()); await page.waitForFunction(() => !WHO && UI.pub.screen === 'landing');

  // ---------- 6. logged in, opening a page's address ----------
  await page.goto(BASE + '/entrar'); await started(page); await page.fill('#au-email', 'demo@example.com'); await page.fill('#au-pass', 'UmaSenha2026'); await page.click('[data-a="auth-login"]'); await page.waitForFunction(() => !!UI.session);
  await page.goto(BASE + '/privacidade'); await page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session); await page.waitForSelector('.drawer .legal-body');
  eq([await page.evaluate(() => location.pathname), await page.evaluate(() => UI.drawer && UI.drawer.doc)], ['/', 'privacy'], 'logged in, /privacidade: the app, with the privacy policy in its side panel');
  await page.goto(BASE + '/entrar'); await page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session);
  eq(await page.evaluate(() => [location.pathname, UI.route, !UI.drawer]), ['/', 'dashboard', true], 'logged in, /entrar: the app, nothing else');
  eq(errors, [], 'served over http: no error in the console'); await ctx.close();

  // ---------- 7. opened from disk: no addresses, the pages as before ----------
  const disk = await open({ browser, lang: 'en' });
  eq(await disk.page.evaluate(() => [PAGES.on, PAGES.href('login'), PAGES.root() === location.origin + location.pathname]), [false, '#', true], 'from disk: no addresses');
  const before = await disk.page.evaluate(() => location.href);
  await disk.page.click('.lp-actions [data-v="login"]'); await disk.page.waitForSelector(MARK.login);
  await disk.page.click('.auth-alt [data-v="signup"]'); await disk.page.waitForSelector(MARK.signup);
  await disk.page.click('.accept [data-v="privacy"]'); await disk.page.waitForSelector(MARK.privacy);
  await disk.page.click('.auth-back'); await disk.page.waitForSelector(MARK.signup);
  eq([await disk.page.evaluate(() => location.href), await disk.page.title()], [before, TITLE.signup], 'from disk: the links change the page, the address stays, the title follows');
  eq(disk.errors, [], 'from disk: no error in the console');
  await browser.close(); web.close();
  done('qc-pages');
})().catch(e => { console.error(e); process.exit(1); });
