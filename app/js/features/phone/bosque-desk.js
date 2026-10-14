/* Dorax Finance — the household's summary and Transactions on a computer, in the summary's look (v199, owner, 2026-10-12: "push updates a la versión
   de ordenador", "Todo, como el teléfono", the side bar "Verde bosque"; then v201, the same day: "lo que hiciste fue usar el mismo layout del celular…
   claramente se ve que es una versión agrandada de celular, no una versión web").
   So a computer keeps the phone's colours and shapes but its own layout, made for a wide screen and a pointer:
     - the summary's forest top is a dashboard's header: the household's net balance (the greeting only as the person comes in, v202), the month's four figures side by side under it
       (income against the plan, spending against the month before, what is left over, what is still to pay; each opens how it is worked out), "You can
       spend" at the right, and a row of buttons (expense, income, transfer, more, the order of the parts). Under it, on the grey, the computer's parts
       in the order the person chose ("Reorder the dashboard"): the cards, the days of freedom, the insight, what is due with its buttons, the goals,
       where the money went, the trend, the latest movements;
     - Transactions: a forest header with the switch (expenses, income, all), the month's figure, how it compares and the month, and the month's chart
       wide at its right; under it the computer's table, with its search and filters, its columns and its pages.
   v202 (owner: "trae de vuelta las tarjetas de por pagar como el celular… y los bancos en círculos al lado izquierdo de ordenar resumen; las metas
   cada una en una tarjeta independiente"): the accounts' round logos in the header's row, what there is to pay as the phone's cards and each goal a
   card, both across the page.
   The phone keeps its own (features/phone/bosque.js, bosque-moves.js). Styles: css/look/look-land-desk.css. */

/** How wide a part of a computer's page is: its area `work` px wide, less the page's margins (css/look/look-land-desk.css, --bq-gut, with the 1400
    px page of base/shell.css), shared between columns: `share` of what is left after `gap` px between them. The charts are drawn that wide. */
const bqDeskW = (work, share, gap) => { const gut = Math.max(32, (work - 1400) / 2 + 32); return Math.max(320, Math.round((work - 2 * gut - gap) * share)); };
const bqWorkW = () => ((document.querySelector('.work') || {}).clientWidth) || innerWidth;
/** A row of n cards at least `min` px wide across the page: as many to a row as fit, the rows as even as they can be (7 is 4 and 3, not 6 and 1). */
const bqCols = (n, min, gap) => { const work = bqWorkW(), w = work - 2 * Math.max(32, (work - 1400) / 2 + 32), fit = Math.max(1, Math.floor((w + gap) / (min + gap))); return Math.max(1, Math.ceil(n / Math.ceil(n / fit))); };
// a window made wider or narrower: the page is drawn again for its new widths (once the resizing stops)
let bqDeskT = 0, bqDeskLast = 0;
addEventListener('resize', () => { clearTimeout(bqDeskT); bqDeskT = setTimeout(() => { const w = bqWorkW(); if (typeof landOn === 'function' && landOn() && !isPhone() && (UI.route === 'dashboard' || UI.route === 'transactions') && !UI.drawer && !UI.sheet && Math.abs(w - bqDeskLast) > 24) { bqDeskLast = w; render(); } }, 160); });

// ---------- the summary ----------
const BQ_SWAP = '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>';
/** The row of buttons under the figures: the things to record first, More, and the order of the parts. */
function bqDeskActs() {
  const by = Object.fromEntries(quickItems().map(x => [x[0], x]));
  const one = (v, d, label, main) => by[v] ? `<button class="bq-dact${main ? ' main' : ''}${QUICK_ART[v] ? ' art' : ''}" data-a="quick-go" data-v="${v}" aria-label="${esc(by[v][2])}">${quickArt(v) || bqSvg(d)}<span>${label}</span></button>` : '';      // v217: its thing
  return `<div class="bq-dacts">${one('expense', BQ_OUT, quickShort('expense', inCompany()), true)}${one('income', BQ_IN, inCompany() ? quickShort('income', true) : t('Inflow'))}${one('transfer', BQ_SWAP, t('Move money'))}<button class="bq-dact art" data-a="quick-more" aria-haspopup="dialog">${quickArt('more') || icon('more')}<span>${t('More')}</span></button>${bqDeskAccs()}${dashOrderBtn()}</div>`;
}
/** The accounts as the phone's round logos, at the right of the buttons, beside "Reorder" (v202, owner: "los bancos en círculos también ponlos al
    lado izquierdo de ordenar resumen"); each opens its panel, its name shows under the pointer. */
const bqDeskAccs = () => bqSideAccts().length ? `<ul class="bq-daccs" aria-label="${esc(t('Your accounts'))}">${bqAccItems()}</ul>` : '';

