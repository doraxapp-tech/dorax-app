/* Dorax Finance — the frame: panels and the phone sheet. */
// ---------- overlay: drawers and the mobile "More" sheet ----------
function renderOverlay() {
  const d = UI.drawer;
  let h = '';
  if (UI.sheet) h = `<div class="scrim" data-a="close"></div><div class="sheet" role="dialog" aria-label="${t('More')}"><div class="grab" aria-hidden="true"></div><nav class="nav">${navLinks(ROUTES.filter(r => !TABS.includes(r[0])))}</nav>
      <div class="sheet-row"><label for="lang-m">${icon('globe')}${t('Language')}</label><select id="lang-m" class="lang" data-c="setting" data-k="lang">${options(LANGS, S.settings.lang)}</select></div>
      <div class="sheet-row"><label for="theme-m">${icon(S.settings.theme === 'light' ? 'sun' : 'moon')}${t('Appearance')}</label><select id="theme-m" data-c="setting" data-k="theme">${options([['dark', t('Dark')], ['light', t('Light')]], S.settings.theme === 'light' ? 'light' : 'dark')}</select></div>
      <button class="sheet-out" data-a="logout">${icon('logout')}<span>${t('Log out')}</span></button></div>`;
  else if (d) h = `<div class="scrim" data-a="close"></div><aside class="drawer${d.pop ? ' pop' : ''}" role="dialog" aria-modal="true" aria-label="${esc(d.title)}"><div class="grab" aria-hidden="true"></div><header><h2>${esc(d.title)}</h2><button class="btn ghost sm" data-a="close" aria-label="${t('Close')}">${icon('x')}</button></header>${({ tx: txDrawer, account: accountDrawer, profile: profileDrawer, 'goal-form': goalFormDrawer, 'goal-view': goalViewDrawer, 'goal-move': goalMoveDrawer,
      'line-form': lineFormDrawer, 'line-view': lineViewDrawer, 'line-pay': linePayDrawer, 'fii-move': fiiMoveDrawer, 'fii-view': fiiViewDrawer, reminders: remindersDrawer, 'due-days': dueDaysDrawer, 'card-pay': cardPayDrawer, legal: legalDrawer, contact: contactDrawer, 'bank-start': bankStartDrawer, 'tx-filters': txFiltersDrawer })[d.kind](d)}</aside>`;
  const root = $('overlay'), open = !!h, was = UI.overlayOpen;
  clearTimeout(renderOverlay.t);
  if (!open && was && root.firstChild && !reducedMotion() && !UI.skipExit) {       // leave: quicker than the entrance, and it never blocks the page underneath
    root.classList.remove('in'); root.classList.add('out');
    renderOverlay.t = setTimeout(() => { root.innerHTML = ''; root.classList.remove('out'); setInert(); }, window.innerWidth <= 920 ? 230 : 170);   // a sheet has further to travel than a side panel
  } else { root.classList.remove('out'); root.classList.toggle('in', open && !was && !reducedMotion()); root.innerHTML = h; }
  UI.overlayOpen = open; UI.skipExit = false; setInert();
  if (open && !was) { const el = document.querySelector('#overlay .drawer header button, #overlay .sheet a'); if (el) el.focus(); }
}
/** While a dialog is open, only the dialog can be reached: the page, the tab bar and any panel underneath are inert. */
function setInert() {
  const modal = !!UI.modal, over = !!(UI.drawer || UI.sheet);
  document.querySelector('.app').inert = modal || over; $('tabbar').inert = modal || over; $('overlay').inert = modal || $('overlay').classList.contains('out');
}

const fail = m => { UI.drawer.error = m; renderOverlay(); };
function renderOverlayKeepFocus() { if (!deferring) return overlayNow(); if (!renderPending && !overlayPending) setTimeout(flushDeferred, 0); overlayPending = true; }
function overlayNow() {
  const a = document.activeElement, id = a && a.id, pos = id && a.selectionStart != null ? a.selectionStart : null;
  const body = document.querySelector('.drawer .body'), top = body ? body.scrollTop : 0;
  renderOverlay();
  const nb = document.querySelector('.drawer .body'); if (nb) nb.scrollTop = top;
  const el = id && $(id); if (el) { el.focus(); if (pos != null && el.setSelectionRange) try { el.setSelectionRange(pos, pos); } catch (e) { } }
}
