// SENTCOR v13 — High-Performance UI & Rendering Engine
(function() {
    "use strict";

    window.SENTCOR = window.SENTCOR || {};
    const S = window.SENTCOR;
    const C = window.SENTCOR_CONFIG;
    const $ = s => document.querySelector(s);

    let lastMessageAuthorId = null;
    let lastMessageTimestamp = null;

    function esc(str) {
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    function safeToast(message, type = "info", duration = 5000) {
        if (S.toast && typeof S.toast.show === "function") {
            S.toast.show(message, type, duration);
        } else {
            console.warn(`Toast not available. Message: ${message}`);
        }
    }

    function init() {
        console.log("SENTCOR UI Initialized");
    }

    function showLoadingScreen() {
        const app = $("#app");
        if (!app) return;
        app.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div></div>`;
    }

    function showErrorState(message) {
        const app = $("#app");
        if (!app) return;
        app.innerHTML = `<div class="error-screen"><h2>Критическая ошибка</h2><p>${esc(message)}</p><button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button></div>`;
    }

    function showAuth() {
        const app = $("#app");
        if (!app) return;
        app.innerHTML = `<div class="auth-screen"><div class="auth-logo">SENTCOR</div><div class="auth-subtitle">Игровой мессенджер</div><div class="auth-card" id="auth-card"></div></div>`;
        renderLoginForm();
    }
    
    function renderLoginForm() { /* ... unchanged ... */ }
    function renderRegisterForm() { /* ... unchanged ... */ }
    async function handleLogin() { /* ... unchanged ... */ }
    async function handleRegister() { /* ... unchanged ... */ }

    function showApp() {
        const app = $("#app");
        if (!app) return;
        app.innerHTML = `<!-- Main app structure from previous versions -->`; // Placeholder for brevity
        // ... (full app structure here)
        updateFooter();
        bindSidebar();
        S.servers.loadSidebarServers();
        S.friends.loadAll().then(() => showHomePage());
    }

    function createMessageElement(msg, profileCache, isDM = false) {
        const author = profileCache[msg.sender_id];
        if (!author) {
            console.warn("Author not found in cache for message:", msg.id);
            return document.createComment(`Orphaned message ${msg.id}`);
        }

        const msgDate = new Date(msg.created_at);
        const isCompact = 
            !msg.sending &&
            author.id === lastMessageAuthorId && 
            (msgDate - lastMessageTimestamp) < (1000 * 60 * 5); // 5 minutes

        const msgEl = document.createElement('div');
        msgEl.className = `message ${isCompact ? 'compact' : ''}`;
        msgEl.id = `msg-${msg.id}`;
        msgEl.dataset.authorId = author.id;

        const avatarHTML = isCompact ? '' : 
            `<div class="avatar">${author.avatar_url 
                ? `<img src="${esc(author.avatar_url)}" alt="avatar">` 
                : (author.display_name || author.username).charAt(0).toUpperCase()}
            </div>`;

        const headerHTML = isCompact ? '' : 
            `<div class="message-header">
                <span class="message-author">${esc(author.display_name || author.username)}</span>
                <span class="message-time">${msgDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>`;

        msgEl.innerHTML = `
            ${avatarHTML}
            <div class="message-body">
                ${headerHTML}
                <div class="message-content">${esc(msg.content)}</div>
                <div class="message-status"></div>
            </div>
        `;

        if (msg.sending) {
            msgEl.classList.add('sending');
            msgEl.querySelector('.message-status').innerHTML = `<span class="message-status-sending" title="Отправка..."><i class="fa-solid fa-clock"></i></span>`;
        }

        lastMessageAuthorId = author.id;
        lastMessageTimestamp = msgDate;

        return msgEl;
    }

    function appendMessage(msg, profileCache, isDM = false) {
        const chatContainer = $('#chat-messages');
        if (!chatContainer) return;
        
        // If the first element is the empty state, remove it
        const emptyState = chatContainer.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const msgEl = createMessageElement(msg, profileCache, isDM);
        chatContainer.appendChild(msgEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    function updateMessageStatus(optimisticId, finalId, status, errorMessage = '') {
        const msgEl = document.getElementById(`msg-${optimisticId}`);
        if (!msgEl) return;

        msgEl.id = `msg-${finalId}`;
        msgEl.classList.remove('sending');
        
        const statusSendingEl = msgEl.querySelector('.message-status-sending');
        if (statusSendingEl) statusSendingEl.remove();

        if (status === 'error') {
            msgEl.classList.add('error');
            const statusContainer = msgEl.querySelector('.message-status');
            statusContainer.innerHTML = `<span class="message-status-error" title="${esc(errorMessage)}"><i class="fa-solid fa-circle-exclamation"></i></span>`;
        }
    }

    function resetCompact() {
        lastMessageAuthorId = null;
        lastMessageTimestamp = null;
    }
    
    // ... other UI functions (showModal, confirm, etc.) unchanged ...
    // ... bindSidebar, updateFooter, etc. unchanged ...

    S.ui = {
        init,
        showLoadingScreen,
        showErrorState,
        showAuth,
        showApp,
        createMessageElement,
        appendMessage,
        updateMessageStatus,
        resetCompact,
        // ... other functions
    };

})();