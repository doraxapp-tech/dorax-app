/* Dorax Finance — calculations: curiosities. Which short fact about money in Brazil to show next, and whether one is due at all. */
// ---------- curiosities ----------
// 2026-10-07 (owner: "financial curiosities can show like a push notification inside the app, and let the person choose more or less of them,
// so it is not spam"). The facts themselves, with their sources, are in features/ahead/curios.view.js; here is only the rhythm.
// What the person chose is kept with the account: user.curio = { rate, log: [{ id, day, t }] } (day: the account's date; t: the device's clock).
//   more    up to 3 a day, at least 30 minutes apart
//   normal  one a day
//   less    one a week
//   off     none
// 'normal' until the person says otherwise.
const CURIO_RATES = ['more', 'normal', 'less', 'off'];
// [id, side]: side 'company' is shown on the company's side only (facts about a MEI); the others on both.
/* [id, side, money]: side "company" for a fact about a company (shown only to someone with one); money "BRL" for a fact that quotes an amount a
   Brazilian law sets (the FGC's ceiling, the MEI's limit). Owner, 2026-10-17: "asegúrate que en los textos las monedas escritas en los textos
   (reales) cambien también dependiendo de la cuenta principal": the money in the words follows the main account, but an amount a law sets in reais
   cannot be put in another currency without becoming false, so those facts are shown only where money is counted in reais (the household's main
   currency; for a company's fact, a company side in reais). */
const CURIOS = [['fgc', '', 'BRL'], ['card', ''], ['savings', ''], ['overdraft', ''], ['thirteenth', ''], ['forgotten', ''], ['mei', 'company', 'BRL'], ['das', 'company']];
/** Whether a curiosity fits this person: its side (company: whether there is one) and, for an amount set in reais, money counted in reais. */
const curioFits = (state, c, company) => (c[1] !== 'company' || company) && (!c[2] || (c[1] === 'company' ? companyCurrencies(state).includes(c[2]) : currencyOf(state) === c[2]));
const curioRate = state => { const r = ((state.user || {}).curio || {}).rate; return CURIO_RATES.includes(r) ? r : 'normal'; };
/** Whether a curiosity may be shown now. today: the account's date; now: the device's clock, in milliseconds. */
function curioDue(state, today, now) {
  const rate = curioRate(state), log = ((state.user || {}).curio || {}).log || [];
  if (rate === 'off') return false;
  const onDay = log.filter(x => x.day === today).length, last = log.length ? log[log.length - 1] : null;
  if (rate === 'normal') return onDay === 0;
  if (rate === 'less') return !log.some(x => dayDiff(today, x.day) < 7 && dayDiff(today, x.day) >= 0);
  return onDay < 3 && (!last || !(now - last.t < 30 * 60000));
}
/** The next one for a side: the first never shown; once all were, the one shown longest ago. skip: one not to pick (the one on screen). */
function curioNext(state, company, skip) {
  const log = ((state.user || {}).curio || {}).log || [], ids = CURIOS.filter(c => curioFits(state, c, company) && c[0] !== skip).map(c => c[0]);
  const fresh = ids.find(id => !log.some(x => x.id === id)); if (fresh) return fresh;
  const at = id => { let k = -1; log.forEach((x, i) => { if (x.id === id) k = i; }); return k; };
  return ids.slice().sort((a, b) => at(a) - at(b))[0] || null;
}
/** Writes down that one was shown. The log keeps the last 40. */
function curioShown(state, id, today, now) {
  const u = state.user, c = u.curio = u.curio || {}; c.log = (c.log || []).concat({ id, day: today, t: now }).slice(-40);
}
/** One step fewer ("fewer of these"), or one step more. Returns the new rate. */
function curioStep(state, d) {
  const u = state.user, c = u.curio = u.curio || {}, i = CURIO_RATES.indexOf(curioRate(state)); c.rate = CURIO_RATES[Math.max(0, Math.min(CURIO_RATES.length - 1, i + d))]; return c.rate;
}
