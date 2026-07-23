// SENTCOR v17.0 — Robust Screen Manager & UI Engine
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;

    const elements = {};
    const screenIds = ['loading', 'error', 'auth', 'main-app'];

    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    function onReady(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    /**
     * Initializes the UI shell, creating containers for all major screens.
     * This ensures a consistent structure for the screen manager.
     */
    function init() {
        const appContainer = document.getElementById("app");
        if (!appContainer) {
            console.error("[UI] Critical error: #app container not found!");
            document.body.innerHTML = '<div style="color:white;text-align:center;padding-top:20%;">[UI] Critical error: #app container not found!</div>';
            return;
        }

        // Create all screen containers at once
        appContainer.innerHTML = `
            <div id="loading-screen" class="screen hidden">
                <div class="auth-container"><div class="spinner"></div></div>
            </div>
            <div id="error-screen" class="screen hidden"></div>
            <div id="auth-screen" class="screen hidden"></div>
            <div id="main-app-screen" class="screen hidden"></div>
        `;

        // Cache element references
        screenIds.forEach(id => {
            elements[id] = document.getElementById(`${id}-screen`);
        });
        elements.app = appContainer;
        
        console.log("[UI] Engine Initialized & Shell Ready");
    }

    /**
     * The core screen management function.
     * Hides all screens and then shows only the target screen.
     * @param {string} screenToShow - The key of the screen to show (e.g., 'loading', 'auth').
     */
    function showScreen(screenToShow) {
        if (!elements[screenToShow]) {
            console.error(`[UI] Screen "${screenToShow}" does not exist.`);
            return;
        }

        console.log(`[UI] Switching to screen: ${screenToShow}`);

        // Hide all screens
        screenIds.forEach(id => {
            if (elements[id]) {
                elements[id].classList.add('hidden');
            }
        });

        // Show the target screen
        elements[screenToShow].classList.remove('hidden');
    }

    function showErrorState(message) {
        if (elements.error) {
            elements.error.innerHTML = `
                <div class="auth-container">
                    <div class="auth-card">
                        <h1 class="auth-title">Критическая ошибка</h1>
                        <p class="text-muted">${escapeHtml(message)}</p>
                        <button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button>
                    </div>
                </div>`;
            showScreen('error');
        }
    }
    
    function showAuth() {
        // This function now acts as a proxy.
        // It ensures the auth screen is shown and calls the content renderer from the auth module.
        if (S.auth && typeof S.auth.showAuthUI === 'function') {
            S.auth.showAuthUI(); // This will handle content and visibility
        } else {
            showErrorState("Модуль авторизации не загружен.");
        }
    }

    function addBadge(elementOrSelector, count = 0) {
        const target = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) : elementOrSelector;
        if (!target) return;

        let badge = target.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            target.style.position = 'relative';
            target.appendChild(badge);
        }

        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function removeBadge(elementOrSelector) {
        const target = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) : elementOrSelector;
        if (!target) return;
        const badge = target.querySelector('.notification-badge');
        if (badge) badge.remove();
    }
    
    function createMemberItem(member) {
        const displayName = escapeHtml(member.display_name || member.username);
        const avatarUrl = escapeHtml(member.avatar_url);
        const status = escapeHtml(member.status || 'offline');

        const avatar = avatarUrl
            ? `<img src="${avatarUrl}" alt="Avatar">`
            : `<div class="avatar-initials">${displayName.charAt(0).toUpperCase()}</div>`;

        return `
            <div class="sp-item-friend" data-uid="${member.id}">
                <div class="avatar avatar-sm">
                    ${avatar}
                    <span class="status-dot status-${status}"></span>
                </div>
                <span class="member-name">${displayName}</span>
            </div>`;
    }

    // --- Public API ---
    S.ui = {
        init,
        onReady,
        showScreen,
        showLoadingScreen: () => showScreen('loading'),
        showErrorState,
        showAuth,
        showApp: () => showScreen('main-app'),
        addBadge,
        removeBadge,
        escapeHtml,
        helpers: {
            createMemberItem
        }
    };

})();