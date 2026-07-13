// SENTCOR v3 — Chat (Realtime)
(function(){
  const S=window.SENTCOR,sb=S.sb;
  let curCh=null,sub=null,pCache={};
  async function loadMessages(chId){
    curCh=chId;unsub();
    const{data:msgs}=await sb.from("messages").select("*").eq("channel_id",chId).order("created_at",{ascending:true}).limit(50);
    const ids=[...new Set((msgs||[]).map(m=>m.sender_id))];await fetchProfiles(ids);
    const ct=document.getElementById("chat-messages");if(!ct)return;
    ct.innerHTML="";if(!msgs||!msgs.length)ct.innerHTML='<div class="empty-state"><i class="fa-solid fa-comments" style="font-size:40px;opacity:0.3;"></i><h3>Пока нет сообщений</h3><p>Будьте первым!</p></div>';
    else msgs.forEach(m=>S.ui.appendMessage(m,pCache));ct.scrollTop=ct.scrollHeight;
    sub=sb.channel("msgs-"+chId).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"channel_id=eq."+chId},async p=>{const m=p.new;if(!pCache[m.sender_id])await fetchProfiles([m.sender_id]);if(curCh===chId)S.ui.appendMessage(m,pCache)}).subscribe()
  }
  function unsub(){if(sub){sb.removeChannel(sub).catch(()=>{});sub=null}}
  async function fetchProfiles(ids){const miss=ids.filter(id=>!pCache[id]);if(!miss.length)return;const{data}=await sb.from("profiles").select("id,username,display_name,avatar_url,status").in("id",miss);(data||[]).forEach(p=>pCache[p.id]=p)}
  async function sendMessage(chId,content){
    if(!S.user||!chId||!content)return{error:"Missing data"};
    return await sb.from("messages").insert({channel_id:chId,sender_id:S.user.id,content:content.trim().slice(0,S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH)})
  }
  async function loadDMs(friendId){
    curCh=null;unsub();
    const{data:msgs}=await sb.from("direct_messages").select("*").or(`and(sender_id.eq.${S.user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${S.user.id})`).order("created_at",{ascending:true}).limit(100);
    const ids=[...new Set((msgs||[]).map(m=>m.sender_id))];await fetchProfiles(ids);
    const ct=document.getElementById("chat-messages");if(!ct)return;
    ct.innerHTML="";if(!msgs||!msgs.length)ct.innerHTML='<div class="empty-state"><i class="fa-solid fa-comments" style="font-size:40px;opacity:0.3;"></i><h3>Начните общение!</h3></div>';
    else msgs.forEach(m=>S.ui.appendMessage(m,pCache));ct.scrollTop=ct.scrollHeight;
    sub=sb.channel("dms-"+friendId).on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:"sender_id=eq."+friendId},async p=>{const m=p.new;if(!pCache[m.sender_id])await fetchProfiles([m.sender_id]);S.ui.appendMessage(m,pCache)}).subscribe()
  }
  async function sendDM(receiverId,content){
    if(!S.user||!receiverId||!content)return{error:"Missing data"};
    return await sb.from("direct_messages").insert({sender_id:S.user.id,receiver_id:receiverId,content:content.trim().slice(0,S.SENTCOR_CONFIG.MAX_MESSAGE_LENGTH)})
  }
  S.chat={loadMessages,sendMessage,loadDMs,sendDM,unsub,fetchProfiles,pCache};
})();