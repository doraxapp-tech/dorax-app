// QC of the menu beside the person's name and of the top bar it emptied (owner, 2026-10-06: "center the switches, remove from the top bar
// in dashboard: language switch and the light/dark switch. create a 3 dot menu next to the user name in the sidebar and place those there
// and add also the logout button, help button there").
//   1. the top bar has no language and no light/dark control, on any screen;
//   2. the three dots beside the name open a menu with language, appearance, help and log out, and each one works;
//   3. it can be used with the keyboard alone, closes with Escape or a click elsewhere, and reads well in both themes and three languages;
//   4. the Household / Company switch is centred: between the title and the tools on a wide screen, in the middle on a phone;
//   5. a phone, which has no side bar, has the same four things in More.
const { open, ok, eq, done, TARGET } = require('./pw.js');

(async () => {
  const tag = TARGET + ': ';
  const quiet = p => p.waitForFunction(() => !document.querySelector('#toast-root').innerText.trim(), null, { timeout: 15000 }).catch(() => {});
  {
    const o = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }), p = o.page;
    // ---------------------------------------------------------------- 1. the top bar
    eq(await p.evaluate(() => ROUTES.map(r => { navigate(r[0]); return [...document.querySelectorAll('#topbar select, #topbar .tbtn, #topbar [data-a="theme"], #topbar [data-k="lang"], #topbar [data-k="theme"]')].length; }).reduce((a, b) => a + b, 0)), 0, tag + 'no screen has a language or a light/dark control in the top bar');
    await p.evaluate(() => navigate('dashboard'));
    eq(await p.evaluate(() => [...document.querySelectorAll('#topbar .bar-tools > *')].map(el => el.className.split(' ')[0] || el.tagName)), ['bell', 'btn'], tag + 'the dashboard’s top bar keeps the bell and the main button');

    // ---------------------------------------------------------------- 2. the menu
    eq(await p.evaluate(() => { const b = document.querySelector('#rail-foot #user-menu-btn'), who = document.querySelector('#rail-foot .who').getBoundingClientRect(), r = b.getBoundingClientRect(); return [b.getAttribute('aria-expanded'), b.getAttribute('aria-controls'), b.getAttribute('aria-label'), !!b.querySelector('svg'), r.left >= who.right - 1 && Math.abs((r.top + r.bottom) / 2 - (who.top + who.bottom) / 2) <= 2, r.width >= 32 && r.height >= 32, !!document.querySelector('#user-menu'), !!document.querySelector('#rail-foot > [data-a="logout"]')]; }),
      ['false', 'user-menu', 'More options', true, true, true, false, false], tag + 'three dots sit beside the name, level with it, closed; the log out button is no longer loose beside the name');
    await p.click('#user-menu-btn');
    eq(await p.evaluate(() => { const m = document.querySelector('#user-menu'), r = m.getBoundingClientRect(), foot = document.querySelector('#rail-foot').getBoundingClientRect(), rail = document.querySelector('.rail').getBoundingClientRect();
      return [document.querySelector('#user-menu-btn').getAttribute('aria-expanded'), m.getAttribute('role'), m.getAttribute('aria-label'), [...m.querySelectorAll('select, button')].map(el => el.id || el.dataset.a + (el.dataset.v ? ':' + el.dataset.v : '')), [...m.querySelectorAll('label, .umenu-l, .umenu-item span')].map(el => el.innerText.trim()), [...m.querySelectorAll('[data-a="theme-set"]')].map(b => [b.getAttribute('aria-label'), b.getAttribute('aria-pressed')]), document.activeElement.id,
        r.bottom <= foot.top && r.top >= 0 && r.left >= rail.left && r.right <= rail.right, [...m.querySelectorAll('.umenu-row, .umenu-item')].every(el => el.getBoundingClientRect().height >= 40), [...m.querySelectorAll('select, .seg')].every(s => s.getBoundingClientRect().right <= r.right - 6), getComputedStyle(m).boxShadow]; }),
      ['true', 'group', 'More options', ['lang', 'theme-set:dark', 'theme-set:light', 'help', 'logout'], ['Language', 'Appearance', 'Help', 'Log out'], [['Dark', 'true'], ['Light', 'false']], 'lang', true, true, true, 'none'],
      tag + 'they open a group above the name, inside the side bar, with language, appearance, help and log out in that order; the language is focused; every row is 40px or taller; no shadow');
    // keyboard: Tab walks the four, then leaves; Escape closes and gives the focus back
    const order = []; for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); order.push(await p.evaluate(() => document.activeElement.id || document.activeElement.dataset.a + (document.activeElement.dataset.v ? ':' + document.activeElement.dataset.v : ''))); }
    eq(order, ['theme-set:dark', 'theme-set:light', 'help', 'logout'], tag + 'Tab goes from the language to Dark, to Light, to help, to log out');
    await p.keyboard.press('Escape');
    eq(await p.evaluate(() => [UI.menu, !!document.querySelector('#user-menu'), document.activeElement.id]), [false, false, 'user-menu-btn'], tag + 'Escape closes it and the focus is back on the three dots');
    // language and appearance
    await p.keyboard.press('Enter'); await p.waitForSelector('#user-menu');
    await p.selectOption('#lang', 'pt');
    eq(await p.evaluate(() => [S.settings.lang, document.documentElement.lang, UI.menu, document.querySelector('#user-menu label').innerText.trim(), document.querySelector('#rail-foot [data-a="logout"] span').innerText.trim(), document.activeElement.id, [...document.querySelectorAll('#lang option')].map(x => x.textContent)]), ['pt', 'pt', true, 'Idioma', 'Sair', 'lang', ['Español', 'Português', 'English']], tag + 'choosing a language changes the app at once; the menu stays open, in the new language, with the focus where it was');
    await p.click('#user-menu [data-a="theme-set"][data-v="light"]');
    eq(await p.evaluate(() => [S.settings.theme, document.documentElement.classList.contains('app-light'), UI.menu, [...document.querySelectorAll('#user-menu [data-a="theme-set"]')].map(b => b.getAttribute('aria-pressed')), document.activeElement.dataset.v, !!document.querySelector('#umenu-theme svg')]), ['light', true, true, ['false', 'true'], 'light', true], tag + 'Light changes the appearance at once; the menu stays open, Light reads as chosen and keeps the focus');
    // it reads well in both themes and the three languages
    for (const theme of ['light', 'dark']) for (const lang of ['pt', 'es', 'en']) eq(await p.evaluate(([th, l]) => { S.settings.theme = th; S.settings.lang = l; UI.menu = true; render();
      const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }, m = document.querySelector('#user-menu'), bg = getComputedStyle(m).backgroundColor, box = m.getBoundingClientRect();
      const ratio = el => { const a = lum(getComputedStyle(el).color), b = lum(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      return [[...m.querySelectorAll('label, .umenu-l, .umenu-item')].every(el => ratio(el) >= 4.5), [...m.querySelectorAll('label, .umenu-l, .umenu-item span, select, .seg')].every(el => { const r = el.getBoundingClientRect(); return r.right <= box.right - 5 && el.scrollWidth <= el.clientWidth + 1; }), [...m.querySelectorAll('.umenu-row')].every(row => row.firstElementChild.getBoundingClientRect().right <= row.lastElementChild.getBoundingClientRect().left - 4),
        (() => { const sel = m.querySelector('#lang'), cs = getComputedStyle(sel), probe = document.createElement('span'); probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`; document.body.appendChild(probe);
          const widest = Math.max(...[...sel.options].map(o => { probe.textContent = o.textContent; return probe.getBoundingClientRect().width; })); probe.remove(); return widest <= sel.clientWidth - parseFloat(cs.paddingLeft) - 18; })()]; }, [theme, lang]),
      [true, true, true, true], tag + `${theme} ${lang}: every text of the menu has a contrast of 4.5 or more, fits its row, no label runs into its control, and the longest language name fits its list`);
    // a click anywhere else closes it, and the click still does its job
    await p.evaluate(() => { S.settings.lang = 'en'; UI.menu = true; render(); });
    await p.click('#nav a[href="#accounts"]');
    eq(await p.evaluate(() => [UI.menu, UI.route, !!document.querySelector('#user-menu')]), [false, 'accounts', false], tag + 'a click on the menu’s outside closes it and still opens what was clicked');
    await p.click('#user-menu-btn'); await p.click('.topbar h1');
    eq(await p.evaluate(() => UI.menu), false, tag + 'so does a click on the page');
    await p.click('#user-menu-btn'); await p.click('#user-menu-btn');
    eq(await p.evaluate(() => [UI.menu, document.querySelector('#user-menu-btn').getAttribute('aria-expanded')]), [false, 'false'], tag + 'and a second click on the three dots');
    // a short window: the menu is still whole
    await p.setViewportSize({ width: 1100, height: 520 }); await p.click('#user-menu-btn');
    eq(await p.evaluate(() => { const r = document.querySelector('#user-menu').getBoundingClientRect(); return [r.top >= 0, r.bottom <= innerHeight, document.documentElement.scrollWidth - innerWidth <= 0]; }), [true, true, true], tag + 'in a short window the menu is still entirely on screen');
    await p.setViewportSize({ width: 1440, height: 900 });
    // help
    await p.evaluate(() => { UI.menu = true; render(); }); await p.click('#user-menu [data-a="help"]'); await p.waitForSelector('#ct-message');
    eq(await p.evaluate(() => [UI.menu, UI.drawer.kind, !!document.querySelector('#user-menu')]), [false, 'contact', false], tag + 'Help closes the menu and opens the panel to write to Dorax');
    await p.evaluate(() => A.close());
    // the profile link beside the dots still works
    await p.click('#rail-foot .who'); eq(await p.evaluate(() => UI.route), 'profile', tag + 'the name still opens the profile');

    // ---------------------------------------------------------------- 4. the switch is centred
    for (const [w, h] of [[1440, 900], [1100, 760], [960, 700]]) { await p.setViewportSize({ width: w, height: h });
      for (const cur of [false, true]) eq(await p.evaluate(two => { navigate('plan'); A.space({ v: 'business' }); if (!two) { UI.space = 'personal'; render(); }
        const s = document.querySelector('.topbar .space').getBoundingClientRect(), h1 = document.querySelector('.topbar h1').getBoundingClientRect(), m = document.querySelector('.topbar .month').getBoundingClientRect();
        return [Math.abs((s.left - h1.right) - (m.left - s.right)) <= 2, s.left >= h1.right + 8, s.right <= m.left - 8, Math.abs((s.top + s.bottom) / 2 - (h1.top + h1.bottom) / 2) <= 3, document.documentElement.scrollWidth - innerWidth <= 0]; }, cur),
        [true, true, true, true, true], tag + `${w}px${cur ? ', with the currency' : ''}: the switch is in the middle of the room between the title and the tools, on the title’s line, touching neither`); }
    await p.setViewportSize({ width: 1440, height: 900 });
    // ---------------------------------------------------------------- log out, from the menu
    await p.evaluate(() => { S.settings.theme = 'dark'; UI.space = 'personal'; render(); save(); saveNow(); }); await p.waitForFunction(() => savedState() === 'saved' && accountJson() === SYNC.last);
    await p.click('#user-menu-btn'); await p.click('#user-menu [data-a="logout"]'); await p.waitForSelector('.lp-actions');
    eq(await p.evaluate(() => [UI.session, UI.menu, document.querySelector('.app').hidden]), [null, false, true], tag + 'Log out, from the menu, logs out and leaves no menu open behind it');
    eq(o.errors, [], tag + 'no errors'); await o.browser.close();
  }
  // ---------------------------------------------------------------- 5. a phone
  for (const lang of ['en', 'es', 'pt']) {
    const o = await open({ lang, account: 'example', plan: true, viewport: { width: 390, height: 800 }, mobile: true, touch: true }), p = o.page, where = `${tag}${lang} 390: `, T = k => p.evaluate(k => t(k), k);
    eq(await p.evaluate(() => [getComputedStyle(document.querySelector('.rail')).display, document.querySelectorAll('#topbar select, #topbar .tbtn').length]), ['none', 0], where + 'no side bar, and nothing about language or appearance in the top bar');
    await p.evaluate(() => { navigate('plan'); A.space({ v: 'business' }); });
    eq(await p.evaluate(() => { const s = document.querySelector('.pagehead .space'), kids = [...s.children].map(k => k.getBoundingClientRect()), l = Math.min(...kids.map(k => k.left)), r = Math.max(...kids.map(k => k.right)); return [Math.abs((l + r) / 2 - innerWidth / 2) <= 2, l >= 12 && r <= innerWidth - 12, document.documentElement.scrollWidth - innerWidth <= 0]; }), [true, true, true], where + 'the switch and its currency are in the middle of the screen, inside it');
    await p.click('#tabbar [data-a="sheet"]'); await p.waitForSelector('.sheet [data-a="help"]');
    eq(await p.evaluate(() => { const sh = document.querySelector('.sheet'), ids = [...sh.querySelectorAll('select, button')].map(el => el.id || el.dataset.a), help = sh.querySelector('[data-a="help"]'), out = sh.querySelector('[data-a="logout"]'); sh.scrollTop = sh.scrollHeight; const h = help.getBoundingClientRect(), u = out.getBoundingClientRect(), box = sh.getBoundingClientRect();
      return [ids, help.innerText.trim(), h.height >= 44 && u.height >= 44, h.bottom <= u.top + 1, Math.abs(h.width - u.width) <= 1 && h.width >= box.width - 30, u.bottom <= innerHeight]; }),
      [['lang-m', 'theme-m', 'help', 'logout'], await T('Help'), true, true, true, true], where + 'More holds the language, the appearance, Help and Log out, in that order; Help and Log out are full rows a thumb can hit');
    await p.evaluate(() => document.querySelector('.sheet [data-a="help"]').click()); await p.waitForSelector('#ct-message');
    eq(await p.evaluate(() => [UI.sheet, UI.drawer.kind]), [false, 'contact'], where + 'Help closes More and opens the panel to write to Dorax');
    eq(o.errors, [], where + 'no errors'); await o.browser.close();
  }
  done('qc-menu');
})().catch(e => { console.error('qc-menu: Error', e); process.exit(1); });
