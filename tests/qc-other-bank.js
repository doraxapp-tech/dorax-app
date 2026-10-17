// QC of v231 (owner, 2026-10-17):
//   1. "crea un logo para las cuentas de banco cuando el usuario elige Other… con los colores nuestros" (the review artifact "Logo para otro banco",
//      the option chosen: Bosque): an account at "Other" (stored in the language it was chosen in: Otra, Outra, Other) wears Dorax's bank in lime on
//      forest, on the accounts, the card and the bank list; a bank known only by its name, its initials in the same colours; a screen reader hears
//      "Otro banco"; a cash account keeps its wallet;
//   2. "este bloque desactiva el scroll: si el puntero se para sobre él no puedo hacer scroll hasta que salgo de encima del bloque, pasa en todos los
//      dispositivos": the home page's spreadsheet card was called "sheet", the app's bottom panel, and took its overscroll-behavior: contain. No part
//      of the website may keep the page from scrolling: nothing on it holds the scroll unless it scrolls itself.
const { open, ok, eq, done } = require('./pw.js');
const FOREST = 'rgb(22, 51, 0)', LIME = 'rgb(159, 209, 130)';

(async () => {
  // ---------- 1. the mark ----------
  const { browser, page: p, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  await p.evaluate(() => { S.user.greeted = true; S.accounts.push({ id: 'qo1', name: 'Cuenta Cooperativa', institution: 'Otra', type: 'checking', currency: 'BRL', scope: 'personal', opening: 125000 },
    { id: 'qo2', name: 'Ahorro Banco Local', institution: 'Banco Local', type: 'savings', currency: 'BRL', scope: 'personal', opening: 480000 }, { id: 'qo3', name: 'Efectivo', institution: '', type: 'cash', currency: 'BRL', scope: 'personal', opening: 5000 }); render(); navigate('accounts'); });
  await p.waitForTimeout(400);
  const mk = await p.evaluate(() => { const row = n => [...document.querySelectorAll('tr, li, .row')].filter(r => r.textContent.includes(n)).sort((a, b) => a.textContent.length - b.textContent.length)[0];
    const m = n => { const r = row(n), e = r && r.querySelector('.inst'); if (!e) return null; const cs = getComputedStyle(e); return { dx: e.classList.contains('dx'), bg: cs.backgroundColor, ink: cs.color, svg: !!e.querySelector('svg'), text: e.textContent.trim(), say: e.getAttribute('aria-label') }; };
    return { other: m('Cuenta Cooperativa'), named: m('Ahorro Banco Local'), cash: (row('Efectivo') || document).querySelector('.inst.dx') ? 'dx' : 'wallet' }; });
  eq([mk.other && mk.other.dx, mk.other && mk.other.bg, mk.other && mk.other.ink, mk.other && mk.other.svg, mk.other && mk.other.say], [true, FOREST, LIME, true, 'Otro banco'], '"Otra": Dorax’s bank, lime on forest, heard as "Otro banco"');
  eq([mk.named && mk.named.dx, mk.named && mk.named.bg, mk.named && mk.named.text, mk.named && mk.named.say], [true, FOREST, 'BL', 'Banco Local'], 'a bank known only by its name: its initials, in the same colours');
  eq(mk.cash, 'wallet', 'a cash account keeps its wallet');
  eq(await p.evaluate(() => ['Other', 'Otra', 'Outra'].map(w => /class="inst bank dx"/.test(bankMark(w)) && /<svg/.test(bankMark(w)))), [true, true, true], '"Other" in the three languages');
  await p.evaluate(() => A['card-view']({ id: 'qo1' })); await p.waitForTimeout(300);
  eq(await p.evaluate(() => { const c = document.querySelector('#overlay .ccard'); return [getComputedStyle(c).getPropertyValue('--cc').trim().toUpperCase(), !!c.querySelector('.cc-logo .inst.dx svg')]; }), ['#2D6800', true], 'its card: our forest (drawn at half its colour, as every card), with the mark');
  await p.evaluate(() => { A.close(); A['account-add']({}); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll('#a-inst option')].pop(); return o.textContent.trim() === t('Other') && !!o.querySelector('.bk-logo.dx svg'); }), 'the bank list: "Otra" last, with the mark');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- 2. the website never holds the scroll ----------
  for (const vp of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
    const { browser: b2, page: w, errors: e2 } = await open({ lang: 'es', viewport: vp });
    await w.waitForTimeout(600);
    const held = await w.evaluate(() => [...document.querySelectorAll('#public *')].filter(e => { const cs = getComputedStyle(e); if (cs.overscrollBehaviorY === 'auto' && cs.overscrollBehaviorX === 'auto') return false;
      const own = /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1 || /(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1; return !own; }).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.')));
    eq(held, [], `${vp.width} px: nothing on the home page keeps the page from scrolling`);
    eq(await w.evaluate(() => { const c = document.querySelector('.l2-bx.xls'), cs = getComputedStyle(c); return [!!c, document.querySelectorAll('#public .sheet, #public .drawer, #public .modal').length, cs.position, cs.zIndex]; }), [true, 0, 'relative', 'auto'], `${vp.width} px: the spreadsheet’s card is its own ("xls"), with none of the app’s panels’ names or rules`);
    eq(e2, [], 'no error in the console'); await b2.close();
  }
  done('qc-other-bank');
})().catch(e => { console.error('qc-other-bank: Error', e); process.exit(1); });
