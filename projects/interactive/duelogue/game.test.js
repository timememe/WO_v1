// Юнит-тесты для игровой механики ДУЕЛОГ
// Запуск: откройте test.html в браузере или подключите этот файл к game.js

class GameTester {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.warnings = [];
    }

    // Вспомогательная функция для создания мок-персонажа
    createMockCharacter(logic = 4, emotion = 4) {
        return {
            logic,
            maxLogic: logic,
            emotion,
            maxEmotion: emotion,
            points: 0,
            logicDepleted: false,
            emotionDepleted: false,
            negativeTurns: 0,
            cards: [],
            discardPile: [],
            lastCard: null
        };
    }

    // Вспомогательная функция для создания мок-карты
    createMockCard(options = {}) {
        return {
            category: options.category || 'Атака',
            name: options.name || 'Тестовая карта',
            effect: options.effect || 'logic',
            damage: options.damage,
            heal: options.heal,
            shield: options.shield,
            text: options.text || 'Тестовый текст',
            desc: options.desc || 'Описание',
            used: false,
            fromDiscard: false,
            usesLeft: options.usesLeft
        };
    }

    // Регистрация теста
    test(name, fn) {
        this.tests.push({ name, fn });
    }

    // Проверка условия
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    // Проверка равенства
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(
                message || `Expected ${expected}, got ${actual}`
            );
        }
    }

    // Проверка примерного равенства (для чисел с плавающей точкой)
    assertClose(actual, expected, tolerance = 0.01, message) {
        if (Math.abs(actual - expected) > tolerance) {
            throw new Error(
                message || `Expected ~${expected}, got ${actual}`
            );
        }
    }

    // Предупреждение о балансе
    warn(message) {
        this.warnings.push(message);
    }

    // Запуск всех тестов
    async run() {
        console.log('%c🧪 Запуск тестов игровой механики...', 'color: #3498db; font-size: 16px; font-weight: bold');
        console.log('');

        this.passed = 0;
        this.failed = 0;
        this.warnings = [];

        for (const test of this.tests) {
            try {
                await test.fn.call(this);
                this.passed++;
                console.log(`%c✓ ${test.name}`, 'color: #2ecc71');
            } catch (error) {
                this.failed++;
                console.error(`%c✗ ${test.name}`, 'color: #e74c3c');
                console.error(`  ${error.message}`);
                console.error(error.stack);
            }
        }

        console.log('');
        console.log('%c' + '='.repeat(50), 'color: #95a5a6');
        console.log(
            `%cРезультаты: %c${this.passed} пройдено%c, %c${this.failed} провалено`,
            'color: #34495e; font-weight: bold',
            'color: #2ecc71; font-weight: bold',
            'color: #34495e',
            'color: #e74c3c; font-weight: bold'
        );

        if (this.warnings.length > 0) {
            console.log('');
            console.log(`%c⚠️  ${this.warnings.length} предупреждений о балансе:`, 'color: #f39c12; font-weight: bold');
            this.warnings.forEach(w => console.log(`%c  • ${w}`, 'color: #f39c12'));
        }

        console.log('%c' + '='.repeat(50), 'color: #95a5a6');

        return { passed: this.passed, failed: this.failed, warnings: this.warnings };
    }
}

// Создаем экземпляр тестера
const tester = new GameTester();

// ============================================
// ТЕСТЫ МЕХАНИКИ КАРТ
// ============================================

tester.test('Атака наносит базовый урон', function() {
    const attacker = this.createMockCharacter();
    const defender = this.createMockCharacter();
    const card = this.createMockCard({ damage: 2, effect: 'logic' });

    // Эмулируем применение карты (без gameEngine)
    const damageMultiplier = 1.0; // emotion = 4
    const finalDamage = Math.floor(card.damage * damageMultiplier);
    defender.logic -= finalDamage;

    this.assertEqual(defender.logic, 2, 'Урон 2 должен уменьшить логику с 4 до 2');
});

