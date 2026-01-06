// Сетевая игра ДУЕЛОГ с улучшенной обработкой ошибок
class MultiplayerManager {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerId = null;
        this.playerNickname = null;
        this.isHost = false;
        this.connected = false;

        // Retry logic
        this.maxRetries = 3;
        this.retryCount = 0;
        this.retryDelay = 1000; // 1 second
        this.isReconnecting = false;
        this.serverUrl = null;

        // Heartbeat
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
        this.heartbeatFrequency = 30000; // 30 seconds
        this.heartbeatTimeoutDuration = 10000; // 10 seconds

        // Message queue for offline messages
        this.messageQueue = [];
        this.isDestroyed = false;
    }

    // Подключение к серверу с retry logic
    connect(serverUrl) {
        if (this.isDestroyed) {
            return Promise.reject(new Error('Manager destroyed'));
        }

        this.serverUrl = serverUrl;
        return new Promise((resolve, reject) => {
            try {
                if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
                    console.warn('WebSocket already connecting or connected');
                    return resolve();
                }

                this.ws = new WebSocket(serverUrl);
                let connectionTimeout = setTimeout(() => {
                    if (this.ws.readyState === WebSocket.CONNECTING) {
                        console.error('Connection timeout');
                        this.ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

                this.ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    console.log('✅ Подключено к серверу');
                    this.connected = true;
                    this.retryCount = 0;
                    this.isReconnecting = false;
                    this.startHeartbeat();
                    this.flushMessageQueue();
                    this.onConnect();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);

                        // Validate message structure
                        if (!this.validateMessage(message)) {
                            console.error('❌ Invalid message format:', message);
                            return;
                        }

                        // Handle heartbeat
                        if (message.type === 'PONG') {
                            this.handlePong();
                            return;
                        }

                        this.handleMessage(message);
                    } catch (error) {
                        console.error('❌ Error parsing message:', error);
                        this.onError(error);
                    }
                };

                this.ws.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.error('❌ WebSocket error:', error);
                    this.onError(error);
                };

                this.ws.onclose = (event) => {
                    clearTimeout(connectionTimeout);
                    console.log('🔌 Connection closed:', event.code, event.reason);
                    this.connected = false;
                    this.stopHeartbeat();
                    this.onDisconnect();

                    // Try to reconnect if not intentional disconnect
                    if (!this.isDestroyed && event.code !== 1000 && !this.isReconnecting) {
                        this.attemptReconnect();
                    } else if (event.code !== 1000) {
                        reject(new Error(`Connection closed: ${event.reason || event.code}`));
                    }
                };
            } catch (error) {
                console.error('❌ Connection error:', error);
                this.onError(error);
                reject(error);
            }
        });
    }

    // Попытка переподключения
    attemptReconnect() {
        if (this.isReconnecting || this.isDestroyed || this.retryCount >= this.maxRetries) {
            if (this.retryCount >= this.maxRetries) {
                console.error('❌ Max reconnection attempts reached');
                this.onError(new Error('Max reconnection attempts reached'));
            }
            return;
        }

        this.isReconnecting = true;
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Exponential backoff

        console.log(`🔄 Reconnecting... Attempt ${this.retryCount}/${this.maxRetries} in ${delay}ms`);

        setTimeout(() => {
            if (this.isDestroyed) return;

            this.connect(this.serverUrl)
                .then(() => {
                    console.log('✅ Reconnected successfully');
                    // Rejoin room if we were in one
                    if (this.roomId) {
                        console.log('🔄 Rejoining room...');
                        this.joinRoom(this.roomId);
                    }
                })
                .catch((error) => {
                    console.error('❌ Reconnection failed:', error);
                    this.isReconnecting = false;
                    if (this.retryCount < this.maxRetries) {
                        this.attemptReconnect();
                    }
                });
        }, delay);
    }

    // Валидация входящих сообщений
    validateMessage(message) {
        if (!message || typeof message !== 'object') {
            return false;
        }

        if (!message.type || typeof message.type !== 'string') {
            return false;
        }

        // Type-specific validation
        switch (message.type) {
            case 'ROOM_CREATED':
            case 'ROOM_JOINED':
                return typeof message.roomId === 'string' && message.roomId.length === 6;

            case 'OPPONENT_JOINED':
                return typeof message.opponentId === 'string';

            case 'OPPONENT_MOVE':
                return message.card && typeof message.card === 'object' && message.card.name;

            case 'SYNC_STATE':
                return message.state && typeof message.state === 'object';

            case 'ERROR':
                return typeof message.error === 'string';

            case 'GAME_START':
            case 'OPPONENT_DISCONNECTED':
            case 'PONG':
                return true;

            default:
                console.warn('Unknown message type:', message.type);
                return true; // Allow unknown types to pass through
        }
    }

    // Создать комнату
    createRoom() {
        if (!this.connected) return;

        this.isHost = true;
        this.send({
            type: 'CREATE_ROOM',
            playerId: this.playerId,
            nickname: this.playerNickname || 'Игрок'
        });
    }

    // Присоединиться к комнате
    joinRoom(roomId) {
        if (!this.connected) return;

        this.roomId = roomId;
        this.send({
            type: 'JOIN_ROOM',
            roomId: roomId,
            playerId: this.playerId,
            nickname: this.playerNickname || 'Игрок'
        });
    }

    // Отправить ход
    sendMove(cardData) {
        if (!this.connected || !this.roomId) return;

        this.send({
            type: 'PLAYER_MOVE',
            roomId: this.roomId,
            card: cardData
        });
    }

    // Отправить полное состояние игры
    sendGameState(state) {
        if (!this.connected || !this.roomId || !this.isHost) return;

        this.send({
            type: 'SYNC_STATE',
            roomId: this.roomId,
            state: state
        });
    }

    // Обработка входящих сообщений
    handleMessage(message) {
        console.log('Получено сообщение:', message.type);
        switch (message.type) {
            case 'ROOM_CREATED':
                this.roomId = message.roomId;
                this.onRoomCreated(message.roomId);
                break;

            case 'ROOM_JOINED':
                this.onRoomJoined(message.roomId);
                break;

            case 'OPPONENT_JOINED':
                this.onOpponentJoined(message.opponentId, message.opponentNickname);
                break;

            case 'GAME_START':
                this.onGameStart(message);
                break;

            case 'OPPONENT_MOVE':
                this.onOpponentMove(message.card);
                break;

            case 'SYNC_STATE':
                this.onGameStateSync(message.state);
                break;

            case 'OPPONENT_DISCONNECTED':
                this.onOpponentDisconnected();
                break;

            case 'ERROR':
                this.onError(message.error);
                break;

            default:
                console.warn('Неизвестный тип сообщения:', message.type);
        }
    }

    // Отправить сообщение с очередью
    send(data) {
        if (!data || typeof data !== 'object') {
            console.error('❌ Invalid data to send:', data);
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(data));
            } catch (error) {
                console.error('❌ Error sending message:', error);
                this.messageQueue.push(data);
            }
        } else {
            // Queue message for later
            console.warn('⚠️ WebSocket not ready, queueing message');
            this.messageQueue.push(data);
        }
    }

    // Отправить все сообщения из очереди
    flushMessageQueue() {
        if (this.messageQueue.length === 0) return;

        console.log(`📤 Flushing ${this.messageQueue.length} queued messages`);
        while (this.messageQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = this.messageQueue.shift();
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('❌ Error flushing message:', error);
                // Put it back in queue
                this.messageQueue.unshift(message);
                break;
            }
        }
    }

    // Heartbeat механизм
    startHeartbeat() {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send({ type: 'PING' });

                // Set timeout for pong response
                this.heartbeatTimeout = setTimeout(() => {
                    console.warn('⚠️ Heartbeat timeout - no PONG received');
                    if (this.ws) {
                        this.ws.close();
                    }
                }, this.heartbeatTimeoutDuration);
            }
        }, this.heartbeatFrequency);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    handlePong() {
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    // Отключиться
    disconnect() {
        this.isDestroyed = true;
        this.stopHeartbeat();
        this.messageQueue = [];

        if (this.ws) {
            try {
                this.ws.close(1000, 'Client disconnect');
            } catch (error) {
                console.error('Error closing WebSocket:', error);
            }
            this.ws = null;
        }

        this.connected = false;
        this.roomId = null;
        this.retryCount = 0;
        this.isReconnecting = false;
    }

    // Колбэки (переопределяются извне)
    onConnect() { console.log('MultiplayerManager: Connected'); }
    onDisconnect() { console.log('MultiplayerManager: Disconnected'); }
    onRoomCreated(roomId) { console.log('MultiplayerManager: Room created:', roomId); }
    onRoomJoined(roomId) { console.log('MultiplayerManager: Room joined:', roomId); }
    onOpponentJoined(opponentId, opponentNickname) { console.log('MultiplayerManager: Opponent joined:', opponentId, opponentNickname); }
    onGameStart(data) { console.log('MultiplayerManager: Game starting:', data); }
    onOpponentMove(card) { console.log('MultiplayerManager: Opponent played card:', card); }
    onGameStateSync(state) { console.log('MultiplayerManager: Game state synced:', state); }
    onOpponentDisconnected() { console.log('MultiplayerManager: Opponent disconnected'); }
    onError(error) { console.error('MultiplayerManager: Error:', error); }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerManager;
}
