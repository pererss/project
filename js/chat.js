// ============================================================
// SENTCOR — Chat Module (Supabase Realtime Messages)
// ============================================================
(function () {
  "use strict";

  const S = window.SENTCOR;

  // --- STATE ---
  let currentChannelId = null;
  let messageSubscription = null;
  let profilesCache = {};

  // --- LOAD MESSAGES FOR CHANNEL ---
  async function loadMessages(channelId) {
    currentChannelId = channelId;

    // Unsubscribe from previous channel
    unsubscribeFromChannel();

    // Fetch recent messages (last 50)
    const { data: messages, error } = await S.sb
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Load messages error:", error.message);
      return;
    }

    // Collect unique sender IDs and fetch profiles
    const senderIds = [...new Set(messages.map((m) => m.sender_id))];
    await fetchProfilesBatch(senderIds);

    // Clear chat messages container and re-render
    const container = document.getElementById("chat-messages");
    if (container) {
      container.innerHTML = "";
      if (messages.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3>Пока нет сообщений</h3>
            <p>Будьте первым, кто напишет сюда!</p>
          </div>`;
      } else {
        messages.forEach((msg) => S.ui.appendMessage(msg, profilesCache));
      }
      container.scrollTop = container.scrollHeight;
    }

    // Subscribe to new messages in this channel
    subscribeToChannel(channelId);
  }

  // --- SUBSCRIBE TO REALTIME ---
  function subscribeToChannel(channelId) {
    messageSubscription = S.sb
      .channel(`messages-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const msg = payload.new;
          // Fetch sender profile if not cached
          if (!profilesCache[msg.sender_id]) {
            await fetchProfilesBatch([msg.sender_id]);
          }
          // Only append if we're still on the same channel
          if (currentChannelId === channelId) {
            S.ui.appendMessage(msg, profilesCache);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to channel ${channelId}`);
        }
        if (status === "CHANNEL_ERROR") {
          console.error(`Realtime error for channel ${channelId}`);
        }
      });
  }

  function unsubscribeFromChannel() {
    if (messageSubscription) {
      S.sb.removeChannel(messageSubscription).catch(() => {});
      messageSubscription = null;
    }
  }

  // --- FETCH PROFILES BATCH ---
  async function fetchProfilesBatch(userIds) {
    const missing = userIds.filter((id) => !profilesCache[id]);
    if (missing.length === 0) return;

    const { data, error } = await S.sb
      .from("profiles")
      .select("id, username, display_name, avatar_url, status")
      .in("id", missing);

    if (error) {
      console.error("Fetch profiles batch error:", error.message);
      return;
    }

    (data || []).forEach((p) => {
      profilesCache[p.id] = p;
    });
  }

  // --- SEND MESSAGE ---
  async function sendMessage(channelId, content) {
    if (!S.user || !channelId || !content) {
      return { error: "Missing data" };
    }

    const { data, error } = await S.sb.from("messages").insert({
      channel_id: channelId,
      sender_id: S.user.id,
      content: content.trim().slice(0, S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH),
    });

    return { data, error };
  }

  // --- LOAD DIRECT MESSAGES ---
  async function loadDirectMessages(friendId) {
    currentChannelId = null;
    unsubscribeFromChannel();

    // Fetch messages between current user and friend
    const { data: messages, error } = await S.sb
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${S.user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${S.user.id})`)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Load DMs error:", error.message);
      return;
    }

    const senderIds = [...new Set(messages.map((m) => m.sender_id))];
    await fetchProfilesBatch(senderIds);

    const container = document.getElementById("chat-messages");
    if (container) {
      container.innerHTML = "";
      if (messages.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3>Начните общение!</h3>
            <p>Здесь будут ваши личные сообщения.</p>
          </div>`;
      } else {
        messages.forEach((msg) => S.ui.appendMessage(msg, profilesCache));
      }
      container.scrollTop = container.scrollHeight;
    }

    // Subscribe to new DMs
    subscribeToDMs(friendId);
  }

  function subscribeToDMs(friendId) {
    messageSubscription = S.sb
      .channel(`dms-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=eq.${friendId}`,
        },
        async (payload) => {
          const msg = payload.new;
          if (!profilesCache[msg.sender_id]) {
            await fetchProfilesBatch([msg.sender_id]);
          }
          S.ui.appendMessage(msg, profilesCache);
        }
      )
      .subscribe();
  }

  // --- SEND DIRECT MESSAGE ---
  async function sendDirectMessage(receiverId, content) {
    if (!S.user || !receiverId || !content) {
      return { error: "Missing data" };
    }

    const { data, error } = await S.sb.from("direct_messages").insert({
      sender_id: S.user.id,
      receiver_id: receiverId,
      content: content.trim().slice(0, S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH),
    });

    return { data, error };
  }

  // --- EXPORT ---
  S.chat = {
    loadMessages,
    sendMessage,
    loadDirectMessages,
    sendDirectMessage,
    subscribeToChannel,
    subscribeToDMs,
    unsubscribeFromChannel,
    fetchProfilesBatch,
    profilesCache,
  };
})();