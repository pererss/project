// SENTCOR v4 — Profile + Settings
(function(){
  const S=window.SENTCOR,sb=S.sb;
  const GAMES=["Minecraft","CS2","Dota 2","League of Legends","Valorant","Apex Legends","Genshin Impact","Roblox","Fortnite","World of Warcraft","Cyberpunk 2077","Elden Ring","Baldur's Gate 3","Rust","GTA V","Deadlock","Overwatch 2","The Witcher 3","Stardew Valley","PUBG"];

  function getAchievements(p){
    const a=[];
    a.push({icon:"fa-solid fa-calendar-check",name:"Новичок",desc:"Зарегистрирован на платформе",unlocked:true});
    a.push({icon:"fa-solid fa-fire",name:"Стрик 3 дня",desc:"Заходил 3 дня подряд",unlocked:(p.streak_days||0)>=3});
    a.push({icon:"fa-solid fa-fire-flame-curved",name:"Стрик 7 дней",desc:"Заходил 7 дней подряд",unlocked:(p.streak_days||0)>=7});
    a.push({icon:"fa-solid fa-coins",name:"100 SentCoins",desc:"Накопил 100 монет",unlocked:(p.sent_coins||0)>=100});
    a.push({icon:"fa-solid fa-comments",name:"Болтун",desc:"Отправил 50 сообщений",unlocked:(p.messages_count||0)>=50});
    a.push({icon:"fa-solid fa-server",name:"Создатель",desc:"Создал сервер",unlocked:(p.servers_count||0)>=1});
    return a
  }

  async function showPage(){
    if(!S.user||!S.profile)return;
    S.ui.activateNav("profile");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    await S.auth.fetchProfile();S.ui.setSubPanelHeader("Профиль");
    S.ui.setSubPanelContent(`
      <div class="sp-item active" data-ptab="all"><i class="fa-solid fa-chart-bar" style="width:18px;"></i> Статистика</div>
      <div class="sp-item" data-ptab="edit"><i class="fa-solid fa-pen-to-square" style="width:18px;"></i> Редактировать</div>
    `);
    document.querySelectorAll("#sp-content .sp-item[data-ptab]").forEach(el=>el.addEventListener("click",()=>{
      document.querySelectorAll("#sp-content .sp-item").forEach(e=>e.classList.remove("active"));el.classList.add("active");renderProfileTab(el.dataset.ptab)
    }));
    renderProfileTab("all")
  }

  function renderProfileTab(tab){
    if(tab==="all")renderAllInOne();else renderEdit()
  }

  function renderAllInOne(){
    const p=S.profile;const ach=getAchievements(p);
    const av=p.avatar_url?`<img src="${p.avatar_url}">`:(p.display_name||p.username||"?").charAt(0).toUpperCase();
    const since=new Date(p.created_at).toLocaleDateString("ru-RU",{year:"numeric",month:"long",day:"numeric"});
    let h=`<div class="main-content"><div class="profile-card">
      <div class="profile-banner"></div>
      <div class="profile-avatar-area"><div class="avatar avatar-xl">${av}</div><div><div class="profile-name">${S.escapeHtml(p.display_name||p.username)}</div><div class="profile-game">${S.escapeHtml(p.custom_status||p.game_status||"Не в игре")}</div></div></div>
      <div style="padding:20px 24px 24px;">
        <div class="profile-stats">
          <div class="profile-stat"><div class="profile-stat-val sentcoins">💎 ${(p.sent_coins||0).toLocaleString()}</div><div class="profile-stat-lbl">SentCoins</div></div>
          <div class="profile-stat"><div class="profile-stat-val">🔥 ${p.streak_days||0}</div><div class="profile-stat-lbl">Дней подряд</div></div>
          <div class="profile-stat"><div class="profile-stat-val">${p.messages_count||0}</div><div class="profile-stat-lbl">Сообщений</div></div>
          <div class="profile-stat"><div class="profile-stat-val">${since}</div><div class="profile-stat-lbl">С нами с</div></div>
        </div>
        <div style="margin-top:20px;"><h3 style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:10px;">Достижения</h3>
        <div class="achievements-grid">`;
    ach.forEach(a=>h+=`<div class="achievement-badge ${a.unlocked?"unlocked":"locked"}" title="${a.desc}"><i class="${a.icon}"></i> ${a.name}</div>`);
    h+=`</div></div>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-primary" id="avatar-upload-btn"><i class="fa-solid fa-camera"></i> Сменить аватар</button>
          <input type="file" id="avatar-input" accept="image/*" hidden>
          <button class="btn btn-sm btn-secondary" onclick="document.querySelector('#sp-content .sp-item[data-ptab=edit]').click()"><i class="fa-solid fa-pen"></i> Редактировать</button>
        </div>
      </div></div></div>`;
    S.ui.setMainContent(h);S.ui.clearMembers();
    const aub=document.getElementById("avatar-upload-btn");if(aub)aub.addEventListener("click",()=>document.getElementById("avatar-input").click());
    const ai=document.getElementById("avatar-input");if(ai)ai.addEventListener("change",async e=>{
      const f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024){S.ui.toast("Слишком большой файл","error");return}
      const{error}=await S.auth.uploadAvatar(f);if(error)S.ui.toast("Ошибка","error");else{S.ui.toast("Аватар обновлён!","success");S.ui.updateFooter();renderAllInOne()}
    })
  }

  function renderEdit(){
    const p=S.profile;
    let h=`<div class="main-content"><div style="max-width:560px;">
      <div class="input-group"><label class="input-label">Отображаемое имя</label><input class="input" id="edit-dn" value="${S.escapeHtml(p.display_name||"")}" placeholder="Ваше имя" maxlength="50"></div>
      <div class="input-group"><label class="input-label">Игровой статус</label><select class="input" id="edit-game"><option value="">— Не в игре —</option>${GAMES.map(g=>`<option value="${g}" ${p.game_status===`Играет в ${g}`?"selected":""}>${g}</option>`).join("")}</select></div>
      <div class="input-group"><label class="input-label">Пользовательский статус</label><input class="input" id="edit-cs" value="${S.escapeHtml(p.custom_status||"")}" placeholder="Ваш статус..." maxlength="100"></div>
      <button class="btn btn-primary btn-sm" id="save-edit-btn"><i class="fa-solid fa-floppy-disk"></i> Сохранить</button>
    </div></div>`;
    S.ui.setMainContent(h);S.ui.clearMembers();
    const seb=document.getElementById("save-edit-btn");if(seb)seb.addEventListener("click",async()=>{
      const dn=document.getElementById("edit-dn").value.trim(),game=document.getElementById("edit-game").value,cs=document.getElementById("edit-cs").value.trim();
      const upd={};if(dn)upd.display_name=dn;upd.game_status=game?`Играет в ${game}`:null;upd.custom_status=cs||null;
      const{error}=await S.auth.updateProfile(upd);if(error)S.ui.toast("Ошибка","error");else{S.ui.toast("Сохранено!","success");S.ui.updateFooter();renderEdit()}
    })
  }

  // ---- SETTINGS (4 tabs) ----
  async function showSettings(){
    S.ui.activateNav("settings");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    await S.auth.fetchProfile();S.ui.setSubPanelHeader("Настройки");
    S.ui.setSubPanelContent(`<div class="sp-item active" data-stab="appearance"><i class="fa-solid fa-palette" style="width:18px;"></i> Оформление</div><div class="sp-item" data-stab="account"><i class="fa-solid fa-user-gear" style="width:18px;"></i> Аккаунт</div><div class="sp-item" data-stab="privacy"><i class="fa-solid fa-shield-halved" style="width:18px;"></i> Конфиденц.</div><div class="sp-item" data-stab="danger"><i class="fa-solid fa-triangle-exclamation" style="width:18px;"></i> Опасное</div>`);
    document.querySelectorAll("#sp-content .sp-item[data-stab]").forEach(el=>el.addEventListener("click",()=>{
      document.querySelectorAll("#sp-content .sp-item").forEach(e=>e.classList.remove("active"));el.classList.add("active");renderSettingsTab(el.dataset.stab)
    }));
    renderSettingsTab("appearance")
  }

  function renderSettingsTab(tab){
    const p=S.profile;const ct=p.theme||"caramel";let h="";
    if(tab==="appearance"){
      h=`<div class="main-content"><div style="max-width:560px;"><div class="settings-section"><h3>Тема оформления</h3><div class="settings-row"><span>Цветовая схема интерфейса</span></div>
        <div class="theme-selector"><div class="theme-option theme-caramel${ct==="caramel"?" active":""}" data-th="caramel"></div><div class="theme-option theme-oled${ct==="oled"?" active":""}" data-th="oled"></div><div class="theme-option theme-midnight${ct==="midnight"?" active":""}" data-th="midnight"></div></div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">Применяется мгновенно и сохраняется.</p>
      </div></div></div>`
    }else if(tab==="account"){
      const can=S.auth.canChangeUsername(),days=S.auth.daysUntilUsernameChange();
      h=`<div class="main-content"><div style="max-width:560px;"><div class="settings-section"><h3>Аккаунт</h3>
        <div class="settings-row"><div><strong>Имя пользователя</strong><div style="font-size:11px;color:var(--text-muted);">${S.escapeHtml(p.username)}</div></div></div>
        <div class="settings-row"><div><strong>Смена имени</strong><div style="font-size:11px;color:var(--text-muted);">${can?"Доступно":`Недоступно (${days} дн.)`}</div></div>${can?`<button class="btn btn-sm btn-secondary" id="ch-username-btn"><i class="fa-solid fa-pen"></i> Сменить</button>`:""}</div>
        <div class="settings-row"><div><strong>Игровой статус</strong></div><select class="input" id="st-game" style="width:180px;"><option value="">— Не в игре —</option>${GAMES.map(g=>`<option value="${g}" ${p.game_status===`Играет в ${g}`?"selected":""}>${g}</option>`).join("")}</select></div>
        <div class="settings-row"><div><strong>Польз. статус</strong></div><input class="input" id="st-cstatus" value="${S.escapeHtml(p.custom_status||"")}" placeholder="Статус..." maxlength="100" style="width:180px;"></div>
        <button class="btn btn-primary btn-sm" id="save-acc-btn"><i class="fa-solid fa-floppy-disk"></i> Сохранить</button>
      </div></div></div>`
    }else if(tab==="privacy"){
      h=`<div class="main-content"><div style="max-width:560px;"><div class="settings-section"><h3>Конфиденциальность</h3>
        <p style="color:var(--text-muted);font-size:12px;">Блокировка пользователей управляется через раздел «Друзья». Заблокированные не видят ваш онлайн и не могут отправлять вам сообщения.</p>
        <p style="color:var(--text-muted);font-size:12px;margin-top:8px;">Список заблокированных доступен в саб-панели раздела «Друзья».</p>
      </div></div></div>`
    }else if(tab==="danger"){
      h=`<div class="main-content"><div style="max-width:560px;"><div class="settings-section"><h3>Безопасность</h3>
        <div class="settings-row"><div><strong>Смена пароля</strong><div style="font-size:11px;color:var(--text-muted);">Отправит ссылку на email</div></div><button class="btn btn-sm btn-secondary" id="reset-pw-btn"><i class="fa-solid fa-key"></i> Сменить</button></div>
      </div><div class="settings-section"><h3>Опасная зона</h3>
        <button class="btn btn-danger" id="logout-settings-btn"><i class="fa-solid fa-right-from-bracket"></i> Выйти из аккаунта</button>
      </div></div></div>`
    }
    S.ui.setMainContent(h);S.ui.clearMembers();
    // Theme clicks
    document.querySelectorAll(".theme-option").forEach(el=>el.addEventListener("click",()=>{
      document.querySelectorAll(".theme-option").forEach(e=>e.classList.remove("active"));el.classList.add("active");
      const th=el.dataset.th;document.body.classList.remove("theme-oled","theme-midnight");if(th!=="caramel")document.body.classList.add("theme-"+th);S.auth.updateProfile({theme:th})
    }));
    document.getElementById("save-acc-btn")?.addEventListener("click",async()=>{
      const game=document.getElementById("st-game").value,cs=document.getElementById("st-cstatus").value.trim();
      const upd={};upd.game_status=game?`Играет в ${game}`:null;upd.custom_status=cs||null;
      const{error}=await S.auth.updateProfile(upd);if(error)S.ui.toast("Ошибка","error");else{S.ui.toast("Сохранено!","success");S.ui.updateFooter()}
    });
    document.getElementById("ch-username-btn")?.addEventListener("click",showChangeUsernameModal);
    document.getElementById("reset-pw-btn")?.addEventListener("click",()=>{
      S.ui.showModal("Смена пароля",'<div class="input-group"><label class="input-label">Новый пароль</label><input class="input" type="password" id="np-pw" placeholder="Минимум 6 символов"><div class="input-error" id="np-err"></div></div>',[
        {text:"Отмена",cls:"btn-secondary"},{text:"Сменить",cls:"btn-primary",onClick:async()=>{const pw=document.getElementById("np-pw").value;if(!pw||pw.length<6){document.getElementById("np-err").textContent="Минимум 6 символов";return};await S.auth.changePassword(pw);document.querySelector(".modal-overlay").remove()}}
      ])
    });
    document.getElementById("logout-settings-btn")?.addEventListener("click",()=>S.ui.confirm("Выйти?","Вы уверены?",async()=>{await S.auth.signOut()}))
  }

  function showChangeUsernameModal(){
    const days=S.auth.daysUntilUsernameChange();
    const b=`<div class="input-group"><label class="input-label">Новое имя</label><input class="input" id="nu-name" placeholder="NewName" maxlength="32"><div class="input-error" id="nu-err"></div></div><p style="font-size:11px;color:var(--text-muted);">Можно раз в ${S.SENTCOR_CONFIG.USERNAME_CHANGE_COOLDOWN_DAYS} дн.${days>0?` Осталось: ${days} дн.`:""}</p>`;
    S.ui.showModal("Сменить имя",b,[
      {text:"Отмена",cls:"btn-secondary"},{text:"Сменить",cls:"btn-primary",onClick:async()=>{const nu=document.getElementById("nu-name").value.trim();if(!nu||nu.length<3){document.getElementById("nu-err").textContent="Минимум 3 символа";return};const{error}=await S.auth.updateProfile({username:nu,last_username_change:new Date().toISOString()});if(error){document.getElementById("nu-err").textContent=S.ui.getErrorMessage(error)}else{S.ui.toast("Имя изменено!","success");S.ui.updateFooter();document.querySelector(".modal-overlay").remove();renderSettingsTab("account")}}}
    ])
  }

  function showStatusSelector(){
    const sts=[{v:"online",l:"В сети",c:"status-online"},{v:"idle",l:"Не активен",c:"status-idle"},{v:"dnd",l:"Не беспокоить",c:"status-dnd"},{v:"offline",l:"Невидимый",c:"status-offline"}];
    let h='<div style="display:flex;flex-direction:column;gap:3px;">';sts.forEach(s=>h+=`<button class="btn btn-ghost" data-st="${s.v}" style="justify-content:flex-start;padding:9px 14px;"><span class="status-dot ${s.c}"></span> ${s.l}</button>`);h+='</div>';
    S.ui.showModal("Статус",h,[{text:"Закрыть",cls:"btn-secondary"}]);
    document.querySelectorAll(".modal .btn-ghost[data-st]").forEach(b=>b.addEventListener("click",async()=>{await S.auth.setOnlineStatus(b.dataset.st);S.ui.updateFooter();document.querySelector(".modal-overlay").remove()}))
  }

  S.profile={showPage,showSettings,showStatusSelector};
})();