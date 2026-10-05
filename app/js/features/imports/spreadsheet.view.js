/* Dorax Finance — bringing a spreadsheet in: choose the file, review what was found, import. The reading and matching live in sheet.js. */

const SHEET_KINDS = () => [['fixed', t('Fixed costs and income')], ['goals', t('Savings and goals')], ['skip', t('Do not import')]];
const SHEET_AS = kind => kind === 'goals' ? [['fund', t('Fund without a target')], ['goal', t('Goal with a target')], ['income', t('Income for savings')], ['skip', t('Do not import')]]
  : [['line', t('Fixed cost')], ['income', t('Income')], ['skip', t('Do not import')]];
const sheetUnit = id => UI.sheetImp.units.find(u => u.id === id);
/** A row keeps a choice that makes sense for the tab it is in: a fixed cost in a tab turned into goals becomes a fund, and back. */
function sheetAs(u, x) {
  if (u.kind === 'goals') return x.as === 'line' ? 'fund' : x.as;
  return x.as === 'fund' || x.as === 'goal' ? 'line' : x.as;
}
function sheetAmounts(values, year) {
  const nz = values.filter(v => v > 0), total = sum(values);
  if (!nz.length) return t('No amounts in {year}', { year });
  const lo = Math.min(...nz), hi = Math.max(...nz);
  const each = nz.length === 12 && lo === hi ? t('{amount} every month', { amount: fmt.money(lo, CUR, { trim: true }) })
    : lo === hi ? tn(nz.length, '{amount} in {n} month', '{amount} in {n} months', { amount: fmt.money(lo, CUR, { trim: true }) })
      : tn(nz.length, '{a} to {b} in {n} month', '{a} to {b} in {n} months', { a: fmt.money(lo, CUR, { trim: true }), b: fmt.money(hi, CUR, { trim: true }) });
  return `${each} · ${t('{amount} in {year}', { amount: fmt.money(total, CUR, { trim: true }), year })}`;
}
function sheetCounts() {
  // a goal that appears in the 2026 tab and in the 2027 tab is one goal: things are counted once, by name
  const c = { lines: 0, income: 0, goals: 0, fii: 0, due: 0, fresh: 0, updates: 0 }, seen = new Set();
  for (const u of UI.sheetImp.units) {
    if (u.kind === 'skip') continue;
    for (const x of u.rows) {
      if (u.table === 'fii') { if (x.qty && x.price && sheetRowMatch(S, u, x) === 'new' && !seen.has('fii|' + x.ticker)) { seen.add('fii|' + x.ticker); c.fii++; c.fresh++; } continue; }
      const as = sheetAs(u, x); if (as === 'skip') continue;
      const kind = as === 'line' ? 'lines' : as === 'income' ? 'income' : 'goals', key = kind + '|' + (as === 'income' ? u.kind + '|' : '') + sheetNorm(x.label);
      if (seen.has(key)) continue; seen.add(key);
      c[kind]++;
      if (as === 'line' && x.due && x.pay !== 'budget') c.due++;
      if (sheetRowMatch(S, u, { ...x, as }) === 'new') c.fresh++; else c.updates++;
    }
  }
  c.total = c.lines + c.income + c.goals + c.fii;
  return c;
}

