// SENTCOR v5.7 — Stable: all friends in chats, working openChat
(function(){
  const S=window.SENTCOR,sb=S.sb;
  S.friendsList=[];S.pending=[];S.blocked=[];

  async function loadAll(){
    if(!S.user)return;
    try{
      const{data:fr}=await sb.from("friends").select("friend_id,user_id,muted").or(`user_id.eq.${S.user.id},friend_id.eq.${S.user.id}`);
      if(fr&&fr.length){
        const fids=fr.map(f=>f.user_id===S.user.id?f.friend_id:f.user_id);
        const mm={};fr.forEach(f=>{const fid=f.user_id===S.user.id?f.friend_id:f.user_id;mm[fid]=f.muted});
        const{data:pr}=await sb.from("profiles").select("*").in("id",fids);
        S.friendsList=(pr||[]).map(p=>({...p,muted:mm[p.id]||false}));
      }else{S.friendsList=[]}
    }catch(e){console.error("loadAll friends:",e);S.friendsList=[]}
    try{
      const{data:pd}=await sb.from("friend_requests").select("id,sender_id").eq("receiver_id",S.user.id).eq("status","pending");
      if(pd&&pd.length){const ids=pd.map(r=>r.sender_id);const{data:pr}=await sb.from("profiles").select("*").in("id",ids);const mp={};(pr||[]).forEach(p=>mp[p.id]=p);S.pending=pd.map(r=>({...r,profile:mp[r.sender_id]||{}}))}else S.pending=[]
    }catch(e){S.pending=[]}
    try{
      const{data:bl}=await sb.from("blocked_users").select("blocked_id").eq("blocker_id",S.user.id);
      if(bl&&bl.length){const ids=bl.map(b=>b.blocked_id);const{data:pr}=await sb.from("profiles").select("*").in("id",ids);S.blocked=pr||[]}else S.blocked=[]
    }catch(e){S.blocked=[]}
  }

  async function showChatsPage(){
    await loadAll();
    S.ui.activateNav("chats");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader("Чаты");
    let h=`<div style="padding:8px 12px;"><input class="input" id="chat-search" placeholder="Поиск..." style="font-size:12px;"></div>`;
    const on=S.friendsList.filter(f=>f.status==="online"||f.status==="idle"||f.status==="dnd"),off=S.friendsList.filter(f=>!on.includes(f));
    [...on,...off].forEach(f=>{const av=f.avatar_url?`<img src="${f.avatar_url}">`:(f.display_name||f.username||"?").charAt(0).toUpperCase();h+=`<div class="sp-item-friend chat-row" data-fid="${f.id}"><div class="avatar avatar-sm">${av}</div><span class="status-dot status-${f.status||"offline"}"></span><span style="flex:1;font-size:13px;">${S.escapeHtml(f.display_name||f.username)}</span></div>`});
    if(!S.friendsList.length)h+='<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-muted);">Нет друзей</div>';
    S.ui.setSubPanelContent(h);
    S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><i class="fa-solid fa-comment-dots" style="font-size:48px;opacity:0.3;"></i><h3>Чаты</h3><p>Выберите чат слева</p></div></div>`);
    S.ui.clearMembers();document.title="Sentcor - Чаты";
    document.querySelectorAll(".chat-row").forEach(r=>{r.onclick=()=>openChat(r.dataset.fid)})
  }

  function openChat(fid){const f=S.friendsList.find(x=>x.id===fid);if(!f)return;S.ui.renderChatView({type:"text",receiver_id:f.id},true,f.display_name||f.username);S.chat.loadDMs(f.id);document.title="Sentcor - "+(f.display_name||f.username)}

  async function showFriendsPage(){
    await loadAll();
    S.ui.activateNav("friends");const sp=document.getElementById("sub-panel");if(sp)sp.classList.remove("collapsed");
    S.ui.setSubPanelHeader("Друзья");
    let h=`<div style="padding:8px 12px;"><button class="btn btn-accent-outline" id="add-friend-btn" style="width:100%;font-weight:700;"><i class="fa-solid fa-user-plus"></i> Добавить друга</button></div>`;
    h+=`<div class="sp-section-title">ДРУЗЬЯ — ${S.friendsList.length}</div>`;
    const on=S.friendsList.filter(f=>f.status==="online"||f.status==="idle"||f.status==="dnd"),off=S.friendsList.filter(f=>!on.includes(f));
    [...on,...off].forEach(f=>{const av=f.avatar_url?`<img src="${f.avatar_url}">`:(f.display_name||f.username||"?").charAt(0).toUpperCase();h+=`<div class="sp-item-friend" data-fid="${f.id}"><div class="avatar avatar-sm">${av}</div><span class="status-dot status-${f.status||"offline"}"></span><span style="flex:1;font-size:13px;">${S.escapeHtml(f.display_name||f.username)}</span><button class="btn btn-icon btn-ghost btn-sm fdots" data-fid="${f.id}" style="font-size:10px;"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>`});
    if(!S.friendsList.length)h+='<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-muted);">Нет друзей</div>';
    if(S.pending.length){h+=`<div class="sp-section-title">ВХОДЯЩИЕ — ${S.pending.length}</div>`;S.pending.forEach(r=>{const p=r.profile||{};h+=`<div class="sp-item-friend"><span style="flex:1;">${S.escapeHtml(p.username||"?")}</span><div style="display:flex;gap:4px;"><button class="btn btn-sm btn-primary accept-btn" data-rid="${r.id}"><i class="fa-solid fa-check"></i></button><button class="btn btn-sm btn-danger decline-btn" data-rid="${r.id}"><i class="fa-solid fa-xmark"></i></button></div></div>`})}
    if(S.blocked.length){h+=`<div class="sp-section-title">ЗАБЛОКИРОВАННЫЕ — ${S.blocked.length}</div>`;S.blocked.forEach(b=>h+=`<div class="sp-item-friend"><span>🚫 ${S.escapeHtml(b.username||"?")}</span><button class="btn btn-sm btn-ghost unblock-btn" data-uid="${b.id}" style="margin-left:auto;">Разблок.</button></div>`)}
    S.ui.setSubPanelContent(h);
    document.getElementById("add-friend-btn")?.addEventListener("click",showAddModal);
    document.querySelectorAll("#sp-content .sp-item-friend[data-fid]").forEach(el=>{el.onclick=()=>openChat(el.dataset.fid)});
    document.querySelectorAll(".fdots").forEach(b=>{b.onclick=e=>{e.stopPropagation();showMenu(b.dataset.fid,e.clientX,e.clientY)}});
    document.querySelectorAll(".accept-btn").forEach(b=>{b.onclick=e=>{e.stopPropagation();acceptReq(b.dataset.rid)}});
    document.querySelectorAll(".decline-btn").forEach(b=>{b.onclick=e=>{e.stopPropagation();declineReq(b.dataset.rid)}});
    document.querySelectorAll(".unblock-btn").forEach(b=>{b.onclick=e=>{e.stopPropagation();unblock(b.dataset.uid)}});
    S.ui.setMainContent(`<div class="main-content" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:var(--text-muted);"><i class="fa-solid fa-user-group" style="font-size:48px;opacity:0.3;"></i><h3>Друзья</h3><p>Нажмите на друга → чат</p></div></div>`);
    S.ui.clearMembers();document.title="Sentcor - Друзья"
  }

  function showMenu(fid,x,y){const f=S.friendsList.find(fr=>fr.id===fid);if(!f)return;const blocked=S.blocked.some(b=>b.id===fid);S.ui.showContextMenu([{label:'<i class="fa-solid fa-comment"></i> Сообщение',action:()=>openChat(fid)},{label:'<i class="fa-solid fa-phone"></i> Позвонить',action:()=>callUser(f)},{label:`<i class="fa-solid ${f.muted?'fa-bell':'fa-bell-slash'}"></i> ${f.muted?'Включить звук':'Без звука'}`,action:()=>toggleMute(fid)},{label:`<i class="fa-solid ${blocked?'fa-lock-open':'fa-ban'}"></i> ${blocked?'Разблокировать':'Заблокировать'}`,danger:!blocked,action:()=>blocked?unblock(fid):blockUser(fid)},{label:'<i class="fa-solid fa-user-minus"></i> Удалить',danger:true,action:()=>removeFriend(fid)}],x,y)}

  async function toggleMute(fid){const f=S.friendsList.find(x=>x.id===fid);if(!f)return;const nm=!f.muted;await sb.from("friends").update({muted:nm}).eq("user_id",S.user.id).eq("friend_id",fid);f.muted=nm;S.ui.toast(nm?"🔕 Без звука":"🔔 Звук вкл.","info")}
  async function removeFriend(fid){S.ui.confirm("Удалить друга","Вы уверены?",async()=>{await sb.from("friends").delete().eq("user_id",S.user.id).eq("friend_id",fid);await sb.from("friends").delete().eq("user_id",fid).eq("friend_id",S.user.id);S.ui.toast("Друг удалён","info");await loadAll();showFriendsPage()})}
  async function blockUser(uid){S.ui.confirm("Заблокировать","Не сможет писать и видеть онлайн.",async()=>{await sb.from("blocked_users").insert({blocker_id:S.user.id,blocked_id:uid});await sb.from("friends").delete().eq("user_id",S.user.id).eq("friend_id",uid);await sb.from("friends").delete().eq("user_id",uid).eq("friend_id",S.user.id);S.ui.toast("Заблокирован","info");await loadAll();showFriendsPage()})}
  async function unblock(uid){await sb.from("blocked_users").delete().eq("blocker_id",S.user.id).eq("blocked_id",uid);S.ui.toast("Разблокирован","success");await loadAll();showFriendsPage()}
  function callUser(f){const rn=`sentcor_call_${[S.user.id,f.id].sort().join("_")}`;if(S.voice)S.voice.startCall(f,rn)}
  async function acceptReq(rid){const r=S.pending.find(x=>x.id===rid);if(!r)return;await sb.from("friend_requests").update({status:"accepted"}).eq("id",rid);try{await sb.from("friends").insert([{user_id:S.user.id,friend_id:r.sender_id},{user_id:r.sender_id,friend_id:S.user.id}])}catch(e){}S.ui.toast("Заявка принята!","success");await loadAll();showFriendsPage()}
  async function declineReq(rid){await sb.from("friend_requests").update({status:"declined"}).eq("id",rid);await loadAll();showFriendsPage()}
  function showAddModal(){const b='<div class="input-group"><label class="input-label">Имя пользователя</label><input class="input" id="af-user" placeholder="Введите username..."><div class="input-error" id="af-err"></div></div>';S.ui.showModal("Добавить друга",b,[{text:"Отмена",cls:"btn-secondary"},{text:"Отправить",cls:"btn-primary",onClick:async()=>{const q=document.getElementById("af-user")?.value.trim();if(!q)return;await sendReq(q);document.querySelector(".modal-overlay")?.remove()}}])}
  async function sendReq(q){const{data:pr}=await sb.from("profiles").select("*").or(`username.eq.${q}`).limit(1);if(!pr||!pr.length){S.ui.toast("Не найден","error");return}const t=pr[0];if(t.id===S.user.id){S.ui.toast("Нельзя добавить себя!","error");return}const{data:fc}=await sb.from("friends").select("*").or(`and(user_id.eq.${S.user.id},friend_id.eq.${t.id}),and(user_id.eq.${t.id},friend_id.eq.${S.user.id})`).limit(1);if(fc&&fc.length){S.ui.toast("Уже в друзьях!","info");return}const{error}=await sb.from("friend_requests").insert({sender_id:S.user.id,receiver_id:t.id,status:"pending"});if(error)S.ui.toast("Ошибка","error");else{S.ui.toast("Заявка отправлена!","success");await loadAll();showFriendsPage()}}

  S.friends={loadAll,showChatsPage,showFriendsPage,openChat,showAddModal,sendReq,blockUser,unblock,removeFriend,openDM:openChat};
})();