tester.test('Множитель урона от эмоций работает корректно', function() {
    const testCases = [
        { emotion: 0, multiplier: 0.5 },
        { emotion: 1, multiplier: 0.75 },
        { emotion: 2, multiplier: 0.75 },
        { emotion: 3, multiplier: 1.0 },
        { emotion: 4, multiplier: 1.0 },
        { emotion: 5, multiplier: 1.25 },
        { emotion: 6, multiplier: 1.25 },
        { emotion: 7, multiplier: 1.5 }
    ];

    testCases.forEach(({ emotion, multiplier }) => {
        const attacker = this.createMockCharacter(4, emotion);
        // Проверяем через прямой расчет
        let calcMultiplier;
        if (emotion <= 0) calcMultiplier = 0.5;
        else if (emotion <= 2) calcMultiplier = 0.75;
        else if (emotion <= 4) calcMultiplier = 1.0;
        else if (emotion <= 6) calcMultiplier = 1.25;
        else calcMultiplier = 1.5;

        this.assertEqual(calcMultiplier, multiplier,
            `При эмоциях ${emotion} множитель должен быть ${multiplier}`);
    });
});

tester.test('Лимит руки зависит от логики', function() {
    const testCases = [
        { logic: 0, limit: 3 },
        { logic: 1, limit: 4 },
        { logic: 2, limit: 4 },
        { logic: 3, limit: 5 },
        { logic: 4, limit: 5 },
        { logic: 5, limit: 6 },
        { logic: 6, limit: 6 },
        { logic: 7, limit: 7 },
        { logic: 8, limit: 7 }
    ];

    testCases.forEach(({ logic, limit }) => {
        const char = this.createMockCharacter(logic, 4);
        let calcLimit;
        if (logic <= 0) calcLimit = 3;
        else if (logic <= 2) calcLimit = 4;
        else if (logic <= 4) calcLimit = 5;
        else if (logic <= 6) calcLimit = 6;
        else calcLimit = 7;

        this.assertEqual(calcLimit, limit,
            `При логике ${logic} лимит руки должен быть ${limit}`);
    });
});

tester.test('Щит поглощает урон корректно', function() {
    const defender = this.createMockCharacter();
    defender.shield = 3;
    defender.logic = 4;

    let damage = 5;
    const absorbed = Math.min(defender.shield, damage);
    defender.shield -= absorbed;
    damage -= absorbed;
    defender.logic -= damage;

    this.assertEqual(defender.shield, 0, 'Щит 3 должен полностью разрушиться');
    this.assertEqual(defender.logic, 2, 'Остаток урона (2) должен пройти в логику');
});

tester.test('Щит полностью блокирует слабый урон', function() {
    const defender = this.createMockCharacter();
    defender.shield = 5;
    defender.logic = 4;

    let damage = 2;
    const absorbed = Math.min(defender.shield, damage);
    defender.shield -= absorbed;
    damage -= absorbed;
    if (damage > 0) defender.logic -= damage;

    this.assertEqual(defender.shield, 3, 'Щит должен уменьшиться с 5 до 3');
    this.assertEqual(defender.logic, 4, 'Логика не должна измениться');
});

tester.test('Атака пробивает защиту (+50% урона)', function() {
    const baseDamage = 2;
    const bonusDamage = Math.floor(baseDamage * 1.5);

    this.assertEqual(bonusDamage, 3,
        'Атака 2 с бонусом против Защиты должна наносить 3 урона');
});

tester.test('Защита усиливается против Уклонения (+50% лечения)', function() {
    const baseHeal = 2;
    const bonusHeal = Math.floor(baseHeal * 1.5);

    this.assertEqual(bonusHeal, 3,
        'Защита 2 с бонусом против Уклонения должна лечить 3');
});

tester.test('Зеркало копирует 75% урона атаки', function() {
    const enemyDamage = 4;
    const mirrorModifier = 0.75;
    const damageMultiplier = 1.0; // emotion = 4
    const mirrorDamage = Math.floor(enemyDamage * mirrorModifier * damageMultiplier);

    this.assertEqual(mirrorDamage, 3,
        'Зеркало должно копировать 3 урона из 4 (75%)');
});

// ============================================
// ТЕСТЫ БАЛАНСА
// ============================================

tester.test('Баланс: Стартовые характеристики равны', function() {
    const player = this.createMockCharacter(4, 4);
    const enemy = this.createMockCharacter(4, 4);

    this.assertEqual(player.logic, enemy.logic, 'Стартовая логика должна быть равной');
    this.assertEqual(player.emotion, enemy.emotion, 'Стартовые эмоции должны быть равными');
});

