/* Dorax Finance — statements: any bank layout, read into rows. */
// ---------- any bank statement (v29: any CSV; v30: any file a bank hands out) ----------
// Every file ends up as the same thing: a table, rows of cells as text. How it gets there depends on the file:
//   a CSV / TXT / TSV      readStatementCSV(text)         the separator is found, the cells are split
//   Excel, PDF             the caller turns the sheet or the page into rows (sheetRows, pdfRows), then readStatementTable(rows)
//   OFX, QIF, MT940, CAMT  ofxTable, qifTable, mt940Table, camtTable: formats with named fields become a table with known columns
// readStatementTable finds the heading row and guesses the columns; statementRows turns the table into transactions with the columns the person confirmed.
// Nothing here knows about a particular bank: columns are found by the words in their headings and by what their cells look like.
const STMT_MONTHS = { JAN: 1, ENE: 1, FEB: 2, FEV: 2, MAR: 3, APR: 4, ABR: 4, MAY: 5, MAI: 5, JUN: 6, JUL: 7, AUG: 8, AGO: 8, SEP: 9, SET: 9, OCT: 10, OUT: 10, NOV: 11, DEC: 12, DEZ: 12, DIC: 12 };
const stmtPlain = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const stmtIso = (y, m, d) => { const v = String(y).padStart(4, '0') + String(m).padStart(2, '0') + String(d).padStart(2, '0'); return validDate8(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : null; };
/** A date in the shapes statements use -> ISO, or null. order ('dmy' | 'mdy') settles 03/04/2026; a time after the date is ignored;
    year fills in a date printed without one ("05/09"), as paper-style statements do. */
function readDate(str, order, year) {
  const s = String(str == null ? '' : str).trim(); if (!s) return null;
  let m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[T\s].*)?$/.exec(s); if (m) return stmtIso(m[1], m[2], m[3]);
  m = /^(\d{4})(\d{2})(\d{2})(?:\d{4,6})?$/.exec(s); if (m) return stmtIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4}|\d{2})(?:[\s,T].*)?$/.exec(s); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return order === 'mdy' ? stmtIso(y, m[1], m[2]) : stmtIso(y, m[2], m[1]); }
  m = /^(\d{1,2})[-\/.\s]+(?:de\s+)?([A-Za-zÀ-ÿ]{3,})\.?[-\/.\s,]+(?:de\s+)?(\d{4}|\d{2})(?:[\s,].*)?$/i.exec(s); if (m) { const mo = STMT_MONTHS[stmtPlain(m[2]).slice(0, 3)]; return mo ? stmtIso(m[3].length === 2 ? '20' + m[3] : m[3], mo, m[1]) : null; }
  m = /^([A-Za-zÀ-ÿ]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})(?:[\s,].*)?$/.exec(s); if (m) { const mo = STMT_MONTHS[stmtPlain(m[1]).slice(0, 3)]; return mo ? stmtIso(m[3], mo, m[2]) : null; }
  if (year) {
    m = /^(\d{1,2})[-\/.](\d{1,2})$/.exec(s); if (m) return order === 'mdy' ? stmtIso(year, m[1], m[2]) : stmtIso(year, m[2], m[1]);
    m = /^(\d{1,2})[-\/.\s]+(?:de\s+)?([A-Za-zÀ-ÿ]{3,})\.?$/.exec(s); if (m) { const mo = STMT_MONTHS[stmtPlain(m[2]).slice(0, 3)]; return mo ? stmtIso(year, mo, m[1]) : null; }
  }
  return null;
}
/** Is this a date printed without its year ("05/09", "05 set")? */
const yearlessDate = s => /^(\d{1,2})[-\/.](\d{1,2})$/.test(String(s || '').trim()) || (/^(\d{1,2})[-\/.\s]+(?:de\s+)?([A-Za-zÀ-ÿ]{3,})\.?$/.test(String(s || '').trim()) && !!STMT_MONTHS[stmtPlain(String(s).replace(/^[\d\s\/.-]+(de\s+)?/i, '')).slice(0, 3)]);
/** An amount as statements write it -> cents, or null. Besides what parseAmount reads: a true minus sign, and a trailing D / C (or DR / CR) that carries the sign. */
function readAmount(str) {
  const s = String(str == null ? '' : str).replace(/−/g, '-').replace(/ /g, ' ').trim(); if (!s) return null;
  const dc = /(^|[\s\d])(DR|DB|D)\.?$/i.test(s) ? -1 : /(^|[\s\d])(CR|C)\.?$/i.test(s) ? 1 : 0, body = dc ? s.replace(/\s*(DR|DB|CR|D|C)\.?$/i, '') : s;
  if (/[A-Za-zÀ-ÿ]{2,}/.test(body.replace(/R\$|US\$|USD|BRL|EUR|GBP|ARS|MXN|CLP|COP/gi, ''))) return null;      // words in the cell: it is not an amount
  const v = parseAmount(body); return v === null ? null : dc ? dc * Math.abs(v) : v;
}
/** The character that separates the cells: the one that appears the same number of times on the most lines. A comma inside "1.234,56" loses to the semicolon beside it. */
function sniffDelimiter(text) {
  const lines = String(text).split(/\r?\n/).filter(l => l.trim()).slice(0, 40); let best = ',', top = 0;
  for (const d of [';', '\t', '|', ',']) {
    const counts = lines.map(l => { let n = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) n++; } return n; }), tally = {};
    counts.forEach(n => { if (n) tally[n] = (tally[n] || 0) + 1; });
    const mode = Object.keys(tally).sort((a, b) => tally[b] - tally[a] || b - a)[0], score = mode ? tally[mode] * 1000 + Math.min(+mode, 99) : 0;
    if (score > top) { top = score; best = d; }
  }
  return best;
}
function splitDelimited(text, delim) {
  const rows = []; let cur = [], cell = '', q = false; text = String(text).replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { cur.push(cell); cell = ''; }
    else if (c === '\n') { cur.push(cell); rows.push(cur); cur = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || cur.length) { cur.push(cell); rows.push(cur); }
  return rows.map(r => r.map(x => x.trim()));
}
const STMT_HEAD = {
  date: /^(DATA|DATE|FECHA|DT)\b|\b(DATA|DATE|FECHA) (DO |DE |DA )?(LANCAMENTO|MOVIMENTO|MOVIMIENTO|OPERACAO|OPERACION|TRANSACAO|POSTED|BOOKING)|^(POSTED|TRANSACTION|BOOKING|VALUE) DATE|^DIA$/,
  debit: /DEBIT|SAIDA|SALIDA|WITHDRAW|CARGO|PAID OUT|MONEY OUT|RETIRADA|PAGAMENTO|EGRESO/,
  credit: /CREDIT|ENTRADA|DEPOSIT|ABONO|PAID IN|MONEY IN|RECEBIMENTO|INGRESO/,
  balance: /SALDO|BALANCE/,
  amount: /VALOR|AMOUNT|MONTO|IMPORTE|QUANTIA|VALUE|MONTANTE/,
  id: /^ID\b|\bID$|IDENTIFICADOR|DOCUMENTO|^DOC|DOCTO|REFERENC|\bREF\b|NSU|FITID|AUTENTICACAO|NUMERO|TRANSACTION ID|\bN[O°º]?\.? ?DOC/,
  dc: /^(TIPO|TYPE|D\/C|DC|C\/D|NATUREZA|TRANSACTION TYPE|DEBIT\/CREDIT|CREDIT\/DEBIT|INDICADOR)$/,
  description: /HIST|DESC|MEMO|TITLE|TITULO|DETALHE|DETAIL|LANCAMENTO|NARRATIVE|CONCEPTO|PAYEE|ESTABELECIMENTO|MERCHANT|NAME|NOME|PARTICULARS/,
};
const STMT_BALANCE_LINE = x => { const p = stmtPlain(x); return /^(S ?A ?L ?D ?O|BALANCE|OPENING BALANCE|CLOSING BALANCE|TOTAL|SUBTOTAL)\b/.test(p) && !/^SALDO (DEVEDOR )?(TRANSFERIDO|APLICADO)/.test(p); };
/** The table inside the rows. Banks put a title, the account and the period above it, so the heading row is looked for, not assumed to be the first line.
    When no table can be found the rows are handed back as they are (manual: true) and the person chooses the columns: a file is never refused for its layout.
    Returns {ok, header, data, headerless, manual, skipped, map, mode, order, orderSure, yearless, year} or {ok:false, error:'empty'}. */
