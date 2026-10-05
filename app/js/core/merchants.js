/* Dorax Finance — calculations: tidying a description, matching rules, spotting duplicates. */
// ---------- text normalisation, rules, merchants ----------
function normalizeText(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, ' ')   // embedded dates
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function titleCase(s) { return s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()); }

/** Highest priority active rule whose pattern appears in the normalised description. */
function matchRule(description, accountId, rules) {
  const norm = normalizeText(description);
  let best = null;
  for (const r of rules) {
    if (!r.active) continue;
    if (r.accountId && r.accountId !== accountId) continue;
    const p = normalizeText(r.pattern);
    if (!p || !norm.includes(p)) continue;
    if (!best || r.priority > best.priority || (r.priority === best.priority && p.length > normalizeText(best.pattern).length)) best = r;
  }
  return best;
}
function categorize(description, accountId, rules) {
  const rule = matchRule(description, accountId, rules);
  if (rule) return { ruleId: rule.id, merchant: rule.merchant, mk: rule.k && rule.k.merchant || null, categoryId: rule.categoryId, subcategoryId: rule.subcategoryId || null, transfer: !!rule.transfer };
  const words = normalizeText(description).split(' ').filter(w => !/^\d+$/.test(w)).slice(0, 3).join(' ');
  return { ruleId: null, merchant: titleCase(words || 'Unknown'), categoryId: null, subcategoryId: null, transfer: false };
}

// ---------- fingerprints & duplicates ----------
// 64-bit FNV-1a rendered as hex: quick, and enough to tell the rows of one account apart. It is a fingerprint for spotting duplicates, not a secret.
function hashHex(str) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) ^ (h2 >>> 13);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}
function fingerprint(accountId, date, merchant, amount) {
  return hashHex([accountId, date, normalizeText(merchant), amount].join('|'));
}
/** Returns {txn, certainty: 'exact' | 'possible'} or null. Uncertain matches are flagged, never merged silently. */
function findDuplicate(row, accountId, txns) {
  let possible = null;
  for (const t of txns) {
    if (t.accountId !== accountId || t.amount !== row.amount) continue;
    if (row.sourceTxnId && t.sourceTxnId && row.sourceTxnId === t.sourceTxnId) return { txn: t, certainty: 'exact' };
    const gap = Math.abs(dayDiff(t.date, row.date));
    if (gap > 2) continue;
    const a = normalizeText(row.merchant || row.description), b = normalizeText(t.merchant);
    const rawA = normalizeText(row.description), rawB = normalizeText(t.description);
    const same = a === b || rawA === rawB || rawA.includes(b) || rawB.includes(a);
    if (same && gap === 0) return { txn: t, certainty: 'exact' };
    if (same || gap === 0) possible = possible || { txn: t, certainty: 'possible' };
  }
  return possible;
}
