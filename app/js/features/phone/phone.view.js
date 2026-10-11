/* Dorax Finance — the phone's own version of the app's frame (owner, 2026-10-07: "separate the mobile version too: intuitive, easy to use, fun in a
   way, with the main and most important functions in the palm of the person's hand"; and later the same day: "make sure the dashboards are not in
   the same file, they must be separate, and the mobile version too").
   A phone is any screen up to 920 px wide. What belongs to it lives in this folder and in css/screens/phone.css:
     phone.view.js      the panel at the top, the quick things to do, the day's insight as a signal that opens
     phone.home.js      the household's dashboard on a phone
     phone.company.js   the company's dashboard on a phone
     phone.actions.js   what its buttons do
   A computer draws none of it. */
const PHONE_MQ = window.matchMedia ? window.matchMedia('(max-width: 920px)') : null;
const isPhone = () => !!(PHONE_MQ && PHONE_MQ.matches);
// a window made narrower or wider across the line is drawn again, as the other version
if (PHONE_MQ) { const again = () => { if (typeof UI !== 'undefined' && UI.session) render(); }; if (PHONE_MQ.addEventListener) PHONE_MQ.addEventListener('change', again); else if (PHONE_MQ.addListener) PHONE_MQ.addListener(again); }

/** The top of the page is a panel in the colour of the side in use (owner: "a top panel, green, with the person's name, their picture, the switch,
    the bell and the three dots, and everything else below"): who is using it, the bell and More in the row that stays on screen, and, for someone
    who has a company, the same Household | Company choice as the menu's (sideSwitch, app/shell.js) right under it. The name leads to the profile. */
function barWho() {
  const h = new Date().getHours(), name = esc(firstName(S.user.name) || S.user.email || t('Profile'));
  return `<a class="bar-who" href="#profile" aria-label="${t('Profile')}: ${name}">${avatar()}<span class="bw-t"><small>${h < 12 ? t('Good morning') : h < 19 ? t('Good afternoon') : t('Good evening')}</small><b>${name}</b></span></a>`;
}

/** Household | Company on a phone is a button beside the bell, two arrows going opposite ways (owner, 2026-10-08: "take the switch out of the top
    banner, put a button beside the bell with two opposite arrows"). It goes to the other side, with the same loading screen as the menu's choice.
    Only for someone who said they have a company: with none there is nothing to switch to. A computer keeps the choice at the top of its menu. */
function sideFlip() {
  if (!hasCompany()) return '';
  const co = UI.space === 'business';
  return `<button class="side-flip" data-a="space" data-v="${co ? 'personal' : 'business'}" aria-label="${co ? t('Switch to Household') : t('Switch to Company')}">${icon('swap')}</button>`;
}
/** Where the switch was: the side's net balance, large and white in the middle, with the eye that hides or shows every amount in the app (fmt.money, ui/format.js).
    A tap on the balance opens Accounts. The household's is in reais; the company's in the currency its page is in. */
function barBalance() { return inBook(pageBookKey(), barBalanceIn); }      // the page's book: its currency and its accounts
function barBalanceIn() {
  const co = UI.space === 'business', cur = co ? BCUR() : CUR, list = co ? bookAccounts() : personal().filter(a => a.currency === cur);
  const total = list.reduce((s, a) => s + accountBalance(S, a.id, S.today), 0), hide = numsHidden(), shown = fmt.money(total, cur);
  // large and white in the middle of the screen (owner, 2026-10-09); an amount longer than "R$ 123.456,78" takes a smaller size, so it stays whole
  return `<a class="bb-link" href="#accounts" aria-label="${esc(co ? t('Company net balance') : t('Household net balance'))}: ${esc(shown)}. ${esc(t('Open accounts'))}"><small>${co ? t('Company net balance') : t('Household net balance')}</small><b class="num${total < 0 && !hide ? ' neg' : ''}${shown.length > 13 ? ' long' : ''}">${shown}</b></a>
    <button class="bb-eye" data-a="nums-toggle" aria-pressed="${hide}" aria-label="${hide ? t('Show the amounts') : t('Hide the amounts')}">${icon(hide ? 'eyeoff' : 'eye')}</button>${co && coBalRow() ? spaceSwitch() : ''}`;      // the company's: on the left, its currency on the right (app/shell.js)
}
/** The company's balance shares its row with the currency: when the figure would not fit beside it, its size comes down until it does (a narrow
    phone, a long amount), so it is always seen whole, never cut. */
