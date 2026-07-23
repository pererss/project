// SENTCOR v23.0 — UI Refactor & Style Overhaul
(function() {
    "use strict";

    // Ensure global namespace exists
    window.S = window.SENTCOR = window.S || {};
    window.S.ui = window.S.ui || {};

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
            if (!elements.loading) init(); // Lazy init
            
            if (elements.loadingStatusText) {
                elements.loadingStatusText.textContent = message;
            }
            if(elements.loading) {
                elements.loading.style.display = 'flex';
                setTimeout(() => elements.loading.classList.add('visible'), 10);
            }

            clearTimeout(loadingTimeout);
            loadingTimeout = setTimeout(() => {
                console.warn("[UI] Loading took too long. Forcing auth screen.");
                if (S.toast) S.toast.show("Загрузка заняла слишком много времени.", { type: 'warning' });
                hideLoading().then(showAuth);
            }, 8000); // Increased timeout

            setTimeout(resolve, 300);
        });
    }

    function hideLoading() {
        return new Promise(resolve => {
            clearTimeout(loadingTimeout);
            if (elements.loading) {
                elements.loading.classList.remove('visible');
                setTimeout(() => {
                    elements.loading.style.display = 'none';
                    resolve();
                }, 300);
            } else {
                resolve();
            }
        });
    }

    function showErrorState(message, { isFatal = true, errorDetails = null } = {}) {
        console.error(`[UI] Displaying error state (isFatal: ${isFatal}): ${message}`, errorDetails);
        hideLoading();

        if (!isFatal) {
            console.warn("A non-fatal error occurred. Redirecting to auth screen.");
            if (S.toast) S.toast.show(message, { type: 'error' });
            showAuth();
            return;
        }

        const errorScreen = elements.error;
        if (!errorScreen) {
             document.body.innerHTML = `<div style="color:white;text-align:center;padding:2rem;background:#0C0C0E;height:100vh;display:flex;align-items:center;justify-content:center;">Критическая ошибка: ${escapeHtml(message)}</div>`;
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
        const baseClass = 'skeleton';
        const typeClass = type === 'friend' 
            ? 'skeleton-friend-item'
            : (type === 'avatar' ? 'skeleton-avatar' : 'skeleton-text');

        for (let i = 0; i < count; i++) {
            if (type === 'friend') {
                html += `
                    <div class="${baseClass} ${typeClass}">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-friend-info">
                            <div class="skeleton-text" style="width: 60%;"></div>
                            <div class="skeleton-text" style="width: 80%;"></div>
                        </div>
                    </div>
                `;
            } else {
                 html += `<div class="${baseClass} ${typeClass}"></div>`;
            }
        }
        return html;
    }

    // Explicitly define the public API on the S.ui object
    Object.assign(S.ui, {
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
    });
    
    onReady(init);

})();