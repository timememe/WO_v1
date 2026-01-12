/**
 * CharacterAI - система искусственного интеллекта для персонажа
 * Симулирует жизнь персонажа в стиле тамагочи
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
    this.currentState = 'idle'; // idle, walking, working, resting, eating, playing

    // Текущая цель (координаты или объект)
    this.currentGoal = null;

    // Путь к цели (массив координат)
    this.path = [];

    // Таймер для действий
    this.actionTimer = 0;
    this.actionDuration = 0;

    // Локации для различных активностей (координаты на сетке)
    // size - количество тайлов, которые занимает объект (1 = 1x1, 2 = 2x2)
    this.locations = {
      home: { x: 4, y: 2, type: 'home', size: 2 },        // Дом - отдых (2x2)
      projects: { x: 2, y: 6, type: 'projects', size: 2 }, // Проекты - работа (2x2)
      cases: { x: 6, y: 5, type: 'cases', size: 2 },      // Кейсы - работа (2x2)
      tree: { x: 1, y: 1, type: 'tree', size: 1 },        // Дерево - отдых/развлечение (1x1)
    };

    // Расписание активностей (приоритеты)
    this.schedule = [
      { activity: 'work', priority: 70, duration: 5000 },      // Работа - высокий приоритет
      { activity: 'rest', priority: 50, duration: 3000 },      // Отдых - средний приоритет
      { activity: 'eat', priority: 60, duration: 2000 },       // Еда - средне-высокий приоритет
      { activity: 'play', priority: 40, duration: 4000 },      // Игра - средний приоритет
      { activity: 'socialize', priority: 30, duration: 3000 }, // Общение - низкий приоритет
    ];

    // Таймер обновления AI
    this.updateInterval = null;

  }

  // Запуск AI
  start() {

    // Обновляем AI каждую секунду
    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000);
  }

  // Остановка AI
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Основной цикл обновления AI
  update() {
    // 1. Обновляем потребности (уменьшаем со временем)
    this.updateNeeds();

    // 2. Если персонаж в движении, не принимаем новых решений
    if (this.scene.isMoving) {
      return;
    }

    // 3. Если выполняется действие, уменьшаем таймер
    if (this.actionTimer > 0) {
      this.actionTimer -= 1000; // Вычитаем 1 секунду
      if (this.actionTimer <= 0) {
        this.completeAction();
      }
      return;
    }

    // 4. Если в состоянии walking и персонаж зашел на территорию объекта - начать действие
    if (this.currentState === 'walking' && this.currentGoal && !this.scene.isMoving) {
      if (this.isOnObjectTile(this.currentGoal)) {
        // Персонаж на территории объекта - очищаем путь и начинаем действие
        this.path = [];
        this.startAction();
        return;
      }
    }

    // 5. Если нет текущего действия, выбираем новое
    if (this.currentState === 'idle') {
      this.decideNextAction();
    }

    // 6. Если есть цель и нет пути, строим путь
    if (this.currentGoal && this.path.length === 0 && this.currentState === 'walking') {
      this.buildPathToGoal();
    }

    // 7. Если есть путь, двигаемся по нему
    if (this.path.length > 0) {
      this.followPath();
    }
  }

  // Обновление потребностей
  updateNeeds() {
    for (const need in this.needs) {
      this.needs[need] = Math.max(0, this.needs[need] - this.needsDecayRate[need]);
    }
  }

  // Проверка, находится ли персонаж на территории объекта
  isOnObjectTile(objectLocation) {
    if (!objectLocation) return false;

    const playerX = this.scene.playerGridX;
    const playerY = this.scene.playerGridY;
    const objX = objectLocation.x;
    const objY = objectLocation.y;
    const size = objectLocation.size || 1;

    // Проверяем, находится ли игрок на любом из тайлов объекта
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        if (playerX === objX + dx && playerY === objY + dy) {
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
      // Если все потребности в норме, работаем
      selectedActivity = 'work';
    }

    this.startActivity(selectedActivity);
  }

  // Начать активность
  startActivity(activity) {
    // Находим подходящую локацию для активности
    let targetLocation = null;

    switch (activity) {
      case 'rest':
        targetLocation = this.locations.home; // Дом - энергия
        break;
      case 'eat':
        targetLocation = this.locations.tree; // Дерево - голод
        break;
      case 'play':
        targetLocation = this.locations.projects; // Проекты - развлечение
        break;
      case 'socialize':
        targetLocation = this.locations.cases; // Кейсы - социализация
        break;
      case 'work':
        // Если все потребности в норме, случайно выбираем
        targetLocation = Math.random() > 0.5 ? this.locations.projects : this.locations.cases;
        break;
      default:
        return;
    }

    // Устанавливаем цель и активность
    this.currentGoal = targetLocation;
    this.currentState = 'walking';
    this.currentActivity = activity; // Сохраняем текущую активность

    // Находим длительность активности из расписания
    const scheduleItem = this.schedule.find(item => item.activity === activity);
    this.actionDuration = scheduleItem ? scheduleItem.duration : 3000;
  }

  // Построить путь к цели (простая реализация - прямой путь)
  buildPathToGoal() {
    if (!this.currentGoal) return;

    const startX = this.scene.playerGridX;
    const startY = this.scene.playerGridY;
    const endX = this.currentGoal.x;
    const endY = this.currentGoal.y;

    // Простой алгоритм - двигаемся сначала по X, потом по Y
    this.path = [];

    let currentX = startX;
    let currentY = startY;

    // Двигаемся по X
    while (currentX !== endX) {
      if (currentX < endX) {
        currentX++;
      } else {
        currentX--;
      }
      this.path.push({ x: currentX, y: currentY });
    }

    // Двигаемся по Y
    while (currentY !== endY) {
      if (currentY < endY) {
        currentY++;
      } else {
        currentY--;
      }
      this.path.push({ x: currentX, y: currentY });
    }
  }

  // Следовать по пути
  followPath() {
    if (this.path.length === 0) {
      return;
    }

    // Берем следующую точку пути
    const nextStep = this.path[0];
    const dx = nextStep.x - this.scene.playerGridX;
    const dy = nextStep.y - this.scene.playerGridY;

    // Двигаем персонажа
    this.scene.movePlayer(dx, dy);

    // Удаляем пройденную точку
    this.path.shift();
  }

  // Начать действие (когда достигли цели)
  startAction() {
    this.actionTimer = this.actionDuration;
    this.currentState = 'performing_action';

    // Показываем баббл с анимацией активности
    if (this.currentGoal && this.currentGoal.type) {
      this.scene.showActivityBubble(this.currentGoal.type);
    }
  }

  // Завершить действие
  completeAction() {
    // Восстанавливаем потребности в зависимости от локации
    switch (this.currentGoal.type) {
      case 'home':
        // Дом - восстанавливает энергию
        this.needs.energy = Math.min(100, this.needs.energy + 40);
        break;
      case 'tree':
        // Дерево - восстанавливает голод
        this.needs.hunger = Math.min(100, this.needs.hunger + 40);
        break;
      case 'projects':
        // Проекты - восстанавливают развлечение
        this.needs.fun = Math.min(100, this.needs.fun + 35);
        break;
      case 'cases':
        // Кейсы - восстанавливают социализацию
        this.needs.social = Math.min(100, this.needs.social + 35);
        break;
    }

    // Скрываем баббл и показываем персонажа
    this.scene.hideActivityBubble();

    // Сбрасываем состояние
    this.currentState = 'idle';
    this.currentGoal = null;
    this.currentActivity = null;
    this.actionTimer = 0;
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
      actionTimer: Math.round(this.actionTimer / 1000), // В секундах
    };
  }
}
