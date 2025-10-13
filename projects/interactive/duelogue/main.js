// ДУЕЛОГ - Главная точка входа и интеграция модулей
// Этот файл связывает все модули игры вместе

// Глобальные переменные для интеграции модулей
let gameEngine = null;
let cardManager = null;
let uiManager = null;
let visualManager = null;
let multiplayer = null;

// Менеджер колод
let deckManager = {
    decks: [],
    selectedDeckId: null,

    loadDecks() {
        // Используем встроенные данные вместо fetch
        if (typeof DECKS_DATA !== 'undefined') {
            this.decks = DECKS_DATA.decks;
            this.selectedDeckId = DECKS_DATA.default;
            console.log('✅ Колоды загружены из встроенных данных:', this.decks.length);
        } else {
            console.error('❌ DECKS_DATA не определен!');
            throw new Error('Данные о колодах не загружены');
        }
        return this.decks;
    },

    getSelectedDeck() {
        return this.decks.find(d => d.id === this.selectedDeckId);
    },

    selectDeck(deckId) {
        this.selectedDeckId = deckId;
        localStorage.setItem('selectedDeck', deckId);
    }
};

// Конфигурация
const CONFIG = {
    SERVER_URL: 'wss://wo-server-v1.onrender.com', // Production server
    DECKS_PATH: 'decks.json'
};

// ============= ИНИЦИАЛИЗАЦИЯ ИГРЫ =============

async function initGame() {
    try {
        console.log('🎮 Инициализация ДУЕЛОГ...');

        deckManager.loadDecks();
        console.log('✅ Колоды загружены:', deckManager.decks.length);

        const savedDeck = localStorage.getItem('selectedDeck');
        if (savedDeck && deckManager.decks.find(d => d.id === savedDeck)) {
            deckManager.selectedDeckId = savedDeck;
        }

        uiManager = new UIManager();
        console.log('✅ UI менеджер готов');

        visualManager = new VisualManager();
        console.log('✅ Визуальный менеджер готов');

        // Создаем единственный экземпляр MultiplayerManager
        multiplayer = new MultiplayerManager();
        multiplayer.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        console.log(`✅ Мультиплеер менеджер готов. ID игрока: ${multiplayer.playerId}`);

        renderDeckSelector();
        showMainMenu();
        console.log('✅ ДУЕЛОГ готов к игре');

    } catch (error) {
        console.error('❌ Ошибка инициализации игры:', error);
        alert('Ошибка загрузки игры. Проверьте консоль.');
    }
}

// ... (skip to multiplayer section)

async function showMultiplayerScreen() {
    const multiplayerScreen = document.getElementById('multiplayerScreen');
    const menuScreen = document.getElementById('menuScreen');

    if (multiplayerScreen) multiplayerScreen.classList.remove('hidden');
    if (menuScreen) menuScreen.classList.add('hidden');
    switchMultiplayerTab('create');

    // Подключаемся к серверу, если еще не подключены
    if (!multiplayer.connected) {
        try {
            const createStatus = document.getElementById('createStatus');
            if (createStatus) createStatus.textContent = 'Подключение к серверу...';
            
            await multiplayer.connect(CONFIG.SERVER_URL);
            
            if (createStatus) createStatus.textContent = 'Выберите действие';
            console.log('✅ Успешное подключение к WebSocket серверу');
            
            // Настраиваем обработчики ОДИН РАЗ после подключения
            setupMultiplayerCallbacks();

        } catch (error) {
            console.error('❌ Не удалось подключиться к WebSocket серверу:', error);
            const createStatus = document.getElementById('createStatus');
            if (createStatus) createStatus.textContent = 'Ошибка подключения к серверу.';
            alert('Не удалось подключиться к серверу. Попробуйте позже.');
            showMainMenu();
        }
    }
}

// ... (skip to createRoom)

async function createRoom() {
    if (!multiplayer || !multiplayer.connected) {
        alert('Не удалось подключиться к серверу. Попробуйте войти в меню еще раз.');
        return;
    }
    console.log('🏠 Создание комнаты...');
    multiplayer.createRoom();
}

