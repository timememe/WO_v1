// Глобальные константы для стартовых характеристик
const PLAYER_START_LOGIC = 4;
const PLAYER_START_EMOTION = 4;
const ENEMY_START_LOGIC = 4;
const ENEMY_START_EMOTION = 4;

// Класс для управления визуализацией
class VisualManager {
    constructor() {
        this.visualImage = document.getElementById('visualImage');
        this.visualBackground = document.getElementById('visualBackground');
        this.speechBubble = document.getElementById('speechBubble');
        this.statsOverlay = document.getElementById('statsOverlay');
        this.pointsOverlay = document.getElementById('pointsOverlay');
        this.assets = {
            idle: { image: '../../../shared/assets/images/main.png', background: '../../../shared/assets/images/anim/exp_bg.gif' },
            player: { image: '../../../shared/assets/images/anim/talk_blue.gif', background: '../../../shared/assets/images/anim/exp_bg.gif' },
            enemy: { image: '../../../shared/assets/images/anim/talk_red.gif', background: '../../../shared/assets/images/anim/exp_bg.gif' }
        };
        this.baseCharDelay = 55; // ~18 символов в секунду ≈ средней скорости чтения
        this.readingPauseMs = 3000;
        this.typingTimeout = null;
        this.pauseTimeout = null;
        this.currentSpeechResolve = null;
    }

    setVisual(state, text = '') {
        const assets = this.assets[state] ?? this.assets.idle;
        this.cancelSpeech();
        if (assets) {
            this.visualImage.src = assets.image;
            this.visualBackground.src = assets.background;
        }
        const speechPromise = this.showSpeechBubble(text);
        if (state === 'idle') {
            this.statsOverlay.classList.add('visible');
            this.pointsOverlay.classList.add('visible');
        } else {
            this.statsOverlay.classList.remove('visible');
            this.pointsOverlay.classList.remove('visible');
        }
        return speechPromise;
    }

    showSpeechBubble(text) {
        this.speechBubble.textContent = '';
        this.speechBubble.classList.remove('visible');
        if (!text) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.currentSpeechResolve = () => {
                resolve();
                this.currentSpeechResolve = null;
            };
            this.speechBubble.classList.add('visible');
            let index = 0;
            const typeNext = () => {
                if (index < text.length) {
                    this.speechBubble.textContent += text[index];
                    const delay = this.getCharDelay(text[index]);
                    index++;
                    this.typingTimeout = setTimeout(typeNext, delay);
                } else {
                    this.typingTimeout = null;
                    this.pauseTimeout = setTimeout(() => {
                        this.pauseTimeout = null;
                        if (this.currentSpeechResolve) {
                            this.currentSpeechResolve();
                        }
                    }, this.readingPauseMs);
                }
            };
            typeNext();
        });
    }

    getCharDelay(char) {
        if (!char) return this.baseCharDelay;
        if (char === ' ') return Math.max(20, Math.floor(this.baseCharDelay * 0.6));
        if (char === '\n') return this.baseCharDelay * 1.2;
        if (/[.!?]/.test(char)) return this.baseCharDelay + 220;
        if (/[,:;]/.test(char)) return this.baseCharDelay + 140;
        return this.baseCharDelay;
    }

    cancelSpeech() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
            this.pauseTimeout = null;
        }
        if (this.currentSpeechResolve) {
            this.currentSpeechResolve();
            this.currentSpeechResolve = null;
        }
        this.speechBubble.textContent = '';
        this.speechBubble.classList.remove('visible');
    }
}

// Класс для управления картами
class CardManager {
    constructor(cardData) {
        this.basePlayerCards = cardData?.basePlayerCards ?? [];
        this.baseEnemyCards = cardData?.baseEnemyCards ?? [];
        this.defenseCards = cardData?.defenseCards ?? [];
        this.evasionCards = cardData?.evasionCards ?? [];
        this.rareAttackCards = cardData?.rareAttackCards ?? [];

        const specials = cardData?.specialCards ?? {};
        this.repeatCard = specials.repeatCard ?? null;
    }

