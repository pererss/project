// SENTCOR Connection Manager v3.0 - Centralized Realtime Hub
(function() {
    "use strict";

    if (!window.SENTCOR) {
        console.error("[Connection] Critical: SENTCOR base not found.");
        return;
    }
    const S = window.SENTCOR;

    // --- Module State ---
    let heartbeatInterval = null;
    const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
    let currentStatus = 'disconnected';
    let mainChannel = null;
    let isInitialized = false;
    let reconnectTimer = null;

    // --- Private Functions ---

    /**
     * Dispatches incoming real-time payloads to the relevant modules.
     * @param {object} payload - The Supabase real-time payload.
     */
    function delegateRealtimePayload(payload) {
        console.log('[Connection] Realtime event received:', payload);
        const { table, eventType, new: newRecord, old: oldRecord } = payload;

        if (table === 'profiles' && S.friends) {
            S.friends.handleProfileUpdate(newRecord);
        }

        if ((table === 'direct_messages' || table === 'messages') && eventType === 'INSERT' && S.chat) {
            S.chat.handleRealtimeMessageEvent(payload);
        }
        
        if (table === 'voice_participants' && S.voice) {
            S.voice.handleParticipantUpdate(payload);
        }
    }

    /**
     * Subscribes to the main user channel for global events.
     */
    function subscribeToChannel() {
        if (!S.sb || !S.user) {
            console.error("[Connection] Cannot subscribe: Supabase client or user is missing.");
            return;
        }

        if (mainChannel) {
            S.sb.removeChannel(mainChannel);
            mainChannel = null;
        }

        try {
            // This channel is for global notifications like profile updates
            const channelName = `global-feed`;
            mainChannel = S.sb.channel(channelName, {
                config: { broadcast: { self: false } } // Don't receive our own broadcasts
            });

            mainChannel
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, delegateRealtimePayload)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, delegateRealtimePayload)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, delegateRealtimePayload)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_participants' }, delegateRealtimePayload)
                .subscribe((status, err) => {
                    currentStatus = status;
                    console.log(`[Connection] Realtime status: ${status}`);

                    switch (status) {
                        case 'SUBSCRIBED':
                            S.toast.show("Realtime-соединение установлено", "success", 2000);
                            startHeartbeat();
                            if(reconnectTimer) clearTimeout(reconnectTimer);
                            break;
                        case 'CHANNEL_ERROR':
                        case 'TIMED_OUT':
                            console.error(`[Connection] Subscription failed:`, err);
                            S.toast.show(`Ошибка Realtime: ${err.message}`, "error", 5000);
                            scheduleReconnect();
                            break;
                        case 'CLOSED':
                            console.warn("[Connection] Realtime channel closed unexpectedly.");
                            scheduleReconnect();
                            break;
                    }
                });
        } catch (e) {
            console.error("[Connection] Critical error during channel subscription:", e);
            S.toast.show("Критическая ошибка Realtime-подключения", "error");
            currentStatus = 'failed';
        }
    }
    
    /**
     * Schedules a reconnection attempt with a backoff strategy.
     */
    function scheduleReconnect() {
        stopHeartbeat();
        if (reconnectTimer) clearTimeout(reconnectTimer);
        
        if (navigator.onLine) {
            console.log("[Connection] Scheduling reconnect in 5 seconds...");
            S.toast.show("Соединение потеряно. Попытка восстановления...", "warning", 4000);
            reconnectTimer = setTimeout(checkConnection, 5000);
        }
    }

    /**
     * Checks the connection status and attempts to re-subscribe if necessary.
     */
    function checkConnection() {
        if (currentStatus !== 'SUBSCRIBED' && navigator.onLine) {
            console.warn(`[Connection] Status is '${currentStatus}'. Attempting to re-subscribe...`);
            subscribeToChannel();
        }
    }

    function startHeartbeat() {
        stopHeartbeat();
        console.log(`[Connection] Starting heartbeat check every ${HEARTBEAT_INTERVAL_MS}ms.`);
        heartbeatInterval = setInterval(checkConnection, HEARTBEAT_INTERVAL_MS);
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
            console.log("[Connection] Heartbeat stopped.");
        }
    }

    // --- Event Handlers ---
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            console.log("[Connection] Tab is visible. Checking connection.");
            setTimeout(checkConnection, 1000); // Delay to allow network to settle
        }
    }

    function handleOnlineStatus() {
        if (navigator.onLine) {
            console.log("[Connection] Browser is online. Re-checking connection.");
            S.toast.show("Сеть восстановлена", "success");
            setTimeout(checkConnection, 2000);
        } else {
            console.error("[Connection] Browser is offline.");
            S.toast.show("Отсутствует подключение к сети", "error", 10000);
            currentStatus = 'disconnected';
            stopHeartbeat();
        }
    }

    // --- Public API ---
    function init() {
        if (isInitialized) {
            console.warn("[Connection] Already initialized. Ignoring call.");
            return;
        }
        if (!S.user || !S.sb) {
            console.error("[Connection] Cannot initialize without a user and Supabase client.");
            return;
        }

        console.log("[Connection] Initializing Realtime Hub...");
        subscribeToChannel();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOnlineStatus);
        
        isInitialized = true;
    }

    function disconnect() {
        if (!isInitialized) return;
        
        console.log("[Connection] Disconnecting Realtime Hub...");
        stopHeartbeat();
        if (reconnectTimer) clearTimeout(reconnectTimer);
        
        if (mainChannel) {
            S.sb.removeChannel(mainChannel).catch(err => console.error("[Connection] Error removing channel on disconnect:", err));
            mainChannel = null;
        }

        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnlineStatus);
        window.removeEventListener('offline', handleOnlineStatus);

        isInitialized = false;
        currentStatus = 'disconnected';
        console.log("[Connection] Disconnected.");
    }

    S.connection = {
        init,
        disconnect
    };

})();