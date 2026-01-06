// Юнит-тесты для мультиплеера ДУЕЛОГ
// Симулирует игру между двумя реальными игроками

class MultiplayerSimulator {
    constructor() {
        this.testResults = [];
    }

    // Создаем мок движка для каждого игрока
    createMockMultiplayerEngine(cardManager, isHost) {
        const engine = {
            cardManager: cardManager,
            turn: 1,
            gameActive: true,
            isMultiplayer: true,
            isHost: isHost,
            playerHasPlayedCard: false,

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

            // Система событий
            eventManager: typeof EventManager !== 'undefined' ? new EventManager() : null,
            currentTurnCards: { player: null, enemy: null },

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

            drawCardsToHandLimit(character) {
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
                    }
                }
            },

            applyCard(card, source, target) {
                let logDetails = [];
                let finalDamage = card.damage ?? 0;
                let finalHeal = card.heal ?? 0;
                let wasCancelled = false;
                const targetLastCard = target.lastCard;

                if (card.category === 'Уклонение') {
                    if (card.effect === 'cancel' && targetLastCard && source.lastCardEffects) {
                        wasCancelled = true;
                        if (source.lastCardEffects.logicDamage) source.logic += source.lastCardEffects.logicDamage;
                        if (source.lastCardEffects.emotionDamage) source.emotion += source.lastCardEffects.emotionDamage;
                        if (source.lastCardEffects.logicHeal) target.logic -= source.lastCardEffects.logicHeal;
                        if (source.lastCardEffects.emotionHeal) target.emotion -= source.lastCardEffects.emotionHeal;
                        delete source.lastCardEffects;
                    } else if (card.effect === 'mirror' && targetLastCard?.category === 'Атака') {
                        const damageMultiplier = this.getDamageMultiplier(source);
                        let mirrorDamage = Math.floor((targetLastCard.damage ?? 0) * (card.modifier ?? 0.75) * damageMultiplier);
                        const targetStat = targetLastCard.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : targetLastCard.effect;
                        target[targetStat] -= mirrorDamage;
                    } else if (card.effect === 'reflect' && targetLastCard?.category === 'Атака') {
                        const damageMultiplier = this.getDamageMultiplier(source);
                        let reflectDamage = Math.floor((targetLastCard.damage ?? 0) * damageMultiplier);
                        const targetStat = targetLastCard.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : targetLastCard.effect;
                        target[targetStat] -= reflectDamage;
                    }
                } else if (card.category === 'Атака' && !wasCancelled) {
                    const damageMultiplier = this.getDamageMultiplier(source);
                    finalDamage = Math.floor(finalDamage * damageMultiplier);

                    if (targetLastCard?.category === 'Защита') {
                        finalDamage = Math.floor(finalDamage * 1.5);
                    }

                    if (finalDamage > 0) {
                        const targetStat = card.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : card.effect;
                        if (target.shield && target.shield > 0) {
                            const absorbed = Math.min(target.shield, finalDamage);
                            target.shield -= absorbed;
                            finalDamage -= absorbed;
                            if (target.shield <= 0) delete target.shield;
                        }

                        if (finalDamage > 0) {
                            target[targetStat] -= finalDamage;
                            if (!target.lastCardEffects) target.lastCardEffects = {};
                            if (targetStat === 'logic') target.lastCardEffects.logicDamage = finalDamage;
                            else target.lastCardEffects.emotionDamage = finalDamage;
                        }
                    }
                } else if (card.category === 'Защита' && !wasCancelled) {
                    if (targetLastCard?.category === 'Уклонение') {
                        finalHeal = Math.floor(finalHeal * 1.5);
                    }

                    if (card.effect === 'shield') {
                        const shieldAmount = card.shield ?? 0;
                        source.shield = (source.shield ?? 0) + shieldAmount;
                        if (!target.lastCardEffects) target.lastCardEffects = {};
                        target.lastCardEffects.shieldAdded = shieldAmount;
                    } else if (finalHeal > 0) {
                        source[card.effect] += finalHeal;
                        if (!target.lastCardEffects) target.lastCardEffects = {};
                        if (card.effect === 'logic') target.lastCardEffects.logicHeal = finalHeal;
                        else target.lastCardEffects.emotionHeal = finalHeal;
                    }
                }

                source.lastCard = card;
                return { logText: logDetails.join(' ') };
            },

