// Комплексный симулятор геймплея ДУЕЛОГ
// Запускает 10 игр и собирает детальную статистику

class GameSimulator {
    constructor() {
        this.simulationResults = [];
        this.globalMetrics = {
            totalGames: 0,
            playerWins: 0,
            enemyWins: 0,
            averageTurns: 0,
            totalTurns: 0,

            // Статистика по картам
            cardUsageStats: {},
            categoryUsageStats: {
                'Атака': 0,
                'Защита': 0,
                'Уклонение': 0
            },

            // Статистика по урону/лечению
            totalDamageDealt: 0,
            totalHealingDone: 0,
            totalShieldCreated: 0,

            // Статистика по событиям
            eventTriggers: {},

            // Взаимодействия карт
            cardInteractions: {
                'Атака-Защита': 0,
                'Защита-Уклонение': 0,
                'Уклонение-Атака': 0,
                'mirror': 0,
                'reflect': 0,
                'cancel': 0
            },

            // Крайние случаи
            negativeStats: 0,
            shieldBreaks: 0,
            duplicateCardsAttempted: 0,

            // Метрики весов
            totalScalesChange: 0,
            avgFinalScales: 0,
            scalesVictories: 0,
            pointsVictories: 0
        };
    }

    // Создаем мок игровой движок
    createMockGameEngine(cardManager) {
        const engine = {
            cardManager: cardManager,
            turn: 0,
            gameActive: true,

            player: {
                logic: 4,
                maxLogic: 4,
                emotion: 4,
                maxEmotion: 4,
                points: 0,
                logicDepleted: false,
                emotionDepleted: false,
                negativeTurns: 0,
                cards: [],
                deck: [],
                discardPile: [],
                lastCard: null,
                usedTextVariants: {},
                discardCount: 0
            },

            enemy: {
                logic: 4,
                maxLogic: 4,
                emotion: 4,
                maxEmotion: 4,
                points: 0,
                logicDepleted: false,
                emotionDepleted: false,
                negativeTurns: 0,
                cards: [],
                deck: [],
                discardPile: [],
                lastCard: null,
                usedTextVariants: {},
                discardCount: 0
            },

            // Система весов убеждённости
            scales: 0,
            SCALES_MAX: 10,
            SCALES_MIN: -10,
            SCALES_THRESHOLDS: [4, 7, 10],
            scalesPointsEarned: { player: 0, enemy: 0 },

            // Система событий
            eventManager: typeof EventManager !== 'undefined' ? new EventManager() : null,
            currentTurnCards: { player: null, enemy: null },

            // Копируем логику из реального движка
            getDamageMultiplier(character) {
                const emotion = character.emotion ?? 0;
                if (emotion <= 0) return 0.5;
                if (emotion <= 2) return 0.75;
                if (emotion <= 4) return 1.0;
                if (emotion <= 6) return 1.25;
                return 1.5;
            },

            getHandLimit(character) {
                const logic = character.logic ?? 0;
                if (logic <= 0) return 3;
                if (logic <= 2) return 4;
                if (logic <= 4) return 5;
                if (logic <= 6) return 6;
                return 7;
            },

            applyDamageWithScales(target, targetStat, damage) {
                if (damage <= 0) return;
                const currentHP = target[targetStat] ?? 0;

                if (currentHP > 0) {
                    const actualDamage = Math.min(damage, currentHP);
                    const overflow = damage - actualDamage;
                    target[targetStat] = currentHP - actualDamage;

                    if (overflow > 0) {
                        const scalesShift = (target === this.player) ? -overflow : overflow;
                        this.scales = Math.max(this.SCALES_MIN, Math.min(this.SCALES_MAX, this.scales + scalesShift));
                    }
                } else {
                    const scalesShift = (target === this.player) ? -damage : damage;
                    this.scales = Math.max(this.SCALES_MIN, Math.min(this.SCALES_MAX, this.scales + scalesShift));
                }
            },

            drawCardsToHandLimit(character, metrics) {
                if (!character.deck || character.deck.length === 0) return;
                const handLimit = this.getHandLimit(character);
                const cardsToDraw = handLimit - character.cards.length;

                const existingCardNames = new Set(character.cards.map(c => c.name));

                for (let i = 0; i < cardsToDraw && character.deck.length > 0; i++) {
                    let attempts = 0;
                    let drawnCard = null;
                    const maxAttempts = character.deck.length;

                    while (attempts < maxAttempts) {
                        const randomIndex = Math.floor(Math.random() * character.deck.length);
                        const candidate = character.deck[randomIndex];

                        if (!existingCardNames.has(candidate.name)) {
                            drawnCard = character.deck.splice(randomIndex, 1)[0];
                            existingCardNames.add(drawnCard.name);
                            character.cards.push(drawnCard);
                            break;
                        }

                        attempts++;
                    }

                    if (!drawnCard && character.deck.length > 0) {
                        const randomIndex = Math.floor(Math.random() * character.deck.length);
                        drawnCard = character.deck.splice(randomIndex, 1)[0];
                        character.cards.push(drawnCard);
                        if (metrics) metrics.duplicateCardsAttempted++;
                    }
                }
            },

            applyCard(card, source, target, metrics) {
                let logDetails = [];
                let finalDamage = card.damage ?? 0;
                let finalHeal = card.heal ?? 0;
                let wasCancelled = false;
                const targetLastCard = target.lastCard;

                // Уклонение
                if (card.category === 'Уклонение') {
                    if (metrics) metrics.categoryUsageStats['Уклонение']++;

                    if (card.effect === 'cancel') {
                        if (targetLastCard && source.lastCardEffects) {
                            wasCancelled = true;
                            if (source.lastCardEffects.logicDamage) source.logic += source.lastCardEffects.logicDamage;
                            if (source.lastCardEffects.emotionDamage) source.emotion += source.lastCardEffects.emotionDamage;
                            if (source.lastCardEffects.logicHeal) target.logic -= source.lastCardEffects.logicHeal;
                            if (source.lastCardEffects.emotionHeal) target.emotion -= source.lastCardEffects.emotionHeal;
                            if (source.lastCardEffects.shieldAdded) {
                                target.shield = (target.shield ?? 0) - source.lastCardEffects.shieldAdded;
                                if (target.shield <= 0) delete target.shield;
                            }
                            logDetails.push(`(Отменяет "${targetLastCard.name}")`);
                            delete source.lastCardEffects;
                            if (metrics) metrics.cardInteractions.cancel++;
                        }
                    } else if (card.effect === 'mirror' && targetLastCard?.category === 'Атака') {
                        const damageMultiplier = this.getDamageMultiplier(source);
                        let mirrorDamage = Math.floor((targetLastCard.damage ?? 0) * (card.modifier ?? 0.75) * damageMultiplier);
                        const targetStat = targetLastCard.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : targetLastCard.effect;
                        target[targetStat] -= mirrorDamage;
                        logDetails.push(`-${mirrorDamage} ${targetStat} врагу`);
                        if (metrics) {
                            metrics.totalDamageDealt += mirrorDamage;
                            metrics.cardInteractions.mirror++;
                            metrics.cardInteractions['Уклонение-Атака']++;
                        }
                    } else if (card.effect === 'reflect' && targetLastCard?.category === 'Атака') {
                        const damageMultiplier = this.getDamageMultiplier(source);
                        let reflectDamage = Math.floor((targetLastCard.damage ?? 0) * damageMultiplier);
                        const targetStat = targetLastCard.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : targetLastCard.effect;
                        target[targetStat] -= reflectDamage;
                        logDetails.push(`-${reflectDamage} ${targetStat} отражено!`);
                        if (metrics) {
                            metrics.totalDamageDealt += reflectDamage;
                            metrics.cardInteractions.reflect++;
                            metrics.cardInteractions['Уклонение-Атака']++;
                        }
                    }
                }
                // Атака
                else if (card.category === 'Атака' && !wasCancelled) {
                    if (metrics) metrics.categoryUsageStats['Атака']++;

                    const damageMultiplier = this.getDamageMultiplier(source);
                    finalDamage = Math.floor(finalDamage * damageMultiplier);

                    if (targetLastCard?.category === 'Защита') {
                        finalDamage = Math.floor(finalDamage * 1.5);
                        logDetails.push('(Пробивает защиту!)');
                        if (metrics) metrics.cardInteractions['Атака-Защита']++;
                    }

                    if (finalDamage > 0) {
                        const targetStat = card.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : card.effect;

                        if (target.shield && target.shield > 0) {
                            const absorbed = Math.min(target.shield, finalDamage);
                            target.shield -= absorbed;
                            finalDamage -= absorbed;
                            logDetails.push(`(Щит: -${absorbed})`);

                            if (target.shield <= 0) {
                                delete target.shield;
                                logDetails.push('(Щит разрушен!)');
                                if (metrics) metrics.shieldBreaks++;
                            }
                        }

                        if (finalDamage > 0) {
                            this.applyDamageWithScales(target, targetStat, finalDamage);
                            logDetails.push(`-${finalDamage} ${targetStat}`);
                            if (!target.lastCardEffects) target.lastCardEffects = {};
                            if (targetStat === 'logic') target.lastCardEffects.logicDamage = finalDamage;
                            else target.lastCardEffects.emotionDamage = finalDamage;

                            if (metrics) metrics.totalDamageDealt += finalDamage;
                        }
                    }
                }
                // Защита
                else if (card.category === 'Защита' && !wasCancelled) {
                    if (metrics) metrics.categoryUsageStats['Защита']++;

                    if (targetLastCard?.category === 'Уклонение') {
                        finalHeal = Math.floor(finalHeal * 1.5);
                        logDetails.push('(Ловит в ловушку!)');
                        if (metrics) metrics.cardInteractions['Защита-Уклонение']++;
                    }

                    if (card.effect === 'shield') {
                        const shieldAmount = card.shield ?? 0;
                        source.shield = (source.shield ?? 0) + shieldAmount;
                        logDetails.push(`(Щит: +${shieldAmount})`);
                        if (!target.lastCardEffects) target.lastCardEffects = {};
                        target.lastCardEffects.shieldAdded = shieldAmount;
                        if (metrics) metrics.totalShieldCreated += shieldAmount;
                    } else if (finalHeal > 0) {
                        source[card.effect] += finalHeal;
                        logDetails.push(`+${finalHeal} ${card.effect}`);
                        if (!target.lastCardEffects) target.lastCardEffects = {};
                        if (card.effect === 'logic') target.lastCardEffects.logicHeal = finalHeal;
                        else target.lastCardEffects.emotionHeal = finalHeal;
                        if (metrics) metrics.totalHealingDone += finalHeal;
                    }
                }

                // Обновляем максимумы
                if (source.maxLogic === undefined) source.maxLogic = source.logic;
                if (source.maxEmotion === undefined) source.maxEmotion = source.emotion;
                source.maxLogic = Math.max(source.maxLogic, source.logic);
                source.maxEmotion = Math.max(source.maxEmotion, source.emotion);

                if (target.maxLogic === undefined) target.maxLogic = target.logic;
                if (target.maxEmotion === undefined) target.maxEmotion = target.emotion;
                target.maxLogic = Math.max(target.maxLogic, target.logic);
                target.maxEmotion = Math.max(target.maxEmotion, target.emotion);

                // Отслеживаем отрицательные значения
                if ((source.logic < 0 || source.emotion < 0 || target.logic < 0 || target.emotion < 0) && metrics) {
                    metrics.negativeStats++;
                }

                source.lastCard = card;

                return { logText: logDetails.join(' ') };
            },

            checkPoints() {
                // Новая система: точки зажигаются по достижению порогов весов
                if (this.scales > 0) {
                    for (let i = 0; i < this.SCALES_THRESHOLDS.length; i++) {
                        const threshold = this.SCALES_THRESHOLDS[i];
                        if (this.scales >= threshold && this.scalesPointsEarned.player < (i + 1)) {
                            this.player.points = i + 1;
                            this.scalesPointsEarned.player = i + 1;
                            break;
                        }
                    }
                } else if (this.scales < 0) {
                    for (let i = 0; i < this.SCALES_THRESHOLDS.length; i++) {
                        const threshold = -this.SCALES_THRESHOLDS[i];
                        if (this.scales <= threshold && this.scalesPointsEarned.enemy < (i + 1)) {
                            this.enemy.points = i + 1;
                            this.scalesPointsEarned.enemy = i + 1;
                            break;
                        }
                    }
                }
            },

            checkVictory() {
                // Проверка победы через весы
                if (this.scales >= this.SCALES_MAX) return 'player';
                if (this.scales <= this.SCALES_MIN) return 'enemy';

                // Проверка победы через очки
                if (this.player.points >= 3) return 'player';
                if (this.enemy.points >= 3) return 'enemy';
                return null;
            },

            processEvents(metrics) {
                if (!this.eventManager) return;
                this.eventManager.recordTurn(this.currentTurnCards.player, this.currentTurnCards.enemy);
                const event = this.eventManager.checkForEvents(this.player, this.enemy);
                if (event && !event.ended && this.eventManager.activeEvent.duration === 0) {
                    if (metrics) {
                        if (!metrics.eventTriggers[event.name]) {
                            metrics.eventTriggers[event.name] = 0;
                        }
                        metrics.eventTriggers[event.name]++;
                    }
                    const effects = this.eventManager.applyEventEffects(this.player, this.enemy);
                    if (effects) {
                        this.applyEventEffectsToCharacters(effects);
                    }
                }
                this.currentTurnCards = { player: null, enemy: null };
            },

            applyEventEffectsToCharacters(effects) {
                if (effects.player) {
                    if (effects.player.logic) this.player.logic += effects.player.logic;
                    if (effects.player.emotion) this.player.emotion += effects.player.emotion;
                    if (effects.player.maxLogicPenalty) this.player.maxLogic += effects.player.maxLogicPenalty;
                }
                if (effects.enemy) {
                    if (effects.enemy.logic) this.enemy.logic += effects.enemy.logic;
                    if (effects.enemy.emotion) this.enemy.emotion += effects.enemy.emotion;
                    if (effects.enemy.maxLogicPenalty) this.enemy.maxLogic += effects.enemy.maxLogicPenalty;
                }
            }
        };

        return engine;
    }