function sheetCard() {
  const imp = UI.sheetImp;
  if (imp && imp.step === 'review') return sheetReview(imp);
  const done = imp && imp.step === 'done' ? imp.result : null, missing = S.plan.lines.filter(l => l.pay !== 'budget' && !l.due && !(l.end && l.end < ymOf(S.today))).length;
  return `<section class="card" id="sheet-card"><div class="card-h"><h2>${t('Your spreadsheet')}</h2>${hint('impSheet')}<span class="sub">${t('Fixed costs, income, goals and FIIs, in one go')}</span></div>
    <div class="card-b stack" style="gap:14px">
      ${done ? banner('good', `<b>${t('Imported from {file}.', { file: esc(imp.file) })}</b> ${[done.lines + done.linesUpdated ? tn(done.lines + done.linesUpdated, '{n} fixed cost', '{n} fixed costs') : '', done.income + done.incomeUpdated ? tn(done.income + done.incomeUpdated, '{n} income row', '{n} income rows') : '', done.goals + done.goalsUpdated ? tn(done.goals + done.goalsUpdated, '{n} goal or fund', '{n} goals and funds') : '', done.fii ? tn(done.fii, '{n} FII', '{n} FIIs') : ''].filter(Boolean).join(', ')}${done.years.length ? ' · ' + done.years.join(', ') : ''}.
          ${done.due ? tn(done.due, '{n} due day came with them.', '{n} due days came with them.') : ''}
          <div class="row" style="margin-top:10px"><a class="btn sm primary" href="#plan">${t('Open plan')}</a>${done.goals + done.goalsUpdated ? `<a class="btn sm" href="#goals">${t('Open goals')}</a>` : ''}${missing ? `<button class="btn sm" data-a="due-days">${icon('calendar')}${t('Set due days ({n} missing)', { n: missing })}</button>` : ''}</div>`, 'check') : ''}
      <p class="lead sm">${t('Bring the plan you already keep in a sheet. I read the tabs, show you what I found and import only what you approve.')}</p>
      <div class="row"><label class="btn primary" for="sheet-file">${icon('upload')}${t('Choose spreadsheet')}</label><input type="file" id="sheet-file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" class="sr" data-c="sheet-file"></div>
      ${imp && imp.error ? banner('crit', esc(imp.error)) : ''}
      <p class="note">${t('Works with .xlsx and .csv files that have the month names in one row (or down one column) and one cost or goal per line. The file is read here in your browser: it is not uploaded or stored.')}</p></div></section>`;
}
function sheetReview(imp) {
  const problems = sheetProblems(imp.units), c = sheetCounts(), bad = id => problems.find(p => p.unit === id);
  const unitHtml = u => {
    const off = u.kind === 'skip', p = bad(u.id);
    const head = `<div class="unit-h"><div class="grow"><b>${esc(u.title)}</b><div class="note">${u.table === 'fii' ? tn(u.rows.length, '{n} fund in this table', '{n} funds in this table') : tn(u.rows.length, '{n} row', '{n} rows')}${u.guess === 'skip' && u.table === 'fii' ? ' · ' + t('It looks like a second table or a test, so it starts switched off.') : ''}</div></div>
        <div class="field inline"><label for="su-kind-${u.id}">${t('Import as')}</label><select id="su-kind-${u.id}" data-c="sheet-kind" data-u="${u.id}">${options(u.table === 'fii' ? [['fii', t('FIIs I hold')], ['skip', t('Do not import')]] : SHEET_KINDS(), u.kind)}</select></div>
        ${u.table === 'months' && !off ? `<div class="field inline"><label for="su-year-${u.id}">${t('Year')}</label><input type="number" id="su-year-${u.id}" min="2000" max="2099" inputmode="numeric" value="${esc(u.year)}" data-c="sheet-year" data-u="${u.id}" style="width:92px"></div>` : ''}</div>`;
    if (off) return `<div class="unit off">${head}</div>`;
    if (u.table === 'fii') return `<div class="unit">${head}<div class="list">${u.rows.map(x => { const m = sheetRowMatch(S, u, x), ok = x.qty && x.price;
      return `<div class="li srow ${ok && m === 'new' ? '' : 'off'}"><span class="grow"><b style="font-weight:500">${esc(x.ticker)}</b><div class="note num">${ok ? `${tn(x.qty, '{n} quota', '{n} quotas')} · ${fmt.money(x.price, CUR)}${x.lastYield ? ' · ' + t('last income {amount} per quota', { amount: fmt.money(x.lastYield, CUR) }) : ''}` : t('No quotas in this table')}</div></span>${!ok ? '' : m === 'new' ? `<span class="chip info"><i></i>${t('New')}</span>` : `<span class="chip">${t('Already in the app')}</span>`}</div>`; }).join('')}</div>
      <p class="note">${t('Each fund comes in as an opening position: quotas and the price in the sheet, without a date. Funds you already have in the app are left as they are.')}</p></div>`;
    const fresh = g => u.rows.some(x => sheetAs(u, x) === 'line' && x.group === g.key && sheetRowMatch(S, u, { ...x, as: 'line' }) === 'new');
    const shown = u.kind === 'fixed' ? u.groups.map((g, i) => [g, i]).filter(([g]) => fresh(g)) : [];
    const groups = shown.length ? `<div class="unit-groups">${shown.map(([g, i]) => `<div class="field inline"><label for="sg-${u.id}-${i}">${g.key ? t('“{name}” goes into', { name: esc(g.key) }) : t('Rows without a group go into')}</label><select id="sg-${u.id}-${i}" data-c="sheet-group" data-k="target" data-u="${u.id}" data-g="${i}">${options([['new', t('A new group')], ...S.categories.filter(k => !k.income).map(k => [k.id, k.name])], g.target)}</select>
        ${g.target === 'new' ? `<label class="sr" for="sn-${u.id}-${i}">${t('Name of the new group')}</label><input type="text" id="sn-${u.id}-${i}" value="${esc(g.name)}" data-c="sheet-group" data-k="name" data-u="${u.id}" data-g="${i}">` : ''}</div>`).join('')}
      <span class="note">${t('Only for fixed costs that are new. The ones you already have stay in their group.')}</span></div>` : '';
    return `<div class="unit">${head}
      ${p ? banner('crit', p.code === 'year' ? t('Give this tab a year between 2000 and 2099.') : t('Another tab is already imported as the same thing for {year}. Change the year of one of them, or switch one off.', { year: u.year })) : ''}
      ${groups}
      <div class="list">${u.rows.filter(x => x.label).map(x => {
        const as = sheetAs(u, x), on = as !== 'skip', m = on ? sheetRowMatch(S, u, { ...x, as }) : '', key = `data-u="${u.id}" data-r="${x.id}"`;
        return `<div class="li srow ${on ? '' : 'off'}"><span class="grow"><b style="font-weight:500">${esc(x.label)}</b> ${!on ? (x.found === 'total' ? `<span class="chip">${t('Total, calculated')}</span>` : '') : m === 'new' ? `<span class="chip info"><i></i>${t('New')}</span>` : `<span class="chip">${t('Updates {year}', { year: u.year })}</span>`}
            <div class="note num">${sheetAmounts(x.values, u.year)}${x.error ? ' · ' + t('the sheet has an error in this row') : ''}</div></span>
          <span class="srow-c">${on && as === 'line' && x.pay !== 'budget' ? `<label class="sr" for="sd-${u.id}-${x.id}">${t('Due day')}: ${esc(x.label)}</label><input type="number" class="day" id="sd-${u.id}-${x.id}" min="1" max="31" inputmode="numeric" placeholder="${t('Day')}" value="${esc(x.due || '')}" data-c="sheet-row" data-k="due" ${key}>` : ''}${on && as === 'line' ? `
            <label class="sr" for="sp-${u.id}-${x.id}">${t('How it is paid')}: ${esc(x.label)}</label><select id="sp-${u.id}-${x.id}" data-c="sheet-row" data-k="pay" ${key}>${options([['fixed', t('Fixed amount')], ['variable', t('Variable amount')], ['budget', t('Spent during the month')]], x.pay)}</select>` : ''}
            <label class="sr" for="sa-${u.id}-${x.id}">${t('Import as')}: ${esc(x.label)}</label><select id="sa-${u.id}-${x.id}" data-c="sheet-row" data-k="as" ${key}>${options(SHEET_AS(u.kind), as)}</select></span></div>`; }).join('')}</div></div>`;
  };
  return `<section class="card" id="sheet-panel"><div class="card-h"><h2>${t('Found in your spreadsheet')}</h2>${hint('impFound')}<span class="sub">${esc(imp.file)}</span><button class="right btn sm ghost" data-a="sheet-cancel">${t('Cancel')}</button></div>
    <div class="card-b stack" style="gap:16px">
      <p class="note">${t('Nothing is saved until you press Import. Rows are matched by name: a name you already have gets its amounts for that year replaced; a new name is created. Totals and remainders are skipped because the app calculates them.')}</p>
      ${imp.units.map(unitHtml).join('')}</div>
    <div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="note">${!c.total ? t('Nothing is selected to import.') : [c.lines ? tn(c.lines, '{n} fixed cost', '{n} fixed costs') : '', c.income ? tn(c.income, '{n} income row', '{n} income rows') : '', c.goals ? tn(c.goals, '{n} goal or fund', '{n} goals and funds') : '', c.fii ? tn(c.fii, '{n} FII', '{n} FIIs') : ''].filter(Boolean).join(', ') + ' · ' + t('{a} new, {b} updated', { a: c.fresh, b: c.updates }) + (c.due ? ' · ' + tn(c.due, '{n} due day', '{n} due days') : '')}</span>
      <button class="btn primary spacer" data-a="sheet-apply" ${problems.length || !c.total ? 'disabled' : ''}>${icon('check')}${t('Import')}</button></div></section>`;
}

