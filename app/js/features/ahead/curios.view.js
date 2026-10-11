/* Dorax Finance — curiosities: short facts about money in Brazil, shown now and then as a notice inside the app.
   2026-10-07 (owner: "financial curiosities can look like a push notification inside the web app, and let the person choose whether they want
   more or fewer, so it is not spam"). Rhythm: core/curios.js. Every fact here was read at its source on 2026-10-07 and names it; none is
   advice, and none is a number about other people's money. To add one: a row here, its id in CURIOS (core/curios.js), its three languages.
   WHEN A RULE CHANGES (a new MEI limit, a new ceiling), the row must change with it: each says the year it was read. */
// the facts themselves, with their sources, live in features/reminders/tip-messages.js (curioFacts): the morning job on the server sends them too
const curioRateLabel = r => ({ more: t('More: up to three a day'), normal: t('Normal: one a day'), less: t('Fewer: one a week'), off: t('None') }[r]);
/** The notice itself: what it is, the fact, where it is from, and the three things to do with it. */
function curioCard() {
  const c = UI.curio; if (!c) return '';
  if (c.ask === 'push') return pushAskCard(c);      // the question about notifications (features/reminders/push-ask.js)
  if (c.ask === 'payday') return paydayCard(c);      // pay day (features/plan/payday.js)
  if (c.ask === 'lock') return lockAskCard(c);      // the app lock, and the device's own check (features/lock/lock-ask.js)
  if (c.ask === 'side') return sideTipCard();      // where Household | Company is switched (features/phone/phone.view.js)
  if (c.cheer) {      // a milestone, said the same way (cheerMaybe below)
    const next = RUNWAY_MARKS.find(m => m > c.mark);
    const title = c.cheer === 'goal' ? t('{name}: reached!', { name: esc(c.name) }) : c.co ? t('The company passed {mark} of runway!', { mark: rwMark(c.mark) }) : t('You passed {mark} of freedom!', { mark: rwMark(c.mark) });
    const text = c.cheer === 'goal' ? t('What is saved reaches its target.') : next ? t('Next goal: {mark}.', { mark: rwMark(next) }) : t('That was the last goal: more than a year put aside.');
    return `<aside class="curio cheer" id="curio" role="status"><span class="fl-ico">${icon('spark')}</span><div class="grow"><b>${title}</b><p>${text}</p><div class="row"><button class="btn sm" data-a="curio-close">${t('Great')}</button></div></div>
      <button class="btn ghost sm x" data-a="curio-close" aria-label="${t('Close')}">${icon('x')}</button></aside>`;
  }
  const f = curioFacts()[c.id]; if (!f) return '';
  // on a phone a curiosity arrives as a small signal and becomes the notice when it is touched (owner, 2026-10-07: "only give a sign that there is one")
  if (isPhone() && !c.open) return `<aside class="curio sig" id="curio" role="status"><button class="cu-open" data-a="curio-open" aria-expanded="false"><span class="fl-ico">${icon('bulb')}</span><b>${t('Did you know?')}</b><span class="in-see">${t('See')}</span>${icon('right')}</button><button class="btn ghost sm x" data-a="curio-close" aria-label="${t('Close')}">${icon('x')}</button></aside>`;
  return `<aside class="curio" id="curio" role="status" aria-label="${t('Did you know?')}"><span class="fl-ico">${icon('bulb')}</span><div class="grow"><b>${t('Did you know?')}</b><p>${f[0]}</p><small>${t('Source: {name}', { name: esc(f[1]) })}</small>
      <div class="row"><button class="btn sm" data-a="curio-next">${t('Another')}</button><button class="btn sm ghost" data-a="curio-less">${t('Fewer of these')}</button></div></div>
    <button class="btn ghost sm x" data-a="curio-close" aria-label="${t('Close')}">${icon('x')}</button></aside>`;
}
function renderCurio() { const el = $('curio-root'); if (el) el.innerHTML = UI.session ? curioCard() : ''; }
/** The setting, in the profile: how many the person wants. */
function curioSetting() {
  return `<div class="setting"><div><b style="font-weight:500">${t('Curiosities')}</b><p>${t('Short facts about money in Brazil, each with its source, shown as a notice inside Dorax. You choose how many.')}</p></div>
    <div class="field inline"><label for="nf-curio" class="sr">${t('Curiosities')}</label><select id="nf-curio" data-c="curio-rate">${options(CURIO_RATES.map(r => [r, curioRateLabel(r)]), curioRate(S))}</select></div></div>`;
}
/** Shows one when one is due: a moment after a screen opens, never over a panel, a dialog or a setup, and never in a test run (tests switch it on themselves). */
const CURIO_WAIT = 2600;
function curioMaybe() {
  clearTimeout(curioMaybe.t);
  if (!UI.session || window.DORAX_QUIET === true || UI.curio) return;
  curioMaybe.t = setTimeout(async () => {
    const busy = () => !UI.session || UI.curio || UI.drawer || UI.modal || UI.sheet || UI.coSetup || UI.find || UI.jstart || UI.tour || LOCK.on;      // behind a closed screen nothing is shown: it would be used up unseen
    if (busy()) return;
    // first, once per device: should this device get notifications? (features/reminders/push-ask.js)
    const st = await pushAskDue(); if (busy()) return;
    if (st) { pushAskDone(); curioMaybe.asked = true; UI.curio = { ask: 'push', st }; return renderCurio(); }
    // then: is it pay day, with the salary not recorded yet? (features/plan/payday.js)
    const pay = paydayDue(); if (pay) { UI.curio = { ask: 'payday', key: pay.key }; return renderCurio(); }
    // then, once per device: a lock for Dorax here, or the device's own check to open it (features/lock/lock-ask.js). One question per visit:
    // not in the one that already asked about notifications.
    if (!curioMaybe.asked) { const what = await lockAskDue(); if (busy()) return; if (what) { curioMaybe.asked = true; lockAskShow(what); return; } }
    // no curiosity while the first steps are still to be done: nothing is more important than those (owner, 2026-10-07)
    if (S.isNew || !curioDue(S, S.today, Date.now())) return;
    const id = curioNext(S, UI.space === 'business'); if (!id) return;
    curioShown(S, id, S.today, Date.now()); UI.curio = { id }; inboxAdd({ kind: 'curio', id }); renderCurio(); save();      // kept for the bell (features/reminders/inbox.js)
  }, CURIO_WAIT);
}

