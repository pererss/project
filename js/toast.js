// SENTCOR v2.0 — Themed Toast Module
(function() {
    "use strict";

    window.SENTCOR = window.SENTCOR || {};

    const toast = {
        /**
         * Initializes the toast module.
         * Ensures the toast container exists in the DOM.
         */
        init: function() {
            // Check if container already exists
            if (document.getElementById("toast-container")) {
                return;
            }
            // Create and append the container to the body
            const toastContainer = document.createElement("div");
            toastContainer.id = "toast-container";
            document.body.appendChild(toastContainer);
            console.log("[Toast] Module Initialized.");
        },

        /**
         * Shows a toast notification.
         * @param {string} message - The message to display.
         * @param {('info'|'success'|'error'|'warning')} [type='info'] - The type of toast.
         * @param {number} [duration=5000] - The duration in milliseconds.
         */
        show: function(message, type = "info", duration = 5000) {
            const toastContainer = document.getElementById("toast-container");
            if (!toastContainer) {
                console.error("[Toast] Container not found. Was init() called?");
                // As a fallback, try to initialize now.
                this.init();
                // Re-run the show function after a short delay to allow DOM update.
                setTimeout(() => this.show(message, type, duration), 50);
                return;
            }

            // Sanitize input to prevent potential XSS if message is ever used in innerHTML
            const safeMessage = document.createTextNode(message);

            const toastElement = document.createElement("div");
            // The classes 'toast' and the type are defined in the main CSS file
            toastElement.className = `toast ${type}`;
            
            toastElement.appendChild(safeMessage);
            
            // Add to the top of the container
            toastContainer.prepend(toastElement);

            // Set a timer to remove the toast
            setTimeout(() => {
                // Add a class to trigger the fade-out animation
                toastElement.classList.add("removing");

                // Remove the element from the DOM after the animation completes
                toastElement.addEventListener('animationend', () => {
                    toastElement.remove();
                });
            }, duration);
        }
    };

    // Attach to the global SENTCOR object
    S.toast = toast;

})();