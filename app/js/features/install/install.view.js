/* Dorax Finance — putting the app on the home screen: the banner at the top of the app and the panel with the steps. The device's side is install.js. */

/** The banner: one line that says what it is for, the button, and a way to close it for good on this device. Drawn at the very top of the app
    (app/shell.js), on an Android or iOS device that is showing Dorax in a browser tab. */
// the app's icon as the logo book draws it: the d at half the tile's height on #121212, its quarter in the brand's green (drawn here, so the banner
// needs no file)
const INSTALL_ICON = '<svg class="ins-app" viewBox="-60 -35 180 180" aria-hidden="true" focusable="false"><rect x="-60" y="-35" width="180" height="180" rx="40" fill="#121212"/><g fill="none" stroke="#FAFAFA" stroke-width="15"><circle cx="30" cy="70" r="22.5"/><path stroke="#3ECF8E" d="M7.5 70a22.5 22.5 0 0 1 22.5-22.5"/></g><rect x="45" y="10" width="15" height="90" fill="#FAFAFA"/></svg>';
function installBanner() {
  if (!INSTALL.due()) return '';
  return `<aside class="install-bar" id="install-bar" aria-label="${t('Add Dorax to your home screen')}">${INSTALL_ICON}<span class="grow"><b>${t('Add Dorax to your home screen')}</b><small>${t('It opens like an app: full screen, one tap away.')}</small></span>
    <button class="btn sm primary" data-a="install-add">${t('Add')}</button><button class="btn ghost sm x" data-a="install-close" aria-label="${t('Not now')}">${icon('x')}</button></aside>`;
}
/** The steps, where the device does not let the app start the installing itself (every iPhone and iPad; an Android browser that made no offer). */
function installDrawer() {
  const ios = INSTALL.kind() !== 'android';
  // Apple's own Share mark: a box with an arrow leaving it
  const share = `<svg class="ins-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 15V3.5M8 7l4-3.6L16 7"/><path d="M8.5 10.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.500a2 2 0 0 0-2-2h-1.500"/></svg>`;
  const steps = ios
    ? [[t('Tap Share'), t('The box with an arrow, in the browser’s bar.'), share], [t('Choose “Add to Home Screen”'), t('Scroll down the list if you do not see it.'), icon('plus')], [t('Tap “Add”'), t('Dorax appears among your apps. Open it from there.'), icon('check')]]
    : [[t('Open the browser’s menu'), t('The three dots, at the top or the bottom of the screen.'), icon('more')], [t('Choose “Add to Home screen” or “Install app”'), t('The words change a little from one browser to another.'), icon('plus')], [t('Confirm'), t('Dorax appears among your apps. Open it from there.'), icon('check')]];
  return `<div class="body"><p class="lead sm">${ios ? t('On an iPhone or iPad the browser does this part, in three taps:') : t('This browser does this part from its own menu:')}</p>
    <ol class="ins-steps">${steps.map(([title, text, mark], i) => `<li><span class="fl-ico">${mark}</span><span class="grow"><b>${i + 1}. ${title}</b><small>${text}</small></span></li>`).join('')}</ol>
    ${ios ? `<p class="note">${t('Notifications on an iPhone work only once Dorax is on the Home Screen.')}</p>` : ''}</div>
  <footer><button class="btn primary" data-a="close">${t('Got it')}</button><button class="btn ghost spacer" data-a="install-close">${t('Do not show the banner again')}</button></footer>`;
}
