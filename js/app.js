/* SentCor — App Controller */
window.S = window.S || {};
window.S.app = window.S.app || {};
(function(){
  var view='chats',convs=[],frTab='all';

  async function onLogin(u){
    window.S.chat.subscribeRealtime();window.S.friends.subscribeRealtime();
    window.S.friends.onUpdate=refreshAll;renderProfileBar();await refreshAll();
  }

  async function refreshAll(){
    await window.S.friends.fetchFriends();await window.S.friends.fetchPending();
    await buildConvs();renderSidebar();renderView();updateBadge();
  }

  function updateBadge(){
    var b=document.getElementById('requests-badge');if(!b)return;
    var c=window.S.friends.getPending().length;
    if(c>0){b.textContent=c;b.style.display='inline-flex';}else{b.style.display='none';}
  }

  async function buildConvs(){
    var u=window.S.auth.getUser();var frs=window.S.friends.getFriends();
    if(!u||!frs.length){convs=[];return;}
    try{var c=window.S.supabase;if(!c)return;
    var ids=frs.map(function(f){return f.id;});var parts=[];
    ids.forEach(function(f){parts.push('and(sender_id.eq.'+u.id+',receiver_id.eq.'+f+')');parts.push('and(sender_id.eq.'+f+',receiver_id.eq.'+u.id+')');});
    var r=await c.from('messages').select('sender_id,receiver_id,content,created_at').or(parts.join(',')).order('created_at',{ascending:false});
    if(r.error)throw r.error;var all=r.data||[];var fm={};frs.forEach(function(f){fm[f.id]=f;});
    convs=frs.map(function(f){var ms=all.filter(function(m){return(m.sender_id===u.id&&m.receiver_id===f.id)||(m.sender_id===f.id&&m.receiver_id===u.id);});var last=ms.length?ms[0]:null;return{friend:f,lastMessage:last?last.content:'',lastTime:last?last.created_at:''};});
    convs.sort(function(a,b){if(!a.lastTime&&!b.lastTime)return 0;if(!a.lastTime)return 1;if(!b.lastTime)return-1;return new Date(b.lastTime)-new Date(a.lastTime);});
    }catch(e){convs=frs.map(function(f){return{friend:f,lastMessage:'',lastTime:''};});}
  }

  function renderSidebar(){
    var list=document.getElementById('conversations-list');if(!list)return;
    if(!convs.length){list.innerHTML='<div class="empty-state empty-state--sm"><div class="empty-text">Нет диалогов</div></div>';return;}
    var h='';convs.forEach(function(c){
      var f=c.friend;var act=window.S.chat.getActive()===f.id;
      var pv=c.lastMessage?window.S.utils.escapeHtml(c.lastMessage):'<span style="color:var(--text-faint)">Нет сообщений</span>';
      if(pv.length>34)pv=pv.substring(0,34)+'...';
      var sc=window.S.utils.getStatusColor(f.status);
      h+='<div class="conv-item'+(act?' conv-item--active':'')+'" data-fid="'+f.id+'">'+
        '<div class="conv-av">'+window.S.utils.createAvatarHTML(f.username,f.avatar_url,36)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
        '<div class="conv-info"><div class="conv-name">'+window.S.utils.escapeHtml(f.username)+'</div><div class="conv-preview">'+pv+'</div></div>'+
        '<button class="conv-dots" data-fid="'+f.id+'">'+window.S.icons.dots+'</button></div>';
    });
    list.innerHTML=h;
    list.querySelectorAll('.conv-item').forEach(function(el){el.addEventListener('click',function(e){if(e.target.closest('.conv-dots'))return;openChat(el.getAttribute('data-fid'));});});
    list.querySelectorAll('.conv-dots').forEach(function(btn){btn.addEventListener('click',function(e){
      e.stopPropagation();var fid=btn.getAttribute('data-fid');var f=window.S.friends.getFriends().find(function(x){return x.id===fid;});
      window.S.ui.showContextMenu(btn,[
        {icon:window.S.icons.eye,label:'Посмотреть профиль',action:'profile',onClick:function(){if(f)window.S.ui.openProfileModal(f);}},
        {icon:window.S.icons.mute,label:'Отключить уведомления',action:'mute',onClick:function(){window.S.ui.showToast('Уведомления отключены','info');}},
        {icon:window.S.icons.block,label:'Заблокировать',action:'block',onClick:function(){window.S.ui.showToast('Пользователь заблокирован','info');}},
        {separator:true},
        {icon:window.S.icons.trash,label:'Удалить чат',action:'delete',danger:true,onClick:async function(){if(confirm('Удалить чат?')){await window.S.friends.removeFriend(fid);await refreshAll();}}}
      ]);
    });});
  }

  async function openChat(fid){
    var f=window.S.friends.getFriends().find(function(x){return x.id===fid;});if(!f)return;
    window.S.chat.setActive(fid,f);view='chats';updateHeader(f);renderNavTabs();
    await window.S.chat.fetchMessages(fid);renderSidebar();
  }

  function updateHeader(f){
    var n=document.getElementById('chat-header-name');var s=document.getElementById('chat-header-status');var a=document.getElementById('chat-header-avatar');
    if(n)n.textContent=f?f.username:'';
    if(s){s.textContent=f?window.S.utils.getStatusLabel(f.status):'';s.className='header-status';}
    if(a)a.innerHTML=f?window.S.utils.createAvatarHTML(f.username,f.avatar_url,24):'';
  }

  function renderNavTabs(){
    document.querySelectorAll('.nav-tab').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-view')===view);});
    document.querySelectorAll('.tab-content').forEach(function(el){el.classList.remove('active');});
    if(view==='chats'){var t=document.getElementById('tab-chat');if(t)t.classList.add('active');window.S.chat.render();}
    else{var t2=document.getElementById('tab-friends');if(t2)t2.classList.add('active');renderFriendsView();}
  }

  function renderFriendsView(){
    var box=document.getElementById('friends-content');if(!box)return;
    document.querySelectorAll('.sub-tab').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-subtab')===frTab);});
    if(frTab==='addfriend'){renderAddFriend(box);return;}
    if(frTab==='pending'){renderPending(box);return;}
    var all=window.S.friends.getFriends();
    var filt=frTab==='online'?all.filter(function(f){return f.status==='online';}):all;
    var h='<div class="friends-count">'+filt.length+' — '+(frTab==='online'?'В сети':'Все друзья')+'</div>';
    if(!filt.length){h+='<div class="empty-state"><div class="empty-icon">'+window.S.icons.users+'</div><div class="empty-text">Здесь пока пусто</div></div>';}
    else{filt.forEach(function(f){
      var sc=window.S.utils.getStatusColor(f.status);
      h+='<div class="friend-row" data-fid="'+f.id+'">'+
        '<div class="friend-av">'+window.S.utils.createAvatarHTML(f.username,f.avatar_url,40)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
        '<div class="friend-info"><div class="friend-name">'+window.S.utils.escapeHtml(f.username)+'</div><div class="friend-status">'+window.S.utils.getStatusLabel(f.status)+'</div></div>'+
        '<div class="friend-actions">'+
        '<button class="btn-icon" data-act="chat" data-fid="'+f.id+'" title="Написать">'+window.S.icons.message+'</button>'+
        '<button class="btn-icon btn-icon--danger" data-act="remove" data-fid="'+f.id+'" title="Удалить">'+window.S.icons.userMinus+'</button>'+
        '<button class="btn-icon ctx-dots" data-fid="'+f.id+'">'+window.S.icons.dots+'</button>'+
        '</div></div>';
    });}
    box.innerHTML=h;
    bindFriendActions(box);
    box.querySelectorAll('.ctx-dots').forEach(function(btn){btn.addEventListener('click',function(e){
      e.stopPropagation();var fid=btn.getAttribute('data-fid');var f=window.S.friends.getFriends().find(function(x){return x.id===fid;});
      window.S.ui.showContextMenu(btn,[
        {icon:window.S.icons.eye,label:'Посмотреть профиль',action:'profile',onClick:function(){if(f)window.S.ui.openProfileModal(f);}},
        {icon:window.S.icons.mute,label:'Отключить уведомления',action:'mute',onClick:function(){window.S.ui.showToast('Уведомления отключены','info');}},
        {icon:window.S.icons.block,label:'Заблокировать',action:'block',onClick:function(){window.S.ui.showToast('Заблокирован','info');}},
        {separator:true},
        {icon:window.S.icons.trash,label:'Удалить из друзей',action:'remove',danger:true,onClick:async function(){await window.S.friends.removeFriend(fid);await refreshAll();}}
      ]);
    });});
  }

  function renderPending(box){
    var p=window.S.friends.getPending();
    var h='<div class="friends-count">'+p.length+' — В ожидании</div>';
    if(!p.length){h+='<div class="empty-state"><div class="empty-icon">'+window.S.icons.bell+'</div><div class="empty-text">Нет запросов</div></div>';}
    else{p.forEach(function(r){
      var pr=r.profile;var nm=pr?pr.username:'Неизвестный';var sc=pr?window.S.utils.getStatusColor(pr.status):'#71717A';
      h+='<div class="friend-row"><div class="friend-av">'+window.S.utils.createAvatarHTML(nm,pr?pr.avatar_url:'',40)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
        '<div class="friend-info"><div class="friend-name">'+window.S.utils.escapeHtml(nm)+'</div><div class="friend-status">'+window.S.utils.formatTime(r.created_at)+'</div></div>'+
        '<div class="friend-actions"><button class="btn btn--sm btn--accept" data-act="accept" data-rid="'+r.id+'">Принять</button><button class="btn btn--sm btn--decline" data-act="decline" data-rid="'+r.id+'">Отклонить</button></div></div>';
    });}
    box.innerHTML=h;bindFriendActions(box);
  }

  function renderAddFriend(box){
    box.innerHTML='<div class="addfriend-form"><div class="addfriend-title">Добавить в друзья</div><div class="addfriend-sub">Введите точный логин</div>'+
      '<div class="search-row"><input type="text" id="af-input" class="input" placeholder="Введите логин..." autocomplete="off" /><button class="btn btn--accent" id="af-btn">Найти</button></div>'+
      '<div id="af-results"></div></div>';
    var btn=document.getElementById('af-btn');var inp=document.getElementById('af-input');
    if(btn)btn.addEventListener('click',doSearch);if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter')doSearch();});
  }

  async function doSearch(){
    var inp=document.getElementById('af-input');var res=document.getElementById('af-results');if(!inp||!res)return;
    var q=inp.value.trim();if(!q){res.innerHTML='';return;}
    window.S.ui.showLoading('Поиск...');
    try{var r=await window.S.friends.searchUsers(q);
    if(!r.length){res.innerHTML='<div class="empty-state empty-state--sm"><div class="empty-text">Не найден</div></div>';return;}
    var h='';r.forEach(function(u){
      var sc=window.S.utils.getStatusColor(u.status);
      h+='<div class="friend-row"><div class="friend-av">'+window.S.utils.createAvatarHTML(u.username,u.avatar_url,40)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
        '<div class="friend-info"><div class="friend-name">'+window.S.utils.escapeHtml(u.username)+'</div><div class="friend-status">'+window.S.utils.getStatusLabel(u.status)+'</div></div>'+
        '<div class="friend-actions"><button class="btn btn--sm btn--accent btn-send" data-uid="'+u.id+'">Добавить</button></div></div>';
    });res.innerHTML=h;
    res.querySelectorAll('.btn-send').forEach(function(b){b.addEventListener('click',async function(){
      b.disabled=true;b.textContent='...';var r2=await window.S.friends.sendRequest(b.getAttribute('data-uid'));
      if(r2.error){window.S.ui.showToast(r2.error,'error');b.disabled=false;b.textContent='Добавить';}
      else{window.S.ui.showToast('Запрос отправлен!','success');b.textContent='Отправлено';b.classList.add('btn--sent');}
    });});
    }catch(e){res.innerHTML='<div class="empty-state empty-state--sm"><div class="empty-text">Ошибка</div></div>';}
    finally{window.S.ui.hideLoading();}
  }

  function bindFriendActions(box){
    box.querySelectorAll('[data-act="chat"]').forEach(function(b){b.addEventListener('click',function(){openChat(b.getAttribute('data-fid'));});});
    box.querySelectorAll('[data-act="remove"]').forEach(function(b){b.addEventListener('click',async function(){if(!confirm('Удалить из друзей?'))return;var r=await window.S.friends.removeFriend(b.getAttribute('data-fid'));if(r.error){window.S.ui.showToast(r.error,'error');return;}window.S.ui.showToast('Удалён','info');await refreshAll();});});
    box.querySelectorAll('[data-act="accept"]').forEach(function(b){b.addEventListener('click',async function(){var r=await window.S.friends.respondRequest(b.getAttribute('data-rid'),true);if(r.error){window.S.ui.showToast(r.error,'error');return;}window.S.ui.showToast('Принято!','success');await refreshAll();});});
    box.querySelectorAll('[data-act="decline"]').forEach(function(b){b.addEventListener('click',async function(){var r=await window.S.friends.respondRequest(b.getAttribute('data-rid'),false);if(r.error){window.S.ui.showToast(r.error,'error');return;}window.S.ui.showToast('Отклонено','info');await refreshAll();});});
  }

  function renderProfileBar(){
    var bar=document.getElementById('profile-bar');if(!bar)return;
    var p=window.S.auth.getProfile();var u=window.S.auth.getUser();
    var nm=p?p.username:(u?u.email.split('@')[0]:'User');var sc=p?window.S.utils.getStatusColor(p.status):'#71717A';
    bar.innerHTML='<div class="profile-av" id="profile-logo-click">'+window.S.utils.createAvatarHTML(nm,'',34)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
      '<div class="profile-info"><div class="profile-name">'+window.S.utils.escapeHtml(nm)+'</div><div class="profile-status">'+(p?window.S.utils.getStatusLabel(p.status):'')+'</div></div>'+
      '<div class="profile-actions"><button class="btn-icon" id="settings-btn" title="Настройки">'+window.S.icons.settings+'</button><button class="btn-icon" id="logout-btn" title="Выйти">'+window.S.icons.logout+'</button></div>';
    var sb=document.getElementById('settings-btn');var lb=document.getElementById('logout-btn');var pl=document.getElementById('profile-logo-click');
    if(sb)sb.addEventListener('click',openSettings);
    if(lb)lb.addEventListener('click',function(){window.S.auth.logout();});
    if(pl)pl.addEventListener('click',function(){var pr=window.S.auth.getProfile();if(pr)window.S.ui.openProfileModal(pr);});
  }

  function openSettings(){
    var p=window.S.auth.getProfile();var cs=p?p.status:'online';var cu=p?p.username:'';var cb=p?(p.bio||''):'';
    var html='<div class="settings-form"><div class="settings-group"><label class="settings-label">Статус</label><div class="status-opts" id="status-opts">'+
      '<button class="status-opt'+(cs==='online'?' active':'')+'" data-status="online"><span class="sd" style="background:#23A55A"></span> В сети</button>'+
      '<button class="status-opt'+(cs==='idle'?' active':'')+'" data-status="idle"><span class="sd" style="background:#F0B232"></span> Не активен</button>'+
      '<button class="status-opt'+(cs==='dnd'?' active':'')+'" data-status="dnd"><span class="sd" style="background:#F23F43"></span> Не беспокоить</button>'+
      '<button class="status-opt'+(cs==='offline'?' active':'')+'" data-status="offline"><span class="sd" style="background:#71717A"></span> Офлайн</button>'+
      '</div></div><div class="settings-group"><label class="settings-label">Никнейм</label><input type="text" class="input" id="set-un" value="'+window.S.utils.escapeHtml(cu)+'" /></div>'+
      '<div class="settings-group"><label class="settings-label">О себе</label><textarea class="input" id="set-bio" rows="3" placeholder="Расскажите о себе...">'+window.S.utils.escapeHtml(cb)+'</textarea></div></div>';
    window.S.ui.openModal('Настройки профиля',html,async function(){
      var ss='online';var a=document.querySelector('#status-opts .status-opt.active');if(a)ss=a.getAttribute('data-status');
      var nu=(document.getElementById('set-un').value||'').trim();var nb=(document.getElementById('set-bio').value||'').trim();
      if(!nu){window.S.ui.showToast('Введите никнейм','error');return;}
      var r=await window.S.auth.updateProfile({status:ss,username:nu,bio:nb});
      if(r.error){window.S.ui.showToast(r.error,'error');return;}window.S.ui.showToast('Сохранено!','success');renderProfileBar();renderSidebar();
    });
    setTimeout(function(){document.querySelectorAll('#status-opts .status-opt').forEach(function(o){o.addEventListener('click',function(){document.querySelectorAll('#status-opts .status-opt').forEach(function(x){x.classList.remove('active');});o.classList.add('active');});});},0);
  }

  function initUI(){
    document.querySelectorAll('.nav-tab').forEach(function(el){el.addEventListener('click',function(){view=el.getAttribute('data-view');if(view==='requests')frTab='pending';renderNavTabs();});});
    document.querySelectorAll('.sub-tab').forEach(function(el){el.addEventListener('click',function(){frTab=el.getAttribute('data-subtab');renderFriendsView();});});
    document.querySelectorAll('.tab-btn').forEach(function(el){el.addEventListener('click',function(){var t=el.getAttribute('data-tab');view=t==='chat'?'chats':'friends';renderNavTabs();});});
    var sendBtn=document.getElementById('send-btn');var inp=document.getElementById('message-input');
    function hSend(){if(!inp)return;var t=inp.value;if(!t.trim())return;window.S.chat.sendMessage(t);inp.value='';inp.focus();}
    if(sendBtn)sendBtn.addEventListener('click',hSend);
    if(inp){inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();hSend();}});inp.addEventListener('input',function(){window.S.chat.handleTypingInput();});}
    var emBtn=document.getElementById('emoji-btn');
    if(emBtn)emBtn.addEventListener('click',function(e){e.stopPropagation();window.S.ui.showEmojiPicker(emBtn,function(em){var i=document.getElementById('message-input');if(i){i.value+=em;i.focus();}});});
    var si=document.getElementById('sidebar-search');
    if(si)si.addEventListener('input',function(){var q=si.value.trim().toLowerCase();document.querySelectorAll('.conv-item').forEach(function(el){var n=(el.querySelector('.conv-name')||{}).textContent||'';el.style.display=n.toLowerCase().indexOf(q)>-1?'':'none';});});
    document.querySelectorAll('.rail-icon').forEach(function(el){el.addEventListener('click',function(){document.querySelectorAll('.rail-icon').forEach(function(n){n.classList.remove('active');});el.classList.add('active');var v=el.getAttribute('data-rail');if(v==='chats'){view='chats';renderNavTabs();}else if(v==='friends'){view='friends';renderNavTabs();}});});
    // Logo click opens sub-panel
    var logo=document.querySelector('.rail-icon--logo');
    if(logo)logo.addEventListener('click',function(){var pr=window.S.auth.getProfile();if(pr)window.S.ui.openProfileModal(pr);});
  }

  window.S.app.onLogin=onLogin;
  window.S.app.refreshAll=refreshAll;
  window.S.app.refreshConversations=async function(){await buildConvs();renderSidebar();};
  window.S.app.openChat=openChat;
  window.S.app.initUI=initUI;
})();

document.addEventListener('DOMContentLoaded',function(){window.S.auth.init();window.S.app.initUI();});