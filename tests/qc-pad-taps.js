// QC of the amount and its keypad on a phone (v202, owner, 2026-10-12: "sigue el glitch con el input del importe en registrar transacción: cuando
// abre el menú y toco el field todo se vuelve loco, toco en un lado y se activa otra cosa", "esto en la versión móvil"; features/phone/bosque-tx.js).
//   1. the amount is a button the keys write into, never a field: tapping it focuses no field and brings the keypad up; the keys, the decimal mark
//      and erase show in it and on "Save"; while the keypad is up a lime line follows the figure;
//   2. a field being written in (what it was) lets go when a button of the form is tapped, and when the amount is tapped the keypad waits for the
//      phone's keyboard to be gone before it comes up (nothing moves twice at once under the finger);
//   3. saved with no amount: the amount is marked, read as such, and its keys come back;
//   4. a keyboard of its own (a narrow window on a computer): its digits type into the amount; no error.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, mobile: true, touch: true });
  await page.evaluate(() => { S.settings.themePhone = 'light'; navigate('dashboard'); render(); }); await page.waitForTimeout(400);
  await page.tap('#quick-acts [data-v="expense"]'); await page.waitForSelector('#overlay .bq-pad');

  // ---------- 1. the amount ----------
  eq(await page.evaluate(() => { const a = document.getElementById('d-amount'); return [a.tagName, a.type, document.getElementById('d-amount-l').textContent.startsWith('Amount'), a.textContent.trim(), document.querySelector('.tx-amount').classList.contains('typing'), !UI.drawer.padOff]; }),
    ['BUTTON', 'button', true, '0,00', true, true], 'the amount is a button with its name, “0,00” until something is typed; the keypad up and the line after the figure');
  for (const k of ['4', '2', 'sep', '5', '0', '9']) await page.tap(`#overlay .bq-key[data-v="${k}"]`);
  eq(await page.evaluate(() => [UI.drawer.draft.amountText, document.getElementById('d-amount').value, document.getElementById('d-amount').textContent, document.getElementById('bq-save-amt').textContent]), ['42,50', '42,50', '42,50', 'R$ 42,50'], 'the keys write into it (two digits after the mark at most) and on “Save”');
  await page.tap('#overlay .bq-key[data-v="del"]');
  eq(await page.evaluate(() => UI.drawer.draft.amountText), '42,5', 'erase takes the last one');

  // ---------- 2. fields and the phone's keyboard ----------
  await page.tap('#d-merchant'); await page.waitForTimeout(350);
  eq(await page.evaluate(() => [document.activeElement.id, UI.drawer.padOff, document.querySelector('.tx-amount').classList.contains('typing')]), ['d-merchant', true, false], 'what it was, tapped: its field takes the focus, the keypad goes down and the line with it');
  // a phone keyboard up: the screen's view shorter than the page, as an iPhone has it while the keyboard is out
  await page.evaluate(() => { const v = new EventTarget(); v.height = innerHeight - 330; v.width = innerWidth; v.offsetTop = 0; v.offsetLeft = 0; v.scale = 1; window.__vv = v; Object.defineProperty(window, 'visualViewport', { value: v, configurable: true }); });
  await page.tap('#d-amount'); await page.waitForTimeout(120);
  eq(await page.evaluate(() => [document.activeElement.id === 'd-merchant', UI.drawer.padOff]), [false, true], 'the amount tapped while the keyboard is out: the field lets go, and the keypad waits for the keyboard to go down');
  await page.evaluate(() => { window.__vv.height = innerHeight; window.__vv.dispatchEvent(new Event('resize')); }); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [UI.drawer.padOff, document.activeElement.tagName === 'INPUT']), [false, false], 'the keyboard gone: the keypad comes up, and no field holds the focus');
  await page.evaluate(() => { window.__vv.height = innerHeight - 330; });
  await page.tap('#d-merchant'); await page.waitForTimeout(300); await page.tap('#overlay .tx-pick'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.activeElement.id !== 'd-merchant'), 'a category tapped while writing what it was: the field lets go (an iPhone would keep its keyboard up)');
  await page.evaluate(() => { delete window.visualViewport; });

  // ---------- 3. saved with no amount ----------
  await page.tap('#d-amount'); await page.waitForTimeout(300);
  for (let i = 0; i < 6; i++) await page.tap('#overlay .bq-key[data-v="del"]');
  await page.fill('#d-merchant', 'Bakery'); await page.tap('#overlay .tx-pick'); await page.waitForTimeout(200);
  await page.tap('#overlay .bq-save'); await page.waitForTimeout(400);
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.invalid, document.getElementById('d-amount').getAttribute('aria-invalid'), !UI.drawer.padOff, getComputedStyle(document.querySelector('.tx-amount')).boxShadow.includes('inset')]), ['d-amount', 'true', true, true], 'saved with no amount: the amount marked and read as such, its keys back up');

  // ---------- 4. a keyboard of its own ----------
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  for (const k of ['7', ',', '2', '5']) await page.keyboard.press(k);
  eq(await page.evaluate(() => UI.drawer.draft.amountText), '7,25', 'a keyboard’s digits and its decimal mark type into the amount');
  await page.keyboard.press('Backspace');
  eq(await page.evaluate(() => UI.drawer.draft.amountText), '7,2', 'and its erase key');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-pad-taps');
})();
