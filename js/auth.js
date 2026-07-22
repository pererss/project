// SENTCOR v6 — Stable Auth & Profile Management
(function() {
    "use strict";

    const C = window.SENTCOR_CONFIG;
    const S = window.SENTCOR;
    const sb = S.sb;

    S.user = null;
    S.profile = null;
    S.session = null;
    S.appLoaded = false;

    async function initSession() {
        try {
            const { data } = await sb.auth.getSession();
            if (data.session) {
                S.session = data.session;
                S.user = data.session.user;
                await fetchProfile();
                return true;
            }
            return false;
        } catch (e) {
            console.error("initSession failed:", e);
            return false;
        }
    }

    async function fetchProfile() {
        if (!S.user) return;
        try {
            const { data, error } = await sb.from("profiles").select("*").eq("id", S.user.id).maybeSingle();
            if (error) throw error;
            if (data) {
                S.profile = data;
            } else {
                console.warn("Profile missing, creating for", S.user.id);
                const username = S.user.user_metadata?.username || ("user_" + S.user.id.slice(0, 8));
                const { data: newP, error: insErr } = await sb.from("profiles").insert({ id: S.user.id, username, display_name: username }).select().maybeSingle();
                if (insErr) throw insErr;
                S.profile = newP;
            }
        } catch (e) {
            console.error("fetchProfile failed:", e.message);
        }
    }

    async function signIn(email, password) {
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            S.user = data.user;
            S.session = data.session;
            await fetchProfile();
            await recordLogin();
            return { data };
        } catch (e) {
            console.error("signIn failed:", e.message);
            return { error: e.message };
        }
    }

    async function signUp(email, password, username) { /* ... unchanged ... */ }
    async function signOut() { /* ... unchanged ... */ }

    async function recordLogin() {
        if (!S.user) return;
        try {
            // UPSERT to prevent 409 conflict on re-login same day
            const { error } = await sb.from("daily_logins").upsert({
                user_id: S.user.id,
                login_date: new Date().toISOString().slice(0, 10)
            }, { onConflict: 'user_id,login_date' });
            if (error) throw error;
        } catch (e) {
            console.error("Failed to record daily login:", e);
        }
    }

    async function setOnlineStatus(status) {
        if (!S.user || !S.profile) return;
        try {
            const { error } = await sb.from("profiles").update({ status, last_login: new Date().toISOString() }).eq("id", S.user.id);
            if (error) throw error;
            S.profile.status = status;
            if (S.ui && S.ui.updateFooter) S.ui.updateFooter();
        } catch (e) {
            console.error("Failed to set online status:", e);
        }
    }

    sb.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session) {
            S.user = session.user;
            S.session = session;
            await fetchProfile();
            await recordLogin();
            if (!S.appLoaded) {
                S.appLoaded = true;
                await setOnlineStatus("online");
                if (S.ui && S.ui.showApp) S.ui.showApp();
            }
        } else if (event === "SIGNED_OUT") {
            S.user = null;
            S.profile = null;
            S.session = null;
            S.appLoaded = false;
            if (S.ui && S.ui.showAuth) S.ui.showAuth();
        }
    });

    S.auth = {
        initSession,
        fetchProfile,
        signIn,
        signUp,
        signOut,
        setOnlineStatus,
        recordLogin
        // ... other functions can be added here
    };

})();