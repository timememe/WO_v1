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
        if (this.currentGoal && this.checkCollisionWithEntryTile(playerX, playerY)) {
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
    if (this.currentGoal && this.checkCollisionWithEntryTile(newX, newY)) {
      // Коллизия с entry tile - начинаем действие
      this.collisionPosition = { x: playerX, y: playerY };
      this.startAction();
      return;
    }

    // Для всех остальных объектов - обычная проверка коллизий
    // Но исключаем entry tile из проверки
    const collision = this.checkCollisionExcludingEntry(newX, newY);

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

  // Проверка коллизий, исключая entry tile текущей цели
  checkCollisionExcludingEntry(newX, newY) {
    const radius = this.scene.playerCollisionRadius;
    const result = { x: false, y: false };

    // Проверка границ поля
    if (newX - radius < 0 || newX + radius >= this.scene.gridSize) {
      result.x = true;
    }
    if (newY - radius < 0 || newY + radius >= this.scene.gridSize) {
      result.y = true;
    }

    // Проверка по X
    const tilesX = this.scene.getTilesInRadius(newX, this.scene.playerY, radius);
    for (const tile of tilesX) {
      // Пропускаем entry tile
      if (this.entryTile && tile.x === this.entryTile.tileX && tile.y === this.entryTile.tileY) {
        continue;
      }
      if (this.scene.isTileOccupied(tile.x, tile.y)) {
        if (this.scene.checkCircleTileCollision(newX, this.scene.playerY, radius, tile.x, tile.y)) {
          result.x = true;
          break;
        }
      }
    }

    // Проверка по Y
    const tilesY = this.scene.getTilesInRadius(this.scene.playerX, newY, radius);
    for (const tile of tilesY) {
      // Пропускаем entry tile
      if (this.entryTile && tile.x === this.entryTile.tileX && tile.y === this.entryTile.tileY) {
        continue;
      }
      if (this.scene.isTileOccupied(tile.x, tile.y)) {
        if (this.scene.checkCircleTileCollision(this.scene.playerX, newY, radius, tile.x, tile.y)) {
          result.y = true;
          break;
        }
      }
    }

    return result;
  }

  // Проверка коллизии с ENTRY TILE целевого объекта
  // Только entry tile триггерит начало действия, остальные тайлы - обычная коллизия
  checkCollisionWithEntryTile(checkX, checkY) {
    if (!this.entryTile) return false;

    const radius = this.scene.playerCollisionRadius;
    return this.scene.checkCircleTileCollision(
      checkX,
      checkY,
      radius,
      this.entryTile.tileX,
      this.entryTile.tileY
    );
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

    // Debug: выводим путь в консоль
    console.log('Path waypoints (all should be tile centers, ending in .5):');
    path.forEach((p, i) => console.log(`  [${i}] (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`));

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
    };
  }
}
