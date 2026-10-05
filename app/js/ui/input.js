/* Dorax Finance — shared: new ids, and reading amounts and counts typed by the person. */
// New ids are a prefix and a number. The counter restarts with the page, and since v13 the data outlives the page: before v39 the first things
// created after a reload got numbers that were already in use (a second account became "a1001" next to the first "a1001"), and whatever looks a
// thing up by its id (an account, a goal, a fixed cost, a payment) could then find the wrong one. The counter now starts above every id of the
// account that is open, and is worked out again whenever another account is opened or a backup is restored.
let uid = 1000, uidFor = null;
function newId(p) {
  if (uidFor !== S) { uidFor = S; let max = 1000; const re = /"id":"[^"\d]*(\d{1,12})"/g, text = JSON.stringify(S); for (let m; (m = re.exec(text));) { const n = +m[1]; if (n > max) max = n; } uid = Math.max(uid, max); }
  return p + (++uid);
}
/** Plain amount for grid cells and inputs: no symbol, cents dropped when zero. */
const plain = c => fmt.money(c, null, { bare: true, trim: true });
/** A whole number typed by the person (a count of quotas), or NaN. "1.000" with the 1.234,56 format is one thousand: before v39 it was read
    as 1, because the point was taken for a decimal mark. A decimal part or a letter is refused. */
function typedCount(str) {
  const raw = String(str == null ? '' : str).replace(/[\s\u00a0]/g, ''), group = S.settings.locale === 'pt-BR' ? '\\.' : ',';
  if (/^\d+$/.test(raw)) return Number(raw);
  return new RegExp('^\\d{1,3}(' + group + '\\d{3})+$').test(raw) ? Number(raw.replace(/\D/g, '')) : NaN;
}
/** An amount typed by the person, in cents, or null when it cannot be read.
    The statement reader (parseAmount) has to guess what a bank meant, so it skips letters and treats "45,905" as forty-five thousand.
    A person typing in a form is different: until v39 "45,905" (a slip for 45,90) was saved as R$ 45.905,00, a yield of "0,085" as R$ 85,00
    and "1o0" as 10. Here letters are refused, and a mark followed by three digits is read with the number format chosen in Settings:
    with 1.234,56 the point groups thousands and a comma with three digits is refused; with 1,234.56 it is the other way round. */
function typedAmount(str) {
  const raw = String(str == null ? '' : str).replace(/−/g, '-').replace(/R\$|US\$|[\s\u00a0]/gi, '');
  const m = /^([+-]?)(\(?)([\d.,]+)(\)?)$/.exec(raw);
  if (!m || !/\d/.test(m[3]) || (!!m[2] !== !!m[4])) return null;
  const body = m[3], br = S.settings.locale === 'pt-BR', group = br ? '.' : ',', at = Math.max(body.lastIndexOf('.'), body.lastIndexOf(','));
  const digits = x => /^\d*$/.test(x) ? x : /^\d{1,3}([.,]\d{3})+$/.test(x) && new Set(x.replace(/\d/g, '')).size === 1 ? x.replace(/[.,]/g, '') : null;
  let whole, frac = '';
  if (at < 0) whole = body;
  else {
    const left = body.slice(0, at), right = body.slice(at + 1), mark = body[at];
    if (right.length === 3) { if (mark !== group || digits(body) === null) return null; whole = digits(body); }      // 1.234 (or 1,234 in the other format): thousands
    else if (right.length <= 2) { whole = digits(left); frac = right; if (whole === null || (left.includes(mark))) return null; }
    else return null;
  }
  if (whole === null || whole.length > 13) return null;
  const cents = Number(whole || '0') * 100 + Number(frac.padEnd(2, '0') || '0');
  return m[1] === '-' || m[2] ? -cents : cents;
}
