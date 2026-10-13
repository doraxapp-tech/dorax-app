/* Dorax Finance — public page: the home page. */
// ---------- the home page ----------
// Second look, 2026-10-11 (owner, after a design canvas built from Wise's landing and eight references he sent: "La amé, push it").
// Light, warm and calm: a sage-white page, white cards, the app's own forest and lime, Inter as in the app, amounts with their cents drawn small.
// To feel like Dorax and not like any fintech, the pictures are Dorax's own pieces: the two sides (household and company), the days of freedom,
// the goal with its month, the dashed figure that explains itself. All built from HTML with example figures; they are decoration for people who
// can see them (aria-hidden), and the words beside each one say the same. Three things can be pressed in the page itself: the Household | Company
// choice over the phone, the calculator, and the four moments of the month. Everything is under .lp2 (css/public/landing-v2.css); the classes of
// the first look (.lp, .lp-hero, .bento ...) are not used, so their old rules do not reach this page.
// Example figures, the same everywhere on the page: income 6.000, fixed costs 4.160 and savings 600, so 1.240 is left this month; 2.015,40 still
// to pay (rent 1.600 on the 5th, electricity 186,30 on the 12th, ...); the trip at 68%, reached in February 2027; 107 days of freedom (three and a
// half months); the company keeps 8.400 with 153 days of runway (five months).
const l2Money = v => fmt.money(Math.round(v * 100), CUR);
/** An amount with its cents drawn small: "R$ 1.240" and ",00" (or ".00", in the number format chosen in Settings). */
const l2Amt = v => { const s = l2Money(v), m = /([.,]\d{2})$/.exec(s); return m ? `${esc(s.slice(0, m.index))}<small>${m[1]}</small>` : esc(s); };
const l2Go = (cls, label) => `<a class="l2-btn ${cls}" href="${PAGES.href('signup')}" data-a="pub-go" data-v="signup">${label || t('Start free')}</a>`;
const l2Eyebrow = (text, dark) => `<span class="l2-eyebrow${dark ? ' dark' : ''}"><i></i>${text}</span>`;
const l2Check = () => `<span class="l2-ck">${icon('check')}</span>`;
/** The logo's d alone, for the avatar of the phone: its ring with the lit quarter. */
const L2_D = '<svg viewBox="0 10 60 90" aria-hidden="true"><g fill="none" stroke-width="15"><circle cx="30" cy="70" r="22.5" stroke="#E8EBE6"/><path d="M7.5 70a22.5 22.5 0 0 1 22.5-22.5" stroke="#9FD182"/></g><rect x="45" y="10" width="15" height="90" fill="#E8EBE6"/></svg>';
/** The ring behind the phone: the logo's ring, with its top-left quarter lit. */
const l2Ring = cls => `<svg class="${cls}" viewBox="0 0 640 640" aria-hidden="true"><circle cx="320" cy="320" r="300"/><circle cx="320" cy="320" r="218"/><path d="M20 320A300 300 0 0 1 320 20"/></svg>`;

/** The phone of the hero, on the side chosen over it (UI.lpSide). The household: its days of freedom, what is left and what is still to pay,
    the trip with its month, the quick actions. The company, in its blue: its runway, its fixed costs and what is paid, its bills with their
    days (one in dollars: each company cost in its own currency), a goal. Drawn with the app's own runway figure and track (features/ahead/). */
