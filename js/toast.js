(function() {
  "use strict";

  const toast = {
    show: function(message, type = "info", duration = 10000) {
      let toastContainer = document.getElementById("toast-container");
      if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        document.body.appendChild(toastContainer);
      }

      const toastElement = document.createElement("div");
      toastElement.className = `toast toast-${type}`;
      
      const messageElement = document.createElement("div");
      messageElement.textContent = message;
      
      const progressBar = document.createElement("div");
      progressBar.className = "toast-progress-bar";

      toastElement.appendChild(messageElement);
      toastElement.appendChild(progressBar);
      toastContainer.appendChild(toastElement);

      progressBar.style.animation = `progress ${duration / 1000}s linear forwards`;

      setTimeout(() => {
        toastElement.classList.add("removing");
        toastElement.addEventListener("animationend", () => {
          toastElement.remove();
        });
      }, duration);
    }
  };

  window.toast = toast;
})();