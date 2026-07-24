/* SentCor — Auth */
window.S = window.S || {};
window.S.auth = window.S.auth || {};
window.S._pendingAvatar = null;
(function(){
  var sb=null,user=null,profile=null,isLogin=true;
  function gS(){if(!sb&&window.S&&window.S.supabase)sb=window.S.supabase;return sb;}
  var $as,$ms,$em,$pw,$un,$btn,$tog,$err;
  function cD(){$as=document.getElementById('auth-screen');$ms=document.getElementById('main-app-screen');$em=document.getElementById('auth-email');$pw=document.getElementById('auth-password');$un=document.getElementById('auth-username');$btn=document.getElementById('auth-submit');$tog=document.getElementById('auth-toggle');$err=document.getElementById('auth-error');}
  function showErr(m){if($err){$err.textContent=m;$err.style.display='block';}window.S.ui.showToast(m,'error');}
  function hideErr(){if($err){$err.textContent='';$err.style.display='none';}}
  function toggle(){isLogin=!isLogin;hideErr();if($un)$un.style.display=isLogin?'none':'block';if($btn)$btn.textContent=isLogin?'Войти':'Зарегистрироваться';if($tog)$tog.innerHTML=isLogin?'Нет аккаунта? <span class="auth-link">Зарегистрироваться</span>':'Уже есть аккаунт? <span class="auth-link">Войти</span>';}
  async function submit(){
    hideErr();
    var e=($em?$em.value:'').trim(),p=($pw?$pw.value:'').trim(),u=($un?$un.value:'').trim();
    if(!e||!p){showErr('Заполните email и пароль');return;}
    if(!isLogin&&!u){showErr('Введите логин');return;}
    if(p.length<6){showErr('Минимум 6 символов');return;}
    if(!isLogin&&u.length<3){showErr('Логин минимум 3 символа');return;}
    window.S.ui.showLoading(isLogin?'Вход...':'Регистрация...');
    try{
      var c=gS();if(!c)throw new Error('Supabase не инициализирован');
      var r;
      if(isLogin){
        r=await c.auth.signInWithPassword({email:e,password:p});
      }else{
        r=await c.auth.signUp({email:e,password:p});
        if(r.data&&r.data.user&&!r.error){
          try{
            var cleanProfile = {
              id: r.data.user.id,
              username: u || 'User',
              avatar_url: null,
              bio: 'Всем привет!',
              status: 'online'
            };
            await c.from('profiles').upsert(cleanProfile, { onConflict: 'id' });
          }catch(upsertErr){console.warn('[SentCor] profiles upsert:',upsertErr);}
        }
      }
      if(r.error)throw r.error;
      user=r.data.user;
      try{await fetchP();}catch(e){console.warn('[SentCor] fetchProfile:',e);}
      try{var cleanStatus={id:user.id,status:'online'};await c.from('profiles').upsert(cleanStatus,{onConflict:'id'});}catch(e){console.warn('[SentCor] status update:',e);}
      window.S.ui.showToast(isLogin?'Добро пожаловать!':'Аккаунт создан!','success');
      window.S.auth.onAuthSuccess(user);
    }catch(err){var m=(err&&err.message)?err.message:'Ошибка';if(m.includes('Invalid login'))m='Неверный email или пароль';if(m.includes('already registered'))m='Email уже зарегистрирован';showErr(m);}
    finally{window.S.ui.hideLoading();}
  }
  async function fetchP(){
    if(!user)return null;
    try{
      var c=gS();if(!c)return null;
      var r=await c.from('profiles').select('id,username,avatar_url,status,email,bio,created_at').eq('id',user.id).single();
      if(r.data)profile=r.data;
    }catch(e){console.warn('[SentCor] fetchProfile:',e);}
    return profile;
  }
  async function check(){
    try{
      var c=gS();if(!c)return null;
      var r=await c.auth.getSession();
      if(r.data&&r.data.session&&r.data.session.user){
        user=r.data.session.user;
        try{await fetchP();}catch(e){console.warn('[SentCor] fetchProfile:',e);}
        try{var cleanStatus={id:user.id,status:'online'};await c.from('profiles').upsert(cleanStatus,{onConflict:'id'});}catch(e){console.warn('[SentCor] status update:',e);}
        window.S.auth.onAuthSuccess(user);
        return user;
      }
    }catch(e){console.warn('[SentCor] Session:',e);}
    return null;
  }
  async function logout(){
    try{
      var c=gS();
      if(c&&user){
        try{var cleanStatus={id:user.id,status:'offline'};await c.from('profiles').upsert(cleanStatus,{onConflict:'id'});}catch(e){console.warn('[SentCor] logout status:',e);}
        await c.auth.signOut();
      }
    }catch(e){console.warn('[SentCor] logout:',e);}
    user=null;profile=null;
    if($as)$as.classList.add('active');if($ms)$ms.classList.remove('active');
    window.S.ui.showToast('Вы вышли','info');
  }
  window.S.auth.init=function(){cD();if($tog)$tog.addEventListener('click',toggle);if($btn)$btn.addEventListener('click',function(e){e.preventDefault();submit();});[$pw,$em,$un].forEach(function(el){if(el)el.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();submit();}});});if($un)$un.style.display='none';toggle();check();};
  window.S.auth.onAuthSuccess=function(u){user=u;if($as)$as.classList.remove('active');if($ms)$ms.classList.add('active');if(window.S.app&&window.S.app.onLogin)window.S.app.onLogin(u);};
  window.S.auth.logout=logout;
  window.S.auth.getUser=function(){return user;};
  window.S.auth.getProfile=function(){return profile;};
  window.S.auth.fetchProfile=fetchP;
  window.S.auth.updateProfile=async function(d){
    if(!user)return{error:'Не авторизован'};
    try{
      var c=gS();if(!c)return{error:'No supabase'};
      var cleanProfileData = {
        id: user.id,
        username: (d.username !== undefined ? d.username : (profile ? profile.username : 'User')),
        avatar_url: (d.avatar_url !== undefined ? d.avatar_url : (profile ? profile.avatar_url : null)),
        bio: (d.bio !== undefined ? d.bio : (profile ? profile.bio : '')),
        status: (d.status !== undefined ? d.status : 'online')
      };
      if(window.S._pendingAvatar){cleanProfileData.avatar_url=window.S._pendingAvatar;window.S._pendingAvatar=null;}
      var r=await c.from('profiles').upsert(cleanProfileData,{onConflict:'id'});
      if(r.error)throw r.error;
      try{await fetchP();}catch(e){console.warn('[SentCor] fetchProfile:',e);}
      return{success:true};
    }catch(e){console.warn('[SentCor] updateProfile:',e);return{error:e.message};}
  };
})();
