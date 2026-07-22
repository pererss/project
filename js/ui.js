// SENTCOR v9 — UI (footer → profile modal, fixed empty brackets)
(function(){
  "use strict";
  const S=window.SENTCOR;
  const C=window.SENTCOR_CONFIG;
  const $=s=>document.querySelector(s);
  const $$=s=>document.querySelectorAll(s);

  let tc=null;
  function showModal(title,bodyHtml,buttons=[]){const ex=$(".modal-overlay");if(ex)ex.remove();const o=document.createElement("div");o.className="modal-overlay";const m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="modal-header"><h2>${title}</h2><button class="btn btn-icon btn-ghost close-modal"><i class="fa-solid fa-xmark"></i></button></div>`;const bd=document.createElement("div");bd.className="modal-body";if(typeof bodyHtml==="string")bd.innerHTML=bodyHtml;else bd.appendChild(bodyHtml);m.appendChild(bd);if(buttons.length){const ft=document.createElement("div");ft.className="modal-footer";buttons.forEach(b=>{const btn=document.createElement("button");btn.className=`btn ${b.cls||"btn-secondary"}`;btn.textContent=b.text;btn.addEventListener("click",e=>{if(b.onClick)b.onClick(e,m,o);if(b.closeOnClick!==false)o.remove()});ft.appendChild(btn)});m.appendChild(ft)}o.appendChild(m);o.addEventListener("click",e=>{if(e.target===o)o.remove()});o.querySelector(".close-modal").addEventListener("click",()=>o.remove());document.body.appendChild(o);const fi=m.querySelector("input");if(fi)fi.focus()}
  function confirm(title,msg,onConfirm,onCancel){showModal(title,`<p>${msg}</p>`,[{text:"Отмена",cls:"btn-secondary",onClick:()=>{if(onCancel)onCancel()}},{text:"Подтвердить",cls:"btn-danger",onClick:()=>{if(onConfirm)onConfirm()}}])}
  function showContextMenu(items,x,y){closeContextMenu();const m=document.createElement("div");m.className="context-menu";m.id="context-menu";items.forEach(it=>{if(it==="sep"){const s=document.createElement("div");s.className="context-menu-sep";m.appendChild(s);return}const el=document.createElement("button");el.className="context-menu-item"+(it.danger?" danger":"");el.innerHTML=(it.icon||"")+it.label;el.addEventListener("click",e=>{e.stopPropagation();closeContextMenu();if(it.action)it.action()});m.appendChild(el)});m.style.left=Math.min(x,window.innerWidth-200)+"px";m.style.top=Math.min(y,window.innerHeight-(m.scrollHeight||200)-10)+"px";document.body.appendChild(m);setTimeout(()=>document.addEventListener("click",closeContextMenu,{once:true}),10)}
  function closeContextMenu(){const m=document.getElementById("context-menu");if(m)m.remove()}
  function errMsg(err){return err?(err.message||String(err)):"Неизвестная ошибка"}

  function showAuth(){const app=$("#app");if(!app)return;app.innerHTML=`<div class="auth-screen"><div class="auth-logo">SENTCOR</div><div class="auth-subtitle">Игровой мессенджер</div><div class="auth-card" id="auth-card"></div></div>`;renderLoginForm()}
  function renderLoginForm(){const c=$("#auth-card");if(!c)return;c.innerHTML=`<h2>Вход</h2><div class="input-group"><label class="input-label">Email</label><input class="input" type="email" id="login-email" placeholder="your@email.com" autocomplete="email"><div class="input-error" id="login-email-error"></div></div><div class="input-group"><label class="input-label">Пароль</label><input class="input" type="password" id="login-password" placeholder="••••••••" autocomplete="current-password"><div class="input-error" id="login-password-error"></div></div><div class="input-error" id="login-general-error"></div><button class="btn btn-primary" id="login-btn" style="width:100%;padding:11px;margin-top:6px;">Войти</button><div class="auth-switch">Нет аккаунта? <a id="switch-to-reg">Зарегистрироваться</a></div>`;$("#login-btn").addEventListener("click",handleLogin);$("#login-password").addEventListener("keydown",e=>{if(e.key==="Enter")handleLogin()});$("#switch-to-reg").addEventListener("click",renderRegisterForm)}
  function renderRegisterForm(){const c=$("#auth-card");if(!c)return;c.innerHTML=`<h2>Регистрация</h2><div class="input-group"><label class="input-label">Имя пользователя</label><input class="input" type="text" id="reg-username" placeholder="PlayerName" maxlength="32"><div class="input-error" id="reg-username-error"></div></div><div class="input-group"><label class="input-label">Email</label><input class="input" type="email" id="reg-email" placeholder="your@email.com"><div class="input-error" id="reg-email-error"></div></div><div class="input-group"><label class="input-label">Пароль</label><input class="input" type="password" id="reg-password" placeholder="Минимум 6 символов"><div class="input-error" id="reg-password-error"></div></div><div class="input-error" id="reg-general-error"></div><button class="btn btn-primary" id="reg-btn" style="width:100%;padding:11px;margin-top:6px;">Создать аккаунт</button><div class="auth-switch">Уже есть аккаунт? <a id="switch-to-login">Войти</a></div>`;$("#reg-btn").addEventListener("click",handleRegister);$("#reg-password").addEventListener("keydown",e=>{if(e.key==="Enter")handleRegister()});$("#switch-to-login").addEventListener("click",renderLoginForm)}
  async function handleLogin(){$$(".input-error").forEach(e=>e.textContent="");const em=$("#login-email").value.trim(),pw=$("#login-password").value;if(!em){$("#login-email-error").textContent="Введите email";return}if(!pw){$("#login-password-error").textContent="Введите пароль";return}const btn=$("#login-btn");btn.disabled=true;btn.textContent="Входим...";const{error}=await S.auth.signIn(em,pw);if(error){$("#login-general-error").textContent=error.message||"Ошибка";btn.disabled=false;btn.textContent="Войти"}}
  async function handleRegister(){$$(".input-error").forEach(e=>e.textContent="");const un=$("#reg-username").value.trim(),em=$("#reg-email").value.trim(),pw=$("#reg-password").value;if(!un||un.length<3){$("#reg-username-error").textContent="Минимум 3 символа";return}if(!em){$("#reg-email-error").textContent="Введите email";return}if(!pw||pw.length<6){$("#reg-password-error").textContent="Минимум 6 символов";return}const btn=$("#reg-btn");btn.disabled=true;btn.textContent="Создаём...";const{error}=await S.auth.signUp(em,pw,un);if(error){$("#reg-general-error").textContent=error.message||"Ошибка";btn.disabled=false;btn.textContent="Создать аккаунт"}else{toast("Аккаунт создан! Проверьте почту.","success",5000);renderLoginForm()}}

  function showApp(){
    const app=$("#app");if(!app)return;
    app.innerHTML=`<div id="sidebar"><div class="sidebar-logo" id="home-btn" title="Главная"><span>S</span></div><div class="sidebar-sep"></div><div class="sidebar-nav" id="nav-chats" title="Чаты"><i class="fa-solid fa-comment-dots"></i></div><div class="sidebar-nav active" id="nav-friends" title="Друзья"><i class="fa-solid fa-user-group"></i></div><div class="sidebar-nav" id="nav-servers" title="Серверы"><i class="fa-solid fa-server"></i></div><div class="sidebar-sep"></div><div id="sidebar-servers"></div><div class="server-icon-nav" id="add-server-btn" title="Создать сервер"><i class="fa-solid fa-plus"></i></div><div style="flex:1;"></div><div class="sidebar-nav" id="nav-profile" title="Профиль"><i class="fa-solid fa-user"></i></div></div><div id="sub-panel"><div class="sp-header"><span id="sp-title">Друзья</span><div class="sp-header-actions"><button class="btn btn-icon btn-ghost btn-sm" id="sp-toggle" title="Скрыть"><i class="fa-solid fa-angles-left"></i></button></div></div><div class="sp-content" id="sp-content"></div><div class="sp-footer"><div class="status-avatar-wrapper"><div class="avatar" id="footer-avatar" style="cursor:pointer"></div><span class="status-dot status-online" id="footer-dot"></span></div><div class="user-info"><div class="username" id="footer-username"></div><div class="user-status" id="footer-status"></div></div><div class="sp-footer-actions"><button class="btn btn-icon btn-ghost btn-sm" id="settings-btn" title="Настройки"><i class="fa-solid fa-gear"></i></button></div></div></div><div id="main-area"></div><div id="members-list"></div>`;
    updateFooter();bindSidebar();S.servers.loadSidebarServers();S.friends.loadAll().then(()=>showHomePage());
    if(S.voice&&S.voice.listenForCalls)S.voice.listenForCalls()
  }

  function bindSidebar(){
    document.getElementById("home-btn")?.addEventListener("click",()=>{deactivateNav();S.friends.loadAll().then(()=>showHomePage())});
    document.getElementById("nav-chats")?.addEventListener("click",()=>{activateNav("chats");S.friends.showChatsPage()});
    document.getElementById("nav-friends")?.addEventListener("click",()=>{activateNav("friends");S.friends.showFriendsPage()});
    document.getElementById("nav-servers")?.addEventListener("click",()=>{activateNav("servers");S.servers.showPage()});
    document.getElementById("nav-profile")?.addEventListener("click",()=>{activateNav("profile");if(S.profileMod)S.profileMod.showPage()});
    document.getElementById("add-server-btn")?.addEventListener("click",()=>{S.servers.showCreateModal()});
    document.getElementById("sp-toggle")?.addEventListener("click",()=>{const sp=document.getElementById("sub-panel");if(sp)sp.classList.toggle("collapsed")});
    document.getElementById("settings-btn")?.addEventListener("click",()=>{activateNav("");if(S.profileMod)S.profileMod.showSettings()});
    document.getElementById("footer-avatar")?.addEventListener("click",()=>{if(S.profileMod)S.profileMod.openMyProfileModal()})
  }

  function activateNav(nav){$$("#sidebar .sidebar-nav").forEach(e=>e.classList.remove("active"));$$("#sidebar .server-icon-nav").forEach(e=>e.classList.remove("active"));const el=document.getElementById("nav-"+nav);if(el)el.classList.add("active");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed")}
  function deactivateNav(){$$("#sidebar .sidebar-nav").forEach(e=>e.classList.remove("active"));$$("#sidebar .server-icon-nav").forEach(e=>e.classList.remove("active"))}
  function updateFooter(){
    if(!S.profile)return;
    const av=document.getElementById("footer-avatar"),un=document.getElementById("footer-username"),st=document.getElementById("footer-status"),dot=document.getElementById("footer-dot");
    if(av)av.innerHTML=S.profile.avatar_url?`<img src="${S.profile.avatar_url}">`:(S.profile.display_name||S.profile.username||"?").charAt(0).toUpperCase();
    if(un)un.textContent=S.profile.display_name||S.profile.username;
    const sm={online:"В сети",idle:"Не активен",dnd:"Не беспокоить",offline:"Не в сети"};
    if(st)st.textContent=S.profile.custom_status||sm[S.profile.status]||"Не в сети";
    if(dot)dot.className="status-dot status-"+(S.profile.status||"offline")
  }
  function setSPHeader(t){const h=document.getElementById("sp-title");if(h)h.textContent=t}
  function setSPContent(h){const c=document.getElementById("sp-content");if(c)c.innerHTML=h}
  function setMain(h){const m=document.getElementById("main-area");if(m)m.innerHTML=h}
  function clearMembers(){const ml=document.getElementById("members-list");if(ml)ml.innerHTML=""}
  function setMembers(h){const ml=document.getElementById("members-list");if(ml)ml.innerHTML=h}

  function showHomePage(){
    const p=S.profile||{};const friends=S.friendsList||[];
    const online=friends.filter(f=>f.status==="online"||f.status==="idle"||f.status==="dnd");
    let h=`<div class="main-content"><div class="main-header" style="display:flex;align-items:center;gap:8px;padding-bottom:16px;border-bottom:1px solid var(--border);margin-bottom:16px;"><i class="fa-solid fa-house"></i> Главная</div><h2 style="font-size:20px;color:var(--text-bright);">Добро пожаловать, ${esc(p.display_name||p.username||"игрок")}!</h2><p style="color:var(--text-muted);font-size:13px;margin-bottom:24px;">Общайтесь с друзьями в текстовых и голосовых каналах</p><div class="home-section-title">ДРУЗЬЯ В СЕТИ — ${online.length}</div>`;
    if(online.length){online.forEach(f=>{const av=f.avatar_url?`<img src="${f.avatar_url}">`:(f.display_name||f.username||"?").charAt(0).toUpperCase();h+=`<div class="home-friend-card" data-fid="${f.id}"><div class="friend-avatar"><div class="avatar">${av}</div><span class="status-dot status-${f.status}"></span></div><div class="friend-info"><div class="friend-name">${esc(f.display_name||f.username)}</div><div class="friend-meta">${f.custom_status?esc(f.custom_status):(f.status==="online"?"В сети":"Не в сети")}</div></div></div>`})}
    else{h+=`<div class="home-empty"><i class="fa-solid fa-users"></i><h3>Никого нет в сети</h3><p>Когда ваши друзья зайдут, они появятся здесь.</p></div>`}
    h+=`</div>`;setMain(h);clearMembers();
    document.querySelectorAll(".home-friend-card").forEach(c=>c.addEventListener("click",()=>{if(S.friends)S.friends.openChat(c.dataset.fid)}))
  }
  function renderChatView(channel,isDM=false,friendName=""){
    const name=esc(isDM?friendName:channel.name);resetCompact();
    const fid=isDM?channel.receiver_id:null,f=isDM?S.friendsList.find(x=>x.id===fid):null,isBlocked=f&&S.blocked.some(b=>b.id===fid);
    let hdr=`<div class="chat-header"><span style="flex:1;font-weight:700;">${name}</span><button class="btn btn-icon btn-ghost btn-sm" id="chat-call-btn" title="Звонок"><i class="fa-solid fa-phone"></i></button><button class="btn btn-icon btn-ghost btn-sm" id="chat-menu-btn" title="Действия"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>`;
    let h=`<div style="display:flex;flex-direction:column;height:100%;">${hdr}<div class="chat-messages" id="chat-messages"><div class="empty-state"><h3>Добро пожаловать!</h3><p>Здесь пока нет сообщений.</p></div></div>`;
    if(channel.type==="text"||isDM)h+=`<div class="chat-input-area"><div class="chat-input-wrapper"><textarea id="msg-input" rows="1" placeholder="Напишите сообщение..." maxlength="${C.MAX_MESSAGE_LENGTH}"></textarea><button class="btn btn-icon btn-ghost" id="send-msg-btn"><i class="fa-solid fa-paper-plane"></i></button></div></div>`;
    else h+=`<div class="chat-input-area" style="text-align:center;padding:24px;"><button class="btn btn-primary" id="join-voice-btn"><i class="fa-solid fa-headset"></i> Подключиться</button></div>`;
    h+=`</div>`;setMain(h);clearMembers();if(channel.type==="text"||isDM)bindChatInput(channel,isDM);
    else document.getElementById("join-voice-btn")?.addEventListener("click",()=>{if(S.voice)S.voice.joinChannel(channel)});
    document.getElementById("chat-call-btn")?.addEventListener("click",()=>{if(f&&S.voice)S.voice.startCall(f,`sentcor_call_${[S.user.id,f.id].sort().join("_")}`)});
    document.getElementById("chat-menu-btn")?.addEventListener("click",e=>{
      if(!isDM)return S.ui.showContextMenu([{label:'<i class="fa-solid fa-trash"></i> Закрыть',action:()=>showHomePage()}],e.clientX,e.clientY);
      const items=[{label:'<i class="fa-solid fa-phone"></i> Позвонить',action:()=>{if(S.voice)S.voice.startCall(f,`sentcor_call_${[S.user.id,f.id].sort().join("_")}`)}}];
      items.push({label:`<i class="fa-solid ${f.muted?'fa-bell':'fa-bell-slash'}"></i> ${f.muted?'Включить звук':'Без звука'}`,action:()=>{S.friends.toggleMute(fid);S.friends.openChat(fid)}});
      items.push({label:`<i class="fa-solid ${isBlocked?'fa-lock-open':'fa-ban'}"></i> ${isBlocked?'Разблокировать':'Заблокировать'}`,danger:!isBlocked,action:()=>isBlocked?S.friends.unblock(fid):S.friends.blockUser(fid)});
      items.push({label:'<i class="fa-solid fa-user-minus"></i> Удалить из друзей',danger:true,action:()=>S.friends.removeFriend(fid)});
      S.ui.showContextMenu(items,e.clientX,e.clientY)});
    if(isDM)S.ui.renderFriendInfo(f)
  }
  function bindChatInput(channel,isDM){
    const ta=document.getElementById("msg-input"),sb=document.getElementById("send-msg-btn");if(!ta)return;
    ta.addEventListener("input",()=>{ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,120)+"px"});
    const send=async()=>{const c=ta.value.trim();if(!c)return;ta.disabled=true;let err;if(isDM)err=(await S.chat.sendDM(channel.receiver_id,c)).error;else err=(await S.chat.sendMessage(channel.id,c)).error;if(err){S.toast("Ошибка: "+err.message,"error");ta.disabled=false}else{ta.value="";ta.style.height="auto";ta.disabled=false;ta.focus()}};
    ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});sb.addEventListener("click",send)
  }
  let _lastAuthor=null;
  function appendMessage(msg,pMap={}){
    const ct=document.getElementById("chat-messages");if(!ct)return;const em=ct.querySelector(".empty-state");if(em)em.remove();
    const isOwn = msg.sender_id === S.user.id;
    const s= isOwn ? S.profile : (pMap[msg.sender_id]||{});
    const author=s.display_name||s.username||"?";const av=s.avatar_url||"";const time=new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    const showHeader=(author!==_lastAuthor);_lastAuthor=author;
    const el=document.createElement("div");el.className="message";el.id="msg-"+msg.id;el.dataset.senderId=msg.sender_id;el.dataset.msgId=msg.id;
    el.innerHTML=showHeader?`<div class="avatar">${av?`<img src="${av}">`:author.charAt(0).toUpperCase()}</div><div class="message-body"><div class="message-header"><span class="message-author">${esc(author)}</span><span class="message-time">${time}</span></div><div class="message-content">${esc(msg.content)}</div>${msg.edited?'<span class="message-edited">(изменено)</span>':''}</div>`:`<div class="avatar" style="visibility:hidden;"></div><div class="message-body"><div class="message-content">${esc(msg.content)}</div></div>`;
    ct.appendChild(el);ct.scrollTop=ct.scrollHeight
  }
  function renderMembers(members){const list=document.getElementById("members-list");if(!list)return;const on=members.filter(m=>m.status==="online"||m.status==="idle"||m.status==="dnd"),off=members.filter(m=>!on.includes(m));let h="";if(on.length){h+=`<div class="sp-section-title">В сети — ${on.length}</div>`;on.forEach(m=>h+=memberItem(m))}if(off.length){h+=`<div class="sp-section-title">Не в сети — ${off.length}</div>`;off.forEach(m=>h+=memberItem(m))}list.innerHTML=h}
  function memberItem(m){const av=m.avatar_url?`<img src="${m.avatar_url}">`:(m.display_name||m.username||"?").charAt(0).toUpperCase();return `<div class="sp-item-friend"><div class="avatar avatar-sm">${av}</div><span class="status-dot status-${m.status||"offline"}"></span><span style="flex:1;font-size:12px;">${esc(m.display_name||m.username)}</span>${m.custom_status?`<span style="font-size:10px;color:var(--text-muted);">${esc(m.custom_status)}</span>`:""}</div>`}
  function renderFriendInfo(friend){const sm={online:"🟢 В сети",idle:"🟡 Не активен",dnd:"🔴 Не беспокоить",offline:"⚫ Не в сети"};const av=friend.avatar_url?`<img src="${friend.avatar_url}">`:(friend.display_name||friend.username||"?").charAt(0).toUpperCase();let h=`<div class="sp-section-title">О пользователе</div><div style="padding:16px;text-align:center;"><div class="avatar avatar-lg" style="margin:0 auto 10px;">${av}</div><div style="font-weight:700;font-size:15px;color:var(--text-bright);">${esc(friend.display_name||friend.username)}</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${sm[friend.status]||"⚫ Не в сети"}</div>${friend.custom_status?`<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${esc(friend.custom_status)}</div>`:""}`;h+=`</div>`;setMembers(h)}

  function esc(s){if(!s)return"";const d=document.createElement("div");d.textContent=s;return d.innerHTML}
  S.escapeHtml=esc;function resetCompact(){_lastAuthor=null}
  S.ui={$,$$,toast,showModal,confirm,showContextMenu,closeContextMenu,showAuth,showApp,updateFooter,activateNav,deactivateNav,showHomePage,setSubPanelHeader:setSPHeader,renderChatView,appendMessage,renderMembers,renderFriendInfo,clearMembers,isAdmin:false,resetCompact,setMainContent:setMain,setMembersContent:setMembers,setSubPanelContent:setSPContent,getErrorMessage:errMsg};
})();