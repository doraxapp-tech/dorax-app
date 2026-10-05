/* Dorax Finance — clicks and field changes: the spreadsheet import. Joined into A in app/actions.js and into C in app/changes.js. */
const SHEET_ACTIONS = {
  'sheet-go'() { navigate('imports'); const el = $('sheet-card'); if (el) el.scrollIntoView({ block: 'start' }); },
  'sheet-cancel'() { UI.sheetImp = null; render(); },
  'sheet-apply'() {
    const imp = UI.sheetImp; if (!imp || sheetProblems(imp.units).length) return;
    const other = catName('other') === t('Uncategorized') ? t('Other costs') : catName('other');
    const units = imp.units.map(u => ({ ...u, groups: (u.groups || []).map(g => ({ key: g.key, name: g.target !== 'new' && catOf(g.target) ? catOf(g.target).cat.name : g.name || other })),
      rows: u.rows.map(x => u.table === 'fii' ? x : { ...x, as: sheetAs(u, x), due: x.pay === 'budget' ? null : x.due }) })), before = new Set(S.plan.lines.map(l => l.id).concat(S.goals.map(g => g.id)));
    const rep = applySheetImport(S, units, { newId, otherName: other }), n = rep.lines + rep.linesUpdated + rep.income + rep.incomeUpdated + rep.goals + rep.goalsUpdated + rep.fii;
    S.imports.unshift({ id: newId('i'), date: S.today, source: 'sheet', file: imp.file, accountId: null, detected: sheetCounts().total, imported: n, duplicates: 0, review: 0, status: 'Completed' });
    UI.sheetImp = { step: 'done', file: imp.file, result: rep }; UI.dist = null;
    if (rep.years.length) UI.planYear = UI.goalYear = rep.years.includes(+S.today.slice(0, 4)) ? +S.today.slice(0, 4) : rep.years[0];
    flash(...S.plan.lines.map(l => l.id).concat(S.goals.map(g => g.id)).filter(id => !before.has(id)));
    toast(tn(n, '{n} row imported from your spreadsheet.', '{n} rows imported from your spreadsheet.')); render();
    const el = $('sheet-card'); if (el) el.scrollIntoView({ block: 'start' });
  },
};
const SHEET_CHANGES = {
  'sheet-file'(el) { if (el.files && el.files[0]) takeSheet(el.files[0]); },
  'sheet-kind'(el) { sheetUnit(el.dataset.u).kind = el.value; render(); },
  'sheet-year'(el) { sheetUnit(el.dataset.u).year = Math.round(+el.value) || 0; render(); },
  'sheet-group'(el) { sheetUnit(el.dataset.u).groups[+el.dataset.g][el.dataset.k] = el.value.trim(); render(); },
  'sheet-row'(el) {
    const x = sheetUnit(el.dataset.u).rows.find(r => r.id === el.dataset.r), k = el.dataset.k;
    if (k === 'due') { const d = Math.round(+el.value); if (el.value !== '' && !(d >= 1 && d <= 31)) toast(t('The due day must be between 1 and 31.')); else x.due = el.value === '' ? null : d; }
    else x[k] = el.value;
    render();
  },
};
