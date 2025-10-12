# Мультиплеер для ДУЕЛОГ

## Статус: В разработке

Кнопка "Сетевая игра" в главном меню пока неактивна (помечена как `disabled`).

## Архитектура

### Файлы
- `multiplayer.js` - Клиентская логика для сетевой игры
- `game.js` - Основная игровая логика (готова к интеграции)

### Класс MultiplayerManager

Управляет WebSocket соединением и синхронизацией игры между игроками.

**Основные методы:**
- `connect(serverUrl)` - Подключение к серверу
- `createRoom()` - Создание комнаты для игры
- `joinRoom(roomId)` - Присоединение к комнате
- `sendMove(cardData)` - Отправка хода
- `syncGameState(gameState)` - Синхронизация состояния (только хост)

**События (колбэки):**
- `onConnect()` - Успешное подключение
- `onRoomCreated(roomId)` - Комната создана
- `onOpponentJoined(opponentId)` - Противник присоединился
- `onOpponentMove(card)` - Противник сыграл карту
- `onGameStateUpdate(state)` - Обновление состояния игры

## Что нужно для запуска

### 1. WebSocket сервер

Необходимо создать Node.js сервер с поддержкой WebSocket:

```javascript
// server.js (пример)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch(data.type) {
            case 'CREATE_ROOM':
                // Создать комнату
                break;
            case 'JOIN_ROOM':
                // Присоединиться к комнате
                break;
            case 'PLAYER_MOVE':
                // Передать ход другому игроку
                break;
        }
    });
});
```

### 2. Интеграция с game.js

В `game.js` нужно добавить:

```javascript
// Создать экземпляр мультиплеера
const multiplayer = new MultiplayerManager();

// Настроить колбэки
multiplayer.onOpponentMove = (card) => {
    // Применить ход противника
    gameEngine.applyCard(card, gameEngine.enemy, gameEngine.player);
};

// При ходе игрока отправлять на сервер
multiplayer.sendMove(cardData);
```

### 3. UI для мультиплеера

Нужно добавить экраны:
- Создание/подключение к комнате
- Ожидание противника
- Отображение имени противника
- Индикатор соединения

## Протокол сообщений

### От клиента к серверу:
```json
{
  "type": "CREATE_ROOM",
  "playerId": "player_123"
}

{
  "type": "JOIN_ROOM",
  "roomId": "ROOM123",
  "playerId": "player_456"
}

{
  "type": "PLAYER_MOVE",
  "roomId": "ROOM123",
  "playerId": "player_123",
  "card": {
    "name": "Факт о кофеине",
    "category": "Атака",
    "damage": 2
  }
}
```

### От сервера к клиенту:
```json
{
  "type": "ROOM_CREATED",
  "roomId": "ROOM123"
}

{
  "type": "OPPONENT_JOINED",
  "opponentId": "player_456"
}

{
  "type": "OPPONENT_MOVE",
  "card": { ... }
}

{
  "type": "GAME_STATE",
  "state": {
    "player1": { ... },
    "player2": { ... },
    "turn": 5
  }
}
```

## Безопасность

⚠️ **Важно реализовать на сервере:**
- Валидация всех ходов
- Проверка очередности
- Защита от читов (проверка возможности хода)
- Тайм-ауты на ходы
- Реконнект при разрыве соединения

## Дальнейшие шаги

1. ✅ Создан темплейт `MultiplayerManager`
2. ⬜ Разработать WebSocket сервер
3. ⬜ Интегрировать с `game.js`
4. ⬜ Создать UI для мультиплеера
5. ⬜ Тестирование и отладка
6. ⬜ Активировать кнопку в меню

## Примерный срок реализации

- Backend (WebSocket сервер): 2-3 дня
- Frontend интеграция: 1-2 дня
- UI и тестирование: 1-2 дня

**Итого: ~5-7 дней работы**
