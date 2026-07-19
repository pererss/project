// SENTCOR v10 — Оптимистичный чат + дедупликация
(function(){
  const S=window.SENTCOR,sb=S.sb;
  let curCh=null,sub=null,pCache={};
  const shownIds=new Set();
  const localSent=new Set(); // Трекинг локально отправленных сообщений

  async function loadMessages(chId){
    curCh=chId;unsub();S.ui.resetCompact();shownIds.clear();localSent.clear();
    const{data:msgs}=await sb.from("messages").select("*").eq("channel_id",chId).order("created_at",{ascending:true}).limit(100);
    const ids=[...new Set((msgs||[]).map(m=>m.sender_id))];await fetchProfiles(ids);
    const ct=document.getElementById("chat-messages");if(!ct)return;
    ct.innerHTML="";if(!msgs||!msgs.length)ct.innerHTML='<div class="empty-state"><h3>Пока нет сообщений</h3><p>Будьте первым!</p></div>';
    else msgs.forEach(m=>{shownIds.add(m.id);S.ui.appendMessage(m,pCache)});ct.scrollTop=ct.scrollHeight;
    sub=sb.channel("msgs-"+chId).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"channel_id=eq."+chId},async p=>{
      const m=p.new;
      if(shownIds.has(m.id)||localSent.has(m.id))return; // Пропускаем дубли
      shownIds.add(m.id);
      if(!pCache[m.sender_id])await fetchProfiles([m.sender_id]);
      S.ui.appendMessage(m,pCache)
    }).subscribe()
  }

  function unsub(){if(sub){sb.removeChannel(sub);sub=null}}

  async function fetchProfiles(ids){
    const miss=ids.filter(id=>!pCache[id]);
    if(!miss.length)return;
    const{data}=await sb.from("profiles").select("id,username,display_name,avatar_url,status,custom_status").in("id",miss);
    (data||[]).forEach(p=>pCache[p.id]=p);
  }

  async function sendMessage(chId,content){
    if(!S.user||!chId||!content)return{error:"Missing data"};
    const trimmed=content.trim().slice(0,S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH);
    const clientId=crypto.randomUUID(); // Генерация UUID для оптимистичного UI
    
    // Оптимистичное отображение
    const optimisticMsg={
      id:clientId,
      channel_id:chId,
      sender_id:S.user.id,
      content:trimmed,
      created_at:new Date().toISOString(),
      sending:true
    };
    if(!pCache[S.user.id])await fetchProfiles([S.user.id]);
    S.ui.appendMessage(optimisticMsg,pCache);
    localSent.add(clientId);

    // Отправка на сервер
    const{data,error}=await sb.from("messages").insert({
      id:clientId, // Используем клиентский ID
      channel_id:chId,
      sender_id:S.user.id,
      content:trimmed
    }).select();
    
    if(error){
      // Помечаем ошибку
      document.getElementById(`msg-${clientId}`)?.classList.add("error");
      localSent.delete(clientId);
      return{error};
    }
    return{data:data?data[0]:null,error:null};
  }

  async function loadDMs(friendId){
    curCh=friendId;unsub();S.ui.resetCompact();shownIds.clear();localSent.clear();
    const{data:msgs}=await sb.from("direct_messages").select("*").or(`and(sender_id.eq.${S.user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${S.user.id})`).order("created_at",{ascending:true}).limit(100);
    const ids=[...new Set((msgs||[]).map(m=>m.sender_id))];await fetchProfiles(ids);
    const ct=document.getElementById("chat-messages");if(!ct)return;
    ct.innerHTML="";if(!msgs||!msgs.length)ct.innerHTML='<div class="empty-state"><h3>Начните общение!</h3></div>';
    else msgs.forEach(m=>{shownIds.add(m.id);S.ui.appendMessage(m,pCache)});ct.scrollTop=ct.scrollHeight;
    sub=sb.channel("dms-"+friendId).on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:"sender_id=eq."+friendId},async p=>{
      const m=p.new;
      if(shownIds.has(m.id)||localSent.has(m.id))return; // Пропускаем дубли
      shownIds.add(m.id);
      if(!pCache[m.sender_id])await fetchProfiles([m.sender_id]);
      S.ui.appendMessage(m,pCache)
    }).subscribe()
  }

  async function sendDM(receiverId,content){
    if(!S.user||!receiverId||!content)return{error:"Missing data"};
    const trimmed=content.trim().slice(0,S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH);
    const clientId=crypto.randomUUID(); // Генерация UUID для оптимистичного UI
    
    // Оптимистичное отображение
    const optimisticMsg={
      id:clientId,
      receiver_id:receiverId,
      sender_id:S.user.id,
      content:trimmed,
      created_at:new Date().toISOString(),
      sending:true
    };
    if(!pCache[S.user.id])await fetchProfiles([S.user.id]);
    S.ui.appendMessage(optimisticMsg,pCache);
    localSent.add(clientId);

    // Отправка на сервер
    const{data,error}=await sb.from("direct_messages").insert({
      id:clientId, // Используем клиентский ID
      sender_id:S.user.id,
      receiver_id:receiverId,
      content:trimmed
    }).select();
    
    if(error){
      // Помечаем ошибку
      document.getElementById(`msg-${clientId}`)?.classList.add("error");
      localSent.delete(clientId);
      return{error};
    }
    return{data:data?data[0]:null,error:null};
  }

  S.chat={loadMessages,sendMessage,loadDMs,sendDM,unsub,fetchProfiles,pCache};
})();