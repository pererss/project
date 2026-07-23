// SENTCOR v4.1 — Core UI Helpers with Safe Namespace
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};
window.S.auth = window.S.auth || {};

/**
 * Creates a robust avatar HTML, falling back to initials if the image fails.
 * @param {string} username - The user's name.
 * @param {string|null} avatarUrl - The URL for the user's avatar image.
 * @param {string} size - The size of the avatar (e.g., '36px').
 * @returns {string} The HTML string for the avatar.
 */
S.ui.createAvatarHTML = function(username, avatarUrl, size = '36px') {
    const name = username || 'User';
    // Sanitize username for use in JS string
    const sanitizedName = name.replace(/'/g, "\\'");

    if (avatarUrl) {
        // The onerror handler will replace the broken image with the fallback
        return `<img src="${avatarUrl}" 
                     alt="${sanitizedName}'s Avatar" 
                     style="width:${size}; height:${size};" 
                     class="user-avatar-image"
                     onerror="this.outerHTML = S.ui.createAvatarHTML('${sanitizedName}', null, '${size}');">`;
    }
    
    // Fallback to initials
    const initial = name ? name[0].toUpperCase() : 'U';
    const fontSize = `calc(${size} / 2.2)`;
    return `<div class="user-avatar-initials" 
                 style="width:${size}; height:${size}; font-size:${fontSize};">
                ${initial}
            </div>`;
};

/**
 * Generates HTML for a "no friends" empty state.
 * @returns {string} The HTML string for the empty state.
 */
S.ui.getEmptyFriendsStateHTML = function() {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">
                <i class="fa-solid fa-user-plus"></i>
            </div>
            <h3 class="empty-state-title">У вас пока нет друзей</h3>
            <p class="empty-state-text">
                Перейдите во вкладку 'Добавить в друзья', чтобы найти пользователей по логину.
            </p>
        </div>
    `;
};

/**
 * Hides the main loading screen.
 */
S.ui.hideLoading = function() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.remove('visible');
    }
};

/**
 * Shows the main application screen.
 */
S.ui.showMainApp = function() {
    const mainAppScreen = document.getElementById('main-app-screen');
    if (mainAppScreen) {
        mainAppScreen.classList.add('visible');
    }
};