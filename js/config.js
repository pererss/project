// ============================================================
// SENTCOR — Configuration (template)
// ============================================================
// Copy this file to js/config.js and fill values before deploying.

window.SENTCOR_CONFIG = {
  SUPABASE_URL: "https://<your-project-ref>.supabase.co",
  SUPABASE_ANON_KEY: "<YOUR_SUPABASE_ANON_KEY>",
  LIVEKIT_URL: "wss://<your-livekit-host>",
  APP_NAME: "SENTCOR",
  APP_VERSION: "2.0.0",
  MAX_MESSAGE_LENGTH: 2000,
  COINS_PER_DAY_BASE: 10,
  MAX_STREAK_BONUS: 100,
  USERNAME_CHANGE_COOLDOWN_DAYS: 7,
  THEMES: ["caramel", "oled", "midnight"],
  DEFAULT_THEME: "caramel"
};

if (window.SENTCOR_CONFIG && (window.SENTCOR_CONFIG.SUPABASE_URL.includes('<') || window.SENTCOR_CONFIG.SUPABASE_ANON_KEY.includes('<'))){
  console.warn('SENTCOR_CONFIG contains placeholder values. Please copy js/config.js.example -> js/config.js and fill in real values.');
}
