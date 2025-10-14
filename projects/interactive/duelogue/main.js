console.log('main.js: Script start');

// ДУЕЛОГ - Главная точка входа и интеграция модулей
// Этот файл связывает все модули игры вместе

// Глобальные переменные для интеграции модулей
let gameEngine = null;
let cardManager = null;
let uiManager = null;
let visualManager = null;
let multiplayer = null;
let isMultiplayerGame = false;
let playerNickname = '';
let opponentNickname = '';

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

        // Load custom decks from localStorage
        loadCustomDecks();

        const savedDeck = localStorage.getItem('selectedDeck');
        if (savedDeck && deckManager.decks.find(d => d.id === savedDeck)) {
            deckManager.selectedDeckId = savedDeck;
        }

        uiManager = new UIManager();
        visualManager = new VisualManager();

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

function loadCustomDecks() {
    const customDecks = JSON.parse(localStorage.getItem('customDecks') || '[]');
    console.log(`📦 Загружено ${customDecks.length} кастомных колод`);

    customDecks.forEach(customDeck => {
        // Add to CARDS_DATA
        if (typeof CARDS_DATA === 'undefined') {
            window.CARDS_DATA = {};
        }
        CARDS_DATA[`${customDeck.id}.json`] = customDeck.data;

        // Add to deck manager if not already there
        if (!deckManager.decks.find(d => d.id === customDeck.id)) {
            deckManager.decks.push({
                id: customDeck.id,
                name: customDeck.name,
                description: customDeck.description,
                file: `${customDeck.id}.json`,
                theme: 'custom'
            });
        }
    });
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
    document.getElementById('deckSelectorScreen').classList.add('hidden');
    document.getElementById('gameWrapper').style.display = 'none';
    document.getElementById('pauseButton').classList.add('hidden');
}

function showGameScreen() {
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('multiplayerScreen').classList.add('hidden');
    document.getElementById('deckSelectorScreen').classList.add('hidden');
    document.getElementById('gameWrapper').style.display = 'flex';
    document.getElementById('pauseButton').classList.remove('hidden');
}

function showDeckSelector() {
    document.getElementById('deckSelectorScreen').classList.remove('hidden');
    document.getElementById('menuScreen').classList.add('hidden');
}

function closeDeckSelector() {
    document.getElementById('deckSelectorScreen').classList.add('hidden');
    document.getElementById('menuScreen').classList.remove('hidden');
}

// ============= РЕДАКТОР КОЛОД С AI =============

function showDeckEditor() {
    document.getElementById('deckEditorScreen').classList.remove('hidden');
    document.getElementById('menuScreen').classList.add('hidden');

    // Setup character counter
    const promptInput = document.getElementById('deckPromptInput');
    const charCount = document.getElementById('promptCharCount');
    promptInput.addEventListener('input', () => {
        charCount.textContent = promptInput.value.length;
    });
}

function closeDeckEditor() {
    document.getElementById('deckEditorScreen').classList.add('hidden');
    document.getElementById('menuScreen').classList.remove('hidden');

    // Reset form
    document.getElementById('deckPromptInput').value = '';
    document.getElementById('promptCharCount').textContent = '0';
    document.getElementById('deckEditorStatus').textContent = '';
    document.getElementById('deckEditorLoading').style.display = 'none';
}

async function generateDeck() {
    const promptInput = document.getElementById('deckPromptInput');
    const prompt = promptInput.value.trim();
    const statusEl = document.getElementById('deckEditorStatus');
    const loadingEl = document.getElementById('deckEditorLoading');
    const generateBtn = document.getElementById('generateDeckBtn');

    if (!prompt) {
        statusEl.textContent = '⚠️ Пожалуйста, опишите тему дебатов';
        statusEl.style.color = '#f39c12';
        return;
    }

    if (prompt.length < 20) {
        statusEl.textContent = '⚠️ Описание слишком короткое. Добавьте больше деталей.';
        statusEl.style.color = '#f39c12';
        return;
    }

    // Disable button and show loading
    generateBtn.disabled = true;
    generateBtn.style.opacity = '0.6';
    generateBtn.style.cursor = 'not-allowed';
    loadingEl.style.display = 'block';
    statusEl.textContent = '';

    try {
        console.log('🤖 Отправка запроса на генерацию колоды...');

        const response = await fetch('https://wo-server-v1.onrender.com/api/generate-deck', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Колода успешно сгенерирована');

        // Add deck to manager
        addGeneratedDeck(data.deck, data.deckName, data.description);

        // Show success message
        loadingEl.style.display = 'none';
        statusEl.textContent = `✅ Колода "${data.deckName}" создана!`;
        statusEl.style.color = '#27ae60';

        // Switch to deck selector after 2 seconds
        setTimeout(() => {
            closeDeckEditor();
            showDeckSelector();
        }, 2000);

    } catch (error) {
        console.error('❌ Ошибка генерации колоды:', error);
        loadingEl.style.display = 'none';
        statusEl.textContent = `❌ Ошибка: ${error.message}. Попробуйте еще раз.`;
        statusEl.style.color = '#e74c3c';
    } finally {
        // Re-enable button
        generateBtn.disabled = false;
        generateBtn.style.opacity = '1';
        generateBtn.style.cursor = 'pointer';
    }
}

function addGeneratedDeck(deckData, deckName, description) {
    // Generate unique ID
    const deckId = 'custom_' + Date.now();

    // Add to CARDS_DATA
    if (typeof CARDS_DATA === 'undefined') {
        window.CARDS_DATA = {};
    }
    CARDS_DATA[`${deckId}.json`] = deckData;

    // Add to deck manager
    const newDeck = {
        id: deckId,
        name: deckName,
        description: description,
        file: `${deckId}.json`,
        theme: 'custom'
    };

    deckManager.decks.push(newDeck);

    // Save to localStorage
    const customDecks = JSON.parse(localStorage.getItem('customDecks') || '[]');
    customDecks.push({
        id: deckId,
        name: deckName,
        description: description,
        data: deckData
    });
    localStorage.setItem('customDecks', JSON.stringify(customDecks));

    console.log(`✅ Колода "${deckName}" добавлена в менеджер`);

    // Refresh deck selector
    renderDeckSelector();
}

function showRules() {
    alert(`ПРАВИЛА ИГРЫ ДУЕЛОГ

Цель: Первым набрать 3 очка.

Механика:
• У каждого игрока есть Логика и Эмоции (по 4 единицы на старте)
• Карты делятся на три типа:
  - Атака: наносит урон логике или эмоциям противника
  - Защита: восстанавливает твою логику или эмоции
  - Уклонение: отменяет, отражает или зеркалит карту противника

Очки начисляются когда:
• Логика противника падает до 0 → +1 очко
• Эмоции противника падают до 0 → +1 очко
• Противник находится в отрицательных значениях Логики И Эмоций 3 хода подряд → +1 очко

Особенности:
• Урон зависит от твоих Эмоций (множитель урона)
• Логика определяет лимит карт в руке (выше логика = больше карт)
• Атака пробивает Защиту с бонусом 50%
• Защита ловит в ловушку Уклонение с бонусом 50%

Удачи в битве!`);
}

function hideMultiplayerScreen() {
    document.getElementById('multiplayerScreen').classList.add('hidden');
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
    }
    isMultiplayerGame = false;
}

