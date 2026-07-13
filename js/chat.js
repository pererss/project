// ============================================================
// SENTCOR — Chat Module v2
// ============================================================
(function () {
  "use strict";
  const S = window.SENTCOR;
  const sb = S.sb;
  let currentChannelId = null;
  let messageSubscription = null;
  let profilesCache = {};

  async function loadMessages(channelId) {
    currentChannelId = channelId;
    unsubscribe();
    const { data: messages } = await sb.from("messages").select("*").eq("channel_id", channelId).order("created_at", { ascending: true }).limit(50);
    const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
    await fetchProfilesBatch(senderIds);
    const container = document.getElementById("chat-messages");
    if (container) {
      container.innerHTML = "";
      if (!messages || messages.length === 0) container.innerHTML = '<div class="empty-state"><h3>Пока нет сообщений</h3><p>Будьте первым!</p></div>';
      else messages.forEach(msg => S.ui.appendMessage(msg, profilesCache));
      container.scrollTop = container.scrollHeight;
    }
    subscribeToChannel(channelId);
  }

  function subscribeToChannel(channelId) {
    messageSubscription = sb.channel(`msgs-${channelId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` }, async payload => {
      const msg = payload.new;
      if (!profilesCache[msg.sender_id]) await fetchProfilesBatch([msg.sender_id]);
      if (currentChannelId === channelId) S.ui.appendMessage(msg, profilesCache);
    }).subscribe();
  }

  function unsubscribe() {
    if (messageSubscription) { sb.removeChannel(messageSubscription).catch(() => {}); messageSubscription = null; }
  }

  async function fetchProfilesBatch(ids) {
    const missing = ids.filter(id => !profilesCache[id]);
    if (!missing.length) return;
    const { data } = await sb.from("profiles").select("id, username, display_name, avatar_url, status").in("id", missing);
    (data || []).forEach(p => { profilesCache[p.id] = p; });
  }

  async function sendMessage(channelId, content) {
    if (!S.user || !channelId || !content) return { error: "Missing data" };
    const { data, error } = await sb.from("messages").insert({ channel_id: channelId, sender_id: S.user.id, content: content.trim().slice(0, S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH) });
    return { data, error };
  }

  async function loadDirectMessages(friendId) {
    currentChannelId = null; unsubscribe();
    const { data: messages } = await sb.from("direct_messages").select("*").or(`and(sender_id.eq.${S.user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${S.user.id})`).order("created_at", { ascending: true }).limit(100);
    const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
    await fetchProfilesBatch(senderIds);
    const container = document.getElementById("chat-messages");
    if (container) {
      container.innerHTML = "";
      if (!messages || messages.length === 0) container.innerHTML = '<div class="empty-state"><h3>Начните общение!</h3><p>Здесь будут личные сообщения.</p></div>';
      else messages.forEach(msg => S.ui.appendMessage(msg, profilesCache));
      container.scrollTop = container.scrollHeight;
    }
    subscribeToDMs(friendId);
  }

  function subscribeToDMs(friendId) {
    messageSubscription = sb.channel(`dms-${friendId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `sender_id=eq.${friendId}` }, async payload => {
      const msg = payload.new;
      if (!profilesCache[msg.sender_id]) await fetchProfilesBatch([msg.sender_id]);
      S.ui.appendMessage(msg, profilesCache);
    }).subscribe();
  }

  async function sendDirectMessage(receiverId, content) {
    if (!S.user || !receiverId || !content) return { error: "Missing data" };
    const { data, error } = await sb.from("direct_messages").insert({ sender_id: S.user.id, receiver_id: receiverId, content: content.trim().slice(0, S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH) });
    return { data, error };
  }

  S.chat = { loadMessages, sendMessage, loadDirectMessages, sendDirectMessage, unsubscribe, fetchProfilesBatch, profilesCache };
})();