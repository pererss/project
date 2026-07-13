// SENTCOR v3 — Auth (no auto-idle, theme support, username cooldown)
(function(){
  const S=window.SENTCOR||{}; const sb=S.sb;
  S.user=null;S.profile=null;S.session=null; S.isAdmin = false;
  async function initSession(){
    if (!sb || !sb.auth) return false;
    const{data}=await sb.auth.getSession();
    if(data && data.session){S.session=data.session;S.user=data.session.user;await fetchProfile();return true}
    return false
  }
  async function fetchProfile(){
    if(!S.user || !sb) return;
    try{
      const{data,error} = await sb.from("profiles").select("*").eq("id",S.user.id).single();
      if(error){ console.warn('fetchProfile error', error); return }
      if(data){ S.profile=data; applyTheme(data.theme); S.isAdmin = !!(data.is_admin || data.role === 'admin'); }
    }catch(e){ console.warn('fetchProfile exception', e) }
  }
  function applyTheme(t){
    document.body.classList.remove("theme-oled","theme-midnight");
    if(t&&t!=="caramel")document.body.classList.add("theme-"+t)
  }
  async function updateProfile(upd){
    if(!S.user)return{error:"Not logged in"};
    const{data,error}=await sb.from("profiles").update(upd).eq("id",S.user.id).select().single();
    if(!error&&data){Object.assign(S.profile,data);if(upd.theme)applyTheme(data.theme);S.isAdmin = !!(data.is_admin || data.role === 'admin')}
    return{data,error}
  }
  async function uploadAvatar(file){
    if(!S.user || !sb) return{error:"Not logged in"};
    try{
      const ext = (file && file.name) ? file.name.split('.').pop() : 'png';
      const fp = `avatars/${S.user.id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await sb.storage.from("avatars").upload(fp, file, { upsert: true });
      if (uploadError) return { error: uploadError };
      // getPublicUrl in supabase-js v2 returns { data: { publicUrl } }
      const publicResult = sb.storage.from("avatars").getPublicUrl(fp);
      const publicUrl = publicResult && publicResult.data ? publicResult.data.publicUrl : (publicResult && publicResult.publicUrl) || null;
      if(!publicUrl) return { error: 'Failed to get public URL' };
      const { error: pe } = await sb.from("profiles").update({ avatar_url: publicUrl }).eq("id",S.user.id);
      if(pe) return { error: pe };
      S.profile.avatar_url = publicUrl; if (S.ui && typeof S.ui.updateFooter === 'function') S.ui.updateFooter();
      return { url: publicUrl, error: null };
    }catch(e){
      return { error: e }
    }
  }
  async function signUp(email,password,username){
    if (!sb || !sb.auth) return { error: 'Auth not initialized' };
    const{data,error}=await sb.auth.signUp({email,password,options:{data:{username,display_name:username}}});
    if(error)return{error};
    if(data.user){S.user=data.user;S.session=data.session;await fetchProfile()}
    return{data}
  }
  async function signIn(email,password){
    if (!sb || !sb.auth) return { error: 'Auth not initialized' };
    const{data,error}=await sb.auth.signInWithPassword({email,password});
    if(error)return{error};
    S.user=data.user;S.session=data.session;await fetchProfile();await recordLogin();await setOnlineStatus("online");
    return{data}
  }
  async function signOut(){try{await setOnlineStatus("offline")}catch(e){};if(sb && sb.auth) await sb.auth.signOut();S.user=null;S.profile=null;S.session=null}
  async function recordLogin(){
    if(!S.user || !sb) return;
    try{await sb.from("daily_logins").insert({user_id:S.user.id,login_date:new Date().toISOString().slice(0,10)})}catch(e){}
  }
  async function setOnlineStatus(status){
    if(!S.user || !sb)return;
    if(status==="idle")return; // Never auto-idle
    try{
      await sb.from("profiles").update({status,last_login:new Date().toISOString()}).eq("id",S.user.id);
      if(S.profile)S.profile.status=status
    }catch(e){console.warn('setOnlineStatus error', e)}
  }
  function canChangeUsername(){
    if(!S.profile||!S.profile.last_username_change)return true;
    const days=(Date.now()-new Date(S.profile.last_username_change).getTime())/(86400000);
    return days>=S.SENTCOR_CONFIG.USERNAME_CHANGE_COOLDOWN_DAYS
  }
  function daysUntilUsernameChange(){
    if(!S.profile||!S.profile.last_username_change)return 0;
    const days=(Date.now()-new Date(S.profile.last_username_change).getTime())/(86400000);
    return Math.max(0,Math.ceil(S.SENTCOR_CONFIG.USERNAME_CHANGE_COOLDOWN_DAYS-days))
  }
  if (typeof sb !== 'undefined' && sb && sb.auth && typeof sb.auth.onAuthStateChange === 'function'){
    sb.auth.onAuthStateChange(async(event,session)=>{
      if(event==="SIGNED_IN"&&session){S.user=session.user;S.session=session;await fetchProfile();await recordLogin();await setOnlineStatus("online");if(S.ui&&S.ui.showApp)S.ui.showApp()}
      else if(event==="SIGNED_OUT"){S.user=null;S.profile=null;S.session=null;if(S.ui&&S.ui.showAuth)S.ui.showAuth()}
    });
  }
  S.auth={initSession,fetchProfile,updateProfile,uploadAvatar,signUp,signIn,signOut,setOnlineStatus,recordLogin,canChangeUsername,daysUntilUsernameChange}
  window.SENTCOR = window.SENTCOR || {};
  Object.assign(window.SENTCOR, S);
})();
