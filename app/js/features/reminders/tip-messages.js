/* Dorax Finance — tips by notification: what Dorax sends now and then, besides reminders, to help and to keep the person going.
   Owner, 2026-10-10: "I want the web app to notify about curiosities, tips, advice, etc., to help and motivate the person" (until then a
   notification went out only when something was due).
   Like reminder-messages.js, this file is used twice: by the app (the setting in the profile) and by the morning job on the server, whose copy is
   made from this very file (tools/build-functions.js), so both say the same. Nothing here touches the page: it reads the account (S), the texts
   (t, tn) and the formats (fmt), and returns plain text.
   Three kinds, taken in turn:
     insight  the insight of the day, worked out from the person's own numbers (core/insights.js), in the words of the dashboard's card
     curio    a short fact about money in Brazil, with its source (the same facts as the notices inside the app)
     advice   a practical habit, without figures: nothing here is a statistic or a promise
   How often (user.notify.tips): 'daily', 'three' (at most three a week, two days apart: the default), 'weekly', or 'off'. When: between 8:00 and
   23:00, at a different time each day (the server's tipSlot, supabase/functions/reminders/logic.mjs; owner, 2026-10-10: "any time from 8 in the
   morning to 11 at night, any day, with the app closed: the idea is to bring the person back"). Never on a day that already had a reminder, and only
   by notification, never by email. */
const TIP_RATES = ['daily', 'three', 'weekly', 'off'];
const tipRate = state => { const r = (((state.user || {}).notify) || {}).tips; return TIP_RATES.includes(r) ? r : 'three'; };

/** The curiosities: [the fact, its source]. Every fact was read at its source on 2026-10-07 and names it (features/ahead/curios.view.js shows them
    inside the app; core/curios.js says which comes next there). WHEN A RULE CHANGES (a new MEI limit, a new ceiling), the row must change with it. */
function curioFacts() {
  return {
    fgc: [t('The FGC covers up to R$ 250.000 per person in each bank or financial group, and at most R$ 1 million every four years.'), 'FGC, Fundo Garantidor de Créditos'],
    card: [t('Since January 2024, the interest and charges on a credit card’s revolving balance cannot add up to more than the original debt.'), 'Conselho Monetário Nacional · Banco Central do Brasil'],
    savings: [t('A savings account (poupança) pays 0,5% a month plus TR while the Selic target is above 8,5% a year. At 8,5% or less, it pays 70% of the Selic plus TR.'), 'Lei 12.703/2012'],
    overdraft: [t('Interest on an overdraft (cheque especial) has a ceiling: 8% a month, since January 2020.'), 'Resolução CMN 4.765/2019'],
    thirteenth: [t('The 13th salary is paid in two parts: an advance between February and November, and the rest by 20 December.'), 'Lei 4.749/1965'],
    forgotten: [t('The Banco Central has a system to check for money forgotten in banks. Its only official address is valoresareceber.bcb.gov.br.'), 'Banco Central do Brasil'],
    mei: [t('A MEI can invoice up to R$ 81.000 a year: R$ 6.750 a month on average. The limit is the same in 2026.'), 'Lei Complementar 123/2006'],
    das: [t('The monthly DAS of a MEI is due on the 20th.'), 'Simples Nacional · Resolução CGSN 140/2018'],
  };
}
/** Habits, said the way a friend would: no figure, no promise, each one something the person can do today (most of them in Dorax). */
function tipAdvice() {
  return {
    note: t('Write down an expense the moment it happens: one line, “lunch 25”, and your month stays true.'),
    wait: t('Before a big purchase, wait a day. If you still want it tomorrow, give it a place in your plan.'),
    first: t('Pay yourself first: on pay day, set your savings apart before the month starts spending them.'),
    due: t('Give every bill its due day in the Plan, and Dorax reminds you before it is late.'),
    subs: t('Look at your subscriptions once a month: the one you no longer use is money back every month.'),
    small: t('A small amount every month adds up. Give your goal a monthly amount, however small.'),
    full: t('Paying a card’s invoice in full keeps you away from revolving interest.'),
    apart: t('Keep your emergency money in a savings account of its own, apart from the one you spend from.'),
    sunday: t('Five minutes on Sunday: look at your week in Dorax and at what is due next week. That is all it takes.'),
    extra: t('Money back or an extra? Decide where it goes before it disappears into the month.'),
  };
}

