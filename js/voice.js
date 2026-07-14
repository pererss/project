// SENTCOR v7 — Voice (Discord-style call UI + screen share)
(function(){
  const S=window.SENTCOR;
  let room=null,curCh=null,localAudio=null,localVideo=null,micOn=true,deaf=false,parts={},screenTrack=null;

  async function joinChannel(ch){
    if(!S.user)return;if(room&&room.state==="connected")await leave();
    curCh=ch;const token=await getToken(ch.id,S.profile.username||S.user.email);
    if(!token){S.ui.toast("Ошибка токена","error");curCh=null;return}
    try{
      room=new LivekitClient.Room({adaptiveStream:true,dynacast:true});
      room.on("connected",()=>{showVoiceBar(ch);S.ui.toast("Подключены","success")});
      room.on("disconnected",()=>{hideVoiceUI();curCh=null;cleanup()});
      room.on("trackSubscribed",(t,pub,p)=>onTrack(t,p));
      room.on("trackUnsubscribed",(t,p)=>offTrack(t,p));
      room.on("participantConnected",()=>updateVoiceUI());
      room.on("participantDisconnected",p=>{updateVoiceUI();document.getElementById("vid-"+p.identity)?.remove()});
      await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL,token);
      try{localAudio=await LivekitClient.createLocalAudioTrack({echoCancellation:true,noiseSuppression:true});await room.localParticipant.publishTrack(localAudio)}catch(e){S.ui.toast("Микрофон недоступен","info")}
      await S.sb.from("voice_participants").upsert({channel_id:ch.id,user_id:S.user.id});updateVoiceUI()
    }catch(e){S.ui.toast("Ошибка подключения","error");curCh=null}
  }

  async function startCall(friend,roomName){
    if(!S.user)return;if(room&&room.state==="connected")await leave();
    curCh={id:roomName,name:friend.display_name||friend.username,type:"voice",friend};
    const token=await getToken(roomName,S.profile.username||S.user.email);
    if(!token){S.ui.toast("Ошибка звонка","error");return}
    try{
      room=new LivekitClient.Room({adaptiveStream:true,dynacast:true});
      room.on("connected",()=>{showCallUI(friend);S.ui.toast("Звонок начат","success")});
      room.on("disconnected",()=>{hideVoiceUI();curCh=null;cleanup()});
      room.on("trackSubscribed",(t,pub,p)=>onTrack(t,p));
      room.on("trackUnsubscribed",(t,p)=>offTrack(t,p));
      room.on("participantConnected",()=>updateVoiceUI());
      room.on("participantDisconnected",p=>{updateVoiceUI();document.getElementById("vid-"+p.identity)?.remove()});
      await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL,token);
      localAudio=await LivekitClient.createLocalAudioTrack({echoCancellation:true,noiseSuppression:true});
      await room.localParticipant.publishTrack(localAudio);
      updateVoiceUI()
    }catch(e){S.ui.toast("Ошибка звонка: "+e.message,"error")}
  }

  async function startScreenShare(){
    if(!room||!room.localParticipant)return;
    try{
      screenTrack=await navigator.mediaDevices.getDisplayMedia({video:true});
      const track=screenTrack.getVideoTracks()[0];
      await room.localParticipant.publishTrack(track,{name:"screen"});
      S.ui.toast("Трансляция запущена","success");
      track.addEventListener("ended",()=>{screenTrack=null;S.ui.toast("Трансляция остановлена","info");updateVoiceUI()});
      updateVoiceUI()
    }catch(e){S.ui.toast("Нет доступа к экрану","error")}
  }

  async function stopScreenShare(){
    if(screenTrack){screenTrack.getTracks().forEach(t=>t.stop());screenTrack=null;updateVoiceUI()}
  }

  async function toggleVideo(){
    if(localVideo){localVideo.stop();localVideo=null;S.ui.toast("Камера выкл","info");updateVoiceUI();return}
    try{
      localVideo=await LivekitClient.createLocalVideoTrack({facingMode:"user"});
      await room.localParticipant.publishTrack(localVideo);
      S.ui.toast("Камера вкл","success");updateVoiceUI()
    }catch(e){S.ui.toast("Нет доступа к камере","error")}
  }

  async function leave(){
    if(curCh&&curCh.id&&!curCh.id.startsWith("sentcor_call_")){await S.sb.from("voice_participants").delete().eq("channel_id",curCh.id).eq("user_id",S.user.id)}
    cleanup();if(room){room.disconnect();room=null}hideVoiceUI();curCh=null
  }

  function cleanup(){if(localAudio){localAudio.stop();localAudio=null}if(localVideo){localVideo.stop();localVideo=null}if(screenTrack){screenTrack.getTracks().forEach(t=>t.stop());screenTrack=null}
    Object.keys(parts).forEach(k=>{const el=document.getElementById("vid-"+k);if(el)el.remove()});parts={}}

  async function getToken(id,name){try{const{data}=await S.sb.functions.invoke("livekit-token",{body:{roomName:"sentcor_voice_"+id,participantName:name,userId:S.user.id}});return data?.token||null}catch(e){S.ui.toast("Edge Function не настроена","error",8000);return null}}

  function onTrack(t,p){
    parts[p.identity]=p;
    if(t.kind==="video"||t.source==="screen_share"){
      const el=t.attach();el.id="vid-"+p.identity;el.style.cssText="width:100%;height:100%;object-fit:cover;border-radius:12px;";
      const grid=document.getElementById("voice-video-grid");if(grid)grid.appendChild(el)
    }else if(t.kind==="audio"){
      const el=t.attach();el.id="audio-"+p.identity;el.style.display="none";document.body.appendChild(el);if(deaf)el.muted=true
    }
  }

  function offTrack(t,p){delete parts[p.identity];const el=document.getElementById("vid-"+p.identity)||document.getElementById("audio-"+p.identity);if(el)el.remove()}

  function toggleMic(){if(!localAudio)return;micOn=!micOn;if(micOn)localAudio.unmute();else localAudio.mute();updateVoiceUI()}
  function toggleDeaf(){if(!room)return;deaf=!deaf;Object.keys(parts).forEach(k=>{const el=document.getElementById("audio-"+k);if(el)el.muted=deaf});if(deaf&&micOn)toggleMic();updateVoiceUI()}

  // ---- DISCORD-STYLE CALL UI ----
  function showCallUI(friend){
    const av=friend.avatar_url?`<img src="${friend.avatar_url}">`:(friend.display_name||friend.username||"?").charAt(0).toUpperCase();
    const existing=document.getElementById("voice-call-overlay");if(existing)existing.remove();
    const overlay=document.createElement("div");overlay.id="voice-call-overlay";
    overlay.style.cssText="position:fixed;inset:0;z-index:500;background:#000;display:flex;flex-direction:column;color:#fff;font-family:'Inter',sans-serif;";
    overlay.innerHTML=`<div id="voice-video-grid" style="flex:1;display:flex;align-items:center;justify-content:center;gap:16px;padding:24px;overflow:hidden;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;"><div class="avatar avatar-xl" style="width:120px;height:120px;font-size:40px;">${av}</div><div style="font-weight:700;font-size:18px;">${S.escapeHtml(friend.display_name||friend.username)}</div><div id="call-status" style="color:var(--green);font-size:13px;">Соединение...</div></div>
    </div>
    <div id="voice-controls" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:16px 24px;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);">
      <button class="btn btn-icon btn-sm" id="call-mic-btn" style="width:48px;height:48px;background:${micOn?'#333':'var(--red)'};border-radius:50%;color:#fff;font-size:20px;"><i class="fa-solid fa-microphone${micOn?'':'-slash'}"></i></button>
      <button class="btn btn-icon btn-sm" id="call-deafen-btn" style="width:48px;height:48px;background:${deaf?'var(--red)':'#333'};border-radius:50%;color:#fff;font-size:20px;"><i class="fa-solid ${deaf?'fa-volume-xmark':'fa-volume-high'}"></i></button>
      <button class="btn btn-icon btn-sm" id="call-video-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px;"><i class="fa-solid fa-video"></i></button>
      <button class="btn btn-icon btn-sm" id="call-screen-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px;"><i class="fa-solid fa-desktop"></i></button>
      <button class="btn btn-icon btn-sm" id="call-hangup-btn" style="width:56px;height:56px;background:var(--red);border-radius:50%;color:#fff;font-size:24px;"><i class="fa-solid fa-phone-slash"></i></button>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById("call-mic-btn").addEventListener("click",toggleMic);
    document.getElementById("call-deafen-btn").addEventListener("click",toggleDeaf);
    document.getElementById("call-video-btn").addEventListener("click",toggleVideo);
    document.getElementById("call-screen-btn").addEventListener("click",()=>screenTrack?stopScreenShare():startScreenShare());
    document.getElementById("call-hangup-btn").addEventListener("click",leave);
    // Update status when connected
    const checkStatus=setInterval(()=>{const st=document.getElementById("call-status");if(st&&room&&room.state==="connected"){st.textContent="Разговор...";clearInterval(checkStatus)}},500)
  }

  function showVoiceBar(ch){
    hideVoiceUI();const b=document.createElement("div");b.className="voice-bar";b.id="voice-bar";
    b.innerHTML=`<div class="voice-info"><i class="fa-solid fa-headset"></i> ${S.escapeHtml(ch.name||"Голосовой канал")}</div><div class="voice-count" id="voice-count">0 участ.</div>
      <button class="btn btn-sm btn-icon ${micOn?'btn-secondary':'btn-danger'}" id="v-mic"><i class="fa-solid ${micOn?'fa-microphone':'fa-microphone-slash'}"></i></button>
      <button class="btn btn-sm btn-icon ${deaf?'btn-danger':'btn-secondary'}" id="v-deafen"><i class="fa-solid ${deaf?'fa-volume-xmark':'fa-volume-high'}"></i></button>
      <button class="btn btn-sm btn-danger" id="v-leave"><i class="fa-solid fa-phone-slash"></i></button>`;
    document.body.appendChild(b);
    document.getElementById("v-mic")?.addEventListener("click",toggleMic);
    document.getElementById("v-deafen")?.addEventListener("click",toggleDeaf);
    document.getElementById("v-leave")?.addEventListener("click",leave)
  }

  function hideVoiceUI(){document.getElementById("voice-bar")?.remove();document.getElementById("voice-call-overlay")?.remove()}

  function updateVoiceUI(){
    const mic=document.getElementById("call-mic-btn")||document.getElementById("v-mic");
    const deafBtn=document.getElementById("call-deafen-btn")||document.getElementById("v-deafen");
    const screenBtn=document.getElementById("call-screen-btn");
    if(mic)mic.style.background=micOn?'#333':'var(--red)';
    if(deafBtn)deafBtn.style.background=deaf?'var(--red)':'#333';
    if(screenBtn)screenBtn.style.background=screenTrack?'var(--green)':'#333';
    const cnt=document.getElementById("voice-count");if(cnt)cnt.textContent=(room?room.participants.size+1:0)+" участ.";
  }

  S.voice={joinChannel,leave,startCall,toggleMic,toggleDeaf,startScreenShare,stopScreenShare,toggleVideo,get isConnected(){return room&&room.state==="connected"}};
})();