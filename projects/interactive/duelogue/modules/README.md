# Модульная архитектура ДУЕЛОГ

Игровой движок разделен на отдельные модули для упрощения разработки и поддержки.

## Структура модулей

```
modules/
├── cards.js    - CardManager (управление картами)
├── engine.js   - GameEngine (игровая логика)
├── ui.js       - UIManager (интерфейс)
└── visual.js   - VisualManager (визуальные эффекты)

main.js         - Точка входа и интеграция модулей
multiplayer.js  - MultiplayerManager (сетевая игра)
```

## Описание модулей

### cards.js - Менеджер карт
**Класс:** `CardManager`

**Отвечает за:**
- Загрузку карт из JSON
- Генерацию начальных рук
- Выбор карт по весам персонажа
- Получение уникальных карт
- Получение контр-карт

**Основные методы:**
- `loadCards(path)` - загрузить карты из файла
- `getInitialPlayerCards(player)` - стартовая рука игрока
- `getCounterCard(lastCard, character)` - получить контр-карту
- `getWeightedCard(character, pool)` - карта по весам персонажа

### engine.js - Игровой движок
**Класс:** `GameEngine`

**Отвечает за:**
- Основную игровую логику
- Применение эффектов карт
- Проверку условий победы
- Управление ходами
- Начисление очков

**Основные методы:**
- `startGame()` - запустить игру
- `applyCard(card, source, target)` - применить карту
- `playCard(card)` - ход игрока
- `enemyTurn()` - ход противника
- `checkVictory()` - проверка победы

### ui.js - UI менеджер
**Класс:** `UIManager`

**Отвечает за:**
- Отображение статов
- Рендеринг карт
- Добавление сообщений в диалог
- Обновление индикаторов

**Основные методы:**
- `updateStats(player, enemy)` - обновить статы
- `renderCards(cards, isPlayerTurn, hasPlayedCard, callback)` - отрисовать карты
- `addMessage(text, sender, turn)` - добавить сообщение

### visual.js - Визуальный менеджер
**Класс:** `VisualManager`

**Отвечает за:**
- Управление анимациями
- Показ речевых пузырей
- Переключение визуалов (idle/player/enemy)
- Эффект печатающегося текста

**Основные методы:**
- `setVisual(state, text)` - установить визуал
- `showSpeech(text, who)` - показать речь персонажа
- `cancelSpeech()` - отменить текущую анимацию

## Интеграция

Все модули объединяются в `main.js`, который является точкой входа:

```javascript
// Инициализация
cardManager = new CardManager();
await cardManager.loadCards('cards.json');

uiManager = new UIManager();
visualManager = new VisualManager();

// Создание движка
gameEngine = new GameEngine(cardManager, uiManager, visualManager);
await gameEngine.startGame();
```

## Преимущества модульной архитектуры

1. **Разделение ответственности** - каждый модуль решает свою задачу
2. **Упрощенная разработка** - легко найти нужный код
3. **Простота тестирования** - можно тестировать модули отдельно
4. **Переиспользование** - модули можно использовать в других проектах
5. **Масштабируемость** - легко добавлять новые модули

## Порядок загрузки скриптов

Важно загружать модули в правильном порядке:

```html
<!-- 1. Базовые модули -->
<script src="modules/cards.js"></script>
<script src="modules/visual.js"></script>
<script src="modules/ui.js"></script>

<!-- 2. Игровой движок (зависит от базовых) -->
<script src="modules/engine.js"></script>

<!-- 3. Мультиплеер -->
<script src="multiplayer.js"></script>

<!-- 4. Точка входа (зависит от всех) -->
<script src="main.js"></script>
```

## Дальнейшие улучшения

Возможные направления развития:

- Вынести логирование в отдельный модуль `logger.js`
- Создать модуль `audio.js` для звуков
- Добавить модуль `ai.js` для улучшенного ИИ противника
- Создать модуль `analytics.js` для сбора статистики