            checkPoints(winner, loser) {
                if (loser.logic <= 0 && !loser.logicDepleted) {
                    winner.points += 1;
                    loser.logicDepleted = true;
                }
                if (loser.emotion <= 0 && !loser.emotionDepleted) {
                    winner.points += 1;
                    loser.emotionDepleted = true;
                }
                if (loser.logic < 0 && loser.emotion < 0) {
                    loser.negativeTurns += 1;
                    if (loser.negativeTurns >= 3) {
                        winner.points += 1;
                        loser.negativeTurns = 0;
                    }
                } else {
                    loser.negativeTurns = 0;
                }
                if (loser.logic > 0) loser.logicDepleted = false;
                if (loser.emotion > 0) loser.emotionDepleted = false;
            },

            checkVictory() {
                if (this.player.points >= 3) return 'player';
                if (this.enemy.points >= 3) return 'enemy';
                return null;
            },

            processEvents() {
                if (!this.eventManager) return null;
                this.eventManager.recordTurn(this.currentTurnCards.player, this.currentTurnCards.enemy);
                const event = this.eventManager.checkForEvents(this.player, this.enemy);

                if (event && !event.ended && this.eventManager.activeEvent.duration === 0) {
                    const effects = this.eventManager.applyEventEffects(this.player, this.enemy);
                    if (effects) {
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
                    this.currentTurnCards = { player: null, enemy: null };
                    return event;
                }

                this.currentTurnCards = { player: null, enemy: null };
                return null;
            },

            // Симуляция хода игрока
            playCard(card) {
                if (!this.gameActive) return null;

                this.currentTurnCards.player = card;
                this.applyCard(card, this.player, this.enemy);

                if (card.usesLeft !== undefined) {
                    card.usesLeft--;
                    if (card.usesLeft <= 0) card.used = true;
                } else {
                    card.used = true;
                }

                if (card.used) {
                    this.player.discardPile.push(card);
                    this.player.cards = this.player.cards.filter(c => !c.used);
                }

                this.checkPoints(this.player, this.enemy);

                // Обрабатываем события после своего хода
                const event = this.processEvents();

                return { card, event };
            },

            // Симуляция получения хода противника
            handleOpponentMove(cardData) {
                if (!this.gameActive) return;

                this.turn++;
                this.currentTurnCards.enemy = cardData;

                this.applyCard(cardData, this.enemy, this.player);
                this.enemy.lastCard = cardData;

                this.checkPoints(this.enemy, this.player);

                // Обрабатываем события после хода противника
                const event = this.processEvents();

                this.drawCardsToHandLimit(this.player);
                this.drawCardsToHandLimit(this.enemy);

                return { event };
            }
        };

