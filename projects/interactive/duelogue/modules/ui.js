// @ts-nocheck
// UI менеджер для ДУЕЛОГ
// Управляет интерфейсом игры

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

        // Обновить индикатор лимита руки и счетчик колоды
        if (gameEngine) {
            const handLimit = gameEngine.getHandLimit(player);
            const handInfo = document.getElementById('handInfo');
            if (handInfo) {
                const damageMultiplier = gameEngine.getDamageMultiplier(player);
                const multiplierText = damageMultiplier !== 1.0 ? ` | Урон: x${damageMultiplier.toFixed(2)}` : '';
                const deckCount = Array.isArray(player.deck) ? player.deck.length : 0;
                const discardCount = player.discardCount ?? 0;
                handInfo.textContent = `Рука: ${player.cards.length}/${handLimit} | Колода: ${deckCount} | Сброс: ${discardCount}${multiplierText}`;
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

    renderStats(player, enemy) {
        this.updateStats(player, enemy);
    }
}

console.log('✅ Модуль ui.js загружен');
