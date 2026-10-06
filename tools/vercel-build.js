// Dorax Finance — what Vercel runs when it deploys (vercel.json: "buildCommand"). node tools/vercel-build.js
// The app is plain files: nothing is compiled. Two things happen here:
//   1. the checks of tools/build.js (a file missing from the list in app/index.html stops the deploy instead of breaking the site);
//   2. app/config.js is written from the project's environment variables, so the Supabase address and public key never have to be
//      typed into a file. The Supabase integration for Vercel adds these variables by itself; they can also be added by hand in
//      Vercel > Project > Settings > Environment Variables:
//          SUPABASE_URL                 https://<project>.supabase.co
//          SUPABASE_PUBLISHABLE_KEY     sb_publishable_...      (older projects: SUPABASE_ANON_KEY, the "anon public" key)
//      With no such variables the config.js in the repository is deployed as it is (fill it in by hand, see DEPLOY.md).
// A SECRET key is refused: this file ends up in every visitor's browser.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const fail = m => { console.error('\nvercel-build: ' + m + '\n'); process.exit(1); };
/** The first of these variables that has a value, without the quotes or spaces a copy and paste sometimes leaves round it. */
const env = (...names) => { for (const n of names) { const v = String(process.env[n] || '').trim().replace(/^(['"])(.*)\1$/, '$2').trim(); if (v) return { name: n, value: v }; } return null; };

// the bank logos that are in app/assets/banks/ are listed for the app (tools/build-banks.js), so adding a file and deploying is all it takes
try { require('./build-banks.js').write(); } catch (e) { fail('the list of bank logos could not be written: ' + e.message); }
const check = spawnSync(process.execPath, [path.join(__dirname, 'build.js'), '--check'], { stdio: 'inherit' });
if (check.status !== 0) fail('the checks failed (see above). Nothing was deployed.');

const url = env('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL');
const key = env('SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');
const file = path.join(__dirname, '..', 'app', 'config.js');

/** True for a key that must never reach a browser: the new secret keys, and the old "service_role" key (a token that says so inside). */
function isSecret(k) {
  if (/^sb_secret_/.test(k)) return true;
  const part = k.split('.')[1]; if (!part) return false;
  try { return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).role === 'service_role'; } catch (e) { return false; }
}
const live = process.env.VERCEL_ENV === 'production';
if (url && key) {
  if (isSecret(key.value)) fail(`${key.name} holds a SECRET key (service role). That key opens the whole database and must never be in the browser.\nPut the PUBLISHABLE key there (sb_publishable_..., or the old "anon public" key).`);
  const address = url.value.replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(address)) fail(`${url.name} does not look like a Supabase address (https://<project>.supabase.co): ${url.value}`);
  if (!/^[A-Za-z0-9._-]{20,}$/.test(key.value)) fail(`${key.name} does not look like a Supabase key (letters, digits, dots, dashes and underscores only). Copy it again from Supabase > Project Settings > API Keys.`);
  if (!/\.supabase\.co$/i.test(address)) console.warn(`vercel-build: NOTE. ${address} is not a *.supabase.co address (a custom domain?). The browser is only allowed to connect to *.supabase.co:\nadd this address to "connect-src" in vercel.json, or saving and logging in will be blocked.`);
  const head = fs.readFileSync(file, 'utf8').split('window.DORAX_CONFIG')[0];       // the explanation at the top of the file is kept
  fs.writeFileSync(file, head + `window.DORAX_CONFIG = {\n  supabaseUrl: ${JSON.stringify(address)},\n  supabaseKey: ${JSON.stringify(key.value)},\n};\n`);
  console.log(`vercel-build: app/config.js written from ${url.name} and ${key.name} (${address.replace(/^https:\/\//, '').split('.')[0]})`);
} else if (url || key) {
  fail(`only one of the two Supabase variables is set (${(url || key).name}). The app needs both: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. See DEPLOY.md, step 5.`);
} else {
  // no variables: the file in the repository is what gets deployed. It is read the way a browser reads it, whatever quotes it uses.
  const box = { window: {} }; try { require('vm').runInNewContext(fs.readFileSync(file, 'utf8'), box); } catch (e) { fail('app/config.js cannot be read: ' + e.message); }
  const c = box.window.DORAX_CONFIG || {}, filled = /^https:\/\//.test(c.supabaseUrl || '') && String(c.supabaseKey || '').length >= 20;
  if (isSecret(String(c.supabaseKey || ''))) fail('app/config.js holds a SECRET key (service role). Replace it with the PUBLISHABLE key, and rotate the secret key in Supabase: it has been in a file that is public.');
  if (filled) console.log('vercel-build: no Supabase variables in this environment; app/config.js is deployed as it is in the repository.');
  else if (live) fail('this is the production deploy and the app is not connected to a Supabase project: no SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY variables, and app/config.js is empty.\nNobody could log in. Add the two variables in Vercel > Project > Settings > Environment Variables and deploy again (DEPLOY.md, step 5).');
  else console.warn('vercel-build: WARNING. No Supabase variables in this environment and app/config.js is empty.\nThe site will open, but nobody can log in: the login says "not connected". See DEPLOY.md, step 5.');
}
