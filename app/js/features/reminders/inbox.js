/* Dorax Finance — what Dorax told the person inside the app, kept for the bell.
   Owner, 2026-10-10: "the bell is not only for reminders, it is also for the web app's notifications: group them so they are organised". The bell's
   panel has two parts, Reminders (what is due, as before) and Updates: what Dorax said in a notice, so it can be read again after the notice
   closed. Two kinds today: a curiosity (its fact, read again in the current language, with its source) and a milestone passed (days of freedom,
   the company's runway, a goal reached). Kept with the account (user.inbox), the newest first, the last 30; the same curiosity shown again
   moves to the top instead of repeating. An update not seen yet counts on the bell and wears a dot until the Updates part is opened. */
const INBOX_MAX = 30;
const inboxList = () => (Array.isArray(S.user.inbox) ? S.user.inbox : []);
const inboxKey = x => x.kind === 'curio' ? 'curio:' + x.id : 'cheer:' + (x.cheer === 'goal' ? 'goal:' + x.name : (x.co ? 'co:' : '') + x.mark);
/** A notice Dorax has just shown: kept for the bell. */
function inboxAdd(x) {
  const item = x.kind === 'curio' ? { kind: 'curio', id: x.id } : { kind: 'cheer', cheer: x.cheer, mark: x.mark || 0, co: !!x.co, name: x.name || '' };
  const key = inboxKey(item), list = S.user.inbox = inboxList().filter(k => k.key !== key);
  list.unshift({ ...item, key, at: new Date().toISOString(), read: false });
  if (list.length > INBOX_MAX) list.length = INBOX_MAX;
  bellRefresh();
}
/** The bell drawn again where it is, alone: its count follows without drawing the top bar (a flame lighting up there is left alone). */
function bellRefresh() { document.querySelectorAll('#topbar .bell').forEach(b => { b.outerHTML = bellButton(); }); }
const inboxUnread = () => inboxList().filter(x => !x.read).length;
/** The Updates part was looked at: nothing is new any more (the dots stay on screen until the panel is drawn again). */
function inboxSeen() { let n = 0; inboxList().forEach(x => { if (!x.read) { x.read = true; n++; } }); if (n) { save(); bellRefresh(); } }
/** One update, as the notice said it. */
function inboxRow(x, fresh) {
  const when = x.at ? fmt.date(String(x.at).slice(0, 10)) : '';
  let ico = 'spark', title = '', text = '', src = '';
  if (x.kind === 'curio') {
    const f = curioFacts()[x.id]; if (!f) return '';
    ico = 'bulb'; title = t('Did you know?'); text = f[0]; src = t('Source: {name}', { name: esc(f[1]) });
  } else {
    title = x.cheer === 'goal' ? t('{name}: reached!', { name: esc(x.name) }) : x.co ? t('The company passed {mark} of runway!', { mark: rwMark(x.mark) }) : t('You passed {mark} of freedom!', { mark: rwMark(x.mark) });
    text = x.cheer === 'goal' ? t('What is saved reaches its target.') : '';
  }
  return `<div class="nt-row${fresh ? ' new' : ''}"><span class="nt-ico">${icon(ico)}</span><div class="grow"><div class="nt-h"><b>${title}</b><small>${esc(when)}</small></div>${text ? `<p>${text}</p>` : ''}${src ? `<small class="nt-src">${src}</small>` : ''}</div>${fresh ? `<i class="nt-dot" aria-label="${esc(t('New'))}"></i>` : ''}</div>`;
}
/** The Updates part of the bell's panel: milestones, then curiosities, each newest first. */
function inboxPart(fresh) {
  const list = inboxList(), cheers = list.filter(x => x.kind === 'cheer'), facts = list.filter(x => x.kind === 'curio');
  if (!list.length) return `<div class="empty" style="padding:22px 0"><b>${t('No updates yet')}</b>${t('What Dorax tells you inside the app, a curiosity or a milestone passed, stays here to read again.')}</div>`;
  const part = (title, rows) => rows.length ? `<div class="rem-group nt-group"><h3>${title}</h3>${rows.map(x => inboxRow(x, fresh.has(x.key))).join('')}</div>` : '';
  return part(t('Milestones'), cheers) + part(t('Curiosities'), facts);
}