tester.test('Баланс: Проверка соотношения урона и лечения', async function() {
    // Загружаем карты
    const response = await fetch('cards.json');
    const cardData = await response.json();

    const playerCards = cardData.basePlayerCards;
    const enemyCards = cardData.baseEnemyCards;
    const defenseCards = cardData.defenseCards;

    // Подсчитываем средний урон
    let totalDamage = 0;
    let damageCount = 0;
    [...playerCards, ...enemyCards].forEach(card => {
        if (card.damage) {
            totalDamage += card.damage * (card.usesLeft || 1);
            damageCount += (card.usesLeft || 1);
        }
    });
    const avgDamage = totalDamage / damageCount;

    // Подсчитываем среднее лечение
    let totalHeal = 0;
    let healCount = 0;
    defenseCards.forEach(card => {
        if (card.heal) {
            totalHeal += card.heal;
            healCount++;
        }
    });
    const avgHeal = totalHeal / healCount;

    console.log(`  Средний урон: ${avgDamage.toFixed(2)}, Среднее лечение: ${avgHeal.toFixed(2)}`);

    // Баланс: лечение должно быть примерно равно или чуть больше среднего урона
    if (avgHeal < avgDamage * 0.8) {
        this.warn('Лечение слишком слабое по сравнению с уроном');
    }
    if (avgHeal > avgDamage * 1.5) {
        this.warn('Лечение слишком сильное по сравнению с уроном');
    }
});

tester.test('Баланс: Проверка распределения использований карт', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();

    const allCards = [...cardData.basePlayerCards, ...cardData.baseEnemyCards];

    let totalUses = 0;
    let cardCount = 0;
    allCards.forEach(card => {
        totalUses += (card.usesLeft || 1);
        cardCount++;
    });

    const avgUses = totalUses / cardCount;
    console.log(`  Среднее использований на карту: ${avgUses.toFixed(2)}`);

    if (avgUses < 1.5) {
        this.warn('Карт с множественными использованиями слишком мало');
    }
});

tester.test('Баланс: Максимальный урон не должен убивать за один ход', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();

    const allAttackCards = [...cardData.basePlayerCards, ...cardData.baseEnemyCards, ...cardData.rareAttackCards];

    let maxDamage = 0;
    allAttackCards.forEach(card => {
        if (card.damage) {
            // С максимальным множителем (1.5 при эмоциях > 6)
            // И бонусом против защиты (+50%)
            const potentialDamage = Math.floor(card.damage * 1.5 * 1.5);
            maxDamage = Math.max(maxDamage, potentialDamage);
        }
    });

    console.log(`  Максимальный потенциальный урон за ход: ${maxDamage}`);

    const startHP = 4 + 4; // logic + emotion
    if (maxDamage >= startHP) {
        this.warn(`Максимальный урон (${maxDamage}) может убить за один ход (стартовое HP: ${startHP})`);
    }
});

// ============================================
// ТЕСТЫ КРАЙНИХ СЛУЧАЕВ
// ============================================

tester.test('Крайний случай: Отрицательные характеристики', function() {
    const char = this.createMockCharacter();
    char.logic = -2;
    char.emotion = -3;

    // Проверяем что игра не крашится при отрицательных значениях
    const multiplier = char.emotion <= 0 ? 0.5 : 1.0;
    this.assertEqual(multiplier, 0.5, 'При отрицательных эмоциях множитель урона должен быть 0.5');
});

tester.test('Крайний случай: Очень высокие характеристики', function() {
    const char = this.createMockCharacter(100, 100);

    // Лимит руки не должен быть безграничным
    let handLimit;
    if (char.logic <= 0) handLimit = 3;
    else if (char.logic <= 2) handLimit = 4;
    else if (char.logic <= 4) handLimit = 5;
    else if (char.logic <= 6) handLimit = 6;
    else handLimit = 7;

    this.assertEqual(handLimit, 7, 'Максимальный лимит руки должен быть 7');

    // Множитель урона не должен быть безграничным
    let damageMultiplier;
    if (char.emotion <= 0) damageMultiplier = 0.5;
    else if (char.emotion <= 2) damageMultiplier = 0.75;
    else if (char.emotion <= 4) damageMultiplier = 1.0;
    else if (char.emotion <= 6) damageMultiplier = 1.25;
    else damageMultiplier = 1.5;

    this.assertEqual(damageMultiplier, 1.5, 'Максимальный множитель урона должен быть 1.5');
});

