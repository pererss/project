// SENTCOR v11.0 — GitHub Auth & Resilient Profile Manager
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;

    let supabase = null;
    let currentUser = null;
    let isSignUp = false; // State to toggle between Sign In and Sign Up

    async function initSession() {
        supabase = S.supabase.getClient();
        
        // This listener handles login, logout, and token refresh.
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Auth] Auth state changed. Event: ${event}`);
            if (event === "SIGNED_OUT") {
                currentUser = null;
                S.ui.showAuth();
            } else if (session && session.user) {
                currentUser = session.user;
                await handleSuccessfulLogin(currentUser);
            }
        });

        // Check for existing session on initial load
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("[Auth] Error getting session:", error);
            return false;
        }
        if (data.session) {
            console.log("[Auth] Active session found on initial load.");
            currentUser = data.session.user;
            await handleSuccessfulLogin(currentUser);
            return true;
        }
        
        return false; // No active session
    }

    async function handleSuccessfulLogin(user) {
        const profile = await fetchUserProfile(user);
        recordLogin(user.id); // Fire-and-forget analytics

        if (S.main && typeof S.main.init === 'function') {
            S.main.init(user, profile); // Initialize main app UI with resilient profile data
        }
        S.ui.showApp();
    }

    /**
     * Fetches a user's profile. If the profile doesn't exist or an error occurs,
     * it returns a default fallback profile object to prevent app crashes.
     * @param {object} user - The authenticated user object.
     * @returns {object} The user profile, either from the DB or a fallback.
     */
    async function fetchUserProfile(user) {
        try {
            const { data, error, status } = await supabase
                .from('profiles')
                .select(`username, avatar_url, status`)
                .eq('id', user.id)
                .single();

            if (error && status !== 406) { // 406 is a normal "no rows" error for .single()
                throw error;
            }

            if (data) {
                console.log("[Auth] Profile found:", data);
                return { ...data, id: user.id };
            }

            // If no data, create a fallback profile
            console.warn("[Auth] Profile not found for user. Creating a fallback profile.");
            const fallbackProfile = {
                id: user.id,
                username: user.user_metadata.user_name || user.email.split('@')[0],
                avatar_url: user.user_metadata.avatar_url || null,
                status: 'online'
            };
            // Attempt to create the profile in the background
            await supabase.from('profiles').upsert(fallbackProfile);
            return fallbackProfile;

        } catch (error) {
            console.error("[Auth] Error fetching profile:", error);
            // Return a default object on any other failure to ensure app stability
            return {
                id: user.id,
                username: user.user_metadata.user_name || user.email.split('@')[0],
                avatar_url: user.user_metadata.avatar_url || null,
                status: 'online'
            };
        }
    }

    /**
     * Silently records a login event. Fails quietly without impacting user experience.
     */
    async function recordLogin(userId) {
        try {
            await supabase.from('daily_logins').insert({ user_id: userId });
        } catch (error) {
            // Suppress error - this is a non-critical analytics feature.
            // console.warn("[Auth] Could not record daily login:", error.message);
        }
    }

    function renderAuthForm() {
        const form = document.getElementById('auth-form');
        const title = document.querySelector('#auth-screen .auth-title');
        const subtitle = document.querySelector('#auth-screen .auth-subtitle');
        const footer = document.getElementById('auth-footer');
        const authCard = document.querySelector('.auth-card');

        if (!form || !title || !subtitle || !footer || !authCard) return;

        // Clear previous dynamic content to prevent duplication on re-render
        form.innerHTML = '';
        footer.innerHTML = '';
        document.getElementById('github-login-btn')?.remove();
        document.querySelector('.auth-divider')?.remove();

        let formHtml = `
            <div class="input-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required autocomplete="email">
            </div>
            <div class="input-group">
                <label for="password">Пароль</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>
        `;

        if (isSignUp) {
            title.textContent = 'Регистрация';
            subtitle.textContent = 'Создайте новый аккаунт SENTCOR';
            formHtml += `
                <div class="input-group">
                    <label for="username">Имя пользователя</label>
                    <input type="text" id="username" name="username" required>
                </div>
            `;
            formHtml += '<button type="submit" class="btn btn-primary">Создать аккаунт</button>';
            footer.innerHTML = '<p>Уже есть аккаунт? <a href="#" id="toggle-auth-mode">Войти</a></p>';
        } else {
            title.textContent = 'Вход';
            subtitle.textContent = 'Войдите в свой аккаунт SENTCOR';
            formHtml += '<button type="submit" class="btn btn-primary">Войти</button>';
            footer.innerHTML = '<p>Нет аккаунта? <a href="#" id="toggle-auth-mode">Создать</a></p>';
        }
        form.innerHTML = formHtml;

        const githubButtonHtml = `
            <div class="auth-divider"><span>ИЛИ</span></div>
            <button type="button" id="github-login-btn" class="btn btn-secondary" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-mark-github v-align-middle" style="fill: currentColor;"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.19.01-.82.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21-.15.46-.55.38A8.013 8.013 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>
                Войти через GitHub
            </button>
        `;
        // Insert after the form, before the footer
        footer.insertAdjacentHTML('beforebegin', githubButtonHtml);

        // Re-attach event listeners
        form.addEventListener('submit', isSignUp ? handleSignUp : handleSignIn);
        
        const toggleLink = document.getElementById('toggle-auth-mode');
        if (toggleLink) {
            toggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                isSignUp = !isSignUp;
                renderAuthForm();
            });
        }

        const githubBtn = document.getElementById('github-login-btn');
        if (githubBtn) {
            githubBtn.addEventListener('click', handleGitHubLogin);
        }
    }

    async function handleGitHubLogin() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.href,
            },
        });
        if (error) {
            showAuthError(error.message);
        }
    }

    async function handleSignIn(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value;
        const password = form.password.value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) showAuthError(error.message);
    }

    async function handleSignUp(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value;
        const password = form.password.value;
        const username = form.username.value;

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            return showAuthError(error.message);
        }
        if (!data.user) {
            return showAuthError("Не удалось создать пользователя. Попробуйте еще раз.");
        }

        // Immediately create the profile entry
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            username: username,
            updated_at: new Date().toISOString(),
        });

        if (profileError) {
            // This is a critical issue, but the user is already created.
            // The resilient fetchUserProfile will handle this on next login.
            console.error("Failed to create profile post-signup:", profileError);
            showAuthError("Аккаунт создан, но не удалось создать профиль. Попробуйте войти.");
        } else {
            // Success! The onAuthStateChange listener will now take over.
            console.log("Sign up successful, profile created.");
        }
    }

    function showAuthError(message) {
        const errorEl = document.getElementById('auth-error-message');
        if (!errorEl) return;
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    // This is the public function called by ui.js
    function showAuthUI() {
        renderAuthForm();
    }

    // --- Public API ---
    S.auth = {
        initSession,
        showAuthUI
    };

})();