// ===============================================================
// SentCor Main Entry Point v5.0 - Defensive & Robust
// ===============================================================

// Правило №1: Гарантия глобального пространства имен
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};
window.S.auth = window.S.auth || {};
window.S.app = window.S.app || {};

(function(S) {
    "use strict";

    /**
     * Загружает профиль пользователя из таблицы 'profiles'.
     * @param {object} supabase - Клиент Supabase.
     * @param {object} user - Объект пользователя из session.
     * @returns {Promise<object>} Расширенный объект пользователя с данными профиля.
     */
    async function fetchUserProfile(supabase, user) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            
            // Объединяем данные сессии и данные профиля
            return { ...user, ...profile };

        } catch (error) {
            console.error("[Main] Ошибка при загрузке профиля:", error);
            S.toast.show('Не удалось загрузить данные профиля.', { type: 'error' });
            // Возвращаем исходного пользователя, чтобы приложение могло продолжить работу с минимальными данными
            return user;
        }
    }

    /**
     * Главная функция инициализации приложения.
     * Проверяет сессию и запускает либо приложение, либо экран входа.
     */
    async function init() {
        console.log("[Main] Инициализация приложения...");
        S.ui.showLoading('Проверка сессии...');
        
        try {
            const supabase = S.auth.getSupabaseClient();

            if (!supabase) {
                throw new Error("Критическая ошибка: Клиент Supabase не найден. Невозможно продолжить.");
            }

            // Проверяем наличие активной сессии
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                console.log("[Main] Сессия найдена. Загрузка профиля...");
                S.ui.showLoading('Загрузка профиля...');
                
                const userProfile = await fetchUserProfile(supabase, session.user);
                
                console.log("[Main] Профиль загружен, запускаем основной модуль приложения:", userProfile);
                await S.app.init(userProfile);
                
                S.ui.showMainApp();
                
            } else {
                console.log("[Main] Сессия не найдена. Показываем экран входа.");
                S.ui.showAuthScreen();
                if (S.auth.showAuthUI) {
                    S.auth.showAuthUI();
                }
            }
        } catch (error) {
            console.error("[Main] Критическая ошибка при инициализации:", error);
            
            // Показываем экран ошибки и выводим тост
            S.ui.showErrorState(error.message);
            S.toast.show('Произошла критическая ошибка. Попробуйте обновить страницу.', { type: 'error', duration: 8000 });
            
            // Можно также показать экран авторизации как фоллбэк
            S.ui.showAuthScreen();

        } finally {
            // Правило №3: Гарантированное скрытие лоадера в блоке finally
            console.log("[Main] Инициализация завершена, скрываем загрузчик.");
            S.ui.hideLoading();
        }
    }

    // Экспорт публичного метода init
    S.main = { ...S.main, init };

})(window.S);