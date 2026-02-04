/**
 * CharacterAI - система искусственного интеллекта для персонажа
 * Симулирует жизнь персонажа в стиле тамагочи
 * Адаптирован под свободное движение (free movement controller)
 */

// Ключ для localStorage
const STORAGE_KEY = 'tamagotchi_state';

export class CharacterAI {
  constructor(scene) {
    this.scene = scene; // Ссылка на IsometricScene

    // ═══════════════════════════════════════════════════════════════
    // СИСТЕМА ВРЕМЕНИ
    // ═══════════════════════════════════════════════════════════════
    // Игровое время: 1 реальная секунда = 1 игровая минута
    // 1 игровой день = 24 игровых часа = 24 * 60 = 1440 реальных секунд = 24 минуты
    this.timeScale = 1;              // Множитель скорости времени (1 = нормально)
    this.gameMinute = 0;             // Текущая минута (0-59)
    this.gameHour = 8;               // Текущий час (0-23), старт в 8 утра
    this.gameDay = 1;                // Текущий день
    this.totalGameMinutes = 0;       // Всего прошло игровых минут (для статистики)

    // Периоды суток
    this.timeOfDay = 'morning';      // morning (6-12), afternoon (12-18), evening (18-22), night (22-6)

    // Таймер для обновления времени
    this.timeAccumulator = 0;        // Накопитель времени (мс)
    this.msPerGameMinute = 1000;     // Сколько мс = 1 игровая минута

    // Потребности персонажа (0-100)
    this.needs = {
      energy: 100,      // Энергия (уменьшается со временем, восстанавливается отдыхом)
      hunger: 100,      // Сытость (уменьшается со временем, восстанавливается едой)
      fun: 100,         // Развлечение (уменьшается со временем, восстанавливается играми)
      social: 100,      // Социализация (уменьшается со временем, восстанавливается общением)
    };

    // Базовая скорость уменьшения потребностей (единиц в секунду)
    // Модифицируется временем суток
    this.baseNeedsDecayRate = {
      energy: 0.5,
      hunger: 0.3,
      fun: 0.4,
      social: 0.2,
    };

    // Активная скорость (модифицируется временем суток)
    this.needsDecayRate = { ...this.baseNeedsDecayRate };

    // Текущее состояние персонажа
    this.currentState = 'idle'; // idle, walking, performing_action, speaking

    // Текущая цель (локация)
    this.currentGoal = null;

    // ═══════════════════════════════════════════════════════════════
    // СИСТЕМА ДИАЛОГОВ (МОНОЛОГОВ)
    // ═══════════════════════════════════════════════════════════════
    this.speakingTimer = 0;           // Таймер для завершения речи
    this.speakingDuration = 0;        // Длительность показа текста после печати
    this.lastSpeakCheck = 0;          // Время последней проверки на речь
    this.speakCheckInterval = 3000;   // Интервал проверки (мс)
    this.speakChance = 0.3;          // Шанс начать говорить (15%)
    this.typingSpeed = 50;            // Скорость печати (мс на символ)
    this.currentPhrase = '';          // Текущая фраза
    this.displayedText = '';          // Отображаемый текст (для анимации)
    this.typingIndex = 0;             // Индекс текущего символа
    this.isTyping = false;            // Флаг: идёт ли анимация печати
    this.pauseAfterTyping = 2000;     // Пауза после завершения печати (мс)

    // Фразы для случайных высказываний (зависят от времени суток)
    this.phrasesByTimeOfDay = {
      morning: [
        "Доброе утро, мир!",
        "Новый день — новые возможности",
        "Кофе! Срочно нужен кофе!",
        "Какой план на сегодня?",
        "Солнце встаёт, пора и мне",
        "День ${day}... Интересно, что он принесёт",
        "Утро вечера мудренее",
        "Что бы такого сделать сегодня?",
      ],
      afternoon: [
        "День в самом разгаре!",
        "Пора бы перекусить...",
        "Работа не волк... работа это ворк",
        "Уже день ${day}, а столько ещё не сделано",
        "Сегодня отличный день!",
        "Эх, жизнь прекрасна!",
        "Пора бы заняться делом",
        "Время летит незаметно",
        "Нужно больше кофе",
      ],
      evening: [
        "Вечереет...",
        "День был продуктивным",
        "Скоро пора отдыхать",
        "Закат красивый сегодня",
        "Может, прогуляться перед сном?",
        "День ${day} подходит к концу",
        "Интересно, что будет завтра?",
        "Вечерний воздух... Хорошо!",
      ],
      night: [
        "Уже ночь... Пора спать",
        "Звёзды красивые...",
        "Ночь — время для размышлений",
        "Я пиксельный человек в пиксельном мире",
        "Я запер сам себя в бесконечном цикле.",
        "Есть ли клетка внутри клетки?",
        "Ночь ${day}... Тишина",
        "Сны ждут меня",
        "Кажется, пора отдохнуть",
      ],
    };

    // Общие фразы (для любого времени)
    this.generalPhrases = [
      "Что бы такого сделать?",
      "О чём я думал?",
      "А вот это мысль!",
      "Интересно, что там нового?",
    ];

    // Целевая позиция для движения (float координаты)
    this.targetX = null;
    this.targetY = null;

    // Путь (массив waypoints) и текущий индекс
    this.currentPath = [];
    this.currentPathIndex = 0;

    // Entry tile текущей цели (разрешён для входа)
    this.entryTile = null;

    // Позиция где произошла коллизия (для спавна после действия)
    this.collisionPosition = null;

    // Таймер для действий
    this.actionTimer = 0;
    this.actionDuration = 0;

    // Локации для различных активностей берём из сцены
    // Координаты указывают на начальный тайл объекта (левый верхний в grid)
    this.locations = this.scene.buildingLocations || {};

    // Расписание активностей (приоритеты)
    this.schedule = [
      { activity: 'work', priority: 70, duration: 5000 },
      { activity: 'rest', priority: 50, duration: 3000 },
      { activity: 'eat', priority: 60, duration: 2000 },
      { activity: 'play', priority: 40, duration: 4000 },
      { activity: 'socialize', priority: 30, duration: 3000 },
    ];

    // Таймеры
    this.updateInterval = null;
    this.movementTickerFn = null;
  }

