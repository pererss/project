// SENTCOR Connection Manager v1.1
(function() {
    "use strict";

    window.SENTCOR = window.SENTCOR || {};
    const S = window.SENTCOR;

    let heartbeatInterval = null;
    const HEARTBEAT_INTERVAL_MS = 30000;
    let currentRealtimeStatus = 'disconnected';
    let mainChannel = null;

    function subscribeToChannel() {
        if (!S.sb || !S.user) return;
        
        const channelName = `realtime:user:${S.user.id}`;
        mainChannel = S.sb.channel(channelName, {
            config: {
                broadcast: {
                    self: true,
                },
            },
        });

        mainChannel.on('postgres_changes', { event: '*', schema: 'public' }, payload => {
            // This is where you'd handle incoming realtime messages
            // For now, we just use it to monitor connection status
            console.log('Realtime event received:', payload);
        });

        mainChannel.subscribe((status, err) => {
            currentRealtimeStatus = status;
            console.log(`ConnectionManager: Realtime subscription status is [${status}]`);

            if (status === 'SUBSCRIBED') {
                S.toast.show("Соединение установлено", "success", 3000);
                startHeartbeat();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.error(`ConnectionManager: Subscription failed with status [${status}]`, err);
                S.toast.show("Ошибка подключения к Realtime", "error", 5000);
                stopHeartbeat();
            } else if (status === 'CLOSED') {
                console.warn("ConnectionManager: Realtime channel closed.");
                stopHeartbeat();
            }
        });
    }

    function checkConnection() {
        console.log(`ConnectionManager: Heartbeat - Current status is [${currentRealtimeStatus}]`);

        if (currentRealtimeStatus !== 'SUBSCRIBED') {
            console.warn(`ConnectionManager: Realtime not subscribed. Attempting to re-subscribe...`);
            S.toast.show("Восстанавливаем соединение...", "warning", 2000);
            if (mainChannel) {
                mainChannel.subscribe(); // Attempt to re-subscribe
            } else {
                subscribeToChannel(); // Or create a new subscription
            }
        }
    }

    function startHeartbeat() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        console.log(`ConnectionManager: Starting heartbeat every ${HEARTBEAT_INTERVAL_MS / 1000} seconds.`);
        heartbeatInterval = setInterval(checkConnection, HEARTBEAT_INTERVAL_MS);
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            console.log("ConnectionManager: Stopping heartbeat.");
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            console.log("ConnectionManager: Tab is visible again. Checking connection.");
            // Don't call auth logic, just check the connection status.
            setTimeout(checkConnection, 1000);
        } else {
            console.log("ConnectionManager: Tab is hidden. Heartbeat will continue but checks will be less frequent if browser throttles timers.");
        }
    }

    function handleOnlineStatus() {
        if (navigator.onLine) {
            console.log("ConnectionManager: Browser is back online. Checking connection.");
            S.toast.show("Соединение с интернетом восстановлено", "success", 3000);
            setTimeout(checkConnection, 1000);
        } else {
            console.error("ConnectionManager: Browser is offline. Realtime connection will be lost.");
            S.toast.show("Отсутствует подключение к сети", "error", 10000);
            currentRealtimeStatus = 'disconnected'; // Manually set status
            stopHeartbeat();
        }
    }

    function init() {
        console.log("ConnectionManager: Initializing...");
        
        // Wait for user to be available
        const waitForUser = setInterval(() => {
            if (S.user) {
                clearInterval(waitForUser);
                subscribeToChannel();
                document.addEventListener('visibilitychange', handleVisibilityChange);
                window.addEventListener('online', handleOnlineStatus);
                window.addEventListener('offline', handleOnlineStatus);
                console.log("ConnectionManager: Initialized for user.");
            }
        }, 100);
    }

    S.connection = {
        init
    };

})();