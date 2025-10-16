// Система событий ДУЕЛОГ
// Отслеживает паттерны игры и запускает специальные события

class EventManager {
    constructor() {
        this.turnHistory = [];
        this.activeEvent = null;
        this.eventCooldown = 0; // Кулдаун между событиями
        this.consecutiveEmptyDecks = 0;
    }

    // Записываем ход в историю
    recordTurn(playerCard, enemyCard) {
        this.turnHistory.push({
            playerCategory: playerCard?.category || null,
            enemyCategory: enemyCard?.category || null
        });

        // Ограничиваем историю последними 10 ходами
        if (this.turnHistory.length > 10) {
            this.turnHistory.shift();
        }
    }

    // Главная проверка событий после каждого хода
    checkForEvents(player, enemy) {
        // Если есть кулдаун, уменьшаем его
        if (this.eventCooldown > 0) {
            this.eventCooldown--;
            return null;
        }

        // Если уже есть активное событие, продолжаем его
        if (this.activeEvent) {
            return this.updateActiveEvent(player, enemy);
        }

        // Проверяем условия для новых событий (в порядке приоритета)

        // 1. Переломный момент (самый критичный)
        const criticalEvent = this.checkCriticalTurningPoint(player, enemy);
        if (criticalEvent) return criticalEvent;

        // 2. Медитация
        const meditationEvent = this.checkMeditation();
        if (meditationEvent) return meditationEvent;

        // 3. Перепалка
        const heatedEvent = this.checkHeatedExchange();
        if (heatedEvent) return heatedEvent;

        // 4. Интеллектуальный спарринг
        const mindGamesEvent = this.checkMindGames();
        if (mindGamesEvent) return mindGamesEvent;

        // 5. Усталость (когда кончились колоды)
        const fatigueEvent = this.checkFatigue(player, enemy);
        if (fatigueEvent) return fatigueEvent;

        return null;
    }

    // ========== СОБЫТИЕ 1: МЕДИТАЦИЯ ==========
    checkMeditation() {
        if (this.turnHistory.length < 2) return null;

        const last2 = this.turnHistory.slice(-2);
        const isMeditating = last2.every(turn =>
            turn.playerCategory === 'Защита' || turn.enemyCategory === 'Защита'
        );

        if (isMeditating) {
            this.activeEvent = {
                type: 'meditation',
                name: '🧘 МЕДИТАЦИЯ',
                duration: 0,
                maxDuration: 999, // Пока не атакуют
                message: 'Оппоненты сосредоточились на защите. Темп игры замедлился...'
            };
            return this.activeEvent;
        }
        return null;
    }

    // ========== СОБЫТИЕ 2: ПЕРЕПАЛКА ==========
    checkHeatedExchange() {
        if (this.turnHistory.length < 3) return null;

        const last3 = this.turnHistory.slice(-3);
        const isHeated = last3.every(turn =>
            turn.playerCategory === 'Атака' || turn.enemyCategory === 'Атака'
        );

        if (isHeated) {
            this.activeEvent = {
                type: 'heated_exchange',
                name: '🔥 ПЕРЕПАЛКА',
                duration: 0,
                maxDuration: 999, // Пока не прекратят
                message: 'Споры накаляются! Эмоции зашкаливают, но логика страдает от ярости...'
            };
            return this.activeEvent;
        }
        return null;
    }

    // ========== СОБЫТИЕ 3: ИНТЕЛЛЕКТУАЛЬНЫЙ СПАРРИНГ ==========
    checkMindGames() {
        if (this.turnHistory.length < 2) return null;

        const last2 = this.turnHistory.slice(-2);
        const isSparring = last2.every(turn => {
            const playerTactical = turn.playerCategory === 'Атака' || turn.playerCategory === 'Уклонение';
            const enemyTactical = turn.enemyCategory === 'Атака' || turn.enemyCategory === 'Уклонение';
            return playerTactical && enemyTactical;
        });

        if (isSparring) {
            this.activeEvent = {
                type: 'mind_games',
                name: '🧠 ИНТЕЛЛЕКТУАЛЬНЫЙ СПАРРИНГ',
                duration: 0,
                maxDuration: 999,
                message: 'Оба оппонента играют в тактические игры! Логика обостряется, но урон снижается...'
            };
            return this.activeEvent;
        }
        return null;
    }

    // ========== СОБЫТИЕ 4: ПЕРЕЛОМНЫЙ МОМЕНТ ==========
    checkCriticalTurningPoint(player, enemy) {
        const playerTotal = (player.logic ?? 0) + (player.emotion ?? 0);
        const enemyTotal = (enemy.logic ?? 0) + (enemy.emotion ?? 0);
        const gap = Math.abs(playerTotal - enemyTotal);

        // Снижаем порог разрыва до 5
        if (gap >= 5) {
            const loser = playerTotal < enemyTotal ? player : enemy;
            const winner = playerTotal < enemyTotal ? enemy : player;
            const loserName = loser === player ? 'Игрок' : 'Противник';

            if ((loser.logic < 0 || loser.emotion < 0)) {
                this.activeEvent = {
                    type: 'critical_turning_point',
                    name: '⚡ ПЕРЕЛОМНЫЙ МОМЕНТ',
                    duration: 1, // Одноразовое событие
                    maxDuration: 1,
                    loser: loser,
                    winner: winner,
                    loserName: loserName,
                    message: `${loserName} в критическом состоянии! Публика волнуется...`
                };
                return this.activeEvent;
            }
        }

        return null;
    }

