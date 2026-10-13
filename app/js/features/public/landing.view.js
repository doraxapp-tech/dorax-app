/* Dorax Finance — public page: the home page. */
// ---------- the home page ----------
// Second look, 2026-10-11 (owner, after a design canvas built from Wise's landing and eight references he sent: "La amé, push it"): light, warm
// and calm, a sage-white page, white cards, the app's own forest and lime, Inter as in the app, amounts with their cents drawn small.
// Third look, v213, 2026-10-13 (the canvas "Landing Dorax con personajes", approved: "publish"): the page is drawn around Dorax's people and things
// (js/ui/art.js), in the style of the page About us. The pieces of the app on it (the moments of the month, what's inside, the two sides, the
// calculator's answer) are built from HTML with example figures; they are pictures for people who can see them (aria-hidden), and the words beside
// each one say the same. Three things can be pressed in the page itself: the four moments of the month, the calculator's buttons, and the questions.
// Everything is under .lp2 (css/public/landing-v2.css).
// Example figures, the same everywhere on the page: income 6.000, fixed costs 4.160 and savings 600, so 1.240 is left this month; 2.015,40 still
// to pay (rent 1.600 on the 5th, electricity 186,30 on the 12th, ...); the trip at 68%, reached in February 2027; 107 days of freedom (three and a
// half months); the company keeps 8.400.
const l2Money = v => fmt.money(Math.round(v * 100), CUR);
/** An amount with its cents drawn small: "R$ 1.240" and ",00" (or ".00", in the number format chosen in Settings). */
const l2Amt = v => { const s = l2Money(v), m = /([.,]\d{2})$/.exec(s); return m ? `${esc(s.slice(0, m.index))}<small>${m[1]}</small>` : esc(s); };
const l2Go = (cls, label) => `<a class="l2-btn ${cls}" href="${PAGES.href('signup')}" data-a="pub-go" data-v="signup">${label || t('Start free')}</a>`;
const l2Eyebrow = (text, dark) => `<span class="l2-eyebrow${dark ? ' dark' : ''}"><i></i>${text}</span>`;
const l2Check = () => `<span class="l2-ck">${icon('check')}</span>`;

/** The people at the top (v213: the home page drawn around the people, the design canvas the owner approved on 2026-10-13, "publish"): five
    of them in a row (owner: "reduce el monto de ilustraciones aquí a 5, quita las dos de las esquinas"), with a lime shadow ("cambia el estilo a sombra
    lima"), each with a piece of their month over their head. A picture (aria-hidden): the words above say it. */
function l2Cast() {
  const f = rwFigure(107);
  const p = (who, cls, chip, low) => `<span class="l2-p${cls ? ' ' + cls : ''}">${chip ? `<span class="l2-chip${low ? ' low' : ''}"><small>${chip[0]}</small><b>${chip[1]}</b></span>` : ''}${artFig(who, '', 'shadow')}</span>`;
  return `<div class="l2-cast" aria-hidden="true">${p('coffee', '', [t('Days of freedom'), f.span])}${p('phone', '', [t('{name} is due tomorrow', { name: t('Electricity') }), l2Money(186.3)], true)}${p('laptop', 'big', [t('Company reserve'), l2Money(8400)])}${p('win', '', [`${t('Trip')} · ${t('You get there in')}`, fmt.month('2027-02')], true)}${p('idea', '', [t('Left this month'), l2Money(1240)])}</div>`;
}
/** "Is one of these you?": the three situations Dorax was born from (the story on the page About us), each a person with a lime shadow
    (owner: "usa la versión de sombra lima aquí") and the thing it is about at its corner. */