// ---------- reading the file ----------
const SHEET_ERRORS = () => ({
  'not-zip': t('That file is not a spreadsheet I can open. Use an .xlsx or a .csv.'), 'not-xlsx': t('That file is not a spreadsheet I can open. Use an .xlsx or a .csv.'), 'bad-zip': t('That file is not a spreadsheet I can open. Use an .xlsx or a .csv.'),
  xls: t('Old .xls files are not supported. Open it and save it as .xlsx, then try again.'), type: t('Choose an .xlsx or a .csv. From Google Sheets: File, Download, Microsoft Excel (.xlsx).'),
  size: t('That file is larger than 10 MB. Keep only the tabs with your plan and try again.'), browser: t('This browser cannot open .xlsx files here. Save the sheet as .csv and try again.'),
  empty: t('I could not find a table with the month names. Check that one row (or one column) has them, with each cost or goal in its own line.'),
  read: t('The file could not be read. Try choosing it again.'),
});
function sheetFail(code) { UI.sheetImp = { step: 'pick', error: SHEET_ERRORS()[code] || SHEET_ERRORS().read }; render(); }
function sheetLoaded(wb, name) {
  const a = analyzeWorkbook(wb, name, { parseAmount, year: +S.today.slice(0, 4) });
  if (!a.units.length) return sheetFail('empty');
  sheetPrefill(S, a.units);
  UI.sheetImp = { step: 'review', file: name, units: a.units, error: null };
  render(); const el = $('sheet-panel'); if (el) el.scrollIntoView({ block: 'start' });
}
function takeSheet(file) {
  const name = file.name || '', xlsx = /\.xlsx$/i.test(name), csv = /\.csv$/i.test(name) || file.type === 'text/csv';
  if (/\.xls$/i.test(name)) return sheetFail('xls');
  if (!xlsx && !csv) return sheetFail('type');
  if (file.size > 10 * 1024 * 1024) return sheetFail('size');
  if (xlsx && typeof DecompressionStream === 'undefined') return sheetFail('browser');
  const reader = new FileReader();
  reader.onerror = () => sheetFail('read');
  reader.onload = async () => {
    try { sheetLoaded(xlsx ? await readXlsx(reader.result) : readCsvSheet(new TextDecoder('utf-8').decode(reader.result).replace(/^﻿/, ''), name.replace(/\.csv$/i, '')), name); }
    catch (e) { sheetFail(e && e.message); }
  };
  reader.readAsArrayBuffer(file);
}
