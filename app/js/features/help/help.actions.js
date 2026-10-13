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
  notify: () => { go('settings/notifications'); const el = $('reminders-card'); if (el) el.scrollIntoView({ block: 'start' }); },
  safe: () => { go('settings/security'); const el = $('guard-card'); if (el) el.scrollIntoView({ block: 'start' }); },
  // the Help center's own (v209)
  accounts: () => go('accounts'),
  imports: () => go('settings/imports'),
  data: () => go('settings/data'),
  general: () => go('settings/general'),
  profile: () => go('profile'),
};
const HELP_ACTIONS = {
  // the menu's "Help" (beside the person's name on a computer, in More on a phone): the questions, not the contact form (owner, 2026-10-10)
  // since v209 the Help center, a page of the website (help-center.js), opened over the app from the menu beside the name, More on a phone and the
  // search, at its address (/ajuda): the browser's Back or "Back to Dorax" returns to the app where it was
  help() { UI.menu = false; UI.sheet = false; UI.drawer = null; UI.helpQ = ''; UI.hcTopic = ''; UI.webBlog = false; UI.webHelp = true; UI.webHelpPushed = PAGES.on && PAGES.read() !== 'help'; PAGES.push = UI.webHelpPushed; render(); window.scrollTo(0, 0); const h = $('hc-title'); if (h) h.focus({ preventScroll: true }); },
  'help-close'() { if (!UI.webHelp) return; if (UI.webHelpPushed) { UI.webHelpPushed = false; history.back(); return; } helpWebClose(); },
  /** A topic of the center: its own page (help-center.js). */
  'hc-topic'(ds) { if (helpTopics().some(x => x[0] === ds.v)) hcShow(ds.v, true); },
  /** Back to the center's first page: before login the browser's own step back, when the topic was one (ui/pages.js follows it). */
  'hc-home'() { let st = null; try { st = history.state; } catch (e) { } if (!UI.session && PAGES.on && st && st.hc) history.back(); else hcShow('', false); },
  /** A word people look for, under the search: typed into it, and what it finds is shown. */
  /** The search emptied: the topics again, the field keeps the focus. */
  'hc-clear'() { const el = $('hc-q'); UI.helpQ = ''; if (el) { el.value = ''; el.focus({ preventScroll: true }); } hcRedraw(); },
  'hc-find'(ds) { const el = $('hc-q'); UI.helpQ = ds.v; if (el) { el.value = ds.v; if (!(window.matchMedia && matchMedia('(pointer: coarse)').matches)) el.focus({ preventScroll: true }); } hcRedraw(); },      // on a touch screen the keyboard would cover what was found
  'help-go'(ds) { const f = HELP_GO[ds.v]; if (!f) return; if (UI.webHelp) helpWebClose(); UI.drawer = null; renderOverlay(); f(); },      // from the Help center opened over the app: the app again, at the answer's place
  'help-tour'() { UI.drawer = null; renderOverlay(); UI.tour = UI.route; renderTour(); },      // the screen's first-visit page, again (features/tours)
};
/** The Help center opened over the app goes away: the app comes back on the screen it was on, at the app's own address. */
function helpWebClose() { UI.webHelp = false; UI.webHelpPushed = false; UI.helpQ = ''; UI.hcTopic = ''; navigate(UI.route === 'settings' && UI.setSec ? 'settings/' + UI.setSec : UI.route); }