function l2Who() {
  const card = (who, thing, title, text, i) => `<article class="l2-who-c" data-reveal="who-${i}">${artFig(who, thing, 'shadow')}<div><h3>${title}</h3><p>${text}</p></div></article>`;
  return `<div class="l2-who">${[
    ['paper', 'table', t('You live in a spreadsheet'), t('Tabs, formulas and colours. Bring your .xlsx or .csv as it is and choose what to import.')],
    ['idea', 'coins', t('You get paid on one or two dates'), t('Order the month by payday: what is left of each payment and what is still to pay.')],
    ['laptop', 'briefcase', t('You have a PJ or MEI'), t('The company and the home, each on its own side and never mixed. And the statement for your accountant, in OFX.')],
  ].map((c, i) => card(...c, i)).join('')}</div>`;
}
/** The four moments of the month (UI.lpMoment): the one pressed opens and shows how it looks in Dorax. Since v213 each one is one of Dorax's
    things (js/ui/art.js), not an icon of the app (owner: "los iconos que creaste"). */
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
    ['bell-ringing', t('Before it is due'), t('Every bill in one list with its due day, and a reminder before it is due.')],
    ['flag-banner', t('Your goal, with a date'), t('Each goal with its plan, its progress and the month you get there.')],
    ['hourglass-medium', t('If income stops'), t('How long you can hold out with what you have saved: your days of freedom.')],
  ];
  return cards.map(([thing, title, text], i) => `<button type="button" class="l2-mo${i === on ? ' on' : ''}" data-a="lp-moment" data-v="${i}" aria-pressed="${i === on}">
      <span class="l2-mo-ic">${artObj(thing)}</span><span class="l2-mo-t">${title}</span><span class="l2-mo-p">${text}</span>
      ${i === on ? `<span class="l2-mo-ui">${ui[i]}</span>` : ''}<span class="l2-pill">${i === on ? t('How it looks in Dorax') : t('See how')}</span></button>`).join('');
}
/** "What's inside": four cards, each with a piece of the app floating in it and a title in two tones. Its little pictures are Dorax's things
    since v213, the spreadsheet file among them (made for it: "y este icono? si no hay créalo"). */
