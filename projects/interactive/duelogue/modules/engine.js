// Игровой движок ДУЕЛОГ
// Содержит основную игровую логику

// Глобальные константы для стартовых характеристик
const PLAYER_START_LOGIC = 4;
const PLAYER_START_EMOTION = 4;
const ENEMY_START_LOGIC = 4;
const ENEMY_START_EMOTION = 4;

// Класс для управления игровой механикой
class GameEngine {
    constructor(cardManager, uiManager, visualManager) {
        this.cardManager = cardManager;
        this.uiManager = uiManager;
        this.visualManager = visualManager;
        this.player = { logic: PLAYER_START_LOGIC, maxLogic: PLAYER_START_LOGIC, emotion: PLAYER_START_EMOTION, maxEmotion: PLAYER_START_EMOTION, points: 0, logicDepleted: false, emotionDepleted: false, negativeTurns: 0, cards: [], discardPile: [], lastCard: null };
        this.enemy = { logic: ENEMY_START_LOGIC, maxLogic: ENEMY_START_LOGIC, emotion: ENEMY_START_EMOTION, maxEmotion: ENEMY_START_EMOTION, points: 0, logicDepleted: false, emotionDepleted: false, negativeTurns: 0, cards: [], discardPile: [], lastCard: null };
        this.turn = 1;
        this.playerTurn = true;
        this.gameActive = true;
        this.playerHasPlayedCard = false;
        this.enemyHasPlayedCard = false;
        this.lastVictorySpeechPromise = null;
        this.log = []; // Для экспорта логов
        this.player.cards = cardManager.getInitialPlayerCards(this.player);
        this.enemy.cards = cardManager.getInitialEnemyCards(this.enemy);

        // Убедиться что стартовые руки содержат минимум карт
        this.ensureMinimumHandComposition(this.player, true);
        this.ensureMinimumHandComposition(this.enemy, false);
    }

    async startGame() {
        // Подбросить монетку для определения первого хода
        const playerStarts = Math.random() < 0.5;
        const message = playerStarts
            ? "Монетка упала на твою сторону! Ты начинаешь первым."
            : "Монетка упала на сторону Скептика. Он начинает первым.";

        this.uiManager.addMessage(message, 'enemy');
        await this.visualManager.setVisual('idle');
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (playerStarts) {
            this.playerTurn = true;
            this.turn = 1;
        } else {
            this.playerTurn = false;
            this.turn = 1;

            const firstEnemyCard = this.enemy.cards[0];
            if (firstEnemyCard) {
                const firstCardText = this.cardManager.getCardText(firstEnemyCard);

                if (firstEnemyCard.usesLeft !== undefined) {
                    firstEnemyCard.usesLeft--;
                    if (firstEnemyCard.usesLeft <= 0) firstEnemyCard.used = true;
                } else {
                    firstEnemyCard.used = true;
                }

                if (firstEnemyCard.used) {
                    this.enemy.discardPile.push(firstEnemyCard);
                    this.enemy.cards = this.enemy.cards.filter(c => !c.used);
                }

                const { speechText, logText } = this.applyCard(firstEnemyCard, this.enemy, this.player);
                const speechPromise = this.visualManager.setVisual('enemy', speechText);
                const fullLogMessage = logText ? `${firstCardText} ${logText}` : firstCardText;
                this.uiManager.addMessage(fullLogMessage, 'enemy', 1);
                this.addCounterCard(firstEnemyCard, this.player, true);
                this.checkPoints(this.enemy, this.player);
                this.addDefenseWhenLow(this.player);
                await speechPromise;
            }

            this.playerTurn = true;
        }

        this.uiManager.updateStats(this.player, this.enemy);
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
        await this.visualManager.setVisual('idle');
    }

