/* Dorax Finance — what saving a transaction ends with, on the summary's look (v200, owner, 2026-10-12: "la notificación de ahora es un pill que sale de
   encima de la pantalla, no me gusta; quiero una animación acorde. Lo mismo con un ingreso registrado: recibir ingresos es motivo de celebración, no al
   punto de confetis, pero puedes usar la acción para motivar a ahorrar").
   1. Money in (a new income of the household): a screen on the forest. What came in counts up in lime, into which account, under a lime coin with the
      arrow coming in; what it changes ("you can spend R$ X a day"); and, while it is fresh, a way to put part of it aside: what the plan asks this month
      for the goal still waiting most, or a tenth of it for the goal nearest to its end, with how far that takes the goal. Its button opens that goal's
      contribution with the amount already in (then slid into the goal: features/goals/goal-win.js). No confetti: a soft glow, the coin settling.
      Without goals, the way to start one. "Not now" closes it.
   2. Any other transaction saved (an expense, a transfer, an edit): no strip at the top. The panel's own button says it, where the eyes are: it turns
      lime with its check ("Recorded", "Saved") for a moment, and the panel goes down; the row washes where it landed, as before.
   Installments keep their note (it says how they were spread). Styles: css/look/look-land-done.css; the screen's frame is the contribution's
   (css/look/look-land-win.css). */

const tdOn = () => typeof landOn === 'function' && landOn();

// ---------- 1. money in ----------
/** What the household had before the income: the day's share to spend. */
const iwBefore = () => { const r = freeUntil(S, S.today, CUR); return { perDay: r && r.free > 0 ? r.perDay : 0 }; };
/** A way to put part of it aside: the goal the month's plan still waits on most (what the plan asks, up to what came in), or a tenth of it for the
    goal nearest to its end. null without a live goal. */
