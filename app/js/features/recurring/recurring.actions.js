/* Dorax Finance — clicks: recurring payments. Joined into A in app/actions.js. */
const RECURRING_ACTIONS = {
  // recurring
  'add-recurring'() {
    const name = $('rc-name').value.trim(), amt = typedAmount($('rc-amt').value), day = Math.min(31, Math.max(1, +$('rc-day').value || 1)), [c, s] = $('rc-cat').value.split('|');
    if (!name) return toast(t('Enter a name for the recurring payment.'));
    if (!amt || amt <= 0) return toast(t('Enter an amount greater than zero.'));
    if (!$('rc-acct').value) return toast(t('Add an account first.'));
    S.recurringManual.push({ id: newId('m'), merchant: name, amount: amt, day, accountId: $('rc-acct').value, categoryId: c, subcategoryId: s || null }); toast(t('Recurring payment added.')); render();
  },
  'remove-recurring'(ds) {
    const r = S.recurringManual.find(k => k.id === ds.id); if (!r) return;
    confirmBox({ title: t('Delete this recurring payment?'), text: t('{name}, {amount}, day {d} of each month.', { name: r.merchant, amount: fmt.money(r.amount, acct(r.accountId).currency), d: r.day }), label: t('Delete recurring payment'),
      run() { S.recurringManual = S.recurringManual.filter(k => k !== r); render(); } });
  },
  'dismiss-recurring'(ds) { S.recurringDismissed.push(ds.id); toast(t('Marked as not recurring.')); render(); },
};
