// SENTCOR v4.0 — Real Data, Avatar Fallbacks & Active Tabs
window.S = window.S || {};

function getClient() {
    return window.supabaseClient || 
           (window.S?.auth?.getSupabaseClient && window.S.auth.getSupabaseClient()) || 
           window.S?.supabase || 
           null;
}

S.app = (function () {
    let friendsCache = [];
    let currentUser = null;

    const elements = {
        friendsList: null,
        profileUsername: null,
        profileSubtext: null,
        profileAvatarWrapper: null,
        chatTabs: null,
        mainContentArea: null,
    };

    function getFriendHTML(friend) {
        const username = friend.username || 'Безымянный';
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

        // elements.friendsList.innerHTML = S.ui.getSkeletonHTML('friend', 5); // Assumes getSkeletonHTML exists

        const supabase = getClient();
        if (!supabase || !currentUser) {
            console.warn('[App] Supabase client or user not ready, skipping friends fetch.');
            elements.friendsList.innerHTML = '<div class="error-placeholder">Не удалось подключиться.</div>';
            return;
        }

        try {
            // This is a placeholder query. A real app would have a 'friends' table.
            // For now, we'll fetch all profiles except our own to simulate a user list.
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, is_online')
                .neq('id', currentUser.id); // Don't show self in friends list

            if (error) throw error;

            friendsCache = data;
            renderFriendsList(friendsCache);

        } catch (error) {
            console.error('[App] Error fetching friends:', error);
            elements.friendsList.innerHTML = '<div class="error-placeholder">Не удалось подгрузить друзей.</div>';
            if (S.toast) S.toast.show('Ошибка при загрузке списка друзей.', { type: 'error' });
        }
    }
    
    async function fetchAndRenderUserProfile() {
        try {
            const supabase = getClient();
            if (!supabase) return;

            const { data: { user } } = await supabase.auth.getUser();
            currentUser = user; // Cache the current user object

            if (user && elements.profileUsername) {
                // Fetch full profile from 'profiles' table
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                const username = profile?.username || user.email.split('@')[0];
                const avatarUrl = profile?.avatar_url;
                
                elements.profileUsername.textContent = username;
                elements.profileSubtext.textContent = "в сети"; // Placeholder status
                elements.profileAvatarWrapper.innerHTML = S.ui.createAvatarHTML(username, avatarUrl, '40px') + 
                    '<div id="profile-status" class="profile-status online"></div>';
            }
        } catch (error) {
            console.error('[App] Error fetching user profile:', error);
            if (elements.profileUsername) {
                elements.profileUsername.textContent = "Ошибка";
                elements.profileAvatarWrapper.innerHTML = S.ui.createAvatarHTML("Error", null, '40px');
            }
        }
    }

    function handleTabNavigation() {
        if (!elements.chatTabs) return;

        elements.chatTabs.addEventListener('click', (e) => {
            const tabButton = e.target.closest('.tab-item');
            if (!tabButton) return;

            // Update active tab style
            elements.chatTabs.querySelector('.active')?.classList.remove('active');
            tabButton.classList.add('active');

            // Switch content view
            const tabName = tabButton.dataset.tab;
            const views = elements.mainContentArea.querySelectorAll('.content-view');
            views.forEach(view => view.classList.remove('visible'));
            
            const activeView = document.getElementById(`view-${tabName.startsWith('friends') ? 'friends' : 'add-friend'}`);
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

            const supabase = getClient();
            if (!supabase) {
                if (S.toast) S.toast.show('Клиент не готов.', { type: 'error' });
                return;
            }

            // Here you would implement the logic to send a friend request.
            // For now, we'll just log it.
            console.log(`[App] Sending friend request to: ${searchTerm}`);
            if (S.toast) S.toast.show(`Запрос отправлен пользователю ${searchTerm}`, { type: 'success' });
            
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

    async function init() {
        console.log('[App] Initializing application...');
        queryElements();
        
        await fetchAndRenderUserProfile(); // Fetch user profile first to get currentUser
        await fetchAndRenderFriends();     // Now fetch friends

        handleTabNavigation();
        handleAddFriend();
        
        if (window.S?.ui?.hideLoading) await window.S.ui.hideLoading();
        if (window.S?.ui?.showMainApp) window.S.ui.showMainApp();
    }

    return {
        init,
    };
})();