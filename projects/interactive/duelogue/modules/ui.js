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

        const playerDotsOverlay = document.getElementById('playerPointsOverlay').getElementsByClassName('dot');
        const enemyDotsOverlay = document.getElementById('enemyPointsOverlay').getElementsByClassName('dot');
        for (let i = 0; i < 3; i++) {
            playerDotsOverlay[i].className = 'dot' + (i < player.points ? ' active player' : '');
            enemyDotsOverlay[i].className = 'dot' + (i < enemy.points ? ' active enemy' : '');
        }

        // Обновить индикаторы в плитках
        if (gameEngine) {
            const handLimit = gameEngine.getHandLimit(player);
            const handCount = document.getElementById('handCount');
            const deckCountEl = document.getElementById('deckCount');
            const discardCountEl = document.getElementById('discardCount');
            const damageMultiplierEl = document.getElementById('damageMultiplier');

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
            if (damageMultiplierEl) {
                const damageMultiplier = gameEngine.getDamageMultiplier(player);
                damageMultiplierEl.textContent = `x${damageMultiplier.toFixed(2)}`;
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
            div.className = `card ${card.category}` + (card.used ? ' used' : '');
            const usesBadge = card.usesLeft !== undefined ? `<div class="card-uses">${Math.max(0, card.usesLeft)}</div>` : '';

            // Определить функциональное название для уникальных карт
            let statsText = '';
            if (card.damage) {
                statsText = `-${card.damage} ${card.effect === 'random' ? 'рандом' : card.effect}`;
            } else if (card.heal) {
                statsText = `+${card.heal} ${card.effect}`;
            } else if (card.shield) {
                statsText = `Щит +${card.shield}`;
            } else if (card.effect === 'cancel') {
                statsText = 'Отменяет';
            } else if (card.effect === 'mirror') {
                statsText = 'Зеркало';
            } else if (card.effect === 'reflect') {
                statsText = 'Отражает';
            } else {
                statsText = card.effect || 'Особая';
            }

            div.innerHTML = `
                ${usesBadge}
                <div class="card-title">${card.name}</div>
                <div class="card-desc">${card.desc}</div>
                <div class="card-category">${card.category}</div>
                <div class="card-stats">${statsText}</div>
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
