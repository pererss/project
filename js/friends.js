/* SentCor — Friends */
window.S = window.S || {};
window.S.friends = window.S.friends || {};
(function(){
  var sb=null,friends=[],pending=[],_sub=false;
  function gS(){if(!sb&&window.S&&window.S.supabase)sb=window.S.supabase;return sb;}
  var PF='id,username,avatar_url,status,email,bio,created_at';

  async function fetchFriends(){
    var u=window.S.auth.getUser();if(!u)return[];
    try{var c=gS();if(!c)return[];var r=await c.from('friend_requests').select('id,from_user,to_user,status,created_at').or('from_user.eq.'+u.id+',to_user.eq.'+u.id).eq('status','accepted');if(r.error)throw r.error;var reqs=r.data||[];var ids=[];reqs.forEach(function(x){var f=x.from_user===u.id?x.to_user:x.from_user;if(ids.indexOf(f)===-1)ids.push(f);});if(!ids.length){friends=[];return friends;}var p=await c.from('profiles').select(PF).in('id',ids);if(p.error)throw p.error;friends=p.data||[];return friends;}catch(e){friends=[];return friends;}
  }

  async function fetchPending(){
    var u=window.S.auth.getUser();if(!u)return[];
    try{var c=gS();if(!c)return[];var r=await c.from('friend_requests').select('id,from_user,to_user,status,created_at').eq('to_user',u.id).eq('status','pending');if(r.error)throw r.error;var reqs=r.data||[];var sids=reqs.map(function(x){return x.from_user;});if(!sids.length){pending=[];return pending;}var p=await c.from('profiles').select(PF).in('id',sids);if(p.error)throw p.error;var pm={};(p.data||[]).forEach(function(x){pm[x.id]=x;});pending=reqs.map(function(x){return{id:x.id,from_user:x.from_user,to_user:x.to_user,status:x.status,created_at:x.created_at,profile:pm[x.from_user]||null};});return pending;}catch(e){pending=[];return pending;}
  }

  async function searchUsers(q){
    var u=window.S.auth.getUser();if(!u||!q||!q.trim())return[];
    try{var c=gS();if(!c)return[];var r=await c.from('profiles').select(PF).eq('username',q.trim()).neq('id',u.id);if(r.error)throw r.error;return r.data||[];}catch(e){return[];}
  }

  async function sendRequest(uid){
    var u=window.S.auth.getUser();if(!u)return{error:'Не авторизован'};
    try{var c=gS();if(!c)return{error:'No supabase'};
    var ex=await c.from('friend_requests').select('id,status').or('and(from_user.eq.'+u.id+',to_user.eq.'+uid+'),and(from_user.eq.'+uid+',to_user.eq.'+u.id+')');
    if(ex.error)throw ex.error;if(ex.data&&ex.data.length){var sts=ex.data.map(function(x){return x.status;});if(sts.indexOf('accepted')>-1)return{error:'Уже в друзьях'};if(sts.indexOf('pending')>-1)return{error:'Запрос отправлен'};}
    var r=await c.from('friend_requests').insert({from_user:u.id,to_user:uid,status:'pending',created_at:new Date().toISOString()});if(r.error)throw r.error;return{success:true};}catch(e){return{error:e.message};}
  }

  async function respondRequest(id,accept){
    var u=window.S.auth.getUser();if(!u)return{error:'Не авторизован'};
    try{var c=gS();if(!c)return{error:'No supabase'};
    if(accept){var r=await c.from('friend_requests').update({status:'accepted'}).eq('id',id);if(r.error)throw r.error;}
    else{var r2=await c.from('friend_requests').delete().eq('id',id);if(r2.error)throw r2.error;}
    return{success:true};}catch(e){return{error:e.message};}
  }

  async function removeFriend(fid){
    var u=window.S.auth.getUser();if(!u)return{error:'Не авторизован'};
    try{var c=gS();if(!c)return{error:'No supabase'};
    var r=await c.from('friend_requests').delete().or('and(from_user.eq.'+u.id+',to_user.eq.'+fid+'),and(from_user.eq.'+fid+',to_user.eq.'+u.id+')');
    if(r.error)throw r.error;return{success:true};}catch(e){return{error:e.message};}
  }

  function sub(){if(_sub)return;try{var c=gS();if(!c)return;c.channel('public:friend_requests').on('postgres_changes',{event:'*',schema:'public',table:'friend_requests'},function(){if(window.S.friends.onUpdate)window.S.friends.onUpdate();}).subscribe();_sub=true;}catch(e){}}

  window.S.friends.fetchFriends=fetchFriends;
  window.S.friends.fetchPending=fetchPending;
  window.S.friends.searchUsers=searchUsers;
  window.S.friends.sendRequest=sendRequest;
  window.S.friends.respondRequest=respondRequest;
  window.S.friends.removeFriend=removeFriend;
  window.S.friends.getFriends=function(){return friends;};
  window.S.friends.getPending=function(){return pending;};
  window.S.friends.subscribeRealtime=sub;
  window.S.friends.onUpdate=null;
})();
