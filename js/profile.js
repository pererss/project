// SENTCOR v9.2 — Profile (autosave bio, thought bubble, user modal, no account tab)
(function(){
  const S=window.SENTCOR,sb=S.sb;

  function getAchievements(p){
    return [
      {icon:"fa-solid fa-calendar-check",name:"Новичок",desc:"Зарегистрирован",unlocked:true},
      {icon:"fa-solid fa-fire",name:"Стрик 3 дня",desc:"3 дня подряд",unlocked:(p.streak_days||0)>=3},
      {icon:"fa-solid fa-fire-flame-curved",name:"Стрик 7 дней",desc:"7 дней подряд",unlocked:(p.streak_days||0)>=7},
      {icon:"fa-solid fa-coins",name:"100 SentCoins",desc:"100 монет",unlocked:(p.sent_coins||0)>=100},
      {icon:"fa-solid fa-comments",name:"Болтун",desc:"50 сообщений",unlocked:(p.messages_count||0)>=50},
      {icon:"fa-solid fa-server",name:"Создатель",desc:"Создал сервер",unlocked:(p.servers_count||0)>=1}
    ]
  }

  async function showPage(){
    if(!S.user||!S.profile)return;S.ui.activateNav("profile");
    const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    await S.auth.fetchProfile();S.ui.setSubPanelHeader("Профиль");
    S.ui.setSubPanelContent('<div class="sp-item active" data-ptab="all"><i class="fa-solid fa-chart-bar" style="width:18px"></i> Статистика</div><div class="sp-item" data-ptab="edit"><i class="fa-solid fa-pen-to-square" style="width:18px"></i> Редактировать</div>');
    document.querySelectorAll("#sp-content .sp-item[data-ptab]").forEach(el=>el.addEventListener("click",()=>{document.querySelectorAll("#sp-content .sp-item").forEach(e=>e.classList.remove("active"));el.classList.add("active");renderProfileTab(el.dataset.ptab)}));
    renderProfileTab("all")
  }

  function renderProfileTab(tab){if(tab==="all")renderAllInOne();else renderEdit()}
  function renderAllInOne(){renderMainProfile();S.ui.clearMembers()}
  function renderEdit(){const p=S.profile;S.ui.setMainContent('<div class="main-content"><div style="max-width:560px"><div class="input-group"><label class="input-label">Отображаемое имя</label><input class="input" id="edit-dn" value="'+S.escapeHtml(p.display_name||"")+'" placeholder="'+S.escapeHtml(p.username||"Имя")+'" maxlength="50"></div><div class="input-group"><label class="input-label">О себе</label><textarea class="input" id="edit-bio" rows="3" maxlength="200">'+S.escapeHtml(p.bio||"")+'</textarea></div><div class="input-group"><label class="input-label">Пользовательский статус</label><input class="input" id="edit-cs" value="'+S.escapeHtml(p.custom_status||"")+'" placeholder="Ваш статус..." maxlength="100"></div><button class="btn btn-primary btn-sm" id="save-edit-btn"><i class="fa-solid fa-floppy-disk"></i> Сохранить</button></div></div>');S.ui.clearMembers();document.getElementById("save-edit-btn")?.addEventListener("click",async()=>{const dn=document.getElementById("edit-dn").value.trim(),bio=document.getElementById("edit-bio").value.trim(),cs=document.getElementById("edit-cs").value.trim();const upd={};if(dn)upd.display_name=dn;upd.bio=bio||null;upd.custom_status=cs||null;const{error}=await S.auth.updateProfile(upd);if(error)S.ui.toast("Ошибка","error");else{S.ui.toast("Сохранено!","success");S.ui.updateFooter();renderEdit()}})}

  function renderMainProfile(){
    const p=S.profile;const ach=getAchievements(p);
    const av=p.avatar_url?'<img src="'+p.avatar_url+'">':(p.display_name||p.username||"?").charAt(0).toUpperCase();
    const since=new Date(p.created_at).toLocaleDateString("ru-RU",{year:"numeric",month:"long",day:"numeric"});
    let h='<div class="main-content"><div class="profile-card"><div class="profile-banner"></div><div class="profile-avatar-area"><div class="avatar avatar-xl">'+av+'</div><div><div class="profile-name">'+S.escapeHtml(p.display_name||p.username)+'</div><div class="profile-game">'+S.escapeHtml(p.bio||"")+'</div></div></div><div style="padding:20px 24px 24px"><div class="profile-stats"><div class="profile-stat"><div class="profile-stat-val sentcoins">\uD83D\uDC8E '+(p.sent_coins||0).toLocaleString()+'</div><div class="profile-stat-lbl">SentCoins</div></div><div class="profile-stat"><div class="profile-stat-val">\uD83D\uDD25 '+ (p.streak_days||0)+'</div><div class="profile-stat-lbl">Дней подряд</div></div><div class="profile-stat"><div class="profile-stat-val">'+since+'</div><div class="profile-stat-lbl">С нами с</div></div></div><div style="margin-top:20px"><h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:10px">Достижения</h3><div class="achievements-grid">';
    ach.forEach(a=>h+='<div class="achievement-badge '+(a.unlocked?"unlocked":"locked")+'" title="'+a.desc+'"><i class="'+a.icon+'"></i> '+a.name+'</div>');
    h+='</div></div><div style="margin-top:16px"><button class="btn btn-sm btn-primary" id="avatar-upload-btn"><i class="fa-solid fa-camera"></i> Аватар</button><input type="file" id="avatar-input" accept="image/*" hidden><button class="btn btn-sm btn-secondary" id="goto-edit-btn"><i class="fa-solid fa-pen"></i> Редактировать</button></div></div></div></div>';
    S.ui.setMainContent(h);S.ui.clearMembers();
    document.getElementById("avatar-upload-btn")?.addEventListener("click",()=>document.getElementById("avatar-input").click());
    document.getElementById("avatar-input")?.addEventListener("change",async e=>{const f=e.target.files[0];if(!f||f.size>5*1024*1024){S.ui.toast("Файл >5MB","error");return}const{error}=await S.auth.uploadAvatar(f);if(error)S.ui.toast("Ошибка","error");else{S.ui.toast("Аватар обновлён!","success");S.ui.updateFooter();renderAllInOne()}});
    document.getElementById("goto-edit-btn")?.addEventListener("click",()=>{const tab=document.querySelector("#sp-content .sp-item[data-ptab=edit]");if(tab)tab.click()})
  }

  // ---- PROFILE MODAL ----
  async function openMyProfileModal(){await S.auth.fetchProfile();renderProfileModal(S.profile,true)}
  async function openUserProfileModal(userId){const{data:pr}=await sb.from("profiles").select("*").eq("id",userId).maybeSingle();if(!pr){S.ui.toast("Пользователь не найден","error");return}renderProfileModal(pr,pr.id===S.user.id)}

  async function saveBioOnClose(bioEl,origBio){if(!bioEl)return;const bio=bioEl.value.trim();if(bio!==(origBio||"")){await S.auth.updateProfile({bio:bio||null});S.ui.updateFooter()}}

  function renderProfileModal(p,isMe){
    const av=p.avatar_url?'<img src="'+p.avatar_url+'">':(p.display_name||p.username||"?").charAt(0).toUpperCase();
    const hasThought=p.thought&&(!p.thought_expires_at||new Date(p.thought_expires_at)>new Date());
    const thoughtText=hasThought?S.escapeHtml(p.thought):"Поделитесь мыслями...";
    const since=new Date(p.created_at).toLocaleDateString("ru-RU",{year:"numeric",month:"long",day:"numeric"});
    let html='<div style="max-width:520px;padding:8px 0"><div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:20px"><div class="avatar avatar-xl" style="flex-shrink:0">'+av+'</div><div style="flex:1;min-width:0;padding-top:4px"><div style="font-weight:800;font-size:20px;color:var(--text-bright)">'+S.escapeHtml(p.display_name||p.username)+'</div><div style="font-size:13px;color:var(--text-muted);margin-top:2px">@'+S.escapeHtml(p.username)+'</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">С нами с '+since+'</div></div></div><div style="position:relative;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px;min-height:44px"><div style="position:absolute;top:-12px;left:24px;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:12px solid var(--bg-tertiary)"></div>';
    if(isMe&&hasThought){html+='<div style="display:flex;align-items:flex-start;justify-content:space-between"><span style="font-size:13px;color:var(--text-primary);flex:1">'+thoughtText+'</span><button class="btn btn-icon btn-ghost btn-sm" id="delete-thought-btn" title="Удалить"><i class="fa-solid fa-trash"></i></button></div>'}
    else if(isMe){html+='<span id="thought-text" style="font-size:13px;color:var(--text-muted);cursor:pointer">'+thoughtText+'</span>'}
    else{html+='<span style="font-size:13px;color:'+(hasThought?'var(--text-primary)':'var(--text-muted)')+'">'+thoughtText+'</span>'}
    html+='</div><div class="input-group" style="margin-bottom:16px"><label class="input-label">О себе</label>';
    if(isMe){html+='<textarea class="input" id="modal-bio" rows="2" maxlength="200">'+S.escapeHtml(p.bio||"")+'</textarea>'}
    else{html+='<p style="font-size:13px;color:var(--text-primary)">'+S.escapeHtml(p.bio||"Не указано")+'</p>'}
    html+='</div>';
    if(isMe){html+='<div style="margin-top:12px"><button class="btn btn-sm btn-secondary" id="modal-avatar-btn"><i class="fa-solid fa-camera"></i> Сменить аватар</button><input type="file" id="modal-avatar-input" accept="image/*" hidden></div>'}
    html+='</div>';

    const{overlay,modal}=S.ui.showModal("Профиль",html,[{text:"Закрыть",cls:"btn-secondary"}]);
    // Remove the "close" button entirely — X in corner is enough
    const footer=modal.querySelector(".modal-footer");if(footer)footer.remove();

    // Autosave bio on close
    const closeHandler=async()=>{if(isMe)await saveBioOnClose(document.getElementById("modal-bio"),p.bio||"")};
    overlay.addEventListener("click",async e=>{if(e.target===overlay){await closeHandler();overlay.remove()}});
    modal.querySelector(".close-modal")?.addEventListener("click",async()=>{await closeHandler();overlay.remove()});

    // Thought editing
    if(isMe){
      const thoughtEl=document.getElementById("thought-text");if(thoughtEl)thoughtEl.addEventListener("click",()=>{
        if(document.querySelector("#thought-edit"))return;
        const inp=document.createElement("input");inp.className="input";inp.id="thought-edit";inp.value=p.thought||"";inp.placeholder="Ваша мысль на 24ч...";inp.maxLength=200;inp.style.cssText="margin-top:4px";
        thoughtEl.replaceWith(inp);inp.focus();
        const save=async()=>{const v=inp.value.trim();const exp=v?new Date(Date.now()+86400000).toISOString():null;await S.auth.updateProfile({thought:v||null,thought_expires_at:exp});S.ui.toast(v?"Мысль сохранена!":"Мысль удалена","success");overlay.remove();openMyProfileModal()};
        inp.addEventListener("blur",save);inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();save()}})
      });
      const delBtn=document.getElementById("delete-thought-btn");if(delBtn)delBtn.addEventListener("click",async()=>{await S.auth.updateProfile({thought:null,thought_expires_at:null});S.ui.toast("Мысль удалена","info");overlay.remove();openMyProfileModal()});
    }
    // Avatar upload in modal
    const modalAvBtn=document.getElementById("modal-avatar-btn");if(modalAvBtn)modalAvBtn.addEventListener("click",()=>document.getElementById("modal-avatar-input").click());
    const modalAvInp=document.getElementById("modal-avatar-input");if(modalAvInp)modalAvInp.addEventListener("change",async e=>{const f=e.target.files[0];if(!f||f.size>5*1024*1024){S.ui.toast("Файл >5MB","error");return}const{error}=await S.auth.uploadAvatar(f);if(error)S.ui.toast("Ошибка","error");else{S.ui.toast("Аватар обновлён!","success");S.ui.updateFooter();overlay.remove();openMyProfileModal()}})
  }

  // ---- SETTINGS (3 tabs, no account) ----
  async function showSettings(){
    S.ui.activateNav("");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");await S.auth.fetchProfile();S.ui.setSubPanelHeader("Настройки");
    S.ui.setSubPanelContent('<div class="sp-item active" data-stab="appearance"><i class="fa-solid fa-palette"></i> Внешний вид</div><div class="sp-item" data-stab="notifications"><i class="fa-solid fa-bell"></i> Уведомления</div><div class="sp-item" data-stab="privacy"><i class="fa-solid fa-shield-halved"></i> Конфиденц.</div>');
    document.querySelectorAll("#sp-content .sp-item[data-stab]").forEach(el=>el.addEventListener("click",()=>{document.querySelectorAll("#sp-content .sp-item").forEach(e=>e.classList.remove("active"));el.classList.add("active");renderSettingsTab(el.dataset.stab)}));
    renderSettingsTab("appearance")
  }

  function renderSettingsTab(tab){const p=S.profile;const ct=p.theme||"caramel";let h="";
    if(tab==="appearance"){h='<div class="main-content"><div style="max-width:560px"><div class="settings-section"><h3>Тема</h3><div class="theme-selector">'+["caramel","oled","midnight","forest","rose","ocean","sunset","lavender","mint","cherry","coffee","slate","crimson","emerald","plum","sapphire","sunflower","teal","graphite","coral"].map(t=>'<div class="theme-option theme-'+t+(ct===t?" active":"")+'" data-th="'+t+'"></div>').join("")+'</div></div><div class="settings-section"><h3>Свой цвет</h3><div class="settings-row"><input type="color" id="cust-color" value="'+(p.custom_accent||"#d4853b")+'" style="width:80px;height:40px;border:none;cursor:pointer"></div><button class="btn btn-sm btn-primary" id="save-cust-btn">Применить</button></div></div></div>'}
    else if(tab==="notifications"){h='<div class="main-content"><div style="max-width:560px"><div class="settings-section"><h3>Уведомления</h3><div class="settings-row"><div><strong>Звук сообщений</strong></div><label><input type="checkbox" id="notify-sounds" '+(p.notify_sounds!==false?"checked":"")+'> Вкл</label></div><div class="settings-row"><div><strong>Звук звонка</strong></div><label><input type="checkbox" id="notify-call" '+(p.notify_call!==false?"checked":"")+'> Вкл</label></div><button class="btn btn-sm btn-primary" id="save-notify-btn"><i class="fa-solid fa-floppy-disk"></i> Сохранить</button></div></div></div>'}
    else if(tab==="privacy"){h='<div class="main-content"><div style="max-width:560px"><div class="settings-section"><h3>Конфиденциальность</h3><div class="settings-row"><div><strong>ЛС от</strong></div><select class="input" id="priv-dm" style="width:160px"><option value="all">Все</option><option value="friends" '+(p.dm_privacy==="friends"?"selected":"")+'>Только друзья</option></select></div><div class="settings-row"><div><strong>Заявки в друзья</strong></div><select class="input" id="priv-fr" style="width:160px"><option value="all">Все</option><option value="nobody" '+(p.fr_privacy==="nobody"?"selected":"")+'>Никто</option></select></div><button class="btn btn-sm btn-primary" id="save-privacy-btn"><i class="fa-solid fa-floppy-disk"></i> Сохранить</button></div></div></div>'}
    S.ui.setMainContent(h);S.ui.clearMembers();
    document.querySelectorAll(".theme-option").forEach(el=>el.addEventListener("click",()=>{document.querySelectorAll(".theme-option").forEach(e=>e.classList.remove("active"));el.classList.add("active");const th=el.dataset.th;document.body.classList.remove("theme-oled","theme-midnight","theme-forest","theme-rose","theme-ocean","theme-sunset","theme-lavender","theme-mint","theme-cherry","theme-coffee","theme-slate","theme-crimson","theme-emerald","theme-plum","theme-sapphire","theme-sunflower","theme-teal","theme-graphite","theme-coral","theme-custom");if(th!=="caramel")document.body.classList.add("theme-"+th);S.auth.updateProfile({theme:th})}));
    document.getElementById("save-cust-btn")?.addEventListener("click",()=>{const c=document.getElementById("cust-color").value;document.body.style.setProperty("--accent",c);document.body.style.setProperty("--accent-light",c);document.body.classList.add("theme-custom");S.auth.updateProfile({theme:"custom",custom_accent:c})});
    document.getElementById("save-notify-btn")?.addEventListener("click",()=>{S.auth.updateProfile({notify_sounds:document.getElementById("notify-sounds")?.checked,notify_call:document.getElementById("notify-call")?.checked});S.ui.toast("Сохранено!","success")});
    document.getElementById("save-privacy-btn")?.addEventListener("click",()=>{S.auth.updateProfile({dm_privacy:document.getElementById("priv-dm")?.value,fr_privacy:document.getElementById("priv-fr")?.value});S.ui.toast("Сохранено!","success")});
    // Add change username + password + logout in privacy section footer
    const can=S.auth.canChangeUsername();const days=S.auth.daysUntilUsernameChange();
    const accountHtml='<div style="margin-top:24px;border-top:1px solid var(--border);padding-top:16px"><div class="settings-row"><div><strong>Имя: '+S.escapeHtml(p.display_name||p.username)+'</strong></div></div><div class="settings-row"><div><strong>Сменить имя</strong><div style="font-size:11px;color:var(--text-muted)">'+(can?"Доступно":"Недоступно ("+days+" дн.)")+'</div></div>'+(can?'<button class="btn btn-sm btn-secondary" id="ch-username-btn"><i class="fa-solid fa-pen"></i> Сменить</button>':"")+'</div><div class="settings-row"><div><strong>Смена пароля</strong></div><button class="btn btn-sm btn-secondary" id="reset-pw-btn"><i class="fa-solid fa-key"></i> Сменить</button></div><button class="btn btn-danger btn-sm" id="logout-settings-btn"><i class="fa-solid fa-right-from-bracket"></i> Выйти</button></div>';
    const mainContent=document.querySelector("#main-area .main-content");if(mainContent)mainContent.insertAdjacentHTML("beforeend",accountHtml);
    document.getElementById("ch-username-btn")?.addEventListener("click",showChangeUsernameModal);
    document.getElementById("reset-pw-btn")?.addEventListener("click",()=>{S.ui.showModal("Смена пароля",'<div class="input-group"><label class="input-label">Новый пароль</label><input class="input" type="password" id="np-pw" placeholder="Минимум 6 символов"><div class="input-error" id="np-err"></div></div>',[{text:"Отмена",cls:"btn-secondary"},{text:"Сменить",cls:"btn-primary",onClick:async()=>{const pw=document.getElementById("np-pw").value;if(!pw||pw.length<6){document.getElementById("np-err").textContent="Минимум 6 символов";return};await S.auth.changePassword(pw);document.querySelector(".modal-overlay").remove()}}])});
    document.getElementById("logout-settings-btn")?.addEventListener("click",()=>S.ui.confirm("Выйти?","Вы уверены?",async()=>{await S.auth.signOut()}))
  }

  function showChangeUsernameModal(){const days=S.auth.daysUntilUsernameChange();S.ui.showModal("Сменить имя",'<div class="input-group"><label class="input-label">Новое имя</label><input class="input" id="nu-name" placeholder="NewName" maxlength="32"><div class="input-error" id="nu-err"></div></div><p style="font-size:11px;color:var(--text-muted)">Раз в '+S.SENTCOR_CONFIG.USERNAME_CHANGE_COOLDOWN_DAYS+' дн.'+(days>0?" Осталось: "+days+" дн.":"")+'</p>',[{text:"Отмена",cls:"btn-secondary"},{text:"Сменить",cls:"btn-primary",onClick:async()=>{const nu=document.getElementById("nu-name").value.trim();if(!nu||nu.length<3){document.getElementById("nu-err").textContent="Минимум 3 символа";return};const{error}=await S.auth.updateProfile({username:nu,last_username_change:new Date().toISOString()});if(error){document.getElementById("nu-err").textContent=error.message||"Ошибка"}else{S.ui.toast("Имя изменено!","success");S.ui.updateFooter();document.querySelector(".modal-overlay").remove();renderSettingsTab("privacy")}}}])}

  function showStatusSelector(){return} // Disabled — status only via footer dot

  S.profileMod={showPage,showSettings,showStatusSelector,openMyProfileModal,openUserProfileModal};
})();