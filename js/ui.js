// SENTCOR v16.0 — Resilient & Feature-Rich UI Engine
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;

    let uiReady = false;
    const elements = {};

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

    function init() {
        const appContainer = document.getElementById("app");
        if (!appContainer) {
            console.error("[UI] Critical error: #app container not found!");
            document.body.innerHTML = '<div style="color:white;text-align:center;padding-top:20%;">[UI] Critical error: #app container not found!</div>';
            return;
        }

        appContainer.innerHTML = `
            <div id="loading-screen" class="screen"><div class="spinner"></div></div>
            <div id="error-screen" class="screen"></div>
            <div id="auth-screen" class="screen"></div>
            <div id="main-app-screen" class="screen"></div>
        `;

        elements.app = appContainer;
        elements.loadingScreen = document.getElementById("loading-screen");
        elements.errorScreen = document.getElementById("error-screen");
        elements.authScreen = document.getElementById("auth-screen");
        elements.mainAppScreen = document.getElementById("main-app-screen");
        
        uiReady = true;
        console.log("[UI] Engine Initialized & Shell Ready");
    }

    function switchScreen(screenId) {
        if (!uiReady) {
            console.warn("[UI] Attempted to switch screen before UI was ready. Call will be ignored.");
            return;
        }
        
        const allScreens = elements.app.querySelectorAll('.screen');
        allScreens.forEach(screen => screen.classList.remove('active'));

        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        } else {
            console.error(`[UI] Screen with ID "${screenId}" not found.`);
            showErrorState(`Ошибка интерфейса: экран "${screenId}" не найден.`);
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
        if (badge) {
            badge.remove();
        }
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
        switchScreen,
        showLoadingScreen: () => switchScreen('loading-screen'),
        showErrorState: (message) => {
            if (elements.errorScreen) {
                elements.errorScreen.innerHTML = `<div class="auth-container"><h1>Критическая ошибка</h1><p class="text-muted">${escapeHtml(message)}</p><button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button></div>`;
                switchScreen('error-screen');
            }
        },
        showAuth: () => switchScreen('auth-screen'),
        showApp: () => switchScreen('main-app-screen'),
        addBadge,
        removeBadge,
        escapeHtml,
        helpers: {
            createMemberItem
        }
    };

})();