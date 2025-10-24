// ============================================
// DUELOGUE v2 - GAME SIMULATION TESTS
// ============================================
// Автоматическое тестирование баланса игры

// Импорт модулей (для Node.js окружения потребуется настройка)
// В браузере модули загружаются через script tags

class GameSimulator {
    constructor() {
        this.results = {
            totalGames: 0,
            playerWins: 0,
            enemyWins: 0,
            draws: 0,
            winReasons: {},
            loseReasons: {},
            totalTurns: 0,
            totalRounds: 0,
            totalScales: 0,
            totalVulnerabilities: 0,
            totalMomentumChains: 0,
            maxMomentumSeen: 0,
            totalPlayerLogic: 0,
            totalPlayerEmotion: 0,
            totalEnemyLogic: 0,
            totalEnemyEmotion: 0,
            gamesData: []
        };
    }

    // Простой ИИ для симуляции
    chooseCard(engine, isPlayer) {
        const actor = isPlayer ? engine.player : engine.enemy;
        const deck = isPlayer ? playerCards : enemyCards;
        const usedCards = isPlayer ? engine.usedPlayerCards : engine.usedEnemyCards;

        const availableCards = deck.filter(
            card => !usedCards.includes(card) && engine.canAffordCard(card, actor)
        );

        if (availableCards.length === 0) return null;

        // Приоритет 1: vulnerability
        const lastTurn = engine.getLastTurn(!isPlayer);
        if (lastTurn) {
            const vulnCard = availableCards.find(
                card => card.type === lastTurn.card.vulnerability
            );
            if (vulnCard) return vulnCard;
        }

        // Приоритет 2: momentum
        if (engine.momentum.chain > 0) {
            const chainCard = availableCards.find(
                card => card.type === engine.momentum.type
            );
            if (chainCard && Math.random() > 0.3) return chainCard;
        }

        // Приоритет 3: экономия ресурсов
        if (actor.logic <= 2 && actor.emotion > 2) {
            const emotionCards = availableCards.filter(c => c.type === CardType.EMOTION);
            if (emotionCards.length > 0) {
                return emotionCards[Math.floor(Math.random() * emotionCards.length)];
            }
        }
        if (actor.emotion <= 2 && actor.logic > 2) {
            const logicCards = availableCards.filter(c => c.type === CardType.LOGIC);
            if (logicCards.length > 0) {
                return logicCards[Math.floor(Math.random() * logicCards.length)];
            }
        }

        // Случайная карта
        return availableCards[Math.floor(Math.random() * availableCards.length)];
    }

    simulateSingleGame() {
        const engine = new GameEngine();
        engine.initGame(playerCards, enemyCards);

        const gameData = {
            turns: 0,
            rounds: 0,
            finalScales: 0,
            winner: null,
            reason: null,
            playerFinalLogic: 0,
            playerFinalEmotion: 0,
            enemyFinalLogic: 0,
            enemyFinalEmotion: 0,
            vulnerabilities: 0,
            momentumChains: 0,
            maxMomentum: 0
        };

        let infiniteLoopProtection = 0;
        const MAX_TURNS = 100;

        while (engine.gameState === 'playing' && infiniteLoopProtection < MAX_TURNS) {
            infiniteLoopProtection++;

            // Ход игрока
            const playerCard = this.chooseCard(engine, true);
            if (!playerCard) {
                console.warn('Player has no valid moves');
                break;
            }

            const playerTurn = engine.playCard(playerCard, true);
            if (!playerTurn) break;

            gameData.turns++;
            if (playerTurn.vulnerabilityTriggered) gameData.vulnerabilities++;
            if (playerTurn.momentumBonus > 0) {
                gameData.momentumChains++;
                gameData.maxMomentum = Math.max(gameData.maxMomentum, engine.momentum.chain);
            }

            if (engine.gameState !== 'playing') break;

            // Ход противника
            const enemyCard = this.chooseCard(engine, false);
            if (!enemyCard) {
                console.warn('Enemy has no valid moves');
                break;
            }

            const enemyTurn = engine.playCard(enemyCard, false);
            if (!enemyTurn) break;

            gameData.turns++;
            if (enemyTurn.vulnerabilityTriggered) gameData.vulnerabilities++;
            if (enemyTurn.momentumBonus > 0) {
                gameData.momentumChains++;
                gameData.maxMomentum = Math.max(gameData.maxMomentum, engine.momentum.chain);
            }
        }

        gameData.rounds = engine.currentRound;
        gameData.finalScales = engine.scalesValue;
        gameData.winner = engine.gameState;
        gameData.reason = engine.winReason || engine.loseReason || 'timeout';
        gameData.playerFinalLogic = engine.player.logic;
        gameData.playerFinalEmotion = engine.player.emotion;
        gameData.enemyFinalLogic = engine.enemy.logic;
        gameData.enemyFinalEmotion = engine.enemy.emotion;

        return gameData;
    }

