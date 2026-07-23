// SENTCOR v8.0 — Refactored Friends & Chats Module
(function() {
    "use strict";

    const S = window.SENTCOR;
    if (!S) {
        console.error("SENTCOR core not found!");
        return;
    }
    const sb = S.sb;

    // --- Module State ---
    S.friendsList = [];
    S.pendingRequests = [];
    S.blockedUsers = [];

    // --- Private Functions ---

    /**
     * Fetches all friend-related data (friends, pending requests, blocked users).
     * Uses Promise.all for concurrent fetching and robust error handling.
     */
    async function loadAllFriendData() {
        if (!S.user) {
            console.warn("[Friends] User not logged in. Aborting fetch.");
            return;
        }

        try {
            const userId = S.user.id;
            const [friendsRes, requestsRes, blockedRes] = await Promise.all([
                sb.from("friends").select("friend_id, user_id, muted").or(`user_id.eq.${userId},friend_id.eq.${userId}`),
                sb.from("friend_requests").select("id, sender_id").eq("receiver_id", userId).eq("status", "pending"),
                sb.from("blocked_users").select("blocked_id").eq("blocker_id", userId)
            ]);

            if (friendsRes.error) throw new Error(`Friends fetch failed: ${friendsRes.error.message}`);
            if (requestsRes.error) throw new Error(`Requests fetch failed: ${requestsRes.error.message}`);
            if (blockedRes.error) throw new Error(`Blocked fetch failed: ${blockedRes.error.message}`);

            const friendIds = (friendsRes.data || []).map(f => f.user_id === userId ? f.friend_id : f.user_id);
            const requestIds = (requestsRes.data || []).map(r => r.sender_id);
            const blockedIds = (blockedRes.data || []).map(b => b.blocked_id);
            
            const allProfileIds = [...new Set([...friendIds, ...requestIds, ...blockedIds])];

            if (allProfileIds.length > 0) {
                const { data: profiles, error: profileError } = await sb.from("profiles").select("*").in("id", allProfileIds);
                if (profileError) throw new Error(`Profiles fetch failed: ${profileError.message}`);
                
                const profileMap = new Map((profiles || []).map(p => [p.id, p]));

                const muteMap = new Map((friendsRes.data || []).map(f => [f.user_id === userId ? f.friend_id : f.user_id, f.muted]));
                S.friendsList = friendIds.map(id => ({ ...profileMap.get(id), muted: muteMap.get(id) || false })).filter(Boolean);
                S.pendingRequests = (requestsRes.data || []).map(r => ({ ...r, profile: profileMap.get(r.sender_id) })).filter(r => r.profile);
                S.blockedUsers = blockedIds.map(id => profileMap.get(id)).filter(Boolean);
            } else {
                S.friendsList = [];
                S.pendingRequests = [];
                S.blockedUsers = [];
            }

        } catch (e) {
            console.error("[Friends] loadAllFriendData failed:", e);
            S.toast.show(`Ошибка загрузки данных о друзьях: ${e.message}`, "error");
            S.friendsList = [];
            S.pendingRequests = [];
            S.blockedUsers = [];
        }
    }

    /**
     * Renders the "Chats" page, listing all friends as potential chat partners.
     */
    async function showChatsPage() {
        await loadAllFriendData();
        S.ui.activateNav("chats");
        
        const subPanel = document.getElementById("sub-panel");
        if (subPanel) subPanel.classList.remove("collapsed");

        S.ui.setSubPanelHeader("Чаты");

        let content = `<div class="sp-search-wrapper"><input class="input" id="chat-search" placeholder="Поиск по чатам..."></div>`;
        
        const sortedFriends = [...S.friendsList].sort((a, b) => (a.status === "online" ? -1 : 1) - (b.status === "online" ? -1 : 1));

        if (sortedFriends.length > 0) {
            sortedFriends.forEach(friend => {
                content += S.ui.createFriendRow(friend, 'chat');
            });
        } else {
            content += `<div class="sp-empty-state">У вас пока нет друзей для общения.</div>`;
        }

        S.ui.setSubPanelContent(content);
        S.ui.setMainContent(S.ui.createEmptyState("comment-dots", "Чаты", "Выберите чат с другом из списка слева, чтобы начать общение."));
        S.ui.clearMembers();
        document.title = "Sentcor - Чаты";

        // Add event listeners safely
        document.querySelectorAll(".chat-row").forEach(row => {
            row.onclick = () => openChat(row.dataset.fid);
        });
        const searchInput = document.getElementById("chat-search");
        if (searchInput) {
            searchInput.onkeyup = (e) => {
                const searchTerm = e.target.value.toLowerCase();
                document.querySelectorAll(".chat-row").forEach(row => {
                    const name = row.querySelector('.sp-friend-name').textContent.toLowerCase();
                    row.style.display = name.includes(searchTerm) ? '' : 'none';
                });
            };
        }
    }

    /**
     * Opens a direct message chat with a specific friend.
     */
    function openChat(friendId) {
        const friend = S.friendsList.find(f => f.id === friendId);
        if (!friend) {
            S.toast.show("Не удалось найти этого пользователя.", "error");
            return;
        }
        const friendName = S.escapeHtml(friend.display_name || friend.username);
        S.ui.renderChatView({ type: "dm", receiver_id: friend.id }, true, friendName);
        S.chat.loadChat(friend.id, true);
        document.title = `Sentcor - ${friendName}`;
    }

    /**
     * Renders the main "Friends" management page.
     */
    async function showFriendsPage() {
        await loadAllFriendData();
        S.ui.activateNav("friends");

        const subPanel = document.getElementById("sub-panel");
        if (subPanel) subPanel.classList.remove("collapsed");

        S.ui.setSubPanelHeader("Друзья");

        let content = `<div class="sp-controls"><button class="btn btn-accent-outline" id="add-friend-btn"><i class="fa-solid fa-user-plus"></i> Добавить друга</button></div>`;
        
        // Pending Requests
        if (S.pendingRequests.length > 0) {
            content += `<div class="sp-section-title">ВХОДЯЩИЕ — ${S.pendingRequests.length}</div>`;
            S.pendingRequests.forEach(req => {
                content += S.ui.createRequestRow(req);
            });
        }

        // Friends List
        content += `<div class="sp-section-title">ДРУЗЬЯ — ${S.friendsList.length}</div>`;
        if (S.friendsList.length > 0) {
            const sortedFriends = [...S.friendsList].sort((a, b) => (a.status === "online" ? -1 : 1) - (b.status === "online" ? -1 : 1));
            sortedFriends.forEach(friend => {
                content += S.ui.createFriendRow(friend, 'manage');
            });
        } else {
            content += `<div class="sp-empty-state">Здесь пока никого нет.</div>`;
        }

        // Blocked Users
        if (S.blockedUsers.length > 0) {
            content += `<div class="sp-section-title">ЗАБЛОКИРОВАННЫЕ — ${S.blockedUsers.length}</div>`;
            S.blockedUsers.forEach(user => {
                content += S.ui.createBlockedRow(user);
            });
        }

        S.ui.setSubPanelContent(content);
        S.ui.setMainContent(S.ui.createEmptyState("user-group", "Управление друзьями", "Добавляйте друзей, управляйте запросами и просматривайте свой список контактов."));
        S.ui.clearMembers();
        document.title = "Sentcor - Друзья";

        // Add event listeners safely
        addFriendsPageEventListeners();
    }
    
    /**
     * Safely adds all necessary event listeners for the friends page.
     */
    function addFriendsPageEventListeners() {
        const addFriendBtn = document.getElementById("add-friend-btn");
        if (addFriendBtn) addFriendBtn.onclick = showAddFriendModal;

        document.querySelectorAll(".friend-row[data-fid]").forEach(el => {
            el.onclick = () => openChat(el.dataset.fid);
        });
        document.querySelectorAll(".friend-menu-btn").forEach(btn => {
            btn.onclick = e => {
                e.stopPropagation();
                showFriendContextMenu(btn.dataset.fid, e.clientX, e.clientY);
            };
        });
        document.querySelectorAll(".accept-request-btn").forEach(btn => {
            btn.onclick = e => {
                e.stopPropagation();
                handleFriendRequest(btn.dataset.rid, 'accept');
            };
        });
        document.querySelectorAll(".decline-request-btn").forEach(btn => {
            btn.onclick = e => {
                e.stopPropagation();
                handleFriendRequest(btn.dataset.rid, 'decline');
            };
        });
        document.querySelectorAll(".unblock-user-btn").forEach(btn => {
            btn.onclick = e => {
                e.stopPropagation();
                unblockUser(btn.dataset.uid);
            };
        });
    }

    /**
     * Shows a context menu for a friend with various actions.
     */
    function showFriendContextMenu(friendId, x, y) {
        const friend = S.friendsList.find(f => f.id === friendId);
        if (!friend) return;

        const isBlocked = S.blockedUsers.some(u => u.id === friendId);
        const menuItems = [
            { label: '<i class="fa-solid fa-comment"></i> Написать сообщение', action: () => openChat(friendId) },
            { label: `<i class="fa-solid ${friend.muted ? 'fa-bell' : 'fa-bell-slash'}"></i> ${friend.muted ? 'Включить уведомления' : 'Отключить уведомления'}`, action: () => toggleMute(friendId) },
            { label: `<i class="fa-solid ${isBlocked ? 'fa-lock-open' : 'fa-user-slash'}"></i> ${isBlocked ? 'Разблокировать' : 'Заблокировать'}`, danger: !isBlocked, action: () => isBlocked ? unblockUser(friendId) : blockUser(friendId) },
            { type: 'separator' },
            { label: '<i class="fa-solid fa-user-minus"></i> Удалить из друзей', danger: true, action: () => removeFriend(friendId) }
        ];
        S.ui.showContextMenu(menuItems, x, y);
    }

    // --- Action Functions (CRUD operations) ---

    async function toggleMute(friendId) {
        const friend = S.friendsList.find(f => f.id === friendId);
        if (!friend) return;
        const newMuteStatus = !friend.muted;
        try {
            const { error } = await sb.from("friends").update({ muted: newMuteStatus }).or(`and(user_id.eq.${S.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${S.user.id})`);
            if (error) throw error;
            friend.muted = newMuteStatus;
            S.toast.show(newMuteStatus ? "Уведомления от этого пользователя отключены." : "Уведомления включены.", "info");
            showFriendsPage(); // Refresh view
        } catch (e) {
            S.toast.show(`Не удалось изменить статус уведомлений: ${e.message}`, "error");
        }
    }

    async function removeFriend(friendId) {
        S.ui.confirm("Удалить друга?", "Вы уверены, что хотите удалить этого пользователя из списка друзей? Это действие необратимо.", async () => {
            try {
                const { error } = await sb.from("friends").delete().or(`and(user_id.eq.${S.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${S.user.id})`);
                if (error) throw error;
                S.toast.show("Друг успешно удален.", "success");
                await showFriendsPage(); // Refresh the entire view
            } catch (e) {
                S.toast.show(`Не удалось удалить друга: ${e.message}`, "error");
            }
        });
    }

    async function blockUser(userId) {
        S.ui.confirm("Заблокировать пользователя?", "Этот пользователь не сможет отправлять вам сообщения или запросы в друзья. Вы также будете удалены из его списка друзей.", async () => {
            try {
                // Use an RPC function for transactional integrity if available, otherwise:
                const { error: blockError } = await sb.from("blocked_users").insert({ blocker_id: S.user.id, blocked_id: userId });
                if (blockError) throw blockError;
                
                // Also remove any existing friendship
                await sb.from("friends").delete().or(`and(user_id.eq.${S.user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${S.user.id})`);

                S.toast.show("Пользователь заблокирован.", "success");
                await showFriendsPage();
            } catch (e) {
                S.toast.show(`Не удалось заблокировать пользователя: ${e.message}`, "error");
            }
        });
    }

    async function unblockUser(userId) {
        try {
            const { error } = await sb.from("blocked_users").delete().eq("blocker_id", S.user.id).eq("blocked_id", userId);
            if (error) throw error;
            S.toast.show("Пользователь разблокирован.", "success");
            await showFriendsPage();
        } catch (e) {
            S.toast.show(`Не удалось разблокировать пользователя: ${e.message}`, "error");
        }
    }

    async function handleFriendRequest(requestId, action) {
        const request = S.pendingRequests.find(r => r.id == requestId);
        if (!request) return;

        try {
            if (action === 'accept') {
                const { error } = await sb.rpc('accept_friend_request', { request_id: requestId });
                if (error) throw error;
                S.toast.show("Запрос в друзья принят!", "success");
            } else { // decline
                const { error } = await sb.from("friend_requests").delete().eq("id", requestId);
                if (error) throw error;
                S.toast.show("Запрос отклонен.", "info");
            }
            await showFriendsPage();
        } catch (e) {
            S.toast.show(`Ошибка обработки запроса: ${e.message}`, "error");
        }
    }

    function showAddFriendModal() {
        const modalContent = `
            <div class="input-group">
                <label for="af-user" class="input-label">Имя пользователя</label>
                <input class="input" id="af-user" placeholder="Введите точное имя пользователя..." autocomplete="off">
                <div class="input-error" id="af-error"></div>
            </div>
        `;
        S.ui.showModal("Добавить в друзья", modalContent, [
            { text: "Отмена", cls: "btn-secondary" },
            { text: "Отправить запрос", cls: "btn-primary", onClick: async (modal) => {
                const input = modal.querySelector("#af-user");
                const errorDiv = modal.querySelector("#af-error");
                const username = input.value.trim();

                if (!username) {
                    errorDiv.textContent = "Имя пользователя не может быть пустым.";
                    return false; // Prevent modal from closing
                }
                
                const success = await sendFriendRequest(username);
                if (!success) {
                    errorDiv.textContent = `Не удалось отправить запрос. Проверьте имя пользователя.`;
                    return false; // Prevent modal from closing
                }
                // On success, the modal will close automatically
            }}
        ]);
    }

    async function sendFriendRequest(username) {
        try {
            const { data: targetUser, error: findError } = await sb.from("profiles").select("id").eq("username", username).single();
            if (findError || !targetUser) {
                S.toast.show("Пользователь с таким именем не найден.", "error");
                return false;
            }
            if (targetUser.id === S.user.id) {
                S.toast.show("Вы не можете добавить в друзья самого себя.", "warning");
                return false;
            }

            const { error } = await sb.from("friend_requests").insert({ sender_id: S.user.id, receiver_id: targetUser.id });
            if (error) {
                // 23505 is the unique constraint violation code
                if (error.code === '23505') {
                    S.toast.show("Вы уже отправили запрос этому пользователю.", "info");
                } else {
                    throw error;
                }
            } else {
                S.toast.show("Запрос в друзья успешно отправлен!", "success");
            }
            return true;
        } catch (e) {
            console.error("[Friends] sendFriendRequest failed:", e);
            S.toast.show(`Ошибка при отправке запроса: ${e.message}`, "error");
            return false;
        }
    }

    // --- Expose Public API ---
    S.friends = {
        loadAll: loadAllFriendData,
        showChatsPage,
        showFriendsPage,
        openChat,
    };

})();