    applyCard(card, source, target) {
        // Сохранить состояние ПЕРЕД применением карты
        const sourceBefore = {
            logic: source.logic,
            emotion: source.emotion,
            shield: source.shield
        };
        const targetBefore = {
            logic: target.logic,
            emotion: target.emotion,
            shield: target.shield
        };

        // Получить текущий вариант текста (для речи)
        let speechText = this.cardManager.getCardText(card);

        // Лог-детали будут содержать все числовые данные
        let logDetails = [];

        // Обновить индекс варианта для следующего использования
        if (card.textVariants && card.textVariants.length > 0) {
            card.currentVariantIndex = (card.currentVariantIndex ?? 0) + 1;
            if (card.currentVariantIndex >= card.textVariants.length) {
                card.currentVariantIndex = 0;
            }
        }

        let finalDamage = card.damage ?? 0;
        let finalHeal = card.heal ?? 0;
        let wasCancelled = false;

        // Сохранить последнюю карту врага для контекста
        const targetLastCard = target.lastCard;

        // ============ УКЛОНЕНИЕ ============
        if (card.category === 'Уклонение') {
            if (card.effect === 'cancel') {
                if (targetLastCard && source.lastCardEffects) {
                    wasCancelled = true;

                    // Откатить все эффекты последней карты
                    if (source.lastCardEffects.logicDamage) {
                        source.logic = (source.logic ?? 0) + source.lastCardEffects.logicDamage;
                    }
                    if (source.lastCardEffects.emotionDamage) {
                        source.emotion = (source.emotion ?? 0) + source.lastCardEffects.emotionDamage;
                    }
                    if (source.lastCardEffects.logicHeal) {
                        target.logic = (target.logic ?? 0) - source.lastCardEffects.logicHeal;
                    }
                    if (source.lastCardEffects.emotionHeal) {
                        target.emotion = (target.emotion ?? 0) - source.lastCardEffects.emotionHeal;
                    }
                    if (source.lastCardEffects.shieldAdded) {
                        target.shield = (target.shield ?? 0) - source.lastCardEffects.shieldAdded;
                        if (target.shield <= 0) delete target.shield;
                    }

                    logDetails.push(`(Отменяет "${targetLastCard.name}")`);
                    delete source.lastCardEffects;
                }
            } else if (card.effect === 'mirror' && targetLastCard?.category === 'Атака') {
                const damageMultiplier = this.getDamageMultiplier(source);
                let mirrorDamage = Math.floor((targetLastCard.damage ?? 0) * (card.modifier ?? 0.75) * damageMultiplier);
                const targetStat = targetLastCard.effect === 'random'
                    ? (Math.random() > 0.5 ? 'logic' : 'emotion')
                    : targetLastCard.effect;
                target[targetStat] = (target[targetStat] ?? 0) - mirrorDamage;
                logDetails.push(`-${mirrorDamage} ${targetStat} врагу`);
            } else if (card.effect === 'reflect' && targetLastCard?.category === 'Атака') {
                const damageMultiplier = this.getDamageMultiplier(source);
                let reflectDamage = Math.floor((targetLastCard.damage ?? 0) * damageMultiplier);
                const targetStat = targetLastCard.effect === 'random'
                    ? (Math.random() > 0.5 ? 'logic' : 'emotion')
                    : targetLastCard.effect;
                target[targetStat] = (target[targetStat] ?? 0) - reflectDamage;
                logDetails.push(`-${reflectDamage} ${targetStat} отражено!`);
            }
        }

        // ============ АТАКА ============
        else if (card.category === 'Атака' && !wasCancelled) {
            const damageMultiplier = this.getDamageMultiplier(source);
            finalDamage = Math.floor(finalDamage * damageMultiplier);

            // Проверка преимущества: Атака > Защита (+50% урона)
            if (targetLastCard?.category === 'Защита') {
                finalDamage = Math.floor(finalDamage * 1.5);
                logDetails.push('(Пробивает защиту!)');
            }

            if (finalDamage > 0) {
                const targetStat = card.effect === 'random'
                    ? (Math.random() > 0.5 ? 'logic' : 'emotion')
                    : card.effect;

                // Щит поглощает урон
                if (target.shield && target.shield > 0) {
                    const absorbed = Math.min(target.shield, finalDamage);
                    target.shield -= absorbed;
                    finalDamage -= absorbed;
                    logDetails.push(`(Щит: -${absorbed})`);
                    if (target.shield <= 0) {
                        delete target.shield;
                        logDetails.push('(Щит разрушен!)');
                    }
                }

                // Остаток урона
                if (finalDamage > 0) {
                    target[targetStat] = (target[targetStat] ?? 0) - finalDamage;
                    logDetails.push(`-${finalDamage} ${targetStat}`);

                    // Сохранить урон для возможной отмены
                    if (!target.lastCardEffects) target.lastCardEffects = {};
                    if (targetStat === 'logic') {
                        target.lastCardEffects.logicDamage = finalDamage;
                    } else {
                        target.lastCardEffects.emotionDamage = finalDamage;
                    }
                }
            }
        }

        // ============ ЗАЩИТА ============
        else if (card.category === 'Защита' && !wasCancelled) {
            if (targetLastCard?.category === 'Уклонение') {
                finalHeal = Math.floor(finalHeal * 1.5);
                logDetails.push('(Ловит в ловушку!)');
            }

            if (card.effect === 'shield') {
                const shieldAmount = card.shield ?? 0;
                source.shield = (source.shield ?? 0) + shieldAmount;
                logDetails.push(`(Щит: +${shieldAmount})`);

                if (!target.lastCardEffects) target.lastCardEffects = {};
                target.lastCardEffects.shieldAdded = shieldAmount;
            } else if (finalHeal > 0) {
                source[card.effect] = (source[card.effect] ?? 0) + finalHeal;
                logDetails.push(`+${finalHeal} ${card.effect}`);

                if (!target.lastCardEffects) target.lastCardEffects = {};
                if (card.effect === 'logic') {
                    target.lastCardEffects.logicHeal = finalHeal;
                } else {
                    target.lastCardEffects.emotionHeal = finalHeal;
                }
            }
        }

        // Проверка "Повторение" на карты из discard
        if (card.fromDiscard) {
            let repeatCardIndex = target.cards.findIndex(c => c.name === "Повторение" && !c.used);
            if (repeatCardIndex !== -1) {
                logDetails.push('(Обнулено: "Ты уже это говорил!")');
                target.cards[repeatCardIndex].used = true;
            } else {
                this.addCardsToHand(this.cardManager.getRepeatCard(), target);
            }
        }

        this.updateMaxStats(source);
        this.updateMaxStats(target);
        source.lastCard = card;

        return { speechText, logText: logDetails.join(' ') };
    }

