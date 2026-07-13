// ============================================================
// SENTCOR — Authentication Module (Supabase Auth)
// ============================================================
(function () {
  "use strict";

  const S = window.SENTCOR;

  // --- STATE ---
  S.user = null;
  S.profile = null;
  S.session = null;

  // --- CHECK EXISTING SESSION ---
  async function initSession() {
    const { data, error } = await S.sb.auth.getSession();
    if (error) {
      console.error("Session check error:", error.message);
      return false;
    }
    if (data.session) {
      S.session = data.session;
      S.user = data.session.user;
      await fetchProfile();
      return true;
    }
    return false;
  }

  // --- FETCH PROFILE ---
  async function fetchProfile() {
    if (!S.user) return;
    const { data, error } = await S.sb
      .from("profiles")
      .select("*")
      .eq("id", S.user.id)
      .single();

    if (error) {
      console.error("Profile fetch error:", error.message);
      return;
    }
    S.profile = data;
  }

  // --- UPDATE PROFILE IN DB ---
  async function updateProfile(updates) {
    if (!S.user) return { error: "Not logged in" };
    const { data, error } = await S.sb
      .from("profiles")
      .update(updates)
      .eq("id", S.user.id)
      .select()
      .single();

    if (!error) {
      S.profile = { ...S.profile, ...data };
    }
    return { data, error };
  }

  // --- AVATAR UPLOAD ---
  async function uploadAvatar(file) {
    if (!S.user) return { error: "Not logged in" };
    const fileExt = file.name.split(".").pop();
    const filePath = `avatars/${S.user.id}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await S.sb.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) return { error: uploadError };

    const { data: urlData } = S.sb.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await S.sb
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", S.user.id);

    if (!updateError && S.profile) {
      S.profile.avatar_url = urlData.publicUrl;
    }
    return { url: urlData.publicUrl, error: updateError };
  }

  // --- SIGN UP ---
  async function signUp(email, password, username) {
    const { data, error } = await S.sb.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username },
      },
    });

    if (error) return { error };

    if (data.user) {
      S.user = data.user;
      S.session = data.session;
      await fetchProfile();
    }
    return { data };
  }

  // --- SIGN IN ---
  async function signIn(email, password) {
    const { data, error } = await S.sb.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error };

    S.user = data.user;
    S.session = data.session;
    await fetchProfile();
    await recordLogin();
    return { data };
  }

  // --- SIGN OUT ---
  async function signOut() {
    const { error } = await S.sb.auth.signOut();
    S.user = null;
    S.profile = null;
    S.session = null;
    return { error };
  }

  // --- RECORD DAILY LOGIN FOR STREAK ---
  async function recordLogin() {
    if (!S.user) return;
    try {
      await S.sb.from("daily_logins").insert({
        user_id: S.user.id,
        login_date: new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      // Duplicate is fine — constraint handles it
    }
  }

  // --- SET ONLINE STATUS ---
  async function setOnlineStatus(status) {
    if (!S.user) return;
    await S.sb
      .from("profiles")
      .update({ status, last_login: new Date().toISOString() })
      .eq("id", S.user.id);
    if (S.profile) S.profile.status = status;
  }

  // --- LISTEN FOR AUTH CHANGES ---
  S.sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session) {
      S.user = session.user;
      S.session = session;
      await fetchProfile();
      await recordLogin();
      await setOnlineStatus("online");
      if (S.ui && S.ui.showApp) S.ui.showApp();
    } else if (event === "SIGNED_OUT") {
      S.user = null;
      S.profile = null;
      S.session = null;
      if (S.ui && S.ui.showAuth) S.ui.showAuth();
    }
  });

  // --- EXPORT ---
  S.auth = {
    initSession,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    signUp,
    signIn,
    signOut,
    setOnlineStatus,
    recordLogin,
  };
})();