/* =====================================================
   SentCor — Chat Module (Discord-style)
   ===================================================== */
window.S = window.S || {};
window.S.chat = window.S.chat || {};

(function () {
  var supabase = null;
  var activeFriendId = null;
  var activeFriendProfile = null;
  var messages = [];
  var _channel = null;
  var _subscribed = false;
  var _typingTimeout = null;
  var _isTyping = false;

  function getSupabase() {
    if (!supabase && window.S && window.S.supabase) supabase = window.S.supabase;
    return supabase;
  }

  /* -----------------------------------------------------
     Fetch messages
     ----------------------------------------------------- */
  async function fetchMessages(friendId) {
    var user = window.S.auth.getUser();
    if (!user || !friendId) { messages = []; renderMessages(); return []; }
    try {
      var client = getSupabase();
      if (!client) return [];
      window.S.ui.showLoading('Загрузка сообщений...');
      var res = await client
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, read, reactions')
        .or('and(sender_id.eq.' + user.id + ',receiver_id.eq.' + friendId + '),and(sender_id.eq.' + friendId + ',receiver_id.eq.' + user.id + ')')
        .order('created_at', { ascending: true });
      if (res.error) throw res.error;
      messages = res.data || [];
      // Parse reactions JSON
      messages.forEach(function (m) {
        if (m.reactions && typeof m.reactions === 'string') {
          try { m.reactions = JSON.parse(m.reactions); } catch (e) { m.reactions = {}; }
        }
      });
      renderMessages();
      return messages;
    } catch (e) {
      console.error('[SentCor] fetchMessages:', e.message);
      messages = [];
      renderMessages();
      return [];
    } finally {
      window.S.ui.hideLoading();
    }
  }

  /* -----------------------------------------------------
     Send message
     ----------------------------------------------------- */
  async function sendMessage(content) {
    var user = window.S.auth.getUser();
    if (!user || !activeFriendId) return;
    if (!content || content.trim() === '') return;
    try {
      var client = getSupabase();
      if (!client) return;
      var res = await client.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeFriendId,
        content: content.trim(),
        created_at: new Date().toISOString(),
        read: false,
        reactions: '{}'
      });
      if (res.error) throw res.error;
    } catch (e) {
      console.error('[SentCor] sendMessage:', e.message);
      window.S.ui.showToast('Не удалось отправить сообщение', 'error');
    }
  }

  /* -----------------------------------------------------
     Add reaction to message
     ----------------------------------------------------- */
  async function addReaction(messageId, emoji) {
    var user = window.S.auth.getUser();
    if (!user || !messageId) return;
    try {
      var client = getSupabase();
      if (!client) return;
      var msg = messages.find(function (m) { return m.id === messageId; });
      if (!msg) return;
      var reactions = msg.reactions || {};
      if (!reactions[emoji]) reactions[emoji] = [];
      var userIdx = reactions[emoji].indexOf(user.id);
      if (userIdx > -1) {
        reactions[emoji].splice(userIdx, 1);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji].push(user.id);
      }
      // Update locally
      msg.reactions = reactions;
      renderMessages();
      // Update in DB
      await client.from('messages').update({ reactions: JSON.stringify(reactions) }).eq('id', messageId);
    } catch (e) {
      console.error('[SentCor] addReaction:', e.message);
    }
  }

  /* -----------------------------------------------------
     Delete message
     ----------------------------------------------------- */
  async function deleteMessage(messageId) {
    var user = window.S.auth.getUser();
    if (!user || !messageId) return;
    try {
      var client = getSupabase();
      if (!client) return;
      var msg = messages.find(function (m) { return m.id === messageId; });
      if (!msg || msg.sender_id !== user.id) { window.S.ui.showToast('Можно удалять только свои сообщения', 'error'); return; }
      var res = await client.from('messages').delete().eq('id', messageId);
      if (res.error) throw res.error;
      messages = messages.filter(function (m) { return m.id !== messageId; });
      renderMessages();
    } catch (e) {
      console.error('[SentCor] deleteMessage:', e.message);
    }
  }

  /* -----------------------------------------------------
     Append message (realtime)
     ----------------------------------------------------- */
  function appendMessage(msg) {
    if (!msg) return;
    var exists = messages.some(function (m) { return m.id === msg.id; });
    if (!exists) {
      if (msg.reactions && typeof msg.reactions === 'string') {
        try { msg.reactions = JSON.parse(msg.reactions); } catch (e) { msg.reactions = {}; }
      }
      messages.push(msg);
      renderMessages();
      scrollToBottom();
    }
  }

  /* -----------------------------------------------------
     Typing indicator
     ----------------------------------------------------- */
  function broadcastTyping() {
    var user = window.S.auth.getUser();
    if (!user || !activeFriendId) return;
    try {
      var client = getSupabase();
      if (!client) return;
      // We use a simple presence channel for typing
      client.channel('typing:' + activeFriendId + ':' + user.id)
        .track({ user_id: user.id, username: (window.S.auth.getProfile() || {}).username || 'User' });
    } catch (e) { /* noop */ }
  }

  function subscribeTyping() {
    var user = window.S.auth.getUser();
    if (!user || !activeFriendId) return;
    try {
      var client = getSupabase();
      if (!client) return;
      client.channel('typing:' + user.id + ':' + activeFriendId)
        .on('presence', { event: 'sync' }, function () {
          var state = client.channel('typing:' + user.id + ':' + activeFriendId).presenceState();
          var typingUsers = Object.keys(state);
          var statusEl = document.getElementById('chat-header-status');
          if (statusEl && typingUsers.length > 0 && activeFriendProfile) {
            statusEl.textContent = 'печатает...';
            statusEl.className = 'header-status typing';
          } else if (statusEl && activeFriendProfile) {
            statusEl.textContent = window.S.utils.getStatusLabel(activeFriendProfile.status);
            statusEl.className = 'header-status';
          }
        })
        .subscribe();
    } catch (e) { /* noop */ }
  }

  function handleTypingInput() {
    if (!_isTyping) {
      _isTyping = true;
      broadcastTyping();
    }
    if (_typingTimeout) clearTimeout(_typingTimeout);
    _typingTimeout = setTimeout(function () { _isTyping = false; }, 2000);
  }

  /* -----------------------------------------------------
     Render messages (Discord style)
     ----------------------------------------------------- */
  function renderMessages() {
    var container = document.getElementById('chat-messages');
    if (!container) return;
    var user = window.S.auth.getUser();
    if (!user || !activeFriendId) {
      container.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">&#128172;</div>' +
        '<div class="empty-title">Выберите диалог</div>' +
        '<div class="empty-text">Выберите чат слева, чтобы начать общение</div></div>';
      return;
    }
    if (messages.length === 0) {
      container.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">&#128172;</div>' +
        '<div class="empty-title">Начните диалог</div>' +
        '<div class="empty-text">Отправьте первое сообщение пользователю ' + window.S.utils.escapeHtml((activeFriendProfile || {}).username || '') + '!</div></div>';
      return;
    }

    // Group messages by sender + time proximity
    var grouped = [];
    var lastGroup = null;
    messages.forEach(function (msg) {
      var timeDiff = lastGroup && lastGroup.messages.length > 0
        ? (new Date(msg.created_at) - new Date(lastGroup.messages[lastGroup.messages.length - 1].created_at))
        : Infinity;
      if (!lastGroup || lastGroup.sender_id !== msg.sender_id || timeDiff > 300000) {
        lastGroup = { sender_id: msg.sender_id, messages: [msg] };
        grouped.push(lastGroup);
      } else {
        lastGroup.messages.push(msg);
      }
    });

    var html = '';
    var lastDateLabel = '';
    grouped.forEach(function (group) {
      var msg0 = group.messages[0];
      var isOwn = msg0.sender_id === user.id;
      var profile = isOwn ? window.S.auth.getProfile() : activeFriendProfile;
      var username = profile ? profile.username : (isOwn ? 'Вы' : 'Пользователь');
      var avatarUrl = profile ? profile.avatar_url : '';
      var dateLabel = window.S.utils.getDateHeader(msg0.created_at);

      if (dateLabel !== lastDateLabel) {
        html += '<div class="date-divider"><span>' + window.S.utils.escapeHtml(dateLabel) + '</span></div>';
        lastDateLabel = dateLabel;
      }

      html += '<div class="msg-group ' + (isOwn ? 'msg-group--own' : '') + '">' +
        '<div class="msg-group-avatar">' + window.S.utils.createAvatarHTML(username, avatarUrl, 40) + '</div>' +
        '<div class="msg-group-content">' +
        '<div class="msg-group-header">' +
        '<span class="msg-author">' + window.S.utils.escapeHtml(username) + '</span>' +
        '<span class="msg-timestamp">' + window.S.utils.formatTime(msg0.created_at) + '</span>' +
        '</div>';

      group.messages.forEach(function (msg) {
        var escaped = window.S.utils.escapeHtml(msg.content);
        var isOwnMsg = msg.sender_id === user.id;
        var reactionsHTML = renderReactions(msg);

        html += '<div class="msg-line" data-msg-id="' + msg.id + '">' +
          '<div class="msg-content">' + escaped + '</div>' +
          '<div class="msg-actions">' +
          (isOwnMsg ? '<button class="msg-action-btn msg-delete-btn" data-msg-id="' + msg.id + '" title="Удалить">🗑</button>' : '') +
          '</div>' +
          '</div>';
        if (reactionsHTML) {
          html += '<div class="msg-reactions">' + reactionsHTML + '</div>';
        }
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
    scrollToBottom();
    bindMessageActions();
  }

  function renderReactions(msg) {
    var reactions = msg.reactions || {};
    var user = window.S.auth.getUser();
    var html = '';
    Object.keys(reactions).forEach(function (emoji) {
      var userIds = reactions[emoji];
      if (userIds.length === 0) return;
      var isActive = user && userIds.indexOf(user.id) > -1;
      html += '<button class="reaction-chip ' + (isActive ? 'reaction-chip--active' : '') + '" data-msg-id="' + msg.id + '" data-emoji="' + emoji + '">' +
        emoji + ' <span class="reaction-count">' + userIds.length + '</span></button>';
    });
    return html;
  }

  function bindMessageActions() {
    var container = document.getElementById('chat-messages');
    if (!container) return;

    // Hover actions
    container.querySelectorAll('.msg-line').forEach(function (el) {
      el.addEventListener('mouseenter', function () { el.classList.add('msg-line--hover'); });
      el.addEventListener('mouseleave', function () { el.classList.remove('msg-line--hover'); });
    });

    // Delete buttons
    container.querySelectorAll('.msg-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteMessage(btn.getAttribute('data-msg-id'));
      });
    });

    // Reaction chips (toggle)
    container.querySelectorAll('.reaction-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        addReaction(chip.getAttribute('data-msg-id'), chip.getAttribute('data-emoji'));
      });
    });

    // Double-click to react with quick emojis
    container.querySelectorAll('.msg-content').forEach(function (el) {
      el.addEventListener('dblclick', function () {
        var line = el.closest('.msg-line');
        if (line) {
          var msgId = line.getAttribute('data-msg-id');
          addReaction(msgId, '👍');
        }
      });
    });
  }

  function scrollToBottom() {
    var container = document.getElementById('chat-messages');
    if (container) {
      requestAnimationFrame(function () { container.scrollTop = container.scrollHeight; });
    }
  }

  /* -----------------------------------------------------
     Mark as read
     ----------------------------------------------------- */
  async function markRead(friendId) {
    var user = window.S.auth.getUser();
    if (!user || !friendId) return;
    try {
      var client = getSupabase();
      if (!client) return;
      await client.from('messages')
        .update({ read: true })
        .eq('sender_id', friendId)
        .eq('receiver_id', user.id)
        .eq('read', false);
    } catch (e) { /* noop */ }
  }

  /* -----------------------------------------------------
     Realtime subscription
     ----------------------------------------------------- */
  function subscribeRealtime() {
    if (_subscribed) return;
    try {
      var client = getSupabase();
      if (!client) return;
      _channel = client
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, function (payload) {
          var msg = payload.new;
          if (window.S.chat.activeFriendId &&
            (msg.sender_id === window.S.chat.activeFriendId || msg.receiver_id === window.S.chat.activeFriendId)) {
            window.S.chat.appendMessage(msg);
            var user = window.S.auth.getUser();
            if (user && msg.sender_id === window.S.chat.activeFriendId && msg.receiver_id === user.id) {
              window.S.chat.markRead(window.S.chat.activeFriendId);
            }
          }
          if (window.S.app && window.S.app.refreshConversations) window.S.app.refreshConversations();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, function (payload) {
          var msg = payload.new;
          if (window.S.chat.activeFriendId &&
            (msg.sender_id === window.S.chat.activeFriendId || msg.receiver_id === window.S.chat.activeFriendId)) {
            var idx = messages.findIndex(function (m) { return m.id === msg.id; });
            if (idx > -1) {
              if (msg.reactions && typeof msg.reactions === 'string') {
                try { msg.reactions = JSON.parse(msg.reactions); } catch (e) { msg.reactions = {}; }
              }
              messages[idx] = msg;
              renderMessages();
            }
          }
        })
        .subscribe();
      _subscribed = true;
    } catch (e) {
      console.warn('[SentCor] chat realtime:', e.message);
    }
  }

  function unsubscribeRealtime() {
    if (_channel && getSupabase()) {
      try { getSupabase().removeChannel(_channel); } catch (e) { /* noop */ }
    }
    _channel = null;
    _subscribed = false;
  }

  /* -----------------------------------------------------
     Public API
     ----------------------------------------------------- */
  window.S.chat.fetchMessages = fetchMessages;
  window.S.chat.sendMessage = sendMessage;
  window.S.chat.appendMessage = appendMessage;
  window.S.chat.addReaction = addReaction;
  window.S.chat.deleteMessage = deleteMessage;
  window.S.chat.markRead = markRead;
  window.S.chat.renderMessages = renderMessages;
  window.S.chat.subscribeRealtime = subscribeRealtime;
  window.S.chat.unsubscribeRealtime = unsubscribeRealtime;
  window.S.chat.handleTypingInput = handleTypingInput;
  window.S.chat.setActiveFriend = function (id, profile) {
    activeFriendId = id;
    activeFriendProfile = profile || null;
    window.S.chat.activeFriendId = id;
    if (id) markRead(id);
  };
  window.S.chat.getActiveFriend = function () { return activeFriendId; };
  window.S.chat.getActiveFriendProfile = function () { return activeFriendProfile; };
  window.S.chat.getMessages = function () { return messages; };
})();