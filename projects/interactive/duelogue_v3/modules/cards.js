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
        // Используем встроенные данные вместо fetch
        if (typeof CARDS_DATA === 'undefined' || !CARDS_DATA[path]) {
            throw new Error(`Card data not found for: ${path}`);
        }

        const cardData = CARDS_DATA[path];
        console.log(`✅ Загружены карты из встроенных данных: ${path}`);

        this.basePlayerCards = cardData?.basePlayerCards ?? [];
        this.baseEnemyCards = cardData?.baseEnemyCards ?? [];
        this.defenseCards = cardData?.defenseCards ?? [];
        this.evasionCards = cardData?.evasionCards ?? [];
        this.rareAttackCards = cardData?.rareAttackCards ?? [];

        this.initializeVariantTracking(this.basePlayerCards);
        this.initializeVariantTracking(this.baseEnemyCards);
        this.initializeVariantTracking(this.defenseCards);
        this.initializeVariantTracking(this.evasionCards);
        this.initializeVariantTracking(this.rareAttackCards);

        const specials = cardData?.specialCards ?? {};
        this.repeatCard = specials.repeatCard ?? null;
        if (this.repeatCard) {
            this.initializeVariantTracking([this.repeatCard]);
        }
    }

    initializeVariantTracking(cardList = []) {
        if (!Array.isArray(cardList)) return;
        cardList.forEach(card => {
            if (card && Array.isArray(card.textVariants) && card.textVariants.length > 0) {
                card._nextVariantIndex = 0;
            }
        });
    }

    pickRandom(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    cloneCard(template) {
        if (!template) return null;
        const clone = JSON.parse(JSON.stringify(template));

        if (Array.isArray(template.textVariants) && template.textVariants.length > 0) {
            const nextIndex = template._nextVariantIndex ?? 0;
            clone.currentVariantIndex = nextIndex;
            template._nextVariantIndex = (nextIndex + 1) % template.textVariants.length;
        }

        if (clone.currentVariantIndex === undefined || clone.currentVariantIndex === null) {
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

    getInitialCardsFor(character, attackTemplates) {
        // Стартовая рука: 2 Атаки + 1 Защита + 1 Уклонение
        const result = [];
        const usedNames = new Set();

        // 2 случайные атаки
        if (attackTemplates.length > 0) {
            for (let i = 0; i < 2; i++) {
                const availablePool = attackTemplates.filter(template => !usedNames.has(template.name));
                if (availablePool.length > 0) {
                    const chosen = this.pickRandom(availablePool);
                    result.push(this.cloneCard(chosen));
                    usedNames.add(chosen.name);
                } else if (attackTemplates.length > 0) {
                    const chosen = this.pickRandom(attackTemplates);
                    result.push(this.cloneCard(chosen));
                    usedNames.add(chosen.name);
                }
            }
        }
        
        // 1 случайная защита
        if (this.defenseCards.length) {
            const availablePool = this.defenseCards.filter(template => !usedNames.has(template.name));
            const chosen = availablePool.length > 0 ? this.pickRandom(availablePool) : this.pickRandom(this.defenseCards);
            if (chosen) {
                result.push(this.cloneCard(chosen));
                usedNames.add(chosen.name);
            }
        }

        // 1 случайное уклонение
        if (this.evasionCards.length) {
            const availablePool = this.evasionCards.filter(template => !usedNames.has(template.name));
            const chosen = availablePool.length > 0 ? this.pickRandom(availablePool) : this.pickRandom(this.evasionCards);
            if (chosen) {
                result.push(this.cloneCard(chosen));
                usedNames.add(chosen.name);
            }
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

    getRareAttackCard(character) {
        if (!this.rareAttackCards.length) return null;

        return this.getUniqueCard(this.rareAttackCards, character) || this.cloneCard(this.pickRandom(this.rareAttackCards));
    }

    getWeightedCard(character, baseTemplates = this.basePlayerCards) {
        if (!baseTemplates.length) return null;

        return this.getUniqueCard(baseTemplates, character) || this.cloneCard(this.pickRandom(baseTemplates));
    }
}

console.log('✅ Модуль cards.js загружен');
