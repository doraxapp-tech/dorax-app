/* Dorax Finance — "You can spend" on the summary: how much a day, until pay day (2026-10-10). The figure and how it is worked out: core/free-until.js.
   Owner, 2026-10-11: "the free to spend function, I don't understand it, it is confusing; if you cannot always say it as for a small child, remove it".
   So, as for a child:
     - the figure is a day's share ("R$ 246 a day"), like an allowance, not a total that competes with the net balance right above it;
     - one short line says until when ("until October 31, the end of the month") and why it is safe ("What you have to pay is already taken off");
     - the details show one bar of the money there is today, the part that is "to pay and save" and the part that is "to spend", then the sum as
       steps, each with its icon and the names behind it ("Rent, Light and 3 more"), and the division that gives the day's share;
     - one word for one thing: "account" never stands for a bill here ("cuentas" / "contas" mean both in Spanish and Portuguese).
   When what is due is more than there is, it says so the same way: "Not enough money: R$ 1.234 to pay everything until October 31."
   The household's only: a pay day is the household's. The bell's "Not enough money" says it in the same words and shows the same steps (features/reminders/issues.view.js).
   Styles: css/screens/free-until.css. Texts: i18n/text/free.js. */
const fuMoney = v => fmt.money(Math.abs(v) >= 1000 ? Math.round(v / 100) * 100 : v, CUR, { trim: true });      // whole reais; under R$ 10, with cents
/** A day in words: "31 de octubre", "October 31". */
const fuDay = iso => { const [, m, d] = iso.split('-'), name = mon(+m - 1, true); return t('{month} {day}@long', { month: S.settings.lang === 'en' ? name : name.toLowerCase(), day: +d }); };
/** Until when: the pay day, or the end of the month. */
const fuWhen = r => r.pay ? t('until {date}, when you get paid', { date: fuDay(r.pay.date) }) : t('until {date}, the end of the month', { date: fuDay(r.until) });
const fuOk = r => r.free > 0;
const fuTitle = r => fuOk(r) ? t('You can spend') : t('Not enough money');
/** The big figure: a day's share; or what is missing. */
const fuBig = r => fuOk(r) ? `<span class="fu-big">${t('{amount} a day', { amount: `<span class="fu-n num">${fuMoney(r.perDay)}</span>` })}</span>` : `<span class="fu-big neg"><span class="fu-n num">${fuMoney(-r.free)}</span></span>`;
/** The line under it: until when, and why it is safe; or what the missing money is for. */
const fuSay = r => fuOk(r) ? `${fuWhen(r)}. ${t('What you have to pay is already taken off.')}` : t('to pay everything {when}.', { when: fuWhen(r) });
/** "Rent", "Rent and Light", "Rent, Light and 3 more". */
function fuNames(list) {
  const n = list.map(x => x.name);
  if (n.length <= 1) return esc(n[0] || '');
  if (n.length === 2) return t('{a} and {b}', { a: esc(n[0]), b: esc(n[1]) });
  return t('{names} and {n} more', { names: esc(n.slice(0, 2).join(', ')), n: n.length - 2 });
}
const fuCards = r => r.cardList.length === 1 ? t('{name}, due {date}', { name: esc(r.cardList[0].name), date: fuDay(r.cardList[0].date) }) : fuNames(r.cardList);
/** One bar of the money there is today: the part that is to pay and save, and the part that is to spend. With a legend: never colour alone. */
function fuBar(r) {
  if (!fuOk(r) || r.cash <= 0) return '';
  const held = r.bills + r.cards + r.goals, heldName = r.goals && !(r.bills + r.cards) ? t('To save') : r.goals ? t('To pay and save') : t('To pay@bar');
  const parts = [[heldName, held, 'var(--col-muted)', 'held'], [t('To spend'), r.free, 'var(--brand)', 'free']].filter(x => x[1] > 0);
  return `<div class="fu-bar"><div class="stackbar" role="img" aria-label="${esc(parts.map(x => `${x[0]} ${fuMoney(x[1])}`).join(', '))}">${parts.map(x => `<span class="${x[3]}" style="flex:${x[1]};background:${x[2]}"></span>`).join('')}</div>
    <div class="legend fu-legend">${parts.map(x => `<div class="legend-row still ${x[3]}"><span class="dot" style="background:${x[2]}"></span><span>${x[0]}</span><span class="num">${fuMoney(x[1])}</span></div>`).join('')}</div></div>`;
}
const fuIco = k => `<span class="fu-ico" aria-hidden="true">${CAT_ICONS[k] ? catIconSvg(k) : icon(k)}</span>`;
/** The sum as steps: what there is today, what is taken off (with the names behind it), and what is left; then the day's share. */
function fuSteps(r) {
  const step = (ico, title, say, v, cls) => `<li class="${cls || ''}">${fuIco(ico)}<span class="grow"><b>${title}</b>${say ? `<small>${say}</small>` : ''}</span><b class="num">${v}</b></li>`;
  const minus = v => `− ${fuMoney(v)}`;
  return `<ol class="fu-steps">${step('wallet', t('You have today'), t('Checking account and cash'), fuMoney(r.cash))}
      ${r.bills ? step('receipt', t('Payments until {date}', { date: fuDay(r.until) }), fuNames(r.billList), minus(r.bills), 'out') : ''}
      ${r.cards ? step('card', r.nCards > 1 ? t('Cards') : t('Card'), fuCards(r), minus(r.cards), 'out') : ''}
      ${r.goals ? step('flag', t('For your goals'), t('What is left to save this month'), minus(r.goals), 'out') : ''}
      ${fuOk(r) ? step('check', t('Left for you'), '', fuMoney(r.free), 'fu-total') : step('alert', t('Missing'), '', fuMoney(-r.free), 'fu-total neg')}</ol>
    ${fuOk(r) ? `<p class="fu-div">${tn(r.days, '{amount} ÷ {n} day = {day}', '{amount} ÷ {n} days = {day}', { amount: fuMoney(r.free), day: `<b class="num">${t('{amount} a day', { amount: fuMoney(r.perDay) })}</b>` })}</p>` : ''}`;
}
const fuNote = () => `<p class="note fu-note">${t('Savings, investments and money that has not come in yet do not count.')}</p>`;
/** Everything behind the figure: the bar, the steps, what does not count. */
const fuDetails = r => `${fuBar(r)}<h3 class="fu-h">${t('How we worked it out')}</h3>${fuSteps(r)}${fuNote()}`;
function freeCard() {
  if (inCompany()) return '';
  const r = freeUntil(S, S.today, CUR); if (!r) return '';
  if (isPhone()) return `<section class="card rw-ph fu" id="free-card"><button class="rw-tap" id="free-open" data-a="free-view" aria-haspopup="dialog">
      <span class="rw-h"><b>${fuTitle(r)}</b><span class="rw-see">${t('See')}${icon('right')}</span></span>
      ${fuBig(r)}<span class="fu-say">${fuSay(r)}</span></button></section>`;
  return `<section class="card fu" id="free-card"><div class="card-h"><h2>${fuTitle(r)}</h2>${r.pay ? '' : `<span class="right"><a class="btn sm" href="#plan">${t('Set your pay day')}</a></span>`}</div>
    <div class="card-b">${fuBig(r)}<p class="fu-say">${fuSay(r)}</p>${fuBar(r)}<button type="button" class="linkbtn fu-how" data-a="free-view">${t('How we worked it out')}${icon('right')}</button></div></section>`;      // the steps in its panel (2026-10-11: at a glance)
}
/** A phone's details: the figure again, then everything behind it; the way to the pay day when there is none. */
function freeDrawer() {
  const r = freeUntil(S, S.today, CUR); if (!r) return `<div class="body"><p class="note">${t('Add a checking account to see how much you can spend.')}</p></div>`;
  return `<div class="body fu-view">${fuBig(r)}<p class="fu-say">${fuSay(r)}</p>${fuDetails(r)}</div>
    ${r.pay ? '' : `<footer><button class="btn primary" data-a="free-pay">${t('Set your pay day')}</button></footer>`}`;
}
const FREE_ACTIONS = {
  'free-view'() { const r = freeUntil(S, S.today, CUR); UI.drawer = { kind: 'free-view', title: r ? fuTitle(r) : t('You can spend'), pop: !isPhone() }; renderOverlay(); },
  'free-pay'() { UI.drawer = null; renderOverlay(); go('plan'); },      // the pay lines are in the Plan (its income)
};
