// SENTCOR v14.0 — Premium Auth Styling & Guaranteed Client
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;

    let currentUser = null;
    let isSignUp = false;

    /**
     * Guaranteed Supabase client initialization.
     * @returns {object|null} The Supabase client instance or null on failure.
     */
    function getSupabaseClient() {
        if (window.supabaseClient) return window.supabaseClient;
        if (window.S?.supabase) return window.S.supabase; // Legacy check

        const url = 'https://sbjcaednbqzmaemqgqfu.supabase.co';
        const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiamNhZWRuYnF6bWFlbXFncWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ0NzI0OTUsImV4cCI6MjAzMDA0ODQ5NX0.sb_publishable_L8uG-22xzKFGHrX--GO3ZQ_Pj8pU4v7';

        if (typeof supabase !== 'undefined' && supabase.createClient) {
            try {
                window.supabaseClient = supabase.createClient(url, key);
                if (window.S) S.supabase = window.supabaseClient;
                return window.supabaseClient;
            } catch (e) {
                console.error('[Auth] Error creating Supabase client:', e);
                return null;
            }
        }
        
        console.error('[Auth] Supabase SDK not loaded from CDN.');
        S.ui.showErrorState("Не удалось загрузить основной компонент приложения (SDK).");
        return null;
    }

    async function initSession() {
        const client = getSupabaseClient();
        if (!client) return false;

        client.auth.onAuthStateChange(async (event, session) => {
            if (event === "SIGNED_OUT") {
                currentUser = null;
                S.ui.showAuth();
            } else if (session?.user) {
                currentUser = session.user;
                await handleSuccessfulLogin(currentUser);
            }
        });

        const { data, error } = await client.auth.getSession();
        if (error) {
            S.ui.showErrorState("Не удалось проверить сессию.", { isFatal: false, errorDetails: error });
            return false;
        }
        if (data.session) {
            currentUser = data.session.user;
            await handleSuccessfulLogin(currentUser);
            return true;
        }
        return false;
    }

    async function handleSuccessfulLogin(user) {
        S.ui.showApp();
        // Further initializations can go here
    }

    function renderAuthForm() {
        const form = document.getElementById('auth-form');
        const title = document.querySelector('#auth-screen .auth-title');
        const subtitle = document.querySelector('#auth-screen .auth-subtitle');
        const footer = document.getElementById('auth-footer');
        if (!form || !title || !subtitle || !footer) return;

        form.innerHTML = '';
        footer.innerHTML = '';
        
        const existingGithubBtn = document.getElementById('github-login-btn');
        if (existingGithubBtn) existingGithubBtn.remove();
        
        const existingDivider = document.querySelector('.auth-divider');
        if(existingDivider) existingDivider.remove();

        let formHtml = `
            <div class="input-group">
                <label for="auth-email">Email</label>
                <input type="email" id="auth-email" name="email" required autocomplete="email">
            </div>
            <div class="input-group">
                <label for="auth-password">Пароль</label>
                <input type="password" id="auth-password" name="password" required autocomplete="current-password">
            </div>
        `;

        if (isSignUp) {
            title.textContent = 'Регистрация';
            subtitle.textContent = 'Создайте новый аккаунт SENTCOR';
            formHtml += `<div class="input-group"><label for="auth-username">Имя пользователя</label><input type="text" id="auth-username" name="username" required></div>`;
            formHtml += '<button type="submit" class="btn btn-primary">Создать аккаунт</button>';
            footer.innerHTML = '<p>Уже есть аккаунт? <a href="#" id="toggle-auth-mode">Войти</a></p>';
        } else {
            title.textContent = 'Вход';
            subtitle.textContent = 'Войдите в свой аккаунт SENTCOR';
            formHtml += '<button type="submit" class="btn btn-primary">Войти</button>';
            footer.innerHTML = '<p>Нет аккаунта? <a href="#" id="toggle-auth-mode">Создать</a></p>';
        }
        form.innerHTML = formHtml;

        const githubButtonHtml = `<div class="auth-divider"><span>ИЛИ</span></div><button type="button" id="github-login-btn" class="btn btn-secondary" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;"><svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" style="fill: currentColor;"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.19.01-.82.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21-.15.46-.55.38A8.013 8.013 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>Войти через GitHub</button>`;
        form.insertAdjacentHTML('afterend', githubButtonHtml);

        form.addEventListener('submit', isSignUp ? handleSignUp : handleSignIn);
        
        document.getElementById('toggle-auth-mode')?.addEventListener('click', (e) => {
            e.preventDefault();
            isSignUp = !isSignUp;
            renderAuthForm();
        });

        document.getElementById('github-login-btn')?.addEventListener('click', handleGitHubLogin);
    }

    async function handleGitHubLogin() {
        const client = getSupabaseClient();
        if (!client) return showAuthError('Клиент базы данных не готов.');
        const { error } = await client.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.href },
        });
        if (error) showAuthError(error.message);
    }

    async function handleSignIn(e) {
        e.preventDefault();
        const client = getSupabaseClient();
        const emailEl = document.getElementById('auth-email');
        const passwordEl = document.getElementById('auth-password');

        if (!client || !emailEl || !passwordEl) {
            return showAuthError('Ошибка: не удалось найти поля формы.');
        }
        
        const { error } = await client.auth.signInWithPassword({ email: emailEl.value, password: passwordEl.value });
        if (error) showAuthError(error.message);
    }

    async function handleSignUp(e) {
        e.preventDefault();
        const client = getSupabaseClient();
        const emailEl = document.getElementById('auth-email');
        const passwordEl = document.getElementById('auth-password');
        const usernameEl = document.getElementById('auth-username');

        if (!client || !emailEl || !passwordEl || !usernameEl) {
            return showAuthError('Ошибка: не удалось найти поля формы.');
        }

        const { data, error } = await client.auth.signUp({ 
            email: emailEl.value, 
            password: passwordEl.value,
            options: {
                data: {
                    user_name: usernameEl.value
                }
            }
        });

        if (error) return showAuthError(error.message);
        
        S.toast.show("Аккаунт создан! Пожалуйста, подтвердите свой email и войдите.");
        isSignUp = false;
        renderAuthForm();
    }

    function showAuthError(message) {
        const errorEl = document.getElementById('auth-error-message');
        if (!errorEl) return;
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    function showAuthUI() {
        renderAuthForm();
    }

    S.auth = {
        initSession,
        showAuthUI,
        signOut: async () => {
            const client = getSupabaseClient();
            if (!client) return;
            await client.auth.signOut();
        }
    };

})();