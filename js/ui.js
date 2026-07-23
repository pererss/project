// SENTCOR v4.3 — Гарантия escapeHtml и отказоустойчивость
(function(window) {
    "use strict";

    // 1. Гарантируем существование глобальных пространств имен
    window.S = window.S || {};
    window.S.ui = window.S.ui || {};
    window.S.utils = window.S.utils || {};

    // 2. Определяем escapeHtml один раз и в одном месте
    const escapeHtml = function(str) {
        if (str === null || typeof str === 'undefined') return '';
        return String(str).replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    };

    // 3. Присваиваем функцию в оба пространства имен для универсального доступа
    window.S.ui.escapeHtml = escapeHtml;
    window.S.utils.escapeHtml = escapeHtml;

    // 4. Остальной UI-код
    const ui = {
        loadingTimeout: null,
        loadingScreen: null,
        mainAppScreen: null,
        authScreen: null,

        init() {
            this.loadingScreen = document.getElementById('loading-screen');
            this.mainAppScreen = document.getElementById('main-app-screen');
            this.authScreen = document.getElementById('auth-screen');
        },

        showLoading(message = 'Загрузка...') {
            if (!this.loadingScreen) this.init();
            
            const statusText = this.loadingScreen.querySelector('#loading-status-text');
            if (statusText) statusText.textContent = message;

            this.loadingScreen.style.display = 'flex';
            this.loadingScreen.offsetHeight;
            this.loadingScreen.classList.add('visible');

            if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
            this.loadingTimeout = setTimeout(() => {
                console.warn('[UI] Сработал таймаут загрузки. Принудительно скрываем лоадер.');
                this.hideLoading();
            }, 4000);
        },

        hideLoading() {
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            if (!this.loadingScreen) return;

            this.loadingScreen.classList.remove('visible');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 300);
        },

        showMainApp() {
            if (!this.mainAppScreen) return;
            this.mainAppScreen.style.display = 'block';
            this.mainAppScreen.offsetHeight;
            this.mainAppScreen.classList.add('visible');
        },

        showAuthScreen() {
            if (!this.authScreen) return;
            this.authScreen.style.display = 'flex';
            this.authScreen.offsetHeight;
            this.authScreen.classList.add('visible');
        },

        createAvatarHTML(username, avatarUrl, size = '36px') {
            const name = username || 'User';
            const sanitizedName = name.replace(/'/g, "\\'");

            if (avatarUrl) {
                return `<img src="${S.ui.escapeHtml(avatarUrl)}" 
                             alt="${S.ui.escapeHtml(sanitizedName)}'s Avatar" 
                             style="width:${size}; height:${size};" 
                             class="user-avatar-image"
                             onerror="this.outerHTML = S.ui.createAvatarHTML('${sanitizedName}', null, '${size}');">`;
            }
            
            const initial = name ? S.ui.escapeHtml(name[0].toUpperCase()) : 'U';
            const fontSize = `calc(${size} / 2.2)`;
            return `<div class="user-avatar-initials" 
                         style="width:${size}; height:${size}; font-size:${fontSize};">
                        ${initial}
                    </div>`;
        },

        getEmptyFriendsStateHTML() {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fa-solid fa-user-plus"></i></div>
                    <h3 class="empty-state-title">У вас пока нет друзей</h3>
                    <p class="empty-state-text">Перейдите во вкладку 'Добавить в друзья', чтобы найти пользователей.</p>
                </div>
            `;
        }
    };

    // Сливаем новый функционал с уже существующим в S.ui
    Object.assign(S.ui, ui);
    document.addEventListener('DOMContentLoaded', () => S.ui.init());

})(window);