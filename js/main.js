// SENTCOR v1.0 — Main App Initializer
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;

    let currentUser = null;
    let userProfile = null;

    /**
     * Initializes the main application screen.
     * This function is designed to be resilient and render empty states 
     * instead of crashing if data is incomplete.
     * @param {object} user - The authenticated user object from Supabase.
     * @param {object} profile - The user profile data (could be a fallback object).
     */
    function init(user, profile) {
        currentUser = user;
        userProfile = profile;

        console.log("[Main] Initializing main application UI with profile:", userProfile);

        const mainAppScreen = document.getElementById('main-app-screen');
        if (!mainAppScreen) {
            console.error("[Main] Critical error: #main-app-screen not found!");
            return;
        }

        // Basic layout structure
        const appHtml = `
            <div class="app-layout">
                <div class="sidebar">
                    <div class="sidebar-header">Профиль</div>
                    <div id="profile-container"></div>
                    <div class="sidebar-header">Друзья</div>
                    <div id="friends-list-container"></div>
                </div>
                <div class="main-content">
                    <div class="chat-header">Добро пожаловать!</div>
                    <div id="chat-container"></div>
                </div>
            </div>
        `;
        mainAppScreen.innerHTML = appHtml;

        // Render components safely
        renderProfile();
        renderFriendsList();
        renderChatWelcome();
    }

    function renderProfile() {
        const container = document.getElementById('profile-container');
        if (!container) return;

        // Use fallback data if profile is incomplete
        const username = S.ui.escapeHtml(userProfile.username || currentUser.email.split('@')[0]);
        const avatarUrl = userProfile.avatar_url || 'https://via.placeholder.com/40';

        container.innerHTML = `
            <div class="profile-widget">
                <img src="${avatarUrl}" alt="Avatar" class="avatar">
                <span>${username}</span>
            </div>
        `;
    }

    function renderFriendsList() {
        const container = document.getElementById('friends-list-container');
        if (!container) return;

        // Safely handle missing friends data
        const friends = userProfile.friends || [];

        if (friends.length === 0) {
            container.innerHTML = '<div class="empty-state">У вас пока нет друзей.</div>';
            return;
        }

        // Render list (placeholder)
        container.innerHTML = `<ul>${friends.map(f => `<li>${S.ui.escapeHtml(f.username)}</li>`).join('')}</ul>`;
    }

    function renderChatWelcome() {
        const container = document.getElementById('chat-container');
        if (!container) return;

        container.innerHTML = '<div class="empty-state">Выберите чат, чтобы начать общение.</div>';
    }

    // --- Public API ---
    S.main = {
        init
    };

})();