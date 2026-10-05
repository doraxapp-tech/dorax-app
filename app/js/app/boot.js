/* Dorax Finance — start-up. */
// The pages before login open at once, in the language this device used last. Whether somebody is logged in is the server library's to
// say, and it may have to read a link from an email (or the way back from Google) out of the address first: nothing here touches the
// address until it has answered.
UI.pub = freshPub();
(async function start() {
  // somebody was logged in on this device, or is arriving through a link: a short wait instead of a flash of the home page
  let waiting = false;
  try { waiting = !!SERVER.ready && (SERVER.arrived.recovery || /access_token=|[?&]code=/.test(location.hash + location.search) || Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k))); } catch (e) { /* no storage here */ }
  if (waiting) UI.pub.screen = 'loading';
  renderNow(); enterView();
  if (!SERVER.ready) { STARTED = true; return; }       // not connected to a server yet: the pages before login work, and the login says what is missing
  SERVER.onAuth(onServerNews);
  const r = await SERVER.session();
  STARTED = true;
  const halfway = t('That link is accepted. Now open the link sent to your other address: the email changes when both were opened.');
  SERVER.cleanAddress();       // a link the library could not use must not stay in the address
  if (r.ok && r.session) {
    // A recovery link asks for a new password only when the person now logged in is the one the link was for. If the link could not be
    // used (too old, or no connection at that moment) and somebody was already logged in here, their account opens, and the page says
    // the link did not work: nobody is ever asked to set a password for an account the link was not for.
    const mine = SERVER.arrived.recovery && SERVER.arrived.owner === r.session.user.id;
    if (mine) return startRecovery();
    await openAccount();
    if (SERVER.arrived.recovery && UI.session) toast(serverSays('otp_expired')); else if (SERVER.arrived.halfway && UI.session) toast(halfway);
    return;
  }
  if (SERVER.arrived.recovery && r.ok) { UI.pub = { ...freshPub(), screen: 'auth', mode: 'login', error: serverSays('otp_expired') }; renderNow(); return; }
  // somebody was logged in here, but the server could not be asked (no connection): say so instead of showing the home page as if nobody were
  if (!r.ok && waiting) return showGate('offline', { error: serverSays(r.code), reload: true });
  // nobody is logged in. A link that did not work (too old, used before) or a cancelled Google says so on the login.
  const why = SERVER.arrived.error;
  if (why) { UI.pub = { ...freshPub(), screen: 'auth', mode: 'login', [why === 'access_denied' ? 'notice' : 'error']: serverSays(why === 'access_denied' || why === 'otp_expired' ? why : 'otp_expired') }; renderNow(); return; }
  if (SERVER.arrived.halfway) { UI.pub = { ...freshPub(), screen: 'auth', mode: 'login', notice: halfway }; renderNow(); return; }
  if (waiting) { UI.pub = freshPub(); renderNow(); enterView(); }
})();
// Installing as an app: the manifest is linked only where it can be read (a web server). Opened from disk, or inside the one-file preview, there is none.
if (/^https?:$/.test(location.protocol) && !document.getElementById('lib-pdf')) { const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.webmanifest'; document.head.appendChild(l); }
