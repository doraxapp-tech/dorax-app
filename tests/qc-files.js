// QC of the separated app as it is delivered: the PDF and Excel readers are loaded only when such a file is chosen, and the app
// works both opened from disk and served by a web server (http), which is how it will be hosted.
// The test files are made here (an .xls through the app's own copy of SheetJS, a PDF written by hand), so nothing else is needed.
const { open, ok, eq, done, serve, seed, PAGE, TARGET } = require('./pw.js');
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dorax-files-'));
const ROWS = [['Data', 'Historico', 'Valor', 'Saldo'], ['02/09/2026', 'TED ENVIADA', '-1.000,00', '3.000,00'], ['18/09/2026', 'PAGAMENTO BOLETO AGUA', '-166,43', '2.833,57'], ['18/09/2026', 'PIX RECEBIDO', '1.500,00', '4.333,57'], ['30/09/2026', 'TARIFA MANUTENCAO', '-12,50', '4.321,07']];
const WANT = [['2026-09-02', -100000], ['2026-09-18', -16643], ['2026-09-18', 150000], ['2026-09-30', -1250]];
function makeXls() {
  const ctx = { console }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'vendor', 'xlsx.min.js'), 'utf8') + '\nthis.X = XLSX;', ctx);
  const X = ctx.X, wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['Banco Exemplo S.A.'], ['Extrato de conta corrente'], [], ...ROWS]), 'Extrato');
  const p = path.join(tmp, 'extrato.xls'); fs.writeFileSync(p, Buffer.from(X.write(wb, { bookType: 'biff8', type: 'array' }))); return p;
}
function makePdf() {
  const xs = [50, 130, 380, 470], text = ['BT /F1 12 Tf 50 780 Td (Banco Exemplo S.A. - Extrato de conta corrente) Tj ET'];
  ROWS.forEach((r, i) => r.forEach((c, k) => text.push(`BT /F1 10 Tf ${xs[k]} ${740 - i * 18} Td (${c.replace(/[()\\]/g, '\\$&')}) Tj ET`)));
  const stream = text.join('\n'), objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  let out = '%PDF-1.4\n'; const at = [];
  objs.forEach((o, i) => { at.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + at.map(a => String(a).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const p = path.join(tmp, 'extrato.pdf'); fs.writeFileSync(p, out, 'latin1'); return p;
}
(async () => {
  const xls = makeXls(), pdf = makePdf();
  const modes = TARGET === 'app' ? ['disk', 'http'] : ['disk'];
  for (const mode of modes) {
    const web = mode === 'http' ? await serve(path.dirname(PAGE)) : null, tag = `${TARGET}, ${mode}: `;
    const { browser, page, errors } = await open({ lang: 'en', plan: true, url: web ? web.url + '/' : undefined, server: { confirmEmail: false } });
    const failed = []; page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) failed.push(r.url()); }); page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
    await page.reload();
    eq(failed, [], tag + 'every file the page asks for is found');
    ok(await page.locator('.lp-actions').isVisible(), tag + 'the home page opens');
    eq(await page.evaluate(() => [typeof XLSX, typeof pdfjsLib, typeof pdfjsWorker]), ['undefined', 'undefined', 'undefined'], tag + 'the PDF and Excel readers are not loaded with the page');
    if (web) eq([...new Set(web.hits.filter(h => h.startsWith('/vendor/')))], ['/vendor/supabase.js'], tag + 'to open the app, only the server library is fetched from vendor/');
    if (web) ok(web.hits.includes('/config.js'), tag + 'the page asks for config.js (which Supabase project it talks to)');
    eq(await page.evaluate(() => !!document.querySelector('link[rel="manifest"]')), mode === 'http', tag + 'the manifest is linked only when served by a web server');
    if (web) {
      ok(['/css/base/tokens.css', '/js/core/dates.js', '/js/app/boot.js'].every(h => web.hits.includes(h)), tag + 'styles and scripts are separate requests', web.hits.length);
      eq(await page.evaluate(() => Promise.all(['assets/icons/favicon.svg', 'assets/icons/favicon-32.png', 'assets/icons/icon-180.png', 'manifest.webmanifest', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'].map(u => fetch(u).then(r => r.status)))), [200, 200, 200, 200, 200, 200], tag + 'the icons and the manifest are served');
    }
    // a real account, then a reload: the data is kept in both ways of opening
    await page.evaluate(() => A['pub-go']({ v: 'signup' }));
    await page.fill('#au-name', 'Lia'); await page.fill('#au-email', 'lia@example.org'); await page.fill('#au-pass', 'LiaSenha2026'); await page.check('#au-accept');
    await page.click('[data-a="auth-signup"]'); await page.waitForSelector('#ob-name'); await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await page.waitForFunction(() => !!UI.session);
    ok(await page.locator('.hello').isVisible(), tag + 'sign-up to dashboard');
    await page.evaluate(() => saveNow()); await page.reload(); await page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session);
    eq(await page.evaluate(() => S.user && S.user.name), 'Lia', tag + 'still logged in after a reload');
    await page.evaluate(() => A.logout()); await page.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing'); await seed(page, 'en');
    // the converter with an old Excel file, then a PDF
    const convert = async file => {
      await page.evaluate(() => { UI.conv = null; navigate('converter'); });
      await page.locator('[data-a="conv-start"]').first().click();
      await page.selectOption('#cv-acct', 'nu-pj').catch(() => {});
      await page.setInputFiles('#stmt-file', file);
      await page.waitForFunction(() => UI.conv && !UI.conv.busy && (UI.conv.csv || UI.conv.error || UI.conv.rows), null, { timeout: 20000 }).catch(() => {});
      await page.click('[data-a="conv-analyze"]', { timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(200);
      const acts = await page.evaluate(() => [...document.querySelectorAll('#view [data-a]')].filter(e => e.offsetParent !== null).map(e => e.dataset.a)), go = acts.find(a => /conv-(cols|columns|map)/.test(a) && !/back/.test(a));
      if (go) await page.locator(`#view [data-a="${go}"]`).last().click();
      await page.waitForTimeout(200);
      return page.evaluate(() => ({ rows: UI.conv && UI.conv.rows ? UI.conv.rows.map(r => [r.date, r.amount]) : null, error: UI.conv && UI.conv.error, closing: UI.conv && UI.conv.csv ? convRead(UI.conv).closing : null }));
    };
    let r = await convert(xls);
    eq([r.rows, r.closing], [WANT, 432107], tag + 'an old Excel file (.xls) is read: four movements and the closing balance');
    eq(await page.evaluate(() => [typeof XLSX, typeof pdfjsLib]), ['object', 'undefined'], tag + 'only the Excel reader was loaded for it');
    const libs = () => web.hits.filter(h => h.startsWith('/vendor/') && h !== '/vendor/supabase.js');
    if (web) eq(libs(), ['/vendor/xlsx.min.js'], tag + 'one request for a reader, made when the file was chosen');
    r = await convert(pdf);
    eq([r.rows, r.closing], [WANT, 432107], tag + 'a PDF statement is read: four movements and the closing balance');
    eq(await page.evaluate(() => typeof pdfjsLib), 'object', tag + 'the PDF reader was loaded for it');
    if (web) eq(libs().sort(), ['/vendor/pdf.min.js', '/vendor/pdf.worker.min.js', '/vendor/xlsx.min.js'], tag + 'the PDF reader came from vendor/, once');
    r = await convert(xls); eq(r.rows, WANT, tag + 'a second Excel file does not fetch the reader again');
    if (web) eq(web.hits.filter(h => h === '/vendor/xlsx.min.js').length, 1, tag + 'the reader is fetched once');
    eq(errors, [], tag + 'no console errors');
    await browser.close(); if (web) await web.close();
  }
  // the account emails (owner, 2026-10-05: "I want the logo to be visible, and a better email structure"): three files to paste into Supabase
  { const dir = path.join(__dirname, '..', 'supabase', 'email-templates'), root = path.join(__dirname, '..', 'app');
    const mails = ['confirm-signup', 'reset-password', 'change-email'].map(n => fs.readFileSync(path.join(dir, n + '.html'), 'utf8'));
    const notices = ['password-changed', 'email-changed'].map(n => fs.readFileSync(path.join(dir, n + '.html'), 'utf8'));
    const imgs = [...new Set([...mails, ...notices].flatMap(m => [...m.matchAll(/<img[^>]+src="([^"]+)"/g)].map(x => x[1])))], logo = imgs[0] ? path.join(root, new URL(imgs[0]).pathname) : '';
    eq([mails.every(m => (m.match(/\{\{ \.ConfirmationURL \}\}/g) || []).length === 3), mails.every(m => /\.Data\.lang "es"/.test(m) && /\.Data\.lang "en"/.test(m) && /\{\{ else \}\}/.test(m)), mails.every(m => !/<script|<link|<style|@import|url\(/i.test(m)), mails.every(m => /alt="Dorax Finance"/.test(m))],
      [true, true, true, true], 'emails: each of the three carries the link (button, address as a link and as text), the three languages with Portuguese as the fallback, the logo with its alt text, and no script, stylesheet or other outside file');
    eq([imgs.length, /^https:\/\/[^/]+\/assets\/email\/dorax-logo\.png$/.test(imgs[0] || ''), fs.existsSync(logo) && fs.readFileSync(logo).subarray(1, 4).toString() === 'PNG'], [1, true, true], 'emails: the only picture is the logo, a PNG the site itself serves from app/assets/email/');
    // the two security notices tell, they do not ask: no link to confirm, a way out if it was somebody else, and a button that only opens the site
    eq([notices.every(m => !/ConfirmationURL|\.Token/.test(m)), notices.every(m => (m.match(/href="\{\{ \.SiteURL \}\}"/g) || []).length === 1 && (m.match(/href=/g) || []).length === 1), notices.every(m => /\.Data\.lang "es"/.test(m) && /\.Data\.lang "en"/.test(m) && /alt="Dorax Finance"/.test(m) && !/<script|<link|<style|@import|url\(/i.test(m)), /\{\{ \.OldEmail \}\}/.test(notices[1]) && !/OldEmail|NewEmail/.test(notices[0])],
      [true, true, true, true], 'emails: "password changed" and "email changed" carry no confirmation link, one button that opens the site, the three languages and the logo; only the second names the old address');
    const subj = fs.readFileSync(path.join(dir, 'subjects.txt'), 'utf8').split('\n').filter(l => /subject:/.test(l));
    eq([subj.length, subj.every(l => /\.Data\.lang "es"/.test(l) && /\{\{ end \}\}\s*$/.test(l))], [5, true], 'emails: five subjects, each in the three languages'); }
  fs.rmSync(tmp, { recursive: true, force: true });
  done('qc-files');
})().catch(e => { console.error(e); process.exit(1); });
