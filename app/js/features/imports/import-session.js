/* Dorax Finance — imports: a statement on its way in (rows, duplicates, commit). */
// ---------- import sessions ----------
function buildRows(raw, accountId) {
  const seen = {}, biz = isBiz(accountId);
  return raw.map((x, i) => {
    const c = biz ? { merchant: x.name || x.description, categoryId: null, subcategoryId: null, ruleId: null, transfer: x.kind === 'CONVERSION' && !/^Wise Charges/.test(x.description) || x.kind === 'TRANSFER' } : categorize(x.description, accountId, S.rules), conf = x.confidence == null ? 99 : x.confidence;
    const key = [accountId, x.date, x.amount, normalizeText(x.description)].join('|'); seen[key] = (seen[key] || 0) + 1;
    const state = conf >= 90 ? 'verified' : conf >= 65 ? 'review' : 'uncertain';
    const row = { id: 'r' + i, date: x.date, description: x.description, amount: x.amount, merchant: c.merchant, mk: c.mk || null, categoryId: c.categoryId, subcategoryId: c.subcategoryId, ruleId: c.ruleId,
      type: c.transfer ? 'transfer' : x.amount >= 0 ? 'income' : 'expense', confidence: conf, state, issue: x.issue || (!biz && !c.ruleId && !c.transfer ? 'norule' : ''),
      sourceTxnId: x.sourceTxnId || null, fitid: x.sourceTxnId || 'DX' + x.date.replace(/-/g, '') + hashHex(key + '|' + seen[key]).slice(0, 10).toUpperCase(),
      decision: S.settings.autoAcceptVerified && state === 'verified' ? 'accept' : null, sel: false, keepBoth: false, edited: false, catTouched: false };
    setDup(row, accountId);
    return row;
  });
}
function setDup(row, accountId) {
  const d = findDuplicate(row, accountId, S.transactions);
  row.dup = d ? { id: d.txn.id, date: d.txn.date, merchant: d.txn.merchant, amount: d.txn.amount, certainty: d.certainty } : null;
}
function commitSession(sess) {
  const rows = importable(sess), accepted = sess.rows.filter(r => r.decision === 'accept').length, cur = acct(sess.accountId).currency, biz = isBiz(sess.accountId);
  rows.forEach(r => S.transactions.push({ id: newId('t'), accountId: sess.accountId, date: r.date, description: r.description, merchant: r.merchant, amount: r.amount, currency: cur, type: r.type,
    categoryId: r.type === 'transfer' || biz ? null : r.categoryId || 'other', subcategoryId: r.type === 'transfer' || biz ? null : r.subcategoryId, status: 'confirmed', transferAccountId: null, recurring: false, notes: '',
    source: sess.source, sourceTxnId: r.sourceTxnId, confidence: r.confidence, splits: null, fingerprint: fingerprint(sess.accountId, r.date, r.merchant, r.amount), ...(r.mk ? { k: { merchant: r.mk } } : {}) }));   // a merchant name that came from one of the app's own rules keeps following the language
  S.transactions.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const result = { imported: rows.length, duplicates: accepted - rows.length, ignored: sess.rows.length - accepted };
  S.imports.unshift({ id: newId('i'), date: S.today, source: sess.source, file: sess.file, accountId: sess.accountId, detected: sess.rows.length, imported: rows.length, duplicates: result.duplicates, review: 0, status: 'Completed' });
  return result;
}
function csvRows(imp) { const sign = imp.invert ? -1 : 1; return imp.csv.rows.map(r => { const a = parseAmount(r[imp.map.amount] || ''); return { date: parseDate(r[imp.map.date] || ''), description: (r[imp.map.description] || '').trim(), amount: a === null ? null : a * sign }; }); }
/** Statements from Brazilian banks are often not UTF-8. Read as UTF-8 when the bytes allow it, as Windows-1252 otherwise, so accents survive. */
async function readText(file) {
  const buf = await file.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, ''); } catch (e) { return new TextDecoder('windows-1252').decode(buf); }
}
const csvGuess = csv => { const g = re => Math.max(0, csv.header.findIndex(h => re.test(normalizeText(h)))); return { date: g(/DATA|DATE|FECHA/), description: g(/HIST|DESC|MEMO|TITLE|TITULO|DETALHE|LANCAMENTO/), amount: g(/VALOR|AMOUNT|MONTO|IMPORTE/) }; };
/** The column choice kept for an account is used again only when the file has the same columns. */
function csvMapFor(imp) {
  const a = acct(imp.accountId), sig = imp.csv.header.join('|'), kept = a && a.csvMap && a.csvMap.sig === sig ? a.csvMap : null;
  imp.map = kept ? { ...kept.map } : csvGuess(imp.csv); imp.invert = kept ? !!kept.invert : a && a.type === 'credit' && !imp.csv.rows.some(r => /^\s*-/.test(r[imp.map.amount] || '')); imp.kept = !!kept;
}
/** A statement file chosen by the person: read in the browser, checked, then sent through the review table. */
async function takeStatement(file, source) {
  const mine = personal(), fail = m => { UI.imp = null; UI.impError = m; render(); };
  UI.impError = null;
  if (!mine.length) return fail(t('Add an account first.'));
  if (file.size > 10 * 1024 * 1024) return fail(t('That file is larger than 10 MB. Export a shorter statement period and try again.'));
  let text; try { text = await readText(file); } catch (e) { return fail(t('The file could not be read. Try choosing it again.')); }
  const accountId = mine.some(a => a.id === UI.tx.account) ? UI.tx.account : mine[0].id;
  if (source === 'csv') {
    if (/<OFX>/i.test(text)) return fail(t('That is an OFX file. Use “Choose an OFX”.'));
    const csv = parseCSV(text); csv.rows = csv.rows.filter(r => r.some(c => String(c).trim()));
    if (csv.header.length < 2 || !csv.rows.length) return fail(t('No table was found in that file. It needs a first row with column names and at least one row below it.'));
    UI.imp = { source: 'csv', file: file.name, accountId, step: 'map', csv, remember: true, real: true }; csvMapFor(UI.imp);
  } else {
    if (!/<OFX>/i.test(text)) return fail(t('That file is not an OFX statement. In your bank, choose OFX (also called “Money”) when you export.'));
    const parsed = parseOFX(text), rows = parsed.rows.filter(r => parseDate(r.date) && r.amount !== null && !isNaN(r.amount));
    if (!rows.length) return fail(t('That OFX file has no transactions.'));
    const cur = parsed.currency && mine.find(a => a.currency === parsed.currency) ? parsed.currency : null, target = cur && acct(accountId).currency !== cur ? mine.find(a => a.currency === cur).id : accountId;
    UI.imp = { source: 'ofx', file: file.name, accountId: target, step: 'review', raw: rows.map(r => ({ ...r, confidence: 100 })), real: true,
      note: parsed.currency && !cur ? t('The file is in {cur} and no household account uses that currency. Check the account before importing.', { cur: parsed.currency }) : rows.length < parsed.rows.length ? tn(parsed.rows.length - rows.length, '{n} row without a valid date or amount was left out.', '{n} rows without a valid date or amount were left out.') : '' };
    UI.imp.rows = buildRows(UI.imp.raw, target);
  }
  render(); const el = $('imp-panel'); if (el) el.scrollIntoView({ block: 'start' });
}
