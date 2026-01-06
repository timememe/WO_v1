// @ts-nocheck
// UI менеджер для ДУЕЛОГ
// Управляет интерфейсом игры

class UIManager {
    constructor() {
        const elements = {
            dialog: 'dialog',
            cardDeck: 'cardDeck',
            playerLogicBar: 'playerLogicBar',
            playerEmotionBar: 'playerEmotionBar',
            enemyLogicBar: 'enemyLogicBar',
            enemyEmotionBar: 'enemyEmotionBar',
            playerLogicValue: 'playerLogicValue',
            playerEmotionValue: 'playerEmotionValue',
            enemyLogicValue: 'enemyLogicValue',
            enemyEmotionValue: 'enemyEmotionValue',
            scalesOverlay: 'scalesOverlay',
            scalesMarker: 'scalesMarker',
            scalesValue: 'scalesValue'
        };

        for (const [key, id] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`UI element with id '${id}' not found.`);
            }
            this[key] = element;
        }
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

        // Обновление индикаторов прорывов (точек)
        const playerDotsOverlay = document.getElementById('playerPointsOverlay').getElementsByClassName('dot');
        const enemyDotsOverlay = document.getElementById('enemyPointsOverlay').getElementsByClassName('dot');
        for (let i = 0; i < 3; i++) { // Предполагаем 3 прорыва для победы
            playerDotsOverlay[i].className = 'dot' + (i < player.breakthroughs ? ' active player' : '');
            enemyDotsOverlay[i].className = 'dot' + (i < enemy.breakthroughs ? ' active enemy' : '');
        }

        // Обновить индикаторы в плитках
        if (gameEngine) {
            const handLimit = gameEngine.getHandLimit(player);
            const handCount = document.getElementById('handCount');
            const deckCountEl = document.getElementById('deckCount');
            const discardCountEl = document.getElementById('discardCount');
            // damageMultiplierEl удален, так как getDamageMultiplier был удален из GameEngine

            if (handCount) {
                handCount.textContent = `${player.cards.length}/${handLimit}`;
            }
            if (deckCountEl) {
                const deckCount = Array.isArray(player.deck) ? player.deck.length : 0;
                deckCountEl.textContent = deckCount;
            }
            if (discardCountEl) {
                const discardCount = player.discardCount ?? 0;
                discardCountEl.textContent = discardCount;
            }
        }

        const discardButton = document.getElementById('discardButton');
        if (discardButton && gameEngine) {
            discardButton.disabled = !gameEngine.playerTurn || gameEngine.playerHasPlayedCard;
        }
    }

    renderCards(cards, isPlayerTurn, hasPlayedCard, playCardCallback) {
        this.cardDeck.innerHTML = '';
        cards.forEach(card => {
            let div = document.createElement('div');
            // Карта теперь не имеет свойства .used
            div.className = `card ${card.category}`; 
            
            // Определяем текст для статов карты
            let statsText = '';
            if (card.scalesShift !== undefined) {
                statsText = `Весы: ${card.scalesShift >= 0 ? '+' : ''}${card.scalesShift}`;
            } else {
                statsText = card.desc || 'Особый эффект';
            }

            // Добавляем отображение стоимости маны
            let costText = '';
            if (card.costLogic || card.costEmotion) {
                const logicCost = card.costLogic ? `Л:${card.costLogic}` : '';
                const emotionCost = card.costEmotion ? `Э:${card.costEmotion}` : '';
                costText = [logicCost, emotionCost].filter(Boolean).join(' ');
            }


            div.innerHTML = `
                <div class="card-title">${card.name}</div>
                <div class="card-desc">${card.desc}</div>
                <div class="card-category">${card.category}</div>
                <div class="card-stats">${statsText}</div>
                ${costText ? `<div class="card-cost">${costText}</div>` : ''}
            `;
            // Условие card.used удалено
            if (isPlayerTurn && !hasPlayedCard) {
                div.onclick = () => playCardCallback(card);
            }
            this.cardDeck.appendChild(div);
        });
    }

    setStatPanel(stats, logicBar, emotionBar, logicValueEl, emotionValueEl) {
        if (!stats) return;
        const logicMax = stats.maxLogic ?? 0;
        const emotionMax = stats.maxEmotion ?? 0;

        // Обновляем полоски маны
        if (logicBar) {
            const logicPercent = (logicMax > 0) ? Math.max(0, Math.min(1, (stats.logic ?? 0) / logicMax)) : 0;
            logicBar.style.width = `${logicPercent * 100}%`;
        }
        if (emotionBar) {
            const emotionPercent = (emotionMax > 0) ? Math.max(0, Math.min(1, (stats.emotion ?? 0) / emotionMax)) : 0;
            emotionBar.style.width = `${emotionPercent * 100}%`;
        }
        // Обновляем текстовые значения маны
        if (logicValueEl) {
            logicValueEl.textContent = `${Math.round(stats.logic ?? 0)}/${logicMax}`;
        }
        if (emotionValueEl) {
            emotionValueEl.textContent = `${Math.round(stats.emotion ?? 0)}/${emotionMax}`;
        }
    }

    renderTurnIndicator(isPlayerTurn) {
        // Можно добавить визуальный индикатор чей ход
        const turnIndicator = document.getElementById('turnIndicator');
        if (turnIndicator) {
            turnIndicator.textContent = isPlayerTurn ? 'Ваш ход' : 'Ход противника';
            turnIndicator.className = isPlayerTurn ? 'player-turn' : 'enemy-turn';
        }
    }

    updateScales(scalesValue) {
        // Обновляем значение весов (-10 до +10)
        if (this.scalesValue) {
            this.scalesValue.textContent = scalesValue > 0 ? `+${scalesValue}` : scalesValue;
        }

        // Обновляем позицию маркера (0% = -10, 50% = 0, 100% = +10)
        if (this.scalesMarker) {
            const percent = ((scalesValue + 10) / 20) * 100;
            this.scalesMarker.style.left = `${percent}%`;
        }

        // Видимость управляется через visualManager.updateOverlays()
    }

    renderStats(player, enemy) {
        this.updateStats(player, enemy);
    }
}

console.log('✅ Модуль ui.js загружен');
