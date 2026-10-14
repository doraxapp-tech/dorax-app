/* Dorax Finance — a new transaction from the summary "Bosque", with its own keypad (owner, 2026-10-12: "haz estos dos updates que me habías enviado,
   quiero ver cómo se ven en vivo", the canvas's "Nuevo gasto · Bosque"). The form is the same one (features/transactions/transaction-form.view.js:
   txDrawer, which asks bosqueOn() and marks the drawer d.pad); here, its foot: the amount typed on a keypad of large keys (1 to 9, the decimal mark,
   0, erase), always in sight, and "Save" as a deep green bar with the lime check and the amount on its right. The amount is shown on a button
   (v202; it was a read-only field) that the keypad writes into. The sentence to write it in one go is not offered here; the other screens keep it.
   Styles: css/look/look-land-panels.css. */

/** The decimal mark of the person's figures: a comma in Brazil, a point otherwise (ui/format.js). */
const bqSep = () => S.settings.locale === 'pt-BR' ? ',' : '.';
/** The amount, with the keypad: not a field but a button that shows what the keys typed (v202, owner, 2026-10-12: "sigue el glitch con el input
    del importe en registrar transacción: cuando abre el menú y toco el field todo se vuelve loco, toco en un lado y se activa otra cosa"). A field,
    even read-only, takes the focus on an iPhone: the browser then moves the page to show it, or keeps the keyboard of the field before it while
    the keypad comes up, and what is drawn is no longer where a finger lands. A button takes no focus on a tap and moves nothing. Its line
    after the figure shows where the keys write while the keypad is up. */
const bqAmtPh = () => `0${bqSep()}00`;
const bqAmtIn = s => s ? esc(s) : `<span class="bq-amt-ph">${bqAmtPh()}</span>`;
const bqAmt = d => `<button type="button" id="d-amount" class="num bq-amt" data-a="tx-pad" value="${esc(d.draft.amountText || '')}" aria-labelledby="d-amount-l d-amount" aria-required="true"${d.invalid === 'd-amount' ? ' aria-invalid="true"' : ''}>${bqAmtIn(d.draft.amountText)}</button>`;
/** The amount as it will be saved, beside the button's words; nothing until something is typed (v222). */
const bqTxAmt = d => { const x = d.draft, a = acct(x.accountId), v = Math.abs(typedAmount(x.amountText || '') || 0); return v ? fmt.money(v, (a && a.currency) || CUR) : ''; };
/** The save button's words (v222, owner, 2026-10-14: "el botón de guardar debería tener un nombre diferente dependiendo si es un gasto, ingreso o
    transferencia"): what it records, in the words of the side in use; an edit saves its changes. */
const txSaveWord = d => { if (!d.isNew) return t('Save changes'); const co = UI.space === 'business';
  return { expense: co ? t('Record cost') : t('Record expense'), income: co ? t('Record money in') : t('Record income'), transfer: t('Record transfer') }[d.draft.type] || t('Save'); };
