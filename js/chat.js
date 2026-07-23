/* =====================================================
   SentCor — Chat Module
   ===================================================== */
window.S = window.S || {};
window.S.chat = window.S.chat || {};

(function () {
  var supabase = null;
  var activeFriendId = null;
  var messages = [];
  var _channel = null;
  var _subscribed = false;

  function getSupabase() {
    if (!supabase && window.S && window.S.supabase) supabase = window.S.supabase;
    return supabase;
  }

  /* -----------------------------------------------------
     Fetch messages between current user and active friend
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
        .select('id, sender_id, receiver_id, content, created_at, read')
        .or('and(sender_id.eq.' + user.id + ',receiver_id.eq.' + friendId + '),and(sender_id.eq.' + friendId + ',receiver_id.eq.' + user.id + ')')
        .order('created_at', { ascending: true });
      if (res.error) throw res.error;
      messages = res.data || [];
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
     Send a message
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
        read: false
      });
      if (res.error) throw res.error;
      // The message will appear via realtime subscription
    } catch (e) {
      console.error('[SentCor] sendMessage:', e.message);
      window.S.ui.showToast('Не удалось отправить сообщение', 'error');
    }
  }

  /* -----------------------------------------------------
     Append a single message (from realtime or optimistic)
     ----------------------------------------------------- */
  function appendMessage(msg) {
    if (!msg) return;
    // Deduplicate
    var exists = messages.some(function (m) { return m.id === msg.id; });
    if (!exists) {
      messages.push(msg);
      renderMessages();
      scrollToBottom();
    }
  }

  /* -----------------------------------------------------
     Render messages into DOM
     ----------------------------------------------------- */
  function renderMessages() {
    var container = document.getElementById('chat-messages');
    if (!container) return;
    var user = window.S.auth.getUser();
    if (!user || !activeFriendId) {
      container.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">&#128172;</div>' +
        '<div class="empty-title">Выберите диалог</div>' +
        '<div class="empty-text">Выберите чат слева, чтобы начать общение</div>' +
        '</div>';
      return;
    }
    if (messages.length === 0) {
      container.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">&#128172;</div>' +
        '<div class="empty-title">Нет сообщений</div>' +
        '<div class="empty-text">Начните диалог первым!</div>' +
        '</div>';
      return;
    }
    var html = '';
    var lastDate = '';
    messages.forEach(function (msg) {
      var dateLabel = window.S.utils.getDateLabel(msg.created_at);
      if (dateLabel !== lastDate) {
        html += '<div class="date-separator"><span>' + window.S.utils.escapeHtml(dateLabel) + '</span></div>';
        lastDate = dateLabel;
      }
      var isOwn = msg.sender_id === user.id;
      var time = window.S.utils.formatTime(msg.created_at);
      var escaped = window.S.utils.escapeHtml(msg.content);
      html += '<div class="message ' + (isOwn ? 'message--own' : 'message--friend') + '">' +
        '<div class="message-bubble">' +
        '<div class="message-text">' + escaped + '</div>' +
        '<div class="message-time">' + time + '</div>' +
        '</div></div>';
    });
    container.innerHTML = html;
    scrollToBottom();
  }

  function scrollToBottom() {
    var container = document.getElementById('chat-messages');
    if (container) {
      requestAnimationFrame(function () {
        container.scrollTop = container.scrollHeight;
      });
    }
  }

  /* -----------------------------------------------------
     Mark messages as read
     ----------------------------------------------------- */
  async function markRead(friendId) {
    var user = window.S.auth.getUser();
    if (!user || !friendId) return;
    try {
      var client = getSupabase();
      if (!client) return;
      await client
        .from('messages')
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
            // Mark as read if it's from the friend
            var user = window.S.auth.getUser();
            if (user && msg.sender_id === window.S.chat.activeFriendId && msg.receiver_id === user.id) {
              window.S.chat.markRead(window.S.chat.activeFriendId);
            }
          }
          // Update conversation list
          if (window.S.app && window.S.app.refreshConversations) window.S.app.refreshConversations();
        })
        .subscribe();
      _subscribed = true;
    } catch (e) {
      console.warn('[SentCor] chat realtime subscribe:', e.message);
    }
  }

  /* -----------------------------------------------------
     Unsubscribe
     ----------------------------------------------------- */
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
  window.S.chat.markRead = markRead;
  window.S.chat.renderMessages = renderMessages;
  window.S.chat.subscribeRealtime = subscribeRealtime;
  window.S.chat.unsubscribeRealtime = unsubscribeRealtime;
  window.S.chat.setActiveFriend = function (id) {
    activeFriendId = id;
    window.S.chat.activeFriendId = id;
    if (id) markRead(id);
  };
  window.S.chat.getActiveFriend = function () { return activeFriendId; };
  window.S.chat.getMessages = function () { return messages; };
})();