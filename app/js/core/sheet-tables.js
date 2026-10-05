/* Dorax Finance — spreadsheet import: finding the tables in a workbook. */
// ---------- finding the tables ----------
const sheetNorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const MONTH_WORDS = [['ENERO', 'JANEIRO', 'JANUARY', 'ENE', 'JAN'], ['FEBRERO', 'FEVEREIRO', 'FEBRUARY', 'FEB', 'FEV'], ['MARZO', 'MARCO', 'MARCH', 'MAR'], ['ABRIL', 'APRIL', 'ABR', 'APR'], ['MAYO', 'MAIO', 'MAY', 'MAI'],
  ['JUNIO', 'JUNHO', 'JUNE', 'JUN'], ['JULIO', 'JULHO', 'JULY', 'JUL'], ['AGOSTO', 'AUGUST', 'AGO', 'AUG'], ['SEPTIEMBRE', 'SETIEMBRE', 'SETEMBRO', 'SEPTEMBER', 'SEP', 'SET', 'SEPT'],
  ['OCTUBRE', 'OUTUBRO', 'OCTOBER', 'OCT', 'OUT'], ['NOVIEMBRE', 'NOVEMBRO', 'NOVEMBER', 'NOV'], ['DICIEMBRE', 'DEZEMBRO', 'DECEMBER', 'DIC', 'DEZ', 'DEC']];
