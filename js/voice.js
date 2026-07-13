// SENTCOR v3 — Voice (LiveKit)
(function(){
  const S=window.SENTCOR;
  let room=null,curCh=null,localAudio=null,micOn=true,deaf=false,parts={};

  async function joinChannel(ch){
    if(!S.user)return;if(room&&room.state==="connected")await leave();
    curCh=ch;const token=await getToken(ch.id,S.profile.username||S.user.email);
    if(!token){S.ui.toast("Ошибка токена","error");curCh=null;return}
    try{
      room=new LivekitClient.Room({adaptiveStream:true});
      room.on("connected",()=>{showBar(ch);S.ui.toast("Подключены к "+ch.name,"success")});
      room.on("disconnected",()=>{hideBar();curCh=null;cleanup()});
      room.on("trackSubscribed",(t,pub,p)=>onTrack(t,p));
      room.on("trackUnsubscribed",(t,p)=>offTrack(t,p));
      room.on("participantConnected",()=>updateCount());
      room.on("participantDisconnected",p=>{updateCount();document.getElementById("audio-"+p.identity)?.remove()});
      await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL,token);
      try{localAudio=await LivekitClient.createLocalAudioTrack({echoCancellation:true,noiseSuppression:true});await room.localParticipant.publishTrack(localAudio)}catch(e){S.ui.toast("Микрофон недоступен","info")}
      await S.sb.from("voice_participants").upsert({channel_id:ch.id,user_id:S.user.id,joined_at:new Date().toISOString()});
      updateCount()
    }catch(e){S.ui.toast("Ошибка подключения","error");curCh=null}
  }

  async function startCall(friend,roomName){
    if(!S.user)return;if(room&&room.state==="connected")await leave();
    curCh={id:roomName,name:friend.display_name||friend.username,type:"voice"};
    const token=await getToken(roomName,S.profile.username||S.user.email);
    if(!token){S.ui.toast("Ошибка звонка","error");return}
    try{
      room=new LivekitClient.Room({adaptiveStream:true});
      room.on("connected",()=>{showBar({name:"Звонок: "+(friend.display_name||friend.username)});S.ui.toast("Звонок начат","success")});
      room.on("disconnected",()=>{hideBar();curCh=null;cleanup()});
      room.on("trackSubscribed",(t,pub,p)=>onTrack(t,p));
      room.on("trackUnsubscribed",(t,p)=>offTrack(t,p));
      room.on("participantConnected",()=>updateCount());
      room.on("participantDisconnected",p=>{updateCount();document.getElementById("audio-"+p.identity)?.remove()});
      await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL,token);
      localAudio=await LivekitClient.createLocalAudioTrack({echoCancellation:true,noiseSuppression:true});
      await room.localParticipant.publishTrack(localAudio);updateCount()
    }catch(e){S.ui.toast("Ошибка звонка","error")}
  }

  async function leave(){
    if(curCh&&curCh.id&&!curCh.id.startsWith("sentcor_call_")){await S.sb.from("voice_participants").delete().eq("channel_id",curCh.id).eq("user_id",S.user.id)}
    cleanup();if(room){room.disconnect();room=null}hideBar();curCh=null
  }
  function cleanup(){if(localAudio){localAudio.stop();localAudio=null}Object.keys(parts).forEach(k=>document.getElementById("audio-"+k)?.remove());parts={}}
  async function getToken(id,name){try{const{data}=await S.sb.functions.invoke("livekit-token",{body:{roomName:"sentcor_voice_"+id,participantName:name,userId:S.user.id}});return data?.token||null}catch(e){S.ui.toast("Edge Function не настроена","error",8000);return null}}
  function onTrack(t,p){if(t.kind==="audio"){parts[p.identity]=p;const el=t.attach();el.id="audio-"+p.identity;el.style.display="none";document.body.appendChild(el);if(deaf)el.muted=true}}
  function offTrack(t,p){delete parts[p.identity];document.getElementById("audio-"+p.identity)?.remove()}
  function toggleMic(){if(!localAudio)return;micOn=!micOn;if(micOn)localAudio.unmute();else localAudio.mute();updateBtns()}
  function toggleDeaf(){if(!room)return;deaf=!deaf;Object.keys(parts).forEach(k=>{const el=document.getElementById("audio-"+k);if(el)el.muted=deaf});if(deaf&&micOn)toggleMic();updateBtns()}
  function showBar(ch){
    hideBar();const b=document.createElement("div");b.className="voice-bar";b.id="voice-bar";
    b.innerHTML=`<div class="voice-info"><i class="fa-solid fa-headset"></i> ${S.escapeHtml(ch.name||"Голосовой канал")}</div><div class="voice-count" id="voice-count">0 участ.</div>
      <button class="btn btn-sm btn-icon ${micOn?'btn-secondary':'btn-danger'}" id="v-mic"><i class="fa-solid ${micOn?'fa-microphone':'fa-microphone-slash'}"></i></button>
      <button class="btn btn-sm btn-icon ${deaf?'btn-danger':'btn-secondary'}" id="v-deafen"><i class="fa-solid ${deaf?'fa-volume-xmark':'fa-volume-high'}"></i></button>
      <button class="btn btn-sm btn-danger" id="v-leave"><i class="fa-solid fa-phone-slash"></i></button>`;
    document.body.appendChild(b);document.getElementById("v-mic").addEventListener("click",toggleMic);document.getElementById("v-deafen").addEventListener("click",toggleDeaf);document.getElementById("v-leave").addEventListener("click",leave)
  }
  function hideBar(){document.getElementById("voice-bar")?.remove()}
  function updateBtns(){
    const m=document.getElementById("v-mic"),d=document.getElementById("v-deafen");if(m)m.innerHTML=`<i class="fa-solid ${micOn?'fa-microphone':'fa-microphone-slash'}"></i>`;if(d)d.innerHTML=`<i class="fa-solid ${deaf?'fa-volume-xmark':'fa-volume-high'}"></i>`
  }
  function updateCount(){const el=document.getElementById("voice-count");if(el)el.textContent=(room?room.participants.size+1:0)+" участ."}
  S.voice={joinChannel,leave,startCall,toggleMic,toggleDeaf,get isConnected(){return room&&room.state==="connected"}};
})();