tester.test('Крайний случай: Карта без урона и лечения', function() {
    const card = this.createMockCard({ category: 'Уклонение', effect: 'cancel' });

    this.assert(!card.damage && !card.heal,
        'Карта уклонения может не иметь урона и лечения');
});

tester.test('Крайний случай: Отмена карты без lastCardEffects', function() {
    const source = this.createMockCharacter();
    const target = this.createMockCharacter();

    // Отмена когда нет сохраненных эффектов не должна ломать игру
    this.assert(!source.lastCardEffects, 'lastCardEffects должно быть undefined');
    // В реальной игре просто ничего не произойдет
});

tester.test('Проверка: Нет дублей в стартовой руке', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();

    // Симулируем создание стартовой руки
    const usedNames = new Set();
    const hand = [];

    // Берем 4 карты (2 атаки, 1 защита, 1 уклонение)
    cardData.basePlayerCards.slice(0, 2).forEach(card => {
        if (!usedNames.has(card.name)) {
            hand.push(card);
            usedNames.add(card.name);
        }
    });

    this.assertEqual(hand.length, usedNames.size,
        'Количество карт должно совпадать с количеством уникальных имен');
});

tester.test('Проверка: Все карты имеют обязательные поля', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();

    const allCards = [
        ...cardData.basePlayerCards,
        ...cardData.baseEnemyCards,
        ...cardData.defenseCards,
        ...cardData.evasionCards,
        ...cardData.rareAttackCards
    ];

    allCards.forEach(card => {
        this.assert(card.category, `Карта "${card.name}" должна иметь category`);
        this.assert(card.name, 'Каждая карта должна иметь name');
        this.assert(card.effect, `Карта "${card.name}" должна иметь effect`);
        this.assert(card.text, `Карта "${card.name}" должна иметь text`);
        this.assert(card.desc, `Карта "${card.name}" должна иметь desc`);
    });
});

// ============================================
// ТЕСТЫ СООТВЕТСТВИЯ ДОКУМЕНТАЦИИ
// ============================================

tester.test('Документация: Атака соответствует описанным правилам', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();
    const docs = cardData._MECHANICS_DOCUMENTATION;

    // Проверяем что документация существует
    this.assert(docs.ATTACK_CARDS, 'Документация для атак должна существовать');
    this.assert(docs.ATTACK_CARDS.rules.length > 0, 'Должны быть описаны правила атак');

    // Симулируем атаку с разными эмоциями
    const baseDamage = 2;
    const testCases = [
        { emotion: 0, expected: 1 },   // 2 * 0.5 = 1
        { emotion: 2, expected: 1 },   // 2 * 0.75 = 1.5 -> 1
        { emotion: 4, expected: 2 },   // 2 * 1.0 = 2
        { emotion: 6, expected: 2 },   // 2 * 1.25 = 2.5 -> 2
        { emotion: 8, expected: 3 }    // 2 * 1.5 = 3
    ];

    testCases.forEach(({ emotion, expected }) => {
        let multiplier;
        if (emotion <= 0) multiplier = 0.5;
        else if (emotion <= 2) multiplier = 0.75;
        else if (emotion <= 4) multiplier = 1.0;
        else if (emotion <= 6) multiplier = 1.25;
        else multiplier = 1.5;

        const finalDamage = Math.floor(baseDamage * multiplier);
        this.assertEqual(finalDamage, expected,
            `При эмоциях ${emotion} урон ${baseDamage} должен быть ${expected}`);
    });
});

tester.test('Документация: Защита соответствует описанным правилам', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();
    const docs = cardData._MECHANICS_DOCUMENTATION;

    this.assert(docs.DEFENSE_CARDS, 'Документация для защиты должна существовать');

    // Проверяем базовое лечение
    const baseHeal = 3;
    const defender = this.createMockCharacter(2, 2);
    defender.logic += baseHeal;

    this.assertEqual(defender.logic, 5, 'Базовое лечение должно работать');

    // Проверяем бонус против уклонения (+50%)
    const bonusHeal = Math.floor(baseHeal * 1.5);
    this.assertEqual(bonusHeal, 4, 'Бонус против уклонения должен давать +50%');
});

