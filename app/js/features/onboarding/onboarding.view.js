/* Dorax Finance — the first minute of a new account.
   2026-10-07 (owner: "an onboarding in under 60 seconds that already motivates and gives value, without losing the key questions"):
   four screens. A dream and its cost; three numbers (what comes in, what goes out, what is saved), each a slider that starts at Brazil's average
   (owner, same day: "use sliders, by default at the average salary, spending and savings of Brazilians"); what that money can already do (days of
   freedom, the date the dream is reached, the step that brings it closer); and where to go next to make that date sharper.
   The answers become real income rows, a goal with its monthly plan and a starting balance, so the dashboard opens with the person's own month.
   Nothing here is invented: every figure shown comes from what was typed (core/runway.js), and an answer left blank creates nothing.
   Before this (v11 to v41) it was five longer questions: an account, the pay, every fixed cost, a goal, a summary. Fixed costs and accounts are
   now added from the last screen or from the dashboard's first steps. */

const OB_STEPS = 4;
// Where the sliders start (owner: "the average of Brazilians"), in cents. They are starting points, said so on the screen, never shown as the person's own figures
// until the screen is confirmed. Read 2026-10-07; to be refreshed when IBGE publishes a new quarter:
//   income  R$ 3.738: average real monthly income from all jobs (IBGE, PNAD Contínua, 2nd quarter of 2026), rounded to the slider's step
//   spend   86% of income: families' total monthly expense over their income, R$ 4.649 / R$ 5.427 (IBGE, POF 2017-2018; the latest there is)
//   saved   one month of spending: no average amount is published; 51% of Brazilians have nothing put aside or a month at most (Anbima, Raio X do Investidor 2026)
const OB_AVG = { income: 370000, spend: 320000, saved: 320000 };
const OB_MAX = { income: 30000, spend: 30000, saved: 100000 };      // the sliders' far end, in reais; a larger amount can still be typed in the field
const freshOb = () => ({ step: 0, error: null, seen: false, dream: '', dreamName: '', cost: '', costTouched: false, pay: plain(OB_AVG.income), spend: plain(OB_AVG.spend), saved: plain(OB_AVG.saved),
  ...(typeof calcCarry === 'function' ? calcCarry() : {}) });      // a dream chosen in the home page's calculator, with its cost and what is put aside, comes along (features/public/landing.view.js)
const ob = () => UI.ob || (UI.ob = freshOb());
const obSet = (path, v) => { const ks = path.split('.'); let o = ob(); for (const k of ks.slice(0, -1)) o = o[k]; o[ks[ks.length - 1]] = v; };
const obField = (id, label, path, val, extra, cls) => `<div class="field ${cls || ''}"><label for="${id}">${label}</label><input type="text" id="${id}" value="${esc(val)}" data-c="ob" data-k="${path}" data-live="1" ${extra || ''}></div>`;
const obMoney = 'inputmode="decimal" class="num" placeholder="0,00" autocomplete="off"';
/** A number asked with a slider: the amount can be dragged, or typed in the field beside its label (a slider alone is no good for an exact figure, a keyboard or a
    screen reader). The two follow each other without redrawing the screen (onboarding.actions.js). max and step are in reais. */
const obPct = (n, max) => max ? Math.round(Math.min(n, max) * 1000 / max) / 10 : 0;
function obSlide(id, label, path, val, max, step, who, sym) {      // who: whose field it is (data-c): the setup's by default. sym: the currency's sign, R$ by default
  who = who || 'ob'; sym = sym || 'R$'; const cur = sym === 'US$' ? 'USD' : CUR;
  const c = typedAmount(val), n = c === null || c < 0 ? 0 : Math.min(max, Math.round(c / 100));
  return `<div class="field ob-slide"><div class="ob-slide-h"><label for="${id}">${label}</label><span class="ob-val"><span aria-hidden="true">${sym}</span><input type="text" id="${id}" value="${esc(val)}" ${obMoney} aria-label="${label} (${sym})" data-c="${who}" data-k="${path}" data-live="1" data-range="${id}-r"></span></div>
    <input type="range" id="${id}-r" min="0" max="${max}" step="${step}" value="${n}" aria-label="${label}" aria-valuetext="${esc(fmt.money(n * 100, cur, { trim: true }))}" data-cur="${cur}" data-c="${who}-range" data-k="${path}" data-live="1" data-text="${id}" style="--p:${obPct(n, max)}%"></div>`;
}
const emo = e => `<span class="e" aria-hidden="true">${e}</span>`;      // the one emoji kept (the waving hand of the greeting, owner's choice): decoration, hidden from screen readers
const obIco = n => `<span class="fl-ico">${icon(n)}</span>`;           // everything else is drawn with the app's own icons (owner: "no emoji, icons in our style")
/** The dreams offered: [id, icon, what the button says, the goal's name (one the app writes, so it follows the language) or '' when the person names it,
    where its cost slider starts, its far end, its step (reais)]. The starting costs are round figures to move away from, not statistics. */
