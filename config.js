/* Creative Request Ops — public configuration. These are PUBLISHABLE keys (safe in the browser and in git).
   Never put a Clerk secret key or a Supabase service-role key here. */
window.RELAY_CONFIG = {
  // Clerk (identity): dashboard.clerk.com → Configure → API keys → Publishable key.
  // The production instance is bound to creative.bricknbolt.com; every other host
  // (github.io, localhost) keeps using the development instance.
  clerkPublishableKey: location.hostname === 'creative.bricknbolt.com'
    ? 'pk_live_Y2xlcmsuY3JlYXRpdmUuYnJpY2tuYm9sdC5jb20k'
    : 'pk_test_ZmFtb3VzLXdlYXNlbC05NTk0LmNsZXJrLmFjY291bnRzLmRldiQ',
  // Supabase (shared database): Project Settings → API → Project URL, e.g. https://abcdefghijklmnop.supabase.co
  supabaseUrl: 'https://rrnluvyammmlfjhtczod.supabase.co',
  // Supabase publishable / anon key
  supabaseKey: 'sb_publishable_klvoSJdP5MQR_cJXNrwk_g_nG6eP8yN',
};
