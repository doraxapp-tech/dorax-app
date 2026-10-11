/* Dorax Finance — clicks: Help (help.view.js). Joined into A in app/actions.js. */
const HELP_GO = {
  month: () => go('dashboard'),
  where: () => go('reports'),
  limit: () => B().plan.lines.some(l => l.pay === 'budget') ? A.limits() : A['plan-guide']({}),
  runway: () => { go('dashboard'); if (isPhone()) A['runway-view'](); else { const el = $('runway-card'); if (el) el.scrollIntoView({ block: 'center' }); } },
  goal: () => go('goals'),
  due: () => go('plan'),
  debt: () => { go('dashboard'); A['journey-open'](); },
  record: () => A['new-tx'](),
  import: () => go('imports'),
  sides: () => hasCompany() ? A.space({ v: UI.space === 'business' ? 'personal' : 'business' }) : A['co-open'](),
  notify: () => { go('profile'); const el = $('reminders-card'); if (el) el.scrollIntoView({ block: 'start' }); },
  safe: () => { go('profile'); const el = $('guard-card'); if (el) el.scrollIntoView({ block: 'start' }); },
};
const HELP_ACTIONS = {
  // the menu's "Help" (beside the person's name on a computer, in More on a phone): the questions, not the contact form (owner, 2026-10-10)
  help() { UI.menu = false; UI.sheet = false; UI.drawer = { kind: 'help', title: t('Help'), pop: true }; render(); },      // the panel puts the cursor on its own close button, like every panel
  'help-go'(ds) { const f = HELP_GO[ds.v]; if (!f) return; UI.drawer = null; renderOverlay(); f(); },
  'help-tour'() { UI.drawer = null; renderOverlay(); UI.tour = UI.route; renderTour(); },      // the screen's first-visit page, again (features/tours)
};
