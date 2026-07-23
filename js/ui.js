/* =====================================================
   SentCor — UI Utilities & Helpers
   ===================================================== */
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};

/* -----------------------------------------------------
   XSS Protection
   ----------------------------------------------------- */
window.S.utils.escapeHtml = function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '/': '&#x2F;' };
  return String(str).replace(/[&<>"'/]/g, function (c) { return map[c]; });
};

/* -----------------------------------------------------
   Time Formatting
   ----------------------------------------------------- */
window.S.utils.formatTime = function formatTime(dateString) {
  if (!dateString) return '';
  var d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  var now = new Date();
  var hours = d.getHours().toString().padStart(2, '0');
  var minutes = d.getMinutes().toString().padStart(2, '0');
  var timeStr = hours + ':' + minutes;
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var messageDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diffDays = Math.floor((today - messageDay) / 86400000);
  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return 'Вчера, ' + timeStr;
  if (diffDays < 7) {
    var days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[d.getDay()] + ', ' + timeStr;
  }
  var day = d.getDate().toString().padStart(2, '0');
  var month = (d.getMonth() + 1).toString().padStart(2, '0');
  var year = d.getFullYear();
  return day + '.' + month + '.' + year + ' ' + timeStr;
};

/* -----------------------------------------------------
   Date Separator for message grouping
   ----------------------------------------------------- */
window.S.utils.getDateLabel = function getDateLabel(dateString) {
  if (!dateString) return '';
  var d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var messageDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diffDays = Math.floor((today - messageDay) / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  var days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  var months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
};

/* -----------------------------------------------------
   Avatar Creation
   ----------------------------------------------------- */
window.S.utils.createAvatarHTML = function createAvatarHTML(username, avatarUrl) {
  var name = window.S.utils.escapeHtml(username || '?');
  var initial = name.charAt(0).toUpperCase();
  if (avatarUrl && avatarUrl.trim() !== '') {
    return '<div class="avatar avatar--img" title="' + name + '">' +
           '<img src="' + window.S.utils.escapeHtml(avatarUrl) + '" alt="' + name + '" ' +
           'onerror="this.remove();this.parentNode.innerHTML=\'<span class=\\\'avatar-initial\\\'>' + initial + '</span>\'" />' +
           '</div>';
  }
  return '<div class="avatar avatar--letter" title="' + name + '">' +
         '<span class="avatar-initial">' + initial + '</span></div>';
};

/* -----------------------------------------------------
   Loading Overlay
   ----------------------------------------------------- */
var _loadingTimer = null;

window.S.ui.showLoading = function showLoading(message) {
  if (_loadingTimer) { clearTimeout(_loadingTimer); _loadingTimer = null; }
  var overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-box">' +
      '<div class="loading-spinner"></div>' +
      '<div class="loading-text"></div>' +
      '</div>';
    document.body.appendChild(overlay);
  }
  var msgEl = overlay.querySelector('.loading-text');
  if (msgEl) msgEl.textContent = message || 'Загрузка...';
  overlay.classList.add('visible');
  // Safety timer: auto-hide after 4 seconds
  _loadingTimer = setTimeout(function () {
    window.S.ui.hideLoading();
  }, 4000);
};

window.S.ui.hideLoading = function hideLoading() {
  if (_loadingTimer) { clearTimeout(_loadingTimer); _loadingTimer = null; }
  var overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.remove('visible');
};

/* -----------------------------------------------------
   Toast Notifications
   ----------------------------------------------------- */
window.S.ui.showToast = function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast toast--' + type;
  toast.innerHTML = '<span class="toast-icon">' +
    (type === 'success' ? '&#10003;' : type === 'error' ? '&#10007;' : '&#9432;') +
    '</span><span class="toast-msg">' + window.S.utils.escapeHtml(message) + '</span>';
  container.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(function () { toast.classList.add('visible'); });
  // Auto-remove
  setTimeout(function () {
    toast.classList.remove('visible');
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
  }, 3000);
};