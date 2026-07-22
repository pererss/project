
// SENTCOR — Toast Notifications
(function() {
  "use strict";

  const S = window.SENTCOR;

  function showToast(message, type = "info", duration = 10000) {
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    
    const progressBar = document.createElement("div");
    progressBar.className = "toast-progress-bar";

    toast.appendChild(messageElement);
    toast.appendChild(progressBar);
    toastContainer.appendChild(toast);

    progressBar.style.animation = `progress ${duration / 1000}s linear forwards`;

    setTimeout(() => {
      toast.classList.add("removing");
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, duration);
  }

  S.toast = showToast;
})();