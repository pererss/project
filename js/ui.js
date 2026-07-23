// SENTCOR v18.0 — Bulletproof Screen Manager with Direct Style Manipulation
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

    function init() {
        const appContainer = document.getElementById("app");
        if (!appContainer) {
            console.error("[UI] Critical error: #app container not found!");
            document.body.innerHTML = '<div style="color:white;text-align:center;padding-top:20%;">[UI] Critical error: #app container not found!</div>';
            return;
        }

        appContainer.innerHTML = `
            <div id="loading-screen" class="screen" style="display: none;"><div class="auth-container"><div class="spinner"></div></div></div>
            <div id="error-screen" class="screen" style="display: none;"></div>
            <div id="auth-screen" class="screen" style="display: none;"></div>
            <div id="main-app-screen" class="screen" style="display: none;"></div>
        `;

        screenIds.forEach(id => {
            elements[id] = document.getElementById(`${id}-screen`);
        });
        elements.app = appContainer;
        
        console.log("[UI] Engine Initialized & Shell Ready");
    }

    /**
     * The core screen management function.
     * Hides all screens and then shows only the target screen using direct style manipulation.
     * @param {string} screenToShow - The key of the screen to show (e.g., 'loading', 'auth').
     */
    function showScreen(screenToShow) {
        if (!elements[screenToShow]) {
            console.error(`[UI] Screen "${screenToShow}" does not exist.`);
            return;
        }

        console.log(`[UI] Switching to screen: ${screenToShow}`);

        // Hide all screens using direct style manipulation for reliability
        screenIds.forEach(id => {
            if (elements[id] && elements[id].style) {
                elements[id].style.display = 'none';
            }
        });

        // Show the target screen. 'flex' is a good default for centering containers.
        elements[screenToShow].style.display = 'flex';
    }

    function showErrorState(message, errorDetails = '') {
        if (elements.error) {
            elements.error.innerHTML = `
                <div class="auth-container">
                    <div class="auth-card">
                        <h1 class="auth-title">Критическая ошибка</h1>
                        <p class="text-muted">${escapeHtml(message)}</p>
                        <button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button>
                    </div>
                </div>`;
            console.error(`[UI] Displaying error state: ${message}`, errorDetails);
            showScreen('error');
        }
    }
    
    function showAuth() {
        if (S.auth && typeof S.auth.showAuthUI === 'function') {
            S.auth.showAuthUI();
        } else {
            showErrorState("Модуль авторизации не загружен.", "S.auth.showAuthUI is not a function.");
        }
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
        escapeHtml,
        // Badge and helper functions are omitted for brevity as they are unchanged
    };

})();