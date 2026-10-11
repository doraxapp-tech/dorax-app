/* Dorax Finance — clicks: statement imports and the review table. Joined into A in app/actions.js. */
const sessOf = ds => ds.s === 'conv' ? UI.conv : UI.imp;
const IMPORTS_ACTIONS = {
  // review table
  'rv-accept-verified'(ds) { sessOf(ds).rows.forEach(r => { if (r.state === 'verified' && !r.decision) r.decision = 'accept'; }); render(); },
  'rv-decide'(ds) { const r = sessOf(ds).rows.find(x => x.id === ds.id); r.decision = r.decision === ds.op ? null : ds.op; render(); },
  'rv-bulk'(ds) { sessOf(ds).rows.filter(r => r.sel).forEach(r => { if (ds.op === 'transfer') { r.type = 'transfer'; r.edited = true; } else r.decision = ds.op; r.sel = false; }); render(); },
  'rv-group-decide'(ds) { const rs = rvGroupRows(sessOf(ds), ds.g), off = rs.every(r => r.decision === ds.op); rs.forEach(r => { r.decision = off ? null : ds.op; }); render(); },      // pressed again, undecided again
  'rv-group-open'(ds) { const s = sessOf(ds); s.open = s.open || {}; s.open[ds.g] = !s.open[ds.g]; render(); },
  'rv-more'() { UI.rvMore = !UI.rvMore; render(); const el = UI.rvMore ? document.querySelector('#rv-more button') : $('rv-more-btn'); if (el) el.focus(); },      // the review's other actions
  'rv-unselect'(ds) { sessOf(ds).rows.forEach(r => { r.sel = false; }); render(); },
  'rv-only'(ds) { const s = sessOf(ds); s.only = ds.v; const st = UI.pg['rv-' + (ds.s || 'imp')]; if (st) st.page = 1; render(); },      // all rows, or only those worth a look
  'rv-recat'(ds) { const s = sessOf(ds); let n = 0; s.rows.forEach(r => { if (r.catTouched) return; const c = categorize(r.description, s.accountId, S.rules); if (c.categoryId !== r.categoryId || c.subcategoryId !== r.subcategoryId) n++; Object.assign(r, { merchant: c.merchant, categoryId: c.categoryId, subcategoryId: c.subcategoryId, ruleId: c.ruleId, issue: c.ruleId || c.transfer ? '' : 'norule' }); if (c.transfer) r.type = 'transfer'; }); toast(n ? tn(n, '{n} row re-categorized.', '{n} rows re-categorized.') : t('Categories are already up to date.')); render(); },

  // household imports
  'imp-cancel'() { UI.imp = null; UI.impError = null; render(); },
  // a phone (features/imports/imports.phone.js; owner, 2026-10-10)
  'imp-pick'() { impPick(); },
  'imp-howto'() { UI.tour = 'imports'; renderTour(); },      // the first-time page again (features/tours/tours.js)
  'imp-accept-look'() { const i = UI.imp; if (!i) return; ipLook(i).forEach(r => { if (!r.decision) r.decision = 'accept'; }); render(); },
  'imp-ready'() { const i = UI.imp; if (!i) return; i.showReady = !i.showReady; render(); },
  'imp-review'() {      // to the review; back from the columns, the review is read again with the person's changes kept (import-session.js: keepEdits)
    const i = UI.imp; if (!csvRows(i).some(r => r.date && r.amount !== null)) return;
    readAgain(i); i.step = 'review'; render();
  },
  'imp-to-card'(ds) { C['imp-account']({ value: ds.id }); },      // the file was a card's: into the card, keeping what was changed
  'imp-back'() { const i = UI.imp; if (!i || !i.csv) return; i.step = 'map'; render(); const el = $('imp-acct'); if (el) el.focus(); },      // back to the account and the columns, the review kept
  'imp-flip'() {      // a card's statement read the wrong way round: its amounts turned, and the review made again
    const i = UI.imp, a = acct(i.accountId); if (!i || !i.csv) return; i.invert = !i.invert;
    if (i.step === 'review') readAgain(i);      // the person's changes kept, but not a type or an amount the turn makes wrong
    render();
  },
  // 2026-10-09 (owner: "if the user makes a mistake importing and wants to delete what came in, they have to go one by one; I want an import to be undone")
  'imp-undo'(ds) {
    const i = S.imports.find(k => k.id === ds.id); if (!i) return;
    const xs = S.transactions.filter(x => x.importId === i.id), mine = xs.filter(x => x.accountId === i.accountId).length, made = i.made && acct(i.made);
    confirmBox({ title: t('Undo this import?'), label: t('Undo import'),
      text: tn(mine, 'The {n} transaction that {file} brought into {account} is deleted, with its other side in another account if it had one, even if you edited it since. This can’t be undone.', 'The {n} transactions that {file} brought into {account} are deleted, with their other side in another account if they had one, even if you edited them since. This can’t be undone.', { file: i.file, account: acct(i.accountId) ? acct(i.accountId).name : '—' }),
      run() {
        S.transactions = S.transactions.filter(x => x.importId !== i.id);
        if (made && !S.transactions.some(x => x.accountId === made.id) && !everyBook(() => B().goals.filter(g => g.accountId === made.id)).length) S.accounts = S.accounts.filter(a => a !== made);      // the account it made, while nothing else uses it
        if (i.rules) S.rules = S.rules.filter(r => !i.rules.includes(r.id));      // and the rules it learnt
        (i.paired || []).forEach(p => { const t0 = S.transactions.find(x => x.id === p.id); if (t0) Object.assign(t0, p.was); });      // and the rows a pair had made transfers are what they were
        i.status = 'Undone'; i.undone = S.today; toast(t('Import undone.')); render();
      } });
  },
  // phase 3 (owner, 2026-10-09): what is left without a category, asked of an AI on the person's request. Only the rows' words without
  // numbers and the names of their own groups leave the device (supabase/functions/suggest); what comes back is shown to be looked at.
  async 'rv-ai'(ds) {
    const s = sessOf(ds), rows = aiRows(s); if (!rows.length || s.aiBusy) return;
    const words = d => normalizeText(d).split(' ').filter(w => w && !/\d/.test(w)).join(' ');
    const groups = []; S.categories.forEach(c => { if (c.id === 'other') return; const dir = c.income ? 'in' : 'out'; groups.push({ key: c.id + '|', name: c.name, dir }); (c.subs || []).forEach(x => groups.push({ key: c.id + '|' + x.id, name: c.name + ' › ' + x.name, dir })); });
    s.aiBusy = true; render();
    const r = await SERVER.suggest(rows.map(x => ({ id: x.id, text: words(x.description), dir: x.amount < 0 || x.type === 'expense' ? 'out' : 'in' })).filter(x => x.text), groups);
    s.aiBusy = false;
    if (!r.ok) { toast(r.code === 'not_set_up' ? t('Suggestions with AI are not set up on the server yet.') : r.code === 'limit' ? t('You have asked the AI many times today. Try again tomorrow.') : t('The AI could not answer. Try again in a moment.')); return render(); }
    let n = 0;
    (r.suggestions || []).forEach(sg => {
      const row = s.rows.find(x => x.id === sg.id), [c, sub] = String(sg.key || '').split('|'), cat = S.categories.find(x => x.id === c);
      if (!row || row.categoryId || row.catTouched || !cat || (sub && !cat.subs.some(x => x.id === sub)) || !!cat.income !== (row.type === 'income')) return;
      Object.assign(row, { categoryId: c, subcategoryId: sub || null, why: 'ai', check: true, issue: '' }); if (sg.name && !guessMerchant(row.description)) row.merchant = sg.name; n++;
    });
    toast(n ? tn(n, 'The AI suggested a category for {n} row. It is in “To look at”.', 'The AI suggested a category for {n} rows. They are in “To look at”.') : t('The AI found no category that fits these rows.')); render();
  },
  'go-rules'() { go('categories'); requestAnimationFrame(() => { const el = document.querySelector('#rules-tbl tr.learnt') || $('cat-rules'); if (el) el.scrollIntoView({ block: 'center' }); }); },      // the rules an import just learnt
  'imp-commit'() {
    // rows on pages not looked at (owner, 2026-10-09: "the table has pages, sometimes I don't see all of it and I import without reviewing"): asked first
    const i0 = UI.imp, unseen = i0 && i0.rows ? i0.rows.filter(r => r.decision === 'accept' && !r.seen && rvLook(r, isBiz(i0.accountId))) : [];      // what is ready needs no look
    if (unseen.length && !i0.seenOk) return confirmBox({ tone: 'neutral', title: tn(unseen.length, 'You have not seen {n} row yet', 'You have not seen {n} rows yet'), text: t('They are on other pages of the table. Look at them before importing, or import them as they are.'),
      label: t('Import anyway'), cancelLabel: t('Show them'), run() { i0.seenOk = true; A['imp-commit'](); }, onCancel() { const at = rvUnits(i0).units.findIndex(u => u.includes(unseen[0])), st = UI.pg['rv-imp'] || (UI.pg['rv-imp'] = { page: 1, size: PG_SIZES[0] }); st.page = Math.floor(at / (PG_SIZES.includes(+st.size) ? +st.size : PG_SIZES[0])) + 1; render(); const el = $('imp-panel'); if (el) el.scrollIntoView({ block: 'start' }); } });
    const i = UI.imp, a = acct(i.accountId);
    if (i.csv && i.real) { if (i.remember) a.csvMap = { sig: i.csv.header.join('|'), map: { ...i.map }, invert: !!i.invert }; else delete a.csvMap; }      // the columns remembered for the account the file went into, once it went in
    i.result = commitSession(i); i.step = 'done'; toast(i.result.made && !String(i.saveBal || '').trim() ? t('{n} transactions imported. Put what is in {name} today in Edit account.', { n: i.result.imported, name: acct(i.result.made).name }) : t('{n} transactions imported.', { n: i.result.imported })); render(); },
};
