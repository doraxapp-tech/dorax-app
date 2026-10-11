/* Dorax Finance — looking ahead on screen: the "days of freedom" card of the dashboard and its panel, and the date a goal is reached.
   2026-10-07 (owner: "instead of seeing R$ 1,000 in the bank, the person sees 45 days of freedom"; "don't only say how much is saved, say when the
   goal is reached"). The figures come from core/runway.js: what is put aside divided by what goes out in a month. Nothing here gives advice, and the
   marks on the track (30 days, 3, 6 and 12 months) are reference points for the picture. */

/** How a number of days is said: in days up to two months; from there in months, whole or "and a half" (runwayMonths), never with a decimal.
    The figure is the whole number; the half is said in words beside it. co: the company's side says "runway", not "freedom". */
function rwFigure(days, co) {
  if (days < 60) return { n: days, dec: 0, unit: co ? tn(days, 'day of runway', 'days of runway') : tn(days, 'day of freedom', 'days of freedom'), span: tn(days, '{n} day', '{n} days') };
  const m = runwayMonths(days), n = Math.floor(m), half = m > n;
  return { n, dec: 0, unit: half ? (co ? t('and a half months of runway') : t('and a half months of freedom')) : (co ? t('months of runway') : t('months of freedom')), span: half ? t('{n} and a half months', { n }) : t('{n} months', { n }) };
}
const rwMark = d => ({ 30: t('30 days'), 90: t('3 months'), 180: t('6 months'), 365: t('1 year') }[d]);
// 2026-10-08 (owner: "in months of freedom add a celebration emoji in our style; the card's copy is a bit cold: those are goals, I want Dorax to
// celebrate what people achieve"). Each mark is a goal. From the first one reached (30 days) the figure wears a 🎉, the same kind of emoji as the
// onboarding's wave (decoration, hidden from screen readers), and the card says which goal was passed, that the person built it, and how much more
// reaches the next one. Before the first goal it encourages instead. The moment a goal is passed is still cheered once (cheerMaybe, curios.view.js).
const rwParty = days => markReached(days) ? `<span class="e rw-e" aria-hidden="true">🎉</span>` : '';
/** The card's sentence: the goal passed and what it means, or, before the first one, what is already there and that every amount adds days. */
function rwSay(days, span, co) {
  const m = markReached(days);
  if (co) return m ? `<b class="rw-cheer">${t('The company passed the {mark} goal!', { mark: rwMark(m) })}</b> ${t('With what it keeps the company could run {span} even if nothing came in. Well done.', { span })}`
    : t('With what it keeps the company could already run {span} even if nothing came in. Everything it keeps adds days.', { span });
  return m ? `<b class="rw-cheer">${t('You passed the {mark} goal!', { mark: rwMark(m) })}</b> ${t('With what you have put aside you could live {span} even if nothing came in. You built that.', { span })}`
    : t('With what you have put aside you could already live {span} even if nothing came in. Everything you keep adds days.', { span });
}
/** The computer's card says it in one short line (owner, 2026-10-08: "the days of freedom card on the computer has too much information, it is very
    loaded"): the goal passed and who built it, or that every amount adds days. The longer sentence stays in a phone's details. */
function rwShort(days, co) {
  const m = markReached(days);
  if (co) return m ? `<b class="rw-cheer">${t('The company passed the {mark} goal!', { mark: rwMark(m) })}</b> ${t('Well done.')}` : t('Everything it keeps adds days.');
  return m ? `<b class="rw-cheer">${t('You passed the {mark} goal!', { mark: rwMark(m) })}</b> ${t('You built that.')}` : t('Everything you keep adds days.');
}
/** What is left to the next goal, or that every goal is passed. */
const rwNext = (r, co, money) => r.next ? (co ? t('Next goal: {mark}. {amount} more and the company is there.', { mark: rwMark(r.next.days), amount: money(r.next.missing) }) : t('Next goal: {mark}. {amount} more and you are there.', { mark: rwMark(r.next.days), amount: money(r.next.missing) }))
  : (co ? t('More than a year kept. The company passed every goal!') : t('More than a year put aside. You passed every goal!'));
