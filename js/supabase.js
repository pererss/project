// ============================================================
// SENTCOR — Supabase Client Initialization v2.0
// ============================================================
(function () {
  "use strict";

  // Ensure the global namespace and config are available
  window.S = window.SENTCOR = window.S || {};
  const S = window.S;
  const cfg = window.SENTCOR_CONFIG;

  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.error("Critical: Supabase config is missing. App cannot start.");
    // Display a user-friendly error on the screen
    document.body.innerHTML = '<div style="color:white;text-align:center;padding-top:20%;">Critical Error: App configuration is missing.</div>';
    return;
  }

  let supabaseClient = null;

  function initializeSupabase() {
    if (!supabaseClient) {
      // Use the official Supabase CDN (loaded via <script> tag in HTML)
      supabaseClient = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      console.log("[Supabase] Client initialized.");
    }
    return supabaseClient;
  }

  // --- Public API ---
  // Create the 'supabase' namespace within the global 'S' object
  S.supabase = {
    /**
     * Returns the singleton instance of the Supabase client.
     * Initializes it if it hasn't been created yet.
     * @returns {object} The Supabase client instance.
     */
    getClient: function() {
      return initializeSupabase();
    }
  };

  // For legacy access, though direct use should be discouraged.
  S.sb = S.supabase.getClient();

})();