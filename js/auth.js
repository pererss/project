// SENTCOR v5.8 — Auth (compress avatars, no reload on tab restore)
(function(){
  const C=window.SENTCOR_CONFIG,S=window.SENTCOR,sb=S.sb;
  S.user=null;S.profile=null;S.session=null;S.appLoaded=false;

  async function initSession(){
    const{data}=await sb.auth.getSession();
    if(data.session){S.session=data.session;S.user=data.session.user;await fetchProfile();return true}
    return false
  }

  async function fetchProfile(){
    if(!S.user)return;
    const{data,error}=await sb.from("profiles").select("*").eq("id",S.user.id).maybeSingle();
    if(error){console.error("fetchProfile:",error.message);return}
    if(data){S.profile=data;applyTheme(data.theme);return}
    console.warn("Profile missing, creating for",S.user.id);
    const username=S.user.user_metadata?.username||("user_"+S.user.id.slice(0,8));
    const{data:newP,error:insErr}=await sb.from("profiles").insert({id:S.user.id,username,display_name:username,created_at:new Date().toISOString()}).select().maybeSingle();
    if(insErr){console.error("Auto-create failed:",insErr.message);return}
    if(newP){S.profile=newP;applyTheme(newP.theme)}
  }

  function applyTheme(t){
    document.body.classList.remove("theme-oled","theme-midnight");
    if(t&&t!=="caramel")document.body.classList.add("theme-"+t)
  }

  async function updateProfile(upd){
    if(!S.user)return{error:"Not logged in"};
    if(!S.profile)await fetchProfile();
    if(!S.profile)return{error:"Profile not found"};
    const{data,error}=await sb.from("profiles").update(upd).eq("id",S.user.id).select().maybeSingle();
    if(error)return{error};
    if(data){Object.assign(S.profile,data);if(upd.theme)applyTheme(data.theme)}
    else{await sb.from("profiles").upsert({id:S.user.id,...upd,username:S.profile.username||"user_"+S.user.id.slice(0,8)});await fetchProfile()}
    return{data:null,error:null}
  }

  // ---- COMPRESS AVATAR ----
  function compressAvatar(file){
    return new Promise(resolve=>{
      if(!file.type.startsWith("image/")){resolve(file);return}
      const reader=new FileReader();
      reader.readAsDataURL(file);
      reader.onload=(e)=>{
        const img=new Image();
        img.src=e.target.result;
        img.onload=()=>{
          const canvas=document.createElement("canvas");
          const MAX=150;canvas.width=MAX;canvas.height=MAX;
          let w=img.width,h=img.height;
          if(w>h){w=Math.round(w*MAX/h);h=MAX}else{h=Math.round(h*MAX/w);w=MAX}
          const ctx=canvas.getContext("2d");
          ctx.drawImage(img,(MAX-w)/2,(MAX-h)/2,w,h);
          canvas.toBlob(blob=>{resolve(new File([blob],"avatar.webp",{type:"image/webp"}))},"image/webp",0.8)
        }
      }
    })
  }

  async function uploadAvatar(file){
    if(!S.user)return{error:"Not logged in"};
    const small=await compressAvatar(file);
    const fp=`avatars/${S.user.id}_${Date.now()}.webp`;
    const{error:ue}=await sb.storage.from("avatars").upload(fp,small,{upsert:true});
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

  async function signOut(){await setOnlineStatus("offline");await sb.auth.signOut();S.user=null;S.profile=null;S.session=null;S.appLoaded=false}
  async function recordLogin(){if(!S.user)return;try{await sb.from("daily_logins").insert({user_id:S.user.id,login_date:new Date().toISOString().slice(0,10)})}catch(e){}}
  async function setOnlineStatus(status){
    if(!S.user)return;
    await sb.from("profiles").update({status,last_login:new Date().toISOString()}).eq("id",S.user.id);
    if(S.profile)S.profile.status=status;
    if(S.ui)S.ui.updateFooter()
  }

  function canChangeUsername(){
    if(!S.profile||!S.profile.last_username_change)return true;
    return(Date.now()-new Date(S.profile.last_username_change).getTime())/(86400000)>=C.USERNAME_CHANGE_COOLDOWN_DAYS
  }
  function daysUntilUsernameChange(){
    if(!S.profile||!S.profile.last_username_change)return 0;
    return Math.max(0,Math.ceil(C.USERNAME_CHANGE_COOLDOWN_DAYS-(Date.now()-new Date(S.profile.last_username_change).getTime())/(86400000)))
  }
  async function changePassword(npw){if(!S.user)return{error:"Not logged in"};const{error}=await sb.auth.updateUser({password:npw});if(!error)S.ui.toast("Пароль изменён!","success");return{error}}

  sb.auth.onAuthStateChange(async(event,session)=>{
    if(event==="SIGNED_IN"&&session&&!S.appLoaded){
      S.user=session.user;S.session=session;await fetchProfile();await recordLogin();await setOnlineStatus("online");
      if(S.ui&&S.ui.showApp){S.ui.showApp();S.appLoaded=true}
    }else if(event==="SIGNED_OUT"){
      S.user=null;S.profile=null;S.session=null;S.appLoaded=false;
      if(S.ui&&S.ui.showAuth)S.ui.showAuth()
    }
  });

  S.auth={initSession,fetchProfile,updateProfile,uploadAvatar,signUp,signIn,signOut,setOnlineStatus,recordLogin,canChangeUsername,daysUntilUsernameChange,changePassword,compressAvatar}
})();