// ============= MULTIPLAYER =============

async function showMultiplayerScreen() {
    document.getElementById('multiplayerScreen').classList.remove('hidden');
    document.getElementById('menuScreen').classList.add('hidden');
    switchMultiplayerTab('create');

    // Загрузить сохраненный никнейм
    const savedNickname = localStorage.getItem('playerNickname');
    if (savedNickname) {
        document.getElementById('playerNicknameInput').value = savedNickname;
        playerNickname = savedNickname;
    } else {
        playerNickname = 'Игрок_' + Math.random().toString(36).substr(2, 5);
        document.getElementById('playerNicknameInput').value = playerNickname;
    }

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

    multiplayer.onOpponentJoined = (opponentId, opponentNick) => {
        opponentNickname = opponentNick || 'Противник';
        console.log(`✅ Противник присоединился: ${opponentNickname}`);
    };

    multiplayer.onGameStart = async (data) => {
        const isHost = multiplayer.playerId === data.hostId;
        await startMultiplayerGame(isHost);
    };

    multiplayer.onGameStateSync = (state) => {
        if (multiplayer.isHost) return;
        console.log('📥 Получено состояние от хоста');
        showGameScreen();
        updatePlayerNames();
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

    // Сохранить и отправить никнейм
    playerNickname = document.getElementById('playerNicknameInput').value.trim() || 'Игрок_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('playerNickname', playerNickname);

    multiplayer.playerNickname = playerNickname;
    multiplayer.createRoom();
}

function joinRoom() {
    if (!multiplayer || !multiplayer.connected) return alert('Подключение к серверу...');

    // Сохранить и отправить никнейм
    playerNickname = document.getElementById('playerNicknameInput').value.trim() || 'Игрок_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('playerNickname', playerNickname);

    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if (roomCode.length !== 6) return alert('Введите 6-значный код комнаты.');

    multiplayer.playerNickname = playerNickname;
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
        updatePlayerNames();
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

function updatePlayerNames() {
    const playerNameEl = document.getElementById('playerNameDisplay');
    const enemyNameEl = document.getElementById('enemyNameDisplay');

    if (isMultiplayerGame) {
        if (playerNameEl) playerNameEl.textContent = playerNickname || 'Ты';
        if (enemyNameEl) enemyNameEl.textContent = opponentNickname || 'Противник';
    } else {
        if (playerNameEl) playerNameEl.textContent = 'Ты';
        if (enemyNameEl) enemyNameEl.textContent = 'Скептик';
    }
}

console.log('main.js: Assigning functions to window...');

// ============= ЭКСПОРТ ФУНКЦИЙ В WINDOW =============

window.startSinglePlayerGame = startSinglePlayerGame;
window.showMultiplayerScreen = showMultiplayerScreen;
window.showDeckSelector = showDeckSelector;
window.closeDeckSelector = closeDeckSelector;
window.showDeckEditor = showDeckEditor;
window.closeDeckEditor = closeDeckEditor;
window.generateDeck = generateDeck;
window.showRules = showRules;
window.restartGame = restartGame;
window.exitToMenu = exitToMenu;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.cancelRoom = cancelRoom;
window.switchMultiplayerTab = switchMultiplayerTab;

console.log('main.js: Functions assigned. Script end.');

// ============= ЗАПУСК ИГРЫ =============

window.addEventListener('DOMContentLoaded', initGame);