/** "Enero", "ene", "Jan/26", "01/2026" -> 0..11, or -1. */
function monthOf(cell) {
  if (!cell || typeof cell.v !== 'string') return -1;
  const n = sheetNorm(cell.v), word = n.split(' ')[0];
  const i = MONTH_WORDS.findIndex(ws => ws.includes(word));
  if (i >= 0 && n.split(' ').length <= 2) return i;
  const m = /^(\d{1,2}) (\d{2}|\d{4})$/.exec(n); return m && +m[1] >= 1 && +m[1] <= 12 ? +m[1] - 1 : -1;
}
const cellText = c => c && typeof c.v === 'string' ? c.v.trim() : '';
/** A cell as integer cents, or null. Sheet numbers are floats; they are rounded to cents once, here, and never touched as floats again. */
function cellCents(c, parse) {
  if (!c || c.e) return null;
  if (typeof c.v === 'number') return Math.round(c.v * 100);
  const s = c.v.trim(); return /\d/.test(s) && !/[A-Za-z]{2}/.test(s.replace(/R\$|US\$|BRL|USD/gi, '')) ? parse(s) : null;
}
const RE_INCOME = /\b(SUELDO|SUELDOS|SALARIO|SALARIOS|SALARY|INGRESO|INGRESOS|RENDA|RECEITA|INCOME|PRO LABORE|NOMINA|PAYCHECK)\b/;
const RE_TOTAL = /\b(TOTAL|SUBTOTAL|QUEDA|QUEDAN|RESTA|RESTANTE|SOBRA|SALDO|REMAINDER|LEFT OVER|LEFTOVER|BALANCE|DIFERENCIA|DIFERENCA)\b/;
const RE_DUE = /\b(FECHA DE PAGO|DIA DE PAGO|VENCIMIENTO|VENCIMENTO|VENCE|VENC|DUE|PAGAMENTO|PAGO EL)\b/;
const RE_VARIABLE = /\b(VARIABLE|VARIAVEL|VARIA)\b/;
/** "Dia 9 / mes", "día 10", "10", 10 -> day of the month, or null. */
function dueDayOf(c) {
  if (!c) return null;
  if (typeof c.v === 'number') return Number.isInteger(c.v) && c.v >= 1 && c.v <= 31 ? c.v : null;
  const m = /\b(?:DIA|DAY|TODO DIA|CADA)\s*(\d{1,2})\b/.exec(sheetNorm(c.v)) || /^(\d{1,2})$/.exec(sheetNorm(c.v));
  return m && +m[1] >= 1 && +m[1] <= 31 ? +m[1] : null;
}
/** "TOTAL (PAGO EN CARTON PERSONAL)" -> "Pago en carton personal". Empty when nothing is left, as in a grand total. */
function groupNameOf(label) {
  const s = label.replace(/[()]/g, ' ').replace(/\b(sub)?total(es)?\b/ig, ' ').replace(/^\s*(de|del|da|do|of)\s+/i, '').replace(/\s+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : '';
}
function yearOf(text) {
  const m = /\b(20\d{2})\b/.exec(text) || /(?:^|[^\d])(\d{2})\s*$/.exec(text.trim());
  if (!m) return null;
  const y = m[1].length === 2 ? 2000 + +m[1] : +m[1]; return y >= 2000 && y <= 2099 ? y : null;
}
function tabKind(name) {
  const n = sheetNorm(name);
  if (/\b(PRUEBA|TEST|TESTE|BORRADOR|RASCUNHO|DRAFT|COPIA|COPY)\b/.test(n)) return 'skip';
  if (/\b(AHORRO|AHORROS|META|METAS|SAVING|SAVINGS|POUPANCA|GOAL|GOALS|DEUDA|DEUDAS|DUEDAS|DIVIDA|DIVIDAS|OBJETIVO|OBJETIVOS)\b/.test(n)) return 'goals';
  return 'fixed';
}

/** Month tables in one sheet. Months usually run across the top; when no such table is found, the sheet is read turned on its side,
    so a table with the months down the first column and one cost per column comes in the same way. */
function monthTables(sheet, parse) {
  const across = monthTablesIn(sheet, parse); if (across.length) return across;
  const width = Math.max(0, ...sheet.rows.map(r => r.length));
  const turned = { name: sheet.name, rows: Array.from({ length: width }, (_, c) => sheet.rows.map(r => r[c] === undefined ? null : r[c])) };
  return monthTablesIn(turned, parse).map(tb => ({ ...tb, turned: true }));
}
/** A header row with at least six month names, then one row per line until the next header. */
function monthTablesIn(sheet, parse) {
  const heads = [];
  sheet.rows.forEach((row, r) => {
    const cols = {}; row.forEach((c, i) => { const m = monthOf(c); if (m >= 0 && !(m in cols)) cols[m] = i; });
    if (Object.keys(cols).length >= 6) heads.push({ r, cols });
  });
  return heads.map((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1].r : sheet.rows.length, first = Math.min(...Object.values(h.cols)), last = Math.max(...Object.values(h.cols)), head = sheet.rows[h.r];
    // the label column: the one left of the months with the most text
    let labelCol = Math.max(0, first - 1), best = -1;
    for (let c = 0; c < first; c++) { let n = 0; for (let r = h.r + 1; r < end; r++) if (cellText(sheet.rows[r][c])) n++; if (n > best) { best = n; labelCol = c; } }
    let dueCol = -1; head.forEach((c, i) => { if (i > last && RE_DUE.test(sheetNorm(cellText(c)))) dueCol = i; });
    if (dueCol < 0) for (let c = last + 1; c <= last + 4 && dueCol < 0; c++) for (let r = h.r + 1; r < end; r++) { const x = sheet.rows[r][c]; if (x && typeof x.v === 'string' && /\b(DIA|DAY)\s*\d{1,2}\b/.test(sheetNorm(x.v))) { dueCol = c; break; } }
    const rows = [];
    for (let r = h.r + 1; r < end; r++) {
      const row = sheet.rows[r], label = cellText(row[labelCol]), cells = Array.from({ length: 12 }, (_, m) => h.cols[m] == null ? null : row[h.cols[m]]);
      const values = cells.map(c => { const v = cellCents(c, parse); return v === null ? 0 : v; }), hasNum = cells.some(c => cellCents(c, parse) !== null), error = cells.some(c => c && c.e);
      if (!label && !hasNum && !error) continue;
      const n = sheetNorm(label), formula = cells.filter(c => c).length > 0 && cells.filter(c => c).every(c => c.f);
      const type = !label ? 'unnamed' : RE_TOTAL.test(n) ? 'total' : RE_INCOME.test(n) ? 'income' : !hasNum ? 'heading' : 'item';
      rows.push({ r, label, type, values: values.map(v => Math.max(0, v)), negative: values.some(v => v < 0), formula, error, due: dueCol >= 0 ? dueDayOf(row[dueCol]) : null, variable: RE_VARIABLE.test(n) });
    }
    // groups: a block of lines closed by a subtotal takes the subtotal's name; a text-only row opens a block with its own name
    let open = [], heading = '';
    const close = name => { open.forEach(x => { x.group = name; }); open = []; };
    for (const x of rows) {
      if (x.type === 'item') { x.group = heading; open.push(x); }
      else if (x.type === 'heading') { close(heading); heading = x.label; }
      else if (x.type === 'total') { const g = groupNameOf(x.label); if (open.length && g) close(heading || g); else open = []; heading = ''; }
    }
    return { sheet: sheet.name, header: h.r, rows, hasDue: dueCol >= 0 };
  });
}
const RE_TICKER = /^[A-Z]{4}\d{1,2}$/;
/** FII tables: a header naming the fund, the quotas and the price; then one fund code per row. */
function fiiTables(sheet, parse) {
  const out = [];
  sheet.rows.forEach((row, r) => {
    const find = re => row.findIndex(c => re.test(sheetNorm(cellText(c))));
    const tk = find(/^(FIIS?|FII S|TICKER|ATIVO|ATIVOS|FUNDO|FUNDOS|FONDO|FONDOS|CODIGO|PAPEL)$/), qty = find(/\b(CUOTAS|COTAS|QUOTAS|CANTIDAD|QUANTIDADE|QTD|QTDE|SHARES)\b/), price = find(/\b(PRECIO|PRECO|PRICE|COTACAO|COTIZACION)\b/);
    if (tk < 0 || qty < 0 || price < 0) return;
    const yld = find(/\b(RENDIMIENTO|RENDIMENTO|YIELD|DIVIDENDO|DIVIDEND|PROVENTO)\b/), rows = [];
    for (let k = r + 1; k < sheet.rows.length; k++) {
      const x = sheet.rows[k], code = sheetNorm(cellText(x[tk])).replace(/ /g, '');
      if (!RE_TICKER.test(code)) { if (rows.length || k > r + 3) break; continue; }
      const q = x[qty] && typeof x[qty].v === 'number' ? x[qty].v : Number(cellText(x[qty]).replace(/\D/g, '')), p = cellCents(x[price], parse), y = yld >= 0 ? cellCents(x[yld], parse) : null;
      rows.push({ ticker: code, qty: Number.isInteger(q) && q > 0 ? q : 0, price: p > 0 ? p : 0, lastYield: y > 0 ? y : 0 });
    }
    if (rows.length) out.push({ sheet: sheet.name, header: r, rows });
  });
  return out;
}

