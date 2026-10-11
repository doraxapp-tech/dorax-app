/* Dorax Finance — the summary on a phone: its parts in the order the person chose, and the accounts with what is in each of them.
   The two pages that use this are features/phone/phone.home.js (the household's) and features/phone/phone.company.js (the company's). */

// 2026-10-08 (owner: "add an accounts section to the summary tab on mobile, as bullets with the icons of the user's accounts and the amount saved
// in them"; "create an option for the user to order the summary tab as they like").

/** The accounts of the side in use, one line each: the bank's mark, the name and its kind, what is in it today. Money kept comes first and the
    cards after it, with what is owed on them in red. A tap opens that account's transactions; the card's link opens Accounts. Amounts follow
    the eye in the top panel (ui/hide-nums.js), and each account is shown in its own currency: nothing is added up or converted here. */
const AC_ROWS = 6;
/** The dashboard's accounts: the wallet while the beta is on (features/accounts/wallet.js), the list otherwise. */
const phoneAccountsCard = () => walletOn() ? walletStack() : phoneAccountsList();
function phoneAccountsList() {
  const co = inCompany(), list = co ? business() : personal(), ordered = [...list.filter(a => a.type !== 'credit'), ...list.filter(a => a.type === 'credit')];
  const kind = a => (ACCT_TYPES().find(x => x[0] === a.type) || [0, a.type])[1];
  const mark = a => a.institution ? bankMark(a.institution) : `<span class="inst" aria-hidden="true">${icon('wallet')}</span>`;
  const row = a => { const bal = accountBalance(S, a.id, S.today); return `<li><button class="ac-row" data-a="view-account" data-id="${a.id}">${mark(a)}<span class="grow"><b>${esc(a.name)}</b><small>${esc(kind(a))}${a.currency !== CUR ? ' · ' + a.currency : ''}</small></span><span class="num${bal < 0 ? ' neg' : ''}">${fmt.money(bal, a.currency)}</span></button></li>`; };
  const more = ordered.length - AC_ROWS;
  return `<section class="card" id="ac-card"><div class="card-h"><h2>${t('Accounts')}</h2>${info(t('What is in each account today. A card shows what you owe on it, in red. Tap an account to see its transactions.'))}${list.length ? `<a class="right btn sm go" href="#accounts">${t('View all')}${icon('right')}</a>` : ''}</div>
    <div class="card-b">${list.length ? `<ul class="ac-list">${ordered.slice(0, AC_ROWS).map(row).join('')}</ul>${more > 0 ? `<a class="ac-more" href="#accounts">${t('See all {n} accounts', { n: ordered.length })}${icon('right')}</a>` : ''}`
      : `<div class="empty"><b>${co ? t('No company accounts yet') : t('No accounts yet')}</b>${acctButton()}</div>`}</div></section>`;
}

