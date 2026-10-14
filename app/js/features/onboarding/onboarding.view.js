/* Dorax Finance — the first minute of a new account.
   2026-10-07 (owner: "an onboarding in under 60 seconds that already motivates and gives value, without losing the key questions"):
   four screens. A dream and its cost; three numbers (what comes in, what goes out, what is saved), each a slider that starts at Brazil's average
   (owner, same day: "use sliders, by default at the average salary, spending and savings of Brazilians"); what that money can already do (days of
   freedom, the date the dream is reached, the step that brings it closer); and where to go next to make that date sharper.
   The answers become real income rows, a goal with its monthly plan and a starting balance, so the dashboard opens with the person's own month.
   Nothing here is invented: every figure shown comes from what was typed (core/runway.js), and an answer left blank creates nothing.
   Before this (v11 to v41) it was five longer questions: an account, the pay, every fixed cost, a goal, a summary. Fixed costs and accounts are
   now added from the last screen or from the dashboard's first steps.
   v216 (owner, 2026-10-13: "el onboarding del signup no me gusta ni en pc ni en móvil, haz un diseño nuevo y mejorado"; the design canvas "Onboarding
   Dorax: nuevo diseño", then "se ven bien"): five screens, the name on its own: the welcome and the name; the dream and its cost; the month's three
   numbers; what the money can already do; where to go next. */

const OB_STEPS = 5;
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
function obSlide(id, label, path, val, max, step, who, sym, art) {      // who: whose field it is (data-c): the setup's by default. sym: the currency's sign, R$ by default. art: the thing beside its name (v214)
  who = who || 'ob'; sym = sym || 'R$'; const cur = sym === 'US$' ? 'USD' : CUR;
  const c = typedAmount(val), n = c === null || c < 0 ? 0 : Math.min(max, Math.round(c / 100));
  return `<div class="field ob-slide${art ? ' with-art' : ''}"><div class="ob-slide-h">${art ? obArt(art) : ''}<label for="${id}">${label}</label><span class="ob-val"><span aria-hidden="true">${sym}</span><input type="text" id="${id}" value="${esc(val)}" ${obMoney} aria-label="${label} (${sym})" data-c="${who}" data-k="${path}" data-live="1" data-range="${id}-r"></span></div>
    <input type="range" id="${id}-r" min="0" max="${max}" step="${step}" value="${n}" aria-label="${label}" aria-valuetext="${esc(fmt.money(n * 100, cur, { trim: true }))}" data-cur="${cur}" data-c="${who}-range" data-k="${path}" data-live="1" data-text="${id}" style="--p:${obPct(n, max)}%"></div>`;
}
const emo = e => `<span class="e" aria-hidden="true">${e}</span>`;      // the one emoji kept (the waving hand of the greeting, owner's choice): decoration, hidden from screen readers
/** The dreams offered: [id, icon, what the button says, the goal's name (one the app writes, so it follows the language) or '' when the person names it,
    where its cost slider starts, its far end, its step (reais)]. The starting costs are round figures to move away from, not statistics. */
const obDreams = () => [['car', 'car', t('Buy or change my car'), 'Car', 50000, 300000, 1000], ['trip', 'plane', t('Holiday or dream trip'), 'Trip', 6000, 60000, 500],
  ['safety', 'shield', t('Emergency fund and peace of mind'), 'Emergency fund', 10000, 100000, 500], ['other', 'spark', t('Another dream'), '', 10000, 200000, 500]];