function readStatementTable(rows, meta) {
  const all = rows.map(r => { const o = r.map(x => String(x == null ? '' : x).trim()); if (r.brk) o.brk = true; return o; }).filter(r => r.some(x => x)); meta = meta || {};
  if (!all.length) return { ok: false, error: 'empty' };
  const isDate = x => readDate(x, 'dmy', 2000) !== null || readDate(x, 'mdy', 2000) !== null, isMoney = x => /\d/.test(x) && readAmount(x) !== null;
  const dataLike = r => r.filter(x => x).length >= 2 && r.some(isDate) && r.some(x => !isDate(x) && isMoney(x));
  let hi = -1;
  for (let i = 0; i < Math.min(all.length, 80) && hi < 0; i++) {
    const cells = all[i].map(stmtPlain), hits = ['date', 'debit', 'credit', 'balance', 'amount', 'description'].filter(k => cells.some(c => c && STMT_HEAD[k].test(c))).length;
    if (hits >= 2 && cells.some(c => STMT_HEAD.date.test(c)) && !all[i].some(x => readDate(x, 'dmy') !== null)) hi = i;
  }
  const first = hi >= 0 ? hi + 1 : all.findIndex(dataLike), manual = first < 0;
  const from = manual ? 0 : first, width = Math.max(...all.slice(from, from + 80).map(r => r.length), hi >= 0 ? all[hi].length : 0);
  if (width < 2 && manual) return { ok: false, error: 'no-table' };
  const pad = r => { const o = Array.from({ length: width }, (_, i) => r[i] == null ? '' : r[i]); if (r.brk) o.brk = true; return o; };
  const header = hi >= 0 ? pad(all[hi]) : Array.from({ length: width }, (_, i) => String(i + 1)), data = all.slice(from).map(pad);
  const map = { date: -1, description: -1, details: -1, amount: -1, debit: -1, credit: -1, balance: -1, id: -1, dc: -1 };
  // a date without its year takes it from the file: the year that appears most among everything written in it
  const years = {}; all.forEach(r => r.forEach(x => (x.match(/\b20\d{2}\b/g) || []).forEach(y => { years[y] = (years[y] || 0) + 1; }))); const year = +(Object.keys(years).sort((a, b) => years[b] - years[a])[0] || 0) || meta.year || null;
  const base = { ok: true, delim: meta.delim || null, source: meta.source || 'csv', header, data, headerless: hi < 0, manual, skipped: manual ? 0 : first - (hi >= 0 ? 1 : 0), map, mode: 'single', order: 'dmy', orderSure: true, yearless: false, year, closing: meta.closing == null ? null : meta.closing, sure: !!meta.sure };
  if (manual) return base;
  // what each column looks like, over the rows that look like transactions
  const body = data.filter(dataLike).slice(0, 200), col = i => body.map(r => r[i]).filter(x => x);
  const share = (i, f) => { const v = col(i); return v.length ? v.filter(f).length / v.length : 0; }, H = header.map(stmtPlain);
  if (hi >= 0) {
    map.date = H.findIndex(h => h && STMT_HEAD.date.test(h)); map.balance = H.findIndex(h => h && STMT_HEAD.balance.test(h));
    map.debit = H.findIndex((h, i) => STMT_HEAD.debit.test(h) && !STMT_HEAD.credit.test(h) && i !== map.balance); map.credit = H.findIndex((h, i) => STMT_HEAD.credit.test(h) && !STMT_HEAD.debit.test(h) && i !== map.balance && i !== map.debit);
    map.amount = H.findIndex((h, i) => STMT_HEAD.amount.test(h) && ![map.balance, map.debit, map.credit, map.date].includes(i) && !STMT_HEAD.balance.test(h));
    map.dc = H.findIndex((h, i) => STMT_HEAD.dc.test(h) && share(i, x => /^(D|C|DR|CR|DEBIT|CREDIT|DEBITO|CREDITO|DEB|CRED|ENTRADA|SAIDA)$/.test(stmtPlain(x))) > .8);
    map.id = H.findIndex((h, i) => STMT_HEAD.id.test(h) && ![map.date, map.amount, map.debit, map.credit, map.balance, map.dc].includes(i));
    map.description = H.findIndex((h, i) => STMT_HEAD.description.test(h) && ![map.date, map.amount, map.debit, map.credit, map.balance, map.id, map.dc].includes(i));
    // many statements split the text in two: the kind of movement in one column, who or what in another. The second is offered as more detail.
    map.details = map.description < 0 ? -1 : H.findIndex((h, i) => i !== map.description && STMT_HEAD.description.test(h) && ![map.date, map.amount, map.debit, map.credit, map.balance, map.id, map.dc].includes(i) && share(i, x => !isMoney(x) && !isDate(x)) > .5);
  }
  const used = () => Object.values(map).filter(i => i >= 0), free = i => !used().includes(i), cols = header.map((_, i) => i);
  if (map.date < 0) map.date = cols.filter(free).sort((a, b) => share(b, isDate) - share(a, isDate))[0];
  const decimals = x => /[.,]\d{2}\b/.test(x) && isMoney(x);
  if (map.amount < 0 && (map.debit < 0 || map.credit < 0)) { map.debit = map.credit = -1; const c = cols.filter(free).filter(i => share(i, isMoney) > .6).sort((a, b) => share(b, decimals) - share(a, decimals) || a - b); map.amount = c.length ? c[0] : -1; if (map.balance < 0 && hi < 0 && c.length > 1 && share(c[1], decimals) > .6) map.balance = c[1]; }
  if (map.description < 0) { const c = cols.filter(free).filter(i => share(i, x => !isMoney(x) && !isDate(x)) > .5).sort((a, b) => col(b).join('').length - col(a).join('').length); map.description = c.length ? c[0] : -1; }
  const numeric = body.map(r => /^(\d{1,2})[-\/.](\d{1,2})(?:[-\/.]\d{2,4})?/.exec(r[map.date] || '')).filter(Boolean), dmy = numeric.some(m => +m[1] > 12), mdy = numeric.some(m => +m[2] > 12);
  const span = o => { const d = body.map(r => readDate(r[map.date] || '', o, year || 2000)).filter(Boolean).sort(); return d.length > 1 ? (Date.parse(d[d.length - 1]) - Date.parse(d[0])) / 864e5 : 0; };
  const closer = numeric.length > 1 && !dmy && !mdy && span('mdy') < span('dmy');   // both readings are possible: a statement covers a short stretch of time, so the reading that keeps its dates together is offered, and the question is still asked
  return { ...base, mode: map.debit >= 0 && map.credit >= 0 && map.amount < 0 ? 'split' : 'single', order: (mdy && !dmy) || closer ? 'mdy' : 'dmy', orderSure: !numeric.length || dmy !== mdy, yearless: body.length > 0 && body.filter(r => yearlessDate(r[map.date])).length > body.length / 2 };
}
function readStatementCSV(text) { const delim = sniffDelimiter(text); return readStatementTable(splitDelimited(text, delim), { delim, source: 'csv' }); }
/** The transactions, with the columns as confirmed. opt: {mode: 'single' | 'split', order, invert, year}.
    Left out and counted: balance and total lines, and lines with no date or no amount. Joined and counted: a line with only text, right under a transaction,
    is the rest of that transaction's description. A line with an amount but no date takes the date of the line above (statements that print each day once).
    Returns {rows (oldest first), unreadable, balanceLines, continued, dated, closing, start, end, ids: 'column' | 'made', allPositive, chain}. */
