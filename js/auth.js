// SENTCOR v16.0 — Explicit Client Export Guarantee
window.S = window.S || {};
window.S.auth = window.S.auth || {};

/**
 * Guarantees that the getSupabaseClient function is available on the global scope.
 * It provides a reliable way to access the Supabase client from different modules.
 */
window.S.auth.getSupabaseClient = function() {
    return window.supabaseClient || window.S.supabase || null;
};

S.auth = (function () {
    let supabaseClient = null;

    /**
     * Initializes the Supabase client and stores it locally.
     * This is the primary entry point called by supabase.js.
     * @param {object} client - The Supabase client instance.
     */
    function initClient(client) {
        if (!client) {
            console.error('[Auth] Supabase client instance is required for initialization.');
            return;
        }
        supabaseClient = client;
        // Also ensure the global reference is set for other modules.
        window.supabaseClient = client; 
        console.log('[Auth] Supabase client initialized and globally available.');
    }

    /**
     * Handles the user session and directs the UI.
     * Shows auth form if not logged in, or initializes the main app if session is valid.
     */
    async function initSession() {
        if (window.S?.ui?.showLoading) await window.S.ui.showLoading('Проверка сессии...');
        
        const supabase = window.S.auth.getSupabaseClient();
        if (!supabase) {
            console.error('[Auth] Supabase client not available for session check.');
            if (window.S?.ui?.showErrorState) S.ui.showErrorState('Критическая ошибка: Клиент не найден.');
            return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();

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
            const supabase = window.S.auth.getSupabaseClient();

            try {
                if (!supabase) throw new Error("Клиент Supabase не инициализирован.");
                const { error } = await supabase.auth.signInWithOtp({ email });
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
        const supabase = window.S.auth.getSupabaseClient();
        if (!supabase) return;
        await supabase.auth.signOut();
        window.location.reload();
    }

    // Public API for S.auth
    return {
        initClient,
        initSession,
        showAuthUI,
        getSupabaseClient: window.S.auth.getSupabaseClient, // Ensure consistency
        signOut,
    };
})();