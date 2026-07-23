// SENTCOR v14 — Chat Core with Notifications
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;
    const sb = S.sb;

    let currentChannelId = null;
    let currentSubscription = null;
    let profileCache = {};
    const unreadCounts = {};

    function getChannelIdFromPayload(payload) {
        const newMessage = payload.new;
        if (payload.table === 'direct_messages') {
            // For DMs, the "channel" is the other user's ID
            return newMessage.sender_id === S.user.id ? newMessage.receiver_id : newMessage.sender_id;
        }
        return newMessage.channel_id;
    }

    function showNotification(payload) {
        const newMessage = payload.new;
        const senderId = newMessage.sender_id;

        S.chat.fetchProfiles([senderId]).then(() => {
            const author = profileCache[senderId];
            if (!author) return;

            const content = S.ui.escapeHtml(newMessage.content.substring(0, 100));
            const avatarUrl = S.ui.escapeHtml(author.avatar_url);
            const displayName = S.ui.escapeHtml(author.display_name || author.username);

            const avatar = avatarUrl
                ? `<img src="${avatarUrl}" alt="Avatar" class="toast-avatar">`
                : `<div class="avatar-initials toast-avatar">${displayName.charAt(0).toUpperCase()}</div>`;

            const toastContent = `
                <div class="message-toast">
                    ${avatar}
                    <div class="toast-body">
                        <strong>${displayName}</strong>
                        <p>${content}</p>
                    </div>
                </div>`;

            S.toast.showCustom({
                content: toastContent,
                type: 'message',
                position: 'bottom-right',
                duration: 4000,
                onClick: () => {
                    const channelId = getChannelIdFromPayload(payload);
                    const isDM = payload.table === 'direct_messages';
                    if (isDM) {
                        S.friends.openDM(channelId);
                    } else {
                        S.servers.selectChannel(channelId);
                    }
                }
            });
        });
    }

    function updateUnreadBadges(channelId, isDM) {
        if (!unreadCounts[channelId]) unreadCounts[channelId] = 0;
        unreadCounts[channelId]++;

        const selector = isDM 
            ? `.friend-item[data-friend-id="${channelId}"]`
            : `.sp-item[data-chid="${channelId}"]`;
        
        S.ui.addBadge(selector, unreadCounts[channelId]);

        // Also update the main navigation badge
        const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
        S.ui.addBadge('#nav-chats', totalUnread); // Assuming #nav-chats is the ID of the chats tab
    }

    function handleRealtimeMessageEvent(payload) {
        const newMessage = payload.new;
        if (!newMessage) return;

        const channelId = getChannelIdFromPayload(payload);
        const isDM = payload.table === 'direct_messages';
        const isChatActive = (channelId === currentChannelId);

        if (isChatActive) {
            // If chat is open, just append the message
            S.ui.appendMessage(newMessage, profileCache, isDM);
        } else {
            // If chat is not open, show notification and update badges
            showNotification(payload);
            updateUnreadBadges(channelId, isDM);
        }
    }
    
    async function loadChat(id, isDM = false) {
        if (currentChannelId === id) return;
        
        S.ui.showLoadingScreen();
        currentChannelId = id;
        S.chat.currentChannelInfo = { id, isDM };

        // Clear unread count for this chat
        delete unreadCounts[id];
        const selector = isDM ? `.friend-item[data-friend-id="${id}"]` : `.sp-item[data-chid="${id}"]`;
        S.ui.removeBadge(selector);
        const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
        S.ui.addBadge('#nav-chats', totalUnread);

        // ... (rest of the loadChat logic remains the same)
    }

    // --- Public API ---
    S.chat = {
        loadMessages: (channelId) => loadChat(channelId, false),
        loadDMs: (friendId) => loadChat(friendId, true),
        handleRealtimeMessageEvent,
        // ... other public methods like sendMessage, fetchProfiles etc.
        currentChannelInfo: { id: null, isDM: false },
        pCache: profileCache,
        fetchProfiles: async (ids) => {
            const missingIds = [...new Set(ids.filter(id => id && !profileCache[id]))];
            if (missingIds.length === 0) return;
            const { data, error } = await sb.from("profiles").select("id,username,display_name,avatar_url,status").in("id", missingIds);
            if (error) throw error;
            (data || []).forEach(p => profileCache[p.id] = p);
        }
    };

})();