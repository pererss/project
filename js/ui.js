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
  var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '/': '&#x2F;' };
  return String(str).replace(/[&<>"'/]/g, function (c) { return map[c]; });
};

/* -----------------------------------------------------
   Time Formatting (Discord style: "Сегодня в 14:32")
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
  if (diffDays === 0) return 'Сегодня в ' + timeStr;
  if (diffDays === 1) return 'Вчера в ' + timeStr;
  if (diffDays < 7) {
    var days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[d.getDay()] + ' в ' + timeStr;
  }
  var day = d.getDate().toString().padStart(2, '0');
  var month = (d.getMonth() + 1).toString().padStart(2, '0');
  var year = d.getFullYear();
  return day + '.' + month + '.' + year + ' в ' + timeStr;
};

/* -----------------------------------------------------
   Date Header for message grouping
   ----------------------------------------------------- */
window.S.utils.getDateHeader = function getDateHeader(dateString) {
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
   Avatar Creation (Discord style)
   ----------------------------------------------------- */
window.S.utils.createAvatarHTML = function createAvatarHTML(username, avatarUrl, size) {
  size = size || 40;
  var name = window.S.utils.escapeHtml(username || '?');
  var initial = name.charAt(0).toUpperCase();
  if (avatarUrl && avatarUrl.trim() !== '') {
    return '<div class="avatar avatar--img" style="width:' + size + 'px;height:' + size + 'px;" title="' + name + '">' +
           '<img src="' + window.S.utils.escapeHtml(avatarUrl) + '" alt="' + name + '" ' +
           'onerror="this.style.display=\'none\';this.parentNode.querySelector(\'.avatar-fallback\').style.display=\'flex\';" />' +
           '<span class="avatar-fallback avatar-initial" style="display:none;width:' + size + 'px;height:' + size + 'px;font-size:' + (size * 0.4) + 'px;">' + initial + '</span>' +
           '</div>';
  }
  return '<div class="avatar avatar--letter" style="width:' + size + 'px;height:' + size + 'px;" title="' + name + '">' +
         '<span class="avatar-initial" style="font-size:' + (size * 0.4) + 'px;">' + initial + '</span></div>';
};

/* -----------------------------------------------------
   Status helpers
   ----------------------------------------------------- */
window.S.utils.getStatusColor = function getStatusColor(status) {
  var map = { 'online': '#23A55A', 'idle': '#F0B232', 'dnd': '#F23F43', 'offline': '#80848E' };
  return map[status] || map['offline'];
};

window.S.utils.getStatusLabel = function getStatusLabel(status) {
  var map = { 'online': 'В сети', 'idle': 'Не активен', 'dnd': 'Не беспокоить', 'offline': 'Офлайн' };
  return map[status] || 'Офлайн';
};

window.S.utils.getStatusIcon = function getStatusIcon(status) {
  if (status === 'online') return '';
  if (status === 'idle') return '<span class="status-idle-dot"></span>';
  if (status === 'dnd') return '<span class="status-dnd-icon">—</span>';
  return '';
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
  _loadingTimer = setTimeout(function () { window.S.ui.hideLoading(); }, 4000);
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
  requestAnimationFrame(function () { toast.classList.add('visible'); });
  setTimeout(function () {
    toast.classList.remove('visible');
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
  }, 3000);
};

/* -----------------------------------------------------
   Emoji Picker
   ----------------------------------------------------- */
window.S.ui.showEmojiPicker = function showEmojiPicker(anchorEl, onSelect) {
  closeEmojiPicker();
  var picker = document.createElement('div');
  picker.id = 'emoji-picker';
  picker.className = 'emoji-picker';
  var emojis = ['😀','😂','😍','🥰','😎','🤔','👍','👎','❤️','🔥','🎉','😢','😡','🤯','💀','👀','✅','❌','⭐','🚀','💜','💚','🧡','💙'];
  var html = '<div class="emoji-grid">';
  emojis.forEach(function (e) {
    html += '<button class="emoji-item" data-emoji="' + e + '">' + e + '</button>';
  });
  html += '</div>';
  picker.innerHTML = html;
  document.body.appendChild(picker);
  // Position near anchor
  var rect = anchorEl.getBoundingClientRect();
  picker.style.left = rect.left + 'px';
  picker.style.top = (rect.top - picker.offsetHeight - 8) + 'px';
  if (picker.getBoundingClientRect().top < 0) {
    picker.style.top = (rect.bottom + 8) + 'px';
  }
  picker.querySelectorAll('.emoji-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      onSelect(btn.getAttribute('data-emoji'));
      closeEmojiPicker();
    });
  });
  setTimeout(function () {
    document.addEventListener('click', function handler(ev) {
      if (!picker.contains(ev.target) && ev.target !== anchorEl) {
        closeEmojiPicker();
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
};

function closeEmojiPicker() {
  var old = document.getElementById('emoji-picker');
  if (old) old.parentNode.removeChild(old);
}
window.S.ui.closeEmojiPicker = closeEmojiPicker;

/* -----------------------------------------------------
   Modal (Settings)
   ----------------------------------------------------- */
window.S.ui.openModal = function openModal(title, contentHTML, onSave) {
  var existing = document.getElementById('modal-overlay');
  if (existing) existing.parentNode.removeChild(existing);
  var overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-card">' +
    '<div class="modal-header"><h3>' + title + '</h3><button class="modal-close" id="modal-close-btn">&times;</button></div>' +
    '<div class="modal-body">' + contentHTML + '</div>' +
    '<div class="modal-footer">' +
    '<button class="btn btn--ghost" id="modal-cancel-btn">Отмена</button>' +
    '<button class="btn btn--accent" id="modal-save-btn">Сохранить</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function () { overlay.classList.add('visible'); });
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-save-btn').addEventListener('click', function () {
    if (onSave) onSave();
    closeModal();
  });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
};

function closeModal() {
  var overlay = document.getElementById('modal-overlay');
  if (overlay) { overlay.classList.remove('visible'); setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200); }
}
window.S.ui.closeModal = closeModal;