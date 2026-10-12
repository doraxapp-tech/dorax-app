/* Dorax Finance — the household's summary on a phone in the light theme, "Bosque" (owner, 2026-10-11: "lleva esa a cabo en resumen, exactamente lo
   que me muestras", the second direction of the design canvas "Dorax móvil estilo landing", drawn after "siento que aún le falta personalidad" with
   four banking apps for reference). It takes the place of the landing look of v174 on this one page. What it is, from the top:
     - the top of the page is a forest block with rounded lower corners: the greeting, the net balance large in white, the month and Journey
       (app/shell.js draws them; css/look/look-land.css colours them);
     - "You can spend" is a card of its own that sits half on the block and half on the page: the figure for the day, and a lime strip at its foot
       with until when, which opens how it was worked out;
     - four round buttons in one white bar: expense, income, transfer and More (the other things the summary used to list in its row of circles);
     - the accounts as round bank logos with their names and balances, to swipe;
     - what there is to pay as small cards to swipe, each with its icon and when it is due ("in 3 days", the nearest one in lime);
     - the days of freedom as a ring and the goals on a mint card, side by side;
     - the day's fact as one quiet line; and the bar at the foot floats, forest, the screen in use a lime pill.
   It is always laid out as designed (owner, 2026-10-12: "no se ve igual, no está organizado tal como el ejemplo" about his own phone, where the
   order and the eyes saved for the summary before had moved the parts around): the order and the hidden parts of "Reorder the dashboard" are for the
   dark theme and the computer; the notices about the data come after the design's parts. Colours (same day: "usa este verde por favor", with the
   reference's statistics and exchange screens): the reference's deep green #112622 (the card of the day's figure #004134) and its lime #B6DD62 (css/look/look-land.css).
   The dark theme, the company's side, the other pages and a computer keep what they had. Every figure comes from the same places as before. */

/** This look is on: a phone, the light theme, the household's side, the summary (the same test app/shell.js uses to mark the page with .land). */
const bosqueOn = () => !!UI.session && S.settings.theme === 'light' && UI.space !== 'business' && UI.route === 'dashboard' && isPhone();

const bqSvg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const BQ_OUT = '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>', BQ_IN = '<path d="M17 7 7 17"/><path d="M16 17H7V8"/>';

/** In the block at the top, the person's photo or the first letter of their name on a lime circle. */
const bqAvatar = () => photoHas() ? avatar() : `<span class="avatar bq-init" aria-hidden="true">${esc(String(firstName(S.user.name) || S.user.email || '?').trim().charAt(0).toUpperCase())}</span>`;

// ---------- "You can spend": the card half on the block ----------
// Always there, as designed (owner, 2026-10-12: "quiero que pongas que puedes gastar hoy como en el screenshot, revisa en mi perfil por qué no sale":
// it was left out while what is due before pay day, or the month's end, is more than the day-to-day accounts hold, his case). Then the day's share is
// R$ 0 and the lime strip says how much is missing; a tap opens the same steps as always. Only without a day-to-day account is there no card.
function bqFree() {
  const r = freeUntil(S, S.today, CUR); if (!r) return '';
  const ok = fuOk(r), big = ok ? fuBig(r) : `<span class="fu-big">${t('{amount} a day', { amount: `<span class="fu-n num">${fuMoney(0)}</span>` })}</span>`;
  const say = ok ? fuSay(r).replace('. ', '.<br>') : t('{amount} short to pay everything {when}.', { amount: `<b>${fuMoney(-r.free)}</b>`, when: fuWhen(r) });
  return `<section class="bq-free${ok ? '' : ' short'}" id="free-card" aria-label="${esc(t('You can spend'))}"><div class="bq-free-top"><span class="bq-chip">${t('You can spend')}</span>${big}</div>
    <button class="bq-free-foot" id="free-open" data-a="free-view" aria-haspopup="dialog"><span class="bq-say">${say}</span><span class="bq-go" aria-hidden="true">${bqSvg(BQ_OUT)}</span></button></section>`;
}

