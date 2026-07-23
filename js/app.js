
window.S = window.S || {};

S.app = (function () {
    let friendsCache = [];

    const elements = {
        friendsList: document.getElementById('friends-list'),
        friendSearchInput: document.getElementById('friend-search-input'),
        friendsListContainer: document.getElementById('friends-list-container'),
    };

    function getFriendHTML(friend) {
        // Basic friend item structure
        return `
            <div class="friend-item" data-id="${friend.id}">
                <div class="friend-avatar">
                    <img src="${friend.avatar_url || 'assets/default-avatar.png'}" alt="Avatar">
                    <div class="status-indicator ${friend.is_online ? 'online' : 'offline'}"></div>
                </div>
                <div class="friend-info">
                    <div class="friend-name">${friend.username}</div>
                    <div class="friend-last-message">Last message here...</div>
                </div>
                <div class="friend-meta">
                    <div class="last-message-time">10:42</div>
                    <div class="unread-count">3</div>
                </div>
            </div>
        `;
    }

    function renderFriendsList(friends) {
        const friendsList = elements.friendsList || document.getElementById('friends-list');
        if (!friendsList) {
            console.error('[App] Friends list element not found.');
            return;
        }

        if (friends.length === 0) {
            friendsList.innerHTML = '<div class="empty-list-placeholder">Ничего не найдено</div>';
            return;
        }
        friendsList.innerHTML = friends.map(getFriendHTML).join('');
    }

    async function fetchAndRenderFriends() {
        const friendsList = elements.friendsList || document.getElementById('friends-list');
        if (!friendsList) return;

        friendsList.innerHTML = S.ui.getSkeletonHTML('friend', 5);

        try {
            const client = S.auth.getSupabaseClient();
            if (!client) {
                throw new Error("Supabase client not available.");
            }
            // This is a placeholder. Replace with actual logic to get friends.
            // For now, we'll use some mock data.
            const mockFriends = [
                { id: 1, username: 'Alice', is_online: true, avatar_url: null },
                { id: 2, username: 'Bob', is_online: false, avatar_url: null },
                { id: 3, username: 'Charlie', is_online: true, avatar_url: null },
                { id: 4, username: 'David', is_online: false, avatar_url: null },
                { id: 5, username: 'Eve', is_online: true, avatar_url: null },
            ];
            friendsCache = mockFriends;
            renderFriendsList(friendsCache);

        } catch (error) {
            console.error('[App] Error fetching friends:', error);
            if (friendsList) {
                friendsList.innerHTML = '<div class="error-placeholder">Не удалось загрузить друзей.</div>';
            }
            S.toast.show('Ошибка при загрузке списка друзей.', { type: 'error' });
        }
    }

    function handleFriendSearch() {
        const searchInput = elements.friendSearchInput || document.getElementById('friend-search-input');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredFriends = friendsCache.filter(friend =>
                friend.username.toLowerCase().includes(searchTerm)
            );
            renderFriendsList(filteredFriends);
        });
    }


    function init() {
        console.log('[App] Initializing application...');
        // Re-query elements in case they were not available on script load
        elements.friendsList = document.getElementById('friends-list');
        elements.friendSearchInput = document.getElementById('friend-search-input');
        elements.friendsListContainer = document.getElementById('friends-list-container');

        fetchAndRenderFriends();
        handleFriendSearch();
        S.ui.hideLoading();
        S.ui.showMainApp();
    }

    return {
        init,
        renderFriendsList,
    };
})();