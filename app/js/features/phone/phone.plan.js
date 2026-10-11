/* Dorax Finance — the month's payments on a phone (owner, 2026-10-08: "remove all the buttons from the 'Payments, October 2026' table, they are
   repetitive; move those actions to a window that opens after a tap on one of them. Leave only the bulk buttons like 'Mark 7 as paid'").
   A bill is a row to tap: its name, its amount and how it stands; the tap opens its details (lineViewDrawer, features/plan/plan.view.js), where
   "Mark as paid", "Record payment" and "Edit" are. Each group keeps its one button for all its fixed-amount bills. No pages: the whole month is
   one short list. The account, the kind of cost and the note about what "Mark as paid" records are in the details too.
   A computer keeps its table (payList). */
/** Whether a group of the month's payments is open: as the person left it, else only the first group. */
const plOpen = (id, first) => UI.plOpen && id in UI.plOpen ? !!UI.plOpen[id] : id === first;
function phonePayList(ym, prog) {
  const open = prog.filter(p => p.bill && !p.spent && p.planned), late = prog.filter(p => p.status === 'late');
  const rank = p => p.bill && !p.spent ? 0 : p.bill ? 2 : 1, key = p => p.dueDate || '9';
  const order = (a, b) => rank(a) - rank(b) || (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  const last = p => { const x = linePayments(B(), p, ym, BCUR())[0]; return x ? x.t.date : null; };
  // 2026-10-08 (owner: "leave the first category (Home) open; if there are more, close them and put a down arrow that says they open, so someone
  // with many does not scroll through the whole screen"): each group's name is a button that opens and closes its rows, an arrow at its left
  // pointing down while closed and up while open. The first group is open, the others closed, until the person opens or closes one (UI.plOpen,
  // kept while the app is open). A closed group still says, in amber, how many of its bills are late, and keeps its bulk button.
  const first = (B().categories.find(c => prog.some(p => p.categoryId === c.id)) || {}).id;
  let fk = 0;      // the rows just marked paid, in order: their wash runs down them (css/base/motion.css)
  const group = c => {
    const xs = prog.filter(p => p.categoryId === c.id).sort(order); if (!xs.length) return '';
    const quick = xs.filter(p => p.pay === 'fixed' && !p.spent && p.planned);      // the group's totals are not repeated here (owner, 2026-10-08): its name and its bulk button
    const on = plOpen(c.id, first), late = xs.filter(p => p.status === 'late').length;
    return `<div class="pl-grp${on ? ' on' : ''}"><button class="pl-tog" data-a="pl-fold" data-cat="${c.id}" data-o="${on ? 1 : 0}" aria-expanded="${on}" aria-controls="plg-${c.id}">${icon('down')}<span class="cat">${catGlyph(c, 'sm')}<b>${esc(c.name)}</b></span>${!on && late ? `<span class="chip warn"><i></i>${tn(late, '{n} late', '{n} late')}</span>` : ''}</button>
        ${quick.length > 1 ? `<button class="btn sm" data-a="group-pay-now" data-cat="${c.id}" data-ym="${ym}">${icon('check')}${t('Mark {n} as paid', { n: quick.length })}</button>` : ''}</div>
      <div class="pl-rows" id="plg-${c.id}"${on ? '' : ' hidden'}>${xs.map(p => `<button class="pl-row${p.bill && p.spent ? ' done' : ''}${flashed(p.id)}"${flashed(p.id) ? ` style="--k:${fk++}"` : ''} data-a="line-open" data-id="${p.id}" data-ym="${ym}"><span class="grow"><b>${esc(p.name)}</b><small class="num">${fmt.money(p.spent && p.spent !== p.planned ? p.spent : p.planned, BCUR(), { trim: true })}</small></span>${payChip(p, p.spent ? last(p) : null)}${icon('right')}</button>`).join('')}</div>`;
  };
  return `<section class="card" id="paylist"><div class="card-h"><h2>${t('Payments, {month}', { month: fmt.month(ym) })}</h2>${hint('planPayments')}${late.length ? `<span class="chip warn"><i></i>${tn(late.length, '{n} late', '{n} late')}</span>` : ''}${open.length ? `<span class="chip">${tn(open.length, '{n} to pay', '{n} to pay')}</span>` : `<span class="chip good"><i></i>${t('All bills paid')}</span>`}</div>
    ${dueMissing() ? `<div class="pl-due"><button class="btn sm" data-a="due-days">${icon('calendar')}${t('Due days')} <span class="count">${t('{n} missing', { n: dueMissing() })}</span></button></div>` : ''}
    <div class="pl-list">${B().categories.map(group).join('')}</div></section>`;
}

/* The top of Plan and its income, on a phone (owner, 2026-10-08, "yes" to: the four figures as in Goals, "Still to pay" large and the other
   three small; and the income as a short list that opens to be edited, instead of a form with a field for everything). */
/** "Still to pay" as wide as the screen with the large number, the other three as small figures in a row to swipe (the Goals pattern). */
function phonePlanTop(ym, pt, spent, toPay, net, netSay) {
  return `<section class="card g-total"><span class="label"><span>${t('Still to pay')}</span>${hint('planLeft')}</span><span class="value num">${fmt.money(toPay, BCUR())}</span></section>
  <section class="kpis g-mini" aria-label="${fmt.month(ym)}">
    ${statTile(t('Fixed costs, {month}', { month: fmt.month(ym, 'bare') }), fmt.money(pt.expenses, BCUR()), '', '')}
    ${statTile(t('Paid so far'), fmt.money(spent, BCUR()), '', '')}
    ${statTile(netSay || t('Income minus fixed costs'), `<span class="${net < 0 ? 'neg' : ''}">${fmt.money(net, BCUR())}</span>`, '', '')}</section>
  <div class="g-acts two" role="group" aria-label="${t('Payments')}">
    <button class="btn primary" data-a="pay-pick" data-v="mark" data-ym="${ym}">${icon('check')}${t('Pay bills')}</button>
    <button class="btn" data-a="pay-pick" data-v="record" data-ym="${ym}">${icon('plus')}${t('Record payment')}</button></div>`;
}
// 2026-10-08 (owner: "Plan on mobile: add the buttons 'Mark as paid' and 'Record payment' under the KPI cards; they work like the ones we added in
// Goals"; then: "rename 'Mark as paid' to 'Pay bills', I think it is better"): a button, then the cost it is for, chosen from a list. Pay bills
// lists the month's fixed bills with no payment yet and records each one's planned amount (with Undo, as the row's own button does); it always
// shows the list, so nothing is marked without seeing which. Record payment lists every cost of the month that can take one; with only one it goes
// straight to its panel, as Contribute does in Goals.
function payPickList(kind, ym) {
  const prog = planProgress(B(), ym, BCUR(), B().today).filter(p => p.planned > 0), key = p => p.dueDate || '9';
  const xs = kind === 'mark' ? prog.filter(p => p.pay === 'fixed' && !p.spent) : prog.filter(p => !(p.pay === 'fixed' && p.spent));
  return xs.sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : b.planned - a.planned);
}
function payPickSheet() {
  const { kind, ym } = UI.payPick || {}, mark = kind === 'mark', title = mark ? t('Which bill are you paying?') : t('Record a payment for which one?'), cat = id => (B().categories.find(c => c.id === id) || {}).name || '';
  return `<div class="scrim" data-a="close"></div><div class="sheet g-pick s-list" role="dialog" aria-label="${esc(title)}"><div class="grab" aria-hidden="true"></div><h2>${esc(title)}</h2>
    <div class="g-pick-list">${payPickList(kind, ym).map(p => `<button data-a="pay-pick-go" data-id="${p.id}" data-ym="${ym}" data-v="${kind}"><span class="grow"><b>${esc(p.name)}</b><small>${esc([cat(p.categoryId), p.dueDate ? fmt.date(p.dueDate) : ''].filter(Boolean).join(' · '))}</small></span><span class="num s-amt">${p.pay === 'fixed' ? '' : '≈ '}${fmt.money(p.planned, BCUR(), { trim: true })}</span>${icon(mark ? 'check' : 'right')}</button>`).join('')}</div></div>`;
}
/** The month's income as rows to tap: what it is called, where it goes and its day, and its amount. A tap opens the row to be edited. */
function phoneIncome(ym) {
  const year = +ym.slice(0, 4), m = +ym.slice(5) - 1, rows = payRows(B(), year), to = Object.fromEntries(payTo());
  return `<section class="card" id="income-list"><div class="card-h"><h2>${t('Income, {month}', { month: fmt.month(ym) })}</h2>${info(t('What you expect to receive this month and where each payment goes: to the fixed costs or to your goals. Change an amount to try a scenario; the plan recalculates. If you are paid twice a month, a payment before day 16 counts as the first and one after it as the second.'))}</div>
    <div class="pl-list">${rows.map(r => `<button class="pl-row" data-a="pay-row-open" data-id="${r.id}" data-y="${year}" data-ym="${ym}"><span class="grow"><b>${esc(r.name)}</b><small>${esc(to[r.to] || '')}${r.day ? ' · ' + t('Pay day') + ' ' + r.day : ''}</small></span><span class="num pl-amt">${fmt.money(r.values[m] || 0, BCUR(), { trim: true })}</span>${icon('right')}</button>`).join('') || `<div class="empty">${t('No income planned for this year yet.')}</div>`}</div>
    <div class="pl-foot"><button class="btn sm" data-a="add-pay" data-y="${year}" data-ym="${ym}">${icon('plus')}${t('Add income')}</button>${rows.length ? `<button class="btn sm ghost" data-a="pay-copy" data-ym="${ym}">${t('Use these amounts for the following months')}</button>` : ''}</div></section>`;
}
/** One income, to edit: the same fields as the computer's panel (so the same changes apply as they are typed), and the way to remove it. */
function payRowDrawer(d) {
  const r = (B().pay[d.y] || []).find(x => x.id === d.id); if (!r) return '<div class="body"></div>';
  const m = +d.ym.slice(5) - 1;
  return `<div class="body"><div class="form-grid">
      <div class="field full"><label for="pn-${r.id}">${t('Payment')}</label><input type="text" id="pn-${r.id}" value="${esc(r.name)}" data-c="pay-name" data-id="${r.id}" data-y="${d.y}"></div>
      <div class="field"><label for="pv-${r.id}">${tcur('Amount (R$)')} · ${fmt.month(d.ym, 'bare')}</label><input type="text" inputmode="decimal" class="num" id="pv-${r.id}" value="${plain(r.values[m])}" data-c="pay-cell" data-id="${r.id}" data-y="${d.y}" data-m="${m}"></div>
      <div class="field"><label for="pt-${r.id}">${t('Goes to')}</label><select id="pt-${r.id}" data-c="pay-to" data-id="${r.id}" data-y="${d.y}">${options(payTo(), r.to)}</select></div>
      <div class="field"><label for="pd-${r.id}">${t('Pay day')}</label><select id="pd-${r.id}" data-c="pay-day" data-id="${r.id}" data-y="${d.y}">${options(payDayOptions(), r.day ? String(r.day) : '')}</select></div></div>
    <p class="note">${t('Pay day is optional. With one, Dorax asks on that day whether to record the payment, with its amount already filled in. It never records it by itself.')}</p></div>
  <footer><button class="btn primary" data-a="close">${t('Done')}</button><button class="btn sm ghost danger spacer" data-a="remove-pay" data-id="${r.id}" data-y="${d.y}">${t('Remove income')}</button></footer>`;
}
const PHONE_PLAN_ACTIONS = {
  /** A group's name: its rows open or close; the focus stays on it, and the rows that open come in softly. */
  'pl-fold'(ds) {
    const open = ds.o !== '1'; UI.plOpen = Object.assign({}, UI.plOpen, { [ds.cat]: open }); render();
    const b = document.querySelector(`.pl-tog[data-cat="${ds.cat}"]`); if (b) b.focus({ preventScroll: true });
    const r = $('plg-' + ds.cat); if (open && r && !reducedMotion() && r.animate) r.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
  },
  'pay-pick'(ds) {
    const kind = ds.v === 'mark' ? 'mark' : 'record', ym = ds.ym || B().month, list = payPickList(kind, ym);
    if (!list.length) return toast(kind === 'mark' ? t('Every bill of the month is paid') + '.' : t('Nothing planned for {month}', { month: fmt.month(ym) }));
    if (kind === 'record' && list.length === 1) return A['line-pay']({ id: list[0].id, ym });
    UI.payPick = { kind, ym }; UI.sheet = 'pay-pick'; renderOverlay(); const el = document.querySelector('.sheet.s-list .g-pick-list button'); if (el) el.focus({ preventScroll: true });
  },
  'pay-pick-go'(ds) { UI.sheet = false; UI.payPick = null; if (ds.v === 'mark') A['line-pay-now']({ id: ds.id, ym: ds.ym }); else A['line-pay']({ id: ds.id, ym: ds.ym }); },
  'pay-row-open'(ds) { const r = (B().pay[ds.y] || []).find(x => x.id === ds.id); if (!r) return; UI.drawer = { kind: 'pay-row', title: r.name, id: r.id, y: ds.y, ym: ds.ym || B().month }; renderOverlay(); },
};