function fitCoBal() {
  const box = document.querySelector('.bar-bal.co'), b = box && box.querySelector('.bb-link b'); if (!b) return;
  b.style.fontSize = ''; const cs = getComputedStyle(box), sw = box.querySelector('.space'), eye = box.querySelector('.bb-eye');
  const room = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (sw ? sw.offsetWidth + 10 : 0) - (eye ? eye.offsetWidth + 2 : 0), need = b.scrollWidth;
  if (room > 0 && need > room) b.style.fontSize = Math.max(12, Math.floor(parseFloat(getComputedStyle(b).fontSize) * room / need * 0.98)) + 'px';
}
window.addEventListener('resize', () => fitCoBal(), { passive: true });      // turned sideways, or a window made narrower
/** The same eye on a computer, at the end of the side bar's logo row (the top bar has no room for it at 960px on the company's side), so amounts
    hidden on this device can be shown again at any width. */
const numsButton = () => `<button class="nums-btn iconbtn" data-a="nums-toggle" aria-pressed="${numsHidden()}" aria-label="${numsHidden() ? t('Show the amounts') : t('Hide the amounts')}">${icon(numsHidden() ? 'eyeoff' : 'eye')}</button>`;
/** Said once, the first time the company's side opens after the person says they have one (owner: "make sure to tell the user that this is where
    to switch, when they say they have a company"). On a phone it points at the button beside the bell, which pulses for a moment; on a computer, at
    the choice at the top of the menu. */
function sideTipShow() {
  if (S.user.sideTip || window.DORAX_QUIET === true || !UI.session) return;
  S.user.sideTip = true; save(); UI.curio = { ask: 'side' }; renderCurio();
  const b = document.querySelector('.navbar .side-flip'); if (b && isPhone()) { b.classList.add('pulse'); setTimeout(() => b.classList.remove('pulse'), 4200); }
}
function sideTipCard() {
  return `<aside class="curio nudge" id="curio" role="status" aria-label="${t('Household and Company')}"><span class="fl-ico">${icon('swap')}</span><div class="grow"><b>${t('Household and Company, one tap apart')}</b>
      <p>${isPhone() ? t('Switch between them with the button with two arrows, next to the bell.') : t('Switch between them with Household | Company, at the top of the menu.')}</p>
      <div class="row"><button class="btn sm primary" data-a="curio-close">${t('Got it')}</button></div></div>
    <button class="btn ghost sm x" data-a="curio-close" aria-label="${t('Close')}">${icon('x')}</button></aside>`;
}

/** The quick things to do: what a person does most, each said as what it does (owner: "the text under them is vague, use action text: record a
    payment, record an income"), in the words of the side in use, with this screen's own "new" first when it has one. [id, icon, words]. */
function quickItems() {
  const co = UI.space === 'business', m = routeMain(UI.route), own = m && !['new-tx', 'goal-new', 'line-new'].includes(m[0]) ? [['main', 'plus', m[2]]] : [];
  return [...own,
    ['expense', 'wallet', co ? t('Record a cost') : t('Record an expense')],
    ['income', 'coins', co ? t('Record money received') : t('Record an income')],
    ['pay', 'check', t('Pay a bill')],
    ['save', 'flag', co ? t('Set aside in a reserve') : t('Add to a goal')],
    ['transfer', 'swap', t('Transfer money')],
    ['goal', 'target', co ? t('Create a reserve') : t('Start a goal')],
    ['cost', 'calendar', t('Add a fixed cost')],
    ['limit', 'gauge', t('Set a spending limit')],      // features/limits (owner, 2026-10-10: "I can't find that option")
    ...(deskOnly('imports') ? [] : [['import', 'upload', t('Import a statement')]])];      // files are for the computer (desk-only.js)
}
/** The list with "Add an account" in it (owner, 2026-10-08: "add the option in quick access"). Most of the other things happen in an account, so
    while the side in use has none it comes first; once there is one it goes to the end. On Accounts it is that screen's own "new" already. */
function quickList() {
  const items = quickItems(), m = routeMain(UI.route); if (m && m[0] === 'edit-account') return items;
  const co = UI.space === 'business', none = co ? !bookAccounts().length : !personal().length, item = ['account', 'bank', co ? t('Add company account') : t('Add account')];      // said like the others, as what it does: "Agregar cuenta", "Adicionar conta"
  if (!none) return [...items, item];
  const at = items[0] && items[0][0] === 'main' ? 1 : 0; return [...items.slice(0, at), item, ...items.slice(at)];
}
/** In the grid of two columns, this screen's own "new" takes a row by itself; so does the last one when it would be left alone in its row. */
const quickWide = (list, i) => list[i][0] === 'main' || (i === list.length - 1 && list.filter(x => x[0] !== 'main').length % 2 === 1);
// the list the round + opens: features/phone/quick-sheet.js (owner, 2026-10-10: "the middle button has too many buttons: show the ones relevant to the tab")
/** The same things as a row of round buttons on the dashboard, to swipe sideways (owner: "I like the green circles; add more, with horizontal scroll"). */
function quickRow() {
  return `<nav class="quick-row" aria-label="${t('Add')}">${quickList().filter(x => x[0] !== 'main').map(([v, ic, l]) => `<button data-a="quick-go" data-v="${v}"><span class="fl-ico">${icon(ic)}</span><span>${l}</span></button>`).join('')}</nav>`;
}