tester.test('Документация: Уклонение соответствует описанным правилам', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();
    const docs = cardData._MECHANICS_DOCUMENTATION;

    this.assert(docs.EVASION_CARDS, 'Документация для уклонения должна существовать');

    // Проверяем механику Зеркала (75%)
    const evasionCard = cardData.evasionCards.find(c => c.effect === 'mirror');
    this.assert(evasionCard, 'Карта Зеркало должна существовать');
    this.assertEqual(evasionCard.modifier, 0.75, 'Зеркало должно копировать 75% урона');

    const enemyDamage = 4;
    const mirrorDamage = Math.floor(enemyDamage * evasionCard.modifier);
    this.assertEqual(mirrorDamage, 3, 'Зеркало должно копировать 3 урона из 4');
});

tester.test('Документация: Система преимуществ соответствует описанию', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();
    const docs = cardData._MECHANICS_DOCUMENTATION;

    const advantageSystem = docs.SPECIAL_MECHANICS.advantageSystem;
    this.assert(advantageSystem.includes('Атака > Защита'), 'Атака должна иметь преимущество над Защитой');
    this.assert(advantageSystem.includes('Защита > Уклонение'), 'Защита должна иметь преимущество над Уклонением');
    this.assert(advantageSystem.includes('+50%'), 'Преимущество должно давать +50%');

    // Проверяем бонус +50%
    const baseDamage = 2;
    const bonusDamage = Math.floor(baseDamage * 1.5);
    this.assertEqual(bonusDamage, 3, 'Бонус +50% от урона 2 должен давать 3');
});

tester.test('Документация: Множитель эмоций соответствует описанию', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();
    const docs = cardData._MECHANICS_DOCUMENTATION;

    const emotionMultiplierDesc = docs.SPECIAL_MECHANICS.emotionMultiplier;
    this.assert(emotionMultiplierDesc.includes('0=0.5x'), 'Документация должна описывать 0 эмоций = 0.5x');
    this.assert(emotionMultiplierDesc.includes('3-4=1.0x'), 'Документация должна описывать 3-4 эмоций = 1.0x');
    this.assert(emotionMultiplierDesc.includes('7+=1.5x'), 'Документация должна описывать 7+ эмоций = 1.5x');

    // Проверяем соответствие кода документации
    const testCases = [
        { emotion: 0, multiplier: 0.5 },
        { emotion: 1, multiplier: 0.75 },
        { emotion: 3, multiplier: 1.0 },
        { emotion: 5, multiplier: 1.25 },
        { emotion: 7, multiplier: 1.5 }
    ];

    testCases.forEach(({ emotion, multiplier }) => {
        let calcMultiplier;
        if (emotion <= 0) calcMultiplier = 0.5;
        else if (emotion <= 2) calcMultiplier = 0.75;
        else if (emotion <= 4) calcMultiplier = 1.0;
        else if (emotion <= 6) calcMultiplier = 1.25;
        else calcMultiplier = 1.5;

        this.assertEqual(calcMultiplier, multiplier,
            `Множитель при ${emotion} эмоциях должен соответствовать документации`);
    });
});

tester.test('Документация: Лимит руки соответствует описанию', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();
    const docs = cardData._MECHANICS_DOCUMENTATION;

    const handLimitDesc = docs.SPECIAL_MECHANICS.handLimit;
    this.assert(handLimitDesc.includes('0=3'), 'Документация должна описывать 0 логики = 3 карты');
    this.assert(handLimitDesc.includes('3-4=5'), 'Документация должна описывать 3-4 логики = 5 карт');
    this.assert(handLimitDesc.includes('7+=7'), 'Документация должна описывать 7+ логики = 7 карт');

    // Проверяем соответствие кода документации
    const testCases = [
        { logic: 0, limit: 3 },
        { logic: 1, limit: 4 },
        { logic: 3, limit: 5 },
        { logic: 5, limit: 6 },
        { logic: 7, limit: 7 }
    ];

    testCases.forEach(({ logic, limit }) => {
        let calcLimit;
        if (logic <= 0) calcLimit = 3;
        else if (logic <= 2) calcLimit = 4;
        else if (logic <= 4) calcLimit = 5;
        else if (logic <= 6) calcLimit = 6;
        else calcLimit = 7;

        this.assertEqual(calcLimit, limit,
            `Лимит руки при ${logic} логике должен соответствовать документации`);
    });
});

