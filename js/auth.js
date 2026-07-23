// SENTCOR v15.0 — Auth Module with Client Export
window.S = window.S || {};

S.auth = (function () {
    let supabaseClient = null;

    /**
     * Initializes the Supabase client.
     * This should be called by supabase.js after config is loaded.
     * @param {object} client - The Supabase client instance.
     */
    function initClient(client) {
        if (!client) {
            console.error('[Auth] Supabase client instance is required for initialization.');
            return;
        }
        supabaseClient = client;
        console.log('[Auth] Supabase client initialized.');
    }

    /**
     * Returns the initialized Supabase client.
     * @returns {object|null} The Supabase client instance.
     */
    function getSupabaseClient() {
        if (!supabaseClient) {
            console.warn('[Auth] getSupabaseClient() called before client was initialized.');
        }
        return supabaseClient;
    }

    /**
     * Handles the user session and directs the UI.
     * Shows auth form if not logged in, or initializes the main app if session is valid.
     */
    async function initSession() {
        if (window.S?.ui?.showLoading) await window.S.ui.showLoading('Проверка сессии...');
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('[Auth] Error getting session:', error);
            if (window.S?.ui?.showErrorState) S.ui.showErrorState('Ошибка сессии', { errorDetails: error });
            return;
        }

        if (session) {
            console.log('[Auth] User session found. Initializing app.');
            if (window.S?.app?.init) {
                await window.S.app.init();
            } else {
                console.error('[Auth] S.app.init() not found!');
            }
        } else {
            console.log('[Auth] No active session. Showing auth UI.');
            if (window.S?.ui?.hideLoading) await window.S.ui.hideLoading();
            showAuthUI();
        }
    }

    /**
     * Renders and manages the authentication UI (login/signup).
     */
    function showAuthUI() {
        const form = document.getElementById('auth-form');
        const errorMessage = document.getElementById('auth-error-message');
        if (!form) return;

        // Simplified form for demonstration
        form.innerHTML = `
            <div class="input-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="you@example.com">
            </div>
            <button type="submit" class="btn-primary auth-button">Войти</button>
        `;

        form.onsubmit = async (e) => {
            e.preventDefault();
            errorMessage.textContent = '';
            const email = e.target.email.value;

            try {
                const { error } = await supabaseClient.auth.signInWithOtp({ email });
                if (error) throw error;
                alert('Проверьте свою почту для входа!');
            } catch (error) {
                console.error('Error signing in:', error);
                errorMessage.textContent = error.message || 'Не удалось войти.';
            }
        };

        if (window.S?.ui?.showAuthScreen) window.S.ui.showAuthScreen();
    }
    
    /**
     * Signs the user out.
     */
    async function signOut() {
        if (!supabaseClient) return;
        await supabaseClient.auth.signOut();
        window.location.reload();
    }

    // Public API for S.auth
    return {
        initClient,
        initSession,
        showAuthUI,
        getSupabaseClient, // Correctly exposed
        signOut,
    };
})();