/** The day's facts on a phone: one quiet line each, in a row to swipe (owner, 2026-10-08: "show the insights of the day whole, but shorten the
    message; don't show the What if button, just let the user tap and it opens; not every one with the same action"; then "reduce them, make them
    simple, only the important content; they don't have to draw attention; not as cards; don't name them, just the fact"). No card, no title, no
    label: the fact in one short sentence (insightShort) in the page's quiet grey, centred, its amounts and the small arrow that says it opens in
    the side's bright colour (owner, same night), and small dots under it for the others. A tap opens what that fact is about (the action ins-go): spending → the month's transactions, a category → its transactions, the
    bills → the plan, a goal → its details, a mark of freedom → What if…?, the cost of a day → the days of freedom, a run of months → the goals,
    what went aside → the income report. Today's fact comes first; a swipe stops on the next one. */
function phoneInsight() {
  const co = inCompany(), all = insights(B(), B().today, BCUR()), at = insightOfDay(B(), B().today, BCUR(), 0).index;
  const list = all.length ? [...all.slice(at), ...all.slice(0, at)] : [{ kind: 'start' }], n = list.length;
  const line = x => `<button class="ins-c" data-a="ins-go" data-k="${x.kind}"${x.id ? ` data-id="${esc(x.id)}"` : ''}><span class="ins-say">${insightShort(x, co)}&nbsp;<span class="ins-ar" aria-hidden="true">›</span></span></button>`;      // the arrow at the end of the words, as a letter tied to the last one by a no-break space (never alone on a line), so the line centres whole
  return `<section class="ins-strip" id="insight-card" aria-label="${t('Insights of the day')}"><div class="ins-row${n > 1 ? ' many' : ''}">${list.map(line).join('')}</div>
    ${n > 1 ? `<span class="ins-pg" aria-hidden="true">${list.map((x, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span>` : ''}</section>`;
}
/** The dot of the fact in view follows the swipe. */
document.addEventListener('scroll', e => {
  const r = e.target; if (!r.classList || !r.classList.contains('ins-row')) return;
  const first = r.firstElementChild, dots = r.parentNode.querySelectorAll('.ins-pg i'); if (!first || !dots.length) return;
  const step = first.offsetWidth + parseFloat(getComputedStyle(r).columnGap || 0), at = Math.min(dots.length - 1, Math.round(r.scrollLeft / (step || 1)));
  dots.forEach((d, i) => d.classList.toggle('on', i === at));
}, { capture: true, passive: true });
/** A fact in one short sentence, on a phone. A run of months and the first steps are already one short line. */
function insightShort(x, co) {
  // the amounts in the side's bright colour (owner, 2026-10-08: "the money values in green, and the arrow too")
  const money = v => `<b class="ins-m">${fmt.money(Math.round(v / 100) * 100, BCUR(), { trim: true })}</b>`;
  const bare = ym => { const m = mon(+ym.slice(5, 7) - 1, true); return S.settings.lang === 'en' ? m : m.toLowerCase(); };
  switch (x.kind) {
    case 'day': { const v = { amount: money(x.amount) }; return co ? t('One day of the company costs {amount}.', v) : t('One day of freedom costs {amount}.', v); }
    case 'pace': { const v = { amount: money(Math.abs(x.diff)), month: bare(x.month) };
      return x.diff < 0 ? (co ? t('So far, {amount} less in costs than in {month}.', v) : t('So far, {amount} less spent than in {month}.', v))
        : (co ? t('So far, {amount} more in costs than in {month}.', v) : t('So far, {amount} more spent than in {month}.', v)); }
    case 'mover': { const v = { name: esc(catName(x.id)), amount: money(Math.abs(x.diff)), month: bare(x.month) };
      return x.diff < 0 ? t('{name}: {amount} less than in {month}.', v) : t('{name}: {amount} more than in {month}.', v); }
    case 'bills': return tn(x.n, '{n} bill in the next 7 days: {total}.', '{n} bills in the next 7 days: {total}.', { total: money(x.total) });
    case 'goal': return t('{name}: {amount} to go, by {month}.', { name: esc(x.name), amount: money(x.remaining), month: `${bare(x.ym)} ${x.ym.slice(0, 4)}` });
    case 'mark': { const v = { amount: money(x.missing), mark: rwMark(x.mark) };
      return co ? t('{amount} more and the company reaches {mark} of runway.', v) : t('{amount} more and you reach {mark} of freedom.', v); }
    case 'rate': { const v = { hundred: money(10000), month: bare(x.month), amount: money(x.per100 * 100) };
      return co ? t('In {month}, {amount} of every {hundred} went to its reserves.', v) : t('In {month}, {amount} of every {hundred} went to your goals.', v); }
    default: return insightSay(x, co).title;
  }
}
