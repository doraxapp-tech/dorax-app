// Runs every QC suite. First: npm install, then node tools/build.js. Then: node tests/run-all.js   (npm test does all three)
// The calculation suites run once. The browser suites run twice: on the app (app/index.html) and on the one-file preview (dist/dorax-preview.html).
// In both, the server is the stand-in (tools/preview-backend.js): no network is used. With MOTION=1 the browser suites run with animations on.
const { spawnSync } = require('child_process'), path = require('path');
// qc-schema.js runs supabase/schema.sql on a real PostgreSQL where one is installed (and says "skipped" where not);
// qc-deploy.js serves the app with the headers of vercel.json and runs it on the real Supabase library, its requests answered locally.
// qc-pages.js serves the app the same way and checks the addresses of the pages before login (/entrar, /privacidade...), with the stand-in server.
// qc-reminders.js runs the server's reminders function here, with stand-ins for the database, the clock and the network.
const node = ['check-i18n.js', 'engine-qc.js', 'converter-qc.js', 'qc-schema.js', 'qc-reminders.js'], browser = ['flows-auth.js', 'qc-screens.js', 'qc-flows.js', 'qc-sweep.js', 'qc-files.js', 'qc-banks.js', 'qc-bank.js', 'qc-company.js', 'qc-menu.js', 'qc-find.js', 'qc-cats.js', 'qc-codash.js', 'qc-ahead.js', 'qc-insights.js', 'qc-sides.js', 'qc-notices.js', 'qc-phone.js', 'qc-install.js', 'qc-payday.js', 'qc-say.js', 'qc-lock.js', 'qc-thumb.js', 'qc-tidy.js', 'qc-need-account.js', 'qc-goals-phone.js', 'qc-plan-phone.js', 'qc-topbar-phone.js', 'qc-summary-phone.js', 'qc-summary-simple.js', 'qc-logos-photo.js', 'qc-lock-warn.js', 'qc-wallet-beta.js', 'qc-summary-pc.js', 'qc-motion.js', 'qc-rail.js', 'qc-month-phone.js', 'qc-accounts-view.js', 'qc-tx-limit.js', 'qc-card-due.js', 'qc-card-debit.js', 'qc-reports-phone.js'];
const runs = [...node.map(s => [s, null]), ['qc-deploy.js', null], ['qc-pages.js', null], ...browser.map(s => [s, 'app']), ...browser.map(s => [s, 'bundle'])];
let failed = 0;
for (const [s, target] of runs) {
  const r = spawnSync(process.execPath, [path.join(__dirname, s)], { encoding: 'utf8', env: { ...process.env, ...(target ? { DORAX_TARGET: target } : {}) }, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || ''), last = out.trim().split('\n').filter(l => /passed|problems|skipped/.test(l)).pop() || out.trim().split('\n').slice(-3).join(' | ');
  console.log((r.status === 0 ? 'PASS  ' : 'FAIL  ') + (s + (target ? ' [' + target + ']' : '')).padEnd(26) + last);
  if (r.status !== 0) { failed++; console.log(out.split('\n').filter(l => /FAIL|Error/.test(l)).slice(0, 20).join('\n')); }
}
console.log(failed ? `${failed} run(s) failed` : 'All suites pass');
process.exit(failed ? 1 : 0);