// ---------- the order of the summary's parts ----------
// The notices that say something about the data (first steps, an older month, a month to close, balances that start at zero, the question
// about a company) stay above everything; the rest is drawn in the order the person chose. Each side keeps its own order, in S.user.dashOrder,
// so it travels with the account to every device. A part that does not apply this month (no goals yet, a month already closed) is not drawn
// and is not offered in the list either.
// 2026-10-08 (owner: "remove the KPI cards above the insight of the day"): the month's figures are not a part on a phone any more; an order saved
// with them simply leaves them out (dashOrder keeps only known parts). A computer keeps them.
// 2026-10-08 (owner: "I also want to order my summary tab on the computer, add the option"): a computer has its own order, per side ('home-pc',
// 'co-pc'), because its page is laid out its own way (two cards to a row, the month's figures fixed on top, no quick access). The days of freedom
// and the insight of the day come side by side by default ("put the insight of the day beside the days of freedom on the computer").
const DASH_PARTS = {
  // what needs doing comes right after the days of freedom (usability QC, 2026-10-08: "To do" was 1.3 screens down, under what is only to read)
  // 2026-10-08 (owner: "in Reports should go the monthly spending chart and spending by category"): on a phone the two charts left the summary for
  // Reports' Expenses view (features/reports/reports.view.js); the computer keeps them
  // 2026-10-09 (owner: "the default order of the home page has savings and goals above the cards"): on a phone the goals come before the accounts
  // 2026-10-10 ("what more can help"): what is free to spend until pay day comes first, the household's one figure for the day
  home: ['free', 'runway', 'todo', 'quick', 'insight', 'goals', 'accounts', 'planned', 'fii', 'recent'],
  co: ['runway', 'todo', 'quick', 'insight', 'goals', 'accounts', 'plan', 'planned', 'received', 'recent'],
  // 2026-10-11 (owner: "make sure the user gets the most out of the summary at a glance"): a computer shows, three to a row, what is used day to day
  // (how much can be spent, what is due, the emergency fund; the goals, where the money went, the insight); the rest waits in the list, one click away
  // (features/dashboard/dash-glance.view.js). Before: two to a row, everything shown, the accounts' cards first.
  'home-pc': ['free', 'todo', 'runway', 'goals', 'categories', 'insight', 'planned', 'accounts', 'trend', 'fii', 'recent'],
  'co-pc': ['todo', 'runway', 'insight', 'goals', 'categories', 'planned', 'accounts', 'plan', 'received', 'trend', 'recent'],
};
const dashSide = () => (inCompany() ? 'co' : 'home') + (isPhone() ? '' : '-pc');
// 2026-10-08 (usability QC: the summary was almost five screens long): a phone shows six parts to start with; the others wait in the list of
// "Reorder the dashboard", each with an eye to show it. The person's choice is kept per side (S.user.dashHidden); a computer shows them all.
const DASH_HIDDEN = { home: ['fii', 'recent'], co: ['plan', 'received', 'recent'], 'home-pc': ['trend', 'fii', 'recent'], 'co-pc': ['plan', 'received', 'trend', 'recent'] };      // a computer (2026-10-11): the rest one click away
const dashHidden = side => { side = side || dashSide(); const h = (S.user.dashHidden || {})[side]; return h ? h : (DASH_HIDDEN[side] || []); };
/** Each part by the name its card wears, so the list reads like the page. */
function partName(id) {
  const co = inCompany();
  return ({ free: t('You can spend'), runway: co ? t('Company runway') : t('Days of freedom'), quick: t('Quick access'), insight: t('Insight of the day'), accounts: t('Accounts'),
    todo: t('To do'), goals: t('Goals'), planned: t('Your month, as planned'), plan: t('Plan vs actual'), categories: co ? t('Costs by category') : t('Spending by category'),
    received: t('Received by month'), trend: co ? t('Costs by month') : t('Monthly spending'), fii: t('Investments (FIIs)'), recent: t('Recent transactions') })[id] || id;
}
/** The side's order: the one saved, with any part added to the app since then placed after the part it follows by default. */
function dashOrder(side) {
  side = side || dashSide();
  const def = DASH_PARTS[side], saved = ((S.user.dashOrder || {})[side] || []).filter((id, i, xs) => def.includes(id) && xs.indexOf(id) === i), out = [...saved];
  def.forEach((id, i) => { if (out.includes(id)) return; const prev = def.slice(0, i).reverse().find(x => out.includes(x)); out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, id); });
  return out;
}
const dashCustom = side => { const o = dashOrder(side); return DASH_PARTS[side || dashSide()].some((id, i) => o[i] !== id); };
/** The parts in the chosen order, and at the foot the button that changes it. What is drawn is kept, so the list offers only what is on the page. */
function phoneParts(parts) {
  const ids = dashOrder().filter(id => parts[id]), hid = dashHidden(), on = ids.filter(id => !hid.includes(id)), off = ids.length - on.length;
  UI.dashShown = ids;      // what the list offers: every part with something to show, hidden or not
  return on.map(id => parts[id]).join('') + (ids.length > 1 ? `<div class="dash-order"><button class="btn ghost" id="dash-order-btn" data-a="dash-order" aria-haspopup="dialog">${icon('sort')}${t('Reorder the dashboard')}${off ? `<span class="d-off">${tn(off, '{n} part hidden', '{n} parts hidden')}</span>` : ''}</button></div>` : '');
}
/** The computer's summary: the parts in the order chosen, two to a row; the accounts' cards and the latest transactions take the whole width, and a
    card with no other beside it (its neighbour is a wide one, or the last) takes the whole width too, so no row has a hole. A row that starts with
    To do gives it the wider column, as before. */
