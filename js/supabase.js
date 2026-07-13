// ============================================================
// SENTCOR — Supabase Client Initialization
// ============================================================
(function () {
  "use strict";

  const cfg = window.SENTCOR_CONFIG;

  // Use the official Supabase CDN (loaded via <script> tag in HTML)
  const sb = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  window.SENTCOR = window.SENTCOR || {};
  window.SENTCOR.sb = sb;
})();