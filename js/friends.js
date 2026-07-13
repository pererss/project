// ============================================================
// SENTCOR — Friends Module v2
// Sub-panel, friend details, 3-dot menu, block/mute/call
// ============================================================
(function () {
  "use strict";
  const S = window.SENTCOR;
  const sb = S.sb;
  S.friendsList = []; S.pendingRequests = []; S.outgoingRequests = []; S.blockedList = [];
  let currentFriend = null;

  async function showFriendsPage() {
    S.ui.activateNav("friends");
    const sp = document.getElementById("sub-panel"); if (sp) sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader("Друзья");
    await loadAllData();
    renderSubPanel();
  }

  async function loadAllData() {
    if (!S.user) return;
    // Friends list
    const { data: friends } = await sb.from("friends").select("friend_id, user_id, muted").or(`user_id.eq.${S.user.id},friend_id.eq.${S.user.id}`);
    if (friends) {
      const friendIds = friends.map(f => f.user_id === S.user.id ? f.friend_id : f.user_id);
      const muteMap = {}; friends.forEach(f => { const fid = f.user_id === S.user.id ? f.friend_id : f.user_id; muteMap[fid] = f.muted; });
      if (friendIds.length) {
        const { data: profiles } = await sb.from("profiles").select("*").in("id", friendIds);
        S.friendsList = (profiles || []).map(p => ({ ...p, muted: muteMap[p.id] || false }));
      } else S.friendsList = [];
    }
    // Pending incoming
    const { data: pending } = await sb.from("friend_requests").select("id, sender_id").eq("receiver_id", S.user.id).eq("status", "pending");
    if (pending && pending.length) {
      const senderIds = pending.map(r => r.sender_id);
      const { data: profiles } = await sb.from("profiles").select("*").in("id", senderIds);
      const map = {}; (profiles || []).forEach(p => map[p.id] = p);
      S.pendingRequests = pending.map(r => ({ ...r, profile: map[r.sender_id] || {} }));
    } else S.pendingRequests = [];
    // Outgoing
    const { data: outgoing } = await sb.from("friend_requests").select("id, receiver_id").eq("sender_id", S.user.id).eq("status", "pending");
    if (outgoing && outgoing.length) {
      const receiverIds = outgoing.map(r => r.receiver_id);
      const { data: profiles } = await sb.from("profiles").select("*").in("id", receiverIds);
      const map = {}; (profiles || []).forEach(p => map[p.id] = p);
      S.outgoingRequests = outgoing.map(r => ({ ...r, profile: map[r.receiver_id] || {} }));
    } else S.outgoingRequests = [];
    // Blocked
    const { data: blocked } = await sb.from("blocked_users").select("blocked_id").eq("blocker_id", S.user.id);
    if (blocked && blocked.length) {
      const ids = blocked.map(b => b.blocked_id);
      const { data: profiles } = await sb.from("profiles").select("*").in("id", ids);
      S.blockedList = profiles || [];
    } else S.blockedList = [];
  }

  function renderSubPanel() {
    let html = `<div style="padding:8px 12px;"><button class="btn btn-accent-outline" id="add-friend-btn" style="width:100%;justify-content:center;font-weight:700;">+ Добавить друга</button></div>`;
    html += `<div class="sp-section-title">Друзья — ${S.friendsList.length}</div>`;
    const online = S.friendsList.filter(f => f.status === "online" || f.status === "idle" || f.status === "dnd");
    const offline = S.friendsList.filter(f => !online.includes(f));
    [...online, ...offline].forEach(f => {
      const av = f.avatar_url ? `<img src="${f.avatar_url}" />` : (f.display_name || f.username || "?").charAt(0).toUpperCase();
      html += `<div class="sp-item-friend friend-list-item" data-friend-id="${f.id}">
        <div class="avatar avatar-sm">${av}</div>
        <span class="status-dot status-${f.status || "offline"}"></span>
        <span class="friend-name">${S.escapeHtml(f.display_name || f.username)}</span>
        ${f.game_status ? `<span class="friend-game">${S.escapeHtml(f.game_status)}</span>` : ""}
      </div>`;
    });
    if (!S.friendsList.length) html += '<div style="padding:12px 16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет друзей. Добавьте первого!</div>';
    if (S.pendingRequests.length) {
      html += `<div class="sp-section-title">Входящие — ${S.pendingRequests.length}</div>`;
      S.pendingRequests.forEach(r => { const p = r.profile || {}; html += `<div class="sp-item-friend" data-pending-id="${r.id}" style="justify-content:space-between;"><div style="display:flex;align-items:center;gap:8px;"><span class="status-dot status-online"></span><span>${S.escapeHtml(p.username || "?")}</span></div><div style="display:flex;gap:4px;"><button class="btn btn-sm btn-primary accept-req" data-id="${r.id}">✓</button><button class="btn btn-sm btn-danger decline-req" data-id="${r.id}">✕</button></div></div>`; });
    }
    if (S.blockedList.length) {
      html += `<div class="sp-section-title">Заблокированные — ${S.blockedList.length}</div>`;
      S.blockedList.forEach(b => { html += `<div class="sp-item-friend"><span>🚫 ${S.escapeHtml(b.username || "?")}</span><button class="btn btn-sm btn-ghost unblock-btn" data-id="${b.id}" style="margin-left:auto;">Разблок.</button></div>`; });
    }
    S.ui.setSubPanelContent(html);
    bindSubPanelEvents();
  }

  function bindSubPanelEvents() {
    document.getElementById("add-friend-btn").addEventListener("click", showAddFriendModal);
    document.querySelectorAll(".friend-list-item").forEach(el => { el.addEventListener("click", () => openFriendDetail(el.dataset.friendId)); });
    document.querySelectorAll(".accept-req").forEach(el => { el.addEventListener("click", e => { e.stopPropagation(); acceptRequest(el.dataset.id); }); });
    document.querySelectorAll(".decline-req").forEach(el => { el.addEventListener("click", e => { e.stopPropagation(); declineRequest(el.dataset.id); }); });
    document.querySelectorAll(".unblock-btn").forEach(el => { el.addEventListener("click", e => { e.stopPropagation(); unblockUser(el.dataset.id); }); });
  }

  // ---- FRIEND DETAIL VIEW ----
  async function openFriendDetail(friendId) {
    const friend = S.friendsList.find(f => f.id === friendId);
    if (!friend) return;
    currentFriend = friend;
    const isBlocked = S.blockedList.some(b => b.id === friendId);
    const av = friend.avatar_url ? `<img src="${friend.avatar_url}" />` : (friend.display_name || friend.username || "?").charAt(0).toUpperCase();
    const name = friend.display_name || friend.username;
    const stMap = { online: "🟢 В сети", idle: "🟡 Не активен", dnd: "🔴 Не беспокоить", offline: "⚫ Не в сети" };

    let html = `<div style="display:flex;flex-direction:column;height:100%;">
      <div class="friend-detail-header">
        <div class="friend-name">${S.escapeHtml(name)}</div>
        <div class="friend-detail-actions">
          <button class="btn btn-icon btn-ghost btn-sm" id="fd-menu-btn" title="Действия"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
          <button class="btn btn-icon btn-ghost btn-sm" id="fd-close-btn" title="Закрыть"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
      </div>
      <div class="friend-detail-body">
        <div class="friend-detail-card">
          <div class="avatar avatar-lg">${av}</div>
          <div class="detail-name">${S.escapeHtml(name)}</div>
          <div class="detail-status">${stMap[friend.status] || "⚫ Не в сети"}</div>
          ${friend.game_status ? `<div class="detail-game">🎮 ${S.escapeHtml(friend.game_status)}</div>` : ""}
          ${friend.custom_status ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${S.escapeHtml(friend.custom_status)}</div>` : ""}
        </div>
        ${isBlocked ? '<div style="text-align:center;color:var(--red);font-size:13px;font-weight:600;">🚫 Пользователь заблокирован</div>' : `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;"><button class="btn btn-primary btn-sm" id="fd-dm-btn">💬 Личные сообщения</button><button class="btn btn-secondary btn-sm" id="fd-call-btn">📞 Позвонить</button></div>`}
        <div class="chat-messages" id="chat-messages" style="display:none;flex:1;overflow-y:auto;padding:8px 0;"></div>
        <div class="chat-input-area" id="dm-input-area" style="display:none;"></div>
      </div>
    </div>`;

    S.ui.setMainContent(html);
    S.ui.clearMembers();

    // 3-dot menu
    document.getElementById("fd-menu-btn").addEventListener("click", e => {
      e.stopPropagation();
      const items = [
        { label: friend.muted ? "🔔 Включить уведомления" : "🔕 Без звука", action: () => toggleMuteFriend(friendId) },
        { label: "📋 Копировать имя", action: () => { navigator.clipboard.writeText(friend.username); S.ui.toast("Имя скопировано", "info"); } },
        { label: "➕ Добавить на сервер", action: () => showAddToServerModal(friendId) },
        "separator",
        { label: isBlocked ? "✅ Разблокировать" : "🚫 Заблокировать", danger: !isBlocked, action: () => { if (isBlocked) unblockUser(friendId); else blockUser(friendId); } },
        { label: "🗑️ Удалить из друзей", danger: true, action: () => removeFriend(friendId) }
      ];
      const rect = e.target.getBoundingClientRect();
      S.ui.showContextMenu(items, rect.left, rect.bottom);
    });

    document.getElementById("fd-close-btn").addEventListener("click", () => { currentFriend = null; renderSubPanel(); S.ui.showHomePage(); });
    const dmBtn = document.getElementById("fd-dm-btn"); if (dmBtn) dmBtn.addEventListener("click", () => openDMView(friend));
    const callBtn = document.getElementById("fd-call-btn"); if (callBtn) callBtn.addEventListener("click", () => callFriend(friend));
  }

  function openDMView(friend) {
    const msgContainer = document.getElementById("chat-messages");
    const inputArea = document.getElementById("dm-input-area");
    if (!msgContainer || !inputArea) return;
    // Hide card, show chat
    const card = document.querySelector(".friend-detail-card"); if (card) card.style.display = "none";
    document.querySelectorAll(".friend-detail-body > div").forEach(el => { if (el !== msgContainer && el !== inputArea && !el.classList.contains("friend-detail-card")) el.style.display = "none"; });
    msgContainer.style.display = "flex";
    inputArea.style.display = "block";
    inputArea.innerHTML = `<div class="chat-input-wrapper"><textarea id="msg-input" rows="1" placeholder="Напишите сообщение..." maxlength="${S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH}"></textarea><button class="btn btn-icon btn-ghost" id="send-dm-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div>`;
    const ta = document.getElementById("msg-input"), sbtn = document.getElementById("send-dm-btn");
    ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; });
    const send = async () => { const c = ta.value.trim(); if (!c) return; ta.disabled = true; const { error } = await S.chat.sendDirectMessage(friend.id, c); if (error) { S.ui.toast("Ошибка", "error"); ta.disabled = false; } else { ta.value = ""; ta.style.height = "auto"; ta.disabled = false; ta.focus(); } };
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    sbtn.addEventListener("click", send);
    S.chat.loadDirectMessages(friend.id);
  }

  // ---- ACTIONS ----
  async function toggleMuteFriend(friendId) {
    const friend = S.friendsList.find(f => f.id === friendId);
    if (!friend) return;
    const newMuted = !friend.muted;
    await sb.from("friends").update({ muted: newMuted }).eq("user_id", S.user.id).eq("friend_id", friendId);
    friend.muted = newMuted;
    S.ui.toast(newMuted ? "🔕 Уведомления отключены" : "🔔 Уведомления включены", "info");
    openFriendDetail(friendId);
  }

  async function removeFriend(friendId) {
    S.ui.confirm("Удалить друга", "Вы уверены?", async () => {
      await sb.from("friends").delete().eq("user_id", S.user.id).eq("friend_id", friendId);
      await sb.from("friends").delete().eq("user_id", friendId).eq("friend_id", S.user.id);
      S.ui.toast("Друг удалён", "info");
      currentFriend = null;
      await loadAllData();
      renderSubPanel();
      S.ui.showHomePage();
    });
  }

  async function blockUser(userId) {
    S.ui.confirm("Заблокировать", "Заблокированный пользователь не сможет писать вам и видеть ваш онлайн.", async () => {
      await sb.from("blocked_users").insert({ blocker_id: S.user.id, blocked_id: userId });
      // remove from friends
      await sb.from("friends").delete().eq("user_id", S.user.id).eq("friend_id", userId);
      await sb.from("friends").delete().eq("user_id", userId).eq("friend_id", S.user.id);
      S.ui.toast("Пользователь заблокирован", "info");
      currentFriend = null;
      await loadAllData();
      renderSubPanel();
      S.ui.showHomePage();
    });
  }

  async function unblockUser(userId) {
    await sb.from("blocked_users").delete().eq("blocker_id", S.user.id).eq("blocked_id", userId);
    S.ui.toast("Пользователь разблокирован", "success");
    await loadAllData();
    renderSubPanel();
    if (currentFriend && currentFriend.id === userId) openFriendDetail(userId);
  }

  async function callFriend(friend) {
    // 1-on-1 call via LiveKit
    const roomName = `sentcor_call_${[S.user.id, friend.id].sort().join("_")}`;
    S.voice.startDirectCall(friend, roomName);
  }

  async function acceptRequest(requestId) {
    const req = S.pendingRequests.find(r => r.id === requestId); if (!req) return;
    await sb.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
    await sb.from("friends").insert([{ user_id: S.user.id, friend_id: req.sender_id }, { user_id: req.sender_id, friend_id: S.user.id }]);
    S.ui.toast("Заявка принята!", "success");
    await loadAllData();
    renderSubPanel();
  }

  async function declineRequest(requestId) {
    await sb.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
    S.ui.toast("Заявка отклонена", "info");
    await loadAllData();
    renderSubPanel();
  }

  function showAddFriendModal() {
    const body = `<div class="input-group"><label class="input-label">Имя пользователя</label><input class="input" id="af-username" placeholder="Введите username..." maxlength="32" /><div class="input-error" id="af-error"></div></div>`;
    S.ui.showModal("Добавить друга", body, [
      { text: "Отмена", cls: "btn-secondary" },
      { text: "Отправить заявку", cls: "btn-primary", onClick: async () => { const q = document.getElementById("af-username").value.trim(); if (!q) { document.getElementById("af-error").textContent = "Введите имя"; return; } await sendFriendRequest(q); document.querySelector(".modal-overlay").remove(); } }
    ]);
  }

  async function sendFriendRequest(query) {
    const { data: profiles } = await sb.from("profiles").select("*").or(`username.eq.${query}`).limit(1);
    if (!profiles || !profiles.length) { S.ui.toast("Пользователь не найден", "error"); return; }
    const target = profiles[0];
    if (target.id === S.user.id) { S.ui.toast("Нельзя добавить себя!", "error"); return; }
    // Check blocked
    const { data: blockedCheck } = await sb.from("blocked_users").select("*").eq("blocker_id", target.id).eq("blocked_id", S.user.id).limit(1);
    if (blockedCheck && blockedCheck.length) { S.ui.toast("Вы заблокированы этим пользователем", "error"); return; }
    // Check already friends
    const { data: friendCheck } = await sb.from("friends").select("*").or(`and(user_id.eq.${S.user.id},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${S.user.id})`).limit(1);
    if (friendCheck && friendCheck.length) { S.ui.toast("Уже в друзьях!", "info"); return; }
    // Check existing request
    const { data: reqCheck } = await sb.from("friend_requests").select("*").eq("status", "pending").or(`and(sender_id.eq.${S.user.id},receiver_id.eq.${target.id}),and(sender_id.eq.${target.id},receiver_id.eq.${S.user.id})`).limit(1);
    if (reqCheck && reqCheck.length) { S.ui.toast("Заявка уже существует", "info"); return; }
    const { error } = await sb.from("friend_requests").insert({ sender_id: S.user.id, receiver_id: target.id, status: "pending" });
    if (error) { S.ui.toast("Ошибка: " + (error.message || "?"), "error"); }
    else { S.ui.toast("Заявка отправлена!", "success"); await loadAllData(); renderSubPanel(); }
  }

  function showAddToServerModal(friendId) {
    if (!S.serversList.length) { S.ui.toast("Вы не состоите ни в одном сервере", "info"); return; }
    let html = '<div style="display:flex;flex-direction:column;gap:4px;">';
    S.serversList.forEach(s => { html += `<button class="btn btn-ghost add-to-server-btn" data-server-id="${s.id}" style="justify-content:flex-start;">${S.escapeHtml(s.name)}</button>`; });
    html += '</div>';
    S.ui.showModal("Выберите сервер", html, [{ text: "Отмена", cls: "btn-secondary" }]);
    document.querySelectorAll(".add-to-server-btn").forEach(btn => { btn.addEventListener("click", async () => { const sid = btn.dataset.serverId; await sb.from("server_members").insert({ server_id: sid, user_id: friendId, role: "member" }); S.ui.toast("Приглашение отправлено!", "success"); document.querySelector(".modal-overlay").remove(); }); });
  }

  S.friends = { showFriendsPage, loadAllData, openFriendDetail, showAddFriendModal, sendFriendRequest, blockUser, unblockUser };
})();