function l2Phone(co) {
  const days = co ? 153 : 107, f = rwFigure(days, co), kd = (label, v) => `<div class="l2-kd"><small>${label}</small><b>${l2Amt(v)}</b></div>`;
  const tabs = `<div class="l2-tabs"><i class="on"></i><i></i><i class="plus">${icon('plus')}</i><i></i><i></i></div>`;
  const goal = (name, pct, ym) => `<div class="l2-pc"><div class="l2-prow"><span>${name}</span><span>${fmt.pct(pct)}</span></div><div class="l2-pbar"><i style="width:${pct}%"></i></div><small>${t('You get there in')} ${fmt.month(ym)}</small></div>`;
  const run = `<div class="l2-pc"><span class="l2-plbl">${co ? t('Company runway') : t('Days of freedom')}</span><div class="l2-pbig"><b>${fmt.num(f.n)}</b><span>${f.unit}</span></div>${rwTrack(days)}</div>`;
  const body = co
    ? `<div class="l2-phead"><span class="l2-ptag">${icon('briefcase')}${t('Company')}</span><span class="l2-phi"></span><span class="l2-pbell">${icon('bell')}</span></div>${run}
      <div class="l2-kds">${kd(t('Fixed costs'), 1130)}${kd(t('Paid so far'), 640)}</div>
      <div class="l2-pc l2-plist"><span>${t('Accountant')}<em>${t('day {d}', { d: 10 })}</em><b>${l2Money(189)}</b></span><span>${t('Taxes')}<em>${t('day {d}', { d: 20 })}</em><b>${l2Money(412)}</b></span><span>Software<em>${t('day {d}', { d: 28 })}</em><b>${fmt.money(2400, 'USD')}</b></span></div>
      ${goal(t('Taxes'), 80, '2026-12')}`
    : `<div class="l2-phead"><span class="l2-pav">${L2_D}</span><span class="l2-phi"><small>${t('Household')}</small>${t('Dashboard')}</span><span class="l2-pbell">${icon('bell')}</span></div>${run}
      <div class="l2-kds">${kd(t('Left this month'), 1240)}${kd(t('Still to pay'), 2015.4)}</div>
      ${goal(t('Trip'), 68, '2027-02')}
      <div class="l2-qa">${[['plus', t('Expense')], ['upload', t('Income')], ['target', t('Goal')], ['check', t('Pay')]].map(([i, l]) => `<span><i>${icon(i)}</i>${l}</span>`).join('')}</div>`;
  return `<div class="l2-phone${co ? ' co' : ''}" id="l2-phone" aria-hidden="true"><div class="l2-scr"><span class="l2-notch"></span>${body}${tabs}</div></div>`;
}
/** The Household | Company choice over the phone: one of the two pressed. */
const l2Seg = co => `<div class="l2-seg" role="group" aria-label="${t('Side shown on the phone')}">${[['home', 'home', t('Household')], ['co', 'briefcase', t('Company')]].map(([v, ic, label]) => `<button type="button" class="l2-sg ${v}" data-a="lp-side" data-v="${v}" aria-pressed="${(v === 'co') === co}">${icon(ic)}${label}</button>`).join('')}</div>`;
/** The hero's picture: the ring, the phone, and four pieces of the app around it. */
function l2Stage(co) {
  return `<div class="l2-stage" role="img" aria-label="${t('Example of the app on a phone, on the side chosen above: what is left this month, what is still to pay, and a goal with its date.')}">
    ${l2Ring('l2-ring')}${l2Phone(co)}
    <div class="l2-fl a" aria-hidden="true"><svg class="l2-gring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="18" stroke-dasharray="76.9 113.1" transform="rotate(-90 24 24)"/></svg><span><small>${t('Trip')} · ${t('You get there in')}</small><b>${fmt.month('2027-02')}</b></span></div>
    <div class="l2-fl b" aria-hidden="true"><span class="l2-pl">${icon('plus')}</span><p><b>${t('Tap any number')}</b> ${t('and Dorax tells you where it comes from.')}</p></div>
    <div class="l2-fl c" aria-hidden="true"><small>${t('Still to pay this month')}</small><b>${l2Amt(2015.4)}</b><div class="l2-mini"><span><i class="f"></i>${t('Rent')} · ${t('day {d}', { d: 5 })}<em>${l2Money(1600)}</em></span><span><i></i>${t('Electricity')} · ${t('day {d}', { d: 12 })}<em>${l2Money(186.3)}</em></span></div></div>
    <div class="l2-fl d" aria-hidden="true"><small>${t('Company and home, never mixed')}</small><div class="l2-mini"><span><i></i>${t('Household')}<em>${l2Money(1240)}</em></span><span><i class="b"></i>${t('Company')}<em>${l2Money(8400)}</em></span></div></div></div>`;
}
/** The four moments of the month (UI.lpMoment): the one pressed opens and shows how it looks in Dorax. */
function l2Moments() {
  const on = UI.lpMoment || 0, f = rwFigure(107);
  const ui = [
    `<span class="l2-mu-row">${t('1st payment')} · ${t('day {d}', { d: 5 })}<b>${t('Left over')} ${l2Money(820)}</b></span><span class="l2-mu-row">${t('2nd payment')} · ${t('day {d}', { d: 20 })}<b>${t('Left over')} ${l2Money(420)}</b></span>`,
    `<span class="l2-mu-note"><span class="l2-mu-ic">${icon('bell')}</span><span><b>${t('{name} is due tomorrow', { name: t('Electricity') })}</b>${l2Money(186.3)}</span><em>${t('Mark as paid')}</em></span>`,
    `<span class="l2-mu-big">${t('Trip')} · ${fmt.pct(68)}</span><span class="l2-mu-bar"><i style="width:68%"></i></span><span class="l2-mu-sm">${t('You get there in')} ${fmt.month('2027-02')}</span>`,
    `<span class="l2-mu-big">${fmt.num(f.n)} ${f.unit}</span>${rwTrack(107)}`,
  ];
  const cards = [
    ['coins', t('Payday'), t('Income in one or two payments a month, and what is left of each payment.')],
    ['bell', t('Before it is due'), t('Every bill in one list with its due day, and a reminder before it is due.')],
    ['target', t('Your goal, with a date'), t('Each goal with its plan, its progress and the month you get there.')],
    ['shield', t('If income stops'), t('How long you can hold out with what you have saved: your days of freedom.')],
  ];
  return cards.map(([ic, title, text], i) => `<button type="button" class="l2-mo${i === on ? ' on' : ''}" data-a="lp-moment" data-v="${i}" aria-pressed="${i === on}">
      <span class="l2-mo-ic">${icon(ic)}</span><span class="l2-mo-t">${title}</span><span class="l2-mo-p">${text}</span>
      ${i === on ? `<span class="l2-mo-ui">${ui[i]}</span>` : ''}<span class="l2-pill">${i === on ? t('How it looks in Dorax') : t('See how')}</span></button>`).join('');
}
/** "What's inside": four cards, each with a piece of the app floating in it and a title in two tones. */
function l2Bento() {
  const card = (cls, ill, strong, rest) => `<article class="l2-bx ${cls}" data-reveal="b-${cls.split(' ')[0]}">${ill}<h3 class="l2-bt"><span>${strong}</span> ${rest}</h3></article>`;
  const node = (cls, ic, label) => `<span class="l2-node ${cls}"><span class="l2-nd">${icon(ic)}</span>${label}</span>`;
  const sheet = `<div class="l2-ill imp" aria-hidden="true"><span class="l2-rg r1"></span><span class="l2-rg r2"></span>${node('n1', 'list', t('Your sheet'))}${node('n2', 'search', t('What it found'))}${node('n3 on', 'check', t('What you approve'))}
      <span class="l2-file"><span class="x">XLSX</span><span><b>2026.xlsx</b>${tn(12, '{n} month found', '{n} months found')}</span></span></div>`;
  const tip = `<div class="l2-ill cur" aria-hidden="true"><span class="l2-notice"><span class="l2-nt-ic">${icon('bulb')}</span><span class="l2-nt"><small>${t('Did you know?')}</small><b>${t('The FGC covers up to R$ 250.000 per person in each bank or financial group, and at most R$ 1 million every four years.')}</b><em>${t('Source: {name}', { name: 'FGC' })}</em></span></span>
      <span class="l2-whatif">${tn(3, 'With {amount} more a month, you get there {n} month sooner.', 'With {amount} more a month, you get there {n} months sooner.', { amount: l2Money(200) })}</span></div>`;
  const exp = `<div class="l2-ill exp" aria-hidden="true"><span class="l2-kd2 k1"><small>${t('Left this month')}</small><b>${l2Amt(1240)}</b><span class="l2-tap">${icon('plus')}</span></span><span class="l2-kd2 k2"><small>${t('Still to pay')}</small><b>${l2Amt(2015.4)}</b></span>
      <span class="l2-pop"><b>${t('Left this month')}</b><span>${t('Income')}<em>${l2Money(6000)}</em></span><span>− ${t('Fixed costs')}<em>${l2Money(4160)}</em></span><span>− ${t('Savings')}<em>${l2Money(600)}</em></span><span class="tot">=<em>${l2Money(1240)}</em></span></span></div>`;
  const fii = `<span class="l2-glow" aria-hidden="true"></span><div class="l2-ill fii" aria-hidden="true"><span class="l2-fb">${[42, 55, 48, 66, 60, 78].map((h, i) => `<i class="${i === 5 ? 'on' : ''}" style="height:${h}%"></i>`).join('')}</span>
      <span class="l2-fc f1"><small>${t('Income received')}</small><b>${l2Amt(312.4)}</b></span><span class="l2-fc f2"><small>${t('Average price')}</small><b>${l2Amt(98.72)}</b></span></div>`;
  return `<div class="l2-bento"><div class="l2-bcol">${card('sheet tall', sheet, t('Bring your sheet.'), t('Choose your .xlsx or .csv, see what Dorax found and import only what you approve.'))}${card('tip', tip, t('A fact a day.'), t('Ideas from your own numbers, and facts worth knowing.'))}</div>
    <div class="l2-bcol">${card('exp', exp, t('Numbers that explain themselves.'), t('Tap any figure and it tells you where it comes from.'))}${card('fii dark tall', fii, t('Your FIIs, in order.'), t('Record purchases, sales and income received. Dorax does not tell you what to buy or sell.'))}</div></div>`;
}

