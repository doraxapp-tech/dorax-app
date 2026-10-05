/* Dorax Finance — converter: reading the chosen file (text, Excel, PDF); the PDF and Excel readers in vendor/ are loaded on first use. */
// ---------- the file a person chooses, whatever it is ----------
/** The readers for PDF and old Excel are large, so they are not loaded with the page: each is fetched from vendor/ the first time such a file
    is chosen. The one-file version of the app (tools/build.js) carries them inside the page as text instead, and they are started from there.
    A host that allows scripts by nonce allows these by the same nonce. */
const LIBS = {}, LIB_FILES = { pdfworker: 'vendor/pdf.worker.min.js', pdf: 'vendor/pdf.min.js', xlsx: 'vendor/xlsx.min.js' };
// The copies carried inside the page (one-file preview only) are looked up once, now, while the page holds nothing but its own markup:
// nothing drawn later can pass for one of them.
const LIB_INLINE = {}; for (const id of Object.keys(LIB_FILES)) { const el = document.getElementById('lib-' + id); if (el && el.tagName === 'SCRIPT' && el.type === 'text/plain') LIB_INLINE[id] = el; }
function loadLib(id) {
  return LIBS[id] || (LIBS[id] = new Promise((ok, no) => {
    try {
      const el = document.createElement('script'), own = document.querySelector('script[nonce]'), inline = LIB_INLINE[id];
      if (own && own.nonce) el.nonce = own.nonce;
      if (inline) { el.textContent = inline.textContent; document.head.appendChild(el); return ok(); }
      if (!LIB_FILES[id]) return no(new Error('no-reader'));
      el.onload = () => ok(); el.onerror = () => { delete LIBS[id]; no(new Error('no-reader')); };      // a failed download can be tried again
      el.src = LIB_FILES[id]; document.head.appendChild(el);
    } catch (e) { no(new Error('no-reader')); }
  }));
}
/** Bytes -> text: UTF-16 by its mark, UTF-8 when the bytes allow it, Windows-1252 otherwise (older bank exports). */
function bytesToText(bytes) {
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(bytes).replace(/^﻿/, '');
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(bytes).replace(/^﻿/, '');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, ''); } catch (e) { return new TextDecoder('windows-1252').decode(bytes); }
}
/** A PDF statement: the text of every page with its place on the page, rebuilt into rows and columns. A scan has no text and is refused;
    a protected file asks for its password. Nothing leaves the browser. */
async function pdfTable(bytes, password) {
  await loadLib('pdfworker'); await loadLib('pdf');
  const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf']; if (!lib) return { ok: false, error: 'no-reader' };
  let doc; try { doc = await lib.getDocument({ data: bytes.slice(), password: password || undefined, isEvalSupported: false, disableFontFace: true, useWorkerFetch: false, verbosity: 0 }).promise; }
  catch (e) { return { ok: false, error: e && e.name === 'PasswordException' ? (password ? 'pdf-wrong-password' : 'pdf-password') : 'pdf-broken' }; }
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) { const pg = await doc.getPage(i), tc = await pg.getTextContent(); pages.push(tc.items.filter(it => it.str && it.str.trim()).map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || it.height || 10 }))); }
  if (!pages.some(pg => pg.length)) return { ok: false, error: 'pdf-scan' };
  const table = readStatementTable(pdfRows(pages), { source: 'pdf' });
  return table.ok ? { ...table, pages: doc.numPages } : table;
}
/** Old Excel (.xls), OpenDocument (.ods) and the other workbook kinds, through SheetJS. Dates are numbers with a date format, as in .xlsx. */
async function workbookVia(bytes, dates) {
  await loadLib('xlsx'); const X = window.XLSX; if (!X) return { ok: false, error: 'no-reader' };
  let wb; try { wb = X.read(bytes, { type: 'array', cellNF: true, cellDates: !!dates }); } catch (e) { return { ok: false, error: /password|encrypt/i.test(String(e && e.message)) ? 'xls-password' : 'unreadable' }; }
  const day = d => new Date(d.getTime() + 18e5).toISOString().slice(0, 10);   // OpenDocument keeps a date as a day, read here as midnight UTC: the day is taken as written, whatever the time zone of the device
  const sheets = wb.SheetNames.map((name, i) => { const ws = wb.Sheets[name], rows = []; if (ws && ws['!ref']) { const rg = X.utils.decode_range(ws['!ref']);
      for (let r = rg.s.r; r <= Math.min(rg.e.r, 60000); r++) { const row = rows[r] = []; for (let k = rg.s.c; k <= Math.min(rg.e.c, 200); k++) { const cl = ws[X.utils.encode_cell({ r, c: k })]; if (!cl || cl.v == null || cl.v === '') continue; row[k] = cl.t === 'd' && cl.v instanceof Date ? { v: day(cl.v) } : cl.t === 'n' ? { v: cl.v, ...(cl.z && X.SSF.is_date(String(cl.z)) ? { d: true } : {}) } : { v: cl.t === 'b' ? (cl.v ? 1 : 0) : String(cl.w != null && cl.t !== 's' ? cl.w : cl.v) }; } } }
    for (let r = 0; r < rows.length; r++) rows[r] = rows[r] || [];
    return { name, hidden: !!(wb.Workbook && wb.Workbook.Sheets && wb.Workbook.Sheets[i] && wb.Workbook.Sheets[i].Hidden), rows }; });
  return workbookTable(sheets, !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904), 'xls');
}
/** What kind of file it is, told by its first bytes and not by its name: a renamed file is still read for what it is. */
async function readStatementFile(file, password) {
  const bytes = new Uint8Array(await file.arrayBuffer()), sig = String.fromCharCode(...bytes.slice(0, 5));
  if (!bytes.length) return { ok: false, error: 'empty' };
  if (sig.startsWith('%PDF')) return pdfTable(bytes, password);
  if (sig.startsWith('PK')) { try { const wb = await readXlsx(bytes.buffer); return workbookTable(wb.sheets, wb.date1904, 'xlsx'); } catch (e) { return workbookVia(bytes, true); } }
  if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) return workbookVia(bytes);
  return { text: bytesToText(bytes) };
}
