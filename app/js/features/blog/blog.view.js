/* Dorax Finance — the blog (v210; owner, 2026-10-13, on the artifact built in the home page's style: "me gusta el blog, publica todo").
   Two pages of the website, made of the home page's parts (.lp2, css/public/landing-v2.css; the bar and the footer: landing.view.js):
     /blog          the centred title, the categories as the home page's Home / Company switch, the featured post as the calculator's white and mint
                    card, then every post as a card on a white band. A post's picture is its big figure, as the home page's bands; its colour says
                    its category (tips sage, news forest, curiosities mint), and its tag says it in words too.
     /blog/<post>   the title centred, by whom, when and how long to read; its figure on a band; the text in one column; where Dorax helps; the
                    sources and the date; three more posts.
   Before login each post is a page with its own address (ui/pages.js); opened from the app (UI.webBlog) the same pages show over it, with "Back to
   Dorax". The posts themselves: blog-posts.js. Styles: css/screens/blog.css. */
/** A post's words, escaped, with "R$" kept on the same line as its figure. */
const blogEsc = s => esc(s).replace(/R\$ (?=\d)/g, 'R$&nbsp;');
const blogCatName = c => ({ tips: t('Tips'), news: t('News'), curiosities: t('Curiosities') })[c] || '';
/** "13 oct 2026": the date a post was written, in the language on screen. */
function blogDate(iso) {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString({ pt: 'pt-BR', es: 'es-ES', en: 'en-GB' }[S.settings.lang] || 'pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return iso; }
}
const blogHref = id => PAGES.on ? PAGES.href('blog') + (id ? '/' + id : '') : '#';
const blogMins = p => t('{n} min read', { n: p.mins });
/** A post as a card: its category, its figure, its title and what it is about. A real link, so it can be opened in another tab. */
function blogCard(p) {
  const x = blogText(p);
  return `<a class="bl-card ${p.cat}" href="${blogHref(p.id)}" data-a="blog-post" data-v="${p.id}">
    <span class="bl-card-top"><span class="bl-tag">${blogCatName(p.cat)}</span><span class="bl-mins">${t('{n} min', { n: p.mins })}</span></span>
    <span class="bl-fig" aria-hidden="true">${blogEsc(x.fig)}</span>
    <h3>${blogEsc(x.title)}</h3><p>${blogEsc(x.excerpt)}</p></a>`;
}
/** The way in, before login: the home page's lime closing box. */
const blogEnd = () => UI.session ? '' : `<section class="l2-end bl-end"><div class="l2-wrap"><div class="l2-end-box"><h2 class="l2-h2">${t('Make sense of the numbers you have.')}</h2><div class="l2-end-r">${l2Go('forest lg')}<p>${t('Free')} · ${t('No card')}</p></div></div></div></section>`;
function blogList() {
  const cat = BLOG_CATS.includes(UI.blogCat) ? UI.blogCat : '', f = BLOG_POSTS.find(p => p.featured) || BLOG_POSTS[0];
  const shown = BLOG_POSTS.filter(p => cat ? p.cat === cat : p !== f), fx = blogText(f);
  const seg = [['', t('All')], ...BLOG_CATS.map(c => [c, blogCatName(c)])].map(([c, name]) => `<button type="button" data-a="blog-cat" data-v="${c}" aria-pressed="${cat === c}">${c ? `<span class="bl-dot ${c}" aria-hidden="true"></span>` : ''}${name}</button>`).join('');
  const head = { '': [t('Latest'), t('To read over a coffee.')], tips: [t('Tips'), t('Ideas to organise your month.')], news: [t('News'), t('What changes in your pocket.')], curiosities: [t('Curiosities'), t('Things about money you did not know.')] }[cat];
  return `<header class="l2-top"><div class="l2-wrap">${l2Bar('blog')}<section class="bl-hero"><div class="l2-copy">${l2Eyebrow(t('Dorax blog'))}
      <h1 class="l2-h1" id="bl-title" tabindex="-1">${t('Your money,')} <span class="hl">${t('explained simply.')}</span></h1>
      <p class="l2-lead">${t('Tips to organise your month, news that touches your pocket and curiosities about money in Brazil. With dates and sources.')}</p>
      <div class="bl-seg" role="group" aria-label="${esc(t('Categories'))}">${seg}</div></div></section></div></header>
    <main>${cat ? '' : `<section class="l2-wrap bl-feat-sec" aria-label="${esc(t('Featured'))}"><a class="bl-feat" href="${blogHref(f.id)}" data-a="blog-post" data-v="${f.id}">
        <span class="bl-feat-l"><span class="bl-tag">${blogCatName(f.cat)}</span><h2>${blogEsc(fx.title)}</h2><p>${blogEsc(fx.excerpt)}</p><span class="bl-byline">${blogDate(f.date)} · ${blogMins(f)}</span><span class="l2-btn forest">${t('Read the article')}${icon('right')}</span></span>
        <span class="bl-feat-r ${f.cat}" aria-hidden="true"><span class="bl-fig">${blogEsc(fx.fig)}</span><small>${blogEsc(fx.figSay)}</small></span></a></section>`}
      <section class="l2-white bl-posts"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(head[0])}<h2 class="l2-h2">${head[1]}</h2></div>
        <div class="bl-grid">${shown.length ? shown.map(blogCard).join('') : `<p class="bl-empty">${t('No articles in this category yet.')}</p>`}</div></div></section>
      ${blogEnd()}</main>`;
}
function blogArticle(p) {
  const x = blogText(p), cta = UI.session ? '' : `<a class="l2-btn forest sm" href="${PAGES.href('signup')}" data-a="pub-go" data-v="signup">${t('Start free')}${icon('right')}</a>`;
  const blocks = x.body.map(([k, a, b]) => k === 'p' ? `<p>${blogEsc(a)}</p>` : k === 'h2' ? `<h2>${blogEsc(a)}</h2>`
    : k === 'ul' ? `<ul>${a.map(i => `<li>${l2Check()}<span>${blogEsc(i)}</span></li>`).join('')}</ul>`
    : `<aside class="bl-note"><b>${blogEsc(a)}</b><p>${blogEsc(b)}</p>${cta}</aside>`).join('');
  const more = BLOG_POSTS.filter(o => o !== p).sort((a, b) => (b.cat === p.cat) - (a.cat === p.cat)).slice(0, 3);
  return `<header class="l2-top"><div class="l2-wrap">${l2Bar('blog')}<div class="bl-art-top"><div class="l2-copy">
      <a class="l2-btn white sm" href="${blogHref('')}" data-a="blog-home">${icon('left')}${t('Blog')}</a><span class="bl-tag">${blogCatName(p.cat)}</span>
      <h1 class="l2-h1" id="bl-title" tabindex="-1">${blogEsc(x.title)}</h1>
      <p class="bl-byline">${t('By Dorax Finance')} · ${blogDate(p.date)} · ${blogMins(p)}</p></div></div></div></header>
    <main><article aria-labelledby="bl-title">
      <div class="bl-band-w ${p.cat}"><div class="bl-band"><div class="l2-wrap bl-band-in"><span class="bl-fig">${blogEsc(x.fig)}</span><p>${blogEsc(x.figSay)}</p></div></div></div>
      <div class="l2-wrap"><div class="bl-body">${blocks}
        <footer class="bl-src">${p.sources.length ? `<h2>${t('Sources')}</h2><ol>${p.sources.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join('')}</ol>` : ''}
          <p>${t('Updated on {date}.', { date: blogDate(p.date) })} ${t('Dorax organises information about your own money. It is not financial, tax or accounting advice.')}</p></footer></div></div></article>
      <section class="l2-white bl-more"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(t('Keep reading'))}<h2 class="l2-h2">${t('More from the blog.')}</h2></div><div class="bl-grid">${more.map(blogCard).join('')}</div></div></section>
      ${blogEnd()}</main>`;
}
/** The blog's page: a post when one is chosen (UI.blogPost), the list otherwise. Before login, and over the app (UI.webBlog). */
function viewBlog() {
  const p = blogPost(UI.blogPost);
  return `<div class="lp2 web-page bl-page">${p ? blogArticle(p) : blogList()}${l2Foot(!!UI.session)}</div>`;
}
