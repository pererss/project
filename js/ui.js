// ============================================================
// SENTCOR — UI Helpers Module (DOM manipulation, modals, toasts)
// ============================================================
(function () {
  "use strict";

  const S = window.SENTCOR;

  // --- DOM REFS ---
  function $(sel) {
    return document.querySelector(sel);
  }
  function $$(sel) {
    return document.querySelectorAll(sel);
  }

  // --- TOAST ---
  let toastContainer = null;
  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function toast(message, type = "info", duration = 3000) {
    const container = ensureToastContainer();
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add("removing");
      el.addEventListener("animationend", () => el.remove());
    }, duration);
  }

  // --- MODAL ---
  function showModal(title, bodyHtml, buttons = []) {
    // Remove existing modal
    const existing = $(".modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const modal = document.createElement("div");
    modal.className = "modal";

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<h2>${title}</h2>
      <button class="btn btn-icon btn-ghost close-modal" title="Закрыть">✕</button>`;

    const body = document.createElement("div");
    body.className = "modal-body";
    if (typeof bodyHtml === "string") {
      body.innerHTML = bodyHtml;
    } else if (bodyHtml instanceof HTMLElement) {
      body.appendChild(bodyHtml);
    }

    const footer = document.createElement("div");
    footer.className = "modal-footer";

    buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.className = `btn ${b.cls || "btn-secondary"}`;
      btn.textContent = b.text;
      btn.addEventListener("click", (e) => {
        if (b.onClick) b.onClick(e, modal, overlay);
        if (b.closeOnClick !== false) overlay.remove();
      });
      footer.appendChild(btn);
    });

    modal.appendChild(header);
    modal.appendChild(body);
    if (buttons.length > 0) modal.appendChild(footer);
    overlay.appendChild(modal);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector(".close-modal").addEventListener("click", () => overlay.remove());

    document.body.appendChild(overlay);

    // Focus first input
    const firstInput = modal.querySelector("input");
    if (firstInput) firstInput.focus();

    return { overlay, modal, body, footer };
  }

  // --- CONFIRM DIALOG ---
  function confirm(title, message, onConfirm, onCancel) {
    showModal(title, `<p style="color:var(--text-secondary)">${message}</p>`, [
      {
        text: "Отмена",
        cls: "btn-secondary",
        onClick: () => {
          if (onCancel) onCancel();
        },
      },
      {
        text: "Подтвердить",
        cls: "btn-danger",
        onClick: () => {
          if (onConfirm) onConfirm();
        },
      },
    ]);
  }

  // --- RENDER AUTH SCREEN ---
  function showAuth() {
    const app = $("#app");
    if (!app) return;

    app.innerHTML = `
      <div class="auth-screen" id="auth-screen">
        <div class="auth-logo">SENTCOR</div>
        <div class="auth-subtitle">Игровой мессенджер</div>
        <div class="auth-card" id="auth-card">
          <!-- Rendered dynamically below -->
        </div>
      </div>
    `;
    renderLoginForm();
  }

  function renderLoginForm() {
    const card = $("#auth-card");
    if (!card) return;
    card.innerHTML = `
      <h2>Вход</h2>
      <div class="input-group">
        <label class="input-label">Email</label>
        <input class="input" type="email" id="login-email" placeholder="your@email.com" autocomplete="email" />
        <div class="input-error" id="login-email-error"></div>
      </div>
      <div class="input-group">
        <label class="input-label">Пароль</label>
        <input class="input" type="password" id="login-password" placeholder="••••••••" autocomplete="current-password" />
        <div class="input-error" id="login-password-error"></div>
      </div>
      <div class="input-error" id="login-general-error"></div>
      <button class="btn btn-primary" id="login-btn">Войти</button>
      <div class="auth-switch">
        Нет аккаунта? <a id="switch-to-register">Зарегистрироваться</a>
      </div>
    `;

    $("#login-btn").addEventListener("click", handleLogin);
    $("#login-password").addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
    $("#switch-to-register").addEventListener("click", renderRegisterForm);
  }

  function renderRegisterForm() {
    const card = $("#auth-card");
    if (!card) return;
    card.innerHTML = `
      <h2>Регистрация</h2>
      <div class="input-group">
        <label class="input-label">Имя пользователя</label>
        <input class="input" type="text" id="reg-username" placeholder="PlayerName" maxlength="32" />
        <div class="input-error" id="reg-username-error"></div>
      </div>
      <div class="input-group">
        <label class="input-label">Email</label>
        <input class="input" type="email" id="reg-email" placeholder="your@email.com" autocomplete="email" />
        <div class="input-error" id="reg-email-error"></div>
      </div>
      <div class="input-group">
        <label class="input-label">Пароль</label>
        <input class="input" type="password" id="reg-password" placeholder="Минимум 6 символов" autocomplete="new-password" />
        <div class="input-error" id="reg-password-error"></div>
      </div>
      <div class="input-error" id="reg-general-error"></div>
      <button class="btn btn-primary" id="reg-btn">Создать аккаунт</button>
      <div class="auth-switch">
        Уже есть аккаунт? <a id="switch-to-login">Войти</a>
      </div>
    `;

    $("#reg-btn").addEventListener("click", handleRegister);
    $("#reg-password").addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleRegister();
    });
    $("#switch-to-login").addEventListener("click", renderLoginForm);
  }

  async function handleLogin() {
    clearAuthErrors();
    const email = $("#login-email").value.trim();
    const password = $("#login-password").value;

    let valid = true;
    if (!email) {
      showAuthError("login-email-error", "Введите email");
      valid = false;
    }
    if (!password) {
      showAuthError("login-password-error", "Введите пароль");
      valid = false;
    }
    if (!valid) return;

    const btn = $("#login-btn");
    btn.disabled = true;
    btn.textContent = "Входим...";

    const { error } = await S.auth.signIn(email, password);
    if (error) {
      showAuthError("login-general-error", getErrorMessage(error));
      btn.disabled = false;
      btn.textContent = "Войти";
    }
    // Success is handled by onAuthStateChange
  }

  async function handleRegister() {
    clearAuthErrors();
    const username = $("#reg-username").value.trim();
    const email = $("#reg-email").value.trim();
    const password = $("#reg-password").value;

    let valid = true;
    if (!username || username.length < 3) {
      showAuthError("reg-username-error", "Минимум 3 символа");
      valid = false;
    }
    if (!email) {
      showAuthError("reg-email-error", "Введите email");
      valid = false;
    }
    if (!password || password.length < 6) {
      showAuthError("reg-password-error", "Минимум 6 символов");
      valid = false;
    }
    if (!valid) return;

    const btn = $("#reg-btn");
    btn.disabled = true;
    btn.textContent = "Создаём...";

    const { error } = await S.auth.signUp(email, password, username);
    if (error) {
      showAuthError("reg-general-error", getErrorMessage(error));
      btn.disabled = false;
      btn.textContent = "Создать аккаунт";
    } else {
      toast("Аккаунт создан! Проверьте почту для подтверждения.", "success", 5000);
      renderLoginForm();
    }
  }

  function clearAuthErrors() {
    $$(".input-error").forEach((el) => (el.textContent = ""));
  }
  function showAuthError(id, msg) {
    const el = $("#" + id);
    if (el) el.textContent = msg;
  }
  function getErrorMessage(error) {
    if (!error) return "Неизвестная ошибка";
    if (error.message) return error.message;
    return String(error);
  }

  // --- RENDER MAIN APP ---
  function showApp() {
    const app = $("#app");
    if (!app) return;

    app.innerHTML = `
      <div id="sidebar">
        <div class="server-icon active" data-server="dm" title="Друзья">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12h8M12 8v8"/><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <div class="sidebar-separator"></div>
        <div id="sidebar-servers"></div>
        <div class="server-icon add-server" id="add-server-btn" title="Создать сервер">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        <div class="server-icon" id="profile-btn" title="Профиль" style="margin-top:auto">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 8-8 8 8 0 0 1 8 8v1"/></svg>
        </div>
      </div>
      <div id="server-list">
        <div id="server-list-header" class="server-header">
          <span class="truncate">Друзья</span>
          <div class="server-header-actions"></div>
        </div>
        <div class="channel-list" id="channel-list"></div>
        <div class="server-footer">
          <div class="avatar" id="footer-avatar"></div>
          <div class="user-info">
            <div class="username" id="footer-username"></div>
            <div class="user-status" id="footer-status"></div>
          </div>
          <div class="server-footer-actions">
            <button class="btn btn-icon btn-ghost btn-sm tooltip" data-tooltip="Выйти" id="logout-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div id="chat-area"></div>
      <div id="members-list"></div>
    `;

    // Update footer with user info
    updateFooter();

    // Sidebar events
    $("#add-server-btn").addEventListener("click", () => S.servers.showCreateServerModal());
    $("#profile-btn").addEventListener("click", () => S.profile.showProfilePage());
    $("#logout-btn").addEventListener("click", () => {
      confirm("Выход", "Вы уверены, что хотите выйти?", async () => {
        await S.auth.setOnlineStatus("offline");
        await S.auth.signOut();
      });
    });

    // DM icon click
    const dmIcon = document.querySelector('.server-icon[data-server="dm"]');
    if (dmIcon) {
      dmIcon.addEventListener("click", () => S.friends.showFriendsPage());
    }

    // Load servers
    S.servers.loadServers();

    // Show friends page by default
    S.friends.showFriendsPage();
  }

  function updateFooter() {
    if (!S.profile) return;
    const avatarEl = $("#footer-avatar");
    const usernameEl = $("#footer-username");
    const statusEl = $("#footer-status");

    if (avatarEl && S.profile.avatar_url) {
      avatarEl.style.backgroundImage = `url(${S.profile.avatar_url})`;
      avatarEl.style.backgroundSize = "cover";
    }
    if (usernameEl) usernameEl.textContent = S.profile.display_name || S.profile.username;
    if (statusEl) {
      const statusMap = { online: "В сети", idle: "Не активен", dnd: "Не беспокоить", offline: "Не в сети" };
      statusEl.textContent = statusMap[S.profile.status] || S.profile.status || "В сети";
    }
  }

  // --- RENDER SERVER LIST ---
  function renderServerList(server) {
    const header = $("#server-list-header");
    if (header) {
      header.querySelector(".truncate").textContent = server.name;
    }

    S.servers.loadChannels(server.id);
  }

  // --- HIGHLIGHT ACTIVE CHANNEL ---
  function setActiveChannel(channelId) {
    $$("#channel-list .channel-item").forEach((el) => el.classList.remove("active"));
    const active = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
    if (active) active.classList.add("active");
  }

  // --- RENDER CHAT AREA ---
  function renderChatHeader(channel) {
    const chatArea = $("#chat-area");
    if (!chatArea) return;

    const icon = channel.type === "voice" 
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

    chatArea.innerHTML = `
      <div class="chat-header">
        <span class="channel-icon">${icon}</span>
        <span>${S.escapeHtml(channel.name)}</span>
        ${channel.topic ? `<span class="chat-topic">${S.escapeHtml(channel.topic)}</span>` : ""}
      </div>
      <div class="chat-messages" id="chat-messages">
        <div class="empty-state">
          <h3>Добро пожаловать в #${S.escapeHtml(channel.name)}!</h3>
          <p>Здесь пока нет сообщений. Будьте первым!</p>
        </div>
      </div>
      <div class="chat-input-area" id="chat-input-area"></div>
    `;

    if (channel.type === "text") {
      renderChatInput(channel);
    } else {
      renderVoiceChannelUI(channel);
    }
  }

  function renderChatInput(channel) {
    const area = $("#chat-input-area");
    if (!area) return;
    area.innerHTML = `
      <div class="chat-input-wrapper">
        <textarea id="msg-input" rows="1" placeholder="Напишите сообщение... (#${S.escapeHtml(channel.name)})" maxlength="${S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH}"></textarea>
        <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Отправить" id="send-msg-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    `;

    const textarea = $("#msg-input");
    const sendBtn = $("#send-msg-btn");

    // Auto-resize
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    });

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(channel);
      }
    });

    sendBtn.addEventListener("click", () => sendMessage(channel));
  }

  async function sendMessage(channel) {
    const textarea = $("#msg-input");
    if (!textarea) return;
    const content = textarea.value.trim();
    if (!content) return;

    textarea.disabled = true;
    const { error } = await S.chat.sendMessage(channel.id, content);
    if (error) {
      toast("Ошибка отправки: " + getErrorMessage(error), "error");
      textarea.disabled = false;
    } else {
      textarea.value = "";
      textarea.style.height = "auto";
      textarea.disabled = false;
      textarea.focus();
    }
  }

  function renderVoiceChannelUI(channel) {
    const area = $("#chat-input-area");
    if (!area) return;
    area.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:20px;">
        <button class="btn btn-primary" id="join-voice-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>
          Подключиться к голосовому каналу
        </button>
      </div>
    `;
    $("#join-voice-btn").addEventListener("click", () => S.voice.joinChannel(channel));
  }

  // --- APPEND MESSAGE TO CHAT ---
  function appendMessage(msg, profilesMap = {}) {
    const container = $("#chat-messages");
    if (!container) return;

    // Remove empty state
    const empty = container.querySelector(".empty-state");
    if (empty) empty.remove();

    const sender = profilesMap[msg.sender_id] || {};
    const author = sender.display_name || sender.username || "Unknown";
    const avatar = sender.avatar_url || "";
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const el = document.createElement("div");
    el.className = "message";
    el.id = `msg-${msg.id}`;
    el.innerHTML = `
      <div class="avatar" style="${avatar ? `background-image:url(${avatar});background-size:cover` : ""}"></div>
      <div class="message-body">
        <div class="message-header">
          <span class="message-author">${S.escapeHtml(author)}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${S.escapeHtml(msg.content)}</div>
        ${msg.edited ? '<span class="message-edited">(изменено)</span>' : ""}
      </div>
    `;
    container.appendChild(el);

    // Auto-scroll
    container.scrollTop = container.scrollHeight;
  }

  // --- RENDER MEMBERS ---
  function renderMembers(members) {
    const list = $("#members-list");
    if (!list) return;

    const online = members.filter((m) => m.status === "online" || m.status === "idle" || m.status === "dnd");
    const offline = members.filter((m) => m.status === "offline" || !m.status);

    let html = "";
    if (online.length > 0) {
      html += `<div class="members-category">В сети — ${online.length}</div>`;
      online.forEach((m) => {
        html += memberItemHtml(m);
      });
    }
    if (offline.length > 0) {
      html += `<div class="members-category">Не в сети — ${offline.length}</div>`;
      offline.forEach((m) => {
        html += memberItemHtml(m);
      });
    }

    list.innerHTML = html;
  }

  function memberItemHtml(member) {
    const avatar = member.avatar_url ? `style="background-image:url(${member.avatar_url});background-size:cover"` : "";
    const name = member.display_name || member.username || "Unknown";
    return `
      <div class="member-item">
        <div class="avatar avatar-sm" ${avatar}></div>
        <span class="status-dot status-${member.status || "offline"}"></span>
        <span class="member-name">${S.escapeHtml(name)}</span>
        ${member.game_status ? `<span class="member-game">${S.escapeHtml(member.game_status)}</span>` : ""}
      </div>
    `;
  }

  // --- PAGE CONTAINER (for Friends, Profile etc.) ---
  function showPage(title, tabsHtml, contentHtml) {
    const chatArea = $("#chat-area");
    const membersList = $("#members-list");
    if (!chatArea) return;

    chatArea.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h2>${title}</h2>
        </div>
        ${tabsHtml ? `<div class="page-tabs">${tabsHtml}</div>` : ""}
        <div class="page-content">${contentHtml}</div>
      </div>
    `;
    if (membersList) membersList.innerHTML = "";
  }

  // --- ESCAPE HTML ---
  S.escapeHtml = function (str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  // --- EXPORT ---
  S.ui = {
    $,
    $$,
    toast,
    showModal,
    confirm,
    showAuth,
    showApp,
    updateFooter,
    renderServerList,
    setActiveChannel,
    renderChatHeader,
    renderChatInput,
    renderVoiceChannelUI,
    appendMessage,
    renderMembers,
    showPage,
    getErrorMessage,
  };
})();