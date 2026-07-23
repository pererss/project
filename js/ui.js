// SENTCOR v19.0 — Ultimate Screen Manager
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
     * Initializes the UI by caching references to pre-existing DOM elements.
     * The HTML structure is now defined declaratively in index.html.
     */
    function init() {
        let allFound = true;
        screenIds.forEach(id => {
            const el = document.getElementById(`${id}-screen`);
            if (el) {
                elements[id] = el;
            } else {
                console.error(`[UI] Critical init failure: Screen element #${id}-screen not found in DOM.`);
                allFound = false;
            }
        });

        if (allFound) {
            console.log("[UI] Engine Initialized & all screen elements cached.");
        } else {
            document.body.innerHTML = '<div style="color:white;text-align:center;padding-top:20%;">UI Initialization Failed: A screen element is missing.</div>';
        }
    }

    /**
     * The definitive screen management function.
     * Aggressively hides all other screens and shows only the target screen.
     * @param {string} screenToShow - The key of the screen to show (e.g., 'loading', 'auth').
     */
    function showScreen(screenToShow) {
        if (!elements[screenToShow]) {
            console.error(`[UI] Cannot show screen: "${screenToShow}" does not exist or was not cached.`);
            return;
        }

        console.log(`[UI] Activating screen: ${screenToShow}`);

        screenIds.forEach(id => {
            const el = elements[id];
            if (!el) return;

            if (id === screenToShow) {
                // --- FORCE SHOW ---
                el.style.display = 'flex';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
                el.style.zIndex = '1000'; // High z-index to ensure it's on top
                el.style.pointerEvents = 'auto';
            } else {
                // --- FORCE HIDE ---
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.zIndex = '-1'; // Move it behind
                el.style.pointerEvents = 'none';
            }
        });
    }

    function showErrorState(message, errorDetails = '') {
        const errorScreen = elements.error;
        if (errorScreen) {
            const errorHtml = `
                <div class="auth-container">
                    <div class="auth-card">
                        <h1 class="auth-title">Критическая ошибка</h1>
                        <p class="text-muted">${S.ui.escapeHtml(message)}</p>
                        <button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button>
                    </div>
                </div>`;
            errorScreen.innerHTML = errorHtml;
            console.error(`[UI] Displaying error state: ${message}`, errorDetails);
            showScreen('error');
        }
    }
    
    function showAuth() {
        // Since the auth form is now in index.html, this just needs to switch the screen.
        // The event listeners will be attached by auth.js.
        showScreen('auth');
        
        // Re-trigger event binding in auth.js to be safe
        if (S.auth && typeof S.auth.showAuthUI === 'function') {
            S.auth.showAuthUI();
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