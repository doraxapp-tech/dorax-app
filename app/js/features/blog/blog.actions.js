/* Dorax Finance — clicks: the blog (blog.view.js). Joined into A in app/actions.js. */
/** A post, or the list (''), drawn from the top with its title in focus. Before login it is a step the browser's Back can undo (its own address,
    ui/pages.js); over the app the address follows without a step. */
function blogShow(id) {
  UI.blogPost = id && blogPost(id) ? id : '';
  if (!UI.session) { UI.pub.screen = 'blog'; PAGES.push = true; }
  renderNow(); window.scrollTo(0, 0); if (typeof enterView === 'function') enterView();
  const h = $('bl-title'); if (h) h.focus({ preventScroll: true });
}
/** The blog opened over the app goes away: the app comes back on the screen it was on, at the app's own address. */
function blogWebClose() { UI.webBlog = false; UI.webBlogPushed = false; UI.blogPost = ''; UI.blogCat = ''; navigate(routeAddr()); }
const BLOG_ACTIONS = {
  /** The blog over the app (from the website's footer there, or a post's address opened while logged in): the website's page, "Back to Dorax". */
  blog(ds) {
    UI.menu = false; UI.sheet = false; UI.drawer = null; UI.webHelp = false; UI.blogCat = ''; UI.blogPost = ds && blogPost(ds.v) ? ds.v : '';
    UI.webBlog = true; UI.webBlogPushed = PAGES.on && PAGES.read() !== 'blog'; PAGES.push = UI.webBlogPushed;
    render(); window.scrollTo(0, 0); const h = $('bl-title'); if (h) h.focus({ preventScroll: true });
  },
  'blog-close'() { if (!UI.webBlog) return; if (UI.webBlogPushed) { UI.webBlogPushed = false; history.back(); return; } blogWebClose(); },
  'blog-post'(ds) { if (blogPost(ds.v)) blogShow(ds.v); },
  'blog-home'() { blogShow(''); },
  /** A category: only its posts (the featured one among them); "All" again shows every post. The pressed button keeps the focus. */
  'blog-cat'(ds) {
    UI.blogCat = BLOG_CATS.includes(ds.v) ? ds.v : ''; renderNow();
    const b = document.querySelector(`.bl-seg [data-v="${UI.blogCat}"]`); if (b) b.focus({ preventScroll: true });
  },
};
