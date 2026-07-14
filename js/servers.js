// SENTCOR v4 — Servers
(function(){
  const S=window.SENTCOR,sb=S.sb;
  S.serversList=[];S.channelsList=[];S.activeServer=null;S.activeChannel=null;

  async function loadSidebarServers(){
    if(!S.user)return;
    const{data:m}=await sb.from("server_members").select("server_id").eq("user_id",S.user.id);
    if(!m||!m.length){renderSidebar([]);return}
    const ids=m.map(x=>x.server_id);
    const{data:srv}=await sb.from("servers").select("*").in("id",ids).order("created_at");
    S.serversList=srv||[];renderSidebar(S.serversList)
  }
  function renderSidebar(srvs){
    const ct=document.getElementById("sidebar-servers");if(!ct)return;
    let h="";srvs.forEach(s=>{const ini=s.name.charAt(0).toUpperCase();h+=`<div class="server-icon-nav" data-sid="${s.id}" title="${S.escapeHtml(s.name)}"><span>${ini}</span></div>`});
    ct.innerHTML=h;
    ct.querySelectorAll(".server-icon-nav").forEach(el=>el.addEventListener("click",()=>selectServer(el.dataset.sid)))
  }
  async function selectServer(sid){
    S.activeServer=sid;
    $$("#sidebar .sidebar-nav").forEach(e=>e.classList.remove("active"));
    $$("#sidebar .server-icon-nav").forEach(e=>e.classList.remove("active"));
    const icon=document.querySelector(`.server-icon-nav[data-sid="${sid}"]`);if(icon)icon.classList.add("active");
    const srv=S.serversList.find(s=>s.id===sid);if(!srv)return;
    const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader(srv.name);
    renderChannels(sid)
  }
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
      const ch=S.channelsList.find(c=>c.id===el.dataset.chid);if(!ch)return;
      S.activeChannel=ch;S.ui.resetCompact();S.ui.renderChatView(ch);S.chat.loadMessages(ch.id);loadMembers(sid)
    }));
    const addBtn=document.getElementById("add-ch-btn");if(addBtn)addBtn.addEventListener("click",()=>showCreateChannelModal(sid));
    loadMembers(sid);
    // Show "select channel" placeholder in main area
    S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><i class="fa-solid fa-arrow-left" style="font-size:48px;opacity:0.3;display:block;margin-bottom:16px;"></i><h3>Выберите канал</h3><p style="font-size:13px;">Нажмите на канал в списке слева</p></div></div>`)
  }
  async function loadMembers(sid){
    const{data:mm}=await sb.from("server_members").select("user_id,role").eq("server_id",sid);
    if(!mm)return;
    const me=mm.find(m=>m.user_id===S.user.id);S.ui.isAdmin=me&&(me.role==="owner"||me.role==="admin");
    const ids=mm.map(m=>m.user_id);
    const{data:pr}=await sb.from("profiles").select("*").in("id",ids);
    if(pr)S.ui.renderMembers(pr)
  }
  function showPage(){
    S.ui.activateNav("servers");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader("Серверы");
    let h=`<div style="padding:12px;"><button class="btn btn-accent-outline" id="sp-create-server" style="width:100%;"><i class="fa-solid fa-plus"></i> Создать сервер</button></div>`;
    if(S.serversList.length){h+='<div class="sp-section-title">Мои серверы</div>';S.serversList.forEach(s=>h+=`<div class="sp-item srv-item" data-sid="${s.id}"><i class="fa-solid fa-server" style="width:18px;"></i> <span>${S.escapeHtml(s.name)}</span></div>`)}
    else h+='<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет серверов</div>';
    S.ui.setSubPanelContent(h);
    const csb=document.getElementById("sp-create-server");if(csb)csb.addEventListener("click",showCreateModal);
    document.querySelectorAll(".srv-item").forEach(el=>el.addEventListener("click",()=>selectServer(el.dataset.sid)));
    S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><i class="fa-solid fa-server" style="font-size:48px;opacity:0.3;display:block;margin-bottom:16px;"></i><h3>Выберите сервер</h3><p style="font-size:13px;">Выберите сервер из списка или создайте новый</p></div></div>`);
    S.ui.clearMembers()
  }
  function showCreateModal(){
    const b='<div class="input-group"><label class="input-label">Название</label><input class="input" id="ns-name" placeholder="Мой сервер" maxlength="100"><div class="input-error" id="ns-err"></div></div>';
    S.ui.showModal("Создать сервер",b,[
      {text:"Отмена",cls:"btn-secondary"},{text:"Создать",cls:"btn-primary",onClick:async()=>{const n=document.getElementById("ns-name").value.trim();if(!n){document.getElementById("ns-err").textContent="Введите название";return}await createServer(n);document.querySelector(".modal-overlay").remove()}}
    ])
  }
  async function createServer(name){
    const{data:srv,error}=await sb.from("servers").insert({name,owner_id:S.user.id}).select().single();
    if(error){S.ui.toast("Ошибка","error");return}
    await sb.from("server_members").insert({server_id:srv.id,user_id:S.user.id,role:"owner"});
    await sb.from("channels").insert([{server_id:srv.id,name:"общий",type:"text",position:0},{server_id:srv.id,name:"Войс",type:"voice",position:1}]);
    S.ui.toast("Сервер создан!","success");await loadSidebarServers();selectServer(srv.id)
  }
  function showCreateChannelModal(sid){
    const b='<div class="input-group"><label class="input-label">Название</label><input class="input" id="nc-name" placeholder="новый-канал"><div class="input-error" id="nc-err"></div></div><div class="input-group"><label class="input-label">Тип</label><select class="input" id="nc-type"><option value="text">Текстовый</option><option value="voice">Голосовой</option></select></div>';
    S.ui.showModal("Создать канал",b,[
      {text:"Отмена",cls:"btn-secondary"},{text:"Создать",cls:"btn-primary",onClick:async()=>{const n=document.getElementById("nc-name").value.trim();if(!n){document.getElementById("nc-err").textContent="Введите название";return};const t=document.getElementById("nc-type").value;await sb.from("channels").insert({server_id:sid,name:n,type:t,position:S.channelsList.length});S.ui.toast("Канал создан!","success");renderChannels(sid);document.querySelector(".modal-overlay").remove()}}
    ])
  }

  function $$(s){return document.querySelectorAll(s)}
  S.servers={loadSidebarServers,selectServer,showPage,showCreateModal,createServer,loadMembers};
})();