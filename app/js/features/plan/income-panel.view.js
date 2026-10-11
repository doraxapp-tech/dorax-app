/* Dorax Finance — Plan: the income of the month. */
// ---------- Income panel: the payments of one month and where each one goes ----------
const payTo = () => [['fixed', t('Fixed costs')], ['savings', t('Goals')]];
function incomePanel(ym) {
  if (isPhone()) return phoneIncome(ym);      // a phone: rows to tap, each opening to be edited (features/phone/phone.plan.js)
  return `<section class="card"><div class="card-h"><h2>${t('Income, {month}', { month: fmt.month(ym) })}</h2>${info(t('What you expect to receive this month and where each payment goes: to the fixed costs or to your goals. Change an amount to try a scenario; the plan recalculates. If you are paid twice a month, a payment before day 16 counts as the first and one after it as the second.'))}</div>
    ${incomeBody(ym)}</section>`;
}
/** The payments themselves: what each one is, how much, where it goes, its day. In the card on a phone's page; on a computer, a panel one click away
    (features/plan/plan-desk.view.js: "the salary is not touched much, it can be a pop-up", owner, 2026-10-11). */
function incomeBody(ym) {
  const year = +ym.slice(0, 4), m = +ym.slice(5) - 1, rows = payRows(B(), year);
  return `<div class="card-b stack" style="gap:14px">
      <div class="payrows">${rows.map(r => `<div class="payrow"><div class="field"><label for="pn-${r.id}">${t('Payment')}</label><input type="text" id="pn-${r.id}" value="${esc(r.name)}" data-c="pay-name" data-id="${r.id}" data-y="${year}"></div>
        <div class="field"><label for="pv-${r.id}">${tcur('Amount (R$)')}</label><input type="text" inputmode="decimal" class="num" id="pv-${r.id}" value="${plain(r.values[m])}" data-c="pay-cell" data-id="${r.id}" data-y="${year}" data-m="${m}"></div>
        <div class="field"><label for="pt-${r.id}">${t('Goes to')}</label><select id="pt-${r.id}" data-c="pay-to" data-id="${r.id}" data-y="${year}">${options(payTo(), r.to)}</select></div>
        <div class="field pay-day"><label for="pd-${r.id}">${t('Pay day')}</label><select id="pd-${r.id}" data-c="pay-day" data-id="${r.id}" data-y="${year}">${options(payDayOptions(), r.day ? String(r.day) : '')}</select></div>
        <button class="iconbtn" data-a="remove-pay" data-id="${r.id}" data-y="${year}" aria-label="${t('Remove')} ${esc(r.name)}">${icon('x')}</button></div>`).join('') || `<div class="empty">${t('No income planned for this year yet.')}</div>`}</div>
      ${rows.length ? `<p class="note" id="pay-day-note">${t('Pay day is optional. With one, Dorax asks on that day whether to record the payment, with its amount already filled in. It never records it by itself.')}</p>` : ''}
      <div class="row"><button class="btn sm" data-a="pay-copy" data-ym="${ym}">${t('Use these amounts for the following months')}</button><button class="btn sm ghost" data-a="add-pay" data-y="${year}">${icon('plus')}${t('Add income')}</button></div>
    </div>`;
}
