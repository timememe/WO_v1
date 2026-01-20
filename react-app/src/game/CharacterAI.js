/**
 * CharacterAI - система искусственного интеллекта для персонажа
 * Симулирует жизнь персонажа в стиле тамагочи
 * Адаптирован под свободное движение (free movement controller)
 */
export class CharacterAI {
  constructor(scene) {
    this.scene = scene; // Ссылка на IsometricScene

    // Потребности персонажа (0-100)
    this.needs = {
      energy: 100,      // Энергия (уменьшается со временем, восстанавливается отдыхом)
      hunger: 100,      // Сытость (уменьшается со временем, восстанавливается едой)
      fun: 100,         // Развлечение (уменьшается со временем, восстанавливается играми)
      social: 100,      // Социализация (уменьшается со временем, восстанавливается общением)
    };

    // Скорость уменьшения потребностей (единиц в секунду)
    this.needsDecayRate = {
      energy: 0.5,
      hunger: 0.3,
      fun: 0.4,
      social: 0.2,
    };

    // Текущее состояние персонажа
    this.currentState = 'idle'; // idle, walking, performing_action

    // Текущая цель (локация)
    this.currentGoal = null;

    // Целевая позиция для движения (float координаты)
    this.targetX = null;
    this.targetY = null;

    // Позиция где произошла коллизия (для спавна после действия)
    this.collisionPosition = null;

    // Таймер для действий
    this.actionTimer = 0;
    this.actionDuration = 0;

    // Локации для различных активностей
    // Координаты указывают на начальный тайл объекта (левый верхний в grid)
    this.locations = {
      home: { x: 4, y: 2, type: 'home', size: 2 },
      projects: { x: 2, y: 7, type: 'projects', size: 2 },
      cases: { x: 6, y: 5, type: 'cases', size: 2 },
      cafe: { x: 1, y: 4, type: 'cafe', size: 2 },
    };

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
    // Обновляем потребности каждую секунду
    this.updateInterval = setInterval(() => {
      this.updateNeeds();
      this.updateActionTimer();
    }, 1000);

    // Запускаем ticker для движения
    this.movementTickerFn = () => this.updateMovement();
    this.scene.app.ticker.add(this.movementTickerFn);

    // Начинаем с выбора действия
    this.decideNextAction();
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
    // Если выполняется действие - не двигаемся
    if (this.currentState === 'performing_action') {
      return;
    }

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

  // Движение к целевой позиции
  moveTowardsTarget() {
    const playerX = this.scene.playerX;
    const playerY = this.scene.playerY;
    const speed = this.scene.playerSpeed;

    // Вычисляем направление к цели
    let dx = this.targetX - playerX;
    let dy = this.targetY - playerY;

    // Нормализуем по экранной длине (как в контроллере игрока)
    const screenDX = (dx - dy) * (this.scene.tileWidth / 2);
    const screenDY = (dx + dy) * (this.scene.tileHeight / 2);
    const screenLen = Math.sqrt(screenDX * screenDX + screenDY * screenDY);

    if (screenLen < 1) {
      // Достигли цели (но не объекта) - выбираем новую
      this.currentState = 'idle';
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

    // Проверяем коллизии
    const collision = this.scene.checkCollision(newX, newY);

    // Если есть коллизия - проверяем, не с целевым ли объектом
    if (collision.x || collision.y) {
      if (this.currentGoal && this.checkCollisionWithGoalAt(newX, newY)) {
        // Коллизия с целевым объектом - начинаем действие
        this.collisionPosition = { x: playerX, y: playerY };
        this.startAction();
        return;
      }
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

  // Проверка коллизии с целевым объектом в указанной позиции
  checkCollisionWithGoalAt(checkX, checkY) {
    if (!this.currentGoal) return false;

    const radius = this.scene.playerCollisionRadius;
    const objX = this.currentGoal.x;
    const objY = this.currentGoal.y;
    const size = this.currentGoal.size || 1;

    // Проверяем коллизию с каждым тайлом объекта
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        const tileX = objX + dx;
        const tileY = objY + dy;

        if (this.scene.checkCircleTileCollision(checkX, checkY, radius, tileX, tileY)) {
          return true;
        }
      }
    }
    return false;
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
    this.currentState = 'walking';

    // Целевая позиция - центр объекта
    const size = targetLocation.size || 1;
    this.targetX = targetLocation.x + size / 2;
    this.targetY = targetLocation.y + size / 2;

    // Находим длительность активности из расписания
    const scheduleItem = this.schedule.find(item => item.activity === activity);
    this.actionDuration = scheduleItem ? scheduleItem.duration : 3000;
  }

  // Начать действие (когда произошла коллизия с объектом)
  startAction() {
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
    this.actionTimer = 0;
    this.collisionPosition = null;
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
    };
  }
}
