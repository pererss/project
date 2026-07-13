// ============================================================
// SENTCOR — Profile + Settings Module v2
// Theme switcher, username cooldown, settings tab
// ============================================================
(function () {
  "use strict";
  const S = window.SENTCOR;
  const GAMES = ["Minecraft","CS2","Dota 2","League of Legends","Valorant","Apex Legends","Genshin Impact","Roblox","Fortnite","World of Warcraft","Cyberpunk 2077","Elden Ring","Baldur's Gate 3","Rust","GTA V","Deadlock","Overwatch 2","The Witcher 3","Stardew Valley","PUBG"];

  async function showProfilePage() {
    if (!S.user || !S.profile) return;
    S.ui.activateNav("profile");
    await S.auth.fetchProfile();
    const sp = document.getElementById("sub-panel"); if (sp) sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader("Профиль");
    // Sub-panel: tabs
    S.ui.setSubPanelContent(`
      <div class="sp-item active" data-p-tab="stats"><span class="sp-icon">📊</span><span class="sp-name">Статистика</span></div>
      <div class="sp-item" data-p-tab="settings"><span class="sp-icon">⚙️</span><span class="sp-name">Настройки</span></div>
      <div class="sp-item" data-p-tab="edit"><span class="sp-icon">✏️</span><span class="sp-name">Редактировать</span></div>
    `);
    document.querySelectorAll("#sp-content .sp-item[data-p-tab]").forEach(el => el.addEventListener("click", () => {
      document.querySelectorAll("#sp-content .sp-item").forEach(e => e.classList.remove("active"));
      el.classList.add("active");
      renderProfileTab(el.dataset.pTab);
    }));
    renderProfileTab("stats");
  }

  function renderProfileTab(tab) {
    const p = S.profile;
    if (tab === "stats") renderStats();
    else if (tab === "settings") renderSettings();
    else if (tab === "edit") renderEdit();
  }

  function renderStats() {
    const p = S.profile;
    const av = p.avatar_url ? `<img src="${p.avatar_url}" />` : (p.display_name||p.username||"?").charAt(0).toUpperCase();
    const since = new Date(p.created_at).toLocaleDateString("ru-RU", { year:"numeric", month:"long", day:"numeric" });
    let html = `<div class="profile-card">
      <div class="profile-banner"></div>
      <div class="profile-avatar-area"><div class="avatar avatar-lg">${av}</div><div><div class="profile-username">${S.escapeHtml(p.display_name||p.username)}</div><div class="profile-game">${S.escapeHtml(p.custom_status||p.game_status||"Не в игре")}</div></div></div>
      <div class="profile-info">
        <div class="profile-stats">
          <div class="profile-stat"><div class="profile-stat-val sentcoins">💎 ${(p.sent_coins||0).toLocaleString()}</div><div class="profile-stat-lbl">SentCoins</div></div>
          <div class="profile-stat"><div class="profile-stat-val">🔥 ${p.streak_days||0}</div><div class="profile-stat-lbl">Дней подряд</div></div>
          <div class="profile-stat"><div class="profile-stat-val">${since}</div><div class="profile-stat-lbl">На проекте с</div></div>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px;">
          <button class="btn btn-sm btn-primary" id="avatar-upload-btn">📷 Аватар</button>
          <input type="file" id="avatar-input" accept="image/*" hidden />
        </div>
      </div></div>`;
    S.ui.setMainContent(html); S.ui.clearMembers();
    document.getElementById("avatar-upload-btn").addEventListener("click", () => document.getElementById("avatar-input").click());
    document.getElementById("avatar-input").addEventListener("change", async e => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 5*1024*1024) { S.ui.toast("Файл > 5MB","error"); return; }
      const { url, error } = await S.auth.uploadAvatar(f);
      if (error) S.ui.toast("Ошибка","error"); else { S.ui.toast("Аватар обновлён!","success"); S.ui.updateFooter(); renderStats(); }
    });
  }

  function renderSettings() {
    const p = S.profile;
    const currentTheme = p.theme || "caramel";
    let html = `<div style="max-width:520px;">
      <div class="settings-section"><h3>Оформление</h3>
        <div class="settings-row"><div><span class="sr-label">Тема</span><div class="sr-desc">Выберите цветовую схему интерфейса</div></div></div>
        <div class="settings-theme-select">
          <div class="theme-option theme-caramel${currentTheme==="caramel"?" active":""}" data-theme="caramel" title="Карамельная"></div>
          <div class="theme-option theme-oled${currentTheme==="oled"?" active":""}" data-theme="oled" title="OLED"></div>
          <div class="theme-option theme-midnight${currentTheme==="midnight"?" active":""}" data-theme="midnight" title="Midnight"></div>
        </div>
      </div>
      <div class="settings-section"><h3>Аккаунт</h3>
        <div class="settings-row"><div><span class="sr-label">Имя пользователя</span><div class="sr-desc">${S.escapeHtml(p.username)}</div></div></div>
        <div class="settings-row"><div><span class="sr-label">Сменить имя</span><div class="sr-desc">${S.auth.canChangeUsername() ? "Доступно" : `Недоступно (ещё ${S.auth.daysUntilUsernameChange()} дн.)`}</div></div>${S.auth.canChangeUsername() ? '<button class="btn btn-sm btn-secondary" id="change-username-btn">Сменить</button>' : ''}</div>
        <div class="settings-row"><div><span class="sr-label">Игровой статус</span><div class="sr-desc">${S.escapeHtml(p.game_status||"Не выбран")}</div></div><select class="input" id="settings-game-select" style="width:auto;min-width:160px;"><option value="">— Не в игре —</option>${GAMES.map(g=>`<option value="${g}" ${p.game_status===`Играет в ${g}`?"selected":""}>${g}</option>`).join("")}</select></div>
        <div class="settings-row"><div><span class="sr-label">Польз. статус</span></div><input class="input" id="settings-custom-status" value="${S.escapeHtml(p.custom_status||"")}" placeholder="Ваш статус..." maxlength="100" style="width:auto;min-width:160px;" /></div>
        <div style="display:flex;gap:8px;margin-top:8px;"><button class="btn btn-sm btn-primary" id="save-settings-btn">Сохранить</button></div>
      </div>
      <div class="settings-section"><h3>Опасное</h3>
        <button class="btn btn-danger btn-sm" id="logout-settings-btn">Выйти из аккаунта</button>
      </div>
    </div>`;
    S.ui.setMainContent(html); S.ui.clearMembers();
    // Theme select
    document.querySelectorAll(".theme-option").forEach(el => { el.addEventListener("click", () => { document.querySelectorAll(".theme-option").forEach(e=>e.classList.remove("active")); el.classList.add("active"); applyThemeNow(el.dataset.theme); }); });
    document.getElementById("save-settings-btn").addEventListener("click", async () => {
      const game = document.getElementById("settings-game-select").value;
      const cs = document.getElementById("settings-custom-status").value.trim();
      const updates = {};
      if (game) updates.game_status = `Играет в ${game}`; else updates.game_status = null;
      if (cs) updates.custom_status = cs; else updates.custom_status = null;
      const { error } = await S.auth.updateProfile(updates);
      if (error) S.ui.toast("Ошибка","error"); else S.ui.toast("Настройки сохранены!","success");
    });
    if (S.auth.canChangeUsername()) {
      document.getElementById("change-username-btn").addEventListener("click", showChangeUsernameModal);
    }
    document.getElementById("logout-settings-btn").addEventListener("click", () => { S.ui.confirm("Выйти?","Вы уверены?", async ()=>{ await S.auth.signOut(); }); });
  }

  function applyThemeNow(theme) {
    document.body.classList.remove("theme-oled", "theme-midnight");
    if (theme && theme !== "caramel") document.body.classList.add("theme-" + theme);
    S.auth.updateProfile({ theme });
  }

  function showChangeUsernameModal() {
    const remaining = S.auth.daysUntilUsernameChange();
    const body = `<div class="input-group"><label class="input-label">Новое имя</label><input class="input" id="new-username" placeholder="NewName" maxlength="32" /><div class="input-error" id="new-username-error"></div></div><p style="font-size:11px;color:var(--text-muted);">Менять можно раз в ${S.SENTCOR_CONFIG.USERNAME_CHANGE_COOLDOWN_DAYS} дней${remaining>0?`. Осталось: ${remaining} дн.`:""}</p>`;
    S.ui.showModal("Сменить имя", body, [
      { text: "Отмена", cls: "btn-secondary" },
      { text: "Сменить", cls: "btn-primary", onClick: async () => {
        const nu = document.getElementById("new-username").value.trim();
        if (!nu || nu.length < 3) { document.getElementById("new-username-error").textContent="Минимум 3 символа"; return; }
        const { error } = await S.auth.updateProfile({ username: nu, last_username_change: new Date().toISOString() });
        if (error) { document.getElementById("new-username-error").textContent=S.ui.getErrorMessage(error); }
        else { S.ui.toast("Имя изменено!","success"); S.ui.updateFooter(); document.querySelector(".modal-overlay").remove(); renderSettings(); }
      }}
    ]);
  }

  function renderEdit() {
    const p = S.profile;
    let html = `<div class="input-group" style="max-width:520px;"><label class="input-label">Отображаемое имя</label><input class="input" id="edit-display-name" value="${S.escapeHtml(p.display_name||"")}" placeholder="Ваше имя" maxlength="50" /></div>
      <div class="input-group" style="max-width:520px;margin-bottom:12px;"><label class="input-label">Игровой статус</label><select class="input" id="edit-game-select"><option value="">— Не в игре —</option>${GAMES.map(g=>`<option value="${g}" ${p.game_status===`Играет в ${g}`?"selected":""}>${g}</option>`).join("")}</select></div>
      <button class="btn btn-primary btn-sm" id="save-edit-btn">Сохранить</button>`;
    S.ui.setMainContent(html); S.ui.clearMembers();
    document.getElementById("save-edit-btn").addEventListener("click", async () => {
      const dn = document.getElementById("edit-display-name").value.trim();
      const game = document.getElementById("edit-game-select").value;
      const updates = {};
      if (dn) updates.display_name = dn;
      updates.game_status = game ? `Играет в ${game}` : null;
      const { error } = await S.auth.updateProfile(updates);
      if (error) S.ui.toast("Ошибка","error"); else { S.ui.toast("Изменения сохранены!","success"); S.ui.updateFooter(); renderEdit(); }
    });
  }

  function showStatusSelector() {
    const sts = [ { v:"online", l:"🟢 В сети", c:"status-online"},{v:"idle",l:"🟡 Не активен",c:"status-idle"},{v:"dnd",l:"🔴 Не беспокоить",c:"status-dnd"},{v:"offline",l:"⚫ Невидимый",c:"status-offline"}];
    let html = '<div style="display:flex;flex-direction:column;gap:3px;">';
    sts.forEach(s => { html += `<button class="btn btn-ghost status-option-btn" data-s="${s.v}" style="justify-content:flex-start;padding:9px 14px;${S.profile.status===s.v?"background:var(--bg-hover)":""}"><span class="status-dot ${s.c}"></span><span>${s.l}</span></button>`; });
    html += '</div>';
    S.ui.showModal("Статус", html, [{ text: "Закрыть", cls: "btn-secondary" }]);
    document.querySelectorAll(".status-option-btn").forEach(btn => { btn.addEventListener("click", async () => { await S.auth.setOnlineStatus(btn.dataset.s); S.ui.updateFooter(); S.ui.toast("Статус обновлён","info"); document.querySelector(".modal-overlay").remove(); }); });
  }

  S.profile = { showProfilePage, showStatusSelector };
})();