const DASH_WIDE = ['accounts', 'recent'];
function pcParts(parts) { return pcGlance(parts); }      // three to a row, the hidden ones left out (features/dashboard/dash-glance.view.js)
/** The computer's way to the order, beside the greeting (or the company's name): drawn once the parts are known, and only with two or more. */
const dashOrderBtn = () => (UI.dashShown || []).length > 1 ? `<button class="btn sm d-order-btn" id="dash-order-btn" data-a="dash-order" aria-haspopup="dialog">${icon('sort')}${t('Reorder the dashboard')}</button>` : '';
/** The parts on the page with their place and two arrows (a sheet on a phone, a side panel on a computer). The page changes at each press. */
function dashOrderList() {
  const ids = dashOrder().filter(id => (UI.dashShown || []).includes(id)), n = ids.length;
  const arrow = (id, i, d) => `<button class="ord-btn" data-a="dash-move" data-id="${id}" data-d="${d}" aria-label="${esc(d < 0 ? t('Move {name} up', { name: partName(id) }) : t('Move {name} down', { name: partName(id) }))}" ${(d < 0 ? i === 0 : i === n - 1) ? 'disabled' : ''}>${icon(d < 0 ? 'up' : 'down')}</button>`;
  const phone = isPhone(), hid = dashHidden();      // a computer hides parts too (2026-10-11)
  const eye = id => { const off = hid.includes(id); return `<button class="ord-btn ord-eye" data-a="dash-show" data-id="${id}" aria-pressed="${!off}" aria-label="${esc(t('Show {name} on the summary', { name: partName(id) }))}">${icon(off ? 'eyeoff' : 'eye')}</button>`; };
  return `<ol class="ord-list">${ids.map((id, i) => `<li data-id="${id}"${hid.includes(id) ? ' class="off"' : ''}><span class="ord-n num" aria-hidden="true">${i + 1}</span><b class="grow">${esc(partName(id))}</b>${eye(id)}${arrow(id, i, -1)}${arrow(id, i, 1)}</li>`).join('')}</ol>`;
}
const dashOrderFoot = () => `${dashCustom() || (S.user.dashHidden || {})[dashSide()] ? `<button class="btn" data-a="dash-order-reset">${t('Original order')}</button>` : ''}<button class="btn primary" data-a="dash-order-done">${t('Done')}</button>`;
function dashOrderSheet() {
  return `<div class="scrim" data-a="close"></div><div class="sheet d-order" role="dialog" aria-label="${t('Reorder the dashboard')}"><div class="grab" aria-hidden="true"></div>
    <h2>${t('Reorder the dashboard')}</h2><p class="d-order-note">${t('Move each part up or down, and show or hide it with the eye. The dashboard changes as you go.')}</p>
    ${dashOrderList()}<div class="ord-foot">${dashOrderFoot()}</div></div>`;
}
/** The same list in a side panel on a computer; the page beside it changes at each click. */
function dashOrderDrawer() {
  return `<div class="body d-order"><p class="d-order-note">${t('Move each part up or down. The dashboard changes as you go.')} ${t('Two parts share a row; the accounts and the latest transactions take the whole width.')}</p>${dashOrderList()}</div><footer class="d-order-foot">${dashOrderFoot()}</footer>`;
}
const PHONE_ORDER_ACTIONS = {
  'dash-order'() {
    if (isPhone()) UI.sheet = 'dash-order'; else UI.drawer = { kind: 'dash-order', title: t('Reorder the dashboard') };
    renderOverlay(); const el = document.querySelector('#overlay .ord-btn:not([disabled])'); if (el) el.focus({ preventScroll: true });
  },
  /** One place up or down among the parts on the page; a part not drawn this month keeps its place in the saved order. */
  'dash-move'(ds) {
    const side = dashSide(), ids = dashOrder(side), shown = ids.filter(id => (UI.dashShown || []).includes(id)), d = +ds.d, i = shown.indexOf(ds.id), j = i + d;
    if (i < 0 || j < 0 || j >= shown.length) return;
    const a = ids.indexOf(shown[i]), b = ids.indexOf(shown[j]); [ids[a], ids[b]] = [ids[b], ids[a]];
    S.user.dashOrder = Object.assign({}, S.user.dashOrder, { [side]: ids }); save();
    flip('#view > [id], #view > .grid > [id], #view > .dash-grid > [id], #overlay .ord-list li[data-id]', () => renderNow());      // the parts and the list's rows slide to their places (app/motion.js)
    // the arrow pressed may now be off (the part reached the top or the foot): the finger and the keyboard stay on the same part
    const q = v => document.querySelector(`#overlay .ord-btn[data-id="${ds.id}"][data-d="${v}"]`), same = q(d);
    if (same && same.disabled) { const other = q(-d); if (other) other.focus({ preventScroll: true }); }
    else if (same && document.activeElement !== same) same.focus({ preventScroll: true });
  },
  /** A part shown or hidden on a phone's summary; the list keeps it, with its place. */
  'dash-show'(ds) {
    const side = dashSide(), h = dashHidden(side).filter(id => id !== ds.id), off = !dashHidden(side).includes(ds.id);
    S.user.dashHidden = Object.assign({}, S.user.dashHidden, { [side]: off ? [...h, ds.id] : h }); save(); renderNow();
    const el = document.querySelector(`#overlay .ord-eye[data-id="${ds.id}"]`); if (el) el.focus({ preventScroll: true });
  },
  'dash-order-reset'() {
    const o = Object.assign({}, S.user.dashOrder); delete o[dashSide()]; S.user.dashOrder = o;
    const h = Object.assign({}, S.user.dashHidden); delete h[dashSide()]; S.user.dashHidden = h; save(); render();
    const el = document.querySelector('#overlay [data-a="dash-order-done"]'); if (el) el.focus({ preventScroll: true });
  },
  'dash-order-done'() { UI.sheet = false; UI.drawer = null; renderOverlay(); const el = $('dash-order-btn'); if (el) el.focus({ preventScroll: true }); },
};