// v214 (owner, 2026-10-13: "haz un update a las pantallas de onboarding y pantallas de éxito… agrega las ilustraciones… no abuses de las personas,
// usa los iconos también"): each answer is drawn with Dorax's own things (js/ui/art.js), and two screens have a person: the welcome (hi) and the days of
// freedom (coffee, a calm month). A drawing is beside the words it says, never decoration.
const OB_ART = { car: 'car-profile', trip: 'airplane-tilt', safety: 'shield-check', other: 'sparkle' };      // a dream and its thing
const OB_SAY = () => ({ car: [t('Car'), t('Buy or change')], trip: [t('Trip'), t('Dream holidays')], safety: [t('Safety net'), t('To sleep easy')], other: [t('Another dream'), t('You name it')] });      // v216: each dream's tile, a word and a line, read at a glance
const obArt = (name, cls) => `<span class="ob-thing${cls ? ' ' + cls : ''}" aria-hidden="true">${artObj(name)}</span>`;
const obCheer = () => { const name = firstName(UI.pub.name); return name ? t('Great goal, {name}! Let’s put a date on it.', { name }) : t('Great goal! Let’s put a date on it.'); };
/** The name is typed after the dream was chosen: the line that cheers follows it without redrawing the screen under the person's fingers. */
function obCheerLive() { const el = document.querySelector('.ob-cheer'); if (el) el.textContent = obCheer(); const say = $('ob-name-say'); if (say) say.textContent = obNameSay(); }
/** Under the name: what Dorax will call the person, as it is typed (v216). */
const obNameSay = () => { const name = firstName(UI.pub.name); return name ? t('A nickname works. We’ll call you {name}.', { name }) : t('A nickname works.'); };

/** The income rows the plan starts with. What is left after what goes out (income minus spend) is routed to savings, the rest to fixed costs:
    [{ key, to, amount, half }], amounts in cents. One payment a month; a second pay date is added in Plan (owner, 2026-10-07: "remove the two payments toggle"). */
function obIncome(a, spend) {
  const save = spend > 0 ? Math.max(0, a - spend) : 0, rows = [];
  if (a - save > 0) rows.push({ key: 'Salary', to: 'fixed', amount: a - save, half: 0 });
  if (save > 0) rows.push({ key: 'Salary · savings part', to: 'savings', amount: save, half: 0 });
  return rows;
}
/** What the answers add up to. errors[1] and errors[2] say what cannot be read on the dream's screen and the numbers' (v216: keyed by their screen).
    strict: the numbers screen is being left through its own button, so what comes in and what goes out are both needed for the look ahead.
    The numbers count only once that screen was confirmed (o.seen): its sliders start at Brazil's averages, and someone who leaves before saying
    "these are mine" must not get an average person's income written into their account. */
