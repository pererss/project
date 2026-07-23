// SENTCOR v7.0 — Standardized Servers Module
(function() {
    "use strict";

    window.S = window.SENTCOR = window.S || {};
    const S = window.S;
    const sb = S.sb;

    let activeServerId = null;

    function init() {
        // This function is called after the user is authenticated.
        // It sets up listeners for server-related UI elements.
        S.ui.onReady(() => {
            document.getElementById("sp-create-server")?.addEventListener("click", showCreateModal);
            loadSidebarServers();
        });
    }

    async function loadSidebarServers() {
        if (!S.user) return;
        try {
            const { data: members, error: memberError } = await sb.from("server_members").select("server_id").eq("user_id", S.user.id);
            if (memberError) throw memberError;

            const serverContainer = document.getElementById("sidebar-servers");
            if (!serverContainer || !members || members.length === 0) {
                serverContainer.innerHTML = "";
                return;
            }

            const serverIds = members.map(x => x.server_id);
            const { data: servers, error: serverError } = await sb.from("servers").select("*").in("id", serverIds).order("created_at");
            if (serverError) throw serverError;

            renderSidebarIcons(servers || []);
        } catch (e) {
            console.error("[Servers] Failed to load sidebar servers:", e);
            S.toast.show("Не удалось загрузить список серверов.", "error");
        }
    }

    async function loadMembers(serverId) {
        try {
            const { data: members, error: memberError } = await sb.from("server_members").select("user_id").eq("server_id", serverId);
            if (memberError) throw memberError;
            if (!members) return;

            const userIds = members.map(m => m.user_id);
            await S.chat.fetchProfiles(userIds); // Use chat's profile cache

            const profiles = userIds.map(id => S.chat.pCache[id]).filter(Boolean);
            
            const online = profiles.filter(p => ["online", "idle", "dnd"].includes(p.status));
            const offline = profiles.filter(p => !online.includes(p));

            let membersHtml = "";
            if (online.length > 0) {
                membersHtml += `<div class="sp-section-title">В сети — ${online.length}</div>`;
                online.forEach(m => membersHtml += S.ui.helpers.createMemberItem(m));
            }
            if (offline.length > 0) {
                membersHtml += `<div class="sp-section-title">Не в сети — ${offline.length}</div>`;
                offline.forEach(m => membersHtml += S.ui.helpers.createMemberItem(m));
            }
            
            // This part needs a target element in the main UI structure
            const membersContainer = document.getElementById('server-members-list');
            if(membersContainer) membersContainer.innerHTML = membersHtml;

        } catch (e) {
            console.error("[Servers] Failed to load members:", e);
            S.toast.show("Ошибка загрузки участников сервера.", "error");
        }
    }

    function renderSidebarIcons(servers) {
        const container = document.getElementById("sidebar-servers");
        if (!container) return;

        container.innerHTML = servers.map(server => {
            const serverName = S.ui.escapeHtml(server.name);
            return `
                <div class="server-icon-nav" data-sid="${server.id}" title="${serverName}">
                    <span>${serverName.charAt(0).toUpperCase()}</span>
                </div>`;
        }).join("");

        container.querySelectorAll(".server-icon-nav").forEach(el => {
            el.addEventListener("click", () => selectServer(el.dataset.sid, servers));
        });
    }

    async function selectServer(serverId, servers) {
        if (!serverId || activeServerId === serverId) return;
        activeServerId = serverId;

        // Update UI state
        document.querySelectorAll("#sidebar .sidebar-nav, #sidebar .server-icon-nav").forEach(e => e.classList.remove("active"));
        document.querySelector(`.server-icon-nav[data-sid="${serverId}"]`)?.classList.add("active");

        const server = servers.find(s => s.id === serverId);
        if (!server) return;

        // Here you would typically render the server's channels and members
        // For now, we just log it.
        console.log(`[Servers] Selected server: ${server.name}`);
        document.title = `Sentcor - ${S.ui.escapeHtml(server.name)}`;
        
        await loadMembers(serverId);
    }
    
    function showCreateModal() {
        // Logic for showing a 'Create Server' modal
        S.toast.show("Функция создания сервера в разработке.", "info");
    }

    S.servers = {
        init,
        selectServer,
        loadMembers
    };

})();