    runSimulation(gamesCount = 100) {
        console.log(`\n🎮 === ЗАПУСК СИМУЛЯЦИИ ${gamesCount} ИГР ===\n`);

        const startTime = Date.now();

        for (let i = 0; i < gamesCount; i++) {
            const gameData = this.simulateSingleGame();
            this.results.gamesData.push(gameData);
            this.results.totalGames++;

            // Подсчёт результатов
            if (gameData.winner === 'won') {
                this.results.playerWins++;
                this.results.winReasons[gameData.reason] =
                    (this.results.winReasons[gameData.reason] || 0) + 1;
            } else if (gameData.winner === 'lost') {
                this.results.enemyWins++;
                this.results.loseReasons[gameData.reason] =
                    (this.results.loseReasons[gameData.reason] || 0) + 1;
            } else {
                this.results.draws++;
            }

            this.results.totalTurns += gameData.turns;
            this.results.totalRounds += gameData.rounds;
            this.results.totalScales += gameData.finalScales;
            this.results.totalVulnerabilities += gameData.vulnerabilities;
            this.results.totalMomentumChains += gameData.momentumChains;
            this.results.maxMomentumSeen = Math.max(this.results.maxMomentumSeen, gameData.maxMomentum);
            this.results.totalPlayerLogic += gameData.playerFinalLogic;
            this.results.totalPlayerEmotion += gameData.playerFinalEmotion;
            this.results.totalEnemyLogic += gameData.enemyFinalLogic;
            this.results.totalEnemyEmotion += gameData.enemyFinalEmotion;

            if ((i + 1) % 100 === 0) {
                console.log(`  Прогресс: ${i + 1}/${gamesCount} игр...`);
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n⏱️  Симуляция завершена за ${duration} секунд\n`);

        this.printResults();
        return this.getAnalysis();
    }

    printResults() {
        const r = this.results;
        const avgTurns = (r.totalTurns / r.totalGames).toFixed(1);
        const avgRounds = (r.totalRounds / r.totalGames).toFixed(1);
        const avgScales = (r.totalScales / r.totalGames).toFixed(2);
        const avgPlayerLogic = (r.totalPlayerLogic / r.totalGames).toFixed(1);
        const avgPlayerEmotion = (r.totalPlayerEmotion / r.totalGames).toFixed(1);
        const avgEnemyLogic = (r.totalEnemyLogic / r.totalGames).toFixed(1);
        const avgEnemyEmotion = (r.totalEnemyEmotion / r.totalGames).toFixed(1);

        console.log('═══════════════════════════════════════════════════');
        console.log('📊 РЕЗУЛЬТАТЫ СИМУЛЯЦИИ');
        console.log('═══════════════════════════════════════════════════\n');

        console.log('🎯 ОБЩАЯ СТАТИСТИКА:');
        console.log(`  Всего игр: ${r.totalGames}`);
        console.log(`  Побед игрока: ${r.playerWins} (${(r.playerWins/r.totalGames*100).toFixed(1)}%)`);
        console.log(`  Побед скептика: ${r.enemyWins} (${(r.enemyWins/r.totalGames*100).toFixed(1)}%)`);
        console.log(`  Ничьих: ${r.draws} (${(r.draws/r.totalGames*100).toFixed(1)}%)\n`);

        const winRate = r.playerWins / r.totalGames * 100;
        console.log('⚖️  АНАЛИЗ БАЛАНСА:');
        if (winRate >= 45 && winRate <= 55) {
            console.log('  ✅ ИДЕАЛЬНЫЙ БАЛАНС (45-55% побед)');
        } else if (winRate >= 40 && winRate <= 60) {
            console.log('  ✅ ХОРОШИЙ БАЛАНС (40-60% побед)');
        } else if (winRate >= 35 && winRate <= 65) {
            console.log('  ⚠️  ПРИЕМЛЕМЫЙ БАЛАНС (35-65% побед)');
        } else {
            console.log('  ❌ КРИТИЧНЫЙ ДИСБАЛАНС! Требуется корректировка механик');
        }
        console.log('');

        console.log('🏆 ПРИЧИНЫ ПОБЕД ИГРОКА:');
        for (const [reason, count] of Object.entries(r.winReasons)) {
            console.log(`  ${reason}: ${count} (${(count/r.playerWins*100).toFixed(1)}%)`);
        }
        console.log('');

        console.log('💀 ПРИЧИНЫ ПОРАЖЕНИЙ ИГРОКА:');
        for (const [reason, count] of Object.entries(r.loseReasons)) {
            console.log(`  ${reason}: ${count} (${(count/r.enemyWins*100).toFixed(1)}%)`);
        }
        console.log('');

        console.log('📈 СРЕДНИЕ ПОКАЗАТЕЛИ:');
        console.log(`  Ходов за игру: ${avgTurns}`);
        console.log(`  Раундов за игру: ${avgRounds}`);
        console.log(`  Финальная позиция весов: ${avgScales}`);
        console.log(`  Финальные ресурсы игрока: ${avgPlayerLogic}🧠 ${avgPlayerEmotion}❤️`);
        console.log(`  Финальные ресурсы скептика: ${avgEnemyLogic}🧠 ${avgEnemyEmotion}❤️\n`);

        console.log('🔧 ИСПОЛЬЗОВАНИЕ МЕХАНИК:');
        const vulnRate = (r.totalVulnerabilities / r.totalTurns * 100).toFixed(1);
        const momentumRate = (r.totalMomentumChains / r.totalTurns * 100).toFixed(1);
        console.log(`  Срабатываний Vulnerability: ${r.totalVulnerabilities} (${vulnRate}% ходов)`);
        console.log(`  Использований Momentum: ${r.totalMomentumChains} (${momentumRate}% ходов)`);
        console.log(`  Максимальная цепь Momentum: ${r.maxMomentumSeen}\n`);

        console.log('═══════════════════════════════════════════════════\n');
    }

    getAnalysis() {
        const r = this.results;
        const winRate = r.playerWins / r.totalGames * 100;
        const avgRounds = r.totalRounds / r.totalGames;
        const avgTurns = r.totalTurns / r.totalGames;
        const vulnRate = (r.totalVulnerabilities / r.totalTurns) * 100;
        const momentumRate = (r.totalMomentumChains / r.totalTurns) * 100;

        const scalesWins = (r.winReasons['scales'] || 0) / Math.max(r.playerWins, 1) * 100;
        const resourceWins = ((r.winReasons['resources'] || 0) + (r.winReasons['resources_tie'] || 0)) / Math.max(r.playerWins, 1) * 100;

        return {
            balance: {
                status: winRate >= 45 && winRate <= 55 ? 'ideal' :
                       winRate >= 40 && winRate <= 60 ? 'good' :
                       winRate >= 35 && winRate <= 65 ? 'acceptable' : 'critical',
                winRate: winRate.toFixed(1)
            },
            gameDuration: {
                status: avgRounds < 3 ? 'too_short' :
                       avgRounds > 8 ? 'too_long' : 'optimal',
                avgRounds: avgRounds.toFixed(1),
                avgTurns: avgTurns.toFixed(1)
            },
            mechanics: {
                vulnerability: {
                    status: vulnRate < 10 ? 'underused' :
                           vulnRate > 30 ? 'overused' : 'good',
                    rate: vulnRate.toFixed(1)
                },
                momentum: {
                    status: momentumRate < 15 ? 'underused' :
                           momentumRate > 40 ? 'overused' : 'good',
                    rate: momentumRate.toFixed(1),
                    maxChain: r.maxMomentumSeen
                }
            },
            winConditions: {
                scalesWinPercent: scalesWins.toFixed(1),
                resourceWinPercent: resourceWins.toFixed(1),
                balance: scalesWins > 80 ? 'scales_dominant' :
                        resourceWins > 80 ? 'resources_dominant' : 'balanced'
            }
        };
    }
}

// Запуск тестов
console.log('🧪 Загрузка тестов баланса игры...\n');

// Проверяем доступность модулей
if (typeof GameEngine === 'undefined') {
    console.error('❌ GameEngine не загружен! Убедитесь, что подключены все модули.');
} else if (typeof playerCards === 'undefined' || typeof enemyCards === 'undefined') {
    console.error('❌ Карты не загружены! Убедитесь, что подключен cards_v2.js');
} else {
    console.log('✅ Модули загружены успешно\n');

    // Запуск симуляции
    const simulator = new GameSimulator();
    const analysis = simulator.runSimulation(1000);

    console.log('💡 АВТОМАТИЧЕСКИЙ АНАЛИЗ:');
    console.log(`  Баланс: ${analysis.balance.status} (${analysis.balance.winRate}% побед)`);
    console.log(`  Длительность: ${analysis.gameDuration.status} (${analysis.gameDuration.avgRounds} раундов)`);
    console.log(`  Vulnerability: ${analysis.mechanics.vulnerability.status} (${analysis.mechanics.vulnerability.rate}%)`);
    console.log(`  Momentum: ${analysis.mechanics.momentum.status} (${analysis.mechanics.momentum.rate}%)`);
    console.log(`  Условия победы: ${analysis.winConditions.balance}`);
    console.log('\n✅ Тестирование завершено!');
}
