// ============================================================
// SENTCOR — Voice Module v2 (LiveKit: channels + 1-on-1 calls)
// ============================================================
(function () {
  "use strict";
  const S = window.SENTCOR;
  let room = null, currentChannel = null, localAudio = null;
  let micEnabled = true, deafened = false, participants = {};

  async function joinChannel(channel) {
    if (!S.user) return;
    if (room && room.state === "connected") await leaveChannel();
    currentChannel = channel;
    const token = await getToken(channel.id, S.profile.username || S.user.email);
    if (!token) { S.ui.toast("Ошибка токена голосового канала", "error"); currentChannel = null; return; }
    try {
      room = new LivekitClient.Room({ adaptiveStream: true });
      room.on("connected", () => { showVoiceBar(channel); S.ui.toast("Подключены к " + channel.name, "success"); });
      room.on("disconnected", () => { hideVoiceBar(); currentChannel = null; cleanupTracks(); });
      room.on("trackSubscribed", (track, pub, part) => handleTrack(track, part));
      room.on("trackUnsubscribed", (track, part) => removeTrack(track, part));
      room.on("participantConnected", () => updateCount());
      room.on("participantDisconnected", (p) => { updateCount(); const el = document.getElementById("audio-" + p.identity); if (el) el.remove(); });
      await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL, token);
      try {
        localAudio = await LivekitClient.createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
        await room.localParticipant.publishTrack(localAudio);
      } catch (e) { S.ui.toast("Микрофон недоступен - вы слушатель", "info"); }
      await S.sb.from("voice_participants").upsert({ channel_id: channel.id, user_id: S.user.id, joined_at: new Date().toISOString() });
      updateCount();
    } catch (e) { S.ui.toast("Ошибка подключения: " + (e.message || "?"), "error"); currentChannel = null; }
  }

  async function startDirectCall(friend, roomName) {
    if (!S.user || !friend) return;
    if (room && room.state === "connected") await leaveChannel();
    currentChannel = { id: roomName, name: friend.display_name || friend.username, type: "voice" };
    const token = await getToken(roomName, S.profile.username || S.user.email);
    if (!token) { S.ui.toast("Ошибка звонка", "error"); return; }
    try {
      room = new LivekitClient.Room({ adaptiveStream: true });
      room.on("connected", () => { showVoiceBar({ name: "Звонок: " + (friend.display_name || friend.username) }); S.ui.toast("Звонок начат", "success"); });
      room.on("disconnected", () => { hideVoiceBar(); cleanupTracks(); });
      room.on("trackSubscribed", (track, pub, part) => handleTrack(track, part));
      room.on("trackUnsubscribed", (track, part) => removeTrack(track, part));
      room.on("participantConnected", () => updateCount());
      room.on("participantDisconnected", (p) => { updateCount(); const el = document.getElementById("audio-" + p.identity); if (el) el.remove(); });
      await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL, token);
      localAudio = await LivekitClient.createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
      await room.localParticipant.publishTrack(localAudio);
      updateCount();
    } catch (e) { S.ui.toast("Ошибка звонка: " + (e.message || "?"), "error"); }
  }

  async function leaveChannel() {
    if (currentChannel && currentChannel.id && !currentChannel.id.startsWith("sentcor_call_")) {
      await S.sb.from("voice_participants").delete().eq("channel_id", currentChannel.id).eq("user_id", S.user.id);
    }
    cleanupTracks();
    if (room) { room.disconnect(); room = null; }
    hideVoiceBar(); currentChannel = null;
  }

  function cleanupTracks() { if (localAudio) { localAudio.stop(); localAudio = null; } Object.keys(participants).forEach(k => { const el = document.getElementById("audio-" + k); if (el) el.remove(); }); participants = {}; }

  async function getToken(channelId, name) {
    try {
      const { data } = await S.sb.functions.invoke("livekit-token", { body: { roomName: "sentcor_voice_" + channelId, participantName: name, userId: S.user.id } });
      return data?.token || null;
    } catch (e) { S.ui.toast("Edge Function не настроена. См. README.", "error", 8000); return null; }
  }

  function handleTrack(track, part) {
    if (track.kind === "audio") { participants[part.identity] = part; const el = track.attach(); el.id = "audio-" + part.identity; el.style.display = "none"; document.body.appendChild(el); if (deafened) el.muted = true; }
  }
  function removeTrack(track, part) { delete participants[part.identity]; const el = document.getElementById("audio-" + part.identity); if (el) el.remove(); }

  function toggleMic() {
    if (!localAudio) return; micEnabled = !micEnabled;
    if (micEnabled) localAudio.unmute(); else localAudio.mute();
    updateVoiceButtons();
  }
  function toggleDeafen() {
    if (!room) return; deafened = !deafened;
    Object.keys(participants).forEach(k => { const el = document.getElementById("audio-" + k); if (el) el.muted = deafened; });
    if (deafened && micEnabled) toggleMic();
    updateVoiceButtons();
  }

  function showVoiceBar(chan) {
    hideVoiceBar();
    const bar = document.createElement("div"); bar.className = "voice-bar"; bar.id = "voice-bar";
    bar.innerHTML = `<div class="voice-info">🔊 ${S.escapeHtml(chan.name || "Голосовой канал")}</div>
      <div class="voice-count" id="voice-count">0 участ.</div>
      <button class="btn btn-sm btn-icon ${micEnabled?'btn-secondary':'btn-danger'}" id="v-mic">${micEnabled?'🎤':'🔇'}</button>
      <button class="btn btn-sm btn-icon ${deafened?'btn-danger':'btn-secondary'}" id="v-deafen">${deafened?'🔇':'🔈'}</button>
      <button class="btn btn-sm btn-danger" id="v-leave">Откл.</button>`;
    document.body.appendChild(bar);
    document.getElementById("v-mic").addEventListener("click", toggleMic);
    document.getElementById("v-deafen").addEventListener("click", toggleDeafen);
    document.getElementById("v-leave").addEventListener("click", leaveChannel);
  }
  function hideVoiceBar() { const b = document.getElementById("voice-bar"); if (b) b.remove(); }
  function updateVoiceButtons() {
    const m = document.getElementById("v-mic"), d = document.getElementById("v-deafen");
    if (m) { m.className = "btn btn-sm btn-icon " + (micEnabled ? "btn-secondary" : "btn-danger"); m.textContent = micEnabled ? "🎤" : "🔇"; }
    if (d) { d.className = "btn btn-sm btn-icon " + (deafened ? "btn-danger" : "btn-secondary"); d.textContent = deafened ? "🔇" : "🔈"; }
  }
  function updateCount() {
    const el = document.getElementById("voice-count");
    if (el) { const c = (room ? room.participants.size + 1 : 0); el.textContent = c + " участ."; }
  }

  S.voice = { joinChannel, leaveChannel, toggleMic, toggleDeafen, startDirectCall, get isConnected(){ return room && room.state === "connected"; } };
})();