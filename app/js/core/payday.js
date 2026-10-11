/* Dorax Finance — calculations: pay day. Which planned income was due by today and has nothing recorded under it. */
// 2026-10-07 (owner: "if the person is paid a fixed salary on the same day each month ... a notification: today is your pay day, do you want to
// record your salary of [amount]? Add transaction | I'll do it"). Nothing is ever recorded by itself: a salary can arrive late, short or with a
// bonus, and a statement imported later would bring it a second time. The app asks; the person confirms.
// An income row may carry a pay day (1 to 31, kept as row.day). Rows of the same income line and the same half of the month are one payment split
// in parts (the part for the bills, the part for savings: core/plan.js, payActual), so they share the day and are asked about as one amount.

/** The month's planned incomes, each payment once: [{ key, sub, half, name, day, amount, ids }]. day is 0 when none was given. */
function payGroups(state, ym) {
  const m = +ym.slice(5) - 1, out = [];
  for (const r of payRows(state, +ym.slice(0, 4))) {
    const key = r.sub + '|' + (r.half || 0); let g = out.find(x => x.key === key);
    if (!g) out.push(g = { key, sub: r.sub, half: r.half || 0, name: r.name, day: 0, amount: 0, ids: [] });
    g.amount += r.values[m] || 0; g.ids.push(r.id); if (!g.day && r.day >= 1 && r.day <= 31) g.day = r.day;
  }
  return out;
}
/** The payments whose day has come this month (a day the month does not have counts as its last day) with something planned and nothing received
    under their income line yet: [{ ...group, date, today }], the earliest first. */
function payDue(state, today, currency) {
  const ym = ymOf(today), d = +today.slice(8), out = [];
  for (const g of payGroups(state, ym)) {
    if (!g.day || g.amount <= 0) continue;
    const date = isoDate(ym, g.day); if (date > today) continue;
    const got = sum(state.transactions.filter(t => t.type === 'income' && inScope(state, t, ym, currency) && t.subcategoryId === g.sub && (!g.half || (g.half === 1) === (+t.date.slice(8) <= 15))).map(t => t.amount));
    if (got > 0) continue;
    out.push({ ...g, date, today: +date.slice(8) === d });
  }
  return out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}
