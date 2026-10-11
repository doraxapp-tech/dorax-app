/* Dorax Finance — every field: what happens when its value changes (data-c). */
// ---------- changes (input / change) ----------
const C = {
  ...SHEET_CHANGES, ...PHOTO_CHANGES, ...WALLET_CHANGES, ...REMIND_CHANGES, ...ONBOARD_CHANGES, ...FIND_CHANGES, ...AHEAD_CHANGES, ...COMPANY_CHANGES, ...LOCK_CHANGES, ...PUBLIC_CHANGES, ...JOURNEY_CHANGES, ...LIMIT_CHANGES, ...PLAN_GUIDE_CHANGES, ...YEARLY_CHANGES,
  'tx-filter'(el) { UI.tx[el.dataset.k] = el.value; UI.tx.page = 1; if (el.dataset.k === 'q') { $('tx-list').innerHTML = txList(); $('tx-tools').innerHTML = txTools(); } else render(); },
  /** A choice inside the filter pop-up: it changes the copy, and the pop-up is redrawn so its button counts again. A scope chosen by hand lets go of the account. */
  'tx-size'(el) { UI.tx.size = +el.value; UI.tx.page = 1; $('tx-list').innerHTML = txList(); const s = $('tx-size'); if (s) s.focus({ preventScroll: true }); },
  txf(el) { if (!UI.drawer) return; const d = UI.drawer.draft; d[el.dataset.k] = el.value; renderOverlayKeepFocus(); },
  'tx-limit'(el) { if (UI.drawer) UI.drawer.limitText = el.value; },
  draft(el) {
    if (!UI.drawer || !UI.drawer.draft) return;      // a field whose panel was just closed (saved with Enter): its last change has nowhere to go
    const d = UI.drawer.draft; d[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
    if (UI.drawer.kind === 'tx') { txTouched(el.dataset.k); if (el.dataset.k === 'type') txKind(d); if (el.dataset.k === 'accountId') { delete d.viaCard; txKind(d); } }      // an account chosen by hand: no card behind it any more
    if (el.dataset.k === 'accountId' && d.transferAccountId === el.value) d.transferAccountId = null;
    if (el.dataset.k === 'accountId' && UI.drawer.kind === 'line-pay') delete d.viaCard;      // a payment's account chosen by hand: no card behind it any more
    if (el.dataset.rerender && (el.tagName === 'SELECT' || d.splits || el.dataset.rerender === 'always')) renderOverlayKeepFocus();
  },
  /** The sentence of a new transaction: read on every letter. What is under it is drawn again; the sentence itself keeps the focus and the caret. */
  'tx-say'(el) { const d = UI.drawer; if (!d || d.kind !== 'tx') return; d.say = el.value; d.error = null; applySay(d); const f = $('tx-form'), r = $('d-say-read'); if (f) f.innerHTML = txFormBody(d); if (r) r.innerHTML = txSayRead(d); const b = document.querySelector('.drawer .banner.crit'); if (b) b.remove(); },
  split(el) { UI.drawer.draft.splits[+el.dataset.i][el.dataset.k] = el.value; if (el.dataset.rerender) renderOverlayKeepFocus(); },
  'plan-cell'(el) { const v = typedAmount(el.value || '0'), l = lineById(el.dataset.id), y = el.dataset.y, m = +el.dataset.m; if (v === null || v < 0) toast(t('Enter the amount as a number, for example 1500 or 9,90.')); else { l.plan[y] = l.plan[y] || Array(12).fill(0); const was = l.plan[y][m]; l.plan[y][m] = v; offerFill('plan', l.id, y, m, v, was, l.plan[y]); } render(); },
  'pay-cell'(el) { const v = typedAmount(el.value || '0'), r = B().pay[el.dataset.y].find(x => x.id === el.dataset.id), m = +el.dataset.m; if (v === null || v < 0) toast(t('Enter the amount as a number, for example 1500 or 9,90.')); else { const was = r.values[m]; r.values[m] = v; if (el.id.startsWith('pv-')) UI.fill = null; else offerFill('pay', r.id, el.dataset.y, m, v, was, r.values); } render(); },
  'pay-to'(el) { B().pay[el.dataset.y].find(x => x.id === el.dataset.id).to = el.value; render(); },
  /** The day a payment is expected (features/plan/payday.js). The parts of one payment share it; a payment said to come in one half of the month
      moves to the half its day is in. */
  'pay-day'(el) { const rows = B().pay[el.dataset.y], r = rows.find(x => x.id === el.dataset.id), d = Math.round(+el.value) || 0;
    for (const x of rows.filter(k => k.sub === r.sub && (k.half || 0) === (r.half || 0))) { if (d >= 1 && d <= 31) { x.day = d; if (x.half) x.half = d <= 15 ? 1 : 2; } else delete x.day; }
    render(); },
  /** The pay day chosen in the first steps: the first income's (all the parts of that payment), or "no fixed day". */
  'step-payday'(el) { const rows = payRows(S, +S.today.slice(0, 4)), r = rows[0], d = Math.round(+el.value) || 0;
    if (el.value === 'none') S.user.payDaySaid = true; else if (r && d >= 1 && d <= 31) for (const x of rows.filter(k => k.sub === r.sub && (k.half || 0) === (r.half || 0))) { x.day = d; if (x.half) x.half = d <= 15 ? 1 : 2; } else return;
    render(); stepsMaybe(); },
  'pay-name'(el) { const v = el.value.trim(); if (v) B().pay[el.dataset.y].find(x => x.id === el.dataset.id).name = v; render(); },
  'close-day'(el) { const n = Math.round(+el.value); if (n >= 1 && n <= 28) S.settings.closeDay = n; render(); },
  'goal-cell'(el) { const v = typedAmount(el.value || '0'), g = goalById(el.dataset.id), y = el.dataset.y, m = +el.dataset.m; if (v === null || v < 0) toast(t('Enter the amount as a number, for example 1500 or 9,90.')); else { g.plan[y] = g.plan[y] || Array(12).fill(0); const was = g.plan[y][m]; g.plan[y][m] = v; UI.dist = null; offerFill('goal', g.id, y, m, v, was, g.plan[y]); } render(); },
  'dist-val'(el) { distDraft(S.month).vals[el.dataset.id] = el.value; render(); },
  'dist-date'(el) { distDraft(S.month).date = el.value; },
  'dist-from'(el) { distDraft(S.month).fromId = el.value; },
  'acct-main'(el) { const a = acct(el.dataset.id); if (!a || !el.checked) return; setMain(a, true); toast(t('{name} is now the main account.', { name: a.name })); render(); },      // features/accounts
  'draft-ym'(el) {
    const d = UI.drawer.draft, k = el.dataset.k, cur = d[k] || '', m = el.dataset.part === 'm' ? el.value : cur.slice(5, 7), y = el.dataset.part === 'y' ? el.value : (cur.slice(0, 4) || S.today.slice(0, 4));
    d[k] = m ? y + '-' + m : ''; renderOverlayKeepFocus();
  },
  'fii-price'(el) { const v = typedAmount(el.value || ''), a = S.fii.assets[el.dataset.id] = S.fii.assets[el.dataset.id] || {}; if (v === null || v <= 0) toast(t('Enter the price per quota, for example 9,80.')); else if (v !== a.price) { a.price = v; a.priceDate = S.today; } render(); },
  'fii-yield'(el) { const v = typedAmount(el.value || '0'), a = S.fii.assets[el.dataset.id] = S.fii.assets[el.dataset.id] || {}; if (v === null || v < 0) toast(t('Enter the amount as a number, for example 1500 or 9,90.')); else a.lastYield = v; render(); },
  'inc-val'(el) { incDraft(ymOf(S.today)).vals[el.dataset.id] = el.value; render(); },
  'inc-date'(el) { incDraft(ymOf(S.today)).date = el.value; },
  'fii-filter'(el) { UI.fii[el.dataset.k] = el.value; UI.fii.limit = 30; render(); },
  sim(el) { simDraft()[el.dataset.k] = el.value; render(); },
  'toggle-rule'(el) { S.rules.find(x => x.id === el.dataset.id).active = el.checked; render(); },
  'pg-size'(el) { const st = UI.pg[el.dataset.k]; if (!st) return; st.size = +el.value; st.page = 1; render(); const s = $('pg-size-' + el.dataset.k); if (s) s.focus({ preventScroll: true }); },
  'rv-select'(el) { sessOf(el.dataset).rows.find(r => r.id === el.dataset.id).sel = el.checked; render(); },
  'rv-select-all'(el) { sessOf(el.dataset).rows.forEach(r => { r.sel = el.checked; }); render(); },
  'rv-keep'(el) { sessOf(el.dataset).rows.find(r => r.id === el.dataset.id).keepBoth = el.checked; render(); },
  'rv-bulk-cat'(el) { const [c, s] = el.value.split('|'); if (!c) return; sessOf(el.dataset).rows.filter(r => r.sel).forEach(r => { r.categoryId = c; r.subcategoryId = s || null; r.catTouched = r.edited = true; r.issue = ''; r.sel = false; }); render(); },
  'rv-group'(el) {      // one choice for a merchant's rows; a group left open stays open under its new kind
    const s = sessOf(el.dataset), rs = rvGroupRows(s, el.dataset.g); rs.forEach(r => rvApply(s, r, el.dataset.f, el.value));
    if (s.open && s.open[el.dataset.g] && rs.length) s.open[rvGroupKey(rs[0])] = true; render();
  },
  'rv-edit'(el) {
    const s = sessOf(el.dataset), r = s.rows.find(x => x.id === el.dataset.id), f = el.dataset.f;
    if (f === 'amount') { const v = typedAmount(el.value); if (v === null || v === 0) { toast(t('Enter the amount as a number, for example -185,42.')); return render(); } if (Math.sign(v) !== Math.sign(r.amount)) r.check = true; r.amount = v; r.amtTouched = true; if (r.type === 'expense') { r.refund = v > 0; if (!r.refund && r.why === 'refund') r.why = null; } }      // the amount says where the money went; the type stays (a sign turned is shown to be looked at)
    else return rvApply(s, r, f, el.value), render();      // features/imports/review-table.view.js
    r.edited = true; setDup(r, s.accountId); render();
  },
  'imp-account'(el) {      // another account, chosen before or during the review: a file's columns kept for it, then the review read again keeping the person's changes
    const i = UI.imp; i.accountId = el.value;
    if (i.csv && i.real && (i.step === 'map' || i.step === 'review')) { const map = { ...i.map }; csvMapFor(i); if (i.step === 'review' && !i.kept) i.map = map; }      // in the review, the columns the person chose stay unless the account keeps its own
    if (i.step === 'review') readAgain(i);
    render();
  },
  'imp-invert'(el) { UI.imp.invert = el.checked; render(); },
  'imp-file'(el) { const f = el.files && el.files[0]; if (f) takeStatement(f, el.dataset.source); el.value = ''; },      // emptied, so the same file can be chosen again
  'imp-dest'(el) { UI.impDest = el.value; render(); },      // a phone: the account a statement goes into, chosen before the file (features/imports/imports.phone.js)
  'imp-map'(el) { UI.imp.map[el.dataset.f] = +el.value; render(); },
  'imp-remember'(el) { UI.imp.remember = el.checked; },
  'imp-save-bal'(el) { UI.imp.saveBal = el.value; },      // what is in the bank's separate balance today (features/imports)
  /** A column, the amount layout or the date order chosen by hand. */
  'conv-map'(el) { const c = UI.conv, f = el.dataset.f; if (f === 'mode' || f === 'order') c[f] = el.value; else c.map[f] = +el.value; if (f === 'mode' && c.mode === 'split') c.invert = false; render(); },
  'conv-closing'(el) { UI.conv.closingText = el.value; },
  'conv-invert'(el) { UI.conv.invert = el.checked; render(); },
  'conv-remember'(el) { UI.conv.remember = el.checked; },
  'conv-set'(el) { const c = UI.conv; c[el.dataset.f] = el.value; if (el.dataset.f === 'accountId') { c.profileId = profileFor(el.value); if (c.kind === 'csv' && c.csv) loadTable(c.file, c.csv, c.fileNote); } render(); },
  'conv-year'(el) { UI.conv.year = el.value.replace(/\D/g, '').slice(0, 4); render(); },
  'conv-file'(el) { if (el.files && el.files[0]) takeFile(el.files[0]); },
  'conv-reprofile'(el) { UI.conv.profileId = el.value; generateForConv(); render(); },
  // a language picked by hand is remembered on this device: the next visit opens in it, not in the browser's (ui/language.js)
  setting(el) { S.settings[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; if (el.dataset.k === 'lang') rememberLang(el.value); render(); },
  /** A backup file is checked before anything is touched, then replaces the account only after the typed confirmation. */
  'backup-file'(el) {
    const f = el.files && el.files[0]; if (!f) return; UI.backupError = null;
    f.text().then(txt => {
      let d = null; try { d = JSON.parse(txt); } catch (e) { }
      const st = d && d.app === 'dorax-finance' && d.state;
      const shape = accountShape(st);
      if (!shape) { UI.backupError = t('That file is not a Dorax backup. Choose the .json file you got from “Download backup”.'); return render(); }
      if (d.version !== BACKUP_VERSION) { UI.backupError = t('That backup comes from another version of the app and cannot be read here.'); return render(); }
      if (!backupClean(st)) { UI.backupError = t('That file has values the app never writes in a backup, so it was not restored. Use a backup file exactly as it was downloaded.'); return render(); }
      render();
      confirmBox({ critical: true, title: t('Replace this account with the backup?'), label: t('Restore backup'),
        text: t('{file}, saved on {date}: {a} accounts, {b} transactions, {c} fixed costs, {d} goals. Everything in this account now is replaced. This can’t be undone.', { file: esc(f.name), date: fmt.date(d.exportedAt || st.today, true), a: st.accounts.length, b: st.transactions.length, c: st.plan.lines.length, d: st.goals.length }),
        run() {
          const email = S.user.email, lang = S.settings.lang, now = deviceToday();
          S = st; S.user.email = email; S.user.pendingEmail = null; S.settings.lang = lang;
          S.today = now; S.month = ymOf(now); if (!S.pay[+now.slice(0, 4)]) S.pay[+now.slice(0, 4)] = [];
          resetUi(); UI.backupError = null; render(); toast(t('Backup restored.')); saveNow();
        } });
    }).catch(() => { UI.backupError = t('That file could not be read.'); render(); });
  },
  /** A field before login. Typing in a field that was refused takes its error away; a password being chosen ticks its rules as it is typed. */
  pub(el) {
    const k = el.dataset.k; UI.pub[k] = el.value; authClear(el, k);
    if (k === 'name') obCheerLive();      // the first-time setup cheers the dream by name (features/onboarding)
    if (k === 'password') { const r = pwRules(el.value); document.querySelectorAll('#pw-rules li').forEach(li => { const ok = !!r[li.dataset.r]; li.classList.toggle('ok', ok); const sr = li.querySelector('.sr'); if (sr) sr.textContent = ok ? t('(met)') : t('(not met yet)'); }); }
  },
  'pub-check'(el) { UI.pub[el.dataset.k] = el.checked; authClear(el, el.dataset.k); },
  'pw-cur'(el) { pwForm().cur = el.value; }, 'pw-new'(el) { pwForm().next = el.value; },
  contact(el) { contactState()[el.dataset.k] = el.value; },
  'user-name'(el) { const v = el.value.trim(); if (!v) toast(t('I need something to call you. A nickname works.')); else if (v !== S.user.name) { S.user.name = v; toast(t('Got it. {name} it is.', { name: v })); } render(); },
  'user-notify'(el) { S.user.notify[el.dataset.k] = el.checked; render(); },
  // where reminders reach the person besides the app. Email is part of the account (the server reads it); a device is switched on and off in reminders.actions.js.
  'user-channel'(el) { S.user.channels = { ...(S.user.channels || {}), [el.dataset.k]: el.checked }; render(); },
  'modal-word'(el) { UI.modal.typed = el.value; $('modal-ok').disabled = !modalReady(); },
};
// A field changes the book it belongs to: the open panel's, or the page's (ui/lookups.js).
for (const k of Object.keys(C)) { const fn = C[k]; C[k] = el => inBook(bookKey(), () => fn(el)); }
