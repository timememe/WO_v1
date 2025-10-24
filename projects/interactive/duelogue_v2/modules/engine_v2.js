// ============================================
// DUELOGUE v2 - GAME ENGINE (SCALES SYSTEM)
// ============================================
// Управляет состоянием игры, весами убеждённости и механиками momentum/vulnerability

console.log('🔧 ENGINE v3.0 - Чистая система весов (без ресурсов и раундов)');

class GameEngine {
    constructor() {
        // ========== СОСТОЯНИЕ ВЕСОВ ==========
        this.scalesValue = 0;           // Текущее значение весов (-10 до +10)
        this.SCALES_MIN = -10;          // Скептик выигрывает
        this.SCALES_MAX = 10;           // Игрок выигрывает

        // ========== ЗОНЫ ВЕСОВ ==========
        this.ZONE_CONTESTED = { min: -3, max: 3 };      // Равный бой
        this.ZONE_WINNING = { min: 4, max: 7 };         // Игрок побеждает
        this.ZONE_LOSING = { min: -7, max: -4 };        // Скептик побеждает
        this.ZONE_CRITICAL_WIN = { min: 8, max: 10 };   // Критическое преимущество игрока
        this.ZONE_CRITICAL_LOSE = { min: -10, max: -8 }; // Критическое преимущество скептика

        // ========== MOMENTUM СИСТЕМА ==========
        this.momentum = {
            type: null,         // CardType.LOGIC или CardType.EMOTION
            chain: 0,           // Длина текущей цепи
            bonus: 0            // Текущий бонус к shift
        };
        this.MOMENTUM_BONUS_PER_CHAIN = 1; // +1 shift за каждую карту в цепи

        // ========== ИСТОРИЯ ХОДОВ ==========
        this.turnHistory = [];          // Массив объектов с информацией о ходах
        this.currentTurn = 0;
        this.MAX_TURNS = 20;            // Лимит ходов (вместо раундов)

        // ========== КОЛОДЫ ==========
        this.playerDeck = [];
        this.enemyDeck = [];
        this.usedPlayerCards = [];      // Использованные карты игрока
        this.usedEnemyCards = [];       // Использованные карты противника

        // ========== СОСТОЯНИЕ ИГРЫ ==========
        this.gameState = 'playing';     // playing, won, lost
        this.isPlayerTurn = true;
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================

    initGame(playerCards, enemyCards) {
        this.playerDeck = [...playerCards];
        this.enemyDeck = [...enemyCards];
        this.usedPlayerCards = [];
        this.usedEnemyCards = [];
        this.scalesValue = 0;
        this.currentTurn = 0;
        this.turnHistory = [];
        this.momentum = { type: null, chain: 0, bonus: 0 };
        this.gameState = 'playing';
        this.isPlayerTurn = true;

        console.log('🎮 Игра инициализирована');
        console.log(`   📊 Весы: ${this.scalesValue}`);
        console.log(`   🃏 Колода игрока: ${this.playerDeck.length} карт`);
        console.log(`   🃏 Колода противника: ${this.enemyDeck.length} карт`);
    }

    // ============================================
    // ИГРОВОЙ ХОД
    // ============================================

    playCard(card, isPlayer = true) {
        if (this.gameState !== 'playing') {
            console.warn('⚠️ Игра завершена');
            return null;
        }

        this.currentTurn++;

        const turnData = {
            turn: this.currentTurn,
            isPlayer: isPlayer,
            card: card,
            initialScales: this.scalesValue,
            baseShift: card.shift,
            momentumBonus: 0,
            vulnerabilityTriggered: false,
            counterShift: 0,
            totalShift: 0,
            finalScales: 0,
            zone: null
        };

        // 1. Проверяем momentum (цепь карт одного типа)
        const momentumBonus = this.calculateMomentum(card);
        turnData.momentumBonus = momentumBonus;

        // 2. Базовый сдвиг + momentum
        let totalShift = card.shift + momentumBonus;

        // 3. Проверяем vulnerability (последняя карта противника уязвима к текущей?)
        const counterShift = this.checkVulnerability(card, isPlayer);
        if (counterShift !== 0) {
            turnData.vulnerabilityTriggered = true;
            turnData.counterShift = counterShift;
            totalShift += counterShift;
        }

        // 4. Применяем сдвиг к весам
        this.scalesValue += totalShift;
        this.scalesValue = Math.max(this.SCALES_MIN, Math.min(this.SCALES_MAX, this.scalesValue));

        // 5. Определяем зону
        const zone = this.getCurrentZone();
        turnData.totalShift = totalShift;
        turnData.finalScales = this.scalesValue;
        turnData.zone = zone;

        // 6. Сохраняем в историю
        this.turnHistory.push(turnData);

        // 7. Перемещаем карту в использованные
        if (isPlayer) {
            this.usedPlayerCards.push(card);
        } else {
            this.usedEnemyCards.push(card);
        }

        // 8. Проверяем условия победы/поражения
        this.checkWinCondition();

        console.log(`🎲 Ход ${this.currentTurn} (${isPlayer ? 'Игрок' : 'Скептик'})`);
        console.log(`   🃏 Карта: ${card.title} (${card.type})`);
        console.log(`   📊 Сдвиг: ${card.shift} + ${momentumBonus} (momentum) ${counterShift !== 0 ? `+ ${counterShift} (vulnerability)` : ''} = ${totalShift}`);
        console.log(`   ⚖️  Весы: ${turnData.initialScales} → ${this.scalesValue}`);
        console.log(`   🎯 Зона: ${zone}`);

        return turnData;
    }

    // ============================================
    // MOMENTUM СИСТЕМА
    // ============================================

    calculateMomentum(card) {
        // Нейтральные карты не создают momentum
        if (card.type === CardType.NEUTRAL) {
            this.momentum = { type: null, chain: 0, bonus: 0 };
            return 0;
        }

        // Если тип совпадает с текущим momentum - продолжаем цепь
        if (this.momentum.type === card.type) {
            this.momentum.chain++;
        } else {
            // Новая цепь
            this.momentum.type = card.type;
            this.momentum.chain = 1;
        }

        // Бонус начинается со второй карты в цепи
        const bonus = Math.max(0, (this.momentum.chain - 1) * this.MOMENTUM_BONUS_PER_CHAIN);
        this.momentum.bonus = bonus;

        return bonus;
    }

    // ============================================
    // VULNERABILITY СИСТЕМА
    // ============================================

    checkVulnerability(currentCard, isCurrentPlayer) {
        // Получаем последний ход противника
        const lastEnemyTurn = this.getLastTurn(!isCurrentPlayer);

        if (!lastEnemyTurn) {
            return 0; // Нет предыдущих ходов противника
        }

        const previousCard = lastEnemyTurn.card;

        // Проверяем: уязвима ли предыдущая карта к текущей?
        // previousCard.vulnerability должно совпадать с currentCard.type
        if (previousCard.vulnerability === currentCard.type) {
            // Counter-shift: +2 к сдвигу в пользу текущего игрока
            const counterShift = isCurrentPlayer ? 2 : -2;
            console.log(`   💡 VULNERABILITY! ${previousCard.title} уязвима к ${currentCard.type}`);
            return counterShift;
        }

        return 0;
    }

    // ============================================
    // ЗОНЫ И УСЛОВИЯ ПОБЕДЫ
    // ============================================

    getCurrentZone() {
        const v = this.scalesValue;

        if (v >= this.ZONE_CRITICAL_WIN.min && v <= this.ZONE_CRITICAL_WIN.max) {
            return 'critical-win';
        }
        if (v >= this.ZONE_WINNING.min && v <= this.ZONE_WINNING.max) {
            return 'winning';
        }
        if (v >= this.ZONE_CONTESTED.min && v <= this.ZONE_CONTESTED.max) {
            return 'contested';
        }
        if (v >= this.ZONE_LOSING.min && v <= this.ZONE_LOSING.max) {
            return 'losing';
        }
        if (v >= this.ZONE_CRITICAL_LOSE.min && v <= this.ZONE_CRITICAL_LOSE.max) {
            return 'critical-lose';
        }

        return 'contested'; // fallback
    }

    checkWinCondition() {
        // 1. Победа/поражение по весам
        if (this.scalesValue >= this.SCALES_MAX) {
            this.gameState = 'won';
            this.winReason = 'scales';
            console.log('🎉 ПОБЕДА! Ты убедил скептика!');
            return;
        }
        if (this.scalesValue <= this.SCALES_MIN) {
            this.gameState = 'lost';
            this.loseReason = 'scales';
            console.log('💀 ПОРАЖЕНИЕ! Скептик победил!');
            return;
        }

        // 2. Лимит ходов
        if (this.currentTurn >= this.MAX_TURNS) {
            if (this.scalesValue > 0) {
                this.gameState = 'won';
                this.winReason = 'turns';
                console.log('🎉 ПОБЕДА! Ходы закончились, ты впереди!');
            } else if (this.scalesValue < 0) {
                this.gameState = 'lost';
                this.loseReason = 'turns';
                console.log('💀 ПОРАЖЕНИЕ! Ходы закончились, скептик впереди!');
            } else {
                this.gameState = 'draw';
                console.log('🤝 НИЧЬЯ! Ходы закончились, весы в центре!');
            }
            return;
        }

        // 3. Проверка истощения колод
        const playerHasCards = this.usedPlayerCards.length < this.playerDeck.length;
        const enemyHasCards = this.usedEnemyCards.length < this.enemyDeck.length;

        if (!playerHasCards && !enemyHasCards) {
            // Колоды кончились - решаем по весам
            if (this.scalesValue > 0) {
                this.gameState = 'won';
                this.winReason = 'cards';
            } else if (this.scalesValue < 0) {
                this.gameState = 'lost';
                this.loseReason = 'cards';
            } else {
                this.gameState = 'draw';
            }
            console.log('⚠️ Игра окончена: карты закончились');
        }
    }

    // ============================================
    // ИИ ПРОТИВНИКА
    // ============================================

    getEnemyMove() {
        // Получаем карты, которые не использованы
        const availableCards = this.enemyDeck.filter(
            card => !this.usedEnemyCards.includes(card)
        );

        if (availableCards.length === 0) {
            console.warn('⚠️ У противника нет доступных карт!');
            return null;
        }

        // Пробуем найти карту, которая эксплуатирует vulnerability
        const lastPlayerTurn = this.getLastTurn(true);
        if (lastPlayerTurn) {
            const vulnerableCard = availableCards.find(
                card => card.type === lastPlayerTurn.card.vulnerability
            );
            if (vulnerableCard) {
                console.log('🧠 ИИ: Использую vulnerability!');
                return vulnerableCard;
            }
        }

        // Если momentum активен - пробуем продолжить цепь
        if (this.momentum.chain > 0) {
            const chainCard = availableCards.find(
                card => card.type === this.momentum.type
            );
            if (chainCard && Math.random() > 0.3) { // 70% шанс продолжить цепь
                console.log('🧠 ИИ: Продолжаю momentum цепь!');
                return chainCard;
            }
        }

        // Случайная карта
        console.log('🧠 ИИ: Играю случайную карту');
        return availableCards[Math.floor(Math.random() * availableCards.length)];
    }

    // ============================================
    // РЕСУРСНАЯ СИСТЕМА
    // ============================================

    // Ресурсные функции удалены - используем только чистую систему весов

    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ============================================

    getLastTurn(isPlayer) {
        // Получить последний ход игрока или противника
        for (let i = this.turnHistory.length - 1; i >= 0; i--) {
            if (this.turnHistory[i].isPlayer === isPlayer) {
                return this.turnHistory[i];
            }
        }
        return null;
    }

    getAvailablePlayerCards() {
        return this.playerDeck.filter(
            card => !this.usedPlayerCards.includes(card)
        );
    }

    isCardUsed(card, isPlayer = true) {
        const usedCards = isPlayer ? this.usedPlayerCards : this.usedEnemyCards;
        return usedCards.includes(card);
    }

    getGameState() {
        return {
            scalesValue: this.scalesValue,
            zone: this.getCurrentZone(),
            momentum: { ...this.momentum },
            currentTurn: this.currentTurn,
            currentRound: this.currentRound,
            gameState: this.gameState,
            isPlayerTurn: this.isPlayerTurn,
            player: { ...this.player },
            enemy: { ...this.enemy },
            availablePlayerCards: this.getAvailablePlayerCards().length,
            availableEnemyCards: this.enemyDeck.length - this.usedEnemyCards.length
        };
    }
}

console.log('✅ Модуль engine_v2.js загружен');