    hasCardInHand(character, cardName) {
        return character.cards.some(c => c.name === cardName);
    }

    addCardsToHand(card, character) {
        if (!card) return;

        if (this.hasCardInHand(character, card.name)) {
            return;
        }

        const handLimit = this.getHandLimit(character);

        if (character.cards.length < handLimit) {
            character.cards.push(card);
        } else {
            character.discardPile.push(character.cards.shift());
            character.cards.push(card);
        }
    }

    addCounterCard(lastCard, character, isPlayer = true) {
        const counterCard = this.cardManager.getCounterCard(lastCard, character, isPlayer);
        if (counterCard) {
            this.addCardsToHand(counterCard, character);
        }
    }

    updateMaxStats(character) {
        if (!character) return;
        if (character.maxLogic === undefined) character.maxLogic = character.logic;
        if (character.maxEmotion === undefined) character.maxEmotion = character.emotion;
        character.maxLogic = Math.max(character.maxLogic, character.logic);
        character.maxEmotion = Math.max(character.maxEmotion, character.emotion);
    }

    getHandLimit(character) {
        const logic = character.logic ?? 0;
        if (logic <= 0) return 3;
        if (logic <= 2) return 4;
        if (logic <= 4) return 5;
        if (logic <= 6) return 6;
        return 7;
    }

    getDamageMultiplier(character) {
        const emotion = character.emotion ?? 0;
        if (emotion <= 0) return 0.5;
        if (emotion <= 2) return 0.75;
        if (emotion <= 4) return 1.0;
        if (emotion <= 6) return 1.25;
        return 1.5;
    }

