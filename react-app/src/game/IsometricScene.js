import { Graphics, Container, Sprite, Assets, Text } from 'pixi.js';
import { CharacterAI } from './CharacterAI';

export class IsometricScene {
  constructor(app) {
    this.app = app;
    this.container = new Container();

    // Контейнер для объектов, требующих сортировки по глубине
    this.sortableContainer = new Container();
    this.sortableContainer.sortableChildren = true; // Включаем автоматическую сортировку

    // Фиксированные размеры тайлов (логические размеры сетки)
    this.tileWidth = 128;  // Ширина изометрического тайла
    this.tileHeight = 64;  // Высота изометрического тайла
    this.gridSize = 8;

    // Размер спрайта тайла (если спрайт 2048x2048)
    const tileSpriteSize = 512;

    // Рассчитываем масштаб спрайта под нужный размер тайла
    this.tileScale = this.tileWidth / tileSpriteSize; // 128 / 2048 = 0.0625
    this.character = null;
    this.characterSprites = {};
    this.currentDirection = 'front-left'; // front-left, front-right, back-left, back-right

    // Глобальный размер спрайта персонажа (масштаб)
    this.spriteScale = 0.05; // 0.15 = 15% от оригинального размера (2048px -> ~307px)

    // Смещение спрайта относительно тени (отрицательное значение = выше тени)
    this.spriteOffsetY = 10; // Спрайт на 10px выше тени

    // Смещение тени относительно позиции персонажа
    this.shadowOffsetY = 0; // Тень на 60px ниже точки позиции

    // Позиция персонажа на сетке
    this.playerGridX = 0;
    this.playerGridY = 0;

    // Состояние движения
    this.isMoving = false;
    this.moveSpeed = 0.15; // Скорость движения (0-1, чем выше - тем быстрее)

    // Настройки камеры
    this.cameraSmoothing = 0.1; // Плавность следования камеры (0-1, чем выше - тем быстрее)

    // Debug режим - показывать ли вспомогательную графику
    this.debugMode = false; // false - скрыть всю debug графику true

    // Контроллер режим - ручное управление или AI
    this.controllerMode = false; // true - ручное управление, false - AI управление

    // AI для управления персонажем
    this.characterAI = null;

    this.init();
  }

  async loadAssets() {
    try {
      // Загружаем текстуры
      this.grassTileTexture = await Assets.load('/assets/tile_grass_512.png');
      this.projectsObjTexture = await Assets.load('/assets/obj_projects.png');
      this.treeObjTexture = await Assets.load('/assets/obj_tree.png');
      this.homeObjTexture = await Assets.load('/assets/obj_home.png');
      this.casesObjTexture = await Assets.load('/assets/obj_cases.png');

      // Загружаем спрайты персонажа
      const frontTexture = await Assets.load('/assets/me_idle_f.png');
      const backTexture = await Assets.load('/assets/me_idle_b.png');

      // Создаем 4 направления
      // front-left - оригинальный me_idle_f
      this.characterSprites['front-left'] = Sprite.from(frontTexture);
      this.characterSprites['front-left'].scale.set(this.spriteScale);

      // front-right - зеркалированный me_idle_f
      this.characterSprites['front-right'] = Sprite.from(frontTexture);
      this.characterSprites['front-right'].scale.set(-this.spriteScale, this.spriteScale); // зеркалим по X

      // back-right - оригинальный me_idle_b
      this.characterSprites['back-right'] = Sprite.from(backTexture);
      this.characterSprites['back-right'].scale.set(this.spriteScale);

      // back-left - зеркалированный me_idle_b
      this.characterSprites['back-left'] = Sprite.from(backTexture);
      this.characterSprites['back-left'].scale.set(-this.spriteScale, this.spriteScale); // зеркалим по X

      return true;
    } catch (error) {
      console.error('Failed to load assets:', error);
      // Fallback: создаем простые графические спрайты
      this.createFallbackSprites();
      return false;
    }
  }

  createFallbackSprites() {
    // Создаем простые графические объекты если изображения не загрузились
    const colors = {
      'front-left': 0x667eea,
      'front-right': 0x4ecdc4,
      'back-left': 0xff6b6b,
      'back-right': 0xffe66d
    };

    Object.keys(colors).forEach(direction => {
      const graphics = new Graphics();
      graphics.circle(0, -40, 30);
      graphics.fill(colors[direction]);
      graphics.rect(-20, -80, 40, 60);
      graphics.fill(colors[direction]);

      this.characterSprites[direction] = graphics;
    });
  }

