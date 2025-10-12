// WebSocket сервер для мультиплеера ДУЕЛОГ
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Хранилище комнат
const rooms = new Map();

// Генерация ID комнаты
function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}

// Отправка сообщения клиенту
function sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// Broadcast всем в комнате
function broadcastToRoom(roomId, message, excludeWs = null) {
    const room = rooms.get(roomId);
    if (!room) return;

    [room.host, room.guest].forEach(client => {
        if (client && client !== excludeWs) {
            sendToClient(client, message);
        }
    });
}

console.log(`🎮 WebSocket сервер ДУЕЛОГ запущен на порту ${PORT}`);

wss.on('connection', (ws) => {
    console.log('✅ Новое подключение');

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('📨 Получено:', message.type);

            switch (message.type) {
                case 'CREATE_ROOM': {
                    const roomId = generateRoomId();
                    rooms.set(roomId, {
                        id: roomId,
                        host: ws,
                        guest: null,
                        hostId: message.playerId,
                        guestId: null,
                        gameState: null
                    });

                    ws.roomId = roomId;
                    ws.isHost = true;

                    sendToClient(ws, {
                        type: 'ROOM_CREATED',
                        roomId: roomId
                    });

                    console.log(`🏠 Комната создана: ${roomId}`);
                    break;
                }

                case 'JOIN_ROOM': {
                    const { roomId, playerId } = message;
                    const room = rooms.get(roomId);

                    if (!room) {
                        sendToClient(ws, {
                            type: 'ERROR',
                            error: 'Комната не найдена'
                        });
                        break;
                    }

                    if (room.guest) {
                        sendToClient(ws, {
                            type: 'ERROR',
                            error: 'Комната заполнена'
                        });
                        break;
                    }

                    room.guest = ws;
                    room.guestId = playerId;
                    ws.roomId = roomId;
                    ws.isHost = false;

                    sendToClient(ws, {
                        type: 'ROOM_JOINED',
                        roomId: roomId
                    });

                    // Уведомить хоста
                    sendToClient(room.host, {
                        type: 'OPPONENT_JOINED',
                        opponentId: playerId
                    });

                    console.log(`👥 Игрок присоединился к комнате ${roomId}`);

                    // Начать игру
                    broadcastToRoom(roomId, {
                        type: 'GAME_START',
                        hostId: room.hostId,
                        guestId: room.guestId
                    });

                    break;
                }

                case 'PLAYER_MOVE': {
                    const { roomId, card } = message;
                    const room = rooms.get(roomId);

                    if (!room) {
                        sendToClient(ws, {
                            type: 'ERROR',
                            error: 'Комната не найдена'
                        });
                        break;
                    }

                    // Отправить ход противнику
                    const opponent = ws.isHost ? room.guest : room.host;
                    if (opponent) {
                        sendToClient(opponent, {
                            type: 'OPPONENT_MOVE',
                            card: card
                        });
                    }

                    console.log(`🎴 Ход в комнате ${roomId}`);
                    break;
                }

                case 'SYNC_STATE': {
                    const { roomId, state } = message;
                    const room = rooms.get(roomId);

                    if (!room) break;

                    room.gameState = state;

                    // Отправить состояние гостю
                    if (room.guest) {
                        sendToClient(room.guest, {
                            type: 'GAME_STATE',
                            state: state
                        });
                    }

                    break;
                }

                case 'GAME_OVER': {
                    const { roomId, winner } = message;
                    broadcastToRoom(roomId, {
                        type: 'GAME_OVER',
                        winner: winner
                    });

                    console.log(`🏆 Игра окончена в комнате ${roomId}, победитель: ${winner}`);
                    break;
                }

                default:
                    console.log('⚠️  Неизвестный тип сообщения:', message.type);
            }
        } catch (error) {
            console.error('❌ Ошибка обработки сообщения:', error);
            sendToClient(ws, {
                type: 'ERROR',
                error: 'Ошибка сервера'
            });
        }
    });

    ws.on('close', () => {
        console.log('❌ Соединение закрыто');

        // Найти комнату и уведомить оппонента
        if (ws.roomId) {
            const room = rooms.get(ws.roomId);
            if (room) {
                const opponent = ws.isHost ? room.guest : room.host;
                if (opponent) {
                    sendToClient(opponent, {
                        type: 'OPPONENT_DISCONNECTED'
                    });
                }

                // Удалить комнату если оба игрока отключились
                if (!room.host || room.host.readyState !== WebSocket.OPEN) {
                    rooms.delete(ws.roomId);
                    console.log(`🗑️  Комната ${ws.roomId} удалена`);
                }
            }
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket ошибка:', error);
    });
});

// Очистка пустых комнат каждые 5 минут
setInterval(() => {
    rooms.forEach((room, roomId) => {
        const hostAlive = room.host && room.host.readyState === WebSocket.OPEN;
        const guestAlive = room.guest && room.guest.readyState === WebSocket.OPEN;

        if (!hostAlive && !guestAlive) {
            rooms.delete(roomId);
            console.log(`🗑️  Очистка неактивной комнаты ${roomId}`);
        }
    });
}, 5 * 60 * 1000);

console.log('✨ Сервер готов к работе');
