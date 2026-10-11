/* Dorax Finance — clicks: the statement converter and the monthly list. Joined into A in app/actions.js. */
const CONVERTER_ACTIONS = {
  // statements owed every month, and the converter
  'close-set'(ds) { S.closes[ds.ym] = S.closes[ds.ym] || {}; if (ds.v) S.closes[ds.ym][ds.id] = ds.v; else delete S.closes[ds.ym][ds.id]; toast(ds.v === 'sent' ? t('Marked as sent.') : t('Marked as pending.')); render(); },
  // started from the list of statements owed (an account and a month), or freely: any account, and the month is the one the file turns out to be of
  'conv-start'(ds) { const id = ds.id || (convAccounts()[0] || {}).id; if (!id) return; UI.conv = { step: 1, source: 'csv', accountId: id, ym: ds.ym || addMonths(ymOf(S.today), -1), free: !ds.ym, profileId: profileFor(id), file: null, fileText: null, fileNote: '', error: null }; render(); toTop(); },
  'conv-analyze'() {
    const c = UI.conv;
    if (c.kind === 'csv') { c.mapping = true; render(); toTop(); const el = $('cm-date'); if (el) el.focus({ preventScroll: true }); return; }   // any other CSV: the columns are confirmed first
    const w = parseWiseCSV(c.fileText);
    c.closing = w.closing;
    Object.assign(c, { rows: buildRows(w.rows.map(r => ({ date: r.date, amount: r.amount, description: r.description, name: r.name, kind: r.kind, sourceTxnId: r.sourceTxnId, confidence: 100 })), c.accountId), step: 2, imported: null, exportId: null });
    render(); toTop();
  },
  'conv-remap'() { const c = UI.conv; c.step = 1; c.mapping = true; render(); toTop(); },
  /** A protected PDF: the password is tried on the file that is waiting. It is used to open the file in the browser and kept nowhere. */
  'conv-pw'() { const c = UI.conv, el = $('cv-pw'); if (c.pending && el && el.value) takeFile(c.pending, el.value); },
  'conv-map-back'() { UI.conv.mapping = false; render(); toTop(); },
  /** The columns are confirmed: the transactions are built, the period and the closing balance are taken from the file, and the choice is kept for this account's next statement. */
  'conv-map-ok'() {
    const c = UI.conv, r = convRead(c), typed = c.closingText && c.closingText.trim() ? typedAmount(c.closingText) : null, a = acct(c.accountId);
    if (!r.rows.length) return toast(t('No line can be read with these columns. Check the date and the amount.'));
    if (c.closingText && c.closingText.trim() && typed === null) return toast(t('Enter the amount as a number, for example 1500 or 9,90.'));
    if (c.remember && !c.csv.headerless && !c.csv.sure) a.convMap = { sig: c.csv.header.join('|'), map: { ...c.map }, mode: c.mode, order: c.order, invert: !!c.invert }; else if (!c.csv.sure && !c.csv.headerless) delete a.convMap;   // forgotten only when the person switches it off, not because another kind of file came in between
    Object.assign(c, { mapping: false, read: r, closing: r.closing !== null ? r.closing : typed, start: r.start, end: r.end, ym: ymOf(r.end), step: 2, imported: null, exportId: null,
      // a PDF is drawn, not typed: its lines are trusted without a second look only when the file's own balances confirm every one of them
      rows: buildRows(r.rows.map(x => ({ date: x.date, amount: x.amount, description: x.description || t('No description'), name: '', kind: '', sourceTxnId: x.sourceTxnId, confidence: c.csv.source === 'pdf' && !(r.chain && r.chain.bad === 0) ? 80 : 100 })), c.accountId) });
    render(); toTop();
  },
  'conv-empty'() { const c = UI.conv; Object.assign(c, { rows: [], file: null, fileText: null, closing: null, acctId: null, start: null, end: null, imported: null, exportId: null, source: 'csv' }); generateForConv(); render(); toTop(); },
  'conv-reset'() { UI.conv = null; render(); },
  'conv-generate'() { generateForConv(); render(); toTop(); },
  'conv-back'() { UI.conv.step = 2; render(); },
  'conv-download'() { saveFile(UI.conv.outName, UI.conv.ofx); },
  'conv-copy'() { copyText(UI.conv.ofx); },
  // the answer to "every month?" after a conversion. Yes: the account goes on the list from the month just converted, and the reminder for statements is switched on
  // if it was the first account (said on the screen). No: the question is not asked again for this account; the switch stays in the account's settings.
  'conv-monthly'(ds) {
    const c = UI.conv, a = acct(c.accountId); a.monthlyAsked = true;
    if (ds.v === 'yes') { const firstOne = !needStatements().length; a.monthly = true; a.monthlySince = c.ym; delete a.integrated; if (firstOne) S.user.notify.close = true; c.monthlySet = true; toast(t('{name} is on the monthly list.', { name: a.name })); }
    else { a.monthly = false; toast(t('Not added. You can switch it on later in the account.')); }
    render(); const el = ds.v === 'yes' ? $('conv-ask') : document.querySelector('[data-a="conv-download"]'); if (el) el.focus();
  },
  'conv-import'() { const c = UI.conv; c.imported = commitSession(c); toast(t('{n} transactions added to the ledger.', { n: c.imported.imported })); c.rows.forEach(r => setDup(r, c.accountId)); render(); },
};
function takeFile(file, password) {
  const c = UI.conv; if (!c || c.step !== 1) return;
  const none = { file: null, fileText: null, csv: null, pending: null, needPw: false };
  if (file.size > 25 * 1024 * 1024) { Object.assign(c, none, { error: t('That file is larger than 25 MB. Export a shorter statement period and try again.') }); return render(); }
  Object.assign(c, { busy: true, error: null }); render();
  readStatementFile(file, password).then(r => {
    c.busy = false;
    if (r.text != null) loadStatement(file.name, r.text);
    else if (r.ok) loadTable(file.name, r);
    else if (r.error === 'pdf-password' || r.error === 'pdf-wrong-password') Object.assign(c, none, { pending: file, needPw: true, file: file.name, fileNote: '', error: r.error === 'pdf-wrong-password' ? t('That password did not open the file. Try again.') : null });
    else Object.assign(c, none, { error: fileError(r.error) });
    render(); if (c.needPw) { const el = $('cv-pw'); if (el) el.focus(); }
  }, e => { c.busy = false; Object.assign(c, none, { error: fileError(e && e.message === 'no-reader' ? 'no-reader' : 'unreadable') }); render(); });
}