  // Конвертация изометрических координат в экранные
  isoToScreen(x, y) {
    const screenX = (x - y) * (this.tileWidth / 2);
    const screenY = (x + y) * (this.tileHeight / 2);

    // Добавляем смещение, чтобы позиция указывала на ЦЕНТР тайла, а не на верх
    const centerOffsetY = this.tileHeight / 2;

    return {
      x: screenX,
      y: screenY + centerOffsetY
    };
  }

  // Создание изометрической плитки (спрайт с текстурой)
  createTile(x, y) {
    const tileContainer = new Container();

    const tileSprite = Sprite.from(this.grassTileTexture);

    // Якорь в центре спрайта
    tileSprite.anchor.set(0.5, 0.5);

    // Применяем масштабирование
    tileSprite.scale.set(this.tileScale);

    tileContainer.addChild(tileSprite);

    // Debug графика (показывается только если debugMode = true)
    if (this.debugMode) {
      // Визуализация границ изометрического тайла (ромб)
      const tileBorder = new Graphics();

      // Рисуем изометрический ромб по размерам тайла
      // Центр в (0, 0), поэтому рисуем ромб вокруг центра
      tileBorder.moveTo(0, -this.tileHeight / 2); // Верхняя точка
      tileBorder.lineTo(this.tileWidth / 2, 0); // Правая точка
      tileBorder.lineTo(0, this.tileHeight / 2); // Нижняя точка
      tileBorder.lineTo(-this.tileWidth / 2, 0); // Левая точка
      tileBorder.lineTo(0, -this.tileHeight / 2); // Обратно в верх

      tileBorder.stroke({ width: 2, color: 0x00ff00, alpha: 0.8 });

      tileContainer.addChild(tileBorder);

      // Добавляем текст с координатами для отладки
      const coordText = new Text({
        text: `${x},${y}`,
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0xffffff,
          align: 'center',
        }
      });
      coordText.anchor.set(0.5);
      coordText.y = 0; // Теперь (0,0) - это центр тайла
      tileContainer.addChild(coordText);

      // Маркер центра тайла (для отладки)
      const centerMarker = new Graphics();
      centerMarker.circle(0, 0, 5);
      centerMarker.fill({ color: 0xff00ff, alpha: 1.0 }); // Фиолетовый для четкости
      tileContainer.addChild(centerMarker);
    }

    // Позиционируем тайл
    const screenPos = this.isoToScreen(x, y);
    tileContainer.x = screenPos.x;
    tileContainer.y = screenPos.y;

