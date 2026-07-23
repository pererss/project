// SENTCOR v4.3 — Гибкая проверка Supabase и мягкие тосты
(function(S) {
    "use strict";

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
            if (S.toast) {
                S.toast.show('Не удалось загрузить данные профиля.', { type: 'error' });
            }
            return user;
        }
    }

    async function init() {
        console.log("[Main] Инициализация...");
        S.ui.showLoading('Инициализация...');
        
        let userProfile = null;

        try {
            // Универсальная гибридная проверка клиента Supabase
            const supabase = window.supabaseClient || window.S?.supabase || (window.S?.auth?.getSupabaseClient && S.auth.getSupabaseClient());

            if (!supabase) {
                throw new Error("Клиент Supabase не найден ни в одном из источников.");
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                console.log("[Main] Сессия найдена. Загрузка профиля...");
                S.ui.showLoading('Загрузка профиля...');
                userProfile = await fetchUserProfile(supabase, session.user);
                
                console.log("[Main] Профиль загружен, запускаем приложение:", userProfile);
                await S.app.init(userProfile);
                S.ui.showMainApp();
                
            } else {
                console.log("[Main] Сессия не найдена. Показываем экран входа.");
                S.ui.showAuthScreen();
                if (S.auth.showAuthUI) S.auth.showAuthUI();
            }
        } catch (error) {
            console.error("[Main] Критическая ошибка при инициализации:", error.message);
            
            // Мягкий вызов тоста
            if (S.toast && S.toast.show) {
                S.toast.show('Произошла критическая ошибка. Попробуйте обновить страницу.', { type: 'error', duration: 5000 });
            } else {
                console.error("Модуль S.toast не доступен для отображения ошибки.");
            }
            
            S.ui.showAuthScreen();
            if (S.auth.showAuthUI) S.auth.showAuthUI();
        } finally {
            console.log("[Main] Инициализация завершена, скрываем загрузчик.");
            S.ui.hideLoading();
        }
    }

    S.main = { ...S.main, init };

})(window.S);