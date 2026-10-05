/* Dorax Finance — shared: which language a visit opens in. */
/** Portuguese (owner, v35: the product is for Brazil), unless the person chose another one on this device before. Once logged in, the language
    kept with the account wins. The tests ask for a language, or for the browser's (window.DORAX_LANG = 'browser'). */
const LANG_KEY = 'dorax.lang';
function defaultLang() {
  const w = typeof window !== 'undefined' ? window.DORAX_LANG : null; if (w === 'browser') return browserLang(); if (w === 'en' || w === 'es' || w === 'pt') return w;
  try { const kept = localStorage.getItem(LANG_KEY); if (kept === 'en' || kept === 'es' || kept === 'pt') return kept; } catch (e) { /* no storage here: the default it is */ }
  return 'pt';
}
/** A language chosen before logging in is remembered on this device only: it is a convenience, not data. */
function rememberLang(lang) { try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* nothing to do */ } }
function browserLang() {
  const nav = typeof navigator !== 'undefined' ? navigator : {}, list = nav.languages && nav.languages.length ? nav.languages : [nav.language];
  for (const l of list) { const k = String(l || '').slice(0, 2).toLowerCase(); if (k === 'en' || k === 'es' || k === 'pt') return k; }
  return 'en';
}
