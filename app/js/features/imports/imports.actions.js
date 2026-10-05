/* Dorax Finance — clicks: statement imports and the review table. Joined into A in app/actions.js. */
const sessOf = ds => ds.s === 'conv' ? UI.conv : UI.imp;
const IMPORTS_ACTIONS = {
  // review table
  'rv-accept-verified'(ds) { sessOf(ds).rows.forEach(r => { if (r.state === 'verified' && !r.decision) r.decision = 'accept'; }); render(); },
  'rv-decide'(ds) { const r = sessOf(ds).rows.find(x => x.id === ds.id); r.decision = r.decision === ds.op ? null : ds.op; render(); },
  'rv-bulk'(ds) { sessOf(ds).rows.filter(r => r.sel).forEach(r => { if (ds.op === 'transfer') { r.type = 'transfer'; r.edited = true; } else r.decision = ds.op; r.sel = false; }); render(); },
  'rv-recat'(ds) { const s = sessOf(ds); let n = 0; s.rows.forEach(r => { if (r.catTouched) return; const c = categorize(r.description, s.accountId, S.rules); if (c.categoryId !== r.categoryId || c.subcategoryId !== r.subcategoryId) n++; Object.assign(r, { merchant: c.merchant, categoryId: c.categoryId, subcategoryId: c.subcategoryId, ruleId: c.ruleId, issue: c.ruleId || c.transfer ? '' : 'norule' }); if (c.transfer) r.type = 'transfer'; }); toast(n ? tn(n, '{n} row re-categorized.', '{n} rows re-categorized.') : t('Categories are already up to date.')); render(); },

  // household imports
  'imp-cancel'() { UI.imp = null; UI.impError = null; render(); },
  'imp-review'() {
    const i = UI.imp, a = acct(i.accountId), good = csvRows(i).filter(r => r.date && r.amount !== null); if (!good.length) return;
    if (i.real) { if (i.remember) a.csvMap = { sig: i.csv.header.join('|'), map: { ...i.map }, invert: !!i.invert }; else delete a.csvMap; }
    i.rows = buildRows(good.map(r => ({ ...r, confidence: 99 })), i.accountId); i.step = 'review'; render();
  },
  'imp-commit'() { const i = UI.imp; i.result = commitSession(i); i.step = 'done'; toast(t('{n} transactions imported.', { n: i.result.imported })); render(); },
};
