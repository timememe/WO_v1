import { Graphics, Container, Sprite, Assets, Text, Texture, Rectangle } from 'pixi.js';
import { AnimatedGIF } from '@pixi/gif';
import { CharacterAI } from './CharacterAI';

export class IsometricScene {
  constructor(app) {
    this.app = app;

    // ═══════════════════════════════════════════════════════════════
    // СИСТЕМНЫЕ КОНТЕЙНЕРЫ
    // ═══════════════════════════════════════════════════════════════
    this.container = new Container();
    this.sortableContainer = new Container();
    this.sortableContainer.sortableChildren = true;

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ СЕТКИ И ТАЙЛОВ ПОЛА
    // ═══════════════════════════════════════════════════════════════
    this.gridSize = 10;                // Размер сетки (16x16 тайлов)
    this.tileWidth = 128;              // Ширина изометрического тайла
    this.tileHeight = 64;              // Высота изометрического тайла
    this.backgroundPadding = 6;       // Тайлов травы вокруг активной области

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ СТЕН
    // ═══════════════════════════════════════════════════════════════
    this.wallTileScale = 0.55;          // Масштаб тайла стены (1 = оригинальный размер)
    this.wallOffsetX = 0;              // Горизонтальное смещение стен
    this.wallOffsetY = 32.5;             // Вертикальное смещение стен

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ ЗДАНИЙ
    // ═══════════════════════════════════════════════════════════════
    this.buildingSize = 192;           // Размер текстуры здания (из атласа 512x512)
    this.buildingAnchorX = 0.5;        // Якорь X (0.5 = центр)
    this.buildingAnchorY = 0.75;       // Якорь Y (0.85 = ближе к низу)

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ ДЕРЕВЬЕВ И КУСТОВ
    // ═══════════════════════════════════════════════════════════════
    this.treeSizeMin = 96;             // Минимальный размер дерева
    this.treeSizeMax = 160;            // Максимальный размер дерева
    this.treeAnchorX = 0.5;            // Якорь X дерева
    this.treeAnchorY = 0.85;           // Якорь Y дерева
    this.bushSizeMin = 32;             // Минимальный размер куста
    this.bushSizeMax = 64;             // Максимальный размер куста
    this.bushAnchorX = 0.5;            // Якорь X куста
    this.bushAnchorY = 0.75;           // Якорь Y куста
    this.vegetationCount = 20;         // Количество деревьев и кустов

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ ПЕРСОНАЖА
    // ═══════════════════════════════════════════════════════════════
    this.spriteScale = 0.05;           // Масштаб спрайта персонажа
    this.spriteOffsetY = 10;           // Смещение спрайта относительно тени
    this.shadowOffsetY = 0;            // Смещение тени относительно позиции
    this.playerGridX = 5;              // Начальная позиция X на сетке
    this.playerGridY = 5;              // Начальная позиция Y на сетке
    this.moveSpeed = 0.15;             // Скорость движения (0-1)

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ КАМЕРЫ И УПРАВЛЕНИЯ
    // ═══════════════════════════════════════════════════════════════
    this.cameraSmoothing = 0.1;        // Плавность следования камеры (0-1)
    this.controllerMode = true;        // true = ручное управление, false = AI
    this.debugMode = false;            // Показывать debug графику

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ UI (БАББЛ АКТИВНОСТИ)
    // ═══════════════════════════════════════════════════════════════
    this.bubbleOffsetY = -40;          // Вертикальное смещение баббла
    this.bubbleGifScale = 0.5;         // Масштаб GIF анимации
    this.bubbleFramePadding = 8;       // Отступ рамки от GIF
    this.bubbleFrameColor = 0x000000;  // Цвет рамки
    this.bubbleFrameWidth = 3;         // Толщина рамки
    this.bubbleBackgroundColor = 0x000000;
    this.bubbleBackgroundAlpha = 0.7;

    // ═══════════════════════════════════════════════════════════════
    // ВНУТРЕННЕЕ СОСТОЯНИЕ (не трогать)
    // ═══════════════════════════════════════════════════════════════
    this.character = null;
    this.characterSprites = {};
    this.currentDirection = 'front-left';
    this.isMoving = false;
    this.characterAI = null;
    this.activityBubble = null;
    this.activityAnimations = {};
    this.backgroundTiles = [];
    this.walls = [];
    this.occupiedTiles = new Map(); // Карта занятых клеток: "x,y" -> objectType

    this.init();
  }

