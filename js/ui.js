// ============================================================
// SENTCOR — UI Module v2
// Twemoji, context menus, sub-panels, new layout
// ============================================================
(function () {
  "use strict";
  const S = window.SENTCOR;
  function $(s) { return document.querySelector(s); }
  function $$(s) { return document.querySelectorAll(s); }

  // ---- TOAST ----
  let tc = null;
  function toast(msg, type = "info", dur = 3000) {
    if (!tc) { tc = document.createElement("div"); tc.className = "toast-container"; document.body.appendChild(tc); }
    const el = document.createElement("div"); el.className = `toast toast-${type}`; el.textContent = msg;
    tc.appendChild(el);
    setTimeout(() => { el.classList.add("removing"); el.addEventListener("animationend", () => el.remove()); }, dur);
  }

  // ---- MODAL ----
  function showModal(title, bodyHtml, buttons = []) {
    const existing = $(".modal-overlay"); if (existing) existing.remove();
    const overlay = document.createElement("div"); overlay.className = "modal-overlay";
    const modal = document.createElement("div"); modal.className = "modal";
    modal.innerHTML = `<div class="modal-header"><h2>${title}</h2><button class="btn btn-icon btn-ghost close-modal">✕</button></div>`;
    const body = document.createElement("div"); body.className = "modal-body";
    if (typeof bodyHtml === "string") body.innerHTML = bodyHtml; else if (bodyHtml instanceof HTMLElement) body.appendChild(bodyHtml);
    modal.appendChild(body);
    if (buttons.length) {
      const footer = document.createElement("div"); footer.className = "modal-footer";
      buttons.forEach(b => { const btn = document.createElement("button"); btn.className = `btn ${b.cls || "btn-secondary"}`; btn.textContent = b.text; btn.addEventListener("click", e => { if (b.onClick) b.onClick(e, modal, overlay); if (b.closeOnClick !== false) overlay.remove(); }); footer.appendChild(btn); });
      modal.appendChild(footer);
    }
    overlay.appendChild(modal);
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector(".close-modal").addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
    const fi = modal.querySelector("input"); if (fi) fi.focus();
    return { overlay, modal, body };
  }

  function confirm(title, msg, onConfirm, onCancel) {
    showModal(title, `<p style="color:var(--text-secondary)">${msg}</p>`, [
      { text: "Отмена", cls: "btn-secondary", onClick: () => { if (onCancel) onCancel(); } },
      { text: "Подтвердить", cls: "btn-danger", onClick: () => { if (onConfirm) onConfirm(); } }
    ]);
  }

  // ---- CONTEXT MENU ----
  function showContextMenu(items, x, y) {
    closeContextMenu();
    const menu = document.createElement("div"); menu.className = "context-menu"; menu.id = "context-menu";
    items.forEach(it => {
      if (it === "separator") { const sep = document.createElement("div"); sep.className = "context-menu-separator"; menu.appendChild(sep); return; }
      const el = document.createElement("button"); el.className = "context-menu-item" + (it.danger ? " danger" : "");
      el.innerHTML = (it.icon || "") + " " + (it.label || "");
      el.addEventListener("click", e => { e.stopPropagation(); closeContextMenu(); if (it.action) it.action(); });
      menu.appendChild(el);
    });
    menu.style.left = Math.min(x, window.innerWidth - 190) + "px";
    menu.style.top = Math.min(y, window.innerHeight - menu.scrollHeight - 10) + "px";
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener("click", closeContextMenu, { once: true }), 10);
  }
  function closeContextMenu() { const m = document.getElementById("context-menu"); if (m) m.remove(); }

  // ---- TWEMOJI PARSE ----
  function twemojiParse(el) {
    if (typeof twemoji !== "undefined" && el) {
      try { twemoji.parse(el, { folder: "svg", ext: ".svg" }); } catch (e) {}
    }
  }

  // ---- AUTH ----
  function showAuth() {
    const app = $("#app"); if (!app) return;
    app.innerHTML = `<div class="auth-screen"><div class="auth-logo">SENTCOR</div><div class="auth-subtitle">Игровой мессенджер</div><div class="auth-card" id="auth-card"></div></div>`;
    renderLoginForm();
  }
  function renderLoginForm() {
    const card = $("#auth-card"); if (!card) return;
    card.innerHTML = `<h2>Вход</h2>
      <div class="input-group"><label class="input-label">Email</label><input class="input" type="email" id="login-email" placeholder="your@email.com" autocomplete="email" /><div class="input-error" id="login-email-error"></div></div>
      <div class="input-group"><label class="input-label">Пароль</label><input class="input" type="password" id="login-password" placeholder="••••••••" autocomplete="current-password" /><div class="input-error" id="login-password-error"></div></div>
      <div class="input-error" id="login-general-error"></div>
      <button class="btn btn-primary" id="login-btn">Войти</button>
      <div class="auth-switch">Нет аккаунта? <a id="switch-to-reg">Зарегистрироваться</a></div>`;
    $("#login-btn").addEventListener("click", handleLogin);
    $("#login-password").addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });
    $("#switch-to-reg").addEventListener("click", renderRegisterForm);
  }
  function renderRegisterForm() {
    const card = $("#auth-card"); if (!card) return;
    card.innerHTML = `<h2>Регистрация</h2>
      <div class="input-group"><label class="input-label">Имя пользователя</label><input class="input" type="text" id="reg-username" placeholder="PlayerName" maxlength="32" /><div class="input-error" id="reg-username-error"></div></div>
      <div class="input-group"><label class="input-label">Email</label><input class="input" type="email" id="reg-email" placeholder="your@email.com" /><div class="input-error" id="reg-email-error"></div></div>
      <div class="input-group"><label class="input-label">Пароль</label><input class="input" type="password" id="reg-password" placeholder="Минимум 6 символов" /><div class="input-error" id="reg-password-error"></div></div>
      <div class="input-error" id="reg-general-error"></div>
      <button class="btn btn-primary" id="reg-btn">Создать аккаунт</button>
      <div class="auth-switch">Уже есть аккаунт? <a id="switch-to-login">Войти</a></div>`;
    $("#reg-btn").addEventListener("click", handleRegister);
    $("#reg-password").addEventListener("keydown", e => { if (e.key === "Enter") handleRegister(); });
    $("#switch-to-login").addEventListener("click", renderLoginForm);
  }
  function clearAuthErrors() { $$(".input-error").forEach(el => el.textContent = ""); }
  function showAuthError(id, msg) { const el = $("#"+id); if (el) el.textContent = msg; }
  function getErrorMessage(err) { return err ? (err.message || String(err)) : "Неизвестная ошибка"; }
  async function handleLogin() {
    clearAuthErrors(); const email = $("#login-email").value.trim(), password = $("#login-password").value;
    let v = true;
    if (!email) { showAuthError("login-email-error","Введите email"); v = false; }
    if (!password) { showAuthError("login-password-error","Введите пароль"); v = false; }
    if (!v) return;
    const btn = $("#login-btn"); btn.disabled = true; btn.textContent = "Входим...";
    const { error } = await S.auth.signIn(email, password);
    if (error) { showAuthError("login-general-error", getErrorMessage(error)); btn.disabled = false; btn.textContent = "Войти"; }
  }
  async function handleRegister() {
    clearAuthErrors(); const username = $("#reg-username").value.trim(), email = $("#reg-email").value.trim(), password = $("#reg-password").value;
    let v = true;
    if (!username || username.length < 3) { showAuthError("reg-username-error","Минимум 3 символа"); v = false; }
    if (!email) { showAuthError("reg-email-error","Введите email"); v = false; }
    if (!password || password.length < 6) { showAuthError("reg-password-error","Минимум 6 символов"); v = false; }
    if (!v) return;
    const btn = $("#reg-btn"); btn.disabled = true; btn.textContent = "Создаём...";
    const { error } = await S.auth.signUp(email, password, username);
    if (error) { showAuthError("reg-general-error", getErrorMessage(error)); btn.disabled = false; btn.textContent = "Создать аккаунт"; }
    else { toast("Аккаунт создан! Проверьте почту для подтверждения.", "success", 5000); renderLoginForm(); }
  }

  // ---- MAIN APP ----
  function showApp() {
    const app = $("#app"); if (!app) return;
    app.innerHTML = `
      <div id="sidebar">
        <div class="sidebar-logo" id="home-logo-btn" title="Главная">S</div>
        <div class="sidebar-sep"></div>
        <div class="sidebar-nav active" id="nav-friends" data-nav="friends" title="Друзья"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 8-8 8 8 0 0 1 8 8v1"/></svg></div>
        <div class="sidebar-nav" id="nav-servers" data-nav="servers" title="Серверы"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <div class="sidebar-sep"></div>
        <div id="sidebar-servers"></div>
        <div class="server-icon-nav" id="add-server-nav" title="Создать сервер"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg></div>
        <div style="margin-top:auto;"></div>
        <div class="sidebar-nav" id="nav-profile" data-nav="profile" title="Профиль"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M18 21v-1a7 7 0 0 0-12 0v1"/></svg></div>
      </div>
      <div id="sub-panel">
        <div class="sub-panel-header" id="sp-header"><span id="sp-header-title">Друзья</span><div class="sub-panel-header-actions"><button class="btn btn-icon btn-ghost btn-sm" id="sp-close-btn" title="Скрыть панель"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button></div></div>
        <div class="sub-panel-content" id="sp-content"></div>
        <div class="sub-panel-footer">
          <div class="avatar" id="footer-avatar"></div>
          <div class="user-info"><div class="username" id="footer-username"></div><div class="user-status" id="footer-status"></div></div>
          <div class="sub-panel-footer-actions">
            <button class="btn btn-icon btn-ghost btn-sm" id="logout-btn" title="Выйти"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button>
          </div>
        </div>
      </div>
      <div id="main-area"></div>
      <div id="members-list"></div>`;

    updateFooter();
    bindSidebarEvents();
    showHomePage();
    S.servers.loadServersSidebar();
  }

  function bindSidebarEvents() {
    $("#home-logo-btn").addEventListener("click", () => { deactivateNav(); showHomePage(); });
    $("#nav-friends").addEventListener("click", () => { activateNav("friends"); S.friends.showFriendsPage(); });
    $("#nav-servers").addEventListener("click", () => { activateNav("servers"); S.servers.showServersPage(); });
    $("#nav-profile").addEventListener("click", () => { activateNav("profile"); S.profile.showProfilePage(); });
    $("#add-server-nav").addEventListener("click", () => S.servers.showCreateServerModal());
    $("#sp-close-btn").addEventListener("click", () => { const sp = $("#sub-panel"); sp.classList.toggle("collapsed"); });
    $("#logout-btn").addEventListener("click", () => { confirm("Выход","Вы уверены?", async () => { await S.auth.signOut(); }); });
    $("#footer-avatar").addEventListener("click", () => S.profile.showStatusSelector());
  }

  function activateNav(nav) {
    $$("#sidebar .sidebar-nav").forEach(el => el.classList.remove("active"));
    const el = document.getElementById("nav-" + nav); if (el) el.classList.add("active");
    $$("#sidebar .server-icon-nav").forEach(el => el.classList.remove("active"));
    const sp = $("#sub-panel"); if (sp) sp.classList.remove("collapsed");
  }
  function deactivateNav() {
    $$("#sidebar .sidebar-nav").forEach(el => el.classList.remove("active"));
    $$("#sidebar .server-icon-nav").forEach(el => el.classList.remove("active"));
  }

  function updateFooter() {
    if (!S.profile) return;
    const av = $("#footer-avatar"), un = $("#footer-username"), st = $("#footer-status");
    if (av && S.profile.avatar_url) { av.innerHTML = `<img src="${S.profile.avatar_url}" />`; }
    else if (av) { av.innerHTML = (S.profile.display_name || S.profile.username || "?").charAt(0).toUpperCase(); }
    if (un) un.textContent = S.profile.display_name || S.profile.username;
    if (st) { const map = { online: "🟢 В сети", idle: "🟡 Не активен", dnd: "🔴 Не беспокоить", offline: "⚫ Не в сети" }; st.textContent = map[S.profile.status] || S.profile.status || "В сети"; }
  }

  // ---- HOME ----
  function showHomePage() {
    const main = $("#main-area"); if (!main) return;
    const p = S.profile || {};
    main.innerHTML = `<div class="home-page">
      <div class="home-logo">SENTCOR</div><div class="home-subtitle">Игровой мессенджер</div>
      <div class="home-welcome">Добро пожаловать, ${S.escapeHtml(p.display_name || p.username || "игрок")}!</div>
      <div class="home-desc">Общайтесь в текстовых и голосовых каналах, добавляйте друзей, отслеживайте игровые статусы.</div>
      <div class="home-stats">
        <div class="home-stat"><div class="home-stat-val"><span class="sentcoins">💎 ${(p.sent_coins||0).toLocaleString()}</span></div><div class="home-stat-lbl">SentCoins</div></div>
        <div class="home-stat"><div class="home-stat-val">🔥 ${p.streak_days||0}</div><div class="home-stat-lbl">Дней подряд</div></div>
        <div class="home-stat"><div class="home-stat-val">${S.friendsList.length||0}</div><div class="home-stat-lbl">Друзей</div></div>
      </div>
    </div>`;
    const ml = $("#members-list"); if (ml) ml.innerHTML = "";
  }

  // ---- SUB-PANEL HELPERS ----
  function setSubPanelHeader(title) { const h = $("#sp-header-title"); if (h) h.textContent = title; }
  function setSubPanelContent(html) { const c = $("#sp-content"); if (c) { c.innerHTML = html; twemojiParse(c); } }
  function setMainContent(html) { const m = $("#main-area"); if (m) { m.innerHTML = html; twemojiParse(m); } }
  function clearMembers() { const ml = $("#members-list"); if (ml) ml.innerHTML = ""; }

  // ---- CHAT RENDER ----
  function renderChatView(channel, isDM = false, friendName = "") {
    const icon = channel.type === "voice"
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    const title = isDM ? `💬 ${S.escapeHtml(friendName)}` : `${icon} ${S.escapeHtml(channel.name)}`;
    const headerActions = isDM ? '<div class="friend-detail-actions"></div>' : '';
    let html = `<div class="chat-header"><span>${title}</span>${headerActions}</div>`;
    html += `<div class="chat-messages" id="chat-messages"><div class="empty-state"><h3>Добро пожаловать!</h3><p>Здесь пока нет сообщений.</p></div></div>`;
    if (channel.type === "text" || isDM) {
      html += `<div class="chat-input-area"><div class="chat-input-wrapper"><textarea id="msg-input" rows="1" placeholder="Напишите сообщение..." maxlength="${S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH}"></textarea><button class="btn btn-icon btn-ghost" id="send-msg-btn" title="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div></div>`;
    } else {
      html += `<div class="chat-input-area" style="text-align:center;padding:20px;"><button class="btn btn-primary" id="join-voice-btn">🔊 Подключиться</button></div>`;
    }
    setMainContent(html);
    if (channel.type === "text" || isDM) bindChatInput(channel, isDM);
    else if (!isDM) { const jv = $("#join-voice-btn"); if (jv) jv.addEventListener("click", () => S.voice.joinChannel(channel)); }
    clearMembers();
  }

  function bindChatInput(channel, isDM) {
    const ta = $("#msg-input"), sb = $("#send-msg-btn"); if (!ta) return;
    ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; });
    const send = async () => {
      const c = ta.value.trim(); if (!c) return;
      ta.disabled = true;
      let err;
      if (isDM) err = (await S.chat.sendDirectMessage(channel.receiver_id, c)).error;
      else err = (await S.chat.sendMessage(channel.id, c)).error;
      if (err) { toast("Ошибка: " + getErrorMessage(err),"error"); ta.disabled = false; }
      else { ta.value = ""; ta.style.height = "auto"; ta.disabled = false; ta.focus(); }
    };
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    sb.addEventListener("click", send);
  }

  function appendMessage(msg, profilesMap = {}) {
    const container = $("#chat-messages"); if (!container) return;
    const empty = container.querySelector(".empty-state"); if (empty) empty.remove();
    const sender = profilesMap[msg.sender_id] || {};
    const author = sender.display_name || sender.username || "Unknown";
    const avatar = sender.avatar_url || "";
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isMine = S.user && msg.sender_id === S.user.id;
    const el = document.createElement("div"); el.className = "message"; el.id = `msg-${msg.id}`; el.dataset.msgId = msg.id; el.dataset.senderId = msg.sender_id;
    el.innerHTML = `<div class="avatar">${avatar ? `<img src="${avatar}" />` : (author.charAt(0).toUpperCase())}</div>
      <div class="message-body"><div class="message-header"><span class="message-author">${S.escapeHtml(author)}</span><span class="message-time">${time}</span></div>
      <div class="message-content">${S.escapeHtml(msg.content)}</div>${msg.edited?'<span class="message-edited">(изменено)</span>':''}</div>`;
    el.addEventListener("contextmenu", e => {
      e.preventDefault();
      const items = [];
      if (isMine || (S.activeServer && S.ui.isAdmin)) { items.push({ label: "🗑️ Удалить сообщение", danger: true, action: () => { confirm("Удалить сообщение?", "Сообщение будет удалено безвозвратно.", async () => { await S.sb.from("messages").delete().eq("id", msg.id); el.remove(); }); } }); }
      if (isMine) { items.push({ label: "✏️ Редактировать", action: () => { const contentEl = el.querySelector(".message-content"); if (!contentEl) return; const orig = contentEl.textContent; const inp = document.createElement("textarea"); inp.value = orig; inp.style.cssText = "width:100%;background:var(--bg-deepest);color:var(--text-primary);border:1px solid var(--accent);border-radius:6px;padding:8px;font-size:13px;resize:none;"; contentEl.replaceWith(inp); inp.focus(); const save = async () => { const v = inp.value.trim(); if (v && v !== orig) { await S.sb.from("messages").update({ content: v, edited: true }).eq("id", msg.id); } window.location.reload(); }; inp.addEventListener("blur", save); inp.addEventListener("keydown", e => { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();save();} }); } }); }
      items.push({ label: "📋 Копировать текст", action: () => { navigator.clipboard.writeText(msg.content); toast("Текст скопирован", "info", 2000); } });
      showContextMenu(items, e.clientX, e.clientY);
    });
    el.addEventListener("click", e => { if (e.target.closest(".message-author")) { /* open profile mini */ } });
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    twemojiParse(el);
  }

  function renderMembers(members) {
    const list = $("#members-list"); if (!list) return;
    const online = members.filter(m => m.status === "online" || m.status === "idle" || m.status === "dnd");
    const offline = members.filter(m => m.status === "offline" || !m.status);
    let html = "";
    if (online.length) { html += `<div class="sp-section-title">В сети — ${online.length}</div>`; online.forEach(m => html += memberItem(m)); }
    if (offline.length) { html += `<div class="sp-section-title">Не в сети — ${offline.length}</div>`; offline.forEach(m => html += memberItem(m)); }
    list.innerHTML = html;
  }
  function memberItem(m) {
    const av = m.avatar_url ? `<img src="${m.avatar_url}" />` : (m.display_name||m.username||"?").charAt(0).toUpperCase();
    return `<div class="sp-item-friend"><div class="avatar avatar-sm">${av}</div><span class="status-dot status-${m.status||"offline"}"></span><span class="friend-name">${S.escapeHtml(m.display_name||m.username)}</span>${m.game_status?`<span class="friend-game">${S.escapeHtml(m.game_status)}</span>`:""}</div>`;
  }

  // Escaped html
  S.escapeHtml = function(str) { if (!str) return ""; const d = document.createElement("div"); d.textContent = str; return d.innerHTML; };

  S.ui = { $, $$, toast, showModal, confirm, showContextMenu, closeContextMenu, showAuth, showApp, updateFooter, activateNav, deactivateNav, showHomePage, setSubPanelHeader, setSubPanelContent, setMainContent, clearMembers, renderChatView, appendMessage, renderMembers, getErrorMessage, twemojiParse, isAdmin: false };
})();