const obDreams = () => [['car', 'car', t('Buy or change my car'), 'Car', 50000, 300000, 1000], ['trip', 'plane', t('Holiday or dream trip'), 'Trip', 6000, 60000, 500],
  ['safety', 'shield', t('Emergency fund and peace of mind'), 'Emergency fund', 10000, 100000, 500], ['other', 'spark', t('Another dream'), '', 10000, 200000, 500]];
const obCheer = () => { const name = firstName(UI.pub.name); return name ? t('Great goal, {name}! Let’s put a date on it.', { name }) : t('Great goal! Let’s put a date on it.'); };
/** The name is typed after the dream was chosen: the line that cheers follows it without redrawing the screen under the person's fingers. */
function obCheerLive() { const el = document.querySelector('.ob-cheer'); if (el) el.textContent = obCheer(); }

/** The income rows the plan starts with. What is left after what goes out (income minus spend) is routed to savings, the rest to fixed costs:
    [{ key, to, amount, half }], amounts in cents. One payment a month; a second pay date is added in Plan (owner, 2026-10-07: "remove the two payments toggle"). */
function obIncome(a, spend) {
  const save = spend > 0 ? Math.max(0, a - spend) : 0, rows = [];
  if (a - save > 0) rows.push({ key: 'Salary', to: 'fixed', amount: a - save, half: 0 });
  if (save > 0) rows.push({ key: 'Salary · savings part', to: 'savings', amount: save, half: 0 });
  return rows;
}
/** What the answers add up to. errors[0] and errors[1] say what cannot be read on the first two screens.
    strict: the numbers screen is being left through its own button, so what comes in and what goes out are both needed for the look ahead.
    The numbers count only once that screen was confirmed (o.seen): its sliders start at Brazil's averages, and someone who leaves before saying
    "these are mine" must not get an average person's income written into their account. */
function obRead(strict) {
  const o = ob(), errors = {}, amt = v => String(v || '').trim() === '' ? 0 : typedAmount(v), bad = t('Enter the amount as a number, for example 1500 or 9,90.');
  let goal = null;
  if (o.dream) {
    const target = amt(o.cost), row = obDreams().find(x => x[0] === o.dream), typed = (o.dreamName || '').trim();
    if (!row[3] && !typed) errors[0] = t('Give your dream a name.');
    else if (target === null || target < 0) errors[0] = bad;
    else if (!target) errors[0] = t('Type about how much it costs, so I can put a date on it. A rough figure works.');
    else goal = row[3] ? { key: row[3], name: nameIn(row[3], S.settings.lang, S), target } : { key: null, name: typed, target };
  }
  const use = strict || o.seen, a = use ? amt(o.pay) : 0, spend = use ? amt(o.spend) : 0, saved = use ? amt(o.saved) : 0;
  if ([a, spend, saved].some(v => v === null || v < 0)) errors[1] = bad;
  else if (strict && (!a || !spend)) errors[1] = t('Type what comes in and what goes out each month. A rough figure works.');
  const ok = !errors[1], income = ok ? a : 0;
  return { goal, income, rows: ok ? obIncome(a, spend) : [], spend: ok ? spend : 0, saved: ok ? saved : 0,
    look: firstLook(income, ok ? spend : 0, ok ? saved : 0, goal ? goal.target : 0, ymOf(S.today)), errors };
}
/** Turns the answers into the account's first data, with the same building blocks as the rest of the app.
    The goal's plan is what is left each month, from this month until the goal is reached or the year ends; from there its date is carried by that
    pace (goalArrival, core/runway.js), so the date on the goal is the one this setup showed. */
