// SENTCOR v4.2 — Отказоустойчивый модуль аутентификации
window.S = window.S || {};
window.S.auth = window.S.auth || {};

(function(S) {
    "use strict";

    let supabaseClient = null;

    function initClient(client) {
        if (!client) {
            console.error('[Auth] Экземпляр клиента Supabase обязателен для инициализации.');
            return;
        }
        supabaseClient = client;
        window.supabaseClient = client; // Для обратной совместимости
        console.log('[Auth] Клиент Supabase инициализирован.');
    }

    function getSupabaseClient() {
        return supabaseClient;
    }

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
            const supabase = getSupabaseClient();

            try {
                if (!supabase) throw new Error("Клиент Supabase не инициализирован.");
                S.ui.showLoading('Отправка ссылки для входа...');
                const { error } = await supabase.auth.signInWithOtp({ email });
                if (error) throw error;
                S.toast.show('Проверьте свою почту для входа!', { type: 'success', duration: 5000 });
            } catch (error) {
                console.error('Ошибка при входе:', error);
                errorMessage.textContent = error.message || 'Не удалось войти.';
                S.toast.show(error.message || 'Не удалось войти.', { type: 'error' });
            } finally {
                S.ui.hideLoading();
            }
        };
    }
    
    async function signOut() {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        await supabase.auth.signOut();
        window.location.reload();
    }

    // Привязываем к глобальному объекту S
    S.auth = {
        initClient,
        getSupabaseClient,
        showAuthUI,
        signOut,
    };

})(window.S);