function obRead(strict) {
  const o = ob(), errors = {}, amt = v => String(v || '').trim() === '' ? 0 : typedAmount(v), bad = t('Enter the amount as a number, for example 1500 or 9,90.');
  let goal = null;
  if (o.dream) {
    const target = amt(o.cost), row = obDreams().find(x => x[0] === o.dream), typed = (o.dreamName || '').trim();
    if (!row[3] && !typed) errors[1] = t('Give your dream a name.');
    else if (target === null || target < 0) errors[1] = bad;
    else if (!target) errors[1] = t('Type about how much it costs, so I can put a date on it. A rough figure works.');
    else goal = row[3] ? { key: row[3], name: nameIn(row[3], S.settings.lang, S), target } : { key: null, name: typed, target };
  }
  const use = strict || o.seen, a = use ? amt(o.pay) : 0, spend = use ? amt(o.spend) : 0, saved = use ? amt(o.saved) : 0;
  if ([a, spend, saved].some(v => v === null || v < 0)) errors[2] = bad;
  else if (strict && (!a || !spend)) errors[2] = t('Type what comes in and what goes out each month. A rough figure works.');
  const ok = !errors[2], income = ok ? a : 0;
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

/** What the money can already do: days of freedom first, then the facts that follow from the same four figures. hero: the days, large, on the
    forest block beside the person at ease (it is the screen's heading); track: how far they are from the next mark, at the top of the sheet; rest:
    the facts and how they were worked out. */
function obReveal(d) {
  const L = d.look, money = v => fmt.money(v, CUR, { trim: true }), dream = d.goal ? esc(d.goal.name) : '';
  const fact = (lead, title, note) => `<div class="ob-fact">${lead}<span class="grow"><b>${title}</b>${note ? `<small>${note}</small>` : ''}</span></div>`;
  let hero = '', track = '';
  if (L.days > 0) {
    const f = rwFigure(L.days, false), next = RUNWAY_MARKS.find(m => m > L.days);
    hero = `<h1 id="ob-h" tabindex="-1" class="ob-days"><b class="rw-n" data-count="${f.n}" data-dec="${f.dec}">${fmt.num(f.n)}</b><span class="rw-u">${f.unit}</span></h1><p class="js-lead">${t('That is how long what you have saved lasts at the pace you spend.')}</p>`;
    track = `<div class="ob-track">${next ? `<p class="ob-track-h">${t('Next goal: {mark}.', { mark: rwMark(next) })}</p>` : ''}${rwTrack(L.days)}</div>`;
  } else {
    hero = `<h1 id="ob-h" tabindex="-1" class="ob-days zero">${L.days === 0 ? t('Your days of freedom start today.') : t('This is what your money can already do')}</h1>${L.days === 0 ? `<p class="js-lead">${L.to30 ? tn(L.to30, 'Putting aside what is left each month, you have 30 days of freedom in {n} month.', 'Putting aside what is left each month, you have 30 days of freedom in {n} months.') : t('Everything you put aside from now on buys you time.')}</p>` : ''}`;
  }
  const left = L.free > 0 ? fact(obArt('coins'), t('{amount} left each month', { amount: money(L.free) }), t('What comes in minus what goes out.'))
    : fact(obArt('coins'), L.free < 0 ? t('Today {amount} more goes out than comes in each month.', { amount: money(-L.free) }) : t('Today as much goes out as comes in.'), t('No drama. Seeing it is the first step.'));
  let goal = '';
  if (d.goal) {
    if (L.covered) goal = fact(obArt(OB_ART[ob().dream] || 'flag-banner'), t('{dream}: you already have it covered.', { dream }), t('What you have saved reaches what it costs.'));
    else if (L.months === null) goal = fact(obArt(OB_ART[ob().dream] || 'flag-banner'), t('{dream}: no date yet.', { dream }), t('To get there in 12 months you need {amount} free each month. Let’s find it.', { amount: money(L.in12) }));
    else if (L.far) goal = fact(obArt(OB_ART[ob().dream] || 'flag-banner'), t('{dream}: more than 10 years away at this pace.', { dream }), t('Your plan will show which costs can make room for it.'));
    else goal = fact(obArt(OB_ART[ob().dream] || 'flag-banner'), `${dream}: <span class="ob-when">${fmt.month(L.arrival)}</span>`, tn(L.months, 'At this pace you get there in {n} month.', 'At this pace you get there in {n} months.'));
  }
  const tip = d.goal && L.lever && !L.far ? fact(obArt('lightbulb'), tn(L.lever.sooner, 'With {amount} more a month, you get there {n} month sooner.', 'With {amount} more a month, you get there {n} months sooner.', { amount: money(L.lever.extra) })) : '';
  return { hero, track, rest: `<div class="ob-facts">${goal}${left}${tip}</div><p class="note">${t('A simple sum with what you told me, with no investment returns. It gets sharper with your real plan.')}</p>` };
}

// v216 (owner, 2026-10-13: "el onboarding del signup no me gusta ni en pc ni en móvil"; approved on the canvas "Onboarding Dorax: nuevo diseño":
// "se ven bien"). The app's own look (css/look/look-onboarding.css): the forest block of the summary and, over it, a sage sheet that rises (owner:
// "likes the deep-green top block with a light sheet rising over it"); on a computer the block is the left of the screen and the sheet comes in from
// the side, its fields and button together in its middle. On the block, the screen's words and its drawing; on the sheet, what is asked.
//   0 the welcome: the person waving, in front of a lime sun, standing on the sheet's edge; the sheet asks only the name;
//   1 the dream: its thing rises from behind the sheet, with a bubble that says it and what it costs, following the slider;
//   2 the month: what is left each month, large on the block, as the summary's balance, following the sliders; the dream beside it;
//   3 what the money can already do: the days of freedom, very large, beside the person at ease in front of the sun;
//   4 where to go next: the signpost, its bubble the date the dream is reached today, the one the ways on make sharper.
const obChip = (label, value) => `<span class="ob-chip" id="ob-chip"><small>${label}</small><b class="num">${value}</b></span>`;
/** The bubble's two lines for the step, or null when it has nothing to say. Text only (escaped where drawn): obStageLive writes it as text. */
function obChipText(step) {
  const o = ob(), money = c => c === null ? '—' : fmt.money(c, CUR, { trim: true });
  if (step === 1 && o.dream) {
    const row = obDreams().find(x => x[0] === o.dream), c = typedAmount(o.cost);
    return [row[3] ? nameIn(row[3], S.settings.lang, S) : ((o.dreamName || '').trim() || t('Another dream')), money(c === null || c < 0 ? null : c)];
  }
  if (step === 4) { const d = obRead(), L = d.look; if (d.goal && !L.covered && L.months !== null && !L.far) return [`${d.goal.name} · ${t('You get there in')}`, fmt.month(L.arrival)]; }
  return null;
}
/** The month's screen: what is left each month (or short), from the two sliders as they are now. [label, whole part, cents] */
function obLeftText() {
  const o = ob(), a = typedAmount(o.pay), s = typedAmount(o.spend), ok = a !== null && s !== null && a >= 0 && s >= 0, left = ok ? a - s : 0;
  const m = ok ? fmt.money(Math.abs(left), CUR) : '—', cut = /^(.*\d)([.,]\d{2})$/.exec(m);
  return [left < 0 ? t('Short each month') : t('Left each month'), cut ? cut[1] : m, cut ? cut[2] : ''];
}
/** A field or a slider moved: the bubble and the month's figure follow without redrawing the screen under the person's fingers (onboarding.actions.js). */
function obStageLive() {
  const root = $('obpage'); if (!root) return;
  const x = obChipText(+root.dataset.step), el = $('ob-chip');
  if (el && x) { el.querySelector('small').textContent = x[0]; el.querySelector('b').textContent = x[1]; }
  const v = $('ob-left'); if (v) { const [label, whole, cents] = obLeftText(); v.querySelector('.ob-left-k').textContent = label; v.querySelector('.ob-left-n').textContent = whole; v.querySelector('.ob-left-c').textContent = cents; }
}
/** The dream as it stands, for the month's screen: its thing, its name and what it costs. */
function obDreamChip() {
  const x = obChipText(1); if (!x) return '';
  return `<span class="ob-dream-chip">${obArt(OB_ART[ob().dream] || 'sparkle', 'on-lime')}<span>${esc(x[0])} · ${esc(x[1])}</span></span>`;
}
/** The step's drawing on the block: a person in front of the lime sun, or a thing that rises from behind the sheet; the bubble over it. */
function obScene(step) {
  const x = obChipText(step), chip = x ? obChip(esc(x[0]), esc(x[1])) : '';
  const thing = n => `<span class="ob-big-thing">${artObj(n)}</span>`;
  if (step === 0 || step === 3) return `<div class="ob-scene is-fig" aria-hidden="true"><span class="ob-sun"></span>${artFig(step ? 'coffee' : 'hi', '', 'shadow ob-fig')}</div>`;
  const n = step === 1 ? OB_ART[ob().dream] || 'sparkle' : step === 2 ? 'coins' : 'signpost';
  return `<div class="ob-scene is-thing" aria-hidden="true">${chip}${thing(n)}</div>`;
}

let obShown = -1;      // the step last drawn: a new step's words come in
function viewOnboard() {
  const p = UI.pub, o = ob(), step = Math.min(o.step, OB_STEPS - 1), name = esc(firstName(p.name)), enter = step !== obShown;      // a full name typed at sign-up: the first one is how the app talks to the person
  const top = `<div class="ob-bar"><span class="ob-brand">${brandMark(false)}</span><span class="spacer"></span><select id="ob-lang" class="lang" aria-label="${t('Language')}" data-c="setting" data-k="lang">${options(LANGS, S.settings.lang)}</select>
    <button type="button" class="ob-out" data-a="logout" aria-label="${t('Log out')}" data-tip="${t('Log out')}">${icon('logout')}</button></div>`;
  // the bar in parts of the Journey's page; a screen reader still hears "Step 2 of 5"
  const dots = `<div class="ob-dots js-progress" role="img" aria-label="${t('Step {a} of {b}', { a: step + 1, b: OB_STEPS })}">${Array.from({ length: OB_STEPS }, (_, i) => `<i class="${i === step ? 'now' : i < step ? 'done' : ''}"></i>`).join('')}</div>`;
  const err = o.error || p.error ? `<p class="banner crit js-warn" role="alert">${esc(o.error || p.error)}</p>` : '';
  const later = `<p class="ob-later"><button class="linkbtn" data-a="ob-finish">${t('Finish later and open my dashboard')}</button></p>`;
  const foot = (label, action, lead) => `<footer class="js-foot ob-foot">${lead || ''}${dots}<div class="js-actions">${step ? `<button class="btn ghost js-back" data-a="ob-back" aria-label="${t('Back')}">${icon('left')}</button>` : ''}<button class="btn primary js-go" data-a="${action}">${label}${icon('right')}</button></div>${step >= 1 && step <= 3 ? later : ''}</footer>`;
  let words, body, end;
  if (step === 0) {
    words = `<p class="js-eyebrow">${t('Your plan in a minute')}</p><h1 id="ob-h" tabindex="-1">${t('Hi, welcome!')} ${emo('👋')}</h1><p class="js-lead">${t('In a minute we see what your money can do for your first dream.')}</p>`;
    body = `${err}<div class="field ob-name"><label for="ob-name">${t('What’s your name?')}</label><input type="text" id="ob-name" autocomplete="given-name" value="${esc(p.name)}" placeholder="${t('A nickname works')}" data-c="pub" data-k="name" data-live="1">
      <p class="js-soft" id="ob-name-say">${esc(obNameSay())}</p></div>`;
    end = foot(t('Start'), 'onboard-save');
  } else if (step === 1) {
    const say = OB_SAY();
    words = `<h1 id="ob-h" tabindex="-1">${name ? t('{name}, which dream do you want to reach first?', { name }) : t('Which dream do you want to reach first?')}</h1><p class="js-lead ob-wide">${t('Pick one and tell us what it costs. We put a date on it in a minute.')}</p>`;
    body = `${err}<div class="ob-dreams" role="group" aria-label="${t('Your first dream')}">${obDreams().map(([k], i) => `<button type="button" class="ob-dream" style="--i:${i}" data-a="ob-dream" data-v="${k}" aria-pressed="${o.dream === k}">${obArt(OB_ART[k] || 'sparkle')}<span class="grow"><b>${say[k][0]}</b><small>${say[k][1]}</small></span></button>`).join('')}</div>
      ${o.dream ? (row => `${row[3] ? '' : obField('ob-dream-name', t('What is it?'), 'dreamName', o.dreamName, `placeholder="${t('e.g. My own place, a new laptop')}"`)}
        ${obSlide('ob-cost', o.dream === 'safety' ? t('How much do you want to have put aside?') : t('How much does it cost, more or less?'), 'cost', o.cost, row[5], row[6])}
        <p class="js-soft">${t('A rough figure works. You adjust it later.')}</p>`)(obDreams().find(x => x[0] === o.dream)) : ''}`;
    end = foot(t('Next'), 'ob-next', o.dream ? `<p class="ob-cheer" role="status">${esc(obCheer())}</p>` : '');      // the cheer sits over the Next button (owner, 2026-10-07)
  } else if (step === 2) {
    const [label, whole, cents] = obLeftText();
    words = `<h1 id="ob-h" tabindex="-1">${name ? t('How do your numbers look today, {name}?', { name }) : t('How do your numbers look today?')}</h1>
      <div class="ob-live"><div class="ob-left" id="ob-left" role="status"><span class="ob-left-k">${label}</span><b class="num"><span class="ob-left-n">${esc(whole)}</span><small class="ob-left-c">${esc(cents)}</small></b><small class="ob-left-say ob-wide">${t('What comes in minus what goes out.')}</small></div>${obDreamChip()}</div>`;
    body = `${err}${obSlide('ob-pay0', t('Comes in each month, after taxes'), 'pay', o.pay, OB_MAX.income, 100, '', '', 'coins')}
      ${obSlide('ob-spend', t('Goes out each month'), 'spend', o.spend, OB_MAX.spend, 100, '', '', 'wallet')}
      ${obSlide('ob-saved', t('Already saved'), 'saved', o.saved, OB_MAX.saved, 100, '', '', 'piggy-bank')}
      <p class="js-soft ob-avg">${t('They start at Brazil’s averages. Move them to yours.')} ${info(t('Where the sliders start. Comes in: R$ 3.738, the average monthly income from work in Brazil (IBGE, PNAD Contínua, 2nd quarter of 2026). Goes out: 86% of that, the share of their income that families spend (IBGE, POF 2017-2018). Already saved: one month of spending; about half of Brazilians have a month or less put aside (Anbima, Raio X do Investidor 2026). They are only where the sliders start: nothing is kept until you confirm your own numbers.'))}</p>`;
    end = foot(t('See my projection'), 'ob-next');
  } else if (step === 3) {
    const rv = obReveal(obRead());
    words = `<p class="js-eyebrow">${name ? t('{name}, this is what your money can already do', { name }) : t('This is what your money can already do')}</p>${rv.hero}`;
    body = `${rv.track}${rv.rest}`;
    end = foot(t('Start taking control'), 'ob-next');
  } else {
    const way = (go, ic, title, text, i) => `<button type="button" class="ob-way" style="--i:${i}" data-a="ob-finish" data-go="${go}">${obArt(ic)}<span class="grow"><b>${title}</b><small>${text}</small></span>${icon('right')}</button>`;
    words = `<h1 id="ob-h" tabindex="-1">${t('Let’s make your date sharper')}</h1><p class="js-lead">${t('The more Dorax knows about your month, the truer what it shows you. Pick where to start, or go straight to your dashboard.')}</p>`;
    body = `${err}<p class="ob-pick">${t('Pick where to start')}</p><div class="ob-ways">${way('limits', 'sliders-horizontal', t('Plan my month'), t('How much to spend on each category. Dorax lets you know at 80%.'), 0)}${way('plan', 'calendar-dots', t('Add my fixed costs and due days'), t('Rent, internet, cards. Dorax reminds you before each one is due.'), 1)}
      ${deskOnly('sheet') ? '' : way('sheet', 'file-xls', t('Bring my spreadsheet'), t('Fixed costs, income and goals come in without typing them.'), 2)}</div>`;
    end = foot(t('Open my dashboard'), 'ob-finish');
  }
  // the stage (the bar, the words, the drawing) and the sheet (what is asked) scroll together on a phone; the foot with the large button stays
  return `<main class="auth plain ob-wrap"><div class="onb ob-page js-page ob-forest" id="obpage" data-step="${step}"><div class="js-body ob-body${enter ? ' in' : ''}">
    <header class="ob-stage">${top}<div class="ob-words">${words}</div>${obScene(step)}</header><div class="js-step ob-sheet">${body}</div></div>${end}</div></main>`;
}
/** After the page is drawn, on a new step: the figures count up and the title takes the focus. */
function obAfter() {
  const root = $('obpage'); document.documentElement.classList.toggle('ob-open', !!root);
  if (!root) { obShown = -1; return; }
  const step = +root.dataset.step; if (step === obShown) return;
  obShown = step; root.querySelectorAll('[data-count]').forEach(countUp);
  const h = $('ob-h'); if (h) h.focus({ preventScroll: true });
}
