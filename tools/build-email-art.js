/* Dorax Finance — the pictures of the emails (v229, supabase/functions/reminders/email.mjs): the site's own drawings (js/ui/art.js,
   css/components/art.css) and its logo, drawn as PNG files into app/assets/email/, because email programs do not draw SVG.
     dorax-finance.png        the logo with FINANCE under it, as the sign-in pages show it, on the sage (the top of every email)
     dorax-finance-dark.png   the same, light, on the footer's near black
     art/people/<name>.png    a person with its lime shadow and the thing at its corner, on the sage (the top of an email)
     art/<thing>.png          a thing on its mint circle, the corners clear (the lines on white, the top of an email)
     art/dark/<thing>.png     a thing for the forest band (mint line, deep circle)
     art/panel/<thing>.png    a thing on a white circle, for the deeper sage band
   The logos and the people carry their band's colour, so a mail program that darkens a page still shows them whole.
   Run: npm run email-art (needs Playwright, as the tests). A new picture: add its name below, run this, and use it in email.mjs or the messages. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const APP = path.join(__dirname, '..', 'app'), OUT = path.join(APP, 'assets', 'email'); fs.mkdirSync(OUT + '/art/people', { recursive: true });
const SAGE = '#F2F4EE';
// the people (on the sage page: drawn on it, so a mail program that darkens the page still shows them on their own light ground)
const PEOPLE = [['phone', 'bell-ringing'], ['win', 'fire'], ['hi', 'envelope-simple'], ['key', 'key']];
// the things (on their mint circle, the corners clear)
const DARK = ['bell-ringing', 'calendar-dots', 'hourglass-medium', 'bank', 'key', 'shield-check'], PANEL = ['coins', 'bell-ringing', 'flag-banner'];
const THINGS = ['bank', 'key', 'hourglass-medium', 'calendar-dots', 'receipt', 'list-checks', 'hand-coins', 'coins', 'piggy-bank', 'calendar-check', 'fire', 'gauge', 'currency-circle-dollar', 'flag-banner', 'file-text', 'chart-bar', 'bell-ringing', 'signpost', 'house', 'wallet', 'envelope-simple', 'arrows-left-right', 'shield-check'];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 2 });
  fs.writeFileSync(APP + '/__mk.html', `<html><head><style>${fs.readFileSync(APP + '/css/components/art.css', 'utf8')} body{margin:0;background:${SAGE}} #st{position:absolute;left:200px;top:200px;width:170px} #ob{position:absolute;left:600px;top:200px;width:120px}</style></head><body><div id="st"></div><div id="ob"></div></body></html>`); await p.goto('file://' + APP + '/__mk.html');
  await p.addScriptTag({ content: 'function landOn(){return true} function icon(){return ""}' });
  await p.addScriptTag({ path: path.join(APP, 'js', 'ui', 'art.js') });
  // the logo as the sign-in pages show it: the wordmark and FINANCE under it
  const lp = await b.newPage({ viewport: { width: 600, height: 300 }, deviceScaleFactor: 3 });
  const LOGO = (fs.readFileSync(APP + '/js/features/public/public.shared.js', 'utf8').match(/const LOGO = '([^']+)'/) || [])[1];
  await lp.setContent(`<html><body style="margin:0;background:${SAGE}"><div id="lk" style="display:inline-flex;flex-direction:column;align-items:center;gap:7px;padding:4px 6px;color:#0E0F0C;font-family:'Source Code Pro',ui-monospace,Menlo,monospace">${LOGO.replace('class="logo"', 'class="logo" style="display:block;height:30px;width:auto"').replace('class="ac"', 'class="ac" style="stroke:#9FD182"')}<small style="font-size:9.5px;letter-spacing:.32em;color:#5F625D;padding-left:.32em">FINANCE</small></div></body></html>`);
  await lp.locator('#lk').screenshot({ path: OUT + '/dorax-finance.png' });
  await lp.evaluate(() => { document.body.style.background = '#0E0F0C'; const k = document.getElementById('lk'); k.style.color = '#FFFFFF'; k.querySelector('small').style.color = '#959793'; });
  await lp.locator('#lk').screenshot({ path: OUT + '/dorax-finance-dark.png' });
  const lb = await lp.locator('#lk').boundingBox(); console.log('logo', Math.round(lb.width), Math.round(lb.height));
  for (const [who, thing] of PEOPLE) {
    await p.evaluate(([w, t]) => { document.getElementById('st').innerHTML = artFig(w, t, 'shadow').replace('loading="lazy"', ''); }, [who, thing]);
    await p.waitForFunction(() => { const i = document.querySelector('#st img'); return i && i.complete && i.naturalWidth > 0; });
    const box = await p.evaluate(() => { const r = [...document.querySelectorAll('#st img, #st .fig-bdg')].map(e => e.getBoundingClientRect()); const x = Math.min(...r.map(a => a.left)), y = Math.min(...r.map(a => a.top)), x2 = Math.max(...r.map(a => a.right)), y2 = Math.max(...r.map(a => a.bottom)); return { x, y, width: x2 - x, height: y2 - y }; });
    // trim what the picture leaves empty around the person: measured on the drawn pixels
    await p.screenshot({ path: OUT + '/art/people/' + who + '.png', clip: box });
    console.log(who, Math.round(box.width), Math.round(box.height));
  }
  await p.evaluate(() => { document.body.style.background = 'transparent'; });
  for (const name of THINGS) {
    await p.evaluate(n => { document.getElementById('ob').innerHTML = artObj(n); }, name);
    await p.locator('#ob svg').screenshot({ path: OUT + '/art/' + name + '.png', omitBackground: true });
  }
  fs.mkdirSync(OUT + '/art/dark', { recursive: true }); fs.mkdirSync(OUT + '/art/panel', { recursive: true });
  for (const [dir, list, cls] of [['dark', DARK, 'on-dark'], ['panel', PANEL, 'on-panel']]) for (const name of list) {
    await p.evaluate(([n, c]) => { document.getElementById('ob').innerHTML = artObj(n, c); }, [name, cls]);
    await p.locator('#ob svg').screenshot({ path: OUT + '/art/' + dir + '/' + name + '.png', omitBackground: true });
  }
  await b.close(); fs.unlinkSync(APP + '/__mk.html');
  console.log('email-art: ' + (PEOPLE.length + THINGS.length + DARK.length + PANEL.length + 2) + ' pictures -> ' + path.relative(process.cwd(), OUT));
})().catch(e => { console.error('build-email-art: ' + e.message); process.exit(1); });
