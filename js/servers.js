// ============================================================
// SENTCOR — Servers & Channels Module
// ============================================================
(function () {
  "use strict";

  const S = window.SENTCOR;

  // --- STATE ---
  S.activeServer = null;
  S.activeChannel = null;
  S.serversList = [];
  S.channelsList = [];

  // --- LOAD ALL JOINED SERVERS ---
  async function loadServers() {
    if (!S.user) return;

    // Get server IDs from server_members
    const { data: memberships, error: memErr } = await S.sb
      .from("server_members")
      .select("server_id")
      .eq("user_id", S.user.id);

    if (memErr || !memberships || memberships.length === 0) {
      renderSidebarServers([]);
      return;
    }

    const serverIds = memberships.map((m) => m.server_id);

    const { data: servers, error: srvErr } = await S.sb
      .from("servers")
      .select("*")
      .in("id", serverIds)
      .order("created_at", { ascending: true });

    if (srvErr) {
      console.error("Load servers error:", srvErr.message);
      return;
    }

    S.serversList = servers || [];
    renderSidebarServers(S.serversList);
  }

  function renderSidebarServers(servers) {
    const container = document.getElementById("sidebar-servers");
    if (!container) return;

    let html = "";
    servers.forEach((s) => {
      const initial = s.name.charAt(0).toUpperCase();
      html += `
        <div class="server-icon tooltip" data-tooltip="${S.escapeHtml(s.name)}" data-server-id="${s.id}">
          <span>${initial}</span>
        </div>
      `;
    });
    container.innerHTML = html;

    // Click events
    container.querySelectorAll(".server-icon").forEach((el) => {
      el.addEventListener("click", () => {
        const serverId = el.dataset.serverId;
        selectServer(serverId);
      });
    });
  }

  function selectServer(serverId) {
    // Highlight sidebar icon
    document.querySelectorAll("#sidebar .server-icon").forEach((el) => el.classList.remove("active"));
    const icon = document.querySelector(`.server-icon[data-server-id="${serverId}"]`);
    if (icon) icon.classList.add("active");

    // Highlight DM icon when going back to friends
    S.activeServer = serverId;
    const server = S.serversList.find((s) => s.id === serverId);
    if (server) {
      document.querySelector('.server-icon[data-server="dm"]').classList.remove("active");
      S.ui.renderServerList(server);
    }
  }

  // --- LOAD CHANNELS ---
  async function loadChannels(serverId) {
    const { data, error } = await S.sb
      .from("channels")
      .select("*")
      .eq("server_id", serverId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Load channels error:", error.message);
      return;
    }

    S.channelsList = data || [];
    renderChannelList(S.channelsList, serverId);
  }

  function renderChannelList(channels, serverId) {
    const container = document.getElementById("channel-list");
    if (!container) return;

    const textChannels = channels.filter((c) => c.type === "text");
    const voiceChannels = channels.filter((c) => c.type === "voice");

    let html = "";

    if (textChannels.length > 0) {
      html += `<div class="channel-category">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
        Текстовые каналы
      </div>`;
      textChannels.forEach((ch) => {
        html += `
          <div class="channel-item" data-channel-id="${ch.id}" data-type="text">
            <span class="channel-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </span>
            <span class="channel-name">${S.escapeHtml(ch.name)}</span>
          </div>
        `;
      });
    }

    if (voiceChannels.length > 0) {
      html += `<div class="channel-category">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
        Голосовые каналы
      </div>`;
      voiceChannels.forEach((ch) => {
        html += `
          <div class="channel-item" data-channel-id="${ch.id}" data-type="voice">
            <span class="channel-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>
            </span>
            <span class="channel-name">${S.escapeHtml(ch.name)}</span>
          </div>
        `;
      });
    }

    if (channels.length === 0) {
      html = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">Нет каналов</div>';
    }

    // Add "create channel" button if user is owner
    const server = S.serversList.find((s) => s.id === serverId);
    if (server && server.owner_id === S.user.id) {
      html += `
        <div class="channel-item" id="add-channel-btn" style="color:var(--green);font-weight:600;margin-top:4px;">
          <span class="channel-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </span>
          <span class="channel-name">Добавить канал</span>
        </div>
      `;
    }

    container.innerHTML = html;

    // Add channel click events
    container.querySelectorAll(".channel-item[data-channel-id]").forEach((el) => {
      el.addEventListener("click", () => {
        const channelId = el.dataset.channelId;
        const channel = S.channelsList.find((c) => c.id === channelId);
        if (channel) {
          S.activeChannel = channel;
          S.ui.setActiveChannel(channelId);
          S.ui.renderChatHeader(channel);
          S.chat.loadMessages(channel.id);
          loadMembers(serverId);
        }
      });
    });

    // Add "create channel" event
    const addBtn = document.getElementById("add-channel-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => showCreateChannelModal(serverId));
    }

    // Show members for the server
    loadMembers(serverId);
  }

  // --- LOAD MEMBERS ---
  async function loadMembers(serverId) {
    const { data: memberships, error } = await S.sb
      .from("server_members")
      .select("user_id, role")
      .eq("server_id", serverId);

    if (error || !memberships) return;

    const userIds = memberships.map((m) => m.user_id);

    const { data: profiles } = await S.sb
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (profiles) {
      S.ui.renderMembers(profiles);
    }
  }

  // --- CREATE SERVER MODAL ---
  function showCreateServerModal() {
    const bodyHtml = `
      <div class="input-group">
        <label class="input-label">Название сервера</label>
        <input class="input" id="new-server-name" placeholder="Мой сервер" maxlength="100" />
        <div class="input-error" id="new-server-error"></div>
      </div>
    `;

    S.ui.showModal("Создать сервер", bodyHtml, [
      { text: "Отмена", cls: "btn-secondary" },
      {
        text: "Создать",
        cls: "btn-primary",
        onClick: async () => {
          const name = S.ui.$("#new-server-name").value.trim();
          if (!name) {
            S.ui.$("#new-server-error").textContent = "Введите название сервера";
            return;
          }
          await createServer(name);
          S.ui.$(".modal-overlay").remove();
        },
      },
    ]);
  }

  async function createServer(name) {
    // Insert server
    const { data: server, error: serverErr } = await S.sb
      .from("servers")
      .insert({ name, owner_id: S.user.id })
      .select()
      .single();

    if (serverErr) {
      S.ui.toast("Ошибка создания сервера: " + serverErr.message, "error");
      return;
    }

    // Add owner as member
    await S.sb.from("server_members").insert({
      server_id: server.id,
      user_id: S.user.id,
      role: "owner",
    });

    // Create default text channel
    await S.sb.from("channels").insert({
      server_id: server.id,
      name: "общий",
      type: "text",
      position: 0,
    });

    // Create default voice channel
    await S.sb.from("channels").insert({
      server_id: server.id,
      name: "Войс",
      type: "voice",
      position: 1,
    });

    S.ui.toast("Сервер создан!", "success");
    await loadServers();
    selectServer(server.id);
  }

  // --- CREATE CHANNEL MODAL ---
  function showCreateChannelModal(serverId) {
    const bodyHtml = `
      <div class="input-group">
        <label class="input-label">Название канала</label>
        <input class="input" id="new-channel-name" placeholder="новый-канал" maxlength="100" />
        <div class="input-error" id="new-channel-error"></div>
      </div>
      <div class="input-group" style="margin-top:12px;">
        <label class="input-label">Тип канала</label>
        <select class="input" id="new-channel-type">
          <option value="text">Текстовый</option>
          <option value="voice">Голосовой</option>
        </select>
      </div>
    `;

    S.ui.showModal("Создать канал", bodyHtml, [
      { text: "Отмена", cls: "btn-secondary" },
      {
        text: "Создать",
        cls: "btn-primary",
        onClick: async () => {
          const name = S.ui.$("#new-channel-name").value.trim();
          if (!name) {
            S.ui.$("#new-channel-error").textContent = "Введите название канала";
            return;
          }
          const type = S.ui.$("#new-channel-type").value;
          const { error } = await S.sb.from("channels").insert({
            server_id: serverId,
            name,
            type,
            position: S.channelsList.length,
          });

          if (error) {
            S.ui.toast("Ошибка: " + error.message, "error");
          } else {
            S.ui.toast("Канал создан!", "success");
            loadChannels(serverId);
          }
          S.ui.$(".modal-overlay").remove();
        },
      },
    ]);
  }

  // --- EXPORT ---
  S.servers = {
    loadServers,
    loadChannels,
    selectServer,
    showCreateServerModal,
    showCreateChannelModal,
    createServer,
  };
})();