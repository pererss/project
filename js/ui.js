// SENTCOR v21.0 — Soft Error Handling UI
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
                el.style.display = 'none';
                appContainer.appendChild(el);
            }
            
            elements[id] = el;
        });

        console.log("[UI] Engine Initialized. All screen elements are guaranteed to exist.");
    }

    function showScreen(screenToShow) {
        if (!elements[screenToShow]) {
            console.error(`[UI] Cannot show screen: "${screenToShow}" is not a valid screen key.`);
            // As a fallback, try to show the error screen with a message
            showErrorState(`Attempted to show a non-existent screen: "${screenToShow}"`, { isFatal: true });
            return;
        }

        console.log(`[UI] Activating screen: ${screenToShow}`);

        screenIds.forEach(id => {
            const el = elements[id];
            if (id === screenToShow) {
                el.style.display = 'flex';
            } else {
                el.style.display = 'none';
            }
        });
    }

    /**
     * Displays an error state.
     * @param {string} message - The user-facing error message.
     * @param {object} [options] - Optional parameters.
     * @param {boolean} [options.isFatal=true] - If false, shows auth screen instead of a hard error.
     * @param {Error} [options.errorDetails] - The actual error object for logging.
     */
    function showErrorState(message, { isFatal = true, errorDetails = null } = {}) {
        console.error(`[UI] Displaying error state (isFatal: ${isFatal}): ${message}`, errorDetails);

        if (!isFatal) {
            // For non-fatal errors (like session check failures),
            // we just log it and show the login screen.
            console.warn("A non-fatal error occurred. Redirecting to auth screen.");
            showAuth();
            return;
        }

        const errorScreen = elements.error;
        if (!errorScreen) {
             document.body.innerHTML = `<div class="auth-container">...</div>`; // Fallback
             return;
        }

        const errorHtml = `
            <div class="auth-container">
                <div class="auth-card">
                    <h1 class="auth-title">Критическая ошибка</h1>
                    <p style="color: #a1a1aa; margin-top: 8px;">${escapeHtml(message)}</p>
                    <br/>
                    <button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button>
                </div>
            </div>`;
        errorScreen.innerHTML = errorHtml;
        showScreen('error');
    }
    
    function showAuth() {
        showScreen('auth');
        if (S.auth && typeof S.auth.showAuthUI === 'function') {
            S.auth.showAuthUI();
        } else {
            console.warn("[UI] S.auth.showAuthUI() not available to render form details.");
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
    
    // Auto-init
    onReady(init);

})();