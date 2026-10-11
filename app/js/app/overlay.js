/* Dorax Finance — the frame: panels and the phone sheet. */
// ---------- overlay: drawers and the sheets of a phone ----------
// More, on a phone (the person, the app's places, the preferences, the account's buttons): features/phone/more-sheet.js
function renderOverlay() {
  const d = UI.drawer;
  let h = '';
  if (UI.sheet === 'quick') h = quickSheet();
  else if (UI.sheet === 'goal-pick') h = goalPickSheet();      // which goal to contribute to or withdraw from (features/phone/phone.goals.js)
  else if (UI.sheet === 'dash-order') h = dashOrderSheet();      // the order of the summary's parts (features/phone/phone.summary.js)
  else if (UI.sheet === 'fixed-list') h = fixedListSheet();      // the month's fixed costs and their details, from the summary (same file)
  else if (UI.sheet === 'goal-list') h = goalListSheet();
  else if (UI.sheet === 'acct-del') h = acctDelSheet();      // which account to delete, from a phone's Accounts (features/accounts/wallet.js)
  else if (UI.sheet === 'pay-pick') h = payPickSheet();      // which cost to mark as paid or to pay (features/phone/phone.plan.js)      // the goals and funds and their details, from the summary (same file)
  else if (UI.sheet) h = moreSheet();
  else if (d) h = inBook(d.book = d.book || bookKey(), () => `<div class="scrim" data-a="close"></div><aside class="drawer${d.pop ? ' pop' : ''}${d.full ? ' full' : ''}${d.wide ? ' wide' : ''}${d.mid ? ' mid' : ''}" role="dialog" aria-modal="true" aria-label="${esc(d.title)}"><div class="grab" aria-hidden="true"></div><header><span class="dr-back-slot">${backPanelButton()}</span><h2>${esc(d.title)}</h2><button class="btn ghost sm" data-a="close" aria-label="${t('Close')}">${icon('x')}</button></header>${({ tx: txDrawer, account: accountDrawer, profile: profileDrawer, 'goal-form': goalFormDrawer, 'goal-view': goalViewDrawer, 'goal-move': goalMoveDrawer,
      'line-form': lineFormDrawer, 'line-view': lineViewDrawer, 'pay-row': payRowDrawer, 'line-pay': linePayDrawer, 'fii-move': fiiMoveDrawer, 'fii-view': fiiViewDrawer, reminders: remindersDrawer, install: installDrawer, 'due-days': dueDaysDrawer, 'card-pay': cardPayDrawer, legal: legalDrawer, contact: contactDrawer, 'bank-start': bankStartDrawer, 'tx-filters': txFiltersDrawer, pairs: pairsDrawer, runway: runwayDrawer, 'runway-view': runwayViewDrawer, 'wallet-pick': walletPickDrawer, 'card-view': cardViewDrawer, 'dash-order': dashOrderDrawer, whatif: whatIfDrawer, company: companyDrawer, kpi: kpiDrawer, journey: journeyDrawer, help: helpDrawer, 'free-view': freeDrawer, limits: limitsDrawer, limit: limitDrawer, 'plan-guide': planGuideDrawer, 'cat-icon': catIconDrawer, issue: issueDrawer, 'yearly-form': yearlyFormDrawer, 'yearly-view': yearlyViewDrawer, 'yearly-pay': yearlyPayDrawer, 'month-close': monthCloseDrawer, 'plan-income': planIncomeDrawer, 'plan-year': planYearDrawer, 'debt-form': debtFormDrawer, 'debt-pay': debtPayDrawer, 'sprint-form': sprintFormDrawer })[d.kind](d)}</aside>`);
  const root = $('overlay'), open = !!h, was = UI.overlayOpen;
  // a panel that becomes another one while it stays open: forward when the new one goes back to it (d.back), back when the old one did
  const prev = renderOverlay.prev, step = open && was && d && !UI.sheet && prev && prev.kind !== d.kind ? (d.back ? 1 : prev.back ? -1 : 1) : 0;
  renderOverlay.prev = d && !UI.sheet ? { kind: d.kind, back: !!d.back } : null;
  clearTimeout(renderOverlay.t);
  if (!open && was && root.firstChild && !reducedMotion() && !UI.skipExit) {       // leave: quicker than the entrance, and it never blocks the page underneath
    root.classList.remove('in'); root.classList.add('out');
    renderOverlay.t = setTimeout(() => { root.innerHTML = ''; root.classList.remove('out'); setInert(); }, window.innerWidth <= 920 ? 230 : 170);   // a sheet has further to travel than a side panel
  } else { root.classList.remove('out'); root.classList.toggle('in', open && !was && !reducedMotion()); root.innerHTML = h; }
  UI.overlayOpen = open; UI.skipExit = false; setInert();
  // the field a refusal pointed at (fail, below): red, and the reason right under it, where the cursor and the eyes are; on a phone the top of a
  // long panel is out of sight. A refusal with no field keeps its reason at the top.
  if (d && d.invalid && !UI.sheet) { const bad = $(d.invalid); if (bad) { bad.setAttribute('aria-invalid', 'true'); const f = bad.closest('.field'), msg = d.error && document.querySelector('#overlay .drawer .body > .banner.crit:first-child');
    if (f && msg) { msg.id = 'fail-msg'; msg.setAttribute('role', 'alert'); msg.classList.add('at-field'); f.after(msg); if (!/fail-msg/.test(bad.getAttribute('aria-describedby') || '')) bad.setAttribute('aria-describedby', ((bad.getAttribute('aria-describedby') || '') + ' fail-msg').trim()); } } }
  if (step) panelStep(step);
  if (open && !was) { const el = document.querySelector('#overlay .drawer header button, #overlay .sheet a'); if (el) el.focus(); }
}
/** While a dialog is open, only the dialog can be reached: the page, the tab bar and any panel underneath are inert. */
function setInert() {
  const modal = !!UI.modal, over = !!(UI.drawer || UI.sheet || UI.find);      // the search is a panel over the page like the others
  document.querySelector('.app').inert = modal || over; $('tabbar').inert = modal || over; $('overlay').inert = modal || $('overlay').classList.contains('out');
}

/** A form that cannot be saved: why, at the top, and the cursor on the field to fix. The field stays marked (red) through any drawing of the panel,
    until something is typed or chosen in it (app/events.js). */
const fail = (m, id) => { UI.drawer.error = m; UI.drawer.invalid = id || null; renderOverlay(); const el = id && $(id); if (el) { el.focus({ preventScroll: true }); if (el.scrollIntoView) el.scrollIntoView({ block: 'center' }); } };
function renderOverlayKeepFocus() { if (!deferring) return overlayNow(); if (!renderPending && !overlayPending) setTimeout(flushDeferred, 0); overlayPending = true; }
function overlayNow() {
  const a = document.activeElement, id = a && a.id, pos = id && a.selectionStart != null ? a.selectionStart : null;
  const body = document.querySelector('.drawer .body'), top = body ? body.scrollTop : 0;
  renderOverlay();
  const nb = document.querySelector('.drawer .body'); if (nb) nb.scrollTop = top;
  const el = id && $(id); if (el) { el.focus(); if (pos != null && el.setSelectionRange) try { el.setSelectionRange(pos, pos); } catch (e) { } }
}
