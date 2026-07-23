// SENTCOR v4.3 — Безопасный вызов toast
(function(window) {
    "use strict";

    window.S = window.S || {};

    const toast = {
        init: function() {
            if (document.getElementById("toast-container")) return;
            const container = document.createElement("div");
            container.id = "toast-container";
            document.body.appendChild(container);
            console.log("[Toast] Модуль инициализирован.");
        },

        show: function(message, options = {}) {
            const { type = 'info', duration = 3000 } = options;
            
            // Безопасная функция-обертка для escapeHtml
            const safeEscape = window.S?.ui?.escapeHtml || window.S?.utils?.escapeHtml || ((s) => s || '');
            
            this.showCustom({
                content: safeEscape(message),
                type: type,
                duration: duration,
                position: 'top-center'
            });
        },

        showCustom: function(options) {
            const {
                content,
                type = 'info',
                duration = 3000,
                position = 'top-center',
                onClick = null
            } = options;

            const container = document.getElementById("toast-container");
            if (!container) {
                console.error("[Toast] Контейнер не найден. Вызов init() был пропущен?");
                // Попробуем инициализировать и повторить
                this.init();
                setTimeout(() => this.showCustom(options), 50);
                return;
            }
            
            let positionContainer = document.getElementById(`toast-container-${position}`);
            if (!positionContainer) {
                positionContainer = document.createElement("div");
                positionContainer.id = `toast-container-${position}`;
                positionContainer.className = `toast-position-container ${position}`;
                container.appendChild(positionContainer);
            }

            const toastElement = document.createElement("div");
            toastElement.className = `toast ${type}`;
            toastElement.innerHTML = content;

            if (onClick && typeof onClick === 'function') {
                toastElement.classList.add('clickable');
                toastElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onClick();
                    this.remove(toastElement);
                });
            }
            
            positionContainer.prepend(toastElement);

            if (duration > 0) {
                const timer = setTimeout(() => {
                    this.remove(toastElement);
                }, duration);
                toastElement.dataset.timer = timer;
            }
            
            return toastElement;
        },

        remove: function(toastElement) {
            if (!toastElement || !toastElement.parentNode) return;
            
            clearTimeout(toastElement.dataset.timer);
            toastElement.classList.add("removing");
            
            const onAnimationEnd = () => {
                toastElement.removeEventListener('animationend', onAnimationEnd);
                if (toastElement.parentNode) {
                    toastElement.remove();
                    const parent = toastElement.parentNode;
                    if (parent && parent.classList.contains('toast-position-container') && parent.children.length === 0) {
                        parent.remove();
                    }
                }
            };
            toastElement.addEventListener('animationend', onAnimationEnd);
        }
    };

    S.toast = toast;
    document.addEventListener('DOMContentLoaded', () => S.toast.init());

})(window);