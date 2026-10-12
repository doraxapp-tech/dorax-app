/* Dorax Finance — the panels opened from the summary "Bosque", as Transactions: the forest at the top, and what follows in a light sheet that rises
   over it (owner, 2026-10-12, with the account's panel: "me gustó esa combinación, úsala más seguido"; then, with screenshots of the notifications,
   More, "You can spend", the days of freedom and a fixed cost: "¿este es el nuevo diseño?", they only had the summary's colours). Each panel says
   where its sheet starts: what it shows first (the switch, the figure, the card, the buttons) stays on the forest, the details and the lists go
   into the sheet, and its buttons at the foot sit on the sheet's grey. Only while the summary or Transactions is on screen in this look (landOn,
   bosque-moves.js); everywhere else the panel is as it was. Styles: css/look/look-land-sheet.css. */
/** The lower part of a panel, in the light sheet with its handle, in this look; as it was otherwise. */
const bqSheet = inner => typeof landOn === 'function' && landOn() ? `<section class="bq-sheet"><span class="bq-grab" aria-hidden="true"></span>${inner}</section>` : inner;
