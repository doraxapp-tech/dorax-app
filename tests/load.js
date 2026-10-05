// Loads the app's calculation files (no page, no browser) so the tests can call them directly.
const fs = require('fs'), path = require('path'), vm = require('vm');
function load(extra) {
  const ctx = { console, Math, Date, JSON, Intl, TextEncoder, TextDecoder, Uint8Array, Array, Object, String, Number, Set, Map, RegExp, parseInt, parseFloat, isNaN, unescape, encodeURIComponent };
  vm.createContext(ctx);
  // the calculation files and what a new account starts with, in the order index.html lists them
  const app = path.join(__dirname, '..', 'app'), html = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(f => /^js\/(core|data)\//.test(f)).concat(extra || []);
  let code = files.map(f => fs.readFileSync(path.join(app, f), 'utf8')).join('\n');
  // the example account is a test fixture now (the app itself is blank): the calculations are checked against it
  code += '\n' + fs.readFileSync(path.join(__dirname, 'fixtures', 'example-account.js'), 'utf8');
  const names = [...code.matchAll(/^(?:async\s+)?function\s+(\w+)|^(?:const|let)\s+(\w+)\s*=/gm)].map(m => m[1] || m[2]);
  code += '\n;({' + [...new Set(names)].join(',') + '})';
  return vm.runInContext(code, ctx);
}
module.exports = { load };
