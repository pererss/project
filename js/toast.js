(function() {
  "use strict";

  // Полностью изолированный модуль для уведомлений (тостов)

  // Стили для тостов. Будут добавлены в <head> один раз.
  const toastStyles = `
    #toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
    }
    .toast {
      background-color: var(--bg-secondary, #333);
      color: var(--text-bright, #fff);
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      border-left: 5px solid var(--accent, #4A90E2);
      opacity: 0;
      transform: translateX(100%);
      animation: toast-in 0.5s forwards;
      width: 320px;
      position: relative;
      overflow: hidden;
    }
    .toast.removing {
      animation: toast-out 0.5s forwards;
    }
    .toast-info { border-left-color: #4A90E2; }
    .toast-success { border-left-color: #50E3C2; }
    .toast-error { border-left-color: #D0021B; }
    .toast-warning { border-left-color: #F5A623; }

    .toast-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      background-color: rgba(255, 255, 255, 0.3);
      animation-fill-mode: forwards;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    @keyframes toast-out {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(110%);
      }
    }
    @keyframes progress {
      from { width: 100%; }
      to { width: 0%; }
    }
  `;

  // Функция для однократного добавления стилей
  function addStylesOnce() {
    if (document.getElementById('toast-styles')) return;
    const styleSheet = document.createElement("style");
    styleSheet.id = 'toast-styles';
    styleSheet.type = "text/css";
    styleSheet.innerText = toastStyles;
    document.head.appendChild(styleSheet);
  }

  const toast = {
    init: function() {
      // This function is called on startup.
      // It ensures styles are ready without showing a toast.
      addStylesOnce();
      console.log("Toast module initialized.");
    },
    /**
     * Показывает уведомление (тост).
     * @param {string} message - Сообщение для отображения.
     * @param {('info'|'success'|'error'|'warning')} [type='info'] - Тип уведомления.
     * @param {number} [duration=5000] - Длительность отображения в миллисекундах.
     */
    show: function(message, type = "info", duration = 5000) {
      addStylesOnce(); // Убедимся, что стили на месте

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

      // Запускаем анимацию прогресс-бара
      progressBar.style.animation = `progress ${duration / 1000}s linear forwards`;

      // Устанавливаем таймер для удаления тоста
      setTimeout(() => {
        toastElement.classList.add("removing");
        // Ждем окончания анимации исчезновения, чтобы удалить элемент
        toastElement.addEventListener("animationend", () => {
          toastElement.remove();
          // Если контейнер пуст, его тоже можно удалить (опционально)
          if (toastContainer.children.length === 0) {
            toastContainer.remove();
          }
        });
      }, duration);
    }
  };

  // Прикрепляем наш объект к глобальному объекту window
  if (window.SENTCOR) {
    window.SENTCOR.toast = toast;
  } else {
    window.toast = toast;
  }

})();