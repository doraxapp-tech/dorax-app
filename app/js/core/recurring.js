/* Dorax Finance — calculations: recurring payments found in the transactions. */
// ---------- recurring detection ----------
/** The middle value; with an even count, the mean of the two middle values (rounded to a whole number: these are cents or days).
    Before v39 an even count returned the upper of the two, so four payments of 100, 100, 110, 110 read as a typical 110. */
function median(xs) { const s = [...xs].sort((a, b) => a - b), n = s.length; return !n ? 0 : n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2); }
/** Monthly recurring = same merchant in >= 3 of the last 4 complete months, roughly once a month, similar amount and day. */
function detectRecurring(state, today) {
  const thisYm = ymOf(today), window = [1, 2, 3, 4].map(n => addMonths(thisYm, -n));
  const personal = new Set(state.accounts.filter(a => a.scope !== 'business').map(a => a.id));
  const groups = {};
  for (const t of state.transactions) {
    if (t.type !== 'expense' || !counts(t) || !personal.has(t.accountId)) continue;
    const ym = ymOf(t.date);
    if (!window.includes(ym) && ym !== thisYm) continue;
    const key = t.accountId + '|' + normalizeText(t.merchant);
    (groups[key] = groups[key] || []).push(t);
  }
  const out = [];
  for (const key in groups) {
    const all = groups[key], past = all.filter(t => ymOf(t.date) !== thisYm);
    const months = new Set(past.map(t => ymOf(t.date)));
    if (months.size < 3 || past.length > months.size + 1) continue;
    const amounts = past.map(t => -t.amount), med = median(amounts);
    if (amounts.some(a => Math.abs(a - med) * 100 > med * 25)) continue;
    const days = past.map(t => Number(t.date.slice(8)));
    if (Math.max(...days) - Math.min(...days) > 7) continue;
    const day = median(days);
    const paidThisMonth = all.some(t => ymOf(t.date) === thisYm);
    let next = isoDate(thisYm, day);
    if (paidThisMonth || next < today) next = isoDate(addMonths(thisYm, 1), day);
    const last = past.sort((a, b) => a.date < b.date ? 1 : -1)[0];
    out.push({ id: 'det-' + hashHex(key).slice(0, 8), source: 'detected', merchant: last.merchant, amount: med, frequency: 'monthly', day,
      next, accountId: last.accountId, categoryId: last.categoryId, subcategoryId: last.subcategoryId, occurrences: past.length, fixed: amounts.every(a => a === med) });
  }
  return out;
}
function recurringList(state, today) {
  const dismissed = new Set(state.recurringDismissed || []);
  const detected = detectRecurring(state, today).filter(r => !dismissed.has(r.id));
  const manual = state.recurringManual.map(r => {
    const thisYm = ymOf(today);
    let next = isoDate(thisYm, r.day);
    if (next < today) next = isoDate(addMonths(thisYm, 1), r.day);
    return { ...r, source: 'manual', frequency: 'monthly', next };
  });
  return [...detected, ...manual].sort((a, b) => a.next < b.next ? -1 : a.next > b.next ? 1 : b.amount - a.amount);
}
