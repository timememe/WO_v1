// Игровой движок ДУЕЛОГ
﻿// Содержит основную игровую логику
﻿
﻿// Глобальные константы для стартовых характеристик
﻿const PLAYER_START_LOGIC = 4;
﻿const PLAYER_START_EMOTION = 4;
﻿const ENEMY_START_LOGIC = 4;
﻿const ENEMY_START_EMOTION = 4;
﻿
﻿// Класс для управления игровой механикой
﻿class GameEngine {
﻿    constructor(cardManager, uiManager, visualManager, options = {}) {
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

        // В мультиплеере гость не должен инициализировать состояние сам
        if (!options.isGuest) {
            this.initializeNewGameState();
        }
    }

    initializeNewGameState() {
        this.player = { logic: PLAYER_START_LOGIC, maxLogic: PLAYER_START_LOGIC, emotion: PLAYER_START_EMOTION, maxEmotion: PLAYER_START_EMOTION, points: 0, logicDepleted: false, emotionDepleted: false, negativeTurns: 0, cards: [], deck: [], discardPile: [], lastCard: null, usedTextVariants: {}, discardCount: 0 };
        this.enemy = { logic: ENEMY_START_LOGIC, maxLogic: ENEMY_START_LOGIC, emotion: ENEMY_START_EMOTION, maxEmotion: ENEMY_START_EMOTION, points: 0, logicDepleted: false, emotionDepleted: false, negativeTurns: 0, cards: [], deck: [], discardPile: [], lastCard: null, usedTextVariants: {}, discardCount: 0 };
        
        this.player.deck = this.cardManager.createFullDeck(true);
        this.enemy.deck = this.cardManager.createFullDeck(false);

        this.player.cards = this.cardManager.getInitialPlayerCards(this.player);
        this.enemy.cards = this.cardManager.getInitialEnemyCards(this.enemy);

        this.ensureMinimumHandComposition(this.player, true);
        this.ensureMinimumHandComposition(this.enemy, false);
        console.log('New game state initialized');
    }

    getState() {
        // Создаем копии, чтобы избежать проблем с мутабельностью
        return JSON.parse(JSON.stringify({
            player: this.player,
            enemy: this.enemy,
            turn: this.turn,
            playerTurn: this.playerTurn,
            gameActive: this.gameActive,
            playerHasPlayedCard: this.playerHasPlayedCard
        }));
    }

    applyState(state) {
        // Применяем состояние, полученное от хоста
        // Важно: для гостя player - это противник, а enemy - это он сам. Меняем их местами.
        this.player = state.enemy;
        this.enemy = state.player;
        this.turn = state.turn;
        this.playerTurn = !state.playerTurn; // Инвертируем ход

        // Убедимся, что локальные свойства сброшены
        this.gameActive = state.gameActive;
        this.playerHasPlayedCard = false; 

        console.log('Game state synced from host');
        this.uiManager.updateStats(this.player, this.enemy);
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
    }
﻿
﻿    // =============================================
﻿    // =========== МЕТОДЫ ЗАПУСКА ИГРЫ ===========
﻿    // =============================================
﻿
﻿    async startGame() {
﻿        if (this.isMultiplayer) {
﻿            console.error('startGame() не должен вызываться в мультиплеере. Используйте initializeMultiplayerGame().');
﻿            return;
﻿        }
﻿
﻿        const playerStarts = Math.random() < 0.5;
﻿        const message = playerStarts
﻿            ? "Монетка упала на твою сторону! Ты начинаешь первым."
﻿            : "Монетка упала на сторону Скептика. Он начинает первым.";
﻿
﻿        this.uiManager.addMessage(message, 'enemy');
﻿        await this.visualManager.setVisual('idle');
﻿        await new Promise(resolve => setTimeout(resolve, 1500));
﻿
﻿        if (playerStarts) {
﻿            this.playerTurn = true;
﻿            this.turn = 1;
﻿        } else {
﻿            this.playerTurn = false;
﻿            this.turn = 1;
﻿            await this.enemyTurn(); // Ход бота
﻿        }
﻿
﻿        this.uiManager.updateStats(this.player, this.enemy);
﻿        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
﻿        await this.visualManager.setVisual('idle');
﻿    }
﻿
﻿        async initializeMultiplayerGame(isHost) {
﻿            this.playerTurn = isHost;
﻿            await this.visualManager.setVisual('idle'); // Устанавливаем начальный визуальный стиль
﻿            this.uiManager.updateStats(this.player, this.enemy);
﻿            this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
﻿            
﻿            const message = isHost ? "Комната создана. Вы ходите первым." : "Вы присоединились к игре. Ход противника.";
﻿            this.uiManager.addMessage(message, 'system');
﻿        }﻿
﻿    // =============================================
﻿    // =========== ОСНОВНАЯ ЛОГИКА ХОДА ===========
﻿    // =============================================
﻿
﻿    async playCard(card) {
﻿        if (!this.playerTurn || card.used || this.playerHasPlayedCard || !this.gameActive) return;
﻿        
﻿        this.playerHasPlayedCard = true;
﻿
﻿        // Применяем карту локально
﻿        const { speechText, logText } = this.applyCard(card, this.player, this.enemy);
﻿        const fullLogMessage = logText ? `${speechText} ${logText}` : speechText;
﻿        this.uiManager.addMessage(fullLogMessage, 'player', this.turn);
﻿        const speechPromise = this.visualManager.setVisual('player', speechText);
﻿
﻿        if (card.usesLeft !== undefined) {
﻿            card.usesLeft--;
﻿            if (card.usesLeft <= 0) card.used = true;
﻿        } else {
﻿            card.used = true;
﻿        }
﻿
﻿        if (card.used) {
﻿            this.recordDiscard(card, this.player);
﻿            this.player.cards = this.player.cards.filter(c => !c.used);
﻿        }
﻿
﻿        this.checkPoints(this.player, this.enemy);
﻿        this.uiManager.updateStats(this.player, this.enemy);
﻿
﻿        if (this.checkVictory()) {
﻿            await speechPromise;
﻿            return;
﻿        }
﻿
﻿        // Если это мультиплеер, отправляем ход на сервер
        if (this.isMultiplayer) {
            multiplayer.sendMove(card); // Отправляем весь объект карты
            this.playerTurn = false;
            this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
            await speechPromise;
            await this.visualManager.setVisual('idle');
        } else {
﻿            // В одиночной игре передаем ход боту
﻿            this.playerTurn = false;
﻿            this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
﻿            await speechPromise;
﻿            await this.visualManager.setVisual('enemy');
﻿            await this.enemyTurn();
﻿        }
﻿    }
﻿
﻿    async enemyTurn() {
﻿        if (this.isMultiplayer || !this.gameActive) return;
﻿        
﻿        this.turn++;
﻿
﻿        let availableCards = this.enemy.cards.filter(card => !card.used);
﻿        let speechText = '';
﻿        let logText = '';
﻿
﻿        if (availableCards.length > 0) {
﻿            let randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
﻿
﻿            if (randomCard.usesLeft !== undefined) {
﻿                randomCard.usesLeft--;
﻿                if (randomCard.usesLeft <= 0) randomCard.used = true;
﻿            } else {
﻿                randomCard.used = true;
﻿            }
﻿
﻿            const cardText = this.getCardSpeechText(randomCard, this.enemy);
﻿            const result = this.applyCard(randomCard, this.enemy, this.player, cardText);
﻿            speechText = result.speechText;
﻿            logText = result.logText ? `${cardText} ${result.logText}` : cardText;
﻿
﻿            if (randomCard.used) {
﻿                this.recordDiscard(randomCard, this.enemy);
﻿                this.enemy.cards = this.enemy.cards.filter(c => !c.used);
﻿            }
﻿        } else {
﻿            speechText = "Мне нечего сказать...";
﻿            logText = `Скептик: "${speechText}"`;
﻿        }
﻿
﻿        const speechPromise = this.visualManager.setVisual('enemy', speechText);
﻿        this.uiManager.addMessage(logText, 'enemy', this.turn);
﻿        this.checkPoints(this.enemy, this.player);
﻿        this.drawCardsToHandLimit(this.player);
﻿        this.uiManager.updateStats(this.player, this.enemy);
﻿
﻿        if (this.checkVictory()) {
﻿            await speechPromise;
﻿            return;
﻿        }
﻿
﻿        await speechPromise;
﻿
﻿        this.playerTurn = true;
﻿        this.playerHasPlayedCard = false;
﻿        this.uiManager.updateStats(this.player, this.enemy);
﻿        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
﻿        await this.visualManager.setVisual('idle');
﻿    }
﻿
﻿    async handleOpponentMove(cardData) {
﻿        if (!this.isMultiplayer || this.playerTurn || !this.gameActive) return;
﻿
﻿        console.log('📨 Получен ход противника:', cardData.name);
﻿        this.turn++;
﻿
﻿        const opponentCard = this.enemy.cards.find(c => c.name === cardData.name);
﻿        if (!opponentCard) {
﻿            console.error('❌ Карта противника не найдена в руке:', cardData.name);
﻿            // Можно запросить синхронизацию состояния у хоста
﻿            return;
﻿        }
﻿
﻿        const { speechText, logText } = this.applyCard(opponentCard, this.enemy, this.player);
﻿        const fullLogMessage = logText ? `${speechText} ${logText}` : speechText;
﻿        this.uiManager.addMessage(fullLogMessage, 'enemy', this.turn);
﻿        const speechPromise = this.visualManager.setVisual('enemy', speechText);
﻿
﻿        if (opponentCard.usesLeft !== undefined) {
﻿            opponentCard.usesLeft--;
﻿            if (opponentCard.usesLeft <= 0) opponentCard.used = true;
﻿        } else {
﻿            opponentCard.used = true;
﻿        }
﻿
﻿        if (opponentCard.used) {
﻿            this.recordDiscard(opponentCard, this.enemy);
﻿            this.enemy.cards = this.enemy.cards.filter(c => !c.used);
﻿        }
﻿
﻿        this.checkPoints(this.enemy, this.player);
﻿        this.drawCardsToHandLimit(this.player);
﻿        this.uiManager.updateStats(this.player, this.enemy);
﻿
﻿        if (this.checkVictory()) {
﻿            await speechPromise;
﻿            return;
﻿        }
﻿
﻿        await speechPromise;
﻿
﻿        this.playerTurn = true;
﻿        this.playerHasPlayedCard = false;
﻿        this.uiManager.updateStats(this.player, this.enemy);
﻿        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
﻿        await this.visualManager.setVisual('idle');
﻿    }
﻿
﻿
﻿    // =============================================
﻿    // ============ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===========
﻿    // =============================================
﻿
﻿    applyCard(card, source, target, presetSpeechText = null) {
﻿        // ... (этот метод остается почти без изменений)
﻿        const sourceBefore = { logic: source.logic, emotion: source.emotion, shield: source.shield };
﻿        const targetBefore = { logic: target.logic, emotion: target.emotion, shield: target.shield };
﻿        let speechText = presetSpeechText ?? this.getCardSpeechText(card, source);
﻿        let logDetails = [];
﻿        let finalDamage = card.damage ?? 0;
﻿        let finalHeal = card.heal ?? 0;
﻿        let wasCancelled = false;
﻿        const targetLastCard = target.lastCard;
﻿
﻿        if (card.category === 'Уклонение') {
﻿            if (card.effect === 'cancel') {
﻿                if (targetLastCard && source.lastCardEffects) {
﻿                    wasCancelled = true;
﻿                    if (source.lastCardEffects.logicDamage) source.logic = (source.logic ?? 0) + source.lastCardEffects.logicDamage;
﻿                    if (source.lastCardEffects.emotionDamage) source.emotion = (source.emotion ?? 0) + source.lastCardEffects.emotionDamage;
﻿                    if (source.lastCardEffects.logicHeal) target.logic = (target.logic ?? 0) - source.lastCardEffects.logicHeal;
﻿                    if (source.lastCardEffects.emotionHeal) target.emotion = (target.emotion ?? 0) - source.lastCardEffects.emotionHeal;
﻿                    if (source.lastCardEffects.shieldAdded) {
﻿                        target.shield = (target.shield ?? 0) - source.lastCardEffects.shieldAdded;
﻿                        if (target.shield <= 0) delete target.shield;
﻿                    }
﻿                    logDetails.push(`(Отменяет "${targetLastCard.name}")`);
﻿                    delete source.lastCardEffects;
﻿                }
﻿            } else if (card.effect === 'mirror' && targetLastCard?.category === 'Атака') {
﻿                const damageMultiplier = this.getDamageMultiplier(source);
﻿                let mirrorDamage = Math.floor((targetLastCard.damage ?? 0) * (card.modifier ?? 0.75) * damageMultiplier);
﻿                const targetStat = targetLastCard.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : targetLastCard.effect;
﻿                target[targetStat] = (target[targetStat] ?? 0) - mirrorDamage;
﻿                logDetails.push(`-${mirrorDamage} ${targetStat} врагу`);
﻿            } else if (card.effect === 'reflect' && targetLastCard?.category === 'Атака') {
﻿                const damageMultiplier = this.getDamageMultiplier(source);
﻿                let reflectDamage = Math.floor((targetLastCard.damage ?? 0) * damageMultiplier);
﻿                const targetStat = targetLastCard.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : targetLastCard.effect;
﻿                target[targetStat] = (target[targetStat] ?? 0) - reflectDamage;
﻿                logDetails.push(`-${reflectDamage} ${targetStat} отражено!`);
﻿            }
﻿        } else if (card.category === 'Атака' && !wasCancelled) {
﻿            const damageMultiplier = this.getDamageMultiplier(source);
﻿            finalDamage = Math.floor(finalDamage * damageMultiplier);
﻿            if (targetLastCard?.category === 'Защита') {
﻿                finalDamage = Math.floor(finalDamage * 1.5);
﻿                logDetails.push('(Пробивает защиту!)');
﻿            }
﻿            if (finalDamage > 0) {
﻿                const targetStat = card.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : card.effect;
﻿                if (target.shield && target.shield > 0) {
﻿                    const absorbed = Math.min(target.shield, finalDamage);
﻿                    target.shield -= absorbed;
﻿                    finalDamage -= absorbed;
﻿                    logDetails.push(`(Щит: -${absorbed})`);
﻿                    if (target.shield <= 0) {
﻿                        delete target.shield;
﻿                        logDetails.push('(Щит разрушен!)');
﻿                    }
﻿                }
﻿                if (finalDamage > 0) {
﻿                    target[targetStat] = (target[targetStat] ?? 0) - finalDamage;
﻿                    logDetails.push(`-${finalDamage} ${targetStat}`);
﻿                    if (!target.lastCardEffects) target.lastCardEffects = {};
﻿                    if (targetStat === 'logic') target.lastCardEffects.logicDamage = finalDamage;
﻿                    else target.lastCardEffects.emotionDamage = finalDamage;
﻿                }
﻿            }
﻿        } else if (card.category === 'Защита' && !wasCancelled) {
﻿            if (targetLastCard?.category === 'Уклонение') {
﻿                finalHeal = Math.floor(finalHeal * 1.5);
﻿                logDetails.push('(Ловит в ловушку!)');
﻿            }
﻿            if (card.effect === 'shield') {
﻿                const shieldAmount = card.shield ?? 0;
﻿                source.shield = (source.shield ?? 0) + shieldAmount;
﻿                logDetails.push(`(Щит: +${shieldAmount})`);
﻿                if (!target.lastCardEffects) target.lastCardEffects = {};
﻿                target.lastCardEffects.shieldAdded = shieldAmount;
﻿            } else if (finalHeal > 0) {
﻿                source[card.effect] = (source[card.effect] ?? 0) + finalHeal;
﻿                logDetails.push(`+${finalHeal} ${card.effect}`);
﻿                if (!target.lastCardEffects) target.lastCardEffects = {};
﻿                if (card.effect === 'logic') target.lastCardEffects.logicHeal = finalHeal;
﻿                else target.lastCardEffects.emotionHeal = finalHeal;
﻿            }
﻿        }
﻿
﻿        if (card.fromDiscard) {
﻿            let repeatCardIndex = target.cards.findIndex(c => c.name === "Повторение" && !c.used);
﻿            if (repeatCardIndex !== -1) {
﻿                logDetails.push('(Обнулено: "Ты уже это говорил!")');
﻿                target.cards[repeatCardIndex].used = true;
﻿            } else {
﻿                this.addCardsToHand(this.cardManager.getRepeatCard(), target);
﻿            }
﻿        }
﻿
﻿        this.updateMaxStats(source);
﻿        this.updateMaxStats(target);
﻿        source.lastCard = card;
﻿
﻿        return { speechText, logText: logDetails.join(' ') };
﻿    }
﻿
﻿    checkPoints(winner, loser) {
﻿        // ... (без изменений)
﻿        if (loser.logic <= 0 && !loser.logicDepleted) {
﻿            winner.points += 1;
﻿            loser.logicDepleted = true;
﻿            this.uiManager.addMessage(`${winner === this.player ? "Ты" : "Скептик"} зажигает точку! Логика исчерпана.`, winner === this.player ? 'player' : 'enemy');
﻿        }
﻿        if (loser.emotion <= 0 && !loser.emotionDepleted) {
﻿            winner.points += 1;
﻿            loser.emotionDepleted = true;
﻿            this.uiManager.addMessage(`${winner === this.player ? "Ты" : "Скептик"} зажигает точку! Эмоции исчерпаны.`, winner === this.player ? 'player' : 'enemy');
﻿        }
﻿        if (loser.logic < 0 && loser.emotion < 0) {
﻿            loser.negativeTurns += 1;
﻿            if (loser.negativeTurns >= 3) {
﻿                winner.points += 1;
﻿                this.uiManager.addMessage(`${winner === this.player ? "Ты" : "Скептик"} зажигает точку! ${loser === this.player ? "Ты" : "Скептик"} слишком долго в смятении!`, winner === this.player ? 'player' : 'enemy');
﻿                loser.negativeTurns = 0;
﻿            }
﻿        } else {
﻿            loser.negativeTurns = 0;
﻿        }
﻿        if (loser.logic > 0) loser.logicDepleted = false;
﻿        if (loser.emotion > 0) loser.emotionDepleted = false;
﻿    }
﻿
﻿    checkVictory() {
﻿        // ... (без изменений)
﻿        if (this.player.points >= 3) {
﻿            this.uiManager.addMessage("Ты победил! Все 3 твои точки зажжены!", 'player');
﻿            this.lastVictorySpeechPromise = this.visualManager.setVisual('player', "Победа!");
﻿            this.endGame(true);
﻿            return true;
﻿        } else if (this.enemy.points >= 3) {
﻿            this.uiManager.addMessage("Скептик победил! Ты проиграл!", 'enemy');
﻿            this.lastVictorySpeechPromise = this.visualManager.setVisual('enemy', "Поражение!");
﻿            this.endGame(false);
﻿            return true;
﻿        }
﻿        this.lastVictorySpeechPromise = null;
﻿        return false;
﻿    }
﻿
﻿    endGame(victory) {
﻿        this.gameActive = false;
﻿    }
﻿
﻿    // ... (остальные вспомогательные методы: getCardSpeechText, recordDiscard, drawCardsToHandLimit и т.d. остаются без изменений)
﻿    hasCardInHand(character, cardName) { return character.cards.some(c => c.name === cardName); }
﻿    addCardsToHand(card, character) { if (!card) return; if (this.hasCardInHand(character, card.name)) { return; } const handLimit = this.getHandLimit(character); if (character.cards.length < handLimit) { character.cards.push(card); } else { const discarded = character.cards.shift(); if (discarded) { this.recordDiscard(discarded, character); } character.cards.push(card); } }
﻿    addCounterCard(lastCard, character, isPlayer = true) { const counterCard = this.cardManager.getCounterCard(lastCard, character, isPlayer); if (counterCard) { this.addCardsToHand(counterCard, character); } }
﻿    updateMaxStats(character) { if (!character) return; if (character.maxLogic === undefined) character.maxLogic = character.logic; if (character.maxEmotion === undefined) character.maxEmotion = character.emotion; character.maxLogic = Math.max(character.maxLogic, character.logic); character.maxEmotion = Math.max(character.maxEmotion, character.emotion); }
﻿    getHandLimit(character) { const logic = character.logic ?? 0; if (logic <= 0) return 3; if (logic <= 2) return 4; if (logic <= 4) return 5; if (logic <= 6) return 6; return 7; }
﻿    getCardSpeechText(card, owner) { if (!card) return ''; if (!owner.usedTextVariants) owner.usedTextVariants = {}; const variants = Array.isArray(card.textVariants) ? card.textVariants : []; if (variants.length > 0) { let tracker = owner.usedTextVariants[card.name]; if (!tracker || !Array.isArray(tracker.used) || tracker.used.length !== variants.length) { tracker = { used: new Array(variants.length).fill(false) }; owner.usedTextVariants[card.name] = tracker; } const used = tracker.used; const nextIndex = used.findIndex(flag => !flag); if (nextIndex !== -1) { used[nextIndex] = true; card.currentVariantIndex = nextIndex; return variants[nextIndex]; } card.currentVariantIndex = Math.min(card.currentVariantIndex ?? 0, variants.length - 1); return variants[card.currentVariantIndex] ?? card.text ?? ''; } if (card.currentVariantIndex === undefined || card.currentVariantIndex === null) { card.currentVariantIndex = 0; } return this.cardManager.getCardText(card); }
﻿    recordDiscard(card, owner) { if (!card || !owner) return; if (!owner.discardPile) owner.discardPile = []; owner.discardPile.push(card); owner.discardCount = (owner.discardCount ?? 0) + 1; }
﻿    drawCardsToHandLimit(character) { if (!character.deck || character.deck.length === 0) return; const handLimit = this.getHandLimit(character); const cardsToDraw = handLimit - character.cards.length; for (let i = 0; i < cardsToDraw && character.deck.length > 0; i++) { const randomIndex = Math.floor(Math.random() * character.deck.length); const drawnCard = character.deck.splice(randomIndex, 1)[0]; character.cards.push(drawnCard); } }
﻿    getDamageMultiplier(character) { const emotion = character.emotion ?? 0; if (emotion <= 0) return 0.5; if (emotion <= 2) return 0.75; if (emotion <= 4) return 1.0; if (emotion <= 6) return 1.25; return 1.5; }
﻿    ensureMinimumHandComposition(character, isPlayer = true) { const handLimit = this.getHandLimit(character); const cardsByCategory = { 'Атака': character.cards.filter(c => c.category === 'Атака').length, 'Защита': character.cards.filter(c => c.category === 'Защита').length, 'Уклонение': character.cards.filter(c => c.category === 'Уклонение').length }; const missingTypes = []; if (cardsByCategory['Атака'] === 0 && character.cards.length < handLimit) { missingTypes.push('Атака'); } if (cardsByCategory['Защита'] === 0 && character.cards.length < handLimit) { missingTypes.push('Защита'); } if (cardsByCategory['Уклонение'] === 0 && character.cards.length < handLimit) { missingTypes.push('Уклонение'); } for (const type of missingTypes) { let card = null; if (type === 'Атака') { const attackPool = isPlayer ? this.cardManager.basePlayerCards : this.cardManager.baseEnemyCards; card = this.cardManager.getWeightedCard(character, attackPool); } else if (type === 'Защита') { card = this.cardManager.getDefenseCard(character); } else if (type === 'Уклонение') { if (this.cardManager.evasionCards.length) { card = this.cardManager.getUniqueCard(this.cardManager.evasionCards, character); } } if (card) { this.addCardsToHand(card, character); } } }
﻿    addDefenseWhenLow(character) { if ((character.logic < 0 && !character.logicNegative) || (character.emotion < 0 && !character.emotionNegative)) { const defenseCard = this.cardManager.getDefenseCard(character); if (defenseCard) { this.addCardsToHand(defenseCard, character); } if (character.logic < 0) character.logicNegative = true; if (character.emotion < 0) character.emotionNegative = true; } if (character.logic >= 0) character.logicNegative = false; if (character.emotion >= 0) character.emotionNegative = false; }
﻿}
﻿
﻿console.log('✅ Модуль engine.js загружен');