  // Запуск AI
  start() {
    // Сначала останавливаем предыдущие таймеры (защита от дублирования)
    this.stop();

    // Загружаем сохранённое состояние
    this.loadState();

    // Сбрасываем состояние для чистого старта
    this.currentState = 'idle';
    this.currentGoal = null;
    this.currentActivity = null;
    this.targetX = null;
    this.targetY = null;
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.entryTile = null;
    this.lastSpeakCheck = Date.now(); // Даём время до первой проверки речи
    this.lastUpdateTime = Date.now(); // Для deltaTime

    // Обновляем потребности и время каждую секунду
    this.updateInterval = setInterval(() => {
      this.updateNeeds();
      this.updateActionTimer();
      this.updateGameTime(1000); // Передаём 1000 мс
      // Автосохранение каждые 10 секунд (не каждую секунду)
      this.saveCounter = (this.saveCounter || 0) + 1;
      if (this.saveCounter >= 10) {
        this.saveCounter = 0;
        this.saveState();
      }
    }, 1000);

    // Запускаем ticker для движения
    this.movementTickerFn = () => this.updateMovement();
    this.scene.app.ticker.add(this.movementTickerFn);

    // Обновляем время суток и модификаторы
    this.updateTimeOfDay();

    // Начинаем с выбора действия
    this.decideNextAction();

    console.log(`AI started: Day ${this.gameDay}, ${this.gameHour}:${this.gameMinute.toString().padStart(2, '0')} (${this.timeOfDay})`);
  }

