// Cloud sync settings (optional). Leave url empty to keep everything on this device only.
// Fill these in from Supabase → Project Settings → API, then push. Step-by-step: SYNC-SETUP.md
window.SYNC_CONFIG = {
  url: 'https://licmgyeouepaddeqlhlo.supabase.co', // e.g. 'https://abcdefgh.supabase.co'
  anonKey: 'sb_publishable_zVN55stwEpYsy1yXkOUpQQ_oCfIaGhR', // the "anon public" key — designed to be public, safe to commit
  requireLogin: true,  // true = the app stays locked until an invited user signs in
  leaderboard: true,   // show the friends leaderboard (needs the leaderboard table)
  vapidPublicKey: 'BML3N_dNtD7kOSykmJ-Pfap1gMhV_DX9BUmKT0mNPugGpl-yHwU4lG2E-iRnutYs9w3r2PMNCFK862_k3PdCk8w',  // Web Push public key for daily notifications (optional, see SYNC-SETUP.md step 7)
};
