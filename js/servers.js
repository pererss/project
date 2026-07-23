
// SENTCOR v6.0 — Servers (Refactored for Stability & Readability)
(function() {
    "use strict";

    const S = window.SENTCOR;
    if (!S) {
        console.error("SENTCOR base is not loaded!");
        return;
    }
    const sb = S.sb;

    // --- State Management ---
    S.serversList = [];
    S.channelsList = [];
    S.activeServer = null;
    S.activeChannel = null;

    // --- Initialization ---
    function initialize() {
        S.ui.onReady(bindUI);
        S.auth.onAuthStateChange(handleAuthStateChange);
    }

    function bindUI() {
        const createServerBtn = document.getElementById("sp-create-server");
        if (createServerBtn) {
            createServerBtn.addEventListener("click", showCreateModal);
        }

        const discoverServerBtn = document.getElementById("sp-discover-server");
        if (discoverServerBtn) {
            discoverServerBtn.addEventListener("click", showDiscoverPage);
        }
    }

    function handleAuthStateChange(event, session) {
        if (event === "SIGNED_IN") {
            loadSidebarServers();
        }
        if (event === "SIGNED_OUT") {
            resetState();
        }
    }

    function resetState() {
        S.serversList = [];
        S.channelsList = [];
        S.activeServer = null;
        S.activeChannel = null;
        const sidebarServers = document.getElementById("sidebar-servers");
        if (sidebarServers) {
            sidebarServers.innerHTML = "";
        }
    }

    // --- Data Loading ---
    async function loadSidebarServers() {
        if (!S.user) return;

        try {
            const { data: members, error: memberError } = await sb
                .from("server_members")
                .select("server_id")
                .eq("user_id", S.user.id);

            if (memberError) throw memberError;

            const serverContainer = document.getElementById("sidebar-servers");
            if (!serverContainer) return;

            if (!members || members.length === 0) {
                serverContainer.innerHTML = "";
                S.serversList = [];
                return;
            }

            const serverIds = members.map(x => x.server_id);
            const { data: servers, error: serverError } = await sb
                .from("servers")
                .select("*")
                .in("id", serverIds)
                .order("created_at");

            if (serverError) throw serverError;

            S.serversList = servers || [];
            renderSidebarIcons();
        } catch (e) {
            console.error("[Servers] Failed to load sidebar servers:", e);
            S.toast.show("Не удалось загрузить список серверов.", "error");
        }
    }

    async function loadMembers(serverId) {
        if (!S.user) return;
        try {
            const { data: members, error: memberError } = await sb
                .from("server_members")
                .select("user_id, role")
                .eq("server_id", serverId);

            if (memberError) throw memberError;
            if (!members) {
                S.ui.clearMembers();
                return;
            }

            const currentUserMember = members.find(m => m.user_id === S.user.id);
            S.ui.isAdmin = currentUserMember && (currentUserMember.role === "owner" || currentUserMember.role === "admin");

            const userIds = members.map(m => m.user_id);
            const { data: profiles, error: profileError } = await sb
                .from("profiles")
                .select("*")
                .in("id", userIds);

            if (profileError) throw profileError;
            if (!profiles) {
                S.ui.clearMembers();
                return;
            }

            const online = profiles.filter(p => ["online", "idle", "dnd"].includes(p.status));
            const offline = profiles.filter(p => !online.includes(p));

            let membersHtml = "";
            if (online.length > 0) {
                membersHtml += `<div class="sp-section-title">В сети — ${online.length}</div>`;
                online.forEach(m => membersHtml += createMemberItem(m, S.ui.isAdmin, serverId));
            }
            if (offline.length > 0) {
                membersHtml += `<div class="sp-section-title">Не в сети — ${offline.length}</div>`;
                offline.forEach(m => membersHtml += createMemberItem(m, S.ui.isAdmin, serverId));
            }

            S.ui.setMembersContent(membersHtml);
            bindMemberActions();

        } catch (e) {
            console.error("[Servers] Failed to load members:", e);
            S.toast.show("Ошибка загрузки участников сервера.", "error");
            S.ui.clearMembers();
        }
    }

    // --- UI Rendering ---
    function renderSidebarIcons() {
        const container = document.getElementById("sidebar-servers");
        if (!container) return;

        container.innerHTML = S.serversList.map(server => {
            const serverName = S.escapeHtml(server.name);
            return `
                <div class="server-icon-nav" data-sid="${server.id}" title="${serverName}">
                    <span>${serverName.charAt(0).toUpperCase()}</span>
                </div>`;
        }).join("");

        container.querySelectorAll(".server-icon-nav").forEach(el => {
            el.addEventListener("click", () => selectServer(el.dataset.sid));
        });
    }

    async function renderChannels(serverId) {
        try {
            const { data: channels, error } = await sb
                .from("channels")
                .select("*")
                .eq("server_id", serverId)
                .order("position");

            if (error) throw error;

            S.channelsList = channels || [];
            const server = S.serversList.find(s => s.id === serverId);
            if (!server) return;

            const isOwner = server.owner_id === S.user.id;
            const textChannels = S.channelsList.filter(c => c.type === "text");
            const voiceChannels = S.channelsList.filter(c => c.type === "voice");

            let channelsHtml = createChannelHeader(server, isOwner);
            channelsHtml += createChannelSection("Текстовые каналы", textChannels, isOwner);
            channelsHtml += createChannelSection("Голосовые каналы", voiceChannels, isOwner);

            if (S.channelsList.length === 0) {
                channelsHtml += '<div class="sp-item-placeholder">Нет каналов</div>';
            }
            if (isOwner) {
                channelsHtml += `
                    <div class="sp-item sp-item-action" id="add-ch-btn">
                        <i class="fa-solid fa-plus"></i>
                        <span>Добавить канал</span>
                    </div>`;
            }

            S.ui.setSubPanelContent(channelsHtml);
            bindChannelActions(serverId, isOwner);

            // Auto-open first text channel if available
            if (textChannels.length > 0) {
                const firstChannel = textChannels[0];
                S.activeChannel = firstChannel;
                S.ui.resetCompact();
                S.ui.renderChatView(firstChannel);
                S.chat.loadMessages(firstChannel.id);
            }

        } catch (e) {
            console.error("[Servers] Failed to render channels:", e);
            S.toast.show("Ошибка загрузки каналов.", "error");
        }
    }

    function createChannelHeader(server, isOwner) {
        const serverName = S.escapeHtml(server.name);
        return `
            <div class="sp-header">
                <span class="sp-header-title">${serverName}</span>
                <button class="btn btn-icon btn-ghost btn-sm" id="server-dots-btn" aria-label="Server options">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
            </div>`;
    }

    function createChannelSection(title, channels, isOwner) {
        if (channels.length === 0) return "";
        let sectionHtml = `<div class="sp-section-title">${title}</div>`;
        sectionHtml += channels.map(c => {
            const channelName = S.escapeHtml(c.name);
            const icon = c.type === "text" ? "fa-hashtag" : "fa-volume-high";
            return `
                <div class="sp-item" data-chid="${c.id}">
                    <i class="fa-solid ${icon}"></i>
                    <span>${channelName}</span>
                    ${isOwner ? `
                        <button class="btn btn-icon btn-ghost btn-sm ch-dots-btn" data-chid="${c.id}" data-chname="${channelName}" aria-label="Channel options">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>` : ""}
                </div>`;
        }).join("");
        return sectionHtml;
    }

    function createMemberItem(member, isOwner, serverId) {
        const displayName = S.escapeHtml(member.display_name || member.username);
        const avatar = member.avatar_url ?
            `<img src="${S.escapeHtml(member.avatar_url)}" alt="Avatar">` :
            `<div class="avatar-initials">${displayName.charAt(0).toUpperCase()}</div>`;

        return `
            <div class="sp-item-friend" data-uid="${member.id}">
                <div class="avatar avatar-sm">
                    ${avatar}
                    <span class="status-dot status-${member.status || 'offline'}"></span>
                </div>
                <span class="member-name">${displayName}</span>
                ${member.game_status ? `<span class="member-game">${S.escapeHtml(member.game_status)}</span>` : ""}
                <button class="btn btn-icon btn-ghost btn-sm member-dots-btn" data-uid="${member.id}" data-uname="${S.escapeHtml(member.username || '')}" aria-label="Member options">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
            </div>`;
    }

    // --- Actions & Event Binding ---
    async function selectServer(serverId) {
        if (!serverId) return;
        S.activeServer = serverId;

        document.querySelectorAll("#sidebar .sidebar-nav, #sidebar .server-icon-nav").forEach(e => e.classList.remove("active"));
        const icon = document.querySelector(`.server-icon-nav[data-sid="${serverId}"]`);
        if (icon) icon.classList.add("active");

        const server = S.serversList.find(s => s.id === serverId);
        if (!server) {
            S.toast.show("Не удалось найти данные сервера.", "error");
            return;
        }

        const subPanel = document.getElementById("sub-panel");
        if (subPanel) subPanel.classList.remove("collapsed");

        S.ui.setSubPanelHeader(server.name);
        document.title = `Sentcor - ${S.escapeHtml(server.name)}`;

        await renderChannels(serverId);
        await loadMembers(serverId);
    }

    function bindChannelActions(serverId, isOwner) {
        // Server options menu
        document.getElementById("server-dots-btn")?.addEventListener("click", e => {
            e.stopPropagation();
            const items = isOwner ?
                [
                    { label: '<i class="fa-solid fa-pen-to-square"></i> Редактировать сервер', action: () => showEditServerModal(serverId) },
                    { label: '<i class="fa-solid fa-user-plus"></i> Пригласить участника', action: () => showInviteModal(serverId) },
                    "sep",
                    { label: '<i class="fa-solid fa-trash"></i> Удалить сервер', danger: true, action: () => deleteServer(serverId) }
                ] :
                [
                    { label: '<i class="fa-solid fa-right-from-bracket"></i> Покинуть сервер', danger: true, action: () => leaveServer(serverId) }
                ];
            S.ui.showContextMenu(items, e.clientX, e.clientY);
        });

        // Channel click
        document.querySelectorAll("#sp-content .sp-item[data-chid]").forEach(el => {
            el.addEventListener("click", e => {
                if (e.target.closest(".ch-dots-btn")) return;
                const channel = S.channelsList.find(c => c.id === el.dataset.chid);
                if (!channel) return;

                S.activeChannel = channel;
                S.ui.resetCompact();
                S.ui.renderChatView(channel);
                S.chat.loadMessages(channel.id);
                loadMembers(serverId);
            });
        });

        // Channel options menu
        document.querySelectorAll(".ch-dots-btn").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                const channelId = btn.dataset.chid;
                const channelName = btn.dataset.chname;
                const items = [
                    { label: '<i class="fa-solid fa-pen-to-square"></i> Переименовать', action: () => renameChannel(channelId, channelName, serverId) },
                    { label: '<i class="fa-solid fa-trash"></i> Удалить', danger: true, action: () => deleteChannel(channelId, serverId) }
                ];
                S.ui.showContextMenu(items, e.clientX, e.clientY);
            });
        });

        // Add channel button
        document.getElementById("add-ch-btn")?.addEventListener("click", () => showCreateChannelModal(serverId));
    }

    function bindMemberActions() {
        document.querySelectorAll(".member-dots-btn").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                const userId = btn.dataset.uid;
                const userName = btn.dataset.uname;
                const isFriend = S.friendsList.some(f => f.id === userId);
                const isSelf = userId === S.user.id;

                const items = [{ label: '<i class="fa-solid fa-user"></i> Посмотреть профиль', action: () => S.profile.show(userId) }];
                if (!isSelf) {
                    if (isFriend) {
                        items.push({ label: '<i class="fa-solid fa-user-minus"></i> Удалить из друзей', danger: true, action: () => S.friends.removeFriend(userId) });
                    } else {
                        items.push({ label: '<i class="fa-solid fa-user-plus"></i> Добавить в друзья', action: () => S.friends.sendRequest(userName) });
                    }
                }
                S.ui.showContextMenu(items, e.clientX, e.clientY);
            });
        });
    }

    // --- CRUD Operations ---
    async function createServer(name, isPublic, description) {
        S.toast.show("Создаём сервер...", "info");
        try {
            const { data: server, error: serverError } = await sb
                .from("servers")
                .insert({ name, owner_id: S.user.id, public: isPublic, description: description || null })
                .select()
                .single();
            if (serverError) throw serverError;

            await sb.from("server_members").insert({ server_id: server.id, user_id: S.user.id, role: "owner" });
            await sb.from("channels").insert([
                { server_id: server.id, name: "общий", type: "text", position: 0 },
                { server_id: server.id, name: "Войс", type: "voice", position: 1 }
            ]);

            S.toast.show(`Сервер «${S.escapeHtml(name)}» создан!`, "success");
            await loadSidebarServers();
            setTimeout(() => selectServer(server.id), 200); // Allow UI to update

        } catch (err) {
            console.error("[Servers] Failed to create server:", err);
            S.toast.show(`Ошибка создания сервера: ${err.message}`, "error");
        }
    }

    async function deleteServer(serverId) {
        S.ui.confirm("Удалить сервер?", "Это действие необратимо. Все каналы и сообщения будут удалены.", async () => {
            try {
                const { error } = await sb.from("servers").delete().eq("id", serverId);
                if (error) throw error;
                S.toast.show("Сервер удалён.", "info");
                
                // Reset view if the active server was deleted
                if (S.activeServer === serverId) {
                    S.ui.showHome();
                }
                loadSidebarServers();

            } catch (e) {
                console.error("[Servers] Failed to delete server:", e);
                S.toast.show("Ошибка при удалении сервера.", "error");
            }
        });
    }
    
    async function leaveServer(serverId) {
        S.ui.confirm("Покинуть сервер?", "Вы уверены, что хотите покинуть этот сервер?", async () => {
            try {
                const { error } = await sb.from("server_members").delete().match({ user_id: S.user.id, server_id: serverId });
                if (error) throw error;
                S.toast.show("Вы покинули сервер.", "info");

                if (S.activeServer === serverId) {
                    S.ui.showHome();
                }
                loadSidebarServers();

            } catch (e) {
                console.error("[Servers] Failed to leave server:", e);
                S.toast.show("Ошибка при выходе с сервера.", "error");
            }
        });
    }

    async function renameChannel(channelId, oldName, serverId) {
        const newName = prompt("Введите новое название канала:", oldName);
        if (newName && newName.trim() && newName !== oldName) {
            try {
                const { error } = await sb.from("channels").update({ name: newName.trim() }).eq("id", channelId);
                if (error) throw error;
                S.toast.show("Канал переименован!", "success");
                renderChannels(serverId);
            } catch (e) {
                console.error("[Servers] Failed to rename channel:", e);
                S.toast.show("Ошибка переименования канала.", "error");
            }
        }
    }

    async function deleteChannel(channelId, serverId) {
        S.ui.confirm("Удалить канал?", "Все сообщения в этом канале будут удалены.", async () => {
            try {
                const { error } = await sb.from("channels").delete().eq("id", channelId);
                if (error) throw error;
                S.toast.show("Канал удалён.", "info");
                renderChannels(serverId);
            } catch (e) {
                console.error("[Servers] Failed to delete channel:", e);
                S.toast.show("Ошибка удаления канала.", "error");
            }
        });
    }

    // --- Modals & Pages ---
    function showCreateModal() {
        const body = `
            <div class="input-group">
                <label class="input-label">Название сервера</label>
                <input class="input" id="ns-name" placeholder="Мой крутой сервер" maxlength="100">
                <div class="input-error" id="ns-err"></div>
            </div>
            <div class="input-group">
                <label class="input-label">Тип</label>
                <select class="input" id="ns-public">
                    <option value="true">Публичный (виден в поиске)</option>
                    <option value="false">Приватный (только по приглашению)</option>
                </select>
            </div>
            <div class="input-group">
                <label class="input-label">Описание</label>
                <textarea class="input" id="ns-desc" rows="2" maxlength="200" placeholder="О чём этот сервер..."></textarea>
            </div>`;

        S.ui.showModal("Создать сервер", body, [
            { text: "Отмена", cls: "btn-secondary" },
            {
                text: "Создать",
                cls: "btn-primary",
                onClick: async (e, modal, overlay) => {
                    const nameInput = document.getElementById("ns-name");
                    const name = nameInput?.value?.trim();
                    const errorEl = document.getElementById("ns-err");

                    if (!name) {
                        if (errorEl) errorEl.textContent = "Название не может быть пустым.";
                        return;
                    }
                    if (errorEl) errorEl.textContent = "";

                    const isPublic = document.getElementById("ns-public")?.value === "true";
                    const description = document.getElementById("ns-desc")?.value?.trim() || "";

                    await createServer(name, isPublic, description);
                    overlay.remove();
                }
            }
        ]);
    }
    
    function showEditServerModal(serverId) {
        const server = S.serversList.find(s => s.id === serverId);
        if (!server) return;

        const body = `
            <div class="input-group">
                <label class="input-label">Название</label>
                <input class="input" id="es-name" value="${S.escapeHtml(server.name)}" maxlength="100">
            </div>
            <div class="input-group">
                <label class="input-label">Описание</label>
                <textarea class="input" id="es-desc" rows="2" maxlength="200">${S.escapeHtml(server.description || "")}</textarea>
            </div>`;

        S.ui.showModal("Редактировать сервер", body, [
            { text: "Отмена", cls: "btn-secondary" },
            {
                text: "Сохранить",
                cls: "btn-primary",
                onClick: async (e, modal, overlay) => {
                    const name = document.getElementById("es-name")?.value?.trim();
                    const description = document.getElementById("es-desc")?.value?.trim();
                    if (!name) return;

                    try {
                        const { error } = await sb.from("servers").update({ name, description: description || null }).eq("id", serverId);
                        if (error) throw error;
                        S.toast.show("Сервер обновлён!", "success");
                        await loadSidebarServers();
                        selectServer(serverId); // Reselect to refresh view
                    } catch (err) {
                        S.toast.show(`Ошибка обновления: ${err.message}`, "error");
                    }
                    overlay.remove();
                }
            }
        ]);
    }

    function showInviteModal(serverId) {
        const body = `
            <div class="input-group">
                <label class="input-label">Имя пользователя</label>
                <input class="input" id="inv-user" placeholder="username...">
                <div class="input-error" id="inv-err"></div>
            </div>`;

        S.ui.showModal("Пригласить на сервер", body, [
            { text: "Отмена", cls: "btn-secondary" },
            {
                text: "Пригласить",
                cls: "btn-primary",
                onClick: async (e, modal, overlay) => {
                    const userInput = document.getElementById("inv-user");
                    const query = userInput?.value?.trim();
                    const errorEl = document.getElementById("inv-err");
                    if (!query || !errorEl) return;

                    try {
                        const { data: profile, error: profileError } = await sb
                            .from("profiles")
                            .select("id, username")
                            .eq("username", query)
                            .single();

                        if (profileError || !profile) {
                            errorEl.textContent = "Пользователь не найден.";
                            return;
                        }

                        const { error: insertError } = await sb
                            .from("server_members")
                            .insert({ server_id: serverId, user_id: profile.id, role: "member" });

                        if (insertError) {
                            if (insertError.code === '23505') { // unique constraint violation
                                errorEl.textContent = "Пользователь уже на сервере.";
                            } else {
                                throw insertError;
                            }
                        } else {
                            S.toast.show(`${S.escapeHtml(profile.username)} приглашён!`, "success");
                            loadMembers(serverId);
                            overlay.remove();
                        }
                    } catch (err) {
                        errorEl.textContent = `Ошибка: ${err.message}`;
                    }
                }
            }
        ]);
    }

    function showCreateChannelModal(serverId) {
        const body = `
            <div class="input-group">
                <label class="input-label">Название канала</label>
                <input class="input" id="nc-name" placeholder="новый-канал" maxlength="100">
                <div class="input-error" id="nc-err"></div>
            </div>
            <div class="input-group">
                <label class="input-label">Тип канала</label>
                <select class="input" id="nc-type">
                    <option value="text">Текстовый</option>
                    <option value="voice">Голосовой</option>
                </select>
            </div>`;

        S.ui.showModal("Создать канал", body, [
            { text: "Отмена", cls: "btn-secondary" },
            {
                text: "Создать",
                cls: "btn-primary",
                onClick: async (e, modal, overlay) => {
                    const nameInput = document.getElementById("nc-name");
                    const name = nameInput?.value?.trim();
                    const errorEl = document.getElementById("nc-err");

                    if (!name) {
                        if (errorEl) errorEl.textContent = "Название не может быть пустым.";
                        return;
                    }
                    if (errorEl) errorEl.textContent = "";

                    const type = document.getElementById("nc-type")?.value || "text";
                    try {
                        const { error } = await sb.from("channels").insert({
                            server_id: serverId,
                            name,
                            type,
                            position: S.channelsList.length
                        });
                        if (error) throw error;
                        S.toast.show("Канал создан!", "success");

                        // Re-render channels to show the new one
                        await renderChannels(serverId);
                        overlay.remove();
                    } catch (err) {
                        S.toast.show(`Ошибка создания канала: ${err.message}`, "error");
                    }
                }
            }
        ]);
    }
    
    function showDiscoverPage() {
        S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><h3>Поиск серверов</h3><p>Эта функция находится в разработке.</p></div></div>`);
        S.ui.clearMembers();
        document.title = "Sentcor - Поиск";
    }
    
    function showServersHome() {
        S.ui.activateNav("servers");
        const subPanel = document.getElementById("sub-panel");
        if (subPanel) subPanel.classList.remove("collapsed");

        S.ui.setSubPanelHeader("Серверы");
        
        let subPanelHtml = `
            <div class="sp-actions">
                <button class="btn btn-accent-outline" id="sp-create-server"><i class="fa-solid fa-plus"></i> Создать</button>
                <button class="btn btn-secondary" id="sp-discover-server"><i class="fa-solid fa-compass"></i> Найти</button>
            </div>`;

        if (S.serversList.length > 0) {
            subPanelHtml += '<div class="sp-section-title">Мои серверы</div>';
            subPanelHtml += S.serversList.map(s => {
                const serverName = S.escapeHtml(s.name);
                const icon = s.icon_url ? `<img src="${S.escapeHtml(s.icon_url)}" alt="Icon">` : serverName.charAt(0).toUpperCase();
                return `
                    <div class="sp-item srv-item" data-sid="${s.id}">
                        <div class="avatar avatar-sm server-icon">${icon}</div>
                        <span>${serverName}</span>
                    </div>`;
            }).join("");
        } else {
            subPanelHtml += '<div class="sp-item-placeholder">У вас пока нет серверов.</div>';
        }
        
        S.ui.setSubPanelContent(subPanelHtml);
        
        document.getElementById("sp-create-server")?.addEventListener("click", showCreateModal);
        document.getElementById("sp-discover-server")?.addEventListener("click", showDiscoverPage);
        document.querySelectorAll(".srv-item").forEach(el => {
            el.addEventListener("click", () => selectServer(el.dataset.sid));
        });

        S.ui.setMainContent(`
            <div class="main-content-placeholder">
                <i class="fa-solid fa-server"></i>
                <h3>Серверы</h3>
                <p>Создайте новый сервер или выберите существующий.</p>
            </div>`);
        S.ui.clearMembers();
        document.title = "Sentcor - Серверы";
    }


    // --- Public API ---
    S.servers = {
        init: initialize,
        show: showServersHome,
        load: loadSidebarServers,
        select: selectServer,
    };

    S.servers.init();

})();