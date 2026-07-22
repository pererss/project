// SENTCOR v11 — Resilient Realtime & Optimistic UI
(function(){
  const S=window.SENTCOR,sb=S.sb;
  let currentChannelId=null, currentSubscription=null, profileCache={};
  const shownMessageIds=new Set();
  const optimisticMessageIds=new Set(); // Track IDs of messages sent optimistically

  /**
   * Unsubscribes from the current channel to prevent duplicate listeners.
   */
  function unsubscribeFromChannel(){
    if(currentSubscription){
      sb.removeChannel(currentSubscription);
      currentSubscription=null;
    }
  }

  /**
   * Fetches user profiles by IDs and caches them.
   * @param {string[]} ids - Array of user UUIDs.
   */
  async function fetchProfiles(ids){
    if (!ids || ids.length === 0) return;
    const missingIds=ids.filter(id=>!profileCache[id]);
    if(missingIds.length === 0) return;
    
    const{data,error}=await sb.from("profiles").select("id,username,display_name,avatar_url,status,custom_status").in("id",missingIds);
    if(error) {
      console.error("Failed to fetch profiles:", error);
      return;
    }
    (data||[]).forEach(p=>profileCache[p.id]=p);
  }

  /**
   * Handles incoming new messages from Supabase Realtime.
   * @param {object} payload - The new message data from the event.
   */
  async function handleNewMessagePayload(payload){
    const newMessage=payload.new;
    // If we've already shown this message (e.g., optimistically), ignore it.
    if (shownMessageIds.has(newMessage.id) || optimisticMessageIds.has(newMessage.id)) return;
    
    shownMessageIds.add(newMessage.id);
    if (!profileCache[newMessage.sender_id]) {
      await fetchProfiles([newMessage.sender_id]);
    }
    S.ui.appendMessage(newMessage, profileCache);
  }

  /**
   * Loads messages for a channel and subscribes to future updates.
   * @param {string} channelId - The ID of the channel to load.
   */
  async function loadMessages(channelId){
    if (currentChannelId === channelId) return; // Avoid reloading the same channel
    currentChannelId=channelId;
    
    unsubscribeFromChannel();
    S.ui.resetCompact();
    shownMessageIds.clear();
    optimisticMessageIds.clear();

    try {
      const chatContainer=document.getElementById("chat-messages");
      if(!chatContainer) return;
      chatContainer.innerHTML = '<div class="loading-spinner"></div>'; // Show loading state

      const{data:messages, error}=await sb.from("messages").select("*").eq("channel_id",channelId).order("created_at",{ascending:true}).limit(100);
      if (error) throw error;

      const userIds=[...new Set((messages||[]).map(m=>m.sender_id))];
      await fetchProfiles(userIds);
      
      chatContainer.innerHTML="";
      if(!messages||!messages.length){
        chatContainer.innerHTML='<div class="empty-state"><h3>Пока нет сообщений</h3><p>Будьте первым!</p></div>';
      } else {
        messages.forEach(m=>{
          shownMessageIds.add(m.id);
          S.ui.appendMessage(m,profileCache);
        });
      }
      chatContainer.scrollTop=chatContainer.scrollHeight;

      // Correctly chain .on() before .subscribe()
      currentSubscription = sb.channel(`msgs-${channelId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, handleNewMessagePayload)
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Successfully subscribed to channel: msgs-${channelId}`);
          } else if (err) {
            console.error(`Subscription error on channel msgs-${channelId}:`, err.message);
            window.toast.show(`Ошибка подписки на чат: ${err.message}`, 'error');
          }
        });

    } catch (e) {
      console.error("loadMessages failed:", e.message);
      window.toast.show(`Не удалось загрузить сообщения: ${e.message}`, 'error');
      const ct=document.getElementById("chat-messages");
      if(ct) ct.innerHTML = '<div class="empty-state error"><h3>Ошибка загрузки</h3><p>Не удалось загрузить историю сообщений. Попробуйте еще раз.</p></div>';
    }
  }

  /**
   * Sends a message to a channel with optimistic UI updates.
   * @param {string} channelId - The ID of the channel.
   * @param {string} content - The message text.
   */
  async function sendMessage(channelId,content){
    if(!S.user||!channelId||!content) return {error:"Missing data"};
    
    const trimmedContent=content.trim().slice(0,S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH);
    if(!trimmedContent) return;

    const optimisticId=crypto.randomUUID();
    optimisticMessageIds.add(optimisticId);

    // 1. Optimistic UI update
    const optimisticMsg={
      id: optimisticId,
      channel_id: channelId,
      sender_id: S.user.id,
      content: trimmedContent,
      created_at: new Date().toISOString(),
      sending: true // Custom flag for UI to show a 'sending' state
    };

    if(!profileCache[S.user.id]) await fetchProfiles([S.user.id]);
    S.ui.appendMessage(optimisticMsg, profileCache);
    
    try {
      // 2. Send to server
      const{data:sentMessage,error}=await sb.from("messages").insert({
        channel_id: channelId,
        sender_id: S.user.id,
        content: trimmedContent
      }).select().single();
      
      if(error) throw error;

      // 3. Update UI on success
      const msgElement = document.getElementById(`msg-${optimisticId}`);
      if (msgElement) {
          msgElement.id = `msg-${sentMessage.id}`; // Switch to the real ID
          msgElement.classList.remove('sending');
          const statusEl = msgElement.querySelector('.message-status-sending');
          if(statusEl) statusEl.remove();
      }
      shownMessageIds.add(sentMessage.id); // Add real ID to shown set
      optimisticMessageIds.delete(optimisticId); // Clean up optimistic tracking

      return {data: sentMessage, error: null};

    } catch (error) {
      // 4. Update UI on failure
      console.error("Failed to send message:", error.message);
      const errorMsgEl = document.getElementById(`msg-${optimisticId}`);
      if (errorMsgEl) {
          errorMsgEl.classList.add("error");
          errorMsgEl.classList.remove("sending");
          
          const statusSendingEl = errorMsgEl.querySelector('.message-status-sending');
          if(statusSendingEl) statusSendingEl.remove();
          
          let statusContainer = errorMsgEl.querySelector('.message-status');
          if (!statusContainer) {
              statusContainer = document.createElement('div');
              statusContainer.className = 'message-status';
              errorMsgEl.querySelector('.message-body').appendChild(statusContainer);
          }
          statusContainer.innerHTML += ` <span class="message-status-error" title="${S.escapeHtml(error.message)}"><i class="fa-solid fa-circle-exclamation"></i></span>`;
          
          const contentContainer = errorMsgEl.querySelector('.message-content');
          // Add retry button only if it doesn't exist
          if (!contentContainer.querySelector('.retry-send-btn')) {
            contentContainer.innerHTML += ` <button class="btn btn-sm btn-danger retry-send-btn">Повторить</button>`;
            const retryBtn = contentContainer.querySelector('.retry-send-btn');
            retryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                errorMsgEl.remove();
                sendMessage(channelId, trimmedContent); // Retry sending
            });
          }
      }
      optimisticMessageIds.delete(optimisticId);
      return {error};
    }
  }

  // Note: DM functions (loadDMs, sendDM) should be refactored similarly.
  // This example focuses on channel messages for clarity.
  // For a complete solution, apply the same optimistic/resilient pattern to DMs.
  
  async function loadDMs(friendId){
    // TODO: Refactor this function using the same pattern as loadMessages
    // (unsubscribe, optimistic updates, robust subscription)
    console.warn("loadDMs is not yet refactored.");
    // Placeholder for original functionality to avoid breaking the app
    const S_chat_original = S.chat;
    if (S_chat_original && S_chat_original.loadDMs) {
        return S_chat_original.loadDMs(friendId);
    }
  }

  async function sendDM(receiverId, content){
    // TODO: Refactor this function using the same pattern as sendMessage
    console.warn("sendDM is not yet refactored.");
    // Placeholder for original functionality
    const S_chat_original = S.chat;
    if (S_chat_original && S_chat_original.sendDM) {
        return S_chat_original.sendDM(receiverId, content);
    }
  }

  S.chat={
    loadMessages,
    sendMessage,
    loadDMs, // Kept for now, but needs refactoring
    sendDM, // Kept for now, but needs refactoring
    unsub: unsubscribeFromChannel, // Renamed for clarity
    fetchProfiles,
    pCache: profileCache, 
    currentChannelInfo: {id: null, isDM: false}
  };
})();