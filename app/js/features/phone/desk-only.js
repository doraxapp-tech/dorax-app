/* Dorax Finance — what a phone does not do (owner, 2026-10-07: "the whole mobile version must be thought out and optimised for the thumb; if
   something does not fit or has limits, the person will have to use a computer. This is for the less important parts, of course").
   The rule: on a phone every part either works under a thumb (targets of 44 px, text of 12 px, nothing to drag sideways to read or fill in)
   or is not there, and a short note says it is on the computer and what the phone does instead. Never a cramped copy of the computer's screen.
   ONE LIST decides what goes to the computer. To bring a part back to phones, take its name out of DESK_ONLY: nothing else changes.
   A phone here is a screen up to 640 px wide. A tablet (641 to 920 px) has the phone's frame but is wide enough for these parts. */
const DESK_ONLY = [
  'plan-year',     // Plan: the year, twelve months side by side, a cell to type in for every bill and month
  'goal-year',     // Savings & goals: the same grid for what is put aside each month
  'rules',         // Categories & rules: the table of rules and its form (a rule is still offered on the phone when a transaction changes group)
  'sheet',         // a spreadsheet (plan, goals, investments) brought in: on a phone Imports takes bank statements only (imports.phone.js)
  // 'imports' came back to phones on 2026-10-10 (owner: "let phone users import from the phone, as simple as possible"): a phone has its own
  // screen for it, one button and a review of only what needs a look (features/imports/imports.phone.js)
  'converter',     // Statement converter: a file in, a review row by row, a file out
  'openfinance',   // Open Finance: what the bank sends is reviewed in the same wide table as an imported statement
];
const DESK_MQ = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
const smallPhone = () => !!(DESK_MQ && DESK_MQ.matches);
/** True when this part is left to the computer on the screen in use. */
const deskOnly = key => smallPhone() && DESK_ONLY.includes(key);
if (DESK_MQ) { const again = () => { if (typeof UI !== 'undefined' && UI.session) render(); }; if (DESK_MQ.addEventListener) DESK_MQ.addEventListener('change', again); else if (DESK_MQ.addListener) DESK_MQ.addListener(again); }
const DESK_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>';
/** What each part says in its place: what is on the computer, why, and what the phone does instead. */
function deskSays(key) {
  const owed = () => { const ym = addMonths(ymOf(S.today), -1), c = closeInfo(ym); return c.total ? ' ' + t('{month}: {sent} of {total} sent.', { month: fmt.month(ym), sent: c.sent, total: c.total }) : ''; };
  return ({
    'plan-year': [t('The year, month by month, is on the computer'), t('Twelve months side by side need a wide screen. Here you see this month, pay its bills and change a bill by opening it.')],
    'goal-year': [t('The savings plan for the year is on the computer'), t('Twelve months side by side need a wide screen. Here you put money aside and follow each goal.')],
    'rules': [t('Rules are managed on the computer'), tn(S.rules.filter(r => r.active).length, '{n} rule is at work.', '{n} rules are at work.') + ' ' + t('On the phone a new rule is offered when you change the category of a transaction.')],
    'sheet': [t('Bringing files in is done on the computer'), t('A spreadsheet (plan, goals, investments) is brought in on the computer.')],
    'imports': [t('Bringing files in is done on the computer'), t('A statement or a spreadsheet is reviewed row by row before anything is recorded, and that needs a wide screen. On the phone you record as you go: the round + and one sentence.')],
    'converter': [t('The statement converter is on the computer'), t('Converting a statement means reviewing it row by row and saving a file: work for a wide screen.') + owed()],
    'openfinance': [t('Connecting a bank is done on the computer'), t('What the bank sends is reviewed row by row before anything is recorded, and that needs a wide screen.')],
  })[key];
}
/** The note that stands where the part would be. `page` makes it the whole screen's content. */
function deskNote(key, page) {
  const [title, text] = deskSays(key);
  return `<section class="card desk-note${page ? ' page' : ''}" id="desk-${key}">${DESK_ICON}<div><h2>${title}</h2><p>${text}</p></div></section>`;
}
/** A screen's markup with one of its sections replaced by the note, when that section is left to the computer. The section runs from `start`
    to `end` (or to the end of the screen). */
function deskCut(html, key, start, end) {
  if (!deskOnly(key)) return html;
  const a = html.indexOf(start); if (a < 0) return html;
  const b = end ? html.indexOf(end, a) : -1;
  return html.slice(0, a) + deskNote(key) + (b < 0 ? '' : html.slice(b));
}
