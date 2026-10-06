/* Dorax Finance — due days and reminders. A reminder is read from the plan: a bill, the day it is due and whether it has a payment.
   So the due day is the one thing the person gives; everything else follows from it. */

const LEADS = () => [[0, t('On the day')], [1, t('1 day before')], [3, t('3 days before')], [7, t('A week before')]];
const remindCfg = () => { const u = S.user; u.remind = u.remind || { lead: 3, snoozed: {} }; u.remind.snoozed = u.remind.snoozed || {}; return u.remind; };
const remindOpt = () => { remindCfg(); return reminderOptions(S); };      // reminderOptions: reminder-messages.js, shared with the server's job
const allReminders = () => remindersAll(S, S.today, remindOpt());       // the household's and the company's (core/reminders.js)
const snoozedNow = r => remindCfg().snoozed[r.id] === S.today;
const activeReminders = () => allReminders().filter(r => !snoozedNow(r));
/** Bills that can have a due day: one payment a month, still running. Budgets are spent across the month, so they have none.
    What is charged to a credit card is part of the card's invoice: it is listed only if someone gave it a day of its own. */
const billLines = () => B().plan.lines.filter(l => l.pay !== 'budget' && !(l.end && l.end < ymOf(S.today)) && (!onCard(S, l) || l.due));
const cards = () => bookAccounts().filter(a => a.type === 'credit');
const cardLines = a => B().plan.lines.filter(l => l.accountId === a.id && !(l.end && l.end < ymOf(S.today)));
const dueMissing = () => billLines().filter(l => !l.due).length;

function bellButton() {
  const n = activeReminders().length;
  return `<button class="bell" data-a="reminders" aria-haspopup="dialog" aria-label="${n ? t('Reminders: {n} to look at', { n }) : t('Reminders: nothing today')}" data-tip="${t('Reminders')}">${icon('bell')}${n ? `<span class="count" aria-hidden="true">${n}</span>` : ''}</button>`;
}

