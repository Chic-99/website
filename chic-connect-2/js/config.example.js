// ---------------------------------------------------------------------------
// COPY THIS FILE TO "config.js" (same folder) AND FILL IN YOUR OWN VALUES.
// config.js is listed in .gitignore and must never be committed.
//
// SUPABASE_ANON_KEY is the PUBLIC "anon" key from Supabase → Project Settings →
// API. It is safe to ship to the browser (that's what it's for) as long as
// Row Level Security policies are correctly configured on every table — which
// the migration in /supabase/migrations/0001_init.sql sets up for you.
//
// NEVER put the "service_role" key here or anywhere in frontend code.
//
// If you deploy this site through a build step (Netlify, Vercel, GitHub
// Actions, etc.) you can instead generate this exact file at build time from
// real environment variables (SUPABASE_URL / SUPABASE_ANON_KEY) so nothing
// sensitive-looking sits in the repo at all — see README.md "Deploying" section.
// ---------------------------------------------------------------------------

export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-PUBLIC-ANON-KEY';

// Where appointment-request notification emails are sent. Kept here (not
// hardcoded deep in application logic) so it's easy to change later. The
// Edge Function also has its own copy as a Supabase secret (NOTIFY_EMAIL) —
// that server-side copy is the one that actually controls delivery; this
// constant is only used for display purposes in the admin UI.
export const NOTIFY_EMAIL = 'chicnlr90@gmail.com';
