/* Dorax Finance — clicks: categories and rules. Joined into A in app/actions.js. */
const CATEGORIES_ACTIONS = {
  'cat-toggle'(ds) { UI.catOpen[ds.id] = !UI.catOpen[ds.id]; render(); const el = document.querySelector(`[data-a="cat-toggle"][data-id="${ds.id}"]`); if (el) el.focus(); },
  'edit-cat'(ds) { UI.catEdit = ds.id || null; render(); const el = $('cat-rename'); if (el) { el.focus(); el.select(); } },
  'save-cat'(ds) { const v = $('cat-rename').value.trim(), f = catOf(ds.id); if (v && f) { (f.sub || f.cat).name = v; S.plan.lines.forEach(l => { if (l.subcategoryId === ds.id) l.name = v; }); } UI.catEdit = null; render(); },
  'add-cat'() { const v = $('newcat').value.trim(); if (!v) return toast(t('Enter a category name.')); const n = S.categories.filter(c => !c.income).length; S.categories.splice(S.categories.length - 1, 0, { id: newId('c'), name: v, color: 's' + Math.min(7, n + 1), subs: [] }); toast(t('Category added.')); render(); },
  'add-sub'(ds) { const el = $('newsub-' + ds.id), v = el.value.trim(); if (!v) return toast(t('Enter a subcategory name.')); S.categories.find(c => c.id === ds.id).subs.push({ id: newId('s'), name: v }); render(); },
  'delete-sub'(ds) {
    const f = catOf(ds.id); if (!f || !f.sub) return;
    const line = S.plan.lines.some(l => l.subcategoryId === ds.id);
    confirmBox({ title: t('Delete {name}?', { name: f.sub.name }), text: line ? t('The subcategory and the fixed cost with the same name are deleted, with its plan. This can’t be undone.') : t('The subcategory is deleted. It has no transactions.'), label: t('Delete subcategory'),
      run() { S.categories.forEach(c => { c.subs = c.subs.filter(k => k.id !== ds.id); }); S.plan.lines = S.plan.lines.filter(l => l.subcategoryId !== ds.id); toast(t('Subcategory deleted.')); render(); } });
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
