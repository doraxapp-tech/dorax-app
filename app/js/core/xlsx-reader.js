/* Dorax Finance — spreadsheet import (pure functions, no DOM).
   Reads an .xlsx or a .csv into a plain grid, finds the tables a personal-finance sheet usually has (months across the top, one line per row),
   and turns them into fixed costs, income, goals and a FII position. Nothing is written until the person has reviewed what was found.
   The .xlsx reader needs no library: an .xlsx is a zip of XML files, and the browser can inflate it by itself. */

// ---------- .xlsx: zip + XML ----------
async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/** Reads the zip's central directory. Returns name -> async () => text. Throws 'not-zip' when the file is something else. */
function zipEntries(buf) {
  const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), dec = new TextDecoder('utf-8');
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not-zip');
  const count = dv.getUint16(eocd + 10, true), out = {};
  let p = dv.getUint32(eocd + 16, true);
  for (let n = 0; n < count; n++) {
    if (p + 46 > b.length || dv.getUint32(p, true) !== 0x02014b50) throw new Error('not-zip');
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true), nameLen = dv.getUint16(p + 28, true), extra = dv.getUint16(p + 30, true), comment = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nameLen));
    out[name] = async () => {
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true), raw = b.subarray(start, start + size);
      if (method === 0) return dec.decode(raw);
      if (method !== 8) throw new Error('bad-zip');
      return dec.decode(await inflateRaw(raw));
    };
    p += 46 + nameLen + extra + comment;
  }
  return out;
}
const xmlText = s => s.replace(/&(lt|gt|amp|quot|apos|#x?[0-9a-fA-F]+);/g, (m, e) => e === 'lt' ? '<' : e === 'gt' ? '>' : e === 'amp' ? '&' : e === 'quot' ? '"' : e === 'apos' ? "'" : String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)));
const xmlAttr = (tag, name) => { const m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(tag); return m ? xmlText(m[1]) : null; };
const colIndex = ref => { let n = 0; for (const c of ref.replace(/\d+/g, '')) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };
/** Every <t> inside a string item, without the phonetic runs some editors add. */
const siText = xml => [...xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '').matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => xmlText(m[1])).join('');

/** .xlsx -> { sheets: [{ name, hidden, rows }] }. A cell is null or { v: string | number, f: true when it is a formula, e: true when it is an error }. */
async function readXlsx(buf) {
  const zip = zipEntries(buf);
  if (!zip['xl/workbook.xml']) throw new Error('not-xlsx');
  const wb = await zip['xl/workbook.xml'](), rels = zip['xl/_rels/workbook.xml.rels'] ? await zip['xl/_rels/workbook.xml.rels']() : '';
  const target = {}; for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) target[xmlAttr(m[0], 'Id')] = xmlAttr(m[0], 'Target');
  // which cell styles are dates: Excel keeps a date as a number, and only the style says it is one
  const styles = zip['xl/styles.xml'] ? await zip['xl/styles.xml']() : '', fmtCode = {}; for (const m of styles.matchAll(/<numFmt\b[^>]*>/g)) fmtCode[xmlAttr(m[0], 'numFmtId')] = xmlAttr(m[0], 'formatCode') || '';
  const isDateFmt = id => { const n = +id; if ((n >= 14 && n <= 22) || (n >= 27 && n <= 36) || (n >= 45 && n <= 47) || (n >= 50 && n <= 58)) return true; const c = (fmtCode[id] || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, ''); return !!c && /[dy]|m{1,5}/i.test(c) && !/[#0?]/.test(c); };
  const xfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles), dateStyle = xfs ? [...xfs[1].matchAll(/<xf\b[^>]*>/g)].map(m => isDateFmt(xmlAttr(m[0], 'numFmtId') || '0')) : [];
  const strings = zip['xl/sharedStrings.xml'] ? [...(await zip['xl/sharedStrings.xml']()).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => siText(m[1])) : [];
  const sheets = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = xmlAttr(m[0], 'name'), rid = xmlAttr(m[0], 'r:id'), state = xmlAttr(m[0], 'state');
    let path = target[rid] || ''; path = path.startsWith('/') ? path.slice(1) : 'xl/' + path;
    if (!zip[path]) continue;
    const xml = await zip[path](), rows = [];
    for (const r of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const ri = +xmlAttr(r[1], 'r') - 1, row = rows[ri] = rows[ri] || [];
      for (const c of r[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = xmlAttr(c[1], 'r'), type = xmlAttr(c[1], 't'), body = c[2] || '', v = /<v>([\s\S]*?)<\/v>/.exec(body), f = /<f[\s>\/]/.test(body);
        let val = null;
        if (type === 'inlineStr') val = siText(body);
        else if (v) val = type === 's' ? strings[+v[1]] : type === 'str' || type === 'e' ? xmlText(v[1]) : type === 'b' ? (v[1] === '1' ? 1 : 0) : Number(v[1]);
        if (val === null || val === '' || (typeof val === 'number' && isNaN(val))) continue;
        row[colIndex(ref)] = { v: val, ...(f ? { f: true } : {}), ...(type === 'e' ? { e: true } : {}), ...(typeof val === 'number' && dateStyle[+xmlAttr(c[1], 's')] ? { d: true } : {}) };
      }
    }
    for (let i = 0; i < rows.length; i++) rows[i] = rows[i] || [];
    sheets.push({ name, hidden: !!state && state !== 'visible', rows });
  }
  if (!sheets.length) throw new Error('not-xlsx');
  return { sheets, date1904: /<workbookPr\b[^>]*date1904="(1|true)"/.test(wb) };
}
/** A CSV is one sheet. Cells stay as text; amounts are read later with the same parser as everywhere else. */
function readCsvSheet(text, name) {
  const first = (text.split(/\r?\n/).find(l => l.trim()) || ''), delim = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
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
  return { sheets: [{ name: name || 'CSV', hidden: false, rows: rows.map(r => r.map(x => x.trim() === '' ? null : { v: x.trim() })) }] };
}
