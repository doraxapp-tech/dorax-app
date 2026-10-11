/* Dorax Finance — the insight of the day on the dashboard: one fact about the person's own month, said the way a friend would say it.
   2026-10-07 (owner: "I want the app to keep motivating in the day to day: tips from real behaviour, an insight of the day"). The facts and their
   figures come from core/insights.js; here they get their words, an icon of the app's own and one thing to do next. A fact that is not good news
   is said plainly and without blame. Names the person typed (a goal, a category, a bill) are shown as text, never as markup. */
const INSIGHT_ICON = { pace: 'trend', mover: 'tag', bills: 'calendar', goal: 'target', mark: 'flag', day: 'sun', streak: 'spark', rate: 'coins', start: 'bulb' };
/** The words of one insight: { title, text, action }. co: the company's side says "costs", "runway" and "reserves" where the household says
    "spending", "freedom" and "goals" (2026-10-07: the company has its insight too). */
function insightSay(x, co) {
  const cur = BCUR(), money = v => fmt.money(Math.round(v / 100) * 100, cur, { trim: true });      // whole units: a sentence reads better without cents
  const bare = ym => { const m = mon(+ym.slice(5, 7) - 1, true); return S.settings.lang === 'en' ? m : m.toLowerCase(); };      // a month's whole name inside a sentence; Spanish and Portuguese write it in lower case
  const whatif = id => `<button class="btn sm" data-a="whatif"${id ? ` data-id="${esc(id)}"` : ''}>${t('What if…?')}</button>`;
  const link = (href, label) => `<a class="btn sm" href="${href}">${label}</a>`;
  const seeTx = cat => `<button class="btn sm" data-a="filter-cat" data-cat="${esc(cat || '')}">${t('See transactions')}</button>`;
  switch (x.kind) {
    case 'pace': { const v = { amount: money(Math.abs(x.diff)), month: bare(x.month) }, so = { amount: money(x.spent) };
      return x.diff < 0
        ? { title: co ? t('The company has paid {amount} less than by this day in {month}.', v) : t('You have spent {amount} less than by this day in {month}.', v), text: co ? t('{amount} in costs so far this month.', so) : t('{amount} so far this month. Keep it up.', so), action: seeTx() }
        : { title: co ? t('The company has paid {amount} more than by this day in {month}.', v) : t('You have spent {amount} more than by this day in {month}.', v), text: co ? t('{amount} in costs so far this month. Seeing it now is what gives you room.', so) : t('{amount} so far this month. Seeing it now is what gives you room.', so), action: seeTx() }; }
    case 'mover': return x.diff < 0
      ? { title: t('{name}: {amount} less than by this day in {month}.', { name: esc(catName(x.id)), amount: money(-x.diff), month: bare(x.month) }), text: t('That is {pct}% less. Whatever you changed, it shows.', { pct: x.pct }), action: seeTx(x.id) }
      : { title: t('{name}: {amount} more than by this day in {month}.', { name: esc(catName(x.id)), amount: money(x.diff), month: bare(x.month) }), text: t('That is {pct}% more. Worth a look, no drama.', { pct: x.pct }), action: seeTx(x.id) };
    case 'bills': return { title: tn(x.n, '{n} bill due in the next 7 days: {total}.', '{n} bills due in the next 7 days: {total}.', { total: money(x.total) }),
      text: x.first.days === 0 ? t('First up: {name}, today.', { name: esc(x.first.name) }) : x.first.days === 1 ? t('First up: {name}, tomorrow.', { name: esc(x.first.name) }) : t('First up: {name}, on {date}.', { name: esc(x.first.name), date: fmt.date(x.first.date) }), action: link('#plan', t('Open plan')) };
    case 'goal': return { title: t('{amount} to go for {name}. At this pace: {month}.', { amount: money(x.remaining), name: esc(x.name), month: fmt.month(x.ym) }),
      text: x.lever ? tn(x.lever.sooner, 'With {amount} more a month, you get there {n} month sooner.', 'With {amount} more a month, you get there {n} months sooner.', { amount: money(x.lever.extra) }) : t('Keep the pace and the date holds.'), action: whatif(x.id) };
    case 'mark': { const v = { amount: money(x.missing), mark: rwMark(x.mark) }, sp = { span: rwFigure(x.days, co).span };
      return { title: co ? t('{amount} more kept and the company reaches {mark} of runway.', v) : t('{amount} more put aside and you reach {mark} of freedom.', v), text: co ? t('Today it has {span}.', sp) : t('Today you have {span}.', sp), action: whatif() }; }
    case 'day': { const v = { amount: money(x.amount) };
      return { title: co ? t('One day of the company costs {amount}.', v) : t('One day of freedom costs {amount}.', v), text: co ? t('That is what goes out in a day at its pace. Every {amount} it keeps buys one more.', v) : t('That is what goes out in a day at your pace. Every {amount} you put aside buys one more.', v), action: whatif() }; }
    case 'streak': return { title: co ? tn(x.n, '{n} month in a row setting money aside in the company.', '{n} months in a row setting money aside in the company.') : tn(x.n, '{n} month in a row putting money aside.', '{n} months in a row putting money aside.'),
      text: x.open ? t('Put something aside in {month} and it is {n}.', { month: bare(x.month), n: x.n + 1 }) : t('This month already counts.'), action: link('#goals', t('Open goals')) };
    case 'rate': { const v = { hundred: money(10000), month: bare(x.month), amount: money(x.per100 * 100) }, ab = { a: money(x.aside), b: money(x.income) };
      return { title: co ? t('Of every {hundred} the company received in {month}, {amount} went to its reserves.', v) : t('Of every {hundred} that came in in {month}, {amount} went to your goals.', v), text: co ? t('{a} set aside of {b} received.', ab) : t('{a} put aside of {b} that came in.', ab), action: link('#goals', t('Open goals')) }; }
    default: return co ? { title: t('The company’s insights start with its first numbers.'), text: t('Add its costs, a statement or a reserve. From then on, every day Dorax tells you one thing about its month.'), action: link('#plan', t('Open plan')) }
      : { title: t('Your insights start with your first numbers.'), text: t('Add what comes in, a fixed cost or a goal. From then on, every day Dorax tells you one thing about your own month.'), action: link('#plan', t('Open plan')) };
  }
}
/** The dashboard's card, for the side in use. fold: it was opened from the phone's signal (features/phone/phone.view.js) and can be folded again.
     There is always one: an account with nothing yet gets the line that says where insights come from. */
