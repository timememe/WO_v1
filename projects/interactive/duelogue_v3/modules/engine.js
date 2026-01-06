// Игровой движок ДУЕЛОГ
// Содержит основную игровую логику

// Глобальные константы для стартовых характеристик (теперь это мана/силы убеждения)
const PLAYER_START_LOGIC = 10;
const PLAYER_START_EMOTION = 10;
const ENEMY_START_LOGIC = 10;
const ENEMY_START_EMOTION = 10;

// Класс для управления игровой механикой
class GameEngine {
    constructor(cardManager, uiManager, visualManager, options = {}) {
        this.cardManager = cardManager;
        this.uiManager = uiManager;
        this.visualManager = visualManager;
        this.isMultiplayer = options.isMultiplayer || false;

        // Это состояние будет инициализировано или перезаписано
        this.player = {};
        this.enemy = {};
        this.turn = 1;
        this.playerTurn = true;
        this.gameActive = true;
        this.playerHasPlayedCard = false;
        this.lastVictorySpeechPromise = null;
        this.log = [];

        // Система событий
        this.eventManager = typeof EventManager !== 'undefined' ? new EventManager() : null;
        this.currentTurnCards = { player: null, enemy: null };

        // В мультиплеере гость не должен инициализировать состояние сам
        if (!options.isGuest) {
            this.initializeNewGameState();
        }
    }

    initializeNewGameState() {
        this.player = {
            logic: PLAYER_START_LOGIC,
            maxLogic: PLAYER_START_LOGIC,
            emotion: PLAYER_START_EMOTION,
            maxEmotion: PLAYER_START_EMOTION,
            breakthroughs: 0, // Количество совершенных "прорывов"
            cards: [],
            deck: [],
            discardPile: [],
            lastCard: null,
            usedTextVariants: {},
            discardCount: 0
        };
        this.enemy = {
            logic: ENEMY_START_LOGIC,
            maxLogic: ENEMY_START_LOGIC,
            emotion: ENEMY_START_EMOTION,
            maxEmotion: ENEMY_START_EMOTION,
            breakthroughs: 0, // Количество совершенных "прорывов"
            cards: [],
            deck: [],
            discardPile: [],
            lastCard: null,
            usedTextVariants: {},
            discardCount: 0
        };

        // Система весов убеждённости (теперь центральная механика)
        this.scales = 0; // От -10 до +10
        this.SCALES_MAX = 10;
        this.SCALES_MIN = -10;

        // Пороги для "Прорывов" на шкале весов
        // При пересечении этих порогов игрок совершает прорыв и получает награду
        this.BREAKTHROUGH_THRESHOLDS = [5, 10]; // Положительные пороги
        this.currentBreakthroughThresholdIndex = 0; // Для отслеживания следующего порога игрока
        this.currentEnemyBreakthroughThresholdIndex = 0; // Для отслеживания следующего порога противника
        this.lastPlayerBreakthroughValue = 0; // Последнее значение шкалы, на котором игрок совершил прорыв
        this.lastEnemyBreakthroughValue = 0; // Последнее значение шкалы, на котором противник совершил прорыв


        this.player.deck = this.cardManager.createFullDeck(true);
        this.enemy.deck = this.cardManager.createFullDeck(false);

        this.player.cards = this.cardManager.getInitialPlayerCards(this.player);
        this.enemy.cards = this.cardManager.getInitialEnemyCards(this.enemy);
        
        console.log('New game state initialized with mana/scales system');
    }

    getState() {
        // Создаем копии, чтобы избежать проблем с мутабельностью
        return JSON.parse(JSON.stringify({
            player: this.player,
            enemy: this.enemy,
            turn: this.turn,
            playerTurn: this.playerTurn,
            gameActive: this.gameActive,
            playerHasPlayedCard: this.playerHasPlayedCard,
            scales: this.scales,
            currentBreakthroughThresholdIndex: this.currentBreakthroughThresholdIndex,
            currentEnemyBreakthroughThresholdIndex: this.currentEnemyBreakthroughThresholdIndex,
            lastPlayerBreakthroughValue: this.lastPlayerBreakthroughValue,
            lastEnemyBreakthroughValue: this.lastEnemyBreakthroughValue
        }));
    }

