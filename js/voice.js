// SENTCOR v7.1 — Voice (centered call modal + incoming notifications)
(function(){
  const S=window.SENTCOR;
  let room=null,curCh=null,localAudio=null,localVideo=null,micOn=true,deaf=false,parts={},screenTrack=null;
  let ringInterval=null, ringAudioCtx=null, callSub=null;

  // ---- JOIN CHANNEL ----
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

  // ---- START OUTGOING CALL (send notification) ----
  async function startCall(friend,roomName){
    if(!S.user)return;
    // Notify via Supabase calls table
    try{
      await S.sb.from("calls").insert({
        caller_id:S.user.id,callee_id:friend.id,
        room_name:roomName,status:"ringing",
        caller_name:S.profile.display_name||S.profile.username
      });
    }catch(e){console.warn("Call notify:",e)}
    // Open outgoing call UI
    showOutgoingCallUI(friend,roomName)
  }

  function showOutgoingCallUI(friend,roomName){
    hideVoiceUI();stopRingtone();
    const av=friend.avatar_url?`<img src="${friend.avatar_url}">`:(friend.display_name||friend.username||"?").charAt(0).toUpperCase();
    const overlay=document.createElement("div");overlay.id="voice-call-overlay";
    overlay.style.cssText="position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);";
    overlay.innerHTML=`<div style="background:var(--bg-primary);border-radius:24px;padding:32px;text-align:center;max-width:380px;width:90%;box-shadow:var(--shadow-lg);border:1px solid var(--border-light);">
      <div class="avatar avatar-xl" style="width:100px;height:100px;font-size:32px;margin:0 auto 16px;">${av}</div>
      <div style="font-weight:700;font-size:20px;color:var(--text-bright);margin-bottom:4px;">${S.escapeHtml(friend.display_name||friend.username)}</div>
      <div id="call-status-text" style="color:var(--accent-light);font-size:14px;margin-bottom:24px;">Звоним...</div>
      <button class="btn btn-danger" id="cancel-call-btn" style="width:60px;height:60px;border-radius:50%;font-size:22px;padding:0;margin:0 auto;"><i class="fa-solid fa-phone-slash"></i></button>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById("cancel-call-btn").addEventListener("click",()=>{cancelCall(roomName,friend.id)});
    // Subscribe to call status
    monitorCallStatus(roomName,friend,true)
  }

  // ---- SHOW INCOMING CALL ----
  function showIncomingCallUI(call){
    hideVoiceUI();stopRingtone();
    const av=call.profile?.avatar_url?`<img src="${call.profile.avatar_url}">`:call.caller_name?.charAt(0)||"?";
    const callerName=call.caller_name||"Неизвестный";
    startRingtone();
    const overlay=document.createElement("div");overlay.id="voice-call-overlay";
    overlay.style.cssText="position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);";
    overlay.innerHTML=`<div style="background:var(--bg-primary);border-radius:24px;padding:32px;text-align:center;max-width:380px;width:90%;box-shadow:var(--shadow-lg);border:1px solid var(--border-light);">
      <div class="avatar avatar-xl" style="width:100px;height:100px;font-size:32px;margin:0 auto 16px;">${av}</div>
      <div style="font-weight:700;font-size:20px;color:var(--text-bright);margin-bottom:4px;">${S.escapeHtml(callerName)}</div>
      <div style="color:var(--text-muted);font-size:14px;margin-bottom:24px;">Входящий звонок...</div>
      <div style="display:flex;gap:16px;justify-content:center;">
        <button class="btn btn-danger" id="decline-call-btn" style="width:60px;height:60px;border-radius:50%;font-size:22px;padding:0;"><i class="fa-solid fa-phone-slash"></i></button>
        <button class="btn btn-primary" id="accept-call-btn" style="width:60px;height:60px;border-radius:50%;font-size:22px;padding:0;"><i class="fa-solid fa-phone"></i></button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById("decline-call-btn").addEventListener("click",()=>{declineCall(call)});
    document.getElementById("accept-call-btn").addEventListener("click",()=>{acceptCall(call)});
    // Auto-timeout after 25s
    setTimeout(()=>{if(document.getElementById("voice-call-overlay")){declineCall(call)}},25000)
  }

  async function acceptCall(call){
    stopRingtone();
    await S.sb.from("calls").update({status:"accepted"}).eq("id",call.id);
    hideVoiceUI();
    const f={id:call.caller_id,display_name:call.caller_name,username:call.caller_name,avatar_url:call.profile?.avatar_url};
    connectCall(f,call.room_name)
  }

  async function declineCall(call){
    stopRingtone();
    await S.sb.from("calls").update({status:"declined"}).eq("id",call.id);
    hideVoiceUI()
  }

  async function cancelCall(roomName,friendId){
    await S.sb.from("calls").delete().eq("room_name",roomName).eq("caller_id",S.user.id);
    hideVoiceUI()
  }

  async function monitorCallStatus(roomName,friend,isOutgoing){
    unsubCall();
    callSub=S.sb.channel("calls-"+roomName).on("postgres_changes",{event:"UPDATE",schema:"public",table:"calls",filter:"room_name=eq."+roomName},payload=>{
      const call=payload.new;
      if(call.status==="accepted"&&isOutgoing){
        hideVoiceUI();unsubCall();
        connectCall(friend,roomName)
      }else if(call.status==="declined"){
        hideVoiceUI();unsubCall();
        S.ui.toast("Абонент отклонил звонок","info")
      }
    }).subscribe()
  }

  async function connectCall(friend,roomName){
    if(room&&room.state==="connected")await leave();
    curCh={id:roomName,name:friend.display_name||friend.username,type:"voice",friend};
    const token=await getToken(roomName,S.profile.username||S.user.email);
    if(!token){S.ui.toast("Ошибка звонка","error");return}
    try{
      room=new LivekitClient.Room({adaptiveStream:true,dynacast:true});
      room.on("connected",()=>{showCallChatUI(friend);S.ui.toast("Звонок начат","success")});
      room.on("disconnected",()=>{hideVoiceUI();curCh=null;cleanup()});
      room.on("trackSubscribed",(t,pub,p)=>onTrack(t,p));
      room.on("trackUnsubscribed",(t,p)=>offTrack(t,p));
      room.on("participantConnected",()=>updateVoiceUI());
      room.on("participantDisconnected",p=>{updateVoiceUI();document.getElementById("vid-"+p.identity)?.remove()});
      await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL,token);
      localAudio=await LivekitClient.createLocalAudioTrack({echoCancellation:true,noiseSuppression:true});
      await room.localParticipant.publishTrack(localAudio);updateVoiceUI()
    }catch(e){S.ui.toast("Ошибка: "+e.message,"error")}
  }

  function showCallChatUI(friend){
    const av=friend.avatar_url?`<img src="${friend.avatar_url}">`:(friend.display_name||friend.username||"?").charAt(0).toUpperCase();
    const overlay=document.createElement("div");overlay.id="voice-call-overlay";
    overlay.style.cssText="position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);";
    overlay.innerHTML=`<div style="background:var(--bg-primary);border-radius:24px;padding:24px;max-width:420px;width:90%;box-shadow:var(--shadow-lg);border:1px solid var(--border-light);display:flex;flex-direction:column;align-items:center;gap:16px;">
      <div id="voice-video-grid" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%;min-height:80px;"></div>
      <div class="avatar avatar-xl" style="width:90px;height:90px;font-size:30px;">${av}</div>
      <div style="font-weight:700;font-size:18px;color:var(--text-bright);">${S.escapeHtml(friend.display_name||friend.username)}</div>
      <div id="call-status" style="color:var(--green);font-size:13px;">Разговор...</div>
      <div id="voice-controls" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-icon btn-sm" id="call-mic-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px;"><i class="fa-solid fa-microphone"></i></button>
        <button class="btn btn-icon btn-sm" id="call-deafen-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px;"><i class="fa-solid fa-volume-high"></i></button>
        <button class="btn btn-icon btn-sm" id="call-video-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px;"><i class="fa-solid fa-video"></i></button>
        <button class="btn btn-icon btn-sm" id="call-screen-btn" style="width:48px;height:48px;background:#333;border-radius:50%;color:#fff;font-size:20px;"><i class="fa-solid fa-desktop"></i></button>
        <button class="btn btn-icon btn-sm" id="call-hangup-btn" style="width:56px;height:56px;background:var(--red);border-radius:50%;color:#fff;font-size:24px;"><i class="fa-solid fa-phone-slash"></i></button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById("call-mic-btn").addEventListener("click",toggleMic);
    document.getElementById("call-deafen-btn").addEventListener("click",toggleDeaf);
    document.getElementById("call-video-btn").addEventListener("click",toggleVideo);
    document.getElementById("call-screen-btn").addEventListener("click",()=>screenTrack?stopScreenShare():startScreenShare());
    document.getElementById("call-hangup-btn").addEventListener("click",leave)
  }

  // ---- RINGTONE ----
  function startRingtone(){
    stopRingtone();
    try{
      ringAudioCtx=new(window.AudioContext||window.webkitAudioContext)();
      ringInterval=setInterval(()=>{
        const o=ringAudioCtx.createOscillator();const g=ringAudioCtx.createGain();
        o.connect(g);g.connect(ringAudioCtx.destination);
        o.frequency.value=600;o.type="sine";g.gain.value=0.2;
        o.start();o.stop(ringAudioCtx.currentTime+0.3)
      },1200)
    }catch(e){}
  }
  function stopRingtone(){if(ringInterval){clearInterval(ringInterval);ringInterval=null}if(ringAudioCtx){ringAudioCtx.close();ringAudioCtx=null}}

  function unsubCall(){if(callSub){S.sb.removeChannel(callSub).catch(()=>{});callSub=null}}

  // ---- SCREEN SHARE & VIDEO ----
  async function startScreenShare(){if(!room||!room.localParticipant)return;try{screenTrack=await navigator.mediaDevices.getDisplayMedia({video:true});const t=screenTrack.getVideoTracks()[0];await room.localParticipant.publishTrack(t,{name:"screen"});S.ui.toast("Трансляция запущена","success");t.addEventListener("ended",()=>{screenTrack=null;updateVoiceUI()});updateVoiceUI()}catch(e){S.ui.toast("Нет доступа","error")}}
  async function stopScreenShare(){if(screenTrack){screenTrack.getTracks().forEach(t=>t.stop());screenTrack=null;updateVoiceUI()}}
  async function toggleVideo(){if(localVideo){localVideo.stop();localVideo=null;updateVoiceUI();return}try{localVideo=await LivekitClient.createLocalVideoTrack({facingMode:"user"});await room.localParticipant.publishTrack(localVideo);updateVoiceUI()}catch(e){S.ui.toast("Нет камеры","error")}}

  // ---- CORE ----
  async function leave(){if(curCh&&curCh.id&&!curCh.id.startsWith("sentcor_call_")){await S.sb.from("voice_participants").delete().eq("channel_id",curCh.id).eq("user_id",S.user.id)}cleanup();if(room){room.disconnect();room=null}hideVoiceUI();curCh=null;unsubCall()}
  function cleanup(){if(localAudio){localAudio.stop();localAudio=null}if(localVideo){localVideo.stop();localVideo=null}if(screenTrack){screenTrack.getTracks().forEach(t=>t.stop());screenTrack=null}Object.keys(parts).forEach(k=>{const el=document.getElementById("vid-"+k);if(el)el.remove()});parts={}}
  async function getToken(id,name){try{const{data}=await S.sb.functions.invoke("livekit-token",{body:{roomName:"sentcor_voice_"+id,participantName:name,userId:S.user.id}});return data?.token||null}catch(e){S.ui.toast("Edge Function не настроена","error",8000);return null}}

  function onTrack(t,p){parts[p.identity]=p;if(t.kind==="video"||t.source==="screen_share"){const el=t.attach();el.id="vid-"+p.identity;el.style.cssText="width:120px;height:90px;object-fit:cover;border-radius:12px;";const grid=document.getElementById("voice-video-grid");if(grid)grid.appendChild(el)}else if(t.kind==="audio"){const el=t.attach();el.id="audio-"+p.identity;el.style.display="none";document.body.appendChild(el);if(deaf)el.muted=true}}
  function offTrack(t,p){delete parts[p.identity];document.getElementById("vid-"+p.identity)?.remove();document.getElementById("audio-"+p.identity)?.remove()}
  function toggleMic(){if(!localAudio)return;micOn=!micOn;if(micOn)localAudio.unmute();else localAudio.mute();updateVoiceUI()}
  function toggleDeaf(){if(!room)return;deaf=!deaf;Object.keys(parts).forEach(k=>{const el=document.getElementById("audio-"+k);if(el)el.muted=deaf});if(deaf&&micOn)toggleMic();updateVoiceUI()}

  // ---- VOICE BAR ----
  function showVoiceBar(ch){
    hideVoiceUI();const b=document.createElement("div");b.className="voice-bar";b.id="voice-bar";
    b.innerHTML=`<div class="voice-info"><i class="fa-solid fa-headset"></i> ${S.escapeHtml(ch.name||"Голосовой канал")}</div><div class="voice-count" id="voice-count">0 участ.</div>
      <button class="btn btn-sm btn-icon ${micOn?'btn-secondary':'btn-danger'}" id="v-mic"><i class="fa-solid ${micOn?'fa-microphone':'fa-microphone-slash'}"></i></button>
      <button class="btn btn-sm btn-icon ${deaf?'btn-danger':'btn-secondary'}" id="v-deafen"><i class="fa-solid ${deaf?'fa-volume-xmark':'fa-volume-high'}"></i></button>
      <button class="btn btn-sm btn-danger" id="v-leave"><i class="fa-solid fa-phone-slash"></i></button>`;
    document.body.appendChild(b);document.getElementById("v-mic")?.addEventListener("click",toggleMic);document.getElementById("v-deafen")?.addEventListener("click",toggleDeaf);document.getElementById("v-leave")?.addEventListener("click",leave)
  }

  function hideVoiceUI(){document.getElementById("voice-bar")?.remove();document.getElementById("voice-call-overlay")?.remove()}
  function updateVoiceUI(){
    const mic=document.getElementById("call-mic-btn")||document.getElementById("v-mic");const deafBtn=document.getElementById("call-deafen-btn")||document.getElementById("v-deafen");const scrBtn=document.getElementById("call-screen-btn");
    if(mic)mic.style.background=micOn?'#333':'var(--red)';if(deafBtn)deafBtn.style.background=deaf?'var(--red)':'#333';if(scrBtn)scrBtn.style.background=screenTrack?'var(--green)':'#333';
    const cnt=document.getElementById("voice-count");if(cnt)cnt.textContent=(room?room.participants.size+1:0)+" участ."
  }

  // ---- INCOMING CALL LISTENER ----
  async function listenForCalls(){
    if(!S.user)return;
    try{
      await S.sb.channel("my-calls").on("postgres_changes",{event:"INSERT",schema:"public",table:"calls",filter:"callee_id=eq."+S.user.id},async payload=>{
        const call=payload.new;if(call.status!=="ringing")return;
        // Fetch caller profile
        const{data:pr}=await S.sb.from("profiles").select("username,display_name,avatar_url").eq("id",call.caller_id).single();
        call.profile=pr||{};call.caller_name=pr?.display_name||call.caller_name;
        showIncomingCallUI(call)
      }).subscribe()
    }catch(e){console.warn("Call listener:",e)}
  }

  S.voice={joinChannel,leave,startCall,toggleMic,toggleDeaf,startScreenShare,stopScreenShare,toggleVideo,listenForCalls,get isConnected(){return room&&room.state==="connected"}};
})();