// ---------- "When do you get there?": the home page's own calculator ----------
/** 2026-10-07 (owner, after the read of Organizze and Mobills: "do phase 3": the piece neither of them has). A visitor picks a dream, says about
    how much it costs, what is already put aside and what is put aside each month, and reads the month it is reached: the same sum the app does
    (monthsToTarget, arrivalMonth and lever, core/runway.js), on the page, with no account. No investment return is assumed, and it says so.
    It is built from the first-time setup's own parts (obDreams, obSlide), so what is chosen here can be handed to that setup: the button keeps
    the dream, its cost and what is put aside on this device (CALC_KEY) and opens sign-up; the setup of a new account starts from them
    (calcCarry, read by freshOb in features/onboarding/onboarding.view.js). Nothing leaves the device before an account is created.
    Where the sliders start is not anybody's figures: a trip at the setup's own round cost, nothing put aside, and R$ 500 a month, which is what
    the setup's starting income leaves after its starting spending (OB_AVG). */
const CALC_KEY = 'dorax.calc', CALC_KEEP = 24 * 60 * 60 * 1000, CALC_MONTHLY_MAX = 5000, CALC_MARKS = 36;
const freshCalc = () => ({ dream: 'trip', cost: plain(obDreams().find(x => x[0] === 'trip')[4] * 100), costTouched: false, saved: plain(0), monthly: plain(OB_AVG.income - OB_AVG.spend) });
const calcState = () => UI.calc || (UI.calc = freshCalc());
/** What the fields say, in cents, and what follows from them. bad: something typed cannot be read as an amount. */
function calcLook() {
  const c = calcState(), amt = v => String(v || '').trim() === '' ? 0 : typedAmount(v), target = amt(c.cost), saved = amt(c.saved), monthly = amt(c.monthly);
  if ([target, saved, monthly].some(v => v === null || v < 0)) return { bad: true };
  const from = ymOf(S.today), months = target > 0 ? monthsToTarget(target, saved, monthly) : null;
  return { target, saved, monthly, from, months, covered: target > 0 && saved >= target, far: months !== null && months > 120,
    arrival: target > 0 && months ? arrivalMonth(target, saved, monthly, from) : null, lever: target > saved ? lever(target, saved, monthly) : null, in12: target > saved ? Math.ceil((target - saved) / 1200) * 100 : 0 };      // in whole reais, rounded up, so twelve of them are enough
}
/** The answer, in two parts: [the date and the way there, the tip and the note on how it is counted]. On a phone the first part sits above the
    sliders, in sight while one is dragged, and the second under them. Both are drawn again as the sliders move, without the page being drawn
    again under the person's fingers (calcShow, public.actions.js). */