function statementRows(csv, map, opt) {
  opt = opt || {}; const cell = (r, i) => i >= 0 && r[i] != null ? String(r[i]).trim() : '', out = [], why = []; let unreadable = 0, texts = 0, balanceLines = 0, continued = 0, dated = 0, lastN = -2, lastDate = null;
  const text = r => [cell(r, map.description), map.details >= 0 && map.details !== map.description ? cell(r, map.details) : ''].filter(Boolean).join(' · ').replace(/\s+/g, ' ');
  const money = opt.mode === 'split' ? [map.credit, map.debit] : [map.amount];
  csv.data.forEach((r, n) => {
    const dateCell = cell(r, map.date); let date = readDate(dateCell, opt.order, opt.year), amount = null; const desc = text(r);
    if (opt.mode === 'split') { const ci = readAmount(cell(r, map.credit)), de = readAmount(cell(r, map.debit)); if (ci !== null || de !== null) amount = Math.abs(ci || 0) - Math.abs(de || 0); }
    else { amount = readAmount(cell(r, map.amount)); if (amount !== null && map.dc >= 0) { const k = stmtPlain(cell(r, map.dc)); if (/^(D|DR|DEB|DEBIT|DEBITO|SAIDA)$/.test(k)) amount = -Math.abs(amount); else if (/^(C|CR|CRED|CREDIT|CREDITO|ENTRADA)$/.test(k)) amount = Math.abs(amount); } if (amount !== null && opt.invert) amount = -amount; }
    if (r.some(STMT_BALANCE_LINE)) { balanceLines++; why[n] = 'balance'; return; }                // a balance or total line is known by its words, in whichever column the bank wrote them
    if (!date && !dateCell && amount !== null && lastDate && n === lastN + 1) { date = lastDate; dated++; why[n] = 'dated'; }      // the day is printed once; this movement is of the same day
    if (!date && amount === null && !dateCell && desc && out.length && n === lastN + 1 && !r.brk) { out[out.length - 1].description = (out[out.length - 1].description + ' ' + desc).trim(); continued++; lastN = n; why[n] = 'continued'; return; }
    if (!date && amount === null && !money.some(i => /\d/.test(cell(r, i)))) { texts++; why[n] = 'text'; return; }       // words only, no date and no figure where the amounts are: a title, a page heading, a note
    if (!date || amount === null) { unreadable++; why[n] = 'unreadable'; return; }
    out.push({ n, date, amount, description: desc, sourceTxnId: cell(r, map.id) || null, balance: map.balance >= 0 ? readAmount(cell(r, map.balance)) : null }); lastN = n; lastDate = date;
  });
  if (out.length > 1 && out[0].date > out[out.length - 1].date) out.reverse();                 // newest first in the file: turn it round, so the last row is the latest
  const byDate = list => list.map((r, i) => ({ r, i })).sort((a, b) => a.r.date < b.r.date ? -1 : a.r.date > b.r.date ? 1 : a.i - b.i).map(x => x.r);
  const follows = list => list.every(r => r.balance !== null) && list.every((r, i) => !i || list[i - 1].balance + r.amount === r.balance);
  let rows = byDate(out);
  // The order inside one day cannot be told from the dates (a statement of a single day, or one a bank lists newest first within each day).
  // When every line carries a balance, the balances say which order is the real one: if they only follow one another the other way round,
  // that is the order. Before v39 such a file was read upside down: its balances "did not follow" and the closing balance was the oldest line's.
  if (rows.length > 1 && !follows(rows)) { const turned = byDate([...out].reverse()); if (follows(turned)) rows = turned; }
  const idList = rows.map(r => r.sourceTxnId), idsOk = map.id >= 0 && rows.length > 0 && idList.every(Boolean) && new Set(idList).size === idList.length;
  if (!idsOk) rows.forEach(r => { r.sourceTxnId = null; });
  const last = rows[rows.length - 1];
  // when every line carries a balance, the file checks itself: each balance has to be the one before plus the movement
  let chain = null; if (rows.length > 1 && rows.every(r => r.balance !== null)) { let bad = 0; for (let i = 1; i < rows.length; i++) if (rows[i - 1].balance + rows[i].amount !== rows[i].balance) bad++; chain = { checked: rows.length - 1, bad }; }
  return { rows, why, unreadable, texts, balanceLines, continued, dated, closing: last && last.balance !== null ? last.balance : csv.closing != null ? csv.closing : null, start: rows.length ? rows[0].date : null, end: last ? last.date : null, ids: idsOk ? 'column' : 'made', allPositive: rows.length > 0 && rows.every(r => r.amount >= 0), chain };
}
