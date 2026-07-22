// SENTCOR v13.1 — High-Performance UI & Rendering Engine
(function() {
    "use strict";

    window.SENTCOR = window.SENTCOR || {};
    const S = window.SENTCOR;
    const C = window.SENTCOR_CONFIG;
    const $ = s => document.querySelector(s);

    let lastMessageAuthorId = null;
    let lastMessageTimestamp = null;

    function esc(str) {
        if (typeof str !== 'string') return '';
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
        // Bind core UI events here if needed
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
        app.innerHTML = `<div class="auth-container"><div class="auth-logo">SENTCOR</div><div class="auth-card" id="auth-card"></div></div>`;
        renderLoginForm();
    }

    function renderLoginForm() {
        $('#auth-card').innerHTML = `
            <h3>Вход</h3>
            <form id="login-form">
                <input type="email" id="login-email" placeholder="Email" required>
                <input type="password" id="login-password" placeholder="Пароль" required>
                <button type="submit" class="btn btn-primary">Войти</button>
            </form>
            <p>Нет аккаунта? <a href="#" id="show-register">Регистрация</a></p>
        `;
        $('#show-register').addEventListener('click', (e) => { e.preventDefault(); renderRegisterForm(); });
        $('#login-form').addEventListener('submit', handleLogin);
    }

    function renderRegisterForm() {
        $('#auth-card').innerHTML = `
            <h3>Регистрация</h3>
            <form id="register-form">
                <input type="text" id="register-username" placeholder="Имя пользователя" required>
                <input type="email" id="register-email" placeholder="Email" required>
                <input type="password" id="register-password" placeholder="Пароль" required>
                <button type="submit" class="btn btn-primary">Создать аккаунт</button>
            </form>
            <p>Уже есть аккаунт? <a href="#" id="show-login">Войти</a></p>
        `;
        $('#show-login').addEventListener('click', (e) => { e.preventDefault(); renderLoginForm(); });
        $('#register-form').addEventListener('submit', handleRegister);
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = $('#login-email').value;
        const password = $('#login-password').value;
        safeToast("Выполняем вход...", "info", 2000);
        const { error } = await S.auth.signIn(email, password);
        if (error) {
            safeToast(`Ошибка входа: ${error}`, "error");
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const email = $('#register-email').value;
        const password = $('#register-password').value;
        const username = $('#register-username').value;
        safeToast("Создаем аккаунт...", "info", 2000);
        const { error } = await S.auth.signUp(email, password, username);
        if (error) {
            safeToast(`Ошибка регистрации: ${error}`, "error");
        } else {
            safeToast("Аккаунт создан! Подтвердите email.", "success");
            renderLoginForm();
        }
    }

    function showApp() {
        const app = $("#app");
        if (!app) return;
        app.innerHTML = `
            <div class="sidebar"></div>
            <div class="main-content">
                <header class="main-header"></header>
                <div id="chat-messages" class="chat-messages-container"></div>
                <footer class="main-footer"></footer>
            </div>
        `;
        if (typeof this.updateFooter === 'function') {
            this.updateFooter();
        }
        // Further initialization
    }
    
    function updateFooter() {
        const footer = $('.main-footer');
        if (!footer) return;
        const profile = S.profile;
        if (!profile) {
            footer.innerHTML = '';
            return;
        }
        footer.innerHTML = `
            <div class="footer-profile">
                <div class="avatar small">${profile.avatar_url ? `<img src="${esc(profile.avatar_url)}">` : (profile.display_name || profile.username).charAt(0)}</div>
                <div class="user-info">
                    <span class="username">${esc(profile.display_name || profile.username)}</span>
                    <span class="status ${esc(profile.status)}">${esc(profile.status)}</span>
                </div>
            </div>
            <button id="logout-btn" class="btn btn-danger">Выйти</button>
        `;
        $('#logout-btn').addEventListener('click', () => S.auth.signOut());
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

        if (!isCompact) {
            lastMessageAuthorId = author.id;
            lastMessageTimestamp = msgDate;
        }

        return msgEl;
    }

    function appendMessage(msg, profileCache, isDM = false) {
        const chatContainer = $('#chat-messages');
        if (!chatContainer) return;

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

    S.ui = {
        init,
        showLoadingScreen,
        showErrorState,
        showAuth,
        showApp,
        updateFooter,
        createMessageElement,
        appendMessage,
        updateMessageStatus,
        resetCompact,
    };

})();