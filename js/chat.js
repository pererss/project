// SENTCOR v10 — Оптимистичный чат + дедупликация
(function(){
  const S=window.SENTCOR,sb=S.sb;
  let curCh=null,sub=null,pCache={};
  const shownIds=new Set();
  const localSent=new Set(); // Трекинг локально отправленных сообщений

  async function loadMessages(chId){
    curCh=chId;unsub();S.ui.resetCompact();shownIds.clear();localSent.clear();
    try {
      const{data:msgs, error}=await sb.from("messages").select("*").eq("channel_id",chId).order("created_at",{ascending:true}).limit(100);
      if (error) throw error;
      const ids=[...new Set((msgs||[]).map(m=>m.sender_id))];await fetchProfiles(ids);
      const ct=document.getElementById("chat-messages");if(!ct)return;
      ct.innerHTML="";if(!msgs||!msgs.length)ct.innerHTML='<div class="empty-state"><h3>Пока нет сообщений</h3><p>Будьте первым!</p></div>';
      else msgs.forEach(m=>{shownIds.add(m.id);S.ui.appendMessage(m,pCache)});ct.scrollTop=ct.scrollHeight;
      sub=sb.channel("msgs-"+chId).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"channel_id=eq."+chId},async p=>{
        const m=p.new;
        if(shownIds.has(m.id)||localSent.has(m.id))return;
        shownIds.add(m.id);
        if(!pCache[m.sender_id])await fetchProfiles([m.sender_id]);
        S.ui.appendMessage(m,pCache)
      }).subscribe()
    } catch (e) {
      console.error("loadMessages failed:", e.message);
    }
  }

  function unsub(){if(sub){sb.removeChannel(sub);sub=null}}

  async function fetchProfiles(ids){
    if (!ids) return;
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
      sending:true // Флаг отправки
    };
    if(!pCache[S.user.id])await fetchProfiles([S.user.id]);
    S.ui.appendMessage(optimisticMsg,pCache);
    localSent.add(clientId);

    try {
        // Отправка на сервер
        const{data,error}=await sb.from("messages").insert({
          // id:clientId, // Не отправляем id, пусть база генерирует
          channel_id:chId,
          sender_id:S.user.id,
          content:trimmed
        }).select().single();
        
        if(error) throw error;

        // Обновляем UI после успешной отправки
        const sentMsgEl = document.getElementById(`msg-${clientId}`);
        if (sentMsgEl) {
            sentMsgEl.id = `msg-${data.id}`; // Меняем временный ID на постоянный
            sentMsgEl.classList.remove('sending');
            const statusEl = sentMsgEl.querySelector('.message-status-sending');
            if(statusEl) statusEl.remove();
        }
        localSent.delete(clientId); // Удаляем из локально отслеживаемых

        return{data,error:null};

    } catch (error) {
        // Помечаем ошибку в UI
        const errorMsgEl = document.getElementById(`msg-${clientId}`);
        if (errorMsgEl) {
            errorMsgEl.classList.add("error");
            const statusSendingEl = errorMsgEl.querySelector('.message-status-sending');
            if(statusSendingEl) statusSendingEl.remove();
            
            let statusContainer = errorMsgEl.querySelector('.message-status');
            if (!statusContainer) {
                statusContainer = document.createElement('div');
                statusContainer.className = 'message-status';
                errorMsgEl.querySelector('.message-body').appendChild(statusContainer);
            }
            statusContainer.innerHTML += ` <span class="message-status-error" title="${S.escapeHtml(error.message)}"><i class="fa-solid fa-circle-exclamation"></i></span>`;
            
            const contentContainer = errorMsgEl.querySelector('.message-content');
            contentContainer.innerHTML += ` <button class="btn btn-sm btn-danger retry-send-btn" data-content="${S.escapeHtml(trimmed)}">Повторить</button>`;
            
            // Навешиваем событие на новую кнопку
            const retryBtn = contentContainer.querySelector('.retry-send-btn');
            retryBtn.addEventListener('click', () => {
                errorMsgEl.remove();
                sendMessage(chId, trimmed); // Рекурсивный вызов для повторной отправки
            });
        }
        localSent.delete(clientId);
        return{error};
    }
  }

  async function loadDMs(friendId){
    curCh=friendId;unsub();S.ui.resetCompact();shownIds.clear();localSent.clear();
    S.chat.currentChannelInfo = { id: friendId, isDM: true };
    try {
      const{data:msgs, error}=await sb.from("direct_messages").select("*").or(`and(sender_id.eq.${S.user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${S.user.id})`).order("created_at",{ascending:true}).limit(100);
      if (error) throw error;
      const ids=[...new Set((msgs||[]).map(m=>m.sender_id))];await fetchProfiles(ids);
      const ct=document.getElementById("chat-messages");if(!ct)return;
      ct.innerHTML="";if(!msgs||!msgs.length)ct.innerHTML='<div class="empty-state"><h3>Начните общение!</h3></div>';
      else msgs.forEach(m=>{shownIds.add(m.id);S.ui.appendMessage(m,pCache)});ct.scrollTop=ct.scrollHeight;
      sub=sb.channel(`dms-${S.user.id}-${friendId}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:`or(and(sender_id.eq.${S.user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${S.user.id}))`},async p=>{
        const m=p.new;
        if(shownIds.has(m.id)||localSent.has(m.id))return;
        shownIds.add(m.id);
        if(!pCache[m.sender_id])await fetchProfiles([m.sender_id]);
        S.ui.appendMessage(m,pCache)
      }).subscribe()
    } catch (e) {
      console.error("loadDMs failed:", e.message);
    }
  }

  async function sendDM(receiverId,content){
    if(!S.user||!receiverId||!content)return{error:"Missing data"};
    const trimmed=content.trim().slice(0,S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH);
    const clientId=crypto.randomUUID();

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

    try {
        const{data,error}=await sb.from("direct_messages").insert({
          sender_id:S.user.id,
          receiver_id:receiverId,
          content:trimmed
        }).select().single();
        
        if(error) throw error;

        const sentMsgEl = document.getElementById(`msg-${clientId}`);
        if (sentMsgEl) {
            sentMsgEl.id = `msg-${data.id}`;
            sentMsgEl.classList.remove('sending');
            const statusEl = sentMsgEl.querySelector('.message-status-sending');
            if(statusEl) statusEl.remove();
        }
        localSent.delete(clientId);

        return{data,error:null};
    } catch (error) {
        const errorMsgEl = document.getElementById(`msg-${clientId}`);
        if (errorMsgEl) {
            errorMsgEl.classList.add("error");
            const statusSendingEl = errorMsgEl.querySelector('.message-status-sending');
            if(statusSendingEl) statusSendingEl.remove();
            
            let statusContainer = errorMsgEl.querySelector('.message-status');
            if (!statusContainer) {
                statusContainer = document.createElement('div');
                statusContainer.className = 'message-status';
                errorMsgEl.querySelector('.message-body').appendChild(statusContainer);
            }
            statusContainer.innerHTML += ` <span class="message-status-error" title="${S.escapeHtml(error.message)}"><i class="fa-solid fa-circle-exclamation"></i></span>`;
            
            const contentContainer = errorMsgEl.querySelector('.message-content');
            contentContainer.innerHTML += ` <button class="btn btn-sm btn-danger retry-send-btn" data-content="${S.escapeHtml(trimmed)}">Повторить</button>`;
            
            const retryBtn = contentContainer.querySelector('.retry-send-btn');
            retryBtn.addEventListener('click', () => {
                errorMsgEl.remove();
                sendDM(receiverId, trimmed);
            });
        }
        localSent.delete(clientId);
        return{error};
    }
  }

  S.chat={loadMessages,sendMessage,loadDMs,sendDM,unsub,fetchProfiles,pCache, currentChannelInfo: {id: null, isDM: false}};
})();