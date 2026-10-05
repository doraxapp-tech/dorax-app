/* Dorax Finance — shared: which language a visit opens in. */
/** The browser's language, when it is one of the three the app speaks (owner, 2026-10-05: "make the landing page language based on the browser language
    or system"; a browser follows the system's language unless the person gave it another). A language the person chose on this device before wins over
    that, and once logged in the language kept with the account wins over both. A browser in any other language gets Portuguese: the product is for
    Brazil (owner, v35). The tests ask for a language (window.DORAX_LANG = 'en' | 'es' | 'pt'); any other value there means "as a visitor gets it". */
const LANG_KEY = 'dorax.lang';
function defaultLang() {
  const w = typeof window !== 'undefined' ? window.DORAX_LANG : null; if (w === 'en' || w === 'es' || w === 'pt') return w;
  try { const kept = localStorage.getItem(LANG_KEY); if (kept === 'en' || kept === 'es' || kept === 'pt') return kept; } catch (e) { /* no storage here: the browser's it is */ }
  return browserLang();
}
/** A language chosen before logging in is remembered on this device only: it is a convenience, not data. */
function rememberLang(lang) { try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* nothing to do */ } }
/** The first of the browser's languages, in the person's own order of preference, that the app speaks. Regional forms count as their language
    (pt-PT as Portuguese, es-419 as Spanish, en-GB as English). */
function browserLang() {
  const nav = typeof navigator !== 'undefined' ? navigator : {}, list = nav.languages && nav.languages.length ? nav.languages : [nav.language];
  for (const l of list) { const k = String(l || '').slice(0, 2).toLowerCase(); if (k === 'en' || k === 'es' || k === 'pt') return k; }
  return 'pt';
}