async function joinRoom() {
    if (!multiplayer || !multiplayer.connected) {
        alert('Не удалось подключиться к серверу. Попробуйте войти в меню еще раз.');
        return;
    }
    
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if (roomCode.length !== 6) {
        alert('Введите 6-значный код комнаты.');
        return;
    }
    console.log('🚪 Присоединение к комнате:', roomCode);
    multiplayer.joinRoom(roomCode);
}

function cancelRoom() {
    console.log('❌ Отмена создания комнаты');
    if (multiplayer) {
        multiplayer.disconnect();
        multiplayer = null;
    }
    document.getElementById('roomCreatedPanel').style.display = 'none';
    hideMultiplayerScreen();
    showMainMenu();
}

function setupMultiplayerCallbacks() {
    multiplayer.onRoomCreated = (roomId) => {
        console.log('✅ Комната создана:', roomId);
        document.getElementById('roomCodeDisplay').textContent = roomId;
        document.getElementById('roomCreatedPanel').style.display = 'block';
        const createStatus = document.getElementById('createStatus');
        if (createStatus) createStatus.textContent = 'Ожидание противника...';
    };

    multiplayer.onGameStart = async (data) => {
        console.log('🚀 Игра начинается! Данные:', data);
        const isHost = multiplayer.playerId === data.hostId;
        await startMultiplayerGame(isHost);
    };

    multiplayer.onGameStateSync = (state) => {
        if (multiplayer.isHost) return; // Хост не должен синхронизироваться с самим собой

        console.log('📥 Получено состояние от хоста');
        
        // Показываем игровой экран
        showGameScreen();

        // Гость создает движок, но пропускает инициализацию состояния
        gameEngine = new GameEngine(cardManager, uiManager, visualManager, { isMultiplayer: true, isGuest: true });
        
        // Применяем состояние от хоста
        gameEngine.applyState(state);
    };

    multiplayer.onOpponentMove = (cardData) => {
        if (gameEngine) {
            gameEngine.handleOpponentMove(cardData);
        }
    };

    multiplayer.onOpponentDisconnected = () => {
        if (gameEngine && gameEngine.gameActive) {
            alert('Противник отключился. Игра окончена.');
            exitToMenu();
        }
    };

    multiplayer.onError = (error) => {
        console.error('❌ Ошибка мультиплеера:', error);
        const createStatus = document.getElementById('createStatus');
        const joinStatus = document.getElementById('joinStatus');
        if (createStatus) createStatus.textContent = `Ошибка: ${error}`;
        if (joinStatus) joinStatus.textContent = `Ошибка: ${error}`;
        alert(`Произошла ошибка: ${error}`);
    };
}

async function startMultiplayerGame(isHost) {
    console.log(`🎮 Запуск мультиплеер игры (${isHost ? 'Хост' : 'Гость'})`);
    isMultiplayerGame = true;
    showGameScreen();

    const dialog = document.getElementById('dialog');
    if (dialog) dialog.innerHTML = '';

    const selectedDeck = deckManager.getSelectedDeck();
    cardManager = new CardManager();
    await cardManager.loadCards(selectedDeck.file);
    console.log('✅ Карты колоды загружены');

    if (isHost) {
        // Хост создает игру и отправляет состояние гостю
        gameEngine = new GameEngine(cardManager, uiManager, visualManager, { isMultiplayer: true });
        await gameEngine.initializeMultiplayerGame(true);
        const initialState = gameEngine.getState();
        multiplayer.sendGameState(initialState);
        console.log('📤 Начальное состояние отправлено гостю');
    } else {
        // Гость просто ждет состояния от хоста (onGameStateSync)
        console.log('🧘 Гость ожидает состояние от хоста...');
        const joinStatus = document.getElementById('joinStatus');
        if(joinStatus) joinStatus.textContent = 'Синхронизация игры...';
    }
}

// ============= ПАУЗА =============

