/* Dorax Finance — statements: OFX, QIF, MT940, CAMT.053, Excel sheets and PDF pages turned into the same table. */
// ---------- formats with named fields: each becomes a table whose columns are already known ----------
const stmtCents = c => c == null ? '' : centsToDecimal(c);
const stmtSure = (header, data, map, meta) => ({ ok: true, delim: null, header, data, headerless: false, manual: false, skipped: 0, mode: 'single', order: 'dmy', orderSure: true, yearless: false, year: null, sure: true,
  map: { date: -1, description: -1, details: -1, amount: -1, debit: -1, credit: -1, balance: -1, id: -1, dc: -1, ...map }, ...meta });
/** OFX or QFX in: the same movements, to be written again in the profile the accounting platform wants. */
function ofxTable(text) {
  const p = parseOFX(text); if (!p.rows.length) return { ok: false, error: 'empty' };
  const led = text.indexOf('<LEDGERBAL>'), bal = led >= 0 ? decimalToCents(tagValue(text.slice(led), 'BALAMT') || '') : null;
  return stmtSure(['Date', 'Description', 'ID', 'Amount'], p.rows.map(r => [r.date, r.description || '', r.sourceTxnId || '', stmtCents(r.amount)]), { date: 0, description: 1, id: 2, amount: 3 }, { source: 'ofx', closing: bal, currency: p.currency || null });
}
/** QIF: one field per line (D date, T amount, P payee, M memo, N number), a record ends with ^. Dates may be written 9/5'26. */
function qifTable(text) {
  const recs = []; let cur = {};
  for (const line of String(text).split(/\r?\n/)) { const k = line[0], v = line.slice(1).trim(); if (k === '^') { if (cur.D || cur.T) recs.push(cur); cur = {}; } else if ('DTUPMN'.includes(k) && line.length > 1 && !(k in cur)) cur[k] = v; }
  if (cur.D || cur.T) recs.push(cur);
  if (!recs.length) return { ok: false, error: 'empty' };
  const t = readStatementTable([['Date', 'Payee', 'Memo', 'Number', 'Amount'], ...recs.map(r => [(r.D || '').replace(/'\s*/, '/').replace(/\s+/g, ''), r.P || '', r.M || '', r.N || '', r.T || r.U || ''])], { source: 'qif' });
  return { ...t, map: { ...t.map, date: 0, description: 1, details: 2, amount: 4, id: -1 } };
}
/** MT940 (SWIFT): ":61:" is a movement (date, D or C, amount), the ":86:" after it is its text, ":62F:" is the closing balance. */
function mt940Table(text) {
  const tags = []; let cur = null;
  for (const line of String(text).split(/\r?\n/)) { const m = /^:(\d{2}[A-Z]?):(.*)$/.exec(line); if (m) { cur = { tag: m[1], v: m[2] }; tags.push(cur); } else if (cur && line.trim() && !/^[-{}]/.test(line)) cur.v += ' ' + line.trim(); }
  const data = []; let closing = null, currency = null;
  tags.forEach((g, i) => {
    if (g.tag === '61') { const m = /^(\d{2})(\d{2})(\d{2})(?:\d{4})?(R?[DC])[A-Z]?(\d+,\d{0,2})(?:[A-Z][A-Z0-9]{3})?([^\/\s]*)(?:\/\/(\S+))?/.exec(g.v); if (!m) return;
      const neg = m[4] === 'D' || m[4] === 'RC', amt = parseAmount(m[5].replace(/,$/, ',00')), nx = tags[i + 1], desc = nx && nx.tag === '86' ? nx.v.replace(/\s+/g, ' ').trim() : '';
      data.push([`20${m[1]}-${m[2]}-${m[3]}`, desc, m[7] || (m[6] && m[6] !== 'NONREF' ? m[6] : ''), stmtCents(neg ? -amt : amt)]); }
    if (g.tag === '62F' || g.tag === '62M') { const m = /^([DC])(\d{6})([A-Z]{3})(\d+,\d{0,2})/.exec(g.v); if (m) { const v = parseAmount(m[4].replace(/,$/, ',00')); closing = m[1] === 'D' ? -v : v; currency = m[3]; } }
  });
  if (!data.length) return { ok: false, error: 'empty' };
  return stmtSure(['Date', 'Description', 'Reference', 'Amount'], data, { date: 0, description: 1, id: 2, amount: 3 }, { source: 'mt940', closing, currency });
}
/** CAMT.053 (ISO 20022, XML): one <Ntry> per movement; the closing balance is the <Bal> typed CLBD. */
function camtTable(text) {
  const un = s => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
  const tag = (b, n) => { const m = new RegExp('<(?:\\w+:)?' + n + '\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + n + '>').exec(b); return m ? m[1] : null; }, amt = b => { const a = tag(b, 'Amt'); if (a == null) return null; const v = decimalToCents(un(a)); return v === null ? null : tag(b, 'CdtDbtInd') && /DBIT/.test(tag(b, 'CdtDbtInd')) ? -v : v; };
  const data = (String(text).match(/<(?:\w+:)?Ntry>[\s\S]*?<\/(?:\w+:)?Ntry>/g) || []).map(e => {
    const d = tag(e, 'BookgDt') || tag(e, 'ValDt') || '', date = un(tag(d, 'Dt') || tag(d, 'DtTm') || '').slice(0, 10), v = amt(e.replace(/<(?:\w+:)?NtryDtls>[\s\S]*$/, '') + '</x>');
    const who = un(tag(tag(e, 'RltdPties') || '', 'Nm') || ''), memo = un(tag(e, 'AddtlNtryInf') || tag(e, 'Ustrd') || tag(e, 'AddtlTxInf') || '');
    return [date, [memo, who].filter(Boolean).join(' · '), un(tag(e, 'AcctSvcrRef') || tag(e, 'NtryRef') || tag(e, 'EndToEndId') || ''), stmtCents(v)];
  }).filter(r => r[0] && r[3] !== '');
  if (!data.length) return { ok: false, error: 'empty' };
  let closing = null; for (const b of String(text).match(/<(?:\w+:)?Bal>[\s\S]*?<\/(?:\w+:)?Bal>/g) || []) if (/<(?:\w+:)?Cd>CLBD</.test(b)) closing = amt(b);
  const ccy = /<(?:\w+:)?Amt\b[^>]*Ccy="([A-Z]{3})"/.exec(text);
  return stmtSure(['Date', 'Description', 'Reference', 'Amount'], data, { date: 0, description: 1, id: 2, amount: 3 }, { source: 'camt', closing, currency: ccy ? ccy[1] : null });
}
/** A spreadsheet saved as a web page: several banks hand out an ".xls" that is an HTML table. */
function htmlTableRows(text) {
  const NAMED = { aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', acirc: 'â', ecirc: 'ê', ocirc: 'ô', atilde: 'ã', otilde: 'õ', agrave: 'à', ccedil: 'ç', ntilde: 'ñ', uuml: 'ü', ordm: 'º', ordf: 'ª', deg: '°' };
  const un = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&([A-Za-z]+);/g, (m, n) => { const k = NAMED[n.toLowerCase()]; return k ? (n[0] === n[0].toUpperCase() ? k.toUpperCase() : k) : m; }).replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  return (String(text).match(/<tr\b[\s\S]*?<\/tr>/gi) || []).map(tr => (tr.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) || []).map(c => un(c.replace(/^<t[dh]\b[^>]*>/i, '').replace(/<\/t[dh]>$/i, ''))));
}
/** Text of any kind -> the statement table. The format is told by what is written in the file, not by its name. */
function readStatementText(text) {
  const s = String(text).replace(/^﻿/, ''), head = s.slice(0, 4000);
  if (!s.trim()) return { ok: false, error: 'empty' };
  if (/OFXHEADER|<OFX>/i.test(head)) return ofxTable(s);
  if (/<(?:\w+:)?BkToCstmr(?:Stmt|AcctRpt)>|urn:iso:std:iso:20022:tech:xsd:camt/i.test(head) || (/<\?xml/.test(head) && /<(?:\w+:)?Ntry>/.test(s))) return camtTable(s);
  if (/^:20:/m.test(head) && /^:61:/m.test(s)) return mt940Table(s);
  if (/^!Type:/mi.test(head) || (/^D\d/m.test(head) && /^\^\s*$/m.test(s) && /^T-?[\d.,]/m.test(s))) return qifTable(s);
  if (/<table\b|<tr\b/i.test(head)) { const t = readStatementTable(htmlTableRows(s), { source: 'html' }); return t; }
  return readStatementCSV(s);
}
/** A sheet as the spreadsheet reader gives it (cells {v, d}) -> rows of text. A date cell becomes an ISO date; a number keeps two decimals. */
function sheetRows(rows, date1904) {
  const serial = v => { const ms = Math.round((v - (date1904 ? 24107 : 25569)) * 86400000), d = new Date(ms); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };
  const out = rows.map(r => Array.from(r || [], c => !c ? '' : c.v instanceof Date ? new Date(c.v.getTime() - c.v.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : typeof c.v === 'number' ? (c.d ? serial(c.v) : Number.isInteger(c.v) ? String(c.v) : centsToDecimal(Math.round(c.v * 100))) : String(c.v).trim()));
  // a date column kept as plain numbers (no date style on the cells): whole numbers in the range of this century, under a heading that says date
  const width = Math.max(0, ...out.map(r => r.length));
  for (let i = 0; i < width; i++) {
    const hd = out.slice(0, 40).findIndex(r => STMT_HEAD.date.test(stmtPlain(r[i]))); if (hd < 0) continue;
    const cells = rows.slice(hd + 1).map(r => r && r[i]).filter(c => c && c.v !== ''); if (!cells.length || cells.filter(c => typeof c.v === 'number' && Number.isInteger(c.v) && c.v > 36000 && c.v < 62000).length < cells.length * .6) continue;
    rows.forEach((r, n) => { const c = r && r[i]; if (n > hd && c && typeof c.v === 'number' && Number.isInteger(c.v) && c.v > 36000 && c.v < 62000) out[n][i] = serial(c.v); });
  }
  return out;
}
/** Of the sheets in a workbook, the one that holds a statement: the first where a table is found, else the one with the most rows. */
function workbookTable(sheets, date1904, source) {
  const tries = sheets.filter(s => !s.hidden || sheets.length === 1).map(s => ({ name: s.name, t: readStatementTable(sheetRows(s.rows, date1904), { source: source || 'xlsx' }) })).filter(x => x.t.ok);
  if (!tries.length) return { ok: false, error: 'empty' };
  const best = tries.find(x => !x.t.manual) || tries.sort((a, b) => b.t.data.length - a.t.data.length)[0];
  return { ...best.t, sheet: best.name };
}
/** A page of a PDF as its pieces of text with their places ({str, x, y, w, h}) -> rows of cells.
    Lines are the pieces that share a height. Columns are found where the transaction lines leave a gap from top to bottom: a statement is a table even when it is drawn, not typed.
    pages: [[item, ...], ...] with y growing upwards, as in the PDF. Returns the rows of every page, top to bottom. */
function pdfRows(pages) {
  const lines = [];
  pages.forEach((items, pn) => {
    const its = items.filter(i => i.str && i.str.trim()).map(i => ({ ...i, h: i.h || 10 })).sort((a, b) => b.y - a.y || a.x - b.x); let cur = null;
    for (const it of its) { if (!cur || Math.abs(cur.y - it.y) > Math.max(2, it.h * .45)) { cur = { page: pn, y: it.y, items: [] }; lines.push(cur); } cur.items.push(it); }
  });
  // pieces that touch are one piece of text: a word is often drawn letter group by letter group
  lines.forEach(l => { l.items.sort((a, b) => a.x - b.x); const segs = []; for (const it of l.items) { const p = segs[segs.length - 1], gap = p ? it.x - (p.x + p.w) : 0; if (p && gap < it.h * .9) { p.str += (gap > it.h * .18 ? ' ' : '') + it.str; p.w = it.x + it.w - p.x; } else segs.push({ str: it.str, x: it.x, w: it.w, h: it.h }); } l.segs = segs.map(s => ({ ...s, str: s.str.replace(/\s+/g, ' ').trim() })).filter(s => s.str); });
  const isDate = x => readDate(x.split(' ')[0], 'dmy', 2000) !== null || readDate(x, 'dmy', 2000) !== null, isMoney = x => /\d[.,]\d{2}(\s?[-DC]R?)?\)?$/.test(x) && readAmount(x) !== null;
  const txLike = l => l.segs.length >= 2 && l.segs.some(s => isDate(s.str)) && l.segs.some(s => isMoney(s.str));
  const tx = lines.filter(txLike);
  if (tx.length < 2) return lines.map(l => l.segs.map(s => s.str));
  // what every page repeats is not part of the statement: the letterhead and the heading of the table on the pages after the first, and a footer printed at the same height on several pages
  const key = l => l.segs.map(s => s.str).join(' ').replace(/\d+/g, '#'), firstTx = {}, lastTx = {}; lines.forEach((l, i) => { if (txLike(l)) { if (firstTx[l.page] == null) firstTx[l.page] = i; lastTx[l.page] = i; } });
  const top = new Set(lines.filter((l, i) => l.page === 0 && firstTx[0] != null && i < firstTx[0]).map(key)), foot = {};
  lines.forEach((l, i) => { if (lastTx[l.page] != null && i > lastTx[l.page]) { const k = key(l) + '@' + Math.round(l.y / 3); (foot[k] = foot[k] || new Set()).add(l.page); } });
  const keep = lines.filter((l, i) => !(l.page > 0 && firstTx[l.page] != null && i < firstTx[l.page] && top.has(key(l))) && !(lastTx[l.page] != null && i > lastTx[l.page] && foot[key(l) + '@' + Math.round(l.y / 3)].size > 1));
  // a line that starts a page, or sits well below the one before, is not the rest of the transaction above it
  keep.forEach((l, i) => { const p = keep[i - 1]; l.brk = !!p && (p.page !== l.page || p.y - l.y > Math.max(...l.segs.map(s => s.h)) * 2.6); });
  // the gutters: stretches of the page width that no transaction line writes in
  const left = Math.min(...tx.map(l => l.segs[0].x)), right = Math.max(...tx.map(l => { const s = l.segs[l.segs.length - 1]; return s.x + s.w; })), step = .5, n = Math.ceil((right - left) / step) + 1, cover = new Uint16Array(n);
  tx.forEach(l => l.segs.forEach(s => { for (let k = Math.max(0, Math.floor((s.x - left) / step)); k <= Math.min(n - 1, Math.ceil((s.x + s.w - left) / step)); k++) cover[k]++; }));
  const allow = Math.floor(tx.length * .03), cuts = []; let run = -1;
  for (let k = 0; k <= n; k++) { const empty = k < n && cover[k] <= allow; if (empty && run < 0) run = k; if (!empty && run >= 0) { if ((k - run) * step >= 3 && run > 0) cuts.push(left + (run + k) / 2 * step); run = -1; } }
  const colOf = x => { let c = 0; while (c < cuts.length && x > cuts[c]) c++; return c; };
  return keep.map(l => { const row = Array(cuts.length + 1).fill(''); l.segs.forEach(s => { const c = colOf(s.x + s.w / 2); row[c] = row[c] ? row[c] + ' ' + s.str : s.str; }); if (l.brk) row.brk = true; return row; });
}