        return engine;
    }

    // Симуляция мультиплеер игры
    async simulateMultiplayerGame(cardManager) {
        const hostEngine = this.createMockMultiplayerEngine(cardManager, true);
        const guestEngine = this.createMockMultiplayerEngine(cardManager, false);

        // Инициализация колод
        hostEngine.player.deck = cardManager.createFullDeck(true);
        hostEngine.enemy.deck = cardManager.createFullDeck(false);
        hostEngine.player.cards = cardManager.getInitialPlayerCards(hostEngine.player);
        hostEngine.enemy.cards = cardManager.getInitialEnemyCards(hostEngine.enemy);

        // Для гостя: player и enemy меняются местами
        guestEngine.player.deck = JSON.parse(JSON.stringify(hostEngine.enemy.deck));
        guestEngine.enemy.deck = JSON.parse(JSON.stringify(hostEngine.player.deck));
        guestEngine.player.cards = JSON.parse(JSON.stringify(hostEngine.enemy.cards));
        guestEngine.enemy.cards = JSON.parse(JSON.stringify(hostEngine.player.cards));

        hostEngine.drawCardsToHandLimit(hostEngine.player);
        hostEngine.drawCardsToHandLimit(hostEngine.enemy);
        guestEngine.drawCardsToHandLimit(guestEngine.player);
        guestEngine.drawCardsToHandLimit(guestEngine.enemy);

        const log = {
            turns: [],
            hostEventsCount: 0,
            guestEventsCount: 0,
            winner: null
        };

        let turnCount = 0;
        const maxTurns = 50;

        while (hostEngine.gameActive && guestEngine.gameActive && turnCount < maxTurns) {
            turnCount++;

            const turnLog = { turnNumber: turnCount, hostEvent: null, guestEvent: null };

            // Ход хоста
            const hostCard = hostEngine.player.cards.filter(c => !c.used)[0];
            if (hostCard) {
                const hostResult = hostEngine.playCard(hostCard);
                if (hostResult.event) {
                    log.hostEventsCount++;
                    turnLog.hostEvent = hostResult.event.name;
                }

                // Гость получает ход хоста
                const guestResult = guestEngine.handleOpponentMove(JSON.parse(JSON.stringify(hostCard)));
                if (guestResult.event) {
                    log.guestEventsCount++;
                    turnLog.guestEvent = guestResult.event.name;
                }
            }

            // Проверка победы
            if (hostEngine.checkVictory() || guestEngine.checkVictory()) {
                log.winner = hostEngine.checkVictory() || guestEngine.checkVictory();
                log.turns.push(turnLog);
                break;
            }

            // Ход гостя
            const guestCard = guestEngine.player.cards.filter(c => !c.used)[0];
            if (guestCard) {
                const guestResult = guestEngine.playCard(guestCard);
                if (guestResult.event) {
                    log.guestEventsCount++;
                    if (!turnLog.guestEvent) turnLog.guestEvent = guestResult.event.name;
                }

                // Хост получает ход гостя
                const hostResult = hostEngine.handleOpponentMove(JSON.parse(JSON.stringify(guestCard)));
                if (hostResult.event) {
                    log.hostEventsCount++;
                    if (!turnLog.hostEvent) turnLog.hostEvent = hostResult.event.name;
                }
            }

            // Проверка победы
            if (hostEngine.checkVictory() || guestEngine.checkVictory()) {
                log.winner = hostEngine.checkVictory() || guestEngine.checkVictory();
                log.turns.push(turnLog);
                break;
            }

            log.turns.push(turnLog);
        }

        return log;
    }

    // Запуск тестов
    async runTests(numberOfGames = 5) {
        console.log(`%c🎮 Запуск мультиплеер тестов (${numberOfGames} игр)...`, 'color: #3498db; font-size: 16px; font-weight: bold');
        console.log('');

        const cardManager = new CardManager();
        await cardManager.loadCards('cards.json');

        let totalHostEvents = 0;
        let totalGuestEvents = 0;
        let eventSyncIssues = 0;

        for (let i = 1; i <= numberOfGames; i++) {
            console.log(`%c📊 Тест ${i}/${numberOfGames}...`, 'color: #95a5a6');

            const log = await this.simulateMultiplayerGame(cardManager);

            totalHostEvents += log.hostEventsCount;
            totalGuestEvents += log.guestEventsCount;

            // Проверяем синхронизацию событий
            log.turns.forEach(turn => {
                if (turn.hostEvent !== turn.guestEvent) {
                    eventSyncIssues++;
                    console.log(`  ⚠️  Ход ${turn.turnNumber}: Хост видел "${turn.hostEvent}", Гость видел "${turn.guestEvent}"`);
                }
            });

            console.log(`  ✓ Ходов: ${log.turns.length}, События хост: ${log.hostEventsCount}, События гость: ${log.guestEventsCount}`);
            this.testResults.push(log);
        }

        // Генерация отчёта
        console.log('');
        console.log('%c' + '='.repeat(80), 'color: #2c3e50');
        console.log('%c📈 ИТОГОВЫЙ ОТЧЁТ МУЛЬТИПЛЕЕР ТЕСТОВ', 'color: #2ecc71; font-size: 18px; font-weight: bold');
        console.log('%c' + '='.repeat(80), 'color: #2c3e50');
        console.log('');
        console.log(`  Всего игр:                   ${numberOfGames}`);
        console.log(`  События у хоста:             ${totalHostEvents}`);
        console.log(`  События у гостя:             ${totalGuestEvents}`);
        console.log(`  Проблем синхронизации:       ${eventSyncIssues}`);
        console.log('');

        if (eventSyncIssues === 0) {
            console.log('%c  ✅ События синхронизированы идеально!', 'color: #2ecc71; font-weight: bold');
        } else {
            console.log('%c  ❌ Обнаружены проблемы синхронизации событий!', 'color: #e74c3c; font-weight: bold');
        }

        console.log('');
        console.log('%c' + '='.repeat(80), 'color: #2c3e50');

        return { totalHostEvents, totalGuestEvents, eventSyncIssues };
    }
}

// Экспорт
window.multiplayerSimulator = new MultiplayerSimulator();
window.runMultiplayerTests = (games = 5) => window.multiplayerSimulator.runTests(games);

console.log('%c🎮 Мультиплеер симулятор загружен!', 'color: #2ecc71; font-weight: bold');
console.log('%cВведите %crunMultiplayerTests(5)%c для запуска 5 игр',
    'color: #95a5a6', 'color: #3498db; font-weight: bold', 'color: #95a5a6');
