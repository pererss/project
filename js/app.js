// SENTCOR v4.2 — Отказоустойчивый модуль приложения
window.S = window.S || {};
window.S.app = window.S.app || {};

(function(S) {
    "use strict";

    let currentUserProfile = null;
    const elements = {};

    function queryElements() {
        elements.friendsList = document.getElementById('friends-list');
        elements.profileUsername = document.getElementById('profile-username');
        elements.profileSubtext = document.getElementById('profile-subtext');
        elements.profileAvatarWrapper = document.getElementById('profile-avatar-wrapper');
        elements.chatTabs = document.getElementById('chat-tabs');
        elements.mainContentArea = document.getElementById('main-content-area');
    }

    function getFriendHTML(friend) {
        const username = S.utils.escapeHtml(friend.username || 'Безымянный');
        const status = friend.is_online ? 'online' : 'offline';
        return `
            <div class="list-item" data-id="${friend.id}">
                <div class="list-item-avatar">
                    ${S.ui.createAvatarHTML(username, friend.avatar_url, '36px')}
                    <div class="list-item-status ${status}"></div>
                </div>
                <div class="list-item-info">
                    <div class="list-item-name">${username}</div>
                </div>
            </div>
        `;
    }

    function renderFriendsList(friends) {
        if (!elements.friendsList) return;
        if (!friends || friends.length === 0) {
            elements.friendsList.innerHTML = S.ui.getEmptyFriendsStateHTML();
            return;
        }
        elements.friendsList.innerHTML = friends.map(getFriendHTML).join('');
    }

    async function fetchAndRenderFriends() {
        if (!elements.friendsList) return;
        S.ui.showLoading('Загрузка друзей...');

        try {
            const supabase = S.auth.getSupabaseClient();
            if (!supabase || !currentUserProfile) {
                throw new Error('Клиент Supabase или профиль пользователя не готовы.');
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, is_online')
                .neq('id', currentUserProfile.id);

            if (error) throw error;

            renderFriendsList(data);
        } catch (error) {
            console.error('[App] Ошибка при загрузке друзей:', error);
            elements.friendsList.innerHTML = '<div class="error-placeholder">Не удалось загрузить список друзей.</div>';
            S.toast.show('Ошибка при загрузке друзей.', { type: 'error' });
        }
    }

    function renderUserProfile(profile) {
        // Защита от undefined profile
        const safeProfile = profile || { username: 'Пользователь', email: 'user@example.com', avatar_url: null };
        
        const username = S.utils.escapeHtml(safeProfile.username || safeProfile.email.split('@')[0]);
        
        if (elements.profileUsername) elements.profileUsername.textContent = username;
        if (elements.profileSubtext) elements.profileSubtext.textContent = "в сети";
        if (elements.profileAvatarWrapper) {
            elements.profileAvatarWrapper.innerHTML = S.ui.createAvatarHTML(username, safeProfile.avatar_url, '40px') +
                '<div id="profile-status" class="profile-status online"></div>';
        }
    }

    function handleTabNavigation() {
        if (!elements.chatTabs) return;
        elements.chatTabs.addEventListener('click', (e) => {
            const tabButton = e.target.closest('.tab-item');
            if (!tabButton) return;

            elements.chatTabs.querySelector('.active')?.classList.remove('active');
            tabButton.classList.add('active');

            const tabName = tabButton.dataset.tab;
            const views = elements.mainContentArea.querySelectorAll('.content-view');
            views.forEach(view => view.classList.remove('visible'));
            
            const activeViewId = `view-${tabName.includes('add') ? 'add-friend' : 'friends'}`;
            const activeView = document.getElementById(activeViewId);
            if (activeView) activeView.classList.add('visible');
        });
    }

    function handleAddFriend() {
        const form = document.getElementById('add-friend-form');
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('add-friend-username');
            const searchTerm = input.value.trim();
            if (!searchTerm) return;

            console.log(`[App] Отправка запроса в друзья: ${searchTerm}`);
            S.toast.show(`Запрос отправлен пользователю ${S.utils.escapeHtml(searchTerm)}`, { type: 'success' });
            input.value = '';
        });
    }

    async function init(profile) {
        console.log('[App] Инициализация приложения с профилем...', profile);
        currentUserProfile = profile;
        
        try {
            queryElements();
            renderUserProfile(currentUserProfile);
            handleTabNavigation();
            handleAddFriend();
            await fetchAndRenderFriends();
        } catch (error) {
            console.error('[App] Ошибка во время инициализации компонентов:', error);
            S.toast.show('Ошибка инициализации интерфейса.', { type: 'error' });
        }
    }

    S.app.init = init;

})(window.S);