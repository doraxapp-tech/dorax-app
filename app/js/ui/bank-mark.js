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
  // 2026-10-08 (owner: "add more Brazilian banks with their logos"): these six came with their logo files, and their colours were taken from those files
  'PicPay':          { id: 'picpay',          short: 'PP', bg: '#22C35E', ink: '#111111' },
  'BTG Pactual':     { id: 'btg-pactual',     short: 'BT', bg: '#195AB4', ink: '#FFFFFF' },
  'XP':              { id: 'xp',              short: 'XP', bg: '#101113', ink: '#FFFFFF' },
  'Sicredi':         { id: 'sicredi',         short: 'SI', bg: '#3F7C49', ink: '#FFFFFF' },
  'Agibank':         { id: 'agibank',         short: 'AG', bg: '#0065F5', ink: '#FFFFFF' },
  'Banco BV':        { id: 'bv',              short: 'BV', bg: '#4757A2', ink: '#FFFFFF' },
};

/** The badge of an account's bank. The card does not write the bank's name anywhere else, so the badge carries it for screen readers
    and as a tooltip. A bank the app does not know ("Other", or one typed in an imported file) keeps the plain two letters. */
function bankMark(institution, small) {
  const name = String(institution || ''), b = BANK_MARKS[name], logo = b && typeof BANK_LOGOS !== 'undefined' && BANK_LOGOS[b.id], sm = small ? ' sm' : '', px = small ? 20 : 36;
  if (logo) return `<span class="inst pic${sm}" title="${esc(name)}"><img src="${esc(logo)}" alt="${esc(name)}" width="${px}" height="${px}" decoding="async"></span>`;
  if (b) return `<span class="inst bank${sm}" role="img" aria-label="${esc(name)}" title="${esc(name)}" style="background:${b.bg};color:${b.ink}">${b.short}</span>`;
  return `<span class="inst"${name ? ` role="img" aria-label="${esc(name)}" title="${esc(name)}"` : ''}>${esc(name.slice(0, 2).toUpperCase())}</span>`;
}

// ---------- an account where a person scans rather than reads ----------
// 2026-10-08 (owner: "wherever it adds to the experience, put the bank's logo instead of its name: the person scans better and reads less; people
// scan better than they read"). In lines and lists, an account at a bank the app knows is shown as the bank's small mark followed by what is left of
// its name once the bank's name is taken out: "Tarjeta Nubank" is the Nubank mark and "Tarjeta", "Mercado Pago - Dylan" the Mercado Pago mark and
// "Dylan", an account called just "Santander" the mark alone. The full name stays as the tooltip, and the mark carries the bank's name for a screen
// reader, so "Nubank, Tarjeta" is still heard. A bank the app does not know keeps its name in words: two letters would say less than the name.
// Text that is not drawn (a toast, a select's options, a file) keeps the name as it is.
const nameFold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/** What is left of an account's name without its bank's name, without the dashes and dots that joined them. */
function acctRest(name, inst) {
  const chars = [...String(name || '')], k = nameFold(String(inst || '')), at = []; let f = '';
  chars.forEach((c, i) => { for (const y of nameFold(c)) { f += y; at.push(i); } });
  // the bank's name as a word of its own: "Inter" is not taken out of "Internacional"
  const word = c => /[\p{L}\p{N}]/u.test(c || ''); let j = k ? f.indexOf(k) : -1;
  while (j >= 0 && (word(chars[at[j] - 1]) || word(chars[at[j + k.length - 1] + 1]))) j = f.indexOf(k, j + 1);
  if (j < 0) return String(name || '');
  const s = at[j], e = at[j + k.length - 1] + 1, sep = /^[\s\-–—·|:,/]+|[\s\-–—·|:,/]+$/g;
  return (chars.slice(0, s).join('').replace(sep, '') + ' ' + chars.slice(e).join('').replace(sep, '')).replace(/\s+/g, ' ').trim();
}
/** An account in a line of text: the bank's mark and the rest of its name (full: the whole name, where the name is the line's title). */
function acctTag(a, full) {
  if (typeof a === 'string') a = acct(a);
  if (!a) return '';
  const name = String(a.name || ''), inst = String(a.institution || '');
  if (!BANK_MARKS[inst]) return esc(name);
  const rest = full ? name : acctRest(name, inst);
  return `<span class="atag" title="${esc(name)}">${bankMark(inst, true)}${rest ? `<span class="atag-n">${esc(rest)}</span>` : ''}</span>`;
}