/** The track: four stretches, one per mark, each filled as far as the days reach into it. Read by a screen reader as one sentence. */
function rwTrack(days) {
  const next = RUNWAY_MARKS.find(m => m > days);
  return `<div class="rw-track" role="img" aria-label="${esc(next ? t('Next goal: {mark}.', { mark: rwMark(next) }) : t('Past every goal: more than a year.'))}">${RUNWAY_MARKS.map((hi, i) => {
    const lo = i ? RUNWAY_MARKS[i - 1] : 0, pct = Math.max(0, Math.min(100, Math.round((days - lo) * 1000 / (hi - lo)) / 10));
    return `<div class="rw-seg${pct >= 100 ? ' full' : ''}" style="--i:${i}"><span class="bar">${pct > 0 ? `<i style="width:${pct}%"></i>` : ''}</span><span class="lbl">${rwMark(hi)}</span></div>`; }).join('')}</div>`;
}
/** What the figure is and how it is worked out: the card's (i) on a computer, and the text of its details on a phone. */
function runwayTip(co) {
  return co ? t('How long what the company keeps lasts at the pace its costs go out: what is in its savings accounts in this currency (or in its reserves, when that is more) divided by what goes out in a month. The money in its checking accounts is the month’s, for its bills, taxes and what you pay yourself, so it is not counted. What goes out is the highest of three figures: the average costs of the last three months, this month’s planned fixed costs, and your own estimate. A month counts as 30 days. The goals on the track are reference points to celebrate, not advice.')
    : t('How long what you have put aside lasts at the pace money goes out: what is in your savings accounts (or what is saved in goals and funds, when that is more), divided by what goes out in a month. The money in a checking account is the month’s, to pay its bills, so it is not counted. What goes out is the highest of three figures: your average spending of the last three months, this month’s planned fixed costs, and your own estimate. A month counts as 30 days. Investments are not counted. The goals on the track are reference points to celebrate, not advice.');
}
/** The dashboard's card. It reads the book in use, so the company's side gets its own, from its own accounts, reserves and costs. On a phone, with a
    figure to show, it is the short card of features/phone/phone.summary.js, and this one, without its title and buttons, is that card's details
    (inPanel). A phone's card with nothing to show yet keeps its own button and leaves What if…? and Adjust out of its title. */
