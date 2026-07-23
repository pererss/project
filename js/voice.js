// ===============================================================
// SentCor Voice Module v5.0 - Isolated & Robust
// ===============================================================

// Правило №1: Гарантия глобального пространства имен
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};
window.S.auth = window.S.auth || {};
window.S.app = window.S.app || {};

// Правило №4: Полная изоляция модуля для предотвращения сбоев
try {
    (function(S) {
        "use strict";

        // Проверяем наличие LiveKitClient
        if (typeof LivekitClient === 'undefined') {
            throw new Error('LiveKitClient library is not loaded.');
        }

        const voice = {
            room: null,
            isConnected: false,

            /**
             * Подключается к голосовой комнате LiveKit.
             * @param {string} token - Токен доступа для LiveKit.
             * @param {string} serverUrl - URL сервера LiveKit.
             */
            async connect(token, serverUrl) {
                if (this.isConnected) {
                    console.log('[Voice] Already connected.');
                    return;
                }

                if (!token || !serverUrl) {
                    throw new Error('LiveKit token or server URL is missing.');
                }

                this.room = new LivekitClient.Room({
                    adaptiveStream: true,
                    dynacast: true,
                });

                S.ui.showLoading('Подключение к голосовому чату...');
                try {
                    await this.room.connect(serverUrl, token);
                    this.isConnected = true;
                    console.log('[Voice] Successfully connected to LiveKit room.');
                    S.toast.show('Вы в голосовом чате!', { type: 'success' });
                    // Здесь можно добавить логику обработки участников и треков
                } catch (error) {
                    console.error('[Voice] Failed to connect to LiveKit:', error);
                    S.toast.show('Не удалось подключиться к голосовому чату.', { type: 'error' });
                    this.isConnected = false;
                } finally {
                    S.ui.hideLoading();
                }
            },

            /**
             * Отключается от голосовой комнаты.
             */
            async disconnect() {
                if (!this.isConnected || !this.room) {
                    return;
                }
                try {
                    await this.room.disconnect();
                    this.isConnected = false;
                    this.room = null;
                    console.log('[Voice] Disconnected from LiveKit room.');
                    S.toast.show('Вы вышли из голосового чата.', { type: 'info' });
                } catch (error) {
                    console.error('[Voice] Error during disconnection:', error);
                }
            },

            /**
             * Переключает состояние микрофона.
             * @param {boolean} [forceState] - Принудительное состояние (true - вкл, false - выкл).
             */
            async toggleMute(forceState) {
                if (!this.isConnected || !this.room) return;
                
                const isMuted = this.room.localParticipant.isMicrophoneMuted;
                const newState = typeof forceState === 'boolean' ? !forceState : isMuted;

                try {
                    await this.room.localParticipant.setMicrophoneEnabled(newState);
                    console.log(`[Voice] Microphone ${newState ? 'enabled' : 'disabled'}.`);
                    // Здесь можно обновить иконку в UI
                } catch (error) {
                    console.error('[Voice] Failed to toggle microphone:', error);
                }
            }
        };

        // Экспорт публичных методов
        S.voice = voice;
        console.log('[Voice] Module loaded successfully.');

    })(window.S);

} catch (err) {
    console.warn('[Voice] Module skipped due to an error:', err.message);
    // Создаем заглушку, чтобы вызовы S.voice не приводили к ошибкам
    window.S.voice = {
        connect: () => console.warn('[Voice] Connect skipped: module failed to load.'),
        disconnect: () => {},
        toggleMute: () => {}
    };
}