    applyState(state) {
        // Применяем состояние, полученное от хоста
        // Важно: для гостя player - это противник, а enemy - это он сам. Меняем их местами.
        this.player = state.enemy;
        this.enemy = state.player;
        this.turn = state.turn;
        this.playerTurn = !state.playerTurn; // Инвертируем ход

        // Обновляем состояние весов и порогов для корректного отображения и синхронизации
        this.scales = -state.scales; // Инвертируем весы для гостя
        this.currentBreakthroughThresholdIndex = state.currentEnemyBreakthroughThresholdIndex;
        this.currentEnemyBreakthroughThresholdIndex = state.currentBreakthroughThresholdIndex;
        this.lastPlayerBreakthroughValue = -state.lastEnemyBreakthroughValue; // Инвертируем значение
        this.lastEnemyBreakthroughValue = -state.lastPlayerBreakthroughValue; // Инвертируем значение

        // Убедимся, что локальные свойства сброшены
        this.gameActive = state.gameActive;
        this.playerHasPlayedCard = false; 

        console.log('Game state synced from host');
        this.uiManager.updateStats(this.player, this.enemy);
        if (this.uiManager.updateScales) this.uiManager.updateScales(this.scales); // Обновляем весы в UI
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
    }

    // =============================================
    // =========== МЕТОДЫ ЗАПУСКА ИГРЫ ===========
    // =============================================

    async startGame() {
        if (this.isMultiplayer) {
            console.error('startGame() не должен вызываться в мультиплеере. Используйте initializeMultiplayerGame().');
            return;
        }

        const playerStarts = Math.random() < 0.5;
        const message = playerStarts
            ? "Монетка упала на твою сторону! Ты начинаешь первым."
            : "Монетка упала на сторону Скептика. Он начинает первым.";

        this.uiManager.addMessage(message, 'enemy');
        await this.visualManager.showIdle();
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (playerStarts) {
            this.playerTurn = true;
            this.turn = 1;
        } else {
            this.playerTurn = false;
            this.turn = 1;
            await this.enemyTurn(); // Ход бота
        }

        this.uiManager.updateStats(this.player, this.enemy);
        if (this.uiManager.updateScales) this.uiManager.updateScales(this.scales);
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
        await this.visualManager.showIdle();
    }

