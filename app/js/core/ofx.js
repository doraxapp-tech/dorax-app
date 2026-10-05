/* Dorax Finance — OFX export/import and CSV parsing (deterministic, no DOM).
   OFX is an export format only: these functions take normalised rows in and hand text out. */

const OFX_VERSIONS = [
  { id: '102', label: 'OFX 1.0.2 (SGML)', xml: false },
  { id: '103', label: 'OFX 1.0.3 (SGML)', xml: false },
  { id: '160', label: 'OFX 1.6 (SGML)', xml: false },
  { id: '211', label: 'OFX 2.1.1 (XML)', xml: true },
  { id: '220', label: 'OFX 2.2 (XML)', xml: true },
  { id: '230', label: 'OFX 2.3 (XML)', xml: true },
];
const OFX_TRNTYPES = ['CREDIT', 'DEBIT', 'INT', 'DIV', 'FEE', 'SRVCHG', 'DEP', 'ATM', 'POS', 'XFER', 'CHECK', 'PAYMENT', 'CASH', 'DIRECTDEP', 'DIRECTDEBIT', 'REPEATPMT', 'OTHER'];
const OFX_ACCTTYPES = ['CHECKING', 'SAVINGS', 'MONEYMRKT', 'CREDITLINE', 'CREDITCARD'];