// ---------- four round buttons ----------
function bqActions() {
  const by = Object.fromEntries(quickItems().map(x => [x[0], x]));
  const one = (v, d, on, label) => by[v] ? `<button data-a="quick-go" data-v="${v}" aria-label="${esc(by[v][2])}"><span class="bq-ico${on ? ' on' : ''}">${bqSvg(d)}</span><span>${label}</span></button>` : '';
  return `<nav class="bq-acts" id="quick-acts" aria-label="${t('Add')}">${one('expense', BQ_OUT, true, quickShort('expense'))}${one('income', BQ_IN, false, t('Inflow'))}${one('transfer', '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>', false, t('Move money'))}<button data-a="quick-more" aria-haspopup="dialog"><span class="bq-ico">${icon('more')}</span><span>${t('More')}</span></button></nav>`;
}
/** More: every other thing the summary's row of circles offered, in a short list. */
function bqMoreSheet() {
  const rest = quickList().filter(x => x[0] !== 'main' && !QUICK_BASE.includes(x[0]));
  return `<div class="scrim" data-a="close"></div><div class="sheet g-pick bq-more-sheet" role="dialog" aria-label="${t('What do you want to do?')}"><div class="grab" aria-hidden="true"></div><h2>${t('What do you want to do?')}</h2>
    <div class="g-pick-list">${rest.map(([v, ic, l]) => `<button data-a="quick-go" data-v="${v}"><span class="fl-ico">${icon(ic)}</span><span class="grow"><b>${esc(l)}</b></span>${icon('right')}</button>`).join('')}</div></div>`;
}

// ---------- the accounts, as round logos ----------
// the name under a logo: what is left of the account's name once the bank's is taken out ("Tarjeta Nubank" is "Tarjeta"), or the bank's short name
// when nothing else is left or only a word like "Cuenta" ("Cuenta Nubank" is "Nubank", "Banco do Brasil" is "BB"); the full name is read aloud
const BQ_SHORT = { 'Banco do Brasil': 'BB', 'Mercado Pago': 'M. Pago', 'C6 Bank': 'C6', 'BTG Pactual': 'BTG', 'Banco BV': 'BV' };
const BQ_PLAIN = /^(cuenta|conta|account|cuenta corriente|conta corrente|corriente|corrente|checking)$/i;
function bqShort(a) {
  const inst = String(a.institution || ''); if (!BANK_MARKS[inst]) return a.name;
  const rest = acctRest(a.name, inst).replace(/^\((.+)\)$/, '$1');      // "Santander (débito)" is "Débito", not "(débito)"
  return !rest || BQ_PLAIN.test(rest) ? (BQ_SHORT[inst] || inst) : rest.charAt(0).toUpperCase() + rest.slice(1);
}
const bqHead = (title, link, sub) => `<div class="bq-h"><span class="bq-t"><h2>${title}</h2>${sub ? `<span class="bq-sub">${sub}</span>` : ''}</span>${link || ''}</div>`;
const bqLink = (href, label) => `<a class="bq-more" href="${href}">${label}${icon('right')}</a>`;
function bqAccounts() {
  const list = personal(), bal = a => accountBalance(S, a.id, S.today);
  if (!list.length) return `<section class="bq-sec" id="ac-card">${bqHead(t('Your accounts'))}<div class="bq-empty"><b>${t('No accounts yet')}</b>${acctButton()}</div></section>`;
  // one logo per card, its functions together (owner, 2026-10-12: "no es necesario tener Santander de ahorro y otro de débito, son lo mismo pero
  // diferentes funciones; condensa las cuentas"): a savings account and its balance to spend by debit are one amount, a credit card linked to its
  // account sits under that account's amount in red (what is owed); a credit card with no account of its own is a logo of its own (cardsOf, wallet.js)
  const money = a => sum(cardParts(a).filter(k => k.type !== 'credit').map(bal)), owed = a => { const cr = a.type === 'credit' ? null : cardCredit(a); return cr ? bal(cr) : 0; };
  const cards = cardsOf(list), rows = [...cards.filter(a => a.type !== 'credit').sort((x, y) => money(y) - money(x)), ...cards.filter(a => a.type === 'credit')];
  const mark = a => a.institution ? bankMark(a.institution) : `<span class="inst" aria-hidden="true">${icon('wallet')}</span>`;
  const one = a => { const v = money(a), o = owed(a);
    // a tap opens the card's panel, its functions in it (debit, credit, saved), as on Accounts (owner, same day: "cuando hago tap no me abre el menú de cuenta")
    return `<li><button class="bq-acc" data-a="card-view" data-id="${a.id}"${a.type === 'credit' ? ' data-fn="credit"' : ''} aria-haspopup="dialog" aria-label="${esc(cardSay(a))}"><span class="bq-mark" aria-hidden="true">${mark(a)}</span><span class="bq-acc-n" aria-hidden="true">${esc(bqShort(a))}</span><span class="bq-acc-v num${v < 0 ? ' neg' : ''}" aria-hidden="true">${fmt.money(v, a.currency, { round: true })}</span>${o < 0 ? `<span class="bq-acc-v num neg" aria-hidden="true">${fmt.money(o, a.currency, { round: true })}</span>` : ''}</button></li>`; };
  return `<section class="bq-sec" id="ac-card">${bqHead(t('Your accounts'), bqLink('#accounts', t('View all')))}<ul class="bq-accs bq-row">${rows.map(one).join('')}</ul></section>`;
}

