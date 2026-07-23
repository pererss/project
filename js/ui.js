// SENTCOR v20.0 — Self-Healing Screen Manager
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;

    const elements = {};
    const screenIds = ['loading', 'error', 'auth', 'main-app'];

    function onReady(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    /**
     * Initializes the UI by caching or creating DOM elements.
     * This function is now resilient and will create screen containers if they are missing.
     */
    function init() {
        const appContainer = document.getElementById('app');
        if (!appContainer) {
            console.error("[UI] Critical init failure: #app container not found!");
            document.body.innerHTML = '<div style="color:white;text-align:center;padding-top:20%;">Fatal Error: #app container is missing.</div>';
            return;
        }

        screenIds.forEach(id => {
            const screenId = `${id}-screen`;
            let el = document.getElementById(screenId);

            if (!el) {
                console.warn(`[UI] Screen element #${screenId} not found in DOM. Creating it dynamically.`);
                el = document.createElement('div');
                el.id = screenId;
                el.className = 'screen';
                el.style.display = 'none'; // Hide by default
                appContainer.appendChild(el);
            }
            
            elements[id] = el;
        });

        console.log("[UI] Engine Initialized. All screen elements are guaranteed to exist.");
    }

    /**
     * The definitive screen management function.
     * Aggressively hides all other screens and shows only the target screen.
     * @param {string} screenToShow - The key of the screen to show (e.g., 'loading', 'auth').
     */
    function showScreen(screenToShow) {
        if (!elements[screenToShow]) {
            console.error(`[UI] Cannot show screen: "${screenToShow}" is not a valid screen key.`);
            return;
        }

        console.log(`[UI] Activating screen: ${screenToShow}`);

        screenIds.forEach(id => {
            const el = elements[id];
            // This check is safe because init guarantees the element exists.
            
            if (id === screenToShow) {
                // --- FORCE SHOW ---
                el.style.display = 'flex';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
                el.style.zIndex = '1000';
                el.style.pointerEvents = 'auto';
            } else {
                // --- FORCE HIDE ---
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.zIndex = '-1';
                el.style.pointerEvents = 'none';
            }
        });
    }

    function showErrorState(message, errorDetails = '') {
        const errorScreen = elements.error;
        // This check is safe because init guarantees the element exists.
        const errorHtml = `
            <div class="auth-container">
                <div class="auth-card">
                    <h1 class="auth-title">Критическая ошибка</h1>
                    <p style="color: #a1a1aa; margin-top: 8px;">${S.ui.escapeHtml(message)}</p>
                    <br/>
                    <button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button>
                </div>
            </div>`;
        errorScreen.innerHTML = errorHtml;
        console.error(`[UI] Displaying error state: ${message}`, errorDetails);
        showScreen('error');
    }
    
    function showAuth() {
        showScreen('auth');
        // The auth form is now part of the static HTML.
        // We just need to ensure its event listeners are attached.
        if (S.auth && typeof S.auth.showAuthUI === 'function') {
            S.auth.showAuthUI(); // This function in auth.js should now only attach events.
        }
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
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
    };

})();