function l2Bento() {
  const card = (cls, ill, strong, rest) => `<article class="l2-bx ${cls}" data-reveal="b-${cls.split(' ')[0]}">${ill}<h3 class="l2-bt"><span>${strong}</span> ${rest}</h3></article>`;
  const node = (cls, thing, label) => `<span class="l2-node ${cls}"><span class="l2-nd">${artObj(thing)}</span>${label}</span>`;
  const sheet = `<div class="l2-ill imp" aria-hidden="true"><span class="l2-rg r1"></span><span class="l2-rg r2"></span>${node('n1', 'table', t('Your sheet'))}${node('n2', 'list-checks', t('What it found'))}${node('n3 on', 'seal-check', t('What you approve'))}
      <span class="l2-file"><span class="x">${artObj('file-xls')}</span><span><b>2026.xlsx</b>${tn(12, '{n} month found', '{n} months found')}</span></span></div>`;
  const tip = `<div class="l2-ill cur" aria-hidden="true"><span class="l2-notice"><span class="l2-nt-ic">${artObj('lightbulb')}</span><span class="l2-nt"><small>${t('Did you know?')}</small><b>${t('The FGC covers up to R$ 250.000 per person in each bank or financial group, and at most R$ 1 million every four years.')}</b><em>${t('Source: {name}', { name: 'FGC' })}</em></span></span>
      <span class="l2-whatif">${tn(3, 'With {amount} more a month, you get there {n} month sooner.', 'With {amount} more a month, you get there {n} months sooner.', { amount: l2Money(200) })}</span></div>`;
  const exp = `<div class="l2-ill exp" aria-hidden="true"><span class="l2-kd2 k1"><small>${t('Left this month')}</small><b>${l2Amt(1240)}</b><span class="l2-tap">${artObj('chat-circle-dots')}</span></span><span class="l2-kd2 k2"><small>${t('Still to pay')}</small><b>${l2Amt(2015.4)}</b></span>
      <span class="l2-pop"><b>${t('Left this month')}</b><span>${t('Income')}<em>${l2Money(6000)}</em></span><span>− ${t('Fixed costs')}<em>${l2Money(4160)}</em></span><span>− ${t('Savings')}<em>${l2Money(600)}</em></span><span class="tot">=<em>${l2Money(1240)}</em></span></span></div>`;
  const fii = `<span class="l2-glow" aria-hidden="true"></span><div class="l2-ill fii" aria-hidden="true"><span class="l2-fb">${[42, 55, 48, 66, 60, 78].map((h, i) => `<i class="${i === 5 ? 'on' : ''}" style="height:${h}%"></i>`).join('')}</span>
      <span class="l2-fc f1"><small>${t('Income received')}</small><b>${l2Amt(312.4)}</b></span><span class="l2-fc f2"><small>${t('Average price')}</small><b>${l2Amt(98.72)}</b></span></div>`;
  return `<div class="l2-bento"><div class="l2-bcol">${card('sheet tall', sheet, t('Bring your sheet.'), t('Choose your .xlsx or .csv, see what Dorax found and import only what you approve.'))}${card('tip', tip, t('A fact a day.'), t('Ideas from your own numbers, and facts worth knowing.'))}</div>
    <div class="l2-bcol">${card('exp', exp, t('Numbers that explain themselves.'), t('Tap any figure and it tells you where it comes from.'))}${card('fii dark tall', fii, t('Your FIIs, in order.'), t('Record purchases, sales and income received. Dorax does not tell you what to buy or sell.'))}</div></div>`;
}
/** How it works, in three steps (owner: "reduce a 3"), each a person with the thing it is about. */
function l2Steps() {
  const steps = [
    ['coffee', 'sliders-horizontal', t('Create your account and tell it your numbers'), t('With your email or with Google, free and with no card. What comes in, what you spend, what you save and what dream you have.')],
    ['phone', 'bell-ringing', t('Build your month and Dorax reminds you'), t('Payments, fixed bills with their due day, and goals. Before each due day it reminds you in the app, by email or with a notification.')],
    ['win', 'flag-banner', t('Look ahead'), t('Each goal with its date and your days of freedom: how long you hold out if income stops.')],
  ];
  return `<ol class="l2-steps3">${steps.map(([who, thing, title, text], i) => `<li class="l2-step" data-reveal="st-${i}">${artFig(who, thing)}<span class="l2-no">${t('Step {n}', { n: i + 1 })}</span><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>`;
}
/** Home and company on the home page (owner: "busca una estructura mejor para expresar esto"): each side says what it does for you, and between
    them the person with the company pays themself. The company's side is white (owner: "haz esto en tema blanco") with a lime tag ("cambia x
    lima"); the figures are an example, so they are hidden from a screen reader and the sentences carry the meaning. The page for PJ and MEI keeps
    its own two sides (l2Sides). */
function l2HomeCo() {
  const feat = (thing, title, text) => `<li>${artObj(thing, 'l2-hc-ic')}<span><b>${title}</b>${text}</span></li>`;
  const side = (cls, thing, tag, label, amount, feats) => `<div class="l2-hc-side ${cls}"><span class="l2-hc-tag">${artObj(thing)}${tag}</span><span class="l2-hc-fig" aria-hidden="true"><span class="l2-hc-lbl">${label}</span><b class="l2-hc-amt">${l2Amt(amount)}</b></span><ul class="l2-hc-feats">${feats}</ul></div>`;
  return `<div class="l2-hc">
      ${side('co', 'briefcase', t('Company'), t('Company reserve'), 8400, feat('currency-circle-dollar', t('Each cost in its own currency'), t('The accountant in reais, the software in dollars.')) + feat('file-arrow-down', t('The month-end your accountant asks for'), t('The list of statements to send, and the bank’s file turned into OFX.')))}
      <div class="l2-hc-join">${artFig('laptop', 'coins')}<span class="l2-hc-say"><i aria-hidden="true">${icon('right')}</i>${t('You pay yourself')}</span><span class="l2-hc-note">${t('Never mixed: the home counts only the home’s money.')}</span></div>
      ${side('home', 'house', t('Household'), t('Left this month'), 1240, feat('chart-bar', t('A plan for income that changes'), t('Set your income month by month and see what is left.')) + feat('bell-ringing', t('Home bills do not wait for invoices'), t('Due days and reminders, whatever day a client pays.')))}</div>`;
}
/** The blog on the home page (owner: "agrega una sección para los blogs llamada: Fique por dentro das novidades"): the newest post of each
    kind, as the blog's own cards (features/blog/blog.view.js), and the way to all of them. */
function l2Blog() {
  const posts = ['news', 'tips', 'curiosities'].map(c => BLOG_POSTS.find(p => p.cat === c)).filter(Boolean);
  return `<div class="l2-bl-head">${artFig('idea', 'book-open', 'l2-bl-fig')}<div class="l2-bl-copy">${l2Eyebrow(t('Dorax blog'))}<h2 class="l2-h2">${t('Stay on top of what’s new')}</h2><p class="l2-sub">${t('Tips to organise your month, news that touches your pocket and curiosities about money in Brazil. With dates and sources.')}</p></div>
      <a class="l2-btn forest" href="${PAGES.href('blog')}" data-a="pub-go" data-v="blog">${t('See the whole blog')}</a></div>
    <div class="bl-grid l2-bl-grid">${posts.map(blogCard).join('')}</div>`;
}

// ---------- "When do you get there?": the home page's own calculator ----------
/** 2026-10-07 (owner, after the read of Organizze and Mobills: "do phase 3": the piece neither of them has). A visitor picks a dream and how
    much is put aside each month, and reads the month it is reached: the same sum the app does (monthsToTarget and arrivalMonth, core/runway.js),
    on the page, with no account. No investment return is assumed, and it says so. Since v213 (owner: "demasiado larga esta sección") it is two
    rows of buttons, as the approved canvas: the four dreams of the first-time setup, at the setup's own round cost (obDreams), and three amounts
    a month. The button keeps the dream and its cost on this device (CALC_KEY) and opens sign-up; the setup of a new account starts from them
    (calcCarry, read by freshOb in features/onboarding/onboarding.view.js). Nothing leaves the device before an account is created.
    It starts on a trip and R$ 500 a month, which is what the setup's starting income leaves after its starting spending (OB_AVG). */
const CALC_KEY = 'dorax.calc', CALC_KEEP = 24 * 60 * 60 * 1000, CALC_BARS = 12;
/** The dreams as the calculator names them (short, on one row): [the setup's dream, Dorax's thing, the name]; and the amounts a month, in reais. */
const calcDreams = () => [['car', 'car-profile', t('Car')], ['trip', 'airplane-tilt', t('Trip')], ['safety', 'shield-check', t('Emergencies')], ['other', 'sparkle', t('Another dream')]];
const CALC_MONTHLY = [300, 500, 1000];
const freshCalc = () => ({ dream: 'trip', cost: plain(obDreams().find(x => x[0] === 'trip')[4] * 100), saved: plain(0), monthly: plain(OB_AVG.income - OB_AVG.spend) });
const calcState = () => UI.calc || (UI.calc = freshCalc());
/** What was chosen, in cents, and what follows from it. */
function calcLook() {
  const c = calcState(), amt = v => String(v || '').trim() === '' ? 0 : typedAmount(v), target = amt(c.cost), saved = amt(c.saved), monthly = amt(c.monthly);
  if ([target, saved, monthly].some(v => v === null || v < 0)) return { bad: true };
  const from = ymOf(S.today), months = target > 0 ? monthsToTarget(target, saved, monthly) : null;
  return { target, saved, monthly, from, months, far: months !== null && months > 120, arrival: target > 0 && months ? arrivalMonth(target, saved, monthly, from) : null };
}
/** The answer: the month, the pace, what it costs and what is put aside, and the way there: one bar for each month of putting aside (or for a
    few months, when there are more than twelve), each as tall as what is put aside by then, the last one in forest; and at its end, the person
    who got there. A date more than ten years away is not printed. */
function calcAnswer() {
  const L = calcLook(), money = v => fmt.money(v, CUR, { trim: true });
  const cost = `<p class="l2-cost">${t('It costs {cost} · you put aside {amount} a month', { cost: money(L.target || 0), amount: money(L.monthly || 0) })}</p>`;
  const note = `<p class="l2-cnote">${t('It is the same sum Dorax does with your goals.')} ${t('A simple sum: every month like this one, and no investment returns.')}</p>`;
  if (L.bad || !L.months || L.far) return `<small>${t('You get there in')}</small><b class="calc-month">${t('More than 10 years')}</b><p class="l2-pace">${t('At this pace it is too far to put a date on it.')}</p>${cost}${note}`;
  const per = Math.ceil(L.months / CALC_BARS), bars = Math.ceil(L.months / per);
  return `<small>${t('You get there in')}</small><b class="calc-month">${fmt.month(L.arrival)}</b><p class="l2-pace">${tn(L.months, 'At this pace you get there in {n} month.', 'At this pace you get there in {n} months.')}</p>${cost}
    <div class="l2-run"><div class="l2-run-bars"><div class="calc-line" aria-hidden="true">${Array.from({ length: bars }, (_, k) => `<i style="--k:${((k + 1) / bars).toFixed(3)}"></i>`).join('')}</div>
      <div class="calc-ends" aria-hidden="true"><span>${fmt.month(L.from)}</span><span>${fmt.month(L.arrival)}</span></div></div>${artFig('win', 'calendar-check', 'l2-calc-fig')}</div>${note}`;
}
/** The whole tool, drawn again when a button is pressed (calcDraw, public.actions.js): the dreams, the amounts, the way in, and the answer. */
function calcTool() {
  const c = calcState(), monthly = typedAmount(c.monthly);
  const chip = (a, v, on, label, thing) => `<button type="button" class="l2-pick${thing ? '' : ' amt'}" data-a="${a}" data-v="${v}" aria-pressed="${on}">${thing ? artObj(thing, 'l2-pick-ic') : ''}${label}</button>`;
  return `<div class="l2-calc-l">${l2Eyebrow(t('Look ahead'))}<h2 class="l2-h2">${t('Your money, with a date.')}</h2><p class="l2-sub">${t('Pick a dream and how much you put aside each month.')}</p>
      <div class="l2-grp"><p class="l2-lbl" id="calc-dream-l">${t('Your dream')}</p><div class="l2-chips" role="group" aria-labelledby="calc-dream-l">${calcDreams().map(([k, thing, label]) => chip('calc-dream', k, c.dream === k, label, thing)).join('')}</div></div>
      <div class="l2-grp"><p class="l2-lbl" id="calc-monthly-l">${t('I put aside each month')}</p><div class="l2-chips" role="group" aria-labelledby="calc-monthly-l">${CALC_MONTHLY.map(v => chip('calc-monthly', v, monthly === v * 100, esc(fmt.money(v * 100, CUR, { trim: true })))).join('')}</div></div>
      <button type="button" class="l2-btn forest lg" data-a="calc-go">${t('Start with this goal')}</button></div>
    <div class="l2-calc-r" id="calc-out" aria-live="polite">${calcAnswer()}</div>`;
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


/** The website's bar, the same on every page of the website: the home page, the Help center, the blog, the pages for PJ, the converter and about
    (owner, 2026-10-13: "el menú principal es el viejo, no me lleva a ningún lugar"). The name; the capsule: the pages How it works and About us
    (since v212, owner: "quita del menú 'Qué trae' y coloca sobre nosotros ahí"), the page for PJ and MEI, the blog and Help, the one on screen marked (pressed, it goes back to its own top); the language and the
    way in. On a narrower screen the capsule gives way to a menu button that opens the same links in a panel (with the language and the login on a
    phone). Opened from the app, the name and "Back to Dorax" only. Its own rules: css/public/web-pages.css. */
function l2Bar(cur, langId) {
  if (UI.session) return `<div class="l2-nav web-nav web-in-app">${brandMark()}<div class="lp-actions l2-actions"><button type="button" class="l2-btn lime sm" data-a="${cur === 'blog' ? 'blog-close' : 'help-close'}">${icon('left')}${t('Back to Dorax')}</button></div></div>`;
  const go = (id, label) => `<button type="button" class="l2-link" data-a="pub-scroll" data-id="${id}">${label}</button>`;
  const page = (v, label, home) => `<a class="l2-link" href="${PAGES.href(v)}" ${cur === v ? `data-a="${home}" aria-current="page"` : `data-a="pub-go" data-v="${v}"`}>${label}</a>`;
  const links = () => `${page('how', t('How it works'), 'web-top')}${page('about', t('About us'), 'web-top')}${page('pj', t('For PJ'), 'web-top')}${page('blog', t('Blog'), 'blog-home')}${page('help', t('Help'), 'hc-home')}`;
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
        ${app ? '' : `<div><h3>${t('Product')}</h3><ul><li>${page('how', t('How it works'))}</li><li>${page('pj', t('For PJ and MEI'))}</li><li>${page('converter', t('Statement converter'))}</li><li>${go('lp-faq', t('Questions'))}</li></ul></div>
        <div><h3>${t('Account')}</h3><ul><li>${page('signup', t('Create account'))}</li><li>${page('login', t('Log in'))}</li></ul></div>`}
        <div><h3>${t('Legal')}</h3><ul><li>${page('privacy', t('Privacy policy'))}</li><li>${page('terms', t('Terms of use'))}</li></ul></div>
        <div><h3>${t('Help')}</h3><ul><li>${page('help', t('Help center'))}</li><li>${page('blog', t('Blog'))}</li>${app ? '' : `<li>${page('about', t('About us'))}</li>`}<li>${page('contact', t('Contact form'))}</li></ul></div>
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
/** The home page. Since v213 (2026-10-13: "crea un artefacto totalmente nuevo que gire alrededor de las ilustraciones. me gusta el estilo de
    sobre nos. Estas secciones me gustan: Tu dinero, en los días que importan. Todo tu mes, en un lugar. Lo demás puede variar"; the canvas
    "Landing Dorax con personajes", commented section by section and then approved: "publish") it is drawn around Dorax's people (js/ui/art.js):
    the top, centred as the page About us, with seven people in a row > who it is for (three people) > the moments of the month > what's inside >
    how it works, in three steps > home and company > your money, with a date (the calculator) > the blog > your data, with the person who holds
    the key > questions > the way in, with a person waving > footer. Each person stands next to the words about them; nothing is put on top. */
function viewLanding() {
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
  const contact = `<a class="linkbtn" href="${PAGES.href('contact')}" data-a="pub-go" data-v="contact">${t('contact form')}</a>`;
  return `<div class="lp2">
  <header class="l2-top"><div class="l2-wrap">
    ${l2Bar('landing', 'lp-lang')}
    <section class="l2-hero"><div class="l2-copy">${l2Eyebrow(t('Effortless finances'))}
        <h1 class="l2-h1">${t('Clear money.')} <span class="hl">${t('Your decisions.')}</span></h1>
        <p class="l2-lead">${t('Home money and company money in one place, never mixed.')} ${t('And with a date for what you want.')}</p>
        <div class="l2-cta">${l2Go('lime lg')}<button class="l2-btn white lg" data-a="pub-scroll" data-id="lp-how">${t('How it works')}${icon('right')}</button></div>
        <p class="l2-trust">${t('Free · No card · Your bank password is never asked for')}</p></div>
      ${l2Cast()}</section>
  </div></header>
  <main>
    <section class="l2-sec l2-white" id="lp-who"><div class="l2-wrap">
      <div class="l2-sec-h">${l2Eyebrow(t('Who it is for'))}<h2 class="l2-h2">${t('Is one of these you?')}</h2><p class="l2-sub">${t('Dorax was born from these three situations. If you live one of them, you already know what it is for.')}</p></div>${l2Who()}</div></section>
    <section class="l2-sec" id="lp-days"><div class="l2-wrap"><div class="l2-mo-panel" data-reveal="moments">
      <div class="l2-mo-head"><div><h2 class="l2-h2">${t('Your money, on the days that matter.')}</h2><p class="l2-sub">${t('Tap a moment of the month and see how it looks in Dorax.')}</p></div>${l2Go('forest')}</div>
      <div class="l2-mo-row" id="l2-moments">${l2Moments()}</div></div></div></section>
    <section class="l2-sec l2-white" id="lp-what"><div class="l2-wrap">
      <div class="l2-sec-h">${l2Eyebrow(t('What’s inside'))}<h2 class="l2-h2">${t('Your whole month, in one place.')}</h2></div>${l2Bento()}</div></section>
    <section class="l2-sec" id="lp-how"><div class="l2-wrap">
      <div class="l2-sec-h">${l2Eyebrow(t('How it works'))}<h2 class="l2-h2">${t('Three steps and done.')}</h2><p class="l2-sub">${t('What you do on the first day and what Dorax does for you the rest of the month.')}</p></div>${l2Steps()}
      <p class="l2-more"><a class="l2-btn white" href="${PAGES.href('how')}" data-a="pub-go" data-v="how">${t('See how it works in detail')}${icon('right')}</a></p></div></section>
    <section class="l2-pj" id="lp-pj"><div class="l2-wrap">
      <div class="l2-sec-h light">${l2Eyebrow(t('For people with a company (PJ or MEI)'), true)}<h2 class="l2-h2">${t('Company pays you. Home needs a plan.')}</h2><p class="l2-sub">${t('When you pay yourself from your own company, home money and company money blur. In Dorax each one has its own side.')}</p></div>
      ${l2HomeCo()}
      <div class="l2-pj-go">${l2Go('lime lg')}<a class="l2-btn white lg" href="${PAGES.href('pj')}" data-a="pub-go" data-v="pj">${t('See the company’s side')}${icon('right')}</a></div></div></section>
    <section class="l2-sec" id="lp-calc"><div class="l2-wrap"><div class="l2-calc" id="calc-tool">${calcTool()}</div></div></section>
    <section class="l2-sec l2-white" id="lp-blog"><div class="l2-wrap">${l2Blog()}</div></section>
    <section class="l2-trustsec" id="lp-data"><div class="l2-wrap">
      <div class="l2-sec-h light">${l2Eyebrow(t('Your data'), true)}<h2 class="l2-h2">${t('Your money is yours. Your data too.')}</h2><p class="l2-sub">${t('Dorax organises what you type or import. Nothing more.')}</p></div>
      <div class="l2-tr-grid">${[['bank', t('No bank password'), t('You do not have to connect your bank. The workflow is based on information you enter and files you choose to import.')], ['laptop', t('Your files are not uploaded'), t('Sheets and statements open in your browser to be read. Only the rows you accept become your data.')], ['shield-check', t('No ads'), t('Your data is not sold or used for advertising.')]].map(([ic, title, text], i) => `<div class="l2-tc" data-reveal="tc-${i}">${artObj(ic, 'st-obj')}<h3>${title}</h3><p>${text}</p></div>`).join('')}</div>
      <div class="l2-tr-wide" data-reveal="key"><div><h3 class="l2-h3w">${t('You hold the key.')}</h3><ul class="l2-tr-list">${[t('Download a backup of everything whenever you want.'), t('Delete your data or your account from Settings.'), t('Your password is stored encrypted, never as you typed it.')].map(x => `<li>${l2Check()}${x}</li>`).join('')}</ul></div>
        ${artFig('key', 'key', 'l2-keyfig')}</div>
      <p class="l2-disc">${t('Dorax organises information about your own money. It is not financial, tax or accounting advice.')}</p></div></section>
    <section class="l2-sec" id="lp-faq"><div class="l2-wrap"><div class="l2-faq-grid">
      <div class="l2-faq-l">${l2Eyebrow(t('Questions'))}<h2 class="l2-h2">${t('Questions before you start')}</h2><p class="l2-sub">${t('Use the {form}. It works without logging in.', { form: contact })}</p>${artFig('explain', 'chat-circle-dots', 'l2-fig')}<p class="l2-faq-cap">${t('A person reads every message.')}</p></div>
      <div class="l2-faq">${faq.map(([q, a]) => `<details><summary>${q}<span class="l2-pm">${icon('plus')}</span></summary><p>${a}</p></details>`).join('')}</div></div></div></section>
    <section class="l2-end"><div class="l2-wrap"><div class="l2-end-box with-fig"><h2 class="l2-h2">${t('Make sense of the numbers you have.')}</h2>
      <div class="l2-end-r">${l2Go('forest lg')}<p>${t('Free')} · ${t('No card')}</p></div>${artFig('hi', 'hand-waving', 'l2-end-fig')}</div></div></section>
  </main>
  ${l2Foot()}</div>`;
}
