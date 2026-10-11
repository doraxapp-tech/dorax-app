/* Dorax Finance — the first visit to each main screen.
   Owner, 2026-10-10: "when the person is new, the same onboarding you made for the Journey must be made for the most important tabs of the app, so
   the person knows what each part of the web app is for and what to do with it; not the same, interesting too, but not the same".
   So: the first time a new person opens Summary, Transactions, Plan, Goals, Reports or Accounts & savings, a page over the whole screen says what it
   is for, in one large sentence, and what is done there, in three short lines; over the words, a small live drawing of the screen itself (its
   figures, its list, its bills being ticked, its goal filling, its bars growing, its cards fanning out) plays once. One button does the screen's
   first thing (add a transaction, a fixed cost, a goal, an account); the other lets the person look around alone. Each is shown once
   (user.tours), to someone whose account is under 30 days old, on the household's side, and never over a panel, the Journey's page or the lock.
   Plain black and white like the setup; unlike the Journey, no scene and no steps: one page per screen. */
const TOUR_DAYS = 30;
function tourText(route) {
  return ({
    dashboard: { art: 'kpis', title: t('Your money, at a glance.'), lead: t('Summary tells you how you are doing today, and how long you would last if you stopped earning.'),
      does: [['chart', t('What came in, went out and is left this month')], ['shield', t('Your days of freedom: how long your savings last')], ['check', t('What is still to pay, before it is due')]], go: null },
    transactions: { art: 'list', title: t('Every real in its place.'), lead: t('Everything that comes into and goes out of your accounts is here.'),
      does: [['plus', t('Write an expense in one line: “taxi 15”')], ['upload', t('Bring your bank statement and Dorax sorts it')], ['filter', t('Filter by category, account or month')]], go: ['new-tx', t('Add a transaction')] },
    plan: { art: 'bills', title: t('Your month, before it happens.'), lead: t('In the Plan you put what you expect to earn, your fixed costs with their due day, and how much to spend on each category.'),
      does: [['calendar', t('Fixed costs: rent, internet, cards')], ['gauge', t('A spending limit per category, with a warning at 80%')], ['bell', t('A reminder before each bill is due')]], go: ['plan-guide', t('Plan my month')] },      // 2026-10-10: the guide first (features/limits/plan-guide.view.js)
    goals: { art: 'ring', title: t('Your dreams, with a date.'), lead: t('Each goal tells you how much to set aside a month, and when you get there.'),
      does: [['target', t('Give what you want an amount and a date')], ['trend', t('Set aside each month and watch it move')], ['flag', t('If you fall behind or get ahead, it tells you')]], go: ['goal-new', t('Create a goal')] },
    reports: { art: 'bars', title: t('Where your money went.'), lead: t('Reports shows your months in charts, so you see what to change.'),
      does: [['chart', t('Your largest spending, by category')], ['sort', t('Month against month: what went up and what went down')], ['search', t('Tap a category to see its transactions')]], go: null },
    // a phone's Imports (owner, 2026-10-10: "let phone users import from the phone ... and make an onboarding for it"): where the file comes from,
    // in three steps, and the button that opens the file picker. For everybody, at any age of the account, on both sides (always).
    ...(smallPhone() ? { imports: { art: 'file', always: true, title: t('Your statement, in a few taps.'), lead: t('Bring months of transactions at once, without typing them. The file is read on your phone and is not uploaded.'),
      does: [['bank', t('In your bank’s app, open the statement and export it as OFX or CSV')], ['download', t('It is saved on your phone: in Files on an iPhone, in Downloads on Android')], ['check', t('Choose it here: Dorax sorts it, you only check what is unclear')]],
      go: ['imp-pick', t('Choose my statement')], later: t('Not now') } } : {}),
    accounts: { art: 'cards', title: t('What you really have.'), lead: t('Your accounts, cards and savings, with today’s balance.'),
      does: [['wallet', t('Each account and card, with its balance')], ['coins', t('Your savings, and what they add up to')], ['bank', t('Card invoices, and how much of the limit you use')]], go: ['account-add', t('Add an account')] },
  })[route] || null;
}
/** Tests see a screen's first visit only when they ask for it (window.DORAX_TOURS); a real visit has neither switch. */
const toursOn = () => window.DORAX_TOURS === true || typeof window.DORAX_QUIET === 'undefined';
function tourDue(route) {
  const x = tourText(route);
  if (!toursOn() || !UI.session || !x || (UI.space === 'business' && !x.always)) return false;
  if (UI.drawer || UI.modal || UI.sheet || UI.jstart || UI.coSetup || UI.find || UI.tour || (typeof LOCK !== 'undefined' && LOCK.on)) return false;
  const seen = (S.user.tours || {})[route], since = S.user.since || S.today;
  return !seen && (x.always || dayDiff(S.today, since) <= TOUR_DAYS);      // always: any account, however old (the phone's Imports)
}
/** After a screen opens: its first visit, when it is due. */
function tourMaybe() { if (UI.tour && UI.tour !== UI.route) { UI.tour = null; renderTour(); } if (tourDue(UI.route)) { UI.tour = UI.route; renderTour(); } }      // another screen: the last one's page goes
/** The small live drawing of the screen: shapes in its own layout, a touch of green, played once. */
function tourArt(kind) {
  const n = k => Array.from({ length: k }, (_, i) => i);
  if (kind === 'kpis') return `<div class="ta ta-kpis">${n(3).map(i => `<span class="ta-tile" style="--i:${i}"><i></i><b></b></span>`).join('')}<span class="ta-free"><i></i></span></div>`;
  if (kind === 'list') return `<div class="ta ta-list">${n(4).map(i => `<span class="ta-row" style="--i:${i}"><i class="c${i}"></i><b></b><em></em></span>`).join('')}</div>`;
  if (kind === 'bills') return `<div class="ta ta-bills">${n(4).map(i => `<span class="ta-bill" style="--i:${i}"><i>${icon('check')}</i><b></b><em></em></span>`).join('')}</div>`;
  if (kind === 'ring') return `<div class="ta ta-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" class="ta-track"/><circle cx="60" cy="60" r="48" class="ta-fill" pathLength="100"/></svg><span>${icon('flag')}</span></div>`;
  // a statement going into the phone: the file drops in, and its rows come out sorted, ticked one after the other
  if (kind === 'file') return `<div class="ta ta-file"><span class="ta-doc"><b>OFX</b><i></i><i></i><i></i></span><span class="ta-arrow">${icon('right')}</span><span class="ta-rows">${n(3).map(i => `<span class="ta-frow" style="--i:${i}"><em class="c${i}"></em><b></b><i>${icon('check')}</i></span>`).join('')}</span></div>`;
  if (kind === 'bars') return `<div class="ta ta-bars">${[46, 70, 38, 88, 60, 96].map((h, i) => `<span style="--i:${i};--h:${h}%"${i === 5 ? ' class="on"' : ''}></span>`).join('')}</div>`;
  return `<div class="ta ta-cards">${n(3).map(i => `<span class="ta-card" style="--i:${i}"><i></i><b></b></span>`).join('')}</div>`;
}
function renderTour() {
  const box = $('tour-root'); if (!box) return;
  const r = UI.tour, x = r && tourText(r);
  document.documentElement.classList.toggle('tour-open', !!x);
  if (!x) { box.innerHTML = ''; return; }
  box.innerHTML = `<div id="tour" class="tour-page" role="dialog" aria-modal="true" aria-labelledby="tour-h" data-route="${r}">
    <button class="tour-x" data-a="tour-close" aria-label="${esc(t('Close'))}">${icon('x')}</button>
    <div class="tour-body">
      <div class="tour-art" aria-hidden="true">${tourArt(x.art)}</div>
      <p class="tour-eyebrow">${esc(routeLabel(r))}</p>
      <h1 id="tour-h" tabindex="-1">${x.title}</h1>
      <p class="tour-lead">${x.lead}</p>
      <ul class="tour-does">${x.does.map(([ic, s], i) => `<li style="--i:${i}"><span>${icon(ic)}</span>${s}</li>`).join('')}</ul>
    </div>
    <div class="tour-foot">${x.go ? `<button class="tour-go" data-a="tour-go" data-go="${x.go[0]}">${x.go[1]}</button><button class="tour-later" data-a="tour-close">${x.later || t('I’ll look around first')}</button>` : `<button class="tour-go" data-a="tour-close">${t('Got it')}</button>`}</div>
  </div>`;
  const h = $('tour-h'); if (h) h.focus({ preventScroll: true });
}
/** Seen: never shown again for this screen. */
function tourDone() { const r = UI.tour; if (!r) return; S.user.tours = { ...(S.user.tours || {}), [r]: true }; UI.tour = null; renderTour(); save(); }
const TOUR_ACTIONS = {
  'tour-close'() { tourDone(); },
  /** The screen's first thing, right after the page goes. */
  'tour-go'(ds) { tourDone(); const go = ds && ds.go; if (go && A[go]) A[go]({}); },
};