function runwayCard(inPanel) {
  const co = inCompany(), cur = BCUR(), r = runway(B(), B().today, cur), money = v => fmt.money(v, cur, { trim: true }), phone = isPhone();
  if (!inPanel && phone && r.days !== null && r.cushion.amount) return runwayPhone(r, co);
  // the words people search with (2026-10-10, "the people's words": "reserva de emergência"), under the app's own name, on the household's side
  const head = inPanel ? '' : `<div class="card-h"><h2>${co ? t('Company runway') : t('Days of freedom')}</h2>${info(runwayTip(co))}${co ? '' : `<span class="sub rw-alias">${t('Your emergency fund')}</span>`}${phone ? '' : `<span class="right"><button class="btn sm" data-a="whatif">${t('What if…?')}</button><button class="btn sm" data-a="runway-edit">${t('Adjust')}</button></span>`}</div>`;
  const card = body => inPanel ? `<div class="rw-in">${body}</div>` : `<section class="card" id="runway-card">${head}${body}</section>`;
  if (r.days === null) return card(`<div class="card-b"><div class="empty">${co
    ? `<b>${t('No pace to measure yet')}</b>${t('Say what the company’s costs are in a month, add its fixed costs or import one of its statements, and Dorax shows how long its money lasts.')}<div class="row" style="justify-content:center;margin-top:12px"><button class="btn sm primary" data-a="runway-edit">${t('Set my numbers')}</button><a class="btn sm" href="#plan">${t('Open plan')}</a></div>`
    : `<b>${t('How long could you live on what you have?')}</b>${t('Tell Dorax what goes out each month and it turns what you have put aside into days of freedom.')}<div style="margin-top:12px"><button class="btn sm primary" data-a="runway-edit">${t('Set my numbers')}</button></div>`}</div></div>`);
  const out = { actual: tn(r.burn.months, 'going out a month (average of the last {n} month)', 'going out a month (average of the last {n} months)'), plan: t('going out a month (this month’s planned fixed costs)'), estimate: t('going out a month (your estimate)') }[r.burn.basis];
  if (!r.cushion.amount) return card(`<div class="card-b"><div class="rw zero"><b class="rw-start">${co ? t('The company’s runway starts with the first amount it keeps.') : t('Your days of freedom start with the first amount you put aside.')}</b>
      <p class="rw-say">${t('With {burn} going out a month, {amount} put aside is 30 days.', { burn: money(r.burn.amount), amount: money(r.next.missing) })}</p>${rwTrack(0)}
      <div class="row">${co ? `<a class="btn sm" href="#goals">${t('Open goals')}</a>` : `<button class="btn sm primary" data-a="goal-new">${icon('plus')}${t('New goal')}</button>`}<button class="btn sm" data-a="edit-account" data-id="" data-type="savings">${t('Add savings account')}</button></div></div></div>`);
  const f = rwFigure(r.days, co), prev = fmt.month(addMonths(ymOf(B().today), -1), 'bare');
  // the computer's card, lighter (owner, 2026-10-08): the figure with its 🎉 and a small sign of how it moved (its sentence in a tip), the goal
  // passed in one line, the track, what reaches the next goal. What it rests on is behind Adjust; how it is worked out, behind its (i).
  if (!inPanel) {
    const why = r.delta ? (r.delta > 0 ? t('more than at the end of {month}', { month: prev }) : t('fewer than at the end of {month}', { month: prev })) : '';
    const pill = r.delta ? `<span class="pill ${r.delta > 0 ? 'up' : 'down'}" data-tip="${esc(tn(Math.abs(r.delta), '{n} day', '{n} days') + ' ' + why)}">${r.delta > 0 ? '▲' : '▼'} ${tn(Math.abs(r.delta), '{n} day', '{n} days')}<span class="sr"> ${why}</span></span>` : '';
    return card(`<div class="card-b"><div class="rw one"><div class="rw-fig"><b class="rw-n" data-count="${f.n}" data-dec="${f.dec}">${fmt.num(f.n)}</b><span class="rw-u">${f.unit}</span>${rwParty(r.days)}${pill}</div>
      <p class="rw-say">${rwShort(r.days, co)}</p>${rwTrack(r.days)}<p class="rw-next">${rwNext(r, co, money)}</p></div></div>`);
  }
  const moved = r.delta ? `<span class="rw-delta"><span class="pill ${r.delta > 0 ? 'up' : 'down'}">${r.delta > 0 ? '▲' : '▼'} ${tn(Math.abs(r.delta), '{n} day', '{n} days')}</span> ${r.delta > 0 ? t('more than at the end of {month}', { month: prev }) : t('fewer than at the end of {month}', { month: prev })}</span>` : '';
  const where = co ? (r.cushion.basis === 'accounts' ? t('in the company’s savings accounts') : t('kept in the company’s reserves')) : (r.cushion.basis === 'accounts' ? t('in your savings accounts') : t('saved in goals and funds'));
  return card(`<div class="card-b"><div class="rw two"><div class="rw-a">
      <div class="rw-fig"><b class="rw-n" data-count="${f.n}" data-dec="${f.dec}">${fmt.num(f.n)}</b><span class="rw-u">${f.unit}</span>${rwParty(r.days)}${moved}</div>
      <p class="rw-say">${rwSay(r.days, f.span, co)}</p></div>
      <div class="rw-b">${rwTrack(r.days)}
      <p class="rw-next">${rwNext(r, co, money)}</p>
      <p class="note rw-basis"><span class="num">${money(r.cushion.amount)}</span> ${where} · <span class="num">${money(r.burn.amount)}</span> ${out}</p></div></div></div>`);
}
/** The panel behind "Adjust": what the figure rests on, and the person's own estimate of what goes out in a month. It is opened for the side in
    use, so the company's has its own estimate, in the currency shown. */
