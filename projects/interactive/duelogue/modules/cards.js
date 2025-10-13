// Менеджер карт для ДУЕЛОГ
// Управляет загрузкой, генерацией и выбором карт

class CardManager {
    constructor() {
        this.basePlayerCards = [];
        this.baseEnemyCards = [];
        this.defenseCards = [];
        this.evasionCards = [];
        this.rareAttackCards = [];
        this.repeatCard = null;
    }

    async loadCards(path) {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load cards: ${response.status}`);
        }
        const cardData = await response.json();

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
        if (!clone.currentVariantIndex) {
            clone.currentVariantIndex = 0;
        }
        return clone;
    }

    getCardText(card) {
        // Если есть вариации текста, выбрать текущий вариант
        if (card.textVariants && card.textVariants.length > 0) {
            const index = card.currentVariantIndex ?? 0;
            return card.textVariants[index] || card.text;
        }
        return card.text;
    }

    getEffectPools(cards) {
        const logic = cards.filter(card => card.effect === 'logic');
        const emotion = cards.filter(card => card.effect === 'emotion');
        return { logic, emotion };
    }

    getInitialCardsFor(character, attackTemplates) {
        // Стартовая рука: 2 Атаки + 1 Защита + 1 Уклонение
        const result = [];
        const usedNames = new Set();

        // 2 атаки (logic и emotion по весам персонажа)
        const { logic, emotion } = this.getEffectPools(attackTemplates);
        const total = Math.max(1, character.logic + character.emotion);
        const logicWeight = character.logic / total;

        for (let i = 0; i < 2; i++) {
            const useLogic = Math.random() < logicWeight;
            const pool = useLogic ? (logic.length ? logic : attackTemplates) : (emotion.length ? emotion : attackTemplates);

            if (pool.length) {
                const availablePool = pool.filter(template => !usedNames.has(template.name));
                if (availablePool.length > 0) {
                    const chosen = this.pickRandom(availablePool);
                    result.push(this.cloneCard(chosen));
                    usedNames.add(chosen.name);
                } else if (pool.length > 0) {
                    const chosen = this.pickRandom(pool);
                    result.push(this.cloneCard(chosen));
                    usedNames.add(chosen.name);
                }
            }
        }

        // 1 защита (по типу персонажа)
        if (this.defenseCards.length) {
            const defensePool = this.defenseCards.filter(c => c.effect !== 'shield');
            if (defensePool.length) {
                const useLogic = Math.random() < logicWeight;
                const preferred = defensePool.filter(c => c.effect === (useLogic ? 'logic' : 'emotion'));
                const pool = preferred.length ? preferred : defensePool;

                const availablePool = pool.filter(template => !usedNames.has(template.name));
                const chosen = availablePool.length > 0 ? this.pickRandom(availablePool) : this.pickRandom(pool);
                result.push(this.cloneCard(chosen));
                usedNames.add(chosen.name);
            }
        }

        // 1 уклонение
        if (this.evasionCards.length) {
            const availablePool = this.evasionCards.filter(template => !usedNames.has(template.name));
            const chosen = availablePool.length > 0 ? this.pickRandom(availablePool) : this.pickRandom(this.evasionCards);
            result.push(this.cloneCard(chosen));
            usedNames.add(chosen.name);
        }

        return result;
    }

    // Создать полную колоду со всеми доступными картами
    createFullDeck(isPlayer = true) {
        const deck = [];
        const attackPool = isPlayer ? this.basePlayerCards : this.baseEnemyCards;

        // Добавить все базовые атаки
        attackPool.forEach(template => {
            deck.push(this.cloneCard(template));
        });

        // Добавить все защиты
        this.defenseCards.forEach(template => {
            deck.push(this.cloneCard(template));
        });

        // Добавить все уклонения
        this.evasionCards.forEach(template => {
            deck.push(this.cloneCard(template));
        });

        // Добавить редкие атаки
        this.rareAttackCards.forEach(template => {
            deck.push(this.cloneCard(template));
        });

        return deck;
    }

    getInitialPlayerCards(player) {
        return this.getInitialCardsFor(player, this.basePlayerCards);
    }

    getInitialEnemyCards(enemy) {
        return this.getInitialCardsFor(enemy, this.baseEnemyCards);
    }

    getCounterCard(lastCard, character, isPlayer = true) {
        if (!lastCard) return null;

        const category = lastCard.category;
        const attackPool = isPlayer ? this.basePlayerCards : this.baseEnemyCards;

        if (category === 'Атака') {
            if (this.evasionCards.length && Math.random() < 0.7) {
                return this.getUniqueCard(this.evasionCards, character);
            }
        } else if (category === 'Защита') {
            if (Math.random() < 0.7) {
                return this.getWeightedCard(character, attackPool);
            }
        } else if (category === 'Уклонение') {
            if (this.defenseCards.length && Math.random() < 0.7) {
                return this.getUniqueCard(this.defenseCards, character);
            }
        }

        return null;
    }

    getUniqueCard(pool, character, maxAttempts = 5) {
        if (!pool.length) return null;

        const existingNames = new Set(character.cards.map(c => c.name));
        const availablePool = pool.filter(template => !existingNames.has(template.name));

        if (availablePool.length > 0) {
            return this.cloneCard(this.pickRandom(availablePool));
        }

        return null;
    }

    getRepeatCard() {
        return this.cloneCard(this.repeatCard);
    }

    getDefenseCard(character = null) {
        if (!this.defenseCards.length) return null;
        if (character) {
            return this.getUniqueCard(this.defenseCards, character);
        }
        return this.cloneCard(this.pickRandom(this.defenseCards));
    }

    getRareAttackCard(character) {
        if (!this.rareAttackCards.length) return null;

        const { logic, emotion } = this.getEffectPools(this.rareAttackCards);
        const total = Math.max(1, character.logic + character.emotion);
        const logicWeight = character.logic / total;
        const useLogic = Math.random() < logicWeight;
        const pool = useLogic ? (logic.length ? logic : this.rareAttackCards) : (emotion.length ? emotion : this.rareAttackCards);

        return this.getUniqueCard(pool, character) || this.cloneCard(this.pickRandom(pool));
    }

    getWeightedCard(character, baseTemplates = this.basePlayerCards) {
        if (!baseTemplates.length) return null;

        const { logic, emotion } = this.getEffectPools(baseTemplates);
        const total = Math.max(1, character.logic + character.emotion);
        const logicWeight = character.logic / total;
        const useLogic = Math.random() < logicWeight;
        const pool = useLogic ? (logic.length ? logic : baseTemplates) : (emotion.length ? emotion : baseTemplates);

        return this.getUniqueCard(pool, character) || this.cloneCard(this.pickRandom(pool));
    }
}

console.log('✅ Модуль cards.js загружен');
