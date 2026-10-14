/* Dorax Finance — the saving challenges on screen (v227; the calculations: core/challenges.js). The household's only.
   Owner, 2026-10-14, after a first build inside the Journey: "la Jornada es muy larga y tiene varias cosas dentro que no tienen que ver una con otra";
   he chose to keep them apart:
     the 52 weeks in Goals (it is saving): a part of its own under the goals, as the yearly expenses, on a phone and the classic page; a card among
       the goals on a computer. Its goal is the challenge there, not one more card in the list;
     the days without spending on the summary, beside "You can spend" (it is day-to-day spending): a strip under it while they run, the day's mark one
       tap away; they start from the details of "You can spend", where the day's money is explained.
   Styles: css/screens/challenges.css. Texts: i18n/text/challenges.js. Clicks: challenges.actions.js. */
const chMoney = (v, cur) => fmt.money(v, cur, { trim: true });
/** What the 52 weeks say today: up to date, this week, done, over. */
function s52Say(c) {
  return c.done ? t('Challenge done: {total} put aside.', { total: chMoney(c.total, c.cur) })
    : c.over ? t('The 52 weeks are over: you put aside {saved} of {total}.', { saved: chMoney(c.saved, c.cur), total: chMoney(c.total, c.cur) })
      : c.toGo > c.thisWeek ? t('To be up to date: {amount}.', { amount: chMoney(c.toGo, c.cur) })
        : c.toGo > 0 ? t('This week: {amount}.', { amount: chMoney(c.toGo, c.cur) })
          : c.next ? t('Week {n} is done. Next: {amount}, from {date}.', { n: c.week, amount: chMoney(c.next.amount, c.cur), date: fmt.date(c.next.date) }) : t('Week 52 is done.');
}
/** The one thing to do now: put aside what is due; or close it, done or over. */
const s52Act = (c, cls) => c.done || c.over ? `<button class="btn primary${cls || ''}" data-a="s52-close">${t('Close the challenge')}</button>`
  : c.toGo > 0 ? `<button class="btn primary${cls || ''}" data-a="s52-put">${icon('plus')}${t('Put aside {amount}', { amount: chMoney(c.toGo, c.cur) })}</button>` : '';