function calcParts() {
  const L = calcLook(), money = v => fmt.money(v, CUR, { trim: true });
  const when = (label, big, line) => `<div class="calc-when">${label ? `<small>${label}</small>` : ''}<b class="calc-month">${big}</b><p>${line}</p></div>`;
  const sum = `<p class="note">${t('A simple sum: every month like this one, and no investment returns.')}</p>`;
  if (L.bad) return [when('', t('No date yet'), t('Enter the amount as a number, for example 1500 or 9,90.')), ''];
  if (!L.target) return [when('', t('No date yet'), t('Type about how much it costs, so I can put a date on it. A rough figure works.')), ''];
  if (L.covered) return [when('', t('Already covered'), t('What you have saved reaches what it costs.')), ''];
  if (L.months === null) return [when('', t('No date yet'), t('Put something aside each month and it gets a date. To get there in 12 months: {amount} a month.', { amount: money(L.in12) })), sum];
  const tip = L.lever ? `<div class="calc-tip">${icon('bulb')}<span>${tn(L.lever.sooner, 'With {amount} more a month, you get there {n} month sooner.', 'With {amount} more a month, you get there {n} months sooner.', { amount: money(L.lever.extra) })}</span><button type="button" class="btn sm" id="calc-try" data-a="calc-try">${t('Try it')}</button></div>` : '';
  if (L.far) return [when('', t('More than 10 years'), t('At this pace it is too far to put a date on it.')), tip + sum];
  // the way there: one mark for each month of putting aside (or for a few months, when there are more months than marks), the last one the month it is reached.
  // Since the second look (2026-10-11) each mark is drawn as a bar as tall as what is put aside by then (--k, a share of the way), the last one in forest.
  const per = Math.ceil(L.months / CALC_MARKS), marks = Math.ceil(L.months / per), pace = tn(L.months, 'At this pace you get there in {n} month.', 'At this pace you get there in {n} months.');
  return [`${when(t('You get there in'), fmt.month(L.arrival), pace)}
    <div class="calc-way" aria-hidden="true"><div class="calc-line">${Array.from({ length: marks }, (_, k) => `<i style="--k:${((k + 1) / marks).toFixed(3)}"></i>`).join('')}</div>
      <div class="calc-ends"><span>${fmt.month(L.from)}</span>${per > 1 ? `<span>${t('Each mark is {n} months.', { n: per })}</span>` : ''}<span>${fmt.month(L.arrival)}</span></div></div>`, tip + sum];
}
/** The whole tool: the dreams, the three amounts, the answer and the way in. */
function calcTool() {
  const c = calcState(), row = obDreams().find(x => x[0] === c.dream);
  return `<div class="calc-dreams"><div class="ob-dreams" role="group" aria-label="${t('Your first dream')}">${obDreams().map(([k, e, label]) => `<button type="button" class="ob-dream" data-a="calc-dream" data-v="${k}" aria-pressed="${c.dream === k}">${obIco(e)}<span>${label}</span></button>`).join('')}</div></div>
    <div class="calc-in">${obSlide('calc-cost', c.dream === 'safety' ? t('How much do you want to have put aside?') : t('How much does it cost, more or less?'), 'cost', c.cost, row[5], row[6], 'calc')}
      ${obSlide('calc-saved', t('Already saved'), 'saved', c.saved, OB_MAX.saved, 100, 'calc')}
      ${obSlide('calc-monthly', t('I put aside each month'), 'monthly', c.monthly, CALC_MONTHLY_MAX, 50, 'calc')}
      <p class="note">${t('The numbers are only where the sliders start. Move them to yours.')}</p></div>
    ${(([main, more]) => `<div class="calc-out" id="calc-out" aria-live="polite">${main}</div><div class="calc-more" id="calc-more">${more}</div>`)(calcParts())}
    <div class="calc-go"><button class="btn primary lg" data-a="calc-go">${t('Start with this goal')}</button><p class="note">${t('Free, no card. This goal is waiting for you when you create your account.')}</p></div>`;
}
/** What the calculator hands to the first-time setup of a new account: the dream, its cost and what is put aside, when they were kept on this
    device less than a day ago. Anything that cannot be read gives nothing, and the setup starts as it always did. */