    async initializeMultiplayerGame(isHost) {
        this.playerTurn = isHost;
        await this.visualManager.showIdle(); // Устанавливаем начальный визуальный стиль
        this.uiManager.updateStats(this.player, this.enemy);
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));

        const message = isHost ? "Комната создана. Вы ходите первым." : "Вы присоединились к игре. Ход противника.";
        this.uiManager.addMessage(message, 'system');
    }
    // =============================================
    // =========== ОСНОВНАЯ ЛОГИКА ХОДА ===========
    // =============================================

    async playCard(card) {
        if (!this.playerTurn || this.playerHasPlayedCard || !this.gameActive) return;

        // Проверка стоимости карты
        if (!this._canPlayCard(card, this.player)) {
            this.uiManager.addMessage(`Недостаточно сил убеждения для карты "${card.name}"!`, 'system');
            return;
        }
        
        // Списываем стоимость
        this._payCardCost(card, this.player);
        this.uiManager.updateStats(this.player, this.enemy); // Обновляем UI сразу после списания маны
        
        this.playerHasPlayedCard = true;

        // Записываем карту для событий (если EventManager есть)
        if (this.eventManager) {
            this.currentTurnCards.player = card;
        }
        
        const oldScalesValue = this.scales; // Сохраняем значение до применения карты

        // Применяем карту локально
        const { speechText, logText } = this.applyCard(card, this.player, this.enemy);
        const fullLogMessage = logText ? `${speechText} ${logText}` : speechText;
        this.uiManager.addMessage(fullLogMessage, 'player', this.turn);
        const speechPromise = this.visualManager.showPlayerTurn(speechText);
        
        // Убираем карту из руки
        this.recordDiscard(card, this.player); // Карта уходит в сброс после использования
        this.player.cards = this.player.cards.filter(c => c !== card); // Удаляем сыгранную карту из руки

        // Проверяем прорывы после изменения весов
        this.checkBreakthroughs(this.player, this.enemy, oldScalesValue);

        // Если это мультиплеер, отправляем ход на сервер
        if (this.isMultiplayer) {
            multiplayer.sendMove(card); // Отправляем весь объект карты
            this.playerTurn = false;
            this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
            await speechPromise;
            await this.visualManager.showIdle();
        } else {
            // В одиночной игре передаем ход боту
            this.playerTurn = false;
            this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
            await speechPromise;
            // Переходим к ходу противника (анимация загрузится в enemyTurn)
            await this.enemyTurn();
        }
    }

    checkBreakthroughs(actingPlayer, opponentPlayer, oldScalesValue) {
        const currentScales = this.scales;
        const breakthroughThresholds = this.BREAKTHROUGH_THRESHOLDS;
        let madeBreakthrough = false;

        // --- Проверка прорывов для действующего игрока (actingPlayer) ---
        if (actingPlayer === this.player) {
            // Проверяем, совершил ли Игрок прорыв в свою сторону (положительные значения шкалы)
            while (this.currentBreakthroughThresholdIndex < breakthroughThresholds.length &&
                   currentScales >= breakthroughThresholds[this.currentBreakthroughThresholdIndex]) {
                
                // Убеждаемся, что порог действительно пересечен, а не просто достигнут (то есть, oldScalesValue был ниже порога)
                if (oldScalesValue < breakthroughThresholds[this.currentBreakthroughThresholdIndex]) {
                    this.player.breakthroughs += 1;
                    this.uiManager.addMessage(`💪 Ты совершил ПРОРЫВ ${this.player.breakthroughs}!`, 'player');
                    
                    // Окупаемость: восстанавливаем ману действующему игроку
                    actingPlayer.logic = actingPlayer.maxLogic;
                    actingPlayer.emotion = actingPlayer.maxEmotion;
                    // TODO: Решить, давать ли добор карт или это слишком сильно для прототипа
                    // this.drawCardsToHandLimit(actingPlayer); 
                    this.uiManager.addMessage('Твои силы убеждения восстановлены!', 'system');
                    this.lastPlayerBreakthroughValue = this.scales; // Запоминаем текущее значение шкалы
                    madeBreakthrough = true;
                }
                this.currentBreakthroughThresholdIndex++; // Продвигаем порог для следующего прорыва
            }

            // Проверяем, не совершил ли противник прорыв, если весы были сдвинуты в его сторону
            // (это может произойти, если карта игрока сдвинула весы против игрока)
            while (this.currentEnemyBreakthroughThresholdIndex < breakthroughThresholds.length &&
                   currentScales <= -breakthroughThresholds[this.currentEnemyBreakthroughThresholdIndex]) {
                
                // Проверяем, что порог действительно пересечен
                if (oldScalesValue > -breakthroughThresholds[this.currentEnemyBreakthroughThresholdIndex]) {
                    this.enemy.breakthroughs += 1;
                    this.uiManager.addMessage(`🤖 Скептик совершил ПРОРЫВ ${this.enemy.breakthroughs}!`, 'enemy');
                    
                    // Окупаемость для Противника (восстанавливаем его ману)
                    opponentPlayer.logic = opponentPlayer.maxLogic;
                    opponentPlayer.emotion = opponentPlayer.maxEmotion;
                    this.uiManager.addMessage('Силы убеждения Скептика восстановлены!', 'system');
                    this.lastEnemyBreakthroughValue = this.scales;
                    madeBreakthrough = true;
                }
                this.currentEnemyBreakthroughThresholdIndex++;
            }

        } else { // --- Противник совершает действие (actingPlayer === this.enemy) ---
            // Проверяем, совершил ли Противник прорыв в свою сторону (отрицательные значения шкалы)
            while (this.currentEnemyBreakthroughThresholdIndex < breakthroughThresholds.length &&
                   currentScales <= -breakthroughThresholds[this.currentEnemyBreakthroughThresholdIndex]) {
                
                if (oldScalesValue > -breakthroughThresholds[this.currentEnemyBreakthroughThresholdIndex]) {
                    this.enemy.breakthroughs += 1;
                    this.uiManager.addMessage(`🤖 Скептик совершил ПРОРЫВ ${this.enemy.breakthroughs}!`, 'enemy');
                    
                    // Окупаемость для Противника
                    actingPlayer.logic = actingPlayer.maxLogic;
                    actingPlayer.emotion = actingPlayer.maxEmotion;
                    this.uiManager.addMessage('Силы убеждения Скептика восстановлены!', 'system');
                    this.lastEnemyBreakthroughValue = this.scales;
                    madeBreakthrough = true;
                }
                this.currentEnemyBreakthroughThresholdIndex++;
            }

            // Проверяем, не совершил ли Игрок прорыв, если весы были сдвинуты в его сторону
            // (может произойти, если карта противника сдвинула весы в пользу игрока)
            while (this.currentBreakthroughThresholdIndex < breakthroughThresholds.length &&
                   currentScales >= breakthroughThresholds[this.currentBreakthroughThresholdIndex]) {
                
                if (oldScalesValue < breakthroughThresholds[this.currentBreakthroughThresholdIndex]) {
                    this.player.breakthroughs += 1;
                    this.uiManager.addMessage(`💪 Ты совершил ПРОРЫВ ${this.player.breakthroughs}!`, 'player');
                    
                    // Окупаемость для Игрока
                    opponentPlayer.logic = opponentPlayer.maxLogic;
                    opponentPlayer.emotion = opponentPlayer.maxEmotion;
                    this.uiManager.addMessage('Твои силы убеждения восстановлены!', 'system');
                    this.lastPlayerBreakthroughValue = this.scales;
                    madeBreakthrough = true;
                }
                this.currentBreakthroughThresholdIndex++;
            }
        }
        
        // Если кто-то совершил прорыв, сбрасываем весы к 0
        if (madeBreakthrough) {
            this.scales = 0; // Сбрасываем шкалу весов после прорыва
            this.uiManager.addMessage('Шкала убеждения сбрасывается к нейтральной позиции!', 'system');
        }

        this.uiManager.updateScales(this.scales);
        this.uiManager.updateStats(this.player, this.enemy);
    }

    checkVictory() {
        // Победа теперь через количество "прорывов"
        const BREAKTHROUGHS_TO_WIN = 3; 

        if (this.player.breakthroughs >= BREAKTHROUGHS_TO_WIN) {
            this.handleGameEnd(true, 'breakthroughs');
            return true;
        } else if (this.enemy.breakthroughs >= BREAKTHROUGHS_TO_WIN) {
            this.handleGameEnd(false, 'breakthroughs');
            return true;
        }
        return false;
    }

    async enemyTurn() {
        if (this.isMultiplayer || !this.gameActive) return;

        this.turn++;

        let availableCards = this.enemy.cards; // Теперь карты не имеют свойства .used в новой механике
        console.log(`🤖 Enemy turn ${this.turn}: ${availableCards.length} available cards из ${this.enemy.cards.length} total, ${this.enemy.deck.length} left in deck`);
        let speechText = '';
        let logText = '';
        let playedCard = null; // Переименовал randomCard в playedCard

        // Поиск карты, которую AI может себе позволить
        let playableCards = availableCards.filter(card => this._canPlayCard(card, this.enemy));

        if (playableCards.length > 0) {
            // Временно, AI просто играет случайную карту из тех, что может себе позволить
            playedCard = playableCards[Math.floor(Math.random() * playableCards.length)];

            // Списываем стоимость
            this._payCardCost(playedCard, this.enemy);
            this.uiManager.updateStats(this.player, this.enemy); // Обновляем UI сразу после списания маны

            // Записываем карту для событий (если EventManager есть)
            if (this.eventManager) {
                this.currentTurnCards.enemy = playedCard;
            }

            const cardText = this.getCardSpeechText(playedCard, this.enemy);
            const oldScalesValue = this.scales; // Сохраняем значение до применения карты
            const result = this.applyCard(playedCard, this.enemy, this.player, cardText);
            speechText = result.speechText;
            logText = result.logText ? `${cardText} ${result.logText}` : cardText;

            // Убираем карту из руки
            this.recordDiscard(playedCard, this.enemy);
            this.enemy.cards = this.enemy.cards.filter(c => c !== playedCard); // Удаляем сыгранную карту из руки
            
            // Проверяем прорывы после изменения весов
            this.checkBreakthroughs(this.enemy, this.player, oldScalesValue);

        } else {
            speechText = "Мне нечего сказать...";
            logText = `Скептик: "${speechText}"`;
            this.uiManager.addMessage(logText, 'enemy', this.turn);
            // Если AI не может играть карты, он пропускает ход, но, возможно, должен что-то сделать для восстановления маны или добора карт?
            // Пока просто пропускаем ход, ожидая, что drawCardsToHandLimit поможет.
        }

        const speechPromise = this.visualManager.showEnemyTurn(speechText);
        // Сообщение уже добавлено выше, если карта была сыграна. Если нет - то сообщение про "Нечего сказать" уже в логе.

        // Обрабатываем события
        this.processEvents();

        // Тянем карты обоим игрокам после хода
        this.drawCardsToHandLimit(this.player);
        this.drawCardsToHandLimit(this.enemy);

        this.uiManager.updateStats(this.player, this.enemy);

        if (this.checkVictory()) {
            await speechPromise;
            return;
        }

        await speechPromise;

        this.playerTurn = true;
        this.playerHasPlayedCard = false;
        this.uiManager.updateStats(this.player, this.enemy);
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
        await this.visualManager.showIdle();
    }

    async handleOpponentMove(cardData) {
        if (!this.isMultiplayer || this.playerTurn || !this.gameActive) return;

        console.log('📨 Получен ход противника:', cardData.name);
        this.turn++;

        const opponentCard = cardData;

        // Записываем карту для событий
        if (this.eventManager) {
            this.currentTurnCards.enemy = opponentCard;
        }

        const oldScalesValue = this.scales; // Сохраняем значение до применения карты

        const { speechText, logText } = this.applyCard(opponentCard, this.enemy, this.player);
        const fullLogMessage = logText ? `${speechText} ${logText}` : speechText;
        this.uiManager.addMessage(fullLogMessage, 'enemy', this.turn);
        const speechPromise = this.visualManager.showEnemyTurn(speechText);

        // Обновляем lastCard противника для механик зеркала/отмены
        this.enemy.lastCard = opponentCard;

        // Проверяем прорывы после изменения весов
        this.checkBreakthroughs(this.enemy, this.player, oldScalesValue);

        // Обрабатываем события (как в сингле) после получения хода противника
        this.processEvents();

        // Тянем карты обоим игрокам (как в сингле)
        this.drawCardsToHandLimit(this.player);
        this.drawCardsToHandLimit(this.enemy);

        this.uiManager.updateStats(this.player, this.enemy);
        
        if (this.checkVictory()) {
            await speechPromise;
            return;
        }
        
        await speechPromise;

        this.playerTurn = true;
        this.playerHasPlayedCard = false;
        this.uiManager.updateStats(this.player, this.enemy);
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
        await this.visualManager.showIdle();
    }

    // =============================================
    // ============ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===========
    // =============================================

    applyCard(card, source, target, presetSpeechText = null) {
        let speechText = presetSpeechText ?? this.getCardSpeechText(card, source);
        let logDetails = [];
        let scalesShift = card.scalesShift || 0; // Изменение весов, которое дает карта
        
        // В этой версии игры убираем сложную логику взаимодействия категорий и "уронов",
        // фокусируемся на изменении весов и мане.

        if (card.category === 'Атака') {
            // Атака сдвигает весы в пользу источника
            this.scales += scalesShift * (source === this.player ? 1 : -1);
            logDetails.push(`⚖️ Весы: ${scalesShift > 0 ? '+' : ''}${scalesShift}`);
        } else if (card.category === 'Защита') {
            // Защита может сдвигать весы в пользу источника (пока что)
            // TODO: Защита должна иметь более сложный эффект, например, "блокировать следующий сдвиг весов оппонента"
            this.scales += scalesShift * (source === this.player ? 1 : -1);
            logDetails.push(`⚖️ Весы: ${scalesShift > 0 ? '+' : ''}${scalesShift} (Защита)`);
        } else if (card.category === 'Уклонение') {
            // Уклонение может иметь эффект "отмены" или "обращения" сдвига весов оппонента (пока что)
            // TODO: Уклонение должно иметь более сложный эффект, например, отменять действие последней карты оппонента
            this.scales += scalesShift * (source === this.player ? 1 : -1);
            logDetails.push(`⚖️ Весы: ${scalesShift > 0 ? '+' : ''}${scalesShift} (Уклонение)`);
        }

        // Ограничиваем весы максимальными/минимальными значениями
        this.scales = Math.max(this.SCALES_MIN, Math.min(this.SCALES_MAX, this.scales));

        return { speechText, logText: logDetails.join(' ') };
    }

    async handleGameEnd(isVictory, reason) {
        if (!this.gameActive) return; // Предотвратить двойное срабатывание
        this.gameActive = false;

        let message, speech;
        if (reason === 'breakthroughs') {
            message = isVictory
                ? `Ты победил! Совершено ${this.player.breakthroughs} прорыва!`
                : `Скептик победил! Совершено ${this.enemy.breakthroughs} прорыва!`;
            speech = isVictory ? "Победа!" : "Поражение!";
        } else { // Fallback, если вдруг причина не "breakthroughs"
            message = isVictory ? "Ты победил!" : "Скептик победил!";
            speech = isVictory ? "Победа!" : "Поражение!";
        }

        this.uiManager.addMessage(message, isVictory ? 'player' : 'enemy');
        if (isVictory) {
            await this.visualManager.showPlayerTurn(speech);
        } else {
            await this.visualManager.showEnemyTurn(speech);
        }

        // Показываем экран завершения игры
        if (typeof showEndgameScreen === 'function') {
            showEndgameScreen(isVictory);
        }

        // Логируем результат, если это одиночная игра
        if (!this.isMultiplayer && typeof logSinglePlayerResult === 'function') {
            const result = {
                win: isVictory,
                score: isVictory ? this.player.breakthroughs : this.enemy.breakthroughs, // Итоговый счет
                deck_name: deckManager.getSelectedDeck()?.name || 'Неизвестная колода',
                opponent_name: 'Скептик' // Имя AI
            };
            logSinglePlayerResult(result);
        }
    }

    // ... (остальные вспомогательные методы)
    hasCardInHand(character, cardName) { return character.cards.some(c => c.name === cardName); }
    addCardsToHand(card, character) { if (!card) return; if (this.hasCardInHand(character, card.name)) { return; } const handLimit = this.getHandLimit(character); if (character.cards.length < handLimit) { character.cards.push(card); } else { const discarded = character.cards.shift(); if (discarded) { this.recordDiscard(discarded, character); } character.cards.push(card); } }
    addCounterCard(lastCard, character, isPlayer = true) { const counterCard = this.cardManager.getCounterCard(lastCard, character, isPlayer); if (counterCard) { this.addCardsToHand(counterCard, character); } }
    
    getHandLimit(character) { 
        // Лимит руки теперь фиксирован для прототипа
        return 5;
    }
    
    getCardSpeechText(card, owner) { if (!card) return ''; if (!owner.usedTextVariants) owner.usedTextVariants = {}; const variants = Array.isArray(card.textVariants) ? card.textVariants : []; if (variants.length > 0) { let tracker = owner.usedTextVariants[card.name]; if (!tracker || !Array.isArray(tracker.used) || tracker.used.length !== variants.length) { tracker = { used: new Array(variants.length).fill(false) }; owner.usedTextVariants[card.name] = tracker; } const used = tracker.used; const nextIndex = used.findIndex(flag => !flag); if (nextIndex !== -1) { used[nextIndex] = true; card.currentVariantIndex = nextIndex; return variants[nextIndex]; } card.currentVariantIndex = Math.min(card.currentVariantIndex ?? 0, variants.length - 1); return variants[card.currentVariantIndex] ?? card.text ?? ''; } if (card.currentVariantIndex === undefined || card.currentVariantIndex === null) { card.currentVariantIndex = 0; } return this.cardManager.getCardText(card); }
    recordDiscard(card, owner) { if (!card || !owner) return; if (!owner.discardPile) owner.discardPile = []; owner.discardPile.push(card); owner.discardCount = (owner.discardCount ?? 0) + 1; }
    drawCardsToHandLimit(character) {
        if (!character.deck || character.deck.length === 0) return;
        const handLimit = this.getHandLimit(character);
        const cardsToDraw = handLimit - character.cards.length;

        // Создаем Set существующих имен карт в руке для быстрой проверки
        const existingCardNames = new Set(character.cards.map(c => c.name));

        for (let i = 0; i < cardsToDraw && character.deck.length > 0; i++) {
            // Пытаемся найти карту, которой нет в руке
            let attempts = 0;
            let drawnCard = null;
            const maxAttempts = character.deck.length;

            while (attempts < maxAttempts) {
                const randomIndex = Math.floor(Math.random() * character.deck.length);
                const candidate = character.deck[randomIndex];

                // Если карты с таким именем нет в руке - берем её
                if (!existingCardNames.has(candidate.name)) {
                    drawnCard = character.deck.splice(randomIndex, 1)[0];
                    existingCardNames.add(drawnCard.name);
                    character.cards.push(drawnCard);
                    break;
                }

                attempts++;
            }

            // Если не нашли уникальную карту после всех попыток, значит в колоде только дубли
            // В этом случае просто берем случайную карту
            if (!drawnCard && character.deck.length > 0) {
                const randomIndex = Math.floor(Math.random() * character.deck.length);
                drawnCard = character.deck.splice(randomIndex, 1)[0];
                character.cards.push(drawnCard);
                console.warn(`⚠️ Пришлось взять дубликат карты "${drawnCard.name}", т.к. в колоде нет уникальных`);
            }
        }
    }


    processEvents() {
        if (!this.eventManager) return;

        // Записываем ход в историю
        this.eventManager.recordTurn(this.currentTurnCards.player, this.currentTurnCards.enemy);

        // Проверяем события
        const event = this.eventManager.checkForEvents(this.player, this.enemy);

        if (event) {
            if (event.ended) {
                // Событие завершилось
                this.uiManager.addMessage(event.message, 'system');
            } else {
                // Новое событие или продолжение активного
                if (this.eventManager.activeEvent.duration === 0) {
                    // Только что началось
                    this.uiManager.addMessage(`⚡ СОБЫТИЕ: ${event.name}`, 'system');
                    this.uiManager.addMessage(event.message, 'system');
                }

                // Применяем эффекты события
                const effects = this.eventManager.applyEventEffects(this.player, this.enemy);
                if (effects && effects.message) {
                    this.applyEventEffectsToCharacters(effects);
                    this.uiManager.addMessage(effects.message, 'system');
                }
            }
        }

        // Сбрасываем карты хода
        this.currentTurnCards = { player: null, enemy: null };
    }

    applyEventEffectsToCharacters(effects) {
        // Применяем эффекты к игроку
        if (effects.player) {
            if (effects.player.logic) this.player.logic += effects.player.logic;
            if (effects.player.emotion) this.player.emotion += effects.player.emotion;
            if (effects.player.maxLogicPenalty) this.player.maxLogic += effects.player.maxLogicPenalty;
        }

        // Применяем эффекты к противнику
        if (effects.enemy) {
            if (effects.enemy.logic) this.enemy.logic += effects.enemy.logic;
            if (effects.enemy.emotion) this.enemy.emotion += effects.enemy.emotion;
            if (effects.enemy.maxLogicPenalty) this.enemy.maxLogic += effects.enemy.maxLogicPenalty;
        }

        // Обновляем статы после применения эффектов
        this.uiManager.updateStats(this.player, this.enemy);
    }
    
    _canPlayCard(card, player) {
        const costLogic = card.costLogic || 0;
        const costEmotion = card.costEmotion || 0;
        return player.logic >= costLogic && player.emotion >= costEmotion;
    }

    _payCardCost(card, player) {
        const costLogic = card.costLogic || 0;
        const costEmotion = card.costEmotion || 0;
        player.logic -= costLogic;
        player.emotion -= costEmotion;
        // Убедимся, что мана не уходит в минус
        player.logic = Math.max(0, player.logic);
        player.emotion = Math.max(0, player.emotion);
    }
}
    
console.log('✅ Модуль engine.js загружен');
