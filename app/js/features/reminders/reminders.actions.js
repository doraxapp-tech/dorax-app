/* Dorax Finance — clicks and field changes: reminders, due days, the card invoice, the calendar file. Joined into A in app/actions.js and into C in app/changes.js. */
const REMIND_ACTIONS = {
  /** The bell: its Reminders part, or its Updates when only updates wait (features/reminders/inbox.js). */
  reminders(ds) {
    const news = inboxUnread(), tab = ds && (ds.tab === 'news' || ds.tab === 'rem') ? ds.tab : !activeReminders().length && news ? 'news' : 'rem';
    UI.sheet = false; UI.drawer = { kind: 'reminders', title: t('Notifications'), tab, fresh: new Set(inboxList().filter(x => !x.read).map(x => x.key)) };
    if (tab === 'news') inboxSeen();
    renderOverlay();
  },
  'bell-tab'(ds) { const d = UI.drawer; if (!d || d.kind !== 'reminders') return; d.tab = ds.v === 'news' ? 'news' : 'rem'; if (d.tab === 'news') inboxSeen(); renderOverlay(); },
  'remind-snooze'(ds) { remindCfg().snoozed[ds.id] = S.today; render(); },
  'remind-unsnooze'() { remindCfg().snoozed = {}; render(); },
  'remind-ask-due'(ds) { remindCfg().askDue = !!ds.v; toast(ds.v ? t('I will ask about bills without a due day again.') : t('I will not ask about due days again. You can set them in the plan whenever you want.')); render(); },
  'remind-report'(ds) { S.month = ds.ym; UI.drawer = null; navigate('reports'); },
  'remind-go'(ds) { UI.drawer = null; navigate(ds.route); const el = ds.route === 'profile' && $('reminders-card'); if (el) el.scrollIntoView({ block: 'start' }); },
  'remind-month'(ds) { S.month = ds.ym; UI.drawer = null; if (ds.book) setPageBook(ds.book); navigate(ds.route); },
  // notifications on this device, and the two "send a test" buttons (features/reminders/push.js; the server sends, see supabase/functions/reminders)
  async 'push-on'() {
    UI.push = { ...(UI.push || {}), busy: true }; render();
    const r = await PUSH.on();
    toast(r.ok ? t('Notifications are on for this device.') : r.why === 'denied' ? t('You did not allow notifications, so nothing was turned on.') : t('Notifications could not be turned on. Try again.'));
    await pushRefresh();
  },
  // the question asked once, a moment after the first-time setup (features/reminders/push-ask.js)
  async 'push-ask-yes'() {
    const ios = UI.curio && UI.curio.st === 'install'; UI.curio = null; renderCurio();
    if (ios) return A['install-add']();      // an iPhone in a browser tab: the way there is the Home Screen
    await A['push-on']();
  },
  'push-ask-no'() { UI.curio = null; renderCurio(); toast(t('Fine. If you change your mind, the switch is in your profile, under Reminders.')); },
  async 'push-off'() { UI.push = { ...(UI.push || {}), busy: true }; render(); await PUSH.off(); toast(t('Notifications are off for this device.')); await pushRefresh(); },
  // owner, 2026-10-09: "notifications are not reaching my phone": the test now shows, device by device, what each push service answered
  async 'push-test'() { const r = await SERVER.remindTest('push'); UI.pushTest = { at: Date.now(), results: r.results || [] }; if (UI.route === 'profile') render(); toast(r.ok ? t('Test sent. It should arrive in a few seconds.') : r.code === 'too_soon' ? t('A test was sent a moment ago. Give it a few seconds to arrive.') : t('The test could not be sent. Try again in a minute.')); },
  /** A test that arrives 15 seconds later, so it can be seen with Dorax closed (owner, 2026-10-10: "I still get nothing on the phone with the web app
      closed"): close it, or lock the phone, and wait. The function's logs say what each device's push service answered. */
  async 'push-test-later'() {
    if (SERVER.preview) return toast(t('This preview sends nothing: no notifications and no emails.'));
    const r = await SERVER.remindTest('push', 15);
    toast(r.ok ? t('Close Dorax now, or lock the phone: the test arrives in 15 seconds.') : r.code === 'too_soon' ? t('A test was sent a moment ago. Give it a few seconds to arrive.') : r.code === 'no_device' ? t('This device is not registered for notifications. Turn them off and on again.') : t('The test could not be sent. Try again in a minute.'));
  },
  async 'mail-test'() {
    if (SERVER.preview) return toast(t('This preview sends nothing: no notifications and no emails.'));
    const r = await SERVER.remindTest('email'); toast(r.ok ? t('Test sent to {email}.', { email: S.user.email }) : r.code === 'too_soon' ? t('A test email was sent less than an hour ago. Look in your inbox, and in the spam folder.') : t('The test could not be sent. Try again in a minute.'));
  },
  'calendar-file'() { fmt.raw = true; let ev; try { ev = calendarEvents(); } finally { fmt.raw = false; } if (!ev.length) return toast(t('Give at least one bill a due day first.')); saveFile('dorax-finance.ics', calendarText(ev), 'text/calendar'); },
  // paying the card: one movement out of the account that pays and one into the card, so both balances stay right
  'card-pay'(ds) {
    const a = acct(ds.id), from = cardsOf(cashAccounts()).filter(x => x.type !== 'credit'), inv = cardInvoices(B(), S.today, BCUR()).find(c => c.accountId === ds.id && c.ym === ymOf(S.today));
    if (!a) return; if (!from.length) return toast(t('Add the account you pay the card from first.'));
    UI.sheet = false; UI.drawer = { kind: 'card-pay', title: t('Pay {name}', { name: a.name }), back: ds.back === 'journey' ? 'journey' : !!ds.back, draft: { cardId: a.id, fromId: (from.find(x => x === mainAcct()) || from[0]).id, amountText: inv && inv.amount ? plain(inv.amount) : '', date: S.today } };
    renderOverlay(); const el = $('cp-amount'); if (el) { el.focus(); el.select(); }
  },
  'card-pay-save'() {
    const d = UI.drawer, m = d.draft, a = acct(m.cardId), from = debitTarget(acct(m.fromId)), amt = typedAmount(m.amountText || '');
    if (amt === null || amt <= 0) return fail(t('Enter an amount greater than zero, for example 185,42.'), 'cp-amount');
    if (!parseDate(m.date)) return fail(t('Enter a valid date.'), 'cp-date');
    if (m.date > S.today) return fail(t('The date cannot be in the future.'), 'cp-date');
    if (!from || from.id === a.id) return fail(t('Choose the account the payment comes from.'), 'cp-from');
    const side = (accountId, other, amount, merchant) => { const x = { id: newId('t'), accountId, date: m.date, description: merchant, merchant, amount, currency: acct(accountId).currency, type: 'transfer', categoryId: null, subcategoryId: null, status: 'confirmed', transferAccountId: other, recurring: false, notes: '', source: 'manual', sourceTxnId: null, confidence: null, splits: null }; x.fingerprint = fingerprint(accountId, m.date, merchant, amount); S.transactions.push(x); };
    side(from.id, a.id, -amt, t('Card payment: {name}', { name: a.name })); side(a.id, from.id, amt, t('Payment received from {name}', { name: from.name }));
    S.transactions.sort((x, y) => x.date < y.date ? 1 : x.date > y.date ? -1 : 0);
    toast(t('Card payment recorded.')); UI.drawer = d.back === 'journey' ? jOpen() : d.back ? { kind: 'reminders', title: t('Notifications'), tab: 'rem' } : null; render();      // from the Journey: back to it
  },
  'due-days'(ds) {
    const days = {}; billLines().forEach(l => { days[l.id] = l.due ? String(l.due) : ''; }); cards().forEach(a => { days[a.id] = a.dueDay ? String(a.dueDay) : ''; });
    UI.sheet = false; UI.drawer = { kind: 'due-days', title: t('Due days'), back: !!(ds && ds.back), draft: { days } }; renderOverlay();
    const el = (ds && ds.id && $('dd-' + ds.id)) || document.querySelector('.due-row input[value=""]') || document.querySelector('.due-row input'); if (el) { el.focus(); if (el.select) el.select(); }
  },
  'due-save'() {
    const d = UI.drawer, changed = [];
    for (const l of [...billLines(), ...cards()]) {
      const txt = String(d.draft.days[l.id] == null ? '' : d.draft.days[l.id]).trim(), n = txt === '' ? null : Number(txt);
      if (n !== null && !(Number.isInteger(n) && n >= 1 && n <= 31)) { fail(t('{name}: the due day must be between 1 and 31.', { name: l.name })); const el = $('dd-' + l.id); if (el) el.focus(); return; }
    }
    for (const a of cards()) {
      const txt = String(d.draft.days[a.id] == null ? '' : d.draft.days[a.id]).trim(), n = txt === '' ? null : Number(txt);
      if ((a.dueDay || null) !== n) { if (n) { a.dueDay = n; a.dueFrom = cardFromYm(n, S.today); } else { delete a.dueDay; delete a.dueFrom; } changed.push(a.id); }      // a new day: from its next date (core/cards.js)
    }
    for (const l of billLines()) {
      const txt = String(d.draft.days[l.id] == null ? '' : d.draft.days[l.id]).trim(), n = txt === '' ? null : Number(txt);
      if ((l.due || null) !== n) { if (n) l.due = n; else delete l.due; changed.push(l.id); }
    }
    flash(...changed);
    toast(!changed.length ? t('No due day changed.') : S.user.notify.bills ? tn(changed.length, '{n} due day saved. Reminders follow it.', '{n} due days saved. Reminders follow them.') : tn(changed.length, '{n} due day saved.', '{n} due days saved.'));
    UI.drawer = d.back ? { kind: 'reminders', title: t('Notifications'), tab: 'rem' } : null; render();
  },
};
const REMIND_CHANGES = {
  'due-day'(el) { UI.drawer.draft.days[el.dataset.id] = el.value; },
  'user-lead'(el) { remindCfg().lead = +el.value; render(); },
  // how often a tip comes by notification (features/reminders/tip-messages.js; owner, 2026-10-10)
  'tips-rate'(el) { S.user.notify = S.user.notify || {}; S.user.notify.tips = TIP_RATES.includes(el.value) ? el.value : 'three'; render(); },
};