function insightCard(fold) {
  const co = inCompany(), pick = insightOfDay(B(), B().today, BCUR(), UI.insightSkip || 0), x = pick.insight || { kind: 'start' }, say = insightSay(x, co);
  if (!fold && !isPhone()) return insightCardPc(pick, x, say, co);
  return `<section class="card insight" id="insight-card" data-kind="${x.kind}"><div class="card-h"><h2>${t('Insight of the day')}</h2>${info(co ? t('One fact a day, worked out from the company’s own numbers: its costs by this day, the bills ahead, its reserves and its runway. It is arithmetic on what was recorded and planned, not advice. “Another” shows the next one.')
      : t('One fact a day, worked out from your own numbers: your spending by this day, the bills ahead, your goals and your days of freedom. It is arithmetic on what you recorded and planned, not advice, and it compares you only with yourself. “Another” shows the next one.'))}
      ${pick.count > 1 || fold ? `<span class="right">${pick.count > 1 ? `<button class="btn sm" id="insight-next" data-a="insight-next">${t('Another')}</button>` : ''}${fold ? `<button class="btn sm ghost in-fold" id="insight-open" data-a="insight-open" aria-expanded="true" aria-label="${t('Hide')}">${icon('right')}</button>` : ''}</span>` : ''}</div>
    <div class="card-b" aria-live="polite"><span class="fl-ico">${icon(INSIGHT_ICON[x.kind])}</span><span class="grow"><b>${say.title}</b><small>${say.text}</small></span>${say.action}</div></section>`;
}
/** The computer's card (owner, 2026-10-08: "I don't like the design of the insight of the day on the computer, improve its UI"). The fact is the
    headline: its icon and the card's name above it, "Another" (with its arrows) at the right; the fact large, what it means under it; at the foot, what
    to do with it and, as dots, which of the day's facts this is. The fact's icon, large and faint, sits in the corner as the card's picture. */
function insightCardPc(pick, x, say, co) {
  const n = pick.count, i = pick.index, dots = n > 1 && n <= 7 ? `<span class="ins-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</span>` : n > 7 ? `<span class="ins-pos num" aria-hidden="true">${i + 1}/${n}</span>` : '';
  const tip = co ? t('One fact a day, worked out from the company’s own numbers: its costs by this day, the bills ahead, its reserves and its runway. It is arithmetic on what was recorded and planned, not advice. “Another” shows the next one.')
    : t('One fact a day, worked out from your own numbers: your spending by this day, the bills ahead, your goals and your days of freedom. It is arithmetic on what you recorded and planned, not advice, and it compares you only with yourself. “Another” shows the next one.');
  return `<section class="card insight ins-pc" id="insight-card" data-kind="${x.kind}"><div class="card-h"><span class="fl-ico">${icon(INSIGHT_ICON[x.kind])}</span><h2>${t('Insight of the day')}</h2>${info(tip)}
      ${n > 1 ? `<span class="right"><button class="btn sm" id="insight-next" data-a="insight-next" aria-label="${esc(t('Another') + ' · ' + t('{a} of {b}', { a: i + 1, b: n }))}">${icon('repeat')}${t('Another')}</button></span>` : ''}</div>
    <div class="card-b" aria-live="polite"><span class="grow"><b>${say.title}</b><small>${say.text}</small></span>${say.action || dots ? `<div class="ins-foot">${say.action || ''}${dots}</div>` : ''}</div>
    <span class="ins-mark" aria-hidden="true">${icon(INSIGHT_ICON[x.kind])}</span></section>`;
}
/** "Another" (owner, 2026-10-08: "animate the cards when they change on pressing Another"): the next fact comes in from the right as the last one
    left, its icon turns in, the faint picture settles, and the active dot grows into its place. transform and opacity only, about a quarter of a
    second; nothing for someone who asked for less motion. */
function insightSwap() {
  if (reducedMotion() || !document.body.animate) return;
  const c = $('insight-card'); if (!c) return;
  const play = (sel, frames, o) => c.querySelectorAll(sel).forEach(e => e.animate(frames, Object.assign({ duration: 260, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' }, o)));
  play('.card-b .grow', [{ opacity: 0, transform: 'translateX(18px)' }, { opacity: 1, transform: 'none' }]);
  play('.card-b .btn, .ins-foot .btn', [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { delay: 70 });
  play('.card-h .fl-ico svg, .card-b > .fl-ico svg', [{ opacity: 0, transform: 'scale(.5) rotate(-40deg)' }, { opacity: 1, transform: 'none' }], { duration: 320 });
  c.querySelectorAll('.ins-mark').forEach(e => e.animate([{ opacity: 0, transform: 'translateX(24px) rotate(-12deg) scale(.9)' }, { opacity: getComputedStyle(e).opacity, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16, 1, .3, 1)' }));
  play('.ins-dots i.on', [{ transform: 'scaleX(.4)' }, { transform: 'none' }], { duration: 220 });
}
