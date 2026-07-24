/* SentCor — App Controller */
window.S = window.S || {};
window.S.app = window.S.app || {};
(function(){
  var view='chats',convs=[],frTab='all',servers=[],activeServer=null,activeChannel=null,serverMessages=[];

  async function onLogin(u){
    try{window.S.chat.subscribeRealtime();}catch(e){console.warn('[SentCor] subscribe chat:',e);}
    try{window.S.friends.subscribeRealtime();}catch(e){console.warn('[SentCor] subscribe friends:',e);}
    try{subscribePresence();}catch(e){console.warn('[SentCor] subscribe presence:',e);}
    window.S.friends.onUpdate=refreshAll;
    renderProfileBar();
    try{await refreshAll();}catch(e){console.warn('[SentCor] refreshAll:',e);}
    try{await fetchServers();}catch(e){console.warn('[SentCor] fetchServers:',e);}
    renderRailServers();
    renderSubSidebar();
    renderRightSidebar();
  }

  function subscribePresence(){
    try{
      var c=window.S.supabase;if(!c)return;
      var u=window.S.auth.getUser();if(!u)return;
      var statusChannel=c.channel('online-users');
      statusChannel
        .on('presence',{event:'sync'},function(){
          try{
            var state=statusChannel.presenceState();
            var onlineIds=Object.keys(state).map(function(key){var presences=state[key];return presences[0]?presences[0].user_id:null;}).filter(Boolean);
            if(window.S.friends&&window.S.friends.getFriends){
              var frs=window.S.friends.getFriends();
              frs.forEach(function(f){
                f.status=onlineIds.indexOf(f.id)>-1?'online':'offline';
              });
              renderSubSidebar();
            }
          }catch(e){console.warn('[SentCor] presence sync:',e);}
        })
        .subscribe(async function(status){
          if(status==='SUBSCRIBED'){
            try{
              await statusChannel.track({user_id:u.id,online_at:new Date().toISOString()});
            }catch(e){console.warn('[SentCor] presence track:',e);}
          }
        });
    }catch(e){console.warn('[SentCor] subscribePresence:',e);}
  }

  async function refreshAll(){
    try{await window.S.friends.fetchFriends();}catch(e){console.warn('[SentCor] fetchFriends:',e);}
    try{await window.S.friends.fetchPending();}catch(e){console.warn('[SentCor] fetchPending:',e);}
    try{await buildConvs();}catch(e){console.warn('[SentCor] buildConvs:',e);}
    renderSubSidebar();
    updateBadge();
  }

  function updateBadge(){
    var b=document.getElementById('requests-badge');if(!b)return;
    var c=window.S.friends.getPending().length;
    if(c>0){b.textContent=c;b.style.display='inline-flex';}else{b.style.display='none';}
  }

  async function buildConvs(){
    var u=window.S.auth.getUser();var frs=window.S.friends.getFriends();
    if(!u||!frs.length){convs=[];return;}
    try{
      var c=window.S.supabase;if(!c)return;
      var ids=frs.map(function(f){return f.id;});var parts=[];
      ids.forEach(function(f){parts.push('and(sender_id.eq.'+u.id+',receiver_id.eq.'+f+')');parts.push('and(sender_id.eq.'+f+',receiver_id.eq.'+u.id+')');});
      if(!parts.length){convs=[];return;}
      var r=await c.from('messages').select('sender_id,receiver_id,content,created_at').or(parts.join(',')).order('created_at',{ascending:false});
      if(r.error)throw r.error;
      var all=r.data||[];
      convs=frs.map(function(f){var ms=all.filter(function(m){return(m.sender_id===u.id&&m.receiver_id===f.id)||(m.sender_id===f.id&&m.receiver_id===u.id);});var last=ms.length?ms[0]:null;return{friend:f,lastMessage:last?last.content:'',lastTime:last?last.created_at:''};});
      convs.sort(function(a,b){if(!a.lastTime&&!b.lastTime)return 0;if(!a.lastTime)return 1;if(!b.lastTime)return-1;return new Date(b.lastTime)-new Date(a.lastTime);});
    }catch(e){
      console.warn('[SentCor] buildConvs:',e);
      convs=frs.map(function(f){return{friend:f,lastMessage:'',lastTime:''};});
    }
  }

  /* ========== SERVERS ========== */
  async function fetchAndRenderServers(){
    try{await fetchServers();}catch(e){console.warn('[SentCor] fetchServers:',e);}
    try{renderRailServers();}catch(e){console.warn('[SentCor] renderRailServers:',e);}
    try{renderSubSidebar();}catch(e){console.warn('[SentCor] renderSubSidebar:',e);}
  }

  async function fetchServers(){
    try{
      var c=window.S.supabase;if(!c)return;
      var u=window.S.auth.getUser();if(!u){servers=[];return;}
      try{
        var memR=await c.from('server_members').select('server_id,role').eq('user_id',u.id);
        if(memR.error)throw memR.error;
        var memberOf=(memR.data||[]).map(function(x){return x.server_id;});
        if(!memberOf.length){servers=[];return;}
        var sR=await c.from('servers').select('id,name,icon_url,owner_id').in('id',memberOf);
        if(sR.error)throw sR.error;
        servers=sR.data||[];
      }catch(e){console.warn('[SentCor] fetchServers query:',e);servers=[];}
    }catch(e){
      console.warn('[SentCor] fetchServers:',e);
      servers=[];
    }
  }

  async function createServer(name){
    try{
      var c=window.S.supabase;if(!c)return{error:'No supabase'};
      var u=window.S.auth.getUser();if(!u)return{error:'Не авторизован'};
      var r=await c.from('servers').insert([{name:name,owner_id:u.id}]).select().single();
      if(r.error)throw r.error;
      var newServer=r.data;
      if(newServer){
        try{await c.from('server_members').insert([{server_id:newServer.id,user_id:u.id,role:'owner'}]);}catch(e){console.warn('[SentCor] insert member:',e);}
        try{await c.from('server_channels').insert([{server_id:newServer.id,name:'общее',type:'text'}]);}catch(e){console.warn('[SentCor] insert channel:',e);}
        try{await fetchAndRenderServers();}catch(e){console.warn('[SentCor] fetchAndRenderServers:',e);}
      }
      return{success:true};
    }catch(e){console.warn('[SentCor] createServer:',e);return{error:e.message};}
  }

  async function fetchServerChannels(serverId){
    try{
      var c=window.S.supabase;if(!c)return[];
      var r=await c.from('server_channels').select('id,name,type').eq('server_id',serverId).order('created_at',{ascending:true});
      if(r.error)throw r.error;
      return r.data||[];
    }catch(e){console.warn('[SentCor] fetchServerChannels:',e);return[];}
  }

  async function fetchServerMembers(serverId){
    try{
      var c=window.S.supabase;if(!c)return[];
      var r=await c.from('server_members').select('user_id,role').eq('server_id',serverId);
      if(r.error)throw r.error;
      var memberOf=(r.data||[]);
      if(!memberOf.length)return[];
      var uids=memberOf.map(function(x){return x.user_id;});
      var p=await c.from('profiles').select('id,username,avatar_url,status,bio,created_at').in('id',uids);
      if(p.error)throw p.error;
      var pm={};(p.data||[]).forEach(function(x){pm[x.id]=x;});
      return memberOf.map(function(m){return{profile:pm[m.user_id]||null,role:m.role};});
    }catch(e){console.warn('[SentCor] fetchServerMembers:',e);return[];}
  }

  async function fetchServerMessages(serverId, channelId){
    try{
      var c=window.S.supabase;if(!c)return[];
      var r=await c.from('server_messages').select('id,sender_id,content,created_at,server_id,channel_id').eq('server_id',serverId).eq('channel_id',channelId).order('created_at',{ascending:true});
      if(r.error)throw r.error;
      return r.data||[];
    }catch(e){console.warn('[SentCor] fetchServerMessages:',e);return[];}
  }

  async function sendServerMessage(serverId, channelId, content){
    try{
      var c=window.S.supabase;if(!c)return;
      var u=window.S.auth.getUser();if(!u)return;
      var cleanMessageData = {
        sender_id: u.id,
        content: content.trim(),
        server_id: serverId,
        channel_id: channelId
      };
      await c.from('server_messages').insert(cleanMessageData);
    }catch(e){console.warn('[SentCor] sendServerMessage:',e);window.S.ui.showToast('Ошибка отправки','error');}
  }

  async function kickMember(serverId, userId){
    try{
      var c=window.S.supabase;if(!c)return{error:'No supabase'};
      await c.from('server_members').delete().eq('server_id',serverId).eq('user_id',userId);
      return{success:true};
    }catch(e){console.warn('[SentCor] kickMember:',e);return{error:e.message};}
  }

  /* ========== RAIL SERVERS ========== */
  function renderRailServers(){
    var container=document.getElementById('server-list-rail');if(!container)return;
    var h='';
    servers.forEach(function(s){
      var cls='rail-server-icon'+(activeServer&&activeServer.id===s.id?' active':'');
      h+='<div class="'+cls+'" data-sid="'+s.id+'" title="'+window.S.utils.escapeHtml(s.name)+'">'+window.S.utils.createServerAvatarHTML(s.name,48)+'</div>';
    });
    container.innerHTML=h;
    container.querySelectorAll('.rail-server-icon').forEach(function(el){
      el.addEventListener('click',function(){
        var sid=el.getAttribute('data-sid');
        var s=servers.find(function(x){return x.id===sid;});
        if(s){selectServer(s);}
      });
    });
  }

  async function selectServer(server){
    activeServer=server;activeChannel=null;view='servers';
    renderRailActive();
    await renderServerPanel();
    renderRightSidebar();
    var headerName=document.getElementById('chat-header-name');
    var headerStatus=document.getElementById('chat-header-status');
    var headerAvatar=document.getElementById('chat-header-avatar');
    if(headerName) headerName.textContent=server.name;
    if(headerStatus) headerStatus.textContent='Сервер';
    if(headerAvatar) headerAvatar.innerHTML='';
  }

  async function renderServerPanel(){
    var sidebar=document.getElementById('sub-sidebar');if(!sidebar)return;
    var channels=await fetchServerChannels(activeServer.id);
    var textChannels=channels.filter(function(c){return c.type==='text';});
    var voiceChannels=channels.filter(function(c){return c.type==='voice';});

    var h='<div class="sub-sidebar-header"><div class="sub-sidebar-title">'+window.S.utils.escapeHtml(activeServer.name)+'</div></div>';
    h+='<div class="sub-sidebar-list">';
    if(textChannels.length){
      h+='<div class="channel-group-label">Текстовые каналы</div>';
      textChannels.forEach(function(ch){
        var act=activeChannel&&activeChannel.id===ch.id;
        h+='<div class="channel-item'+(act?' active':'')+'" data-cid="'+ch.id+'" data-type="text">'+window.S.icons.hash+'<span>'+window.S.utils.escapeHtml(ch.name)+'</span></div>';
      });
    }
    if(voiceChannels.length){
      h+='<div class="channel-group-label">Голосовые каналы</div>';
      voiceChannels.forEach(function(ch){
        h+='<div class="channel-item" data-cid="'+ch.id+'" data-type="voice">'+window.S.icons.volume+'<span>'+window.S.utils.escapeHtml(ch.name)+'</span></div>';
      });
    }
    h+='</div>';
    sidebar.innerHTML=h;
    sidebar.querySelectorAll('.channel-item').forEach(function(el){
      el.addEventListener('click',function(){
        var cid=el.getAttribute('data-cid');
        var type=el.getAttribute('data-type');
        var ch=channels.find(function(x){return x.id===cid;});
        if(ch&&type==='text'){
          activeChannel=ch;
          renderServerPanel();
          openServerChannel(ch);
        }
      });
    });
  }

  async function openServerChannel(channel){
    var inputArea=document.getElementById('message-input-area');
    if(inputArea) inputArea.style.display='block';
    var headerName=document.getElementById('chat-header-name');
    var headerStatus=document.getElementById('chat-header-status');
    if(headerName) headerName.textContent='# '+channel.name;
    if(headerStatus) headerStatus.textContent=activeServer?activeServer.name:'';
    try{serverMessages=await fetchServerMessages(activeServer.id,channel.id);}catch(e){console.warn('[SentCor] openServerChannel:',e);serverMessages=[];}
    renderServerMessages();
  }

  function renderServerMessages(){
    var box=document.getElementById('messages-area');if(!box)return;
    var u=window.S.auth.getUser();
    if(!activeServer||!activeChannel){
      box.innerHTML='<div class="messages-spacer"></div><div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="empty-title">Выберите канал</div><div class="empty-text">Выберите текстовый канал слева</div></div>';
      return;
    }
    if(!serverMessages.length){
      box.innerHTML='<div class="messages-spacer"></div><div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="empty-title">Начните общение</div><div class="empty-text">Отправьте первое сообщение в # '+window.S.utils.escapeHtml(activeChannel.name)+'</div></div>';
      return;
    }
    var html='<div class="messages-spacer"></div>';
    var lastDate='';
    serverMessages.forEach(function(m){
      var isOwn=u&&m.sender_id===u.id;
      var dh=window.S.utils.getDateHeader(m.created_at);
      if(dh!==lastDate){html+='<div class="date-divider"><span>'+window.S.utils.escapeHtml(dh)+'</span></div>';lastDate=dh;}
      var time=window.S.utils.formatTime(m.created_at);
      var esc=window.S.utils.escapeHtml(m.content);
      var uname='Пользователь';var avUrl='';
      if(isOwn){var p=window.S.auth.getProfile();if(p){uname=p.username;avUrl=p.avatar_url;}}
      if(isOwn){
        html+='<div class="bubble-row bubble-row--own"><div class="bubble bubble--own"><div class="bubble-text">'+esc+'</div><div class="bubble-time">'+time+'</div></div></div>';
      }else{
        html+='<div class="bubble-row bubble-row--friend"><div class="bubble-av">'+window.S.utils.createAvatarHTML(uname,avUrl,36)+'</div><div class="bubble-col"><div class="bubble-author">'+window.S.utils.escapeHtml(uname)+'</div><div class="bubble bubble--friend"><div class="bubble-text">'+esc+'</div><div class="bubble-time">'+time+'</div></div></div></div>';
      }
    });
    box.innerHTML=html;
    requestAnimationFrame(function(){box.scrollTop=box.scrollHeight;});
  }

  /* ========== SUB-SIDEBAR ========== */
  function renderSubSidebar(){
    var sidebar=document.getElementById('sub-sidebar');if(!sidebar)return;
    if(view==='servers'&&activeServer){renderServerPanel();return;}
    if(view==='servers'){renderServersList(sidebar);return;}
    if(view==='friends'){renderFriendsSidebar(sidebar);return;}
    renderChatsSidebar(sidebar);
  }

  function renderChatsSidebar(sidebar){
    var h='<div class="sub-sidebar-header"><div class="sub-sidebar-title">Чаты</div>'+
      '<div class="search-row">'+window.S.icons.search+'<input type="text" id="chat-search" placeholder="Поиск чатов..."></div></div>';
    h+='<div class="sub-sidebar-list">';
    h+='<div class="conv-section-label">Личные сообщения</div>';
    if(!convs.length){
      h+='<div class="empty-state empty-state--sm"><div class="empty-text">Нет диалогов</div></div>';
    }else{
      convs.forEach(function(c){
        var f=c.friend;var act=window.S.chat.getActive()===f.id;
        var pv=c.lastMessage?window.S.utils.escapeHtml(c.lastMessage):'Нет сообщений';
        if(pv.length>40)pv=pv.substring(0,40)+'...';
        var sc=window.S.utils.getStatusColor(f.status);
        h+='<div class="conv-item'+(act?' conv-item--active':'')+'" data-fid="'+f.id+'">'+
          '<div class="conv-av">'+window.S.utils.createAvatarHTML(f.username,f.avatar_url,36)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
          '<div class="conv-info"><div class="conv-name">'+window.S.utils.escapeHtml(f.username)+'</div><div class="conv-preview">'+pv+'</div></div></div>';
      });
    }
    h+='</div>';
    sidebar.innerHTML=h;
    sidebar.querySelectorAll('.conv-item').forEach(function(el){
      el.addEventListener('click',function(){openChat(el.getAttribute('data-fid'));});
    });
    var searchInput=document.getElementById('chat-search');
    if(searchInput){
      searchInput.addEventListener('input',function(){
        var q=searchInput.value.trim().toLowerCase();
        sidebar.querySelectorAll('.conv-item').forEach(function(el){
          var n=(el.querySelector('.conv-name')||{}).textContent||'';
          el.style.display=n.toLowerCase().indexOf(q)>-1?'':'none';
        });
      });
    }
  }

  function renderFriendsSidebar(sidebar){
    var h='<div class="sub-sidebar-header"><div class="sub-sidebar-title">Друзья</div></div>';
    h+='<div class="sub-sidebar-list">';
    h+='<div style="padding:4px 8px;"><div class="mini-toggles">'+
      '<button class="mini-toggle'+(frTab==='all'?' active':'')+'" data-ftab="all">Все</button>'+
      '<button class="mini-toggle'+(frTab==='online'?' active':'')+'" data-ftab="online">В сети</button>'+
      '<button class="mini-toggle'+(frTab==='pending'?' active':'')+'" data-ftab="pending">Заявки <span id="requests-badge" class="nav-tab-badge" style="'+(window.S.friends.getPending().length?'':'display:none;')+'">'+window.S.friends.getPending().length+'</span></button>'+
      '<button class="mini-toggle mini-toggle--accent" data-ftab="addfriend">+ Добавить</button>'+
      '</div></div>';

    if(frTab==='addfriend'){
      h+='<div class="addfriend-form"><div class="addfriend-title">Добавить в друзья</div><div class="addfriend-sub">Введите точный логин</div>'+
        '<div class="search-row" style="margin-bottom:8px;"><input type="text" id="af-input" class="input" placeholder="Введите логин..." autocomplete="off" style="flex:1;padding:8px 12px;" /><button class="btn btn--accent btn--sm" id="af-btn">Найти</button></div>'+
        '<div id="af-results"></div></div>';
    }else if(frTab==='pending'){
      var pending=window.S.friends.getPending();
      h+='<div class="friends-count">'+pending.length+' — В ожидании</div>';
      if(!pending.length){
        h+='<div class="empty-state empty-state--sm"><div class="empty-text">Нет запросов</div></div>';
      }else{
        pending.forEach(function(r){
          var pr=r.profile;var nm=pr?pr.username:'Неизвестный';var sc=pr?window.S.utils.getStatusColor(pr.status):'#71717A';
          h+='<div class="friend-row"><div class="friend-av">'+window.S.utils.createAvatarHTML(nm,pr?pr.avatar_url:'',40)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
            '<div class="friend-info"><div class="friend-name">'+window.S.utils.escapeHtml(nm)+'</div><div class="friend-status">'+window.S.utils.formatTime(r.created_at)+'</div></div>'+
            '<div class="friend-actions"><button class="btn btn--sm btn--accept" data-act="accept" data-rid="'+r.id+'">Принять</button><button class="btn btn--sm btn--decline" data-act="decline" data-rid="'+r.id+'">Отклонить</button></div></div>';
        });
      }
    }else{
      var all=window.S.friends.getFriends();
      var filt=frTab==='online'?all.filter(function(f){return f.status==='online';}):all;
      h+='<div class="friends-count">'+filt.length+' — '+(frTab==='online'?'В сети':'Все друзья')+'</div>';
      if(!filt.length){
        h+='<div class="empty-state empty-state--sm"><div class="empty-text">Здесь пока пусто</div></div>';
      }else{
        filt.forEach(function(f){
          var sc=window.S.utils.getStatusColor(f.status);
          h+='<div class="friend-row" data-fid="'+f.id+'">'+
            '<div class="friend-av">'+window.S.utils.createAvatarHTML(f.username,f.avatar_url,40)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
            '<div class="friend-info"><div class="friend-name">'+window.S.utils.escapeHtml(f.username)+'</div><div class="friend-status">'+window.S.utils.getStatusLabel(f.status)+'</div></div>'+
            '<div class="friend-actions">'+
            '<button class="btn-icon" data-act="chat" data-fid="'+f.id+'" title="Написать">'+window.S.icons.message+'</button>'+
            '<button class="btn-icon" data-act="profile" data-fid="'+f.id+'" title="Профиль">'+window.S.icons.eye+'</button>'+
            '<button class="btn-icon btn-icon--danger" data-act="remove" data-fid="'+f.id+'" title="Удалить">'+window.S.icons.userMinus+'</button>'+
            '</div></div>';
        });
      }
    }
    h+='</div>';
    sidebar.innerHTML=h;
    bindFriendsSidebarActions(sidebar);
  }

  function bindFriendsSidebarActions(sidebar){
    sidebar.querySelectorAll('.mini-toggle').forEach(function(el){
      el.addEventListener('click',function(){
        frTab=el.getAttribute('data-ftab');
        renderSubSidebar();
      });
    });
    sidebar.querySelectorAll('[data-act="chat"]').forEach(function(b){
      b.addEventListener('click',function(e){e.stopPropagation();openChat(b.getAttribute('data-fid'));});
    });
    sidebar.querySelectorAll('[data-act="profile"]').forEach(function(b){
      b.addEventListener('click',function(e){
        e.stopPropagation();
        var fid=b.getAttribute('data-fid');
        var f=window.S.friends.getFriends().find(function(x){return x.id===fid;});
        if(f) window.S.ui.openProfileModal(f);
      });
    });
    sidebar.querySelectorAll('[data-act="remove"]').forEach(function(b){
      b.addEventListener('click',async function(e){
        e.stopPropagation();
        if(!confirm('Удалить из друзей?'))return;
        var r=await window.S.friends.removeFriend(b.getAttribute('data-fid'));
        if(r.error){window.S.ui.showToast(r.error,'error');return;}
        window.S.ui.showToast('Удалён','info');await refreshAll();
      });
    });
    sidebar.querySelectorAll('[data-act="accept"]').forEach(function(b){
      b.addEventListener('click',async function(){
        var r=await window.S.friends.respondRequest(b.getAttribute('data-rid'),true);
        if(r.error){window.S.ui.showToast(r.error,'error');return;}
        window.S.ui.showToast('Принято!','success');await refreshAll();
      });
    });
    sidebar.querySelectorAll('[data-act="decline"]').forEach(function(b){
      b.addEventListener('click',async function(){
        var r=await window.S.friends.respondRequest(b.getAttribute('data-rid'),false);
        if(r.error){window.S.ui.showToast(r.error,'error');return;}
        window.S.ui.showToast('Отклонено','info');await refreshAll();
      });
    });
    var afBtn=document.getElementById('af-btn');var afInput=document.getElementById('af-input');
    if(afBtn) afBtn.addEventListener('click',doSearchFriends);
    if(afInput) afInput.addEventListener('keydown',function(e){if(e.key==='Enter')doSearchFriends();});
  }

  async function doSearchFriends(){
    var inp=document.getElementById('af-input');var res=document.getElementById('af-results');if(!inp||!res)return;
    var q=inp.value.trim();if(!q){res.innerHTML='';return;}
    window.S.ui.showLoading('Поиск...');
    try{
      var r=await window.S.friends.searchUsers(q);
      if(!r.length){res.innerHTML='<div class="empty-state empty-state--sm"><div class="empty-text">Не найден</div></div>';return;}
      var h='';r.forEach(function(u){
        var sc=window.S.utils.getStatusColor(u.status);
        h+='<div class="friend-row"><div class="friend-av">'+window.S.utils.createAvatarHTML(u.username,u.avatar_url,40)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
          '<div class="friend-info"><div class="friend-name">'+window.S.utils.escapeHtml(u.username)+'</div><div class="friend-status">'+window.S.utils.getStatusLabel(u.status)+'</div></div>'+
          '<div class="friend-actions"><button class="btn btn--sm btn--accent btn-send" data-uid="'+u.id+'">Добавить</button></div></div>';
      });
      res.innerHTML=h;
      res.querySelectorAll('.btn-send').forEach(function(b){
        b.addEventListener('click',async function(){
          b.disabled=true;b.textContent='...';
          var r2=await window.S.friends.sendRequest(b.getAttribute('data-uid'));
          if(r2.error){window.S.ui.showToast(r2.error,'error');b.disabled=false;b.textContent='Добавить';}
          else{window.S.ui.showToast('Запрос отправлен!','success');b.textContent='Отправлено';b.classList.add('btn--sent');}
        });
      });
    }catch(e){
      console.warn('[SentCor] doSearchFriends:',e);
      res.innerHTML='<div class="empty-state empty-state--sm"><div class="empty-text">Ошибка</div></div>';
    }finally{window.S.ui.hideLoading();}
  }

  function renderServersList(sidebar){
    var h='<div class="sub-sidebar-header"><div class="sub-sidebar-title">Серверы</div>'+
      '<div class="search-row">'+window.S.icons.search+'<input type="text" id="server-search" placeholder="Поиск серверов..."></div></div>';
    h+='<div class="sub-sidebar-list">';
    if(!servers.length){
      h+='<div class="empty-state empty-state--sm"><div class="empty-text">Нет серверов. Создайте первый!</div></div>';
    }else{
      servers.forEach(function(s){
        h+='<div class="conv-item" data-sid="'+s.id+'">'+
          '<div class="conv-av">'+window.S.utils.createServerAvatarHTML(s.name,36)+'</div>'+
          '<div class="conv-info"><div class="conv-name">'+window.S.utils.escapeHtml(s.name)+'</div></div></div>';
      });
    }
    h+='</div>';
    sidebar.innerHTML=h;
    sidebar.querySelectorAll('.conv-item').forEach(function(el){
      el.addEventListener('click',function(){
        var sid=el.getAttribute('data-sid');
        var s=servers.find(function(x){return x.id===sid;});
        if(s) selectServer(s);
      });
    });
    var searchInput=document.getElementById('server-search');
    if(searchInput){
      searchInput.addEventListener('input',function(){
        var q=searchInput.value.trim().toLowerCase();
        sidebar.querySelectorAll('.conv-item').forEach(function(el){
          var n=(el.querySelector('.conv-name')||{}).textContent||'';
          el.style.display=n.toLowerCase().indexOf(q)>-1?'':'none';
        });
      });
    }
  }

  /* ========== RIGHT SIDEBAR ========== */
  function renderRightSidebar(){
    var rs=document.getElementById('right-sidebar');if(!rs)return;
    if(view==='servers'&&activeServer){
      renderServerMembers(rs);return;
    }
    if(view==='chats'){
      var fid=window.S.chat.getActive();
      if(fid){
        var f=window.S.friends.getFriends().find(function(x){return x.id===fid;});
        if(f){renderDMProfileCard(rs,f);return;}
      }
    }
    rs.innerHTML='<div style="padding:20px;text-align:center;"><div class="empty-text" style="color:var(--text-f);">Выберите диалог</div></div>';
  }

  function renderDMProfileCard(rs, profile){
    var sc=window.S.utils.getStatusColor(profile.status);
    var sl=window.S.utils.getStatusLabel(profile.status);
    var regDate=window.S.utils.formatRegDate(profile.created_at);
    var h='<div class="rs-profile">'+
      '<div class="rs-profile-banner"></div>'+
      '<div class="rs-profile-avatar">'+window.S.utils.createAvatarHTML(profile.username,profile.avatar_url,64)+'</div>'+
      '<div class="rs-profile-name">'+window.S.utils.escapeHtml(profile.username)+'</div>'+
      '<div class="rs-profile-status"><span class="sd" style="background:'+sc+'"></span>'+sl+'</div>'+
      (profile.bio?'<div class="rs-profile-bio">'+window.S.utils.escapeHtml(profile.bio)+'</div>':'')+
      '<div class="rs-profile-meta">'+
      '<div class="rs-profile-meta-item">'+window.S.icons.calendar+' Зарегистрирован: '+regDate+'</div>'+
      '</div>'+
      '<div class="rs-profile-actions">'+
      '<button class="btn btn--ghost btn--sm" id="rs-copy-id" style="width:100%;">'+window.S.icons.copy+' Скопировать ID</button>'+
      '</div></div>';
    rs.innerHTML=h;
    setTimeout(function(){
      var copyBtn=document.getElementById('rs-copy-id');
      if(copyBtn)copyBtn.addEventListener('click',function(){
        navigator.clipboard.writeText(profile.id).then(function(){
          window.S.ui.showToast('ID скопирован!','success');
        }).catch(function(){window.S.ui.showToast('Не удалось скопировать','error');});
      });
    },0);
  }

  async function renderServerMembers(rs){
    var h='<div class="right-sidebar-header">Участники — '+window.S.utils.escapeHtml(activeServer.name)+'</div>';
    var members=await fetchServerMembers(activeServer.id);
    var u=window.S.auth.getUser();
    var online=members.filter(function(m){return m.profile&&m.profile.status==='online';});
    var offline=members.filter(function(m){return !m.profile||m.profile.status!=='online';});

    if(online.length){
      h+='<div class="rs-member-group">В сети — '+online.length+'</div>';
      online.forEach(function(m){h+=renderMemberItem(m);});
    }
    if(offline.length){
      h+='<div class="rs-member-group">Офлайн — '+offline.length+'</div>';
      offline.forEach(function(m){h+=renderMemberItem(m);});
    }
    rs.innerHTML=h;
    bindMemberActions(rs);
  }

  function renderMemberItem(m){
    var p=m.profile;if(!p)return'';
    var sc=window.S.utils.getStatusColor(p.status);
    var isOwner=m.role==='owner';
    var h='<div class="rs-member" data-uid="'+p.id+'">'+
      '<div class="rs-member-av">'+window.S.utils.createAvatarHTML(p.username,p.avatar_url,32)+'<span class="status-dot" style="background:'+sc+';width:8px;height:8px;border-width:2px;"></span></div>'+
      '<div class="rs-member-info"><div class="rs-member-name" style="color:'+(isOwner?'var(--accent)':'var(--text)')+'">'+window.S.utils.escapeHtml(p.username)+(isOwner?' 👑':'')+'</div>'+
      (m.role!=='owner'?'<div class="rs-member-role">'+window.S.utils.getStatusLabel(p.status)+'</div>':'<div class="rs-member-role">Владелец</div>')+
      '</div>'+
      '<button class="rs-member-dots" data-uid="'+p.id+'">'+window.S.icons.dots+'</button></div>';
    return h;
  }

  function bindMemberActions(rs){
    var u=window.S.auth.getUser();
    rs.querySelectorAll('.rs-member-dots').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        var uid=btn.getAttribute('data-uid');
        var items=[
          {icon:window.S.icons.eye,label:'Посмотреть профиль',action:'profile',onClick:function(){
            fetchServerMemberProfile(uid).then(function(p){if(p)window.S.ui.openProfileModal(p);});
          }},
          {icon:window.S.icons.message,label:'Написать сообщение',action:'message',onClick:function(){
            openChatWithUser(uid);
          }},
        ];
        var isOwner=u&&activeServer&&activeServer.owner_id===u.id;
        if(isOwner&&uid!==u.id){
          items.push({separator:true});
          items.push({icon:window.S.icons.kick,label:'Исключить с сервера',action:'kick',danger:true,onClick:async function(){
            if(!confirm('Исключить пользователя с сервера?'))return;
            var r=await kickMember(activeServer.id,uid);
            if(r.error){window.S.ui.showToast(r.error,'error');return;}
            window.S.ui.showToast('Пользователь исключён','success');renderRightSidebar();
          }});
        }
        window.S.ui.showContextMenu(btn,items);
      });
    });
  }

  async function fetchServerMemberProfile(uid){
    try{
      var c=window.S.supabase;if(!c)return null;
      var r=await c.from('profiles').select('id,username,avatar_url,status,bio,created_at').eq('id',uid).single();
      return r.data||null;
    }catch(e){console.warn('[SentCor] fetchServerMemberProfile:',e);return null;}
  }

  async function openChatWithUser(uid){
    var f=window.S.friends.getFriends().find(function(x){return x.id===uid;});
    if(f){openChat(uid);return;}
    var p=await fetchServerMemberProfile(uid);
    if(p){
      view='chats';activeServer=null;activeChannel=null;
      renderRailActive();
      window.S.chat.setActive(uid,p);
      var headerName=document.getElementById('chat-header-name');
      var headerStatus=document.getElementById('chat-header-status');
      var headerAvatar=document.getElementById('chat-header-avatar');
      if(headerName)headerName.textContent=p.username;
      if(headerStatus){headerStatus.textContent=window.S.utils.getStatusLabel(p.status);headerStatus.className='header-status';}
      if(headerAvatar)headerAvatar.innerHTML=window.S.utils.createAvatarHTML(p.username,p.avatar_url,24);
      await window.S.chat.fetchMessages(uid);
      renderSubSidebar();
      renderRightSidebar();
    }
  }

  async function openChat(fid){
    var f=window.S.friends.getFriends().find(function(x){return x.id===fid;});if(!f)return;
    view='chats';activeServer=null;activeChannel=null;
    window.S.chat.setActive(fid,f);
    renderRailActive();
    var headerName=document.getElementById('chat-header-name');
    var headerStatus=document.getElementById('chat-header-status');
    var headerAvatar=document.getElementById('chat-header-avatar');
    if(headerName)headerName.textContent=f.username;
    if(headerStatus){headerStatus.textContent=window.S.utils.getStatusLabel(f.status);headerStatus.className='header-status';}
    if(headerAvatar)headerAvatar.innerHTML=window.S.utils.createAvatarHTML(f.username,f.avatar_url,24);
    await window.S.chat.fetchMessages(fid);
    renderSubSidebar();
    renderRightSidebar();
  }

  function renderRailActive(){
    document.querySelectorAll('.rail-icon').forEach(function(el){el.classList.remove('active');});
    document.querySelectorAll('.rail-server-icon').forEach(function(el){el.classList.remove('active');});
    if(view==='chats'){var el=document.querySelector('[data-rail="chats"]');if(el)el.classList.add('active');}
    else if(view==='friends'){var el2=document.querySelector('[data-rail="friends"]');if(el2)el2.classList.add('active');}
    else if(view==='servers'){
      if(activeServer){
        var sel=document.querySelector('.rail-server-icon[data-sid="'+activeServer.id+'"]');
        if(sel)sel.classList.add('active');
      }else{
        var srvIcon=document.querySelector('[data-rail="servers"]');
        if(srvIcon)srvIcon.classList.add('active');
      }
    }
  }

  function renderProfileBar(){}

  function addProfileBarToSubSidebar(){
    var sidebar=document.getElementById('sub-sidebar');if(!sidebar)return;
    var old=sidebar.querySelector('.profile-bar');if(old)old.remove();
    var p=window.S.auth.getProfile();var u=window.S.auth.getUser();
    if(!u)return;
    var nm=p?p.username:(u?u.email.split('@')[0]:'User');
    var sc=p?window.S.utils.getStatusColor(p.status):'#71717A';
    var bar=document.createElement('div');
    bar.className='profile-bar';
    bar.style.cssText='padding:8px;border-top:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:8px;background:rgba(9,9,11,0.5);cursor:pointer;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);margin-top:auto;';
    bar.innerHTML='<div style="position:relative;flex-shrink:0;">'+window.S.utils.createAvatarHTML(nm,'',34)+'<span class="status-dot" style="background:'+sc+';"></span></div>'+
      '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+window.S.utils.escapeHtml(nm)+'</div><div style="font-size:11px;color:var(--text-f);">'+window.S.utils.getStatusLabel(p?p.status:'offline')+'</div></div>'+
      '<div style="display:flex;gap:2px;flex-shrink:0;">'+
      '<button class="btn-icon" id="pb-settings" title="Настройки" style="width:30px;height:30px;">'+window.S.icons.settings+'</button>'+
      '<button class="btn-icon" id="pb-logout" title="Выйти" style="width:30px;height:30px;">'+window.S.icons.logout+'</button></div>';
    sidebar.appendChild(bar);

    bar.addEventListener('mouseenter',function(){bar.style.background='rgba(255,255,255,0.08)';});
    bar.addEventListener('mouseleave',function(){bar.style.background='rgba(9,9,11,0.5)';});
    bar.addEventListener('click',function(e){
      if(e.target.closest('#pb-settings')||e.target.closest('#pb-logout'))return;
      openProfileEdit();
    });

    var settingsBtn=document.getElementById('pb-settings');
    var logoutBtn=document.getElementById('pb-logout');
    if(settingsBtn) settingsBtn.addEventListener('click',function(e){e.stopPropagation();openProfileEdit();});
    if(logoutBtn) logoutBtn.addEventListener('click',function(e){e.stopPropagation();window.S.auth.logout();});
  }

  function openProfileEdit(){
    var p=window.S.auth.getProfile();if(!p)return;
    window.S.ui.openProfileEditModal(p,async function(data){
      var r=await window.S.auth.updateProfile(data);
      if(r.error){window.S.ui.showToast(r.error,'error');return;}
      window.S.ui.showToast('Профиль обновлён!','success');
      window.S.ui.closeModal();
      renderSubSidebar();
    });
  }

  function renderProfileBarInSubSidebar(){}

  var _obs=new MutationObserver(function(){
    var sidebar=document.getElementById('sub-sidebar');if(!sidebar)return;
    var bar=sidebar.querySelector('.profile-bar');
    if(!bar&&window.S.auth.getUser()) addProfileBarToSubSidebar();
  });

  window.S.app.onLogin=function(u){
    onLogin(u);
    setTimeout(function(){addProfileBarToSubSidebar();},100);
    var sidebar=document.getElementById('sub-sidebar');
    if(sidebar) _obs.observe(sidebar,{childList:true});
  };
  window.S.app.refreshAll=refreshAll;
  window.S.app.refreshConversations=async function(){await buildConvs();renderSubSidebar();};
  window.S.app.openChat=openChat;
  window.S.app.initUI=initUI;

  function initUI(){
    document.querySelectorAll('.rail-icon').forEach(function(el){
      el.addEventListener('click',function(){
        var v=el.getAttribute('data-rail');
        if(v==='logo'){
          var pr=window.S.auth.getProfile();if(pr)window.S.ui.openProfileModal(pr);
          return;
        }
        activeServer=null;activeChannel=null;
        if(v==='chats'){view='chats';window.S.chat.setActive(null,null);document.getElementById('chat-header-name').textContent='';document.getElementById('chat-header-status').textContent='';document.getElementById('chat-header-avatar').innerHTML='';}
        else if(v==='friends'){view='friends';}
        else if(v==='servers'){view='servers';}
        renderRailActive();renderSubSidebar();renderRightSidebar();
      });
    });

    var createBtn=document.getElementById('create-server-btn');
    if(createBtn){
      createBtn.addEventListener('click',function(e){
        e.preventDefault();
        var html='<div class="settings-form">'+
          '<div class="settings-group"><label class="settings-label">Название сервера</label><input type="text" class="input" id="cs-name" placeholder="Мой сервер" /></div>'+
          '</div>';
        window.S.ui.openModal('Создать сервер', html, async function(){
          var name=(document.getElementById('cs-name').value||'').trim();
          if(!name){window.S.ui.showToast('Введите название','error');return;}
          window.S.ui.showLoading('Создание...');
          try{var r=await createServer(name);if(r.error)throw new Error(r.error);window.S.ui.showToast('Сервер создан!','success');window.S.ui.closeModal();}
          catch(e){window.S.ui.showToast(e.message||'Ошибка','error');}
          finally{window.S.ui.hideLoading();}
        });
      });
    }

    var sendBtn=document.getElementById('send-btn');
    var inp=document.getElementById('message-input');
    function hSend(){
      if(!inp)return;var t=inp.value;if(!t.trim())return;
      if(view==='servers'&&activeServer&&activeChannel){
        sendServerMessage(activeServer.id,activeChannel.id,t);
        setTimeout(function(){renderServerMessages();},300);
      }else{
        window.S.chat.sendMessage(t);
      }
      inp.value='';inp.focus();
    }
    if(sendBtn) sendBtn.addEventListener('click',function(e){e.preventDefault();hSend();});
    if(inp){
      inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();hSend();}});
    }
  }
})();

document.addEventListener('DOMContentLoaded',function(){window.S.auth.init();window.S.app.initUI();});
