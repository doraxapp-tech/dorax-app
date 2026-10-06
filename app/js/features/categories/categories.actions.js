/* Dorax Finance — clicks: categories and rules. Joined into A in app/actions.js. */
const CATEGORIES_ACTIONS = {
  'cat-toggle'(ds) { UI.catOpen[ds.id] = !UI.catOpen[ds.id]; render(); const el = document.querySelector(`[data-a="cat-toggle"][data-id="${ds.id}"]`); if (el) el.focus(); },
  'edit-cat'(ds) { UI.catEdit = ds.id || null; render(); const el = $('cat-rename'); if (el) { el.focus(); el.select(); } },
  'save-cat'(ds) { const v = $('cat-rename').value.trim(), f = catOf(ds.id); if (v && f) { (f.sub || f.cat).name = v; sideLines().forEach(l => { if (l.subcategoryId === ds.id) l.name = v; }); } UI.catEdit = null; render(); const el = $('ren-' + ds.id); if (el) el.focus(); },
  'add-cat'() {
    const v = $('newcat').value.trim(); if (!v) return toast(t('Enter a category name.'));
    const cats = B().categories, n = cats.filter(c => !c.income).length, i = cats.findIndex(c => c.income);      // before Income, which closes the list
    cats.splice(i < 0 ? cats.length : i, 0, { id: newId('c'), name: v, color: 's' + Math.min(7, n + 1), subs: [] }); toast(t('Category added.')); render();
  },
  'add-sub'(ds) { const el = $('newsub-' + ds.id), v = el.value.trim(); if (!v) return toast(t('Enter a subcategory name.')); B().categories.find(c => c.id === ds.id).subs.push({ id: newId('s'), name: v }); render(); },
  'delete-sub'(ds) {
    const f = catOf(ds.id); if (!f || !f.sub || !B().categories.includes(f.cat)) return;
    const line = sideLines().some(l => l.subcategoryId === ds.id);
    confirmBox({ title: t('Delete {name}?', { name: f.sub.name }), text: line ? t('The subcategory and the fixed cost with the same name are deleted, with its plan. This can’t be undone.') : t('The subcategory is deleted. It has no transactions.'), label: t('Delete subcategory'),
      run() { B().categories.forEach(c => { c.subs = c.subs.filter(k => k.id !== ds.id); }); sideBooks().forEach(b => { if (b.plan) b.plan.lines = (b.plan.lines || []).filter(l => l.subcategoryId !== ds.id); }); toast(t('Subcategory deleted.')); render(); } });
  },
  /** A category goes, what it held stays: its subcategories move to Other with their fixed costs (in every currency, for the company), and
      so do its transactions, the rules that file under it and the recurring payments noted under it. Income and Other cannot be deleted. */
  'delete-cat'(ds) {
    const oid = otherId(), c = B().categories.find(k => k.id === ds.id); if (!c || c.income || c.id === oid) return;
    const hit = x => x.categoryId === c.id, other = B().categories.find(k => k.id === oid), into = other ? other.name : nameIn('Other', S.settings.lang, S);
    const costs = sideLines().filter(hit).length, txs = S.transactions.reduce((n, x) => n + allocations(x).filter(hit).length, 0);
    const parts = [c.subs.length && tn(c.subs.length, '{n} subcategory', '{n} subcategories'), costs && tn(costs, '{n} fixed cost', '{n} fixed costs'), txs && tn(txs, '{n} transaction', '{n} transactions')].filter(Boolean);
    confirmBox({ title: t('Delete {name}?', { name: c.name }), label: t('Delete category'), critical: !!(costs || txs),
      text: parts.length ? t('Everything in it moves to {other}: {list}. Nothing is lost, but this can’t be undone.', { other: into, list: parts.join(', ') }) : t('The category is deleted. It is empty.'),
      run() {
        const cats = B().categories; let to = cats.find(k => k.id === oid);
        if (!to) { to = { id: oid, ...appName('Other'), color: 's4', subs: [] }; const i = cats.findIndex(k => k.income); cats.splice(i < 0 ? cats.length : i, 0, to); }
        to.subs.push(...c.subs); B().categories = cats.filter(k => k !== c);
        const move = x => { if (hit(x)) x.categoryId = oid; };
        sideLines().forEach(move); S.transactions.forEach(x => { move(x); (x.splits || []).forEach(move); }); S.rules.forEach(move); (S.recurringManual || []).forEach(move);
        [UI.imp, UI.conv].forEach(s => ((s || {}).rows || []).forEach(move));       // a statement still being reviewed
        delete UI.catOpen[c.id]; if (UI.catEdit === c.id) UI.catEdit = null; if (String(UI.tx.category || '').split('|')[0] === c.id) UI.tx.category = '';
        toast(t('Category deleted.')); render();
      } });
  },
  'add-rule'() {
    const pattern = normalizeText($('nr-pattern').value), merchant = $('nr-merchant').value.trim(), [c, s] = $('nr-cat').value.split('|');
    if (pattern.length < 3) return toast(t('Enter a keyword of at least 3 characters.'));
    S.rules.push({ id: newId('r'), pattern, merchant: merchant || titleCase(pattern), categoryId: c, subcategoryId: s || null, priority: +$('nr-pri').value || 10, accountId: $('nr-acct').value || null, active: true, transfer: false });
    toast(t('Rule added. It applies to future imports.')); render();
  },
  'delete-rule'(ds) {
    const r = S.rules.find(k => k.id === ds.id); if (!r) return;
    confirmBox({ title: t('Delete this rule?'), text: t('“{pattern}” → {label}. Future imports stop using it. Transactions already categorized do not change.', { pattern: r.pattern, label: r.transfer ? t('Transfer') : catName(r.subcategoryId || r.categoryId) }), label: t('Delete rule'),
      run() { S.rules = S.rules.filter(k => k !== r); render(); } });
  },
};
