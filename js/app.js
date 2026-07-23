/* =====================================================
   SentCor — Main Application Controller
   ===================================================== */
window.S = window.S || {};
window.S.app = window.S.app || {};

(function () {
  var currentTab = 'chat'; // 'chat' | 'friends' | 'pending' | 'addfriend'
  var conversations = [];  // [{ friend, lastMessage, lastTime }]

  /* -----------------------------------------------------
     Initialise after login
     ----------------------------------------------------- */
  async function onLogin(user) {
    window.S.chat.subscribeRealtime();
    window.S.friends.subscribeRealtime();
    window.S.friends.onUpdate = refreshAll;
    renderProfileBar(user);
    await refreshAll();
  }

  /* -----------------------------------------------------
     Refresh everything
     ----------------------------------------------------- */
  async function refreshAll() {
    await window.S.friends.fetchFriends();
    await window.S.friends.fetchPending();
    buildConversations();
    renderSidebar();
    renderTab();
  }

  /* -----------------------------------------------------
     Build conversation list from friends + last messages
     ----------------------------------------------------- */
  async function buildConversations() {
    var user = window.S.auth.getUser();
    var friends = window.S.friends.getFriends();
    if (!user || friends.length === 0) { conversations = []; return; }
    try {
      var client = window.S.supabase;
      if (!client) return;
      var friendIds = friends.map(function (f) { return f.id; });
      // Fetch last message for each friend
      var res = await client
        .from('messages')
        .select('sender_id, receiver_id, content, created_at')
        .or(
          friendIds.map(function (fid) {
            return 'and(sender_id.eq.' + user.id + ',receiver_id.eq.' + fid + ')';
          }).concat(
            friendIds.map(function (fid) {
              return 'and(sender_id.eq.' + fid + ',receiver_id.eq.' + user.id + ')';
            })
          ).join(',')
        )
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
      // Sort by last message time (newest first)
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
     Render sidebar (conversations list)
     ----------------------------------------------------- */
  function renderSidebar() {
    var list = document.getElementById('conversations-list');
    if (!list) return;
    var user = window.S.auth.getUser();
    if (conversations.length === 0) {
      list.innerHTML = '<div class="empty-state empty-state--small">' +
        '<div class="empty-icon">&#128101;</div>' +
        '<div class="empty-text">Пока нет диалогов<br>Добавьте друга, чтобы начать общение!</div>' +
        '</div>';
      return;
    }
    var html = '';
    conversations.forEach(function (conv) {
      var f = conv.friend;
      var isActive = window.S.chat.getActiveFriend() === f.id;
      var preview = conv.lastMessage ? window.S.utils.escapeHtml(conv.lastMessage) : '<em>Нет сообщений</em>';
      if (preview.length > 40) preview = preview.substring(0, 40) + '...';
      var time = conv.lastTime ? window.S.utils.formatTime(conv.lastTime) : '';
      var online = f.status === 'online';
      html += '<div class="conv-item ' + (isActive ? 'conv-item--active' : '') + '" data-friend-id="' + f.id + '">' +
        '<div class="conv-avatar">' + window.S.utils.createAvatarHTML(f.username, f.avatar_url) +
        (online ? '<span class="status-dot"></span>' : '') +
        '</div>' +
        '<div class="conv-info">' +
        '<div class="conv-name">' + window.S.utils.escapeHtml(f.username) + '</div>' +
        '<div class="conv-preview">' + preview + '</div>' +
        '</div>' +
        '<div class="conv-time">' + time + '</div>' +
        '</div>';
    });
    list.innerHTML = html;
    // Bind click events
    list.querySelectorAll('.conv-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var fid = el.getAttribute('data-friend-id');
        openChat(fid);
      });
    });
  }

  /* -----------------------------------------------------
     Open a chat with a friend
     ----------------------------------------------------- */
  async function openChat(friendId) {
    window.S.chat.setActiveFriend(friendId);
    currentTab = 'chat';
    // Update header
    var friends = window.S.friends.getFriends();
    var friend = friends.find(function (f) { return f.id === friendId; });
    updateChatHeader(friend);
    renderTab();
    await window.S.chat.fetchMessages(friendId);
    renderSidebar(); // highlight active
  }

  /* -----------------------------------------------------
     Update chat header with friend info
     ----------------------------------------------------- */
  function updateChatHeader(friend) {
    var nameEl = document.getElementById('chat-header-name');
    var statusEl = document.getElementById('chat-header-status');
    var avatarEl = document.getElementById('chat-header-avatar');
    if (nameEl) nameEl.textContent = friend ? friend.username : 'Выберите диалог';
    if (statusEl) statusEl.textContent = friend ? (friend.status === 'online' ? 'В сети' : 'Офлайн') : '';
    if (statusEl) statusEl.className = 'header-status ' + (friend && friend.status === 'online' ? 'online' : '');
    if (avatarEl) avatarEl.innerHTML = friend ? window.S.utils.createAvatarHTML(friend.username, friend.avatar_url) : '';
  }

  /* -----------------------------------------------------
     Render active tab content
     ----------------------------------------------------- */
  function renderTab() {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.remove('active'); });
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-tab') === currentTab);
    });
    // Show active content
    if (currentTab === 'chat') {
      var chatArea = document.getElementById('tab-chat');
      if (chatArea) chatArea.classList.add('active');
      window.S.chat.renderMessages();
    } else if (currentTab === 'friends') {
      var friendsArea = document.getElementById('tab-friends');
      if (friendsArea) friendsArea.classList.add('active');
      renderFriendsList();
    } else if (currentTab === 'pending') {
      var pendingArea = document.getElementById('tab-pending');
      if (pendingArea) pendingArea.classList.add('active');
      renderPendingList();
    } else if (currentTab === 'addfriend') {
      var addArea = document.getElementById('tab-addfriend');
      if (addArea) addArea.classList.add('active');
      renderAddFriend();
    }
  }

  /* -----------------------------------------------------
     Render friends list (all friends tab)
     ----------------------------------------------------- */
  function renderFriendsList() {
    var container = document.getElementById('friends-list-content');
    if (!container) return;
    var friends = window.S.friends.getFriends();
    if (friends.length === 0) {
      container.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">&#128101;</div>' +
        '<div class="empty-title">Пока нет друзей</div>' +
        '<div class="empty-text">Добавьте друга, используя вкладку "Добавить в друзья"</div>' +
        '</div>';
      return;
    }
    var html = '';
    friends.forEach(function (f) {
      var online = f.status === 'online';
      html += '<div class="friend-item" data-friend-id="' + f.id + '">' +
        '<div class="friend-avatar">' + window.S.utils.createAvatarHTML(f.username, f.avatar_url) +
        (online ? '<span class="status-dot"></span>' : '') +
        '</div>' +
        '<div class="friend-info">' +
        '<div class="friend-name">' + window.S.utils.escapeHtml(f.username) + '</div>' +
        '<div class="friend-status">' + (online ? 'В сети' : 'Офлайн') + '</div>' +
        '</div>' +
        '<button class="btn btn--small btn--chat" data-friend-id="' + f.id + '">Написать</button>' +
        '</div>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.btn--chat').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        openChat(el.getAttribute('data-friend-id'));
      });
    });
  }

  /* -----------------------------------------------------
     Render pending friend requests
     ----------------------------------------------------- */
  function renderPendingList() {
    var container = document.getElementById('pending-list-content');
    if (!container) return;
    var pending = window.S.friends.getPending();
    if (pending.length === 0) {
      container.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">&#128229;</div>' +
        '<div class="empty-title">Нет входящих запросов</div>' +
        '<div class="empty-text">Запросы на добавление в друзья появятся здесь</div>' +
        '</div>';
      return;
    }
    var html = '';
    pending.forEach(function (req) {
      var p = req.profile;
      var name = p ? p.username : 'Неизвестный';
      var avatar = p ? window.S.utils.createAvatarHTML(p.username, p.avatar_url) : '<div class="avatar avatar--letter"><span class="avatar-initial">?</span></div>';
      html += '<div class="pending-item">' +
        '<div class="pending-avatar">' + avatar + '</div>' +
        '<div class="pending-info">' +
        '<div class="pending-name">' + window.S.utils.escapeHtml(name) + '</div>' +
        '<div class="pending-time">' + window.S.utils.formatTime(req.created_at) + '</div>' +
        '</div>' +
        '<div class="pending-actions">' +
        '<button class="btn btn--small btn--accept" data-req-id="' + req.id + '">Принять</button>' +
        '<button class="btn btn--small btn--decline" data-req-id="' + req.id + '">Отклонить</button>' +
        '</div></div>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.btn--accept').forEach(function (el) {
      el.addEventListener('click', async function () {
        var res = await window.S.friends.respondRequest(el.getAttribute('data-req-id'), true);
        if (res.error) { window.S.ui.showToast(res.error, 'error'); return; }
        window.S.ui.showToast('Запрос принят!', 'success');
        await refreshAll();
      });
    });
    container.querySelectorAll('.btn--decline').forEach(function (el) {
      el.addEventListener('click', async function () {
        var res = await window.S.friends.respondRequest(el.getAttribute('data-req-id'), false);
        if (res.error) { window.S.ui.showToast(res.error, 'error'); return; }
        window.S.ui.showToast('Запрос отклонён', 'info');
        await refreshAll();
      });
    });
  }

  /* -----------------------------------------------------
     Add friend tab (search by username)
     ----------------------------------------------------- */
  function renderAddFriend() {
    var container = document.getElementById('addfriend-content');
    if (!container) return;
    container.innerHTML = '<div class="addfriend-form">' +
      '<div class="search-box">' +
      '<input type="text" id="addfriend-input" class="input" placeholder="Введите точный логин..." autocomplete="off" />' +
      '<button class="btn btn--accent btn--search" id="addfriend-search-btn">Найти</button>' +
      '</div>' +
      '<div id="addfriend-results"></div>' +
      '</div>';
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
        resultsDiv.innerHTML = '<div class="empty-state empty-state--small">' +
          '<div class="empty-icon">&#128270;</div>' +
          '<div class="empty-text">Пользователь не найден</div></div>';
        return;
      }
      var html = '';
      results.forEach(function (u) {
        html += '<div class="search-result">' +
          '<div class="search-avatar">' + window.S.utils.createAvatarHTML(u.username, u.avatar_url) + '</div>' +
          '<div class="search-info"><div class="search-name">' + window.S.utils.escapeHtml(u.username) + '</div></div>' +
          '<button class="btn btn--small btn--accent btn--send-request" data-user-id="' + u.id + '">Добавить</button>' +
          '</div>';
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
            el.textContent = 'Добавить';
          } else {
            window.S.ui.showToast('Запрос отправлен!', 'success');
            el.textContent = 'Отправлено';
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

  /* -----------------------------------------------------
     Render profile bar at bottom of sidebar
     ----------------------------------------------------- */
  function renderProfileBar(user) {
    var bar = document.getElementById('profile-bar');
    if (!bar || !user) return;
    var uname = user.email ? user.email.split('@')[0] : 'User';
    // Try to fetch profile username
    (async function () {
      try {
        var client = window.S.supabase;
        if (client) {
          var res = await client.from('profiles').select('username, avatar_url').eq('id', user.id).single();
          if (res.data && res.data.username) uname = res.data.username;
          var avatarUrl = res.data ? res.data.avatar_url : '';
        }
      } catch (e) { /* use email prefix */ }
      bar.innerHTML = '<div class="profile-avatar">' + window.S.utils.createAvatarHTML(uname, '') + '</div>' +
        '<div class="profile-info">' +
        '<div class="profile-name">' + window.S.utils.escapeHtml(uname) + '</div>' +
        '<div class="profile-status"><span class="status-dot-inline"></span> В сети</div>' +
        '</div>' +
        '<button class="btn-icon" id="logout-btn" title="Выйти">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
        '</button>';
      var logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) logoutBtn.addEventListener('click', function () { window.S.auth.logout(); });
    })();
  }

  /* -----------------------------------------------------
     Tab switching & message send binding
     ----------------------------------------------------- */
  function initUI() {
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(function (el) {
      el.addEventListener('click', function () {
        currentTab = el.getAttribute('data-tab');
        renderTab();
      });
    });
    // Message send
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
    if (msgInput) msgInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
    // Search sidebar
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
   DOMContentLoaded — bootstrap
   ----------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  window.S.auth.init();
  window.S.app.initUI();
});