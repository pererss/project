/* =====================================================
   SentCor — Main App Controller (Monochrome Luxury)
   ===================================================== */
window.S = window.S || {};
window.S.app = window.S.app || {};

(function () {
  var currentView = 'chats'; // 'chats' | 'friends' | 'requests'
  var conversations = [];
  var friendsSubTab = 'all'; // 'all' | 'online' | 'pending' | 'addfriend'

  /* -----------------------------------------------------
     Init after login
     ----------------------------------------------------- */
  async function onLogin(user) {
    window.S.chat.subscribeRealtime();
    window.S.friends.subscribeRealtime();
    window.S.friends.onUpdate = refreshAll;
    renderProfileBar();
    await refreshAll();
  }

  async function refreshAll() {
    await window.S.friends.fetchFriends();
    await window.S.friends.fetchPending();
    await buildConversations();
    renderSidebar();
    renderCurrentView();
    updateBadge();
  }

  function updateBadge() {
    var badge = document.getElementById('requests-badge');
    if (!badge) return;
    var count = window.S.friends.getPending().length;
    if (count > 0) { badge.textContent = count; badge.style.display = 'inline-flex'; }
    else { badge.style.display = 'none'; }
  }

  /* -----------------------------------------------------
     Build conversations
     ----------------------------------------------------- */
  async function buildConversations() {
    var user = window.S.auth.getUser();
    var frs = window.S.friends.getFriends();
    if (!user || frs.length === 0) { conversations = []; return; }
    try {
      var client = window.S.supabase;
      if (!client) return;
      var ids = frs.map(function (f) { return f.id; });
      var parts = [];
      ids.forEach(function (fid) {
        parts.push('and(sender_id.eq.' + user.id + ',receiver_id.eq.' + fid + ')');
        parts.push('and(sender_id.eq.' + fid + ',receiver_id.eq.' + user.id + ')');
      });
      var res = await client.from('messages')
        .select('sender_id, receiver_id, content, created_at')
        .or(parts.join(',')).order('created_at', { ascending: false });
      if (res.error) throw res.error;
      var all = res.data || [];
      var fMap = {};
      frs.forEach(function (f) { fMap[f.id] = f; });
      conversations = frs.map(function (f) {
        var fm = all.filter(function (m) {
          return (m.sender_id === user.id && m.receiver_id === f.id) || (m.sender_id === f.id && m.receiver_id === user.id);
        });
        var last = fm.length > 0 ? fm[0] : null;
        return { friend: f, lastMessage: last ? last.content : '', lastTime: last ? last.created_at : '' };
      });
      conversations.sort(function (a, b) {
        if (!a.lastTime && !b.lastTime) return 0;
        if (!a.lastTime) return 1;
        if (!b.lastTime) return -1;
        return new Date(b.lastTime) - new Date(a.lastTime);
      });
    } catch (e) {
      console.error('[SentCor] buildConversations:', e.message);
      conversations = frs.map(function (f) { return { friend: f, lastMessage: '', lastTime: '' }; });
    }
  }

  /* -----------------------------------------------------
     Render sidebar
     ----------------------------------------------------- */
  function renderSidebar() {
    var list = document.getElementById('conversations-list');
    if (!list) return;
    if (conversations.length === 0) {
      list.innerHTML = '<div class="empty-state empty-state--sm"><div class="empty-text">Нет диалогов<br>Добавьте друзей!</div></div>';
      return;
    }
    var html = '';
    conversations.forEach(function (c) {
      var f = c.friend;
      var isActive = window.S.chat.getActiveFriend() === f.id;
      var preview = c.lastMessage ? window.S.utils.escapeHtml(c.lastMessage) : '<span style="color:var(--text-faint)">Нет сообщений</span>';
      if (preview.length > 36) preview = preview.substring(0, 36) + '...';
      var sc = window.S.utils.getStatusColor(f.status);
      html += '<div class="conv-item ' + (isActive ? 'conv-item--active' : '') + '" data-friend-id="' + f.id + '">' +
        '<div class="conv-avatar">' + window.S.utils.createAvatarHTML(f.username, f.avatar_url, 36) +
        '<span class="status-dot" style="background:' + sc + ';"></span></div>' +
        '<div class="conv-info"><div class="conv-name">' + window.S.utils.escapeHtml(f.username) + '</div>' +
        '<div class="conv-preview">' + preview + '</div></div></div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('.conv-item').forEach(function (el) {
      el.addEventListener('click', function () { openChat(el.getAttribute('data-friend-id')); });
    });
  }

  /* -----------------------------------------------------
     Open chat
     ----------------------------------------------------- */
  async function openChat(friendId) {
    var frs = window.S.friends.getFriends();
    var f = frs.find(function (x) { return x.id === friendId; });
    if (!f) return;
    window.S.chat.setActiveFriend(friendId, f);
    currentView = 'chats';
    updateChatHeader(f);
    renderNavTabs();
    await window.S.chat.fetchMessages(friendId);
    renderSidebar();
  }

  function updateChatHeader(f) {
    var hash = document.getElementById('chat-header-hash');
    var name = document.getElementById('chat-header-name');
    var status = document.getElementById('chat-header-status');
    var av = document.getElementById('chat-header-avatar');
    if (hash) hash.innerHTML = window.S.icons.hash;
    if (name) name.textContent = f ? f.username : '';
    if (status) { status.textContent = f ? window.S.utils.getStatusLabel(f.status) : ''; status.className = 'header-status'; }
    if (av) av.innerHTML = f ? window.S.utils.createAvatarHTML(f.username, f.avatar_url, 24) : '';
  }

  /* -----------------------------------------------------
     Nav tabs (Чаты / Друзья / Заявки)
     ----------------------------------------------------- */
  function renderNavTabs() {
    document.querySelectorAll('.nav-tab').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-view') === currentView);
    });
    document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.remove('active'); });
    if (currentView === 'chats') {
      var chatTab = document.getElementById('tab-chat');
      if (chatTab) chatTab.classList.add('active');
      window.S.chat.renderMessages();
    } else if (currentView === 'friends' || currentView === 'requests') {
      var frTab = document.getElementById('tab-friends');
      if (frTab) frTab.classList.add('active');
      renderFriendsView();
    }
  }

  /* -----------------------------------------------------
     Friends / Requests view
     ----------------------------------------------------- */
  function renderFriendsView() {
    var container = document.getElementById('friends-content');
    if (!container) return;
    // Update sub-tab buttons
    document.querySelectorAll('.sub-tab').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-subtab') === friendsSubTab);
    });

    if (friendsSubTab === 'addfriend') {
      renderAddFriend(container);
      return;
    }
    if (friendsSubTab === 'pending') {
      renderPending(container);
      return;
    }

    var allFrs = window.S.friends.getFriends();
    var filtered = friendsSubTab === 'online'
      ? allFrs.filter(function (f) { return f.status === 'online'; })
      : allFrs;

    var html = '<div class="friends-count">' + filtered.length + ' — ' + (friendsSubTab === 'online' ? 'В сети' : 'Все друзья') + '</div>';
    if (filtered.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">' + window.S.icons.users + '</div>' +
        '<div class="empty-text">Здесь пока пусто, добавьте друзей!</div></div>';
    } else {
      filtered.forEach(function (f) {
        var sc = window.S.utils.getStatusColor(f.status);
        html += '<div class="friend-row">' +
          '<div class="friend-avatar">' + window.S.utils.createAvatarHTML(f.username, f.avatar_url, 40) +
          '<span class="status-dot" style="background:' + sc + ';"></span></div>' +
          '<div class="friend-info"><div class="friend-name">' + window.S.utils.escapeHtml(f.username) + '</div>' +
          '<div class="friend-status">' + window.S.utils.getStatusLabel(f.status) + '</div></div>' +
          '<div class="friend-actions">' +
          '<button class="btn-icon" data-action="chat" data-friend-id="' + f.id + '" title="Написать">' + window.S.icons.message + '</button>' +
          '<button class="btn-icon btn-icon--danger" data-action="remove" data-friend-id="' + f.id + '" title="Удалить">' + window.S.icons.userMinus + '</button>' +
          '</div></div>';
      });
    }
    container.innerHTML = html;
    bindFriendActions(container);
  }

  function renderPending(container, pendingList) {
    var pending = pendingList || window.S.friends.getPending();
    var html = '<div class="friends-count">' + pending.length + ' — В ожидании</div>';
    if (pending.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">' + window.S.icons.bell + '</div>' +
        '<div class="empty-text">Нет входящих запросов</div></div>';
    } else {
      pending.forEach(function (req) {
        var p = req.profile;
        var name = p ? p.username : 'Неизвестный';
        var sc = p ? window.S.utils.getStatusColor(p.status) : '#71717A';
        html += '<div class="friend-row">' +
          '<div class="friend-avatar">' + window.S.utils.createAvatarHTML(name, p ? p.avatar_url : '', 40) +
          '<span class="status-dot" style="background:' + sc + ';"></span></div>' +
          '<div class="friend-info"><div class="friend-name">' + window.S.utils.escapeHtml(name) + '</div>' +
          '<div class="friend-status">' + window.S.utils.formatTime(req.created_at) + '</div></div>' +
          '<div class="friend-actions">' +
          '<button class="btn btn--sm btn--accept" data-action="accept" data-req-id="' + req.id + '">Принять</button>' +
          '<button class="btn btn--sm btn--decline" data-action="decline" data-req-id="' + req.id + '">Отклонить</button>' +
          '</div></div>';
      });
    }
    container.innerHTML = html;
    bindFriendActions(container);
  }

  function renderAddFriend(container) {
    container.innerHTML = '<div class="addfriend-form">' +
      '<div class="addfriend-title">Добавить в друзья</div>' +
      '<div class="addfriend-sub">Введите точный логин пользователя</div>' +
      '<div class="search-row"><input type="text" id="addfriend-input" class="input" placeholder="Введите логин..." autocomplete="off" />' +
      '<button class="btn btn--accent" id="addfriend-btn">Найти</button></div>' +
      '<div id="addfriend-results"></div></div>';
    var btn = document.getElementById('addfriend-btn');
    var inp = document.getElementById('addfriend-input');
    if (btn) btn.addEventListener('click', doSearch);
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
  }

  async function doSearch() {
    var inp = document.getElementById('addfriend-input');
    var res = document.getElementById('addfriend-results');
    if (!inp || !res) return;
    var q = inp.value.trim();
    if (!q) { res.innerHTML = ''; return; }
    window.S.ui.showLoading('Поиск...');
    try {
      var results = await window.S.friends.searchUsers(q);
      if (results.length === 0) {
        res.innerHTML = '<div class="empty-state empty-state--sm"><div class="empty-text">Не найден</div></div>';
        return;
      }
      var html = '';
      results.forEach(function (u) {
        var sc = window.S.utils.getStatusColor(u.status);
        html += '<div class="friend-row">' +
          '<div class="friend-avatar">' + window.S.utils.createAvatarHTML(u.username, u.avatar_url, 40) +
          '<span class="status-dot" style="background:' + sc + ';"></span></div>' +
          '<div class="friend-info"><div class="friend-name">' + window.S.utils.escapeHtml(u.username) + '</div>' +
          '<div class="friend-status">' + window.S.utils.getStatusLabel(u.status) + '</div></div>' +
          '<div class="friend-actions">' +
          '<button class="btn btn--sm btn--accent btn--send" data-user-id="' + u.id + '">Добавить в друзья</button>' +
          '</div></div>';
      });
      res.innerHTML = html;
      res.querySelectorAll('.btn--send').forEach(function (b) {
        b.addEventListener('click', async function () {
          b.disabled = true; b.textContent = '...';
          var r = await window.S.friends.sendRequest(b.getAttribute('data-user-id'));
          if (r.error) { window.S.ui.showToast(r.error, 'error'); b.disabled = false; b.textContent = 'Добавить в друзья'; }
          else { window.S.ui.showToast('Запрос отправлен!', 'success'); b.textContent = 'Отправлено'; b.classList.add('btn--sent'); }
        });
      });
    } catch (e) { res.innerHTML = '<div class="empty-state empty-state--sm"><div class="empty-text">Ошибка</div></div>'; }
    finally { window.S.ui.hideLoading(); }
  }

  function bindFriendActions(container) {
    container.querySelectorAll('[data-action="chat"]').forEach(function (b) {
      b.addEventListener('click', function () { openChat(b.getAttribute('data-friend-id')); });
    });
    container.querySelectorAll('[data-action="remove"]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Удалить из друзей?')) return;
        var r = await window.S.friends.removeFriend(b.getAttribute('data-friend-id'));
        if (r.error) { window.S.ui.showToast(r.error, 'error'); return; }
        window.S.ui.showToast('Друг удалён', 'info');
        await refreshAll();
      });
    });
    container.querySelectorAll('[data-action="accept"]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var r = await window.S.friends.respondRequest(b.getAttribute('data-req-id'), true);
        if (r.error) { window.S.ui.showToast(r.error, 'error'); return; }
        window.S.ui.showToast('Запрос принят!', 'success');
        await refreshAll();
      });
    });
    container.querySelectorAll('[data-action="decline"]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var r = await window.S.friends.respondRequest(b.getAttribute('data-req-id'), false);
        if (r.error) { window.S.ui.showToast(r.error, 'error'); return; }
        window.S.ui.showToast('Отклонено', 'info');
        await refreshAll();
      });
    });
  }

  /* -----------------------------------------------------
     Profile bar
     ----------------------------------------------------- */
  function renderProfileBar() {
    var bar = document.getElementById('profile-bar');
    if (!bar) return;
    var p = window.S.auth.getProfile();
    var u = window.S.auth.getUser();
    var name = p ? p.username : (u ? u.email.split('@')[0] : 'User');
    var sc = p ? window.S.utils.getStatusColor(p.status) : '#71717A';
    bar.innerHTML = '<div class="profile-avatar">' + window.S.utils.createAvatarHTML(name, '', 34) +
      '<span class="status-dot" style="background:' + sc + ';"></span></div>' +
      '<div class="profile-info"><div class="profile-name">@' + window.S.utils.escapeHtml(name) + '</div>' +
      '<div class="profile-status">' + (p ? window.S.utils.getStatusLabel(p.status) : '') + '</div></div>' +
      '<div class="profile-actions">' +
      '<button class="btn-icon" id="settings-btn" title="Настройки">' + window.S.icons.settings + '</button>' +
      '<button class="btn-icon" id="logout-btn" title="Выйти">' + window.S.icons.logout + '</button>' +
      '</div>';
    var sb = document.getElementById('settings-btn');
    var lb = document.getElementById('logout-btn');
    if (sb) sb.addEventListener('click', openSettings);
    if (lb) lb.addEventListener('click', function () { window.S.auth.logout(); });
  }

  function openSettings() {
    var p = window.S.auth.getProfile();
    var cs = p ? p.status : 'online';
    var cu = p ? p.username : '';
    var cb = p ? (p.bio || '') : '';
    var html = '<div class="settings-form">' +
      '<div class="settings-group"><label class="settings-label">Статус</label>' +
      '<div class="status-opts" id="status-opts">' +
      '<button class="status-opt ' + (cs === 'online' ? 'active' : '') + '" data-status="online"><span class="sd" style="background:#23A55A"></span> В сети</button>' +
      '<button class="status-opt ' + (cs === 'idle' ? 'active' : '') + '" data-status="idle"><span class="sd" style="background:#F0B232"></span> Не активен</button>' +
      '<button class="status-opt ' + (cs === 'dnd' ? 'active' : '') + '" data-status="dnd"><span class="sd" style="background:#F23F43"></span> Не беспокоить</button>' +
      '<button class="status-opt ' + (cs === 'offline' ? 'active' : '') + '" data-status="offline"><span class="sd" style="background:#71717A"></span> Офлайн</button>' +
      '</div></div>' +
      '<div class="settings-group"><label class="settings-label">Никнейм</label>' +
      '<input type="text" class="input" id="set-username" value="' + window.S.utils.escapeHtml(cu) + '" /></div>' +
      '<div class="settings-group"><label class="settings-label">О себе</label>' +
      '<textarea class="input" id="set-bio" rows="3" placeholder="Расскажите о себе...">' + window.S.utils.escapeHtml(cb) + '</textarea></div></div>';
    window.S.ui.openModal('Настройки профиля', html, async function () {
      var ss = 'online';
      var a = document.querySelector('#status-opts .status-opt.active');
      if (a) ss = a.getAttribute('data-status');
      var nu = (document.getElementById('set-username').value || '').trim();
      var nb = (document.getElementById('set-bio').value || '').trim();
      if (!nu) { window.S.ui.showToast('Введите никнейм', 'error'); return; }
      var r = await window.S.auth.updateProfile({ status: ss, username: nu, bio: nb });
      if (r.error) { window.S.ui.showToast(r.error, 'error'); return; }
      window.S.ui.showToast('Сохранено!', 'success');
      renderProfileBar();
      renderSidebar();
    });
    setTimeout(function () {
      document.querySelectorAll('#status-opts .status-opt').forEach(function (o) {
        o.addEventListener('click', function () {
          document.querySelectorAll('#status-opts .status-opt').forEach(function (x) { x.classList.remove('active'); });
          o.classList.add('active');
        });
      });
    }, 0);
  }

  /* -----------------------------------------------------
     UI Init — ALL event listeners
     ----------------------------------------------------- */
  function initUI() {
    // Nav tabs (Чаты / Друзья / Заявки)
    document.querySelectorAll('.nav-tab').forEach(function (el) {
      el.addEventListener('click', function () {
        currentView = el.getAttribute('data-view');
        if (currentView === 'requests') { friendsSubTab = 'pending'; }
        renderNavTabs();
      });
    });
    // Sub-tabs (Все / В сети / В ожидании / Добавить)
    document.querySelectorAll('.sub-tab').forEach(function (el) {
      el.addEventListener('click', function () {
        friendsSubTab = el.getAttribute('data-subtab');
        renderFriendsView();
      });
    });
    // Main chat tab switch
    document.querySelectorAll('.tab-btn').forEach(function (el) {
      el.addEventListener('click', function () {
        var tab = el.getAttribute('data-tab');
        if (tab === 'chat') currentView = 'chats';
        else if (tab === 'friends') currentView = 'friends';
        renderNavTabs();
      });
    });
    // Send message
    var sendBtn = document.getElementById('send-btn');
    var msgInput = document.getElementById('message-input');
    function handleSend() {
      if (!msgInput) return;
      var text = msgInput.value;
      if (text.trim() === '') return;
      window.S.chat.sendMessage(text);
      msgInput.value = '';
      msgInput.focus();
    }
    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (msgInput) {
      msgInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
      msgInput.addEventListener('input', function () { window.S.chat.handleTypingInput(); });
    }
    // Emoji
    var emojiBtn = document.getElementById('emoji-btn');
    if (emojiBtn) {
      emojiBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.S.ui.showEmojiPicker(emojiBtn, function (emoji) {
          var inp = document.getElementById('message-input');
          if (inp) { inp.value += emoji; inp.focus(); }
        });
      });
    }
    // Sidebar search
    var searchInput = document.getElementById('sidebar-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var q = searchInput.value.trim().toLowerCase();
        document.querySelectorAll('.conv-item').forEach(function (el) {
          var name = (el.querySelector('.conv-name') || {}).textContent || '';
          el.style.display = name.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
        });
      });
    }
    // Server rail icons
    document.querySelectorAll('.rail-icon').forEach(function (el) {
      el.addEventListener('click', function () {
        document.querySelectorAll('.rail-icon').forEach(function (n) { n.classList.remove('active'); });
        el.classList.add('active');
        var view = el.getAttribute('data-rail');
        if (view === 'chats') { currentView = 'chats'; renderNavTabs(); }
        else if (view === 'friends') { currentView = 'friends'; renderNavTabs(); }
      });
    });
  }

  window.S.app.onLogin = onLogin;
  window.S.app.refreshAll = refreshAll;
  window.S.app.refreshConversations = async function () { await buildConversations(); renderSidebar(); };
  window.S.app.openChat = openChat;
  window.S.app.initUI = initUI;
})();

document.addEventListener('DOMContentLoaded', function () {
  window.S.auth.init();
  window.S.app.initUI();
});