// ---------- lists that open from the summary (owner, 2026-10-08: "make savings and goals tappable, so they open that goal's details; the same for
// fixed costs: a tap on fixed costs opens a list of them, and a tap on one opens its details") ----------
// Two short lists in a sheet, in the shape of the goal picker (features/phone/phone.goals.js): one line per fixed cost of the month, or per goal and
// fund. A line opens the same details the Plan and Goals pages open, so there is one place where each thing is read and changed.
function fixedListSheet() {
  const ym = UI.listYm || B().month, cat = id => (B().categories.find(c => c.id === id) || {}).name || '';
  const xs = planProgress(B(), ym, BCUR(), B().today).filter(p => p.planned > 0).sort((a, b) => (a.dueDate || '9') < (b.dueDate || '9') ? -1 : (a.dueDate || '9') > (b.dueDate || '9') ? 1 : b.planned - a.planned);
  const title = t('Fixed costs, {month}', { month: fmt.month(ym) });
  return `<div class="scrim" data-a="close"></div><div class="sheet g-pick s-list" role="dialog" aria-label="${esc(title)}"><div class="grab" aria-hidden="true"></div><h2>${esc(title)}</h2>
    <div class="g-pick-list">${xs.map(p => `<button data-a="list-line" data-id="${p.id}" data-ym="${ym}"><span class="grow"><b>${esc(p.name)}</b><small>${esc([cat(p.categoryId), p.status === 'paid' ? t('Paid') : p.dueDate ? fmt.date(p.dueDate) : ''].filter(Boolean).join(' · '))}</small></span><span class="num s-amt">${fmt.money(p.planned, BCUR(), { trim: true })}</span>${icon('right')}</button>`).join('')
      || `<div class="empty">${t('Nothing planned for {month}', { month: fmt.month(ym) })}</div>`}</div>
    <div class="s-foot"><a class="btn" href="#plan">${t('Open plan')}</a></div></div>`;
}
function goalListSheet() {
  const funds = UI.goalList === 'fund', xs = B().goals.filter(g => g.status === 'active' && (!funds || g.kind !== 'goal')), title = funds ? tn(xs.length, '{n} fund', '{n} funds') : t('Goals');
  return `<div class="scrim" data-a="close"></div><div class="sheet g-pick s-list" role="dialog" aria-label="${esc(title)}"><div class="grab" aria-hidden="true"></div><h2>${esc(title)}</h2>
    <div class="g-pick-list">${xs.map(g => { const st = goalStatus(B(), g, B().today); return `<button data-a="list-goal" data-id="${g.id}"><span class="grow"><b>${esc(g.name)}</b><small>${g.kind === 'goal' ? t('Goal') : t('Fund')}</small></span><span class="num s-amt">${fmt.money(st.saved, BCUR())}${st.target !== null ? `<small>/ ${fmt.money(st.target, BCUR(), { trim: true })}</small>` : ''}</span>${icon('right')}</button>`; }).join('')
      || `<div class="empty">${t('No active goals.')}</div>`}</div>
    <div class="s-foot"><a class="btn" href="#goals">${t('Open goals')}</a></div></div>`;
}
/** From a line of a list to its details: the sheet gives way to the panel, and the focus goes into it. */
function fromList(open) { UI.sheet = false; open(); const el = document.querySelector('#overlay .drawer header button'); if (el) el.focus({ preventScroll: true }); }
// the sheet opens at its top, on its first line (the panel code focuses the first link it finds, here the one at the foot)
const listFocus = () => { const s = document.querySelector('.s-list'), el = document.querySelector('.s-list .g-pick-list button, .s-list .s-foot a'); if (el) el.focus({ preventScroll: true }); if (s) s.scrollTop = 0; };
Object.assign(PHONE_ORDER_ACTIONS, {
  'fixed-list'(ds) { UI.listYm = ds.ym || B().month; UI.sheet = 'fixed-list'; renderOverlay(); listFocus(); },
  'goal-list'(ds) { UI.goalList = ds.kind === 'fund' ? 'fund' : 'all'; UI.sheet = 'goal-list'; renderOverlay(); listFocus(); },
  'list-line'(ds) { fromList(() => A['line-open']({ id: ds.id, ym: ds.ym })); },
  'list-goal'(ds) { fromList(() => A['goal-open']({ id: ds.id })); },
  'runway-view'() { UI.drawer = { kind: 'runway-view', title: inCompany() ? t('Company runway') : t('Days of freedom'), book: bookKey() }; renderOverlay(); },
});

