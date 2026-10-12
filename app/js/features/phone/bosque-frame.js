/* Dorax Finance — every screen of the household on a phone in the light theme, in the summary's look (owner, 2026-10-12: "ok sigue con el resto
   de la webapp, haz el update al nuevo estilo"; then "en las demás pantallas no tienes que repetir los botones del menú superior de cambio de
   cuenta, campana, 3 puntos; analiza como hiciste en Transacciones y usa los que tengan sentido y le aporten al usuario").
   app/shell.js marks the page .land on every screen (and .land-page on those other than the summary and Transactions, which have their own):
   the forest top bar, the page's grey, the glass bar at the foot, the panels as the summary's (css/look/look-land*.css).
   The top bar: the side's switch, the bell and More are the summary's (it is where the day starts and where More leads from); each other screen
   keeps only what helps there:
     - Transactions: search and the filters (features/phone/bosque-moves.js);
     - Plan, Goals, Accounts & savings, Investments: their own "new" as a round lime + (a fixed cost, a goal, an account, a movement); the round +
       in the bar at the foot is not there in this look, and this is where a thumb looks for it on these screens;
     - Reports: nothing more than its month;
     - the screens reached from More (Accounts & savings, Investments, Recurring, Imports, Categories, Settings, Profile, Help…): a round ‹ before
       their name, back to where the person was (More is not on them: the summary's More is one tap away in the bar).
   The top of Plan, Goals and Reports (their figure, its tiles, their buttons or their switch) is on the forest, and the rest of the page rises over
   it as the light sheet (bqHero); the other screens have the forest bar and the sheet right under it. Styles: css/look/look-land-pages.css. */

/** The screen's own "new", by screen: [action, its data attributes, its name read aloud]. */
const BQ_NEW = () => ({ plan: ['line-new', '', t('New fixed cost')], goals: ['goal-new', '', t('New goal')], accounts: ['account-add', '', t('Add account')], investments: ['fii-move', 'data-kind="buy"', t('Record movement')] });
/** A screen of this look other than the summary and Transactions. */
const bqPageOn = () => typeof landOn === 'function' && landOn() && UI.route !== 'dashboard' && UI.route !== 'transactions';
/** The round buttons at the right of the top bar on a screen of this look. */
function bqPageTools() {
  if (UI.route === 'transactions') return bqTxTools();
  const n = BQ_NEW()[UI.route];
  return n ? `<button class="bq-tool bq-new" data-a="${n[0]}" ${n[1]} aria-label="${esc(n[2])}">${icon('plus')}</button>` : '';
}
/** Before the name of a screen reached from More: the way back to where the person was (the summary when there is nothing to go back to). */
function bqBack() {
  if (tabsNow().includes(UI.route)) return '';
  const p = typeof backForPage === 'function' ? backForPage() : null, say = p ? backSay(p) : t('Back to {name}', { name: routeLabel('dashboard') });
  return p ? `<button class="bq-tool bq-back" data-a="back" aria-label="${esc(say)}">${icon('left')}</button>` : `<a class="bq-tool bq-back" href="#dashboard" aria-label="${esc(say)}">${icon('left')}</a>`;
}
/** The top of a screen on the forest, the rest rising over it as the light sheet: in this look; as it was otherwise. */
const bqHero = inner => bqPageOn() ? `<section class="bq-hero">${inner}</section>` : inner;