/** Not running: what it is, the last one if there was one, the way to start. */
function s52Invite() {
  const cur = BCUR(), last = challengesOf(S).ended.filter(x => x.kind === 's52').pop();
  return `${t('Week 1 you put aside {a}, week 2 {b}, and so on up to {c} in week 52. At the end: {total}.', { a: chMoney(100, cur), b: chMoney(200, cur), c: chMoney(5200, cur), total: chMoney(137800, cur) })}${last ? ' ' + t('Last one: {saved} of {total}.', { saved: chMoney(last.saved, cur), total: chMoney(last.total, cur) }) : ''}`;
}
/** Goals on a phone and on the classic page: "52-week challenge", under the goals and before the yearly expenses. */
function s52Section() {
  if (inCompany()) return '';
  const c = s52Now(S, S.today);
  const head = `<h2 class="sec" id="s52-h">${t('52-week challenge')}</h2>`;
  if (!c) return `<section class="ch-sec" id="s52" aria-labelledby="s52-h">${head}<div class="card ch-card ch-off"><span class="ch-art" aria-hidden="true">${artObj('piggy-bank')}</span>
    <div class="grow"><p class="note">${s52Invite()}</p><button class="btn" data-a="s52-new">${icon('plus')}${t('Start the 52 weeks')}</button></div></div></section>`;
  return `<section class="ch-sec" id="s52" aria-labelledby="s52-h">${head}<div class="card ch-card${flashed(c.goal.id)}">
    <div class="ch-h"><small class="ch-lab">${t('week {a} of {b}', { a: c.week, b: 52 })}${c.goal.accountId && acct(c.goal.accountId) ? ' · ' + esc(acct(c.goal.accountId).name) : ''}</small>${c.done || c.over ? '' : `<button class="linkbtn" data-a="s52-end">${t('Leave it')}</button>`}</div>
    <div class="ch-fig"><b class="num">${chMoney(c.saved, c.cur)}</b><span class="num">/ ${chMoney(c.total, c.cur)}</span><span class="num ch-pct">${c.pct}%</span></div>
    <div class="ch-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.pct}" aria-label="${esc(t('Put aside in the 52 weeks'))}"><i style="width:${c.pct}%"></i></div>
    <p class="note">${s52Say(c)}</p>
    <div class="ch-acts">${s52Act(c)}<button class="btn ghost" data-a="goal-open" data-id="${esc(c.goal.id)}">${t('Movements')}</button></div></div></section>`;
}
/** Goals on a computer (features/goals/goals.desk.js): a card among the goals, as a yearly expense has. */
function dkS52Card() {
  if (inCompany()) return '';
  const c = s52Now(S, S.today);
  if (!c) return `<article class="dk-tile dk-goal ch-tile"><div class="dk-tile-h"><span class="dk-ico ti" aria-hidden="true">${artOr('piggy-bank', 'wallet')}</span><span class="dk-tile-n"><b>${t('52-week challenge')}</b><small>${t('A saving challenge')}</small></span></div>
    <div class="dk-tile-s"><span>${s52Invite()}</span></div><div class="dk-tile-a"><button class="btn" data-a="s52-new">${icon('plus')}${t('Start the 52 weeks')}</button></div></article>`;
  const kept = c.goal.accountId && acct(c.goal.accountId), chip = c.done ? dkPill(t('Done'), 'mint') : c.over ? dkPill(t('Over')) : c.toGo > c.thisWeek ? dkPill(t('Behind'), 'warn') : c.toGo > 0 ? dkPill(t('This week'), 'warn') : dkPill(t('Up to date'), 'mint');
  return `<article class="dk-tile dk-goal ch-tile${flashed(c.goal.id)}" id="s52"><div class="dk-tile-h"><span class="dk-ico ti" aria-hidden="true">${artOr('piggy-bank', 'wallet')}</span><span class="dk-tile-n"><b>${t('52-week challenge')}</b><small>${t('week {a} of {b}', { a: c.week, b: 52 })}${kept ? ' · ' + esc(kept.name) : ''}</small></span>${chip}</div>
    <div class="dk-tile-v"><b class="num">${chMoney(c.saved, c.cur)}</b> <span class="num">${esc(t('of {amount}', { amount: chMoney(c.total, c.cur) }))}</span></div>${dkBar(c.pct)}
    <div class="dk-tile-s"><span>${s52Say(c)}</span></div><div class="dk-tile-a">${s52Act(c)}<button class="btn ghost" data-a="goal-open" data-id="${esc(c.goal.id)}">${t('Movements')}</button>${c.done || c.over ? '' : `<button class="btn ghost" data-a="s52-end">${t('Leave it')}</button>`}</div></article>`;
}