    pickRandom(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    cloneCard(template) {
        if (!template) return null;
        const clone = JSON.parse(JSON.stringify(template));
        clone.used = false;
        clone.fromDiscard = false;
        return clone;
    }

    getEffectPools(cards) {
        const logic = cards.filter(card => card.effect === 'logic');
        const emotion = cards.filter(card => card.effect === 'emotion');
        return { logic, emotion };
    }

    getInitialCardsFor(character, attackTemplates) {
        // Стартовая рука: 2 Атаки + 1 Защита + 1 Уклонение
        const result = [];

        // 2 атаки (logic и emotion по весам персонажа)
        const { logic, emotion } = this.getEffectPools(attackTemplates);
        const total = Math.max(1, character.logic + character.emotion);
        const logicWeight = character.logic / total;

        for (let i = 0; i < 2; i++) {
            const useLogic = Math.random() < logicWeight;
            const pool = useLogic ? (logic.length ? logic : attackTemplates) : (emotion.length ? emotion : attackTemplates);
            if (pool.length) {
                result.push(this.cloneCard(this.pickRandom(pool)));
            }
        }

        // 1 защита (по типу персонажа)
        if (this.defenseCards.length) {
            const defensePool = this.defenseCards.filter(c => c.effect !== 'shield');
            if (defensePool.length) {
                const useLogic = Math.random() < logicWeight;
                const preferred = defensePool.filter(c => c.effect === (useLogic ? 'logic' : 'emotion'));
                const chosen = preferred.length ? this.pickRandom(preferred) : this.pickRandom(defensePool);
                result.push(this.cloneCard(chosen));
            }
        }

        // 1 уклонение
        if (this.evasionCards.length) {
            result.push(this.cloneCard(this.pickRandom(this.evasionCards)));
        }

        return result;
    }

    getInitialPlayerCards(player) {
        return this.getInitialCardsFor(player, this.basePlayerCards);
    }

    getInitialEnemyCards(enemy) {
        return this.getInitialCardsFor(enemy, this.baseEnemyCards);
    }


    // Получить карту, противостоящую последней карте врага
    // Атака → Уклонение, Защита → Атака, Уклонение → Защита
    getCounterCard(lastCard, character, isPlayer = true) {
        if (!lastCard) return null;

        const category = lastCard.category;
        // Выбрать правильный набор карт в зависимости от того, кто получает карту
        const attackPool = isPlayer ? this.basePlayerCards : this.baseEnemyCards;

        if (category === 'Атака') {
            // Противостояние атаке = Уклонение
            if (this.evasionCards.length && Math.random() < 0.7) {
                return this.cloneCard(this.pickRandom(this.evasionCards));
            }
        } else if (category === 'Защита') {
            // Противостояние защите = Атака
            if (Math.random() < 0.7) {
                return this.getWeightedCard(character, attackPool);
            }
        } else if (category === 'Уклонение') {
            // Противостояние уклонению = Защита
            if (this.defenseCards.length && Math.random() < 0.7) {
                return this.cloneCard(this.pickRandom(this.defenseCards));
            }
        }

        return null;
    }

    getRepeatCard() {
        return this.cloneCard(this.repeatCard);
    }

    getDefenseCard() {
        if (!this.defenseCards.length) return null;
        return this.cloneCard(this.pickRandom(this.defenseCards));
    }

    getRareAttackCard(character) {
        if (!this.rareAttackCards.length) return null;

        const { logic, emotion } = this.getEffectPools(this.rareAttackCards);
        const total = Math.max(1, character.logic + character.emotion);
        const logicWeight = character.logic / total;
        const useLogic = Math.random() < logicWeight;
        const pool = useLogic ? (logic.length ? logic : this.rareAttackCards) : (emotion.length ? emotion : this.rareAttackCards);
        return this.cloneCard(this.pickRandom(pool));
    }

    getWeightedCard(character, baseTemplates = this.basePlayerCards) {
        if (!baseTemplates.length) return null;

        const { logic, emotion } = this.getEffectPools(baseTemplates);
        const total = Math.max(1, character.logic + character.emotion);
        const logicWeight = character.logic / total;
        const useLogic = Math.random() < logicWeight;
        const pool = useLogic ? (logic.length ? logic : baseTemplates) : (emotion.length ? emotion : baseTemplates);
        const baseTemplate = this.pickRandom(pool);

        return this.cloneCard(baseTemplate);
    }
}

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
        this.player.cards = cardManager.getInitialPlayerCards(this.player);
        this.enemy.cards = cardManager.getInitialEnemyCards(this.enemy);

