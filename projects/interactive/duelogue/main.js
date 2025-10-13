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

        // Загрузить список колод
        deckManager.loadDecks();
        console.log('✅ Колоды загружены:', deckManager.decks.length);

        // Восстановить выбранную колоду из localStorage
        const savedDeck = localStorage.getItem('selectedDeck');
        if (savedDeck && deckManager.decks.find(d => d.id === savedDeck)) {
            deckManager.selectedDeckId = savedDeck;
        }

        // Инициализировать UI менеджер
        uiManager = new UIManager();
        console.log('✅ UI менеджер готов');

        // Инициализировать визуальный менеджер
        visualManager = new VisualManager();
        console.log('✅ Визуальный менеджер готов');

        // Отрисовать селектор колод
        renderDeckSelector();

        // Показать главное меню
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

        deckCard.innerHTML = `
            <div class="deck-card-name">${deck.name}</div>
            <div class="deck-card-desc">${deck.description}</div>
        `;

        deckCard.addEventListener('click', () => selectDeck(deck.id));

        deckList.appendChild(deckCard);
    });
}

function selectDeck(deckId) {
    deckManager.selectDeck(deckId);
    renderDeckSelector();
    console.log('🎴 Выбрана колода:', deckManager.getSelectedDeck().name);
}

// ============= МЕНЮ И НАВИГАЦИЯ =============

function showMainMenu() {
    const menuScreen = document.getElementById('menuScreen');
    const endgameScreen = document.getElementById('endgameScreen');
    const multiplayerScreen = document.getElementById('multiplayerScreen');
    const gameWrapper = document.getElementById('gameWrapper');
    const pauseButton = document.getElementById('pauseButton');

    if (menuScreen) menuScreen.classList.remove('hidden');
    if (endgameScreen) endgameScreen.classList.add('hidden');
    if (multiplayerScreen) multiplayerScreen.classList.add('hidden');
    if (gameWrapper) gameWrapper.style.display = 'none';
    if (pauseButton) pauseButton.classList.add('hidden');
}

function hideMainMenu() {
    const menuScreen = document.getElementById('menuScreen');
    if (menuScreen) menuScreen.classList.add('hidden');
}

function showGameScreen() {
    const menuScreen = document.getElementById('menuScreen');
    const endgameScreen = document.getElementById('endgameScreen');
    const multiplayerScreen = document.getElementById('multiplayerScreen');
    const gameWrapper = document.getElementById('gameWrapper');
    const pauseButton = document.getElementById('pauseButton');

    if (menuScreen) menuScreen.classList.add('hidden');
    if (endgameScreen) endgameScreen.classList.add('hidden');
    if (multiplayerScreen) multiplayerScreen.classList.add('hidden');
    if (gameWrapper) gameWrapper.style.display = 'flex';
    if (pauseButton) pauseButton.classList.remove('hidden');
}

function showEndgameScreen(isVictory) {
    const endgameScreen = document.getElementById('endgameScreen');
    const gameWrapper = document.getElementById('gameWrapper');

    if (endgameScreen) endgameScreen.classList.remove('hidden');
    if (gameWrapper) gameWrapper.style.display = 'none';

    const endgameTitle = document.getElementById('endgameTitle');
    if (endgameTitle) {
        if (isVictory) {
            endgameTitle.textContent = '🏆 Победа!';
            endgameTitle.className = 'endgame-title victory';
        } else {
            endgameTitle.textContent = '💀 Поражение';
            endgameTitle.className = 'endgame-title defeat';
        }
    }

    // Заполнить статистику
    if (gameEngine) {
        const finalPlayerPoints = document.getElementById('finalPlayerPoints');
        const finalEnemyPoints = document.getElementById('finalEnemyPoints');
        const totalTurns = document.getElementById('totalTurns');
        const totalCards = document.getElementById('totalCards');

        if (finalPlayerPoints) finalPlayerPoints.textContent = gameEngine.player.points;
        if (finalEnemyPoints) finalEnemyPoints.textContent = gameEngine.enemy.points;
        if (totalTurns) totalTurns.textContent = gameEngine.turn;
        if (totalCards) totalCards.textContent = gameEngine.player.cards.length + gameEngine.player.discardPile.length;
    }
}

function hideEndgameScreen() {
    const endgameScreen = document.getElementById('endgameScreen');
    if (endgameScreen) endgameScreen.classList.add('hidden');
}

function showMultiplayerScreen() {
    const multiplayerScreen = document.getElementById('multiplayerScreen');
    const menuScreen = document.getElementById('menuScreen');

    if (multiplayerScreen) multiplayerScreen.classList.remove('hidden');
    if (menuScreen) menuScreen.classList.add('hidden');
    switchMultiplayerTab('create');
}