function calcCarry() {
  try {
    const c = JSON.parse(localStorage.getItem(CALC_KEY) || 'null'); if (!c || !(Date.now() - c.at >= 0 && Date.now() - c.at < CALC_KEEP) || !obDreams().some(x => x[0] === c.dream)) return {};
    const cost = typedAmount(String(c.cost)), saved = typedAmount(String(c.saved)); if (!(cost > 0)) return {};
    return { dream: c.dream, cost: plain(cost), costTouched: true, ...(saved !== null && saved >= 0 ? { saved: plain(saved) } : {}) };
  } catch (e) { return {}; }
}


/** The home page. Order since 2026-10-11 (the design canvas the owner approved): hero with the phone and its Household | Company choice >
    three big true numbers > "your money, with a date" (the calculator) > the moments of the month > what's inside > for entrepreneurs (PJ) >
    how it works > your data > questions > closing call to action > footer. No two sections share a layout (owner, 2026-10-05). */
/** The website's bar, the same on every page of the website: the home page, the Help center, the blog, the pages for PJ, the converter and about
    (owner, 2026-10-13: "el menú principal es el viejo, no me lleva a ningún lugar"). The name; the capsule: the home page's sections (How it works,
    What's inside), the page for PJ and MEI, the blog and Help, the one on screen marked (pressed, it goes back to its own top); the language and the
    way in. On a narrower screen the capsule gives way to a menu button that opens the same links in a panel (with the language and the login on a
    phone). Opened from the app, the name and "Back to Dorax" only. Its own rules: css/public/web-pages.css. */
function l2Bar(cur, langId) {
  if (UI.session) return `<div class="l2-nav web-nav web-in-app">${brandMark()}<div class="lp-actions l2-actions"><button type="button" class="l2-btn lime sm" data-a="${cur === 'blog' ? 'blog-close' : 'help-close'}">${icon('left')}${t('Back to Dorax')}</button></div></div>`;
  const go = (id, label) => `<button type="button" class="l2-link" data-a="pub-scroll" data-id="${id}">${label}</button>`;
  const page = (v, label, home) => `<a class="l2-link" href="${PAGES.href(v)}" ${cur === v ? `data-a="${home}" aria-current="page"` : `data-a="pub-go" data-v="${v}"`}>${label}</a>`;
  const links = () => `${go('lp-how', t('How it works'))}${go('lp-what', t('What’s inside'))}${page('pj', t('For PJ'), 'web-top')}${page('blog', t('Blog'), 'blog-home')}${page('help', t('Help'), 'hc-home')}`;
  const burger = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  return `<div class="l2-nav web-nav"><a class="web-brand" href="${PAGES.href('landing')}" data-a="pub-go" data-v="landing" aria-label="${esc(t('Home'))}">${brandMark()}</a>
    <nav class="l2-links" aria-label="${t('Sections')}">${links()}</nav>
    <div class="lp-actions l2-actions">${langPill(langId || 'web-lang')}<a class="l2-in" href="${PAGES.href('login')}" data-a="pub-go" data-v="login">${t('Log in')}</a>${l2Go('lime sm')}
      <button type="button" class="web-menu-btn" data-a="web-menu" aria-expanded="false" aria-controls="web-menu" aria-label="${esc(t('Menu'))}">${burger}</button></div>
    <div class="web-menu" id="web-menu" hidden><nav class="web-menu-links" aria-label="${t('Sections')}">${links()}${go('lp-faq', t('Questions'))}</nav>
      <div class="web-menu-foot"><a class="l2-btn white sm" href="${PAGES.href('login')}" data-a="pub-go" data-v="login">${t('Log in')}</a><span class="web-menu-lang">${icon('globe')}${langSelect('web-menu-lang', true)}</span></div></div></div>`;
}
/** The website's footer: the home page's, the Help center's and the blog's. Opened from the app (app), only what is there for someone already
    in: the legal texts in a panel, the Help center, the blog and the form to write. */
