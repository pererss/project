/* =====================================================
   SentCor — Main Application Controller (Discord-style)
   ===================================================== */
window.S = window.S || {};
window.S.app = window.S.app || {};

(function () {
  var currentTab = 'chat'; // 'chat' | 'friends' | 'pending' | 'addfriend'
  var conversations = [];
  var friendsSubTab = 'online'; // 'online' | 'all' | 'pending' | 'addfriend'

  /* -----------------------------------------------------
     Initialise after login
     ----------------------------------------------------- */
  async function onLogin(user) {
    window.S.chat.subscribeRealtime();
    window.S.friends.subscribeRealtime();
    window.S.friends.onUpdate = refreshAll;
    renderProfileBar();
    await refreshAll();
    renderFriendsView();
  }

  /* -----------------------------------------------------
     Refresh everything
     ----------------------------------------------------- */
  async function refreshAll() {
    await window.S.friends.fetchFriends();
    await window.S.friends.fetchPending();
    buildConversations();
    renderSidebar();
    renderFriendsView();
    updatePendingBadge();
  }

  function updatePendingBadge() {
    var badge = document.getElementById('pending-badge');
    if (!badge) return;
    var count = window.S.friends.getPending().length;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }

  /* -----------------------------------------------------
     Build conversations from friends + messages
     ----------------------------------------------------- */
  async function buildConversations() {
    var user = window.S.auth.getUser();
    var friends = window.S.friends.getFriends();
    if (!user || friends.length === 0) { conversations = []; return; }
    try {
      var client = window.S.supabase;
      if (!client) return;
      var friendIds = friends.map(function (f) { return f.id; });
      var orParts = [];
      friendIds.forEach(function (fid) {
        orParts.push('and(sender_id.eq.' + user.id + ',receiver_id.eq.' + fid + ')');
        orParts.push('and(sender_id.eq.' + fid + ',receiver_id.eq.' + user.id + ')');
      });
      var res = await client
        .from('messages')
        .select('sender_id, receiver_id, content, created_at')
        .or(orParts.join(','))
        .order('created_at', { ascending: false });
      if (res.error) throw res.error;
      var allMsgs = res.data || [];
      var friendMap = {};
      friends.forEach(function (f) { friendMap[f.id] = f; });
      conversations = friends.map(function (friend) {
        var friendMsgs = allMsgs.filter(function (m) {
          return (m.sender_id === user.id && m.receiver_id === friend.id) ||
                 (m.sender_id === friend.id && m.receiver_id === user.id);
        });
        var last = friendMsgs.length > 0 ? friendMsgs[0] : null;
        return { friend: friend, lastMessage: last ? last.content : '', lastTime: last ? last.created_at : '' };
      });
      conversations.sort(function (a, b) {
        if (!a.lastTime && !b.lastTime) return 0;
        if (!a.lastTime) return 1;
        if (!b.lastTime) return -1;
        return new Date(b.lastTime) - new Date(a.lastTime);
      });
    } catch (e) {
      console.error('[SentCor] buildConversations:', e.message);
      conversations = friends.map(function (f) { return { friend: f, lastMessage: '', lastTime: '' }; });
    }
  }

  /* -----------------------------------------------------
     Render sidebar (Discord-style conversations list)
     ----------------------------------------------------- */
  function renderSidebar() {
    var list = document.getElementById('conversations-list');
    if (!list) return;
    if (conversations.length === 0) {
      list.innerHTML = '<div class="empty-state empty-state--small">' +
        '<div class="empty-icon">&#128101;</div>' +
        '<div class="empty-text">Здесь пока пусто<br>Добавьте друзей!</div></div>';
      return;
    }
    var html = '';
    conversations.forEach(function (conv) {
      var f = conv.friend;
      var isActive = window.S.chat.getActiveFriend() === f.id;
      var preview = conv.lastMessage ? window.S.utils.escapeHtml(conv.lastMessage) : '<em style="color:var(--text-muted)">Нет сообщений</em>';
      if (preview.length > 38) preview = preview.substring(0, 38) + '...';
      var time = conv.lastTime ? window.S.utils.formatTime(conv.lastTime) : '';
      var statusColor = window.S.utils.getStatusColor(f.status);
      html += '<div class="conv-item ' + (isActive ? 'conv-item--active' : '') + '" data-friend-id="' + f.id + '">' +
        '<div class="conv-avatar-wrap">' + window.S.utils.createAvatarHTML(f.username, f.avatar_url, 32) +
        '<span class="conv-status-dot" style="background:' + statusColor + ';"></span>' +
        '</div>' +
        '<div class="conv-info">' +
        '<div class="conv-name">' + window.S.utils.escapeHtml(f.username) + '</div>' +
        '<div class="conv-preview">' + preview + '</div>' +
        '</div>' +
        '</div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('.conv-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var fid = el.getAttribute('data-friend-id');
        openChat(fid);
      });
    });
  }

  /* -----------------------------------------------------
     Open chat with friend
     ----------------------------------------------------- */
  async function openChat(friendId) {
    var friends = window.S.friends.getFriends();
    var friend = friends.find(function (f) { return f.id === friendId; });
    if (!friend) return;
    window.S.chat.setActiveFriend(friendId, friend);
    currentTab = 'chat';
    updateChatHeader(friend);
    renderTab();
    await window.S.chat.fetchMessages(friendId);
    renderSidebar();
  }

  /* -----------------------------------------------------
     Update chat header (Discord-style: # name status)
     ----------------------------------------------------- */
  function updateChatHeader(friend) {
    var hashEl = document.getElementById('chat-header-hash');
    var nameEl = document.getElementById('chat-header-name');
    var statusEl = document.getElementById('chat-header-status');
    var avatarEl = document.getElementById('chat-header-avatar');
    if (hashEl) hashEl.textContent = '#';
    if (nameEl) nameEl.textContent = friend ? friend.username : '';
    if (statusEl) {
      statusEl.textContent = friend ? window.S.utils.getStatusLabel(friend.status) : '';
      statusEl.className = 'header-status';
    }
    if (avatarEl) avatarEl.innerHTML = friend ? window.S.utils.createAvatarHTML(friend.username, friend.avatar_url, 24) : '';
  }

  /* -----------------------------------------------------
     Render active tab
     ----------------------------------------------------- */
  function renderTab() {
    document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-tab') === currentTab);
    });
    if (currentTab === 'chat') {
      var chatArea = document.getElementById('tab-chat');
      if (chatArea) chatArea.classList.add('active');
      window.S.chat.renderMessages();
    } else if (currentTab === 'friends') {
      var friendsArea = document.getElementById('tab-friends');
      if (friendsArea) friendsArea.classList.add('active');
      renderFriendsView();
    }
  }

  /* -----------------------------------------------------
     Friends view (sub-tabs: Online, All, Pending, Add)
     ----------------------------------------------------- */
  function renderFriendsView() {
    var container = document.getElementById('friends-content');
    if (!container) return;
    // Update sub-tab buttons
    document.querySelectorAll('.friends-tab-btn').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-friends-tab') === friendsSubTab);
    });
    if (friendsSubTab === 'addfriend') {
      renderAddFriend(container);
      return;
    }
    var allFriends = window.S.friends.getFriends();
    var pending = window.S.friends.getPending();
    var user = window.S.auth.getUser();
    var filtered = [];
    if (friendsSubTab === 'online') {
      filtered = allFriends.filter(function (f) { return f.status === 'online'; });
    } else if (friendsSubTab === 'all') {
      filtered = allFriends;
    } else if (friendsSubTab === 'pending') {
      renderPendingView(container, pending);
      return;
    }

    var html = '<div class="friends-count">' + filtered.length + ' — В сети</div>';
    if (filtered.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">&#128101;</div>' +
        '<div class="empty-text">Здесь пока пусто, добавьте друзей!</div></div>';
    } else {
      filtered.forEach(function (f) {
        var statusColor = window.S.utils.getStatusColor(f.status);
        html += '<div class="friend-row">' +
          '<div class="friend-row-avatar">' + window.S.utils.createAvatarHTML(f.username, f.avatar_url, 32) +
          '<span class="conv-status-dot" style="background:' + statusColor + ';"></span></div>' +
          '<div class="friend-row-info">' +
          '<div class="friend-row-name">' + window.S.utils.escapeHtml(f.username) + '</div>' +
          '<div class="friend-row-status">' + window.S.utils.getStatusLabel(f.status) + '</div>' +
          '</div>' +
          '<div class="friend-row-actions">' +
          '<button class="btn-icon" title="Написать сообщение" data-action="chat" data-friend-id="' + f.id + '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>' +
          '<button class="btn-icon btn-icon--danger" title="Удалить из друзей" data-action="remove" data-friend-id="' + f.id + '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
          '</div></div>';
      });
    }
    container.innerHTML = html;
    bindFriendActions(container);
  }

  function renderPendingView(container, pending) {
    var html = '<div class="friends-count">' + pending.length + ' — В ожидании</div>';
    if (pending.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">&#128229;</div>' +
        '<div class="empty-text">Нет входящих запросов</div></div>';
    } else {
      pending.forEach(function (req) {
        var p = req.profile;
        var name = p ? p.username : 'Неизвестный';
        var statusColor = p ? window.S.utils.getStatusColor(p.status) : '#80848E';
        html += '<div class="friend-row">' +
          '<div class="friend-row-avatar">' + window.S.utils.createAvatarHTML(name, p ? p.avatar_url : '', 32) +
          '<span class="conv-status-dot" style="background:' + statusColor + ';"></span></div>' +
          '<div class="friend-row-info">' +
          '<div class="friend-row-name">' + window.S.utils.escapeHtml(name) + '</div>' +
          '<div class="friend-row-status">' + window.S.utils.formatTime(req.created_at) + '</div>' +
          '</div>' +
          '<div class="friend-row-actions">' +
          '<button class="btn btn--small btn--accept" data-action="accept" data-req-id="' + req.id + '">Принять</button>' +
          '<button class="btn btn--small btn--decline" data-action="decline" data-req-id="' + req.id + '">Отклонить</button>' +
          '</div></div>';
      });
    }
    container.innerHTML = html;
    bindFriendActions(container);
  }

  function renderAddFriend(container) {
    container.innerHTML = '<div class="addfriend-form">' +
      '<div class="addfriend-label">Добавить в друзья</div>' +
      '<div class="addfriend-sublabel">Введите точный логин пользователя</div>' +
      '<div class="search-box">' +
      '<input type="text" id="addfriend-input" class="input" placeholder="Введите логин..." autocomplete="off" />' +
      '<button class="btn btn--accent" id="addfriend-search-btn">Найти</button>' +
      '</div>' +
      '<div id="addfriend-results"></div></div>';
    var input = document.getElementById('addfriend-input');
    var btn = document.getElementById('addfriend-search-btn');
    if (btn) btn.addEventListener('click', doSearch);
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
  }

  async function doSearch() {
    var input = document.getElementById('addfriend-input');
    var resultsDiv = document.getElementById('addfriend-results');
    if (!input || !resultsDiv) return;
    var query = input.value.trim();
    if (!query) { resultsDiv.innerHTML = ''; return; }
    window.S.ui.showLoading('Поиск...');
    try {
      var results = await window.S.friends.searchUsers(query);
      if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="empty-state empty-state--small"><div class="empty-icon">&#128270;</div>' +
          '<div class="empty-text">Пользователь не найден</div></div>';
        return;
      }
      var html = '';
      results.forEach(function (u) {
        var statusColor = window.S.utils.getStatusColor(u.status);
        html += '<div class="friend-row">' +
          '<div class="friend-row-avatar">' + window.S.utils.createAvatarHTML(u.username, u.avatar_url, 32) +
          '<span class="conv-status-dot" style="background:' + statusColor + ';"></span></div>' +
          '<div class="friend-row-info">' +
          '<div class="friend-row-name">' + window.S.utils.escapeHtml(u.username) + '</div>' +
          '<div class="friend-row-status">' + window.S.utils.getStatusLabel(u.status) + '</div>' +
          '</div>' +
          '<div class="friend-row-actions">' +
          '<button class="btn btn--small btn--accent btn--send-request" data-user-id="' + u.id + '">Добавить в друзья</button>' +
          '</div></div>';
      });
      resultsDiv.innerHTML = html;
      resultsDiv.querySelectorAll('.btn--send-request').forEach(function (el) {
        el.addEventListener('click', async function () {
          var uid = el.getAttribute('data-user-id');
          el.disabled = true;
          el.textContent = '...';
          var res = await window.S.friends.sendRequest(uid);
          if (res.error) {
            window.S.ui.showToast(res.error, 'error');
            el.disabled = false;
            el.textContent = 'Добавить в друзья';
          } else {
            window.S.ui.showToast('Запрос отправлен!', 'success');
            el.textContent = 'Запрос отправлен';
            el.classList.add('btn--sent');
          }
        });
      });
    } catch (e) {
      resultsDiv.innerHTML = '<div class="empty-state empty-state--small"><div class="empty-text">Ошибка поиска</div></div>';
    } finally {
      window.S.ui.hideLoading();
    }
  }

  function bindFriendActions(container) {
    container.querySelectorAll('[data-action="chat"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openChat(btn.getAttribute('data-friend-id')); });
    });
    container.querySelectorAll('[data-action="remove"]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var fid = btn.getAttribute('data-friend-id');
        if (!confirm('Удалить из друзей?')) return;
        var res = await window.S.friends.removeFriend(fid);
        if (res.error) { window.S.ui.showToast(res.error, 'error'); return; }
        window.S.ui.showToast('Друг удалён', 'info');
        await refreshAll();
      });
    });
    container.querySelectorAll('[data-action="accept"]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var res = await window.S.friends.respondRequest(btn.getAttribute('data-req-id'), true);
        if (res.error) { window.S.ui.showToast(res.error, 'error'); return; }
        window.S.ui.showToast('Запрос принят!', 'success');
        await refreshAll();
      });
    });
    container.querySelectorAll('[data-action="decline"]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var res = await window.S.friends.respondRequest(btn.getAttribute('data-req-id'), false);
        if (res.error) { window.S.ui.showToast(res.error, 'error'); return; }
        window.S.ui.showToast('Запрос отклонён', 'info');
        await refreshAll();
      });
    });
  }

  /* -----------------------------------------------------
     Profile bar (bottom of sidebar)
     ----------------------------------------------------- */
  function renderProfileBar() {
    var bar = document.getElementById('profile-bar');
    if (!bar) return;
    var profile = window.S.auth.getProfile();
    var user = window.S.auth.getUser();
    var uname = profile ? profile.username : (user ? user.email.split('@')[0] : 'User');
    var statusColor = profile ? window.S.utils.getStatusColor(profile.status) : '#80848E';
    bar.innerHTML = '<div class="profile-avatar-wrap">' + window.S.utils.createAvatarHTML(uname, '', 32) +
      '<span class="profile-status-dot" style="background:' + statusColor + ';"></span></div>' +
      '<div class="profile-info">' +
      '<div class="profile-name">@' + window.S.utils.escapeHtml(uname) + '</div>' +
      '<div class="profile-status-text">' + (profile ? window.S.utils.getStatusLabel(profile.status) : '') + '</div>' +
      '</div>' +
      '<div class="profile-actions">' +
      '<button class="btn-icon" id="settings-btn" title="Настройки">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>' +
      '<button class="btn-icon" id="logout-btn" title="Выйти">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>' +
      '</div>';
    var settingsBtn = document.getElementById('settings-btn');
    var logoutBtn = document.getElementById('logout-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
    if (logoutBtn) logoutBtn.addEventListener('click', function () { window.S.auth.logout(); });
  }

  /* -----------------------------------------------------
     Settings Modal
     ----------------------------------------------------- */
  function openSettingsModal() {
    var profile = window.S.auth.getProfile();
    var currentStatus = profile ? profile.status : 'online';
    var currentUsername = profile ? profile.username : '';
    var currentBio = profile ? (profile.bio || '') : '';
    var contentHTML = '<div class="settings-form">' +
      '<div class="settings-group">' +
      '<label class="settings-label">Статус</label>' +
      '<div class="status-options" id="status-options">' +
      '<button class="status-opt ' + (currentStatus === 'online' ? 'active' : '') + '" data-status="online"><span class="status-dot-inline" style="background:#23A55A"></span> В сети</button>' +
      '<button class="status-opt ' + (currentStatus === 'idle' ? 'active' : '') + '" data-status="idle"><span class="status-dot-inline" style="background:#F0B232"></span> Не активен</button>' +
      '<button class="status-opt ' + (currentStatus === 'dnd' ? 'active' : '') + '" data-status="dnd"><span class="status-dot-inline" style="background:#F23F43"></span> Не беспокоить</button>' +
      '<button class="status-opt ' + (currentStatus === 'offline' ? 'active' : '') + '" data-status="offline"><span class="status-dot-inline" style="background:#80848E"></span> Офлайн</button>' +
      '</div></div>' +
      '<div class="settings-group">' +
      '<label class="settings-label">Никнейм</label>' +
      '<input type="text" class="input" id="settings-username" value="' + window.S.utils.escapeHtml(currentUsername) + '" />' +
      '</div>' +
      '<div class="settings-group">' +
      '<label class="settings-label">О себе</label>' +
      '<textarea class="input" id="settings-bio" rows="3" placeholder="Расскажите о себе...">' + window.S.utils.escapeHtml(currentBio) + '</textarea>' +
      '</div></div>';
    window.S.ui.openModal('Настройки профиля', contentHTML, async function () {
      var selectedStatus = 'online';
      var activeOpt = document.querySelector('#status-options .status-opt.active');
      if (activeOpt) selectedStatus = activeOpt.getAttribute('data-status');
      var newUsername = (document.getElementById('settings-username').value || '').trim();
      var newBio = (document.getElementById('settings-bio').value || '').trim();
      if (!newUsername) { window.S.ui.showToast('Никнейм не может быть пустым', 'error'); return; }
      var data = { status: selectedStatus, username: newUsername, bio: newBio };
      var res = await window.S.auth.updateProfile(data);
      if (res.error) { window.S.ui.showToast(res.error, 'error'); return; }
      window.S.ui.showToast('Настройки сохранены!', 'success');
      renderProfileBar();
      renderSidebar();
    });
    // Status option toggle
    setTimeout(function () {
      document.querySelectorAll('#status-options .status-opt').forEach(function (opt) {
        opt.addEventListener('click', function () {
          document.querySelectorAll('#status-options .status-opt').forEach(function (o) { o.classList.remove('active'); });
          opt.classList.add('active');
        });
      });
    }, 0);
  }

  /* -----------------------------------------------------
     UI Init (tab switching, send, search, friends tabs)
     ----------------------------------------------------- */
  function initUI() {
    // Main tabs
    document.querySelectorAll('.tab-btn').forEach(function (el) {
      el.addEventListener('click', function () {
        currentTab = el.getAttribute('data-tab');
        renderTab();
      });
    });
    // Friends sub-tabs
    document.querySelectorAll('.friends-tab-btn').forEach(function (el) {
      el.addEventListener('click', function () {
        friendsSubTab = el.getAttribute('data-friends-tab');
        renderFriendsView();
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
      msgInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
      });
      msgInput.addEventListener('input', function () { window.S.chat.handleTypingInput(); });
    }
    // Emoji button
    var emojiBtn = document.getElementById('emoji-btn');
    if (emojiBtn) {
      emojiBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.S.ui.showEmojiPicker(emojiBtn, function (emoji) {
          var input = document.getElementById('message-input');
          if (input) { input.value += emoji; input.focus(); }
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
    // Sidebar "Друзья" button → switch to friends tab
    var sidebarFriendsBtn = document.getElementById('sidebar-friends-btn');
    if (sidebarFriendsBtn) {
      sidebarFriendsBtn.addEventListener('click', function () {
        currentTab = 'friends';
        renderTab();
      });
    }
    // Server rail: "Личные сообщения" icon
    var dmIcon = document.querySelector('.nav-icon[data-nav="dm"]');
    if (dmIcon) dmIcon.addEventListener('click', function () {
      document.querySelectorAll('.nav-icon').forEach(function (n) { n.classList.remove('active'); });
      dmIcon.classList.add('active');
      currentTab = 'chat';
      renderTab();
    });
  }

  /* -----------------------------------------------------
     Public API
     ----------------------------------------------------- */
  window.S.app.onLogin = onLogin;
  window.S.app.refreshAll = refreshAll;
  window.S.app.refreshConversations = async function () { await buildConversations(); renderSidebar(); };
  window.S.app.openChat = openChat;
  window.S.app.initUI = initUI;
})();

/* -----------------------------------------------------
   DOMContentLoaded
   ----------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  window.S.auth.init();
  window.S.app.initUI();
});