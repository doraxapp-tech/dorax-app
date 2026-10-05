/* Dorax Finance — shared: money, dates, percentages, month names, the (i) hint. */
/** (i): a small button beside a figure that may need explaining. Hover, keyboard focus or a tap shows the text; a screen reader reads it as the button's name. */
const info = text => `<button type="button" class="hint" data-tip="${esc(text)}" aria-label="${esc(text)}">${icon('info')}</button>`;
const SYMBOL = { BRL: 'R$', USD: 'US$', EUR: '€' };
const MONTH_NAMES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
};
const MONTH_LONG = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
};
const mon = (i, long) => (long ? MONTH_LONG : MONTH_NAMES)[S.settings.lang][i];

const fmt = {
  t,
  /** Formats cents without converting to a float: integer part and cents are handled separately. */
  money(cents, cur, opt) {
    opt = opt || {};
    if (opt.round) cents = Math.round(cents / 100) * 100;      // without cents the amount is rounded to the unit, not cut: 214,80 is 215 (before v39 it read 214)
    const neg = cents < 0, abs = Math.abs(cents), br = S.settings.locale === 'pt-BR';
    const whole = String(Math.trunc(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, br ? '.' : ',');
    const body = opt.round || (opt.trim && abs % 100 === 0) ? whole : whole + (br ? ',' : '.') + String(abs % 100).padStart(2, '0');
    return (neg ? '−' : opt.sign && cents > 0 ? '+' : '') + (opt.bare ? '' : (SYMBOL[cur || BASE_CURRENCY] || cur) + ' ') + body;
  },
  axis(cents) { const v = cents / 100; return v >= 1000 ? fmt.num(Math.round(v / 100) / 10) + 'k' : String(v); },
  num(n) { return S.settings.locale === 'pt-BR' ? String(n).replace('.', ',') : String(n); },
  date(iso, full) {
    const [y, m, d] = iso.split('-');
    if (S.settings.locale === 'pt-BR') return full ? `${d}/${m}/${y}` : `${d}/${m}`;
    return full ? `${d} ${mon(+m - 1)} ${y}` : `${mon(+m - 1)} ${d}`;
  },
  month(ym, short) { const [y, m] = ym.split('-'); return mon(+m - 1, !short) + (short === 'bare' ? '' : ' ' + y); },
  pct(n) { return fmt.num(n) + '%'; },
  /** An amount per quota given in 1/10000 of the currency unit: at least two decimals, up to four. */
  unit(u, cur) { const s = String(Math.abs(Math.round(u))).padStart(5, '0'), dec = s.slice(-4).replace(/0{1,2}$/, ''); return (u < 0 ? '−' : '') + (SYMBOL[cur || BASE_CURRENCY] || cur) + ' ' + s.slice(0, -4) + (S.settings.locale === 'pt-BR' ? ',' : '.') + dec; },
};