function runwayDrawer(d) {
  const co = inCompany(), cur = BCUR(), r = runway(B(), B().today, cur), money = v => fmt.money(v, cur, { trim: true });
  const basis = { actual: co ? t('Average costs of the last months') : t('Average spending of the last months'), plan: t('This month’s planned fixed costs'), estimate: t('Your estimate') }[r.burn.basis] || t('Nothing to go by yet');
  const where = co ? (r.cushion.basis === 'accounts' ? t('in the company’s savings accounts') : t('kept in the company’s reserves')) : (r.cushion.basis === 'accounts' ? t('in your savings accounts') : t('saved in goals and funds'));
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}
    <p class="note">${co ? t('The company’s runway is what it keeps divided by what goes out in a month.') : t('Days of freedom are what you have put aside divided by what goes out in a month.')}</p>
    <dl class="kv"><dt>${t('Put aside')}</dt><dd><span class="num">${money(r.cushion.amount)}</span> <span class="muted">· ${where}</span></dd>
      <dt>${t('Goes out a month')}</dt><dd><span class="num">${money(r.burn.amount)}</span> <span class="muted">· ${basis}</span></dd></dl>
    ${fld('rw-spend', t('What goes out in a month, your estimate ({cur})', { cur: cur === 'USD' ? 'US$' : 'R$' }), inp('rw-spend', 'spendText', d.draft.spendText, 'inputmode="decimal" class="num" placeholder="0,00"'))}
    <p class="note">${co ? t('Dorax counts with the highest of three figures: the company’s average costs of the last three months, this month’s planned fixed costs, and this estimate. What you pay yourself is a transfer, not a cost. Leave it empty to use only what is recorded.')
      : t('Dorax counts with the highest of three figures: your average spending of the last three months, this month’s planned fixed costs, and this estimate. That way a month that is only half recorded never makes your money look like it lasts longer. Leave it empty to use only what is recorded.')}</p></div>
  <footer><button class="btn primary" data-a="runway-save">${t('Save')}</button><button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}

// ---------- "do you also run a company?" ----------
// 2026-10-07 (owner: "ask this on the dashboard", not in the first-time setup). One line on the household's side, for everyone, until it is answered:
// it is not held back by what the account already has. Yes opens the company's side, through its three-screen setup when it has nothing yet
// (features/company); No puts the question away. Household | Company stays in the menu either way, so nothing is closed by a No.
function companyAsk() {
  if (inCompany() || S.user.company !== undefined || hasCompany()) return '';
  const q = t('Do you also run a company (PJ or MEI)?');
  return `<section class="card co-ask" id="co-ask"><div class="card-b">${`<span class="fl-ico">${icon('briefcase')}</span>`}<span class="grow"><b id="co-ask-q">${q}</b><small>${t('Company and home in one place, never mixed.')}</small></span>
    ${info(isPhone() ? t('Yes opens the company’s side: three short questions set it up, and from then on you switch between Household and Company with the button with two arrows, next to the bell. No puts this question away; if that changes, “Open a company account” is in your menu.') : t('Yes opens the company’s side: three short questions set it up, and from then on you choose between Household and Company. No puts this question away; if that changes, “Open a company account” is in your menu.'))}
    <span class="co-ask-btns" role="group" aria-labelledby="co-ask-q"><button class="btn sm primary" data-a="co-answer" data-v="yes">${t('Yes')}</button><button class="btn sm" data-a="co-answer" data-v="no">${t('No')}</button></span></div></section>`;
}