function iwIdea(amount) {
  const bk = B(), ym = ymOf(bk.today), live = bk.goals.filter(g => g.status === 'active' && !isYearly(g)); if (!live.length) return null;
  const due = distribution(bk, ym).rows.filter(r => r.pending > 0 && !isYearly(r.goal)).sort((a, b) => b.pending - a.pending)[0];
  const tenth = Math.max(100, Math.round(amount / 10 / 100) * 100);      // whole reais
  const near = live.filter(g => g.kind === 'goal' && g.target > goalSaved(bk, g.id)).sort((a, b) => goalSaved(bk, b.id) / b.target - goalSaved(bk, a.id) / a.target)[0] || live[0];
  const g = due ? due.goal : near, amt = due ? Math.min(due.pending, amount) : Math.min(tenth, amount);
  const after = g.kind === 'goal' && g.target > 0 ? Math.min(100, Math.round((goalSaved(bk, g.id) + amt) * 100 / g.target)) : null;
  return { g, amt, plan: !!due, after };
}
/** After a new income is recorded (transactions.actions.js: save-tx). */
function iwShow(x, before) {
  const a = acct(x.accountId), r = freeUntil(S, S.today, CUR), perDay = r && r.free > 0 ? r.perDay : 0;
  UI.iw = { amount: Math.abs(x.amount), cur: x.currency, account: a ? a.name : '', merchant: x.merchant, perDay, up: perDay > before.perDay, idea: x.currency === CUR ? iwIdea(Math.abs(x.amount)) : null };
  UI.drawer = null; UI.sheet = 'income-win'; render(); iwPlay();
}
function iwSheet() {
  const w = UI.iw; if (!w) return '';
  const m = v => fmt.money(v, CUR, { trim: true }), i = w.idea;
  const chips = w.up ? `<div class="gw-chips"><span class="gw-chip">${icon('wallet')}${t('You can spend {amount} a day', { amount: m(w.perDay) })}</span></div>` : '';
  const save = i ? `<div class="iw-save"><span class="iw-save-h">${artObj('piggy-bank')}<b>${t('Put some aside while it is fresh')}</b></span>
      <p>${i.plan ? t('Your plan asks {amount} for {goal} this month.', { amount: `<b class="num">${m(i.amt)}</b>`, goal: esc(i.g.name) }) : t('A tenth of it, {amount}, to {goal}.', { amount: `<b class="num">${m(i.amt)}</b>`, goal: esc(i.g.name) })}${i.after !== null ? ' ' + t('It takes the goal to {pct}.', { pct: fmt.pct(i.after) }) : ''}</p>
      <button class="btn primary" data-a="iw-save">${icon('flag')}${t('Save {amount} in {name}', { amount: m(i.amt), name: esc(i.g.name) })}</button></div>`
    : `<div class="iw-save"><span class="iw-save-h">${artObj('piggy-bank')}<b>${t('Put some aside while it is fresh')}</b></span><p>${t('Give part of it a purpose: a goal keeps it apart.')}</p><button class="btn primary" data-a="iw-goal">${icon('flag')}${t('Start a goal')}</button></div>`;
  return `<div class="scrim"></div><div class="gw-win iw-win" role="dialog" aria-modal="true" aria-labelledby="iw-h">
    <div class="gw-in"><span class="iw-coin iw-art" aria-hidden="true">${artObj('coins', 'on-dark')}</span>
      <p class="gw-kick">${esc(t('Into {name}', { name: w.account }))}</p><p class="gw-amt num" id="iw-amt">+${fmt.money(w.amount, w.cur)}</p>
      <h2 class="gw-h" id="iw-h">${esc(w.merchant || t('Money in'))}</h2>${chips}${save}</div>
    <div class="gw-acts"><button class="btn" data-a="iw-done">${t('Not now')}</button></div></div>`;
}
/** Its entrance: the forest rises, the coin settles with a soft glow, what came in counts up, the words and the idea follow. No confetti. */
function iwPlay() {
  const w = UI.iw, el = document.querySelector('#overlay .iw-win'); if (!w || !el) return;
  const first = el.querySelector('[data-a="iw-save"], [data-a="iw-goal"]') || el.querySelector('[data-a="iw-done"]'); if (first) first.focus({ preventScroll: true });
  if (reducedMotion() || !el.animate) return;
  const E = 'cubic-bezier(.16, 1, .3, 1)';
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out', fill: 'backwards' });
  const coin = el.querySelector('.iw-coin'); if (coin) coin.animate([{ transform: 'translateY(-36px) scale(.7)', opacity: 0 }, { transform: 'translateY(4px) scale(1.04)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 620, delay: 120, easing: E, fill: 'backwards' });
  el.querySelectorAll('.gw-kick, .gw-amt, .gw-h, .gw-chips, .iw-save, .gw-acts').forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 300 + i * 70, easing: E, fill: 'backwards' }));
  const num = $('iw-amt'); if (!num) return;
  const drive = num.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 900, delay: 360, easing: E, fill: 'backwards' });
  const step = () => { if (!num.isConnected || drive.playState === 'finished') return; num.textContent = '+' + fmt.money(Math.round(w.amount * (drive.effect.getComputedTiming().progress || 0)), w.cur); requestAnimationFrame(step); };
  requestAnimationFrame(step); drive.finished.then(() => { if (num.isConnected) num.textContent = '+' + fmt.money(w.amount, w.cur); gwBuzz(10); }).catch(() => { });
}

// ---------- 2. the panel's button says it ----------
/** The save button turns lime with its check and its word for a moment, then the panel goes down and the page shows where it landed. */
function tdSaved(word, then) {
  const b = document.querySelector('#overlay [data-a="save-tx"]');
  if (!b || reducedMotion()) return then();
  if (UI.drawer) UI.drawer.saving = true;      // no second tap while it says so
  b.classList.add('td-saved'); b.setAttribute('aria-live', 'polite');
  const t1 = b.querySelector('.bq-save-t'), ic = b.querySelector('.bq-save-ico');
  if (t1) t1.textContent = word; else b.innerHTML = `${icon('check')}<span>${esc(word)}</span>`;
  if (ic) ic.animate([{ transform: 'scale(.7) rotate(-20deg)' }, { transform: 'scale(1.1)', offset: .6 }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.16, 1, .3, 1)' });
  setTimeout(then, 520);
}

const TX_DONE_ACTIONS = {
  /** "Save R$ X in Goal": the goal's contribution, the amount already in. */
  'iw-save'() { const i = UI.iw && UI.iw.idea; UI.iw = null; UI.sheet = false; if (!i) return renderOverlay(); UI.overlayOpen = false; A['goal-move']({ id: i.g.id, dir: 'in', amt: i.amt }); },
  'iw-goal'() { UI.iw = null; UI.sheet = false; UI.overlayOpen = false; A['goal-new']({}); },
  'iw-done'() { UI.iw = null; UI.sheet = false; renderOverlay(); },
};
