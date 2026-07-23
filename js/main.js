// SENTCOR v4.2 — Отказоустойчивый главный инициализатор
window.S = window.S || {};
window.S.main = window.S.main || {};
window.S.utils = window.S.utils || {};

(function(S) {
    "use strict";

    S.utils.escapeHtml = function(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    async function fetchUserProfile(supabase, user) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            
            return { ...user, ...profile };
        } catch (error) {
            console.error("[Main] Ошибка при загрузке профиля:", error);
            S.toast.show('Не удалось загрузить данные профиля.', { type: 'error' });
            return user; // Возвращаем хотя бы данные пользователя, если профиль не загрузился
        }
    }

    async function init() {
        console.log("[Main] Инициализация...");
        S.ui.showLoading('Инициализация...');
        
        let userProfile = null;

        try {
            const supabase = S.auth.getSupabaseClient();
            if (!supabase) throw new Error("Клиент Supabase не найден.");

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                console.log("[Main] Сессия найдена. Загрузка профиля...");
                S.ui.showLoading('Загрузка профиля...');
                userProfile = await fetchUserProfile(supabase, session.user);
                
                if (userProfile) {
                    console.log("[Main] Профиль загружен, запускаем приложение:", userProfile);
                    await S.app.init(userProfile);
                    S.ui.showMainApp();
                } else {
                    // Этого не должно произойти, но на всякий случай
                    throw new Error("Профиль не был загружен, хотя сессия существует.");
                }
            } else {
                console.log("[Main] Сессия не найдена. Показываем экран входа.");
                S.ui.showAuthScreen();
                S.auth.showAuthUI(); // Убедимся, что форма входа отрендерена
            }
        } catch (error) {
            console.error("[Main] Критическая ошибка при инициализации:", error);
            S.toast.show('Произошла критическая ошибка. Попробуйте обновить страницу.', { type: 'error', duration: 5000 });
            // Показываем экран входа как запасной вариант
            S.ui.showAuthScreen();
            if (S.auth.showAuthUI) S.auth.showAuthUI();
        } finally {
            // Гарантированно скрываем загрузчик в любом случае
            console.log("[Main] Инициализация завершена, скрываем загрузчик.");
            S.ui.hideLoading();
        }
    }

    S.main.init = init;

})(window.S);