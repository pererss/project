// ============================================================
// SENTCOR — Auth Module v2 (theme + username cooldown)
// ============================================================
(function () {
  "use strict";
  const S = window.SENTCOR;
  const sb = S.sb;
  S.user = null; S.profile = null; S.session = null;

  async function initSession() {
    const { data } = await sb.auth.getSession();
    if (data.session) { S.session = data.session; S.user = data.session.user; await fetchProfile(); return true; }
    return false;
  }

  async function fetchProfile() {
    if (!S.user) return;
    const { data } = await sb.from("profiles").select("*").eq("id", S.user.id).single();
    if (data) { S.profile = data; applyTheme(data.theme); }
  }

  function applyTheme(theme) {
    document.body.classList.remove("theme-oled", "theme-midnight");
    if (theme && theme !== "caramel") document.body.classList.add("theme-" + theme);
  }

  async function updateProfile(updates) {
    if (!S.user) return { error: "Not logged in" };
    const { data, error } = await sb.from("profiles").update(updates).eq("id", S.user.id).select().single();
    if (!error && data) { Object.assign(S.profile, data); if (updates.theme) applyTheme(data.theme); }
    return { data, error };
  }

  async function uploadAvatar(file) {
    if (!S.user) return { error: "Not logged in" };
    const ext = file.name.split(".").pop();
    const fp = `avatars/${S.user.id}_${Date.now()}.${ext}`;
    const { error: ue } = await sb.storage.from("avatars").upload(fp, file, { upsert: true });
    if (ue) return { error: ue };
    const { data: ud } = sb.storage.from("avatars").getPublicUrl(fp);
    const { error: pe } = await sb.from("profiles").update({ avatar_url: ud.publicUrl }).eq("id", S.user.id);
    if (!pe && S.profile) S.profile.avatar_url = ud.publicUrl;
    return { url: ud.publicUrl, error: pe };
  }

  async function signUp(email, password, username) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username, display_name: username } } });
    if (error) return { error };
    if (data.user) { S.user = data.user; S.session = data.session; await fetchProfile(); }
    return { data };
  }

  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error };
    S.user = data.user; S.session = data.session;
    await fetchProfile(); await recordLogin(); await setOnlineStatus("online");
    return { data };
  }

  async function signOut() {
    await setOnlineStatus("offline");
    await sb.auth.signOut();
    S.user = null; S.profile = null; S.session = null;
  }

  async function recordLogin() {
    if (!S.user) return;
    try { await sb.from("daily_logins").insert({ user_id: S.user.id, login_date: new Date().toISOString().slice(0, 10) }); } catch (e) {}
  }

  async function setOnlineStatus(status) {
    if (!S.user) return;
    await sb.from("profiles").update({ status, last_login: new Date().toISOString() }).eq("id", S.user.id);
    if (S.profile) S.profile.status = status;
  }

  function canChangeUsername() {
    if (!S.profile || !S.profile.last_username_change) return true;
    const lastChange = new Date(S.profile.last_username_change);
    const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= S.SENTCOR_CONFIG.USERNAME_CHANGE_COOLDOWN_DAYS;
  }

  function daysUntilUsernameChange() {
    if (!S.profile || !S.profile.last_username_change) return 0;
    const lastChange = new Date(S.profile.last_username_change);
    const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    const remaining = S.SENTCOR_CONFIG.USERNAME_CHANGE_COOLDOWN_DAYS - daysSince;
    return Math.max(0, Math.ceil(remaining));
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session) {
      S.user = session.user; S.session = session;
      await fetchProfile(); await recordLogin(); await setOnlineStatus("online");
      if (S.ui && S.ui.showApp) S.ui.showApp();
    } else if (event === "SIGNED_OUT") {
      S.user = null; S.profile = null; S.session = null;
      if (S.ui && S.ui.showAuth) S.ui.showAuth();
    }
  });

  S.auth = { initSession, fetchProfile, updateProfile, uploadAvatar, signUp, signIn, signOut, setOnlineStatus, recordLogin, canChangeUsername, daysUntilUsernameChange };
})();