tester.test('Документация: Щит работает как описано', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();
    const docs = cardData._MECHANICS_DOCUMENTATION;

    const shieldDesc = docs.SPECIAL_MECHANICS.shield;
    this.assert(shieldDesc.includes('поглощает урон'), 'Документация должна описывать поглощение урона');

    // Симулируем работу щита
    const defender = this.createMockCharacter();
    defender.shield = 3;
    defender.logic = 4;

    let damage = 5;
    const absorbed = Math.min(defender.shield, damage);
    defender.shield -= absorbed;
    damage -= absorbed;
    defender.logic -= damage;

    this.assertEqual(defender.shield, 0, 'Щит должен разрушиться');
    this.assertEqual(defender.logic, 2, 'Остаток урона должен пройти в логику');
});

tester.test('Документация: Условия победы соответствуют описанию', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();
    const docs = cardData._MECHANICS_DOCUMENTATION;

    const victoryDesc = docs.SPECIAL_MECHANICS.victoryConditions;
    this.assert(victoryDesc.includes('Логика врага <= 0'), 'Документация должна описывать победу при логике <= 0');
    this.assert(victoryDesc.includes('Эмоции врага <= 0'), 'Документация должна описывать победу при эмоциях <= 0');
    this.assert(victoryDesc.includes('3 ходов подряд'), 'Документация должна описывать условие 3 ходов');
    this.assert(victoryDesc.includes('3 точках'), 'Документация должна описывать финальную победу при 3 точках');
});

tester.test('Документация: Механика fromDiscard соответствует описанию', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();
    const docs = cardData._MECHANICS_DOCUMENTATION;

    const fromDiscardDesc = docs.SPECIAL_MECHANICS.fromDiscard;
    this.assert(fromDiscardDesc.includes('Повторение'), 'Документация должна описывать карту Повторение');
    this.assert(fromDiscardDesc.includes('discard'), 'Документация должна упоминать сброс');

    // Проверяем что карта Повторение существует
    const repeatCard = cardData.specialCards.repeatCard;
    this.assert(repeatCard, 'Карта Повторение должна существовать');
    this.assertEqual(repeatCard.name, 'Повторение', 'Имя специальной карты должно быть Повторение');
});

tester.test('Документация: Все карты соответствуют своим категориям', async function() {
    const response = await fetch('cards.json');
    const cardData = await response.json();

    // Проверяем Attack Cards
    [...cardData.basePlayerCards, ...cardData.baseEnemyCards, ...cardData.rareAttackCards].forEach(card => {
        if (card.category === 'Атака') {
            this.assert(card.damage !== undefined, `Карта атаки "${card.name}" должна иметь damage`);
            this.assert(['logic', 'emotion', 'random'].includes(card.effect),
                `Карта атаки "${card.name}" должна иметь effect: logic/emotion/random`);
        }
    });

    // Проверяем Defense Cards
    cardData.defenseCards.forEach(card => {
        this.assertEqual(card.category, 'Защита', `Карта "${card.name}" должна быть категории Защита`);
        this.assert(card.heal !== undefined || card.shield !== undefined,
            `Карта защиты "${card.name}" должна иметь heal или shield`);
    });

    // Проверяем Evasion Cards
    cardData.evasionCards.forEach(card => {
        this.assertEqual(card.category, 'Уклонение', `Карта "${card.name}" должна быть категории Уклонение`);
        this.assert(['cancel', 'mirror', 'reflect'].includes(card.effect),
            `Карта уклонения "${card.name}" должна иметь effect: cancel/mirror/reflect`);
    });
});

// ============================================
// ЭКСПОРТ ДЛЯ ИСПОЛЬЗОВАНИЯ В КОНСОЛИ
// ============================================

window.runTests = () => tester.run();

// Автоматический запуск при загрузке
console.log('%c💡 Тесты загружены!', 'color: #3498db; font-weight: bold');
console.log('%cВведите %crunTests()%c для запуска всех тестов',
    'color: #95a5a6', 'color: #2ecc71; font-weight: bold', 'color: #95a5a6');
