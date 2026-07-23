// SENTCOR v22.0 — Preloader & Screen Management
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;

    const elements = {};
    const screenIds = ['loading', 'error', 'auth', 'main-app'];
    let loadingTimeout = null;

    function onReady(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    function init() {
        screenIds.forEach(id => {
            elements[id] = document.getElementById(`${id}-screen`);
        });
        elements.loadingStatusText = document.getElementById('loading-status-text');
        console.log("[UI] Engine Initialized.");
    }

    function showScreen(screenToShow) {
        if (!elements[screenToShow]) {
            console.error(`[UI] Cannot show screen: "${screenToShow}" is not valid.`);
            return showErrorState(`Попытка показать несуществующий экран: "${screenToShow}"`);
        }
        
        screenIds.forEach(id => {
            if (elements[id]) {
                elements[id].classList.remove('visible');
            }
        });
        
        elements[screenToShow].classList.add('visible');
        console.log(`[UI] Activating screen: ${screenToShow}`);
    }

    function showLoading(message = 'Загрузка...') {
        return new Promise(resolve => {
            if (elements.loadingStatusText) {
                elements.loadingStatusText.textContent = message;
            }
            elements.loading.classList.add('visible');

            // Safety timeout
            clearTimeout(loadingTimeout);
            loadingTimeout = setTimeout(() => {
                console.warn("[UI] Loading took too long. Forcing auth screen.");
                if (S.toast) S.toast.show("Загрузка заняла слишком много времени.", { type: 'warning' });
                hideLoading().then(showAuth);
            }, 5000);

            // The transition takes 300ms
            setTimeout(resolve, 300);
        });
    }

    function hideLoading() {
        return new Promise(resolve => {
            clearTimeout(loadingTimeout);
            if (elements.loading) {
                elements.loading.classList.remove('visible');
            }
            // Wait for fade-out transition to complete
            setTimeout(resolve, 300);
        });
    }

    function showErrorState(message, { isFatal = true, errorDetails = null } = {}) {
        console.error(`[UI] Displaying error state (isFatal: ${isFatal}): ${message}`, errorDetails);

        if (!isFatal) {
            console.warn("A non-fatal error occurred. Redirecting to auth screen.");
            showAuth();
            return;
        }

        const errorScreen = elements.error;
        if (!errorScreen) {
             document.body.innerHTML = `<div style="color:white;text-align:center;padding:2rem;">Критическая ошибка: ${escapeHtml(message)}</div>`;
             return;
        }

        errorScreen.innerHTML = `
            <div class="auth-card">
                <h1 class="auth-title">Критическая ошибка</h1>
                <p style="color: var(--text-secondary); margin-top: 8px;">${escapeHtml(message)}</p>
                <br/>
                <button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button>
            </div>`;
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
        return str.replace(/[&<>\"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[m]));
    }

    function getSkeletonHTML(type, count = 1) {
        let html = '';
        const template = type === 'avatar' 
            ? '<div class="skeleton skeleton-avatar"></div>'
            : '<div class="skeleton skeleton-text"></div>';
        for (let i = 0; i < count; i++) {
            html += template;
        }
        return html;
    }

    S.ui = {
        init,
        onReady,
        showScreen,
        showLoading,
        hideLoading,
        showErrorState,
        showAuth,
        showMainApp: () => showScreen('main-app'),
        escapeHtml,
        getSkeletonHTML,
    };
    
    onReady(init);

})();