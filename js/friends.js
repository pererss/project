// SENTCOR v3 — Friends
(function(){
  const S=window.SENTCOR,sb=S.sb;
  S.friendsList=[];S.pending=[];S.outgoing=[];S.blocked=[];
  
  async function showPage(){
    S.ui.activateNav("friends");$("#sub-panel").classList.remove("collapsed");
    S.ui.setSubPanelHeader("Друзья");
    await loadAll();renderSubPanel()
  }
  async function loadAll(){
    if(!S.user)return;
    // Friends
    const{data:fr}=await sb.from("friends").select("friend_id,user_id,muted").or(`user_id.eq.${S.user.id},friend_id.eq.${S.user.id}`);
    if(fr){
      const fids=fr.map(f=>f.user_id===S.user.id?f.friend_id:f.user_id);
      const mm={};fr.forEach(f=>{const fid=f.user_id===S.user.id?f.friend_id:f.user_id;mm[fid]=f.muted});
      if(fids.length){const{data:pr}=await sb.from("profiles").select("*").in("id",fids);S.friendsList=(pr||[]).map(p=>({...p,muted:mm[p.id]||false}))}
      else S.friendsList=[]
    }
    // Pending
    const{data:pd}=await sb.from("friend_requests").select("id,sender_id").eq("receiver_id",S.user.id).eq("status","pending");
    if(pd&&pd.length){const ids=pd.map(r=>r.sender_id);const{data:pr}=await sb.from("profiles").select("*").in("id",ids);const mp={};(pr||[]).forEach(p=>mp[p.id]=p);S.pending=pd.map(r=>({...r,profile:mp[r.sender_id]||{}}))}else S.pending=[];
    // Outgoing
    const{data:og}=await sb.from("friend_requests").select("id,receiver_id").eq("sender_id",S.user.id).eq("status","pending");
    if(og&&og.length){const ids=og.map(r=>r.receiver_id);const{data:pr}=await sb.from("profiles").select("*").in("id",ids);const mp={};(pr||[]).forEach(p=>mp[p.id]=p);S.outgoing=og.map(r=>({...r,profile:mp[r.receiver_id]||{}}))}else S.outgoing=[];
    // Blocked
    const{data:bl}=await sb.from("blocked_users").select("blocked_id").eq("blocker_id",S.user.id);
    if(bl&&bl.length){const ids=bl.map(b=>b.blocked_id);const{data:pr}=await sb.from("profiles").select("*").in("id",ids);S.blocked=pr||[]}else S.blocked=[]
  }
  function renderSubPanel(){
    let h=`<div style="padding:8px 12px;"><button class="btn btn-accent-outline" id="add-friend-btn" style="width:100%;font-weight:700;"><i class="fa-solid fa-user-plus"></i> Добавить друга</button></div>`;
    h+=`<div class="sp-section-title">ДРУЗЬЯ — ${S.friendsList.length}</div>`;
    const on=S.friendsList.filter(f=>f.status==="online"||f.status==="idle"||f.status==="dnd");
    const off=S.friendsList.filter(f=>!on.includes(f));
    [...on,...off].forEach(f=>{
      const av=f.avatar_url?`<img src="${f.avatar_url}">`:(f.display_name||f.username||"?").charAt(0).toUpperCase();
      h+=`<div class="sp-item-friend" data-fid="${f.id}"><div class="avatar avatar-sm">${av}</div><span class="status-dot status-${f.status||"offline"}"></span><span style="flex:1;font-size:13px;font-weight:500;">${S.escapeHtml(f.display_name||f.username)}</span>${f.game_status?`<span style="font-size:10px;color:var(--text-muted);">${S.escapeHtml(f.game_status)}</span>`:""}</div>`
    });
    if(!S.friendsList.length)h+='<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Нет друзей</div>';
    if(S.pending.length){h+=`<div class="sp-section-title">ВХОДЯЩИЕ — ${S.pending.length}</div>`;S.pending.forEach(r=>{const p=r.profile||{};h+=`<div class="sp-item-friend" style="justify-content:space-between;"><div style="display:flex;align-items:center;gap:8px;"><span>${S.escapeHtml(p.username||"?")}</span></div><div style="display:flex;gap:4px;"><button class="btn btn-sm btn-primary accept-btn" data-rid="${r.id}"><i class="fa-solid fa-check"></i></button><button class="btn btn-sm btn-danger decline-btn" data-rid="${r.id}"><i class="fa-solid fa-xmark"></i></button></div></div>`})}
    if(S.blocked.length){h+=`<div class="sp-section-title">ЗАБЛОКИРОВАННЫЕ — ${S.blocked.length}</div>`;S.blocked.forEach(b=>h+=`<div class="sp-item-friend" style="justify-content:space-between;"><span>🚫 ${S.escapeHtml(b.username||"?")}</span><button class="btn btn-sm btn-ghost unblock-btn" data-uid="${b.id}">Разблок.</button></div>`)}
    S.ui.setSubPanelContent(h);
    document.getElementById("add-friend-btn").addEventListener("click",showAddModal);
    document.querySelectorAll("#sp-content .sp-item-friend[data-fid]").forEach(el=>el.addEventListener("click",()=>openDetail(el.dataset.fid)));
    document.querySelectorAll(".accept-btn").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();acceptReq(el.dataset.rid)}));
    document.querySelectorAll(".decline-btn").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();declineReq(el.dataset.rid)}));
    document.querySelectorAll(".unblock-btn").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();unblock(el.dataset.uid)}))
  }
  function openDetail(fid){
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
          ${f.game_status?`<div style="font-size:13px;color:var(--green);margin-top:6px;">🎮 ${S.escapeHtml(f.game_status)}</div>`:""}
          ${f.custom_status?`<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${S.escapeHtml(f.custom_status)}</div>`:""}
        </div>
        ${blocked?'<div style="text-align:center;color:var(--red);font-weight:600;">🚫 Заблокирован</div>':`<div style="display:flex;gap:8px;justify-content:center;"><button class="btn btn-primary btn-sm" id="fd-dm-btn"><i class="fa-solid fa-comment"></i> ЛС</button><button class="btn btn-secondary btn-sm" id="fd-call-btn"><i class="fa-solid fa-phone"></i> Звонок</button></div>`}
        <div id="dm-msg-container" style="display:none;flex:1;overflow-y:auto;width:100%;"></div>
        <div id="dm-input-container" style="display:none;width:100%;"></div>
      </div></div>`;
    S.ui.setMainContent(`<div style="display:flex;flex-direction:column;height:100%;">${h}</div>`);S.ui.clearMembers();
    // Events
    document.getElementById("fd-menu-btn").addEventListener("click",e=>{
      e.stopPropagation();
      const items=[
        {label:`<i class="fa-solid ${f.muted?'fa-bell':'fa-bell-slash'}" style="width:16px;"></i> ${f.muted?'Включить звук':'Без звука'}`,action:()=>toggleMute(fid)},
        {label:'<i class="fa-solid fa-copy" style="width:16px;"></i> Копировать имя',action:()=>{navigator.clipboard.writeText(f.username);S.ui.toast("Скопировано","info")}},
        {label:'<i class="fa-solid fa-server" style="width:16px;"></i> Добавить на сервер',action:()=>showAddToServer(fid)},
        "sep",
        {label:`<i class="fa-solid ${blocked?'fa-lock-open':'fa-ban'}" style="width:16px;"></i> ${blocked?'Разблокировать':'Заблокировать'}`,danger:!blocked,action:()=>blocked?unblock(fid):blockUser(fid)},
        {label:'<i class="fa-solid fa-user-minus" style="width:16px;"></i> Удалить из друзей',danger:true,action:()=>removeFriend(fid)}
      ];
      S.ui.showContextMenu(items,e.clientX,e.clientY)
    });
    document.getElementById("fd-close").addEventListener("click",()=>{showPage();S.ui.showHomePage()});
    const dmBtn=document.getElementById("fd-dm-btn");if(dmBtn)dmBtn.addEventListener("click",()=>openDMView(f));
    const callBtn=document.getElementById("fd-call-btn");if(callBtn)callBtn.addEventListener("click",()=>callUser(f))
  }
  function openDMView(friend){
    const mc=document.getElementById("dm-msg-container"),ic=document.getElementById("dm-input-container");
    if(!mc||!ic)return;
    const card=document.querySelector(".friend-detail-card");if(card)card.style.display="none";
    document.querySelectorAll(".friend-detail-body > div").forEach(el=>{if(el!==mc&&el!==ic&&!el.classList.contains("friend-detail-card"))el.style.display="none"});
    mc.style.display="flex";mc.id="chat-messages";mc.className="chat-messages";mc.innerHTML='<div class="empty-state"><i class="fa-solid fa-comments" style="font-size:32px;opacity:0.3;"></i><p>Загрузка...</p></div>';
    ic.style.display="block";
    ic.innerHTML=`<div class="chat-input-wrapper"><textarea id="msg-input" rows="1" placeholder="Напишите сообщение..." maxlength="${S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH}"></textarea><button class="btn btn-icon btn-ghost" id="send-dm-btn"><i class="fa-solid fa-paper-plane"></i></button></div>`;
    const ta=document.getElementById("msg-input"),sb=document.getElementById("send-dm-btn");
    ta.addEventListener("input",()=>{ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,120)+"px"});
    const send=async()=>{const c=ta.value.trim();if(!c)return;ta.disabled=true;const{error}=await S.chat.sendDM(friend.id,c);if(error){S.ui.toast("Ошибка","error");ta.disabled=false}else{ta.value="";ta.style.height="auto";ta.disabled=false;ta.focus()}};
    ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
    sb.addEventListener("click",send);
    S.chat.loadDMs(friend.id)
  }
  async function toggleMute(fid){const f=S.friendsList.find(x=>x.id===fid);if(!f)return;const nm=!f.muted;await sb.from("friends").update({muted:nm}).eq("user_id",S.user.id).eq("friend_id",fid);f.muted=nm;S.ui.toast(nm?"🔕 Без звука":"🔔 Звук вкл.","info");openDetail(fid)}
  async function removeFriend(fid){S.ui.confirm("Удалить друга","Вы уверены?",async()=>{await sb.from("friends").delete().eq("user_id",S.user.id).eq("friend_id",fid);await sb.from("friends").delete().eq("user_id",fid).eq("friend_id",S.user.id);S.ui.toast("Друг удалён","info");await loadAll();showPage();S.ui.showHomePage()})}
  async function blockUser(uid){S.ui.confirm("Заблокировать","Он не сможет писать вам и видеть онлайн.",async()=>{await sb.from("blocked_users").insert({blocker_id:S.user.id,blocked_id:uid});await sb.from("friends").delete().eq("user_id",S.user.id).eq("friend_id",uid);await sb.from("friends").delete().eq("user_id",uid).eq("friend_id",S.user.id);S.ui.toast("Заблокирован","info");await loadAll();showPage();S.ui.showHomePage()})}
  async function unblock(uid){await sb.from("blocked_users").delete().eq("blocker_id",S.user.id).eq("blocked_id",uid);S.ui.toast("Разблокирован","success");await loadAll();renderSubPanel();if(document.getElementById("fd-menu-btn"))openDetail(uid)}
  function callUser(f){const rn=`sentcor_call_${[S.user.id,f.id].sort().join("_")}`;S.voice.startCall(f,rn)}
  async function acceptReq(rid){const r=S.pending.find(x=>x.id===rid);if(!r)return;await sb.from("friend_requests").update({status:"accepted"}).eq("id",rid);await sb.from("friends").insert([{user_id:S.user.id,friend_id:r.sender_id},{user_id:r.sender_id,friend_id:S.user.id}]);S.ui.toast("Заявка принята!","success");await loadAll();renderSubPanel()}
  async function declineReq(rid){await sb.from("friend_requests").update({status:"declined"}).eq("id",rid);await loadAll();renderSubPanel()}
  function showAddModal(){
    const b='<div class="input-group"><label class="input-label">Имя пользователя</label><input class="input" id="af-user" placeholder="Введите username..."><div class="input-error" id="af-err"></div></div>';
    S.ui.showModal("Добавить друга",b,[
      {text:"Отмена",cls:"btn-secondary"},{text:"Отправить заявку",cls:"btn-primary",onClick:async()=>{const q=document.getElementById("af-user").value.trim();if(!q){document.getElementById("af-err").textContent="Введите имя";return};await sendReq(q);document.querySelector(".modal-overlay").remove()}}
    ])
  }
  async function sendReq(q){
    const{data:pr}=await sb.from("profiles").select("*").or(`username.eq.${q}`).limit(1);
    if(!pr||!pr.length){S.ui.toast("Пользователь не найден","error");return}
    const t=pr[0];if(t.id===S.user.id){S.ui.toast("Нельзя добавить себя!","error");return}
    const{data:bl}=await sb.from("blocked_users").select("*").eq("blocker_id",t.id).eq("blocked_id",S.user.id).limit(1);
    if(bl&&bl.length){S.ui.toast("Вы заблокированы","error");return}
    const{data:fc}=await sb.from("friends").select("*").or(`and(user_id.eq.${S.user.id},friend_id.eq.${t.id}),and(user_id.eq.${t.id},friend_id.eq.${S.user.id})`).limit(1);
    if(fc&&fc.length){S.ui.toast("Уже в друзьях!","info");return}
    const{error}=await sb.from("friend_requests").insert({sender_id:S.user.id,receiver_id:t.id,status:"pending"});
    if(error)S.ui.toast("Ошибка","error");else{S.ui.toast("Заявка отправлена!","success");await loadAll();renderSubPanel()}
  }
  function showAddToServer(fid){
    if(!S.serversList.length){S.ui.toast("Нет серверов","info");return}
    let h='<div style="display:flex;flex-direction:column;gap:4px;">';S.serversList.forEach(s=>h+=`<button class="btn btn-ghost" data-sid="${s.id}" style="justify-content:flex-start;">${S.escapeHtml(s.name)}</button>`);h+='</div>';
    S.ui.showModal("Выберите сервер",h,[{text:"Отмена",cls:"btn-secondary"}]);
    document.querySelectorAll(".modal .btn-ghost[data-sid]").forEach(btn=>btn.addEventListener("click",async()=>{await sb.from("server_members").insert({server_id:btn.dataset.sid,user_id:fid,role:"member"});S.ui.toast("Приглашён!","success");document.querySelector(".modal-overlay").remove()}))
  }
  function openDM(fid){const f=S.friendsList.find(x=>x.id===fid);if(!f)return;openDetail(fid);setTimeout(()=>{const btn=document.getElementById("fd-dm-btn");if(btn)btn.click()},200)}
  S.friends={showPage,loadAll,openDetail,openDM,showAddModal,sendReq,blockUser,unblock};
})();