    ensureMinimumHandComposition(character, isPlayer = true) {
        const handLimit = this.getHandLimit(character);

        const cardsByCategory = {
            'Атака': character.cards.filter(c => c.category === 'Атака').length,
            'Защита': character.cards.filter(c => c.category === 'Защита').length,
            'Уклонение': character.cards.filter(c => c.category === 'Уклонение').length
        };

        const missingTypes = [];

        if (cardsByCategory['Атака'] === 0 && character.cards.length < handLimit) {
            missingTypes.push('Атака');
        }
        if (cardsByCategory['Защита'] === 0 && character.cards.length < handLimit) {
            missingTypes.push('Защита');
        }
        if (cardsByCategory['Уклонение'] === 0 && character.cards.length < handLimit) {
            missingTypes.push('Уклонение');
        }

        for (const type of missingTypes) {
            let card = null;

            if (type === 'Атака') {
                const attackPool = isPlayer ? this.cardManager.basePlayerCards : this.cardManager.baseEnemyCards;
                card = this.cardManager.getWeightedCard(character, attackPool);
            } else if (type === 'Защита') {
                card = this.cardManager.getDefenseCard(character);
            } else if (type === 'Уклонение') {
                if (this.cardManager.evasionCards.length) {
                    card = this.cardManager.getUniqueCard(this.cardManager.evasionCards, character);
                }
            }

            if (card) {
                this.addCardsToHand(card, character);
            }
        }
    }

    checkPoints(winner, loser) {
        if (loser.logic <= 0 && !loser.logicDepleted) {
            winner.points += 1;
            loser.logicDepleted = true;
            this.uiManager.addMessage(`${winner === this.player ? "Ты" : "Скептик"} зажигает точку! Логика исчерпана.`, winner === this.player ? 'player' : 'enemy');
        }
        if (loser.emotion <= 0 && !loser.emotionDepleted) {
            winner.points += 1;
            loser.emotionDepleted = true;
            this.uiManager.addMessage(`${winner === this.player ? "Ты" : "Скептик"} зажигает точку! Эмоции исчерпаны.`, winner === this.player ? 'player' : 'enemy');
        }

        if (loser.logic < 0 && loser.emotion < 0) {
            loser.negativeTurns += 1;
            if (loser.negativeTurns >= 3) {
                winner.points += 1;
                this.uiManager.addMessage(`${winner === this.player ? "Ты" : "Скептик"} зажигает точку! ${loser === this.player ? "Ты" : "Скептик"} слишком долго в смятении!`, winner === this.player ? 'player' : 'enemy');
                loser.negativeTurns = 0;
            }
        } else {
            loser.negativeTurns = 0;
        }

        if (loser.logic > 0) loser.logicDepleted = false;
        if (loser.emotion > 0) loser.emotionDepleted = false;
    }

    addDefenseWhenLow(character) {
        if ((character.logic < 0 && !character.logicNegative) || (character.emotion < 0 && !character.emotionNegative)) {
            const defenseCard = this.cardManager.getDefenseCard(character);
            if (defenseCard) {
                this.addCardsToHand(defenseCard, character);
            }
            if (character.logic < 0) character.logicNegative = true;
            if (character.emotion < 0) character.emotionNegative = true;
        }
        if (character.logic >= 0) character.logicNegative = false;
        if (character.emotion >= 0) character.emotionNegative = false;
    }

    checkVictory() {
        if (this.player.points >= 3) {
            this.uiManager.addMessage("Ты победил! Все 3 твои точки зажжены!", 'player');
            this.lastVictorySpeechPromise = this.visualManager.setVisual('player', "Победа!");
            this.endGame(true);
            return true;
        } else if (this.enemy.points >= 3) {
            this.uiManager.addMessage("Скептик победил! Ты проиграл!", 'enemy');
            this.lastVictorySpeechPromise = this.visualManager.setVisual('enemy', "Поражение!");
            this.endGame(false);
            return true;
        }
        this.lastVictorySpeechPromise = null;
        return false;
    }

    endGame(victory) {
        this.gameActive = false;
        // Экран окончания игры будет показан через main.js
    }

    async playCard(card) {
        if (!this.playerTurn || card.used || this.playerHasPlayedCard || !this.gameActive) return;
        this.turn++;
        this.playerHasPlayedCard = true;

        if (card.usesLeft !== undefined) {
            card.usesLeft--;
            if (card.usesLeft <= 0) card.used = true;
        } else {
            card.used = true;
        }

        const cardText = this.cardManager.getCardText(card);
        const { speechText, logText } = this.applyCard(card, this.player, this.enemy);
        const speechPromise = this.visualManager.setVisual('player', speechText);
        const fullLogMessage = logText ? `${cardText} ${logText}` : cardText;
        this.uiManager.addMessage(fullLogMessage, 'player', this.turn);

        if (card.used) {
            this.player.discardPile.push(card);
            this.player.cards = this.player.cards.filter(c => !c.used);
        }

        this.checkPoints(this.player, this.enemy);
        this.addDefenseWhenLow(this.enemy);
        this.addCounterCard(card, this.enemy, false);
        this.ensureMinimumHandComposition(this.enemy, false);

        this.uiManager.updateStats(this.player, this.enemy);
        if (this.checkVictory()) {
            this.gameActive = false;
            this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
            const victorySpeech = this.lastVictorySpeechPromise ?? speechPromise;
            await victorySpeech;
            return;
        }

        await speechPromise;
        if (!this.gameActive) {
            return;
        }

        this.playerTurn = false;
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
        await this.visualManager.setVisual('enemy');
        await this.enemyTurn();
    }

