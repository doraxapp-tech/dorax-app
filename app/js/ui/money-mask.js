/* Dorax Finance — money typed from the cents (owner, 2026-10-11: "in the number fields for money, don't make me type the point or the comma; let
   them appear by themselves while I type, sometimes I don't remember the format"; chosen with him: from the cents, as in Nubank or a PIX).
   Inside the app, every field that takes an amount (inputmode="decimal") fills from the right and writes its own marks in the number format
   chosen in Settings: 1 → 0,01 · 15 → 0,15 · 1500 → 15,00 · 150000 → 1.500,00. The person never types a point or a comma, and the cents always show.
     - A field that already holds an amount ("1.800", shown without its cents) shows it whole as it is focused ("1.800,00"), so the next digit
       goes after its cents and not after the 8.
     - What arrives in one piece (pasted, dropped, filled in) is read as an amount first: a pasted "R$ 1.234,56" or "1.500" keeps its value.
     - A minus typed anywhere makes it negative (a card's balance owed, a refund); deleting it makes it positive again.
     - The caret keeps the same digits to its right, so a digit typed in the middle lands where it was typed.
   A field that is not money (a rate in %) says data-nomask. The pages before login keep their own fields. Letters were already refused by
   ui/input.js, which runs first; the app's own handlers, which run after this one, read the masked value with typedAmount. */
const MASK_FIELD = 'input[inputmode="decimal"]:not([data-nomask])';
const maskOn = el => !!(el && el.matches && el.matches(MASK_FIELD) && document.documentElement.classList.contains('in-app'));
const maskShow = cents => fmt.money(Math.abs(cents), null, { bare: true });
const maskDigits = v => String(v).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);      // up to 13 digits of reais and the 2 of the cents
/** The position in the masked text that has `right` digits after it. */
function maskCaret(text, right) {
  let seen = 0;
  for (let i = text.length; i > 0; i--) { if (seen === right) return i; if (/\d/.test(text[i - 1])) seen++; }
  return seen === right ? 0 : text.length;
}
document.addEventListener('focusin', e => {
  const el = e.target; if (!maskOn(el)) return;
  setTimeout(() => {      // after the focus has settled: a field focused by Tab, or selected and then focused, has its selection by then
    if (document.activeElement !== el || !el.value.trim()) return;
    const c = typedAmount(el.value); if (c === null) return;
    const v = (c < 0 ? '-' : '') + maskShow(c); if (v === el.value) return;
    const all = el.selectionStart === 0 && el.selectionEnd === el.value.length && el.value.length > 0;      // the whole text selected stays selected
    el.value = v;
    try { if (all) el.setSelectionRange(0, v.length); else el.setSelectionRange(v.length, v.length); } catch (err) { /* a field that keeps no caret */ }
  }, 0);
}, true);
document.addEventListener('input', e => {
  const el = e.target; if (!maskOn(el)) return;
  const v = el.value, at = el.selectionStart;
  const whole = (e.data && e.data.length > 1) || /^(insertFromPaste|insertFromDrop|insertReplacementText)$/.test(e.inputType || '') || !e.inputType;
  let cents = null, neg = /[-\u2212]/.test(v);
  if (whole) {      // what arrives in one piece (pasted, dropped, filled in) is the new amount, read as an amount first: "1.500" is 1.500,00
    const dt = e.dataTransfer && e.dataTransfer.getData ? e.dataTransfer.getData('text/plain') : '';
    const piece = numberOnly(e.data != null && e.data.length > 1 ? e.data : dt || v, true);
    neg = /^-/.test(piece);
    const c = typedAmount(piece); if (c !== null) cents = Math.abs(c);
    else { const d = maskDigits(piece); if (!d) { const empty = neg ? '-' : ''; if (v !== empty) el.value = empty; return; } cents = Number(d); }
  } else {      // typed digit by digit: from the cents
    const d = maskDigits(v); if (!d) { const empty = neg ? '-' : ''; if (v !== empty) el.value = empty; return; } cents = Number(d);
  }
  const out = (neg ? '-' : '') + maskShow(cents); if (out === v) return;
  const right = whole || at === null ? 0 : v.slice(at).replace(/\D/g, '').length;
  el.value = out;
  try { const p = maskCaret(out, right); el.setSelectionRange(p, p); } catch (err) { /* a field that keeps no caret */ }
}, true);
