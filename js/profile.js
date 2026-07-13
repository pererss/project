// ============================================================
// SENTCOR — Profile & Gamification Module
// ============================================================
(function () {
  "use strict";

  const S = window.SENTCOR;

  // --- GAME STATUS OPTIONS ---
  const GAME_PRESETS = [
    "Minecraft",
    "Counter-Strike 2",
    "Dota 2",
    "League of Legends",
    "Valorant",
    "Apex Legends",
    "Genshin Impact",
    "Roblox",
    "Fortnite",
    "World of Warcraft",
    "Cyberpunk 2077",
    "Elden Ring",
    "Baldur's Gate 3",
    "Rust",
    "GTA V",
    "Deadlock",
    "Overwatch 2",
    "The Witcher 3",
    "Stardew Valley",
    "PUBG",
  ];

  // --- SHOW PROFILE PAGE ---
  async function showProfilePage() {
    if (!S.user || !S.profile) return;

    // Refresh profile to get latest data
    await S.auth.fetchProfile();

    const p = S.profile;
    const avatarUrl = p.avatar_url || "";
    const username = p.display_name || p.username || "Unknown";
    const streak = p.streak_days || 0;
    const coins = p.sent_coins || 0;
    const gameStatus = p.game_status || "Не в игре";
    const customStatus = p.custom_status || "";
    const memberSince = new Date(p.created_at).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const contentHtml = `
      <div class="profile-card">
        <div class="profile-banner"></div>
        <div class="profile-avatar-area">
          <div class="avatar avatar-lg" style="${avatarUrl ? `background-image:url(${avatarUrl});background-size:cover` : ""}"></div>
          <div>
            <div class="profile-username">${S.escapeHtml(username)}</div>
            <div class="profile-game">${S.escapeHtml(p.custom_status || p.game_status || "Не в игре")}</div>
          </div>
        </div>
        <div class="profile-info">
          <div class="profile-stats">
            <div class="profile-stat">
              <div class="profile-stat-value sentcoins">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#d9a43a"/><text x="12" y="16" text-anchor="middle" font-size="12" font-weight="bold" fill="#3d2a1a">S</text></svg>
                ${coins.toLocaleString()}
              </div>
              <div class="profile-stat-label">SentCoins</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-value">🔥 ${streak}</div>
              <div class="profile-stat-label">Дней подряд</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-value">${memberSince}</div>
              <div class="profile-stat-label">На проекте с</div>
            </div>
          </div>

          <div style="margin-top:20px;">
            <div class="input-group" style="margin-bottom:12px;">
              <label class="input-label">Игровой статус</label>
              <div style="display:flex;gap:8px;">
                <select class="input" id="profile-game-select" style="flex:1;">
                  <option value="">— Не в игре —</option>
                  ${GAME_PRESETS.map((g) => `<option value="${g}" ${p.game_status === g ? "selected" : ""}>${g}</option>`).join("")}
                </select>
                <button class="btn btn-sm btn-secondary" id="profile-game-save">Сохранить</button>
              </div>
            </div>
            <div class="input-group" style="margin-bottom:12px;">
              <label class="input-label">Пользовательский статус</label>
              <div style="display:flex;gap:8px;">
                <input class="input" id="profile-custom-status" placeholder="Ваш статус..." maxlength="100" value="${S.escapeHtml(customStatus)}" style="flex:1;" />
                <button class="btn btn-sm btn-secondary" id="profile-status-save">Сохранить</button>
              </div>
            </div>
          </div>

          <div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" id="profile-avatar-btn">📷 Сменить аватар</button>
            <input type="file" id="profile-avatar-input" accept="image/*" style="display:none;" />
            <button class="btn btn-sm btn-secondary" id="profile-edit-btn">✏️ Редактировать профиль</button>
          </div>
        </div>
      </div>
    `;

    S.ui.showPage("Мой профиль", "", contentHtml);

    // Game status save
    document.getElementById("profile-game-save").addEventListener("click", async () => {
      const game = document.getElementById("profile-game-select").value;
      const statusText = game ? `Играет в ${game}` : null;
      const { error } = await S.auth.updateProfile({ game_status: statusText });
      if (error) {
        S.ui.toast("Ошибка: " + S.ui.getErrorMessage(error), "error");
      } else {
        S.ui.toast(game ? `Статус: Играет в ${game}` : "Игровой статус убран", "success");
        showProfilePage();
      }
    });

    // Custom status save
    document.getElementById("profile-status-save").addEventListener("click", async () => {
      const status = document.getElementById("profile-custom-status").value.trim();
      const { error } = await S.auth.updateProfile({ custom_status: status || null });
      if (error) {
        S.ui.toast("Ошибка: " + S.ui.getErrorMessage(error), "error");
      } else {
        S.ui.toast("Статус обновлён!", "success");
        showProfilePage();
      }
    });

    // Avatar upload
    document.getElementById("profile-avatar-btn").addEventListener("click", () => {
      document.getElementById("profile-avatar-input").click();
    });
    document.getElementById("profile-avatar-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        S.ui.toast("Файл слишком большой (макс. 5 МБ)", "error");
        return;
      }
      const { url, error } = await S.auth.uploadAvatar(file);
      if (error) {
        S.ui.toast("Ошибка загрузки: " + S.ui.getErrorMessage(error), "error");
      } else {
        S.ui.toast("Аватар обновлён!", "success");
        S.ui.updateFooter();
        showProfilePage();
      }
    });

    // Edit profile
    document.getElementById("profile-edit-btn").addEventListener("click", () => {
      showEditProfileModal();
    });

    // Clear members
    const membersList = document.getElementById("members-list");
    if (membersList) membersList.innerHTML = "";
  }

  // --- EDIT PROFILE MODAL ---
  function showEditProfileModal() {
    const p = S.profile;
    const bodyHtml = `
      <div class="input-group" style="margin-bottom:12px;">
        <label class="input-label">Отображаемое имя</label>
        <input class="input" id="edit-display-name" value="${S.escapeHtml(p.display_name || "")}" placeholder="Ваше имя" maxlength="50" />
      </div>
      <div class="input-group">
        <label class="input-label">Имя пользователя</label>
        <input class="input" id="edit-username" value="${S.escapeHtml(p.username || "")}" placeholder="username" maxlength="32" />
        <div class="input-error" id="edit-username-error"></div>
      </div>
    `;

    S.ui.showModal("Редактировать профиль", bodyHtml, [
      { text: "Отмена", cls: "btn-secondary" },
      {
        text: "Сохранить",
        cls: "btn-primary",
        onClick: async () => {
          const displayName = document.getElementById("edit-display-name").value.trim();
          const username = document.getElementById("edit-username").value.trim();

          if (!username || username.length < 3) {
            document.getElementById("edit-username-error").textContent = "Минимум 3 символа";
            return;
          }

          const updates = {};
          if (displayName) updates.display_name = displayName;
          if (username !== p.username) updates.username = username;

          const { error } = await S.auth.updateProfile(updates);
          if (error) {
            document.getElementById("edit-username-error").textContent = S.ui.getErrorMessage(error);
          } else {
            S.ui.toast("Профиль обновлён!", "success");
            S.ui.updateFooter();
            S.ui.$(".modal-overlay").remove();
            showProfilePage();
          }
        },
      },
    ]);
  }

  // --- STATUS SELECTOR ---
  function showStatusSelector() {
    const statuses = [
      { value: "online", label: "🟢 В сети", cls: "status-online" },
      { value: "idle", label: "🟡 Не активен", cls: "status-idle" },
      { value: "dnd", label: "🔴 Не беспокоить", cls: "status-dnd" },
      { value: "offline", label: "⚫ Невидимый", cls: "status-offline" },
    ];

    let html = '<div style="display:flex;flex-direction:column;gap:4px;">';
    statuses.forEach((s) => {
      html += `
        <button class="btn btn-ghost status-option-btn" data-status="${s.value}" style="justify-content:flex-start;padding:10px 14px;${S.profile.status === s.value ? "background:var(--bg-hover);" : ""}">
          <span class="status-dot ${s.cls}"></span>
          <span>${s.label}</span>
        </button>
      `;
    });
    html += "</div>";

    S.ui.showModal("Статус", html, [
      { text: "Закрыть", cls: "btn-secondary" },
    ]);

    document.querySelectorAll(".status-option-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const status = btn.dataset.status;
        await S.auth.setOnlineStatus(status);
        S.ui.updateFooter();
        S.ui.toast(`Статус: ${status}`, "info");
        S.ui.$(".modal-overlay").remove();
      });
    });
  }

  // --- ADD STATUS SELECTOR TO FOOTER ---
  // Hook into footer avatar click
  function setupStatusClick() {
    const avatarEl = document.getElementById("footer-avatar");
    if (avatarEl) {
      avatarEl.style.cursor = "pointer";
      avatarEl.addEventListener("click", showStatusSelector);
    }
  }

  // --- EXPORT ---
  S.profile = {
    showProfilePage,
    showEditProfileModal,
    showStatusSelector,
    setupStatusClick,
    GAME_PRESETS,
  };
})();