// ---------- reminders drawer ----------
function remindItem(r) { return inBook(r.book || 'personal', () => remindItemIn(r)); }
function remindItemIn(r) {
  const CUR = r.cur || BASE_CURRENCY, bk = ` data-book="${r.book || 'personal'}"`, co = r.book ? ` <span class="chip">${t('Company')}</span>` : '';
  const snooze = `<button class="btn sm ghost" data-a="remind-snooze" data-id="${r.id}">${t('Not today')}</button>`;
  if (r.kind === 'bill') {
    const l = lineById(r.lineId), a = lineAcct(l);
    return `<div class="rem ${r.level}"><div class="rem-t"><b>${esc(r.name)}${co}</b><span class="num">${r.pay === 'variable' ? '≈ ' : ''}${fmt.money(r.amount, CUR)}</span></div>
      <div class="note">${t('Due {date}', { date: fmt.date(r.date) })} · ${whenText(r)}${a ? ' · ' + esc(a.name) : ''}</div>
      <div class="row">${!a ? '' : r.pay === 'fixed' ? `<button class="btn sm soft" data-a="line-pay-now" data-id="${r.lineId}" data-ym="${r.ym}"${bk}>${icon('check')}${t('Mark as paid')}</button>` : `<button class="btn sm" data-a="line-pay" data-id="${r.lineId}" data-ym="${r.ym}"${bk}>${icon('plus')}${t('Record payment')}</button>`}${snooze}</div></div>`;
  }
  if (r.kind === 'card') return `<div class="rem ${r.level}"><div class="rem-t"><b>${t('{name}: invoice', { name: esc(r.name) })}${co}</b><span class="num">${r.estimate ? '≈ ' : ''}${fmt.money(r.amount, CUR)}</span></div>
      <div class="note">${t('Due {date}', { date: fmt.date(r.date) })} · ${whenText(r)} · ${r.estimate ? t('estimated from the plan') : t('what the card owes today')}</div>
      <div class="row"><button class="btn sm" data-a="card-pay" data-id="${r.accountId}" data-back="1"${bk}>${icon('check')}${t('Record the payment')}</button>${snooze}</div></div>`;
  if (r.kind === 'past') return `<div class="rem ${r.level}"><div class="rem-t"><b>${tn(r.lines.length, '{n} bill from {month} has no payment', '{n} bills from {month} have no payment', { month: fmt.month(r.ym) })}${co}</b><span class="num">${fmt.money(r.amount, CUR)}</span></div>
      <div class="note">${esc(r.lines.slice(0, 4).map(x => x.name).join(', '))}${r.lines.length > 4 ? ' ' + t('and {n} more', { n: r.lines.length - 4 }) : ''}. ${t('Paid and not recorded, or still to pay?')}</div>
      <div class="row"><button class="btn sm" data-a="remind-month" data-ym="${r.ym}" data-route="plan"${bk}>${t('Open {month}', { month: fmt.month(r.ym) })}</button>${snooze}</div></div>`;
  if (r.kind === 'handout') return `<div class="rem"><div class="rem-t"><b>${t('Savings for {month}', { month: fmt.month(r.ym) })}${co}</b><span class="num">${fmt.money(r.amount, CUR)}</span></div>
      <div class="note">${r.arrived ? t('The money for savings has arrived.') : tn(r.daysLeft, 'The month ends in {n} day.', 'The month ends in {n} days.')} ${tn(r.goals, '{n} goal still waits for its part.', '{n} goals still wait for their part.')}</div>
      <div class="row"><button class="btn sm" data-a="remind-month" data-ym="${r.ym}" data-route="goals"${bk}>${t('Hand it out')}</button>${snooze}</div></div>`;
  if (r.kind === 'close') return `<div class="rem ${r.level}"><div class="rem-t"><b>${esc(platLabel())} · ${fmt.month(r.ym)}</b><span class="note">${t('{sent} of {total} sent', { sent: r.sent, total: r.total })}</span></div>
      <div class="note">${t('Statements due by {date}', { date: fmt.date(r.date, true) })} · ${whenText(r)}</div><div class="row"><a class="btn sm" href="#converter" data-a="remind-go" data-route="converter">${t('Prepare statements')}</a>${snooze}</div></div>`;
  if (r.kind === 'summary') return `<div class="rem"><div class="rem-t"><b>${t('{month} is closed', { month: fmt.month(r.ym) })}</b><span class="num ${r.saved < 0 ? 'neg' : ''}">${fmt.money(r.saved, CUR, { sign: true })}</span></div>
      <div class="note">${r.saved >= 0 ? t('{month} closed with {amount} left over.', { month: fmt.month(r.ym), amount: fmt.money(r.saved, CUR) }) : t('{month} closed with spending {amount} above income.', { month: fmt.month(r.ym), amount: fmt.money(-r.saved, CUR) })}</div>
      <div class="row"><button class="btn sm" data-a="remind-report" data-ym="${r.ym}">${t('Open report')}</button>${snooze}</div></div>`;
  return `<div class="rem"><div class="rem-t"><b>${tn(r.lines.length, '{n} bill has no due day', '{n} bills have no due day')}${co}</b><span class="num">${fmt.money(r.amount, CUR)}</span></div>
      <div class="note">${esc(r.lines.slice(0, 4).map(x => x.name).join(', '))}${r.lines.length > 4 ? ' ' + t('and {n} more', { n: r.lines.length - 4 }) : ''}. ${t('Without the day I cannot tell you when they are due or late.')}</div>
      <div class="row"><button class="btn sm primary" data-a="due-days" data-back="1"${bk}>${icon('calendar')}${t('Set due days')}</button>${snooze}<button class="btn sm ghost" data-a="remind-ask-due" data-v="">${t('Stop asking')}</button></div></div>`;
}
function remindersDrawer(d) {
  const all = allReminders(), on = all.filter(r => !snoozedNow(r)), off = all.length - on.length, n = S.user.notify, lead = remindCfg().lead;
  const part = (title, rows) => rows.length ? `<div class="rem-group"><h3>${title}</h3>${rows.map(remindItem).join('')}</div>` : '';
  const next = reminderScheduleAll(S, S.today, lead, 45).slice(0, 4), quiet = !n.bills && !n.close && !n.summary && n.goals === false, timed = r => r.kind === 'bill' || r.kind === 'card';
  return `<div class="body">
    ${quiet ? banner('warn', `<b>${t('Reminders are switched off.')}</b> ${t('Turn on what you want to hear about in your profile.')}`) : ''}
    ${on.length ? '' : `<div class="empty" style="padding:22px 0"><b>${t('Nothing to chase today')}</b>${t('Bills show up here as their due day gets close, when they are due and when they are late.')}</div>`}
    ${part(t('Late'), on.filter(r => timed(r) && r.when === 'late'))}${part(t('Due today'), on.filter(r => timed(r) && r.when === 'today'))}${part(t('Coming up'), on.filter(r => timed(r) && r.when === 'soon'))}
    ${part(t('Last month'), on.filter(r => r.kind === 'past'))}${part(t('Savings'), on.filter(r => r.kind === 'handout'))}${part(t('Statements to send'), on.filter(r => r.kind === 'close'))}${part(t('Month closed'), on.filter(r => r.kind === 'summary'))}${part(t('To set up'), on.filter(r => r.kind === 'nodue'))}
    ${off ? `<div class="row"><span class="note">${tn(off, '{n} reminder put off until tomorrow.', '{n} reminders put off until tomorrow.')}</span><button class="btn sm ghost" data-a="remind-unsnooze">${t('Show again')}</button></div>` : ''}
    ${next.length ? `<div class="rem-group"><h3>${t('Next reminders')}</h3><div class="list">${next.map(x => `<div class="li"><span class="when">${fmt.date(x.sendDate)}</span><span class="grow">${esc(x.name)} <span class="muted">· ${x.book ? t('Company') + ' · ' : ''}${t('due {date}', { date: fmt.date(x.date) })}</span></span><span class="num">${fmt.money(x.amount, x.cur || CUR)}</span></div>`).join('')}</div></div>` : ''}
  </div>
  <footer><button class="btn sm" data-a="due-days" data-back="1" data-book="${pageBookKey()}">${icon('calendar')}${t('Due days')}</button><button class="btn sm ghost" data-a="calendar-file">${icon('download')}${t('Calendar file')}</button><a class="btn sm ghost spacer" href="#profile" data-a="remind-go" data-route="profile">${t('Reminder settings')}</a></footer>`;
}