    // Симулируем одну игру
    async simulateGame(gameNumber, cardManager) {
        const gameLog = {
            gameNumber: gameNumber,
            turns: [],
            winner: null,
            finalStats: null,
            metrics: {
                totalDamageDealt: 0,
                totalHealingDone: 0,
                totalShieldCreated: 0,
                categoryUsageStats: {
                    'Атака': 0,
                    'Защита': 0,
                    'Уклонение': 0
                },
                cardUsageStats: {},
                cardInteractions: {
                    'Атака-Защита': 0,
                    'Защита-Уклонение': 0,
                    'Уклонение-Атака': 0,
                    'mirror': 0,
                    'reflect': 0,
                    'cancel': 0
                },
                negativeStats: 0,
                shieldBreaks: 0,
                duplicateCardsAttempted: 0,
                eventTriggers: {},
                finalScales: 0,
                scalesPointsEarned: { player: 0, enemy: 0 }
            }
        };

        const engine = this.createMockGameEngine(cardManager);

        // Инициализация колод
        engine.player.deck = cardManager.createFullDeck(true);
        engine.enemy.deck = cardManager.createFullDeck(false);

        // Стартовые руки
        engine.player.cards = cardManager.getInitialPlayerCards(engine.player);
        engine.enemy.cards = cardManager.getInitialEnemyCards(engine.enemy);

        // Начальная тяга карт
        engine.drawCardsToHandLimit(engine.player, gameLog.metrics);
        engine.drawCardsToHandLimit(engine.enemy, gameLog.metrics);

        let turnCount = 0;
        const maxTurns = 100; // Защита от бесконечных игр

        while (engine.gameActive && turnCount < maxTurns) {
            turnCount++;

            const turnLog = {
                turnNumber: turnCount,
                playerAction: null,
                enemyAction: null,
                playerStats: {
                    logic: engine.player.logic,
                    emotion: engine.player.emotion,
                    points: engine.player.points,
                    handSize: engine.player.cards.length,
                    deckSize: engine.player.deck.length,
                    discardSize: engine.player.discardPile.length,
                    shield: engine.player.shield ?? 0
                },
                enemyStats: {
                    logic: engine.enemy.logic,
                    emotion: engine.enemy.emotion,
                    points: engine.enemy.points,
                    handSize: engine.enemy.cards.length,
                    deckSize: engine.enemy.deck.length,
                    discardSize: engine.enemy.discardPile.length,
                    shield: engine.enemy.shield ?? 0
                }
            };

            // Ход игрока
            const playerAvailableCards = engine.player.cards.filter(c => !c.used);
            if (playerAvailableCards.length > 0) {
                const randomCard = playerAvailableCards[Math.floor(Math.random() * playerAvailableCards.length)];

                // Применяем карту
                const result = engine.applyCard(randomCard, engine.player, engine.enemy, gameLog.metrics);

                // Логируем использование карты
                if (!gameLog.metrics.cardUsageStats[randomCard.name]) {
                    gameLog.metrics.cardUsageStats[randomCard.name] = 0;
                }
                gameLog.metrics.cardUsageStats[randomCard.name]++;

                turnLog.playerAction = {
                    cardName: randomCard.name,
                    category: randomCard.category,
                    effect: randomCard.effect,
                    result: result.logText
                };

                // Обновляем карту
                if (randomCard.usesLeft !== undefined) {
                    randomCard.usesLeft--;
                    if (randomCard.usesLeft <= 0) randomCard.used = true;
                } else {
                    randomCard.used = true;
                }

                if (randomCard.used) {
                    engine.player.discardPile.push(randomCard);
                    engine.player.cards = engine.player.cards.filter(c => !c.used);
                }
                engine.currentTurnCards.player = randomCard;
            }

            engine.checkPoints();
            const victory = engine.checkVictory();
            if (victory) {
                engine.gameActive = false;
                gameLog.winner = victory;
                gameLog.turns.push(turnLog);
                break;
            }

            // Ход врага
            const enemyAvailableCards = engine.enemy.cards.filter(c => !c.used);
            if (enemyAvailableCards.length > 0) {
                const randomCard = enemyAvailableCards[Math.floor(Math.random() * enemyAvailableCards.length)];

                const result = engine.applyCard(randomCard, engine.enemy, engine.player, gameLog.metrics);

                if (!gameLog.metrics.cardUsageStats[randomCard.name]) {
                    gameLog.metrics.cardUsageStats[randomCard.name] = 0;
                }
                gameLog.metrics.cardUsageStats[randomCard.name]++;

                turnLog.enemyAction = {
                    cardName: randomCard.name,
                    category: randomCard.category,
                    effect: randomCard.effect,
                    result: result.logText
                };

                if (randomCard.usesLeft !== undefined) {
                    randomCard.usesLeft--;
                    if (randomCard.usesLeft <= 0) randomCard.used = true;
                } else {
                    randomCard.used = true;
                }

                if (randomCard.used) {
                    engine.enemy.discardPile.push(randomCard);
                    engine.enemy.cards = engine.enemy.cards.filter(c => !c.used);
                }
                engine.currentTurnCards.enemy = randomCard;
            }

            // Обработка событий в конце хода
            engine.processEvents(gameLog.metrics);

            engine.checkPoints();
            const victory2 = engine.checkVictory();
            if (victory2) {
                engine.gameActive = false;
                gameLog.winner = victory2;
                gameLog.turns.push(turnLog);
                break;
            }

            // Тянем карты
            engine.drawCardsToHandLimit(engine.player, gameLog.metrics);
            engine.drawCardsToHandLimit(engine.enemy, gameLog.metrics);

            gameLog.turns.push(turnLog);
        }

        gameLog.finalStats = {
            totalTurns: turnCount,
            player: {
                finalLogic: engine.player.logic,
                finalEmotion: engine.player.emotion,
                points: engine.player.points,
                cardsRemaining: engine.player.cards.length,
                deckRemaining: engine.player.deck.length,
                discarded: engine.player.discardPile.length
            },
            enemy: {
                finalLogic: engine.enemy.logic,
                finalEmotion: engine.enemy.emotion,
                points: engine.enemy.points,
                cardsRemaining: engine.enemy.cards.length,
                deckRemaining: engine.enemy.deck.length,
                discarded: engine.enemy.discardPile.length
            },
            finalScales: engine.scales
        };

        gameLog.metrics.finalScales = engine.scales;
        gameLog.metrics.scalesPointsEarned = { ...engine.scalesPointsEarned };

        return gameLog;
    }

