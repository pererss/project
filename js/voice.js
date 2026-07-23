// SENTCOR v9.4 — Voice (Wrapped in try...catch for stability)
try {
    (function() {
        "use strict";

        const S = window.SENTCOR;
        if (!S || !S.sb || !window.LivekitClient) {
            console.error("SENTCOR base, Supabase client, or LiveKit client is not loaded! Voice module disabled.");
            return;
        }
        const sb = S.sb;

        // --- State Management ---
        let room = null;
        let currentChannel = null;
        let localAudioTrack = null;
        let localVideoTrack = null;
        let screenShareTrack = null;
        let isMicOn = true;
        let isDeafened = false;
        let callSubscription = null;

        // --- Core Functions ---
        async function joinVoiceChannel(channel) {
            if (!S.user) return;
            if (room && room.state === "connected") await leave();

            currentChannel = channel;
            const token = await getLiveKitToken(channel.id, S.profile.username || S.user.email);
            if (!token) {
                S.toast.show("Не удалось получить токен для входа.", "error");
                currentChannel = null;
                return;
            }

            try {
                room = new LivekitClient.Room({
                    adaptiveStream: true,
                    dynacast: true,
                });

                bindRoomEvents();

                await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL, token);
                await publishLocalMedia();
                
                await sb.from("voice_participants").upsert({ channel_id: channel.id, user_id: S.user.id });
                
                showVoiceBar(channel);
                updateVoiceUI();

            } catch (e) {
                console.error("[Voice] Failed to join channel:", e);
                S.toast.show("Ошибка подключения к голосовому каналу.", "error");
                await cleanup();
            }
        }

        async function startDirectCall(friend) {
            if (!S.user || !friend) return;
            const roomName = `dm_${[S.user.id, friend.id].sort().join('_')}`;
            
            try {
                await sb.from("calls").insert({
                    caller_id: S.user.id,
                    callee_id: friend.id,
                    room_name: roomName,
                    status: "ringing",
                    caller_name: S.profile.display_name || S.profile.username
                });
                showOutgoingCallUI(friend, roomName);
            } catch (e) {
                console.error("[Voice] Failed to start call:", e);
                S.toast.show("Не удалось начать звонок.", "error");
            }
        }

        async function leave() {
            if (currentChannel && !currentChannel.id.startsWith("dm_")) {
                try {
                    await sb.from("voice_participants").delete().match({ channel_id: currentChannel.id, user_id: S.user.id });
                } catch (e) {
                    console.warn("[Voice] Failed to remove voice participant record:", e);
                }
            }
            
            if (room) {
                await room.disconnect();
            }
            
            await cleanup();
        }
        
        async function cleanup() {
            if (localAudioTrack) {
                localAudioTrack.stop();
                localAudioTrack = null;
            }
            if (localVideoTrack) {
                localVideoTrack.stop();
                localVideoTrack = null;
            }
            if (screenShareTrack) {
                screenShareTrack.stop();
                screenShareTrack = null;
            }

            unsubscribeFromCall();
            stopRingtone();
            hideAllVoiceUI();
            
            room = null;
            currentChannel = null;
            isMicOn = true;
            isDeafened = false;
            
            document.querySelectorAll('[id^="vid-"], [id^="audio-"]').forEach(el => el.remove());
        }

        // --- Event Binding & Handling ---
        function bindRoomEvents() {
            if (!room) return;
            room.on("disconnected", cleanup);
            room.on("trackSubscribed", handleTrackSubscribed);
            room.on("trackUnsubscribed", handleTrackUnsubscribed);
            room.on("participantConnected", updateVoiceUI);
            room.on("participantDisconnected", (p) => {
                document.getElementById(`vid-${p.identity}`)?.remove();
                updateVoiceUI();
            });
        }

        function handleTrackSubscribed(track, publication, participant) {
            const element = track.attach();
            if (track.kind === "video" || track.source === "screen_share") {
                element.id = `vid-${participant.identity}`;
                const grid = document.getElementById("voice-video-grid");
                if (grid) grid.appendChild(element);
            } else {
                element.id = `audio-${participant.identity}`;
                document.body.appendChild(element);
                if (isDeafened) element.muted = true;
            }
        }

        function handleTrackUnsubscribed(track, publication, participant) {
            const element = document.getElementById(`${track.kind === "audio" ? "audio" : "vid"}-${participant.identity}`);
            if (element) element.remove();
        }

        async function publishLocalMedia() {
            if (!room) return;
            try {
                localAudioTrack = await LivekitClient.createLocalAudioTrack({
                    echoCancellation: true,
                    noiseSuppression: true,
                });
                await room.localParticipant.publishTrack(localAudioTrack);
            } catch (e) {
                console.warn("[Voice] Could not publish local audio:", e);
                S.toast.show("Не удалось получить доступ к микрофону.", "warning");
            }
        }

        // --- UI Rendering ---
        function showVoiceBar(channel) {
            hideAllVoiceUI();
            const bar = document.createElement("div");
            bar.className = "voice-bar";
            bar.id = "voice-bar";
            bar.innerHTML = `
                <div class="voice-info">
                    <i class="fa-solid fa-headset"></i>
                    <span>${S.escapeHtml(channel.name || "Голосовой канал")}</span>
                </div>
                <div class="voice-count" id="voice-count">1 участ.</div>
                <div class="voice-controls">
                    <button class="btn btn-sm btn-icon btn-secondary" id="v-mic" title="Микрофон">
                        <i class="fa-solid fa-microphone"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-secondary" id="v-deafen" title="Отключить звук">
                        <i class="fa-solid fa-volume-high"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" id="v-leave" title="Покинуть">
                        <i class="fa-solid fa-phone-slash"></i>
                    </button>
                </div>`;
            document.body.appendChild(bar);

            document.getElementById("v-mic")?.addEventListener("click", toggleMic);
            document.getElementById("v-deafen")?.addEventListener("click", toggleDeafen);
            document.getElementById("v-leave")?.addEventListener("click", leave);
        }
        
        function showOutgoingCallUI(friend, roomName) {
            hideAllVoiceUI();
            stopRingtone();

            const avatar = friend.avatar_url ?
                `<img src="${S.escapeHtml(friend.avatar_url)}" alt="Avatar">` :
                `<div class="avatar-initials">${S.escapeHtml(friend.display_name || friend.username || "?").charAt(0).toUpperCase()}</div>`;
            
            const overlay = createCallOverlay(`
                <div class="avatar avatar-xl">${avatar}</div>
                <div class="call-name">${S.escapeHtml(friend.display_name || friend.username)}</div>
                <div id="call-status-text" class="call-status">Звоним...</div>
                <button class="btn btn-danger btn-call-action" id="cancel-call-btn">
                    <i class="fa-solid fa-phone-slash"></i>
                </button>
            `);
            document.body.appendChild(overlay);
            
            document.getElementById("cancel-call-btn")?.addEventListener("click", () => cancelCall(roomName, friend.id));
            monitorCallStatus(roomName, friend, true);
        }

        function showIncomingCallUI(call) {
            hideAllVoiceUI();
            startRingtone();

            const avatar = call.profile?.avatar_url ?
                `<img src="${S.escapeHtml(call.profile.avatar_url)}" alt="Avatar">` :
                `<div class="avatar-initials">${S.escapeHtml(call.caller_name || "?").charAt(0).toUpperCase()}</div>`;

            const overlay = createCallOverlay(`
                <div class="avatar avatar-xl">${avatar}</div>
                <div class="call-name">${S.escapeHtml(call.caller_name || "Неизвестный")}</div>
                <div class="call-status">Входящий звонок...</div>
                <div class="call-actions">
                    <button class="btn btn-danger btn-call-action" id="decline-call-btn">
                        <i class="fa-solid fa-phone-slash"></i>
                    </button>
                    <button class="btn btn-primary btn-call-action" id="accept-call-btn">
                        <i class="fa-solid fa-phone"></i>
                    </button>
                </div>
            `);
            document.body.appendChild(overlay);

            document.getElementById("decline-call-btn")?.addEventListener("click", () => declineCall(call));
            document.getElementById("accept-call-btn")?.addEventListener("click", () => acceptCall(call));

            // Auto-decline after 25 seconds
            setTimeout(() => {
                if (document.getElementById("voice-call-overlay")) {
                    declineCall(call);
                }
            }, 25000);
        }
        
        function showFullCallUI(friend) {
            hideAllVoiceUI();
            const friendName = S.escapeHtml(friend.display_name || friend.username);
            const overlay = document.createElement("div");
            overlay.id = "voice-call-overlay";
            overlay.className = "fullscreen";
            overlay.innerHTML = `
                <div class="call-container">
                    <div class="call-header">
                        <span class="call-title">${friendName}</span>
                        <button class="btn btn-icon btn-ghost btn-sm" id="call-hangup-btn" title="Завершить">
                            <i class="fa-solid fa-phone-slash"></i>
                        </button>
                    </div>
                    <div id="voice-video-grid" class="video-grid"></div>
                    <div class="call-controls">
                        <button class="btn btn-icon btn-sm" id="call-mic-btn" title="Микрофон"><i class="fa-solid fa-microphone"></i></button>
                        <button class="btn btn-icon btn-sm" id="call-deafen-btn" title="Звук"><i class="fa-solid fa-volume-high"></i></button>
                        <button class="btn btn-icon btn-sm" id="call-video-btn" title="Камера"><i class="fa-solid fa-video"></i></button>
                        <button class="btn btn-icon btn-sm" id="call-screen-btn" title="Показ экрана"><i class="fa-solid fa-desktop"></i></button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            document.getElementById("call-mic-btn")?.addEventListener("click", toggleMic);
            document.getElementById("call-deafen-btn")?.addEventListener("click", toggleDeafen);
            document.getElementById("call-video-btn")?.addEventListener("click", toggleVideo);
            document.getElementById("call-screen-btn")?.addEventListener("click", () => screenShareTrack ? stopScreenShare() : startScreenShare());
            document.getElementById("call-hangup-btn")?.addEventListener("click", leave);
            
            updateVoiceUI();
        }

        function createCallOverlay(content) {
            const overlay = document.createElement("div");
            overlay.id = "voice-call-overlay";
            overlay.className = "centered";
            overlay.innerHTML = `<div class="call-prompt">${content}</div>`;
            return overlay;
        }

        function hideAllVoiceUI() {
            document.getElementById("voice-bar")?.remove();
            document.getElementById("voice-call-overlay")?.remove();
        }

        function updateVoiceUI() {
            const micBtn = document.getElementById("call-mic-btn") || document.getElementById("v-mic");
            const deafenBtn = document.getElementById("call-deafen-btn") || document.getElementById("v-deafen");
            const videoBtn = document.getElementById("call-video-btn");
            const screenBtn = document.getElementById("call-screen-btn");
            const countEl = document.getElementById("voice-count");

            if (micBtn) {
                micBtn.classList.toggle("active", isMicOn);
                micBtn.classList.toggle("danger", !isMicOn);
                micBtn.querySelector("i").className = `fa-solid ${isMicOn ? 'fa-microphone' : 'fa-microphone-slash'}`;
            }
            if (deafenBtn) {
                deafenBtn.classList.toggle("active", !isDeafened);
                deafenBtn.classList.toggle("danger", isDeafened);
                deafenBtn.querySelector("i").className = `fa-solid ${isDeafened ? 'fa-volume-xmark' : 'fa-volume-high'}`;
            }
            if (videoBtn) {
                videoBtn.classList.toggle("active", !!localVideoTrack);
            }
            if (screenBtn) {
                screenBtn.classList.toggle("active", !!screenShareTrack);
            }
            if (countEl && room) {
                countEl.textContent = `${room.participants.size + 1} участ.`;
            }
        }

        // --- Media & Device Controls ---
        function toggleMic() {
            if (!localAudioTrack) return;
            isMicOn = !isMicOn;
            localAudioTrack.setMuted(!isMicOn);
            updateVoiceUI();
        }

        function toggleDeafen() {
            if (!room) return;
            isDeafened = !isDeafened;
            room.remoteParticipants.forEach(p => {
                p.audioTracks.forEach(t => {
                    const el = document.getElementById(`audio-${p.identity}`);
                    if (el) el.muted = isDeafened;
                });
            });
            if (isDeafened && isMicOn) toggleMic();
            updateVoiceUI();
        }

        async function toggleVideo() {
            if (!room) return;
            if (localVideoTrack) {
                await room.localParticipant.unpublishTrack(localVideoTrack.track);
                localVideoTrack.stop();
                localVideoTrack = null;
            } else {
                try {
                    localVideoTrack = await LivekitClient.createLocalVideoTrack({ facingMode: "user" });
                    await room.localParticipant.publishTrack(localVideoTrack);
                } catch (e) {
                    S.toast.show("Не удалось получить доступ к камере.", "error");
                    console.warn("[Voice] Could not publish video:", e);
                }
            }
            updateVoiceUI();
        }

        async function startScreenShare() {
            if (!room || screenShareTrack) return;
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenShareTrack = stream.getVideoTracks()[0];
                await room.localParticipant.publishTrack(screenShareTrack, { name: "screen", simulcast: false });
                screenShareTrack.addEventListener("ended", () => {
                    stopScreenShare();
                });
                updateVoiceUI();
            } catch (e) {
                S.toast.show("Не удалось начать показ экрана.", "error");
                console.warn("[Voice] Could not start screen share:", e);
            }
        }

        async function stopScreenShare() {
            if (!room || !screenShareTrack) return;
            await room.localParticipant.unpublishTrack(screenShareTrack);
            screenShareTrack.stop();
            screenShareTrack = null;
            updateVoiceUI();
        }

        // --- Call Lifecycle & Signaling ---
        async function acceptCall(call) {
            stopRingtone();
            try {
                await sb.from("calls").update({ status: "accepted" }).eq("id", call.id);
                hideAllVoiceUI();
                const friendProfile = {
                    id: call.caller_id,
                    display_name: call.caller_name,
                    username: call.caller_name,
                    avatar_url: call.profile?.avatar_url
                };
                connectDirectCall(friendProfile, call.room_name);
            } catch (e) {
                console.error("[Voice] Failed to accept call:", e);
            }
        }

        async function declineCall(call) {
            stopRingtone();
            try {
                await sb.from("calls").update({ status: "declined" }).eq("id", call.id);
            } catch(e) {
                console.warn("[Voice] Failed to update call status to declined:", e);
            }
            hideAllVoiceUI();
        }

        async function cancelCall(roomName, friendId) {
            try {
                await sb.from("calls").delete().match({ room_name: roomName, caller_id: S.user.id });
            } catch(e) {
                console.warn("[Voice] Failed to delete call record:", e);
            }
            hideAllVoiceUI();
        }

        async function connectDirectCall(friend, roomName) {
            if (room && room.state === "connected") await leave();
            
            currentChannel = { id: roomName, name: friend.display_name || friend.username, type: "voice", friend };
            const token = await getLiveKitToken(roomName, S.profile.username || S.user.email);
            if (!token) {
                S.toast.show("Ошибка подключения к звонку.", "error");
                return;
            }

            try {
                room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });
                room.on("connected", () => showFullCallUI(friend));
                bindRoomEvents();
                await room.connect(S.SENTCOR_CONFIG.LIVEKIT_URL, token);
                await publishLocalMedia();
                updateVoiceUI();
            } catch (e) {
                console.error("[Voice] Failed to connect to direct call:", e);
                S.toast.show(`Ошибка звонка: ${e.message}`, "error");
            }
        }

        function monitorCallStatus(roomName, friend, isOutgoing) {
            unsubscribeFromCall();
            callSubscription = sb.channel(`calls-${roomName}`)
                .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls", filter: `room_name=eq.${roomName}` }, payload => {
                    const call = payload.new;
                    if (call.status === "accepted" && isOutgoing) {
                        hideAllVoiceUI();
                        unsubscribeFromCall();
                        connectDirectCall(friend, roomName);
                    } else if (call.status === "declined") {
                        hideAllVoiceUI();
                        unsubscribeFromCall();
                        S.toast.show("Абонент отклонил звонок.", "info");
                    }
                }).subscribe();
        }

        async function listenForIncomingCalls() {
            if (!S.user) return;
            try {
                sb.channel("my-calls")
                    .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${S.user.id}` }, async payload => {
                        const call = payload.new;
                        if (call.status !== "ringing") return;

                        const { data: profile } = await sb.from("profiles").select("username, display_name, avatar_url").eq("id", call.caller_id).single();
                        call.profile = profile || {};
                        call.caller_name = profile?.display_name || call.caller_name;
                        
                        showIncomingCallUI(call);
                    }).subscribe();
            } catch (e) {
                console.warn("[Voice] Call listener failed to subscribe:", e);
            }
        }

        function unsubscribeFromCall() {
            if (callSubscription) {
                sb.removeChannel(callSubscription).catch(() => {});
                callSubscription = null;
            }
        }

        // --- Helpers ---
        async function getLiveKitToken(roomName, participantName) {
            try {
                const { data, error } = await S.sb.functions.invoke("livekit-token", {
                    body: { roomName: `sentcor_voice_${roomName}`, participantName, userId: S.user.id }
                });
                if (error) throw error;
                return data?.token || null;
            } catch (e) {
                console.error("[Voice] LiveKit token function failed:", e);
                S.toast.show("Edge Function для LiveKit не настроена или не отвечает.", "error", 8000);
                return null;
            }
        }
        
        let ringtoneContext = null;
        let ringtoneInterval = null;
        function startRingtone() {
            stopRingtone();
            try {
                ringtoneContext = new (window.AudioContext || window.webkitAudioContext)();
                let i = 0;
                ringtoneInterval = setInterval(() => {
                    const oscillator = ringtoneContext.createOscillator();
                    const gainNode = ringtoneContext.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(ringtoneContext.destination);
                    
                    gainNode.gain.setValueAtTime(0, ringtoneContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.1, ringtoneContext.currentTime + 0.01);
                    
                    oscillator.frequency.setValueAtTime(i % 2 === 0 ? 880 : 1046.5, ringtoneContext.currentTime);
                    oscillator.type = 'sine';
                    
                    oscillator.start(ringtoneContext.currentTime);
                    oscillator.stop(ringtoneContext.currentTime + 0.15);
                    
                    gainNode.gain.exponentialRampToValueAtTime(0.00001, ringtoneContext.currentTime + 0.15);
                    i++;
                }, 400);
            } catch(e) {
                console.warn("[Voice] Could not play ringtone:", e);
            }
        }

        function stopRingtone() {
            if (ringtoneInterval) clearInterval(ringtoneInterval);
            if (ringtoneContext) ringtoneContext.close().catch(() => {});
            ringtoneInterval = null;
            ringtoneContext = null;
        }

        // --- Public API ---
        S.voice = {
            join: joinVoiceChannel,
            leave,
            call: startDirectCall,
            listen: listenForIncomingCalls,
            toggleMic,
            toggleDeafen,
            toggleVideo,
            startScreenShare,
            stopScreenShare
        };

    })();
} catch (err) {
    console.error("A critical error occurred in the Voice module. The module will be disabled.", err);
    if (window.S) {
        window.S.voice = {
            join: () => console.error("Voice module is disabled."),
            leave: () => console.error("Voice module is disabled."),
            call: () => console.error("Voice module is disabled."),
            listen: () => console.error("Voice module is disabled."),
        };
    }
}