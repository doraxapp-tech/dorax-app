/* Dorax Finance — a bill paid, answered by its receipt (v200, owner, 2026-10-12: "quiero pantallas de éxito para las acciones de pagar los gastos
   también. No tiene que ser celebración, pero la notificación de ahora es un pill que sale de encima de la pantalla, no me gusta; quiero una animación
   acorde").
   A payment marked or recorded on the summary's look (a fixed cost, a group of them, one with its amount typed, a card's invoice) is no longer said in
   the strip at the top of the screen: a receipt rises from the foot of the screen, as a "comprovante" does. Its check is drawn; what was paid, how
   much, from where and when; under a dashed cut, how the month's bills stand: a bar of the paid ones filling to the new count, and what is still to
   pay, or that every bill of the month is paid. "Undo" is on it, as it was on the strip; "Done", the screen behind it or Escape close it, and the panel
   it was paid from (the bell, a bill's details) comes back. Not a celebration: no forest, no confetti. The payment that pays the month's last bill has,
   in place of the check, the person who made it with the month's calendar (v214, js/ui/art.js). Styles: css/look/look-land-done.css. */

const pdOn = () => typeof landOn === 'function' && landOn();
/** The bills of a month: how many there are, how many are paid, what is still to pay. */
function pdBills(ym) { const rows = planProgress(B(), ym, BCUR(), B().today).filter(p => p.bill && p.planned > 0); return { n: rows.length, paid: rows.filter(p => p.spent > 0).length, left: sum(rows.map(p => p.toPay)) }; }
/** After a payment is recorded. r: { title, amount, from, date, ym, before: pdBills(ym) taken before it, undo: true when it can be undone, next: the panel to go back to }. */
function pdShow(r) {
  UI.paid = { ...r, after: pdBills(r.ym) }; UI.drawer = null; UI.sheet = 'paid';
  render(); pdPlay();
}
function pdSheet() {
  const r = UI.paid; if (!r) return '';
  const all = r.after.n > 0 && r.after.paid >= r.after.n, share = n => r.after.n ? Math.round(n * 100 / r.after.n) : 0;
  const month = r.after.n ? `<hr class="pd-cut">
      <div class="pd-month"><div class="pd-month-t"><span>${t('Bills of {month}', { month: fmt.month(r.ym) })}</span><b class="num">${t('{a} of {b} paid', { a: r.after.paid, b: r.after.n })}</b></div>
        <span class="pd-bar" aria-hidden="true"><i id="pd-fill" style="width:${share(r.after.paid)}%" data-from="${share(r.before.paid)}"></i></span>
        <p class="pd-left${all ? ' all' : ''}">${all ? `${icon('check')}${t('Every bill of the month is paid.')}` : t('{amount} still to pay this month.', { amount: `<b class="num">${fmt.money(r.after.left, BCUR())}</b>` })}</p></div>` : '';
  return `<div class="scrim" data-a="pd-done"></div><div class="sheet pd-sheet" role="dialog" aria-modal="true" aria-labelledby="pd-h" aria-describedby="pd-meta">
    <div class="pd-paper${all ? ' all' : ''}">${all ? `<span class="pd-fig" aria-hidden="true">${artFig('win', 'calendar-check', 'shadow')}</span>` : '<span class="pd-check" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30"/><path d="M19 33l9 9 18-20"/></svg></span>'}
      <h2 class="pd-h" id="pd-h">${esc(r.title)}</h2><p class="pd-amt num">${fmt.money(r.amount, BCUR())}</p><p class="pd-meta" id="pd-meta">${esc(r.from)} · ${fmt.date(r.date)}</p>${month}
      <div class="pd-acts"><button class="btn primary" data-a="pd-done">${t('Done')}</button>${r.undo ? `<button class="btn ghost" data-a="pd-undo">${t('Undo')}</button>` : ''}</div></div></div>`;
}
/** The receipt's moment: the check drawn as it lands, then the month's bar going from the paid ones before to the paid ones now. */
function pdPlay() {
  const el = document.querySelector('#overlay .pd-sheet'); if (!el) return;
  const done = el.querySelector('[data-a="pd-done"]'); if (done) done.focus({ preventScroll: true });
  if (reducedMotion() || !el.animate) return;
  const E = 'cubic-bezier(.16, 1, .3, 1)', c = el.querySelector('.pd-check circle'), p = el.querySelector('.pd-check path'), fill = $('pd-fill');
  if (c) c.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 360, delay: 200, easing: E, fill: 'backwards' });
  if (p) { const L = p.getTotalLength ? p.getTotalLength() : 40; p.style.strokeDasharray = L; p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 320, delay: 380, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'backwards' }); }
  if (fill) fill.animate([{ width: fill.dataset.from + '%' }, { width: fill.style.width }], { duration: 700, delay: 560, easing: E, fill: 'backwards' });
  el.querySelectorAll('.pd-h, .pd-amt, .pd-meta').forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 260 + i * 50, easing: E, fill: 'backwards' }));
}
const PAY_DONE_ACTIONS = {
  /** Done: the receipt goes down; the panel it was paid from comes back, if there was one. */
  'pd-done'() {
    const r = UI.paid; UI.paid = null; UI.sheet = false; UI.drawer = r && r.next || null;
    if (UI.drawer) UI.overlayOpen = false;      // the panel comes in again as a panel does
    renderOverlay();
  },
  /** Undo: the payment (or the payments) taken back, as the strip's "Undo" did; the receipt goes. */
  'pd-undo'() { A['undo-pay'](); A['pd-done'](); },
};
