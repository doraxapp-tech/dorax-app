/* Dorax Finance — calculations: dates. (The engine is split by subject in this folder; all of it is pure functions with no page access.). */
/* Dorax Finance — finance engine (pure functions, no DOM).
   All money is integer minor units (cents). Nothing here uses floating-point arithmetic on amounts. */

// ---------- dates (ISO strings, no timezone maths) ----------
function ymOf(iso) { return iso.slice(0, 7); }
function addMonths(ym, n) {
  let [y, m] = ym.split('-').map(Number);
  m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1;
  return y + '-' + String(m).padStart(2, '0');
}
function daysInMonth(ym) { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function isoDate(ym, day) { return ym + '-' + String(Math.min(day, daysInMonth(ym))).padStart(2, '0'); }
function dayDiff(a, b) { return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000); }
function addDays(iso, n) { return new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
