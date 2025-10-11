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
    }

    setVisual(state, text = '') {
        this.visualImage.src = this.assets[state].image;
        this.visualBackground.src = this.assets[state].background;
        this.showSpeechBubble(text);
        if (state === 'idle') {
            this.statsOverlay.classList.add('visible');
            this.pointsOverlay.classList.add('visible');
        } else {
            this.statsOverlay.classList.remove('visible');
            this.pointsOverlay.classList.remove('visible');
        }
    }

    showSpeechBubble(text) {
        this.speechBubble.textContent = '';
        this.speechBubble.classList.remove('visible');
        if (text) {
            let index = 0;
            this.speechBubble.classList.add('visible');
            const typeText = () => {
                if (index < text.length) {
                    this.speechBubble.textContent += text[index];
                    index++;
                    setTimeout(typeText, 50);
                }
            };
            typeText();
        }
    }
}

// Класс для управления картами
class CardManager {
    constructor(cardData) {
        this.basePlayerCards = cardData?.basePlayerCards ?? [];
        this.baseEnemyCards = cardData?.baseEnemyCards ?? [];
        this.reflectionCards = cardData?.reflectionCards ?? {};
        this.derivativeTemplates = cardData?.derivativeTemplates ?? [];
        this.rareAttackCards = cardData?.rareAttackCards ?? [];
        this.counterCards = cardData?.counterCards ?? [];

        const specials = cardData?.specialCards ?? {};
        this.repeatCard = specials.repeatCard ?? null;
        this.observationCard = specials.observationCard ?? null;
        this.critiqueCard = specials.critiqueCard ?? null;
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

    getInitialCardsFor(character, templates) {
        if (!templates.length) return [];

        const { logic, emotion } = this.getEffectPools(templates);
        const fallback = templates;
        const total = Math.max(1, character.logic + character.emotion);
        const logicWeight = character.logic / total;
        const chosenNames = new Set();
        const result = [];

        while (result.length < 2) {
            const useLogic = Math.random() < logicWeight;
            const pool = useLogic ? (logic.length ? logic : fallback) : (emotion.length ? emotion : fallback);
            const available = pool.filter(card => !chosenNames.has(card.name));
            const sourcePool = available.length ? available : pool;
            if (!sourcePool.length) break;
            const template = this.pickRandom(sourcePool);
            chosenNames.add(template.name);
            result.push(this.cloneCard(template));
            if (chosenNames.size >= fallback.length) break;
        }

        if (result.length < 2) {
            fallback
                .filter(card => !chosenNames.has(card.name))
                .slice(0, 2 - result.length)
                .forEach(card => result.push(this.cloneCard(card)));
        }

        return result;
    }

    getInitialPlayerCards(player) {
        return this.getInitialCardsFor(player, this.basePlayerCards);
    }

    getInitialEnemyCards(enemy) {
        return this.getInitialCardsFor(enemy, this.baseEnemyCards);
    }

    generateDerivativeCard(baseTemplate) {
        if (!baseTemplate) {
            return null;
        }
        if (!this.derivativeTemplates.length) {
            return this.cloneCard(baseTemplate);
        }

        const template = this.pickRandom(this.derivativeTemplates);
        const derivative = this.cloneCard(baseTemplate);
        derivative.name = `${baseTemplate.name}${template.suffix ?? ''}`.trim();
        derivative.text = `${baseTemplate.text}${template.textSuffix ?? ''}`;
        derivative.desc = template.desc ?? baseTemplate.desc;
        derivative.damage = (baseTemplate.damage ?? 0) + (template.damageBonus ?? 0);

        if (template.heal !== undefined) {
            derivative.heal = template.heal;
        }

        delete derivative.usesLeft; // derivative карты одноразовые
        return derivative;
    }

    generateCounterCards(lastCard) {
        if (!this.counterCards.length) return [];

        const counters = [];
        if (Math.random() < 0.3) {
            const logicCounter = this.counterCards.filter(card => card.effect === 'logic');
            const emotionCounter = this.counterCards.filter(card => card.effect === 'emotion');

            if (lastCard.effect === 'logic' && lastCard.damage && logicCounter.length) {
                counters.push(this.cloneCard(this.pickRandom(logicCounter)));
            } else if (lastCard.effect === 'emotion' && lastCard.damage && emotionCounter.length) {
                counters.push(this.cloneCard(this.pickRandom(emotionCounter)));
            }
        }
        return counters;
    }

    getReflectionCard(type) {
        return this.cloneCard(this.reflectionCards?.[type]);
    }

    getObservationCard() {
        return this.cloneCard(this.observationCard);
    }

    getRepeatCard() {
        return this.cloneCard(this.repeatCard);
    }

    getCritiqueCard() {
        return this.cloneCard(this.critiqueCard);
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

        return Math.random() < 0.5
            ? this.cloneCard(baseTemplate)
            : this.generateDerivativeCard(baseTemplate);
    }
}

// Класс для управления игровой механикой
class GameEngine {
    constructor(cardManager, uiManager, visualManager) {
        this.cardManager = cardManager;
        this.uiManager = uiManager;
        this.visualManager = visualManager;
        this.player = { logic: 3, maxLogic: 3, emotion: 5, maxEmotion: 5, points: 0, logicDepleted: false, emotionDepleted: false, negativeTurns: 0, cards: [], discardPile: [], lastCard: null };
        this.enemy = { logic: 4, maxLogic: 4, emotion: 4, maxEmotion: 4, points: 0, logicDepleted: false, emotionDepleted: false, negativeTurns: 0, cards: [], discardPile: [], lastCard: null };
        this.turn = 1;
        this.playerTurn = true;
        this.gameActive = true;
        this.playerHasPlayedCard = false;
        this.enemyHasPlayedCard = false;
        this.dialogueHistory = []; // История тезисов
        this.playerStyle = { emotionalTurns: 0, logicalTurns: 0 }; // Стиль игрока
        this.enemyStyle = { emotionalTurns: 0, logicalTurns: 0 }; // Стиль скептика
        this.player.cards = cardManager.getInitialPlayerCards(this.player);
        this.enemy.cards = cardManager.getInitialEnemyCards(this.enemy);
    }

