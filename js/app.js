// SENTCOR v4.1 — Real Data, with Safe Namespace
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};
window.S.auth = window.S.auth || {};

(function(S) {
    let friendsCache = [];
    let currentUserProfile = null;

    const elements = {
        friendsList: null,
        profileUsername: null,
        profileSubtext: null,
        profileAvatarWrapper: null,
        chatTabs: null,
        mainContentArea: null,
    };

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

        const supabase = S.auth.getSupabaseClient();
        if (!supabase || !currentUserProfile) {
            console.warn('[App] Supabase client or user not ready, skipping friends fetch.');
            elements.friendsList.innerHTML = '<div class="error-placeholder">Не удалось подключиться.</div>';
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, is_online')
                .neq('id', currentUserProfile.id); 

            if (error) throw error;

            friendsCache = data;
            renderFriendsList(friendsCache);

        } catch (error) {
            console.error('[App] Error fetching friends:', error);
            elements.friendsList.innerHTML = '<div class="error-placeholder">Не удалось подгрузить друзей.</div>';
            if (S.toast) S.toast.show('Ошибка при загрузке списка друзей.', { type: 'error' });
        }
    }
    
    function renderUserProfile() {
        if (!currentUserProfile) return;

        const username = S.utils.escapeHtml(currentUserProfile.username || currentUserProfile.email.split('@')[0]);
        const avatarUrl = currentUserProfile.avatar_url;
        
        if (elements.profileUsername) elements.profileUsername.textContent = username;
        if (elements.profileSubtext) elements.profileSubtext.textContent = "в сети";
        if (elements.profileAvatarWrapper) {
            elements.profileAvatarWrapper.innerHTML = S.ui.createAvatarHTML(username, avatarUrl, '40px') + 
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
            
            const activeViewId = `view-${tabName.startsWith('friends') ? 'friends' : 'add-friend'}`;
            const activeView = document.getElementById(activeViewId);
            if (activeView) {
                activeView.classList.add('visible');
            }
        });
    }

    function handleAddFriend() {
        const form = document.getElementById('add-friend-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('add-friend-username');
            const searchTerm = usernameInput.value.trim();
            if (!searchTerm) return;

            const supabase = S.auth.getSupabaseClient();
            if (!supabase) {
                if (S.toast) S.toast.show('Клиент не готов.', { type: 'error' });
                return;
            }

            console.log(`[App] Sending friend request to: ${searchTerm}`);
            if (S.toast) S.toast.show(`Запрос отправлен пользователю ${S.utils.escapeHtml(searchTerm)}`, { type: 'success' });
            
            usernameInput.value = '';
        });
    }

    function queryElements() {
        elements.friendsList = document.getElementById('friends-list');
        elements.profileUsername = document.getElementById('profile-username');
        elements.profileSubtext = document.getElementById('profile-subtext');
        elements.profileAvatarWrapper = document.getElementById('profile-avatar-wrapper');
        elements.chatTabs = document.getElementById('chat-tabs');
        elements.mainContentArea = document.getElementById('main-content-area');
    }

    async function init(profile) {
        console.log('[App] Initializing application with profile...', profile);
        currentUserProfile = profile;
        
        queryElements();
        
        renderUserProfile();
        await fetchAndRenderFriends();

        handleTabNavigation();
        handleAddFriend();
        
        if (S.ui.hideLoading) await S.ui.hideLoading();
        if (S.ui.showMainApp) S.ui.showMainApp();
    }

    S.app = {
        init,
    };
})(window.S);