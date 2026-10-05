/* Dorax Finance — which Supabase project this copy of the app talks to.

   Two values, both from the Supabase dashboard (Project Settings > API Keys, or the "Connect" button):
     supabaseUrl   the project's address, like https://abcdefghijklmnop.supabase.co
     supabaseKey   the PUBLISHABLE key (sb_publishable_...). Older projects call it the "anon public" key (a long eyJ... text): that one works too.

   Both are meant to be public: every visitor's browser receives them. What protects the data is the row-level security set up by
   supabase/schema.sql, which lets each person read and write their own row and nothing else.

   NEVER put the SECRET key (sb_secret_..., or "service_role") here, or anywhere in this folder: it opens everything to whoever reads it.
   The Google client secret does not belong here either; it goes only into the Supabase dashboard.

   On Vercel there is nothing to type: when the project has the environment variables SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
   (the Supabase integration adds them by itself), tools/vercel-build.js writes this file during the deploy. See DEPLOY.md. */
window.DORAX_CONFIG = {
  supabaseUrl: '',
  supabaseKey: '',
};
