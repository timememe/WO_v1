// ============================================
// DUELOGUE v2 - MAIN ENTRY POINT
// ============================================
// Инициализация игры и связывание всех модулей

let gameEngine;
let uiManager;
let visualManager;
let narrativeGenerator;
let isProcessingTurn = false;

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Запуск DUELOGUE v2...');

    // Создаём менеджеры
    gameEngine = new GameEngine();
    uiManager = new UIManager();
    visualManager = new VisualManager();
    narrativeGenerator = new NarrativeGenerator();

    // Инициализируем игру
    initGame();
});

function initGame() {
    console.log('🎲 Инициализация игры...');

    // Запускаем движок
    gameEngine.initGame(playerCards, enemyCards);

    // Отрисовываем начальное состояние
    uiManager.updateScales(0, false);
    uiManager.updateZone('contested');
    uiManager.updateMomentum({ type: null, chain: 0, bonus: 0 });
    // uiManager.updateResources(gameEngine.player, gameEngine.enemy); // Удалено - нет ресурсов
    // uiManager.updateRound(1); // Удалено - нет раундов
    uiManager.clearDialog();

    // Отрисовываем карты игрока
    renderPlayerCards();

    // Визуальное состояние: IDLE
    visualManager.showIdle();

    // Добавляем приветственное сообщение
    uiManager.addMessage('Докажи свою правоту скептику!', false, 0);

    console.log('✅ Игра готова');
}

// ============================================
// ОТРИСОВКА КАРТ
// ============================================

function renderPlayerCards() {
    const availableCards = gameEngine.getAvailablePlayerCards();
    const lastEnemyTurn = gameEngine.getLastTurn(false);
    const lastEnemyCard = lastEnemyTurn ? lastEnemyTurn.card : null;

    // Отрисовываем карты
    uiManager.renderCards(
        gameEngine.playerDeck,
        gameEngine.usedPlayerCards,
        lastEnemyCard,
        gameEngine.player
    );

    // Добавляем обработчики кликов
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach((cardEl, index) => {
        const card = gameEngine.playerDeck[index];
        const isUsed = gameEngine.isCardUsed(card, true);

        if (!isUsed) {
            cardEl.style.cursor = 'pointer';
            cardEl.addEventListener('click', () => handlePlayerCardClick(card));
        }
    });
}

// ============================================
// ИГРОВОЙ ХОД
// ============================================

async function handlePlayerCardClick(card) {
    // Предотвращаем повторные клики
    if (isProcessingTurn || gameEngine.gameState !== 'playing') {
        return;
    }

    isProcessingTurn = true;

    try {
        // 1. Ход игрока
        await processPlayerTurn(card);

        // 2. Проверяем, не закончилась ли игра
        if (gameEngine.gameState !== 'playing') {
            endGame();
            return;
        }

        // 3. Ход противника
        await processEnemyTurn();

        // 4. Снова проверяем состояние игры
        if (gameEngine.gameState !== 'playing') {
            endGame();
            return;
        }

    } finally {
        isProcessingTurn = false;
    }
}

async function processPlayerTurn(card) {
    console.log(`\n👤 === ХОД ИГРОКА ===`);

    // Генерируем короткий текст для речевого пузыря
    const bubbleText = narrativeGenerator.generateSpeechBubble(card);
    await visualManager.showPlayerTurn(bubbleText);

    // Выполняем ход в движке
    const turnData = gameEngine.playCard(card, true);

    // Генерируем полный тезис для диалога
    const dialogText = narrativeGenerator.generateDialogue(turnData);
    uiManager.addMessage(dialogText, true, turnData.turn);

    // Обновляем визуальное состояние
    await uiManager.delay(300);
    uiManager.updateScales(turnData.finalScales, true);
    uiManager.updateZone(turnData.zone);
    uiManager.updateMomentum(gameEngine.momentum);
    // uiManager.updateResources(gameEngine.player, gameEngine.enemy); // Удалено - нет ресурсов
    // uiManager.updateRound(gameEngine.currentRound); // Удалено - нет раундов

    // Перерисовываем карты (чтобы показать использованную)
    renderPlayerCards();

    // Пауза перед ходом противника
    await uiManager.delay(800);

    // Возвращаемся в IDLE перед ходом противника
    await visualManager.showIdle();
}

async function processEnemyTurn() {
    console.log(`\n🤖 === ХОД ПРОТИВНИКА ===`);

    // Получаем карту от ИИ
    const enemyCard = gameEngine.getEnemyMove();

    if (!enemyCard) {
        console.warn('⚠️ Противник не может сделать ход');
        return;
    }

    // Небольшая пауза перед ходом противника (имитация "размышления")
    await uiManager.delay(500);

    // Генерируем короткий текст для речевого пузыря
    const bubbleText = narrativeGenerator.generateSpeechBubble(enemyCard);
    await visualManager.showEnemyTurn(bubbleText);

    // Выполняем ход в движке
    const turnData = gameEngine.playCard(enemyCard, false);

    // Генерируем полный тезис для диалога
    const dialogText = narrativeGenerator.generateDialogue(turnData);
    uiManager.addMessage(dialogText, false, turnData.turn);

    // Обновляем визуальное состояние
    await uiManager.delay(300);
    uiManager.updateScales(turnData.finalScales, true);
    uiManager.updateZone(turnData.zone);
    uiManager.updateMomentum(gameEngine.momentum);
    // uiManager.updateResources(gameEngine.player, gameEngine.enemy); // Удалено - нет ресурсов
    // uiManager.updateRound(gameEngine.currentRound); // Удалено - нет раундов

    // Перерисовываем карты игрока (показываем новые vulnerability индикаторы)
    renderPlayerCards();

    // Пауза перед следующим ходом игрока
    await uiManager.delay(800);

    // Возвращаемся в IDLE для хода игрока
    await visualManager.showIdle();
}

// ============================================
// ЗАВЕРШЕНИЕ ИГРЫ
// ============================================

function endGame() {
    const gameState = gameEngine.gameState;
    const reason = gameEngine.winReason || gameEngine.loseReason || 'unknown';

    console.log(`\n🏁 === ИГРА ОКОНЧЕНА ===`);
    console.log(`   Результат: ${gameState.toUpperCase()}`);
    console.log(`   Причина: ${reason}`);
    console.log(`   Финальные весы: ${gameEngine.scalesValue}`);
    console.log(`   Раунд: ${gameEngine.currentRound}`);
    console.log(`   Ходов сделано: ${gameEngine.currentTurn}`);
    console.log(`   Ресурсы игрока: ${gameEngine.player.logic}🧠 ${gameEngine.player.emotion}❤️`);
    console.log(`   Ресурсы скептика: ${gameEngine.enemy.logic}🧠 ${gameEngine.enemy.emotion}❤️`);

    // Показываем экран завершения
    setTimeout(() => {
        uiManager.showGameOver(gameState, reason);
    }, 1500);
}

// ============================================
// УТИЛИТЫ
// ============================================

// Обработка ошибок
window.addEventListener('error', (event) => {
    console.error('❌ Ошибка:', event.error);
});

console.log('✅ Модуль main_v2.js загружен');
