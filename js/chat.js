/* SentCor — Chat (Bubble-style) */
window.S = window.S || {};
window.S.chat = window.S.chat || {};
(function(){
  var sb=null,activeId=null,activeProfile=null,msgs=[],_ch=null,_sub=false,_tt=null,_typing=false;
  function gS(){if(!sb&&window.S&&window.S.supabase)sb=window.S.supabase;return sb;}

  async function fetchMessages(fid){
    var u=window.S.auth.getUser();if(!u||!fid){msgs=[];render();return[];}
    try{var c=gS();if(!c)return[];window.S.ui.showLoading('Загрузка...');
    var r=await c.from('messages').select('id,sender_id,receiver_id,content,created_at,read,reactions').or('and(sender_id.eq.'+u.id+',receiver_id.eq.'+fid+'),and(sender_id.eq.'+fid+',receiver_id.eq.'+u.id+')').order('created_at',{ascending:true});
    if(r.error)throw r.error;msgs=r.data||[];
    msgs.forEach(function(m){if(m.reactions&&typeof m.reactions==='string'){try{m.reactions=JSON.parse(m.reactions);}catch(e){m.reactions={};}}if(!m.reactions)m.reactions={};});
    render();return msgs;}catch(e){msgs=[];render();return[];}finally{window.S.ui.hideLoading();}
  }

  async function sendMsg(content){
    var u=window.S.auth.getUser();if(!u||!activeId||!content||!content.trim())return;
    try{var c=gS();if(!c)return;var r=await c.from('messages').insert({sender_id:u.id,receiver_id:activeId,content:content.trim(),created_at:new Date().toISOString(),read:false,reactions:'{}'});if(r.error)throw r.error;}catch(e){window.S.ui.showToast('Ошибка отправки','error');}
  }

  async function addReaction(mid,emoji){
    var u=window.S.auth.getUser();if(!u)return;
    try{var c=gS();if(!c)return;var m=msgs.find(function(x){return x.id===mid;});if(!m)return;
    var r=m.reactions||{};if(!r[emoji])r[emoji]=[];
    var i=r[emoji].indexOf(u.id);if(i>-1){r[emoji].splice(i,1);if(!r[emoji].length)delete r[emoji];}else{r[emoji].push(u.id);}
    m.reactions=r;render();await c.from('messages').update({reactions:JSON.stringify(r)}).eq('id',mid);}catch(e){}
  }

  async function delMsg(mid){
    var u=window.S.auth.getUser();if(!u)return;
    try{var c=gS();if(!c)return;var m=msgs.find(function(x){return x.id===mid;});if(!m||m.sender_id!==u.id)return;
    await c.from('messages').delete().eq('id',mid);msgs=msgs.filter(function(x){return x.id!==mid;});render();}catch(e){}
  }

  function appendMsg(m){
    if(!m||msgs.some(function(x){return x.id===m.id;}))return;
    if(m.reactions&&typeof m.reactions==='string'){try{m.reactions=JSON.parse(m.reactions);}catch(e){m.reactions={};}}
    if(!m.reactions)m.reactions={};msgs.push(m);render();scroll();
  }

  function handleTyping(){
    if(!_typing){_typing=true;try{var c=gS();if(c&&activeId){var u=window.S.auth.getUser();if(u)c.channel('typing:'+activeId+':'+u.id).track({user_id:u.id});}}catch(e){}}
    if(_tt)clearTimeout(_tt);_tt=setTimeout(function(){_typing=false;},2000);
  }

  /* Render bubble-style messages */
  function render(){
    var box=document.getElementById('chat-messages');if(!box)return;
    var u=window.S.auth.getUser();
    if(!u||!activeId){
      box.innerHTML='<div class="messages-spacer"></div><div class="empty-state"><div class="empty-icon">'+window.S.icons.message+'</div><div class="empty-title">Выберите диалог</div><div class="empty-text">Выберите чат слева</div></div>';
      return;
    }
    if(!msgs.length){
      box.innerHTML='<div class="messages-spacer"></div><div class="empty-state"><div class="empty-icon">'+window.S.icons.message+'</div><div class="empty-title">Начните диалог</div><div class="empty-text">Отправьте первое сообщение!</div></div>';
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
      var rHTML=renderR(m);
      if(isOwn){
        html+='<div class="bubble-row bubble-row--own" data-msg-id="'+m.id+'">'+
          '<div class="bubble-actions"><button class="ba-btn" data-act="react" data-mid="'+m.id+'">'+window.S.icons.smile+'</button>'+
          '<button class="ba-btn ba-danger" data-act="del" data-mid="'+m.id+'">'+window.S.icons.trash+'</button></div>'+
          '<div class="bubble bubble--own"><div class="bubble-text">'+esc+'</div><div class="bubble-time">'+time+'</div></div></div>';
      } else {
        html+='<div class="bubble-row bubble-row--friend" data-msg-id="'+m.id+'">'+
          '<div class="bubble-av">'+window.S.utils.createAvatarHTML(uname,avUrl,36)+'</div>'+
          '<div class="bubble-col"><div class="bubble-author">'+window.S.utils.escapeHtml(uname)+'</div>'+
          '<div class="bubble bubble--friend"><div class="bubble-text">'+esc+'</div><div class="bubble-time">'+time+'</div></div>'+
          '<div class="bubble-actions-inline"><button class="ba-btn" data-act="react" data-mid="'+m.id+'">'+window.S.icons.smile+'</button></div>'+
          '</div></div>';
      }
      if(rHTML)html+='<div class="bubble-reactions">'+rHTML+'</div>';
    });
    box.innerHTML=html;scroll();bindActions();
  }

  function renderR(m){
    var r=m.reactions||{};var u=window.S.auth.getUser();var h='';
    Object.keys(r).forEach(function(e){var ids=r[e];if(!ids||!ids.length)return;var a=u&&ids.indexOf(u.id)>-1;
    h+='<button class="reaction'+(a?' reaction--active':'')+'" data-mid="'+m.id+'" data-emoji="'+e+'">'+e+' <span>'+ids.length+'</span></button>';});
    return h;
  }

  function bindActions(){
    var box=document.getElementById('chat-messages');if(!box)return;
    box.querySelectorAll('[data-act="del"]').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();delMsg(b.getAttribute('data-mid'));});});
    box.querySelectorAll('[data-act="react"]').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();var mid=b.getAttribute('data-mid');window.S.ui.showEmojiPicker(b,function(em){addReaction(mid,em);});});});
    box.querySelectorAll('.reaction').forEach(function(c){c.addEventListener('click',function(){addReaction(c.getAttribute('data-mid'),c.getAttribute('data-emoji'));});});
  }

  function scroll(){var b=document.getElementById('chat-messages');if(b)requestAnimationFrame(function(){b.scrollTop=b.scrollHeight;});}

  async function markRead(fid){
    var u=window.S.auth.getUser();if(!u||!fid)return;
    try{var c=gS();if(!c)return;await c.from('messages').update({read:true}).eq('sender_id',fid).eq('receiver_id',u.id).eq('read',false);}catch(e){}
  }

  function subRT(){
    if(_sub)return;try{var c=gS();if(!c)return;
    _ch=c.channel('public:messages')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},function(p){
        var m=p.new;if(window.S.chat.activeId&&(m.sender_id===window.S.chat.activeId||m.receiver_id===window.S.chat.activeId)){window.S.chat.appendMsg(m);var u=window.S.auth.getUser();if(u&&m.sender_id===window.S.chat.activeId)markRead(window.S.chat.activeId);}
        if(window.S.app&&window.S.app.refreshConversations)window.S.app.refreshConversations();
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},function(p){
        var m=p.new;if(window.S.chat.activeId&&(m.sender_id===window.S.chat.activeId||m.receiver_id===window.S.chat.activeId)){
          var i=msgs.findIndex(function(x){return x.id===m.id;});if(i>-1){if(m.reactions&&typeof m.reactions==='string'){try{m.reactions=JSON.parse(m.reactions);}catch(e){m.reactions={};}}msgs[i]=m;render();}
        }
      }).subscribe();_sub=true;}catch(e){}
  }

  window.S.chat.fetchMessages=fetchMessages;
  window.S.chat.sendMessage=sendMsg;
  window.S.chat.appendMsg=appendMsg;
  window.S.chat.addReaction=addReaction;
  window.S.chat.deleteMessage=delMsg;
  window.S.chat.markRead=markRead;
  window.S.chat.render=render;
  window.S.chat.subscribeRealtime=subRT;
  window.S.chat.handleTypingInput=handleTyping;
  window.S.chat.setActive=function(id,prof){activeId=id;activeProfile=prof||null;window.S.chat.activeId=id;if(id)markRead(id);};
  window.S.chat.getActive=function(){return activeId;};
  window.S.chat.getActiveProfile=function(){return activeProfile;};
  window.S.chat.getMessages=function(){return msgs;};
})();