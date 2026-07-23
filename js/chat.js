// SENTCOR v13 — Resilient & High-Performance Chat Core
(function() {
    "use strict";

    // Ensure SENTCOR base and Supabase client are ready
    if (!window.SENTCOR || !window.SENTCOR.sb) {
        console.error("[Chat] Critical: SENTCOR base or Supabase client not found.");
        return;
    }

    const S = window.SENTCOR;
    const sb = S.sb;

    // --- Module State ---
    let currentChannelId = null;
    let currentSubscription = null;
    let profileCache = {};
    const shownMessageIds = new Set();
    const optimisticMessageIds = new Set();

    // --- Private Functions ---

    /**
     * Safely unsubscribes from the current real-time channel if one exists.
     */
    function unsubscribeFromChannel() {
        if (currentSubscription) {
            sb.removeChannel(currentSubscription)
                .then(() => console.log(`[Chat] Unsubscribed from channel: ${currentSubscription.topic}`))
                .catch(err => console.error(`[Chat] Failed to unsubscribe: ${err.message}`));
            currentSubscription = null;
        }
    }

    /**
     * Fetches and caches user profiles that are not already in the cache.
     * @param {string[]} ids - An array of user UUIDs to fetch.
     */
    async function fetchProfiles(ids) {
        const missingIds = [...new Set(ids.filter(id => id && !profileCache[id]))];
        if (missingIds.length === 0) return;

        try {
            const { data, error } = await sb.from("profiles").select("id,username,display_name,avatar_url,status").in("id", missingIds);
            if (error) throw error;
            (data || []).forEach(p => profileCache[p.id] = p);
        } catch (error) {
            console.error("[Chat] Failed to fetch profiles:", error);
            S.toast.show("Не удалось загрузить данные пользователей.", "error");
        }
    }

    /**
     * Handles incoming new message payloads from Supabase real-time.
     * @param {object} payload - The Supabase real-time payload.
     * @param {boolean} isDM - Flag indicating if the message is a direct message.
     */
    function handleNewMessagePayload(payload, isDM = false) {
        const newMessage = payload.new;
        if (!newMessage || shownMessageIds.has(newMessage.id) || optimisticMessageIds.has(newMessage.id)) {
            return;
        }
        
        shownMessageIds.add(newMessage.id);
        
        fetchProfiles([newMessage.sender_id]).then(() => {
            S.ui.appendMessage(newMessage, profileCache, isDM);
        });
    }

    /**
     * Loads a chat channel or direct message history.
     * @param {string} id - The channel ID or the other user's ID for DMs.
     * @param {boolean} isDM - Flag to indicate if it's a DM.
     */
    async function loadChat(id, isDM = false) {
        if (currentChannelId === id) return;
        
        S.ui.showLoadingScreen(); // Use UI module to show loading state
        currentChannelId = id;
        S.chat.currentChannelInfo = { id, isDM };

        unsubscribeFromChannel();
        S.ui.resetCompact();
        shownMessageIds.clear();
        optimisticMessageIds.clear();

        try {
            const tableName = isDM ? "direct_messages" : "messages";
            let query = sb.from(tableName).select("*");

            if (isDM) {
                query = query.or(`and(sender_id.eq.${S.user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${S.user.id})`);
            } else {
                query = query.eq("channel_id", id);
            }
            
            const { data: messages, error } = await query.order("created_at", { ascending: true }).limit(100);
            if (error) throw error;

            const userIds = (messages || []).map(m => m.sender_id);
            if (isDM) userIds.push(id);
            await fetchProfiles(userIds);

            S.ui.renderMessages(messages, profileCache, isDM);

            // Subscribe to new messages
            const channelName = isDM ? `dm-${[S.user.id, id].sort().join('-')}` : `msgs-${id}`;
            const table = isDM ? 'direct_messages' : 'messages';
            const filter = isDM 
                ? `or(and(sender_id.eq.${S.user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${S.user.id}))`
                : `channel_id=eq.${id}`;

            currentSubscription = sb.channel(channelName)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, (payload) => handleNewMessagePayload(payload, isDM))
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[Chat] Successfully subscribed to ${channelName}`);
                    } else if (err) {
                        console.error(`[Chat] Subscription error on ${channelName}:`, err.message);
                        S.toast.show(`Ошибка подписки на чат: ${err.message}`, 'error');
                    }
                });

        } catch (e) {
            console.error(`[Chat] loadChat failed for ${isDM ? 'DM' : 'channel'} ${id}:`, e.message);
            S.toast.show(`Не удалось загрузить чат: ${e.message}`, 'error');
            S.ui.renderChatError();
        } finally {
            S.ui.showApp(); // Ensure the main app screen is visible
        }
    }

    /**
     * Sends a message to the current channel or DM.
     * @param {string} content - The text content of the message.
     */
    async function sendMessage(content) {
        const { id: targetId, isDM } = S.chat.currentChannelInfo;
        if (!S.user || !targetId || !content) return { error: "Missing required data for sending message." };

        const trimmedContent = content.trim().slice(0, S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH);
        if (!trimmedContent) return;

        const optimisticId = crypto.randomUUID();
        optimisticMessageIds.add(optimisticId);

        const optimisticMsg = {
            id: optimisticId,
            sender_id: S.user.id,
            content: trimmedContent,
            created_at: new Date().toISOString(),
            sending: true,
            [isDM ? 'receiver_id' : 'channel_id']: targetId
        };

        if (!profileCache[S.user.id]) await fetchProfiles([S.user.id]);
        S.ui.appendMessage(optimisticMsg, profileCache, isDM);

        try {
            const tableName = isDM ? "direct_messages" : "messages";
            const insertData = {
                sender_id: S.user.id,
                content: trimmedContent,
                [isDM ? 'receiver_id' : 'channel_id']: targetId
            };

            const { data: sentMessage, error } = await sb.from(tableName).insert(insertData).select().single();
            if (error) throw error;

            S.ui.updateMessageStatus(optimisticId, sentMessage.id, 'sent');
            shownMessageIds.add(sentMessage.id);
            optimisticMessageIds.delete(optimisticId);

            return { data: sentMessage, error: null };

        } catch (error) {
            console.error("[Chat] Failed to send message:", error.message);
            S.ui.updateMessageStatus(optimisticId, optimisticId, 'error', error.message);
            optimisticMessageIds.delete(optimisticId);
            return { error };
        }
    }

    // --- Public API ---
    S.chat = {
        loadMessages: (channelId) => loadChat(channelId, false),
        loadDMs: (friendId) => loadChat(friendId, true),
        sendMessage,
        unsub: unsubscribeFromChannel,
        fetchProfiles,
        handleRealtimeMessageEvent: (payload) => {
            const newMessage = payload.new;
            if (!newMessage || !S.chat.currentChannelInfo.id) return;
    
            const { id: currentId, isDM: currentIsDM } = S.chat.currentChannelInfo;
            const table = payload.table;
    
            let isForCurrentChannel = false;
            if (table === 'messages' && !currentIsDM && newMessage.channel_id === currentId) {
                isForCurrentChannel = true;
            } else if (table === 'direct_messages' && currentIsDM) {
                const userA = newMessage.sender_id;
                const userB = newMessage.receiver_id;
                if ((userA === S.user.id && userB === currentId) || (userA === currentId && userB === S.user.id)) {
                    isForCurrentChannel = true;
                }
            }
    
            if (isForCurrentChannel) {
                handleNewMessagePayload(payload, table === 'direct_messages');
            }
        },
        pCache: profileCache,
        currentChannelInfo: { id: null, isDM: false }
    };

})();