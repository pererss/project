// SENTCOR v4.0 — Core UI Helpers
window.S = window.S || {};

S.ui = (function () {

    /**
     * Creates a robust avatar HTML, falling back to initials if the image fails.
     * @param {string} username - The user's name.
     * @param {string|null} avatarUrl - The URL for the user's avatar image.
     * @param {string} size - The size of the avatar (e.g., '36px').
     * @returns {string} The HTML string for the avatar.
     */
    function createAvatarHTML(username, avatarUrl, size = '36px') {
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
    }

    /**
     * Generates HTML for a "no friends" empty state.
     * @returns {string} The HTML string for the empty state.
     */
    function getEmptyFriendsStateHTML() {
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
    }

    // Expose functions to be callable from onerror attribute
    // This is a simplified approach. A more robust solution would use event delegation.
    window.S.ui.createAvatarHTML = createAvatarHTML;

    // Keep other UI functions from previous versions if they exist
    const existingUi = window.S.ui;

    return {
        ...existingUi,
        createAvatarHTML,
        getEmptyFriendsStateHTML,
    };
})();