// ---------- milestones ----------
// 2026-10-07 (pending since the first "looking ahead" pass: "celebrate when a mark is passed"). Two moments are worth a cheer, each once:
// the days of freedom (or the company's runway) passing a mark (30 days, 3, 6, 12 months), and a goal's savings reaching its target.
// What was already reached is kept with the account (user.cheer = { marks: { personal: 90, 'business:BRL': 30 }, goals: [ids] }), so nothing is
// cheered twice, and what an account had reached before this existed is written down quietly the first time. Confetti is not played for
// someone who asked for less motion (app/motion.js); the notice still says it.
const markReached = days => { let m = 0; for (const k of RUNWAY_MARKS) if (days !== null && days >= k) m = k; return m; };
function cheerScan() {
  const out = { marks: [], goals: [] };
  for (const key of ['personal', ...companyBooks(S).map(b => b.key)]) inBook(key, () => {
    const bk = B(); out.marks.push({ key, mark: markReached(runway(bk, bk.today, BCUR()).days), co: bk !== S });
    for (const g of bk.goals) if (g.kind === 'goal' && !g.yearly && g.target > 0 && goalSaved(bk, g.id) >= g.target) out.goals.push({ id: g.id, name: g.name });
  });
  return out;
}
function cheerBaseline() {
  if (!UI.session || window.DORAX_QUIET === true || S.user.cheer) return;
  const now = cheerScan(), c = S.user.cheer = { marks: {}, goals: now.goals.map(g => g.id) }; now.marks.forEach(m => { c.marks[m.key] = m.mark; });
}
/** After anything the person does: was a mark passed, or a goal reached, just now? */
function cheerMaybe() {
  if (!UI.session || window.DORAX_QUIET === true) return;
  if (!S.user.cheer) return cheerBaseline();
  const c = S.user.cheer, now = cheerScan(); let hit = null; c.marks = c.marks || {}; c.goals = c.goals || [];
  for (const g of now.goals) if (!c.goals.includes(g.id)) { c.goals.push(g.id); hit = hit || { cheer: 'goal', name: g.name }; }
  for (const m of now.marks) if (m.mark > (c.marks[m.key] || 0)) { c.marks[m.key] = m.mark; hit = { cheer: 'mark', mark: m.mark, co: m.co }; }
  if (hit) { UI.curio = hit; inboxAdd({ kind: 'cheer', ...hit }); renderCurio(); confetti(); }
}
