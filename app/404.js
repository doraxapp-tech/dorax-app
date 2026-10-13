/* Dorax Finance — the page for an address that does not exist (404.html), in the visitor's language: the one chosen on this device before
   (ui/language.js keeps it as "dorax.lang"), else the browser's first one Dorax speaks, else Portuguese, as the rest of the site. */
(function () {
  var T = {
    es: { title: 'Página no encontrada · Dorax Finance', eyebrow: 'Error 404', h1a: 'Esta página no existe.', h1b: 'Pero el camino de vuelta, sí.', lead: 'La dirección puede estar mal escrita, o la página cambió de lugar.', home: 'Ir al inicio', help: 'Centro de ayuda', blog: 'Blog' },
    en: { title: 'Page not found · Dorax Finance', eyebrow: 'Error 404', h1a: 'This page does not exist.', h1b: 'But the way back does.', lead: 'The address may be mistyped, or the page has moved.', home: 'Go to the home page', help: 'Help center', blog: 'Blog' }
  };
  var lang = 'pt';
  try { var kept = localStorage.getItem('dorax.lang'); if (kept === 'pt' || kept === 'es' || kept === 'en') lang = kept; else throw 0; }
  catch (e) { var list = navigator.languages || [navigator.language || '']; for (var i = 0; i < list.length; i++) { var l = String(list[i]).slice(0, 2).toLowerCase(); if (l === 'pt' || l === 'es' || l === 'en') { lang = l; break; } } }
  var w = T[lang]; if (!w) return;
  document.documentElement.lang = lang; document.title = w.title;
  var els = document.querySelectorAll('[data-t]'); for (var j = 0; j < els.length; j++) { var k = els[j].getAttribute('data-t'); if (w[k]) els[j].textContent = w[k]; }
})();
