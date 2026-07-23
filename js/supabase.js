// ============================================================
// SENTCOR — Supabase Client Initialization v3.0 (Robust)
// ============================================================
(function () {
  "use strict";

  // This script should be loaded AFTER the main Supabase CDN script.
  // It initializes the client and makes it available globally.

  const cfg = window.SENTCOR_CONFIG;

  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.error("CRITICAL CONFIGURATION ERROR: Supabase URL or Key is missing.");
    // We can't proceed, so we'll show an error on the page itself.
    document.body.innerHTML = '<div style="color:white;text-align:center;padding-top:20%;">Fatal Error: App configuration is missing. Cannot connect to the database.</div>';
    return;
  }

  try {
    // The most reliable way to expose the client is to attach it directly to the window.
    // Other modules can then find it easily.
    window.supabaseClient = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    console.log("[Supabase] Client created and attached to window.supabaseClient.");

    // Also, let's attach it to our app's global namespace for consistency.
    window.S = window.SENTCOR = window.S || {};
    window.S.supabaseClient = window.supabaseClient;
    
  } catch (e) {
    console.error("CRITICAL SUPABASE INIT FAILED:", e);
    document.body.innerHTML = `<div style="color:white;text-align:center;padding-top:20%;"><h1>Fatal Error</h1><p>Could not initialize the database client.</p><pre>${e.message}</pre></div>`;
  }

})();