function hideMultiplayerScreen() {
    const multiplayerScreen = document.getElementById('multiplayerScreen');
    if (multiplayerScreen) multiplayerScreen.classList.add('hidden');
}

function showDeckSelector() {
    const deckSelectorScreen = document.getElementById('deckSelectorScreen');
    const menuScreen = document.getElementById('menuScreen');

    if (deckSelectorScreen) deckSelectorScreen.classList.remove('hidden');
    if (menuScreen) menuScreen.classList.add('hidden');
}

function closeDeckSelector() {
    const deckSelectorScreen = document.getElementById('deckSelectorScreen');
    const menuScreen = document.getElementById('menuScreen');

    if (deckSelectorScreen) deckSelectorScreen.classList.add('hidden');
    if (menuScreen) menuScreen.classList.remove('hidden');
}

// ============= SINGLE PLAYER =============

async function startSinglePlayerGame() {
    console.log('🎮 Запуск одиночной игры');
    hideMainMenu();
    showGameScreen();

    // Очистить диалог
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.innerHTML = '';

    // Загрузить карты из выбранной колоды
    const selectedDeck = deckManager.getSelectedDeck();
    console.log('🎴 Загрузка колоды:', selectedDeck.name);

    cardManager = new CardManager();
    await cardManager.loadCards(selectedDeck.file);
    console.log('✅ Карты колоды загружены');

    // Создать новый игровой движок
    gameEngine = new GameEngine(cardManager, uiManager, visualManager);
    await gameEngine.startGame();

    console.log('✅ Игра началась');
}

function restartGame() {
    console.log('🔄 Перезапуск игры');
    hidePauseScreen();
    hideEndgameScreen();
    startSinglePlayerGame();
}

function exitToMenu() {
    console.log('🏠 Выход в главное меню');
    hidePauseScreen();
    hideEndgameScreen();
    showMainMenu();

    // Очистить состояние игры
    if (gameEngine) {
        gameEngine.gameActive = false;
        gameEngine = null;
    }
    if (multiplayer) {
        multiplayer.disconnect();
        multiplayer = null;
    }

    // Очистить диалог
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.innerHTML = '';
}

// ============= MULTIPLAYER =============

function switchMultiplayerTab(tab) {
    const createTab = document.getElementById('tabCreate');
    const joinTab = document.getElementById('tabJoin');
    const createPanel = document.getElementById('panelCreate');
    const joinPanel = document.getElementById('panelJoin');

    if (tab === 'create') {
        createTab.classList.add('active');
        joinTab.classList.remove('active');
        createPanel.classList.add('active');
        joinPanel.classList.remove('active');
    } else {
        createTab.classList.remove('active');
        joinTab.classList.add('active');
        createPanel.classList.remove('active');
        joinPanel.classList.add('active');
    }
}

async function createRoom() {
    console.log('🏠 Создание комнаты...');
    const createStatus = document.getElementById('createStatus');
    if (createStatus) createStatus.textContent = 'Подключение к серверу...';

    try {
        multiplayer = new MultiplayerManager();
        multiplayer.playerId = 'player_' + Math.random().toString(36).substr(2, 9);

        multiplayer.onRoomCreated = (roomId) => {
            console.log('✅ Комната создана:', roomId);
            document.getElementById('roomCodeDisplay').textContent = roomId;
            document.getElementById('roomCreatedPanel').style.display = 'block';
            if (createStatus) createStatus.textContent = 'Ожидание противника...';
        };

        multiplayer.onOpponentJoined = async () => {
            console.log('👥 Противник присоединился');
            if (createStatus) createStatus.textContent = 'Противник найден! Начинаем...';
            await new Promise(resolve => setTimeout(resolve, 1000));
            hideMultiplayerScreen();
            await startMultiplayerGame(true); // Хост
        };

        multiplayer.onError = (error) => {
            console.error('❌ Ошибка мультиплеера:', error);
            if (createStatus) createStatus.textContent = `Ошибка: ${error}`;
        };

        await multiplayer.connect(CONFIG.SERVER_URL);
        multiplayer.createRoom();

    } catch (error) {
        console.error('❌ Ошибка создания комнаты:', error);
        if (createStatus) createStatus.textContent = 'Не удалось подключиться к серверу';
        alert('Не удалось подключиться к серверу. Убедитесь, что сервер запущен на localhost:8080');
    }
}

