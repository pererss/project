// SENTCOR v7.0 — Centralized Auth State Management
(function() {
    "use strict";

    window.SENTCOR = window.SENTCOR || {};
    const S = window.SENTCOR;
    const sb = S.sb; // Assuming S.sb is initialized by supabase.js

    // --- Module State ---
    S.user = null;
    S.profile = null;
    S.session = null;
    S.appLoaded = false;
    let sessionLoginRecorded = false;

    // --- Private Functions ---

    /**
     * Fetches the user's profile. Creates a default one if it doesn't exist.
     * On critical failure, it triggers the UI error state.
     */
    async function fetchProfile(user) {
        if (!user) return null;
        try {
            const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
            if (error) throw error;

            if (data) {
                return data;
            } else {
                // Profile is missing, create a new one
                console.warn(`[Auth] Profile missing for ${user.id}. Creating one.`);
                const username = user.user_metadata?.username || ("user_" + user.id.slice(0, 8));
                const { data: newProfile, error: insertError } = await sb.from("profiles")
                    .insert({ id: user.id, username, display_name: username })
                    .select()
                    .single();
                if (insertError) throw insertError;
                return newProfile;
            }
        } catch (e) {
            console.error("[Auth] Critical error fetching profile:", e);
            S.ui.showErrorState(`Не удалось загрузить ваш профиль: ${e.message}`);
            return null;
        }
    }

    /**
     * A non-critical function to record a user's daily login.
     * Silently fails without blocking the UI.
     */
    async function recordLogin(user) {
        if (!user || sessionLoginRecorded) return;
        try {
            const { error } = await sb.from("daily_logins").upsert({
                user_id: user.id,
                login_date: new Date().toISOString().slice(0, 10)
            }, { onConflict: 'user_id,login_date' });

            if (error) {
                // This is a non-critical, often expected error (e.g., RLS)
                console.warn("[Auth] Failed to record daily login:", error.message);
            } else {
                sessionLoginRecorded = true; // Mark as recorded for this session
            }
        } catch (e) {
            console.error("[Auth] Unexpected error in recordLogin:", e);
        }
    }

    // --- Public API Functions ---

    /**
     * Checks for an existing session on app startup.
     * Returns true if a session exists, false otherwise.
     * Does not trigger UI changes, as onAuthStateChange is the source of truth.
     */
    async function initSession() {
        try {
            const { data } = await sb.auth.getSession();
            return !!data.session;
        } catch (e) {
            console.error("[Auth] Failed to check initial session:", e);
            S.ui.showErrorState("Не удалось проверить сессию. Попробуйте перезагрузить страницу.");
            return false;
        }
    }

    async function signIn(email, password) {
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // onAuthStateChange will handle the UI transition
            return { data };
        } catch (e) {
            console.error("[Auth] signIn failed:", e);
            return { error: e.message || "Произошла неизвестная ошибка." };
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
            console.error("[Auth] signUp failed:", e);
            return { error: e.message || "Произошла неизвестная ошибка." };
        }
    }

    async function signOut() {
        const { error } = await sb.auth.signOut();
        if (error) {
            console.error("[Auth] signOut failed:", error);
            S.ui.safeToast("Ошибка при выходе.", "error");
        }
        // onAuthStateChange will handle the UI transition
    }

    async function setOnlineStatus(status) {
        if (!S.user) return;
        try {
            await sb.from("profiles").update({ status, last_login: new Date().toISOString() }).eq("id", S.user.id);
            if (S.profile) S.profile.status = status;
        } catch (e) {
            // Non-critical, just log it
            console.warn("[Auth] Failed to set online status:", e.message);
        }
    }

    // --- Auth State Change Handler (Single Source of Truth) ---
    sb.auth.onAuthStateChange(async (event, session) => {
        console.log(`[Auth] onAuthStateChange event: ${event}`);

        // User has successfully logged in or session was restored
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            if (session) {
                S.session = session;
                S.user = session.user;
                S.profile = await fetchProfile(session.user);

                if (S.profile) {
                    await recordLogin(session.user);
                    await setOnlineStatus("online");
                    
                    // Only show app if not already loaded
                    if (!S.appLoaded) {
                        S.appLoaded = true;
                        S.ui.showApp();
                    }
                } else {
                    // If profile fetch failed, showErrorState was already called
                    await signOut(); // Log the user out to be safe
                }
            }
        } 
        // User has logged out
        else if (event === "SIGNED_OUT") {
            if (S.appLoaded) { // Only update status if the app was actually running
               await setOnlineStatus("offline");
               if (S.connection && typeof S.connection.disconnect === 'function') {
                    S.connection.disconnect();
               }
            }
            S.user = null;
            S.profile = null;
            S.session = null;
            S.appLoaded = false;
            sessionLoginRecorded = false;
            S.ui.showAuth();
        } 
        // Session token has been refreshed
        else if (event === "TOKEN_REFRESHED") {
            if (session) {
                S.session = session;
                S.user = session.user;
            } else {
                // If token refresh fails, it often means the session is invalid.
                await signOut();
            }
        }
    });

    // --- Expose Public API ---
    S.auth = {
        initSession,
        signIn,
        signUp,
        signOut,
        setOnlineStatus,
    };

})();