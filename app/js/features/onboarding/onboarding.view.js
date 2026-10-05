/* Dorax Finance — the first minutes of a new account.
   Five short questions, each one optional after the name: where the money is, what comes in, what goes out every month, what it is saved for.
   The answers become real accounts, income rows, fixed costs and a goal, so the dashboard opens with the person's own month instead of an empty page.
   Nothing here is invented: an answer left blank creates nothing. */

const OB_STEPS = 5;
const freshOb = () => ({ step: 0, error: null, done: {}, sheet: false,
  account: { name: '', inst: BANKS[0], balance: '' },
  pays: 2, pay: [{ amount: '', to: 'savings' }, { amount: '', to: 'fixed' }], save: '',
  bills: null,       // one empty row to start: nothing is suggested, people add the costs they have
  goal: { name: '', target: '', gm: '', gy: '', saved: '', monthly: '' } });
const obBills = () => [{ name: '', amount: '', due: '' }];
const ob = () => UI.ob || (UI.ob = freshOb());
const obSet = (path, v) => { const ks = path.split('.'); let o = ob(); for (const k of ks.slice(0, -1)) o = o[k]; o[ks[ks.length - 1]] = v; };
const obField = (id, label, path, val, extra, cls) => `<div class="field ${cls || ''}"><label for="${id}">${label}</label><input type="text" id="${id}" value="${esc(val)}" data-c="ob" data-k="${path}" data-live="1" ${extra || ''}></div>`;
const obMoney = 'inputmode="decimal" class="num" placeholder="0,00" autocomplete="off"';

/** What the answers add up to. Each part is null when its step was skipped or left empty, or { error } when something typed cannot be read. */
function obRead() {
  const o = ob(), out = { account: null, income: [], bills: [], goal: null, errors: {} }, amt = v => String(v || '').trim() === '' ? 0 : typedAmount(v);
  if (o.done[1]) {
    const bal = amt(o.account.balance);
    if (bal === null) out.errors[1] = t('Enter the balance as a number, for example 1500,00. You can also leave it empty.');
    else out.account = { ...(o.account.name.trim() ? { name: o.account.name.trim() } : appName('Main account')), institution: o.account.inst, opening: bal };
  }
  if (o.done[2]) {
    const a = amt(o.pay[0].amount), b = o.pays === 2 ? amt(o.pay[1].amount) : 0, save = o.pays === 1 ? amt(o.save) : 0;
    if (a === null || b === null || save === null || a < 0 || b < 0 || save < 0) out.errors[2] = t('Enter the amount as a number, for example 1500 or 9,90.');
    else if (!a && !b) out.errors[2] = t('Type how much you are paid, or skip this step.');
    else if (save > a) out.errors[2] = t('What you set aside cannot be more than what you are paid.');
    else if (o.pays === 2) { if (a) out.income.push({ ...appName('Salary · 1st payment'), to: o.pay[0].to, amount: a, half: 1 }); if (b) out.income.push({ ...appName('Salary · 2nd payment'), to: o.pay[1].to, amount: b, half: 2 }); }
    else { if (a - save) out.income.push({ ...appName('Salary'), to: 'fixed', amount: a - save, half: 0 }); if (save) out.income.push({ ...appName('Salary · savings part'), to: 'savings', amount: save, half: 0 }); }
  }
  if (o.done[3]) {
    for (const x of o.bills || []) {
      const v = amt(x.amount), due = String(x.due || '').trim() === '' ? null : Number(x.due);
      if (!v && !String(x.amount || '').trim()) continue;
      if (v === null || v <= 0) { out.errors[3] = t('Enter the amount as a number, for example 1500 or 9,90.'); break; }
      if (!x.name.trim()) { out.errors[3] = t('Give a name to every cost that has an amount.'); break; }
      if (due !== null && !(Number.isInteger(due) && due >= 1 && due <= 31)) { out.errors[3] = t('{name}: the due day must be between 1 and 31.', { name: x.name.trim() }); break; }
      out.bills.push({ name: x.name.trim(), amount: v, due, pay: x.pay || 'fixed' });
    }
    if (!out.errors[3] && !out.bills.length && !o.sheet) out.errors[3] = t('Add at least one cost with its amount, or skip this step.');
  }
  if (o.done[4]) {
    const g = o.goal, target = amt(g.target), saved = amt(g.saved), monthly = amt(g.monthly), deadline = g.gm && g.gy ? g.gy + '-' + g.gm : '';
    if (!g.name.trim()) out.errors[4] = t('Enter a name for the goal.');
    else if (target === null || saved === null || monthly === null || target < 0 || saved < 0 || monthly < 0) out.errors[4] = t('Enter the amount as a number, for example 1500 or 9,90.');
    else if ((g.gm || g.gy) && !deadline) out.errors[4] = t('Choose both the month and the year, or leave both empty.');
    else if (deadline && deadline < ymOf(S.today)) out.errors[4] = t('The target date has already passed.');
    else out.goal = { name: g.name.trim(), target, deadline: target && deadline ? deadline : null, saved, monthly };
  }
  return out;
}
/** Turns the answers into the account's first data. Uses the same building blocks as the rest of the app. */
function applyOnboarding(d) {
  const now = ymOf(S.today), year = +now.slice(0, 4), m0 = +now.slice(5) - 1, from = v => Array.from({ length: 12 }, (_, i) => i >= m0 ? v : 0);
  let acctId = null;
  if (d.account) { acctId = newId('a'); S.accounts.push({ id: acctId, name: d.account.name, ...(d.account.k ? { k: d.account.k } : {}), institution: d.account.institution, type: 'checking', currency: BASE_CURRENCY, scope: 'personal', purpose: '', opening: d.account.opening }); }
  if (d.income.length) { const sub = S.categories.find(c => c.income).subs[0]; S.pay[year] = d.income.map(r => ({ id: newId('pay'), name: r.name, ...(r.k ? { k: r.k } : {}), sub: sub.id, half: r.half, to: r.to, values: from(r.amount) })); }
  const cat = S.categories.find(c => !c.income);
  for (const b of d.bills) {
    const sub = { id: newId('s'), name: b.name }; cat.subs.push(sub);
    const l = { id: newId('pl'), categoryId: cat.id, subcategoryId: sub.id, name: b.name, pay: b.pay, accountId: acctId, end: null, note: '', plan: {} }; if (b.due) l.due = b.due;
    S.plan.lines.push(l); setLinePlan(S, l, now, b.amount);
  }
  if (d.goal) {
    const g = { id: newId('g'), name: d.goal.name, kind: d.goal.target ? 'goal' : 'fund', target: d.goal.target || null, deadline: d.goal.deadline, accountId: acctId, status: 'active', note: '', plan: { [year]: Array(12).fill(0) } };
    if (d.goal.monthly) setGoalPlan(g, now, g.deadline || Math.max(year, ...goalYears(S)) + '-12', d.goal.monthly);
    S.goals.push(g); if (d.goal.saved) S.goalMoves.push({ id: newId('gm'), goalId: g.id, date: S.today, amount: d.goal.saved, accountId: acctId, start: true, ...appName('Starting balance', 'note') });
  }
  S.goals.forEach(g => goalYears(S).forEach(y => { g.plan[y] = g.plan[y] || Array(12).fill(0); }));
  return !!(d.account || d.income.length || d.bills.length || d.goal);
}

