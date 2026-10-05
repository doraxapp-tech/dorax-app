/* Dorax Finance — what a reminder says outside the app: a line of the reminder email, the text of a notification on the phone.
   It is used twice: by the app (the preview in the profile) and by the job on the server that sends them. The server's copy is made from
   this very file (tools/build-functions.js writes supabase/functions/reminders/engine.mjs), so the two can never say different things.
   For that reason nothing here touches the page: it reads the account (S), the texts (t, tn) and the formats (fmt), and returns plain text. */

/** The accounting platform or accountant, as the person named it in Settings. The app assumes none: without a name it says "Accounting". */
const platLabel = () => (S.settings.platform || '').trim() || t('Accounting');
const whenText = r => r.days < 0 ? tn(-r.days, '{n} day late', '{n} days late') : r.days === 0 ? t('due today') : tn(r.days, 'in {n} day', 'in {n} days');

/** The reminders worth a message. "Some bills have no due day" is a thing to set up, not a thing that is due: the app shows it, nothing is sent for it. */
const messageReminders = rs => rs.filter(r => r.kind !== 'nodue');

/** One reminder as one sentence. */
function reminderLine(r) {
  return r.kind === 'bill' ? t('{name}: {amount}, due {date} ({when}).', { name: r.name, amount: (r.pay === 'variable' ? '≈ ' : '') + fmt.money(r.amount, CUR), date: fmt.date(r.date), when: whenText(r) })
    : r.kind === 'card' ? t('{name}: invoice of {amount}, due {date} ({when}).', { name: r.name, amount: (r.estimate ? '≈ ' : '') + fmt.money(r.amount, CUR), date: fmt.date(r.date), when: whenText(r) })
    : r.kind === 'past' ? tn(r.lines.length, '{n} bill from {month} has no payment', '{n} bills from {month} have no payment', { month: fmt.month(r.ym) }) + ': ' + r.lines.map(x => x.name).join(', ') + '.'
    : r.kind === 'handout' ? t('Savings for {month}: {amount} still to hand out.', { month: fmt.month(r.ym), amount: fmt.money(r.amount, CUR) })
    : r.kind === 'close' ? t('{name}: the {month} statements are due by {date} ({when}). {sent} of {total} sent.', { name: platLabel(), month: fmt.month(r.ym), date: fmt.date(r.date, true), when: whenText(r), sent: r.sent, total: r.total })
      : r.saved >= 0 ? t('{month} closed with {amount} left over.', { month: fmt.month(r.ym), amount: fmt.money(r.saved, CUR) }) : t('{month} closed with spending {amount} above income.', { month: fmt.month(r.ym), amount: fmt.money(-r.saved, CUR) });
}

/** The email: its subject and one line per reminder. One bill says its own name in the subject; several are counted. */
function reminderDigest(rs) {
  rs = messageReminders(rs); if (!rs.length) return null;
  const bills = rs.filter(r => r.kind === 'bill' || r.kind === 'card');
  return { subject: rs.length === 1 && bills.length ? `${bills[0].name}: ${whenText(bills[0])}` : tn(rs.length, '{n} thing to look at today', '{n} things to look at today'), lines: rs.map(reminderLine) };
}

/** The notification: a title and a short body. One bill shows its name and amount, then when it is due; several are counted, the first three named. */
function reminderPush(rs) {
  rs = messageReminders(rs); if (!rs.length) return null;
  if (rs.length === 1) {
    const r = rs[0];
    if (r.kind === 'bill' || r.kind === 'card') return { title: `${r.kind === 'card' ? t('{name}: invoice', { name: r.name }) : r.name} · ${(r.pay === 'variable' || r.estimate ? '≈ ' : '') + fmt.money(r.amount, CUR)}`, body: `${t('Due {date}', { date: fmt.date(r.date) })} · ${whenText(r)}` };
    return { title: 'Dorax Finance', body: reminderLine(r) };
  }
  const more = rs.length - 3;
  return { title: tn(rs.length, '{n} thing to look at today', '{n} things to look at today'), body: rs.slice(0, 3).map(reminderLine).join('\n') + (more > 0 ? '\n' + t('and {n} more', { n: more }) : '') };
}

/** What tells one message from the next: the reminder and the stage it is at (coming up, due today, late). The server keeps the keys it has
    already sent, so a bill is announced once when it comes into view, once on its day and once when it is late, and not every morning. */
const reminderKey = r => r.id + '|' + (r.when || r.kind);

/** What the person asked to hear about, read from the account the way the app reads it. */
const reminderOptions = state => { const u = state.user || {}, n = u.notify || {}, cfg = u.remind || {}; return { ...n, goals: n.goals !== false, lead: cfg.lead == null ? 3 : cfg.lead, askDue: cfg.askDue !== false, closeDay: (state.settings || {}).closeDay }; };

/** The few texts of a reminder email that are not reminders themselves, and the ones of the "send me a test" messages. */
const reminderTexts = () => ({
  open: t('Open Dorax Finance'),
  why: t('You get this email because reminders by email are switched on in your Dorax Finance profile. To stop them, switch them off there, under Reminders.'),
  testTitle: t('Notifications are on'),
  testBody: t('This device will get your Dorax Finance reminders.'),
  testMailSubject: t('Reminder emails are on'),
  testMailLine: t('This is where your Dorax Finance reminders arrive: one message when a bill is coming up, one on its day, and one if it is late.'),
});