// ---------- due days: one screen for the day of every bill ----------
function dueDaysDrawer(d) {
  const CUR = BCUR(), lines = billLines(), cs = cards(), budgets = B().plan.lines.filter(l => l.pay === 'budget' && !onCard(S, l)).map(l => l.name), lead = remindCfg().lead, leadText = (LEADS().find(x => x[0] === lead) || LEADS()[2])[1].toLowerCase();
  if (!lines.length && !cs.length) return `<div class="body"><div class="empty"><b>${t('No bills yet')}</b>${t('Add a fixed cost first. Then give it the day it is due.')}</div></div><footer><button class="btn primary" data-a="line-new">${icon('plus')}${t('New fixed cost')}</button><button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`;
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}
    <p class="note">${S.user.notify.bills ? t('The day of the month each bill is due. I use it to tell you a bill is late and to remind you: {lead}.', { lead: leadText }) : t('The day of the month each bill is due. I use it to tell you a bill is late. Reminders for bills are switched off in your profile.')}</p>
    ${B().categories.filter(c => lines.some(l => l.categoryId === c.id)).map(c => `<div class="due-group"><h3><span class="dot" style="background:${catColor(c.id)}"></span>${esc(c.name)}</h3>
      ${lines.filter(l => l.categoryId === c.id).map(l => { const a = lineAcct(l), v = planValue(B(), l, ymOf(S.today));
        return `<div class="due-row"><label for="dd-${l.id}"><b>${esc(l.name)}</b><span class="note">${v ? fmt.money(v, CUR, { trim: true }) : t('Not planned')}${a ? ' · ' + esc(a.name) : ''}${l.pay === 'variable' ? ' · ' + payKindShort('variable') : ''}</span></label>
          <input type="number" class="day" id="dd-${l.id}" min="1" max="31" inputmode="numeric" placeholder="—" value="${esc(d.draft.days[l.id] || '')}" data-c="due-day" data-live="1" data-id="${l.id}"></div>`; }).join('')}</div>`).join('')}
    ${cs.length ? `<div class="due-group"><h3>${icon('wallet')}${t('Credit cards')}</h3>
      ${cs.map(a => { const ls = cardLines(a); return `<div class="due-row"><label for="dd-${a.id}"><b>${t('{name}: invoice', { name: esc(a.name) })}</b><span class="note">${ls.length ? tn(ls.length, '{n} cost is charged to it: {names}', '{n} costs are charged to it: {names}', { names: esc(ls.slice(0, 3).map(l => l.name).join(', ')) + (ls.length > 3 ? '…' : '') }) : t('Nothing in the plan is charged to it')}</span></label>
          <input type="number" class="day" id="dd-${a.id}" min="1" max="31" inputmode="numeric" placeholder="—" value="${esc(d.draft.days[a.id] || '')}" data-c="due-day" data-live="1" data-id="${a.id}"></div>`; }).join('')}
      <p class="note">${t('A card is one bill: its invoice. What is charged to the card needs no day of its own.')}</p></div>` : ''}
    <p class="note">${t('Day 31 means the last day of the month in shorter months. Leave a field empty if the bill has no fixed day.')}${budgets.length ? ' ' + t('Costs spent during the month, like {names}, have no due day.', { names: esc(budgets.slice(0, 2).join(', ')) }) : ''}</p></div>
  <footer><button class="btn primary" data-a="due-save">${t('Save due days')}</button><button class="btn ghost spacer" data-a="${d.back ? 'reminders' : 'close'}">${t('Cancel')}</button></footer>`;
}

// ---------- profile: what to remind, and how early ----------
function remindersCard() {
  const u = S.user, cfg = remindCfg(), bills = everyBook(billLines), withDay = bills.filter(l => l.due).length, next = reminderScheduleAll(S, S.today, cfg.lead, 45).slice(0, 5), n = activeReminders().length;
  const notify = (k, title, text, extra) => `<div class="setting"><div><b style="font-weight:500">${title}</b><p>${text}</p>${extra || ''}</div>${sw('nf-' + k, k === 'goals' ? u.notify.goals !== false : !!u.notify[k], 'user-notify', `data-k="${k}"`)}</div>`;
  const billExtra = !u.notify.bills ? '' : `<div class="row" style="margin-top:10px"><div class="field inline"><label for="nf-lead">${t('How early')}</label><select id="nf-lead" data-c="user-lead">${options(LEADS(), cfg.lead)}</select></div>
      <span class="chip ${bills.length && withDay === bills.length ? 'good' : withDay < bills.length ? 'warn' : ''}">${bills.length && withDay ? '<i></i>' : ''}${bills.length ? t('{a} of {b} bills have a due day', { a: withDay, b: bills.length }) : t('No bills to time yet')}</span><button class="btn sm" data-a="due-days">${icon('calendar')}${t('Due days')}</button>${cfg.askDue === false && withDay < bills.length ? `<button class="btn sm ghost" data-a="remind-ask-due" data-v="1">${t('Ask me about the missing days')}</button>` : ''}</div>`;
  // Outside the app: this device (a notification, even with the app closed) and email. What this device can do is asked of the browser once,
  // when the card is first drawn; until the answer is in, the card offers to switch it on.
  const push = UI.push || {}, busy = !!push.busy, emailOn = !u.channels || u.channels.email !== false;
  if (!push.known && !push.asked) { UI.push = { ...push, asked: true }; pushRefresh(); }
  const st = push.status || 'off', stop = busy ? ' disabled' : '';
  const deviceText = st === 'blocked' ? t('Notifications for Dorax are blocked in this browser. Allow them in the browser’s settings for this site, then reload the page.')
    : st === 'install' ? t('On an iPhone or iPad, add Dorax to the Home Screen first: tap Share, then “Add to Home Screen”. Open Dorax from there and turn notifications on.')
    : st === 'unsupported' ? t('This browser cannot show notifications from a website.') : st === 'preview' ? t('This preview sends nothing: no notifications and no emails.')
    : t('A notification on this phone or computer, even when Dorax is closed.');
  const deviceTools = st === 'on' ? `<div class="row" style="margin-top:10px"><span class="chip good"><i></i>${t('On for this device')}</span><button class="btn sm" data-a="push-test"${stop}>${t('Send a test')}</button><button class="btn sm ghost" data-a="push-off"${stop}>${t('Turn off')}</button></div>` : '';
  const deviceBtn = st === 'off' ? `<button class="btn" data-a="push-on"${stop}>${icon('bell')}${busy ? t('One moment…') : t('Turn on')}</button>` : '';
  const outside = `<div class="setting out" id="push-setting"><div><b style="font-weight:500">${t('Notifications on this device')}</b><p>${deviceText}</p>${deviceTools}</div>${deviceBtn}</div>
      <div class="setting" id="mail-setting"><div><b style="font-weight:500">${t('By email')}</b><p>${t('To {email}. One message when a bill is coming up, one on its day, and one if it is late.', { email: `<b>${esc(u.email)}</b>` })}</p>${emailOn ? `<div class="row" style="margin-top:10px"><button class="btn sm" data-a="mail-test"${stop}>${t('Send a test')}</button></div>` : ''}</div>${sw('nf-email', emailOn, 'user-channel', 'data-k="email"')}</div>`;
  return `<section class="card" id="reminders-card"><div class="card-h"><h2>${t('Reminders')}</h2>${hint('proRemind')}<button class="right btn sm" data-a="reminders">${icon('bell')}${n ? t('{n} today', { n }) : t('Nothing today')}</button></div><div class="card-b">
      ${notify('bills', t('Bills that are due'), t('Before the due day, on the day, and when a bill is late. Only bills with a due day can be timed.'), billExtra)}${notify('goals', t('Savings to hand out'), t('When the money for savings has arrived, or the month is about to end, and the month’s contributions are not recorded.'))}${notify('close', t('Statements for the accountant'), t('From day 1 of the month until last month’s statements of the accounts on your monthly list are sent.'))}${notify('summary', t('Monthly summary'), t('How the month closed, in the first days of the next one.'))}
      ${next.length ? `<div class="rem-next"><b style="font-weight:500">${t('Next reminders')}</b><div class="list">${next.map(x => `<div class="li"><span class="when">${fmt.date(x.sendDate)}</span><span class="grow">${esc(x.name)} <span class="muted">· ${x.book ? t('Company') + ' · ' : ''}${t('due {date}', { date: fmt.date(x.date) })}</span></span><span class="num">${fmt.money(x.amount, x.cur || CUR)}</span></div>`).join('')}</div></div>` : ''}
      ${outside}
      <div class="setting"><div><b style="font-weight:500">${t('Reminders outside the app')}</b><p>${t('Download a calendar file with every due day and add it to your phone’s or computer’s calendar. The calendar reminds you even when the app is closed. If you change a due day, download it again.')}</p></div><button class="btn" data-a="calendar-file" ${calendarEvents().length ? '' : 'disabled'}>${icon('download')}${t('Calendar file')}</button></div></div></section>`;
}

// ---------- calendar file: reminders that work with the app closed ----------
// One repeating event per bill that has a due day, per card invoice and for the accountant's statements. The calendar app does the reminding,
// so nothing has to be sent from a server. "Day 31" becomes "the last of days 28 to 31 that exists", which is what the app itself does.
function calendarEvents() {
  const ev = [], nowYm = ymOf(S.today), first = day => { const d = isoDate(nowYm, day); return d >= S.today ? d : isoDate(addMonths(nowYm, 1), day); };
  if (S.user.notify.bills) {
    everyBook(() => {      // the household's bills and cards, then the company's in each currency
      billLines().filter(l => l.due).forEach(l => { const a = lineAcct(l), v = planValue(B(), l, nowYm); ev.push({ uid: 'bill-' + l.id, day: l.due, start: first(l.due), until: l.end || null, title: t('Pay {name}', { name: l.name }), text: [v ? t('Plan') + ': ' + (l.pay === 'variable' ? '≈ ' : '') + fmt.money(v, BCUR()) : '', a ? a.name : ''].filter(Boolean).join(' · ') }); });
      cards().filter(a => a.dueDay).forEach(a => ev.push({ uid: 'card-' + a.id, day: a.dueDay, start: first(a.dueDay), until: null, title: t('{name}: invoice', { name: a.name }), text: t('The amount is in the app.') }));
      return [];
    });
  }
  if (S.user.notify.close && needStatements().length) ev.push({ uid: 'close', day: S.settings.closeDay, start: first(S.settings.closeDay), until: null, title: t('Statements to send'), text: t('Last day to send last month’s statements to your accounting platform.') });
  return ev;
}
function calendarText(events) {
  const lead = remindCfg().lead, esc2 = x => String(x).replace(/\\/g, '\\\\').replace(/([;,])/g, '\\$1').replace(/\r?\n/g, '\\n'), d8 = iso => iso.replace(/-/g, '');
  const fold = line => { const out = []; let rest = line; while (rest.length > 72) { out.push(rest.slice(0, 72)); rest = ' ' + rest.slice(72); } out.push(rest); return out.join('\r\n'); };
  const stamp = d8(S.today) + 'T000000Z', days = n => n <= 28 ? String(n) : Array.from({ length: n - 27 }, (_, i) => 28 + i).join(',') + ';BYSETPOS=-1';
  const body = events.map(e => ['BEGIN:VEVENT', 'UID:' + e.uid + '@dorax-finance', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d8(e.start), 'DTEND;VALUE=DATE:' + d8(addDays(e.start, 1)),
    'RRULE:FREQ=MONTHLY;BYMONTHDAY=' + days(e.day) + (e.until ? ';UNTIL=' + d8(isoDate(e.until, 31)) : ''), 'SUMMARY:' + esc2(e.title), ...(e.text ? ['DESCRIPTION:' + esc2(e.text)] : []), 'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc2(e.title), 'TRIGGER:' + (lead ? '-PT' + (lead * 24 - 9) + 'H' : 'PT9H'), 'END:VALARM', 'END:VEVENT'].map(fold).join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dorax Finance//Due days//' + S.settings.lang.toUpperCase(), 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Dorax Finance', ...body, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
function cardPayDrawer(d) {
  const m = d.draft, a = acct(m.cardId), owed = Math.max(0, -accountBalance(S, a.id, S.today));
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}
    <p class="note">${esc(a.name)}${a.dueDay ? ' · ' + t('invoice due on day {n}', { n: a.dueDay }) : ''}${owed ? ` · ${t('owes today')}: <b class="num" style="color:var(--ink)">${fmt.money(owed, a.currency)}</b>` : ''}</p>
    <div class="form-grid">
      ${fld('cp-amount', tcur('Amount (R$)'), inp('cp-amount', 'amountText', m.amountText, 'inputmode="decimal" class="num" placeholder="0,00"'))}
      ${fld('cp-date', t('Date'), `<input type="date" id="cp-date" value="${esc(m.date)}" data-c="draft" data-k="date">`)}
      ${fld('cp-from', t('Paid from'), `<select id="cp-from" data-c="draft" data-k="fromId">${acctOptions(m.fromId || '', '', cashAccounts().filter(x => x.type !== 'credit'))}</select>`, 'full')}</div>
    <p class="note">${t('It is recorded as a transfer between your own accounts, so it does not count as spending: what you bought with the card already did.')}</p></div>
  <footer><button class="btn primary" data-a="card-pay-save">${t('Record the payment')}</button><button class="btn ghost spacer" data-a="${d.back ? 'reminders' : 'close'}">${t('Cancel')}</button></footer>`;
}
