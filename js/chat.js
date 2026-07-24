/* SentCor — Chat */
window.S = window.S || {};
window.S.chat = window.S.chat || {};
(function(){
  var sb=null,activeId=null,activeProfile=null,msgs=[],_ch=null,_sub=false,_tt=null,_typing=false;
  function gS(){if(!sb&&window.S&&window.S.supabase)sb=window.S.supabase;return sb;}

  async function fetchMessages(fid){
    var u=window.S.auth.getUser();if(!u||!fid){msgs=[];render();return[];}
    try{
      var c=gS();if(!c)return[];
      var r=await c.from('messages').select('id,sender_id,receiver_id,content,created_at,read')
        .or('and(sender_id.eq.'+u.id+',receiver_id.eq.'+fid+'),and(sender_id.eq.'+fid+',receiver_id.eq.'+u.id+')')
        .order('created_at',{ascending:true});
      if(r.error)throw r.error;
      msgs=r.data||[];
      render();
      return msgs;
    }catch(e){
      console.error('[SentCor] fetchMessages:',e);
      msgs=[];
      render();
      return[];
    }finally{
      window.S.ui.hideLoading();
    }
  }

  async function sendMsg(content){
    var u=window.S.auth.getUser();if(!u||!activeId||!content||!content.trim())return;
    try{
      var c=gS();if(!c)return;
      var r=await c.from('messages').insert({
        sender_id:u.id,
        receiver_id:activeId,
        content:content.trim(),
        read:false
      });
      if(r.error)throw r.error;
    }catch(e){
      console.error('[SentCor] sendMsg:',e);
      window.S.ui.showToast('Ошибка отправки','error');
    }
  }

  function appendMsg(m){
    if(!m||msgs.some(function(x){return x.id===m.id;}))return;
    msgs.push(m);
    render();
    scroll();
  }

  function handleTyping(){
    if(!_typing){_typing=true;try{var c=gS();if(c&&activeId){var u=window.S.auth.getUser();if(u)c.channel('typing:'+activeId+':'+u.id).track({user_id:u.id});}}catch(e){console.error('[SentCor] typing:',e);}}
    if(_tt)clearTimeout(_tt);_tt=setTimeout(function(){_typing=false;},2000);
  }

  function render(){
    var box=document.getElementById('messages-area');if(!box)return;
    var u=window.S.auth.getUser();
    var inputArea=document.getElementById('message-input-area');

    if(!u||!activeId){
      if(inputArea) inputArea.style.display='none';
      box.innerHTML='<div class="messages-spacer"></div>'+
        '<div class="empty-state" id="empty-chat">'+
        '<div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>'+
        '<div class="empty-title">Выберите диалог</div>'+
        '<div class="empty-text">Выберите чат слева или начните новый разговор</div></div>';
      return;
    }
    if(inputArea) inputArea.style.display='block';

    if(!msgs.length){
      box.innerHTML='<div class="messages-spacer"></div>'+
        '<div class="empty-state">'+
        '<div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>'+
        '<div class="empty-title">Начните диалог</div>'+
        '<div class="empty-text">Отправьте первое сообщение!</div></div>';
      return;
    }
    var html='<div class="messages-spacer"></div>';
    var lastDate='';
    msgs.forEach(function(m){
      var isOwn=m.sender_id===u.id;
      var prof=isOwn?window.S.auth.getProfile():activeProfile;
      var uname=prof?prof.username:(isOwn?'Вы':'Пользователь');
      var avUrl=prof?prof.avatar_url:'';
      var dh=window.S.utils.getDateHeader(m.created_at);
      if(dh!==lastDate){html+='<div class="date-divider"><span>'+window.S.utils.escapeHtml(dh)+'</span></div>';lastDate=dh;}
      var time=window.S.utils.formatTime(m.created_at);
      var esc=window.S.utils.escapeHtml(m.content);
      if(isOwn){
        html+='<div class="bubble-row bubble-row--own" data-msg-id="'+m.id+'">'+
          '<div class="bubble bubble--own"><div class="bubble-text">'+esc+'</div><div class="bubble-time">'+time+'</div></div></div>';
      } else {
        html+='<div class="bubble-row bubble-row--friend" data-msg-id="'+m.id+'">'+
          '<div class="bubble-av">'+window.S.utils.createAvatarHTML(uname,avUrl,36)+'</div>'+
          '<div class="bubble-col"><div class="bubble-author">'+window.S.utils.escapeHtml(uname)+'</div>'+
          '<div class="bubble bubble--friend"><div class="bubble-text">'+esc+'</div><div class="bubble-time">'+time+'</div></div>'+
          '</div></div>';
      }
    });
    box.innerHTML=html;
    scroll();
  }

  function scroll(){var b=document.getElementById('messages-area');if(b)requestAnimationFrame(function(){b.scrollTop=b.scrollHeight;});}

  async function markRead(fid){
    var u=window.S.auth.getUser();if(!u||!fid)return;
    try{
      var c=gS();if(!c)return;
      await c.from('messages').update({read:true}).eq('sender_id',fid).eq('receiver_id',u.id).eq('read',false);
    }catch(e){console.error('[SentCor] markRead:',e);}
  }

  function subRT(){
    if(_sub)return;
    try{
      var c=gS();if(!c)return;
      _ch=c.channel('public:messages')
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},function(p){
          try{
            var m=p.new;
            if(window.S.chat.activeId&&(m.sender_id===window.S.chat.activeId||m.receiver_id===window.S.chat.activeId)){
              window.S.chat.appendMsg(m);
              var u=window.S.auth.getUser();
              if(u&&m.sender_id===window.S.chat.activeId)markRead(window.S.chat.activeId);
            }
            if(window.S.app&&window.S.app.refreshConversations)window.S.app.refreshConversations();
          }catch(e){console.error('[SentCor] RT insert:',e);}
        })
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},function(p){
          try{
            var m=p.new;
            if(window.S.chat.activeId&&(m.sender_id===window.S.chat.activeId||m.receiver_id===window.S.chat.activeId)){
              var i=msgs.findIndex(function(x){return x.id===m.id;});
              if(i>-1){msgs[i]=m;render();}
            }
          }catch(e){console.error('[SentCor] RT update:',e);}
        }).subscribe();
      _sub=true;
    }catch(e){console.error('[SentCor] subscribeRealtime:',e);}
  }

  window.S.chat.fetchMessages=fetchMessages;
  window.S.chat.sendMessage=sendMsg;
  window.S.chat.appendMsg=appendMsg;
  window.S.chat.markRead=markRead;
  window.S.chat.render=render;
  window.S.chat.subscribeRealtime=subRT;
  window.S.chat.handleTypingInput=handleTyping;
  window.S.chat.setActive=function(id,prof){activeId=id;activeProfile=prof||null;window.S.chat.activeId=id;if(id)markRead(id);};
  window.S.chat.getActive=function(){return activeId;};
  window.S.chat.getActiveProfile=function(){return activeProfile;};
  window.S.chat.getMessages=function(){return msgs;};
})();
