/* Dorax Finance — what an invitation says (v228; the rules: core/invites.js). Like reminder-messages.js, this file is used twice: by the app and by
   the morning job on the server, whose copy is made from this very file (tools/build-functions.js), so both say the same. Nothing here touches the
   page: it reads the account (S), the texts (t) and the formats (fmt), and returns plain text.
   An invitation says what the thing is in three short lines, with no figure about anyone else and no promise; the email adds one figure that is the
   thing itself (R$ 1.378 in 52 weeks), the button opens the place to start it (?do=, features/install/shortcuts.js), and the small print says why it
   came and how to stop it. The third time it says it is the last. */
/** An invitation in words: { subject, lines, figure, push: { title, body }, texts: { open, why }, link }. pick: from invitePick. */
function inviteMessage(state, pick) {
  const cur = BASE_CURRENCY, money = v => fmt.money(v, cur, { trim: true });
  const why = t('You get this because you have not tried it in Dorax yet. At most one invitation a week, and each only three times. To stop them, switch off Invitations in your profile, under Notifications.');
  const last = pick.n >= INVITE_MAX ? [t('This is the last time we suggest it.')] : [];
  if (pick.kind === 'journey') return {
    subject: t('Your way out of debt, one day at a time'),
    lines: [t('The Journey helps you pay off what you owe in short steps.'), t('Each day you add no new debt, you mark it, and your streak grows.'), t('A sprint is 7, 14 or 30 days with an amount to pay: a short goal you can reach.'), ...last],
    figure: null,
    push: { title: t('Journey'), body: t('Get out of debt one day at a time: mark each day with no new debt, and run short sprints.') },
    texts: { open: t('Start my Journey'), why }, link: '?do=journey' };
  if (pick.kind === 's52') { const v = { a: money(100), b: money(200), c: money(5200), total: money(137800) };
    return {
      subject: t('Shall we put aside {total} in a year?', v),
      lines: [t('The 52-week challenge: week 1 you put aside {a}, week 2 {b}, and so on up to {c} in week 52.', v), t('At the end of the year you have {total}. For more, each week can go up by {d}, {e} or {f}.', { ...v, d: money(200), e: money(500), f: money(1000) }), t('Each week Dorax tells you how much, and keeps it in a goal of its own.'), ...last],
      figure: { big: v.total, small: t('in 52 weeks, starting with {a}', v) },
      push: { title: t('52-week challenge'), body: t('Week 1, {a}; week 2, {b}… In a year you have {total}. Start this week?', v) },
      texts: { open: t('Start the challenge'), why }, link: '?do=s52' }; }
  return {
    subject: t('7 days without spending: are you in?'),
    lines: [t('A short challenge: 7, 14 or 30 days paying only what is fixed, like rent, bills and transport.'), t('Each day you manage it, you mark it on the summary and see how many you have.'), t('A pause to see where the day-to-day money goes.'), ...last],
    figure: { big: '7 · 14 · 30', small: t('days without spending: you choose how many') },
    push: { title: t('Days without spending'), body: t('Are you in for 7 days paying only what is fixed? Each day you manage it, you mark it.') },
    texts: { open: t('Start days without spending'), why }, link: '?do=nospend' };
}
