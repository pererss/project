// ===============================================================
// SentCor Auth Module v5.0 - Defensive & Robust
// ===============================================================

// Правило №1: Гарантия глобального пространства имен
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};
window.S.auth = window.S.auth || {};
window.S.app = window.S.app || {};

(function(S) {
    "use strict";

    let supabase = null;

    /**
     * Правило №3: Универсальная и всеядная функция получения клиента Supabase.
     * @returns {object|null} Экземпляр клиента Supabase или null.
     */
    function getSupabase() {
        if (supabase) return supabase;
        
        const client = window.supabaseClient ||
                       window.S?.supabase ||
                       (window.S?.auth?.getSupabaseClient && window.S.auth.getSupabaseClient()) ||
                       null;
        
        if (client && !supabase) {
            supabase = client;
            console.log('[Auth] Supabase client acquired.');
        }
        
        return supabase;
    }

    /**
     * Отображает UI для входа по email (Magic Link).
     */
    function showAuthUI() {
        const form = document.getElementById('auth-form');
        const errorMessageEl = document.getElementById('auth-error-message');
        if (!form || !errorMessageEl) {
            console.error('[Auth] Auth form elements not found in DOM.');
            return;
        }

        form.innerHTML = `
            <div class="input-group">
                <label for="email" style="display:none;">Email</label>
                <input type="email" id="email" name="email" required placeholder="you@example.com" class="search-input" style="text-align:center;">
            </div>
            <button type="submit" class="btn-primary" style="width:100%; margin-top:16px;">Получить ссылку для входа</button>
        `;

        form.onsubmit = async (e) => {
            e.preventDefault();
            errorMessageEl.textContent = '';
            const email = e.target.email.value.trim();
            const client = getSupabase();

            if (!email) {
                errorMessageEl.textContent = 'Пожалуйста, введите ваш email.';
                return;
            }
            if (!client) {
                errorMessageEl.textContent = 'Ошибка: Клиент базы данных не инициализирован.';
                return;
            }

            try {
                S.ui.showLoading('Отправка ссылки...');
                const { error } = await client.auth.signInWithOtp({ 
                    email,
                    options: {
                        emailRedirectTo: window.location.origin,
                    }
                });
                if (error) throw error;
                
                form.innerHTML = `<p style="text-align:center; color: var(--text-secondary);">Проверьте вашу почту. Мы отправили ссылку для быстрого входа.</p>`;
                S.toast.show('Ссылка для входа отправлена!', { type: 'success', duration: 5000 });

            } catch (error) {
                console.error('[Auth] Sign-in error:', error);
                const message = error.message || 'Не удалось отправить ссылку. Попробуйте еще раз.';
                errorMessageEl.textContent = message;
                S.toast.show(message, { type: 'error' });
            } finally {
                // Правило №3: Гарантированное скрытие лоадера
                S.ui.hideLoading();
            }
        };
    }
    
    /**
     * Выполняет выход пользователя из системы.
     */
    async function signOut() {
        const client = getSupabase();
        if (!client) {
            console.warn('[Auth] Supabase client not available for sign out.');
            window.location.reload();
            return;
        }
        try {
            S.ui.showLoading('Выход...');
            await client.auth.signOut();
        } catch (error) {
            console.error('[Auth] Sign-out error:', error);
        } finally {
            // Перезагружаем страницу в любом случае, чтобы сбросить состояние
            window.location.reload();
        }
    }

    // Экспортируем публичные методы в пространство имен S.auth
    S.auth.getSupabaseClient = getSupabase;
    S.auth.showAuthUI = showAuthUI;
    S.auth.signOut = signOut;

})(window.S);