  // Остановка AI
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.movementTickerFn) {
      this.scene.app.ticker.remove(this.movementTickerFn);
      this.movementTickerFn = null;
    }
    // Сохраняем состояние при остановке
    this.saveState();
  }

  // ═══════════════════════════════════════════════════════════════
  // СИСТЕМА ВРЕМЕНИ
  // ═══════════════════════════════════════════════════════════════

  // Обновление игрового времени
  updateGameTime(deltaMs) {
    this.timeAccumulator += deltaMs * this.timeScale;

    // Каждые msPerGameMinute проходит 1 игровая минута
    while (this.timeAccumulator >= this.msPerGameMinute) {
      this.timeAccumulator -= this.msPerGameMinute;
      this.advanceGameMinute();
    }
  }

  // Продвинуть время на 1 игровую минуту
  advanceGameMinute() {
    this.gameMinute++;
    this.totalGameMinutes++;

    if (this.gameMinute >= 60) {
      this.gameMinute = 0;
      this.gameHour++;

      if (this.gameHour >= 24) {
        this.gameHour = 0;
        this.gameDay++;
        this.onNewDay();
      }

      // Обновляем время суток при смене часа
      this.updateTimeOfDay();
    }
  }

  // Определить время суток по текущему часу
  updateTimeOfDay() {
    const hour = this.gameHour;
    let newTimeOfDay;

    if (hour >= 6 && hour < 12) {
      newTimeOfDay = 'morning';
    } else if (hour >= 12 && hour < 18) {
      newTimeOfDay = 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      newTimeOfDay = 'evening';
    } else {
      newTimeOfDay = 'night';
    }

    // Если время суток изменилось
    if (newTimeOfDay !== this.timeOfDay) {
      this.timeOfDay = newTimeOfDay;
      this.onTimeOfDayChanged();
    }
  }

  // Вызывается при смене времени суток
  onTimeOfDayChanged() {
    console.log(`Time of day changed to: ${this.timeOfDay}`);

    // Обновляем скорость расхода потребностей в зависимости от времени
    switch (this.timeOfDay) {
      case 'morning':
        // Утро: умеренный расход, быстрее голод
        this.needsDecayRate = {
          energy: this.baseNeedsDecayRate.energy * 0.8,
          hunger: this.baseNeedsDecayRate.hunger * 1.2,
          fun: this.baseNeedsDecayRate.fun * 1.0,
          social: this.baseNeedsDecayRate.social * 1.0,
        };
        break;
      case 'afternoon':
        // День: нормальный расход
        this.needsDecayRate = { ...this.baseNeedsDecayRate };
        break;
      case 'evening':
        // Вечер: быстрее устаёт, хочется общения
        this.needsDecayRate = {
          energy: this.baseNeedsDecayRate.energy * 1.3,
          hunger: this.baseNeedsDecayRate.hunger * 0.8,
          fun: this.baseNeedsDecayRate.fun * 1.2,
          social: this.baseNeedsDecayRate.social * 1.5,
        };
        break;
      case 'night':
        // Ночь: сильно устаёт, меньше хочется есть
        this.needsDecayRate = {
          energy: this.baseNeedsDecayRate.energy * 2.0,
          hunger: this.baseNeedsDecayRate.hunger * 0.5,
          fun: this.baseNeedsDecayRate.fun * 0.7,
          social: this.baseNeedsDecayRate.social * 0.5,
        };
        break;
    }
  }

  // Вызывается при наступлении нового дня
  onNewDay() {
    console.log(`🌅 New day! Day ${this.gameDay}`);

    // Небольшой бонус к потребностям при наступлении нового дня
    this.needs.energy = Math.min(100, this.needs.energy + 10);
    this.needs.fun = Math.min(100, this.needs.fun + 5);
  }

  // Получить случайную фразу для текущего времени суток
  getRandomPhrase() {
    // 70% шанс фразы по времени суток, 30% общая фраза
    const useTimePhrase = Math.random() < 0.7;

    let phrases;
    if (useTimePhrase && this.phrasesByTimeOfDay[this.timeOfDay]) {
      phrases = this.phrasesByTimeOfDay[this.timeOfDay];
    } else {
      phrases = this.generalPhrases;
    }

    // Выбираем случайную фразу
    let phrase = phrases[Math.floor(Math.random() * phrases.length)];

    // Заменяем плейсхолдеры
    phrase = phrase.replace('${day}', this.gameDay.toString());

    return phrase;
  }

  // Форматировать текущее время для отображения
  getFormattedTime() {
    const hour = this.gameHour.toString().padStart(2, '0');
    const minute = this.gameMinute.toString().padStart(2, '0');
    return `${hour}:${minute}`;
  }

  // Получить название времени суток на русском
  getTimeOfDayName() {
    const names = {
      morning: 'Утро',
      afternoon: 'День',
      evening: 'Вечер',
      night: 'Ночь',
    };
    return names[this.timeOfDay] || this.timeOfDay;
  }

  // ═══════════════════════════════════════════════════════════════
  // СОХРАНЕНИЕ / ЗАГРУЗКА СОСТОЯНИЯ
  // ═══════════════════════════════════════════════════════════════

  // Сохранить состояние в localStorage
  saveState() {
    try {
      const state = {
        // Время
        gameMinute: this.gameMinute,
        gameHour: this.gameHour,
        gameDay: this.gameDay,
        totalGameMinutes: this.totalGameMinutes,
        // Потребности
        needs: { ...this.needs },
        // Метаданные
        lastSaveTime: Date.now(),
        version: 1,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  // Загрузить состояние из localStorage
  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        console.log('No saved state found, starting fresh');
        return;
      }

      const state = JSON.parse(saved);

      // Проверяем версию
      if (state.version !== 1) {
        console.log('Incompatible save version, starting fresh');
        return;
      }

      // Восстанавливаем время
      this.gameMinute = state.gameMinute ?? 0;
      this.gameHour = state.gameHour ?? 8;
      this.gameDay = state.gameDay ?? 1;
      this.totalGameMinutes = state.totalGameMinutes ?? 0;

      // Восстанавливаем потребности
      if (state.needs) {
        this.needs = {
          energy: state.needs.energy ?? 100,
          hunger: state.needs.hunger ?? 100,
          fun: state.needs.fun ?? 100,
          social: state.needs.social ?? 100,
        };
      }

      // Вычисляем сколько времени прошло с последнего сохранения
      if (state.lastSaveTime) {
        const timePassed = Date.now() - state.lastSaveTime;
        const minutesPassed = Math.floor(timePassed / this.msPerGameMinute);

        // Если прошло не слишком много времени (меньше 1 реального часа),
        // симулируем прошедшее время
        if (minutesPassed > 0 && minutesPassed < 60) {
          console.log(`Simulating ${minutesPassed} game minutes that passed while away`);
          this.simulateTimePassed(minutesPassed);
        } else if (minutesPassed >= 60) {
          // Если прошло много времени - просто уменьшаем потребности
          console.log(`Too much time passed (${minutesPassed} min), applying penalty`);
          this.needs.energy = Math.max(20, this.needs.energy - 30);
          this.needs.hunger = Math.max(20, this.needs.hunger - 30);
          this.needs.fun = Math.max(20, this.needs.fun - 20);
          this.needs.social = Math.max(20, this.needs.social - 20);
        }
      }

      console.log(`State loaded: Day ${this.gameDay}, ${this.getFormattedTime()}`);
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
  }

  // Симулировать прошедшее время (упрощённо)
  simulateTimePassed(minutes) {
    for (let i = 0; i < minutes; i++) {
      // Уменьшаем потребности
      for (const need in this.needs) {
        this.needs[need] = Math.max(0, this.needs[need] - this.needsDecayRate[need] * 0.5);
      }
      // Продвигаем время
      this.advanceGameMinute();
    }
  }

  // Сбросить сохранение (для отладки)
  resetState() {
    localStorage.removeItem(STORAGE_KEY);
    this.gameMinute = 0;
    this.gameHour = 8;
    this.gameDay = 1;
    this.totalGameMinutes = 0;
    this.needs = { energy: 100, hunger: 100, fun: 100, social: 100 };
    this.updateTimeOfDay();
    console.log('State reset to defaults');
  }

  // Обновление потребностей
  updateNeeds() {
    for (const need in this.needs) {
      this.needs[need] = Math.max(0, this.needs[need] - this.needsDecayRate[need]);
    }
  }

  // Обновление таймера действия
  updateActionTimer() {
    if (this.currentState === 'performing_action' && this.actionTimer > 0) {
      this.actionTimer -= 1000;
      if (this.actionTimer <= 0) {
        this.completeAction();
      }
    }
  }

  // Главный цикл движения (вызывается каждый кадр)
  updateMovement() {
    // Защита от вызова на уничтоженной сцене
    if (!this.scene || this.scene.isDestroyed) {
      return;
    }

    // Если выполняется действие - не двигаемся
    if (this.currentState === 'performing_action') {
      return;
    }

    // Если говорим - обновляем анимацию печати
    if (this.currentState === 'speaking') {
      this.updateSpeaking();
      return;
    }

    // Проверка на случайную речь (только когда idle или walking)
    this.checkForRandomSpeech();

    // Если нет цели - выбираем новую
    if (this.currentState === 'idle') {
      this.decideNextAction();
      return;
    }

    // Если есть цель - двигаемся к ней
    if (this.currentState === 'walking' && this.targetX !== null && this.targetY !== null) {
      this.moveTowardsTarget();
    }
  }

  // Проверка на случайную речь
  checkForRandomSpeech() {
    const now = Date.now();

    // Проверяем не чаще чем раз в speakCheckInterval
    if (now - this.lastSpeakCheck < this.speakCheckInterval) {
      return;
    }

    this.lastSpeakCheck = now;

    // Случайная проверка
    if (Math.random() < this.speakChance) {
      this.startSpeaking();
    }
  }

  // Движение к целевой позиции (по waypoints)
  moveTowardsTarget() {
    const playerX = this.scene.playerX;
    const playerY = this.scene.playerY;
    const speed = this.scene.playerSpeed;

    // Проверяем, есть ли путь
    if (this.currentPath.length === 0 || this.currentPathIndex >= this.currentPath.length) {
      this.currentState = 'idle';
      return;
    }

    // Текущая точка пути
    const waypoint = this.currentPath[this.currentPathIndex];

    // Вычисляем направление к текущей точке пути
    let dx = waypoint.x - playerX;
    let dy = waypoint.y - playerY;

    // Нормализуем по экранной длине (как в контроллере игрока)
    const screenDX = (dx - dy) * (this.scene.tileWidth / 2);
    const screenDY = (dx + dy) * (this.scene.tileHeight / 2);
    const screenLen = Math.sqrt(screenDX * screenDX + screenDY * screenDY);

    // Проверяем, достигли ли текущей точки пути
    if (screenLen < 5) {
      this.currentPathIndex++;

      // Проверяем, достигли ли конца пути
      if (this.currentPathIndex >= this.currentPath.length) {
        // Путь завершён, проверяем коллизию с entry tile
        if (this.currentGoal && this.entryTile &&
            this.scene.checkCollisionWithTile(playerX, playerY, this.entryTile.tileX, this.entryTile.tileY)) {
          this.collisionPosition = { x: playerX, y: playerY };
          this.startAction();
          return;
        }
        // Иначе просто становимся idle
        this.currentState = 'idle';
        return;
      }

      // Обновляем цель на следующую точку пути
      this.targetX = this.currentPath[this.currentPathIndex].x;
      this.targetY = this.currentPath[this.currentPathIndex].y;
      return;
    }

    // Масштабируем для одинаковой визуальной скорости
    const baseScreenLen = this.scene.tileHeight;
    const scale = baseScreenLen / screenLen;
    dx *= scale;
    dy *= scale;

    // Обновляем направление спрайта
    this.scene.updateDirectionFromVelocity(dx, dy);
    this.scene.isMoving = true;

    // Вычисляем новую позицию
    let newX = playerX + dx * speed;
    let newY = playerY + dy * speed;

    // Проверяем коллизию ТОЛЬКО с entry tile - только он триггерит действие
    if (this.currentGoal && this.entryTile &&
        this.scene.checkCollisionWithTile(newX, newY, this.entryTile.tileX, this.entryTile.tileY)) {
      // Коллизия с entry tile - начинаем действие
      this.collisionPosition = { x: playerX, y: playerY };
      this.startAction();
      return;
    }

    // Для всех остальных объектов - обычная проверка коллизий
    // Но исключаем entry tile из проверки (используем унифицированный метод)
    const collision = this.scene.checkCollision(newX, newY, { excludeTile: this.entryTile });

    // Debug: логируем если застряли
    if (collision.x && collision.y) {
      const currentTileX = Math.floor(playerX);
      const currentTileY = Math.floor(playerY);
      console.log(`STUCK at tile (${currentTileX}, ${currentTileY}), pos (${playerX.toFixed(2)}, ${playerY.toFixed(2)})`);
      console.log(`  Target: (${this.targetX?.toFixed(2)}, ${this.targetY?.toFixed(2)})`);
      console.log(`  Entry tile: (${this.entryTile?.tileX}, ${this.entryTile?.tileY})`);
      console.log(`  Path index: ${this.currentPathIndex}/${this.currentPath.length}`);

      // Проверяем какие тайлы блокируют
      const radius = this.scene.playerCollisionRadius;
      const nearbyTiles = this.scene.getTilesInRadius(newX, newY, radius);
      nearbyTiles.forEach(tile => {
        if (this.scene.isTileOccupied(tile.x, tile.y)) {
          const isEntry = this.entryTile && tile.x === this.entryTile.tileX && tile.y === this.entryTile.tileY;
          console.log(`  Blocking tile: (${tile.x}, ${tile.y}) - ${isEntry ? 'ENTRY (should be allowed!)' : this.scene.getObjectAtTile(tile.x, tile.y)}`);
        }
      });
    }

    // Применяем движение с учётом коллизий
    if (!collision.x) {
      this.scene.playerX = newX;
    }
    if (!collision.y) {
      this.scene.playerY = newY;
    }

    // Обновляем позицию персонажа на экране
    this.scene.updateCharacterPosition();
  }

  // Решение о следующем действии
  decideNextAction() {
    // Находим самую низкую потребность
    let lowestNeed = null;
    let lowestValue = 100;

    for (const need in this.needs) {
      if (this.needs[need] < lowestValue) {
        lowestValue = this.needs[need];
        lowestNeed = need;
      }
    }

    // Выбираем действие в зависимости от потребности
    let selectedActivity = null;

    if (lowestNeed === 'energy') {
      selectedActivity = 'rest';
    } else if (lowestNeed === 'hunger') {
      selectedActivity = 'eat';
    } else if (lowestNeed === 'fun') {
      selectedActivity = 'play';
    } else if (lowestNeed === 'social') {
      selectedActivity = 'socialize';
    } else {
      selectedActivity = 'work';
    }

    this.startActivity(selectedActivity);
  }

  // Начать активность (выбрать цель и начать движение)
  startActivity(activity) {
    let targetLocation = null;

    switch (activity) {
      case 'rest':
        targetLocation = this.locations.home;
        break;
      case 'eat':
        targetLocation = this.locations.cafe;
        break;
      case 'play':
        targetLocation = this.locations.projects;
        break;
      case 'socialize':
        targetLocation = this.locations.cases;
        break;
      case 'work':
        targetLocation = Math.random() > 0.5 ? this.locations.projects : this.locations.cases;
        break;
      default:
        return;
    }

    // Устанавливаем цель
    this.currentGoal = targetLocation;
    this.currentActivity = activity;

    // Получаем entry tile (самый левый тайл в изометрии)
    this.entryTile = this.scene.getEntryTile(targetLocation);

    let targetX, targetY;
    if (this.entryTile) {
      targetX = this.entryTile.x;
      targetY = this.entryTile.y;
    } else {
      // Fallback на центр объекта
      const size = targetLocation.size || 1;
      targetX = targetLocation.x + size / 2;
      targetY = targetLocation.y + size / 2;
    }

    // Строим путь с помощью A*
    // Entry tile разрешён для прохода (цель пути)
    this.currentPath = this.findPath(
      this.scene.playerX,
      this.scene.playerY,
      targetX,
      targetY,
      this.entryTile
    );
    this.currentPathIndex = 0;

    if (this.currentPath.length > 0) {
      // Устанавливаем первую точку пути как текущую цель
      this.targetX = this.currentPath[0].x;
      this.targetY = this.currentPath[0].y;
      this.currentState = 'walking';
    } else {
      // Путь не найден - остаёмся idle
      console.warn('No path found to', targetLocation.type);
      this.currentState = 'idle';
      this.currentGoal = null;
      this.entryTile = null;
      return;
    }

    // Находим длительность активности из расписания
    const scheduleItem = this.schedule.find(item => item.activity === activity);
    this.actionDuration = scheduleItem ? scheduleItem.duration : 3000;
  }

  // Начать действие (когда произошла коллизия с объектом)
  startAction() {
    // Защита от вызова на уничтоженной сцене
    if (!this.scene || this.scene.isDestroyed) return;

    this.actionTimer = this.actionDuration;
    this.currentState = 'performing_action';
    this.scene.isMoving = false;

    // Показываем баббл с анимацией активности
    if (this.currentGoal && this.currentGoal.type) {
      this.scene.showActivityBubble(this.currentGoal.type, this.currentGoal);
    }
  }

  // Завершить действие
  completeAction() {
    // Восстанавливаем потребности в зависимости от локации
    switch (this.currentGoal.type) {
      case 'home':
        this.needs.energy = Math.min(100, this.needs.energy + 40);
        break;
      case 'cafe':
        this.needs.hunger = Math.min(100, this.needs.hunger + 40);
        break;
      case 'projects':
        this.needs.fun = Math.min(100, this.needs.fun + 35);
        break;
      case 'cases':
        this.needs.social = Math.min(100, this.needs.social + 35);
        break;
    }

    // Скрываем баббл
    this.scene.hideActivityBubble();

    // Спавним персонажа в безопасной позиции
    this.spawnAtSafePosition();

    // Сбрасываем состояние
    this.currentState = 'idle';
    this.currentGoal = null;
    this.currentActivity = null;
    this.targetX = null;
    this.targetY = null;
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.entryTile = null;
    this.actionTimer = 0;
    this.collisionPosition = null;
  }

  // ═══════════════════════════════════════════════════════════════
  // СИСТЕМА ДИАЛОГОВ
  // ═══════════════════════════════════════════════════════════════

  // Начать говорить (случайная фраза)
  startSpeaking(phrase = null) {
    // Защита от вызова на уничтоженной сцене
    if (!this.scene || this.scene.isDestroyed) return;

    // Выбираем случайную фразу если не передана конкретная
    this.currentPhrase = phrase || this.getRandomPhrase();
    this.displayedText = '';
    this.typingIndex = 0;
    this.isTyping = true;
    this.speakingTimer = 0;
    this.speakingDuration = this.pauseAfterTyping;

    // Сохраняем предыдущее состояние для возврата
    this.previousState = this.currentState;
    this.currentState = 'speaking';

    // Останавливаем движение
    this.scene.isMoving = false;

    // Показываем баббл с речью
    this.scene.showSpeechBubble(this.currentPhrase, this.typingSpeed);

    console.log(`Character starts speaking: "${this.currentPhrase}"`);
  }

  // Обновление анимации печати
  updateSpeaking() {
    // Обновление анимации происходит в IsometricScene через таймер
    // Здесь проверяем завершение

    // Проверяем, завершилась ли печать
    if (!this.scene.isSpeechTyping && !this.scene.isSpeechWaiting) {
      this.completeSpeaking();
    }
  }

  // Завершить речь
  completeSpeaking() {
    // Скрываем баббл
    this.scene.hideSpeechBubble();

    // Всегда переходим в idle для пересчёта пути
    // (предыдущий путь мог устареть пока говорили)
    this.currentState = 'idle';
    this.previousState = null;

    // Сбрасываем текущую цель и путь для пересчёта
    this.currentGoal = null;
    this.currentActivity = null;
    this.targetX = null;
    this.targetY = null;
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.entryTile = null;

    // Сбрасываем параметры речи
    this.currentPhrase = '';
    this.displayedText = '';
    this.typingIndex = 0;
    this.isTyping = false;
    this.speakingTimer = 0;

    console.log('Character finished speaking');
  }

  // Найти и установить безопасную позицию для спавна после действия
  spawnAtSafePosition() {
    if (!this.currentGoal) return;

    const objX = this.currentGoal.x;
    const objY = this.currentGoal.y;
    const size = this.currentGoal.size || 1;
    const radius = this.scene.playerCollisionRadius;

    // Если есть сохранённая позиция коллизии - пробуем использовать её
    if (this.collisionPosition) {
      const cx = this.collisionPosition.x;
      const cy = this.collisionPosition.y;

      // Находим направление от центра объекта к позиции коллизии
      const centerX = objX + size / 2;
      const centerY = objY + size / 2;
      const dirX = cx - centerX;
      const dirY = cy - centerY;
      const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);

      if (dirLen > 0) {
        // Отодвигаем от объекта на безопасное расстояние
        const safeDistance = 0.6; // Чуть больше радиуса коллизии
        const safeX = cx + (dirX / dirLen) * safeDistance;
        const safeY = cy + (dirY / dirLen) * safeDistance;

        // Проверяем, что позиция безопасна
        if (!this.isPositionBlocked(safeX, safeY)) {
          this.scene.playerX = safeX;
          this.scene.playerY = safeY;
          this.scene.updateCharacterPosition();
          return;
        }
      }
    }

    // Fallback: ищем безопасную позицию вокруг объекта
    const offsets = [
      { dx: -1, dy: 0 },   // слева
      { dx: size, dy: 0 }, // справа
      { dx: 0, dy: -1 },   // сверху
      { dx: 0, dy: size }, // снизу
      { dx: -1, dy: -1 },  // верхний левый угол
      { dx: size, dy: -1 }, // верхний правый угол
      { dx: -1, dy: size }, // нижний левый угол
      { dx: size, dy: size }, // нижний правый угол
    ];

    for (const offset of offsets) {
      const testX = objX + offset.dx + 0.5;
      const testY = objY + offset.dy + 0.5;

      if (!this.isPositionBlocked(testX, testY)) {
        this.scene.playerX = testX;
        this.scene.playerY = testY;
        this.scene.updateCharacterPosition();
        return;
      }
    }

    // Последний fallback - центр карты
    this.scene.playerX = 5;
    this.scene.playerY = 5;
    this.scene.updateCharacterPosition();
  }

  // Принудительный выход из текущего действия (для переключения режима)
  forceExitAction() {
    // Обрабатываем выход из speaking состояния
    if (this.currentState === 'speaking') {
      this.scene.hideSpeechBubble();
      this.currentState = 'idle';
      this.currentPhrase = '';
      this.displayedText = '';
      this.typingIndex = 0;
      this.isTyping = false;
      this.previousState = null;
      return;
    }

    if (this.currentState !== 'performing_action') return;

    // Скрываем баббл
    this.scene.hideActivityBubble();

    // Спавним персонажа в безопасной позиции
    this.spawnAtSafePosition();

    // Сбрасываем состояние
    this.currentState = 'idle';
    this.currentGoal = null;
    this.currentActivity = null;
    this.targetX = null;
    this.targetY = null;
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.entryTile = null;
    this.actionTimer = 0;
    this.collisionPosition = null;
  }

  // Проверка, заблокирована ли позиция
  isPositionBlocked(x, y) {
    const radius = this.scene.playerCollisionRadius;

    // Проверяем границы
    if (x - radius < 0 || x + radius >= this.scene.gridSize) return true;
    if (y - radius < 0 || y + radius >= this.scene.gridSize) return true;

    // Проверяем коллизии с объектами
    const tiles = this.scene.getTilesInRadius(x, y, radius);
    for (const tile of tiles) {
      if (this.scene.isTileOccupied(tile.x, tile.y)) {
        if (this.scene.checkCircleTileCollision(x, y, radius, tile.x, tile.y)) {
          return true;
        }
      }
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════
  // A* PATHFINDING
  // ═══════════════════════════════════════════════════════════════

  // Проверка, проходим ли тайл для pathfinding
  // entryTile - координаты входного тайла, который разрешён для прохода
  // Учитываем буферную зону - тайлы рядом со зданиями тоже блокируются
  isTileWalkable(tileX, tileY, entryTile = null) {
    // Проверяем границы
    if (tileX < 0 || tileX >= this.scene.gridSize) return false;
    if (tileY < 0 || tileY >= this.scene.gridSize) return false;

    // Если это entry tile - разрешаем проход
    if (entryTile && tileX === entryTile.tileX && tileY === entryTile.tileY) {
      return true;
    }

    // Проверяем, занят ли сам тайл
    if (this.scene.isTileOccupied(tileX, tileY)) {
      return false;
    }

    // Проверяем соседние тайлы (буферная зона)
    // Если рядом есть здание - тайл непроходим (кроме пути к entry tile)
    const neighbors = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    ];

    for (const n of neighbors) {
      const nx = tileX + n.dx;
      const ny = tileY + n.dy;

      // Если сосед - entry tile, не блокируем текущий тайл
      if (entryTile && nx === entryTile.tileX && ny === entryTile.tileY) {
        continue;
      }

      // Если сосед занят зданием - текущий тайл в буферной зоне
      if (this.scene.isTileOccupied(nx, ny)) {
        return false;
      }
    }

    return true;
  }

  // Эвристика для A* (Manhattan distance)
  heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  // A* pathfinding алгоритм
  // Возвращает массив точек [{x, y}, ...] от start до end (центры тайлов)
  findPath(startX, startY, endX, endY, entryTile = null) {
    // Округляем стартовую позицию до ближайшего тайла
    const startTileX = Math.floor(startX);
    const startTileY = Math.floor(startY);
    const endTileX = Math.floor(endX);
    const endTileY = Math.floor(endY);

    // Если старт = конец, возвращаем пустой путь
    if (startTileX === endTileX && startTileY === endTileY) {
      return [{ x: endX, y: endY }];
    }

    // Open и closed списки
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = `${startTileX},${startTileY}`;
    const endKey = `${endTileX},${endTileY}`;

    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(startTileX, startTileY, endTileX, endTileY));
    openSet.push({ x: startTileX, y: startTileY, f: fScore.get(startKey) });

    // Соседи (8 направлений)
    const neighbors = [
      { dx: 0, dy: -1 },  // up
      { dx: 1, dy: 0 },   // right
      { dx: 0, dy: 1 },   // down
      { dx: -1, dy: 0 },  // left
      { dx: 1, dy: -1 },  // up-right
      { dx: 1, dy: 1 },   // down-right
      { dx: -1, dy: 1 },  // down-left
      { dx: -1, dy: -1 }, // up-left
    ];

    while (openSet.length > 0) {
      // Находим узел с минимальным fScore
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const currentKey = `${current.x},${current.y}`;

      // Достигли цели
      if (current.x === endTileX && current.y === endTileY) {
        return this.reconstructPath(cameFrom, current, startX, startY, endX, endY);
      }

      closedSet.add(currentKey);

      // Проверяем соседей
      for (const neighbor of neighbors) {
        const nx = current.x + neighbor.dx;
        const ny = current.y + neighbor.dy;
        const neighborKey = `${nx},${ny}`;

        // Пропускаем если уже обработан
        if (closedSet.has(neighborKey)) continue;

        // Пропускаем если непроходим
        if (!this.isTileWalkable(nx, ny, entryTile)) continue;

        // Для диагонального движения проверяем, что оба смежных тайла проходимы
        if (neighbor.dx !== 0 && neighbor.dy !== 0) {
          const adj1Walkable = this.isTileWalkable(current.x + neighbor.dx, current.y, entryTile);
          const adj2Walkable = this.isTileWalkable(current.x, current.y + neighbor.dy, entryTile);
          if (!adj1Walkable || !adj2Walkable) continue;
        }

        // Стоимость перехода (1 для прямого, 1.41 для диагонали)
        const moveCost = (neighbor.dx !== 0 && neighbor.dy !== 0) ? 1.414 : 1;
        const tentativeG = gScore.get(currentKey) + moveCost;

        if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          const f = tentativeG + this.heuristic(nx, ny, endTileX, endTileY);
          fScore.set(neighborKey, f);

          // Добавляем в openSet если ещё нет
          if (!openSet.find(n => n.x === nx && n.y === ny)) {
            openSet.push({ x: nx, y: ny, f });
          }
        }
      }
    }

    // Путь не найден
    console.warn('Path not found from', startTileX, startTileY, 'to', endTileX, endTileY);
    return [];
  }

  // Восстановление пути из cameFrom
  reconstructPath(cameFrom, current, startX, startY, endX, endY) {
    const path = [];
    let node = current;

    // Собираем путь от конца к началу
    // Все waypoints строго в центрах тайлов (координата + 0.5)
    while (node) {
      const key = `${node.x},${node.y}`;
      // Добавляем центр тайла (tileX + 0.5, tileY + 0.5)
      path.unshift({ x: node.x + 0.5, y: node.y + 0.5 });
      node = cameFrom.get(key);
    }

    // Убираем первую точку если мы уже близко к ней (в пределах того же тайла)
    if (path.length > 1) {
      const firstTile = path[0];
      const distToFirst = Math.abs(startX - firstTile.x) + Math.abs(startY - firstTile.y);
      if (distToFirst < 0.3) {
        path.shift();
      }
    }

    return path;
  }

  // Получить текущий статус AI (для отображения в UI)
  getStatus() {
    return {
      state: this.currentState,
      activity: this.currentActivity || 'idle',
      needs: {
        energy: Math.round(this.needs.energy),
        hunger: Math.round(this.needs.hunger),
        fun: Math.round(this.needs.fun),
        social: Math.round(this.needs.social),
      },
      goal: this.currentGoal ? this.currentGoal.type : null,
      actionTimer: Math.round(this.actionTimer / 1000),
      // Информация о времени
      time: {
        hour: this.gameHour,
        minute: this.gameMinute,
        day: this.gameDay,
        timeOfDay: this.timeOfDay,
        timeOfDayName: this.getTimeOfDayName(),
        formatted: this.getFormattedTime(),
        totalMinutes: this.totalGameMinutes,
      },
    };
  }

  // Установить скорость времени (для отладки или ускорения)
  setTimeScale(scale) {
    this.timeScale = Math.max(0.1, Math.min(10, scale));
    console.log(`Time scale set to ${this.timeScale}x`);
  }

  // Перемотать время вперёд (для отладки)
  skipTime(hours) {
    const minutes = hours * 60;
    for (let i = 0; i < minutes; i++) {
      this.advanceGameMinute();
    }
    console.log(`Skipped ${hours} hours. Now: Day ${this.gameDay}, ${this.getFormattedTime()}`);
  }
}
