// SENTCOR v10.0 — Refactored Profile & Settings Module
(function() {
    "use strict";

    const S = window.SENTCOR;
    if (!S) {
        console.error("SENTCOR core not found!");
        return;
    }
    const sb = S.sb;

    // --- Private State ---
    let currentProfileTab = "stats";
    let currentSettingsTab = "appearance";

    // --- Helper Functions ---

    /**
     * Fetches the latest profile data for the current user.
     * This is a critical function, so it shows an error toast on failure.
     */
    async function refreshUserProfile() {
        if (!S.user) return false;
        try {
            const { data, error } = await sb.from("profiles").select("*").eq("id", S.user.id).single();
            if (error) throw error;
            S.profile = data;
            return true;
        } catch (e) {
            console.error("[Profile] Failed to refresh user profile:", e);
            S.toast.show("Не удалось обновить данные профиля.", "error");
            return false;
        }
    }

    // --- UI Rendering ---

    /**
     * Main function to display the user's own profile page.
     */
    async function showProfilePage() {
        if (!S.user) {
            S.toast.show("Для доступа к профилю необходимо войти.", "error");
            return;
        }
        
        S.ui.activateNav("profile");
        const subPanel = document.getElementById("sub-panel");
        if (subPanel) subPanel.classList.remove("collapsed");

        await refreshUserProfile();
        if (!S.profile) return; // Stop if profile refresh failed

        S.ui.setSubPanelHeader("Мой Профиль");
        const subPanelContent = `
            <div class="sp-item ${currentProfileTab === 'stats' ? 'active' : ''}" data-ptab="stats">
                <i class="fa-solid fa-chart-bar"></i><span>Статистика</span>
            </div>
            <div class="sp-item ${currentProfileTab === 'edit' ? 'active' : ''}" data-ptab="edit">
                <i class="fa-solid fa-pen-to-square"></i><span>Редактировать</span>
            </div>
        `;
        S.ui.setSubPanelContent(subPanelContent);
        addEventListenersToSubPanel('ptab', renderProfileTab);
        renderProfileTab(currentProfileTab);
    }

    /**
     * Renders the content for the selected profile tab.
     */
    function renderProfileTab(tab) {
        currentProfileTab = tab;
        document.querySelectorAll("#sp-content .sp-item[data-ptab]").forEach(el => {
            el.classList.toggle('active', el.dataset.ptab === tab);
        });

        if (tab === "stats") {
            renderProfileStatsView();
        } else if (tab === "edit") {
            renderProfileEditView();
        }
        S.ui.clearMembers();
        document.title = `Sentcor - ${tab === 'edit' ? 'Редактирование' : 'Профиль'}`;
    }

    /**
     * Renders the statistics and achievements view of the profile.
     */
    function renderProfileStatsView() {
        const p = S.profile;
        if (!p) return;

        const avatar = S.ui.createAvatar(p, 'xl');
        const joinDate = new Date(p.created_at).toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });

        const content = `
            <div class="main-content">
                <div class="profile-card">
                    <div class="profile-banner"></div>
                    <div class="profile-header">
                        ${avatar}
                        <div class="profile-info">
                            <h2 class="profile-name">${S.escapeHtml(p.display_name || p.username)}</h2>
                            <p class="profile-bio">${S.escapeHtml(p.bio || "Нет информации о себе.")}</p>
                        </div>
                        <div class="profile-actions">
                            <button class="btn btn-sm btn-secondary" id="goto-edit-btn"><i class="fa-solid fa-pen"></i> Редактировать</button>
                        </div>
                    </div>
                    <div class="profile-body">
                        <div class="profile-stats-grid">
                            <div class="stat-item">
                                <div class="stat-value sentcoins">💎 ${(p.sent_coins || 0).toLocaleString()}</div>
                                <div class="stat-label">SentCoins</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">🔥 ${p.streak_days || 0}</div>
                                <div class="stat-label">Дней подряд</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">📅 ${joinDate}</div>
                                <div class="stat-label">С нами с</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        S.ui.setMainContent(content);

        const editBtn = document.getElementById("goto-edit-btn");
        if (editBtn) {
            editBtn.onclick = () => renderProfileTab("edit");
        }
    }

    /**
     * Renders the profile editing form.
     */
    function renderProfileEditView() {
        const p = S.profile;
        if (!p) return;

        const content = `
            <div class="main-content">
                <div class="settings-form-container">
                    <h2>Редактировать профиль</h2>
                    <div class="input-group">
                        <label for="edit-dn">Отображаемое имя</label>
                        <input class="input" id="edit-dn" value="${S.escapeHtml(p.display_name || "")}" placeholder="${S.escapeHtml(p.username)}" maxlength="50">
                    </div>
                    <div class="input-group">
                        <label for="edit-bio">О себе</label>
                        <textarea class="input" id="edit-bio" rows="3" maxlength="200" placeholder="Расскажите немного о себе...">${S.escapeHtml(p.bio || "")}</textarea>
                    </div>
                    <div class="input-group">
                        <label for="edit-cs">Пользовательский статус</label>
                        <input class="input" id="edit-cs" value="${S.escapeHtml(p.custom_status || "")}" placeholder="Что у вас нового?" maxlength="100">
                    </div>
                     <div class="input-group">
                        <label>Аватар</label>
                        <div class="avatar-upload-container">
                           ${S.ui.createAvatar(p, 'lg')}
                           <input type="file" id="avatar-input" accept="image/*" hidden>
                           <button class="btn btn-secondary" id="avatar-upload-btn"><i class="fa-solid fa-camera"></i> Сменить аватар</button>
                        </div>
                    </div>
                    <button class="btn btn-primary" id="save-edit-btn"><i class="fa-solid fa-floppy-disk"></i> Сохранить изменения</button>
                </div>
            </div>
        `;
        S.ui.setMainContent(content);
        addProfileEditEventListeners();
    }
    
    /**
     * Adds event listeners for the profile edit view.
     */
    function addProfileEditEventListeners() {
        const saveBtn = document.getElementById("save-edit-btn");
        if (saveBtn) saveBtn.onclick = handleProfileUpdate;

        const uploadBtn = document.getElementById("avatar-upload-btn");
        const fileInput = document.getElementById("avatar-input");
        if (uploadBtn && fileInput) {
            uploadBtn.onclick = () => fileInput.click();
            fileInput.onchange = handleAvatarUpload;
        }
    }

    // --- User Profile Modal ---

    /**
     * Opens a modal with a user's profile information.
     * @param {string} userId - The ID of the user to display.
     */
    async function openUserProfileModal(userId) {
        try {
            const { data: profile, error } = await sb.from("profiles").select("*").eq("id", userId).single();
            if (error || !profile) throw new Error("Пользователь не найден.");

            const isMe = profile.id === S.user?.id;
            const avatar = S.ui.createAvatar(profile, 'xl');
            const joinDate = new Date(profile.created_at).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

            const modalContent = `
                <div class="profile-modal-content">
                    <div class="profile-modal-header">
                        ${avatar}
                        <div class="profile-modal-info">
                            <h3 class="profile-modal-name">${S.escapeHtml(profile.display_name || profile.username)}</h3>
                            <p class="profile-modal-username">@${S.escapeHtml(profile.username)}</p>
                            <p class="profile-modal-joined">В Sentcor с ${joinDate}</p>
                        </div>
                    </div>
                    <div class="profile-modal-body">
                        <label>О себе</label>
                        <p>${S.escapeHtml(profile.bio || "Информация отсутствует.")}</p>
                    </div>
                </div>
            `;
            
            const buttons = isMe ? 
                [{ text: "Редактировать", cls: "btn-primary", onClick: () => { S.ui.closeModal(); showProfilePage(); renderProfileTab('edit'); } }, { text: "Закрыть" }] :
                [{ text: "Закрыть" }];

            S.ui.showModal(`Профиль: ${profile.username}`, modalContent, buttons);

        } catch (e) {
            console.error("[Profile] Error opening user profile modal:", e);
            S.toast.show(e.message, "error");
        }
    }

    // --- Action Handlers ---

    /**
     * Handles saving updated profile information from the edit form.
     */
    async function handleProfileUpdate() {
        const displayNameEl = document.getElementById("edit-dn");
        const bioEl = document.getElementById("edit-bio");
        const customStatusEl = document.getElementById("edit-cs");

        if (!displayNameEl || !bioEl || !customStatusEl) return;

        const updates = {
            display_name: displayNameEl.value.trim(),
            bio: bioEl.value.trim() || null,
            custom_status: customStatusEl.value.trim() || null,
        };

        try {
            const { error } = await sb.from("profiles").update(updates).eq("id", S.user.id);
            if (error) throw error;
            S.toast.show("Профиль успешно обновлен!", "success");
            await refreshUserProfile(); // Refresh local profile data
            S.ui.updateAppChrome(); // Update name/avatar in the app
            renderProfileTab('edit'); // Re-render to show new values
        } catch (e) {
            console.error("[Profile] Error updating profile:", e);
            S.toast.show(`Ошибка при сохранении: ${e.message}`, "error");
        }
    }

    /**
     * Handles the avatar file selection and upload process.
     */
    async function handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            S.toast.show("Файл слишком большой (макс. 5 МБ).", "error");
            return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${S.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        try {
            // Upload file to storage
            const { error: uploadError } = await sb.storage.from('user_assets').upload(filePath, file);
            if (uploadError) throw new Error(`Ошибка загрузки: ${uploadError.message}`);

            // Get public URL
            const { data: urlData } = sb.storage.from('user_assets').getPublicUrl(filePath);
            if (!urlData || !urlData.publicUrl) throw new Error("Не удалось получить URL аватара.");

            // Update profile with new avatar URL
            const { error: updateError } = await sb.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", S.user.id);
            if (updateError) throw new Error(`Ошибка обновления профиля: ${updateError.message}`);

            S.toast.show("Аватар успешно обновлен!", "success");
            await refreshUserProfile();
            S.ui.updateAppChrome();
            renderProfileTab(currentProfileTab); // Re-render current tab
        } catch (e) {
            console.error("[Profile] Avatar upload failed:", e);
            S.toast.show(e.message, "error");
        }
    }
    
    /**
     * Generic function to add event listeners to a sub-panel.
     */
    function addEventListenersToSubPanel(dataAttribute, callback) {
        const subPanelContent = document.getElementById("sp-content");
        if (!subPanelContent) return;
        
        subPanelContent.addEventListener('click', (e) => {
            const target = e.target.closest(`.sp-item[data-${dataAttribute}]`);
            if (target) {
                callback(target.dataset[dataAttribute]);
            }
        });
    }

    // --- Expose Public API ---
    S.profileMod = {
        showProfilePage,
        openUserProfileModal,
    };

})();