// the marks and spans of the days of freedom, as the dashboard says them (features/ahead/ahead.view.js: rwMark, rwFigure)
const tipMark = d => ({ 30: t('30 days'), 90: t('3 months'), 180: t('6 months'), 365: t('1 year') }[d]);
function tipSpan(days) {
  if (days < 60) return tn(days, '{n} day', '{n} days');
  const m = runwayMonths(days), n = Math.floor(m);
  return m > n ? t('{n} and a half months', { n }) : t('{n} months', { n });
}
function tipCatName(id) {
  for (const c of S.categories || []) { if (c.id === id) return c.name; const s = (c.subs || []).find(x => x.id === id); if (s) return s.name; }
  return t('Uncategorized');
}
/** The insight of the day in plain words: the same sentences as the dashboard's card (features/ahead/insights.view.js), for the household. */
function tipInsight(x) {
  const cur = BASE_CURRENCY, money = v => fmt.money(Math.round(v / 100) * 100, cur, { trim: true });
  const bare = ym => { const m = mon(+ym.slice(5, 7) - 1, true); return S.settings.lang === 'en' ? m : m.toLowerCase(); };
  switch (x.kind) {
    case 'pace': { const v = { amount: money(Math.abs(x.diff)), month: bare(x.month) }, so = { amount: money(x.spent) };
      return x.diff < 0 ? [t('You have spent {amount} less than by this day in {month}.', v), t('{amount} so far this month. Keep it up.', so)]
        : [t('You have spent {amount} more than by this day in {month}.', v), t('{amount} so far this month. Seeing it now is what gives you room.', so)]; }
    case 'mover': return x.diff < 0
      ? [t('{name}: {amount} less than by this day in {month}.', { name: tipCatName(x.id), amount: money(-x.diff), month: bare(x.month) }), t('That is {pct}% less. Whatever you changed, it shows.', { pct: x.pct })]
      : [t('{name}: {amount} more than by this day in {month}.', { name: tipCatName(x.id), amount: money(x.diff), month: bare(x.month) }), t('That is {pct}% more. Worth a look, no drama.', { pct: x.pct })];
    case 'bills': return [tn(x.n, '{n} bill due in the next 7 days: {total}.', '{n} bills due in the next 7 days: {total}.', { total: money(x.total) }),
      x.first.days === 0 ? t('First up: {name}, today.', { name: x.first.name }) : x.first.days === 1 ? t('First up: {name}, tomorrow.', { name: x.first.name }) : t('First up: {name}, on {date}.', { name: x.first.name, date: fmt.date(x.first.date) })];
    case 'goal': return [t('{amount} to go for {name}. At this pace: {month}.', { amount: money(x.remaining), name: x.name, month: fmt.month(x.ym) }),
      x.lever ? tn(x.lever.sooner, 'With {amount} more a month, you get there {n} month sooner.', 'With {amount} more a month, you get there {n} months sooner.', { amount: money(x.lever.extra) }) : t('Keep the pace and the date holds.')];
    case 'mark': return [t('{amount} more put aside and you reach {mark} of freedom.', { amount: money(x.missing), mark: tipMark(x.mark) }), t('Today you have {span}.', { span: tipSpan(x.days) })];
    case 'day': return [t('One day of freedom costs {amount}.', { amount: money(x.amount) }), t('That is what goes out in a day at your pace. Every {amount} you put aside buys one more.', { amount: money(x.amount) })];
    case 'streak': return [tn(x.n, '{n} month in a row putting money aside.', '{n} months in a row putting money aside.'), x.open ? t('Put something aside in {month} and it is {n}.', { month: bare(x.month), n: x.n + 1 }) : t('This month already counts.')];
    case 'rate': return [t('Of every {hundred} that came in in {month}, {amount} went to your goals.', { hundred: money(10000), month: bare(x.month), amount: money(x.per100 * 100) }), t('{a} put aside of {b} that came in.', { a: money(x.aside), b: money(x.income) })];
    default: return null;
  }
}

/** The days tips went out, from what the server remembers having sent ('tip|YYYY-MM-DD'), up to today. */
const tipDays = (sent, today) => [...sent].filter(k => /^tip\|\d{4}-\d{2}-\d{2}$/.test(k)).map(k => k.slice(4)).filter(d => d <= today);
/** Whether today is a day for a tip, by the person's choice. sent: the keys already sent to them (a Set). */
function tipDue(state, today, sent) {
  const rate = tipRate(state); if (rate === 'off') return false;
  const days = tipDays(sent, today); if (days.includes(today)) return false;
  const ago = days.map(d => dayDiff(today, d)), last = ago.length ? Math.min(...ago) : Infinity;
  if (rate === 'daily') return true;
  if (rate === 'weekly') return last >= 7;
  return last >= 2 && ago.filter(n => n < 7).length < 3;
}
/** Today's tip, or null: { kind, keys, push: { title, body } }. The kinds take turns (one more tip sent, the next kind first); a kind with nothing to
    say today (an account with no numbers yet has no insight) gives its turn to the next. Facts and habits go in order, the ones never sent first, then the one sent longest ago. */
function tipPick(state, today, sent) {
  if (!tipDue(state, today, sent)) return null;
  const n = tipDays(sent, today).length, kinds = ['insight', 'curio', 'advice'];
  // what was sent is kept as 'tipi|kind|day', 'tipc|id|day', 'tipa|id|day': of the candidates, the one not sent for the longest, never sent first
  const lastOf = (prefix, id) => [...sent].filter(s => s.startsWith(prefix + id + '|')).map(s => s.split('|')[2]).sort().pop() || '';
  const oldest = (prefix, ids, idOf) => ids.slice().sort((a, b) => { const x = lastOf(prefix, idOf(a)), y = lastOf(prefix, idOf(b)); return x < y ? -1 : x > y ? 1 : 0; })[0];
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[(n + i) % kinds.length];
    if (kind === 'insight') {
      // of the facts true today, the one not sent for the longest, so two tips in a row never say the same thing
      const x = oldest('tipi|', insights(state, today, BASE_CURRENCY), y => y.kind), say = x && tipInsight(x);
      if (say) return { kind, keys: ['tip|' + today, 'tipi|' + x.kind + '|' + today], push: { title: t('Insight of the day'), body: say.join(' ') } };
    } else if (kind === 'curio') {
      const facts = curioFacts(), ids = CURIOS.filter(c => c[1] !== 'company' || !!(state.user || {}).company).map(c => c[0]).filter(id => facts[id]);
      if (ids.length) { const id = oldest('tipc|', ids, y => y), f = facts[id]; return { kind, keys: ['tip|' + today, 'tipc|' + id + '|' + today], push: { title: t('Did you know?'), body: f[0] + ' ' + t('Source: {name}', { name: f[1] }) } }; }
    } else {
      const all = tipAdvice(), id = oldest('tipa|', Object.keys(all), y => y);
      return { kind, keys: ['tip|' + today, 'tipa|' + id + '|' + today], push: { title: t('A tip from Dorax'), body: all[id] } };
    }
  }
  return null;
}
