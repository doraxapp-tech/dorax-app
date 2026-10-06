/* Dorax Finance — Plan: recording the payment of a fixed cost. */
/** A payment of a fixed cost is an ordinary expense transaction, tagged with the line it pays. */
function recordPayment(line, amount, date, accountId, note) {
  const x = { id: newId('t'), accountId, date, description: line.name, merchant: line.name, amount: -amount, currency: acct(accountId).currency, type: 'expense', categoryId: line.categoryId, subcategoryId: line.subcategoryId || null,
    status: 'confirmed', transferAccountId: null, recurring: false, notes: note || '', source: 'manual', sourceTxnId: null, confidence: null, splits: null, planLineId: line.id };
  if (line.k && line.k.name && line.name === nameIn(line.k.name, B().namesLang, B())) x.k = { description: line.k.name, merchant: line.k.name };      // paid under a name the app wrote: it follows the language like the cost does
  x.fingerprint = fingerprint(accountId, date, x.merchant, x.amount);
  B().transactions.push(x); B().transactions.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  return x;
}