    return tileContainer;
  }

  // Создание персонажа со спрайтами
  createCharacter() {
    const character = new Container();

    // Маркер точной позиции на сетке (для отладки)
    if (this.debugMode) {
      const posMarker = new Graphics();
      posMarker.circle(0, 0, 5);
      posMarker.fill({ color: 0xff0000, alpha: 0.8 });
      character.addChild(posMarker);
    }

    // Тень под персонажем
    const shadow = new Graphics();
    shadow.ellipse(0, this.shadowOffsetY, 25, 10);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    character.addChild(shadow);

    // Добавляем спрайты (но показываем только активный)
    Object.keys(this.characterSprites).forEach(direction => {
      const sprite = this.characterSprites[direction];
      sprite.anchor.set(0.5, 1); // Якорь в центре низа спрайта
      sprite.y = this.spriteOffsetY; // Применяем глобальное смещение
      sprite.visible = (direction === this.currentDirection);
      character.addChild(sprite);
    });

    // Позиционируем персонажа в начальной позиции
    this.updateCharacterPosition();

    // Вертикальная анимация при движении
    let bounceTime = 0;
    let bounceOffset = 0;
    this.idleAnimationFn = () => {
      // Вертикальная анимация только при движении
      if (this.isMoving) {
        bounceTime += 0.4; // Скорость анимации
        bounceOffset = Math.sin(bounceTime) * 8; // Амплитуда прыжка
      } else {
        bounceTime = 0;
        bounceOffset = 0;
      }

      // Применяем bounce offset к персонажу
      const basePos = this.isoToScreen(this.playerGridX, this.playerGridY);
      character.y = basePos.y - bounceOffset; // Минус, чтобы прыгал вверх

      // Обновляем камеру каждый кадр для плавного следования
      this.updateCamera();
    };
    this.app.ticker.add(this.idleAnimationFn);

    return character;
  }

  // Обновление позиции персонажа на экране
  updateCharacterPosition() {
    if (!this.character) return;

    const screenPos = this.isoToScreen(this.playerGridX, this.playerGridY);
    this.character.x = screenPos.x;
    this.character.y = screenPos.y;

    // Обновляем zIndex для правильной сортировки по глубине
    this.character.zIndex = this.playerGridX + this.playerGridY;
  }

  // Обновление позиции камеры (плавное следование за игроком)
  updateCamera() {
    if (!this.character) return;

    // Целевая позиция контейнера - игрок в центре экрана
    const targetX = this.app.screen.width / 2 - this.character.x;
    const targetY = this.app.screen.height / 2 - this.character.y;

    // Плавная интерполяция камеры
    this.container.x += (targetX - this.container.x) * this.cameraSmoothing;
    this.container.y += (targetY - this.container.y) * this.cameraSmoothing;
  }

  // Движение персонажа в указанном направлении
  movePlayer(dx, dy) {
    if (this.isMoving) return; // Уже двигается

    const newX = this.playerGridX + dx;
    const newY = this.playerGridY + dy;

    // Проверка границ (сетка от 0 до gridSize-1)
    if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
      return;
    }

    // Определяем направление спрайта по движению
    this.updateDirectionByMovement(dx, dy);

    // Запускаем анимацию движения
    this.animateMovement(newX, newY);
  }

  // Определение направления спрайта по вектору движения
  updateDirectionByMovement(dx, dy) {
    // Изометрические направления:
    // dx=1, dy=0  -> front-right (вправо)
    // dx=-1, dy=0 -> back-left (влево)
    // dx=0, dy=1  -> front-left (вниз)
    // dx=0, dy=-1 -> back-right (вверх)
    // Диагонали - комбинации

    if (dx > 0 && dy >= 0) {
      this.setCharacterDirection('front-right');
    } else if (dx < 0 && dy <= 0) {
      this.setCharacterDirection('back-left');
    } else if (dx <= 0 && dy > 0) {
      this.setCharacterDirection('front-left');
    } else if (dx >= 0 && dy < 0) {
      this.setCharacterDirection('back-right');
    }
  }

  // Плавная анимация движения
  animateMovement(targetX, targetY) {
    this.isMoving = true;

    const startPos = this.isoToScreen(this.playerGridX, this.playerGridY);
    const endPos = this.isoToScreen(targetX, targetY);

    let progress = 0;

    const animateTicker = () => {
      progress += this.moveSpeed;

      if (progress >= 1) {
        // Движение завершено
        this.playerGridX = targetX;
        this.playerGridY = targetY;
        this.character.x = endPos.x;
        this.character.y = endPos.y;

        // Обновляем zIndex для правильной сортировки по глубине
        this.character.zIndex = this.playerGridX + this.playerGridY;

        this.isMoving = false;
        this.app.ticker.remove(animateTicker);
        return;
      }

      // Интерполяция позиции (easing)
      const eased = this.easeInOutQuad(progress);
      this.character.x = startPos.x + (endPos.x - startPos.x) * eased;
      this.character.y = startPos.y + (endPos.y - startPos.y) * eased;
    };

    this.app.ticker.add(animateTicker);
  }

  // Easing функция для плавности
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // Обработка клавиш (только если контроллер режим включен)
  setupControls() {
    if (!this.controllerMode) {
      return;
    }

    const handleKeyDown = (e) => {
      switch(e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.movePlayer(0, -1); // Вверх (back-right)
          break;
        case 's':
        case 'arrowdown':
          this.movePlayer(0, 1); // Вниз (front-left)
          break;
        case 'a':
        case 'arrowleft':
          this.movePlayer(-1, 0); // Влево (back-left)
          break;
        case 'd':
        case 'arrowright':
          this.movePlayer(1, 0); // Вправо (front-right)
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Сохраняем для очистки
    this.keyDownHandler = handleKeyDown;
  }

  // Смена направления персонажа
  setCharacterDirection(direction) {
    if (!this.character || !this.characterSprites[direction]) return;

    this.currentDirection = direction;

    // Скрываем все спрайты и показываем только нужный
    Object.keys(this.characterSprites).forEach(dir => {
      this.characterSprites[dir].visible = (dir === direction);
    });
  }

  // Создание декораций (деревья, камни, объекты и т.д.)
  createDecoration(x, y, type = 'tree') {
    const decorationContainer = new Container();

    // Конфигурация объектов: текстура, целевой размер, якорь и бонус глубины
    // depthBonus - сколько дополнительных "тайлов глубины" добавить для высоких объектов
    const objectConfig = {
      'projects': { texture: this.projectsObjTexture, size: 128, anchor: [0.5, 0.5], depthBonus: 0 },
      'tree': { texture: this.treeObjTexture, size: 128, anchor: [0.5, 0.35], depthBonus: 3 }, // Дерево высокое - крона занимает 3 тайла
      'home': { texture: this.homeObjTexture, size: 128, anchor: [0.5, 0.5], depthBonus: 0 },
      'cases': { texture: this.casesObjTexture, size: 128, anchor: [0.5, 0.5], depthBonus: 0 },
    };

    let depthBonus = 0; // По умолчанию нет бонуса

    if (objectConfig[type]) {
      // Создаем спрайт для объекта
      const config = objectConfig[type];
      const objSprite = Sprite.from(config.texture);

      // Устанавливаем якорь из конфигурации
      objSprite.anchor.set(config.anchor[0], config.anchor[1]);

      // Масштабирование (512x512 -> нужный размер)
      const objSpriteSize = 512;
      const objScale = config.size / objSpriteSize;
      objSprite.scale.set(objScale);

      // Позиция относительно центра тайла (0, 0)
      objSprite.x = 0;
      objSprite.y = 0;

      // Сохраняем бонус глубины для дальнейшего использования
      depthBonus = config.depthBonus;

      decorationContainer.addChild(objSprite);
    } else {
      // Fallback для неизвестных типов - простая графика
      const decoration = new Graphics();
      decoration.rect(-10, -10, 20, 20);
      decoration.fill(0xff00ff);
      decorationContainer.addChild(decoration);
    }

    // Позиционируем весь контейнер в центр тайла
    const screenPos = this.isoToScreen(x, y);
    decorationContainer.x = screenPos.x;
    decorationContainer.y = screenPos.y;

    // Сохраняем координаты сетки для сортировки по глубине
    decorationContainer.gridX = x;
    decorationContainer.gridY = y;

    // Устанавливаем zIndex на основе глубины + бонус для высоких объектов
    // (чем больше x+y, тем ближе к камере)
    decorationContainer.zIndex = x + y + depthBonus;

    return decorationContainer;
  }

  async init() {
    // Загружаем ассеты
    await this.loadAssets();

    // Создаем изометрическую сетку из тайлов
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const tile = this.createTile(x, y);
        this.container.addChild(tile);
      }
    }

    // Добавляем контейнер для сортируемых объектов поверх тайлов
    this.container.addChild(this.sortableContainer);

    // Добавляем декорации в сортируемый контейнер
    this.sortableContainer.addChild(this.createDecoration(1, 1, 'tree'));
    this.sortableContainer.addChild(this.createDecoration(6, 2, 'tree'));
    this.sortableContainer.addChild(this.createDecoration(2, 6, 'projects')); // Объект projects
    this.sortableContainer.addChild(this.createDecoration(5, 6, 'tree'));
    this.sortableContainer.addChild(this.createDecoration(4, 2, 'home')); // Объект home
    this.sortableContainer.addChild(this.createDecoration(6, 5, 'cases')); // Объект cases

    // Создаем персонажа и добавляем в сортируемый контейнер
    this.character = this.createCharacter();
    this.sortableContainer.addChild(this.character);

    this.app.stage.addChild(this.container);

    // Инициализируем камеру (центрируем на игроке)
    this.updateCamera();

    // Настраиваем управление
    this.setupControls();

    // Запускаем AI если контроллер режим выключен
    if (!this.controllerMode) {
      this.characterAI = new CharacterAI(this);
      this.characterAI.start();
    }
  }

  destroy() {
    // Останавливаем AI если он запущен
    if (this.characterAI) {
      this.characterAI.stop();
      this.characterAI = null;
    }

    if (this.idleAnimationFn) {
      this.app.ticker.remove(this.idleAnimationFn);
    }
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
    }
    this.container.destroy({ children: true });
  }

  updateSection(section) {
    // Можно менять сцену в зависимости от выбранной секции
  }

  // Получить статус AI для отображения в UI
  getAIStatus() {
    if (this.characterAI) {
      return this.characterAI.getStatus();
    }
    return null;
  }
}
