/* =====================================================
   SentCor — Chat Module (Discord-style messages)
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
      messages.forEach(function (m) {
        if (m.reactions && typeof m.reactions === 'string') { try { m.reactions = JSON.parse(m.reactions); } catch (e) { m.reactions = {}; } }
        if (!m.reactions) m.reactions = {};
      });
      renderMessages();
      return messages;
    } catch (e) {
      console.error('[SentCor] fetchMessages:', e.message);
      messages = [];
      renderMessages();
      return [];
    } finally { window.S.ui.hideLoading(); }
  }

  async function sendMessage(content) {
    var user = window.S.auth.getUser();
    if (!user || !activeFriendId) return;
    if (!content || content.trim() === '') return;
    try {
      var client = getSupabase();
      if (!client) return;
      var res = await client.from('messages').insert({
        sender_id: user.id, receiver_id: activeFriendId,
        content: content.trim(), created_at: new Date().toISOString(),
        read: false, reactions: '{}'
      });
      if (res.error) throw res.error;
    } catch (e) {
      console.error('[SentCor] sendMessage:', e.message);
      window.S.ui.showToast('Не удалось отправить', 'error');
    }
  }

  async function addReaction(messageId, emoji) {
    var user = window.S.auth.getUser();
    if (!user) return;
    try {
      var client = getSupabase();
      if (!client) return;
      var msg = messages.find(function (m) { return m.id === messageId; });
      if (!msg) return;
      var r = msg.reactions || {};
      if (!r[emoji]) r[emoji] = [];
      var idx = r[emoji].indexOf(user.id);
      if (idx > -1) { r[emoji].splice(idx, 1); if (r[emoji].length === 0) delete r[emoji]; }
      else { r[emoji].push(user.id); }
      msg.reactions = r;
      renderMessages();
      await client.from('messages').update({ reactions: JSON.stringify(r) }).eq('id', messageId);
    } catch (e) { console.error('[SentCor] addReaction:', e.message); }
  }

  async function deleteMessage(messageId) {
    var user = window.S.auth.getUser();
    if (!user) return;
    try {
      var client = getSupabase();
      if (!client) return;
      var msg = messages.find(function (m) { return m.id === messageId; });
      if (!msg || msg.sender_id !== user.id) { window.S.ui.showToast('Только свои сообщения', 'error'); return; }
      await client.from('messages').delete().eq('id', messageId);
      messages = messages.filter(function (m) { return m.id !== messageId; });
      renderMessages();
    } catch (e) { console.error('[SentCor] deleteMessage:', e.message); }
  }

  function appendMessage(msg) {
    if (!msg) return;
    if (messages.some(function (m) { return m.id === msg.id; })) return;
    if (msg.reactions && typeof msg.reactions === 'string') { try { msg.reactions = JSON.parse(msg.reactions); } catch (e) { msg.reactions = {}; } }
    if (!msg.reactions) msg.reactions = {};
    messages.push(msg);
    renderMessages();
    scrollToBottom();
  }

  function broadcastTyping() {
    var user = window.S.auth.getUser();
    if (!user || !activeFriendId) return;
    try {
      var client = getSupabase();
      if (!client) return;
      client.channel('typing:' + activeFriendId + ':' + user.id)
        .track({ user_id: user.id });
    } catch (e) { /* noop */ }
  }

  function handleTypingInput() {
    if (!_isTyping) { _isTyping = true; broadcastTyping(); }
    if (_typingTimeout) clearTimeout(_typingTimeout);
    _typingTimeout = setTimeout(function () { _isTyping = false; }, 2000);
  }

  /* -----------------------------------------------------
     Render messages (Discord-style: grouped, from both sides)
     ----------------------------------------------------- */
  function renderMessages() {
    var container = document.getElementById('chat-messages');
    if (!container) return;
    var user = window.S.auth.getUser();
    if (!user || !activeFriendId) {
      container.innerHTML = '<div class="messages-spacer"></div>' +
        '<div class="empty-state"><div class="empty-icon">' + window.S.icons.message + '</div>' +
        '<div class="empty-title">Выберите диалог</div>' +
        '<div class="empty-text">Выберите чат слева, чтобы начать общение</div></div>';
      return;
    }
    if (messages.length === 0) {
      container.innerHTML = '<div class="messages-spacer"></div>' +
        '<div class="empty-state"><div class="empty-icon">' + window.S.icons.message + '</div>' +
        '<div class="empty-title">Начните диалог</div>' +
        '<div class="empty-text">Отправьте первое сообщение!</div></div>';
      return;
    }

    var grouped = [];
    var last = null;
    messages.forEach(function (msg) {
      var diff = last && last.msgs.length > 0
        ? (new Date(msg.created_at) - new Date(last.msgs[last.msgs.length - 1].created_at))
        : Infinity;
      if (!last || last.sender_id !== msg.sender_id || diff > 300000) {
        last = { sender_id: msg.sender_id, msgs: [msg] };
        grouped.push(last);
      } else {
        last.msgs.push(msg);
      }
    });

    var html = '<div class="messages-spacer"></div>';
    var lastDate = '';
    grouped.forEach(function (g) {
      var m0 = g.msgs[0];
      var isOwn = m0.sender_id === user.id;
      var profile = isOwn ? window.S.auth.getProfile() : activeFriendProfile;
      var uname = profile ? profile.username : (isOwn ? 'Вы' : 'Пользователь');
      var avatarUrl = profile ? profile.avatar_url : '';
      var dateLabel = window.S.utils.getDateHeader(m0.created_at);

      if (dateLabel !== lastDate) {
        html += '<div class="date-divider"><span>' + window.S.utils.escapeHtml(dateLabel) + '</span></div>';
        lastDate = dateLabel;
      }

      html += '<div class="msg-group ' + (isOwn ? 'msg-group--own' : '') + '">' +
        '<div class="msg-avatar">' + window.S.utils.createAvatarHTML(uname, avatarUrl, 40) + '</div>' +
        '<div class="msg-body">' +
        '<div class="msg-header">' +
        '<span class="msg-author">' + window.S.utils.escapeHtml(uname) + '</span>' +
        '<span class="msg-time">' + window.S.utils.formatTime(m0.created_at) + '</span>' +
        '</div>';

      g.msgs.forEach(function (msg) {
        var escaped = window.S.utils.escapeHtml(msg.content);
        var isOwnMsg = msg.sender_id === user.id;
        var rHTML = renderReactions(msg);
        html += '<div class="msg-line" data-msg-id="' + msg.id + '">' +
          '<div class="msg-text">' + escaped + '</div>' +
          '<div class="msg-hover-actions">' +
          '<button class="msg-action" data-action="react" data-msg-id="' + msg.id + '" title="Реакция">' + window.S.icons.smile + '</button>' +
          (isOwnMsg ? '<button class="msg-action msg-action--danger" data-action="delete" data-msg-id="' + msg.id + '" title="Удалить">' + window.S.icons.trash + '</button>' : '') +
          '</div></div>';
        if (rHTML) html += '<div class="msg-reactions">' + rHTML + '</div>';
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
    scrollToBottom();
    bindMessageActions();
  }

  function renderReactions(msg) {
    var r = msg.reactions || {};
    var user = window.S.auth.getUser();
    var html = '';
    Object.keys(r).forEach(function (emoji) {
      var ids = r[emoji];
      if (!ids || ids.length === 0) return;
      var active = user && ids.indexOf(user.id) > -1;
      html += '<button class="reaction ' + (active ? 'reaction--active' : '') + '" data-msg-id="' + msg.id + '" data-emoji="' + emoji + '">' +
        emoji + ' <span>' + ids.length + '</span></button>';
    });
    return html;
  }

  function bindMessageActions() {
    var container = document.getElementById('chat-messages');
    if (!container) return;
    container.querySelectorAll('.msg-line').forEach(function (el) {
      el.addEventListener('mouseenter', function () { el.classList.add('msg-line--hover'); });
      el.addEventListener('mouseleave', function () { el.classList.remove('msg-line--hover'); });
    });
    container.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); deleteMessage(btn.getAttribute('data-msg-id')); });
    });
    container.querySelectorAll('[data-action="react"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var msgId = btn.getAttribute('data-msg-id');
        window.S.ui.showEmojiPicker(btn, function (emoji) { addReaction(msgId, emoji); });
      });
    });
    container.querySelectorAll('.reaction').forEach(function (chip) {
      chip.addEventListener('click', function () {
        addReaction(chip.getAttribute('data-msg-id'), chip.getAttribute('data-emoji'));
      });
    });
  }

  function scrollToBottom() {
    var c = document.getElementById('chat-messages');
    if (c) requestAnimationFrame(function () { c.scrollTop = c.scrollHeight; });
  }

  async function markRead(friendId) {
    var user = window.S.auth.getUser();
    if (!user || !friendId) return;
    try {
      var client = getSupabase();
      if (!client) return;
      await client.from('messages').update({ read: true }).eq('sender_id', friendId).eq('receiver_id', user.id).eq('read', false);
    } catch (e) { /* noop */ }
  }

  function subscribeRealtime() {
    if (_subscribed) return;
    try {
      var client = getSupabase();
      if (!client) return;
      _channel = client.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, function (payload) {
          var msg = payload.new;
          if (window.S.chat.activeFriendId &&
            (msg.sender_id === window.S.chat.activeFriendId || msg.receiver_id === window.S.chat.activeFriendId)) {
            window.S.chat.appendMessage(msg);
            var user = window.S.auth.getUser();
            if (user && msg.sender_id === window.S.chat.activeFriendId) markRead(window.S.chat.activeFriendId);
          }
          if (window.S.app && window.S.app.refreshConversations) window.S.app.refreshConversations();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, function (payload) {
          var msg = payload.new;
          if (window.S.chat.activeFriendId &&
            (msg.sender_id === window.S.chat.activeFriendId || msg.receiver_id === window.S.chat.activeFriendId)) {
            var idx = messages.findIndex(function (m) { return m.id === msg.id; });
            if (idx > -1) {
              if (msg.reactions && typeof msg.reactions === 'string') { try { msg.reactions = JSON.parse(msg.reactions); } catch (e) { msg.reactions = {}; } }
              messages[idx] = msg;
              renderMessages();
            }
          }
        }).subscribe();
      _subscribed = true;
    } catch (e) { console.warn('[SentCor] chat realtime:', e.message); }
  }

  function unsubscribeRealtime() {
    if (_channel && getSupabase()) { try { getSupabase().removeChannel(_channel); } catch (e) { /* noop */ } }
    _channel = null; _subscribed = false;
  }

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