// ---------- what there is to pay, as small cards ----------
const bqDay = iso => { const d = +iso.slice(8, 10), m = mon(+iso.slice(5, 7) - 1); return S.settings.lang === 'en' ? `${m} ${d}` : `${d} ${m.toLowerCase()}`; };
function bqTodo() {
  const { nowYm, rows, total, d, past } = todoData();
  const late = p => p.status === 'late' || p.days < 0;
  const due = p => !p.dueDate ? [t('No day'), ''] : late(p) ? [t('Late'), ' late'] : p.days === 0 ? [t('Today'), ''] : p.days === 1 ? [t('Tomorrow'), ''] : p.days <= TODO_SOON ? [t('in {n} days', { n: p.days }), ''] : [bqDay(p.dueDate), ''];
  const glyph = p => {
    if (p.card) { const a = acct(p.id); return a && a.institution ? bankMark(a.institution) : icon('wallet'); }      // the card's bank
    const f = catOf(p.categoryId), k = catGuess({ name: p.name, id: '' });
    return catIconSvg(k && k !== 'more' ? k : catIconKey(f && f.cat, f && f.sub));
  };
  // a card's invoice by its bank, "Factura Nubank" (it was "Tarjeta Nubank: factura", two lines on a small card)
  const name = p => { if (!p.card) return p.name; const a = acct(p.id), inst = a && String(a.institution || ''); return a ? t('{name} invoice', { name: BANK_MARKS[inst] ? (BQ_SHORT[inst] || inst) : a.name }) : p.name; };
  const card = (p, i) => { const [when, cls] = due(p), amount = (p.pay === 'variable' ? '≈ ' : '') + fmt.money(p.planned, BCUR()), attrs = p.card ? `data-a="card-view" data-id="${p.id}"` : `data-a="line-open" data-id="${p.id}" data-ym="${p.ym}"`;
    return `<li><button class="bq-bill${i ? '' : ' first'}" ${attrs} aria-label="${esc(`${name(p)}, ${amount}, ${when}`)}"><span class="bq-bill-t" aria-hidden="true"><span class="bq-ico">${glyph(p)}</span><span class="bq-due${cls}">${esc(when)}</span></span><span class="bq-bill-n" aria-hidden="true">${esc(name(p))}</span><span class="bq-bill-v num" aria-hidden="true">${amount}</span></button></li>`; };
  // the other things that wait, each one more card: last month's bills with no payment, and the savings still to hand out
  const other = [];
  if (past) other.push(`<li><button class="bq-bill" data-a="remind-month" data-ym="${past.ym}" data-route="plan"><span class="bq-bill-t"><span class="bq-ico">${icon('calendar')}</span><span class="bq-due late">${esc(fmt.month(past.ym, 'bare'))}</span></span><span class="bq-bill-n">${tn(past.lines.length, '{n} bill from {month} has no payment', '{n} bills from {month} have no payment', { month: fmt.month(past.ym) })}</span><span class="bq-bill-v num">${fmt.money(past.amount, BCUR())}</span></button></li>`);
  if (d.pending > 0) other.push(`<li><button class="bq-bill" data-a="remind-month" data-ym="${nowYm}" data-route="goals"><span class="bq-bill-t"><span class="bq-ico">${icon('flag')}</span><span class="bq-due">${t('Hand it out')}</span></span><span class="bq-bill-n">${t('Savings for {month}', { month: fmt.month(nowYm) })}</span><span class="bq-bill-v num">${t('{amount} still to hand out', { amount: fmt.money(d.pending, BCUR()) })}</span></button></li>`);
  const list = rows.slice(0, 8).map(card).join('') + other.join('');
  return `<section class="bq-sec" id="todo">${bqHead(t('To pay'), bqLink('#plan', t('Open plan')), rows.length ? t('{amount} in the next 30 days', { amount: fmt.money(total, BCUR()) }) : '')}${list ? `<ul class="bq-bills bq-row">${list}</ul>` : `<div class="bq-empty"><span>${t('Nothing to pay or to do in the next 30 days.')}</span></div>`}</section>`;
}

