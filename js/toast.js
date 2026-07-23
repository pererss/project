// ===============================================================
// SentCor Toast Module v5.0 - Defensive & Robust
// ===============================================================

// Правило №1: Гарантия глобального пространства имен
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};
window.S.auth = window.S.auth || {};
window.S.app = window.S.app || {};

(function(S) {
    "use strict";

    const toast = {
        container: null,

        /**
         * Инициализирует контейнер для уведомлений.
         */
        init() {
            if (this.container) return;
            this.container = document.getElementById('toast-container');
            if (!this.container) {
                console.warn('[Toast] #toast-container not found. Creating one.');
                this.container = document.createElement('div');
                this.container.id = 'toast-container';
                document.body.appendChild(this.container);
            }
        },

        /**
         * Показывает уведомление.
         * @param {string} message - Сообщение для отображения.
         * @param {object} [options={}] - Опции.
         * @param {string} [options.type='info'] - Тип ('info', 'success', 'error').
         * @param {number} [options.duration=3000] - Длительность в мс.
         */
        show(message, options = {}) {
            this.init();
            
            const { type = 'info', duration = 3000 } = options;

            // Правило №4: Безопасный фоллбэк для escapeHtml
            const safeEscape = S.utils.escapeHtml || S.ui.escapeHtml || ((s) => s || '');
            
            const toastElement = document.createElement('div');
            toastElement.className = `toast toast-${type}`;
            toastElement.innerHTML = safeEscape(message);

            this.container.appendChild(toastElement);

            // Таймер на удаление
            setTimeout(() => {
                toastElement.classList.add('fade-out');
                // Удаляем элемент из DOM после завершения анимации
                toastElement.addEventListener('animationend', () => {
                    toastElement.remove();
                });
            }, duration);
        }
    };

    // Экспорт публичных методов
    S.toast = toast;

    // Ранняя инициализация
    document.addEventListener('DOMContentLoaded', () => {
        try {
            S.toast.init();
        } catch (error) {
            console.error('[Toast] Failed to initialize on DOMContentLoaded:', error);
        }
    });

})(window.S);