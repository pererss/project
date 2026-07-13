// ============================================================
// SENTCOR — Servers Module v2
// ============================================================
(function () {
  "use strict";
  const S = window.SENTCOR;
  const sb = S.sb;
  S.serversList = []; S.channelsList = []; S.activeServer = null; S.activeChannel = null;

  async function loadServersSidebar() {
    if (!S.user) return;
    const { data: memberships } = await sb.from("server_members").select("server_id").eq("user_id", S.user.id);
    if (!memberships || !memberships.length) { renderSidebarServers([]); return; }
    const ids = memberships.map(m => m.server_id);
    const { data: servers } = await sb.from("servers").select("*").in("id", ids).order("created_at");
    S.serversList = servers || [];
    renderSidebarServers(S.serversList);
  }

  function renderSidebarServers(servers) {
    const container = document.getElementById("sidebar-servers"); if (!container) return;
    let html = "";
    servers.forEach(s => {
      const initial = s.name.charAt(0).toUpperCase();
      html += `<div class="server-icon-nav tooltip" data-tooltip="${S.escapeHtml(s.name)}" data-server-id="${s.id}"><span>${initial}</span></div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll(".server-icon-nav").forEach(el => {
      el.addEventListener("click", () => { selectServer(el.dataset.serverId); });
    });
  }

  async function selectServer(serverId) {
    S.activeServer = serverId;
    S.ui.activateNav("servers");
    const sp = document.getElementById("sub-panel"); if (sp) sp.classList.remove("collapsed");
    const server = S.serversList.find(s => s.id === serverId);
    if (!server) return;
    // Highlight in sidebar
    document.querySelectorAll("#sidebar .server-icon-nav").forEach(el => el.classList.remove("active"));
    document.querySelectorAll("#sidebar .sidebar-nav").forEach(el => el.classList.remove("active"));
    const icon = document.querySelector(`.server-icon-nav[data-server-id="${serverId}"]`); if (icon) icon.classList.add("active");
    S.ui.setSubPanelHeader(server.name);
    renderServerChannels(serverId);
  }

  async function renderServerChannels(serverId) {
    const { data: channels } = await sb.from("channels").select("*").eq("server_id", serverId).order("position");
    S.channelsList = channels || [];
    const server = S.serversList.find(s => s.id === serverId);
    const isOwner = server && server.owner_id === S.user.id;
    const textCh = S.channelsList.filter(c => c.type === "text");
    const voiceCh = S.channelsList.filter(c => c.type === "voice");
    let html = "";
    if (textCh.length) { html += `<div class="sp-section-title">Текстовые каналы</div>`; textCh.forEach(ch => { html += `<div class="sp-item" data-channel-id="${ch.id}" data-type="text"><span class="sp-icon">#</span><span class="sp-name">${S.escapeHtml(ch.name)}</span></div>`; }); }
    if (voiceCh.length) { html += `<div class="sp-section-title">Голосовые каналы</div>`; voiceCh.forEach(ch => { html += `<div class="sp-item" data-channel-id="${ch.id}" data-type="voice"><span class="sp-icon">🔊</span><span class="sp-name">${S.escapeHtml(ch.name)}</span></div>`; }); }
    if (!S.channelsList.length) html = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет каналов</div>';
    if (isOwner) html += `<div class="sp-item" id="add-channel-btn" style="color:var(--green);font-weight:600;"><span class="sp-icon">+</span><span class="sp-name">Добавить канал</span></div>`;
    S.ui.setSubPanelContent(html);
    // Bind channel clicks
    document.querySelectorAll("#sp-content .sp-item[data-channel-id]").forEach(el => {
      el.addEventListener("click", () => {
        const chId = el.dataset.channelId; const channel = S.channelsList.find(c => c.id === chId);
        if (channel) { S.activeChannel = channel; S.ui.renderChatView(channel); S.chat.loadMessages(chId); loadMembers(serverId); }
      });
    });
    const addBtn = document.getElementById("add-channel-btn"); if (addBtn) addBtn.addEventListener("click", () => showCreateChannelModal(serverId));
    // Load members
    loadMembers(serverId);
  }

  async function loadMembers(serverId) {
    const { data: memberships } = await sb.from("server_members").select("user_id, role").eq("server_id", serverId);
    if (!memberships) return;
    // Check if current user is admin
    const myRole = memberships.find(m => m.user_id === S.user.id);
    S.ui.isAdmin = myRole && (myRole.role === "owner" || myRole.role === "admin");
    const userIds = memberships.map(m => m.user_id);
    const { data: profiles } = await sb.from("profiles").select("*").in("id", userIds);
    if (profiles) S.ui.renderMembers(profiles);
  }

  function showServersPage() {
    S.ui.activateNav("servers");
    const sp = document.getElementById("sub-panel"); if (sp) sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader("Серверы");
    let html = `<div style="padding:16px;"><button class="btn btn-accent-outline" id="sp-create-server-btn" style="width:100%;justify-content:center;">+ Создать сервер</button></div>`;
    if (S.serversList.length) {
      html += `<div class="sp-section-title">Мои серверы</div>`;
      S.serversList.forEach(s => { html += `<div class="sp-item server-list-item" data-server-id="${s.id}"><span class="sp-icon">S</span><span class="sp-name">${S.escapeHtml(s.name)}</span></div>`; });
    } else { html += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Вы не состоите ни в одном сервере</div>'; }
    S.ui.setSubPanelContent(html);
    document.getElementById("sp-create-server-btn").addEventListener("click", () => showCreateServerModal());
    document.querySelectorAll(".server-list-item").forEach(el => { el.addEventListener("click", () => selectServer(el.dataset.serverId)); });
    S.ui.showHomePage();
  }

  function showCreateServerModal() {
    const body = `<div class="input-group"><label class="input-label">Название</label><input class="input" id="ns-name" placeholder="Мой сервер" maxlength="100" /><div class="input-error" id="ns-error"></div></div>`;
    S.ui.showModal("Создать сервер", body, [
      { text: "Отмена", cls: "btn-secondary" },
      { text: "Создать", cls: "btn-primary", onClick: async () => { const n = document.getElementById("ns-name").value.trim(); if (!n) { document.getElementById("ns-error").textContent = "Введите название"; return; } await createServer(n); document.querySelector(".modal-overlay").remove(); } }
    ]);
  }

  async function createServer(name) {
    const { data: server, error } = await sb.from("servers").insert({ name, owner_id: S.user.id }).select().single();
    if (error) { S.ui.toast("Ошибка: " + error.message, "error"); return; }
    await sb.from("server_members").insert({ server_id: server.id, user_id: S.user.id, role: "owner" });
    await sb.from("channels").insert([{ server_id: server.id, name: "общий", type: "text", position: 0 }, { server_id: server.id, name: "Войс", type: "voice", position: 1 }]);
    S.ui.toast("Сервер создан!", "success");
    await loadServersSidebar();
    selectServer(server.id);
  }

  function showCreateChannelModal(serverId) {
    const body = `<div class="input-group"><label class="input-label">Название</label><input class="input" id="nc-name" placeholder="новый-канал" maxlength="100" /><div class="input-error" id="nc-error"></div></div><div class="input-group"><label class="input-label">Тип</label><select class="input" id="nc-type"><option value="text">Текстовый</option><option value="voice">Голосовой</option></select></div>`;
    S.ui.showModal("Создать канал", body, [
      { text: "Отмена", cls: "btn-secondary" },
      { text: "Создать", cls: "btn-primary", onClick: async () => { const n = document.getElementById("nc-name").value.trim(); if (!n) { document.getElementById("nc-error").textContent="Введите название"; return; } const t = document.getElementById("nc-type").value; await sb.from("channels").insert({ server_id: serverId, name: n, type: t, position: S.channelsList.length }); S.ui.toast("Канал создан!","success"); renderServerChannels(serverId); document.querySelector(".modal-overlay").remove(); } }
    ]);
  }

  S.servers = { loadServersSidebar, selectServer, showServersPage, showCreateServerModal, createServer, showCreateChannelModal, loadMembers };
})();