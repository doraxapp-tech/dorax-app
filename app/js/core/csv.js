/* Dorax Finance — statements: CSV, amounts and dates as typed by banks, the Wise layout. */
// ---------- CSV ----------
function parseCSV(text) {
  const first = text.split(/\r?\n/)[0] || '', delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let cur = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { cur.push(cell); cell = ''; }
    else if (c === '\n') { cur.push(cell); rows.push(cur); cur = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || cur.length) { cur.push(cell); rows.push(cur); }
  return { header: rows[0] || [], rows: rows.slice(1).filter(r => r.some(x => x.trim())) };
}
/** "1.234,56", "-1,234.56", "R$ 45,90" -> cents. The last separator followed by exactly two digits is the decimal mark. */
function parseAmount(str) {
  let s = String(str).replace(/[^\d,.\-+()]/g, '');
  const neg = /^\(.*\)$/.test(s) || s.includes('-');
  s = s.replace(/[()+-]/g, '');
  if (!/\d/.test(s)) return null;
  const m = /^(.*?)[.,](\d{1,2})$/.exec(s);
  const whole = (m ? m[1] : s).replace(/[.,]/g, ''), frac = m ? m[2].padEnd(2, '0') : '00';
  if (!/^\d*$/.test(whole)) return null;
  const cents = Number(whole || '0') * 100 + Number(frac);
  return neg ? -cents : cents;
}
/** DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD -> ISO, or null. */
function parseDate(str) {
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str.trim());
  if (!m) { const b = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(str.trim()); if (!b) return null; m = [0, b[3].length === 2 ? '20' + b[3] : b[3], b[2].padStart(2, '0'), b[1].padStart(2, '0')]; }
  return validDate8(m[1] + m[2] + m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Wise balance statement CSV (one file per currency, newest row first). Columns are found by header name, so added or reordered columns do not break it.
    Returns {ok, rows (oldest first), currency, closing, start, end} or {ok:false, error}. */
function parseWiseCSV(text) {
  const csv = parseCSV(String(text).replace(/^﻿/, '')), col = n => csv.header.findIndex(h => h.trim().toLowerCase() === n);
  const ix = { id: col('transferwise id'), date: col('date'), time: col('date time'), amount: col('amount'), currency: col('currency'), desc: col('description'), bal: col('running balance'),
    payer: col('payer name'), payee: col('payee name'), merchant: col('merchant'), kind: col('transaction details type') };
  if (ix.id < 0 || ix.date < 0 || ix.amount < 0 || ix.desc < 0) return { ok: false, error: 'not-wise' };
  const get = (r, i) => i >= 0 && r[i] != null ? r[i].trim() : '';
  const rows = csv.rows.map(r => {
    const date = parseDate(get(r, ix.date)), time = (get(r, ix.time).split(' ')[1] || '');
    return { sourceTxnId: get(r, ix.id), date, key: (date || '') + ' ' + time, amount: parseAmount(get(r, ix.amount)), currency: get(r, ix.currency), description: get(r, ix.desc),
      name: get(r, ix.payee) || get(r, ix.payer) || get(r, ix.merchant), balance: parseAmount(get(r, ix.bal)), kind: get(r, ix.kind) };
  });
  if (rows.some(r => !r.sourceTxnId || !r.date || r.amount === null)) return { ok: false, error: 'bad-rows' };
  const ids = rows.map(r => r.sourceTxnId);
  if (new Set(ids).size !== ids.length) return { ok: false, error: 'duplicate-ids' };
  const currencies = [...new Set(rows.map(r => r.currency).filter(Boolean))];
  if (currencies.length > 1) return { ok: false, error: 'mixed-currencies' };
  rows.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const last = rows[rows.length - 1];
  return { ok: true, rows, currency: currencies[0] || null, closing: last ? last.balance : null, start: rows.length ? rows[0].date : null, end: last ? last.date : null };
}
/** statement_<balance id>_<CUR>_<from>_<to>.csv -> the parts Wise encodes in the file name. */
function wiseFileInfo(name) {
  const m = /statement_(\d+)_([A-Z]{3})_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/.exec(name || '');
  return m ? { balanceId: m[1], currency: m[2], start: m[3], end: m[4] } : null;
}