/** What there is to pay: the phone's cards, in even rows across the page. */
const bqDeskTodo = () => { const h = bqTodo(), n = (h.match(/<li>/g) || []).length; return n ? h.replace('<ul class="bq-bills bq-row">', `<ul class="bq-bills bq-row" style="--cols:${bqCols(n, 176, 14)}">`) : h; };
/** The goals, each one a card (v202, owner: "las metas ponlas cada una en una tarjeta independiente"): its name, what is set aside (of its target),
    its bar, what is still to go and when it gets there at the planned pace; a fund, what it keeps and where. Each opens the goal. The yearly costs
    stay on Goals. */
function bqDeskGoals() {
  const bk = B(), live = bk.goals.filter(g => g.status === 'active' && !isYearly(g)), m = (v, g) => fmt.money(v, gCur(g), { trim: true });      // each goal in its own currency (v224)
  const total = goalSums(bk.goals, g => goalSaved(bk, g.id)), head = bqHead(t('Goals'), bqLink('#goals', t('Open goals')), live.length ? `${total} ${t('set aside in goals and funds')}` : '');
  if (!live.length) return `<section class="bq-sec bq-dgoals-sec" id="goals-card">${head}<div class="bq-empty bq-with-art">${artObj('flag-banner', 'bq-empty-art')}<span>${t('No goals yet')}</span><button class="btn" data-a="goal-new">${icon('plus')}${t('Start a goal')}</button></div></section>`;
  const one = g => {
    const st = goalStatus(bk, g, bk.today), fund = !st.target, a = fund ? null : goalArrival(bk, g, bk.today), where = g.accountId && acct(g.accountId);
    const when = st.state === 'reached' ? t('Reached') : a ? t('by {month}', { month: fmt.month(a.ym, true) }) : st.saved <= 0 ? t('Not started') : '';
    const sub = fund ? (where ? where.name : t('No account linked')) : [st.remaining > 0 ? t('{amount} to go', { amount: m(st.remaining, g) }) : '', when].filter(Boolean).join(' · ');
    return `<li><button class="bq-dgoal${st.state === 'reached' ? ' done' : ''}" data-a="goal-open" data-id="${g.id}" aria-haspopup="dialog">
      <span class="bq-bill-t"><span class="bq-ico" aria-hidden="true">${icon(fund ? 'wallet' : 'flag')}</span><span class="bq-due">${fund ? t('Fund') : fmt.pct(Math.floor(st.pct))}</span></span>
      <span class="bq-dgoal-n">${esc(g.name)}</span><span class="bq-dgoal-v num"><b>${m(st.saved, g)}</b>${fund ? '' : `<small> / ${m(st.target, g)}</small>`}</span>
      ${fund ? '' : `<span class="bq-bar" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, st.pct))}%"></i></span>`}<span class="bq-dgoal-s">${esc(sub)}</span></button></li>`;
  };
  return `<section class="bq-sec bq-dgoals-sec" id="goals-card">${head}<ul class="bq-dgoals" style="--cols:${bqCols(live.length, 200, 14)}">${live.map(one).join('')}</ul></section>`;
}
/** The header on the forest: greeting, net balance, the month's four figures, "You can spend", the buttons. */
function bqDeskHero(d) {
  const { m, p, ym, vsLabel, unpaid, nextDue, prog, inProgress } = d;
  const stat = (k, label, value, sub, cls) => `<button class="bq-dk${cls ? ' ' + cls : ''}" data-a="kpi-open" data-k="${k}" aria-haspopup="dialog"><span class="bq-dk-k">${label}</span><b class="num">${value}</b><small>${sub || '&nbsp;'}</small></button>`;
  const figs = stat('income', t('Income'), fmt.money(m.income, CUR), t('Plan: {amount}', { amount: fmt.money(payTotal(S, ym), CUR, { trim: true }) }))
    + stat('spending', t('Spending'), fmt.money(m.expenses, CUR), versus(m.expenses, p.expenses, vsLabel, false))
    + stat('left', t('Left over'), m.income ? fmt.money(m.saved, CUR) : '—', m.income ? (m.rate === null ? t('Income minus spending') : t('{pct} of income', { pct: fmt.pct(m.rate) })) : t('No income recorded yet'), m.income && m.saved < 0 ? 'neg' : '')
    + stat('unpaid', t('Still to pay'), unpaid.length ? fmt.money(sum(unpaid.map(x => x.toPay)), CUR) : '—', unpaid.length ? tn(unpaid.length, '{n} bill', '{n} bills') + (nextDue ? ' · ' + t('next on {date}', { date: fmt.date(nextDue.dueDate) }) : '') : prog.some(x => x.bill && x.planned) ? t('Every bill of the month is paid') : '');
  return `<section class="bq-dhero"><div class="bq-dh-l">${UI.hello ? bqHello() : ''}<div class="bq-dbal">${barBalance()}</div></div>${inProgress ? `<div class="bq-dh-r">${bqFree()}${nsStrip()}</div>` : ''}
    <div class="bq-dkpis" role="group" aria-label="${esc(fmt.month(ym))}">${figs}</div>${inProgress ? bqDeskActs() : dashOrderBtn() ? `<div class="bq-dacts">${dashOrderBtn()}</div>` : ''}</section>`;
}
/** The greeting, once (v202, owner, 2026-10-12: "el saludo en ordenador quítalo y muéstralo una sola vez cuando el usuario entra a la webapp;
    dejarlo fijo no cumple ningún objetivo"): over the balance the moment the person comes in (app/session.js: startSession, in place of the strip
    that said "Good to see you again"); a few seconds later it folds away and the balance takes its place. Not again until they next come in. */