// ---------- the days of freedom, simpler on a phone (owner, 2026-10-08: "simplify the months-of-freedom card on mobile") ----------
// The card keeps four things: its name, the figure, how it moved since last month as a small sign, and the track to the next mark with what is
// missing. The sentence, the figures it rests on, the explanation and the two buttons (What if…?, Adjust) are one tap away, in its details.
function runwayPhone(r, co) {
  const f = rwFigure(r.days, co), money = v => fmt.money(v, BCUR(), { trim: true });
  const moved = r.delta ? `<span class="pill ${r.delta > 0 ? 'up' : 'down'}">${r.delta > 0 ? '▲' : '▼'} ${tn(Math.abs(r.delta), '{n} day', '{n} days')}</span>` : '';
  return `<section class="card rw-ph" id="runway-card"><button class="rw-tap" id="runway-open" data-a="runway-view" aria-haspopup="dialog">
    <span class="rw-h"><span class="rw-t"><b>${co ? t('Company runway') : t('Days of freedom')}</b>${co ? '' : `<small class="rw-alias">${t('Your emergency fund')}</small>`}</span><span class="rw-see">${t('See')}${icon('right')}</span></span>
    <span class="rw-fig"><b class="rw-n" data-count="${f.n}" data-dec="${f.dec}">${fmt.num(f.n)}</b><span class="rw-u">${f.unit}</span>${rwParty(r.days)}${moved}</span>
    ${rwTrack(r.days)}<span class="rw-next">${rwNext(r, co, money)}</span></button></section>`;
}
/** Its details: the whole card as a computer shows it, the explanation, and What if…? and Adjust. */
function runwayViewDrawer() {
  const r = runway(B(), B().today, BCUR());
  return `<div class="body rw-view">${runwayCard(true)}<p class="note">${runwayTip(inCompany())}</p></div>
  <footer>${r.days !== null ? `<button class="btn primary" data-a="whatif">${t('What if…?')}</button>` : ''}<button class="btn${r.days === null ? ' primary' : ''}" data-a="runway-edit">${t('Adjust')}</button></footer>`;
}
