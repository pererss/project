// SENTCOR v4.2 — Auth (maybeSingle fix + auto-create profile)
(function(){
  const C=window.SENTCOR_CONFIG,S=window.SENTCOR,sb=S.sb;
  S.user=null;S.profile=null;S.session=null;

  async function initSession(){
    const{data}=await sb.auth.getSession();
    if(data.session){S.session=data.session;S.user=data.session.user;await fetchProfile();return true}
    return false
  }

  async function fetchProfile(){
    if(!S.user)return;
    // Use maybeSingle to avoid error when no profile exists
    const{data,error}=await sb.from("profiles").select("*").eq("id",S.user.id).maybeSingle();
    if(error){console.error("fetchProfile error:",error.message);return}
    if(data){S.profile=data;applyTheme(data.theme);return}
    // Profile doesn't exist — create it now (trigger may have failed)
    console.warn("Profile missing, creating manually for",S.user.id);
    const username=S.user.user_metadata?.username||("user_"+S.user.id.slice(0,8));
    const{data:newP,error:insErr}=await sb.from("profiles").insert({
      id:S.user.id,
      username:username,
      display_name:username,
      created_at:new Date().toISOString()
    }).select().maybeSingle();
    if(insErr){console.error("Auto-create profile failed:",insErr.message);return}
    if(newP){S.profile=newP;applyTheme(newP.theme)}
  }

  function applyTheme(t){
    document.body.classList.remove("theme-oled","theme-midnight");
    if(t&&t!=="caramel")document.body.classList.add("theme-"+t)
  }

  async function updateProfile(upd){
    if(!S.user)return{error:"Not logged in"};
    // First ensure profile exists
    if(!S.profile)await fetchProfile();
    if(!S.profile)return{error:"Profile not found"};
    const{data,error}=await sb.from("profiles").update(upd).eq("id",S.user.id).select().maybeSingle();
    if(error){console.error("updateProfile error:",error.message);return{error}}
    if(data){Object.assign(S.profile,data);if(upd.theme)applyTheme(data.theme)}
    else{
      // No row updated — try upsert
      const{error:uErr}=await sb.from("profiles").upsert({id:S.user.id,...upd,username:S.profile.username||"user_"+S.user.id.slice(0,8)});
      if(uErr){console.error("updateProfile upsert error:",uErr.message);return{error:uErr}}
      // Refetch
      await fetchProfile()
    }
    return{data,error:null}
  }

  async function uploadAvatar(file){
    if(!S.user)return{error:"Not logged in"};
    const ext=file.name.split(".").pop(),fp=`avatars/${S.user.id}_${Date.now()}.${ext}`;
    const{error:ue}=await sb.storage.from("avatars").upload(fp,file,{upsert:true});
    if(ue)return{error:ue};
    const{data:ud}=sb.storage.from("avatars").getPublicUrl(fp);
    const{error:pe}=await sb.from("profiles").update({avatar_url:ud.publicUrl}).eq("id",S.user.id);
    if(!pe){S.profile.avatar_url=ud.publicUrl;if(S.ui)try{S.ui.updateFooter()}catch(e){}}
    return{url:ud.publicUrl,error:pe}
  }

  async function signUp(email,password,username){
    const{data,error}=await sb.auth.signUp({email,password,options:{data:{username,display_name:username}}});
    if(error)return{error};
    if(data.user){S.user=data.user;S.session=data.session;await fetchProfile()}
    return{data}
  }

  async function signIn(email,password){
    const{data,error}=await sb.auth.signInWithPassword({email,password});
    if(error)return{error};
    S.user=data.user;S.session=data.session;await fetchProfile();await recordLogin();await setOnlineStatus("online");
    return{data}
  }

  async function signOut(){await setOnlineStatus("offline");await sb.auth.signOut();S.user=null;S.profile=null;S.session=null}

  async function recordLogin(){
    if(!S.user)return;
    try{await sb.from("daily_logins").insert({user_id:S.user.id,login_date:new Date().toISOString().slice(0,10)})}catch(e){}
  }

  async function setOnlineStatus(status){
    if(!S.user)return;
    // Allow all statuses including idle (user-triggered)
    await sb.from("profiles").update({status,last_login:new Date().toISOString()}).eq("id",S.user.id);
    if(S.profile)S.profile.status=status;
    S.ui.updateFooter()
  }

  function canChangeUsername(){
    if(!S.profile||!S.profile.last_username_change)return true;
    const days=(Date.now()-new Date(S.profile.last_username_change).getTime())/(86400000);
    return days>=C.USERNAME_CHANGE_COOLDOWN_DAYS
  }

  function daysUntilUsernameChange(){
    if(!S.profile||!S.profile.last_username_change)return 0;
    const days=(Date.now()-new Date(S.profile.last_username_change).getTime())/(86400000);
    return Math.max(0,Math.ceil(C.USERNAME_CHANGE_COOLDOWN_DAYS-days))
  }

  async function changePassword(newPassword){
    if(!S.user)return{error:"Not logged in"};
    const{error}=await sb.auth.updateUser({password:newPassword});
    if(!error)S.ui.toast("Пароль изменён!","success");
    return{error}
  }

  sb.auth.onAuthStateChange(async(event,session)=>{
    if(event==="SIGNED_IN"&&session){S.user=session.user;S.session=session;await fetchProfile();await recordLogin();await setOnlineStatus("online");if(S.ui&&S.ui.showApp)S.ui.showApp()}
    else if(event==="SIGNED_OUT"){S.user=null;S.profile=null;S.session=null;if(S.ui&&S.ui.showAuth)S.ui.showAuth()}
  });

  S.auth={initSession,fetchProfile,updateProfile,uploadAvatar,signUp,signIn,signOut,setOnlineStatus,recordLogin,canChangeUsername,daysUntilUsernameChange,changePassword}
})();