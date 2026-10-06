/* Dorax Finance — how a bank is shown next to an account: its own logo when the file is there, its colour and initials when it is not.
   The logos are NOT drawn here and must not be: a bank's logo is the bank's artwork. Each one is a file the owner downloads from the bank's
   own press or brand page and puts in app/assets/banks/ under the name given below (see the README in that folder). tools/build-banks.js
   lists the files that are there in js/data/bank-logos.js, so the app never asks for one that is missing.
   Until a bank's file is there, the account wears the bank's colour: enough to tell accounts apart at a glance, and no logo is imitated.
   The colours are close to each brand's main colour, taken from memory of their public material; check them against the brand guides
   when the logos are added. "ink" is the text colour that reads well on it (contrast of at least 4.5 to 1). */
const BANK_MARKS = {
  'Nubank':          { id: 'nubank',          short: 'NU', bg: '#820AD1', ink: '#FFFFFF' },
  'Banco do Brasil': { id: 'banco-do-brasil', short: 'BB', bg: '#F9DD16', ink: '#003DA5' },
  'Mercado Pago':    { id: 'mercado-pago',    short: 'MP', bg: '#009EE3', ink: '#111111' },
  'Santander':       { id: 'santander',       short: 'SA', bg: '#EC0000', ink: '#FFFFFF' },
  'Wise':            { id: 'wise',            short: 'WI', bg: '#9FE870', ink: '#163300' },
  'Itaú':            { id: 'itau',            short: 'IT', bg: '#EC7000', ink: '#111111' },
  'Bradesco':        { id: 'bradesco',        short: 'BR', bg: '#CC092F', ink: '#FFFFFF' },
  'Caixa':           { id: 'caixa',           short: 'CX', bg: '#005CA9', ink: '#FFFFFF' },
  'Inter':           { id: 'inter',           short: 'IN', bg: '#FF7A00', ink: '#111111' },
  'C6 Bank':         { id: 'c6-bank',         short: 'C6', bg: '#242424', ink: '#FFFFFF' },
};

/** The badge of an account's bank. The card does not write the bank's name anywhere else, so the badge carries it for screen readers
    and as a tooltip. A bank the app does not know ("Other", or one typed in an imported file) keeps the plain two letters. */
function bankMark(institution) {
  const name = String(institution || ''), b = BANK_MARKS[name], logo = b && typeof BANK_LOGOS !== 'undefined' && BANK_LOGOS[b.id];
  if (logo) return `<span class="inst pic" title="${esc(name)}"><img src="${esc(logo)}" alt="${esc(name)}" width="36" height="36" decoding="async"></span>`;
  if (b) return `<span class="inst bank" role="img" aria-label="${esc(name)}" title="${esc(name)}" style="background:${b.bg};color:${b.ink}">${b.short}</span>`;
  return `<span class="inst"${name ? ` role="img" aria-label="${esc(name)}" title="${esc(name)}"` : ''}>${esc(name.slice(0, 2).toUpperCase())}</span>`;
}