// ---------- notifications, said in the forms ----------
// A challenge works best with its reminder, so the form says whether it will come; it does not wait for it (a sprint does, in the Journey).
function chNotifyNote(what) {
  const p = UI.push || {}, st = p.status, on = st === 'on' && S.user.notify.challenges !== false;
  if (on) return `<p class="note ch-n-ok">${icon('check')}${what}</p>`;
  if (st === 'off') return `<div class="ch-n"><p class="note">${t('With notifications on, Dorax reminds you.')}</p><button class="btn sm" data-a="ch-push"${p.busy ? ' disabled' : ''}>${icon('bell')}${t('Turn on notifications')}</button></div>`;
  if (st === 'on') return `<div class="ch-n"><p class="note">${t('The challenges’ reminders are off.')}</p><button class="btn sm" data-a="ch-notify-on">${icon('bell')}${t('Turn them on')}</button></div>`;
  return '';
}
function s52FormDrawer(d) {
  const g = d.draft, cur = BCUR(), c = { start: S.today, step: g.step, reverse: !!g.reverse }, keep = goalSavings(g.accountId, cur), none = !keep.length;
  return `<div class="body">${d.error ? errBanner(d.error) : ''}
    <div class="field"><span class="lbl">${t('How much it goes up each week')}</span>${seg('s52-step', S52_STEPS.map(v => [v, chMoney(v, cur)]), g.step, t('How much it goes up each week'))}</div>
    <div class="field"><span class="lbl">${t('Order')}</span>${seg('s52-order', [[0, t('Smallest first')], [1, t('Largest first')]], g.reverse ? 1 : 0, t('Order'))}</div>
    <p class="ch-pre" aria-live="polite">${t('Week 1: {a} · week 52: {b} · at the end: {total}', { a: `<b class="num">${chMoney(s52Amount(c, 1), cur)}</b>`, b: `<b class="num">${chMoney(s52Amount(c, 52), cur)}</b>`, total: `<b class="num">${chMoney(s52Total(c), cur)}</b>` })}</p>
    <div class="form-grid">${fld('s52-acct', t('Where do you keep it?'), `<select id="s52-acct" data-c="draft" data-k="accountId" data-rerender="1">${acctOptions(g.accountId || '', g.accountId ? null : t('Choose a savings account'), keep)}</select>${none ? `<span class="note">${t('It is kept in a savings account, and you have none yet.')} <button type="button" class="linkbtn" data-a="goal-add-savings">${t('Add a savings account')}</button></span>` : ''}`, 'full')}</div>
    <p class="note">${t('From today, {start}, to {end}. The money goes into a goal of its own, so it counts in your plan.', { start: fmt.date(c.start), end: fmt.date(s52End(c), true) })}</p>
    ${chNotifyNote(t('Each week Dorax tells you how much to put aside.'))}</div>
  <footer><button class="btn primary" data-a="s52-save">${icon('flag')}${t('Start the challenge')}</button><button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}

// ---------- the days without spending, on the summary ----------
/** Under "You can spend", while they run (and once they end, until closed): how many days, the bar, and the day's mark one tap away. */
function nsStrip() {
  if (inCompany()) return '';
  const c = nsNow(S, S.today); if (!c) return '';
  const today = S.today, act = c.done ? `<button class="btn sm primary" data-a="ns-view" aria-haspopup="dialog">${t('See how it went')}</button>`
    : c.marks[today] ? `<span class="ns-done">${icon('check')}${t('Today')}</span>` : `<button class="btn primary ns-mark" data-a="ns-mark" data-d="${today}">${icon('check')}${t('I spent nothing today')}</button>`;
  return `<section class="ns-strip" id="ns-strip" aria-label="${esc(t('Days without spending'))}"><button class="ns-open" data-a="ns-view" aria-haspopup="dialog">
      <span class="ns-t"><small>${t('Days without spending')}</small><b>${tn(c.length, '{a} of {n} day', '{a} of {n} days', { a: `<span class="num">${c.marked}</span>` })}</b></span>
      <span class="ns-bar" aria-hidden="true"><i style="width:${c.pct}%"></i></span></button>${act}</section>`;
}
/** The way to start them, in the details of "You can spend" (features/dashboard/free-until.view.js: freeDrawer). */
function nsInvite() {
  if (inCompany() || nsNow(S, S.today)) return '';
  const last = challengesOf(S).ended.filter(x => x.kind === 'ns').pop();
  return `<section class="ns-invite" id="ns-invite"><span class="ch-art" aria-hidden="true">${artObj('calendar-check')}</span><div class="grow"><h3>${t('Days without spending')}</h3>
    <p class="note">${t('A challenge: 7, 14 or 30 days paying only what is fixed, like rent, bills and transport. Each day you manage it, you mark it.')}${last ? ' ' + t('Last one: {a} of {b} days.', { a: last.marked, b: last.length }) : ''}</p>
    <button class="btn" data-a="ns-new">${icon('plus')}${t('Start days without spending')}</button></div></section>`;
}
function nsFormDrawer(d) {
  const g = d.draft, end = addDays(S.today, g.length - 1);
  return `<div class="body">${d.error ? errBanner(d.error) : ''}
    <div class="field"><span class="lbl">${t('How long')}</span>${seg('ns-days', [[7, tn(7, '{n} day', '{n} days')], [14, tn(14, '{n} day', '{n} days')], [30, tn(30, '{n} day', '{n} days')]], g.length, t('How long'))}</div>
    <p class="note">${t('From today, {start}, to {end}. Only what is fixed: rent, bills, transport. Each day you manage it, you mark it on the summary.', { start: fmt.date(S.today), end: fmt.date(end) })}</p>
    ${chNotifyNote(t('Each morning Dorax asks about the day before.'))}</div>
  <footer><button class="btn primary" data-a="ns-save">${icon('flag')}${t('Start the challenge')}</button><button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
/** Its details: the count, every day of it (today and yesterday can be marked), what Dorax sees spent today, and the way to leave or close it. */
function nsViewDrawer() {
  const c = nsNow(S, S.today); if (!c) return `<div class="body"><p class="note">${t('No days without spending running.')}</p></div><footer><button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`;
  const today = S.today, yest = addDays(today, -1), days = [];
  for (let d = c.start; d <= c.end; d = addDays(d, 1)) {
    const on = !!c.marks[d], can = !c.done && (d === today || d === yest), cls = on ? 'on' : d === today ? 'now' : d < today ? 'past' : 'next', n = +d.slice(8);
    const say = `${fmt.date(d)}: ${on ? t('spent nothing') : d > today ? t('still to come') : t('not marked')}`;
    days.push(`<li>${can ? `<button class="ns-day ${cls}" data-a="ns-mark" data-d="${d}" aria-pressed="${on}" aria-label="${esc(say)}">${on ? icon('check') : `<span class="num">${n}</span>`}</button>` : `<span class="ns-day ${cls}" role="img" aria-label="${esc(say)}">${on ? icon('check') : `<span class="num">${n}</span>`}</span>`}</li>`);
  }
  const seen = c.done || c.marks[today] ? [] : nsSpent(S, today, CUR), n = seen.length;
  return `<div class="body ns-view">
    <div class="ch-fig"><b class="num">${c.marked}</b><span class="num">/ ${tn(c.length, '{n} day', '{n} days')}</span><span class="num ch-pct">${c.pct}%</span></div>
    <div class="ch-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.pct}" aria-label="${esc(t('Days without spending'))}"><i style="width:${c.pct}%"></i></div>
    <p class="note">${c.done ? t('It ended: {a} of {b} days without spending.', { a: c.marked, b: c.length }) : t('From {start} to {end} · day {a} of {b}. Today and yesterday can be marked.', { start: fmt.date(c.start), end: fmt.date(c.end), a: c.day, b: c.length })}</p>
    <ol class="ns-days" aria-label="${esc(t('The days of the challenge'))}">${days.join('')}</ol>
    ${n ? `<p class="note ns-seen">${tn(n, 'Dorax sees {n} purchase today outside the fixed costs: {what}. You decide whether the day counts.', 'Dorax sees {n} purchases today outside the fixed costs: {what}. You decide whether the day counts.', { what: seen.slice(0, 2).map(x => `${esc(x.name)} ${fmt.money(x.amount, CUR)}`).join(', ') + (n > 2 ? ' ' + t('and {n} more', { n: n - 2 }) : '') })}</p>` : ''}
    ${c.done ? `<button class="btn primary ns-go" data-a="ns-close">${t('Close it')}</button>` : c.marks[today] ? `<p class="note ch-n-ok">${icon('check')}${t('Today is marked. See you tomorrow.')}</p>` : `<button class="btn primary ns-go" data-a="ns-mark" data-d="${today}">${icon('check')}${t('I spent nothing today')}</button>`}</div>
  <footer>${c.done ? '' : `<button class="btn ghost" data-a="ns-end">${t('Leave it')}</button>`}<button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`;
}
