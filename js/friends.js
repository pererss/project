// SENTCOR v5.1 — Friends (chat-first, fixed unblock, tabs)
(function(){
  const S=window.SENTCOR,sb=S.sb;
  S.friendsList=[];S.pending=[];S.outgoing=[];S.blocked=[];

  async function loadAll(){
    if(!S.user)return;
    const{data:fr}=await sb.from("friends").select("friend_id,user_id,muted").or(`user_id.eq.${S.user.id},friend_id.eq.${S.user.id}`);
    if(fr){const fids=fr.map(f=>f.user_id===S.user.id?f.friend_id:f.user_id);const mm={};fr.forEach(f=>{const fid=f.user_id===S.user.id?f.friend_id:f.user_id;mm[fid]=f.muted});if(fids.length){const{data:pr}=await sb.from("profiles").select("*").in("id",fids);S.friendsList=(pr||[]).map(p=>({...p,muted:mm[p.id]||false}))}else S.friendsList=[]}else S.friendsList=[];
    const{data:pd}=await sb.from("friend_requests").select("id,sender_id").eq("receiver_id",S.user.id).eq("status","pending");if(pd&&pd.length){const ids=pd.map(r=>r.sender_id);const{data:pr}=await sb.from("profiles").select("*").in("id",ids);const mp={};(pr||[]).forEach(p=>mp[p.id]=p);S.pending=pd.map(r=>({...r,profile:mp[r.sender_id]||{}}))}else S.pending=[];
    const{data:og}=await sb.from("friend_requests").select("id,receiver_id").eq("sender_id",S.user.id).eq("status","pending");if(og&&og.length){const ids=og.map(r=>r.receiver_id);const{data:pr}=await sb.from("profiles").select("*").in("id",ids);const mp={};(pr||[]).forEach(p=>mp[p.id]=p);S.outgoing=og.map(r=>({...r,profile:mp[r.receiver_id]||{}}))}else S.outgoing=[];
    const{data:bl}=await sb.from("blocked_users").select("blocked_id").eq("blocker_id",S.user.id);if(bl&&bl.length){const ids=bl.map(b=>b.blocked_id);const{data:pr}=await sb.from("profiles").select("*").in("id",ids);S.blocked=pr||[]}else S.blocked=[]
  }

  // ---- CHATS PAGE (click = open chat) ----
  async function showChatsPage(){
    S.ui.activateNav("chats");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    await loadAll();S.ui.setSubPanelHeader("Чаты");
    const on=S.friendsList.filter(f=>f.status==="online"||f.status==="idle"||f.status==="dnd");
    const off=S.friendsList.filter(f=>!on.includes(f));
    let h=`<div style="padding:8px 12px;"><input class="input" id="chat-search-input" placeholder="Найти чат..." style="font-size:12px;"></div>`;
    const render=(list)=>{let r="";list.forEach(f=>{const av=f.avatar_url?`<img src="${f.avatar_url}">`:(f.display_name||f.username||"?").charAt(0).toUpperCase();r+=`<div class="sp-item-friend chat-item" data-fid="${f.id}"><div class="avatar avatar-sm">${av}</div><span class="status-dot status-${f.status||"offline"}"></span><span style="flex:1;font-size:13px;font-weight:500;">${S.escapeHtml(f.display_name||f.username)}</span>${f.game_status?`<span style="font-size:10px;color:var(--text-muted);">${S.escapeHtml(f.game_status)}</span>`:""}</div>`});return r};
    h+=render([...on,...off]);
    if(!S.friendsList.length)h+='<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет чатов. Добавьте друзей!</div>';
    S.ui.setSubPanelContent(h);
    S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><i class="fa-solid fa-comment-dots" style="font-size:48px;opacity:0.3;display:block;margin-bottom:16px;"></i><h3>Чаты</h3><p style="font-size:13px;">Выберите чат из списка слева</p></div></div>`);
    S.ui.clearMembers();document.title="Sentcor - Чаты";
    document.querySelectorAll(".chat-item").forEach(el=>el.addEventListener("click",()=>openChat(el.dataset.fid)));
    document.getElementById("chat-search-input")?.addEventListener("input",e=>{
      const q=e.target.value.trim().toLowerCase();if(!q){document.querySelector("#sp-content").innerHTML=h;document.querySelectorAll(".chat-item").forEach(el=>el.addEventListener("click",()=>openChat(el.dataset.fid)));return}
      const filtered=S.friendsList.filter(f=>(f.display_name||f.username).toLowerCase().includes(q));
      const on2=filtered.filter(f=>f.status==="online"||f.status==="idle"||f.status==="dnd"),off2=filtered.filter(f=>!on2.includes(f));
      let h2=`<div style="padding:8px 12px;"><input class="input" id="chat-search-input2" value="${q}" placeholder="Найти чат..." style="font-size:12px;"></div>`+render([...on2,...off2]);
      S.ui.setSubPanelContent(h2);document.querySelectorAll(".chat-item").forEach(el=>el.addEventListener("click",()=>openChat(el.dataset.fid)))
    })
  }

  function openChat(fid){
    const f=S.friendsList.find(x=>x.id===fid);if(!f)return;
    S.ui.renderChatView({type:"text",receiver_id:f.id},true,f.display_name||f.username);
    S.ui.renderFriendInfo(f);S.chat.loadDMs(f.id);document.title="Sentcor - "+ (f.display_name||f.username)
  }

  // ---- FRIENDS PAGE (management) ----
  async function showFriendsPage(){
    S.ui.activateNav("friends");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    await loadAll();S.ui.setSubPanelHeader("Друзья");
    let h=`<div style="padding:8px 12px;"><button class="btn btn-accent-outline" id="add-friend-btn" style="width:100%;font-weight:700;"><i class="fa-solid fa-user-plus"></i> Добавить друга</button></div>`;
    h+=`<div class="sp-section-title">ДРУЗЬЯ — ${S.friendsList.length}</div>`;
    const on=S.friendsList.filter(f=>f.status==="online"||f.status==="idle"||f.status==="dnd"),off=S.friendsList.filter(f=>!on.includes(f));
    [...on,...off].forEach(f=>{const av=f.avatar_url?`<img src="${f.avatar_url}">`:(f.display_name||f.username||"?").charAt(0).toUpperCase();h+=`<div class="sp-item-friend" data-fid="${f.id}"><div class="avatar avatar-sm">${av}</div><span class="status-dot status-${f.status||"offline"}"></span><span style="flex:1;font-size:13px;font-weight:500;">${S.escapeHtml(f.display_name||f.username)}</span>${f.game_status?`<span style="font-size:10px;color:var(--text-muted);">${S.escapeHtml(f.game_status)}</span>`:""}</div>`});
    if(!S.friendsList.length)h+='<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет друзей</div>';
    if(S.pending.length){h+=`<div class="sp-section-title">ВХОДЯЩИЕ — ${S.pending.length}</div>`;S.pending.forEach(r=>{const p=r.profile||{};h+=`<div class="sp-item-friend"><div style="display:flex;align-items:center;gap:8px;flex:1;"><span>${S.escapeHtml(p.username||"?")}</span></div><div style="display:flex;gap:4px;"><button class="btn btn-sm btn-primary accept-btn" data-rid="${r.id}"><i class="fa-solid fa-check"></i></button><button class="btn btn-sm btn-danger decline-btn" data-rid="${r.id}"><i class="fa-solid fa-xmark"></i></button></div></div>`})}
    if(S.blocked.length){h+=`<div class="sp-section-title">ЗАБЛОКИРОВАННЫЕ — ${S.blocked.length}</div>`;S.blocked.forEach(b=>h+=`<div class="sp-item-friend"><span>🚫 ${S.escapeHtml(b.username||"?")}</span><button class="btn btn-sm btn-ghost unblock-btn" data-uid="${b.id}" style="margin-left:auto;">Разблок.</button></div>`)}
    S.ui.setSubPanelContent(h);
    document.getElementById("add-friend-btn")?.addEventListener("click",showAddModal);
    document.querySelectorAll("#sp-content .sp-item-friend[data-fid]").forEach(el=>el.addEventListener("click",()=>openFriendDetail(el.dataset.fid)));
    document.querySelectorAll(".accept-btn").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();acceptReq(el.dataset.rid)}));
    document.querySelectorAll(".decline-btn").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();declineReq(el.dataset.rid)}));
    document.querySelectorAll(".unblock-btn").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();unblock(el.dataset.uid)}));
    S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><i class="fa-solid fa-user-group" style="font-size:48px;opacity:0.3;display:block;margin-bottom:16px;"></i><h3>Выберите друга</h3><p style="font-size:13px;">Нажмите на друга, чтобы управлять</p></div></div>`);
    S.ui.clearMembers();document.title="Sentcor - Друзья"
  }

  function openFriendDetail(fid){
    const f=S.friendsList.find(x=>x.id===fid);if(!f)return;
    const blocked=S.blocked.some(b=>b.id===fid);
    const av=f.avatar_url?`<img src="${f.avatar_url}">`:(f.display_name||f.username||"?").charAt(0).toUpperCase();
    const name=f.display_name||f.username;
    const sm={online:"В сети",idle:"Не активен",dnd:"Не беспокоить",offline:"Не в сети"};
    let h=`<div style="display:flex;flex-direction:column;height:100%;">
      <div class="friend-detail-header"><span style="font-size:16px;font-weight:700;color:var(--text-bright);flex:1;">${S.escapeHtml(name)}</span>
        <button class="btn btn-icon btn-ghost btn-sm" id="fd-menu-btn"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        <button class="btn btn-icon btn-ghost btn-sm" id="fd-close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="friend-detail-body">
        <div class="friend-detail-card">
          <div class="avatar avatar-xl" style="margin:0 auto 16px;">${av}</div>
          <div style="font-size:20px;font-weight:700;color:var(--text-bright);">${S.escapeHtml(name)}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${sm[f.status]||"Не в сети"}</div>
          ${f.game_status?`<div style="font-size:13px;color:var(--green);margin-top:6px;"><i class="fa-solid fa-gamepad"></i> ${S.escapeHtml(f.game_status)}</div>`:""}
          ${f.custom_status?`<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${S.escapeHtml(f.custom_status)}</div>`:""}
        </div>
        <div style="display:flex;gap:8px;justify-content:center;">
          <button class="btn btn-primary btn-sm" id="fd-msg-btn"><i class="fa-solid fa-comment"></i> Сообщение</button>
          <button class="btn btn-secondary btn-sm" id="fd-call-btn"><i class="fa-solid fa-phone"></i> Звонок</button>
        </div>
      </div></div>`;
    S.ui.setMainContent(`<div style="display:flex;flex-direction:column;height:100%;">${h}</div>`);
    S.ui.renderFriendInfo(f);document.title="Sentcor - "+name;
    document.getElementById("fd-menu-btn")?.addEventListener("click",e=>{showFriendDotsMenu(fid,e.clientX,e.clientY)});
    document.getElementById("fd-close")?.addEventListener("click",()=>{showFriendsPage()});
    document.getElementById("fd-msg-btn")?.addEventListener("click",()=>openChat(fid));
    document.getElementById("fd-call-btn")?.addEventListener("click",()=>callUser(f))
  }

  function showFriendDotsMenu(fid,x,y){
    const f=S.friendsList.find(fr=>fr.id===fid);if(!f)return;const blocked=S.blocked.some(b=>b.id===fid);
    S.ui.showContextMenu([
      {label:'<i class="fa-solid fa-comment"></i> Сообщение',action:()=>openChat(fid)},
      {label:'<i class="fa-solid fa-phone"></i> Позвонить',action:()=>callUser(f)},
      {label:`<i class="fa-solid ${f.muted?'fa-bell':'fa-bell-slash'}"></i> ${f.muted?'Включить звук':'Без звука'}`,action:()=>toggleMute(fid)},
      {label:'<i class="fa-solid fa-copy"></i> Копировать имя',action:()=>{navigator.clipboard.writeText(f.username);S.ui.toast("Скопировано","info")}},
      {label:'<i class="fa-solid fa-server"></i> Добавить на сервер',action:()=>showAddToServer(fid)},
      "sep",
      {label:`<i class="fa-solid ${blocked?'fa-lock-open':'fa-ban'}"></i> ${blocked?'Разблокировать':'Заблокировать'}`,danger:!blocked,action:()=>blocked?unblock(fid):blockUser(fid)},
      {label:'<i class="fa-solid fa-user-minus"></i> Удалить из друзей',danger:true,action:()=>removeFriend(fid)}
    ],x,y)
  }

  async function toggleMute(fid){const f=S.friendsList.find(x=>x.id===fid);if(!f)return;const nm=!f.muted;await sb.from("friends").update({muted:nm}).eq("user_id",S.user.id).eq("friend_id",fid);f.muted=nm;S.ui.toast(nm?"🔕 Без звука":"🔔 Звук вкл.","info");openFriendDetail(fid)}
  async function removeFriend(fid){S.ui.confirm("Удалить друга","Вы уверены?",async()=>{await sb.from("friends").delete().eq("user_id",S.user.id).eq("friend_id",fid);await sb.from("friends").delete().eq("user_id",fid).eq("friend_id",S.user.id);S.ui.toast("Друг удалён","info");await loadAll();showFriendsPage()})}
  async function blockUser(uid){S.ui.confirm("Заблокировать","Он не сможет писать и видеть онлайн.",async()=>{await sb.from("blocked_users").insert({blocker_id:S.user.id,blocked_id:uid});await sb.from("friends").delete().eq("user_id",S.user.id).eq("friend_id",uid);await sb.from("friends").delete().eq("user_id",uid).eq("friend_id",S.user.id);S.ui.toast("Заблокирован","info");await loadAll();showFriendsPage()})}
  async function unblock(uid){await sb.from("blocked_users").delete().eq("blocker_id",S.user.id).eq("blocked_id",uid);S.ui.toast("Разблокирован","success");await loadAll();showFriendsPage()}
  function callUser(f){const rn=`sentcor_call_${[S.user.id,f.id].sort().join("_")}`;if(S.voice)S.voice.startCall(f,rn)}
  async function acceptReq(rid){const r=S.pending.find(x=>x.id===rid);if(!r)return;await sb.from("friend_requests").update({status:"accepted"}).eq("id",rid);try{await sb.from("friends").insert([{user_id:S.user.id,friend_id:r.sender_id},{user_id:r.sender_id,friend_id:S.user.id}])}catch(e){console.warn("Friend insert:",e.message)}S.ui.toast("Заявка принята!","success");await loadAll();showFriendsPage()}
  async function declineReq(rid){await sb.from("friend_requests").update({status:"declined"}).eq("id",rid);await loadAll();showFriendsPage()}
  function showAddModal(){const b='<div class="input-group"><label class="input-label">Имя пользователя</label><input class="input" id="af-user" placeholder="Введите username..."><div class="input-error" id="af-err"></div></div>';S.ui.showModal("Добавить друга",b,[{text:"Отмена",cls:"btn-secondary"},{text:"Отправить",cls:"btn-primary",onClick:async()=>{const q=document.getElementById("af-user")?.value.trim();if(!q)return;await sendReq(q);document.querySelector(".modal-overlay")?.remove()}}])}
  async function sendReq(q){const{data:pr}=await sb.from("profiles").select("*").or(`username.eq.${q}`).limit(1);if(!pr||!pr.length){S.ui.toast("Пользователь не найден","error");return}const t=pr[0];if(t.id===S.user.id){S.ui.toast("Нельзя добавить себя!","error");return}const{data:bl}=await sb.from("blocked_users").select("*").eq("blocker_id",t.id).eq("blocked_id",S.user.id).limit(1);if(bl&&bl.length){S.ui.toast("Вы заблокированы","error");return}const{data:fc}=await sb.from("friends").select("*").or(`and(user_id.eq.${S.user.id},friend_id.eq.${t.id}),and(user_id.eq.${t.id},friend_id.eq.${S.user.id})`).limit(1);if(fc&&fc.length){S.ui.toast("Уже в друзьях!","info");return}const{error}=await sb.from("friend_requests").insert({sender_id:S.user.id,receiver_id:t.id,status:"pending"});if(error)S.ui.toast("Ошибка","error");else{S.ui.toast("Заявка отправлена!","success");await loadAll();showFriendsPage()}}
  function showAddToServer(fid){if(!S.serversList.length){S.ui.toast("Нет серверов","info");return}let h='';S.serversList.forEach(s=>h+=`<button class="btn btn-ghost" data-sid="${s.id}" style="justify-content:flex-start;padding:8px 12px;">${S.escapeHtml(s.name)}</button>`);S.ui.showModal("Выберите сервер",h,[{text:"Отмена",cls:"btn-secondary"}]);document.querySelectorAll(".modal .btn-ghost[data-sid]").forEach(btn=>btn.addEventListener("click",async()=>{await sb.from("server_members").insert({server_id:btn.dataset.sid,user_id:fid,role:"member"});S.ui.toast("Приглашён!","success");document.querySelector(".modal-overlay")?.remove()}))}
  function openDM(fid){openChat(fid)}

  S.friends={loadAll,showChatsPage,showFriendsPage,openChat,openFriendDetail,showAddModal,sendReq,blockUser,unblock,removeFriend,openDM};
})();