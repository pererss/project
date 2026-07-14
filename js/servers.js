// SENTCOR v4.1 — Servers (full context menu, fixed creation)
(function(){
  const S=window.SENTCOR,sb=S.sb;
  S.serversList=[];S.channelsList=[];S.activeServer=null;S.activeChannel=null;

  function Q(s){return document.querySelectorAll(s)}

  // ---- LOAD SERVERS INTO SIDEBAR ----
  async function loadSidebarServers(){
    if(!S.user)return;
    const{data:m,error:me}=await sb.from("server_members").select("server_id").eq("user_id",S.user.id);
    if(me){console.error("Load memberships:",me.message);renderSidebar([]);return}
    if(!m||!m.length){renderSidebar([]);return}
    const ids=m.map(x=>x.server_id);
    const{data:srv}=await sb.from("servers").select("*").in("id",ids).order("created_at");
    S.serversList=srv||[];renderSidebar(S.serversList)
  }

  function renderSidebar(srvs){
    const ct=document.getElementById("sidebar-servers");if(!ct)return;
    let h="";srvs.forEach(s=>{
      const ini=s.name.charAt(0).toUpperCase();
      h+=`<div class="server-icon-nav" data-sid="${s.id}" title="${S.escapeHtml(s.name)}"><span>${ini}</span></div>`
    });
    ct.innerHTML=h;
    ct.querySelectorAll(".server-icon-nav").forEach(el=>{
      el.addEventListener("click",()=>selectServer(el.dataset.sid));
      el.addEventListener("contextmenu",e=>{e.preventDefault();showServerContextMenu(el.dataset.sid,e.clientX,e.clientY)})
    })
  }

  // ---- SERVER CONTEXT MENU ----
  function showServerContextMenu(sid,x,y){
    const srv=S.serversList.find(s=>s.id===sid);if(!srv)return;
    const isOwner=srv.owner_id===S.user.id;
    const items=[];
    if(isOwner){
      items.push({label:'<i class="fa-solid fa-pen-to-square"></i> Редактировать',action:()=>showEditServerModal(sid)});
      items.push({label:'<i class="fa-solid fa-user-plus"></i> Пригласить участника',action:()=>showInviteModal(sid)});
      items.push({label:'<i class="fa-solid fa-list"></i> Управление каналами',action:()=>showChannelManagerModal(sid)});
      items.push({label:'<i class="fa-solid fa-users-gear"></i> Роли участников',action:()=>showRolesModal(sid)});
      items.push("sep");
      items.push({label:'<i class="fa-solid fa-trash"></i> Удалить сервер',danger:true,action:()=>deleteServer(sid)});
    }else{
      items.push({label:'<i class="fa-solid fa-right-from-bracket"></i> Покинуть сервер',danger:true,action:()=>leaveServer(sid)});
    }
    S.ui.showContextMenu(items,x,y)
  }

  // ---- SELECT SERVER ----
  async function selectServer(sid){
    S.activeServer=sid;
    Q("#sidebar .sidebar-nav").forEach(e=>e.classList.remove("active"));
    Q("#sidebar .server-icon-nav").forEach(e=>e.classList.remove("active"));
    const icon=document.querySelector(`.server-icon-nav[data-sid="${sid}"]`);if(icon)icon.classList.add("active");
    const srv=S.serversList.find(s=>s.id===sid);if(!srv)return;
    const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader(srv.name);
    await renderChannels(sid)
  }

  // ---- RENDER CHANNELS ----
  async function renderChannels(sid){
    const{data:ch}=await sb.from("channels").select("*").eq("server_id",sid).order("position");
    S.channelsList=ch||[];
    const srv=S.serversList.find(s=>s.id===sid);
    const isOwner=srv&&srv.owner_id===S.user.id;
    const txt=S.channelsList.filter(c=>c.type==="text"),vc=S.channelsList.filter(c=>c.type==="voice");
    let h="";
    if(txt.length){h+='<div class="sp-section-title">Текстовые каналы</div>';txt.forEach(c=>h+=`<div class="sp-item" data-chid="${c.id}"><i class="fa-solid fa-hashtag" style="width:18px;text-align:center;"></i> <span>${S.escapeHtml(c.name)}</span></div>`)}
    if(vc.length){h+='<div class="sp-section-title">Голосовые каналы</div>';vc.forEach(c=>h+=`<div class="sp-item" data-chid="${c.id}"><i class="fa-solid fa-volume-high" style="width:18px;text-align:center;"></i> <span>${S.escapeHtml(c.name)}</span></div>`)}
    if(!S.channelsList.length)h='<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет каналов</div>';
    if(isOwner)h+='<div class="sp-item" id="add-ch-btn" style="color:var(--green);font-weight:600;"><i class="fa-solid fa-plus" style="width:18px;"></i> <span>Добавить канал</span></div>';
    S.ui.setSubPanelContent(h);
    document.querySelectorAll("#sp-content .sp-item[data-chid]").forEach(el=>el.addEventListener("click",()=>{
      const channel=S.channelsList.find(c=>c.id===el.dataset.chid);if(!channel)return;
      S.activeChannel=channel;S.ui.resetCompact();S.ui.renderChatView(channel);S.chat.loadMessages(channel.id);loadMembers(sid)
    }));
    const addBtn=document.getElementById("add-ch-btn");if(addBtn)addBtn.addEventListener("click",()=>showCreateChannelModal(sid));
    await loadMembers(sid);
    S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><i class="fa-solid fa-arrow-left" style="font-size:48px;opacity:0.3;display:block;margin-bottom:16px;"></i><h3>Выберите канал</h3><p style="font-size:13px;">Нажмите на канал слева</p></div></div>`)
  }

  // ---- LOAD MEMBERS ----
  async function loadMembers(sid){
    try{
      const{data:mm}=await sb.from("server_members").select("user_id,role").eq("server_id",sid);
      if(!mm)return;
      const me=mm.find(m=>m.user_id===S.user.id);S.ui.isAdmin=me&&(me.role==="owner"||me.role==="admin");
      const ids=mm.map(m=>m.user_id);
      const{data:pr}=await sb.from("profiles").select("*").in("id",ids);
      if(pr)S.ui.renderMembers(pr)
    }catch(e){console.error("loadMembers:",e)}
  }

  // ---- SHOW SERVERS PAGE ----
  function showPage(){
    S.ui.activateNav("servers");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader("Серверы");
    let h=`<div style="padding:12px;"><button class="btn btn-accent-outline" id="sp-create-server" style="width:100%;"><i class="fa-solid fa-plus"></i> Создать сервер</button></div>`;
    if(S.serversList.length){h+='<div class="sp-section-title">Мои серверы</div>';S.serversList.forEach(s=>h+=`<div class="sp-item srv-item" data-sid="${s.id}"><i class="fa-solid fa-server" style="width:18px;"></i> <span>${S.escapeHtml(s.name)}</span></div>`)}
    else h+='<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет серверов</div>';
    S.ui.setSubPanelContent(h);
    document.getElementById("sp-create-server")?.addEventListener("click",showCreateModal);
    document.querySelectorAll(".srv-item").forEach(el=>{
      el.addEventListener("click",()=>selectServer(el.dataset.sid));
      el.addEventListener("contextmenu",e=>{e.preventDefault();e.stopPropagation();showServerContextMenu(el.dataset.sid,e.clientX,e.clientY)})
    });
    S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><i class="fa-solid fa-server" style="font-size:48px;opacity:0.3;display:block;margin-bottom:16px;"></i><h3>Выберите сервер</h3><p style="font-size:13px;">Выберите сервер из списка или создайте новый</p></div></div>`);
    S.ui.clearMembers()
  }

  // ---- CREATE SERVER ----
  function showCreateModal(){
    const b='<div class="input-group"><label class="input-label">Название сервера</label><input class="input" id="ns-name" placeholder="Мой сервер" maxlength="100"><div class="input-error" id="ns-err"></div></div>';
    S.ui.showModal("Создать сервер",b,[
      {text:"Отмена",cls:"btn-secondary"},
      {text:"Создать",cls:"btn-primary",onClick:async(e,m,o)=>{
        const n=document.getElementById("ns-name")?.value?.trim();
        if(!n){const err=document.getElementById("ns-err");if(err)err.textContent="Введите название";return}
        await createServer(n);o.remove()
      }}
    ])
  }

  async function createServer(name){
    S.ui.toast("Создаём сервер...","info");
    try{
      // Insert server
      const{data:srv,error:srvErr}=await sb.from("servers").insert({name,owner_id:S.user.id}).select().single();
      if(srvErr){S.ui.toast("Ошибка: "+srvErr.message,"error");return}
      // Add owner as member
      await sb.from("server_members").insert({server_id:srv.id,user_id:S.user.id,role:"owner"});
      // Default channels
      await sb.from("channels").insert([
        {server_id:srv.id,name:"общий",type:"text",position:0},
        {server_id:srv.id,name:"Войс",type:"voice",position:1}
      ]);
      S.ui.toast("Сервер «"+name+"» создан!","success");
      await loadSidebarServers();
      // Small delay to ensure RLS cache is updated
      setTimeout(()=>selectServer(srv.id),200)
    }catch(e){S.ui.toast("Ошибка создания: "+e.message,"error")}
  }

  // ---- EDIT SERVER ----
  function showEditServerModal(sid){
    const srv=S.serversList.find(s=>s.id===sid);if(!srv)return;
    const b=`<div class="input-group"><label class="input-label">Название</label><input class="input" id="es-name" value="${S.escapeHtml(srv.name)}" maxlength="100"><div class="input-error" id="es-err"></div></div>`;
    S.ui.showModal("Редактировать сервер",b,[
      {text:"Отмена",cls:"btn-secondary"},
      {text:"Сохранить",cls:"btn-primary",onClick:async()=>{
        const n=document.getElementById("es-name")?.value?.trim();if(!n)return;
        const{error}=await sb.from("servers").update({name:n}).eq("id",sid);
        if(error)S.ui.toast("Ошибка: "+error.message,"error");else{S.ui.toast("Название изменено!","success");await loadSidebarServers();selectServer(sid)}
        document.querySelector(".modal-overlay")?.remove()
      }}
    ])
  }

  // ---- INVITE USER TO SERVER ----
  function showInviteModal(sid){
    const b='<div class="input-group"><label class="input-label">Имя пользователя</label><input class="input" id="inv-user" placeholder="username..."><div class="input-error" id="inv-err"></div></div>';
    S.ui.showModal("Пригласить на сервер",b,[
      {text:"Отмена",cls:"btn-secondary"},
      {text:"Пригласить",cls:"btn-primary",onClick:async()=>{
        const q=document.getElementById("inv-user")?.value?.trim();if(!q)return;
        const{data:pr}=await sb.from("profiles").select("id,username").or(`username.eq.${q}`).limit(1);
        if(!pr||!pr.length){const err=document.getElementById("inv-err");if(err)err.textContent="Пользователь не найден";return}
        const target=pr[0];
        const{error}=await sb.from("server_members").insert({server_id:sid,user_id:target.id,role:"member"});
        if(error){const err=document.getElementById("inv-err");if(err)err.textContent=error.message}
        else{S.ui.toast(target.username+" приглашён!","success");await loadSidebarServers();await loadMembers(sid);document.querySelector(".modal-overlay")?.remove()}
      }}
    ])
  }

  // ---- CHANNEL MANAGER ----
  async function showChannelManagerModal(sid){
    const{data:ch}=await sb.from("channels").select("*").eq("server_id",sid).order("position");
    const channels=ch||[];
    let h='<div style="display:flex;flex-direction:column;gap:4px;">';
    channels.forEach(c=>h+=`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;"><span style="flex:1;">${c.type==="voice"?'🔊':'#'} ${S.escapeHtml(c.name)}</span><button class="btn btn-sm btn-ghost rename-ch-btn" data-chid="${c.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-danger del-ch-btn" data-chid="${c.id}"><i class="fa-solid fa-trash"></i></button></div>`);
    h+='<button class="btn btn-sm btn-primary" id="mgr-add-ch-btn" style="margin-top:8px;"><i class="fa-solid fa-plus"></i> Добавить канал</button></div>';
    S.ui.showModal("Управление каналами",h,[{text:"Закрыть",cls:"btn-secondary"}]);
    document.getElementById("mgr-add-ch-btn")?.addEventListener("click",()=>{document.querySelector(".modal-overlay")?.remove();showCreateChannelModal(sid)});
    document.querySelectorAll(".rename-ch-btn").forEach(b=>b.addEventListener("click",()=>{
      const chid=b.dataset.chid;const ch=channels.find(c=>c.id===chid);if(!ch)return;
      const newName=prompt("Новое название:",ch.name);if(!newName||!newName.trim())return;
      sb.from("channels").update({name:newName.trim()}).eq("id",chid).then(()=>{S.ui.toast("Переименовано!","success");renderChannels(sid)})
    }));
    document.querySelectorAll(".del-ch-btn").forEach(b=>b.addEventListener("click",()=>{
      const chid=b.dataset.chid;S.ui.confirm("Удалить канал?","Все сообщения будут потеряны.",async()=>{await sb.from("channels").delete().eq("id",chid);S.ui.toast("Канал удалён","info");await renderChannels(sid);document.querySelector(".modal-overlay")?.remove()})
    }))
  }

  // ---- ROLES MANAGER ----
  async function showRolesModal(sid){
    const{data:mm}=await sb.from("server_members").select("user_id,role").eq("server_id",sid);
    if(!mm||!mm.length){S.ui.toast("Нет участников","info");return}
    const ids=mm.map(m=>m.user_id);
    const{data:pr}=await sb.from("profiles").select("id,username,display_name").in("id",ids);
    const pm={};(pr||[]).forEach(p=>pm[p.id]=p);
    let h='<div style="display:flex;flex-direction:column;gap:6px;">';
    mm.forEach(m=>{
      const name=pm[m.user_id]?.display_name||pm[m.user_id]?.username||"?";if(m.user_id===S.user.id)return;
      h+=`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;"><span style="flex:1;">${S.escapeHtml(name)}</span><span style="font-size:11px;color:var(--text-muted);">${m.role}</span>
        <select class="input role-select" data-uid="${m.user_id}" style="width:auto;padding:4px 8px;font-size:11px;"><option value="member" ${m.role==="member"?"selected":""}>Участник</option><option value="mod" ${m.role==="mod"?"selected":""}>Модер</option><option value="admin" ${m.role==="admin"?"selected":""}>Админ</option></select></div>`
    });
    h+='</div>';
    S.ui.showModal("Роли участников",h,[
      {text:"Закрыть",cls:"btn-secondary"},
      {text:"Сохранить",cls:"btn-primary",onClick:async()=>{
        const selects=document.querySelectorAll(".role-select");
        for(const sel of selects){await sb.from("server_members").update({role:sel.value}).eq("server_id",sid).eq("user_id",sel.dataset.uid)}
        S.ui.toast("Роли обновлены!","success");document.querySelector(".modal-overlay")?.remove()
      }}
    ])
  }

  // ---- LEAVE / DELETE SERVER ----
  async function leaveServer(sid){
    S.ui.confirm("Покинуть сервер?","Вы потеряете доступ ко всем каналам.",async()=>{
      await sb.from("server_members").delete().eq("server_id",sid).eq("user_id",S.user.id);
      S.ui.toast("Вы покинули сервер","info");S.activeServer=null;S.activeChannel=null;
      await loadSidebarServers();showPage()
    })
  }
  async function deleteServer(sid){
    S.ui.confirm("Удалить сервер?","Все каналы и сообщения будут безвозвратно удалены.",async()=>{
      const{error}=await sb.from("servers").delete().eq("id",sid);
      if(error)S.ui.toast("Ошибка: "+error.message,"error");else{S.ui.toast("Сервер удалён","info");S.activeServer=null;S.activeChannel=null;await loadSidebarServers();showPage()}
    })
  }

  // ---- CREATE CHANNEL ----
  function showCreateChannelModal(sid){
    const b='<div class="input-group"><label class="input-label">Название</label><input class="input" id="nc-name" placeholder="новый-канал" maxlength="100"><div class="input-error" id="nc-err"></div></div><div class="input-group"><label class="input-label">Тип</label><select class="input" id="nc-type"><option value="text">Текстовый</option><option value="voice">Голосовой</option></select></div>';
    S.ui.showModal("Создать канал",b,[
      {text:"Отмена",cls:"btn-secondary"},
      {text:"Создать",cls:"btn-primary",onClick:async()=>{
        const n=document.getElementById("nc-name")?.value?.trim();if(!n){const err=document.getElementById("nc-err");if(err)err.textContent="Введите название";return}
        const t=document.getElementById("nc-type")?.value||"text";
        const{error}=await sb.from("channels").insert({server_id:sid,name:n,type:t,position:S.channelsList.length});
        if(error)S.ui.toast("Ошибка: "+error.message,"error");else{S.ui.toast("Канал создан!","success");await renderChannels(sid)}
        document.querySelector(".modal-overlay")?.remove()
      }}
    ])
  }

  S.servers={loadSidebarServers,selectServer,showPage,showCreateModal,createServer,showCreateChannelModal,loadMembers};
})();