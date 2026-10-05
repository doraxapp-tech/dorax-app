/* Dorax Finance — the Weave pattern behind the public pages. */
// ---------- the Weave: the pattern of the logo book (owner, v37: "use the wave pattern to add some branding to the home page, login, sign-up, onboarding") ----------
// As drawn in the Dorax Logo Book, section 10: the logo's quarter arc on a square grid, in two orientations, joined into flowing lines; #1C1C1C on black, the stroke a
// quarter of the cell. Where a ring closes, its top-left quarter is green, as in the d of the logo; three at most on a surface. One pattern per surface, never under body text.
// `rings` are the grid points where a ring is closed on purpose. Any ring that closes by chance elsewhere is opened again, so the green ones are the only whole rings.
const WEAVES = {};
function weave(key, cols, rows, seed, rings) {
  if (WEAVES[key]) return WEAVES[key];
  let a = seed >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const C = 72, R = 36, o = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rnd() < .5));      // true: the arcs turn round the cell's top-left and bottom-right corners
  const want = rings.filter(([c, r]) => c > 0 && r > 0 && c < cols && r < rows), isWanted = (c, r) => want.some(w => w[0] === c && w[1] === r), locked = new Set();
  want.forEach(([c, r]) => { o[r - 1][c - 1] = true; o[r - 1][c] = false; o[r][c - 1] = false; o[r][c] = true; [[c - 1, r - 1], [c, r - 1], [c - 1, r], [c, r]].forEach(k => locked.add(k.join())); });
  const closed = (c, r) => o[r - 1][c - 1] && !o[r - 1][c] && !o[r][c - 1] && o[r][c];
  for (let pass = 0, again = true; again && pass < 8; pass++) { again = false;
    for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) if (closed(c, r) && !isWanted(c, r)) { const free = [[c, r], [c - 1, r], [c, r - 1], [c - 1, r - 1]].find(k => !locked.has(k.join())); if (free) { o[free[1]][free[0]] = !o[free[1]][free[0]]; again = true; } } }
  let d = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = c * C, y = r * C;
    d += o[r][c] ? `M${x + R} ${y}A36 36 0 0 1 ${x} ${y + R}M${x + R} ${y + C}A36 36 0 0 1 ${x + C} ${y + R}` : `M${x + C} ${y + R}A36 36 0 0 1 ${x + R} ${y}M${x} ${y + R}A36 36 0 0 1 ${x + R} ${y + C}`; }
  const g = want.map(([c, r]) => `M${c * C - R} ${r * C}A36 36 0 0 1 ${c * C} ${r * C - R}`).join('');
  return WEAVES[key] = `<div class="weave-bg wv-${key}" aria-hidden="true"><svg class="weave" style="--cols:${cols}" viewBox="0 0 ${cols * C} ${rows * C}" focusable="false"><g fill="none" stroke-width="18"><path class="wv-line" d="${d}"/><path class="wv-q" d="${g}"/></g></svg></div>`;
}
// the three places it is used: beside the home page's headline (round the phone, clear of the text), in the closing panel, and round the card of the login, sign-up and first-time setup
const weaveHero = () => weave('hero', 34, 14, 20261004, [[25, 3], [27, 6]]);
const weaveEnd = () => weave('end', 28, 10, 7, [[3, 4], [25, 6]]);
const weaveAuth = () => weave('auth', 36, 22, 31, [[12, 8], [26, 6], [24, 15]]);