function applyOnboarding(d) {
  const now = ymOf(S.today), year = +now.slice(0, 4), m0 = +now.slice(5) - 1, from = v => Array.from({ length: 12 }, (_, i) => i >= m0 ? v : 0);
  if (d.spend) S.user.spend = d.spend;                       // the pace days of freedom are counted with, until real months say more
  if (d.rows.length) { const sub = S.categories.find(c => c.income).subs[0]; S.pay[year] = d.rows.map(r => ({ id: newId('pay'), ...appName(r.key), sub: sub.id, half: r.half, to: r.to, values: from(r.amount) })); }
  if (d.goal || d.saved) {
    const g = { id: newId('g'), ...(d.goal ? (d.goal.key ? appName(d.goal.key) : { name: d.goal.name }) : appName('My savings')), kind: d.goal ? 'goal' : 'fund', target: d.goal ? d.goal.target : null,
      deadline: null, accountId: null, status: 'active', note: '', plan: { [year]: Array(12).fill(0) } };
    if (d.goal && d.look.free > 0 && !d.look.covered) setGoalPlan(g, now, [d.look.arrival, year + '-12'].sort()[0], d.look.free);
    S.goals.push(g);
    if (d.saved) S.goalMoves.push({ id: newId('gm'), goalId: g.id, date: S.today, amount: d.saved, accountId: null, start: true, ...appName('Starting balance', 'note') });
  }
  S.goals.forEach(g => goalYears(S).forEach(y => { g.plan[y] = g.plan[y] || Array(12).fill(0); }));
  return !!(d.rows.length || d.goal || d.saved || d.spend);
}

/** What the money can already do: days of freedom first, then the facts that follow from the same four figures. */
function obReveal(d) {
  const L = d.look, money = v => fmt.money(v, CUR, { trim: true }), dream = d.goal ? esc(d.goal.name) : '';
  const fact = (lead, title, note) => `<div class="ob-fact">${lead}<span class="grow"><b>${title}</b>${note ? `<small>${note}</small>` : ''}</span></div>`;
  let hero = '';
  if (L.days > 0) { const f = rwFigure(L.days, false); hero = `<div class="ob-hero"><div class="rw-fig"><b class="rw-n" data-count="${f.n}" data-dec="${f.dec}">${fmt.num(f.n)}</b><span class="rw-u">${f.unit}</span></div><p>${t('That is how long what you have saved lasts at the pace you spend.')}</p>${rwTrack(L.days)}</div>`; }
  else if (L.days === 0) hero = `<div class="ob-hero zero"><b>${t('Your days of freedom start today.')}</b><p>${L.to30 ? tn(L.to30, 'Putting aside what is left each month, you have 30 days of freedom in {n} month.', 'Putting aside what is left each month, you have 30 days of freedom in {n} months.') : t('Everything you put aside from now on buys you time.')}</p></div>`;
  const left = L.free > 0 ? fact(`<span class="fl-ico">${icon('trend')}</span>`, t('{amount} left each month', { amount: money(L.free) }), t('What comes in minus what goes out.'))
    : fact(`<span class="fl-ico">${icon('trend')}</span>`, L.free < 0 ? t('Today {amount} more goes out than comes in each month.', { amount: money(-L.free) }) : t('Today as much goes out as comes in.'), t('No drama. Seeing it is the first step.'));
  let goal = '';
  if (d.goal) {
    if (L.covered) goal = fact(obIco('target'), t('{dream}: you already have it covered.', { dream }), t('What you have saved reaches what it costs.'));
    else if (L.months === null) goal = fact(obIco('target'), t('{dream}: no date yet.', { dream }), t('To get there in 12 months you need {amount} free each month. Let’s find it.', { amount: money(L.in12) }));
    else if (L.far) goal = fact(obIco('target'), t('{dream}: more than 10 years away at this pace.', { dream }), t('Your plan will show which costs can make room for it.'));
    else goal = fact(obIco('target'), `${dream}: <span class="ob-when">${fmt.month(L.arrival)}</span>`, tn(L.months, 'At this pace you get there in {n} month.', 'At this pace you get there in {n} months.'));
  }
  const tip = d.goal && L.lever && !L.far ? fact(obIco('bulb'), tn(L.lever.sooner, 'With {amount} more a month, you get there {n} month sooner.', 'With {amount} more a month, you get there {n} months sooner.', { amount: money(L.lever.extra) })) : '';
  return `${hero}<div class="ob-facts">${left}${goal}${tip}</div><p class="note">${t('A simple sum with what you told me, with no investment returns. It gets sharper with your real plan.')}</p>`;
}

