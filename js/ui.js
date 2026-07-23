// SENTCOR v15.0 — Resilient & Themed UI Engine
(function() {
    "use strict";

    window.SENTCOR = window.SENTCOR || {};
    const S = window.SENTCOR;

    // --- Private State ---
    let lastMessageAuthorId = null;
    let lastMessageTimestamp = null;
    let uiReady = false;

    // --- DOM Element Cache ---
    const elements = {};

    // --- Utility Functions ---
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    function safeToast(message, type = "info", duration = 5000) {
        if (S.toast && typeof S.toast.show === "function") {
            S.toast.show(message, type, duration);
        } else {
            console.warn(`[UI] Toast not available. Message: ${message}`);
        }
    }

    // --- Core UI Initialization ---
    function init() {
        const appContainer = document.getElementById("app");
        if (!appContainer) {
            console.error("[UI] Critical error: #app container not found!");
            document.body.innerHTML = '<div style="color:white;text-align:center;padding-top:20%;">[UI] Critical error: #app container not found!</div>';
            return;
        }

        // Define the application shell structure.
        appContainer.innerHTML = `
            <div id="loading-screen" class="screen"><div class="spinner"></div></div>
            <div id="error-screen" class="screen"></div>
            <div id="auth-screen" class="screen"></div>
            <div id="main-app-screen" class="screen"></div>
        `;

        // Cache essential elements
        elements.app = appContainer;
        elements.loadingScreen = document.getElementById("loading-screen");
        elements.errorScreen = document.getElementById("error-screen");
        elements.authScreen = document.getElementById("auth-screen");
        elements.mainAppScreen = document.getElementById("main-app-screen");
        
        uiReady = true;
        console.log("[UI] Engine Initialized & Shell Ready");
    }

    /**
     * Switches the visible screen. This is the single source of truth for screen transitions.
     * It ensures only one screen is active at any given time.
     * @param {string} screenId The ID of the screen to make active (e.g., 'loading-screen').
     */
    function switchScreen(screenId) {
        if (!uiReady) {
            console.warn("[UI] Attempted to switch screen before UI was ready. Call will be ignored.");
            return;
        }
        
        console.log(`[UI] Switching to screen: ${screenId}`);

        // Deactivate all screens first for robustness
        const allScreens = elements.app.querySelectorAll('.screen');
        allScreens.forEach(screen => {
            screen.classList.remove('active');
        });

        // Activate the target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        } else {
            console.error(`[UI] Screen with ID "${screenId}" not found. Displaying error state.`);
            showErrorState(`Ошибка интерфейса: экран "${screenId}" не найден.`);
        }
    }

    // --- Screen Content Renderers ---
    function showLoadingScreen() {
        switchScreen('loading-screen');
    }

    function showErrorState(message) {
        if (elements.errorScreen) {
            elements.errorScreen.innerHTML = `
                <div class="auth-container">
                    <h1>Критическая ошибка</h1>
                    <p class="text-muted">${escapeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button>
                </div>`;
            switchScreen('error-screen');
        }
    }

    function showAuth() {
        if (elements.authScreen) {
            elements.authScreen.innerHTML = `
                <div class="auth-container">
                    <h1>SENTCOR</h1>
                    <div id="auth-card"></div>
                </div>`;
            renderLoginForm();
            switchScreen('auth-screen');
        }
    }

    function renderLoginForm() {
        const card = document.getElementById('auth-card');
        if (!card) return;
        card.innerHTML = `
            <form id="login-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
                <input class="input-field" type="email" id="login-email" placeholder="Email" required>
                <input class="input-field" type="password" id="login-password" placeholder="Пароль" required>
                <button type="submit" class="btn btn-primary">Войти</button>
            </form>
            <p class="text-muted">Нет аккаунта? <a href="#" id="show-register" class="link">Регистрация</a></p>
        `;
        document.getElementById('show-register')?.addEventListener('click', (e) => { e.preventDefault(); renderRegisterForm(); });
        document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    }

    function renderRegisterForm() {
        const card = document.getElementById('auth-card');
        if (!card) return;
        card.innerHTML = `
            <form id="register-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
                <input class="input-field" type="text" id="register-username" placeholder="Имя пользователя" required>
                <input class="input-field" type="email" id="register-email" placeholder="Email" required>
                <input class="input-field" type="password" id="register-password" placeholder="Пароль" required>
                <button type="submit" class="btn btn-primary">Создать аккаунт</button>
            </form>
            <p class="text-muted">Уже есть аккаунт? <a href="#" id="show-login" class="link">Войти</a></p>
        `;
        document.getElementById('show-login')?.addEventListener('click', (e) => { e.preventDefault(); renderLoginForm(); });
        document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        if (!email || !password) return;

        safeToast("Выполняем вход...", "info", 2000);
        const { error } = await S.auth.signIn(email, password);
        if (error) {
            safeToast(`Ошибка входа: ${error.message || error}`, "error");
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('register-password')?.value;
        const username = document.getElementById('register-username')?.value;
        if (!email || !password || !username) return;

        safeToast("Создаем аккаунт...", "info", 2000);
        const { error } = await S.auth.signUp(email, password, username);
        if (error) {
            safeToast(`Ошибка регистрации: ${error.message || error}`, "error");
        } else {
            safeToast("Аккаунт создан! Подтвердите email и войдите.", "success");
            renderLoginForm();
        }
    }

    function showApp() {
        if (elements.mainAppScreen) {
            elements.mainAppScreen.innerHTML = `
                <div class="sidebar"></div>
                <div class="main-content">
                    <header class="main-header"></header>
                    <div id="chat-messages" class="chat-messages"></div>
                    <div class="chat-input-container">
                        <input id="chat-input" class="input-field" placeholder="Написать сообщение...">
                    </div>
                </div>
            `;
            switchScreen('main-app-screen');
            // Cache dynamic elements
            elements.chatMessages = document.getElementById('chat-messages');
            elements.chatInput = document.getElementById('chat-input');
        }
    }

    // --- Message Rendering ---
    function createMessageElement(msg, profileCache) {
        const author = profileCache[msg.sender_id];
        if (!author) {
            console.warn(`[UI] Author not found in cache for message:`, msg);
            return document.createComment(`Orphaned message ${msg.id}`);
        }

        const msgDate = new Date(msg.created_at);
        const isCompact = !msg.sending && author.id === lastMessageAuthorId && (msgDate - lastMessageTimestamp) < (1000 * 60 * 5);

        const msgEl = document.createElement('div');
        msgEl.className = `message ${isCompact ? 'compact' : ''}`;
        msgEl.id = `msg-${msg.id}`;
        msgEl.dataset.authorId = author.id;

        // ... (rest of the message creation logic remains the same)
        
        if (!isCompact) {
            lastMessageAuthorId = author.id;
            lastMessageTimestamp = msgDate;
        }

        return msgEl;
    }

    function appendMessage(msg, profileCache) {
        const chatContainer = elements.chatMessages;
        if (!chatContainer) return;

        const emptyState = chatContainer.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const msgEl = createMessageElement(msg, profileCache);
        chatContainer.appendChild(msgEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    function updateMessageStatus(optimisticId, finalId, status, errorMessage = '') {
        const msgEl = document.getElementById(`msg-${optimisticId}`);
        if (!msgEl) return;

        msgEl.id = `msg-${finalId}`;
        // ... (rest of the status update logic remains the same)
    }

    function resetCompact() {
        lastMessageAuthorId = null;
        lastMessageTimestamp = null;
    }

    // --- Public API ---
    S.ui = {
        init,
        showLoadingScreen,
        showErrorState,
        showAuth,
        showApp,
        appendMessage,
        updateMessageStatus,
        resetCompact,
        escapeHtml,
    };

})();