    applyCard(card, source, target) {
        let message = card.text;
        let damageBonus = 0;
        let wasCancelled = false;

        // Проверка "Замечания" на повторение
        let repeatCardIndex = target.cards.findIndex(c => c.name === "Повторение" && !c.used);
        if (repeatCardIndex !== -1 && card.fromDiscard && (source === this.enemy ? Math.random() > 0.5 : true)) {
            message += ` (Обнулено: "Ты уже это говорил!")`;
            wasCancelled = true;
            target.cards[repeatCardIndex].used = true;
        } else if (card.fromDiscard) {
            this.addCardsToHand(this.cardManager.getRepeatCard(), target.cards, target.discardPile);
        }

        if (!wasCancelled) {
            if (card.category === 'Тезис') {
                this.dialogueHistory.push({ id: card.name, turn: this.turn, source: source === this.player ? 'player' : 'enemy' });
                if (card.effect === 'emotion') source === this.player ? this.playerStyle.emotionalTurns++ : this.enemyStyle.emotionalTurns++;
                if (card.effect === 'logic') source === this.player ? this.playerStyle.logicalTurns++ : this.enemyStyle.logicalTurns++;
            }

            if (card.category === 'Контраргумент') {
                const lastThesis = this.dialogueHistory.filter(t => t.source !== (source === this.player ? 'player' : 'enemy')).slice(-1)[0];
                if (lastThesis && this.turn - lastThesis.turn <= 2) {
                    damageBonus += 1;
                    message += ` (Усилено: свежий тезис!)`;
                }
            }

            if (card.category === 'Замечание' && card.name !== "Повторение") {
                const style = source === this.player ? this.enemyStyle : this.playerStyle;
                if (style.emotionalTurns >= 3) {
                    damageBonus += 2;
                    message += ` (Усилено: слишком эмоционально!)`;
                } else if (style.logicalTurns >= 3) {
                    damageBonus += 2;
                    message += ` (Усилено: слишком логично!)`;
                }
            }

            if (card.category === 'Укол') {
                const targetTheses = this.dialogueHistory.filter(t => t.source === (target === this.player ? 'player' : 'enemy'));
                if (targetTheses.length >= 2 && targetTheses.some(t => t.id !== targetTheses[0].id)) {
                    damageBonus += 2;
                    message += ` (Усилено: противоречие!)`;
                }
                if (card.risk && Math.random() < card.risk) {
                    source[card.effect === 'random' ? (Math.random() > 0.5 ? 'logic' : 'emotion') : card.effect] -= 2;
                    message += ` (Обратный урон: -2)`;
                }
            }

            if (card.effect === 'random') {
                let targetStat = Math.random() > 0.5 ? 'logic' : 'emotion';
                target[targetStat] -= (card.damage + damageBonus);
                message += ` (-${card.damage + damageBonus} ${targetStat})`;
            } else if (card.damage) {
                target[card.effect] -= (card.damage + damageBonus);
                message += ` (-${card.damage + damageBonus} ${card.effect})`;
            } else if (card.heal) {
                source[card.effect] += card.heal;
                message += ` (+${card.heal} ${card.effect})`;
            }
            if (card.heal && card.damage) {
                source[card.effect] += card.heal;
                message += ` (+${card.heal} ${card.effect})`;
            }

            this.updateMaxStats(source);
            this.updateMaxStats(target);
        }

        source.lastCard = card;
        return message;
    }

