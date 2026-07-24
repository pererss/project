/* SentCor — UI Utilities */
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};

/* Clean SVG Icons (Lucide/Heroicons style) */
window.S.icons = {
  message: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  dots: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  userPlus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  userMinus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  bell: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  block: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  hash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  volume: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  kick: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>',
  calendar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  at: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>'
};

/* Escape HTML */
window.S.utils.escapeHtml = function(s) {
  if (s == null) return '';
  var m = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;','/':'&#x2F;'};
  return String(s).replace(/[&<>"'/]/g, function(c) { return m[c]; });
};

/* Time format */
window.S.utils.formatTime = function(ds) {
  if (!ds) return '';
  var d = new Date(ds); if (isNaN(d)) return '';
  var h = d.getHours().toString().padStart(2,'0');
  var m = d.getMinutes().toString().padStart(2,'0');
  return h + ':' + m;
};

/* Date header */
window.S.utils.getDateHeader = function(ds) {
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

/* Format registration date */
window.S.utils.formatRegDate = function(ds) {
  if (!ds) return 'Неизвестно';
  var d = new Date(ds); if (isNaN(d)) return 'Неизвестно';
  var months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
};

/* Avatar with gradient fallback */
window.S.utils.createAvatarHTML = function(username, avatarUrl, size) {
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

/* Server avatar (first 2 letters, gradient) */
window.S.utils.createServerAvatarHTML = function(name, size) {
  size = size || 48;
  var n = window.S.utils.escapeHtml(name || 'S');
  var letters = n.substring(0, 2).toUpperCase();
  var fs = Math.round(size * 0.35);
  return '<div class="srv-avatar" style="width:'+size+'px;height:'+size+'px;font-size:'+fs+'px;border-radius:50%;">'+letters+'</div>';
};

/* Status */
window.S.utils.getStatusColor = function(s) {
  return {online:'#23A55A',idle:'#F0B232',dnd:'#F23F43',offline:'#71717A'}[s]||'#71717A';
};
window.S.utils.getStatusLabel = function(s) {
  return {online:'В сети',idle:'Не активен',dnd:'Не беспокоить',offline:'Офлайн'}[s]||'Офлайн';
};

/* Filter undefined from object */
window.S.utils.cleanPayload = function(obj) {
  var cleaned = {};
  Object.keys(obj).forEach(function(key) {
    if (obj[key] !== undefined) cleaned[key] = obj[key];
  });
  return cleaned;
};

/* Loading */
var _lt = null;
window.S.ui.showLoading = function(msg) {
  if (_lt) clearTimeout(_lt);
  var o = document.getElementById('loading-overlay');
  if (!o) { o = document.createElement('div'); o.id='loading-overlay'; o.innerHTML='<div class="loading-box"><div class="loading-spinner"></div><div class="loading-text"></div></div>'; document.body.appendChild(o); }
  var t = o.querySelector('.loading-text'); if (t) t.textContent = msg || 'Загрузка...';
  o.classList.add('visible');
  _lt = setTimeout(function(){window.S.ui.hideLoading();},4000);
};
window.S.ui.hideLoading = function() {
  if (_lt) clearTimeout(_lt);
  var o = document.getElementById('loading-overlay'); if (o) o.classList.remove('visible');
};

/* Toast */
window.S.ui.showToast = function(msg, type) {
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

/* Context Menu */
window.S.ui.showContextMenu = function(anchor, items) {
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
window.S.ui.openModal = function(title, bodyHTML, onSave, opts) {
  var old=document.getElementById('modal-overlay');if(old)old.remove();
  var maxW = (opts && opts.maxWidth) ? opts.maxWidth : '440px';
  var o=document.createElement('div');o.id='modal-overlay';o.className='modal-overlay';
  o.innerHTML='<div class="modal-card" style="max-width:'+maxW+'"><div class="modal-header"><h3>'+title+'</h3><button class="modal-close" id="modal-close">'+window.S.icons.x+'</button></div><div class="modal-body">'+bodyHTML+'</div>'+(onSave?'<div class="modal-footer"><button class="btn btn--ghost" id="modal-cancel">Отмена</button><button class="btn btn--accent" id="modal-save">Сохранить</button></div>':'')+'</div>';
  document.body.appendChild(o);
  requestAnimationFrame(function(){o.classList.add('visible');});
  document.getElementById('modal-close').addEventListener('click',closeModal);
  var cancelBtn = document.getElementById('modal-cancel');
  if(cancelBtn) cancelBtn.addEventListener('click',closeModal);
  var saveBtn=document.getElementById('modal-save');if(saveBtn)saveBtn.addEventListener('click',function(){if(onSave)onSave();});
  o.addEventListener('click',function(e){if(e.target===o)closeModal();});
};
function closeModal(){var o=document.getElementById('modal-overlay');if(o){o.classList.remove('visible');setTimeout(function(){if(o.parentNode)o.remove();},200);}}
window.S.ui.closeModal=closeModal;

/* Profile View Modal */
window.S.ui.openProfileModal = function(profile) {
  if (!profile) return;
  var sc = window.S.utils.getStatusColor(profile.status);
  var sl = window.S.utils.getStatusLabel(profile.status);
  var regDate = window.S.utils.formatRegDate(profile.created_at);
  var banner = '<div class="profile-banner"></div>';
  var avatar = '<div class="profile-modal-avatar">' + window.S.utils.createAvatarHTML(profile.username, profile.avatar_url, 80) + '</div>';
  var customStatus = profile.custom_status || '';
  var html = '<div class="profile-view">' + banner +
    '<div class="profile-view-body">' + avatar +
    '<div class="profile-view-name">' + window.S.utils.escapeHtml(profile.username) + '</div>' +
    (customStatus ? '<div class="profile-view-status" style="color:var(--accent);">"' + window.S.utils.escapeHtml(customStatus) + '"</div>' : '') +
    '<div class="profile-view-status"><span class="sd" style="background:'+sc+'"></span>' + sl + '</div>' +
    (profile.bio ? '<div class="profile-view-bio">' + window.S.utils.escapeHtml(profile.bio) + '</div>' : '') +
    '<div class="profile-view-meta">' +
    '<div class="profile-view-meta-item">'+window.S.icons.calendar+' Зарегистрирован: ' + regDate + '</div>' +
    '</div>' +
    '<div class="profile-view-actions">' +
    '<button class="btn btn--ghost btn--sm" id="pm-copy-id" data-uid="'+profile.id+'">'+window.S.icons.copy+' Скопировать ID</button>' +
    '</div>' +
    '</div></div>';
  window.S.ui.openModal('Профиль', html, null);
  setTimeout(function(){
    var copyBtn = document.getElementById('pm-copy-id');
    if(copyBtn) copyBtn.addEventListener('click', function(){
      navigator.clipboard.writeText(profile.id).then(function(){
        window.S.ui.showToast('ID скопирован!','success');
      }).catch(function(){window.S.ui.showToast('Не удалось скопировать','error');});
    });
  },0);
};

/* Profile Edit Modal */
window.S.ui.openProfileEditModal = function(profile, onSave) {
  if (!profile) return;
  var uname = profile.username || '';
  var bio = profile.bio || '';
  var avatarUrl = profile.avatar_url || '';
  var customStatus = profile.custom_status || '';

  var avatarHTML = '<div class="profile-edit-avatar" id="pe-avatar-wrap">' +
    window.S.utils.createAvatarHTML(profile.username, avatarUrl, 80) +
    '<div class="profile-edit-avatar-label">Изменить аватар</div>' +
    '<input type="file" id="pe-avatar-input" accept="image/*" style="display:none;">' +
    '</div>';

  var html = '<div class="settings-form">' + avatarHTML +
    '<div class="settings-group"><label class="settings-label">Никнейм</label><input type="text" class="input" id="pe-username" value="'+window.S.utils.escapeHtml(uname)+'" /></div>' +
    '<div class="settings-group"><label class="settings-label">О себе</label><textarea class="input" id="pe-bio" rows="3" placeholder="Расскажите о себе...">'+window.S.utils.escapeHtml(bio)+'</textarea></div>' +
    '<div class="settings-group"><label class="settings-label">Статус-цитата</label><input type="text" class="input" id="pe-custom-status" value="'+window.S.utils.escapeHtml(customStatus)+'" placeholder="Задизайнено в SentCor" /></div>' +
    '<div class="settings-group" style="padding:12px;background:var(--bg-glass);border-radius:var(--r-md);border:var(--border);">' +
    '<div style="font-size:12px;color:var(--text-f);margin-bottom:8px;">Информация</div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;"><span style="font-size:13px;color:var(--text2);">ID аккаунта</span><button class="btn btn--ghost btn--sm" id="pe-copy-id">'+window.S.icons.copy+' Копировать</button></div>' +
    '<div style="font-size:13px;color:var(--text2);">Дата регистрации: '+window.S.utils.formatRegDate(profile.created_at)+'</div>' +
    '</div></div>';

  window.S.ui.openModal('Редактирование профиля', html, async function(){
    var nu = (document.getElementById('pe-username').value||'').trim();
    var nb = (document.getElementById('pe-bio').value||'').trim();
    var cs = (document.getElementById('pe-custom-status').value||'').trim();
    if(!nu){window.S.ui.showToast('Введите никнейм','error');return;}
    var data = {username: nu, bio: nb, custom_status: cs};
    if(onSave) await onSave(data);
  }, {maxWidth:'480px'});

  setTimeout(function(){
    var copyBtn = document.getElementById('pe-copy-id');
    if(copyBtn) copyBtn.addEventListener('click', function(){
      navigator.clipboard.writeText(profile.id).then(function(){
        window.S.ui.showToast('ID скопирован!','success');
      }).catch(function(){window.S.ui.showToast('Не удалось скопировать','error');});
    });

    var avatarWrap = document.getElementById('pe-avatar-wrap');
    var avatarInput = document.getElementById('pe-avatar-input');
    if(avatarWrap && avatarInput){
      avatarWrap.addEventListener('click', function(){ avatarInput.click(); });
      avatarInput.addEventListener('change', function(e){
        var file = e.target.files[0]; if(!file) return;
        var reader = new FileReader();
        reader.onload = function(ev){
          var img = new Image();
          img.onload = function(){
            var canvas = document.createElement('canvas');
            var max = 150;
            var w = img.width, h = img.height;
            if(w > h){ if(w > max){ h = h * max / w; w = max; } }
            else{ if(h > max){ w = w * max / h; h = max; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            var avatarEl = avatarWrap.querySelector('.avatar');
            if(avatarEl){
              var imgEl = avatarEl.querySelector('img');
              if(imgEl){ imgEl.src = dataUrl; imgEl.style.display='block'; }
              else{
                var newImg = document.createElement('img');
                newImg.src = dataUrl;
                avatarEl.innerHTML = '';
                avatarEl.appendChild(newImg);
              }
              window.S._pendingAvatar = dataUrl;
            }
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
  },0);
};
