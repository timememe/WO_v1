// Темплейт для сетевой игры ДУЕЛОГ
// TODO: Реализовать WebSocket соединение и синхронизацию игры

class MultiplayerManager {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerId = null;
        this.playerNickname = null;
        this.isHost = false;
        this.connected = false;
    }

    // Подключение к серверу
    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);

                this.ws.onopen = () => {
                    console.log('Подключено к серверу');
                    this.connected = true;
                    this.onConnect();
                    resolve(); // Resolve the promise on successful connection
                };

                this.ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket ошибка:', error);
                    this.onError(error);
                    reject(error); // Reject the promise on error
                };

                this.ws.onclose = () => {
                    console.log('Соединение закрыто');
                    this.connected = false;
                    this.onDisconnect();
                };
            } catch (error) {
                console.error('Ошибка подключения:', error);
                this.onError(error);
                reject(error); // Reject the promise on error
            }
        });
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

    // Отправить сообщение
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // Отключиться
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.roomId = null;
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
