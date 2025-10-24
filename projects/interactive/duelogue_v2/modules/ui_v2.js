// ============================================
// DUELOGUE v2 - UI MANAGER (SCALES SYSTEM)
// ============================================
// Управляет отображением весов, карт, диалогов и индикаторов

class UIManager {
    constructor() {
        // ========== DOM ЭЛЕМЕНТЫ ==========
        // Весы
        this.scalesMarker = document.getElementById('scalesMarker');
        this.scalesValue = document.getElementById('scalesValue');
        this.zoneIndicator = document.getElementById('zoneIndicator');

        // Momentum
        this.momentumIndicator = document.getElementById('momentumIndicator');
        this.momentumText = document.getElementById('momentumText');

        // Resources
        this.playerLogic = document.getElementById('playerLogic');
        this.playerEmotion = document.getElementById('playerEmotion');
        this.enemyLogic = document.getElementById('enemyLogic');
        this.enemyEmotion = document.getElementById('enemyEmotion');
        this.roundNumber = document.getElementById('roundNumber');

        // Карты
        this.cardDeck = document.getElementById('cardDeck');

        // Диалог
        this.dialog = document.getElementById('dialog');

        // ========== НАСТРОЙКИ АНИМАЦИИ ==========
        this.scalesAnimationDuration = 500; // ms
    }

    // ============================================
    // ОТРИСОВКА КАРТ
    // ============================================

    renderCards(cards, usedCards, lastEnemyCard = null, playerResources = null) {
        this.cardDeck.innerHTML = '';

        cards.forEach(card => {
            const cardElement = this.createCardElement(card, usedCards, lastEnemyCard, playerResources);
            this.cardDeck.appendChild(cardElement);
        });
    }

    createCardElement(card, usedCards, lastEnemyCard, playerResources) {
        const cardDiv = document.createElement('div');
        const isUsed = usedCards.includes(card);

        // Проверяем, можем ли позволить себе эту карту
        const canAfford = !playerResources || this.canAffordCard(card, playerResources);

        // Базовые классы
        cardDiv.className = `card ${card.category}`;
        if (isUsed) {
            cardDiv.classList.add('used');
        }
        if (!canAfford && !isUsed) {
            cardDiv.classList.add('unaffordable');
        }

        // Проверяем vulnerability: покажет ли эта карта counter-shift?
        const hasVulnerability = lastEnemyCard &&
                                 lastEnemyCard.vulnerability === card.type &&
                                 !isUsed && canAfford;

        // Структура карты
        cardDiv.innerHTML = `
            <div class="card-category">${card.category}</div>
            <div class="card-title">${card.title}</div>
            <div class="card-desc">${card.description}</div>
            <div class="card-stats">Сдвиг: ${card.shift > 0 ? '+' : ''}${card.shift}</div>
        `;

        // Добавляем индикатор vulnerability
        if (hasVulnerability) {
            const vulnIndicator = document.createElement('div');
            vulnIndicator.className = 'vulnerability-indicator';
            vulnIndicator.innerHTML = '💡';
            vulnIndicator.title = 'Эта карта эксплуатирует уязвимость противника!';
            cardDiv.appendChild(vulnIndicator);
        }

        return cardDiv;
    }

    // ============================================
    // ОБНОВЛЕНИЕ ВЕСОВ
    // ============================================

    updateScales(value, animated = true) {
        // Обновляем текстовое значение
        this.scalesValue.textContent = value > 0 ? `+${value}` : value;

        // Позиция маркера: -10 = 0%, 0 = 50%, +10 = 100%
        const percentage = ((value - (-10)) / 20) * 100;

        if (animated) {
            // Плавная анимация через transition (задано в CSS)
            this.scalesMarker.style.left = `${percentage}%`;
        } else {
            // Мгновенная установка
            this.scalesMarker.style.transition = 'none';
            this.scalesMarker.style.left = `${percentage}%`;
            // Восстанавливаем transition для следующих анимаций
            setTimeout(() => {
                this.scalesMarker.style.transition = '';
            }, 10);
        }
    }

    // ============================================
    // ОБНОВЛЕНИЕ ЗОНЫ
    // ============================================

    updateZone(zone) {
        // Убираем все классы зон
        this.zoneIndicator.className = 'zone-indicator';

        // Устанавливаем текст и класс в зависимости от зоны
        switch(zone) {
            case 'critical-win':
                this.zoneIndicator.classList.add('zone-critical-win');
                this.zoneIndicator.textContent = 'КРИТИЧЕСКОЕ ПРЕИМУЩЕСТВО';
                break;
            case 'winning':
                this.zoneIndicator.classList.add('zone-winning');
                this.zoneIndicator.textContent = 'ПРЕИМУЩЕСТВО';
                break;
            case 'contested':
                this.zoneIndicator.classList.add('zone-contested');
                this.zoneIndicator.textContent = 'РАВНЫЙ БОЙ';
                break;
            case 'losing':
                this.zoneIndicator.classList.add('zone-losing');
                this.zoneIndicator.textContent = 'ОТСТАВАНИЕ';
                break;
            case 'critical-lose':
                this.zoneIndicator.classList.add('zone-critical-lose');
                this.zoneIndicator.textContent = 'КРИТИЧЕСКОЕ ОТСТАВАНИЕ';
                break;
            default:
                this.zoneIndicator.classList.add('zone-contested');
                this.zoneIndicator.textContent = 'РАВНЫЙ БОЙ';
        }
    }

    // ============================================
    // MOMENTUM ИНДИКАТОР
    // ============================================

