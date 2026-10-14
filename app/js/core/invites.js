/* Dorax Finance — calculations: the invitations (v228; owner, 2026-10-14: "si el usuario no ha creado rachas, ni desafíos, ni un sprint de días sin
   gastar, Dorax debe enviarle notificaciones recurrentes para ello, sin ser spam").
   Three invitations, each to something the person has not started:
     journey  the way out of debt (features/journey), only to someone who owes something (a written debt, or a card that owes) and never ran a sprint
              nor marked a day
     s52      the 52-week challenge (core/challenges.js), never started
     ns       the days without spending, never started
   Not spam, by rule:
     - one invitation a week at most, of any kind, and never on a Sunday (the weekly summary's day);
     - the same one at most every three weeks, and three times in all (the server keeps what it sent for 120 days: tools of the job, index.ts);
     - only on a morning with nothing else to say (logic.mjs: messageFor sends it only when there is no reminder), so one message a day;
     - never to someone who has recorded nothing yet (their first steps come first), nor on a company's side;
     - its own switch (user.notify.invites, on until switched off), and each one also follows its part's switch (Journey, Challenges).
   Started, it is never offered again: the invitation is about what is missing, not a campaign. The words: features/reminders/invite-messages.js.
   The server's daily job uses this file too (tools/build-functions.js). */
const INVITE_KINDS = ['journey', 's52', 'ns'];
const INVITE_MAX = 3, INVITE_GAP = 7, INVITE_SAME_GAP = 21;
/** The invitations that would make sense today, in their order: what the person has not started and could use. */
function inviteCandidates(state, today) {
  if (state.scope === 'business') return [];
  const n = (state.user || {}).notify || {}; if (n.invites === false) return [];
  if (!(state.transactions || []).length) return [];
  const out = [], j = state.journey || {}, ch = challengesOf(state);
  const journeyUsed = !!(j.sprint || (j.sprints || []).length || Object.keys(j.checks || {}).length);
  if (n.journey !== false && !journeyUsed && journeyDebts(state, today, bookCur(state)).some(x => x.left > 0)) out.push('journey');
  if (n.challenges !== false && !ch.save52 && !(ch.ended || []).some(x => x.kind === 's52')) out.push('s52');
  if (n.challenges !== false && !ch.nospend && !(ch.ended || []).some(x => x.kind === 'ns')) out.push('ns');
  return out;
}
/** The days an invitation went out, from what the server remembers having sent ('invite|kind|YYYY-MM-DD'), up to today, oldest first. */
const inviteDays = (sent, kind, today) => [...sent].filter(s => s.startsWith('invite|' + kind + '|')).map(s => s.slice(('invite|' + kind + '|').length)).filter(d => d <= today).sort();
/** Today's invitation, or null: { kind, n (the how-manieth time, 1 to 3), key }. Of those allowed today, the one never sent first, then the one sent
    longest ago, in the order of the list. */
function invitePick(state, today, sent) {
  if (new Date(today + 'T12:00:00Z').getUTCDay() === 0) return null;
  const last = INVITE_KINDS.flatMap(k => inviteDays(sent, k, today)).sort().pop();
  if (last && dayDiff(today, last) < INVITE_GAP) return null;
  const ok = inviteCandidates(state, today).filter(k => { const d = inviteDays(sent, k, today); return d.length < INVITE_MAX && (!d.length || dayDiff(today, d[d.length - 1]) >= INVITE_SAME_GAP); });
  if (!ok.length) return null;
  const lastOf = k => inviteDays(sent, k, today).pop() || '';
  const kind = ok.slice().sort((a, b) => lastOf(a) < lastOf(b) ? -1 : lastOf(a) > lastOf(b) ? 1 : 0)[0];
  return { kind, n: inviteDays(sent, kind, today).length + 1, key: 'invite|' + kind + '|' + today };
}