    // Запуск симуляции
    async runSimulation(numberOfGames = 10) {
        console.log(`%c🎮 Запуск симуляции ${numberOfGames} игр...`, 'color: #3498db; font-size: 16px; font-weight: bold');
        console.log('');

        // Загружаем карты
        const cardManager = new CardManager();
        await cardManager.loadCards('cards.json');

        for (let i = 1; i <= numberOfGames; i++) {
            console.log(`%c📊 Симуляция игры ${i}/${numberOfGames}...`, 'color: #95a5a6');

            const gameLog = await this.simulateGame(i, cardManager);
            this.simulationResults.push(gameLog);

            // Обновляем глобальные метрики
            this.globalMetrics.totalGames++;
            this.globalMetrics.totalTurns += gameLog.finalStats.totalTurns;

            if (gameLog.winner === 'player') this.globalMetrics.playerWins++;
            else if (gameLog.winner === 'enemy') this.globalMetrics.enemyWins++;

            // Объединяем метрики
            this.globalMetrics.totalDamageDealt += gameLog.metrics.totalDamageDealt;
            this.globalMetrics.totalHealingDone += gameLog.metrics.totalHealingDone;
            this.globalMetrics.totalShieldCreated += gameLog.metrics.totalShieldCreated;
            this.globalMetrics.negativeStats += gameLog.metrics.negativeStats;
            this.globalMetrics.shieldBreaks += gameLog.metrics.shieldBreaks;
            this.globalMetrics.duplicateCardsAttempted += gameLog.metrics.duplicateCardsAttempted;

            // Категории
            for (const [category, count] of Object.entries(gameLog.metrics.categoryUsageStats)) {
                this.globalMetrics.categoryUsageStats[category] += count;
            }

            // Карты
            for (const [cardName, count] of Object.entries(gameLog.metrics.cardUsageStats)) {
                if (!this.globalMetrics.cardUsageStats[cardName]) {
                    this.globalMetrics.cardUsageStats[cardName] = 0;
                }
                this.globalMetrics.cardUsageStats[cardName] += count;
            }

            // Взаимодействия
            for (const [interaction, count] of Object.entries(gameLog.metrics.cardInteractions)) {
                this.globalMetrics.cardInteractions[interaction] += count;
            }

            // События
            for (const [eventName, count] of Object.entries(gameLog.metrics.eventTriggers)) {
                if (!this.globalMetrics.eventTriggers[eventName]) {
                    this.globalMetrics.eventTriggers[eventName] = 0;
                }
                this.globalMetrics.eventTriggers[eventName] += count;
            }

            // Метрики весов
            this.globalMetrics.totalScalesChange += Math.abs(gameLog.finalStats.finalScales);

            // Определяем тип победы
            if (gameLog.winner === 'player' || gameLog.winner === 'enemy') {
                if (gameLog.metrics.scalesPointsEarned.player === 3 || gameLog.metrics.scalesPointsEarned.enemy === 3) {
                    this.globalMetrics.pointsVictories++;
                }
                if (Math.abs(gameLog.finalStats.finalScales) >= 10) {
                    this.globalMetrics.scalesVictories++;
                }
            }

            console.log(`  ✓ Победитель: ${gameLog.winner === 'player' ? 'Игрок' : 'Враг'}, Ходов: ${gameLog.finalStats.totalTurns}, Весы: ${gameLog.finalStats.finalScales}`);
        }

        this.globalMetrics.averageTurns = this.globalMetrics.totalTurns / this.globalMetrics.totalGames;
        this.globalMetrics.avgFinalScales = this.globalMetrics.totalScalesChange / this.globalMetrics.totalGames;

        // Генерируем отчёт
        this.generateReport();

        return {
            globalMetrics: this.globalMetrics,
            gameResults: this.simulationResults
        };
    }

