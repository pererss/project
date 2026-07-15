// SENTCOR v9.2 — Voice (full-screen call + PiP minimize)
(function(){
  const S=window.SENTCOR;
  let room=null,curCh=null,localAudio=null,localVideo=null,micOn=true,deaf=false,parts={},screenTrack=null;
  let ringInterval=null,ringAudioCtx=null,callSub=null,pipActive=false;

  async function joinChannel(ch){
    if(!S.user)return;if(room&&room.state==="connected")await leave();
    curCh=ch;const token=await getToken(ch.id,S.profile.username||S.user.email);
    if(!token){S.ui.toast("Ошибка токена","error");curCh=null;return}
    try{
      room=new LivekitClient.Room({adaptiveStream:true,dynacast:true});
      room.on("connected",()=>{showVoiceBar(ch)});
      room.on("disconnected",()=>{hideAll();curCh=null;cleanup()});
      room.on("trackSubscribed",(t,pub,p)=>onTrack(t,p));
      room.on("trackUnsubscribed",(t,p)=>offTrack(t,p));
      room.on("participantConnected",()=>updateVoiceUI());
      room.on("participantDisconnected",p=>{updateVoiceUI();document.getElementById("vid-"+p.identity)?.remove()});
      await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL,token);
      try{localAudio=await LivekitClient.createLocalAudioTrack({echoCancellation:true,noiseSuppression:true});await room.localParticipant.publishTrack(localAudio)}catch(e){}
      await S.sb.from("voice_participants").upsert({channel_id:ch.id,user_id:S.user.id});updateVoiceUI()
    }catch(e){S.ui.toast("Ошибка подключения","error");curCh=null}
  }

  async function startCall(friend,roomName){
    if(!S.user)return;
    try{await S.sb.from("calls").insert({caller_id:S.user.id,callee_id:friend.id,room_name:roomName,status:"ringing",caller_name:S.profile.display_name||S.profile.username})}catch(e){}
    showOutgoingCallUI(friend,roomName)
  }

  function showOutgoingCallUI(friend,roomName){
    hideAll();stopRingtone();
    const av=friend.avatar_url?'<img src="'+friend.avatar_url+'">':(friend.display_name||friend.username||"?").charAt(0).toUpperCase();
    const overlay=document.createElement("div");overlay.id="voice-call-overlay";
    overlay.style.cssText="position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.9);backdrop-filter:blur(12px)";
    overlay.innerHTML='<div style="background:var(--bg-primary);border-radius:24px;padding:32px;text-align:center;max-width:380px;width:90%;box-shadow:0 8px 60px rgba(0,0,0,0.8);border:1px solid var(--border-light)"><div class="avatar avatar-xl" style="width:100px;height:100px;font-size:32px;margin:0 auto 16px">'+av+'</div><div style="font-weight:700;font-size:20px;color:var(--text-bright);margin-bottom:4px">'+S.escapeHtml(friend.display_name||friend.username)+'</div><div id="call-status-text" style="color:var(--accent-light);font-size:14px;margin-bottom:24px">Звоним...</div><button class="btn btn-danger" id="cancel-call-btn" style="width:60px;height:60px;border-radius:50%;font-size:22px;padding:0;margin:0 auto"><i class="fa-solid fa-phone-slash"></i></button></div>';
    document.body.appendChild(overlay);
    document.getElementById("cancel-call-btn").addEventListener("click",()=>{cancelCall(roomName,friend.id)});
    monitorCallStatus(roomName,friend,true)
  }

  function showIncomingCallUI(call){
    hideAll();stopRingtone();
    const av=call.profile?.avatar_url?'<img src="'+call.profile.avatar_url+'">':call.caller_name?.charAt(0)||"?";
    startRingtone();
    const overlay=document.createElement("div");overlay.id="voice-call-overlay";
    overlay.style.cssText="position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.9);backdrop-filter:blur(12px)";
    overlay.innerHTML='<div style="background:var(--bg-primary);border-radius:24px;padding:32px;text-align:center;max-width:380px;width:90%;box-shadow:0 8px 60px rgba(0,0,0,0.8);border:1px solid var(--border-light)"><div class="avatar avatar-xl" style="width:100px;height:100px;font-size:32px;margin:0 auto 16px">'+av+'</div><div style="font-weight:700;font-size:20px;color:var(--text-bright);margin-bottom:4px">'+S.escapeHtml(call.caller_name||"Неизвестный")+'</div><div style="color:var(--text-muted);font-size:14px;margin-bottom:24px">Входящий звонок...</div><div style="display:flex;gap:16px;justify-content:center"><button class="btn btn-danger" id="decline-call-btn" style="width:60px;height:60px;border-radius:50%;font-size:22px;padding:0"><i class="fa-solid fa-phone-slash"></i></button><button class="btn btn-primary" id="accept-call-btn" style="width:60px;height:60px;border-radius:50%;font-size:22px;padding:0"><i class="fa-solid fa-phone"></i></button></div></div>';
    document.body.appendChild(overlay);
    document.getElementById("decline-call-btn").addEventListener("click",()=>{declineCall(call)});
    document.getElementById("accept-call-btn").addEventListener("click",()=>{acceptCall(call)});
    setTimeout(()=>{if(document.getElementById("voice-call-overlay"))declineCall(call)},25000)
  }

  async function acceptCall(call){stopRingtone();await S.sb.from("calls").update({status:"accepted"}).eq("id",call.id);hideAll();connectCall({id:call.caller_id,display_name:call.caller_name,username:call.caller_name,avatar_url:call.profile?.avatar_url},call.room_name)}
  async function declineCall(call){stopRingtone();await S.sb.from("calls").update({status:"declined"}).eq("id",call.id);hideAll()}
  async function cancelCall(roomName,friendId){await S.sb.from("calls").delete().eq("room_name",roomName).eq("caller_id",S.user.id);hideAll()}
  async function monitorCallStatus(roomName,friend,isOutgoing){
    unsubCall();callSub=S.sb.channel("calls-"+roomName).on("postgres_changes",{event:"UPDATE",schema:"public",table:"calls",filter:"room_name=eq."+roomName},payload=>{
      const call=payload.new;if(call.status==="accepted"&&isOutgoing){hideAll();unsubCall();connectCall(friend,roomName)}else if(call.status==="declined"){hideAll();unsubCall();S.ui.toast("Абонент отклонил звонок","info")}
    }).subscribe()
  }

  async function connectCall(friend,roomName){
    if(room&&room.state==="connected")await leave();
    curCh={id:roomName,name:friend.display_name||friend.username,type:"voice",friend};
    const token=await getToken(roomName,S.profile.username||S.user.email);
    if(!token){S.ui.toast("Ошибка звонка","error");return}
    try{
      room=new LivekitClient.Room({adaptiveStream:true,dynacast:true});
      room.on("connected",()=>{showFullCallUI(friend)});
      room.on("disconnected",()=>{hideAll();curCh=null;cleanup()});
      room.on("trackSubscribed",(t,pub,p)=>onTrack(t,p));
      room.on("trackUnsubscribed",(t,p)=>offTrack(t,p));
      room.on("participantConnected",()=>updateVoiceUI());
      room.on("participantDisconnected",p=>{updateVoiceUI();document.getElementById("vid-"+p.identity)?.remove()});
      await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL,token);
      localAudio=await LivekitClient.createLocalAudioTrack({echoCancellation:true,noiseSuppression:true});
      await room.localParticipant.publishTrack(localAudio);updateVoiceUI()
    }catch(e){S.ui.toast("Ошибка: "+e.message,"error")}
  }

  // ---- FULL-SCREEN CALL UI WITH PiP ----
  function showFullCallUI(friend){
    hideAll();pipActive=false;
    const av=friend.avatar_url?'<img src="'+friend.avatar_url+'">':(friend.display_name||friend.username||"?").charAt(0).toUpperCase();
    const overlay=document.createElement("div");overlay.id="voice-call-overlay";
    overlay.style.cssText="position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);backdrop-filter:blur(14px)";
    overlay.innerHTML='<div style="background:var(--bg-primary);border-radius:24px;padding:20px;width:94vw;height:88vh;max-width:1500px;box-shadow:0 8px 60px rgba(0,0,0,0.8);border:1px solid var(--border-light);display:flex;flex-direction:column"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span style="font-weight:700;font-size:16px;color:var(--text-bright)">'+S.escapeHtml(friend.display_name||friend.username)+'</span><div style="display:flex;gap:8px"><button class="btn btn-icon btn-ghost btn-sm" id="call-pip-btn" title="Свернуть"><i class="fa-solid fa-minimize"></i></button><button class="btn btn-icon btn-ghost btn-sm" id="call-hangup-btn" style="color:var(--red)"><i class="fa-solid fa-phone-slash"></i></button></div></div><div id="voice-video-grid" style="flex:1;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;overflow:hidden;border-radius:16px;background:#000"></div><div style="display:flex;align-items:center;justify-content:center;gap:12px;padding-top:12px"><button class="btn btn-icon btn-sm" id="call-mic-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px"><i class="fa-solid fa-microphone"></i></button><button class="btn btn-icon btn-sm" id="call-deafen-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px"><i class="fa-solid fa-volume-high"></i></button><button class="btn btn-icon btn-sm" id="call-video-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px"><i class="fa-solid fa-video"></i></button><button class="btn btn-icon btn-sm" id="call-screen-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px"><i class="fa-solid fa-desktop"></i></button></div></div>';
    document.body.appendChild(overlay);
    document.getElementById("call-mic-btn").addEventListener("click",toggleMic);
    document.getElementById("call-deafen-btn").addEventListener("click",toggleDeaf);
    document.getElementById("call-video-btn").addEventListener("click",toggleVideo);
    document.getElementById("call-screen-btn").addEventListener("click",()=>screenTrack?stopScreenShare():startScreenShare());
    document.getElementById("call-hangup-btn").addEventListener("click",leave);
    // PiP button
    document.getElementById("call-pip-btn").addEventListener("click",()=>minimizeToPiP(friend));
    updateVoiceUI()
  }

  function minimizeToPiP(friend){
    const overlay=document.getElementById("voice-call-overlay");if(overlay)overlay.remove();
    const av=friend.avatar_url?'<img src="'+friend.avatar_url+'" style="width:40px;height:40px;border-radius:50%;object-fit:cover">':(friend.display_name||friend.username||"?").charAt(0).toUpperCase();
    const pip=document.createElement("div");pip.id="voice-call-pip";
    pip.style.cssText="position:fixed;bottom:20px;right:20px;z-index:550;width:280px;height:160px;background:var(--bg-primary);border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.8);cursor:pointer;overflow:hidden;animation:scaleIn 200ms ease;border:1px solid var(--border-light);display:flex;flex-direction:column";
    pip.innerHTML='<div style="flex:1;display:flex;align-items:center;justify-content:center;background:#000;position:relative"><div id="pip-video-container" style="width:100%;height:100%"></div><div style="position:absolute;top:4px;right:4px;display:flex;gap:4px"><button class="btn btn-icon btn-ghost btn-sm" id="pip-restore-btn" style="width:28px;height:28px;background:rgba(0,0,0,0.6);color:#fff;font-size:12px"><i class="fa-solid fa-maximize"></i></button><button class="btn btn-icon btn-ghost btn-sm" id="pip-hangup-btn" style="width:28px;height:28px;background:rgba(0,0,0,0.6);color:var(--red);font-size:12px"><i class="fa-solid fa-phone-slash"></i></button></div></div><div style="padding:8px 12px;display:flex;align-items:center;gap:8px"><div class="avatar avatar-sm" style="width:28px;height:28px;font-size:10px">'+av+'</div><div style="font-size:11px;font-weight:600;color:var(--text-bright)">'+S.escapeHtml(friend.display_name||friend.username)+'</div></div>';
    document.body.appendChild(pip);
    document.getElementById("pip-restore-btn").addEventListener("click",()=>{pip.remove();showFullCallUI(friend)});
    document.getElementById("pip-hangup-btn").addEventListener("click",()=>{pip.remove();leave()});
    pip.addEventListener("click",e=>{if(!e.target.closest("button")){pip.remove();showFullCallUI(friend)}})
  }

  // ---- CORE ----
  async function leave(){if(curCh&&curCh.id&&!curCh.id.startsWith("sentcor_call_")){await S.sb.from("voice_participants").delete().eq("channel_id",curCh.id).eq("user_id",S.user.id)}cleanup();if(room){room.disconnect();room=null}hideAll();curCh=null;unsubCall()}
  function cleanup(){if(localAudio){localAudio.stop();localAudio=null}if(localVideo){localVideo.stop();localVideo=null}if(screenTrack){screenTrack.getTracks().forEach(t=>t.stop());screenTrack=null}Object.keys(parts).forEach(k=>{const el=document.getElementById("vid-"+k);if(el)el.remove()});parts={}}
  async function getToken(id,name){try{const{data}=await S.sb.functions.invoke("livekit-token",{body:{roomName:"sentcor_voice_"+id,participantName:name,userId:S.user.id}});return data?.token||null}catch(e){S.ui.toast("Edge Function не настроена","error",8000);return null}}
  function onTrack(t,p){parts[p.identity]=p;if(t.kind==="video"||t.source==="screen_share"){const el=t.attach();el.id="vid-"+p.identity;el.style.cssText="max-width:100%;max-height:100%;object-fit:contain;border-radius:12px";const grid=document.getElementById("voice-video-grid");if(grid)grid.appendChild(el);const pipCont=document.getElementById("pip-video-container");if(pipCont)pipCont.appendChild(el)}else if(t.kind==="audio"){const el=t.attach();el.id="audio-"+p.identity;el.style.display="none";document.body.appendChild(el);if(deaf)el.muted=true}}
  function offTrack(t,p){delete parts[p.identity];document.getElementById("vid-"+p.identity)?.remove();document.getElementById("audio-"+p.identity)?.remove()}
  function toggleMic(){if(!localAudio)return;micOn=!micOn;if(micOn)localAudio.unmute();else localAudio.mute();updateVoiceUI()}
  function toggleDeaf(){if(!room)return;deaf=!deaf;Object.keys(parts).forEach(k=>{const el=document.getElementById("audio-"+k);if(el)el.muted=deaf});if(deaf&&micOn)toggleMic();updateVoiceUI()}
  async function startScreenShare(){if(!room||!room.localParticipant)return;try{screenTrack=await navigator.mediaDevices.getDisplayMedia({video:true});const t=screenTrack.getVideoTracks()[0];await room.localParticipant.publishTrack(t,{name:"screen"});t.addEventListener("ended",()=>{screenTrack=null;updateVoiceUI()});updateVoiceUI()}catch(e){S.ui.toast("Нет доступа","error")}}
  async function stopScreenShare(){if(screenTrack){screenTrack.getTracks().forEach(t=>t.stop());screenTrack=null;updateVoiceUI()}}
  async function toggleVideo(){if(localVideo){localVideo.stop();localVideo=null;updateVoiceUI();return}try{localVideo=await LivekitClient.createLocalVideoTrack({facingMode:"user"});await room.localParticipant.publishTrack(localVideo);updateVoiceUI()}catch(e){S.ui.toast("Нет камеры","error")}}
  function unsubCall(){if(callSub){S.sb.removeChannel(callSub).catch(()=>{});callSub=null}}
  function startRingtone(){stopRingtone();try{ringAudioCtx=new(window.AudioContext||window.webkitAudioContext)();ringInterval=setInterval(()=>{const o=ringAudioCtx.createOscillator();const g=ringAudioCtx.createGain();o.connect(g);g.connect(ringAudioCtx.destination);o.frequency.value=600;o.type="sine";g.gain.value=0.2;o.start();o.stop(ringAudioCtx.currentTime+0.3)},1200)}catch(e){}}
  function stopRingtone(){if(ringInterval){clearInterval(ringInterval);ringInterval=null}if(ringAudioCtx){ringAudioCtx.close();ringAudioCtx=null}}

  function showVoiceBar(ch){
    hideAll();const b=document.createElement("div");b.className="voice-bar";b.id="voice-bar";
    b.innerHTML='<div class="voice-info"><i class="fa-solid fa-headset"></i> '+S.escapeHtml(ch.name||"Голосовой канал")+'</div><div class="voice-count" id="voice-count">0 участ.</div><button class="btn btn-sm btn-icon '+(micOn?'btn-secondary':'btn-danger')+'" id="v-mic"><i class="fa-solid '+(micOn?'fa-microphone':'fa-microphone-slash')+'"></i></button><button class="btn btn-sm btn-icon '+(deaf?'btn-danger':'btn-secondary')+'" id="v-deafen"><i class="fa-solid '+(deaf?'fa-volume-xmark':'fa-volume-high')+'"></i></button><button class="btn btn-sm btn-danger" id="v-leave"><i class="fa-solid fa-phone-slash"></i></button>';
    document.body.appendChild(b);document.getElementById("v-mic")?.addEventListener("click",toggleMic);document.getElementById("v-deafen")?.addEventListener("click",toggleDeaf);document.getElementById("v-leave")?.addEventListener("click",leave)
  }

  function hideAll(){document.getElementById("voice-bar")?.remove();document.getElementById("voice-call-overlay")?.remove();document.getElementById("voice-call-pip")?.remove()}
  function updateVoiceUI(){
    const mic=document.getElementById("call-mic-btn")||document.getElementById("v-mic");
    const deafBtn=document.getElementById("call-deafen-btn")||document.getElementById("v-deafen");
    const scrBtn=document.getElementById("call-screen-btn");
    if(mic)mic.style.background=micOn?'#333':'var(--red)';
    if(deafBtn)deafBtn.style.background=deaf?'var(--red)':'#333';
    if(scrBtn)scrBtn.style.background=screenTrack?'var(--green)':'#333';
    const cnt=document.getElementById("voice-count");if(cnt)cnt.textContent=(room?room.participants.size+1:0)+" участ.";
  }

  async function listenForCalls(){
    if(!S.user)return;
    try{await S.sb.channel("my-calls").on("postgres_changes",{event:"INSERT",schema:"public",table:"calls",filter:"callee_id=eq."+S.user.id},async payload=>{
      const call=payload.new;if(call.status!=="ringing")return;
      const{data:pr}=await S.sb.from("profiles").select("username,display_name,avatar_url").eq("id",call.caller_id).single();
      call.profile=pr||{};call.caller_name=pr?.display_name||call.caller_name;showIncomingCallUI(call)
    }).subscribe()}catch(e){console.warn("Call listener:",e)}
  }

  S.voice={joinChannel,leave,startCall,toggleMic,toggleDeaf,startScreenShare,stopScreenShare,toggleVideo,listenForCalls,get isConnected(){return room&&room.state==="connected"}};
})();