function viewOnboard() {
  const p = UI.pub, o = ob(), step = o.step, months = Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, '0'), mon(i, true)]), y0 = +S.today.slice(0, 4);
  const head = `<button type="button" class="btn ghost sm auth-back" data-a="logout">${icon('logout')}${t('Log out')}</button>${brandMark(true)}<div class="ob-prog" role="img" aria-label="${t('Step {a} of {b}', { a: Math.min(step + 1, OB_STEPS), b: OB_STEPS })}">${Array.from({ length: OB_STEPS }, (_, i) => `<i class="${i < step ? 'done' : i === step ? 'now' : ''}"></i>`).join('')}</div>
    ${step < OB_STEPS ? `<p class="ob-count">${t('Step {a} of {b}', { a: step + 1, b: OB_STEPS })}</p>` : ''}`;
  const err = o.error || p.error ? banner('crit', esc(o.error || p.error)) : '';
  const foot = (skip) => `<div class="ob-foot">${step ? `<button class="btn ghost" data-a="ob-back">${icon('left')}${t('Back')}</button>` : ''}<span class="spacer"></span>${skip ? `<button class="btn ghost" data-a="ob-skip">${t('Skip this step')}</button>` : ''}<button class="btn primary" data-a="${step ? 'ob-next' : 'onboard-save'}">${t('Continue')}</button></div>`;
  const later = step ? `<p class="ob-later"><button class="linkbtn" data-a="ob-finish">${t('Finish later and open my dashboard')}</button></p>` : '';
  let body;
  if (step === 0) body = `<h1>${t('Let’s set up your month')}</h1><p>${t('What should I call you?')} ${t('Then four quick questions, so your dashboard opens with your own numbers. Each one can be skipped.')}</p>${err}
      <div class="field"><label for="ob-name">${t('Your name')}</label><input type="text" id="ob-name" autocomplete="given-name" value="${esc(p.name)}" placeholder="${t('A nickname works')}" data-c="pub" data-k="name" data-live="1"></div>
      <div class="field"><label for="ob-lang">${t('Language')}</label><select id="ob-lang" data-c="setting" data-k="lang">${options(LANGS, S.settings.lang)}</select></div>${foot(false)}`;
  else if (step === 1) body = `<h1>${t('Where does your money live?')}</h1><p>${t('The account you pay your bills from. You can add cards and savings accounts later.')}</p>${err}
      <div class="form-grid">${obField('ob-acct', t('Account name'), 'account.name', o.account.name, `placeholder="${t('Main account')}"`)}
        <div class="field"><label for="ob-inst">${t('Institution')}</label><select id="ob-inst" data-c="ob" data-k="account.inst">${options([...new Set([...BANKS, t('Other')])].map(b => [b, b]), o.account.inst)}</select></div>
        ${obField('ob-bal', t('Balance today (R$, optional)'), 'account.balance', o.account.balance, obMoney, 'full')}</div>
      <p class="note">${t('Nothing connects to your bank. The balance is only the starting point for this account.')}</p>${foot(true)}`;
  else if (step === 2) body = `<h1>${t('What comes in each month?')}</h1><p>${t('Your pay after taxes. It is the base for everything else: what is left after bills, and what you can save.')}</p>${err}
      <div class="field"><span id="ob-pays-l">${t('How many times a month are you paid?')}</span>${seg('ob-pays', [[1, t('Once')], [2, t('Twice')]], o.pays, t('How many times a month are you paid?'))}</div>
      ${o.pays === 2 ? [0, 1].map(i => `<div class="form-grid">${obField('ob-pay' + i, i ? t('2nd payment (R$)') : t('1st payment (R$)'), `pay.${i}.amount`, o.pay[i].amount, obMoney)}
          <div class="field"><label for="ob-to${i}">${t('It goes to')}</label><select id="ob-to${i}" data-c="ob" data-k="pay.${i}.to">${options([['fixed', t('Fixed costs')], ['savings', t('Savings and goals')]], o.pay[i].to)}</select></div></div>`).join('')
        + `<p class="note">${t('For example: one payment covers the bills and the other goes to savings. Choose what fits you.')}</p>`
        : `<div class="form-grid">${obField('ob-pay0', t('Monthly pay (R$)'), 'pay.0.amount', o.pay[0].amount, obMoney)}${obField('ob-save', t('Of that, set aside to save (R$, optional)'), 'save', o.save, obMoney)}</div>
          <p class="note">${t('What you set aside is what your goals are funded from. The rest pays the fixed costs.')}</p>`}${foot(true)}`;
  else if (step === 3) body = `<h1>${t('What do you pay every month?')}</h1><p>${t('Only the ones that repeat: rent, services, subscriptions. Add the ones you have. You can also skip this and add them later.')}</p>${err}
      <div class="ob-bills"><div class="ob-bill hd" aria-hidden="true"><span>${t('Fixed cost')}</span><span>${t('Each month (R$)')}</span><span>${t('Due day')}</span></div>
        ${o.bills.map((x, i) => `<div class="ob-bill"><label class="sr" for="ob-bn${i}">${t('Fixed cost')} ${i + 1}</label><input type="text" id="ob-bn${i}" value="${esc(x.name)}" placeholder="${t('Name')}" data-c="ob" data-k="bills.${i}.name" data-live="1">
          <label class="sr" for="ob-ba${i}">${t('Each month (R$)')}: ${esc(x.name) || i + 1}</label><input type="text" id="ob-ba${i}" value="${esc(x.amount)}" ${obMoney} data-c="ob" data-k="bills.${i}.amount" data-live="1">
          <label class="sr" for="ob-bd${i}">${t('Due day')}: ${esc(x.name) || i + 1}</label><input type="number" class="day" id="ob-bd${i}" min="1" max="31" inputmode="numeric" placeholder="${t('Day')}" value="${esc(x.due)}" data-c="ob" data-k="bills.${i}.due" data-live="1"></div>`).join('')}</div>
      <div class="row"><button class="btn sm" data-a="ob-add-bill">${icon('plus')}${t('Add another')}</button><span class="note">${t('With the due day, the app reminds you before each bill is due.')}</span></div>
      <label class="ob-check"><input type="checkbox" id="ob-sheet" data-c="ob-sheet" ${o.sheet ? 'checked' : ''}><span><b>${t('I have these in a spreadsheet')}</b><span class="note">${t('After the set-up I take you to the import, so you do not type them one by one.')}</span></span></label>${foot(true)}`;
  else if (step === 4) body = `<h1>${t('What are you saving for?')}</h1><p>${t('One goal is enough to start: a trip, an emergency fund, a car. Leave the target empty if it is just money you keep apart.')}</p>${err}
      <div class="form-grid">${obField('ob-gname', t('Name'), 'goal.name', o.goal.name, `placeholder="${t('e.g. Viaje, Carro, Emergencias')}"`, 'full')}
        ${obField('ob-gtarget', t('Target (R$, optional)'), 'goal.target', o.goal.target, obMoney)}
        <div class="field"><span id="ob-gd-l">${t('By when (optional)')}</span><div class="row" style="flex-wrap:nowrap"><select id="ob-gm" aria-label="${t('Month')}" data-c="ob" data-k="goal.gm">${options([['', '—'], ...months], o.goal.gm)}</select><select id="ob-gy" aria-label="${t('Year')}" data-c="ob" data-k="goal.gy" style="max-width:110px">${options([['', '—'], ...[0, 1, 2, 3, 4, 5].map(k => [y0 + k, y0 + k])], o.goal.gy)}</select></div></div>
        ${obField('ob-gsaved', t('Already saved (R$)'), 'goal.saved', o.goal.saved, obMoney)}${obField('ob-gmonth', t('Each month (R$)'), 'goal.monthly', o.goal.monthly, obMoney)}</div>${foot(true)}`;
  else {
    const d = obRead(), inc = sum(d.income.map(r => r.amount)), fixedIn = sum(d.income.filter(r => r.to === 'fixed').map(r => r.amount)), bills = sum(d.bills.map(b => b.amount)), days = d.bills.filter(b => b.due).length;
    const row = (ok, ic, title, text) => `<div class="li step ${ok ? 'ok' : ''}"><span class="fl-ico">${icon(ic)}</span><span class="grow"><b style="font-weight:500">${title}</b><div class="note">${ok ? text : t('Skipped. You can add it later.')}</div></span>${ok ? `<span class="tick">${icon('check')}</span>` : ''}</div>`;
    body = `<h1>${t('Ready, {name}', { name: esc(p.name.trim()) })}</h1><p>${d.account || inc || d.bills.length || d.goal ? t('This is what your dashboard starts with. Everything can be changed later.') : t('You skipped every question, so the dashboard starts empty with a short list of first steps.')}</p>
      <div class="list">${row(!!d.account, 'wallet', d.account ? esc(d.account.name) : t('Account'), d.account ? `${esc(d.account.institution)} · ${fmt.money(d.account.opening, CUR)}` : '')}
        ${row(inc > 0, 'trend', t('Income'), inc ? `${fmt.money(inc, CUR)} ${t('a month')} · ${tn(d.income.length, '{n} payment', '{n} payments')}` : '')}
        ${row(d.bills.length > 0, 'calendar', t('Fixed costs'), d.bills.length ? `${tn(d.bills.length, '{n} fixed cost', '{n} fixed costs')} · ${fmt.money(bills, CUR)} ${t('a month')}${days ? ' · ' + tn(days, '{n} due day', '{n} due days') : ''}` : '')}
        ${row(!!d.goal, 'flag', d.goal ? esc(d.goal.name) : t('Goal'), d.goal ? [d.goal.target ? t('target {amount}', { amount: fmt.money(d.goal.target, CUR, { trim: true }) }) : t('Fund without a target'), d.goal.saved ? t('{amount} already saved', { amount: fmt.money(d.goal.saved, CUR, { trim: true }) }) : '', d.goal.monthly ? `${fmt.money(d.goal.monthly, CUR, { trim: true })} ${t('a month')}` : ''].filter(Boolean).join(' · ') : '')}</div>
      ${fixedIn && bills ? banner(fixedIn - bills < 0 ? 'warn' : '', `<b>${t('Income minus fixed costs')}: <span class="num">${fmt.money(fixedIn - bills, CUR)}</span></b> ${fixedIn - bills < 0 ? t('The fixed costs are higher than the income that pays them. The plan shows it month by month.') : t('That is what is left of the income that pays your fixed costs.')}`) : ''}
      ${o.sheet ? `<p class="note">${t('Next stop: the spreadsheet import.')}</p>` : ''}
      <div class="ob-foot"><button class="btn ghost" data-a="ob-back">${icon('left')}${t('Back')}</button><span class="spacer"></span><button class="btn primary lg" data-a="ob-finish">${t('Open my dashboard')}</button></div>`;
  }
  return `<main class="auth">${weaveAuth()}<div class="auth-card onb" data-step="${step}">${head}${body}</div>${step && step < OB_STEPS ? later : ''}</main>`;
}
