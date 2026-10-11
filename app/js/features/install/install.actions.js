/* Dorax Finance — clicks: putting the app on the home screen. Joined into A in app/actions.js. */
const INSTALL_ACTIONS = {
  /** The banner's button. Where the browser made its offer (Android), its own "Install" box opens; everywhere else, the steps. */
  async 'install-add'() {
    if (INSTALL.kind() === 'android' && INSTALL.canPrompt()) {
      const r = await INSTALL.prompt();
      if (r === 'accepted') { INSTALL.close(); toast(t('Done. Dorax is on your home screen.')); return render(); }
      if (r === 'dismissed') return render();      // said no to the browser's box: the banner stays, to be closed or used later
    }
    UI.drawer = { kind: 'install', title: t('Add Dorax to your home screen') }; renderOverlay();
  },
  /** Closed for good on this device. */
  'install-close'() { INSTALL.close(); if (UI.drawer && UI.drawer.kind === 'install') UI.drawer = null; render(); },
};
