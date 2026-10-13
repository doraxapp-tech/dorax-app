/* Dorax Finance — the cents of a big figure, drawn small (2026-10-11, the second look across the app; owner: "en este mismo lenguaje visual, en todas
   las páginas de la webapp"). As on the home page: "R$ 29.075" and, smaller, ",83". After each drawing, the big figures (the tiles' values, the
   balance at the top of a phone) get their two decimals in a <small class="cents">. Only an element whose whole content is one amount is touched,
   and its words do not change (the same textContent), so nothing that reads it is affected. */
const CENTS_SEL = '.kpi .value, .tile .value, .bar-bal .bb-link b, .dk-big';      // .dk-big: the figure of a computer's page in the summary's look (v203)
function centsSmall(root) {
  (root || document).querySelectorAll(CENTS_SEL).forEach(el => {
    if (el.children.length) return;
    const s = el.textContent, m = /^(\s*[\s\S]*\d)([.,]\d{2})(\s*)$/.exec(s); if (!m) return;
    el.innerHTML = `${esc(m[1])}<small class="cents">${m[2]}</small>${m[3]}`;
  });
}
