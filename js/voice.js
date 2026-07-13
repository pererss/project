// ============================================================
// SENTCOR — Voice Module (LiveKit Cloud SDK)
// ============================================================
(function () {
  "use strict";

  const S = window.SENTCOR;

  // --- STATE ---
  let livekitRoom = null;
  let currentVoiceChannel = null;
  let localAudioTrack = null;
  let localMicEnabled = true;
  let localDeafened = false;
  let participants = {};

  // --- JOIN VOICE CHANNEL ---
  async function joinChannel(channel) {
    if (!S.user || !S.profile) {
      S.ui.toast("Авторизуйтесь для подключения к голосовым каналам", "error");
      return;
    }

    if (livekitRoom && livekitRoom.state === "connected") {
      // Already in a channel — leave first
      await leaveChannel();
    }

    currentVoiceChannel = channel;

    // 1. Fetch a LiveKit token from Supabase Edge Function (or generate locally)
    const token = await getLiveKitToken(channel.id);

    if (!token) {
      S.ui.toast("Не удалось получить токен голосового канала", "error");
      currentVoiceChannel = null;
      return;
    }

    // 2. Connect to LiveKit room
    try {
      livekitRoom = new LivekitClient.Room({
        adaptiveStream: true,
        dynacast: true,
      });

      livekitRoom.on("connected", () => {
        console.log("LiveKit connected to room:", channel.id);
        S.ui.toast("Подключены к голосовому каналу", "success");
        showVoiceBar(channel);
        updateVoiceParticipants();
      });

      livekitRoom.on("disconnected", () => {
        console.log("LiveKit disconnected");
        hideVoiceBar();
        currentVoiceChannel = null;
        cleanupLocalTracks();
      });

      livekitRoom.on("trackSubscribed", (track, publication, participant) => {
        handleTrackSubscribed(track, participant);
      });

      livekitRoom.on("trackUnsubscribed", (track, participant) => {
        handleTrackUnsubscribed(track, participant);
      });

      livekitRoom.on("participantConnected", (participant) => {
        console.log("Participant joined:", participant.identity);
        updateVoiceParticipants();
      });

      livekitRoom.on("participantDisconnected", (participant) => {
        console.log("Participant left:", participant.identity);
        updateVoiceParticipants();
        // Remove audio element
        const audioEl = document.getElementById(`audio-${participant.identity}`);
        if (audioEl) audioEl.remove();
      });

      // Connect
      await livekitRoom.connect(S.SENTCOR_CONFIG.LIVEKIT_URL, token);

      // Publish local audio
      try {
        localAudioTrack = await LivekitClient.createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        await livekitRoom.localParticipant.publishTrack(localAudioTrack);
      } catch (micErr) {
        console.warn("Microphone access denied or unavailable:", micErr);
        S.ui.toast("Нет доступа к микрофону. Вы будете слушателем.", "info");
      }

      // Track in voice_participants table
      await S.sb.from("voice_participants").upsert({
        channel_id: channel.id,
        user_id: S.user.id,
        joined_at: new Date().toISOString(),
      });

    } catch (err) {
      console.error("LiveKit connection error:", err);
      S.ui.toast("Ошибка подключения к голосовому каналу: " + (err.message || "Неизвестная ошибка"), "error");
      currentVoiceChannel = null;
    }
  }

  // --- LEAVE VOICE CHANNEL ---
  async function leaveChannel() {
    if (currentVoiceChannel) {
      // Remove from voice_participants
      await S.sb
        .from("voice_participants")
        .delete()
        .eq("channel_id", currentVoiceChannel.id)
        .eq("user_id", S.user.id);
    }

    cleanupLocalTracks();

    if (livekitRoom) {
      livekitRoom.disconnect();
      livekitRoom = null;
    }

    hideVoiceBar();
    currentVoiceChannel = null;
    S.ui.toast("Вы отключились от голосового канала", "info");
  }

  function cleanupLocalTracks() {
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack = null;
    }
    // Remove all remote audio elements
    Object.keys(participants).forEach((identity) => {
      const el = document.getElementById(`audio-${identity}`);
      if (el) el.remove();
    });
    participants = {};
  }

  // --- GET LIVEKIT TOKEN ---
  async function getLiveKitToken(channelId) {
    // Supabase project path: the channel name = channelId
    const roomName = `sentcor_voice_${channelId}`;
    const participantName = S.profile.username || S.user.email || S.user.id;

    try {
      // Use Supabase Edge Function for token generation
      // If no Edge Function is set up, fall back to a basic JWT approach
      const { data, error } = await S.sb.functions.invoke("livekit-token", {
        body: {
          roomName,
          participantName,
          userId: S.user.id,
        },
      });

      if (error) {
        console.warn("Edge function not available, using fallback token generation:", error.message);
        return generateLocalToken(roomName, participantName);
      }

      return data.token;
    } catch (e) {
      console.warn("Edge function error, using fallback:", e);
      return generateLocalToken(roomName, participantName);
    }
  }

  // --- FALLBACK: GENERATE A LOCAL TOKEN ---
  // NOTE: In production, tokens MUST be generated server-side.
  // This fallback generates a temporary token for development/testing
  // using LiveKit's client-side token generation.
  function generateLocalToken(roomName, participantName) {
    // For development purposes, we create a token using the LiveKit client SDK
    // This requires the API Key + Secret to be provided.
    // In the GitHub Pages environment, we CANNOT securely store secrets.
    // Users must set up the Supabase Edge Function for proper security.

    // Attempt to use a hard-coded dev token approach
    // LiveKit Cloud provides a "Create Token" API that we can call via the client SDK
    try {
      // The LiveKit JS SDK supports creating tokens if you have the key/secret
      // But on frontend we should never expose secrets, so this is strictly a fallback
      // that will require the Supabase Edge Function to work properly.
      console.error(
        "LiveKit token generation requires a Supabase Edge Function. " +
        "Please deploy 'supabase/functions/livekit-token' using the Supabase CLI. " +
        "See README.md for instructions."
      );
      S.ui.toast(
        "Требуется настройка Edge Function для LiveKit. См. README.md",
        "error",
        8000
      );
      return null;
    } catch (e) {
      console.error("Token generation failed:", e);
      return null;
    }
  }

  // --- HANDLE REMOTE TRACK ---
  function handleTrackSubscribed(track, participant) {
    if (track.kind === "audio") {
      participants[participant.identity] = participant;
      const audioEl = track.attach();
      audioEl.id = `audio-${participant.identity}`;
      audioEl.style.display = "none";
      document.body.appendChild(audioEl);
    }
  }

  function handleTrackUnsubscribed(track, participant) {
    if (track.kind === "audio") {
      delete participants[participant.identity];
      const audioEl = document.getElementById(`audio-${participant.identity}`);
      if (audioEl) audioEl.remove();
    }
  }

  // --- TOGGLE MICROPHONE ---
  async function toggleMic() {
    if (!livekitRoom || !localAudioTrack) return;
    localMicEnabled = !localMicEnabled;

    if (localMicEnabled) {
      localAudioTrack.unmute();
    } else {
      localAudioTrack.mute();
    }

    updateVoiceBarButtons();
  }

  // --- TOGGLE DEAFEN ---
  function toggleDeafen() {
    if (!livekitRoom) return;
    localDeafened = !localDeafened;

    // Mute/unmute all remote participants
    Object.keys(participants).forEach((identity) => {
      const audioEl = document.getElementById(`audio-${identity}`);
      if (audioEl) {
        audioEl.muted = localDeafened;
      }
    });

    // Also toggle local mic when deafening
    if (localDeafened && localMicEnabled) {
      toggleMic();
    }

    updateVoiceBarButtons();
  }

  // --- VOICE BAR UI ---
  function showVoiceBar(channel) {
    // Remove existing voice bar
    hideVoiceBar();

    const bar = document.createElement("div");
    bar.className = "voice-bar";
    bar.id = "voice-bar";
    bar.innerHTML = `
      <div class="voice-info">
        <span style="color:var(--green);">🔊</span>
        <span>${S.escapeHtml(channel.name)}</span>
      </div>
      <div class="voice-participants" id="voice-participants-count">0 участников</div>
      <button class="btn btn-sm btn-icon ${localMicEnabled ? 'btn-secondary' : 'btn-danger'}" id="voice-toggle-mic" title="Микрофон">
        ${localMicEnabled
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><line x1="3" y1="3" x2="21" y2="21"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>'
        }
      </button>
      <button class="btn btn-sm btn-icon ${localDeafened ? 'btn-danger' : 'btn-secondary'}" id="voice-toggle-deafen" title="Заглушить">
        ${localDeafened
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'
        }
      </button>
      <button class="btn btn-sm btn-danger" id="voice-leave-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        Отключиться
      </button>
    `;

    document.body.appendChild(bar);

    // Event listeners
    document.getElementById("voice-toggle-mic").addEventListener("click", toggleMic);
    document.getElementById("voice-toggle-deafen").addEventListener("click", toggleDeafen);
    document.getElementById("voice-leave-btn").addEventListener("click", leaveChannel);

    updateVoiceParticipants();
  }

  function hideVoiceBar() {
    const bar = document.getElementById("voice-bar");
    if (bar) bar.remove();
  }

  function updateVoiceBarButtons() {
    const micBtn = document.getElementById("voice-toggle-mic");
    const deafenBtn = document.getElementById("voice-toggle-deafen");

    if (micBtn) {
      micBtn.className = `btn btn-sm btn-icon ${localMicEnabled ? 'btn-secondary' : 'btn-danger'}`;
      micBtn.innerHTML = localMicEnabled
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><line x1="3" y1="3" x2="21" y2="21"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>';
    }

    if (deafenBtn) {
      deafenBtn.className = `btn btn-sm btn-icon ${localDeafened ? 'btn-danger' : 'btn-secondary'}`;
      deafenBtn.innerHTML = localDeafened
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    }
  }

  // --- TRACK VOICE PARTICIPANTS VIA SUPABASE REALTIME ---
  async function updateVoiceParticipants() {
    if (!currentVoiceChannel) return;

    const { data, error } = await S.sb
      .from("voice_participants")
      .select("user_id")
      .eq("channel_id", currentVoiceChannel.id);

    if (!error && data) {
      const count = data.length;
      const countEl = document.getElementById("voice-participants-count");
      if (countEl) {
        countEl.textContent = `${count} ${pluralize(count, "участник", "участника", "участников")}`;
      }

      // Also count LiveKit participants (includes those who joined from other clients)
      if (livekitRoom) {
        // livekitRoom.participants is a Map
        const liveCount = livekitRoom.participants.size + 1; // +1 for local
        if (countEl) {
          countEl.textContent = `${liveCount} ${pluralize(liveCount, "участник", "участника", "участников")}`;
        }
      }
    }
  }

  function pluralize(n, one, two, five) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return two;
    return five;
  }

  // --- EXPORT ---
  S.voice = {
    joinChannel,
    leaveChannel,
    toggleMic,
    toggleDeafen,
    get currentVoiceChannel() {
      return currentVoiceChannel;
    },
    get isConnected() {
      return livekitRoom && livekitRoom.state === "connected";
    },
  };
})();