/* Relay — public configuration. These are PUBLISHABLE keys (safe in the browser and in git).
   Never put a Clerk secret key or a Supabase service-role key here. */
window.RELAY_CONFIG = {
  // Clerk (identity): dashboard.clerk.com → Configure → API keys → Publishable key
  clerkPublishableKey: 'pk_test_ZmFtb3VzLXdlYXNlbC05NTk0LmNsZXJrLmFjY291bnRzLmRldiQ',
  // Supabase (shared database): Project Settings → API → Project URL, e.g. https://abcdefghijklmnop.supabase.co
  supabaseUrl: '',
  // Supabase publishable / anon key
  supabaseKey: 'sb_publishable_klvoSJdP5MQR_cJXNrwk_g_nG6eP8yN',
};
