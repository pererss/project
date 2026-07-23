// SENTCOR v2.0 — Safe Client Access & Full UI Logic
window.S = window.S || {};

S.app = (function () {
    let friendsCache = [];

    // Cache DOM elements for performance
    const elements = {
        friendsList: null,
        friendSearchInput: null,
        friendsListContainer: null,
        profileUsername: null,
        profileSubtext: null,
        profileAvatarImg: null,
    };

    /**
     * Safely retrieves the Supabase client.
     * @returns {object|null} The Supabase client instance or null.
     */
    function getSupabaseClient() {
        if (window.S?.auth?.getSupabaseClient) {
            return window.S.auth.getSupabaseClient();
        }
        console.warn('[App] S.auth.getSupabaseClient() not found. Falling back to window.supabaseClient.');
        return window.supabaseClient || null;
    }

    function getFriendHTML(friend) {
        const username = friend.username || friend.user_name || 'Безымянный';
        const status = friend.is_online ? 'online' : 'offline';
        const avatarUrl = friend.avatar_url || 'assets/default-avatar.png';

        return `
            <div class="list-item" data-id="${friend.id}">
                <div class="list-item-avatar">
                    <img src="${avatarUrl}" alt="${username}'s Avatar">
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
            elements.friendsList.innerHTML = `<div class="empty-list-placeholder">Друзей не найдено</div>`;
            return;
        }
        elements.friendsList.innerHTML = friends.map(getFriendHTML).join('');
    }

    async function fetchAndRenderFriends() {
        if (!elements.friendsList) return;

        elements.friendsList.innerHTML = S.ui.getSkeletonHTML('friend', 5);

        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error('[App] Supabase client is not available for fetching friends.');
            elements.friendsList.innerHTML = '<div class="error-placeholder">Ошибка клиента.</div>';
            return;
        }

        try {
            // This is a placeholder for fetching actual friends.
            // For now, we'll use some mock data.
            const mockFriends = [
                { id: 1, user_name: 'Alice', is_online: true, avatar_url: null },
                { id: 2, user_name: 'Bob', is_online: false, avatar_url: null },
                { id: 3, user_name: 'Charlie', is_online: true, avatar_url: null },
                { id: 4, user_name: 'David', is_online: false, avatar_url: null },
                { id: 5, user_name: 'Eve', is_online: true, avatar_url: null },
            ];
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            friendsCache = mockFriends;
            renderFriendsList(friendsCache);

        } catch (error) {
            console.error('[App] Error fetching friends:', error);
            elements.friendsList.innerHTML = '<div class="error-placeholder">Не удалось загрузить друзей.</div>';
            S.toast.show('Ошибка при загрузке списка друзей.', { type: 'error' });
        }
    }
    
    async function fetchAndRenderUserProfile() {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();

        if (user && elements.profileUsername) {
            const username = user.user_metadata?.user_name || user.email.split('@')[0];
            const avatarUrl = user.user_metadata?.avatar_url || 'assets/default-avatar.png';
            
            elements.profileUsername.textContent = username;
            elements.profileSubtext.textContent = "в сети"; // Placeholder status
            elements.profileAvatarImg.src = avatarUrl;
        }
    }


    function handleFriendSearch() {
        if (!elements.friendSearchInput) return;

        elements.friendSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredFriends = friendsCache.filter(friend =>
                (friend.user_name || '').toLowerCase().includes(searchTerm)
            );
            renderFriendsList(filteredFriends);
        });
    }

    /**
     * Query all DOM elements needed by the app.
     */
    function queryElements() {
        elements.friendsList = document.getElementById('friends-list');
        elements.friendSearchInput = document.getElementById('friend-search-input');
        elements.friendsListContainer = document.getElementById('friends-list-container');
        elements.profileUsername = document.getElementById('profile-username');
        elements.profileSubtext = document.getElementById('profile-subtext');
        elements.profileAvatarImg = document.getElementById('profile-avatar-img');
    }

    async function init() {
        console.log('[App] Initializing application...');
        if (window.S?.ui?.showLoading) await window.S.ui.showLoading('Загрузка приложения...');
        
        queryElements();
        
        // Fetch data in parallel
        await Promise.all([
            fetchAndRenderFriends(),
            fetchAndRenderUserProfile()
        ]);

        handleFriendSearch();
        
        if (window.S?.ui?.hideLoading) await window.S.ui.hideLoading();
        if (window.S?.ui?.showMainApp) window.S.ui.showMainApp();
    }

    return {
        init,
    };
})();