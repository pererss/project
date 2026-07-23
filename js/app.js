// ===============================================================
// SentCor App Module v5.0 - Defensive & Robust
// ===============================================================

// Правило №1: Гарантия глобального пространства имен
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};
window.S.auth = window.S.auth || {};
window.S.app = window.S.app || {};

(function(S) {
    "use strict";

    let currentUserProfile = null;
    const elements = {};

    /**
     * Кэширует элементы DOM, используемые в этом модуле.
     */
    function queryElements() {
        elements.friendsList = document.getElementById('friends-list');
        elements.profileUsername = document.getElementById('profile-username');
        elements.profileSubtext = document.getElementById('profile-subtext');
        elements.profileAvatarWrapper = document.getElementById('profile-avatar-wrapper');
        elements.addFriendForm = document.getElementById('add-friend-form');
        elements.addFriendInput = document.getElementById('add-friend-username');
        elements.addFriendStatus = document.getElementById('add-friend-status');
    }

    /**
     * Генерирует HTML для одного друга в списке.
     * @param {object} friend - Объект профиля друга.
     * @returns {string} HTML-разметка.
     */
    function getFriendHTML(friend) {
        const username = S.utils.escapeHtml(friend.username || 'Безымянный');
        const status = friend.is_online ? 'online' : 'offline';
        return `
            <div class="list-item" data-id="${friend.id}">
                <div class="list-item-avatar">
                    ${S.ui.createAvatarHTML(username, friend.avatar_url)}
                    <div class="list-item-status ${status}"></div>
                </div>
                <div class="list-item-info">
                    <div class="list-item-name">${username}</div>
                </div>
            </div>
        `;
    }

    /**
     * Рендерит список друзей в DOM.
     * @param {Array} friends - Массив объектов друзей.
     */
    function renderFriendsList(friends) {
        if (!elements.friendsList) return;
        
        // Правило №3: Отображение Empty State
        if (!friends || friends.length === 0) {
            elements.friendsList.innerHTML = S.ui.getEmptyFriendsStateHTML();
            return;
        }
        
        elements.friendsList.innerHTML = friends.map(getFriendHTML).join('');
    }

    /**
     * Загружает и отображает список друзей.
     */
    async function fetchAndRenderFriends() {
        if (!elements.friendsList) return;
        
        const supabase = S.auth.getSupabaseClient();
        if (!supabase || !currentUserProfile) {
            throw new Error('Клиент Supabase или профиль пользователя не готовы для загрузки друзей.');
        }

        // Оборачиваем сетевой запрос в try/catch
        try {
            // Не показываем лоадер здесь, т.к. это фоновая загрузка
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, is_online')
                .neq('id', currentUserProfile.id); // Исключаем себя из списка

            if (error) throw error;

            renderFriendsList(data);
        } catch (error) {
            console.error('[App] Ошибка при загрузке друзей:', error);
            elements.friendsList.innerHTML = '<div class="empty-state"><p style="color: var(--error-color);">Не удалось загрузить список друзей.</p></div>';
            S.toast.show('Ошибка при загрузке друзей.', { type: 'error' });
        }
    }

    /**
     * Рендерит информацию о текущем пользователе в нижней панели.
     * @param {object} profile - Профиль текущего пользователя.
     */
    function renderUserProfile(profile) {
        const safeProfile = profile || { username: 'Пользователь', email: 'user@example.com', avatar_url: null };
        const username = S.utils.escapeHtml(safeProfile.username || safeProfile.email.split('@')[0]);
        
        if (elements.profileUsername) elements.profileUsername.textContent = username;
        if (elements.profileSubtext) elements.profileSubtext.textContent = "в сети";
        if (elements.profileAvatarWrapper) {
            elements.profileAvatarWrapper.innerHTML = S.ui.createAvatarHTML(username, safeProfile.avatar_url);
        }
    }

    /**
     * Обрабатывает отправку формы "Добавить в друзья".
     */
    function handleAddFriendSubmit() {
        if (!elements.addFriendForm) return;

        elements.addFriendForm.onsubmit = async (e) => {
            e.preventDefault();
            const username = elements.addFriendInput.value.trim();
            elements.addFriendStatus.textContent = '';

            if (!username) {
                elements.addFriendStatus.textContent = 'Имя пользователя не может быть пустым.';
                elements.addFriendStatus.style.color = 'var(--error-color)';
                return;
            }

            const supabase = S.auth.getSupabaseClient();
            if (!supabase) {
                S.toast.show('Ошибка: клиент базы данных не доступен.', { type: 'error' });
                return;
            }

            S.ui.showLoading('Отправка запроса...');
            try {
                // Здесь должна быть логика отправки запроса в друзья через RPC в Supabase
                // Для примера, просто выводим сообщение
                console.log(`[App] Отправка запроса в друзья пользователю: ${username}`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Имитация задержки сети

                elements.addFriendStatus.textContent = `Запрос отправлен пользователю ${S.utils.escapeHtml(username)}`;
                elements.addFriendStatus.style.color = 'var(--success-color)';
                S.toast.show(`Запрос отправлен!`, { type: 'success' });
                elements.addFriendInput.value = '';

            } catch (error) {
                console.error('[App] Ошибка при отправке запроса в друзья:', error);
                const message = error.message || 'Не удалось отправить запрос.';
                elements.addFriendStatus.textContent = message;
                elements.addFriendStatus.style.color = 'var(--error-color)';
                S.toast.show(message, { type: 'error' });
            } finally {
                S.ui.hideLoading();
            }
        };
    }

    /**
     * Инициализирует основной модуль приложения.
     * @param {object} profile - Профиль залогиненного пользователя.
     */
    async function init(profile) {
        console.log('[App] Инициализация модуля приложения с профилем...', profile);
        currentUserProfile = profile;
        
        // Оборачиваем всю инициализацию в try/catch для максимальной защиты
        try {
            queryElements();
            renderUserProfile(currentUserProfile);
            handleAddFriendSubmit();
            
            // Загружаем друзей асинхронно
            await fetchAndRenderFriends();

        } catch (error) {
            console.error('[App] Критическая ошибка во время инициализации компонентов:', error);
            S.toast.show('Ошибка инициализации интерфейса.', { type: 'error' });
            // В случае сбоя можно показать экран ошибки
            S.ui.showErrorState('Не удалось загрузить компоненты приложения.');
        }
    }

    // Экспорт публичного метода init
    S.app.init = init;

})(window.S);