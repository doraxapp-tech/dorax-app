/* Dorax Finance — clicks: what is wrong, in the bell (issues.view.js). ISSUE_ACTIONS joins A in app/actions.js. issuesMaybe runs after every press
   and every change of a field (app/events.js): an issue that was not there a moment ago rings the bell and says so once, with the way to it. */
const issueGoTo = (route, id) => { UI.drawer = null; UI.sheet = false; renderOverlay(); navigate(route); const el = id && $(id); if (el) el.scrollIntoView({ block: 'start' }); };
const issueById = id => bellItems().find(x => x.id === id);
/** Where each way of solving it goes. */
const ISSUE_FIX = {
  limits: () => issueGoTo('plan', 'limits-card'),
  saving: () => { UI.drawer = null; navigate('plan'); A['plan-guide']({ step: '1' }); },
  income: () => { issueGoTo('plan'); const el = document.querySelector('.payrows, #ph-income, .ph-income'); if (el) (el.closest('section') || el).scrollIntoView({ block: 'start' }); },
  bills: () => issueGoTo('plan', 'paylist'),
  guide: () => { UI.drawer = null; navigate('plan'); A['plan-guide']({}); },
  free: () => { UI.drawer = null; renderOverlay(); navigate('dashboard'); A['free-view'](); },
  transfer: () => { UI.drawer = null; renderOverlay(); A['quick-go']({ v: 'transfer' }); },
  goals: () => issueGoTo('goals'),
  account: r => { UI.drawer = null; renderOverlay(); A['view-account']({ id: r.accountId }); },
  'account-edit': r => { UI.drawer = null; renderOverlay(); navigate('accounts'); A['edit-account']({ id: r.accountId }); },
  classify: () => { UI.drawer = null; renderOverlay(); navigate('transactions'); A['tx-inbox'](); },
  rules: () => issueGoTo('categories', 'cat-rules'),
  'budget-tx': r => { UI.drawer = null; renderOverlay(); A['filter-cat']({ cat: r.categoryId || '' }); },
  'yearly-pay': r => { UI.drawer = null; navigate('goals'); A['yearly-pay']({ id: r.goalId }); },
  'yearly-view': r => { UI.drawer = null; navigate('goals'); A['yearly-open']({ id: r.goalId }); },
  'budget-raise': r => { const l = B().plan.lines.find(k => k.id === r.lineId); UI.drawer = null; navigate('plan'); if (l) A['limit-open']({ cat: l.categoryId, sub: l.subcategoryId || '' }); },
};
const ISSUE_ACTIONS = {
  /** A row of the bell: what is going on and how to solve it. */
  'issue-open'(ds) { const r = issueById(ds.id); if (!r) return; UI.sheet = false; UI.drawer = { kind: 'issue', id: r.id, title: issueTitle(r), back: true }; renderOverlay(); const el = document.querySelector('.iss-fix.first'); if (el) el.focus({ preventScroll: true }); },
  /** One way of solving it: there, with one tap. */
  'issue-fix'(ds) { const r = issueById(ds.id), go = ISSUE_FIX[ds.v]; if (r && go) go(r); },
  /** "Not today": out of the bell until tomorrow, like a reminder. */
  'issue-snooze'(ds) { remindCfg().snoozed[ds.id] = S.today; A.reminders(); toast(t('Put off until tomorrow.')); },
  /** The toast's "See": the issue that just appeared. */
  'issue-latest'() { if (UI.issueLatest) A['issue-open']({ id: UI.issueLatest }); },
};
/** The issues and the limits past their end, as they are now. */
const issuesNow = () => UI.session && typeof activeReminders === 'function' ? activeReminders().filter(r => r.kind === 'issue' || (r.kind === 'budget' && r.when === 'over')) : [];
let ISSUES_SEEN = null;
/** After a press or a change: an issue that was not there a moment ago rings the bell and says so (owner: "notified in the bell immediately"). The
    first look of a visit announces nothing: the bell already counts what was there. */
function issuesMaybe() {
  if (!UI.session || (typeof LOCK !== 'undefined' && LOCK.on)) { ISSUES_SEEN = null; return; }
  const now = issuesNow(), ids = new Set(now.map(r => r.id));
  if (ISSUES_SEEN === null) { ISSUES_SEEN = ids; return; }
  const fresh = now.filter(r => !ISSUES_SEEN.has(r.id)); ISSUES_SEEN = ids;
  if (!fresh.length) return;
  UI.issueLatest = fresh[0].id;
  const bell = document.querySelector('.bell'); if (bell && !reducedMotion()) { bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring'); setTimeout(() => bell.classList.remove('ring'), 1200); }
  const r = fresh[0]; if (!UI.toast || !UI.toast.action) toast(r.kind === 'budget' ? issueTitle(r) + '. ' + issueLine(r) : issueLine(r), { a: 'issue-latest', label: t('See') });
}
