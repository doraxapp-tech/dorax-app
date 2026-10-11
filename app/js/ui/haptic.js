/* Dorax Finance — a small vibration under the finger.
   Owner, 2026-10-10: "add small vibrations to the numbers of the lock screen". So each digit of the PIN, and erasing one, answers with a short tap
   felt in the hand, and a wrong PIN with two.
   Android (and any browser with navigator.vibrate): a few milliseconds of the motor. An iPhone has no navigator.vibrate in Safari; from iOS 18 a
   switch (<input type="checkbox" switch>) gives the system's own light tick when it is flipped, and a click on its label flips it, so on a touch
   device without vibrate a hidden one is flipped. That only works inside the tap itself (a wrong PIN is known a moment later: there, one tick at
   most). Nothing happens on a computer, nor where the device's own settings turn vibration off. Decoration: it never carries meaning alone. */
const HAPTIC = (() => {
  let label = null;
  const coarse = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  /** The hidden switch whose label is clicked: out of sight, out of the tab order, hidden from screen readers. */
  function sw() {
    if (label && label.isConnected) return label;
    const box = document.createElement('div'), input = document.createElement('input');
    box.id = 'haptic'; box.setAttribute('aria-hidden', 'true'); box.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    input.type = 'checkbox'; input.setAttribute('switch', ''); input.id = 'haptic-sw'; input.tabIndex = -1;
    label = document.createElement('label'); label.htmlFor = 'haptic-sw';
    box.append(input, label); document.body.appendChild(box); return label;
  }
  /** pattern: milliseconds, or [on, off, on…] as navigator.vibrate takes it. */
  return function buzz(pattern) {
    try {
      if (typeof navigator.vibrate === 'function') { navigator.vibrate(pattern); return; }
      if (!coarse()) return;
      const was = document.activeElement; sw().click();
      if (was && was !== document.activeElement && was.focus) was.focus({ preventScroll: true });      // the key keeps the focus
    } catch (e) { /* no vibration here: nothing to say */ }
  };
})();
/** The three the lock uses: a digit, erasing one, a wrong PIN. */
const haptic = {
  tap: () => HAPTIC(8),
  erase: () => HAPTIC(6),
  wrong: () => HAPTIC([28, 60, 28]),
};
