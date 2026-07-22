// SENTCOR v6.1 — Stable Auth & Profile Management
(function() {
    "use strict";

    const C = window.SENTCOR_CONFIG;
    const S = window.SENTCOR;
    const sb = S.sb;

    S.user = null;
    S.profile = null;
    S.session = null;
    S.appLoaded = false;
    let sessionLoginRecorded = false;

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
            S.ui.showErrorState("Не удалось проверить сессию. Попробуйте перезагрузить страницу.");
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
            S.ui.showErrorState(`Не удалось загрузить профиль: ${e.message}`);
        }
    }

    async function signIn(email, password) {
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // onAuthStateChange will handle the rest
            return { data };
        } catch (e) {
            console.error("signIn failed:", e.message);
            return { error: e.message };
        }
    }

    async function signUp(email, password, username) {
        try {
            const { data, error } = await sb.auth.signUp({
                email,
                password,
                options: { data: { username, display_name: username } }
            });
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error("signUp failed:", e.message);
            return { error: e.message };
        }
    }

    async function signOut() {
        await setOnlineStatus("offline");
        const { error } = await sb.auth.signOut();
        if (error) {
            console.error("signOut failed:", error.message);
            S.ui.safeToast("Ошибка при выходе.", "error");
        }
        sessionLoginRecorded = false; // Reset for next login
    }

    async function recordLogin() {
        if (!S.user || sessionLoginRecorded) return;
        try {
            const { error } = await sb.from("daily_logins").upsert({
                user_id: S.user.id,
                login_date: new Date().toISOString().slice(0, 10)
            }, { onConflict: 'user_id,login_date' });

            if (error) {
                // This is a non-critical error, just log it.
                // The 403 error is likely due to RLS policies.
                console.warn("Failed to record daily login (RLS issue?):", error.message);
            } else {
                sessionLoginRecorded = true; // Mark as recorded for this session
            }
        } catch (e) {
            // Catch any other unexpected errors silently.
            console.error("Unexpected error in recordLogin:", e);
        }
    }

    async function setOnlineStatus(status) {
        if (!S.user || !S.profile) return;
        try {
            const { error } = await sb.from("profiles").update({ status, last_login: new Date().toISOString() }).eq("id", S.user.id);
            if (error) throw error;
            S.profile.status = status;
            if (S.ui && typeof S.ui.updateFooter === 'function') {
                S.ui.updateFooter();
            }
        } catch (e) {
            console.error("Failed to set online status:", e);
        }
    }

    sb.auth.onAuthStateChange(async (event, session) => {
        console.log('onAuthStateChange:', event);
        if (event === "SIGNED_IN" && session) {
            S.user = session.user;
            S.session = session;
            await fetchProfile();
            await recordLogin(); // Record login once per sign-in event

            if (!S.appLoaded) {
                S.appLoaded = true;
                S.ui.showApp();
                await setOnlineStatus("online");
            }
        } else if (event === "SIGNED_OUT") {
            S.user = null;
            S.profile = null;
            S.session = null;
            S.appLoaded = false;
            sessionLoginRecorded = false;
            S.ui.showAuth();
        } else if (event === "TOKEN_REFRESHED" && session) {
            S.session = session;
            S.user = session.user;
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
    };

})();