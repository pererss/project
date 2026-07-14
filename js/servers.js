// SENTCOR v5.5 — Servers (auto-open chat, fixed cross-refs)
(function(){
  const S=window.SENTCOR,sb=S.sb;
  S.serversList=[];S.channelsList=[];S.activeServer=null;S.activeChannel=null;

  async function loadSidebarServers(){
    if(!S.user)return;
    const{data:m}=await sb.from("server_members").select("server_id").eq("user_id",S.user.id);
    if(!m||!m.length){document.getElementById("sidebar-servers").innerHTML="";return}
    const ids=m.map(x=>x.server_id);
    const{data:srv}=await sb.from("servers").select("*").in("id",ids).order("created_at");
    S.serversList=srv||[];const ct=document.getElementById("sidebar-servers");if(!ct)return;
    let h="";S.serversList.forEach(s=>{h+=`<div class="server-icon-nav" data-sid="${s.id}" title="${S.escapeHtml(s.name)}"><span>${s.name.charAt(0).toUpperCase()}</span></div>`});
    ct.innerHTML=h;ct.querySelectorAll(".server-icon-nav").forEach(el=>el.addEventListener("click",()=>selectServer(el.dataset.sid)))
  }

  async function selectServer(sid){
    S.activeServer=sid;
    document.querySelectorAll("#sidebar .sidebar-nav").forEach(e=>e.classList.remove("active"));
    document.querySelectorAll("#sidebar .server-icon-nav").forEach(e=>e.classList.remove("active"));
    const icon=document.querySelector(`.server-icon-nav[data-sid="${sid}"]`);if(icon)icon.classList.add("active");
    const srv=S.serversList.find(s=>s.id===sid);if(!srv)return;
    const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader(srv.name);await renderChannels(sid);document.title="Sentcor - "+srv.name
  }

  async function renderChannels(sid){
    const{data:ch}=await sb.from("channels").select("*").eq("server_id",sid).order("position");S.channelsList=ch||[];
    const srv=S.serversList.find(s=>s.id===sid);const isOwner=srv&&srv.owner_id===S.user.id;
    const txt=S.channelsList.filter(c=>c.type==="text"),vc=S.channelsList.filter(c=>c.type==="voice");
    let h=`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;"><span style="font-weight:700;font-size:14px;color:var(--text-bright);">${S.escapeHtml(srv.name)}</span><button class="btn btn-icon btn-ghost btn-sm" id="server-dots-btn"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>`;
    if(txt.length){h+='<div class="sp-section-title">Текстовые каналы</div>';txt.forEach(c=>h+=`<div class="sp-item" data-chid="${c.id}"><i class="fa-solid fa-hashtag" style="width:18px;text-align:center;"></i> <span>${S.escapeHtml(c.name)}</span>${isOwner?`<button class="btn btn-icon btn-ghost btn-sm ch-dots-btn" data-chid="${c.id}" data-chname="${S.escapeHtml(c.name)}" style="margin-left:auto;font-size:10px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>`:""}</div>`)}
    if(vc.length){h+='<div class="sp-section-title">Голосовые каналы</div>';vc.forEach(c=>h+=`<div class="sp-item" data-chid="${c.id}"><i class="fa-solid fa-volume-high" style="width:18px;text-align:center;"></i> <span>${S.escapeHtml(c.name)}</span>${isOwner?`<button class="btn btn-icon btn-ghost btn-sm ch-dots-btn" data-chid="${c.id}" data-chname="${S.escapeHtml(c.name)}" style="margin-left:auto;font-size:10px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>`:""}</div>`)}
    if(!S.channelsList.length)h='<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет каналов</div>';
    if(isOwner)h+='<div class="sp-item" id="add-ch-btn" style="color:var(--green);font-weight:600;"><i class="fa-solid fa-plus" style="width:18px;"></i> <span>Добавить канал</span></div>';
    S.ui.setSubPanelContent(h);

    // Bind server dots
    document.getElementById("server-dots-btn")?.addEventListener("click",e=>{e.stopPropagation();const items=isOwner?[{label:'<i class="fa-solid fa-pen-to-square"></i> Редактировать сервер',action:()=>showEditServerModal(sid)},{label:'<i class="fa-solid fa-user-plus"></i> Пригласить участника',action:()=>showInviteModal(sid)},{label:'<i class="fa-solid fa-list"></i> Управление каналами',action:()=>showChannelManagerModal(sid)},{label:'<i class="fa-solid fa-users-gear"></i> Роли участников',action:()=>showRolesModal(sid)},"sep",{label:'<i class="fa-solid fa-trash"></i> Удалить сервер',danger:true,action:()=>deleteServer(sid)}]:[{label:'<i class="fa-solid fa-right-from-bracket"></i> Покинуть сервер',danger:true,action:()=>leaveServer(sid)}];S.ui.showContextMenu(items,e.clientX,e.clientY)});

    // Channel click → open chat immediately
    document.querySelectorAll("#sp-content .sp-item[data-chid]").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest(".ch-dots-btn"))return;const channel=S.channelsList.find(c=>c.id===el.dataset.chid);if(!channel)return;S.activeChannel=channel;S.ui.resetCompact();S.ui.renderChatView(channel);S.chat.loadMessages(channel.id);loadMembers(sid)}));

    // Channel dots
    document.querySelectorAll(".ch-dots-btn").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();S.ui.showContextMenu([{label:'<i class="fa-solid fa-pen-to-square"></i> Переименовать',action:()=>{const nn=prompt("Новое название:",btn.dataset.chname);if(nn&&nn.trim())sb.from("channels").update({name:nn.trim()}).eq("id",btn.dataset.chid).then(()=>{S.ui.toast("Переименовано!","success");renderChannels(sid)})}},{label:'<i class="fa-solid fa-trash"></i> Удалить',danger:true,action:()=>S.ui.confirm("Удалить канал?","Сообщения пропадут.",async()=>{await sb.from("channels").delete().eq("id",btn.dataset.chid);S.ui.toast("Канал удалён","info");renderChannels(sid)})}],e.clientX,e.clientY)}));

    document.getElementById("add-ch-btn")?.addEventListener("click",()=>showCreateChannelModal(sid));
    await loadMembers(sid);
    // Auto-open first text channel
    if(txt.length>0){const fc=txt[0];S.activeChannel=fc;S.ui.resetCompact();S.ui.renderChatView(fc);S.chat.loadMessages(fc.id)}
  }

  async function loadMembers(sid){
    try{
      const{data:mm}=await sb.from("server_members").select("user_id,role").eq("server_id",sid);if(!mm)return;
      const me=mm.find(m=>m.user_id===S.user.id);S.ui.isAdmin=me&&(me.role==="owner"||me.role==="admin");const isOwner=me&&me.role==="owner";
      const ids=mm.map(m=>m.user_id);const{data:pr}=await sb.from("profiles").select("*").in("id",ids);if(!pr){S.ui.clearMembers();return}
      const on=pr.filter(m=>m.status==="online"||m.status==="idle"||m.status==="dnd"),off=pr.filter(m=>!on.includes(m));
      let hh="";if(on.length){hh+=`<div class="sp-section-title">В сети — ${on.length}</div>`;on.forEach(m=>hh+=memberItem(m,isOwner,sid))}
      if(off.length){hh+=`<div class="sp-section-title">Не в сети — ${off.length}</div>`;off.forEach(m=>hh+=memberItem(m,isOwner,sid))}
      S.ui.setMembersContent(hh);
      document.querySelectorAll(".member-dots-btn").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();const uid=btn.dataset.uid,uname=btn.dataset.uname,isFriend=S.friendsList.some(f=>f.id===uid);const items=[{label:'<i class="fa-solid fa-user"></i> Посмотреть профиль',action:()=>{if(S.friends.openChat)S.friends.openChat(uid)}}];if(isFriend)items.push({label:'<i class="fa-solid fa-user-minus"></i> Удалить из друзей',danger:true,action:()=>{if(S.friends.removeFriend)S.friends.removeFriend(uid)}});else items.push({label:'<i class="fa-solid fa-user-plus"></i> Отправить заявку',action:()=>{if(S.friends.sendReq)S.friends.sendReq(uname)}});if(isOwner&&uid!==S.user.id)items.push({label:'<i class="fa-solid fa-eject"></i> Удалить из сервера',danger:true,action:()=>{sb.from("server_members").delete().eq("server_id",sid).eq("user_id",uid).then(()=>{S.ui.toast("Участник удалён","info");loadMembers(sid)})}});S.ui.showContextMenu(items,e.clientX,e.clientY)}))
    }catch(e){console.error("loadMembers:",e)}
  }

  function memberItem(m,isOwner,sid){
    const av=m.avatar_url?`<img src="${m.avatar_url}">`:(m.display_name||m.username||"?").charAt(0).toUpperCase();
    return `<div class="sp-item-friend"><div class="avatar avatar-sm">${av}</div><span class="status-dot status-${m.status||"offline"}"></span><span style="flex:1;font-size:12px;">${S.escapeHtml(m.display_name||m.username)}</span>${m.game_status?`<span style="font-size:10px;color:var(--text-muted);margin-right:4px;">${S.escapeHtml(m.game_status)}</span>`:""}<button class="btn btn-icon btn-ghost btn-sm member-dots-btn" data-uid="${m.id}" data-uname="${S.escapeHtml(m.username||"")}" style="font-size:10px;"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>`
  }

  function showPage(){
    S.ui.activateNav("servers");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader("Серверы");
    let h=`<div style="padding:8px 12px;display:flex;gap:6px;"><button class="btn btn-accent-outline" id="sp-create-server" style="flex:1;font-weight:700;"><i class="fa-solid fa-plus"></i> Создать</button><button class="btn btn-secondary" id="sp-discover-server" style="flex:1;font-weight:700;"><i class="fa-solid fa-compass"></i> Найти</button></div>`;
    if(S.serversList.length){h+='<div class="sp-section-title">Мои серверы</div>';S.serversList.forEach(s=>{const av=s.icon_url?`<img src="${s.icon_url}">`:'S';h+=`<div class="sp-item srv-item" data-sid="${s.id}"><div class="avatar avatar-sm" style="margin-right:4px;background:var(--accent);color:#fff;font-weight:700;">${av}</div> <span>${S.escapeHtml(s.name)}</span><button class="btn btn-icon btn-ghost btn-sm srv-dots-btn" data-sid="${s.id}" style="margin-left:auto;font-size:10px;"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>`})}
    else h+='<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет серверов</div>';
    S.ui.setSubPanelContent(h);
    document.getElementById("sp-create-server")?.addEventListener("click",showCreateModal);
    document.getElementById("sp-discover-server")?.addEventListener("click",showDiscoverPage);
    document.querySelectorAll(".srv-item").forEach(el=>el.addEventListener("click",()=>selectServer(el.dataset.sid)));
    document.querySelectorAll(".srv-dots-btn").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();const srv=S.serversList.find(s=>s.id===btn.dataset.sid);if(!srv)return;const isOwner=srv.owner_id===S.user.id;const items=isOwner?[{label:'<i class="fa-solid fa-pen-to-square"></i> Редактировать',action:()=>showEditServerModal(btn.dataset.sid)},{label:'<i class="fa-solid fa-user-plus"></i> Пригласить',action:()=>showInviteModal(btn.dataset.sid)},"sep",{label:'<i class="fa-solid fa-trash"></i> Удалить',danger:true,action:()=>deleteServer(btn.dataset.sid)}]:[{label:'<i class="fa-solid fa-right-from-bracket"></i> Покинуть',danger:true,action:()=>leaveServer(btn.dataset.sid)}];S.ui.showContextMenu(items,e.clientX,e.clientY)}));
    S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><i class="fa-solid fa-server" style="font-size:48px;opacity:0.3;display:block;margin-bottom:16px;"></i><h3>Серверы</h3><p>Создайте новый сервер или найдите существующие</p></div></div>`);
    S.ui.clearMembers();document.title="Sentcor - Серверы"
  }

  function showCreateModal(){
    const b=`<div class="input-group"><label class="input-label">Название сервера</label><input class="input" id="ns-name" placeholder="Мой сервер" maxlength="100"><div class="input-error" id="ns-err"></div></div><div class="input-group"><label class="input-label">Тип сервера</label><select class="input" id="ns-public"><option value="true">Публичный (виден в поиске)</option><option value="false">Приватный (только по приглашению)</option></select></div><div class="input-group"><label class="input-label">Описание</label><textarea class="input" id="ns-desc" rows="2" maxlength="200" placeholder="О чём сервер..."></textarea></div>`;
    S.ui.showModal("Создать сервер",b,[{text:"Отмена",cls:"btn-secondary"},{text:"Создать",cls:"btn-primary",onClick:async(e,m,o)=>{const n=document.getElementById("ns-name")?.value?.trim();if(!n){document.getElementById("ns-err").textContent="Введите название";return}const pub=document.getElementById("ns-public")?.value==="true";const d=document.getElementById("ns-desc")?.value?.trim()||"";await createServer(n,pub,d);o.remove()}}])
  }

  async function createServer(name,isPublic,desc){
    S.ui.toast("Создаём...","info");
    try{const{data:srv,error:e}=await sb.from("servers").insert({name,owner_id:S.user.id,public:isPublic,description:desc||null}).select().single();if(e){S.ui.toast("Ошибка: "+e.message,"error");return}await sb.from("server_members").insert({server_id:srv.id,user_id:S.user.id,role:"owner"});await sb.from("channels").insert([{server_id:srv.id,name:"общий",type:"text",position:0},{server_id:srv.id,name:"Войс",type:"voice",position:1}]);S.ui.toast("Сервер «"+name+"» создан!","success");await loadSidebarServers();setTimeout(()=>selectServer(srv.id),300)}catch(err){S.ui.toast("Ошибка: "+err.message,"error")}
  }

  function showEditServerModal(sid){
    const srv=S.serversList.find(s=>s.id===sid);if(!srv)return;
    const av=srv.icon_url?`<img src="${srv.icon_url}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">`:`<div style="width:64px;height:64px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:26px;">${srv.name.charAt(0).toUpperCase()}</div>`;
    const b=`<div style="text-align:center;margin-bottom:16px;">${av}<button class="btn btn-sm btn-secondary" id="es-avatar-btn" style="margin-top:8px;"><i class="fa-solid fa-camera"></i> Сменить иконку</button><input type="file" id="es-avatar-input" accept="image/*" hidden></div><div class="input-group"><label class="input-label">Название</label><input class="input" id="es-name" value="${S.escapeHtml(srv.name)}" maxlength="100"></div><div class="input-group"><label class="input-label">Описание</label><textarea class="input" id="es-desc" rows="2" maxlength="200">${S.escapeHtml(srv.description||"")}</textarea></div>`;
    S.ui.showModal("Редактировать сервер",b,[{text:"Отмена",cls:"btn-secondary"},{text:"Сохранить",cls:"btn-primary",onClick:async()=>{const n=document.getElementById("es-name")?.value?.trim(),d=document.getElementById("es-desc")?.value?.trim();if(!n)return;const{error}=await sb.from("servers").update({name:n,description:d||null}).eq("id",sid);if(error)S.ui.toast("Ошибка: "+error.message,"error");else{S.ui.toast("Сервер обновлён!","success");await loadSidebarServers();selectServer(sid)}document.querySelector(".modal-overlay")?.remove()}}]);
    document.getElementById("es-avatar-btn")?.addEventListener("click",()=>document.getElementById("es-avatar-input").click());
    document.getElementById("es-avatar-input")?.addEventListener("change",async e=>{const f=e.target.files[0];if(!f||f.size>3*1024*1024){S.ui.toast("Файл >3MB","error");return}const ext=f.name.split(".").pop(),fp=`server-icons/${sid}_${Date.now()}.${ext}`;const{error:ue}=await sb.storage.from("avatars").upload(fp,f,{upsert:true});if(ue){S.ui.toast("Ошибка загрузки","error");return}const{data:ud}=sb.storage.from("avatars").getPublicUrl(fp);await sb.from("servers").update({icon_url:ud.publicUrl}).eq("id",sid);S.ui.toast("Иконка обновлена!","success");document.querySelector(".modal-overlay")?.remove();const ssrv=S.serversList.find(s=>s.id===sid);if(ssrv)ssrv.icon_url=ud.publicUrl;await loadSidebarServers();selectServer(sid)})
  }

  function showInviteModal(sid){const b='<div class="input-group"><label class="input-label">Имя пользователя</label><input class="input" id="inv-user" placeholder="username..."><div class="input-error" id="inv-err"></div></div>';S.ui.showModal("Пригласить на сервер",b,[{text:"Отмена",cls:"btn-secondary"},{text:"Пригласить",cls:"btn-primary",onClick:async()=>{const q=document.getElementById("inv-user")?.value?.trim();if(!q)return;const{data:pr}=await sb.from("profiles").select("id,username").or(`username.eq.${q}`).limit(1);if(!pr||!pr.length){document.getElementById("inv-err").textContent="Пользователь не найден";return}const t=pr[0];const{error}=await sb.from("server_members").insert({server_id:sid,user_id:t.id,role:"member"});if(error)document.getElementById("inv-err").textContent=error.message;else{S.ui.toast(t.username+" приглашён!","success");loadSidebarServers();loadMembers(sid);document.querySelector(".modal-overlay")?.remove()}}}])}
  function showCreateChannelModal(sid){const b='<div class="input-group"><label class="input-label">Название</label><input class="input" id="nc-name" placeholder="новый-канал" maxlength="100"><div class="input-error" id="nc-err"></div></div><div class="input-group"><label class="input-label">Тип</label><select class="input" id="nc-type"><option value="text">Текстовый</option><option value="voice">Голосовой</option></select></div>';S.ui.showModal("Создать канал",b,[{text:"Отмена",cls:"btn-secondary"},{text:"Создать",cls:"btn-primary",onClick:async()=>{const n=document.getElementById("nc-name")?.value?.trim();if(!n){document.getElementById("nc-err").textContent="Введите название";return}const t=document.getElementById("nc-type")?.value||"text";const{error}=await sb.from("channels").insert({server_id:sid,name:n,type:t,position:S.channelsList.length});if(error)S.ui.toast("Ошибка: "+error.message,"error");else{S.ui.toast("Канал создан!","success");renderChannels(sid)}document.querySelector(".modal-overlay")?.remove()}}])}

  async function showChannelManagerModal(sid){const{data:ch}=await sb.from("channels").select("*").eq("server_id",sid).order("position");if(!ch||!ch.length){S.ui.toast("Нет каналов","info");return}let h='';ch.forEach(c=>h+=`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;"><span style="flex:1;">${c.type==="voice"?'🔊':'#'} ${S.escapeHtml(c.name)}</span><button class="btn btn-sm btn-ghost rch-btn" data-chid="${c.id}" data-chname="${S.escapeHtml(c.name)}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-danger dch-btn" data-chid="${c.id}"><i class="fa-solid fa-trash"></i></button></div>`);S.ui.showModal("Управление каналами",h,[{text:"Закрыть",cls:"btn-secondary"}]);document.querySelectorAll(".rch-btn").forEach(b=>b.addEventListener("click",()=>{const nn=prompt("Новое название:",b.dataset.chname);if(nn&&nn.trim()){sb.from("channels").update({name:nn.trim()}).eq("id",b.dataset.chid).then(()=>{S.ui.toast("Переименовано!","success");renderChannels(sid);document.querySelector(".modal-overlay")?.remove()})}}));document.querySelectorAll(".dch-btn").forEach(b=>b.addEventListener("click",()=>{S.ui.confirm("Удалить канал?","Сообщения пропадут.",async()=>{await sb.from("channels").delete().eq("id",b.dataset.chid);S.ui.toast("Канал удалён","info");renderChannels(sid);document.querySelector(".modal-overlay")?.remove()})}))}
  async function showRolesModal(sid){const{data:mm}=await sb.from("server_members").select("user_id,role").eq("server_id",sid);if(!mm||!mm.length){S.ui.toast("Нет участников","info");return}const ids=mm.map(m=>m.user_id);const{data:pr}=await sb.from("profiles").select("id,username,display_name").in("id",ids);const pm={};(pr||[]).forEach(p=>pm[p.id]=p);let h='';mm.forEach(m=>{if(m.user_id===S.user.id)return;h+=`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;"><span style="flex:1;">${S.escapeHtml(pm[m.user_id]?.display_name||pm[m.user_id]?.username||"?")}</span><select class="input role-sel" data-uid="${m.user_id}" style="width:110px;padding:4px 8px;font-size:11px;"><option value="member" ${m.role==="member"?"selected":""}>Участник</option><option value="mod" ${m.role==="mod"?"selected":""}>Модер</option><option value="admin" ${m.role==="admin"?"selected":""}>Админ</option></select></div>`});S.ui.showModal("Роли участников",h,[{text:"Закрыть",cls:"btn-secondary"},{text:"Сохранить",cls:"btn-primary",onClick:async()=>{for(const s of document.querySelectorAll(".role-sel")){await sb.from("server_members").update({role:s.value}).eq("server_id",sid).eq("user_id",s.dataset.uid)}S.ui.toast("Роли обновлены!","success");document.querySelector(".modal-overlay")?.remove()}}])}

  async function leaveServer(sid){S.ui.confirm("Покинуть сервер?","Потеряете доступ.",async()=>{await sb.from("server_members").delete().eq("server_id",sid).eq("user_id",S.user.id);S.ui.toast("Вы покинули сервер","info");S.activeServer=null;S.activeChannel=null;await loadSidebarServers();showPage()})}
  async function deleteServer(sid){S.ui.confirm("Удалить сервер?","Всё пропадёт.",async()=>{const{error}=await sb.from("servers").delete().eq("id",sid);if(error)S.ui.toast("Ошибка: "+error.message,"error");else{S.ui.toast("Сервер удалён","info");S.activeServer=null;S.activeChannel=null;await loadSidebarServers();showPage()}})}

  async function showDiscoverPage(){
    S.ui.setSubPanelHeader("Поиск серверов");
    S.ui.setSubPanelContent(`<div class="sp-item active" id="back-to-servers-btn"><i class="fa-solid fa-arrow-left" style="width:18px;"></i> Назад к моим</div>`);
    document.getElementById("back-to-servers-btn")?.addEventListener("click",()=>showPage());
    const{data:all}=await sb.from("servers").select("*").order("created_at",{ascending:false}).limit(30);
    const allServers=(all||[]).filter(s=>s.public!==false&&!S.serversList.some(ms=>ms.id===s.id));
    const renderList=(list)=>{let r="";list.forEach(s=>{const av=s.icon_url?`<img src="${s.icon_url}" style="width:44px;height:44px;border-radius:50%;">`:`<div style="width:44px;height:44px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;">${s.name.charAt(0).toUpperCase()}</div>`;r+=`<div class="home-friend-card"><div>${av}</div><div style="flex:1;"><div style="font-weight:600;">${S.escapeHtml(s.name)}</div><div style="font-size:11px;color:var(--text-muted);">${s.description||"Без описания"}</div></div><button class="btn btn-sm btn-primary join-srv-btn" data-sid="${s.id}"><i class="fa-solid fa-right-to-bracket"></i> Войти</button></div>`});return r||'<div style="text-align:center;color:var(--text-muted);padding:20px;">Нет доступных серверов</div>'};
    let h=`<div class="main-content"><div style="padding:16px 0;"><input class="input" id="discover-search" placeholder="Поиск серверов..."></div><div id="discover-results" style="display:flex;flex-direction:column;gap:8px;">${renderList(allServers)}</div></div>`;
    S.ui.setMainContent(h);S.ui.clearMembers();document.title="Sentcor - Поиск серверов";
    document.getElementById("discover-search")?.addEventListener("input",async e=>{const q=e.target.value.trim();if(!q){document.getElementById("discover-results").innerHTML=renderList(allServers);return}const{data:found}=await sb.from("servers").select("*").ilike("name",`%${q}%`).limit(20);document.getElementById("discover-results").innerHTML=renderList((found||[]).filter(s=>!S.serversList.some(ms=>ms.id===s.id)))});
    document.querySelectorAll(".join-srv-btn").forEach(b=>b.addEventListener("click",async e=>{e.stopPropagation();const sid=b.dataset.sid;const{error}=await sb.from("server_members").insert({server_id:sid,user_id:S.user.id,role:"member"});if(error)S.ui.toast("Ошибка: "+error.message,"error");else{S.ui.toast("Вы присоединились!","success");await loadSidebarServers();selectServer(sid)}}))
  }

  S.servers={loadSidebarServers,selectServer,showPage,showCreateModal,createServer,showCreateChannelModal,loadMembers,showDiscoverPage};
})();