/* Dorax Finance — converter: the statement being converted and its OFX profile. */
/** The OFX profile of an account. The first time a statement of an account is converted, a profile is made from the account itself: its currency, its kind,
    its bank (the bank's compensation code when the bank is in the list) and its name as the account identifier. Nothing about one bank or one accounting
    platform is assumed; the person changes the profile in Settings when their platform asks for something else. */
function profileFor(accountId) {
  const own = S.ofxProfiles.find(p => p.forAccount === accountId); if (own) return own.id;
  const a = acct(accountId), base = S.ofxProfiles.find(p => p.id === S.settings.defaultProfile) || S.ofxProfiles[0] || OFX_BASE, ver = OFX_VERSIONS.find(v => v.id === base.version) || OFX_VERSIONS[0];
  const slug = s => normalizeText(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const p = { id: 'p-' + accountId, name: a.name, version: ver.id, currency: a.currency, bankId: BANK_CODES[a.institution] || slug(a.institution) || 'BANK', branchId: '', accountId: slug(a.name) || 'ACCOUNT',
    accountType: a.type === 'credit' ? 'CREDITCARD' : a.type === 'savings' ? 'SAVINGS' : 'CHECKING', institutionName: a.institution && a.institution !== t('Other') ? a.institution : '', institutionId: '', language: base.language || 'POR', transferMapping: base.transferMapping || 'SIGN', forAccount: accountId };
  S.ofxProfiles.push(p); if (!S.settings.defaultProfile) S.settings.defaultProfile = p.id;
  return p.id;
}
function generateForConv() {
  const c = UI.conv, base = S.ofxProfiles.find(x => x.id === c.profileId), p = { ...base, accountId: c.acctId || base.accountId };
  c.exportRows = c.rows.filter(r => r.decision === 'accept');
  c.start = c.start || c.ym + '-01'; c.end = c.end || isoDate(c.ym, 31);
  c.closingUsed = c.closing != null ? c.closing : accountBalance(S, c.accountId, c.end);
  c.ofx = generateOFX(c.exportRows, p, { asOf: S.today, start: c.start, end: c.end, balance: c.closingUsed });
  c.validation = validateOFX(c.ofx, p, c.exportRows, t);
  if (p.currency !== acct(c.accountId).currency) { c.validation.checks.push({ name: t('Currency'), ok: false, detail: t('Profile currency does not match the account') }); c.validation.ok = false; }
  c.outName = `${normalizeText(acct(c.accountId).name).toLowerCase().replace(/ /g, '-')}_${c.ym}.ofx`;
  c.step = 3;
  if (c.validation.ok) {
    const rec = { id: c.exportId || newId('x'), date: S.today, file: c.outName, profile: base.name, format: OFX_VERSIONS.find(v => v.id === p.version).label, count: c.exportRows.length };
    S.exports = [rec, ...S.exports.filter(e => e.id !== rec.id)]; c.exportId = rec.id;
    S.closes[c.ym] = S.closes[c.ym] || {}; if (S.closes[c.ym][c.accountId] !== 'sent') S.closes[c.ym][c.accountId] = 'generated';
  }
}
/** A table read from a file of any kind is put in the session: the columns are the reader's guess, or the ones remembered for this account
    when the headings are the same as last time. The person confirms them on the next screen before anything is converted. */
function loadTable(name, table, note) {
  const c = UI.conv, a = acct(c.accountId), sig = table.header.join('|'), kept = !table.headerless && !table.sure && a.convMap && a.convMap.sig === sig ? a.convMap : null;
  const what = { csv: 'CSV', xlsx: 'Excel', xls: 'Excel', pdf: 'PDF', ofx: 'OFX', qif: 'QIF', mt940: 'MT940', camt: 'CAMT.053', html: 'Excel' }[table.source] || 'CSV';
  Object.assign(c, { kind: 'csv', file: name, fileText: null, csv: table, error: null, acctId: null, mapping: false, kept: !!kept, remember: true, closingText: '', pending: null, needPw: false,
    map: kept ? { ...kept.map } : { ...table.map }, mode: kept ? kept.mode : table.mode, order: kept ? kept.order : table.order, invert: kept ? !!kept.invert : false, year: table.year || +S.today.slice(0, 4),
    fileNote: note || tn(table.data.length, '{what} · {n} line · read in your browser, not uploaded', '{what} · {n} lines · read in your browser, not uploaded', { what }) });
}
/** Loads a statement given as text into the session. Everything happens in the browser.
    A file in the Wise layout is read by its own reader, with nothing to confirm. Anything else goes through the general reader. */
function loadStatement(name, text, note) {
  const c = UI.conv, w = parseWiseCSV(text), info = wiseFileInfo(name), none = { file: null, fileText: null, csv: null, mapping: false, pending: null, needPw: false };
  const errors = { 'bad-rows': t('Some rows have a date or amount that could not be read. Download the CSV again from Wise.'), 'duplicate-ids': t('The file contains the same transaction twice. Download the CSV again from Wise.'), 'mixed-currencies': t('The file mixes currencies. Download one CSV per currency.') };
  if (!w.ok && w.error !== 'not-wise') return Object.assign(c, none, { error: errors[w.error] });
  if (!w.ok) { const table = readStatementText(text); return table.ok ? loadTable(name, table, note) : Object.assign(c, none, { error: fileError(table.error) }); }
  const cur = w.currency || (info && info.currency), match = convAccounts().find(a => a.currency === cur);
  if (cur && acct(c.accountId).currency !== cur) {
    if (!match) return Object.assign(c, none, { error: t('This statement is in {cur}, but none of your accounts uses that currency.', { cur }) });
    c.accountId = match.id; c.profileId = profileFor(match.id);
  }
  const end = (info && info.end) || w.end;
  Object.assign(c, { kind: 'wise', csv: null, mapping: false, pending: null, needPw: false, file: name, fileText: text, error: null, acctId: info ? info.balanceId : null, start: (info && info.start) || w.start, end, ym: end ? ymOf(end) : c.ym,
    fileNote: note || tn(w.rows.length, '{n} row · {cur} · read in your browser, not uploaded', '{n} rows · {cur} · read in your browser, not uploaded', { cur: cur || '' }) });
}
const fileError = code => ({ empty: t('That file is empty.'), 'no-table': t('That file holds no table: a statement has one line per transaction, with a date and an amount.'),
  'pdf-scan': t('That PDF is a picture of the statement, with no text in it, so the amounts cannot be read with certainty. Download the statement from the bank’s site instead of scanning or photographing it.'),
  'pdf-broken': t('That PDF could not be opened. Download it again from the bank and try once more.'), 'no-reader': t('The reader for this kind of file could not start here. Try the statement as CSV or OFX.'),
  'xls-password': t('That Excel file is protected with a password. Open it, save a copy without the password and choose the copy.') }[code] || t('The file could not be read. Try choosing it again.'));
/** The transactions of the loaded table, with the columns as they stand on the screen. */
const convRead = c => statementRows(c.csv, c.map, { mode: c.mode, order: c.order, invert: c.invert, year: c.csv.yearless ? +c.year || null : null });