function bqHello() {
  const own = typeof UI.hello === 'string';      // the first time in (the setup just ended): its own words, a little longer
  if (!UI.helloT) UI.helloT = setTimeout(bqHelloGo, own ? 7000 : 4500);
  return own ? `<header class="hello bq-hello" id="bq-hello"><h2>${esc(UI.hello)}</h2></header>` : greeting().replace('<header class="hello">', '<header class="hello bq-hello" id="bq-hello">');
}
function bqHelloGo() {
  UI.helloT = 0; UI.hello = false; const el = $('bq-hello'); if (!el) return;
  if (reducedMotion() || !el.animate) return el.remove();
  const cs = getComputedStyle(el); el.style.overflow = 'hidden';
  el.animate([{ opacity: 1, height: el.offsetHeight + 'px', marginBottom: cs.marginBottom }, { opacity: 0, height: '0px', marginBottom: '0px' }], { duration: 420, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' }).onfinish = () => el.remove();
}
function bqHomeDesk(d) {
  const { ym, inProgress, fresh } = d; bqDeskLast = bqWorkW();
  // the computer's parts, in the order the person chose (pcParts: features/phone/phone.summary.js); "You can spend" and the figures are in the header
  // v202 (owner: "trae de vuelta las tarjetas de por pagar como el celular"): what there is to pay as the phone's cards, and the goals one card each,
  // each a row across the page; the rest three to a row. No accounts' cards (owner, same day: "quita esta sección también de resumen"): the
  // accounts are the round logos in the header
  const body = pcParts({ accounts: '', free: '', runway: inProgress ? runwayCard() : '', insight: inProgress ? insightCard() : '', todo: inProgress ? bqDeskTodo() : '',
    goals: inProgress ? bqDeskGoals() : '', planned: fresh ? plannedMonthCard(ym) : '', categories: fresh ? '' : d.catCard, trend: fresh ? '' : d.trendCard, fii: fresh ? '' : d.fii, recent: fresh ? '' : d.recentCard }, ['todo', 'goals']);
  return `${bqDeskHero(d)}${firstSteps()}${inProgress ? monthCloseCard() : ''}${inProgress ? '' : d.pastNote}${companyAsk()}${d.openNote}${body}`;
}

// ---------- Transactions ----------
/** The header on the forest: the switch, the figure, how it compares, the month; the month's chart wide at the right. It follows the search as it
    is typed (transactions.view.js: txLive), as the list does. */
function bqTxDeskTop() {
  bqDeskLast = bqWorkW();
  if (!UI.tx.bqSeen) { UI.tx.bqSeen = true; if (!UI.tx.type) UI.tx.type = 'expense'; }      // expenses first, the first time in a visit (as the phone)
  return `<section class="bq-dhero bq-dtx" id="bq-dtx" aria-label="${esc(t('Summary of what is listed'))}">${bqTxDeskIn()}</section>`;
}
function bqTxDeskIn() {
  const f = UI.tx, m = bqTxMonth(), kind = bqTxKind(), cur = txCurOf(f), p = bqSumParts(f, m, kind, cur, { W: bqDeskW(bqWorkW(), 1.7 / 2.7, 40) });
  const seg = [['expense', t('Expenses')], ['income', t('Income')], ['', t('All')]];
  const pager = m ? `<div class="bq-mon" role="group" aria-label="${t('Month')}"><button data-a="bq-tx-month" data-d="-1" aria-label="${t('Previous month')}" ${m <= minMonth() ? 'disabled' : ''}>${icon('left')}</button><span>${fmt.month(m, true)}</span><button data-a="bq-tx-month" data-d="1" aria-label="${t('Next month')}" ${m >= ymOf(S.today) ? 'disabled' : ''}>${icon('right')}</button></div>` : '';
  return `<div class="bq-dtx-l">
      <div class="bq-kind" role="group" aria-label="${t('What to show')}">${seg.map(([v, l]) => `<button data-a="bq-tx-kind" data-v="${v}" aria-pressed="${(v || 'all') === kind}">${l}</button>`).join('')}</div>
      <div class="bq-sum-l"><span class="bq-sum-k">${esc(p.label)}</span><b class="bq-sum-v num${p.neg ? ' neg' : ''}">${p.big}</b>${p.chip}</div>${pager}</div>
    <div class="bq-dtx-r">${p.chart}</div>`;
}
