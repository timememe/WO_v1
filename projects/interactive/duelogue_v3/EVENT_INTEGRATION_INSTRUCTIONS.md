# Инструкции по интеграции EventManager

Файл `events.js` уже создан. Теперь нужно интегрировать его в игру.

## 1. Добавить скрипт в duelogue.html

Найдите секцию скриптов (перед `main.js`) и добавьте:

```html
<script src="modules/events.js"></script>
```

## 2. Добавить запись карт в engine.js

### В методе `playCard()` (строка ~131):

После строки:
```javascript
this.playerHasPlayedCard = true;
```

Добавьте:
```javascript
// Записываем карту для событий
if (this.eventManager) {
    this.currentTurnCards.player = card;
}
```

### В методе `enemyTurn()` (строка ~187):

После строки:
```javascript
let randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
```

Добавьте:
```javascript
// Записываем карту для событий
if (this.eventManager) {
    this.currentTurnCards.enemy = randomCard;
}
```

### После строки (строка ~212):
```javascript
this.checkPoints(this.enemy, this.player);
```

Добавьте:
```javascript
// Обрабатываем события
this.processEvents();
```

## 3. Добавить методы обработки событий в конец класса GameEngine

Перед последней закрывающей скобкой класса (перед строкой 506 `}`) добавьте два новых метода:

```javascript
    processEvents() {
        if (!this.eventManager) return;

        // Записываем ход в историю
        this.eventManager.recordTurn(this.currentTurnCards.player, this.currentTurnCards.enemy);

        // Проверяем события
        const event = this.eventManager.checkForEvents(this.player, this.enemy);

        if (event) {
            if (event.ended) {
                // Событие завершилось
                this.uiManager.addMessage(event.message, 'system');
            } else {
                // Новое событие или продолжение активного
                if (this.eventManager.activeEvent.duration === 0) {
                    // Только что началось
                    this.uiManager.addMessage(`⚡ СОБЫТИЕ: ${event.name}`, 'system');
                    this.uiManager.addMessage(event.message, 'system');
                }

                // Применяем эффекты события
                const effects = this.eventManager.applyEventEffects(this.player, this.enemy);
                if (effects && effects.message) {
                    this.applyEventEffectsToCharacters(effects);
                    this.uiManager.addMessage(effects.message, 'system');
                }
            }
        }

        // Сбрасываем карты хода
        this.currentTurnCards = { player: null, enemy: null };
    }

    applyEventEffectsToCharacters(effects) {
        // Применяем эффекты к игроку
        if (effects.player) {
            if (effects.player.logic) this.player.logic += effects.player.logic;
            if (effects.player.emotion) this.player.emotion += effects.player.emotion;
            if (effects.player.maxLogicPenalty) this.player.maxLogic += effects.player.maxLogicPenalty;
        }

        // Применяем эффекты к противнику
        if (effects.enemy) {
            if (effects.enemy.logic) this.enemy.logic += effects.enemy.logic;
            if (effects.enemy.emotion) this.enemy.emotion += effects.enemy.emotion;
            if (effects.enemy.maxLogicPenalty) this.enemy.maxLogic += effects.enemy.maxLogicPenalty;
        }

        // Обновляем статы после применения эффектов
        this.uiManager.updateStats(this.player, this.enemy);
    }
```

## 4. Проверка

После интеграции:
- Запустите игру
- Используйте 3+ раза подряд зеленые карты (Защита) обоими игроками → должно появиться событие "🧘 МЕДИТАЦИЯ"
- Используйте 4+ раза подряд красные карты (Атака) обоими игроками → должно появиться событие "🔥 ПЕРЕПАЛКА"
- Используйте 3+ раза подряд красные/желтые карты (Атака/Уклонение) обоими игроками → должно появиться событие "🧠 ИНТЕЛЛЕКТУАЛЬНЫЙ СПАРРИНГ"
- Доведите одного игрока до критического состояния с разрывом 6+ очков → должно появиться событие "⚡ ПЕРЕЛОМНЫЙ МОМЕНТ"

События будут отображаться в логе ходов с соответствующими эффектами!