// 2026-10-10 (owner, on the Journey's first page: "that is an onboarding! Make the web app's onboarding like that, when the person creates an account";
// then: "not the same as it is, and don't overdo it either"). The same kind of page, with its own look: the whole screen, black with a soft green
// light drifting slowly behind, large words and no card; the bar in parts and one large button at the foot. What moves is what matters in each step:
// the dream chosen lights up, the figures follow the sliders, the days of freedom count up, the last choices come in one after the other.
// Its steps and fields are the ones it had (name and dream, the month's numbers, what the money can already do, where to go next).
let obShown = -1;      // the step last drawn: a new step's words come in
function viewOnboard() {
  const p = UI.pub, o = ob(), step = Math.min(o.step, OB_STEPS - 1), name = esc(firstName(p.name)), enter = step !== obShown;      // a full name typed at sign-up: the first one is how the app talks to the person
  const top = `<div class="ob-bar"><span class="ob-brand">${brandMark(true)}</span><span class="spacer"></span><select id="ob-lang" class="lang" aria-label="${t('Language')}" data-c="setting" data-k="lang">${options(LANGS, S.settings.lang)}</select>
    <button type="button" class="ob-out" data-a="logout" aria-label="${t('Log out')}" data-tip="${t('Log out')}">${icon('logout')}</button></div>`;
  // the dots of before (owner, 2026-10-07: "dots, the active one green, at the bottom") are now the bar in parts of the Journey's page; a screen reader still hears "Step 2 of 4"
  const dots = `<div class="ob-dots js-progress" role="img" aria-label="${t('Step {a} of {b}', { a: step + 1, b: OB_STEPS })}">${Array.from({ length: OB_STEPS }, (_, i) => `<i class="${i === step ? 'now' : i < step ? 'done' : ''}"></i>`).join('')}</div>`;
  const err = o.error || p.error ? `<p class="banner crit js-warn" role="alert">${esc(o.error || p.error)}</p>` : '';
  const later = `<p class="ob-later"><button class="linkbtn" data-a="ob-finish">${t('Finish later and open my dashboard')}</button></p>`;
  const foot = (label, action, lead) => `<footer class="js-foot ob-foot">${lead || ''}${dots}<div class="js-actions">${step ? `<button class="btn ghost js-back" data-a="ob-back" aria-label="${t('Back')}">${icon('left')}</button>` : ''}<button class="btn primary js-go" data-a="${action}">${label}${icon('right')}</button></div>${step === 1 || step === 2 ? later : ''}</footer>`;
  let body, end;
  if (step === 0) {
    body = `<p class="js-eyebrow">${t('Your first dream')}</p><h1 id="ob-h" tabindex="-1">${t('Hi, welcome!')} ${emo('👋')}</h1><p class="js-lead">${t('What’s your name, and what dream do you want to reach first?')}</p>${err}
      <div class="field ob-name"><label for="ob-name">${t('Your name')}</label><input type="text" id="ob-name" autocomplete="given-name" value="${esc(p.name)}" placeholder="${t('A nickname works')}" data-c="pub" data-k="name" data-live="1"></div>
      <div class="ob-dreams" role="group" aria-label="${t('Your first dream')}">${obDreams().map(([k, e, label], i) => `<button type="button" class="ob-dream" style="--i:${i}" data-a="ob-dream" data-v="${k}" aria-pressed="${o.dream === k}">${obIco(e)}<span>${label}</span></button>`).join('')}</div>
      ${o.dream ? (row => `${row[3] ? '' : obField('ob-dream-name', t('What is it?'), 'dreamName', o.dreamName, `placeholder="${t('e.g. My own place, a new laptop')}"`)}
        ${obSlide('ob-cost', o.dream === 'safety' ? t('How much do you want to have put aside?') : t('How much does it cost, more or less?'), 'cost', o.cost, row[5], row[6])}
        <p class="js-soft">${t('A rough figure works. You adjust it later.')}</p>`)(obDreams().find(x => x[0] === o.dream)) : ''}`;
    end = foot(t('Next'), 'onboard-save', o.dream ? `<p class="ob-cheer" role="status">${esc(obCheer())}</p>` : '');      // the cheer sits over the Next button (owner, 2026-10-07)
  } else if (step === 1) {
    body = `<p class="js-eyebrow">${t('Your month')}</p><h1 id="ob-h" tabindex="-1">${name ? t('How do your numbers look today, {name}?', { name }) : t('How do your numbers look today?')}</h1><p class="js-lead">${t('Don’t worry about the cents, we adjust it later.')}</p>${err}
      ${obSlide('ob-pay0', t('Comes in each month, after taxes'), 'pay', o.pay, OB_MAX.income, 100)}
      ${obSlide('ob-spend', t('Goes out each month'), 'spend', o.spend, OB_MAX.spend, 100)}
      ${obSlide('ob-saved', t('Already saved'), 'saved', o.saved, OB_MAX.saved, 100)}
      <p class="js-soft ob-avg">${t('They start at Brazil’s averages. Move them to yours.')} ${info(t('Where the sliders start. Comes in: R$ 3.738, the average monthly income from work in Brazil (IBGE, PNAD Contínua, 2nd quarter of 2026). Goes out: 86% of that, the share of their income that families spend (IBGE, POF 2017-2018). Already saved: one month of spending; about half of Brazilians have a month or less put aside (Anbima, Raio X do Investidor 2026). They are only where the sliders start: nothing is kept until you confirm your own numbers.'))}</p>`;
    end = foot(t('See my projection'), 'ob-next');
  } else if (step === 2) {
    body = `<p class="js-eyebrow">${t('What your money can already do')}</p><h1 id="ob-h" tabindex="-1">${name ? t('{name}, this is what your money can already do', { name }) : t('This is what your money can already do')}</h1>${obReveal(obRead())}`;
    end = foot(t('Start taking control'), 'ob-next');
  } else {
    const way = (go, ic, title, text, i) => `<button type="button" class="ob-way" style="--i:${i}" data-a="ob-finish" data-go="${go}"><span class="fl-ico">${icon(ic)}</span><span class="grow"><b>${title}</b><small>${text}</small></span>${icon('right')}</button>`;
    body = `<p class="js-eyebrow">${t('Your next step')}</p><h1 id="ob-h" tabindex="-1">${t('Let’s make your date sharper')}</h1><p class="js-lead">${t('The more Dorax knows about your month, the truer what it shows you. Pick where to start, or go straight to your dashboard.')}</p>${err}
      <div class="ob-ways">${way('limits', 'gauge', t('Plan my month'), t('How much to spend on each category. Dorax lets you know at 80%.'), 0)}${way('plan', 'calendar', t('Add my fixed costs and due days'), t('Rent, internet, cards. Dorax reminds you before each one is due.'), 1)}
        ${deskOnly('sheet') ? '' : way('sheet', 'upload', t('Bring my spreadsheet'), t('Fixed costs, income and goals come in without typing them.'), 2)}</div>`;
    end = foot(t('Open my dashboard'), 'ob-finish');
  }
  return `<main class="auth plain ob-wrap"><div class="onb ob-page js-page" id="obpage" data-step="${step}"><div class="ob-glow" aria-hidden="true"><i></i><i></i></div>${top}
    <div class="js-body ob-body${enter ? ' in' : ''}"><div class="js-step">${body}</div></div>${end}</div></main>`;
}
/** After the page is drawn, on a new step: the figures count up and the title takes the focus. */
function obAfter() {
  const root = $('obpage'); document.documentElement.classList.toggle('ob-open', !!root);
  if (!root) { obShown = -1; return; }
  const step = +root.dataset.step; if (step === obShown) return;
  obShown = step; root.querySelectorAll('[data-count]').forEach(countUp);
  const h = $('ob-h'); if (h) h.focus({ preventScroll: true });
}
