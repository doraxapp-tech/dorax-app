// QC of how a bank is shown next to an account: its colour and letters, or its own logo when the file is in app/assets/banks/.
// The logos themselves are not part of the app's code and not of these tests: where a "logo" is needed, a plain test picture is used.
const { open, ok, eq, done, TARGET } = require('./pw.js');
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), banksTool = require('../tools/build-banks.js');
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const PICTURE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#888"/><circle cx="5" cy="5" r="3" fill="#eee"/></svg>';

(async () => {
  // ---- the list of banks, their colours, and the tool that lists the logo files
  const box = { esc: s => s }; vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app/js/data/defaults.js'), 'utf8').match(/^const BANKS = .*$/m)[0] + '\n' + fs.readFileSync(path.join(ROOT, 'app/js/ui/bank-mark.js'), 'utf8') + '\n;this.out = { BANKS, BANK_MARKS };', box);
  const { BANKS, BANK_MARKS } = box.out, marks = Object.values(BANK_MARKS);
  eq(Object.keys(BANK_MARKS).sort(), BANKS.slice().sort(), 'every bank the account form offers has a colour and letters, and no other');
  eq([new Set(marks.map(m => m.id)).size, marks.every(m => /^[a-z0-9-]+$/.test(m.id)), marks.every(m => /^[A-Z0-9]{2}$/.test(m.short)), new Set(marks.map(m => m.short)).size], [marks.length, true, true, marks.length], 'each has its own file name (lower case, no accents) and its own two letters');
  eq(marks.filter(m => !/^#[0-9A-F]{6}$/i.test(m.bg) || !/^#[0-9A-F]{6}$/i.test(m.ink) || contrast(m.bg, m.ink) < 4.5).map(m => m.id), [], 'the letters read well on every colour (contrast of at least 4.5 to 1)');
  const src = fs.readFileSync(path.join(ROOT, 'app/js/ui/bank-mark.js'), 'utf8');
  ok(!/<svg|<path|data:image|base64/i.test(src), 'no logo is drawn or carried in the code: a logo is only ever a file in assets/banks/');
  eq(spawnSync(process.execPath, [path.join(ROOT, 'tools/build-banks.js'), '--check'], { encoding: 'utf8' }).status, 0, 'the list of logos (js/data/bank-logos.js) matches what is in app/assets/banks/');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dorax-banks-'));
  for (const f of ['nubank.png', 'nubank.svg', 'Itau.JPEG', 'c6-bank.webp', 'santander.gif', 'my-bank.svg', 'README.md', 'wise']) fs.writeFileSync(path.join(tmp, f), PICTURE);
  const s = banksTool.scan(tmp);
  eq([s.found, s.strangers.sort()], [{ 'c6-bank': 'c6-bank.webp', itau: 'Itau.JPEG', nubank: 'nubank.svg' }, ['my-bank.svg', 'santander.gif', 'wise']], 'a file counts when it is named after a bank and is a picture of a kind browsers show; with two for one bank the SVG wins; the rest is reported');
  ok(/^const BANK_LOGOS = \{\s+"c6-bank": "assets\/banks\/c6-bank\.webp",\s+"itau": "assets\/banks\/Itau\.JPEG",\s+"nubank": "assets\/banks\/nubank\.svg"\s+\};$/m.test(banksTool.fileText(s.found)), 'the list names each file where the site serves it');
  const inl = banksTool.inlineText(tmp); ok(/"nubank":"data:image\/svg\+xml;base64,/.test(inl) && /"itau":"data:image\/jpeg;base64,/.test(inl), 'for the one-file preview the pictures are written into the list itself');
  fs.rmSync(tmp, { recursive: true, force: true });

  // ---- the accounts page
  const tag = TARGET + ': ';
  for (const [lang, viewport, theme] of [['pt', { width: 1440, height: 900 }, 'dark'], ['en', { width: 390, height: 800 }, 'light']]) {
    const o = await open({ lang, account: 'example', plan: true, viewport, mobile: viewport.width < 500, touch: viewport.width < 500 }), p = o.page, where = `${tag}${lang} ${viewport.width} ${theme}: `;
    await p.evaluate(theme => { if (theme === 'light') { S.settings.theme = 'light'; applyTheme && applyTheme(); }
      S.accounts.push({ id: 'qa-c6', name: 'Conta C6', institution: 'C6 Bank', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 0 }, { id: 'qa-other', name: 'Cooperativa', institution: 'Sicoob <b>', type: 'savings', currency: 'BRL', scope: 'personal', purpose: '', opening: 0 }, { id: 'qa-none', name: 'Carteira', institution: '', type: 'cash', currency: 'BRL', scope: 'personal', purpose: '', opening: 0 });
      window.__logos = { ...BANK_LOGOS }; for (const k of Object.keys(BANK_LOGOS)) delete BANK_LOGOS[k];        // first without any logo file: what every bank looks like until its file is added
      navigate('accounts'); }, theme).catch(async () => { await p.evaluate(() => { for (const k of Object.keys(BANK_LOGOS)) delete BANK_LOGOS[k]; navigate('accounts'); }); });
    await p.waitForSelector('.acct .inst');
    const read = () => p.evaluate(() => [...document.querySelectorAll('.acct')].map(c => { const i = c.querySelector('.inst'), cs = getComputedStyle(i), r = i.getBoundingClientRect(), img = i.querySelector('img');
      return { name: c.querySelector('b').innerText, cls: i.className, text: i.innerText.trim(), label: i.getAttribute('aria-label') || (img && img.alt) || null, bg: cs.backgroundColor, ink: cs.color, size: [Math.round(r.width), Math.round(r.height)], round: cs.borderRadius, img: img ? [img.naturalWidth > 0, Math.round(img.getBoundingClientRect().width)] : null }; }));
    let cards = await read(); const by = n => cards.find(c => c.name === n) || {}, nu = cards.find(c => c.label === 'Nubank') || {};
    ok(cards.length >= 4 && cards.every(c => c.size[0] === 36 && c.size[1] === 36 && c.round === '50%'), where + 'every account has a round badge of the same size', cards.map(c => c.size));
    const off = await p.evaluate(() => [...document.querySelectorAll('.acct .inst')].filter(i => i.innerText.trim()).map(i => { const r = document.createRange(); r.selectNodeContents(i); const t = r.getBoundingClientRect(), b = i.getBoundingClientRect(); return [Math.abs((t.top + t.bottom) / 2 - (b.top + b.bottom) / 2), Math.abs((t.left + t.right) / 2 - (b.left + b.right) / 2)]; }));
    ok(off.length >= 3 && off.every(([y, x]) => y <= 1.5 && x <= 1.5), where + 'the letters sit in the middle of every badge', off.map(o => o.map(Math.round)));
    eq([nu.cls, nu.text, nu.bg, nu.ink], ['inst bank', 'NU', 'rgb(130, 10, 209)', 'rgb(255, 255, 255)'], where + 'a Nubank account wears Nubank’s colour and letters, and says the bank’s name to a screen reader');
    eq([by('Conta C6').cls, by('Conta C6').text, by('Conta C6').label, by('Conta C6').bg], ['inst bank', 'C6', 'C6 Bank', 'rgb(36, 36, 36)'], where + 'so does a C6 Bank account');
    eq([by('Cooperativa').cls, by('Cooperativa').text, by('Cooperativa').label, by('Carteira').cls, by('Carteira').text, by('Carteira').label], ['inst', 'SI', 'Sicoob <b>', 'inst', '', null], where + 'a bank the app does not know keeps the plain two letters (its name shown as text, never as markup); no bank, no letters');
    eq(new Set(cards.filter(c => c.cls === 'inst bank').map(c => c.bg)).size, new Set(cards.filter(c => c.cls === 'inst bank').map(c => c.label)).size, where + 'different banks have different colours');
    // a logo file is there for one bank: that bank shows the picture, the others keep their colour
    await p.evaluate(pic => { BANK_LOGOS.nubank = 'data:image/svg+xml,' + encodeURIComponent(pic); render(); }, PICTURE);
    await p.waitForFunction(() => { const i = document.querySelector('.acct .inst.pic img'); return i && i.complete && i.naturalWidth > 0; });
    cards = await read(); const nu2 = cards.find(c => c.label === 'Nubank') || {};
    eq([nu2.cls, nu2.text, nu2.img, cards.filter(c => c.cls === 'inst pic').length === cards.filter(c => c.label === 'Nubank').length, (cards.find(c => c.name === 'Conta C6') || {}).cls], ['inst pic', '', [true, 36], true, 'inst bank'], where + 'with a logo file for Nubank, its accounts show the picture, named for screen readers; the other banks keep their colour');
    // and with the logo files that really are in app/assets/banks/ (none, some or all of them): each one loads, whole, in its badge
    const real = await p.evaluate(async () => { for (const k of Object.keys(BANK_LOGOS)) delete BANK_LOGOS[k]; Object.assign(BANK_LOGOS, window.__logos || {}); render();
      const imgs = [...document.querySelectorAll('.acct .inst.pic img')]; await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
      return { listed: Object.keys(BANK_LOGOS).length, shown: imgs.length, broken: imgs.filter(i => !i.naturalWidth).map(i => i.alt), small: imgs.filter(i => i.naturalWidth && Math.min(i.naturalWidth, i.naturalHeight) < 144).map(i => i.alt), unnamed: imgs.filter(i => !i.alt).length }; });
    eq([real.broken, real.small, real.unnamed, real.listed === 0 || real.shown > 0], [[], [], 0, true], where + `the ${real.listed} logo file(s) in the folder load in their badges, are big enough to stay sharp, and name their bank`);
    eq(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, true, where + 'nothing runs off the side');
    eq(o.errors, [], where + 'no console errors'); await o.browser.close();
  }
  done('qc-banks');
})().catch(e => { console.error('qc-banks: Error', e); process.exit(1); });