// ---------- the days of freedom as a ring, the goals on mint ----------
function bqRunway() {
  const r = runway(B(), B().today, BCUR()); if (!r || r.days === null) return runwayCard();      // not worked out yet: its own card, with the way to set it up
  const days = r.days, next = RUNWAY_MARKS.find(m => m > days), share = next ? Math.min(1, days / next) : 1, C = 2 * Math.PI * 44;
  const months = days >= 60, n = months ? fmt.num(runwayMonths(days)) : fmt.num(days), unit = months ? t('months') : t('days');
  const say = next ? t('Next goal: {mark}.', { mark: rwMark(next) }) : t('Past every goal: more than a year.');
  return `<section class="bq-run" id="runway-card"><button class="bq-tile" id="runway-open" data-a="runway-view" aria-haspopup="dialog" aria-label="${esc(`${t('Days of freedom')}: ${rwFigure(days, false).span}. ${say}`)}">
    <span class="bq-tile-h" aria-hidden="true">${t('Days of freedom')}</span>
    <span class="bq-ring" aria-hidden="true"><svg viewBox="0 0 104 104" focusable="false"><circle cx="52" cy="52" r="44" fill="none" stroke="#DFE6E4" stroke-width="10"/>${share > 0 ? `<circle cx="52" cy="52" r="44" fill="none" stroke="#112622" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(share * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 52 52)"/>` : ''}</svg><span class="bq-ring-n"><b data-count="${months ? runwayMonths(days) : days}">${n}</b><small>${unit}</small></span></span>
    <span class="bq-tile-s" aria-hidden="true">${say}</span></button></section>`;
}
function bqGoals() {
  if (!B().goals.length) return `<section class="bq-goals" id="goals-card"><a class="bq-tile" href="#goals"><span class="bq-tile-h">${t('Goals')}</span><span class="bq-goals-none">${t('No goals yet')}</span><span class="bq-more">${t('Start a goal')}${icon('right')}</span></a></section>`;
  const total = sum(B().goals.map(g => goalSaved(B(), g.id)));
  const top = B().goals.filter(g => g.status === 'active' && g.kind === 'goal' && !isYearly(g)).map(g => [g, goalStatus(B(), g, B().today)]).filter(([, st]) => st.target).slice(0, 2);
  const bar = ([g, st]) => `<span class="bq-g"><span class="bq-g-t"><span>${esc(g.name)}</span><span class="num">${fmt.pct(Math.round(st.pct))}</span></span><span class="bq-bar"><i style="width:${Math.max(0, Math.min(100, st.pct))}%"></i></span></span>`;
  return `<section class="bq-goals" id="goals-card"><a class="bq-tile" href="#goals" aria-label="${esc(`${t('Goals')}: ${fmt.money(total, BCUR())} ${t('set aside in goals and funds')}`)}">
    <span class="bq-tile-h" aria-hidden="true">${t('Goals')}</span><span class="bq-goals-v" aria-hidden="true"><b class="num">${fmt.money(total, BCUR(), { trim: true })}</b><small>${t('Set aside')}</small></span>${top.map(bar).join('')}</a></section>`;
}

// ---------- the page ----------
/** The days of freedom beside the goals; not worked out yet, the days of freedom keep their own card, with its name outside it as the other pages. */
function bqPair() {
  const run = bqRunway(), goals = bqGoals();
  return /class="bq-run"/.test(run) ? `<div class="bq-pair">${run}${goals}</div>` : `${partOut(run)}<div class="bq-pair">${goals}</div>`;
}
/** The household's summary in this look (phone.home.js hands it over while bosqueOn()), always in the design's order: the card on the block, the four
    buttons, the accounts, what there is to pay, the days of freedom and the goals, the day's fact; then the notices about the data. A month already
    over has no card, buttons or bills: its notice, the accounts and the other notices. */
function bqHome(d) {
  const notes = `${firstSteps()}${d.inProgress ? monthCloseCard() : ''}${companyAsk()}${d.openNote}`;
  UI.dashShown = [];      // no "Reorder the dashboard" in this look
  if (!d.inProgress) return `${d.pastNote}${bqAccounts()}${notes}`;
  return `${bqFree()}${bqActions()}${bqAccounts()}${bqTodo()}${bqPair()}${phoneInsight()}${notes}`;
}

// ---------- the bar at the foot: smaller while the page goes down (owner, 2026-10-12: "quiero que esa barra se reduzca en tamaño al hacer scroll
// down") ----------
// Down past the first screenful the bar loses its names (css/look/look-land.css, .bar-small); up again, or near the top, it is whole. Only this look.
let bqLastY = 0;
document.addEventListener('scroll', e => {
  const root = document.documentElement, el = e.target;
  if (!root.classList.contains('land')) { root.classList.remove('bar-small'); return; }
  if (!el || !el.classList || !el.classList.contains('work')) return;
  const y = el.scrollTop, d = y - bqLastY; bqLastY = y;
  if (y < 80) root.classList.remove('bar-small'); else if (d > 4) root.classList.add('bar-small'); else if (d < -4) root.classList.remove('bar-small');
}, { capture: true, passive: true });

const BOSQUE_ACTIONS = {
  'quick-more'() { UI.sheet = 'quick-more'; renderOverlay(); const el = document.querySelector('.bq-more-sheet .g-pick-list button'); if (el) el.focus({ preventScroll: true }); },
};
