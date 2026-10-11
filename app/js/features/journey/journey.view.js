/* Dorax Finance — the Journey out of debt (owner, 2026-10-10: "add to the summary a black button with a subtle border, white words and an icon,
   called Journey; inside, something like the picture (a streak, the days of the week, a progress bar) and other relevant information. The main goal
   is to run sprints to get out of debt, with reminders, to answer 'How do I get out of debt?'").
   The calculations are in core/journey.js (the server's reminders use them too); here: the button, its panel and the panels it opens.
   The panel, top to bottom: the streak and the week (the person marks each day with no new debt; today and yesterday can be marked), the sprint and
   its bar, when the debt ends at the pace of the sprint (and with R$ 100 more a month), what is owed (the debts written, then the cards), and the
   reminders. Each figure comes from what the person wrote or what the app holds; nothing is advised: the order the extra money goes in is theirs. */
const JR_DAYS = () => [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')];
/** The streak's flame, filled, with a lighter heart: the brand's green, never an emoji. */
const jrFlame = () => `<svg class="jr-fl" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c.7 3.4-1.2 5.3-3 7.1C7.3 11 5.6 12.8 5.6 15.6c0 3.7 2.9 6.4 6.4 6.4s6.4-2.7 6.4-6.4c0-2.6-1.2-4.6-2.6-6.1-.3 1.5-1 2.7-2.2 3.3.4-3.8-.6-7.8-1.6-10.6z" fill="currentColor"/><path d="M12 13.4c.2 1.4-.6 2.2-1.2 2.9-.5.5-.9 1.1-.9 1.9a2.1 2.1 0 0 0 4.2 0c0-.9-.4-1.6-.9-2.1-.1.5-.4.9-.8 1.1.2-1.3-.1-2.7-.4-3.8z" fill="var(--jr-heart)"/></svg>`;

/** The button of the summary, at the right of the month: black, a subtle border, white words, the flame; the streak beside it once there is one.
    lit: the summary was just arrived at, and the flame lights up (owner, 2026-10-10: "animate the sprint's flame each time the summary is entered");
    the bar drawn again on the same screen (a payment marked, a figure hidden) leaves it still. */
function journeyButton(lit) {
  const n = journeyStreak(journeyOf(B()), S.today), say = t('Journey') + (n ? ' · ' + tn(n, '{n} day streak', '{n} days streak') : '');
  return `<button class="btn jr-btn${lit ? ' lit' : ''}" data-a="journey-open" aria-haspopup="dialog" aria-label="${esc(say)}" data-tip="${esc(t('Your way out of debt'))}">${icon('flame')}<span>${t('Journey')}</span>${n ? `<b class="num" aria-hidden="true">${n}</b>` : ''}</button>`;
}

// ---------- the panel ----------
function jrWeek(j) {
  const today = S.today, yest = addDays(today, -1), names = JR_DAYS();
  return `<ol class="jr-week" aria-label="${t('This week')}">${journeyWeek(today).map((d, i) => {
    const on = !!j.checks[d], can = d === today || d === yest, cls = on ? 'on' : d === today ? 'now' : d < today ? 'past' : 'next';
    const say = `${names[i]} ${fmt.date(d)}: ${on ? t('no new debt') : d > today ? t('still to come') : t('not marked')}`;
    const mark = on ? icon('check') : '';
    return `<li>${can ? `<button class="jr-day ${cls}" data-a="journey-mark" data-d="${d}" aria-pressed="${on}" aria-label="${esc(say)}">${mark}</button>` : `<span class="jr-day ${cls}" role="img" aria-label="${esc(say)}">${mark}</span>`}<small aria-hidden="true">${names[i]}</small></li>`;
  }).join('')}</ol>`;
}
function jrSprint(s, cur, j) {
  if (!s) {
    const last = j.sprints[j.sprints.length - 1];
    return `<div class="jr-sprint none"><small class="jr-lab">${t('Sprint')}</small>
      <p>${t('A sprint is a short stretch, 7, 14 or 30 days, with an amount to pay off: short enough to keep in your head.')}</p>
      ${last ? `<p class="note">${t('Last sprint: {paid} of {target}.', { paid: fmt.money(last.paid, cur, { trim: true }), target: fmt.money(last.target, cur, { trim: true }) })}</p>` : ''}
      <button class="btn primary" data-a="sprint-new">${icon('flag')}${t('Start a sprint')}</button></div>`;
  }
  const daily = Math.ceil(s.missing / (s.daysLeft + 1) / 100) * 100;      // today counts: the last day still has room; “about”, so whole reais
  const say = s.done ? (s.missing ? t('The sprint ended: you paid {paid} of {target}.', { paid: fmt.money(s.paid, cur), target: fmt.money(s.target, cur) }) : t('Sprint done: you reached {target}.', { target: fmt.money(s.target, cur) }))
    : s.missing ? tn(s.daysLeft + 1, '{n} day left and {amount} to go: about {daily} a day.', '{n} days left and {amount} to go: about {daily} a day.', { amount: fmt.money(s.missing, cur), daily: fmt.money(daily, cur, { round: true }) })
      : tn(s.daysLeft, 'Target reached, with {n} day to spare.', 'Target reached, with {n} days to spare.');
  return `<div class="jr-sprint" id="jr-sprint"><div class="jr-sh"><small class="jr-lab">${t('Sprint')} · ${t('day {a} of {b}', { a: s.day, b: s.days })}</small>${s.done ? '' : `<button class="linkbtn" data-a="sprint-new">${t('Edit')}</button>`}</div>
    <div class="jr-fig"><b class="num">${fmt.money(s.paid, cur, { trim: true })}</b><span class="num">/ ${fmt.money(s.target, cur, { trim: true })}</span><span class="num jr-pct">${s.pct}%</span></div>
    <div class="jr-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.pct}" aria-label="${esc(t('Paid in this sprint'))}"><i style="width:${s.pct}%"></i></div>
    <p class="note">${say}</p>
    ${s.done ? `<button class="btn primary" data-a="sprint-close">${t('Close it and start the next')}</button>` : ''}</div>`;
}
function jrFree(list, pace, cur) {
  if (!pace) return `<p class="note">${t('Start a sprint, or give your debts their monthly payment, to see when you are out.')}</p>`;
  const plan = payoffPlan(list, pace.amount), from = pace.from === 'sprint' ? t('the pace of your sprint') : t('your monthly payments');
  if (plan.stuck) return `<p class="neg">${t('At {amount} a month the debt does not go down: the interest alone is {interest} a month.', { amount: fmt.money(pace.amount, cur, { round: true }), interest: fmt.money(plan.interest, cur, { round: true }) })}</p>`;
  const more = payoffPlan(list, pace.amount + 10000), sooner = more && !more.stuck ? plan.months - more.months : 0;
  return `<p class="jr-big">${esc(fmt.month(payoffMonth(S.today, plan.months)))}</p>
    <p class="note">${tn(plan.months, 'At {amount} a month ({from}): {n} month.', 'At {amount} a month ({from}): {n} months.', { amount: fmt.money(pace.amount, cur, { round: true }), from })}${plan.interest > 0 ? ' ' + t('Interest along the way: {amount}.', { amount: fmt.money(plan.interest, cur, { round: true }) }) : ''}</p>
    ${sooner > 0 ? `<p class="note">${tn(sooner, 'With {extra} more a month: {month}, {n} month sooner.', 'With {extra} more a month: {month}, {n} months sooner.', { extra: fmt.money(10000, cur, { trim: true }), month: fmt.month(payoffMonth(S.today, more.months)) })}</p>` : ''}`;
}
function jrRow(x, i, n, cur) {
  if (x.kind === 'card') return `<li class="jr-row">${bankMark(x.institution, true)}<span class="grow"><b>${esc(x.name)}</b><small>${x.date ? t('Card invoice, due {date}', { date: fmt.date(x.date) }) : t('Card, with no due date')}</small></span><b class="num">${fmt.money(x.left, cur)}</b>
    <span class="jr-acts"><button class="btn sm" data-a="card-pay" data-id="${x.id}" data-back="journey">${t('Pay')}</button></span></li>`;
  const bits = [x.rate ? t('{r}% a month', { r: String(x.rate).replace('.', S.settings.lang === 'en' ? '.' : ',') }) : '', x.min ? t('payment {amount}', { amount: fmt.money(x.min, cur, { trim: true }) }) : '', x.due ? t('due on the {d}', { d: x.due }) : ''].filter(Boolean);
  const done = x.left <= 0, paidPct = x.owed ? Math.round((x.owed - x.left) * 100 / x.owed) : 0;
  return `<li class="jr-row${done ? ' done' : ''}"><span class="jr-ord">${i + 1}</span><span class="grow"><b>${esc(x.name)}</b><small>${done ? t('Paid off') : bits.join(' · ') || t('No interest or payment given')}</small>${!done && paidPct > 0 ? meter(paidPct, 'go') : ''}</span><b class="num">${fmt.money(x.left, cur)}</b>
    <span class="jr-acts">${done ? '' : `<button class="btn sm" data-a="debt-pay" data-id="${x.id}">${t('Pay')}</button>`}<button class="btn sm ghost" data-a="debt-edit" data-id="${x.id}">${t('Edit')}</button>
      ${n > 1 ? `<button class="btn sm ghost ico" data-a="debt-move" data-id="${x.id}" data-v="-1" aria-label="${esc(t('Move {name} up', { name: x.name }))}" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button><button class="btn sm ghost ico" data-a="debt-move" data-id="${x.id}" data-v="1" aria-label="${esc(t('Move {name} down', { name: x.name }))}" ${i === n - 1 ? 'disabled' : ''}>${icon('down')}</button>` : ''}</span></li>`;
}
function journeyDrawer() {
  const b = B(), cur = BCUR(), j = journeyOf(b), today = S.today, streak = journeyStreak(j, today), best = journeyBest(j), s = sprintNow(b, today, cur);
  const list = journeyDebts(b, today, cur), mine = list.filter(x => x.kind === 'debt'), total = sum(list.map(x => x.left)), pace = journeyPace(b, today, cur), notify = S.user.notify.journey !== false;
  return `<div class="body jr">
    <section class="jr-card" aria-label="${t('Streak')}">
      <div class="jr-top"><span class="jr-flame">${jrFlame()}</span><div class="jr-streak"><small class="jr-lab">${t('Streak')}</small><b><span class="num">${streak}</span> ${tn(streak, 'day', 'days')}</b></div>${best > streak ? `<span class="jr-best">${t('Best: {n}', { n: best })}</span>` : ''}</div>
      ${jrWeek(j)}
      ${j.checks[today] ? `<p class="jr-ok">${icon('check')}${t('Today is marked. See you tomorrow.')}</p>` : `<div class="jr-ask"><p>${t('A day with no new debt: no new loan, no purchase you cannot pay this month.')}</p><button class="btn primary" data-a="journey-mark" data-d="${today}">${icon('check')}${t('I added no debt today')}</button></div>`}
      ${jrSprint(s, cur, j)}
    </section>
    ${total ? `<section class="jr-sec" id="jr-free"><h3>${t('Out of debt in')}</h3>${jrFree(list, pace, cur)}</section>` : ''}
    <section class="jr-sec" id="jr-debts"><div class="jr-h"><h3>${t('What you owe')}</h3>${list.length ? `<b class="num">${fmt.money(total, cur)}</b>` : ''}</div>
      ${list.length ? `<ul class="jr-list">${list.map((x, i) => jrRow(x, i, mine.length, cur)).join('')}</ul>` : ''}
      ${total ? '' : `<p class="note">${list.length ? t('Everything here is paid off.') : t('Nothing owed here yet. Add what you owe, and the cards with an invoice come in by themselves.')}</p>`}
      ${mine.length > 1 ? `<p class="note">${t('What you pay above the monthly payments goes to the first debt of the list. Two common orders: the highest interest first (less interest paid), or the smallest first (one debt less, sooner). The order is yours.')}</p>` : ''}
      <button class="btn sm" data-a="debt-new">${icon('plus')}${t('Add a debt')}</button></section>
    <section class="jr-sec"><h3>${t('Reminders')}</h3><p class="note">${notify ? t('While a sprint runs, each morning Dorax asks about the day before; and it reminds you before a debt’s payment is due. On this device and by email, as set in your profile.') : t('Journey reminders are off. Turn them on in your profile.')}</p>
      <a class="btn sm ghost" href="#profile" data-a="remind-go" data-route="profile">${t('Reminder settings')}</a></section>
  </div>
  <footer><button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`;
}

// ---------- a debt: written or changed ----------
function debtFormDrawer(d) {
  const g = d.draft;
  return `<div class="body">${d.error ? errBanner(d.error) : ''}<div class="form-grid">
    ${fld('db-name', t('What it is'), inp('db-name', 'name', g.name, `placeholder="${esc(t('e.g. Bank loan, Overdraft, Store'))}"`), 'full')}
    ${fld('db-owed', tcur('Owed today (R$)'), inp('db-owed', 'owedText', g.owedText, 'inputmode="decimal" class="num"'))}
    ${fld('db-rate', `${t('Interest a month (%)')} <span class="muted">${t('optional')}</span>`, inp('db-rate', 'rateText', g.rateText, 'inputmode="decimal" class="num" placeholder="0"'))}
    ${fld('db-min', `${tcur('Monthly payment (R$)')} <span class="muted">${t('optional')}</span>`, inp('db-min', 'minText', g.minText, 'inputmode="decimal" class="num" placeholder="0"'))}
    ${fld('db-due', `${t('Due day')} <span class="muted">${t('optional')}</span>`, inp('db-due', 'dueText', g.dueText, 'inputmode="numeric" class="num" placeholder="1–31"'))}
  </div>
  <p class="note">${t('The interest is in the contract or in the bank’s app, as “juros ao mês”. Without it, the date out of debt counts no interest. With the due day and the payment, Dorax reminds you before it is due.')}</p></div>
  <footer><button class="btn primary" data-a="debt-save">${d.isNew ? t('Add debt') : t('Save')}</button>${d.isNew ? '' : `<button class="btn ghost" data-a="debt-delete" data-id="${g.id}">${icon('trash')}${t('Delete')}</button>`}<button class="btn ghost spacer" ${d.back === 'start' ? 'data-a="close"' : 'data-a="journey-open"'}>${t('Cancel')}</button></footer>`;
}
// ---------- a payment against a debt ----------
function debtPayDrawer(d) {
  const g = d.draft, j = journeyOf(B()), debt = j.debts.find(x => x.id === g.debtId);
  return `<div class="body">${d.error ? errBanner(d.error) : ''}<p class="note">${t('{name} owes {amount}.', { name: esc(debt ? debt.name : ''), amount: fmt.money(debt ? debtLeft(j, debt) : 0, BCUR()) })}</p><div class="form-grid">
    ${fld('dp-amount', tcur('Amount (R$)'), inp('dp-amount', 'amountText', g.amountText, 'inputmode="decimal" class="num"'))}
    ${fld('dp-date', t('Date'), `<input type="date" id="dp-date" data-c="draft" data-k="date" value="${esc(g.date)}" max="${S.today}">`)}
  </div><p class="note">${t('It lowers what this debt owes and counts in your sprint. The money leaving your account is recorded with your transactions, as always.')}</p></div>
  <footer><button class="btn primary" data-a="debt-pay-save">${icon('check')}${t('Record payment')}</button><button class="btn ghost spacer" data-a="${d.back === 'reminders' ? 'reminders' : 'journey-open'}">${t('Cancel')}</button></footer>`;
}
// ---------- a sprint: started or changed ----------
function sprintFormDrawer(d) {
  const g = d.draft, cur = BCUR(), mins = sum(journeyOf(B()).debts.map(x => x.min || 0)), cover = mins ? Math.round(mins * g.days / 30) : 0, end = addDays(g.start, g.days - 1);
  return `<div class="body">${d.error ? errBanner(d.error) : ''}
    <div class="field"><span class="lbl" id="sp-days-l">${t('How long')}</span>${seg('sprint-days', [[7, tn(7, '{n} day', '{n} days')], [14, tn(14, '{n} day', '{n} days')], [30, tn(30, '{n} day', '{n} days')]], g.days, t('How long'))}</div>
    <div class="form-grid">${fld('sp-target', tcur('Amount to pay off (R$)'), inp('sp-target', 'targetText', g.targetText, 'inputmode="decimal" class="num"'), 'full')}</div>
    ${cover ? `<div class="row"><span class="note">${t('Your monthly payments, for these days: {amount}.', { amount: fmt.money(cover, cur) })}</span><button class="btn sm" data-a="sprint-use" data-v="${cover}">${t('Use this amount')}</button></div>` : ''}
    <p class="note">${t('From {start} to {end}. Payments to your debts and to your cards count.', { start: fmt.date(g.start), end: fmt.date(end) })}</p></div>
  <footer><button class="btn primary" data-a="sprint-save">${d.isNew ? t('Start sprint') : t('Save')}</button><button class="btn ghost spacer" data-a="journey-open">${t('Cancel')}</button></footer>`;
}

// ---------- the first time: a page of its own ----------
// Owner, 2026-10-10, first: "when the person taps Journey and has no sprint yet, make an interactive onboarding: explain what it is, why it was
// created, and let them create a sprint; for that, notifications must be on". Then: "it has no animation at all; it looks like the steps of a form,
// not an onboarding; it does not motivate, it does not make me feel the way out of debt. On the phone it cannot open in a panel as now: make a page
// of its own that takes the whole screen. I don't want it to be a form's card."
// So: a page over the whole screen (#jstart-root), the same on a phone and a computer, drawn over a scene that is the way itself: a path climbing
// through dark hills toward the dawn. Each step walks a glowing point further up the path; the sky lightens from night to daybreak as it goes; at
// the end the flag at the top lights up. Over it, without any card: large words, one idea per step, and one button at the thumb.
//   0  the start: "your way out of debt starts today"; the flame, which a tap lights (today marked for real)
//   1  why: 82.8 million counted up, with its source, and "you are not alone"
//   2  how: streak, sprint, the way out, appearing one after the other along the path
//   3  what is owed: the total counted up; the cards already there; a debt can be added (its form opens over the page)
//   4  every morning, with you: a notification slides in as it will on the phone; notifications are turned on here (required to go on)
//   5  the first sprint: 7, 14 or 30 days as large choices, the amount in large figures; started, the page celebrates and opens the Journey
// Photos: none can be made in this session; JSTART_PHOTOS takes one picture per step (a path under app/img/journey/) when there are some.
const JSTART_STEPS = 6, JSTART_AT = [.07, .24, .42, .6, .78, .93];
const JSTART_PHOTOS = [];
const JSTART_PATH = 'M 92 640 C 150 560, 330 560, 262 470 S 96 392, 190 318 S 340 236, 290 150';
/** This device's notifications are on, and the Journey's reminders are not switched off. */
const jNotifyOk = () => (UI.push || {}).status === 'on' && S.user.notify.journey !== false;
/** The scene: drawn once when the page opens; afterwards only the point, the light and the path drawn so far move. */
function jstartScene() {
  const stars = Array.from({ length: 34 }, (_, i) => { const x = (i * 97) % 400, y = (i * 53) % 300, r = i % 5 === 0 ? 1.6 : .9; return `<circle cx="${x}" cy="${y}" r="${r}" style="animation-delay:${(i % 7) * .45}s"/>`; }).join('');
  const marks = [.25, .5, .75].map(f => `<circle class="js-mark" data-f="${f}" r="5"/>`).join('');
  return `<svg class="js-svg" viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="js-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020604"/><stop offset=".55" stop-color="#03130C"/><stop offset="1" stop-color="#062A1A"/></linearGradient>
      <radialGradient id="js-dawn" cx="290" cy="150" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3ECF8E" stop-opacity=".9"/><stop offset=".35" stop-color="#006239" stop-opacity=".55"/><stop offset="1" stop-color="#006239" stop-opacity="0"/></radialGradient>
      <filter id="js-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <rect width="400" height="640" fill="url(#js-sky)"/>
    <rect class="js-dawn" width="400" height="640" fill="url(#js-dawn)"/>
    <g class="js-stars" fill="#FFFFFF">${stars}</g>
    <path class="js-hill h3" d="M0 300 L60 250 L120 285 L190 205 L250 250 L300 150 L360 225 L400 190 L400 640 L0 640 Z"/>
    <path class="js-hill h2" d="M0 400 L70 335 L140 380 L210 320 L290 372 L360 318 L400 345 L400 640 L0 640 Z"/>
    <path class="js-hill h1" d="M0 500 L90 430 L170 488 L250 440 L330 492 L400 455 L400 640 L0 640 Z"/>
    <path class="js-road" d="${JSTART_PATH}"/>
    <path class="js-walked" d="${JSTART_PATH}" pathLength="1"/>
    ${marks}
    <g class="js-flag" transform="translate(290 150)"><circle class="js-flag-glow" r="18" filter="url(#js-glow)"/><path d="M0 0 V-34" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/><path class="js-flag-cloth" d="M1 -34 L22 -27 L1 -20 Z"/></g>
    <g class="js-me"><circle r="16" class="js-me-glow" filter="url(#js-glow)"/><circle r="6.5" class="js-me-dot"/></g>
  </svg>`;
}
/** Where on a scene's path a fraction of the way is, from the drawn path itself. */
function scenePoint(root, f) { const p = root && root.querySelector('.js-walked'); if (!p || !p.getTotalLength) return { x: 92, y: 640 }; const L = p.getTotalLength(), pt = p.getPointAtLength(Math.max(0, Math.min(1, f)) * L); return { x: pt.x, y: pt.y }; }
/** A scene's point walks from one fraction of the way to another (at once for someone who asked for less motion); the light and the marks follow.
    Used by the Journey's first page and by the first-time setup (features/onboarding). */
function sceneWalk(root, from, f) {
  if (!root) return; const me = root.querySelector('.js-me'); if (!me) return;
  const put = v => { const pt = scenePoint(root, v); me.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`); root.style.setProperty('--p', v.toFixed(3)); root.querySelectorAll('.js-mark').forEach(m => m.classList.toggle('on', v >= +m.dataset.f)); };
  root.querySelectorAll('.js-mark').forEach(m => { const pt = scenePoint(root, +m.dataset.f); m.setAttribute('cx', pt.x.toFixed(1)); m.setAttribute('cy', pt.y.toFixed(1)); });
  cancelAnimationFrame(root._walk);
  if (reducedMotion() || from === f) return put(f);
  const t0 = performance.now(), dur = 1300, ease = x => 1 - Math.pow(1 - x, 3);
  const step = now => { const k = Math.min(1, (now - t0) / dur); put(from + (f - from) * ease(k)); if (k < 1) root._walk = requestAnimationFrame(step); };
  root._walk = requestAnimationFrame(step);
}
function jstartWalk(f) { const root = $('jstart'); if (!root) return; const from = +(root.dataset.at || 0); root.dataset.at = f; sceneWalk(root, from, f); }
/** A figure that counts up to its value (at once for someone who asked for less motion). */
function jstartCount(el, to, say) {
  if (!el) return; if (reducedMotion()) { el.textContent = say(to); return; }
  const t0 = performance.now(), dur = 1400, ease = x => 1 - Math.pow(1 - x, 4);
  const step = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = say(to * ease(k)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function jstartNotify() {
  const p = UI.push || {}, st = p.status;
  if (jNotifyOk()) return `<p class="js-ok">${icon('check')}${t('Notifications are on for this device.')}</p>`;
  if (p.busy || !p.known) return `<p class="js-soft">${t('One moment…')}</p>`;
  if (st === 'on' || st === 'off') return '';
  const say = st === 'blocked' ? t('Notifications for Dorax are blocked in this browser. Allow them in the browser’s settings for this site, then reload the page.')
    : st === 'install' ? t('On an iPhone or iPad, add Dorax to the Home Screen first: tap Share, then “Add to Home Screen”. Open Dorax from there and turn notifications on.')
      : st === 'preview' ? t('This preview sends nothing: no notifications and no emails.') : `${t('This browser cannot show notifications from a website.')} ${t('Open Dorax on your phone to start your sprint.')}`;
  return `<p class="js-warn">${esc(say)}</p>${st === 'blocked' ? `<button class="js-link" data-a="jstart-recheck">${t('I allowed them')}</button>` : ''}`;
}
/** One step's words and what can be done in it. */
function jstartBody(J) {
  const s = J.step, b = B(), cur = BCUR(), j = journeyOf(b);
  if (J.done) {
    const sp = j.sprint;
    return `<div class="js-step done"><span class="js-flame big lit">${jrFlame()}</span><p class="js-eyebrow">${t('Journey')}</p><h1 id="js-h" tabindex="-1">${t('Your Journey has begun!')}</h1>
      ${sp ? `<p class="js-lead">${t('Sprint of {n} days · {amount}', { n: sp.days, amount: fmt.money(sp.target, cur, { trim: true }) })}</p><p class="js-soft">${t('It ends on {date}. Tomorrow morning Dorax asks you about today.', { date: fmt.date(addDays(sp.start, sp.days - 1)) })}</p>` : ''}</div>`;
  }
  if (s === 0) {
    const lit = !!j.checks[S.today];
    return `<div class="js-step"><p class="js-eyebrow">${t('Journey')}</p><h1 id="js-h" tabindex="-1">${t('Your way out of debt starts today.')}</h1>
      <p class="js-lead">${t('One day at a time, one stretch at a time. No guilt: a plan.')}</p>
      <button class="js-light${lit ? ' on' : ''}" data-a="jstart-light" aria-pressed="${lit}"><span class="js-flame${lit ? ' lit' : ''}">${jrFlame()}</span><span>${lit ? `<b>${t('Day 1.')}</b> ${t('You have started.')}` : t('Tap the flame if you added no debt today: your first day.')}</span></button></div>`;
  }
  if (s === 1) return `<div class="js-step"><p class="js-eyebrow">${t('Why the Journey exists')}</p>
      <h1 id="js-h" tabindex="-1"><span class="js-big num" data-count="82.8">${t('82.8 million')}</span><span class="js-h-rest">${t('Brazilians have overdue debts.')}</span></h1>
      <p class="js-src">${t('Serasa, Mapa da Inadimplência, March 2026.')}</p>
      <p class="js-lead">${t('You are not alone. And there is a way out: a clear amount, one day at a time.')}</p></div>`;
  if (s === 2) return `<div class="js-step"><p class="js-eyebrow">${t('How it works')}</p><h1 id="js-h" tabindex="-1">${t('Three things, every day.')}</h1>
      <ol class="js-how">
        <li style="--i:0"><span class="js-ico">${icon('flame')}</span><span><b>${t('Streak')}</b>${t('Each day with no new debt, you mark it. The days in a row are your streak.')}</span></li>
        <li style="--i:1"><span class="js-ico">${icon('flag')}</span><span><b>${t('Sprint')}</b>${t('7, 14 or 30 days with an amount to pay off. A bar shows how far you are.')}</span></li>
        <li style="--i:2"><span class="js-ico">${icon('sun')}</span><span><b>${t('The way out')}</b>${t('The month you are out of debt, worked out from your own figures.')}</span></li>
      </ol></div>`;
  if (s === 3) {
    const list = journeyDebts(b, S.today, cur), total = sum(list.map(x => x.left));
    return `<div class="js-step"><p class="js-eyebrow">${t('What you owe')}</p><h1 id="js-h" tabindex="-1">${t('Look at what you owe, face to face.')}</h1>
      <p class="js-lead">${t('Putting a number on it is the first step. Your cards are already here.')}</p>
      ${list.length ? `<p class="js-total"><span class="js-big num" data-money="${total}">${fmt.money(total, cur)}</span></p>
        <ul class="js-owed">${list.map((x, i) => `<li style="--i:${i}">${x.kind === 'card' ? bankMark(x.institution, true) : `<span class="js-dot"></span>`}<span class="grow">${esc(x.name)}</span><b class="num">${fmt.money(x.left, cur)}</b></li>`).join('')}</ul>` : `<p class="js-soft">${t('Nothing owed here yet.')}</p>`}
      <button class="js-link" data-a="debt-new" data-back="start">${icon('plus')}${t('Add a debt')}</button></div>`;
  }
  if (s === 4) return `<div class="js-step"><p class="js-eyebrow">${t('Every morning, with you')}</p><h1 id="js-h" tabindex="-1">${t('Dorax walks with you.')}</h1>
      <div class="js-notif" aria-hidden="true"><span class="js-app">${icon('flame')}</span><span class="grow"><span class="js-n-top"><b>DORAX</b><small>${t('now')}</small></span><b>${t('Journey')}</b><span>${t('Did you add no debt yesterday? Mark it to keep your streak of {n} days.', { n: 3 })}</span></span></div>
      <p class="js-lead">${t('Each morning a question about the day before, and a word before each payment is due. To start a sprint, notifications must be on.')}</p>${jstartNotify()}</div>`;
  const g = J.draft, mins = sum(j.debts.map(x => x.min || 0)), cover = mins ? Math.round(mins * g.days / 30) : 0, end = addDays(g.start, g.days - 1);
  const say = { 7: t('One week'), 14: t('Two weeks'), 30: t('One month') };
  return `<div class="js-step"><p class="js-eyebrow">${t('Your first sprint')}</p><h1 id="js-h" tabindex="-1">${t('Short and possible beats long and perfect.')}</h1>
      <div class="js-days" role="radiogroup" aria-label="${esc(t('How long'))}">${[7, 14, 30].map(n => `<button role="radio" aria-checked="${g.days === n}" data-a="jstart-days" data-v="${n}"><b class="num">${n}</b><small>${say[n]}</small></button>`).join('')}</div>
      <label class="js-amount" for="sp-target"><span class="sr">${tcur('Amount to pay off (R$)')}</span><span class="js-cur">${esc(SYMBOL[cur] || cur)}</span><input id="sp-target" type="text" inputmode="decimal" class="num" data-c="jstart-target" data-live="1" value="${esc(g.targetText)}" placeholder="0" aria-required="true"${J.error ? ' aria-invalid="true" aria-describedby="js-err"' : ''}></label>
      ${J.error ? `<p class="js-warn" id="js-err" role="alert">${esc(J.error)}</p>` : `<p class="js-soft">${t('to pay off by {date}', { date: fmt.date(end) })}</p>`}
      ${cover ? `<button class="js-link" data-a="jstart-use" data-v="${cover}">${t('Your monthly payments, for these days: {amount}.', { amount: fmt.money(cover, cur) })}</button>` : ''}</div>`;
}
/** The foot: how far along (a bar in six parts), back, and the one thing to do now. */
function jstartFoot(J) {
  const s = J.step, bar = `<ol class="js-progress" aria-label="${esc(t('Step {a} of {b}', { a: s + 1, b: JSTART_STEPS }))}">${Array.from({ length: JSTART_STEPS }, (_, i) => `<li class="${J.done || i < s ? 'done' : i === s ? 'on' : ''}"></li>`).join('')}</ol>`;
  let go;
  if (J.done) go = `<button class="js-go" data-a="jstart-finish">${t('See my Journey')}</button>`;
  else if (s === 4 && !jNotifyOk()) go = (UI.push || {}).status === 'off' ? `<button class="js-go" data-a="jstart-push"${(UI.push || {}).busy ? ' disabled' : ''}>${icon('bell')}${t('Turn on notifications')}</button>`
    : (UI.push || {}).status === 'on' ? `<button class="js-go" data-a="jstart-journey-on">${icon('bell')}${t('Turn on the Journey’s reminders')}</button>` : `<button class="js-go" disabled>${t('Next')}</button>`;
  else if (s === 5) go = `<button class="js-go" data-a="jstart-go">${icon('flag')}${t('Start my first sprint')}</button>`;
  else go = `<button class="js-go" data-a="jstart-step" data-v="${s + 1}">${s === 0 ? t('Begin') : t('Next')}</button>`;
  return `${bar}<div class="js-actions">${s > 0 && !J.done ? `<button class="js-back" data-a="jstart-step" data-v="${s - 1}" aria-label="${esc(t('Back'))}">${icon('left')}</button>` : ''}${go}</div>`;
}
/** Draws the page: all of it when it opens, then only its words and foot (the scene stays, its point walks). enter: a new step, whose words come in. */
function renderJstart(enter) {
  const box = $('jstart-root'); if (!box) return;
  const J = UI.jstart;
  document.documentElement.classList.toggle('js-open', !!J);
  if (!J) { box.innerHTML = ''; return; }
  let root = $('jstart');
  if (!root) {
    box.innerHTML = `<div id="jstart" class="js-page" role="dialog" aria-modal="true" aria-labelledby="js-h" data-at="0"><div class="js-scene">${jstartScene()}</div><div class="js-shade"></div>
      <button class="js-x" data-a="jstart-close" aria-label="${esc(t('Close'))}">${icon('x')}</button><div class="js-photo"></div><main class="js-body"></main><footer class="js-foot"></footer></div>`;
    root = $('jstart'); enter = true;
  }
  const photo = JSTART_PHOTOS[J.step]; root.querySelector('.js-photo').style.backgroundImage = photo ? `url("${photo}")` : '';
  root.dataset.step = J.done ? 'done' : J.step;
  const body = root.querySelector('.js-body'); body.innerHTML = jstartBody(J); body.classList.toggle('in', !!enter);
  root.querySelector('.js-foot').innerHTML = jstartFoot(J);
  jstartWalk(J.done ? 1 : JSTART_AT[J.step]);
  if (enter) {
    const big = body.querySelector('[data-count]'); if (big) { const n = +big.dataset.count; jstartCount(big, n, v => t('{n} million', { n: (S.settings.lang === 'en' ? v.toFixed(1) : v.toFixed(1).replace('.', ',')) })); }
    const money = body.querySelector('[data-money]'); if (money) jstartCount(money, +money.dataset.money, v => fmt.money(Math.round(v), BCUR()));
    const h = $('js-h'); if (h) h.focus({ preventScroll: true });
  }
}
