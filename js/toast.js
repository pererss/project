// SENTCOR v3.0 — Advanced & Customizable Toast Module
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};

    const toast = {
        init: function() {
            if (!document.getElementById("toast-container")) {
                const container = document.createElement("div");
                container.id = "toast-container";
                document.body.appendChild(container);
            }
            console.log("[Toast] Module Initialized.");
        },

        /**
         * Shows a standard text-based toast notification.
         * @param {string} message - The message to display.
         * @param {'info'|'success'|'error'|'warning'} [type='info'] - The type of toast.
         * @param {number} [duration=5000] - The duration in milliseconds.
         */
        show: function(message, type = "info", duration = 5000) {
            this.showCustom({
                content: S.ui.escapeHtml(message),
                type: type,
                duration: duration,
                position: 'top-center'
            });
        },

        /**
         * Shows a fully customizable toast notification.
         * @param {object} options - The options for the toast.
         * @param {string} options.content - HTML content for the toast.
         * @param {string} [options.type='info'] - A class to apply for styling.
         * @param {number} [options.duration=5000] - Duration in ms. 0 for permanent.
         * @param {string} [options.position='top-center'] - e.g., 'bottom-right', 'top-left'.
         * @param {function} [options.onClick=null] - Callback function for click events.
         */
        showCustom: function(options) {
            const {
                content,
                type = 'info',
                duration = 5000,
                position = 'top-center',
                onClick = null
            } = options;

            const container = document.getElementById("toast-container");
            if (!container) {
                console.error("[Toast] Container not found. Was init() called?");
                setTimeout(() => this.showCustom(options), 50);
                return;
            }
            
            // Ensure position-specific container exists
            let positionContainer = document.getElementById(`toast-container-${position}`);
            if (!positionContainer) {
                positionContainer = document.createElement("div");
                positionContainer.id = `toast-container-${position}`;
                positionContainer.className = `toast-position-container ${position}`;
                container.appendChild(positionContainer);
            }

            const toastElement = document.createElement("div");
            toastElement.className = `toast ${type}`;
            toastElement.innerHTML = content; // Content is expected to be safe HTML

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
                setTimeout(() => {
                    this.remove(toastElement);
                }, duration);
            }
            
            return toastElement;
        },

        /**
         * Removes a toast element with a fade-out animation.
         * @param {HTMLElement} toastElement - The toast element to remove.
         */
        remove: function(toastElement) {
            if (!toastElement || !toastElement.parentNode) return;
            
            toastElement.classList.add("removing");
            toastElement.addEventListener('animationend', () => {
                toastElement.remove();
                // Optional: clean up empty position containers
                const parent = toastElement.parentNode;
                if (parent && parent.classList.contains('toast-position-container') && parent.children.length === 0) {
                    parent.remove();
                }
            });
        }
    };

    S.toast = toast;

})();