/** Everything found in a workbook, as import units the person reviews. Nothing is decided for good here: kind, year, groups and rows can all be changed. */
function analyzeWorkbook(wb, fileName, opt) {
  const parse = opt.parseAmount, fileYear = yearOf(String(fileName || '').replace(/\.[a-z0-9]+$/i, '')) || opt.year, units = [];
  for (const sheet of wb.sheets) {
    if (sheet.hidden) continue;
    const kind = tabKind(sheet.name), year = yearOf(sheet.name) || fileYear;
    monthTables(sheet, parse).forEach((tb, i, all) => {
      if (!tb.rows.some(x => x.type === 'item' || x.type === 'income')) return;
      const groups = [...new Set(tb.rows.filter(x => x.type === 'item').map(x => x.group || ''))];
      units.push({ id: 'u' + units.length, sheet: sheet.name, title: sheet.name + (all.length > 1 ? ' · ' + (i + 1) : ''), table: 'months', guess: kind, kind, year, hasDue: tb.hasDue,
        groups: groups.map((g, k) => ({ key: g, name: g })),
        rows: tb.rows.filter(x => x.type !== 'heading').map((x, k) => ({ id: 'r' + k, label: x.label, values: x.values, due: x.due, group: x.group || '', formula: x.formula, error: x.error, found: x.type,
          as: x.type === 'income' ? 'income' : x.type === 'item' ? (kind === 'goals' ? 'fund' : 'line') : 'skip', pay: x.variable ? 'variable' : 'fixed' })) });
    });
    fiiTables(sheet, parse).forEach((tb, i) => {
      const first = !units.some(u => u.table === 'fii' && u.kind === 'fii');
      units.push({ id: 'u' + units.length, sheet: sheet.name, title: sheet.name + ' · ' + tb.rows.map(x => x.ticker).join(', '), table: 'fii', guess: kind === 'skip' || !first ? 'skip' : 'fii', kind: kind === 'skip' || !first ? 'skip' : 'fii', rows: tb.rows.map((x, k) => ({ id: 'r' + k, ...x })) });
    });
  }
  return { file: fileName || '', units };
}