  // Загрузка текстурного атласа с парсингом размера тайла из имени файла
  // Форматы имени: "Name-WIDTHxHEIGHT.png", "Name - WIDTHxHEIGHT.png"
  // options.alternating = true - разделить на чётные/нечётные (left/right)
  async loadTileAtlas(path, options = {}) {
    const filename = path.split('/').pop();
    // Ищем паттерн WIDTHxHEIGHT перед расширением
    const match = filename.match(/(\d+)x(\d+)\.[^.]+$/);

    if (!match) {
      console.error(`Invalid atlas filename format: ${filename}. Expected: Name-WIDTHxHEIGHT.png`);
      return options.alternating ? { left: [], right: [] } : [];
    }

    const tileWidth = parseInt(match[1]);
    const tileHeight = parseInt(match[2]);

    const baseTexture = await Assets.load(path);
    const atlasWidth = baseTexture.width;
    const atlasHeight = baseTexture.height;

    const cols = Math.floor(atlasWidth / tileWidth);
    const rows = Math.floor(atlasHeight / tileHeight);

    const tiles = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const frame = new Rectangle(
          col * tileWidth,
          row * tileHeight,
          tileWidth,
          tileHeight
        );
        const tileTexture = new Texture({
          source: baseTexture.source,
          frame: frame,
          orig: frame,
        });
        tiles.push(tileTexture);
      }
    }

    console.log(`Loaded atlas ${filename}: ${cols}x${rows} = ${tiles.length} tiles (${tileWidth}x${tileHeight}), atlas size: ${atlasWidth}x${atlasHeight}`);

    // Если тайлы чередуются (левая/правая стена) - разделяем на два массива
    if (options.alternating) {
      const left = tiles.filter((_, i) => i % 2 === 0);
      const right = tiles.filter((_, i) => i % 2 === 1);
      console.log(`  -> Split to ${left.length} left + ${right.length} right tiles`);
      return { left, right };
    }

    return tiles;
  }

  // Загрузка атласа зданий (homes.png - 1024x1024, 4 изображения 512x512)
  // Порядок: [0] home, [1] projects, [2] cases, [3] cafe
  async loadBuildingsAtlas(path) {
    const baseTexture = await Assets.load(path);

    const tileSize = 512;
    const tiles = {};

    // Порядок в атласе (по строкам):
    // [0,0] home, [1,0] projects
    // [0,1] cases, [1,1] cafe
    const positions = {
      'home': { col: 0, row: 0 },
      'projects': { col: 1, row: 0 },
      'cases': { col: 0, row: 1 },
      'cafe': { col: 1, row: 1 }
    };

    for (const [name, pos] of Object.entries(positions)) {
      const frame = new Rectangle(
        pos.col * tileSize,
        pos.row * tileSize,
        tileSize,
        tileSize
      );
      tiles[name] = new Texture({
        source: baseTexture.source,
        frame: frame,
        orig: frame,
      });
    }

    console.log(`Loaded buildings atlas: ${Object.keys(tiles).join(', ')}`);
    return tiles;
  }

  // Загрузка атласа деревьев (trees.png - 1536x1024, спрайты 512x512)
  // Ряд 0: кусты (3 шт), Ряд 1: деревья (3 шт)
  async loadTreesAtlas(path) {
    const baseTexture = await Assets.load(path);

    const tileSize = 512;
    const cols = 3;
    const result = {
      bushes: [],
      trees: []
    };

    // Ряд 0 - кусты
    for (let col = 0; col < cols; col++) {
      const frame = new Rectangle(col * tileSize, 0, tileSize, tileSize);
      result.bushes.push(new Texture({
        source: baseTexture.source,
        frame: frame,
        orig: frame,
      }));
    }

    // Ряд 1 - деревья
    for (let col = 0; col < cols; col++) {
      const frame = new Rectangle(col * tileSize, tileSize, tileSize, tileSize);
      result.trees.push(new Texture({
        source: baseTexture.source,
        frame: frame,
        orig: frame,
      }));
    }

    console.log(`Loaded trees atlas: ${result.bushes.length} bushes, ${result.trees.length} trees`);
    return result;
  }

  async loadAssets() {
    try {
      // Загружаем атласы тайлов пола
      this.grassTiles = await this.loadTileAtlas('/assets/Floor_Grass_01-256x128.png');
      this.floorTiles = await this.loadTileAtlas('/assets/Floor_Wood_01-256x128.png');

      // Загружаем атлас зданий (homes.png - 1024x1024, 4 изображения 512x512)
      // [0,0] home, [1,0] projects, [0,1] cases, [1,1] cafe
      this.buildingTiles = await this.loadBuildingsAtlas('/assets/homes.png');

      // Загружаем атлас деревьев (trees.png - 1536x1024, спрайты 512x512)
      // Ряд 0: кусты, Ряд 1: деревья
      this.treeTiles = await this.loadTreesAtlas('/assets/trees.png');

      // Загружаем атласы стен интерьера (чередующиеся левая/правая)
      this.interiorWallsWindow = await this.loadTileAtlas('/assets/Thick_Brick_01_WindowA-SE-144x200.png', { alternating: true });
      this.interiorWalls = await this.loadTileAtlas('/assets/Thick_Brick_01-SE-144x200.png', { alternating: true });

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

      // Загружаем GIF анимации активностей через Assets
      // Assets.load() автоматически создаст AnimatedGIF объекты
      this.activityAnimations = {
        'sleep': await Assets.load('/assets/sleep.gif'),
        'eat': await Assets.load('/assets/eat.gif'),
        'work': await Assets.load('/assets/work.gif'),
        'cases': await Assets.load('/assets/cases.gif')
      };

      console.log('GIF animations loaded:', this.activityAnimations);

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

  // Создание фоновых тайлов (трава вокруг активной области)
  createBackgroundTiles() {
    this.backgroundTiles = [];

    // Создаём тайлы вокруг активной области
    const padding = this.backgroundPadding;

    for (let y = -padding; y < this.gridSize + padding; y++) {
      for (let x = -padding; x < this.gridSize + padding; x++) {
        // Пропускаем активную область (она создаётся отдельно)
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
          continue;
        }

        const tile = this.createTile(x, y, true); // true = фоновый тайл (трава)
        this.backgroundTiles.push(tile);
        this.container.addChild(tile);
      }
    }
  }

  // Создание стен на границах
  createWalls() {
    const totalWalls = this.gridSize;
    const midStart = Math.floor(totalWalls / 3);
    const midEnd = Math.floor(totalWalls * 2 / 3);

    // Стена вдоль Y=0 (верхняя правая граница в изометрии)
    for (let x = -1; x < this.gridSize - 1; x++) {
      const index = x + 1;
      const hasWindow = index >= midStart && index < midEnd;
      const wall = this.createWallSegment(x, -1, 'right', hasWindow);
      this.walls.push(wall);
      this.container.addChild(wall);
    }

    // Стена вдоль X=0 (верхняя левая граница в изометрии)
    for (let y = -1; y < this.gridSize - 1; y++) {
      const index = y + 1;
      const hasWindow = index >= midStart && index < midEnd;
      const wall = this.createWallSegment(-1, y, 'left', hasWindow);
      this.walls.push(wall);
      this.container.addChild(wall);
    }
  }

  // Создание одного сегмента стены из атласа текстур
  createWallSegment(gridX, gridY, side, hasWindow = false) {
    const wallContainer = new Container();
    const pos = this.isoToScreen(gridX, gridY);

    // Выбираем атлас в зависимости от наличия окна
    const wallAtlas = hasWindow ? this.interiorWallsWindow : this.interiorWalls;
    const tiles = side === 'right' ? wallAtlas.right : wallAtlas.left;

    if (tiles && tiles.length > 0) {
      // Берём первый тайл (можно рандомизировать позже)
      const texture = tiles[0];
      const wallSprite = new Sprite(texture);

      // Якорь внизу по центру
      wallSprite.anchor.set(0.5, 1);

      // Масштабируем с учётом глобального wallTileScale
      wallSprite.scale.set(this.wallTileScale);

      // Позиция относительно контейнера
      wallSprite.x = (side === 'right' ? this.tileWidth / 4 : -this.tileWidth / 4) + this.wallOffsetX;
      wallSprite.y = this.tileHeight / 2;

      wallContainer.addChild(wallSprite);
    } else {
      // Fallback на Graphics если текстуры нет
      const wall = new Graphics();
      const wallColor = side === 'right' ? 0x8B7355 : 0x6B5D47;

      if (side === 'right') {
        wall.moveTo(0, -this.wallHeight);
        wall.lineTo(this.tileWidth / 2, -this.wallHeight + this.tileHeight / 2);
        wall.lineTo(this.tileWidth / 2, this.tileHeight / 2);
        wall.lineTo(0, 0);
        wall.closePath();
      } else {
        wall.moveTo(0, -this.wallHeight);
        wall.lineTo(-this.tileWidth / 2, -this.wallHeight + this.tileHeight / 2);
        wall.lineTo(-this.tileWidth / 2, this.tileHeight / 2);
        wall.lineTo(0, 0);
        wall.closePath();
      }
      wall.fill({ color: wallColor, alpha: 0.9 });
      wallContainer.addChild(wall);
    }

    wallContainer.x = pos.x;
    wallContainer.y = pos.y + this.wallOffsetY;

    return wallContainer;
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

  // Создание изометрической плитки (спрайт из атласа)
  // isBackground = true для фоновых тайлов (трава), false для активных (пол)
  createTile(x, y, isBackground = false) {
    const tileContainer = new Container();

    // Выбираем атлас тайлов
    const tiles = isBackground ? this.grassTiles : this.floorTiles;

    if (tiles && tiles.length > 0) {
      // Выбираем тайл из атласа
      // const tileIndex = Math.floor(Math.random() * tiles.length); // рандом
      const tileIndex = 0; // фиксированный для отладки
      const texture = tiles[tileIndex];

      const tileSprite = new Sprite(texture);

      // Якорь в центре спрайта
      tileSprite.anchor.set(0.5, 0.5);

      // Масштабируем спрайт под размер тайла (256x128 -> tileWidth x tileHeight)
      const scaleX = this.tileWidth / texture.width;
      const scaleY = this.tileHeight / texture.height;
      tileSprite.scale.set(scaleX, scaleY);

      tileContainer.addChild(tileSprite);
    } else {
      // Fallback - цветной ромб если атлас не загружен
      const fallback = new Graphics();
      const color = isBackground ? 0x4a7c3f : 0x8B7355;
      fallback.moveTo(0, -this.tileHeight / 2);
      fallback.lineTo(this.tileWidth / 2, 0);
      fallback.lineTo(0, this.tileHeight / 2);
      fallback.lineTo(-this.tileWidth / 2, 0);
      fallback.closePath();
      fallback.fill({ color, alpha: 0.9 });
      tileContainer.addChild(fallback);
    }

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

  // Показать баббл с анимацией над локацией
  showActivityBubble(locationType) {
    // Скрываем персонажа полностью
    if (this.character) {
      this.character.visible = false;
      // Также скрываем все дочерние спрайты
      this.character.children.forEach(child => {
        if (child) child.visible = false;
      });
    }

    // Определяем какую анимацию показать
    let animationKey = null;
    switch (locationType) {
      case 'home':
        animationKey = 'sleep';
        break;
      case 'tree':
        animationKey = 'eat';
        break;
      case 'cafe':
        animationKey = 'eat';
        break;
      case 'projects':
        animationKey = 'work';
        break;
      case 'cases':
        animationKey = 'cases';
        break;
    }

    if (!animationKey || !this.activityAnimations[animationKey]) {
      console.error('Animation not found for key:', animationKey);
      return;
    }

    // Получаем предзагруженный AnimatedGIF
    const gifAnimation = this.activityAnimations[animationKey];

    // Создаем баббл если его еще нет
    if (!this.activityBubble) {
      this.activityBubble = new Container();
      this.sortableContainer.addChild(this.activityBubble);
    }

    // Очищаем предыдущее содержимое и уничтожаем старые элементы
    this.activityBubble.removeChildren().forEach(child => {
      if (child && child.destroy) {
        child.destroy({ children: true, texture: false, baseTexture: false });
      }
    });

    // Клонируем GIF для независимого воспроизведения
    const gif = gifAnimation.clone();
    gif.anchor.set(0.5, 0.5); // Якорь в центре
    gif.scale.set(this.bubbleGifScale);

    // Настройки анимации
    gif.loop = true;
    gif.animationSpeed = 1;
    gif.play();

    // Вычисляем размеры GIF после масштабирования
    const gifWidth = 270 * this.bubbleGifScale;
    const gifHeight = 270 * this.bubbleGifScale;

    // Создаем фон (черный квадрат с закругленными углами)
    const background = new Graphics();
    background.roundRect(
      -gifWidth / 2 - this.bubbleFramePadding,
      -gifHeight / 2 - this.bubbleFramePadding,
      gifWidth + this.bubbleFramePadding * 2,
      gifHeight + this.bubbleFramePadding * 2,
      8 // Радиус закругления
    );
    background.fill({ color: this.bubbleBackgroundColor, alpha: this.bubbleBackgroundAlpha });

    // Создаем рамку
    const frame = new Graphics();
    frame.roundRect(
      -gifWidth / 2 - this.bubbleFramePadding,
      -gifHeight / 2 - this.bubbleFramePadding,
      gifWidth + this.bubbleFramePadding * 2,
      gifHeight + this.bubbleFramePadding * 2,
      8 // Радиус закругления
    );
    frame.stroke({ width: this.bubbleFrameWidth, color: this.bubbleFrameColor, alpha: 1 });

    // Добавляем элементы в правильном порядке
    this.activityBubble.addChild(background);
    this.activityBubble.addChild(gif);
    this.activityBubble.addChild(frame);

    // Позиционируем баббл над персонажем с настраиваемым оффсетом
    const screenPos = this.isoToScreen(this.playerGridX, this.playerGridY);
    this.activityBubble.x = screenPos.x;
    this.activityBubble.y = screenPos.y + this.bubbleOffsetY;

    // Устанавливаем очень высокий zIndex чтобы баббл был поверх всего
    this.activityBubble.zIndex = 9999;
    this.activityBubble.visible = true;
  }

  // Скрыть баббл и показать персонажа
  hideActivityBubble() {
    // Скрываем и очищаем баббл
    if (this.activityBubble) {
      this.activityBubble.visible = false;
      // Уничтожаем содержимое баббла для освобождения памяти
      this.activityBubble.removeChildren().forEach(child => {
        if (child && child.destroy) {
          child.destroy({ children: true, texture: false, baseTexture: false });
        }
      });
    }

    // Показываем персонажа и все его спрайты
    if (this.character) {
      this.character.visible = true;
      // Показываем только активный спрайт направления
      this.character.children.forEach(child => {
        // Спрайты персонажа должны быть видимы только если это активное направление
        if (child && this.characterSprites) {
          const isActiveDirection = Object.values(this.characterSprites).includes(child) &&
                                   child === this.characterSprites[this.currentDirection];
          child.visible = isActiveDirection || !Object.values(this.characterSprites).includes(child);
        }
      });
    }
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

    // Проверка коллизий с объектами
    if (this.isTileOccupied(newX, newY)) {
      if (this.controllerMode) {
        // В режиме ручного управления - блокируем движение
        return;
      } else {
        // В режиме AI - скрываем персонажа перед входом на клетку объекта
        this.character.visible = false;
      }
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

  // Регистрация занятой клетки объектом
  registerOccupiedTile(x, y, objectType) {
    const key = `${x},${y}`;
    this.occupiedTiles.set(key, objectType);
  }

  // Проверка, занята ли клетка
  isTileOccupied(x, y) {
    const key = `${x},${y}`;
    return this.occupiedTiles.has(key);
  }

  // Получить тип объекта на клетке
  getObjectAtTile(x, y) {
    const key = `${x},${y}`;
    return this.occupiedTiles.get(key) || null;
  }

  // Создание здания из тайлов атласа (стены + крыша)
  createBuilding(x, y, wallIndex = 0, roofIndex = 0) {
    const buildingContainer = new Container();

    // В атласе чередуются: left, right, left, right...
    // left = чётные (0, 2, 4...), right = нечётные (1, 3, 5...)
    const leftWalls = this.buildingWalls?.left || [];
    const rightWalls = this.buildingWalls?.right || [];
    const roofs = this.roofTiles || [];

    // Левая стена
    if (leftWalls.length > 0) {
      const leftTexture = leftWalls[wallIndex % leftWalls.length];
      const leftSprite = new Sprite(leftTexture);
      leftSprite.anchor.set(1, 1); // Якорь в правом нижнем углу
      leftSprite.x = this.buildingWallOffsetX || 0;
      leftSprite.y = this.buildingWallOffsetY || 0;
      buildingContainer.addChild(leftSprite);
    }

    // Правая стена
    if (rightWalls.length > 0) {
      const rightTexture = rightWalls[wallIndex % rightWalls.length];
      const rightSprite = new Sprite(rightTexture);
      rightSprite.anchor.set(0, 1); // Якорь в левом нижнем углу
      rightSprite.x = this.buildingWallOffsetX || 0;
      rightSprite.y = this.buildingWallOffsetY || 0;
      buildingContainer.addChild(rightSprite);
    }

    // Крыша
    if (roofs.length > 0) {
      const roofTexture = roofs[roofIndex % roofs.length];
      const roofSprite = new Sprite(roofTexture);
      roofSprite.anchor.set(0.5, 1); // Якорь внизу по центру
      roofSprite.x = this.buildingRoofOffsetX || 0;
      // Позиция крыши - над стенами
      const wallHeight = leftWalls.length > 0 ? leftWalls[0].height : 96;
      roofSprite.y = -wallHeight + (this.buildingRoofOffsetY || 10);
      buildingContainer.addChild(roofSprite);
    }

    return buildingContainer;
  }

  // Создание декораций (деревья, камни, объекты и т.д.)
  createDecoration(x, y, type = 'tree') {
    const decorationContainer = new Container();

    // Конфигурация объектов
    // tileSize - сколько тайлов занимает объект (1 или 2 для 2x2)
    const objectConfig = {
      'projects': { type: 'building', tileSize: 2 },
      'home': { type: 'building', tileSize: 2 },
      'cases': { type: 'building', tileSize: 2 },
      'cafe': { type: 'building', tileSize: 2 },
      'tree': { type: 'tree', tileSize: 1 },
      'bush': { type: 'bush', tileSize: 1 },
    };

    const config = objectConfig[type];

    if (config && config.type === 'building' && this.buildingTiles && this.buildingTiles[type]) {
      // Создаём здание из нового атласа homes.png
      const buildingTexture = this.buildingTiles[type];
      const buildingSprite = new Sprite(buildingTexture);

      buildingSprite.anchor.set(this.buildingAnchorX, this.buildingAnchorY);

      // Масштабирование (512x512 -> нужный размер)
      const scale = this.buildingSize / 512;
      buildingSprite.scale.set(scale);

      decorationContainer.addChild(buildingSprite);
    } else if (config && config.type === 'tree' && this.treeTiles && this.treeTiles.trees.length > 0) {
      // Создаём дерево из атласа trees.png (случайное из 3)
      const trees = this.treeTiles.trees;
      const texture = trees[Math.floor(Math.random() * trees.length)];
      const treeSprite = new Sprite(texture);

      treeSprite.anchor.set(this.treeAnchorX, this.treeAnchorY);

      // Случайный размер в диапазоне treeSizeMin - treeSizeMax
      const randomSize = this.treeSizeMin + Math.random() * (this.treeSizeMax - this.treeSizeMin);
      const scale = randomSize / 512;
      treeSprite.scale.set(scale);

      decorationContainer.addChild(treeSprite);
    } else if (config && config.type === 'bush' && this.treeTiles && this.treeTiles.bushes.length > 0) {
      // Создаём куст из атласа trees.png (случайное из 3)
      const bushes = this.treeTiles.bushes;
      const texture = bushes[Math.floor(Math.random() * bushes.length)];
      const bushSprite = new Sprite(texture);

      bushSprite.anchor.set(this.bushAnchorX, this.bushAnchorY);

      // Случайный размер в диапазоне bushSizeMin - bushSizeMax
      const randomSize = this.bushSizeMin + Math.random() * (this.bushSizeMax - this.bushSizeMin);
      const scale = randomSize / 512;
      bushSprite.scale.set(scale);

      decorationContainer.addChild(bushSprite);
    } else if (config) {
      // Fallback если текстура не загрузилась
      const placeholder = new Graphics();
      const size = config.size || 64;
      placeholder.rect(-size/4, -size/4, size/2, size/2);
      placeholder.fill(0x888888);
      decorationContainer.addChild(placeholder);
    } else {
      // Fallback для неизвестных типов - простая графика
      const decoration = new Graphics();
      decoration.rect(-10, -10, 20, 20);
      decoration.fill(0xff00ff);
      decorationContainer.addChild(decoration);
    }

    // Если объект занимает 2x2 тайла, центрируем его на пересечении 4 тайлов
    const tileSize = config?.tileSize || 1;
    let centerX = x;
    let centerY = y;

    if (tileSize === 2) {
      // Смещаем центр на 0.5 тайла в обе стороны для центрирования на пересечении
      centerX = x + 0.5;
      centerY = y + 0.5;
    }

    // Позиционируем весь контейнер в центр тайла (или пересечение 4 тайлов)
    const screenPos = this.isoToScreen(centerX, centerY);
    decorationContainer.x = screenPos.x;
    decorationContainer.y = screenPos.y;

    // Сохраняем координаты сетки для сортировки по глубине
    decorationContainer.gridX = centerX;
    decorationContainer.gridY = centerY;

    // zIndex считается от "нижней" точки объекта (ближайшей к камере)
    // Для 1x1: x + y, для 2x2: (x+1) + (y+1) = x + y + 2
    const bottomX = x + tileSize - 1;
    const bottomY = y + tileSize - 1;
    decorationContainer.zIndex = bottomX + bottomY;

    // Регистрируем занятые клетки
    for (let dx = 0; dx < tileSize; dx++) {
      for (let dy = 0; dy < tileSize; dy++) {
        this.registerOccupiedTile(x + dx, y + dy, type);
      }
    }

    return decorationContainer;
  }

  // Создание случайной растительности вокруг активного поля
  createVegetation() {
    const padding = this.backgroundPadding;
    const count = this.vegetationCount;
    const placed = [];

    // Собираем все возможные позиции в зоне backgroundPadding
    const availablePositions = [];

    for (let y = -padding; y < this.gridSize + padding; y++) {
      for (let x = -padding; x < this.gridSize + padding; x++) {
        // Пропускаем активную область
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
          continue;
        }
        availablePositions.push({ x, y });
      }
    }

    // Перемешиваем позиции
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }

    // Размещаем растительность
    for (let i = 0; i < Math.min(count, availablePositions.length); i++) {
      const pos = availablePositions[i];
      // 50% деревья, 50% кусты
      const type = Math.random() < 0.5 ? 'tree' : 'bush';
      const decoration = this.createDecoration(pos.x, pos.y, type);
      this.sortableContainer.addChild(decoration);
      placed.push(decoration);
    }

    console.log(`Placed ${placed.length} vegetation items (trees and bushes)`);
    return placed;
  }

  async init() {
    // Загружаем ассеты
    await this.loadAssets();

    // Добавляем фоновые тайлы (трава вокруг)
    this.createBackgroundTiles();

    // Добавляем стены на границах (временно отключено)
    // this.createWalls();

    // Создаем изометрическую сетку из тайлов
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const tile = this.createTile(x, y);
        this.container.addChild(tile);
      }
    }

    // Добавляем контейнер для сортируемых объектов поверх тайлов
    this.container.addChild(this.sortableContainer);

    // Добавляем здания в сортируемый контейнер
    this.sortableContainer.addChild(this.createDecoration(2, 7, 'projects'));
    this.sortableContainer.addChild(this.createDecoration(4, 2, 'home'));
    this.sortableContainer.addChild(this.createDecoration(6, 5, 'cases'));
    this.sortableContainer.addChild(this.createDecoration(1, 4, 'cafe'));

    // Добавляем случайную растительность вокруг активного поля
    this.createVegetation();

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

    // Очищаем фоновые тайлы
    if (this.backgroundTiles) {
      this.backgroundTiles.forEach(tile => tile.destroy());
      this.backgroundTiles = [];
    }

    // Очищаем стены
    this.walls.forEach(wall => wall.destroy());
    this.walls = [];

    // Очищаем баббл
    if (this.activityBubble) {
      this.activityBubble.destroy({ children: true });
      this.activityBubble = null;
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