    addCardsToHand(card, targetCards, discardPile) {
        if (targetCards.length < 5) {
            targetCards.push(card);
        } else {
            discardPile.push(targetCards.shift());
            targetCards.push(card);
        }
    }

    addCounterCards(lastCard, targetCards, discardPile) {
        let newCards = this.cardManager.generateCounterCards(lastCard);
        newCards.forEach(card => this.addCardsToHand(card, targetCards, discardPile));
    }

    updateMaxStats(character) {
        if (!character) return;
        if (character.maxLogic === undefined) character.maxLogic = character.logic;
        if (character.maxEmotion === undefined) character.maxEmotion = character.emotion;
        character.maxLogic = Math.max(character.maxLogic, character.logic);
        character.maxEmotion = Math.max(character.maxEmotion, character.emotion);
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

    addReflectionAndObservation(character, opponent) {
        if (character.logic < 0 && !character.logicNegative) {
            this.addCardsToHand(this.cardManager.getReflectionCard('logic'), character.cards, character.discardPile);
            if (Math.random() < 0.3) this.addCardsToHand(this.cardManager.getObservationCard(), opponent.cards, opponent.discardPile);
            character.logicNegative = true;
        }
        if (character.emotion < 0 && !character.emotionNegative) {
            this.addCardsToHand(this.cardManager.getReflectionCard('emotion'), character.cards, character.discardPile);
            if (Math.random() < 0.3) this.addCardsToHand(this.cardManager.getObservationCard(), opponent.cards, opponent.discardPile);
            character.emotionNegative = true;
        }
        if (character.logic >= 0) character.logicNegative = false;
        if (character.emotion >= 0) character.emotionNegative = false;

        if (character.lastCard && opponent.lastCard && character.lastCard.effect !== opponent.lastCard.effect && Math.random() < 0.5) {
            this.addCardsToHand(this.cardManager.getCritiqueCard(), character.cards, character.discardPile);
        }
    }

    checkVictory() {
        if (this.player.points >= 3) {
            this.uiManager.addMessage("Ты победил! Все 3 твои точки зажжены!", 'player');
            this.visualManager.setVisual('player', "Победа!");
            return true;
        } else if (this.enemy.points >= 3) {
            this.uiManager.addMessage("Скептик победил! Ты проиграл!", 'enemy');
            this.visualManager.setVisual('enemy', "Поражение!");
            return true;
        }
        return false;
    }

    drawFromDiscard() {
        if (!this.playerTurn || this.playerHasPlayedCard || this.player.discardPile.length === 0 || this.player.cards.length >= 5) return;
        let randomIndex = Math.floor(Math.random() * this.player.discardPile.length);
        let drawnCard = this.player.discardPile.splice(randomIndex, 1)[0];
        drawnCard.used = false;
        drawnCard.fromDiscard = true;

        if (Math.random() < 0.2) {
            const rareCard = this.cardManager.getRareAttackCard(this.player);
            if (rareCard) {
                drawnCard = rareCard;
            }
        } else if (Math.random() < 0.5 && drawnCard.usesLeft > 0) {
            const derivativeCard = this.cardManager.generateDerivativeCard(drawnCard);
            if (derivativeCard) {
                drawnCard = derivativeCard;
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

    playCard(card) {
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
        this.visualManager.setVisual('player', message);
        this.uiManager.addMessage(message, 'player', this.turn);

        if (card.used) {
            this.player.discardPile.push(card);
            this.player.cards = this.player.cards.filter(c => !c.used);
        }

        this.checkPoints(this.player, this.enemy);
        this.addReflectionAndObservation(this.enemy, this.player);
        if (!card.used && Math.random() < 0.5) {
            this.addCardsToHand(this.cardManager.generateDerivativeCard(card), this.player.cards, this.player.discardPile);
        }
        this.addCounterCards(card, this.enemy.cards, this.enemy.discardPile);

        this.uiManager.updateStats(this.player, this.enemy);
        if (this.checkVictory()) {
            this.gameActive = false;
            this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
            return;
        }

        this.playerTurn = false;
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
        setTimeout(() => {
            this.visualManager.setVisual('enemy');
            setTimeout(() => this.enemyTurn(), 2000);
        }, 2000);
    }

    enemyTurn() {
        if (!this.gameActive) return;
        this.turn++;
        this.enemyHasPlayedCard = true;
        let availableCards = this.enemy.cards.filter(card => !card.used);
        let message = '';

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
            } else if (Math.random() < 0.5 && drawnCard.usesLeft > 0) {
                const derivativeCard = this.cardManager.generateDerivativeCard(drawnCard);
                if (derivativeCard) {
                    drawnCard = derivativeCard;
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

            if (randomCard.used) {
                this.enemy.discardPile.push(randomCard);
                this.enemy.cards = this.enemy.cards.filter(c => !c.used);
            }

            if (!randomCard.used && Math.random() < 0.5) {
                this.addCardsToHand(this.cardManager.generateDerivativeCard(randomCard), this.enemy.cards, this.enemy.discardPile);
            }

            this.addCounterCards(randomCard, this.player.cards, this.player.discardPile);
        } else {
            message = "Скептик: \"Мне нечего сказать...\"";
        }

        this.visualManager.setVisual('enemy', message);
        this.uiManager.addMessage(message, 'enemy', this.turn);
        this.checkPoints(this.enemy, this.player);
        this.addReflectionAndObservation(this.player, this.enemy);

        this.uiManager.updateStats(this.player, this.enemy);
        if (this.checkVictory()) {
            this.gameActive = false;
            this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
            return;
        }

        this.playerTurn = true;
        this.playerHasPlayedCard = false;
        this.enemyHasPlayedCard = false;
        this.uiManager.updateStats(this.player, this.enemy);
        this.uiManager.renderCards(this.player.cards, this.playerTurn, this.playerHasPlayedCard, this.playCard.bind(this));
        setTimeout(() => this.visualManager.setVisual('idle'), 2000);
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

function startGame(cardData) {
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
        gameEngine.player.logic -= firstEnemyCard.damage ?? 0;
        gameEngine.visualManager.setVisual('enemy', `${firstEnemyCard.text}${firstEnemyCard.damage ? ` (-${firstEnemyCard.damage} logic)` : ''}`);
        gameEngine.uiManager.addMessage(`${firstEnemyCard.text}${firstEnemyCard.damage ? ` (-${firstEnemyCard.damage} logic)` : ''}`, 'enemy', 1);
        gameEngine.dialogueHistory.push({ id: firstEnemyCard.name, turn: 1, source: 'enemy' });
        if (firstEnemyCard.effect === 'emotion') {
            gameEngine.enemyStyle.emotionalTurns++;
        } else {
            gameEngine.enemyStyle.logicalTurns++;
        }
        gameEngine.addCounterCards(firstEnemyCard, gameEngine.player.cards, gameEngine.player.discardPile);
        gameEngine.checkPoints(gameEngine.enemy, gameEngine.player);
        gameEngine.addReflectionAndObservation(gameEngine.player, gameEngine.enemy);
    }

    gameEngine.uiManager.updateStats(gameEngine.player, gameEngine.enemy);
    gameEngine.uiManager.renderCards(gameEngine.player.cards, gameEngine.playerTurn, gameEngine.playerHasPlayedCard, gameEngine.playCard.bind(gameEngine));

    setTimeout(() => gameEngine.visualManager.setVisual('idle'), 3000);
}

async function initializeGame() {
    try {
        const response = await fetch('cards.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load cards.json: ${response.status}`);
        }
        const cardData = await response.json();
        startGame(cardData);
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