function togglePause() {
    const pauseScreen = document.getElementById('pauseScreen');
    const isVisible = !pauseScreen.classList.contains('hidden');

    if (isVisible) {
        hidePauseScreen();
    } else {
        showPauseScreen();
    }
}

function showPauseScreen() {
    const pauseScreen = document.getElementById('pauseScreen');
    if (!pauseScreen || !gameEngine || !gameEngine.gameActive) return;

    pauseScreen.classList.remove('hidden');

    if (gameEngine && gameEngine.visualManager) {
        gameEngine.visualManager.cancelSpeech();
    }
    console.log('⏸ Пауза');
}

function hidePauseScreen() {
    const pauseScreen = document.getElementById('pauseScreen');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    console.log('▶️ Продолжение');
}

function resumeGame() {
    hidePauseScreen();
}

// Клавиша ESC для паузы
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const pauseScreen = document.getElementById('pauseScreen');
        const menuScreen = document.getElementById('menuScreen');
        const endgameScreen = document.getElementById('endgameScreen');

        if (pauseScreen && menuScreen && endgameScreen) {
            const menuHidden = menuScreen.classList.contains('hidden');
            const endgameHidden = endgameScreen.classList.contains('hidden');
            const pauseHidden = pauseScreen.classList.contains('hidden');

            if (menuHidden && endgameHidden && pauseHidden && gameEngine?.gameActive) {
                showPauseScreen();
            } else if (!pauseHidden) {
                resumeGame();
            }
        }
    }
});

// ============= ПРАВИЛА ИГРЫ =============

function showRules() {
    alert(`📜 ПРАВИЛА ДУЕЛОГА

🎯 ЦЕЛЬ: Набрать 3 победных очка первым

💫 ХАРАКТЕРИСТИКИ:
• Логика - рациональное мышление
• Эмоции - эмоциональное состояние

🎴 ТИПЫ КАРТ:
• Атака (🗡) - урон по логике/эмоциям
• Защита (🛡) - восстановление или щит
• Уклонение (⚡) - отмена или отражение

🎲 ХОД ИГРЫ:
1. Каждый ход выберите карту
2. Карты имеют ограниченное использование
3. Побеждает тот, кто первым наберет 3 очка

Удачи! 🎮`);
}

// ============= ЭКСПОРТ ЛОГОВ =============

function exportLogs() {
    if (!gameEngine || !gameEngine.log || gameEngine.log.length === 0) {
        alert('Нет логов для экспорта. Сыграйте хотя бы одну игру.');
        return;
    }

    const logData = JSON.stringify(gameEngine.log, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `duelogue_log_${new Date().toISOString().slice(0,10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('📥 Логи экспортированы');
}

// ============= ПЕРЕОПРЕДЕЛЕНИЕ checkVictory =============

// Перехватываем победу для показа экрана окончания
const originalCheckVictory = GameEngine.prototype.checkVictory;
GameEngine.prototype.checkVictory = function() {
    const result = originalCheckVictory.call(this);

    if (result) {
        const isVictory = this.player.points >= 3;
        setTimeout(() => {
            showEndgameScreen(isVictory);
        }, 2000);
    }

    return result;
};

// ============= ЭКСПОРТ ФУНКЦИЙ В WINDOW =============

window.startSinglePlayerGame = startSinglePlayerGame;
window.showMultiplayerScreen = showMultiplayerScreen;
window.showDeckSelector = showDeckSelector;
window.closeDeckSelector = closeDeckSelector;
window.showRules = showRules;
window.restartGame = restartGame;
window.exitToMenu = exitToMenu;
window.showPauseScreen = showPauseScreen;
window.resumeGame = resumeGame;
window.togglePause = togglePause;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.cancelRoom = cancelRoom;
window.switchMultiplayerTab = switchMultiplayerTab;
window.exportLogs = exportLogs;

// ============= ЗАПУСК ИГРЫ =============

window.addEventListener('DOMContentLoaded', initGame);

console.log('✨ Модуль main.js загружен');
