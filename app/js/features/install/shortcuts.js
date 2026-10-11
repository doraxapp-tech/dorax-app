/* Dorax Finance — the shortcuts of the app's icon (owner, 2026-10-10, the first batch of "what more can help": "Registrar gasto" and "Importar
   extrato" when the icon is held down). The manifest (manifest.webmanifest: shortcuts) opens the app with ?do=expense or ?do=import; here, once
   the account is open, that becomes the expense form or the Imports screen, and the address goes back to plain. Android shows them; an iPhone
   does not offer shortcuts for a web app, and nothing changes there. */
const SHORTCUTS = { expense: () => A['quick-go']({ v: 'expense' }), import: () => navigate('imports') };
function shortcutArrival() {
  let what = null; try { const m = /[?&]do=(\w+)/.exec(location.search); what = m && SHORTCUTS[m[1]] ? m[1] : null; if (m) history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* a sandboxed frame keeps its address */ }
  if (what && UI.session) SHORTCUTS[what]();
}