        // Убедиться что стартовые руки содержат минимум карт
        this.ensureMinimumHandComposition(this.player, true);
        this.ensureMinimumHandComposition(this.enemy, false);
    }

    applyCard(card, source, target) {
        let message = card.text;
        let finalDamage = card.damage ?? 0;
        let finalHeal = card.heal ?? 0;
        let wasCancelled = false;

        // Сохранить последнюю карту врага для контекста
        const targetLastCard = target.lastCard;

        // ============ УКЛОНЕНИЕ ============
        if (card.category === 'Уклонение') {
            if (card.effect === 'cancel') {
                // Полная отмена последней карты врага
                if (targetLastCard) {
                    wasCancelled = true;
                    message += ` (Отменяет "${targetLastCard.name}")`;
                }
            } else if (card.effect === 'mirror' && targetLastCard?.category === 'Атака') {
                // Зеркало - копирует атаку врага (с учетом своих эмоций)
                const damageMultiplier = this.getDamageMultiplier(source);
                let mirrorDamage = Math.floor((targetLastCard.damage ?? 0) * (card.modifier ?? 0.75) * damageMultiplier);
                const targetStat = targetLastCard.effect === 'random'
                    ? (Math.random() > 0.5 ? 'logic' : 'emotion')
                    : targetLastCard.effect;
                target[targetStat] = (target[targetStat] ?? 0) - mirrorDamage;
                message += ` (-${mirrorDamage} ${targetStat} врагу)`;
            } else if (card.effect === 'reflect' && targetLastCard?.category === 'Атака') {
                // Отражение - полный возврат урона (с учетом своих эмоций)
                const damageMultiplier = this.getDamageMultiplier(source);
                let reflectDamage = Math.floor((targetLastCard.damage ?? 0) * damageMultiplier);
                const targetStat = targetLastCard.effect === 'random'
                    ? (Math.random() > 0.5 ? 'logic' : 'emotion')
                    : targetLastCard.effect;
                target[targetStat] = (target[targetStat] ?? 0) - reflectDamage;
                message += ` (-${reflectDamage} ${targetStat} отражено!)`;
            }
        }

        // ============ АТАКА ============
        else if (card.category === 'Атака' && !wasCancelled) {
            // Применить множитель урона от эмоций атакующего
            const damageMultiplier = this.getDamageMultiplier(source);
            finalDamage = Math.floor(finalDamage * damageMultiplier);

            // Проверка преимущества: Атака > Защита (+50% урона)
            if (targetLastCard?.category === 'Защита') {
                finalDamage = Math.floor(finalDamage * 1.5);
                message += ` (Пробивает защиту!)`;
            }

            // Применить урон (учитывая щит)
            if (finalDamage > 0) {
                const targetStat = card.effect === 'random'
                    ? (Math.random() > 0.5 ? 'logic' : 'emotion')
                    : card.effect;

                // Щит поглощает урон
                if (target.shield && target.shield > 0) {
                    const absorbed = Math.min(target.shield, finalDamage);
                    target.shield -= absorbed;
                    finalDamage -= absorbed;
                    message += ` (Щит: -${absorbed})`;
                    if (target.shield <= 0) {
                        delete target.shield;
                        message += ` (Щит разрушен!)`;
                    }
                }

                // Остаток урона
                if (finalDamage > 0) {
                    target[targetStat] = (target[targetStat] ?? 0) - finalDamage;
                    message += ` (-${finalDamage} ${targetStat})`;
                }
            }
        }

        // ============ ЗАЩИТА ============
        else if (card.category === 'Защита' && !wasCancelled) {
            // Проверка преимущества: Защита > Уклонение (+50% лечения)
            if (targetLastCard?.category === 'Уклонение') {
                finalHeal = Math.floor(finalHeal * 1.5);
                message += ` (Ловит в ловушку!)`;
            }

            if (card.effect === 'shield') {
                // Создать щит
                source.shield = (source.shield ?? 0) + (card.shield ?? 0);
                message += ` (Щит: +${card.shield})`;
            } else if (finalHeal > 0) {
                // Лечение
                source[card.effect] = (source[card.effect] ?? 0) + finalHeal;
                message += ` (+${finalHeal} ${card.effect})`;
            }
        }

        // Проверка "Повторение" на карты из discard
        if (card.fromDiscard) {
            let repeatCardIndex = target.cards.findIndex(c => c.name === "Повторение" && !c.used);
            if (repeatCardIndex !== -1) {
                message += ` (Обнулено: "Ты уже это говорил!")`;
                target.cards[repeatCardIndex].used = true;
            } else {
                // Дать противнику карту "Повторение"
                this.addCardsToHand(this.cardManager.getRepeatCard(), target);
            }
        }

        this.updateMaxStats(source);
        this.updateMaxStats(target);
        source.lastCard = card;

        return message;
    }

    addCardsToHand(card, character) {
        if (!card) return;
        const handLimit = this.getHandLimit(character);

        if (character.cards.length < handLimit) {
            character.cards.push(card);
        } else {
            // Рука переполнена, сбросить старейшую карту
            character.discardPile.push(character.cards.shift());
            character.cards.push(card);
        }
    }

    addCounterCard(lastCard, character, isPlayer = true) {
        // 70% шанс получить карту, противостоящую последней карте врага
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

    // Вычислить максимальный размер руки в зависимости от логики
    getHandLimit(character) {
        const logic = character.logic ?? 0;
        if (logic <= 0) return 3;
        if (logic <= 2) return 4;
        if (logic <= 4) return 5;
        if (logic <= 6) return 6;
        return 7;
    }

    // Вычислить множитель урона в зависимости от эмоций
    getDamageMultiplier(character) {
        const emotion = character.emotion ?? 0;
        if (emotion <= 0) return 0.5;
        if (emotion <= 2) return 0.75;
        if (emotion <= 4) return 1.0;
        if (emotion <= 6) return 1.25;
        return 1.5;
    }

    // Проверить и пополнить минимальный состав руки (1 атака, 1 защита, 1 уклонение)
    ensureMinimumHandComposition(character, isPlayer = true) {
        const handLimit = this.getHandLimit(character);

        // Подсчитать сколько карт каждого типа
        const cardsByCategory = {
            'Атака': character.cards.filter(c => c.category === 'Атака').length,
            'Защита': character.cards.filter(c => c.category === 'Защита').length,
            'Уклонение': character.cards.filter(c => c.category === 'Уклонение').length
        };

        const missingTypes = [];

        // Проверить минимальные требования
        if (cardsByCategory['Атака'] === 0 && character.cards.length < handLimit) {
            missingTypes.push('Атака');
        }
        if (cardsByCategory['Защита'] === 0 && character.cards.length < handLimit) {
            missingTypes.push('Защита');
        }
        if (cardsByCategory['Уклонение'] === 0 && character.cards.length < handLimit) {
            missingTypes.push('Уклонение');
        }

        // Добавить недостающие типы карт
        for (const type of missingTypes) {
            let card = null;

            if (type === 'Атака') {
                const attackPool = isPlayer ? this.cardManager.basePlayerCards : this.cardManager.baseEnemyCards;
                card = this.cardManager.getWeightedCard(character, attackPool);
            } else if (type === 'Защита') {
                card = this.cardManager.getDefenseCard();
            } else if (type === 'Уклонение') {
                if (this.cardManager.evasionCards.length) {
                    card = this.cardManager.cloneCard(this.cardManager.pickRandom(this.cardManager.evasionCards));
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
        // Если персонаж в минусе, дать ему защитную карту
        if ((character.logic < 0 && !character.logicNegative) || (character.emotion < 0 && !character.emotionNegative)) {
            const defenseCard = this.cardManager.getDefenseCard();
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
            return true;
        } else if (this.enemy.points >= 3) {
            this.uiManager.addMessage("Скептик победил! Ты проиграл!", 'enemy');
            this.lastVictorySpeechPromise = this.visualManager.setVisual('enemy', "Поражение!");
            return true;
        }
        this.lastVictorySpeechPromise = null;
        return false;
    }

    drawFromDiscard() {
        const handLimit = this.getHandLimit(this.player);
        if (!this.playerTurn || this.playerHasPlayedCard || this.player.discardPile.length === 0 || this.player.cards.length >= handLimit) return;
        let randomIndex = Math.floor(Math.random() * this.player.discardPile.length);
        let drawnCard = this.player.discardPile.splice(randomIndex, 1)[0];
        drawnCard.used = false;
        drawnCard.fromDiscard = true;

        if (Math.random() < 0.2) {
            const rareCard = this.cardManager.getRareAttackCard(this.player);
            if (rareCard) {
                drawnCard = rareCard;
            }
        } else {
            const weightedCard = this.cardManager.getWeightedCard(this.player);
            if (weightedCard) {
                drawnCard = weightedCard;
            }
        }

        this.player.cards.push(drawnCard);
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
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

        let message = this.applyCard(card, this.player, this.enemy);
        const speechPromise = this.visualManager.setVisual('player', message);
        this.uiManager.addMessage(card.text, 'player', this.turn);

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
        let message = '';
        let playedCardText = null;

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
                message = `${this.cardManager.repeatCard.text} (Отменяет предыдущий ход)`;
                this.enemy.cards = this.enemy.cards.filter(c => !c.used);
                this.enemy.discardPile.push(cancelledCard);
                playedCardText = cancelledCard.text ?? message;
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

            message = this.applyCard(randomCard, this.enemy, this.player);
            playedCardText = randomCard.text;

            if (randomCard.used) {
                this.enemy.discardPile.push(randomCard);
                this.enemy.cards = this.enemy.cards.filter(c => !c.used);
            }

            this.addCounterCard(randomCard, this.player, true);
        } else {
            message = "Скептик: \"Мне нечего сказать...\"";
            playedCardText = message;
        }

        const speechPromise = this.visualManager.setVisual('enemy', message);
        const logText = playedCardText ?? message;
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

// Класс для управления интерфейсом
class UIManager {
    constructor() {
        this.dialog = document.getElementById('dialog');
        this.cardDeck = document.getElementById('cardDeck');
        this.playerLogicBar = document.getElementById('playerLogicBar');
        this.playerEmotionBar = document.getElementById('playerEmotionBar');
        this.enemyLogicBar = document.getElementById('enemyLogicBar');
        this.enemyEmotionBar = document.getElementById('enemyEmotionBar');
        this.playerLogicValue = document.getElementById('playerLogicValue');
        this.playerEmotionValue = document.getElementById('playerEmotionValue');
        this.enemyLogicValue = document.getElementById('enemyLogicValue');
        this.enemyEmotionValue = document.getElementById('enemyEmotionValue');
    }

    addMessage(text, sender, turn = null) {
        let messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        if (turn) messageDiv.innerHTML = `<div class="turn">Ход ${turn}</div>${text}`;
        else messageDiv.innerHTML = text;
        this.dialog.appendChild(messageDiv);
        this.dialog.scrollTop = this.dialog.scrollHeight;
    }

    updateStats(player, enemy) {
        this.setStatPanel(player, this.playerLogicBar, this.playerEmotionBar, this.playerLogicValue, this.playerEmotionValue);
        this.setStatPanel(enemy, this.enemyLogicBar, this.enemyEmotionBar, this.enemyLogicValue, this.enemyEmotionValue);

        const playerDotsOverlay = document.getElementById('playerPointsOverlay').getElementsByClassName('dot');
        const enemyDotsOverlay = document.getElementById('enemyPointsOverlay').getElementsByClassName('dot');
        for (let i = 0; i < 3; i++) {
            playerDotsOverlay[i].className = 'dot' + (i < player.points ? ' active player' : '');
            enemyDotsOverlay[i].className = 'dot' + (i < enemy.points ? ' active enemy' : '');
        }

        // Обновить индикатор лимита руки
        const handLimit = gameEngine.getHandLimit(player);
        const handInfo = document.getElementById('handInfo');
        if (handInfo) {
            const damageMultiplier = gameEngine.getDamageMultiplier(player);
            const multiplierText = damageMultiplier !== 1.0 ? ` | Урон: x${damageMultiplier.toFixed(2)}` : '';
            handInfo.textContent = `Карты: ${player.cards.length}/${handLimit}${multiplierText}`;
        }

        switch (true) {
            case (!gameEngine.playerTurn):
            case (gameEngine.playerHasPlayedCard):
                document.getElementById('discardButton').disabled = true;
                break;
            default:
                document.getElementById('discardButton').disabled = false;
        }
    }

    renderCards(cards, isPlayerTurn, hasPlayedCard, playCardCallback) {
        this.cardDeck.innerHTML = '';
        cards.forEach(card => {
            let div = document.createElement('div');
            div.className = `card ${card.category}` + (card.used ? ' used' : '');
            const usesBadge = card.usesLeft !== undefined ? `<div class="card-uses">${Math.max(0, card.usesLeft)}</div>` : '';
            div.innerHTML = `
                ${usesBadge}
                <div class="card-title">${card.name}</div>
                <div class="card-desc">${card.desc}</div>
                <div class="card-stats">${card.damage ? `-${card.damage} ${card.effect === 'random' ? 'логика/эмоции' : card.effect}` : (card.heal ? `+${card.heal} ${card.effect}` : 'Обнуляет')}</div>
            `;
            if (!card.used && isPlayerTurn && !hasPlayedCard) {
                div.onclick = () => playCardCallback(card);
            }
            this.cardDeck.appendChild(div);
        });
    }

    setStatPanel(stats, logicBar, emotionBar, logicValueEl, emotionValueEl) {
        if (!stats) return;
        const logicMax = Math.max(stats.maxLogic ?? stats.logic ?? 0, 1);
        const emotionMax = Math.max(stats.maxEmotion ?? stats.emotion ?? 0, 1);
        if (logicBar) {
            const logicPercent = Math.max(0, Math.min(1, (stats.logic ?? 0) / logicMax));
            logicBar.style.width = `${logicPercent * 100}%`;
        }
        if (emotionBar) {
            const emotionPercent = Math.max(0, Math.min(1, (stats.emotion ?? 0) / emotionMax));
            emotionBar.style.width = `${emotionPercent * 100}%`;
        }
        if (logicValueEl) {
            logicValueEl.textContent = Math.round(stats.logic ?? 0);
        }
        if (emotionValueEl) {
            emotionValueEl.textContent = Math.round(stats.emotion ?? 0);
        }
    }
}

// Инициализация игры
let gameEngine;

async function startGame(cardData) {
    const cardManager = new CardManager(cardData);
    const uiManager = new UIManager();
    const visualManager = new VisualManager();
    gameEngine = new GameEngine(cardManager, uiManager, visualManager);

    const firstEnemyCard = gameEngine.enemy.cards[0];
    if (firstEnemyCard) {
        firstEnemyCard.usesLeft--;
        if (firstEnemyCard.usesLeft !== undefined && firstEnemyCard.usesLeft <= 0) {
            firstEnemyCard.used = true;
        }
        if (firstEnemyCard.used) {
            gameEngine.enemy.discardPile.push(firstEnemyCard);
            gameEngine.enemy.cards = gameEngine.enemy.cards.filter(c => !c.used);
        }
        const introMessage = gameEngine.applyCard(firstEnemyCard, gameEngine.enemy, gameEngine.player);
        const speechPromise = gameEngine.visualManager.setVisual('enemy', introMessage);
        gameEngine.uiManager.addMessage(firstEnemyCard.text, 'enemy', 1);
        gameEngine.addCounterCard(firstEnemyCard, gameEngine.player, true);
        gameEngine.checkPoints(gameEngine.enemy, gameEngine.player);
        gameEngine.addDefenseWhenLow(gameEngine.player);
        await speechPromise;
    }

    gameEngine.uiManager.updateStats(gameEngine.player, gameEngine.enemy);
    gameEngine.uiManager.renderCards(gameEngine.player.cards, gameEngine.playerTurn, gameEngine.playerHasPlayedCard, gameEngine.playCard.bind(gameEngine));
    await gameEngine.visualManager.setVisual('idle');
}

async function initializeGame() {
    try {
        const response = await fetch('cards.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load cards.json: ${response.status}`);
        }
        const cardData = await response.json();
        await startGame(cardData);
    } catch (error) {
        console.error('Не удалось загрузить данные карт:', error);
        const dialog = document.getElementById('dialog');
        if (dialog) {
            dialog.innerHTML = '<div class="message enemy">Не удалось загрузить данные карт. Попробуйте обновить страницу.</div>';
        }
        const discardButton = document.getElementById('discardButton');
        if (discardButton) {
            discardButton.disabled = true;
        }
    }
}

document.addEventListener('DOMContentLoaded', initializeGame);
