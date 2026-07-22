// SENTCOR v12 — High-Performance Chat Core
(function() {
    "use strict";

    const S = window.SENTCOR;
    const sb = S.sb;

    let currentChannelId = null;
    let currentSubscription = null;
    let profileCache = {};
    const shownMessageIds = new Set();
    const optimisticMessageIds = new Set();

    function unsubscribeFromChannel() {
        if (currentSubscription) {
            sb.removeChannel(currentSubscription);
            currentSubscription = null;
            console.log("Unsubscribed from channel.");
        }
    }

    async function fetchProfiles(ids) {
        const missingIds = [...new Set(ids.filter(id => id && !profileCache[id]))];
        if (missingIds.length === 0) return;

        try {
            const { data, error } = await sb.from("profiles").select("id,username,display_name,avatar_url,status").in("id", missingIds);
            if (error) throw error;
            (data || []).forEach(p => profileCache[p.id] = p);
        } catch (error) {
            console.error("Failed to fetch profiles:", error);
        }
    }

    function handleNewMessagePayload(payload, isDM = false) {
        const newMessage = payload.new;
        if (shownMessageIds.has(newMessage.id) || optimisticMessageIds.has(newMessage.id)) {
            return;
        }
        
        shownMessageIds.add(newMessage.id);
        
        fetchProfiles([newMessage.sender_id]).then(() => {
            S.ui.appendMessage(newMessage, profileCache, isDM);
        });
    }

    async function loadChat(id, isDM = false) {
        if (currentChannelId === id) return;
        currentChannelId = id;
        S.chat.currentChannelInfo = { id, isDM };

        unsubscribeFromChannel();
        S.ui.resetCompact();
        shownMessageIds.clear();
        optimisticMessageIds.clear();

        const chatContainer = document.getElementById("chat-messages");
        if (!chatContainer) return;
        chatContainer.innerHTML = '<div class="loading-spinner"></div>';

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

            chatContainer.innerHTML = "";
            
            // Use DocumentFragment for performance
            const fragment = document.createDocumentFragment();
            if (!messages || messages.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = `<h3>${isDM ? 'Начните общение!' : 'Пока нет сообщений'}</h3><p>${isDM ? 'Это начало вашей переписки.' : 'Будьте первым!'}</p>`;
                fragment.appendChild(emptyState);
            } else {
                messages.forEach(m => {
                    shownMessageIds.add(m.id);
                    // S.ui.appendMessage will now return a DOM element
                    fragment.appendChild(S.ui.createMessageElement(m, profileCache, isDM));
                });
            }
            chatContainer.appendChild(fragment);
            chatContainer.scrollTop = chatContainer.scrollHeight;

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
                        console.log(`Successfully subscribed to ${channelName}`);
                    } else if (err) {
                        console.error(`Subscription error on ${channelName}:`, err.message);
                        S.toast.show(`Ошибка подписки на чат: ${err.message}`, 'error');
                    }
                });

        } catch (e) {
            console.error(`loadChat failed for ${isDM ? 'DM' : 'channel'} ${id}:`, e.message);
            S.toast.show(`Не удалось загрузить чат: ${e.message}`, 'error');
            chatContainer.innerHTML = '<div class="empty-state error"><h3>Ошибка загрузки</h3><p>Не удалось загрузить историю сообщений.</p></div>';
        }
    }

    async function sendMessage(content) {
        const { id: targetId, isDM } = S.chat.currentChannelInfo;
        if (!S.user || !targetId || !content) return { error: "Missing data" };

        const trimmedContent = content.trim().slice(0, S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH);
        if (!trimmedContent) return;

        const optimisticId = crypto.randomUUID();
        optimisticMessageIds.add(optimisticId);

        const optimisticMsg = {
            id: optimisticId,
            sender_id: S.user.id,
            content: trimmedContent,
            created_at: new Date().toISOString(),
            sending: true
        };
        
        if (isDM) {
            optimisticMsg.receiver_id = targetId;
        } else {
            optimisticMsg.channel_id = targetId;
        }

        if (!profileCache[S.user.id]) await fetchProfiles([S.user.id]);
        S.ui.appendMessage(optimisticMsg, profileCache, isDM);

        try {
            const tableName = isDM ? "direct_messages" : "messages";
            const insertData = {
                sender_id: S.user.id,
                content: trimmedContent
            };
            if (isDM) {
                insertData.receiver_id = targetId;
            } else {
                insertData.channel_id = targetId;
            }

            const { data: sentMessage, error } = await sb.from(tableName).insert(insertData).select().single();
            if (error) throw error;

            S.ui.updateMessageStatus(optimisticId, sentMessage.id, 'sent');
            shownMessageIds.add(sentMessage.id);
            optimisticMessageIds.delete(optimisticId);

            return { data: sentMessage, error: null };

        } catch (error) {
            console.error("Failed to send message:", error.message);
            S.ui.updateMessageStatus(optimisticId, optimisticId, 'error', error.message);
            optimisticMessageIds.delete(optimisticId);
            return { error };
        }
    }

    S.chat = {
        loadMessages: (channelId) => loadChat(channelId, false),
        loadDMs: (friendId) => loadChat(friendId, true),
        sendMessage,
        unsub: unsubscribeFromChannel,
        fetchProfiles,
        pCache: profileCache,
        currentChannelInfo: { id: null, isDM: false }
    };
})();