function l2Foot(app) {
  const go = (id, label) => `<button class="l2-link" data-a="pub-scroll" data-id="${id}">${label}</button>`;
  const page = (v, label) => app ? `<button type="button" class="l2-link" data-a="${v === 'contact' || v === 'help' || v === 'blog' ? v : 'legal'}" data-v="${v}">${label}</button>` : `<a class="l2-link" href="${PAGES.href(v)}" data-a="pub-go" data-v="${v}">${label}</a>`;
  return `<footer class="l2-foot"><div class="l2-wrap">
    <div class="l2-ft-top">
      <div class="l2-ft-brand">${brandMark(true)}<p>${t('Your money, organized clearly enough to make better decisions yourself.')}</p>
        ${app ? '' : `<div class="l2-ft-lang">${icon('globe')}${langSelect('ft-lang', true)}</div>`}</div>
      <nav class="l2-ft-cols" aria-label="${t('Footer')}">
        ${app ? '' : `<div><h3>${t('Product')}</h3><ul><li>${go('lp-how', t('How it works'))}</li><li>${go('lp-what', t('What’s inside'))}</li><li>${page('pj', t('For PJ and MEI'))}</li><li>${page('converter', t('Statement converter'))}</li><li>${go('lp-faq', t('Questions'))}</li></ul></div>
        <div><h3>${t('Account')}</h3><ul><li>${page('signup', t('Create account'))}</li><li>${page('login', t('Log in'))}</li></ul></div>`}
        <div><h3>${t('Legal')}</h3><ul><li>${page('privacy', t('Privacy policy'))}</li><li>${page('terms', t('Terms of use'))}</li></ul></div>
        <div><h3>${t('Help')}</h3><ul><li>${page('help', t('Help center'))}</li><li>${page('blog', t('Blog'))}</li>${app ? '' : `<li>${page('about', t('About Dorax'))}</li>`}<li>${page('contact', t('Contact form'))}</li></ul></div>
      </nav></div>
    <div class="l2-ft-bottom"><p>© 2026 Dorax Finance</p>
      <p>${t('Dorax organises information about your own money. It is not financial, tax or accounting advice.')} ${t('Contabilizei and the banks named on this page belong to their owners. Dorax is independent of them.')}</p></div></div></footer>`;
}
/** The two sides, home and company, side by side: the home page's PJ section and the page for PJ and MEI (features/site/site-pages.view.js). */
const l2Sides = () => `<div class="l2-sides" aria-hidden="true">
        <div class="l2-side co"><span class="l2-stag">${icon('briefcase')}${t('Company')}</span><span class="l2-slbl">${t('Company reserve')}</span><b class="l2-samt">${l2Amt(8400)}</b>
          <div class="l2-srows"><span>${t('Accountant')} · ${t('day {d}', { d: 10 })}<em>${l2Money(189)}</em></span><span>Software · ${t('day {d}', { d: 28 })}<em>${fmt.money(2400, 'USD')}</em></span></div><span class="l2-sfoot">${t('Each cost in its own currency: reais or dollars.')}</span></div>
        <div class="l2-join"><i>${icon('right')}</i>${t('You pay yourself')}</div>
        <div class="l2-side home"><span class="l2-stag">${icon('home')}${t('Household')}</span><span class="l2-slbl">${t('Left this month')}</span><b class="l2-samt">${l2Amt(1240)}</b>
          <div class="l2-srows"><span>${t('Rent')} · ${t('day {d}', { d: 5 })}<em>${l2Money(1600)}</em></span><span>${t('Groceries')}<em>${l2Money(980)}</em></span></div><span class="l2-sfoot">${t('Household totals, the plan and the reports count only household money.')}</span></div></div>`;