    // ========== СОБЫТИЕ 5: УСТАЛОСТЬ ==========
    checkFatigue(player, enemy) {
        const decksEmpty = (player.deck?.length === 0) && (enemy.deck?.length === 0);

        if (decksEmpty) {
            this.consecutiveEmptyDecks++;

            if (this.consecutiveEmptyDecks >= 2) {
                this.activeEvent = {
                    type: 'fatigue',
                    name: '😩 УСТАЛОСТЬ',
                    duration: 0,
                    maxDuration: 999, // Пока не появятся карты
                    message: 'Колоды пусты! Игроки истощены и начинают терять концентрацию...'
                };
                return this.activeEvent;
            }
        } else {
            this.consecutiveEmptyDecks = 0;
        }

        return null;
    }

    // Обновляем активное событие
    updateActiveEvent(player, enemy) {
        if (!this.activeEvent) return null;

        this.activeEvent.duration++;

        // Проверяем, нужно ли завершить событие
        const shouldEnd = this.checkEventEnd(player, enemy);

        if (shouldEnd) {
            const endMessage = this.getEventEndMessage();
            this.activeEvent = null;
            this.eventCooldown = 2; // 2 хода кулдауна после события
            this.consecutiveDefense = 0;
            this.consecutiveAttack = 0;
            this.consecutiveTactical = 0;
            return { ended: true, message: endMessage };
        }

        return this.activeEvent;
    }

    // Проверяем условия завершения события
    checkEventEnd(player, enemy) {
        if (!this.activeEvent) return false;

        const lastTurn = this.turnHistory[this.turnHistory.length - 1];
        if (!lastTurn) return false;

        switch (this.activeEvent.type) {
            case 'meditation':
                // Завершается, если кто-то атаковал или уклонялся
                return lastTurn.playerCategory !== 'Защита' ||
                       lastTurn.enemyCategory !== 'Защита';

            case 'heated_exchange':
                // Завершается, если кто-то защитился или уклонился
                return lastTurn.playerCategory !== 'Атака' ||
                       lastTurn.enemyCategory !== 'Атака';

            case 'mind_games':
                // Завершается, если кто-то использовал Защиту
                return lastTurn.playerCategory === 'Защита' ||
                       lastTurn.enemyCategory === 'Защита';

            case 'critical_turning_point':
                // Одноразовое событие
                return this.activeEvent.duration >= this.activeEvent.maxDuration;

            case 'fatigue':
                // Завершается, если у кого-то появились карты в колоде (маловероятно, но возможно)
                return player.deck?.length > 0 || enemy.deck?.length > 0;

            default:
                return false;
        }
    }

    // Применяем эффекты события
    applyEventEffects(player, enemy) {
        if (!this.activeEvent) return null;

        const effects = {
            player: {},
            enemy: {},
            message: null
        };

        switch (this.activeEvent.type) {
            case 'meditation':
                // Эффект: -1 эмоция, +1 логика каждый ход
                effects.player.emotion = -1;
                effects.player.logic = 1;
                effects.enemy.emotion = -1;
                effects.enemy.logic = 1;
                effects.message = '(Медитация: -1 эмоция, +1 логика)';
                break;

            case 'heated_exchange':
                // Эффект: +2 эмоции, максимум логики -1
                effects.player.emotion = 2;
                effects.player.maxLogicPenalty = -1;
                effects.enemy.emotion = 2;
                effects.enemy.maxLogicPenalty = -1;
                effects.message = '(Перепалка: +2 эмоции, макс. логика -1)';
                break;

            case 'mind_games':
                // Эффект: +1 логика, урон -25%
                effects.player.logic = 1;
                effects.player.damageReduction = 0.25;
                effects.enemy.logic = 1;
                effects.enemy.damageReduction = 0.25;
                effects.message = '(Спарринг: +1 логика, урон -25%)';
                break;

            case 'critical_turning_point':
                // Эффект: Проигрывающий получает +3 эмоции
                if (this.activeEvent.loser) {
                    if (this.activeEvent.loser === player) {
                        effects.player.emotion = 3;
                        effects.winner.logic = -1;
                    } else {
                        effects.enemy.emotion = 3;
                        effects.player.logic = -1;
                    }
                    effects.message = `(Последний шанс: ${this.activeEvent.loserName} +3 эмоции!)`;
                }
                break;

            case 'fatigue':
                // Эффект: -1 случайная характеристика каждый ход
                const playerStat = Math.random() < 0.5 ? 'logic' : 'emotion';
                const enemyStat = Math.random() < 0.5 ? 'logic' : 'emotion';
                effects.player[playerStat] = -1;
                effects.enemy[enemyStat] = -1;
                effects.message = `(Усталость: -1 ${playerStat} игроку, -1 ${enemyStat} врагу)`;
                break;
        }

        return effects;
    }

    // Сообщение при завершении события
    getEventEndMessage() {
        if (!this.activeEvent) return null;

        const messages = {
            meditation: '🧘 Медитация прервана! Дебаты возобновляются.',
            heated_exchange: '🔥 Страсти улеглись. Оппоненты остывают.',
            mind_games: '🧠 Тактическая дуэль окончена.',
            critical_turning_point: '⚡ Напряжение спадает.',
            fatigue: '😩 В колодах снова появились карты! Усталость прошла.'
        };

        return messages[this.activeEvent.type] || 'Событие завершено.';
    }

    // Получить текущее активное событие (для UI)
    getActiveEvent() {
        return this.activeEvent;
    }

    // Сброс системы (для новой игры)
    reset() {
        this.turnHistory = [];
        this.activeEvent = null;
        this.eventCooldown = 0;
        this.consecutiveEmptyDecks = 0;
    }
}

console.log('✅ Модуль events.js загружен');
