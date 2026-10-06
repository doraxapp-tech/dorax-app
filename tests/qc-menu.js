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
    eq(await p.evaluate(() => { const b = document.querySelector('#rail-foot #user-menu-btn'), r = b.getBoundingClientRect(), foot = document.querySelector('#rail-foot').getBoundingClientRect(), dots = b.querySelector('.who-more').getBoundingClientRect(), name = b.querySelector('.who-t').getBoundingClientRect();
      return [b.tagName, b.getAttribute('aria-expanded'), b.getAttribute('aria-controls'), b.getAttribute('aria-label'), !!b.querySelector('.avatar svg'), b.querySelector('.who-t b').innerText.trim(), dots.left >= name.right - 1 && dots.right <= r.right, r.width >= foot.width - 20 && r.height >= 36, !!document.querySelector('#user-menu'), document.querySelectorAll('#rail-foot a, #rail-foot > [data-a="logout"]').length]; }),
      ['BUTTON', 'false', 'user-menu', 'Alex: More options', true, 'Alex', true, true, false, 0], tag + 'the person’s card (picture, name, three dots) is one button that opens the menu; nothing in it leads straight to the profile or logs out');
    await p.click('#user-menu-btn');
    eq(await p.evaluate(() => { const m = document.querySelector('#user-menu'), r = m.getBoundingClientRect(), foot = document.querySelector('#rail-foot').getBoundingClientRect(), rail = document.querySelector('.rail').getBoundingClientRect();
      return [document.querySelector('#user-menu-btn').getAttribute('aria-expanded'), m.getAttribute('role'), m.getAttribute('aria-label'), [...m.querySelectorAll('a, select, button')].map(el => el.getAttribute('href') || el.id || el.dataset.a + (el.dataset.v ? ':' + el.dataset.v : '')), [...m.querySelectorAll('label, .umenu-l, .umenu-item span')].map(el => el.innerText.trim()), [...m.querySelectorAll('[data-a="theme-set"]')].map(b => [b.getAttribute('aria-label'), b.getAttribute('aria-pressed')]), document.activeElement.getAttribute('href'),
        r.bottom <= foot.top && r.top >= 0 && r.left >= rail.left && r.right <= rail.right, [...m.querySelectorAll('.umenu-row, .umenu-item')].every(el => el.getBoundingClientRect().height >= 40), [...m.querySelectorAll('select, .seg')].every(s => s.getBoundingClientRect().right <= r.right - 6), getComputedStyle(m).boxShadow]; }),
      ['true', 'group', 'More options', ['#profile', 'lang', 'theme-set:dark', 'theme-set:light', 'help', 'logout'], ['Profile', 'Language', 'Appearance', 'Help', 'Log out'], [['Dark', 'true'], ['Light', 'false']], '#profile', true, true, true, 'none'],
      tag + 'it opens a group above the name, inside the side bar, with profile, language, appearance, help and log out in that order; the first row is focused; every row is 40px or taller; no shadow');
    // keyboard: Tab walks the four, then leaves; Escape closes and gives the focus back
    const order = []; for (let i = 0; i < 5; i++) { await p.keyboard.press('Tab'); order.push(await p.evaluate(() => document.activeElement.id || document.activeElement.dataset.a + (document.activeElement.dataset.v ? ':' + document.activeElement.dataset.v : ''))); }
    eq(order, ['lang', 'theme-set:dark', 'theme-set:light', 'help', 'logout'], tag + 'Tab goes from the profile to the language, to Dark, to Light, to help, to log out');
    await p.keyboard.press('Escape');
    eq(await p.evaluate(() => [UI.menu, !!document.querySelector('#user-menu'), document.activeElement.id]), [false, false, 'user-menu-btn'], tag + 'Escape closes it and the focus is back on the card');
    // language and appearance
    await p.keyboard.press('Enter'); await p.waitForSelector('#user-menu');
    await p.focus('#lang'); await p.selectOption('#lang', 'pt');
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
    eq(await p.evaluate(() => [UI.menu, document.querySelector('#user-menu-btn').getAttribute('aria-expanded')]), [false, 'false'], tag + 'and a second click on the card');
    // a short window: the menu is still whole
    await p.setViewportSize({ width: 1100, height: 520 }); await p.click('#user-menu-btn');
    eq(await p.evaluate(() => { const r = document.querySelector('#user-menu').getBoundingClientRect(); return [r.top >= 0, r.bottom <= innerHeight, document.documentElement.scrollWidth - innerWidth <= 0]; }), [true, true, true], tag + 'in a short window the menu is still entirely on screen');
    await p.setViewportSize({ width: 1440, height: 900 });
    // help
    await p.evaluate(() => { UI.menu = true; render(); }); await p.click('#user-menu [data-a="help"]'); await p.waitForSelector('#ct-message');
    eq(await p.evaluate(() => [UI.menu, UI.drawer.kind, !!document.querySelector('#user-menu')]), [false, 'contact', false], tag + 'Help closes the menu and opens the panel to write to Dorax');
    await p.evaluate(() => A.close());
    // the profile is a row of the menu now (owner: "move the profile tab into a button in the 3 dot dropdown")
    await p.click('#user-menu-btn'); await p.click('#user-menu a[href="#profile"]');
    eq(await p.evaluate(() => [UI.route, UI.menu, document.querySelector('.pagehead h1').innerText.trim()]), ['profile', false, 'Profile'], tag + 'the menu’s first row opens the profile and closes the menu');
    await p.click('#user-menu-btn'); eq(await p.evaluate(() => document.querySelector('#user-menu a[href="#profile"]').getAttribute('aria-current')), 'page', tag + 'on the profile, that row reads as the page being shown'); await p.keyboard.press('Escape');
    // the profile itself: no choice of voice any more, and a picture instead of two letters
    eq(await p.evaluate(() => [/How I talk to you|With some spark|Just the facts/.test(document.querySelector('#view').innerText), document.querySelectorAll('#view [data-a="user-tone"], #view .pick').length, [...document.querySelectorAll('#view .card-h h2')].map(h => h.innerText.trim()).slice(0, 3), typeof A['user-tone']]),
      [false, 0, ['You', 'Email and login', 'Reminders'], 'undefined'], tag + 'the profile no longer has “How I talk to you”: the cards are You, Email and login, Reminders');
    eq(await p.evaluate(() => [...document.querySelectorAll('.avatar')].map(a => { const svg = a.querySelector('svg'), r = a.getBoundingClientRect(), disc = svg.querySelector('circle'), cs = getComputedStyle(a); return [a.innerText.trim(), !!svg, disc.getAttribute('fill'), [...svg.querySelectorAll('[stroke]')].map(x => x.getAttribute('stroke')).sort().join(' '), Math.round(r.width) === Math.round(r.height), cs.borderRadius, a.getAttribute('aria-hidden')]; })),
      [['', true, '#006239', '#3ECF8E #F4F7F5', true, '50%', 'true'], ['', true, '#006239', '#3ECF8E #F4F7F5', true, '50%', 'true']], tag + 'the person’s picture, in the side bar and on the profile, is a round drawing in the logo’s green with its light green accent: no initials');
    eq(await p.evaluate(() => { const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; }, ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05); return [ratio('#F4F7F5', '#006239') >= 3, ratio('#3ECF8E', '#006239') >= 3]; }), [true, true], tag + 'the figure and its accent stand out from the green behind them (3 to 1 or more)');

    // ---------------------------------------------------------------- 4. the switch is centred, and nothing moves when the side changes
    // (owner: "the width of the header and the content in that tab changes a bit due to the fact that the BRL | USD switch is appearing")
    eq(await p.evaluate(() => [getComputedStyle(document.documentElement).scrollbarGutter, document.documentElement.classList.contains('in-app')]), ['stable', true], tag + 'inside the app the room of the page’s scroll bar is always kept, so a short page is exactly as wide as a long one');
    for (const [w, h] of [[1440, 900], [1280, 800], [1100, 760], [960, 700]]) { await p.setViewportSize({ width: w, height: h });
      for (const route of ['plan', 'goals']) {
        const at = await p.evaluate(r => { navigate(r); const box = s => { const x = document.querySelector(s).getBoundingClientRect(); return [Math.round(x.left * 10) / 10, Math.round(x.top * 10) / 10, Math.round(x.width * 10) / 10]; };
          const read = () => ({ seg: box('.topbar .space > .seg'), hint: box('.topbar .space .hint'), h1: box('.topbar h1'), month: box('.topbar .month'), bell: box('.topbar .bell'), main: box('.topbar .btn.primary'), bar: box('#topbar'), view: box('#view') });
          A.space({ v: 'personal' }); const home = read(), ghost = document.querySelector('.space-ghost'), hidden = [!!ghost, ghost && getComputedStyle(ghost).visibility, ghost && ghost.getAttribute('aria-hidden'), document.querySelectorAll('.space [data-a="space-cur"]').length];
          document.querySelector('.space [data-a="space"][data-v="personal"]').focus(); const tabbable = [...document.querySelectorAll('.space button')].filter(b => getComputedStyle(b).visibility !== 'hidden').map(b => b.dataset.a || 'hint');
          A.space({ v: 'business' }); const co = read(), cur = box('.topbar .space .space-tail .seg'), shown = getComputedStyle(document.querySelector('.space [data-a="space-cur"]')).visibility;
          A.space({ v: 'personal' }); return { home, co, hidden, tabbable, cur, shown, over: document.documentElement.scrollWidth - innerWidth <= 0 }; }, route);
        const sameLine = Math.abs(at.co.seg[1] - at.co.month[1]) < 20;
        eq([JSON.stringify(at.home) === JSON.stringify(at.co), at.hidden, at.tabbable, at.shown, at.cur[0] >= at.co.hint[0] + at.co.hint[2], !sameLine || at.cur[0] + at.cur[2] <= at.co.month[0] - 6, at.over],
          [true, [true, 'hidden', 'true', 2], ['space', 'space', 'hint'], 'visible', true, true, true], tag + `${w}px ${route}: going from Household to Company moves nothing: the switch, the (i), the title, the month, the bell, the main button and the page keep their place and width; the currency appears in room that was kept for it, after the (i), and on the household’s side it is neither seen nor reachable`);
        if (w >= 1280) ok(Math.abs((at.co.seg[0] + at.co.seg[2] / 2) - (at.co.h1[0] + at.co.h1[2] + at.co.month[0]) / 2) <= 2 && Math.abs(at.co.seg[1] + 15 - (at.co.h1[1] + 12)) <= 8, tag + `${w}px ${route}: Household | Company itself is in the exact middle of the room between the title and the month, on the title’s line`, at.co);
      } }
    // one company currency: nothing is kept, because nothing can appear
    eq(await p.evaluate(() => { const keep = S.accounts; S.accounts = keep.filter(a => !(a.scope === 'business' && a.currency === 'USD')); navigate('plan'); const pos = () => Math.round(document.querySelector('.topbar .space > .seg').getBoundingClientRect().left * 10) / 10; A.space({ v: 'personal' }); const a = pos(), ghost = !!document.querySelector('.space-ghost'); A.space({ v: 'business' }); const b = pos(), cur = !!document.querySelector('[data-a="space-cur"]'); A.space({ v: 'personal' }); S.accounts = keep; render(); return [a === b, ghost, cur]; }), [true, false, false], tag + 'with one company currency there is no currency to keep room for, and the switch does not move either');
    await p.setViewportSize({ width: 1440, height: 900 });
    // ---------------------------------------------------------------- log out, from the menu
    await p.evaluate(() => { S.settings.theme = 'dark'; UI.space = 'personal'; render(); save(); saveNow(); }); await p.waitForFunction(() => savedState() === 'saved' && accountJson() === SYNC.last);
    await p.click('#user-menu-btn'); await p.click('#user-menu [data-a="logout"]'); await p.waitForSelector('.lp-actions');
    eq(await p.evaluate(() => [UI.session, UI.menu, document.querySelector('.app').hidden, document.documentElement.classList.contains('in-app'), getComputedStyle(document.documentElement).scrollbarGutter]), [null, false, true, false, 'auto'], tag + 'Log out, from the menu, logs out and leaves no menu open behind it; the pages before login are laid out as they always were');
    eq(o.errors, [], tag + 'no errors'); await o.browser.close();
  }
  // ---------------------------------------------------------------- 5. a phone
  for (const lang of ['en', 'es', 'pt']) {
    const o = await open({ lang, account: 'example', plan: true, viewport: { width: 390, height: 800 }, mobile: true, touch: true }), p = o.page, where = `${tag}${lang} 390: `, T = k => p.evaluate(k => t(k), k);
    eq(await p.evaluate(() => [getComputedStyle(document.querySelector('.rail')).display, document.querySelectorAll('#topbar select, #topbar .tbtn').length]), ['none', 0], where + 'no side bar, and nothing about language or appearance in the top bar');
    await p.evaluate(() => { navigate('plan'); A.space({ v: 'business' }); });
    eq(await p.evaluate(() => { const pos = () => ['.pagehead .space > .seg', '.pagehead .space .hint', '.pagehead h1', '.pagehead .month', '#view'].map(s => { const x = document.querySelector(s).getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.width)]; });
      const co = pos(), cur = document.querySelector('.pagehead [data-a="space-cur"]').closest('.seg').getBoundingClientRect(), h1 = document.querySelector('.pagehead h1').getBoundingClientRect(); A.space({ v: 'personal' }); const home = pos(); A.space({ v: 'business' });
      return [JSON.stringify(home) === JSON.stringify(co), Math.abs(co[0][0] - h1.left) <= 1, cur.right <= innerWidth - 12, document.documentElement.scrollWidth - innerWidth <= 0]; }), [true, true, true, true], where + 'with two company currencies the switch starts under the title and nothing moves when the side changes; the currency fits beside it');
    eq(await p.evaluate(() => { const keep = S.accounts; S.accounts = keep.filter(a => !(a.scope === 'business' && a.currency === 'USD')); render(); const kids = [document.querySelector('.pagehead .space > .seg'), document.querySelector('.pagehead .space .hint')].map(k => k.getBoundingClientRect()), l = Math.min(...kids.map(k => k.left)), r = Math.max(...kids.map(k => k.right)), a = kids[0].left; A.space({ v: 'personal' }); const b = document.querySelector('.pagehead .space > .seg').getBoundingClientRect().left; A.space({ v: 'business' }); S.accounts = keep; render();
      return [Math.abs((l + r) / 2 - innerWidth / 2) <= 2, a === b]; }), [true, true], where + 'with one company currency the switch is in the middle of the screen, and stays there');
    await p.click('#tabbar [data-a="sheet"]'); await p.waitForSelector('.sheet [data-a="help"]');
    eq(await p.evaluate(() => { const sh = document.querySelector('.sheet'), ids = [...sh.querySelectorAll('select, button')].map(el => el.id || el.dataset.a), help = sh.querySelector('[data-a="help"]'), out = sh.querySelector('[data-a="logout"]'); sh.scrollTop = sh.scrollHeight; const h = help.getBoundingClientRect(), u = out.getBoundingClientRect(), box = sh.getBoundingClientRect();
      return [ids, help.innerText.trim(), h.height >= 44 && u.height >= 44, h.bottom <= u.top + 1, Math.abs(h.width - u.width) <= 1 && h.width >= box.width - 30, u.bottom <= innerHeight]; }),
      [['find', 'lang-m', 'theme-m', 'help', 'logout'], await T('Help'), true, true, true, true], where + 'More holds the search, then the language, the appearance, Help and Log out, in that order; Help and Log out are full rows a thumb can hit');
    await p.evaluate(() => document.querySelector('.sheet [data-a="help"]').click()); await p.waitForSelector('#ct-message');
    eq(await p.evaluate(() => [UI.sheet, UI.drawer.kind]), [false, 'contact'], where + 'Help closes More and opens the panel to write to Dorax');
    eq(o.errors, [], where + 'no errors'); await o.browser.close();
  }
  done('qc-menu');
})().catch(e => { console.error('qc-menu: Error', e); process.exit(1); });
