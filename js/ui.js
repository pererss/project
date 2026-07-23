/* =====================================================
   SentCor — UI Utilities & SVG Icons
   ===================================================== */
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};

/* -----------------------------------------------------
   SVG Icons (Lucide-style)
   ----------------------------------------------------- */
window.S.icons = {
  message: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  bell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  smile: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  mic: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
  userPlus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  userMinus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  hash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>'
};

/* -----------------------------------------------------
   XSS Protection
   ----------------------------------------------------- */
window.S.utils.escapeHtml = function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '/': '&#x2F;' };
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
  var h = d.getHours().toString().padStart(2, '0');
  var m = d.getMinutes().toString().padStart(2, '0');
  var t = h + ':' + m;
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diff = Math.floor((today - msgDay) / 86400000);
  if (diff === 0) return 'Сегодня в ' + t;
  if (diff === 1) return 'Вчера в ' + t;
  if (diff < 7) {
    var days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
    return days[d.getDay()] + ' в ' + t;
  }
  var dd = d.getDate().toString().padStart(2, '0');
  var mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return dd + '.' + mm + '.' + d.getFullYear() + ' в ' + t;
};

window.S.utils.getDateHeader = function getDateHeader(dateString) {
  if (!dateString) return '';
  var d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diff = Math.floor((today - msgDay) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
};

/* -----------------------------------------------------
   Avatar (1:1 crop, border)
   ----------------------------------------------------- */
window.S.utils.createAvatarHTML = function createAvatarHTML(username, avatarUrl, size) {
  size = size || 40;
  var name = window.S.utils.escapeHtml(username || '?');
  var initial = name.charAt(0).toUpperCase();
  var fs = Math.round(size * 0.4);
  if (avatarUrl && avatarUrl.trim() !== '') {
    return '<div class="avatar" style="width:' + size + 'px;height:' + size + 'px;">' +
           '<img src="' + window.S.utils.escapeHtml(avatarUrl) + '" alt="' + name + '" ' +
           'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';" />' +
           '<span class="avatar-fallback" style="display:none;width:100%;height:100%;font-size:' + fs + 'px;">' + initial + '</span>' +
           '</div>';
  }
  return '<div class="avatar" style="width:' + size + 'px;height:' + size + 'px;">' +
         '<span class="avatar-fallback" style="display:flex;width:100%;height:100%;font-size:' + fs + 'px;">' + initial + '</span></div>';
};

/* -----------------------------------------------------
   Status helpers
   ----------------------------------------------------- */
window.S.utils.getStatusColor = function getStatusColor(status) {
  var m = { online: '#23A55A', idle: '#F0B232', dnd: '#F23F43', offline: '#71717A' };
  return m[status] || m.offline;
};
window.S.utils.getStatusLabel = function getStatusLabel(status) {
  var m = { online: 'В сети', idle: 'Не активен', dnd: 'Не беспокоить', offline: 'Офлайн' };
  return m[status] || 'Офлайн';
};

/* -----------------------------------------------------
   Loading Overlay
   ----------------------------------------------------- */
var _loadingTimer = null;
window.S.ui.showLoading = function showLoading(msg) {
  if (_loadingTimer) { clearTimeout(_loadingTimer); _loadingTimer = null; }
  var o = document.getElementById('loading-overlay');
  if (!o) {
    o = document.createElement('div');
    o.id = 'loading-overlay';
    o.innerHTML = '<div class="loading-box"><div class="loading-spinner"></div><div class="loading-text"></div></div>';
    document.body.appendChild(o);
  }
  var t = o.querySelector('.loading-text');
  if (t) t.textContent = msg || 'Загрузка...';
  o.classList.add('visible');
  _loadingTimer = setTimeout(function () { window.S.ui.hideLoading(); }, 4000);
};
window.S.ui.hideLoading = function hideLoading() {
  if (_loadingTimer) { clearTimeout(_loadingTimer); _loadingTimer = null; }
  var o = document.getElementById('loading-overlay');
  if (o) o.classList.remove('visible');
};

/* -----------------------------------------------------
   Toast Notifications
   ----------------------------------------------------- */
window.S.ui.showToast = function showToast(message, type) {
  type = type || 'info';
  var c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  var t = document.createElement('div');
  t.className = 'toast toast--' + type;
  var icon = type === 'success' ? window.S.icons.check : type === 'error' ? window.S.icons.x : window.S.icons.bell;
  t.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-msg">' + window.S.utils.escapeHtml(message) + '</span>';
  c.appendChild(t);
  requestAnimationFrame(function () { t.classList.add('visible'); });
  setTimeout(function () {
    t.classList.remove('visible');
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 350);
  }, 3000);
};

/* -----------------------------------------------------
   Emoji Picker (SVG-style)
   ----------------------------------------------------- */
window.S.ui.showEmojiPicker = function showEmojiPicker(anchorEl, onSelect) {
  window.S.ui.closeEmojiPicker();
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
  var rect = anchorEl.getBoundingClientRect();
  picker.style.left = Math.min(rect.left, window.innerWidth - picker.offsetWidth - 16) + 'px';
  picker.style.top = (rect.top - picker.offsetHeight - 8) + 'px';
  if (picker.getBoundingClientRect().top < 0) picker.style.top = (rect.bottom + 8) + 'px';
  picker.querySelectorAll('.emoji-item').forEach(function (btn) {
    btn.addEventListener('click', function () { onSelect(btn.getAttribute('data-emoji')); window.S.ui.closeEmojiPicker(); });
  });
  setTimeout(function () {
    document.addEventListener('click', function handler(ev) {
      if (!picker.contains(ev.target) && ev.target !== anchorEl) { window.S.ui.closeEmojiPicker(); document.removeEventListener('click', handler); }
    });
  }, 0);
};
window.S.ui.closeEmojiPicker = function () {
  var old = document.getElementById('emoji-picker');
  if (old && old.parentNode) old.parentNode.removeChild(old);
};

/* -----------------------------------------------------
   Modal
   ----------------------------------------------------- */
window.S.ui.openModal = function openModal(title, contentHTML, onSave) {
  var old = document.getElementById('modal-overlay');
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-card">' +
    '<div class="modal-header"><h3>' + title + '</h3><button class="modal-close" id="modal-close-btn">' + window.S.icons.x + '</button></div>' +
    '<div class="modal-body">' + contentHTML + '</div>' +
    '<div class="modal-footer">' +
    '<button class="btn btn--ghost" id="modal-cancel-btn">Отмена</button>' +
    '<button class="btn btn--accent" id="modal-save-btn">Сохранить</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function () { overlay.classList.add('visible'); });
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-save-btn').addEventListener('click', function () { if (onSave) onSave(); closeModal(); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
};
function closeModal() {
  var o = document.getElementById('modal-overlay');
  if (o) { o.classList.remove('visible'); setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 200); }
}
window.S.ui.closeModal = closeModal;