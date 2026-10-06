/* Dorax Finance — clicks: settings: OFX profiles, backup, deleting data. Joined into A in app/actions.js. */
const SETTINGS_ACTIONS = {
  // settings
  'edit-profile'(ds) {
    const p = S.ofxProfiles.find(x => x.id === ds.id);
    UI.drawer = { kind: 'profile', title: p ? t('Edit OFX profile') : t('New OFX profile'), isNew: !p, draft: p ? { ...p } : { id: null, name: '', version: '102', currency: 'BRL', bankId: '', branchId: '', accountId: '', accountType: 'CHECKING', institutionName: '', institutionId: '', language: 'POR', transferMapping: 'SIGN' } };
    renderOverlay();
  },
  'save-profile'() {
    const p = UI.drawer.draft;
    if (!p.name.trim()) return fail(t('Enter a profile name.'));
    if (!/^[A-Za-z]{3}$/.test(p.currency)) return fail(t('Currency must be a 3-letter code such as BRL.'));
    const next = { ...p, id: p.id || newId('p'), name: p.name.trim(), currency: p.currency.toUpperCase(), }, prev = S.ofxProfiles.find(x => x.id === next.id);
    if (prev) Object.assign(prev, next); else S.ofxProfiles.push(next);
    UI.drawer = null; toast(t('Profile saved.')); if (UI.conv && UI.conv.step === 3) generateForConv(); render();
  },
  'delete-profile'() {
    const id = UI.drawer.draft.id, pr = S.ofxProfiles.find(k => k.id === id); if (!pr) return;
    confirmBox({ title: t('Delete the profile {name}?', { name: pr.name }), text: t('Statements already exported are not affected. You can create the profile again.'), label: t('Delete profile'),
      run() { S.ofxProfiles = S.ofxProfiles.filter(k => k.id !== id); if (S.settings.defaultProfile === id) S.settings.defaultProfile = (S.ofxProfiles[0] || {}).id || null; if (UI.conv && UI.conv.profileId === id) UI.conv = null; UI.drawer = null; render(); } });
  },
  // The backup is the whole account, exactly as the server keeps it, in one file the person can keep for themselves and put back later.
  'export-json'() { saveFile(`dorax-finance-backup-${S.today}.json`, JSON.stringify({ app: 'dorax-finance', version: BACKUP_VERSION, exportedAt: S.today, state: S }, null, 1)); },
  wipe() {
    confirmBox({ critical: true, title: t('Delete all your data?'), text: t('Accounts, transactions, the plan, goals, FIIs and the import history are deleted from your account. This can’t be undone.'), label: t('Delete everything'), run: wipeAll });
  },
};
function wipeAll() {
    Object.keys(S.pay).forEach(y => { S.pay[y] = []; }); delete S.company; UI.space = 'personal';
    Object.assign(S, { accounts: [], transactions: [], imports: [], exports: [], closes: {}, recurringManual: [], recurringDismissed: [], goals: [], goalMoves: [], plan: { lines: [] }, fii: { assets: {}, moves: [], sim: {} } });
    UI.conv = UI.imp = UI.sheetImp = UI.rulePrompt = UI.sim = UI.undo = UI.dist = UI.inc = null; Object.assign(UI.fii, { ticker: '', kind: '', month: null }); toast(t('All financial data deleted.')); render();
}
