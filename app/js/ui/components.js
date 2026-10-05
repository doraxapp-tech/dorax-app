/* Dorax Finance — shared: small pieces of screen (amount, chip, meter, banner, switch, segmented control, year stepper, column chart). */
function amountHtml(x) {
  const cls = x.type === 'income' ? 'pos' : x.type === 'transfer' ? 'muted' : '';
  return `<span class="${cls}">${fmt.money(x.amount, x.currency, { sign: true })}</span>`;
}
function statusChip(x) {
  if (x.status === 'pending') return `<span class="chip warn"><i></i>${t('Pending')}</span>`;
  if (x.status === 'ignored') return `<span class="chip">${t('Ignored')}</span>`;
  return '';
}
/** A bar for a share of something. Level 'go' is the green one (savings, goals, card limit); nothing is drawn at zero, so an empty bar never looks started. */
function meter(pct, level) { return `<div class="meter ${level === 'ok' ? '' : level}" role="img" aria-label="${Math.round(pct)}%">${pct > 0 ? `<i style="width:${Math.min(100, pct)}%"></i>` : ''}</div>`; }
function banner(level, html, ic) { return `<div class="banner ${level}">${icon(ic || (level === 'crit' || level === 'warn' ? 'alert' : 'info'))}<div class="grow">${html}</div></div>`; }
function sw(id, checked, action, data, label) {
  return `<label class="switch"><input type="checkbox" id="${id}" data-c="${action}" ${data || ''}${checked ? ' checked' : ''}><span class="track"></span>${label ? `<span>${esc(label)}</span>` : `<span class="sr">${t('Toggle')}</span>`}</label>`;
}
function seg(action, pairs, sel, label) {
  return `<div class="seg" role="group" aria-label="${esc(label)}">${pairs.map(([v, l]) => `<button data-a="${action}" data-v="${esc(v)}" aria-pressed="${String(v) === String(sel)}">${esc(l)}</button>`).join('')}</div>`;
}
/** Change vs the previous month as a pill. goodUp: true when a rise is good (income, savings), false when a fall is good (spending). */
function delta(cur, prev, prevLabel, goodUp) {
  if (!prev) return `<span class="delta">${t('No data for {month}', { month: esc(prevLabel) })}</span>`;
  const p = Math.round((cur - prev) * 1000 / Math.abs(prev)) / 10, cls = p === 0 || goodUp == null ? '' : (p > 0) === goodUp ? 'up' : 'down';
  return `<span class="delta"><span class="pill ${cls}">${p > 0 ? '▲' : p < 0 ? '▼' : '•'} ${fmt.pct(Math.abs(p))}</span> ${t('vs {month}', { month: esc(prevLabel) })}</span>`;
}
/** Year stepper: previous / next within the years that exist. */
function yearStepper(action, years, year) {
  const i = years.indexOf(year);
  return `<div class="stepper" role="group" aria-label="${t('Year')}"><button data-a="${action}" data-v="${years[i - 1] || ''}" ${i > 0 ? '' : 'disabled'} aria-label="${t('Previous year')}">${icon('left')}</button><span>${year}</span><button data-a="${action}" data-v="${years[i + 1] || ''}" ${i < years.length - 1 ? '' : 'disabled'} aria-label="${t('Next year')}">${icon('right')}</button></div>`;
}

/** Column chart in HTML: one series, selected month emphasised, value shown on the selected column only. */
function colChart(points, selected, cur, action) {
  const max = Math.max(1, ...points.map(p => p.value));
  const step = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 250000, 500000, 1000000, 2000000].find(s => max / s <= 4) || 5000000;
  const top = Math.ceil(max / step) * step, ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return `<div class="cols"><div class="yaxis">${ticks.map(v => `<span>${fmt.axis(v)}</span>`).join('')}</div>
  <div class="plot">${ticks.map((v, i) => `<div class="gl ${i === 0 ? 'base' : ''}" style="bottom:calc(22px + (100% - 22px) * ${v / top})"></div>`).join('')}
  ${points.map((p, i) => `<button class="colbtn" data-a="${action || 'set-month'}" data-ym="${p.ym}" aria-pressed="${p.ym === selected}" data-tip="${esc(fmt.month(p.ym))}: ${esc(fmt.money(p.value, cur))}${p.partial ? ' ' + esc(t('(month in progress)')) : ''}" aria-label="${esc(fmt.month(p.ym))}, ${esc(fmt.money(p.value, cur))}">
    ${p.ym === selected ? `<span class="v">${fmt.money(p.value, cur, { round: top >= 50000 })}</span>` : ''}<i style="height:${Math.max(0.5, p.value * 100 / top)}%;--i:${i}"></i><span class="x">${fmt.month(p.ym, 'bare')}</span></button>`).join('')}</div></div>`;
}
