// SENTCOR v9.0 — Resilient Auth UI with Null-Checks
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;
    const sb = S.sb;

    S.user = null;
    S.profile = null;
    S.session = null;
    S.appLoaded = false;
    let sessionLoginRecorded = false;

    /**
     * Renders and displays the authentication UI.
     * Now includes robust null-checks for all DOM interactions.
     */
    function showAuthUI() {
        const authScreen = document.getElementById('auth-screen');
        if (!authScreen) {
            console.error("[Auth] Critical: #auth-screen container not found in DOM.");
            return;
        }

        // Only render the HTML if it's not already present.
        if (!authScreen.querySelector('.auth-container')) {
            authScreen.innerHTML = `
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
                            <p>Нет аккаунта? <a href="#" id="show-signup-link">Создать</a></p>
                        </div>
                    </div>
                </div>
            `;
        }

        // --- Resilient Event Binding ---
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            // Remove old listener to prevent duplicates, then add new one
            authForm.removeEventListener('submit', handleSignIn);
            authForm.addEventListener('submit', handleSignIn);
        } else {
            console.error("[Auth] Critical: #auth-form not found after render.");
        }

        const signupLink = document.getElementById('show-signup-link');
        if (signupLink) {
            // Placeholder for signup functionality
            signupLink.onclick = (e) => {
                e.preventDefault();
                S.toast.show("Функция регистрации в разработке.", "info");
            };
        }

        // Delegate screen visibility management to the UI module
        S.ui.showScreen('auth');
    }
    
    async function handleSignIn(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value;
        const password = form.password.value;
        const errorContainer = document.getElementById('auth-error-message');
        const submitButton = form.querySelector('button[type="submit"]');

        if (errorContainer) errorContainer.textContent = '';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Вход...';
        }

        const { error } = await signIn(email, password);

        if (error) {
            if (errorContainer) {
                errorContainer.textContent = error.message || 'Неверный email или пароль.';
            }
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Войти';
            }
        }
    }

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
            return { error: e };
        }
    }

    async function signOut() {
        await setOnlineStatus("offline");
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
                        S.ui.showApp();
                    }
                } else {
                    await signOut();
                }
            }
        } else if (event === "SIGNED_OUT") {
            if (S.connection && typeof S.connection.disconnect === 'function') S.connection.disconnect();
            S.user = null;
            S.profile = null;
            S.session = null;
            S.appLoaded = false;
            sessionLoginRecorded = false;
            showAuthUI();
        } else if (event === "TOKEN_REFRESHED") {
            S.session = session;
            S.user = session?.user;
        }
    });

    S.auth = {
        initSession,
        signIn,
        signOut,
        setOnlineStatus,
        showAuthUI,
    };

})();