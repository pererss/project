// ===============================================================
// SentCor UI Module v5.0 - Defensive & Robust
// ===============================================================

// Правило №1: Гарантия глобального пространства имен
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};
window.S.auth = window.S.auth || {};
window.S.app = window.S.app || {};

(function(S) {
    "use strict";

    // ===============================================================
    // 1. Утилиты, экспортируемые в S.ui и S.utils
    // ===============================================================

    /**
     * Безопасно экранирует HTML-строку.
     * @param {string | null | undefined} str Входная строка.
     * @returns {string} Экранированная строка или пустая строка.
     */
    const escapeHtml = function(str) {
        if (str === null || typeof str === 'undefined') {
            return '';
        }
        return String(str).replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    };

    /**
     * Создает HTML для запасного аватара (CSS-круг с буквой).
     * @param {string} username Имя пользователя.
     * @returns {string} HTML-разметка для запасного аватара.
     */
    const createFallbackAvatar = function(username) {
        const initial = (username || 'U')[0].toUpperCase();
        return `<div class="user-avatar-initials">${escapeHtml(initial)}</div>`;
    };

    /**
     * Создает HTML для аватара пользователя.
     * @param {string} username Имя пользователя.
     * @param {string | null} avatarUrl URL аватара.
     * @returns {string} HTML-разметка для аватара.
     */
    const createAvatarHTML = function(username, avatarUrl) {
        const safeUsername = escapeHtml(username);
        if (avatarUrl) {
            const safeAvatarUrl = escapeHtml(avatarUrl);
            // onerror вызывает глобально доступную функцию для замены
            return `<img src="${safeAvatarUrl}" class="user-avatar-img" alt="${safeUsername}" onerror="this.replaceWith(window.S.ui.createFallbackAvatar('${safeUsername.replace(/'/g, "\\'")}'))">`;
        }
        return createFallbackAvatar(safeUsername);
    };

    // ===============================================================
    // 2. Основной объект UI с управлением состоянием
    // ===============================================================

    const ui = {
        loadingTimeout: null,
        elements: {},

        /**
         * Кэширует основные элементы DOM для производительности.
         */
        init() {
            this.elements.loadingScreen = document.getElementById('loading-screen');
            this.elements.loadingStatusText = document.getElementById('loading-status-text');
            this.elements.mainAppScreen = document.getElementById('main-app-screen');
            this.elements.authScreen = document.getElementById('auth-screen');
            console.log('[UI] Module initialized and elements cached.');
        },

        /**
         * Показывает экран загрузки с сообщением и страховочным таймером.
         * @param {string} [text='Загрузка...'] Сообщение для отображения.
         */
        showLoading(text = 'Загрузка...') {
            if (!this.elements.loadingScreen) this.init();
            
            if (this.elements.loadingStatusText) {
                this.elements.loadingStatusText.textContent = text;
            }

            this.elements.loadingScreen.style.display = 'flex';
            // Форсируем reflow для корректной анимации
            this.elements.loadingScreen.offsetHeight; 
            this.elements.loadingScreen.classList.add('visible');

            // Правило №2: Гарантия от бесконечной загрузки
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
            }
            this.loadingTimeout = setTimeout(() => {
                console.warn('[UI] Loading timeout (4s) hit. Forcing hideLoading.');
                this.hideLoading();
            }, 4000);
        },

        /**
         * Скрывает экран загрузки и сбрасывает таймер.
         */
        hideLoading() {
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            if (!this.elements.loadingScreen) return;

            this.elements.loadingScreen.classList.remove('visible');
            // Даем время на завершение анимации opacity перед установкой display: none
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
            }, 300);
        },

        /**
         * Показывает основной интерфейс приложения.
         */
        showMainApp() {
            if (!this.elements.mainAppScreen) this.init();
            this.elements.mainAppScreen.style.display = 'block';
            this.elements.mainAppScreen.offsetHeight;
            this.elements.mainAppScreen.classList.add('visible');
        },

        /**
         * Показывает экран авторизации.
         */
        showAuthScreen() {
            if (!this.elements.authScreen) this.init();
            this.elements.authScreen.style.display = 'flex';
            this.elements.authScreen.offsetHeight;
            this.elements.authScreen.classList.add('visible');
        },
        
        /**
         * Отображает состояние ошибки в UI.
         * @param {string} message Сообщение об ошибке.
         */
        showErrorState(message) {
            this.hideLoading();
            const authScreen = document.getElementById('auth-screen');
            if (authScreen) {
                authScreen.innerHTML = `
                    <div class="auth-card">
                        <h1 class="auth-title" style="color: var(--error-color);">Критическая ошибка</h1>
                        <p class="auth-subtitle">${escapeHtml(message)}</p>
                    </div>
                `;
                authScreen.classList.add('visible');
            }
        },

        /**
         * Генерирует HTML для пустого состояния списка друзей.
         * @returns {string} HTML-разметка.
         */
        getEmptyFriendsStateHTML() {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fa-solid fa-user-group"></i></div>
                    <h3 class="empty-state-title">У вас пока нет друзей</h3>
                    <p class="empty-state-text">Перейдите во вкладку 'Добавить в друзья', чтобы найти пользователей по логину.</p>
                </div>
            `;
        }
    };

    // ===============================================================
    // 3. Экспорт и инициализация
    // ===============================================================

    // Экспортируем утилиты в оба пространства имен
    S.utils.escapeHtml = escapeHtml;
    S.ui.escapeHtml = escapeHtml;
    S.ui.createAvatarHTML = createAvatarHTML;
    S.ui.createFallbackAvatar = createFallbackAvatar; // Делаем доступной глобально

    // Сливаем основной объект ui с S.ui
    Object.assign(S.ui, ui);

    // Инициализируем кэширование элементов после загрузки DOM
    document.addEventListener('DOMContentLoaded', () => {
        try {
            S.ui.init();
        } catch (error) {
            console.error('[UI] Failed to initialize on DOMContentLoaded:', error);
        }
    });

})(window.S);