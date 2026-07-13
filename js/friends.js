// ============================================================
// SENTCOR — Friends Module (Friend Requests, Friends List, DMs)
// ============================================================
(function () {
  "use strict";

  const S = window.SENTCOR;

  // --- STATE ---
  S.friendsList = [];
  S.pendingRequests = [];
  S.outgoingRequests = [];
  let currentDMFriend = null;

  // --- SHOW FRIENDS PAGE ---
  async function showFriendsPage() {
    // Deactivate server icons
    document.querySelectorAll("#sidebar .server-icon").forEach((el) => el.classList.remove("active"));
    const dmIcon = document.querySelector('.server-icon[data-server="dm"]');
    if (dmIcon) dmIcon.classList.add("active");

    // Reset server list header
    const header = document.getElementById("server-list-header");
    if (header) {
      header.querySelector(".truncate").textContent = "Друзья";
    }

    // Clear channel list
    const channelList = document.getElementById("channel-list");
    if (channelList) {
      channelList.innerHTML = renderFriendsChannelList();
    }

    // Load friends
    await loadAllFriendsData();

    // Show friends list in page area
    renderFriendsTab("online");
  }

  function renderFriendsChannelList() {
    return `
      <div class="channel-item active" data-friend-tab="online" style="font-weight:600;color:var(--text-bright);">
        <span class="channel-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 8-8 8 8 0 0 1 8 8v1"/></svg>
        </span>
        <span class="channel-name">Все</span>
      </div>
      <div class="channel-item" data-friend-tab="pending">
        <span class="channel-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </span>
        <span class="channel-name">Входящие</span>
        ${S.pendingRequests.length > 0 ? `<span class="badge" style="margin-left:auto;">${S.pendingRequests.length}</span>` : ""}
      </div>
      <div class="channel-item" data-friend-tab="outgoing">
        <span class="channel-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </span>
        <span class="channel-name">Исходящие</span>
      </div>
      <div class="channel-item" id="add-friend-nav-btn" style="color:var(--green);font-weight:600;">
        <span class="channel-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3v8M9 7h6"/><circle cx="9" cy="7" r="4"/></svg>
        </span>
        <span class="channel-name">Добавить друга</span>
      </div>
    `;
  }

  // --- LOAD ALL FRIENDS DATA ---
  async function loadAllFriendsData() {
    if (!S.user) return;

    // Load friends list
    const { data: friends } = await S.sb
      .from("friends")
      .select("friend_id, user_id")
      .or(`user_id.eq.${S.user.id},friend_id.eq.${S.user.id}`);

    if (friends) {
      const friendIds = friends.map((f) =>
        f.user_id === S.user.id ? f.friend_id : f.user_id
      );

      if (friendIds.length > 0) {
        const { data: profiles } = await S.sb
          .from("profiles")
          .select("*")
          .in("id", friendIds);
        S.friendsList = profiles || [];
      } else {
        S.friendsList = [];
      }
    }

    // Load pending incoming requests
    const { data: pending } = await S.sb
      .from("friend_requests")
      .select("id, sender_id, created_at")
      .eq("receiver_id", S.user.id)
      .eq("status", "pending");

    if (pending && pending.length > 0) {
      const senderIds = pending.map((r) => r.sender_id);
      const { data: profiles } = await S.sb
        .from("profiles")
        .select("*")
        .in("id", senderIds);
      const profileMap = {};
      (profiles || []).forEach((p) => (profileMap[p.id] = p));
      S.pendingRequests = pending.map((r) => ({
        ...r,
        profile: profileMap[r.sender_id] || {},
      }));
    } else {
      S.pendingRequests = [];
    }

    // Load outgoing requests
    const { data: outgoing } = await S.sb
      .from("friend_requests")
      .select("id, receiver_id, created_at, status")
      .eq("sender_id", S.user.id)
      .eq("status", "pending");

    if (outgoing && outgoing.length > 0) {
      const receiverIds = outgoing.map((r) => r.receiver_id);
      const { data: profiles } = await S.sb
        .from("profiles")
        .select("*")
        .in("id", receiverIds);
      const profileMap = {};
      (profiles || []).forEach((p) => (profileMap[p.id] = p));
      S.outgoingRequests = outgoing.map((r) => ({
        ...r,
        profile: profileMap[r.receiver_id] || {},
      }));
    } else {
      S.outgoingRequests = [];
    }
  }

  // --- RENDER FRIENDS TAB ---
  async function renderFriendsTab(tab) {
    await loadAllFriendsData();

    // Update channel list active state
    document.querySelectorAll("#channel-list .channel-item[data-friend-tab]").forEach((el) => {
      el.classList.remove("active");
      if (el.dataset.friendTab === tab) el.classList.add("active");
    });

    // Re-render channel list to update badges
    const channelList = document.getElementById("channel-list");
    if (channelList) {
      channelList.innerHTML = renderFriendsChannelList();
      bindFriendsChannelEvents();
    }

    // Close DM views
    currentDMFriend = null;
    const header = document.getElementById("server-list-header");
    if (header) header.querySelector(".truncate").textContent = "Друзья";

    let contentHtml = "";
    const tabTitles = {
      online: "Все друзья",
      pending: "Входящие заявки",
      outgoing: "Исходящие заявки",
    };

    if (tab === "online") {
      contentHtml = renderAllFriends();
    } else if (tab === "pending") {
      contentHtml = renderPendingRequests();
    } else if (tab === "outgoing") {
      contentHtml = renderOutgoingRequests();
    }

    S.ui.showPage(
      tabTitles[tab] || "Друзья",
      `<button class="page-tab ${tab === "online" ? "active" : ""}" data-tab="online">Все</button>
       <button class="page-tab ${tab === "pending" ? "active" : ""}" data-tab="pending">Входящие ${S.pendingRequests.length > 0 ? `<span class="badge" style="margin-left:6px;">${S.pendingRequests.length}</span>` : ""}</button>
       <button class="page-tab ${tab === "outgoing" ? "active" : ""}" data-tab="outgoing">Исходящие</button>`,
      contentHtml
    );

    // Tab click events
    document.querySelectorAll(".page-tab").forEach((el) => {
      el.addEventListener("click", () => renderFriendsTab(el.dataset.tab));
    });

    // Add friend button
    const addFriendBtn = document.getElementById("add-friend-btn");
    if (addFriendBtn) {
      addFriendBtn.addEventListener("click", showAddFriendModal);
    }
  }

  function bindFriendsChannelEvents() {
    document.querySelectorAll("#channel-list .channel-item[data-friend-tab]").forEach((el) => {
      el.addEventListener("click", () => renderFriendsTab(el.dataset.friendTab));
    });
    const addNavBtn = document.getElementById("add-friend-nav-btn");
    if (addNavBtn) {
      addNavBtn.addEventListener("click", showAddFriendModal);
    }
  }

  function renderAllFriends() {
    const online = S.friendsList.filter((f) => f.status === "online" || f.status === "idle" || f.status === "dnd");
    const offline = S.friendsList.filter((f) => f.status === "offline" || !f.status);

    let html = '<div style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;">';
    html += `<span style="color:var(--text-muted);font-size:13px;">Всего друзей: ${S.friendsList.length} &middot; В сети: ${online.length}</span>`;
    html += '<button class="btn btn-sm btn-primary" id="add-friend-btn">+ Добавить друга</button>';
    html += "</div>";

    if (S.friendsList.length === 0) {
      html += '<div style="text-align:center;padding:40px;color:var(--text-muted);">У вас пока нет друзей. Добавьте первого друга!</div>';
      return html;
    }

    // Online first
    [...online, ...offline].forEach((f) => {
      const avatar = f.avatar_url ? `style="background-image:url(${f.avatar_url});background-size:cover"` : "";
      html += `
        <div class="friend-card">
          <div class="avatar" ${avatar}></div>
          <span class="status-dot status-${f.status || "offline"}"></span>
          <div class="friend-info">
            <div class="friend-name">${S.escapeHtml(f.display_name || f.username)}</div>
            <div class="friend-status">${f.game_status ? S.escapeHtml(f.game_status) : (f.status === "online" ? "В сети" : "Не в сети")}</div>
          </div>
          <div class="friend-actions">
            <button class="btn btn-sm btn-secondary dm-friend-btn" data-friend-id="${f.id}" data-friend-name="${S.escapeHtml(f.display_name || f.username)}">💬 ЛС</button>
            <button class="btn btn-sm btn-ghost remove-friend-btn" data-friend-id="${f.id}" title="Удалить">✕</button>
          </div>
        </div>
      `;
    });

    return html;
  }

  function renderPendingRequests() {
    let html = "";
    if (S.pendingRequests.length === 0) {
      html += '<div style="text-align:center;padding:40px;color:var(--text-muted);">Нет входящих заявок.</div>';
      return html;
    }

    S.pendingRequests.forEach((r) => {
      const f = r.profile || {};
      const avatar = f.avatar_url ? `style="background-image:url(${f.avatar_url});background-size:cover"` : "";
      html += `
        <div class="friend-card">
          <div class="avatar" ${avatar}></div>
          <div class="friend-info">
            <div class="friend-name">${S.escapeHtml(f.display_name || f.username || "Неизвестный")}</div>
            <div class="friend-status">Хочет добавить вас в друзья</div>
          </div>
          <div class="friend-actions">
            <button class="btn btn-sm btn-primary accept-request-btn" data-request-id="${r.id}">✓ Принять</button>
            <button class="btn btn-sm btn-danger decline-request-btn" data-request-id="${r.id}">✕ Отклонить</button>
          </div>
        </div>
      `;
    });

    return html;
  }

  function renderOutgoingRequests() {
    let html = "";
    if (S.outgoingRequests.length === 0) {
      html += '<div style="text-align:center;padding:40px;color:var(--text-muted);">Нет исходящих заявок.</div>';
      return html;
    }

    S.outgoingRequests.forEach((r) => {
      const f = r.profile || {};
      const avatar = f.avatar_url ? `style="background-image:url(${f.avatar_url});background-size:cover"` : "";
      html += `
        <div class="friend-card">
          <div class="avatar" ${avatar}></div>
          <div class="friend-info">
            <div class="friend-name">${S.escapeHtml(f.display_name || f.username || "Неизвестный")}</div>
            <div class="friend-status">Заявка отправлена</div>
          </div>
          <div class="friend-actions">
            <button class="btn btn-sm btn-ghost cancel-request-btn" data-request-id="${r.id}">Отменить</button>
          </div>
        </div>
      `;
    });

    return html;
  }

  // --- DELEGATE EVENTS FOR FRIEND CARDS ---
  // Called after each renderFriendsTab
  function setupFriendEvents(container) {
    if (!container) container = document;

    // DM buttons
    container.querySelectorAll(".dm-friend-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const friendId = btn.dataset.friendId;
        const friendName = btn.dataset.friendName;
        openDM(friendId, friendName);
      });
    });

    // Remove friend buttons
    container.querySelectorAll(".remove-friend-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const friendId = btn.dataset.friendId;
        S.ui.confirm("Удалить друга", "Вы уверены, что хотите удалить этого друга?", async () => {
          await S.sb.from("friends").delete().eq("user_id", S.user.id).eq("friend_id", friendId);
          await S.sb.from("friends").delete().eq("user_id", friendId).eq("friend_id", S.user.id);
          S.ui.toast("Друг удалён", "info");
          renderFriendsTab("online");
        });
      });
    });

    // Accept request buttons
    container.querySelectorAll(".accept-request-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const requestId = btn.dataset.requestId;
        const req = S.pendingRequests.find((r) => r.id === requestId);
        if (!req) return;

        // Update request status
        await S.sb.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
        // Add to friends table both ways
        await S.sb.from("friends").insert({ user_id: S.user.id, friend_id: req.sender_id });
        await S.sb.from("friends").insert({ user_id: req.sender_id, friend_id: S.user.id });
        S.ui.toast("Заявка принята!", "success");
        renderFriendsTab("online");
      });
    });

    // Decline request buttons
    container.querySelectorAll(".decline-request-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const requestId = btn.dataset.requestId;
        await S.sb.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
        S.ui.toast("Заявка отклонена", "info");
        renderFriendsTab("pending");
      });
    });

    // Cancel request buttons
    container.querySelectorAll(".cancel-request-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const requestId = btn.dataset.requestId;
        await S.sb.from("friend_requests").delete().eq("id", requestId);
        S.ui.toast("Заявка отменена", "info");
        renderFriendsTab("outgoing");
      });
    });
  }

  // --- SHOW ADD FRIEND MODAL ---
  function showAddFriendModal() {
    const bodyHtml = `
      <div class="input-group">
        <label class="input-label">Имя пользователя или Email</label>
        <input class="input" id="add-friend-input" placeholder="Введите username или email..." />
        <div class="input-error" id="add-friend-error"></div>
      </div>
    `;

    S.ui.showModal("Добавить друга", bodyHtml, [
      { text: "Отмена", cls: "btn-secondary" },
      {
        text: "Отправить заявку",
        cls: "btn-primary",
        onClick: async () => {
          const query = S.ui.$("#add-friend-input").value.trim();
          if (!query) {
            S.ui.$("#add-friend-error").textContent = "Введите имя пользователя или email";
            return;
          }
          await sendFriendRequest(query);
          S.ui.$(".modal-overlay").remove();
        },
      },
    ]);
  }

  async function sendFriendRequest(query) {
    // Search by username or email
    const { data: profiles, error } = await S.sb
      .from("profiles")
      .select("*")
      .or(`username.eq.${query},id.eq.${query}`)
      .limit(1);

    if (error || !profiles || profiles.length === 0) {
      // Try searching by email from auth
      S.ui.toast("Пользователь не найден. Попробуйте username.", "error");
      return;
    }

    const target = profiles[0];

    if (target.id === S.user.id) {
      S.ui.toast("Нельзя добавить самого себя!", "error");
      return;
    }

    // Check if already friends
    const { data: existingFriend } = await S.sb
      .from("friends")
      .select("*")
      .or(`and(user_id.eq.${S.user.id},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${S.user.id})`)
      .limit(1);

    if (existingFriend && existingFriend.length > 0) {
      S.ui.toast("Этот пользователь уже у вас в друзьях!", "info");
      return;
    }

    // Check if request already exists
    const { data: existingReq } = await S.sb
      .from("friend_requests")
      .select("*")
      .or(`and(sender_id.eq.${S.user.id},receiver_id.eq.${target.id}),and(sender_id.eq.${target.id},receiver_id.eq.${S.user.id})`)
      .eq("status", "pending")
      .limit(1);

    if (existingReq && existingReq.length > 0) {
      S.ui.toast("Заявка уже отправлена!", "info");
      return;
    }

    const { error: insertErr } = await S.sb.from("friend_requests").insert({
      sender_id: S.user.id,
      receiver_id: target.id,
      status: "pending",
    });

    if (insertErr) {
      S.ui.toast("Ошибка: " + (insertErr.message || "неизвестная"), "error");
    } else {
      S.ui.toast("Заявка отправлена!", "success");
      renderFriendsTab("outgoing");
    }
  }

  // --- OPEN DM ---
  async function openDM(friendId, friendName) {
    currentDMFriend = { id: friendId, name: friendName };

    // Update server list header
    const header = document.getElementById("server-list-header");
    if (header) header.querySelector(".truncate").textContent = friendName;

    // Clear channel list — show DM context
    const channelList = document.getElementById("channel-list");
    if (channelList) {
      channelList.innerHTML = `
        <div class="channel-item active" data-back-to-friends="true">
          <span class="channel-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </span>
          <span class="channel-name">← Назад к друзьям</span>
        </div>
      `;
      channelList.querySelector('[data-back-to-friends="true"]').addEventListener("click", () => {
        S.friends.showFriendsPage();
      });
    }

    // Render chat with DM input
    const chatArea = document.getElementById("chat-area");
    if (chatArea) {
      chatArea.innerHTML = `
        <div class="page-container">
          <div class="chat-header">
            <span>💬</span>
            <span>${S.escapeHtml(friendName)}</span>
          </div>
          <div class="chat-messages" id="chat-messages">
            <div class="empty-state">
              <h3>Личные сообщения с ${S.escapeHtml(friendName)}</h3>
              <p>Напишите что-нибудь!</p>
            </div>
          </div>
          <div class="chat-input-area" id="chat-input-area">
            <div class="chat-input-wrapper">
              <textarea id="msg-input" rows="1" placeholder="Напишите сообщение..." maxlength="${S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH}"></textarea>
              <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Отправить" id="send-msg-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;

      // Input event
      const textarea = document.getElementById("msg-input");
      const sendBtn = document.getElementById("send-msg-btn");

      textarea.addEventListener("input", () => {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
      });

      const sendDM = async () => {
        const content = textarea.value.trim();
        if (!content) return;
        textarea.disabled = true;
        const { error } = await S.chat.sendDirectMessage(friendId, content);
        if (error) {
          S.ui.toast("Ошибка: " + S.ui.getErrorMessage(error), "error");
          textarea.disabled = false;
        } else {
          textarea.value = "";
          textarea.style.height = "auto";
          textarea.disabled = false;
          textarea.focus();
        }
      };

      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendDM();
        }
      });
      sendBtn.addEventListener("click", sendDM);
    }

    // Clear members
    const membersList = document.getElementById("members-list");
    if (membersList) membersList.innerHTML = "";

    // Load DM messages
    S.chat.loadDirectMessages(friendId);
  }

  // --- OVERRIDE renderFriendsTab to attach events ---
  const originalRenderFriendsTab = renderFriendsTab;
  renderFriendsTab = async function (tab) {
    await originalRenderFriendsTab(tab);
    // Small delay to let DOM update
    setTimeout(() => setupFriendEvents(), 50);
  };

  // --- EXPORT ---
  S.friends = {
    showFriendsPage,
    renderFriendsTab,
    loadAllFriendsData,
    showAddFriendModal,
    openDM,
    get currentDMFriend() {
      return currentDMFriend;
    },
  };
})();