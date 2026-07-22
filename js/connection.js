// SENTCOR Connection Manager v1.0
(function() {
    "use strict";

    window.SENTCOR = window.SENTCOR || {};
    const S = window.SENTCOR;

    let heartbeatInterval = null;
    const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

    /**
     * Checks the status of the Supabase Realtime connection and attempts to reconnect if necessary.
     */
    function checkConnection() {
        if (!S.sb || !S.sb.realtime) {
            console.warn("ConnectionManager: Supabase client not available yet.");
            return;
        }

        const status = S.sb.realtime.status;
        console.log(`ConnectionManager: Heartbeat - Realtime status is [${status}]`);

        if (status !== 'connected') {
            console.warn(`ConnectionManager: Realtime disconnected. Attempting to reconnect...`);
            S.toast.show("Восстанавливаем соединение...", "warning", 2000);
            S.sb.realtime.connect();
        }
    }

    /**
     * Starts the WebSocket heartbeat to ensure the connection remains active.
     */
    function startHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
        console.log(`ConnectionManager: Starting heartbeat every ${HEARTBEAT_INTERVAL_MS / 1000} seconds.`);
        heartbeatInterval = setInterval(checkConnection, HEARTBEAT_INTERVAL_MS);
    }

    /**
     * Stops the WebSocket heartbeat.
     */
    function stopHeartbeat() {
        if (heartbeatInterval) {
            console.log("ConnectionManager: Stopping heartbeat.");
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    /**
     * Handles browser visibility changes to optimize connection management.
     */
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            console.log("ConnectionManager: Tab is visible again. Checking connection.");
            // Give Supabase a moment to auto-reconnect, then check forcefully.
            setTimeout(checkConnection, 2000); 
            startHeartbeat();
        } else {
            console.log("ConnectionManager: Tab is hidden. Pausing heartbeat.");
            stopHeartbeat();
        }
    }
    
    /**
     * Handles browser online/offline status changes.
     */
    function handleOnlineStatus() {
        if (navigator.onLine) {
            console.log("ConnectionManager: Browser is back online. Checking connection.");
            S.toast.show("Соединение восстановлено", "success", 3000);
            setTimeout(checkConnection, 1000);
            startHeartbeat();
        } else {
            console.error("ConnectionManager: Browser is offline. Realtime connection will be lost.");
            S.toast.show("Отсутствует подключение к сети", "error", 10000);
            stopHeartbeat();
        }
    }


    /**
     * Initializes the connection manager and sets up all event listeners.
     */
    function init() {
        console.log("ConnectionManager: Initializing...");
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOnlineStatus);
        
        startHeartbeat();
        console.log("ConnectionManager: Initialized.");
    }

    S.connection = {
        init
    };

})();