// ДУЕЛОГ - Главная точка входа и интеграция модулей
// Этот файл связывает все модули игры вместе

// Глобальные переменные для интеграции модулей
let gameEngine = null;
let cardManager = null;
let uiManager = null;
let visualManager = null;
let multiplayer = null;
let isMultiplayerGame = false;

// Менеджер колод
let deckManager = {
    decks: [],
    selectedDeckId: null,

    loadDecks() {
        if (typeof DECKS_DATA !== 'undefined') {
            this.decks = DECKS_DATA.decks;
            this.selectedDeckId = DECKS_DATA.default;
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
};

// ============= ИНИЦИАЛИЗАЦИЯ ИГРЫ =============

async function initGame() {
    try {
        console.log('🎮 Инициализация ДУЕЛОГ...');

        deckManager.loadDecks();
        const savedDeck = localStorage.getItem('selectedDeck');
        if (savedDeck && deckManager.decks.find(d => d.id === savedDeck)) {
            deckManager.selectedDeckId = savedDeck;
        }

        uiManager = new UIManager();
        visualManager = new VisualManager();
        
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

// ============= МЕНЕДЖЕР КОЛОД =============

function renderDeckSelector() {
    const deckList = document.getElementById('deckList');
    if (!deckList) return;

    deckList.innerHTML = '';
    deckManager.decks.forEach(deck => {
        const deckCard = document.createElement('div');
        deckCard.className = 'deck-card';
        if (deck.id === deckManager.selectedDeckId) {
            deckCard.classList.add('selected');
        }
        deckCard.innerHTML = `<div class="deck-card-name">${deck.name}</div><div class="deck-card-desc">${deck.description}</div>`;
        deckCard.addEventListener('click', () => selectDeck(deck.id));
        deckList.appendChild(deckCard);
    });
}

function selectDeck(deckId) {
    deckManager.selectDeck(deckId);
    renderDeckSelector();
}

// ============= МЕНЮ И НАВИГАЦИЯ =============

function showMainMenu() {
    document.getElementById('menuScreen').classList.remove('hidden');
    document.getElementById('endgameScreen').classList.add('hidden');
    document.getElementById('multiplayerScreen').classList.add('hidden');
    document.getElementById('gameWrapper').style.display = 'none';
    document.getElementById('pauseButton').classList.add('hidden');
}

function showGameScreen() {
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('multiplayerScreen').classList.add('hidden');
    document.getElementById('gameWrapper').style.display = 'flex';
    document.getElementById('pauseButton').classList.remove('hidden');
}

function showEndgameScreen(isVictory) {
    const endgameScreen = document.getElementById('endgameScreen');
    if (endgameScreen) endgameScreen.classList.remove('hidden');
    document.getElementById('gameWrapper').style.display = 'none';

    const endgameTitle = document.getElementById('endgameTitle');
    if (endgameTitle) {
        endgameTitle.textContent = isVictory ? '🏆 Победа!' : '💀 Поражение';
        endgameTitle.className = isVictory ? 'endgame-title victory' : 'endgame-title defeat';
    }
    // ... (статистика)
}

// ============= SINGLE PLAYER =============

async function startSinglePlayerGame() {
    console.log('🎮 Запуск одиночной игры');
    isMultiplayerGame = false;
    showGameScreen();

    document.getElementById('dialog').innerHTML = '';
    const selectedDeck = deckManager.getSelectedDeck();
    cardManager = new CardManager();
    await cardManager.loadCards(selectedDeck.file);
    console.log('✅ Карты колоды загружены');

    gameEngine = new GameEngine(cardManager, uiManager, visualManager);
    await gameEngine.startGame();
    console.log('✅ Игра началась');
}

function restartGame() {
    if (isMultiplayerGame) {
        exitToMenu();
    } else {
        startSinglePlayerGame();
    }
}

function exitToMenu() {
    showMainMenu();
    if (gameEngine) {
        gameEngine.gameActive = false;
        gameEngine = null;
    }
    if (multiplayer && multiplayer.connected) {
        multiplayer.disconnect();
        multiplayer = new MultiplayerManager(); 
        multiplayer.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    }
    isMultiplayerGame = false;
}

// ============= MULTIPLAYER =============

async function showMultiplayerScreen() {
    document.getElementById('multiplayerScreen').classList.remove('hidden');
    document.getElementById('menuScreen').classList.add('hidden');
    switchMultiplayerTab('create');

    if (!multiplayer.connected) {
        try {
            document.getElementById('createStatus').textContent = 'Подключение к серверу...';
            await multiplayer.connect(CONFIG.SERVER_URL);
            document.getElementById('createStatus').textContent = 'Выберите действие';
            console.log('✅ Успешное подключение к WebSocket серверу');
            setupMultiplayerCallbacks();
        } catch (error) {
            console.error('❌ Не удалось подключиться к WebSocket серверу:', error);
            document.getElementById('createStatus').textContent = 'Ошибка подключения к серверу.';
            alert('Не удалось подключиться к серверу. Попробуйте позже.');
            showMainMenu();
        }
    }
}

function setupMultiplayerCallbacks() {
    multiplayer.onRoomCreated = (roomId) => {
        document.getElementById('roomCodeDisplay').textContent = roomId;
        document.getElementById('roomCreatedPanel').style.display = 'block';
        document.getElementById('createStatus').textContent = 'Ожидание противника...';
    };

    multiplayer.onGameStart = async (data) => {
        const isHost = multiplayer.playerId === data.hostId;
        await startMultiplayerGame(isHost);
    };

    multiplayer.onGameStateSync = (state) => {
        if (multiplayer.isHost) return;
        console.log('📥 Получено состояние от хоста');
        showGameScreen();
        const selectedDeck = deckManager.getSelectedDeck();
        cardManager = new CardManager();
        cardManager.loadCards(selectedDeck.file).then(() => {
            gameEngine = new GameEngine(cardManager, uiManager, visualManager, { isMultiplayer: true, isGuest: true });
            gameEngine.applyState(state);
        });
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
        alert(`Произошла ошибка: ${error}`);
    };
}

function switchMultiplayerTab(tab) {
    const createTab = document.getElementById('tabCreate');
    const joinTab = document.getElementById('tabJoin');
    const createPanel = document.getElementById('panelCreate');
    const joinPanel = document.getElementById('panelJoin');
    createTab.classList.toggle('active', tab === 'create');
    joinTab.classList.toggle('active', tab === 'join');
    createPanel.classList.toggle('active', tab === 'create');
    joinPanel.classList.toggle('active', tab === 'join');
}

function createRoom() {
    if (!multiplayer || !multiplayer.connected) return alert('Подключение к серверу...');
    multiplayer.createRoom();
}

function joinRoom() {
    if (!multiplayer || !multiplayer.connected) return alert('Подключение к серверу...');
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if (roomCode.length !== 6) return alert('Введите 6-значный код комнаты.');
    multiplayer.joinRoom(roomCode);
}

function cancelRoom() {
    hideMultiplayerScreen();
    showMainMenu();
}

async function startMultiplayerGame(isHost) {
    console.log(`🎮 Запуск мультиплеер игры (${isHost ? 'Хост' : 'Гость'})`);
    isMultiplayerGame = true;
    
    const selectedDeck = deckManager.getSelectedDeck();
    cardManager = new CardManager();
    await cardManager.loadCards(selectedDeck.file);
    console.log('✅ Карты колоды загружены');

    if (isHost) {
        showGameScreen();
        gameEngine = new GameEngine(cardManager, uiManager, visualManager, { isMultiplayer: true });
        await gameEngine.initializeMultiplayerGame(true);
        const initialState = gameEngine.getState();
        multiplayer.sendGameState(initialState);
        console.log('📤 Начальное состояние отправлено гостю');
    } else {
        console.log('🧘 Гость ожидает состояние от хоста...');
        document.getElementById('joinStatus').textContent = 'Синхронизация игры...';
    }
}


// ============= ЭКСПОРТ ФУНКЦИЙ В WINDOW =============

window.startSinglePlayerGame = startSinglePlayerGame;
window.showMultiplayerScreen = showMultiplayerScreen;
window.showDeckSelector = showDeckSelector;
window.closeDeckSelector = closeDeckSelector;
window.restartGame = restartGame;
window.exitToMenu = exitToMenu;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.cancelRoom = cancelRoom;
window.switchMultiplayerTab = switchMultiplayerTab;

// ============= ЗАПУСК ИГРЫ =============

window.addEventListener('DOMContentLoaded', initGame);