    updateMomentum(momentum) {
        if (momentum.chain > 1) {
            // Показываем индикатор
            this.momentumIndicator.classList.add('active');

            // Форматируем текст
            const typeText = momentum.type === CardType.LOGIC ? 'Логика' : 'Эмоции';
            const multiplier = momentum.chain;
            this.momentumText.textContent = `${typeText} x${multiplier} (+${momentum.bonus})`;
        } else {
            // Скрываем индикатор
            this.momentumIndicator.classList.remove('active');
        }
    }

    // ============================================
    // РЕСУРСЫ И РАУНДЫ
    // ============================================

    updateResources(player, enemy) {
        this.playerLogic.textContent = player.logic;
        this.playerEmotion.textContent = player.emotion;
        this.enemyLogic.textContent = enemy.logic;
        this.enemyEmotion.textContent = enemy.emotion;

        // Подсветка низких ресурсов
        this.playerLogic.style.color = player.logic <= 2 ? '#e74c3c' : '#fff';
        this.playerEmotion.style.color = player.emotion <= 2 ? '#e74c3c' : '#fff';
        this.enemyLogic.style.color = enemy.logic <= 2 ? '#e74c3c' : '#fff';
        this.enemyEmotion.style.color = enemy.emotion <= 2 ? '#e74c3c' : '#fff';
    }

    updateRound(roundNumber) {
        this.roundNumber.textContent = roundNumber;
    }

    // ============================================
    // ДИАЛОГ
    // ============================================

    addMessage(text, isPlayer, turnNumber) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isPlayer ? 'player' : 'enemy'}`;

        const turnLabel = document.createElement('div');
        turnLabel.className = 'turn';
        turnLabel.textContent = `Ход ${turnNumber}`;

        const textContent = document.createElement('div');
        textContent.textContent = text;

        messageDiv.appendChild(turnLabel);
        messageDiv.appendChild(textContent);
        this.dialog.appendChild(messageDiv);

        // Автоскролл вниз
        this.dialog.scrollTop = this.dialog.scrollHeight;
    }

    clearDialog() {
        this.dialog.innerHTML = '';
    }

    // ============================================
    // ЭКРАН ПОБЕДЫ/ПОРАЖЕНИЯ
    // ============================================

    showGameOver(gameState, reason) {
        const isDraw = gameState === 'draw';
        const won = gameState === 'won';

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: #fff;
            font-family: 'Press Start 2P', cursive;
            text-align: center;
            padding: 20px;
        `;

        const title = document.createElement('h1');
        title.style.cssText = `
            font-size: clamp(18px, 5vw, 32px);
            margin-bottom: 20px;
            color: ${isDraw ? '#f39c12' : (won ? '#3498db' : '#e74c3c')};
        `;
        title.textContent = isDraw ? 'НИЧЬЯ!' : (won ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ!');

        const subtitle = document.createElement('p');
        subtitle.style.cssText = `
            font-size: clamp(10px, 2.5vw, 14px);
            margin-bottom: 30px;
            color: #aaa;
            line-height: 1.5;
        `;

        // Разные сообщения в зависимости от причины окончания
        if (isDraw) {
            subtitle.textContent = 'Никто не смог одержать верх в споре.';
        } else if (won) {
            switch(reason) {
                case 'scales':
                    subtitle.textContent = 'Ты убедил скептика в своей правоте!';
                    break;
                case 'resources':
                    subtitle.textContent = 'Аргументы скептика иссякли!';
                    break;
                case 'resources_tie':
                    subtitle.textContent = 'Оба истощены, но ты удержал преимущество!';
                    break;
                case 'rounds':
                    subtitle.textContent = 'Время вышло. Ты завершил дебаты с преимуществом!';
                    break;
                case 'no_moves':
                    subtitle.textContent = 'Дебаты зашли в тупик. Победа за тобой!';
                    break;
                default:
                    subtitle.textContent = 'Ты одержал победу в споре!';
            }
        } else {
            switch(reason) {
                case 'scales':
                    subtitle.textContent = 'Скептик одержал верх в споре.';
                    break;
                case 'resources':
                    subtitle.textContent = 'Твои аргументы иссякли!';
                    break;
                case 'resources_tie':
                    subtitle.textContent = 'Оба истощены, но скептик удержал преимущество.';
                    break;
                case 'rounds':
                    subtitle.textContent = 'Время вышло. Скептик завершил дебаты с преимуществом.';
                    break;
                case 'no_moves':
                    subtitle.textContent = 'Дебаты зашли в тупик. Победа за скептиком.';
                    break;
                default:
                    subtitle.textContent = 'Скептик одержал победу.';
            }
        }

        const restartBtn = document.createElement('button');
        restartBtn.style.cssText = `
            padding: 12px 24px;
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            border: 2px solid #2980b9;
            border-radius: 8px;
            color: #fff;
            font-family: 'Press Start 2P', cursive;
            font-size: clamp(8px, 2vw, 12px);
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        restartBtn.textContent = 'Начать заново';
        restartBtn.onmouseover = () => {
            restartBtn.style.transform = 'translateY(-2px)';
            restartBtn.style.boxShadow = '0 6px 12px rgba(52, 152, 219, 0.4)';
        };
        restartBtn.onmouseout = () => {
            restartBtn.style.transform = '';
            restartBtn.style.boxShadow = '';
        };
        restartBtn.onclick = () => {
            location.reload();
        };

        overlay.appendChild(title);
        overlay.appendChild(subtitle);
        overlay.appendChild(restartBtn);
        document.body.appendChild(overlay);
    }

    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ============================================

    canAffordCard(card, resources) {
        // Проверяем, хватает ли ресурсов
        if (card.type === CardType.LOGIC) {
            return resources.logic >= 1;
        } else if (card.type === CardType.EMOTION) {
            return resources.emotion >= 1;
        }
        return true; // Нейтральные карты бесплатны
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

console.log('✅ Модуль ui_v2.js загружен');
