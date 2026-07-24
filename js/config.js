/* SentCor — Config */
window.S = window.S || {};
window.S.config = {
  SUPABASE_URL: "https://kbhjamuodmrrvklcyjdv.supabase.co",
  SUPABASE_KEY: "sb_publishable_V-tjO1rW-6ltXevYbMte4Q_SXD9-QCB"
};
if (window.supabase) {
  window.S.supabase = window.supabase.createClient(window.S.config.SUPABASE_URL, window.S.config.SUPABASE_KEY);
} else {
  console.error("[SentCor] Supabase CDN missing!");
}