function bqTxFoot(d) {
  const key = (v, label, aria) => `<button type="button" class="bq-key${v === 'del' || v === 'sep' ? ' soft' : ''}" data-a="tx-key" data-v="${v}"${aria ? ` aria-label="${esc(aria)}"` : ''}>${label}</button>`;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => key(n, n)).join('') + key('sep', bqSep(), t('Decimal mark')) + key('0', '0')
    + key('del', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/></svg>`, t('Erase'));
  return `<footer class="bq-tx-foot${bqPadCls(d)}" id="bq-tx-foot"${bqPadAt(d)}><div class="bq-pad-wrap"><div class="bq-pad-in"><div class="bq-pad" id="bq-pad" role="group" aria-label="${esc(t('Amount'))}" aria-controls="d-amount">${keys}</div></div></div>
    <button class="btn primary bq-save" data-a="save-tx"><span class="bq-save-ico" aria-hidden="true">${icon('check')}</span><span class="bq-save-t">${txSaveWord(d)}</span><span class="bq-save-amt num" id="bq-save-amt">${bqTxAmt(d)}</span></button></footer>`;      // v222: a plain button (owner: "parece un botón para deslizar"): its words and the amount; the check shows only once it is saved
}

/* ---------- the keypad, put away and back (v197, owner, 2026-10-12: "el teclado numérico sigue visible en agregar transacción, necesito esconderlo
   para poder ver mejor los otros fields") ----------
   It is up when the panel opens: the amount comes first. It goes down with the round button on the amount, when another field is touched (what it
   was, a group, the account, the date, More options) or when the form is dragged to see more; it comes back when the amount is touched. Down, the
   panel's foot is "Save" alone. It folds and unfolds in 260 ms; a drawing of the panel during that time goes on from where it was. */
const BQ_PAD_MS = 300;
const bqPadAge = d => d.padAt ? performance.now() - d.padAt : Infinity;
const bqPadCls = d => (d.padOff ? ' off' : '') + (bqPadAge(d) < BQ_PAD_MS ? ' moving' : '');
const bqPadAt = d => bqPadAge(d) < BQ_PAD_MS ? ` style="--pad-at:-${Math.round(bqPadAge(d))}ms"` : '';
/** The round button on the amount: puts the keypad away, or brings it back. */
const bqPadBtn = d => `<button type="button" class="bq-pad-btn" id="bq-pad-btn" data-a="tx-pad" aria-controls="bq-pad" aria-expanded="${!d.padOff}" aria-label="${esc(d.padOff ? t('Show keypad') : t('Hide keypad'))}" title="${esc(d.padOff ? t('Show keypad') : t('Hide keypad'))}">${icon(d.padOff ? 'keypad' : 'down')}</button>`;
/** Up (on) or down: the state is kept on the panel, and the foot on screen folds or unfolds without the panel being drawn again. */
function bqPadSet(on) {
  const d = UI.drawer; if (!d || d.kind !== 'tx' || !d.pad || !d.padOff === on) return;
  d.padOff = !on; d.padAt = reducedMotion() ? 0 : performance.now();
  const f = $('bq-tx-foot'); if (f) { f.classList.toggle('off', !on); f.classList.toggle('moving', !!d.padAt); f.style.setProperty('--pad-at', '0ms'); }
  const box = document.querySelector('#overlay .bq-tx .tx-amount'); if (box) box.classList.toggle('typing', on);
  const b = $('bq-pad-btn'); if (b) b.outerHTML = bqPadBtn(d);
  if (on) { const body = document.querySelector('#overlay .bq-tx'), amt = document.querySelector('#overlay .bq-tx .tx-amount'); if (body && amt && amt.offsetTop < body.scrollTop) body.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); }      // back up: the amount it types into in sight
}
const bqPadForm = el => UI.drawer && UI.drawer.pad && el && el.closest && el.closest('#overlay .bq-tx') && !el.closest('.tx-kind');
/** A field being written in (what it was, a note): its keyboard is up. */
const bqTyping = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && !a.readOnly && !/^(button|checkbox|radio|range)$/.test(a.type || '') ? a : null; };
/** After the phone's keyboard has gone: the field written in lets go of the focus (its keyboard goes down) and what was asked waits until the
    screen is whole again (at most half a second), so the keypad does not come up while the keyboard is still going down: the two moving at once
    left the panel where a finger did not find it. */
function bqAfterKeyboard(fn) {
  const a = bqTyping(); if (a) a.blur();
  const v = window.visualViewport, up = () => !!v && innerHeight - v.height > 120;
  if (!up()) return fn();      // (a phone whose buttons take the focus has already let the field go: its keyboard may still be going down)
  let done = false; const go = () => { if (done) return; done = true; v.removeEventListener('resize', on); fn(); };
  const on = () => { if (!up()) setTimeout(go, 60); };
  v.addEventListener('resize', on); setTimeout(go, 500);
}
// another field touched or the form dragged: the keypad goes down; the amount touched, or pointed at by a refusal to save, brings it up. (The
// amount getting the focus back when the panel is drawn again does not: on an iPhone a tapped button leaves the focus where it was.)
document.addEventListener('focusin', e => { const el = e.target; if (!bqPadForm(el)) return; if (el.id === 'd-amount') { if (UI.drawer.invalid === 'd-amount') bqPadSet(true); return; } if (el.matches('input, select, textarea')) bqPadSet(false); });
document.addEventListener('click', e => {
  const el = e.target; if (!bqPadForm(el)) return;
  // a button, a group or the like tapped while a field is being written in: the field lets go (an iPhone keeps a field's focus, and its keyboard
  // up, when a button is tapped), as an app does when its form is touched elsewhere
  const a = bqTyping(); if (a && a !== el && !el.closest('input, textarea, select, label, .bq-key')) a.blur();
  if (el.closest('.tx-amount')) return;
  if (el.closest('button, select, input, textarea, a, label, [data-a]')) bqPadSet(false);
}, true);
// with a keyboard of its own (a narrow window on a computer, a tablet's keyboard): its digits, the decimal mark and erase type into the amount
document.addEventListener('keydown', e => {
  const d = UI.drawer; if (!d || d.kind !== 'tx' || !d.pad || d.padOff || UI.modal || e.ctrlKey || e.metaKey || e.altKey || bqTyping() || (e.target && e.target.tagName === 'SELECT')) return;
  const k = e.key, v = /^[0-9]$/.test(k) ? k : k === ',' || k === '.' ? 'sep' : k === 'Backspace' ? 'del' : null; if (!v) return;
  e.preventDefault(); A['tx-key']({ v });
});
document.addEventListener('touchmove', e => { if (bqPadForm(e.target) && !UI.drawer.padOff) bqPadSet(false); }, { passive: true });

const BOSQUE_TX_ACTIONS = {
  /** The round button on the amount, and the amount itself: the keypad down or up. */
  'tx-pad'(ds, el) { const d = UI.drawer; if (!d || !d.pad) return; const on = el && el.id === 'd-amount' ? true : !!d.padOff; bqAfterKeyboard(() => { bqPadSet(on); const b = $('bq-pad-btn'); if (b && el && el.id === 'bq-pad-btn') b.focus({ preventScroll: true }); }); },
  /** One key of the keypad: a digit, the decimal mark (once, two digits after it at most) or erase. The field, the limit's line and the bar follow. */
  'tx-key'(ds) {
    const d = UI.drawer; if (!d || d.kind !== 'tx' || !d.draft) return;
    // a field still being written (what it was, a note): the phone's keyboard goes, so the keys are not under it (an iPhone keeps a field's focus
    // when a button is tapped)
    const a = document.activeElement; if (a && a.id !== 'd-amount' && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && !a.readOnly) a.blur();
    const x = d.draft, sep = bqSep(); let s = String(x.amountText || '');
    if (ds.v === 'del') s = s.slice(0, -1);
    else if (ds.v === 'sep') { if (!s.includes(sep)) s = (s || '0') + sep; }
    else { const [whole, cents] = s.split(sep); if (cents !== undefined && cents.length >= 2) return; if (cents === undefined && (whole || '').replace(/\D/g, '').length >= 9) return; s = (s === '0' ? '' : s) + ds.v; }
    x.amountText = s; d.error = null; if (d.invalid === 'd-amount') d.invalid = null; txTouched('amountText');
    const el = $('d-amount'); if (el) { el.value = s; if (el.tagName === 'BUTTON') el.innerHTML = bqAmtIn(s); el.removeAttribute('aria-invalid'); }
    const lim = $('tx-limit'); if (lim) lim.innerHTML = txLimitIn(d);
    const amt = $('bq-save-amt'); if (amt) amt.textContent = bqTxAmt(d);
  },
};
