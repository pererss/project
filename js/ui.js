// SENTCOR v4 — UI (all bugs fixed, new layout)
(function(){
  "use strict";
  const S=window.SENTCOR;
  const $=function(s){return document.querySelector(s)};
  const $$=function(s){return document.querySelectorAll(s)};

  // ---- TOAST ----
  let tc=null;
  function toast(msg,type="info",dur=3000){
    if(!tc){tc=document.createElement("div");tc.className="toast-container";document.body.appendChild(tc)}
    const el=document.createElement("div");el.className=`toast toast-${type}`;el.textContent=msg;tc.appendChild(el);
    setTimeout(()=>{el.classList.add("removing");el.addEventListener("animationend",()=>el.remove())},dur)
  }

  // ---- MODAL ----
  function showModal(title,bodyHtml,buttons=[]){
    const ex=$(".modal-overlay");if(ex)ex.remove();
    const o=document.createElement("div");o.className="modal-overlay";
    const m=document.createElement("div");m.className="modal";
    m.innerHTML=`<div class="modal-header"><h2>${title}</h2><button class="btn btn-icon btn-ghost close-modal"><i class="fa-solid fa-xmark"></i></button></div>`;
    const bd=document.createElement("div");bd.className="modal-body";
    if(typeof bodyHtml==="string")bd.innerHTML=bodyHtml;else bd.appendChild(bodyHtml);
    m.appendChild(bd);
    if(buttons.length){const ft=document.createElement("div");ft.className="modal-footer";buttons.forEach(b=>{const btn=document.createElement("button");btn.className=`btn ${b.cls||"btn-secondary"}`;btn.textContent=b.text;btn.addEventListener("click",e=>{if(b.onClick)b.onClick(e,m,o);if(b.closeOnClick!==false)o.remove()});ft.appendChild(btn)});m.appendChild(ft)}
    o.appendChild(m);o.addEventListener("click",e=>{if(e.target===o)o.remove()});
    o.querySelector(".close-modal").addEventListener("click",()=>o.remove());
    document.body.appendChild(o);const fi=m.querySelector("input");if(fi)fi.focus();
    return{o,m,body:bd}
  }
  function confirm(title,msg,onConfirm,onCancel){
    showModal(title,`<p style="color:var(--text-secondary)">${msg}</p>`,[
      {text:"Отмена",cls:"btn-secondary",onClick:()=>{if(onCancel)onCancel()}},
      {text:"Подтвердить",cls:"btn-danger",onClick:()=>{if(onConfirm)onConfirm()}}
    ])
  }

  // ---- CONTEXT MENU ----
  function showContextMenu(items,x,y){
    closeContextMenu();
    const m=document.createElement("div");m.className="context-menu";m.id="context-menu";
    items.forEach(it=>{
      if(it==="sep"){const s=document.createElement("div");s.className="context-menu-sep";m.appendChild(s);return}
      const el=document.createElement("button");el.className="context-menu-item"+(it.danger?" danger":"");el.innerHTML=(it.icon||"")+it.label;
      el.addEventListener("click",e=>{e.stopPropagation();closeContextMenu();if(it.action)it.action()});m.appendChild(el)
    });
    m.style.left=Math.min(x,window.innerWidth-200)+"px";m.style.top=Math.min(y,window.innerHeight-(m.scrollHeight||200)-10)+"px";
    document.body.appendChild(m);setTimeout(()=>document.addEventListener("click",closeContextMenu,{once:true}),10)
  }
  function closeContextMenu(){const m=document.getElementById("context-menu");if(m)m.remove()}
  function getErrorMessage(err){return err?(err.message||String(err)):"Неизвестная ошибка"}

  // ---- AUTH ----
  function showAuth(){
    const app=$("#app");if(!app)return;
    app.innerHTML=`<div class="auth-screen"><div class="auth-logo">SENTCOR</div><div class="auth-subtitle">Игровой мессенджер</div><div class="auth-card" id="auth-card"></div></div>`;renderLoginForm()
  }
  function renderLoginForm(){
    const c=$("#auth-card");if(!c)return;
    c.innerHTML=`<h2>Вход</h2><div class="input-group"><label class="input-label">Email</label><input class="input" type="email" id="login-email" placeholder="your@email.com" autocomplete="email"><div class="input-error" id="login-email-error"></div></div><div class="input-group"><label class="input-label">Пароль</label><input class="input" type="password" id="login-password" placeholder="••••••••" autocomplete="current-password"><div class="input-error" id="login-password-error"></div></div><div class="input-error" id="login-general-error"></div><button class="btn btn-primary" id="login-btn" style="width:100%;padding:11px;margin-top:6px;">Войти</button><div class="auth-switch">Нет аккаунта? <a id="switch-to-reg">Зарегистрироваться</a></div>`;
    $("#login-btn").addEventListener("click",handleLogin);$("#login-password").addEventListener("keydown",e=>{if(e.key==="Enter")handleLogin()});$("#switch-to-reg").addEventListener("click",renderRegisterForm)
  }
  function renderRegisterForm(){
    const c=$("#auth-card");if(!c)return;
    c.innerHTML=`<h2>Регистрация</h2><div class="input-group"><label class="input-label">Имя пользователя</label><input class="input" type="text" id="reg-username" placeholder="PlayerName" maxlength="32"><div class="input-error" id="reg-username-error"></div></div><div class="input-group"><label class="input-label">Email</label><input class="input" type="email" id="reg-email" placeholder="your@email.com"><div class="input-error" id="reg-email-error"></div></div><div class="input-group"><label class="input-label">Пароль</label><input class="input" type="password" id="reg-password" placeholder="Минимум 6 символов"><div class="input-error" id="reg-password-error"></div></div><div class="input-error" id="reg-general-error"></div><button class="btn btn-primary" id="reg-btn" style="width:100%;padding:11px;margin-top:6px;">Создать аккаунт</button><div class="auth-switch">Уже есть аккаунт? <a id="switch-to-login">Войти</a></div>`;
    $("#reg-btn").addEventListener("click",handleRegister);$("#reg-password").addEventListener("keydown",e=>{if(e.key==="Enter")handleRegister()});$("#switch-to-login").addEventListener("click",renderLoginForm)
  }
  function clearAuthErrors(){$$(".input-error").forEach(e=>e.textContent="")}
  async function handleLogin(){
    clearAuthErrors();const em=$("#login-email").value.trim(),pw=$("#login-password").value;let v=true;
    if(!em){$("#login-email-error").textContent="Введите email";v=false}if(!pw){$("#login-password-error").textContent="Введите пароль";v=false}if(!v)return;
    const btn=$("#login-btn");btn.disabled=true;btn.textContent="Входим...";
    const{error}=await S.auth.signIn(em,pw);
    if(error){$("#login-general-error").textContent=getErrorMessage(error);btn.disabled=false;btn.textContent="Войти"}
  }
  async function handleRegister(){
    clearAuthErrors();const un=$("#reg-username").value.trim(),em=$("#reg-email").value.trim(),pw=$("#reg-password").value;let v=true;
    if(!un||un.length<3){$("#reg-username-error").textContent="Минимум 3 символа";v=false}if(!em){$("#reg-email-error").textContent="Введите email";v=false}if(!pw||pw.length<6){$("#reg-password-error").textContent="Минимум 6 символов";v=false}if(!v)return;
    const btn=$("#reg-btn");btn.disabled=true;btn.textContent="Создаём...";
    const{error}=await S.auth.signUp(em,pw,un);
    if(error){$("#reg-general-error").textContent=getErrorMessage(error);btn.disabled=false;btn.textContent="Создать аккаунт"}else{toast("Аккаунт создан! Проверьте почту.","success",5000);renderLoginForm()}
  }

  // ---- MAIN APP SHELL ----
  function showApp(){
    const app=$("#app");if(!app)return;
    app.innerHTML=`<div id="sidebar">
      <div class="sidebar-logo" id="home-btn" title="Главная">S</div><div class="sidebar-sep"></div>
      <div class="sidebar-nav active" id="nav-friends" title="Друзья"><i class="fa-solid fa-user-group"></i></div>
      <div class="sidebar-nav" id="nav-servers" title="Серверы"><i class="fa-solid fa-comments"></i></div>
      <div class="sidebar-sep"></div><div id="sidebar-servers"></div>
      <div class="server-icon-nav" id="add-server-btn" title="Создать сервер"><i class="fa-solid fa-plus"></i></div>
      <div style="flex:1;"></div>
      <div class="sidebar-nav" id="nav-profile" title="Профиль"><i class="fa-solid fa-user"></i></div>
      <div class="sidebar-nav" id="nav-settings" title="Настройки"><i class="fa-solid fa-gear"></i></div>
    </div>
    <div id="sub-panel">
      <div class="sp-header"><span id="sp-title">Друзья</span><div class="sp-header-actions"><button class="btn btn-icon btn-ghost btn-sm" id="sp-toggle" title="Скрыть"><i class="fa-solid fa-angles-left"></i></button></div></div>
      <div class="sp-content" id="sp-content"></div>
      <div class="sp-footer"><div class="status-avatar-wrapper"><div class="avatar" id="footer-avatar" style="cursor:pointer"></div><span class="status-dot status-online" id="footer-dot"></span></div><div class="user-info"><div class="username" id="footer-username"></div><div class="user-status" id="footer-status"></div></div><div class="sp-footer-actions"><button class="btn btn-icon btn-ghost btn-sm" id="logout-btn" title="Выйти"><i class="fa-solid fa-right-from-bracket"></i></button></div></div>
    </div>
    <div id="main-area"></div>
    <div id="members-list"></div>`;
    updateFooter();bindSidebarEvents();
    S.servers.loadSidebarServers();
    S.friends.loadAll().then(()=>showHomePage())
  }

  function bindSidebarEvents(){
    const hb=document.getElementById("home-btn");if(hb)hb.addEventListener("click",()=>{deactivateNav();if(S.friends.loadAll)S.friends.loadAll().then(()=>showHomePage());else showHomePage()});
    const nf=document.getElementById("nav-friends");if(nf)nf.addEventListener("click",()=>{activateNav("friends");if(S.friends&&S.friends.showPage)S.friends.showPage()});
    const ns=document.getElementById("nav-servers");if(ns)ns.addEventListener("click",()=>{activateNav("servers");if(S.servers&&S.servers.showPage)S.servers.showPage()});
    const np=document.getElementById("nav-profile");if(np)np.addEventListener("click",()=>{activateNav("profile");if(S.profileMod)S.profileMod.showPage()});
    const nst=document.getElementById("nav-settings");if(nst)nst.addEventListener("click",()=>{activateNav("settings");if(S.profileMod)S.profileMod.showSettings()});
    const ab=document.getElementById("add-server-btn");if(ab)ab.addEventListener("click",()=>{if(S.servers&&S.servers.showCreateModal)S.servers.showCreateModal()});
    const st=document.getElementById("sp-toggle");if(st)st.addEventListener("click",()=>{const sp=document.getElementById("sub-panel");if(sp)sp.classList.toggle("collapsed")});
    const lb=document.getElementById("logout-btn");if(lb)lb.addEventListener("click",()=>confirm("Выход","Вы уверены?",async()=>{await S.auth.signOut()}));
    const fa=document.getElementById("footer-avatar");if(fa)fa.addEventListener("click",()=>{if(S.profileMod)S.profileMod.showStatusSelector()})
  }
  function activateNav(nav){
    $$("#sidebar .sidebar-nav").forEach(e=>e.classList.remove("active"));$$("#sidebar .server-icon-nav").forEach(e=>e.classList.remove("active"));
    const el=document.getElementById("nav-"+nav);if(el)el.classList.add("active");
    const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed")
  }
  function deactivateNav(){$$("#sidebar .sidebar-nav").forEach(e=>e.classList.remove("active"));$$("#sidebar .server-icon-nav").forEach(e=>e.classList.remove("active"))}
  function updateFooter(){
    if(!S.profile)return;
    const av=document.getElementById("footer-avatar"),un=document.getElementById("footer-username"),st=document.getElementById("footer-status"),dot=document.getElementById("footer-dot");
    if(av)av.innerHTML=S.profile.avatar_url?`<img src="${S.profile.avatar_url}">`:(S.profile.display_name||S.profile.username||"?").charAt(0).toUpperCase();
    if(un)un.textContent=S.profile.display_name||S.profile.username;
    const sm={online:"В сети",idle:"Не активен",dnd:"Не беспокоить",offline:"Не в сети"};
    if(st)st.textContent=S.profile.custom_status||(S.profile.game_status?S.profile.game_status:sm[S.profile.status]||"В сети");
    if(dot)dot.className="status-dot status-"+(S.profile.status||"online")
  }
  function setSubPanelHeader(t){const h=document.getElementById("sp-title");if(h)h.textContent=t}
  function setSubPanelContent(h){const c=document.getElementById("sp-content");if(c)c.innerHTML=h}
  function setMainContent(h){const m=document.getElementById("main-area");if(m){m.innerHTML=h;const mc=m.querySelector(".main-content");if(mc)mc.style.animation="slideInRight 250ms var(--ease)"}}
  function clearMembers(){const ml=document.getElementById("members-list");if(ml)ml.innerHTML=""}
  function setMembersContent(h){const ml=document.getElementById("members-list");if(ml)ml.innerHTML=h}

  // ---- HOME (Discord-like, friends online) ----
  function showHomePage(){
    const p=S.profile||{};
    let html=`<div class="main-content"><div class="main-header"><i class="fa-solid fa-house"></i> Главная</div>`;
    html+=`<div style="padding:24px 0 0;"><h2 style="font-size:20px;color:var(--text-bright);margin-bottom:4px;">Добро пожаловать, ${esc(p.display_name||p.username||"игрок")}!</h2>`;
    html+=`<p style="color:var(--text-muted);font-size:13px;margin-bottom:24px;">Общайтесь с друзьями в текстовых и голосовых каналах</p></div>`;
    const friends=S.friendsList||[];
    const online=friends.filter(f=>f.status==="online"||f.status==="idle"||f.status==="dnd");
    html+=`<div class="home-online-section"><div class="home-section-title">ДРУЗЬЯ В СЕТИ — ${online.length}</div>`;
    if(online.length){online.forEach(f=>{const av=f.avatar_url?`<img src="${f.avatar_url}">`:(f.display_name||f.username||"?").charAt(0).toUpperCase();html+=`<div class="home-friend-card" data-fid="${f.id}"><div class="friend-avatar"><div class="avatar">${av}</div><span class="status-dot status-${f.status}"></span></div><div class="friend-info"><div class="friend-name">${esc(f.display_name||f.username)}</div><div class="friend-meta">${f.game_status?esc(f.game_status):"В сети"}</div></div><div style="display:flex;gap:6px;"><button class="btn btn-sm btn-primary dm-home-btn" data-fid="${f.id}"><i class="fa-solid fa-comment"></i></button></div></div>`})}
    else{html+=`<div class="home-empty"><i class="fa-solid fa-users"></i><h3>Никого нет в сети</h3><p>Когда ваши друзья зайдут в SENTCOR, они появятся здесь.</p></div>`}
    html+=`</div></div>`;setMainContent(html);clearMembers();
    document.querySelectorAll(".dm-home-btn").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();if(S.friends&&S.friends.openDM)S.friends.openDM(b.dataset.fid)}));
    document.querySelectorAll(".home-friend-card").forEach(c=>c.addEventListener("click",()=>{if(S.friends&&S.friends.openDetail)S.friends.openDetail(c.dataset.fid)}))
  }

  // ---- CHAT VIEW (compact: names only on author change) ----
  function renderChatView(channel,isDM=false,friendName=""){
    const title=isDM?`💬 ${esc(friendName)}`:`<i class="fa-solid fa-hashtag"></i> ${esc(channel.name)}`;
    if(isDM)setSubPanelHeader(friendName);else{const srv=(S.serversList||[]).find(s=>s.id===S.activeServer);setSubPanelHeader(srv?srv.name:"Сервер")}
    let h=`<div style="display:flex;flex-direction:column;height:100%;"><div class="chat-header"><span>${title}</span></div><div class="chat-messages" id="chat-messages"><div class="empty-state"><i class="fa-solid fa-comments" style="font-size:40px;opacity:0.3;"></i><h3>Добро пожаловать!</h3><p>Здесь пока нет сообщений.</p></div></div>`;
    if(channel.type==="text"||isDM)h+=`<div class="chat-input-area"><div class="chat-input-wrapper"><textarea id="msg-input" rows="1" placeholder="Напишите сообщение..." maxlength="${S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH}"></textarea><button class="btn btn-icon btn-ghost" id="send-msg-btn"><i class="fa-solid fa-paper-plane"></i></button></div></div>`;
    else h+=`<div class="chat-input-area" style="text-align:center;padding:24px;"><button class="btn btn-primary" id="join-voice-btn"><i class="fa-solid fa-headset"></i> Подключиться</button></div>`;
    h+=`</div>`;setMainContent(h);clearMembers();
    if(channel.type==="text"||isDM)bindChatInput(channel,isDM);
    else document.getElementById("join-voice-btn")?.addEventListener("click",()=>{if(S.voice)S.voice.joinChannel(channel)})
  }
  function bindChatInput(channel,isDM){
    const ta=document.getElementById("msg-input"),sb=document.getElementById("send-msg-btn");if(!ta)return;
    ta.addEventListener("input",()=>{ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,120)+"px"});
    const send=async()=>{const c=ta.value.trim();if(!c)return;ta.disabled=true;let err;if(isDM)err=(await S.chat.sendDM(channel.receiver_id,c)).error;else err=(await S.chat.sendMessage(channel.id,c)).error;if(err){toast("Ошибка: "+getErrorMessage(err),"error");ta.disabled=false}else{ta.value="";ta.style.height="auto";ta.disabled=false;ta.focus()}};
    ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
    sb.addEventListener("click",send)
  }

  // Compact mode: only show author header when prev author differs
  let _lastAuthor=null;
  function appendMessage(msg,pMap={}){
    const ct=document.getElementById("chat-messages");if(!ct)return;const em=ct.querySelector(".empty-state");if(em)em.remove();
    const s=pMap[msg.sender_id]||{};const author=s.display_name||s.username||"?";const av=s.avatar_url||"";
    const time=new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    const showHeader=(author!==_lastAuthor);_lastAuthor=author;
    const isMine=S.user&&msg.sender_id===S.user.id;
    const el=document.createElement("div");el.className="message";el.id="msg-"+msg.id;el.dataset.msgId=msg.id;el.dataset.senderId=msg.sender_id;el.dataset.author=author;
    el.innerHTML=showHeader?`<div class="avatar">${av?`<img src="${av}">`:author.charAt(0).toUpperCase()}</div><div class="message-body"><div class="message-header"><span class="message-author">${esc(author)}</span><span class="message-time">${time}</span></div><div class="message-content">${esc(msg.content)}</div>${msg.edited?'<span class="message-edited">(изменено)</span>':''}</div>`:`<div class="avatar" style="visibility:hidden;"></div><div class="message-body"><div class="message-content">${esc(msg.content)}</div></div>`;
    el.addEventListener("contextmenu",e=>{e.preventDefault();const items=[];if(isMine||(S.ui.isAdmin)){items.push({label:'<i class="fa-solid fa-pen-to-square"></i> Редактировать',action:()=>editMessageInline(el,msg)});items.push({label:'<i class="fa-solid fa-trash"></i> Удалить',danger:true,action:()=>confirm("Удалить сообщение?","Оно исчезнет.",async()=>{await S.sb.from("messages").delete().eq("id",msg.id);el.remove()})})}items.push({label:'<i class="fa-solid fa-reply"></i> Ответить',action:()=>{const ta=document.getElementById("msg-input");if(ta){ta.value=(ta.value?"\n":"")+"> **"+author+":** "+msg.content;ta.focus()}}});items.push({label:'<i class="fa-solid fa-copy"></i> Копировать',action:()=>{navigator.clipboard.writeText(msg.content);toast("Скопировано","info",1500)}});showContextMenu(items,e.clientX,e.clientY)});
    ct.appendChild(el);ct.scrollTop=ct.scrollHeight
  }
  function editMessageInline(el,msg){
    const ce=el.querySelector(".message-content");if(!ce)return;const orig=ce.textContent;
    const inp=document.createElement("textarea");inp.value=orig;inp.style.cssText="width:100%;background:var(--bg-deepest);color:var(--text-primary);border:1px solid var(--accent);border-radius:6px;padding:8px;font-size:13px;resize:none;";
    ce.replaceWith(inp);inp.focus();
    const save=async()=>{const v=inp.value.trim();if(v&&v!==orig){await S.sb.from("messages").update({content:v,edited:true}).eq("id",msg.id);ce.textContent=v;inp.replaceWith(ce);el.querySelector(".message-edited")||(ce.insertAdjacentHTML("afterend",'<span class="message-edited">(изменено)</span>'))}else inp.replaceWith(ce)};
    inp.addEventListener("blur",save);inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();save()}})
  }

  function renderMembers(members){
    const list=document.getElementById("members-list");if(!list)return;
    const on=members.filter(m=>m.status==="online"||m.status==="idle"||m.status==="dnd"),off=members.filter(m=>!on.includes(m));
    let h="";if(on.length){h+=`<div class="sp-section-title">В сети — ${on.length}</div>`;on.forEach(m=>h+=memberItem(m))}
    if(off.length){h+=`<div class="sp-section-title">Не в сети — ${off.length}</div>`;off.forEach(m=>h+=memberItem(m))}list.innerHTML=h
  }
  function memberItem(m){
    const av=m.avatar_url?`<img src="${m.avatar_url}">`:(m.display_name||m.username||"?").charAt(0).toUpperCase();
    return `<div class="sp-item-friend"><div class="avatar avatar-sm">${av}</div><span class="status-dot status-${m.status||"offline"}"></span><span style="flex:1;font-size:12px;font-weight:500;">${esc(m.display_name||m.username)}</span>${m.game_status?`<span style="font-size:10px;color:var(--text-muted);">${esc(m.game_status)}</span>`:""}</div>`
  }
  function renderFriendInfo(friend){
    const sm={online:"🟢 В сети",idle:"🟡 Не активен",dnd:"🔴 Не беспокоить",offline:"⚫ Не в сети"};
    const av=friend.avatar_url?`<img src="${friend.avatar_url}">`:(friend.display_name||friend.username||"?").charAt(0).toUpperCase();
    let h=`<div class="sp-section-title">О пользователе</div><div style="padding:12px;text-align:center;"><div class="avatar avatar-lg" style="margin:0 auto;">${av}</div><div style="font-weight:700;font-size:15px;color:var(--text-bright);margin-top:8px;">${esc(friend.display_name||friend.username)}</div><div style="font-size:12px;color:var(--text-muted);">${sm[friend.status]||"⚫ Не в сети"}</div>${friend.game_status?`<div style="font-size:12px;color:var(--green);margin-top:4px;">🎮 ${esc(friend.game_status)}</div>`:""}`;
    if(friend.custom_status)h+=`<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">${esc(friend.custom_status)}</div>`;h+=`</div>`;setMembersContent(h)
  }

  function esc(s){if(!s)return"";const d=document.createElement("div");d.textContent=s;return d.innerHTML}
  S.escapeHtml=esc;

  // Reset last author when switching channels
  function resetCompact(){_lastAuthor=null}

  S.ui={$,$$,toast,showModal,confirm,showContextMenu,closeContextMenu,showAuth,showApp,updateFooter,activateNav,deactivateNav,showHomePage,setSubPanelHeader,setSubPanelContent,setMainContent,clearMembers,setMembersContent,renderChatView,appendMessage,renderMembers,renderFriendInfo,getErrorMessage,isAdmin:false,resetCompact};
})();