    // Генерация детального отчёта
    generateReport() {
        console.log('');
        console.log('%c' + '='.repeat(80), 'color: #2c3e50');
        console.log('%c📈 ИТОГОВЫЙ ОТЧЁТ СИМУЛЯЦИИ', 'color: #2ecc71; font-size: 18px; font-weight: bold');
        console.log('%c' + '='.repeat(80), 'color: #2c3e50');
        console.log('');

        // 1. Общая статистика
        console.log('%c🎯 ОБЩАЯ СТАТИСТИКА', 'color: #3498db; font-size: 14px; font-weight: bold');
        console.log(`  Всего игр:           ${this.globalMetrics.totalGames}`);
        console.log(`  Побед игрока:        ${this.globalMetrics.playerWins} (${((this.globalMetrics.playerWins / this.globalMetrics.totalGames) * 100).toFixed(1)}%)`);
        console.log(`  Побед врага:         ${this.globalMetrics.enemyWins} (${((this.globalMetrics.enemyWins / this.globalMetrics.totalGames) * 100).toFixed(1)}%)`);
        console.log(`  Средняя длина игры:  ${this.globalMetrics.averageTurns.toFixed(1)} ходов`);
        console.log('');

        // 2. Статистика урона/лечения
        console.log('%c⚔️  СТАТИСТИКА УРОНА И ЛЕЧЕНИЯ', 'color: #e74c3c; font-size: 14px; font-weight: bold');
        console.log(`  Всего урона:         ${this.globalMetrics.totalDamageDealt}`);
        console.log(`  Всего лечения:       ${this.globalMetrics.totalHealingDone}`);
        console.log(`  Всего щитов:         ${this.globalMetrics.totalShieldCreated}`);
        console.log(`  Разбито щитов:       ${this.globalMetrics.shieldBreaks}`);
        console.log(`  Соотношение урон/лечение: ${(this.globalMetrics.totalDamageDealt / this.globalMetrics.totalHealingDone).toFixed(2)}`);
        console.log('');

        // 3. Статистика по категориям
        console.log('%c📦 ИСПОЛЬЗОВАНИЕ КАТЕГОРИЙ КАРТ', 'color: #9b59b6; font-size: 14px; font-weight: bold');
        const totalCategoryUsage = Object.values(this.globalMetrics.categoryUsageStats).reduce((a, b) => a + b, 0);
        for (const [category, count] of Object.entries(this.globalMetrics.categoryUsageStats)) {
            const percentage = ((count / totalCategoryUsage) * 100).toFixed(1);
            console.log(`  ${category.padEnd(12)} ${count.toString().padStart(4)} использований (${percentage}%)`);
        }
        console.log('');

        // 4. TOP-10 самых используемых карт
        console.log('%c🃏 TOP-10 САМЫХ ИСПОЛЬЗУЕМЫХ КАРТ', 'color: #f39c12; font-size: 14px; font-weight: bold');
        const sortedCards = Object.entries(this.globalMetrics.cardUsageStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        sortedCards.forEach(([cardName, count], index) => {
            console.log(`  ${(index + 1).toString().padStart(2)}. ${cardName.padEnd(30)} ${count} раз`);
        });
        console.log('');

        // 5. Взаимодействия карт
        console.log('%c🔄 ВЗАИМОДЕЙСТВИЯ КАРТ', 'color: #16a085; font-size: 14px; font-weight: bold');
        for (const [interaction, count] of Object.entries(this.globalMetrics.cardInteractions)) {
            if (count > 0) {
                console.log(`  ${interaction.padEnd(25)} ${count} раз`);
            }
        }
        console.log('');

        // 6. Статистика по событиям
        console.log('%c⚡️ СТАТИСТИКА СРАБАТЫВАНИЯ СОБЫТИЙ', 'color: #f1c40f; font-size: 14px; font-weight: bold');
        const sortedEvents = Object.entries(this.globalMetrics.eventTriggers).sort(([, a], [, b]) => b - a);

        if (sortedEvents.length > 0) {
            sortedEvents.forEach(([eventName, count]) => {
                console.log(`  ${eventName.padEnd(30)} ${count} раз`);
            });
        } else {
            console.log('  Событий не зафиксировано.');
        }
        console.log('');

        // 7. Анализ баланса
        console.log('%c⚖️  АНАЛИЗ БАЛАНСА', 'color: #27ae60; font-size: 14px; font-weight: bold');

        const winRateDiff = Math.abs(this.globalMetrics.playerWins - this.globalMetrics.enemyWins);
        const balancePercentage = ((this.globalMetrics.totalGames - winRateDiff) / this.globalMetrics.totalGames) * 100;

        if (balancePercentage >= 80) {
            console.log(`  ✅ Баланс игры: ОТЛИЧНЫЙ (${balancePercentage.toFixed(1)}%)`);
        } else if (balancePercentage >= 60) {
            console.log(`  ⚠️  Баланс игры: ХОРОШИЙ (${balancePercentage.toFixed(1)}%)`);
        } else {
            console.log(`  ❌ Баланс игры: ТРЕБУЕТ УЛУЧШЕНИЯ (${balancePercentage.toFixed(1)}%)`);
        }

        const damageHealRatio = this.globalMetrics.totalDamageDealt / this.globalMetrics.totalHealingDone;
        if (damageHealRatio < 0.8) {
            console.log(`  ⚠️  Лечение слишком сильное (соотношение: ${damageHealRatio.toFixed(2)})`);
        } else if (damageHealRatio > 1.5) {
            console.log(`  ⚠️  Урон слишком сильный (соотношение: ${damageHealRatio.toFixed(2)})`);
        } else {
            console.log(`  ✅ Соотношение урон/лечение сбалансировано (${damageHealRatio.toFixed(2)})`);
        }

        console.log('');

        // 7. Крайние случаи
        console.log('%c🔍 КРАЙНИЕ СЛУЧАИ', 'color: #34495e; font-size: 14px; font-weight: bold');
        console.log(`  Отрицательные характеристики: ${this.globalMetrics.negativeStats} раз`);
        console.log(`  Попытки взять дубликат:       ${this.globalMetrics.duplicateCardsAttempted} раз`);

        if (this.globalMetrics.duplicateCardsAttempted === 0) {
            console.log(`  ✅ Система предотвращения дублей работает идеально!`);
        } else {
            console.log(`  ⚠️  Обнаружены попытки взять дубликаты (но это ожидаемо когда колода истощена)`);
        }

        console.log('');

        // 8. Статистика весов убеждённости
        console.log('%c⚖️  СИСТЕМА ВЕСОВ УБЕЖДЁННОСТИ', 'color: #e67e22; font-size: 14px; font-weight: bold');
        console.log(`  Среднее финальное значение весов: ${this.globalMetrics.avgFinalScales.toFixed(2)}`);
        console.log(`  Побед через весы (±10):           ${this.globalMetrics.scalesVictories} (${(this.globalMetrics.scalesVictories / this.globalMetrics.totalGames * 100).toFixed(1)}%)`);
        console.log(`  Побед через точки (3 точки):      ${this.globalMetrics.pointsVictories} (${(this.globalMetrics.pointsVictories / this.globalMetrics.totalGames * 100).toFixed(1)}%)`);

        const scalesVsPoints = this.globalMetrics.scalesVictories / Math.max(this.globalMetrics.pointsVictories, 1);
        if (scalesVsPoints > 2) {
            console.log(`  ⚠️  Слишком много побед через весы (${scalesVsPoints.toFixed(2)}x)`);
        } else if (scalesVsPoints < 0.5) {
            console.log(`  ⚠️  Слишком мало побед через весы (${scalesVsPoints.toFixed(2)}x)`);
        } else {
            console.log(`  ✅ Баланс между весами и точками хороший (${scalesVsPoints.toFixed(2)}x)`);
        }

        console.log('');
        console.log('%c' + '='.repeat(80), 'color: #2c3e50');
        console.log('%c✅ Симуляция завершена!', 'color: #2ecc71; font-size: 14px; font-weight: bold');
        console.log('%c' + '='.repeat(80), 'color: #2c3e50');
        console.log('');
        console.log('%c💡 Для доступа к детальным данным используйте:', 'color: #95a5a6');
        console.log('%c   simulator.simulationResults', 'color: #3498db; font-weight: bold');
        console.log('%c   simulator.globalMetrics', 'color: #3498db; font-weight: bold');
    }
}

// Экспорт для использования в консоли
window.simulator = new GameSimulator();
window.runSimulation = (games = 10) => window.simulator.runSimulation(games);

console.log('%c🎮 Симулятор игр загружен!', 'color: #2ecc71; font-weight: bold');
console.log('%cВведите %crunSimulation(10)%c для запуска 10 игр',
    'color: #95a5a6', 'color: #3498db; font-weight: bold', 'color: #95a5a6');