/** Cents to an OFX amount string without floating point: -18542 -> "-185.42". */
function centsToDecimal(cents) {
  const neg = cents < 0, abs = Math.abs(cents);
  return (neg ? '-' : '') + Math.trunc(abs / 100) + '.' + String(abs % 100).padStart(2, '0');
}
function decimalToCents(str) {
  const m = /^\s*([+-])?(\d+)(?:[.,](\d{1,2}))?\s*$/.exec(str);
  if (!m) return null;
  const cents = Number(m[2]) * 100 + Number((m[3] || '0').padEnd(2, '0'));
  return m[1] === '-' ? -cents : cents;
}
function ofxDate(iso) { return iso.replace(/-/g, ''); }
function asciiFold(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '?'); }
function xmlEscape(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function trnType(row, profile) {
  if (row.type === 'transfer') return profile.transferMapping === 'XFER' ? 'XFER' : (row.amount < 0 ? 'DEBIT' : 'CREDIT');
  if (row.type === 'adjustment') return 'OTHER';
  return row.amount < 0 ? 'DEBIT' : 'CREDIT';
}

/** rows: [{date, amount (cents), type, description, merchant, fitid}] */
function generateOFX(rows, profile, meta) {
  const ver = OFX_VERSIONS.find(v => v.id === profile.version) || OFX_VERSIONS[0];
  const xml = ver.xml, card = profile.accountType === 'CREDITCARD';
  const clean = s => xml ? xmlEscape(s) : asciiFold(s).replace(/[<>&]/g, ' ');
  const el = (tag, val) => xml ? `<${tag}>${clean(val)}</${tag}>` : `<${tag}>${clean(val)}`;
  const sorted = [...rows].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const start = meta.start || (sorted[0] && sorted[0].date) || meta.asOf, end = meta.end || (sorted.length ? sorted[sorted.length - 1].date : meta.asOf);
  const L = [];
  if (xml) {
    L.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
    L.push(`<?OFX OFXHEADER="200" VERSION="${ver.id}" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>`);
  } else {
    L.push('OFXHEADER:100', 'DATA:OFXSGML', 'VERSION:' + ver.id, 'SECURITY:NONE', 'ENCODING:USASCII', 'CHARSET:1252', 'COMPRESSION:NONE', 'OLDFILEUID:NONE', 'NEWFILEUID:NONE', '');
  }
  const status = `<STATUS>${el('CODE', '0')}${el('SEVERITY', 'INFO')}</STATUS>`;
  L.push('<OFX>', '<SIGNONMSGSRSV1>', '<SONRS>', status, el('DTSERVER', ofxDate(meta.asOf) + '120000'), el('LANGUAGE', profile.language || 'POR'));
  if (profile.institutionName) L.push(`<FI>${el('ORG', profile.institutionName)}${profile.institutionId ? el('FID', profile.institutionId) : ''}</FI>`);
  L.push('</SONRS>', '</SIGNONMSGSRSV1>');
  L.push(card ? '<CREDITCARDMSGSRSV1>' : '<BANKMSGSRSV1>', card ? '<CCSTMTTRNRS>' : '<STMTTRNRS>', el('TRNUID', '1'), status, card ? '<CCSTMTRS>' : '<STMTRS>', el('CURDEF', profile.currency));
  if (card) L.push(`<CCACCTFROM>${el('ACCTID', profile.accountId)}</CCACCTFROM>`);
  else L.push(`<BANKACCTFROM>${el('BANKID', profile.bankId)}${profile.branchId ? el('BRANCHID', profile.branchId) : ''}${el('ACCTID', profile.accountId)}${el('ACCTTYPE', profile.accountType)}</BANKACCTFROM>`);
  L.push('<BANKTRANLIST>', el('DTSTART', ofxDate(start)), el('DTEND', ofxDate(end)));
  for (const r of sorted) {
    L.push('<STMTTRN>' + el('TRNTYPE', trnType(r, profile)) + el('DTPOSTED', ofxDate(r.date)) + el('TRNAMT', centsToDecimal(r.amount)) + el('FITID', r.fitid)
      + el('NAME', String(r.merchant || r.description).slice(0, 32)) + el('MEMO', String(r.description).slice(0, 255)) + '</STMTTRN>');
  }
  L.push('</BANKTRANLIST>', `<LEDGERBAL>${el('BALAMT', centsToDecimal(meta.balance || 0))}${el('DTASOF', ofxDate(end))}</LEDGERBAL>`);
  L.push(card ? '</CCSTMTRS>' : '</STMTRS>', card ? '</CCSTMTTRNRS>' : '</STMTTRNRS>', card ? '</CREDITCARDMSGSRSV1>' : '</BANKMSGSRSV1>', '</OFX>');
  return L.join('\n') + '\n';
}

function tagValue(block, tag) { const m = new RegExp('<' + tag + '>([^<\\r\\n]*)').exec(block); return m ? m[1].trim() : null; }
function validDate8(s) {
  if (!/^\d{8}/.test(s || '')) return false;
  const y = +s.slice(0, 4), m = +s.slice(4, 6), d = +s.slice(6, 8);
  return m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}
/** Structural check for XML profiles: every opening tag closes in order. */
function tagsBalanced(text) {
  const body = text.replace(/<\?[^>]*\?>/g, ''), stack = [], re = /<(\/)?([A-Z0-9.]+)>/g;
  let m;
  while ((m = re.exec(body))) {
    if (!m[1]) stack.push(m[2]);
    else if (stack.pop() !== m[2]) return false;
  }
  return stack.length === 0;
}

/** Validates generated text against the profile and the source rows. `tr` translates check names and details. Returns {ok, checks:[{name, ok, detail}]}. */
function validateOFX(text, profile, rows, tr) {
  tr = tr || ((s, v) => v ? s.replace(/\{(\w+)\}/g, (_, k) => v[k]) : s);
  const ver = OFX_VERSIONS.find(v => v.id === profile.version), xml = ver && ver.xml, card = profile.accountType === 'CREDITCARD';
  const checks = [], add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail || '' });
  add(tr('Required headers'), ver && (xml ? text.includes(`<?OFX OFXHEADER="200" VERSION="${ver.id}"`) && text.startsWith('<?xml') : /^OFXHEADER:100\r?\nDATA:OFXSGML\r?\nVERSION:/.test(text) && text.includes('VERSION:' + ver.id)), ver ? ver.label : '');
  add(tr('Sign-on response'), text.includes('<SONRS>') && validDate8(tagValue(text, 'DTSERVER')));
  const acctId = tagValue(text, 'ACCTID');
  add(tr('Account information'), acctId && (card ? text.includes('<CCACCTFROM>') : text.includes('<BANKACCTFROM>') && tagValue(text, 'BANKID') && OFX_ACCTTYPES.includes(tagValue(text, 'ACCTTYPE'))), acctId || tr('Missing bank or account ID'));
  add(tr('Currency'), /^[A-Z]{3}$/.test(tagValue(text, 'CURDEF') || ''), tagValue(text, 'CURDEF') || '');
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];
  add(tr('Transaction blocks'), blocks.length === rows.length, rows.length ? tr('{a} of {b} rows written', { a: blocks.length, b: rows.length }) : tr('No movements in the period'));
  const ids = blocks.map(b => tagValue(b, 'FITID')), unique = new Set(ids).size === ids.length;
  add(tr('Transaction IDs (FITID)'), ids.every(Boolean) && unique, unique ? tr('All unique') : tr('Duplicate ID found'));
  add(tr('Dates'), blocks.every(b => validDate8(tagValue(b, 'DTPOSTED'))) && validDate8(tagValue(text, 'DTSTART')) && validDate8(tagValue(text, 'DTEND')));
  const amts = blocks.map(b => tagValue(b, 'TRNAMT'));
  const amtOk = amts.every(a => /^-?\d+\.\d{2}$/.test(a || ''));
  const total = amtOk ? amts.reduce((s, a) => s + decimalToCents(a), 0) : null, want = rows.reduce((s, r) => s + r.amount, 0);
  add(tr('Amounts'), amtOk && total === want, amtOk ? (total === want ? tr('Total matches reviewed rows') : tr('Total differs from reviewed rows')) : tr('Malformed amount'));
  add(tr('Transaction types'), blocks.every(b => OFX_TRNTYPES.includes(tagValue(b, 'TRNTYPE'))));
  add(tr('Ledger balance'), /^-?\d+\.\d{2}$/.test(tagValue(text.slice(text.indexOf('<LEDGERBAL>')), 'BALAMT') || ''));
  add(tr('Structure'), text.trim().endsWith('</OFX>') && (xml ? tagsBalanced(text) : true), xml ? tr('All tags closed') : '');
  if (!xml) add(tr('Character set'), /^[\x09\x0A\x0D\x20-\x7E]*$/.test(text), 'ASCII');
  return { ok: checks.every(c => c.ok), checks };
}

/** Parses SGML or XML OFX statement transactions into normalised rows. */
function parseOFX(text) {
  const blocks = String(text).split(/<STMTTRN>/i).slice(1).map(b => b.split(/<\/STMTTRN>|<\/BANKTRANLIST>/i)[0]);   // the closing tag is missing in some banks' files
  const un = s => (s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return {
    bankId: tagValue(text, 'BANKID'), accountId: tagValue(text, 'ACCTID'), currency: tagValue(text, 'CURDEF'),
    rows: blocks.map(b => {
      const d = tagValue(b, 'DTPOSTED') || '', amount = decimalToCents(tagValue(b, 'TRNAMT') || '');
      return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, amount, trnType: tagValue(b, 'TRNTYPE'), sourceTxnId: tagValue(b, 'FITID'),
        description: un(tagValue(b, 'MEMO') || tagValue(b, 'NAME')), checkNum: tagValue(b, 'CHECKNUM') };
    }),
  };
}
