// SENTCOR v8.0 — Centralized Auth State & UI Rendering
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;
    const sb = S.sb;

    // --- Module State ---
    S.user = null;
    S.profile = null;
    S.session = null;
    S.appLoaded = false;
    let sessionLoginRecorded = false;

    // --- UI Rendering ---

    /**
     * Renders the full authentication UI into the provided container.
     * This function is now responsible for the *content* of the auth screen.
     */
    function showAuthUI() {
        const authScreen = document.getElementById('auth-screen');
        if (!authScreen) {
            console.error("[Auth] Cannot render UI: #auth-screen container not found.");
            return;
        }

        // Prevent re-rendering if the form is already there
        if (authScreen.querySelector('.auth-container')) {
            S.ui.showScreen('auth'); // Just ensure the screen is visible
            return;
        }

        const authHtml = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1 class="auth-title">SENTCOR</h1>
                        <p class="auth-subtitle">Вход в игровой мессенджер</p>
                    </div>
                    <div id="auth-error-message" class="auth-error-message"></div>
                    <form id="auth-form">
                        <div class="input-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required autocomplete="email">
                        </div>
                        <div class="input-group">
                            <label for="password">Пароль</label>
                            <input type="password" id="password" name="password" required autocomplete="current-password">
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Войти</button>
                    </form>
                    <div class="auth-footer">
                        <p>Нет аккаунта? <a href="#" id="show-signup">Создать</a></p>
                    </div>
                </div>
            </div>
        `;
        authScreen.innerHTML = authHtml;

        // Add event listeners
        document.getElementById('auth-form').addEventListener('submit', handleSignIn);
        
        // We need to delegate showing the screen to the UI module
        S.ui.showScreen('auth');
    }
    
    async function handleSignIn(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value;
        const password = form.password.value;
        const errorContainer = document.getElementById('auth-error-message');
        
        errorContainer.textContent = '';
        form.querySelector('button').disabled = true;
        form.querySelector('button').textContent = 'Вход...';

        const { error } = await signIn(email, password);

        if (error) {
            errorContainer.textContent = error.message || 'Неверный email или пароль.';
            form.querySelector('button').disabled = false;
            form.querySelector('button').textContent = 'Войти';
        }
        // On success, onAuthStateChange will handle the UI transition
    }


    // --- Private Business Logic ---

    async function fetchProfile(user) {
        if (!user) return null;
        try {
            const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
            if (error) throw error;
            if (data) return data;
            
            console.warn(`[Auth] Profile missing for ${user.id}. Creating one.`);
            const username = user.user_metadata?.username || ("user_" + user.id.slice(0, 8));
            const { data: newProfile, error: insertError } = await sb.from("profiles")
                .insert({ id: user.id, username, display_name: username })
                .select().single();
            if (insertError) throw insertError;
            return newProfile;
        } catch (e) {
            console.error("[Auth] Critical error fetching profile:", e);
            S.ui.showErrorState(`Не удалось загрузить ваш профиль: ${e.message}`);
            return null;
        }
    }

    async function recordLogin(user) {
        if (!user || sessionLoginRecorded) return;
        try {
            await sb.from("daily_logins").upsert({
                user_id: user.id,
                login_date: new Date().toISOString().slice(0, 10)
            }, { onConflict: 'user_id,login_date' });
            sessionLoginRecorded = true;
        } catch (e) {
            console.warn("[Auth] Failed to record daily login:", e.message);
        }
    }

    // --- Public API ---

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
            return { data };
        } catch (e) {
            console.error("[Auth] signIn failed:", e);
            return { error: e };
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
            return { error: e };
        }
    }

    async function signOut() {
        await setOnlineStatus("offline"); // Set offline before signing out
        const { error } = await sb.auth.signOut();
        if (error) {
            console.error("[Auth] signOut failed:", error);
            S.toast.show("Ошибка при выходе.", "error");
        }
    }

    async function setOnlineStatus(status) {
        if (!S.user) return;
        try {
            await sb.from("profiles").update({ status, last_seen: new Date().toISOString() }).eq("id", S.user.id);
            if (S.profile) S.profile.status = status;
        } catch (e) {
            console.warn("[Auth] Failed to set online status:", e.message);
        }
    }

    // --- Auth State Change Handler (Single Source of Truth) ---
    sb.auth.onAuthStateChange(async (event, session) => {
        console.log(`[Auth] onAuthStateChange event: ${event}`);

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            if (session) {
                S.session = session;
                S.user = session.user;
                S.profile = await fetchProfile(session.user);

                if (S.profile) {
                    await recordLogin(session.user);
                    await setOnlineStatus("online");
                    
                    if (!S.appLoaded) {
                        S.appLoaded = true;
                        S.ui.showApp(); // Let UI module handle the screen transition
                    }
                } else {
                    await signOut();
                }
            }
        } else if (event === "SIGNED_OUT") {
            if (S.connection && typeof S.connection.disconnect === 'function') {
                S.connection.disconnect();
            }
            S.user = null;
            S.profile = null;
            S.session = null;
            S.appLoaded = false;
            sessionLoginRecorded = false;
            showAuthUI(); // Directly call the function to render and display the auth UI
        } else if (event === "TOKEN_REFRESHED") {
            S.session = session;
            S.user = session?.user;
        }
    });

    // --- Expose Public API ---
    S.auth = {
        initSession,
        signIn,
        signUp,
        signOut,
        setOnlineStatus,
        showAuthUI, // Expose the UI rendering function
    };

})();