    async enemyTurn() {
        if (!this.gameActive) return;
        this.turn++;
        this.enemyHasPlayedCard = true;

        let availableCards = this.enemy.cards.filter(card => !card.used);
        let speechText = '';
        let logText = '';

        if (!this.enemyHasPlayedCard && this.enemy.discardPile.length > 0 && availableCards.length < 5 && Math.random() > 0.5) {
            let randomIndex = Math.floor(Math.random() * this.enemy.discardPile.length);
            let drawnCard = this.enemy.discardPile.splice(randomIndex, 1)[0];
            drawnCard.used = false;
            drawnCard.fromDiscard = true;

            if (Math.random() < 0.2) {
                const rareCard = this.cardManager.getRareAttackCard(this.enemy);
                if (rareCard) {
                    drawnCard = rareCard;
                }
            } else {
                const weightedCard = this.cardManager.getWeightedCard(this.enemy, this.cardManager.baseEnemyCards);
                if (weightedCard) {
                    drawnCard = weightedCard;
                }
            }

            this.enemy.cards.push(drawnCard);
            availableCards = this.enemy.cards.filter(card => !card.used);
        }

        let repeatCardIndex = availableCards.findIndex(card => card.name === "Повторение");
        if (repeatCardIndex !== -1 && availableCards.length > 0) {
            if (Math.random() > 0.5) {
                let cancelledCard = availableCards[repeatCardIndex];
                cancelledCard.used = true;
                speechText = this.cardManager.repeatCard.text;
                logText = `${speechText} (Отменяет предыдущий ход)`;
                this.enemy.cards = this.enemy.cards.filter(c => !c.used);
                this.enemy.discardPile.push(cancelledCard);
            } else {
                availableCards.splice(repeatCardIndex, 1);
                this.enemy.cards = availableCards;
            }
        } else if (availableCards.length > 0) {
            let randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];

            if (randomCard.usesLeft !== undefined) {
                randomCard.usesLeft--;
                if (randomCard.usesLeft <= 0) randomCard.used = true;
            } else {
                randomCard.used = true;
            }

            const cardText = this.cardManager.getCardText(randomCard);
            const result = this.applyCard(randomCard, this.enemy, this.player);
            speechText = result.speechText;
            logText = result.logText ? `${cardText} ${result.logText}` : cardText;

            if (randomCard.used) {
                this.enemy.discardPile.push(randomCard);
                this.enemy.cards = this.enemy.cards.filter(c => !c.used);
            }

            this.addCounterCard(randomCard, this.player, true);
        } else {
            speechText = "Мне нечего сказать...";
            logText = `Скептик: "${speechText}"`;
        }

        const speechPromise = this.visualManager.setVisual('enemy', speechText);
        this.uiManager.addMessage(logText, 'enemy', this.turn);
        this.checkPoints(this.enemy, this.player);
        this.addDefenseWhenLow(this.player);
        this.ensureMinimumHandComposition(this.player, true);

        this.uiManager.updateStats(this.player, this.enemy);
        if (this.checkVictory()) {
            this.gameActive = false;
            this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
            const victorySpeech = this.lastVictorySpeechPromise ?? speechPromise;
            await victorySpeech;
            return;
        }

        await speechPromise;
        if (!this.gameActive) {
            return;
        }

        this.playerTurn = true;
        this.playerHasPlayedCard = false;
        this.enemyHasPlayedCard = false;
        this.uiManager.updateStats(this.player, this.enemy);
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
        await this.visualManager.setVisual('idle');
    }
}

console.log('✅ Модуль engine.js загружен');
