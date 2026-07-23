/* SentCor — UI Utilities */
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};

/* SVG Icons */
window.S.icons = {
  message: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  smile: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  dots: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  userPlus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  userMinus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  bell: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  mute: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
  block: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
};

/* Escape HTML */
window.S.utils.escapeHtml = function (s) {
  if (s == null) return '';
  var m = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;','/':'&#x2F;'};
  return String(s).replace(/[&<>"'/]/g, function (c) { return m[c]; });
};

/* Time format */
window.S.utils.formatTime = function (ds) {
  if (!ds) return '';
  var d = new Date(ds); if (isNaN(d)) return '';
  var h = d.getHours().toString().padStart(2,'0');
  var m = d.getMinutes().toString().padStart(2,'0');
  return h + ':' + m;
};

/* Date header */
window.S.utils.getDateHeader = function (ds) {
  if (!ds) return '';
  var d = new Date(ds); if (isNaN(d)) return '';
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var msg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diff = Math.floor((today - msg) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
};

/* Avatar */
window.S.utils.createAvatarHTML = function (username, avatarUrl, size) {
  size = size || 40;
  var name = window.S.utils.escapeHtml(username || '?');
  var init = name.charAt(0).toUpperCase();
  var fs = Math.round(size * 0.4);
  if (avatarUrl && avatarUrl.trim()) {
    return '<div class="avatar" style="width:'+size+'px;height:'+size+'px;">' +
      '<img src="'+window.S.utils.escapeHtml(avatarUrl)+'" alt="'+name+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';" />' +
      '<span class="avatar-fb" style="display:none;font-size:'+fs+'px;">'+init+'</span></div>';
  }
  return '<div class="avatar" style="width:'+size+'px;height:'+size+'px;"><span class="avatar-fb" style="display:flex;font-size:'+fs+'px;">'+init+'</span></div>';
};

/* Status */
window.S.utils.getStatusColor = function (s) {
  return {online:'#23A55A',idle:'#F0B232',dnd:'#F23F43',offline:'#71717A'}[s]||'#71717A';
};
window.S.utils.getStatusLabel = function (s) {
  return {online:'В сети',idle:'Не активен',dnd:'Не беспокоить',offline:'Офлайн'}[s]||'Офлайн';
};

/* Loading */
var _lt = null;
window.S.ui.showLoading = function (msg) {
  if (_lt) clearTimeout(_lt);
  var o = document.getElementById('loading-overlay');
  if (!o) { o = document.createElement('div'); o.id='loading-overlay'; o.innerHTML='<div class="loading-box"><div class="loading-spinner"></div><div class="loading-text"></div></div>'; document.body.appendChild(o); }
  var t = o.querySelector('.loading-text'); if (t) t.textContent = msg || 'Загрузка...';
  o.classList.add('visible');
  _lt = setTimeout(function(){window.S.ui.hideLoading();},4000);
};
window.S.ui.hideLoading = function () {
  if (_lt) clearTimeout(_lt);
  var o = document.getElementById('loading-overlay'); if (o) o.classList.remove('visible');
};

/* Toast */
window.S.ui.showToast = function (msg, type) {
  type = type||'info';
  var c = document.getElementById('toast-container');
  if (!c) { c=document.createElement('div'); c.id='toast-container'; document.body.appendChild(c); }
  var t = document.createElement('div');
  t.className='toast toast--'+type;
  t.innerHTML='<span class="toast-icon">'+(type==='success'?window.S.icons.check:type==='error'?window.S.icons.x:window.S.icons.bell)+'</span><span class="toast-msg">'+window.S.utils.escapeHtml(msg)+'</span>';
  c.appendChild(t);
  requestAnimationFrame(function(){t.classList.add('visible');});
  setTimeout(function(){t.classList.remove('visible');setTimeout(function(){if(t.parentNode)t.remove();},350);},3000);
};

/* Emoji Picker */
window.S.ui.showEmojiPicker = function (anchor, onSelect) {
  window.S.ui.closeEmojiPicker();
  var p = document.createElement('div'); p.id='emoji-picker'; p.className='emoji-picker';
  var emojis = ['😀','😂','😍','🥰','😎','🤔','👍','👎','❤️','🔥','🎉','😢','😡','🤯','💀','👀','✅','❌','⭐','🚀','💜','💚','🧡','💙'];
  var h = '<div class="emoji-grid">';
  emojis.forEach(function(e){h+='<button class="emoji-item" data-emoji="'+e+'">'+e+'</button>';});
  h+='</div>'; p.innerHTML=h; document.body.appendChild(p);
  var r=anchor.getBoundingClientRect();
  p.style.left=Math.min(r.left,window.innerWidth-p.offsetWidth-16)+'px';
  p.style.top=(r.top-p.offsetHeight-8)+'px';
  if(p.getBoundingClientRect().top<0) p.style.top=(r.bottom+8)+'px';
  p.querySelectorAll('.emoji-item').forEach(function(b){b.addEventListener('click',function(){onSelect(b.getAttribute('data-emoji'));window.S.ui.closeEmojiPicker();});});
  setTimeout(function(){document.addEventListener('click',function h(ev){if(!p.contains(ev.target)&&ev.target!==anchor){window.S.ui.closeEmojiPicker();document.removeEventListener('click',h);}});},0);
};
window.S.ui.closeEmojiPicker = function(){var o=document.getElementById('emoji-picker');if(o&&o.parentNode)o.remove();};

/* Context Menu */
window.S.ui.showContextMenu = function (anchor, items) {
  window.S.ui.closeContextMenu();
  var m = document.createElement('div'); m.id='context-menu'; m.className='context-menu';
  var h = '';
  items.forEach(function(item){
    if(item.separator){h+='<div class="ctx-separator"></div>';return;}
    h+='<button class="ctx-item'+(item.danger?' ctx-danger':'')+'" data-action="'+item.action+'">'+item.icon+'<span>'+item.label+'</span></button>';
  });
  m.innerHTML=h; document.body.appendChild(m);
  var r=anchor.getBoundingClientRect();
  m.style.left=Math.min(r.left,window.innerWidth-m.offsetWidth-8)+'px';
  m.style.top=Math.min(r.bottom+4,window.innerHeight-m.offsetHeight-8)+'px';
  m.querySelectorAll('.ctx-item').forEach(function(b){b.addEventListener('click',function(){window.S.ui.closeContextMenu();var action=b.getAttribute('data-action');var cb=items.find(function(i){return i.action===action;});if(cb&&cb.onClick)cb.onClick();});});
  setTimeout(function(){document.addEventListener('click',function h(ev){if(!m.contains(ev.target)){window.S.ui.closeContextMenu();document.removeEventListener('click',h);}});},0);
};
window.S.ui.closeContextMenu = function(){var o=document.getElementById('context-menu');if(o&&o.parentNode)o.remove();};

/* Modal */
window.S.ui.openModal = function (title, bodyHTML, onSave) {
  var old=document.getElementById('modal-overlay');if(old)old.remove();
  var o=document.createElement('div');o.id='modal-overlay';o.className='modal-overlay';
  o.innerHTML='<div class="modal-card"><div class="modal-header"><h3>'+title+'</h3><button class="modal-close" id="modal-close">'+window.S.icons.x+'</button></div><div class="modal-body">'+bodyHTML+'</div><div class="modal-footer"><button class="btn btn--ghost" id="modal-cancel">Отмена</button>'+(onSave?'<button class="btn btn--accent" id="modal-save">Сохранить</button>':'')+'</div></div>';
  document.body.appendChild(o);
  requestAnimationFrame(function(){o.classList.add('visible');});
  document.getElementById('modal-close').addEventListener('click',closeModal);
  document.getElementById('modal-cancel').addEventListener('click',closeModal);
  var saveBtn=document.getElementById('modal-save');if(saveBtn)saveBtn.addEventListener('click',function(){if(onSave)onSave();closeModal();});
  o.addEventListener('click',function(e){if(e.target===o)closeModal();});
};
function closeModal(){var o=document.getElementById('modal-overlay');if(o){o.classList.remove('visible');setTimeout(function(){if(o.parentNode)o.remove();},200);}}
window.S.ui.closeModal=closeModal;

/* Profile Modal (view other user) */
window.S.ui.openProfileModal = function (profile) {
  if (!profile) return;
  var sc = window.S.utils.getStatusColor(profile.status);
  var sl = window.S.utils.getStatusLabel(profile.status);
  var banner = '<div class="profile-banner"></div>';
  var avatar = '<div class="profile-modal-avatar">' + window.S.utils.createAvatarHTML(profile.username, profile.avatar_url, 80) + '</div>';
  var html = '<div class="profile-view">' + banner +
    '<div class="profile-view-body">' + avatar +
    '<div class="profile-view-name">' + window.S.utils.escapeHtml(profile.username) + '</div>' +
    '<div class="profile-view-status"><span class="sd" style="background:'+sc+'"></span>' + sl + '</div>' +
    (profile.bio ? '<div class="profile-view-bio">' + window.S.utils.escapeHtml(profile.bio) + '</div>' : '') +
    '</div></div>';
  window.S.ui.openModal('Профиль', html, null);
};