// SENTCOR v3.0 — Robust Client Access & Resilient UI
window.S = window.S || {};

/**
 * Universal and safe function to get the Supabase client.
 * Checks multiple global locations to ensure the client is found if it exists.
 * @returns {object|null} The Supabase client instance or null.
 */
function getClient() {
    return window.supabaseClient || 
           (window.S?.auth?.getSupabaseClient && window.S.auth.getSupabaseClient()) || 
           window.S?.supabase || 
           null;
}

S.app = (function () {
    let friendsCache = [];

    const elements = {
        friendsList: null,
        friendSearchInput: null,
        friendsListContainer: null,
        profileUsername: null,
        profileSubtext: null,
        profileAvatarImg: null,
        userSearchResults: null,
    };

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
            elements.friendsList.innerHTML = `<div class="empty-list-placeholder">Список пока пуст</div>`;
            return;
        }
        elements.friendsList.innerHTML = friends.map(getFriendHTML).join('');
    }

    async function fetchAndRenderFriends() {
        if (!elements.friendsList) return;

        elements.friendsList.innerHTML = S.ui.getSkeletonHTML('friend', 5);

        const supabase = getClient();
        if (!supabase) {
            console.warn('[App] Supabase client is not ready yet, skipping fetch.');
            elements.friendsList.innerHTML = '<div class="error-placeholder">Не удалось подключиться.</div>';
            return;
        }

        try {
            // Mock data for demonstration purposes
            const mockFriends = [
                { id: 1, user_name: 'Екатерина', is_online: true, avatar_url: null },
                { id: 2, user_name: 'Дмитрий', is_online: false, avatar_url: null },
                { id: 3, user_name: 'Алиса', is_online: true, avatar_url: null },
            ];
            
            await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay

            friendsCache = mockFriends;
            renderFriendsList(friendsCache);

        } catch (error) {
            console.error('[App] Error fetching friends:', error);
            elements.friendsList.innerHTML = '<div class="error-placeholder">Не удалось подгрузить друзей.</div>';
            S.toast.show('Ошибка при загрузке списка друзей.', { type: 'error' });
        }
    }
    
    async function fetchAndRenderUserProfile() {
        try {
            const supabase = getClient();
            if (!supabase) return;

            const { data: { user } } = await supabase.auth.getUser();

            if (user && elements.profileUsername) {
                const username = user.user_metadata?.user_name || user.email.split('@')[0];
                const avatarUrl = user.user_metadata?.avatar_url || 'assets/default-avatar.png';
                
                elements.profileUsername.textContent = username;
                elements.profileSubtext.textContent = "в сети";
                elements.profileAvatarImg.src = avatarUrl;
            }
        } catch (error) {
            console.error('[App] Error fetching user profile:', error);
            if (elements.profileUsername) {
                elements.profileUsername.textContent = "Ошибка";
            }
        }
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    async function searchUsers(searchTerm) {
        // This function remains for future implementation
        console.log(`Searching for: ${searchTerm}`);
    }

    function handleFriendSearch() {
        if (!elements.friendSearchInput) return;

        const debouncedSearch = debounce(searchUsers, 300);

        elements.friendSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            if (searchTerm) {
                elements.friendsListContainer.classList.add('hidden');
                if (elements.userSearchResults) {
                    elements.userSearchResults.classList.add('visible');
                }
                debouncedSearch(searchTerm);
            } else {
                elements.friendsListContainer.classList.remove('hidden');
                if (elements.userSearchResults) {
                    elements.userSearchResults.classList.remove('visible');
                }
                renderFriendsList(friendsCache);
            }
        });
    }

    function queryElements() {
        elements.friendsList = document.getElementById('friends-list');
        elements.friendSearchInput = document.getElementById('friend-search-input');
        elements.friendsListContainer = document.getElementById('friends-list-container');
        elements.profileUsername = document.getElementById('profile-username');
        elements.profileSubtext = document.getElementById('profile-subtext');
        elements.profileAvatarImg = document.getElementById('profile-avatar-img');
        elements.userSearchResults = document.getElementById('user-search-results');
    }

    async function init() {
        console.log('[App] Initializing application...');
        if (window.S?.ui?.showLoading) await window.S.ui.showLoading('Загрузка приложения...');
        
        queryElements();
        
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