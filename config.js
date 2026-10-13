// Cloud sync settings (optional). Leave url empty to keep everything on this device only.
// Fill these in from Supabase → Project Settings → API, then push. Step-by-step: SYNC-SETUP.md
window.SYNC_CONFIG = {
  url: '',             // e.g. 'https://abcdefgh.supabase.co'
  anonKey: '',         // the "anon public" key — designed to be public, safe to commit
  requireLogin: false, // true = the app stays locked until an invited user signs in
  leaderboard: true,   // show the friends leaderboard (needs the leaderboard table)
  vapidPublicKey: '',  // Web Push public key for daily notifications (optional, see SYNC-SETUP.md step 7)
};