/** What a company's side gives: the home page's PJ section and the page for PJ and MEI. */
function l2PjList() {
  const pj = [
    [t('Company and home, never mixed'), t('Household totals, the plan and the reports count only household money.')],
    [t('A plan for income that changes'), t('Set your income month by month and see what is left.')],
    [t('Home bills do not wait for invoices'), t('Due days and reminders, whatever day a client pays.')],
    [t('The month-end your accountant asks for'), t('The list of statements to send, and the bank’s file turned into OFX.')],
  ];
  return `<ul class="l2-pj-list">${pj.map(([title, text], i) => `<li data-reveal="pj-${i}">${l2Check()}<span><b>${title}</b> ${text}</span></li>`).join('')}</ul>`;
}
function viewLanding() {
  const co = UI.lpSide === 'co', go = (id, label) => `<button class="l2-link" data-a="pub-scroll" data-id="${id}">${label}</button>`;
  const steps = [
    ['upload', t('Add your financial information'), t('Accounts, income, fixed costs and goals. Type or import.')],
    ['calendar', t('Build your monthly plan'), t('What you expect to earn, pay and save.')],
    ['list', t('Track what actually happened'), t('Mark bills as paid and sort them into categories.')],
    ['target', t('See when you get there'), t('Planned against actual, and the date of each goal.')],
  ];
  // nine questions, in the order the doubts come up (2026-10-07): is it free, the bank, the phone, then the rest. "No ads, data not sold" is the owner's commitment.
  const faq = [
    LP_PLANS ? [t('How much does it cost, and can I cancel?'), t('Free costs R$ 0. Plus is R$ 7,99 a month or R$ 79,90 a year; Premium is R$ 14,99 a month or R$ 149,90 a year. Cancel whenever you want: the plan stays active until the end of the period you already paid for.')]
      : [t('Is it really free?'), t('Yes, for now: Dorax is free, no card is asked for and nothing is charged. There are no ads and your data is not sold. Paid plans may come later; nothing is charged unless you choose one.')],
    [t('Do I have to connect my bank?'), t('No. Your bank password is never asked for. You type what you want or import a file.')],
    [t('Does it work on my phone?'), t('Yes. Dorax opens in the browser of a phone or a computer, with the same account. On a phone you can add it to the home screen and open it like an app; there is nothing to download from a store.')],
    [t('Can I bring my spreadsheet and my bank statements?'), t('Yes. A spreadsheet in .xlsx or .csv, with the months across the top or down the side, and bank statements in CSV or OFX. You see what was found and import only what you approve; rows you already have are flagged as possible duplicates.')],
    [t('Where is my data, and can I delete it?'), t('In your account, on Dorax’s server, the same on every device. In Settings you can download a backup, delete all your data or delete the account.')],
    [t('How do I log in, and how am I reminded?'), t('You log in with your email and a password, or with your Google account. Reminders come in the app, by email and, if you turn them on, as notifications on your phone or computer. You can also download a calendar file.')],
    [t('How does the bank statement converter work?'), t('You choose the statement as your bank gives it (CSV, Excel, PDF and the other usual formats), confirm what was read, and download an OFX file whose format was checked. A scanned PDF, which is a picture, cannot be read. Nothing is sent to your accountant for you. Files made this way were imported in Contabilizei in October 2026 without errors; that is our own test, not a statement by Contabilizei.')],
    [t('Does Dorax give financial advice?'), t('No. Dorax organises your own numbers. It gives no financial, tax or investment advice, does not tell you what to buy, sell or save, and does not replace an accountant. Investment figures are a record of what you typed, not market values.')],
    [t('Does it work outside Brazil?'), t('The plan, the fixed costs and the goals work anywhere, and the main currency can be reais, dollars, euros or Cuban pesos. Investments are built for Brazilian FIIs and the converter for Brazilian accounting.')],
  ];
  const band = (cls, num, text, tag) => `<div class="l2-band-w ${cls}"><div class="l2-band"><div class="l2-wrap l2-band-in"><span class="l2-num">${num}</span><p>${text}</p><span class="l2-tag">${tag}</span></div></div></div>`;
  const contact = `<a class="linkbtn" href="${PAGES.href('contact')}" data-a="pub-go" data-v="contact">${t('contact form')}</a>`;
  return `<div class="lp2">
  <header class="l2-top"><div class="l2-wrap">
    ${l2Bar('landing', 'lp-lang')}
    <section class="l2-hero"><div class="l2-copy">${l2Eyebrow(t('For your home, and for your PJ or MEI'))}
        <h1 class="l2-h1">${t('Home & company.')} <span class="hl">${t('One plan.')}</span></h1>
        <p class="l2-lead">${t('Home money and company money in one place, never mixed.')} ${t('And with a date for what you want.')}</p>
        <div class="l2-cta">${l2Go('lime lg')}<button class="l2-btn white lg" data-a="pub-scroll" data-id="lp-how">${t('How it works')}${icon('right')}</button></div>
        <p class="l2-trust">${t('Free · No card · Your bank password is never asked for')}</p></div>
      <div class="l2-seg-row">${l2Seg(co)}</div>${l2Stage(co)}</section>
  </div></header>
  <main>
    <section class="l2-bands" aria-label="${t('Dorax in three numbers')}">
      ${band('b1', '0', t('bank passwords asked of you. You type or import what you want.'), t('never'))}
      ${band('b2', '2', t('sides in one account: home and company, never mixed.'), t('home + PJ'))}
      ${band('b3', 'R$&nbsp;0', t('to start. No card, no ads, and your data is not sold.'), t('free'))}</section>
    <section class="l2-sec" id="lp-calc"><div class="l2-wrap"><div class="l2-calc">
      <div class="l2-calc-h">${l2Eyebrow(t('Look ahead'))}<h2 class="l2-h2">${t('Your money, with a date.')}</h2><p class="l2-sub">${t('Seeing what you already spent helps. Knowing when you get there changes the month.')} ${t('Pick a dream and move the numbers. It is the same sum Dorax does with yours.')}</p></div>
      <div class="calc" id="calc-tool">${calcTool()}</div></div></div></section>
    <section class="l2-sec l2-sec-mo" id="lp-days"><div class="l2-wrap"><div class="l2-mo-panel" data-reveal="moments">
      <div class="l2-mo-head"><div><h2 class="l2-h2">${t('Your money, on the days that matter.')}</h2><p class="l2-sub">${t('Tap a moment of the month and see how it looks in Dorax.')}</p></div>${l2Go('forest')}</div>
      <div class="l2-mo-row" id="l2-moments">${l2Moments()}</div></div></div></section>
    <section class="l2-sec l2-white" id="lp-what"><div class="l2-wrap">
      <div class="l2-sec-h">${l2Eyebrow(t('What’s inside'))}<h2 class="l2-h2">${t('Your whole month, in one place.')}</h2></div>${l2Bento()}</div></section>
    <section class="l2-pj" id="lp-pj"><div class="l2-wrap">
      <div class="l2-sec-h light">${l2Eyebrow(t('For people with a company (PJ or MEI)'), true)}<h2 class="l2-h2">${t('Company pays you. Home needs a plan.')}</h2><p class="l2-sub">${t('When you pay yourself from your own company, home money and company money blur. In Dorax each one has its own side.')}</p></div>
      ${l2Sides()}
      ${l2PjList()}
      <div class="l2-pj-go">${l2Go('lime lg')}<a class="l2-btn white lg" href="${PAGES.href('pj')}" data-a="pub-go" data-v="pj">${t('See the company’s side')}${icon('right')}</a></div></div></section>
    <section class="l2-sec" id="lp-how"><div class="l2-wrap"><div class="l2-steps">
      <div class="l2-steps-l">${l2Eyebrow(t('How it works'))}<h2 class="l2-h2">${t('Four steps, no detours.')}</h2><p class="l2-sub">${t('A clear path from raw transactions to a usable picture of your month.')}</p></div>
      <ol class="l2-steps-r">${steps.map(([ic, title, text], i) => `<li class="l2-st s${i + 1}" data-reveal="st-${i}"><span class="l2-st-c">${icon(ic)}</span><span class="l2-st-p"><b>${i + 1}. ${title}</b><span>${text}</span></span></li>`).join('')}</ol></div></div></section>
    <section class="l2-trustsec" id="lp-data"><div class="l2-wrap">
      <div class="l2-sec-h light">${l2Eyebrow(t('Your data'), true)}<h2 class="l2-h2">${t('Your money is yours. Your data too.')}</h2><p class="l2-sub">${t('Dorax organises what you type or import. Nothing more.')}</p></div>
      <div class="l2-tr-grid">${[['lock', t('No bank password'), t('You do not have to connect your bank. The workflow is based on information you enter and files you choose to import.')], ['archive', t('Your files are not uploaded'), t('Sheets and statements open in your browser to be read. Only the rows you accept become your data.')], ['eyeoff', t('No ads'), t('Your data is not sold or used for advertising.')]].map(([ic, title, text], i) => `<div class="l2-tc" data-reveal="tc-${i}"><span class="l2-tc-ic">${icon(ic)}</span><h3>${title}</h3><p>${text}</p></div>`).join('')}</div>
      <div class="l2-tr-wide" data-reveal="key"><div><h3 class="l2-h3w">${t('You hold the key.')}</h3><ul class="l2-tr-list">${[t('Download a backup of everything whenever you want.'), t('Delete your data or your account from Settings.'), t('Your password is stored encrypted, never as you typed it.')].map(x => `<li>${l2Check()}${x}</li>`).join('')}</ul></div>
        <div class="l2-lock" aria-hidden="true"><span class="c1"><span class="c2">${icon('lock')}</span></span></div></div>
      <p class="l2-disc">${t('Dorax organises information about your own money. It is not financial, tax or accounting advice.')}</p></div></section>
    <section class="l2-sec" id="lp-faq"><div class="l2-wrap"><div class="l2-faq-grid">
      <div class="l2-faq-l">${l2Eyebrow(t('Questions'))}<h2 class="l2-h2">${t('Questions before you start')}</h2><p class="l2-sub">${t('Use the {form}. It works without logging in.', { form: contact })}</p></div>
      <div class="l2-faq">${faq.map(([q, a]) => `<details><summary>${q}<span class="l2-pm">${icon('plus')}</span></summary><p>${a}</p></details>`).join('')}</div></div></div></section>
    <section class="l2-end"><div class="l2-wrap"><div class="l2-end-box"><h2 class="l2-h2">${t('Make sense of the numbers you have.')}</h2>
      <div class="l2-end-r">${l2Go('forest lg')}<p>${t('Free')} · ${t('No card')}</p></div></div></div></section>
  </main>
  ${l2Foot()}</div>`;
}