async function joinRoom() {
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    const joinStatus = document.getElementById('joinStatus');

    if (roomCode.length !== 6) {
        if (joinStatus) joinStatus.textContent = 'Введите 6-значный код';
        return;
    }

    console.log('🚪 Присоединение к комнате:', roomCode);
    if (joinStatus) joinStatus.textContent = 'Подключение...';

    try {
        multiplayer = new MultiplayerManager();
        multiplayer.playerId = 'player_' + Math.random().toString(36).substr(2, 9);

        multiplayer.onRoomJoined = async () => {
            console.log('✅ Присоединились к комнате');
            if (joinStatus) joinStatus.textContent = 'Подключено! Начинаем...';
            await new Promise(resolve => setTimeout(resolve, 1000));
            hideMultiplayerScreen();
            await startMultiplayerGame(false); // Гость
        };

        multiplayer.onError = (error) => {
            console.error('❌ Ошибка:', error);
            if (joinStatus) joinStatus.textContent = `Ошибка: ${error}`;
        };

        await multiplayer.connect(CONFIG.SERVER_URL);
        multiplayer.joinRoom(roomCode);

    } catch (error) {
        console.error('❌ Ошибка присоединения:', error);
        if (joinStatus) joinStatus.textContent = 'Не удалось подключиться';
        alert('Не удалось подключиться к серверу.');
    }
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

async function startMultiplayerGame(isHost) {
    console.log(`🎮 Запуск мультиплеер игры (${isHost ? 'Хост' : 'Гость'})`);
    showGameScreen();

    // Очистить диалог
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.innerHTML = '';

    // Загрузить карты из выбранной колоды
    const selectedDeck = deckManager.getSelectedDeck();
    console.log('🎴 Загрузка колоды:', selectedDeck.name);

    cardManager = new CardManager();
    await cardManager.loadCards(selectedDeck.file);
    console.log('✅ Карты колоды загружены');

    // Создать игровой движок
    gameEngine = new GameEngine(cardManager, uiManager, visualManager);

    // Настроить обработчик ходов противника
    multiplayer.onOpponentMove = async (cardData) => {
        console.log('📨 Получен ход противника:', cardData.name);

        const enemyCard = gameEngine.enemy.cards.find(c => c.name === cardData.name);
        if (!enemyCard) {
            console.error('❌ Карта противника не найдена:', cardData.name);
            return;
        }

        const {speechText, logText} = gameEngine.applyCard(enemyCard, gameEngine.enemy, gameEngine.player);

        if (speechText) {
            await visualManager.showSpeech(speechText, 'enemy');
        }

        if (enemyCard.usesLeft !== undefined) {
            enemyCard.usesLeft--;
            if (enemyCard.usesLeft <= 0) {
                gameEngine.enemy.cards = gameEngine.enemy.cards.filter(c => c !== enemyCard);
            }
        } else {
            gameEngine.enemy.cards = gameEngine.enemy.cards.filter(c => c !== enemyCard);
        }

        uiManager.renderStats(gameEngine.player, gameEngine.enemy);
        uiManager.renderCards(gameEngine.player.cards, gameEngine.playerTurn, gameEngine.playerHasPlayedCard, playMultiplayerCard);

        gameEngine.playerTurn = true;
        gameEngine.turn++;

        if (gameEngine.checkVictory()) {
            return;
        }
    };

    // Функция хода для мультиплеера
    window.playMultiplayerCard = async function(card) {
        if (!gameEngine.playerTurn || card.used || gameEngine.playerHasPlayedCard || !gameEngine.gameActive) return;

        console.log('🎴 Отправка хода:', card.name);

        multiplayer.sendMove({
            name: card.name,
            category: card.category,
            effect: card.effect,
            damage: card.damage,
            heal: card.heal,
            shield: card.shield
        });

        const {speechText, logText} = gameEngine.applyCard(card, gameEngine.player, gameEngine.enemy);

        if (speechText) {
            await visualManager.showSpeech(speechText, 'player');
        }

        if (card.usesLeft !== undefined) {
            card.usesLeft--;
            if (card.usesLeft <= 0) card.used = true;
        } else {
            card.used = true;
        }

        if (card.used) {
            gameEngine.player.cards = gameEngine.player.cards.filter(c => !c.used);
        }

        uiManager.renderStats(gameEngine.player, gameEngine.enemy);
        uiManager.renderCards(gameEngine.player.cards, gameEngine.playerTurn, gameEngine.playerHasPlayedCard, playMultiplayerCard);

        gameEngine.playerTurn = false;
        gameEngine.turn++;

        if (gameEngine.checkVictory()) {
            multiplayer.sendGameOver(multiplayer.playerId);
        }
    };

    // Запустить игру
    await gameEngine.startGame();

    // Хост ходит первым
    gameEngine.playerTurn = isHost;
    uiManager.renderCards(gameEngine.player.cards, gameEngine.playerTurn, gameEngine.playerHasPlayedCard, playMultiplayerCard);

    console.log(`✅ Мультиплеер игра началась. ${isHost ? 'Ваш ход!' : 'Ход противника'}`);
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
