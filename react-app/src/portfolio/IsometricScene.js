import { Graphics, Container, Sprite, Text } from 'pixi.js';
import { AnimatedGIF } from '@pixi/gif';
import { CharacterAI } from './CharacterAI';

export class IsometricScene {
  constructor(app, rootContainer = null, assetManager = null) {
    this.app = app;
    this.rootContainer = rootContainer || this.app.stage;
    this.assetManager = assetManager;

    // ═══════════════════════════════════════════════════════════════
    // СИСТЕМНЫЕ КОНТЕЙНЕРЫ
    // ═══════════════════════════════════════════════════════════════
    this.container = new Container();
    this.sortableContainer = new Container();
    this.sortableContainer.sortableChildren = true;

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ СЕТКИ И ТАЙЛОВ ПОЛА
    // ═══════════════════════════════════════════════════════════════
    this.gridSize = 12;                // Размер сетки (16x16 тайлов)
    this.tileWidth = 128;              // Ширина изометрического тайла
    this.tileHeight = 64;              // Высота изометрического тайла
    this.grassTileScale = 0.27;        // Масштаб тайла травы (512 * 0.25 = 128)
    this.backgroundPadding = 8;        // Тайлов травы вокруг активной области

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
    this.buildingAnchorY = 0.5;       // Якорь Y (0.85 = ближе к низу)
    this.buildingLocations = {
      home: { x: 6, y: 2, type: 'home', size: 2 },
      projects: { x: 2, y: 7, type: 'projects', size: 2 },
      cases: { x: 6, y: 6, type: 'cases', size: 2 },
      cafe: { x: 1, y: 2, type: 'cafe', size: 2 },
    };

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ ДЕРЕВЬЕВ, КУСТОВ И КАМНЕЙ
    // ═══════════════════════════════════════════════════════════════
    this.treeSizeMin = 96;             // Минимальный размер дерева
    this.treeSizeMax = 160;            // Максимальный размер дерева
    this.treeAnchorX = 0.5;            // Якорь X дерева
    this.treeAnchorY = 0.85;           // Якорь Y дерева
    this.bushSizeMin = 32;             // Минимальный размер куста
    this.bushSizeMax = 64;             // Максимальный размер куста
    this.bushAnchorX = 0.5;            // Якорь X куста
    this.bushAnchorY = 0.75;           // Якорь Y куста
    this.rockSizeMin = 64;             // Минимальный размер камня
    this.rockSizeMax = 128;             // Максимальный размер камня
    this.rockAnchorX = 0.5;            // Якорь X камня
    this.rockAnchorY = 0.7;            // Якорь Y камня
    this.vegetationCount = 250;        // Количество деревьев, кустов и камней

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ ПЕРСОНАЖА
    // ═══════════════════════════════════════════════════════════════
    this.spriteScale = 0.2;            // Масштаб спрайта персонажа
    this.spriteOffsetY = 10;           // Смещение спрайта относительно тени
    this.shadowOffsetY = 20;            // Смещение тени относительно позиции
    this.ufoScale = 0.12;              // Масштаб UFO спрайта (512x512)
    this.ufoOffsetY = -10;               // Смещение UFO относительно тени
    this.playerX = 4.0;                // Позиция X (float, свободное движение)
    this.playerY = 4.0;                // Позиция Y (float, свободное движение)
    this.playerSpeed = 0.04;           // Скорость свободного движения
    this.playerCollisionRadius = 0.1;  // Радиус коллизии персонажа

    // ═══════════════════════════════════════════════════════════════
    // НАСТРОЙКИ КАМЕРЫ И УПРАВЛЕНИЯ
    // ═══════════════════════════════════════════════════════════════
    this.cameraSmoothing = 0.05;        // Плавность следования камеры (0-1)
    this.controllerMode = false;        // true = ручное управление, false = AI
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
    // НАСТРОЙКИ CRT ШЕЙДЕРА
    // ═══════════════════════════════════════════════════════════════
    this.crtEnabled = true;            // Включить CRT эффект
    this.crtCurvature = 12.0;           // Искривление экрана (больше = меньше искривления)
    this.crtScanlineIntensity = 0.15;  // Интенсивность scanlines (0-1)
    this.crtScanlineCount = 1200.0;     // Количество scanlines
    this.crtVignette = 0.25;           // Затемнение по краям (0-1)
    this.crtBrightness = 1.3;          // Яркость
    this.crtChromaOffset = 0.8;        // Хроматическая аберрация

    // ═══════════════════════════════════════════════════════════════
    // ВНУТРЕННЕЕ СОСТОЯНИЕ (не трогать)
    // ═══════════════════════════════════════════════════════════════
    this.character = null;
    this.characterSprites = {};
    this.currentDirection = 'down';
    this.isMoving = false;
    this.cameraTarget = null;
    this.characterAI = null;
    this.activityBubble = null;
    this.activityAnimations = {};
    this.ufoTexture = null;
    this.isPaused = false;
    this.aiWasRunning = false;
    this.backgroundTiles = [];
    this.walls = [];
    this.occupiedTiles = new Map(); // Карта занятых клеток: "x,y" -> objectType
    this.pathDebugGraphics = null; // Графика для отображения пути AI

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
      'projects': { col: 1, row: 1 },
      'cases': { col: 0, row: 1 },
      'cafe': { col: 1, row: 0 }
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

  // Загрузка атласа камней (rocks.png - 1024x1024, спрайты 512x512 = 4 камня)
  async loadRocksAtlas(path) {
    const baseTexture = await Assets.load(path);

    const tileSize = 512;
    const rocks = [];

    // 2x2 сетка камней
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const frame = new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize);
        rocks.push(new Texture({
          source: baseTexture.source,
          frame: frame,
          orig: frame,
        }));
      }
    }

    console.log(`Loaded rocks atlas: ${rocks.length} rocks`);
    return rocks;
  }

  // Загрузка атласа травы (grass.png - 1536x1536, спрайты 512x512 = 9 тайлов)
  async loadGrassAtlas(path) {
    const baseTexture = await Assets.load(path);

    const tileSize = 512;
    const grass = [];

    // 3x3 сетка травы
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const frame = new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize);
        grass.push(new Texture({
          source: baseTexture.source,
          frame: frame,
          orig: frame,
        }));
      }
    }

    console.log(`Loaded grass atlas: ${grass.length} tiles`);
    return grass;
  }

  // Загрузка атласа персонажа (idle.png - 2560x512, спрайты 512x512 = 5 направлений)
  // 1-down, 2-down-right, 3-right, 4-up-right, 5-up
  // 2,3,4 зеркалируются для противоположных направлений
  async loadCharacterAtlas(path) {
    const baseTexture = await Assets.load(path);

    const tileSize = 512;
    const textures = [];

    // 5 спрайтов в ряд
    for (let col = 0; col < 5; col++) {
      const frame = new Rectangle(col * tileSize, 0, tileSize, tileSize);
      textures.push(new Texture({
        source: baseTexture.source,
        frame: frame,
        orig: frame,
      }));
    }

    // Создаём спрайты для всех 8 направлений
    const sprites = {};

    // down (1) - без зеркала
    sprites['down'] = Sprite.from(textures[0]);
    sprites['down'].scale.set(this.spriteScale);

    // down-right (2) - оригинал
    sprites['down-right'] = Sprite.from(textures[1]);
    sprites['down-right'].scale.set(this.spriteScale);

    // down-left (2) - зеркало
    sprites['down-left'] = Sprite.from(textures[1]);
    sprites['down-left'].scale.set(-this.spriteScale, this.spriteScale);

    // right (3) - оригинал
    sprites['right'] = Sprite.from(textures[2]);
    sprites['right'].scale.set(this.spriteScale);

    // left (3) - зеркало
    sprites['left'] = Sprite.from(textures[2]);
    sprites['left'].scale.set(-this.spriteScale, this.spriteScale);

    // up-right (4) - оригинал
    sprites['up-right'] = Sprite.from(textures[3]);
    sprites['up-right'].scale.set(this.spriteScale);

    // up-left (4) - зеркало
    sprites['up-left'] = Sprite.from(textures[3]);
    sprites['up-left'].scale.set(-this.spriteScale, this.spriteScale);

    // up (5) - без зеркала
    sprites['up'] = Sprite.from(textures[4]);
    sprites['up'].scale.set(this.spriteScale);

    console.log(`Loaded character atlas: 8 directions from 5 sprites`);
    return sprites;
  }

  async loadAssets() {
    if (!this.assetManager) {
      console.error('IsometricScene: AssetManager not provided');
      this.createFallbackSprites();
      return false;
    }

    try {
      // Получаем предзагруженные ассеты из AssetManager
      this.grassTiles = this.assetManager.getGrassTiles();
      this.buildingTiles = this.assetManager.getBuildingTiles();
      this.treeTiles = this.assetManager.getTreeTiles();
      this.rockTiles = this.assetManager.getRockTiles();
      this.ufoTexture = this.assetManager.getUfoTexture();
      this.activityAnimations = this.assetManager.getActivityAnimations();

      // Создаём спрайты персонажа из предзагруженных текстур
      const characterData = this.assetManager.getCharacterTextures();
      this.characterSprites = {};

      for (const [direction, data] of Object.entries(characterData)) {
        const sprite = Sprite.from(data.texture);
        if (data.mirror) {
          sprite.scale.set(-this.spriteScale, this.spriteScale);
        } else {
          sprite.scale.set(this.spriteScale);
        }
        this.characterSprites[direction] = sprite;
      }

      console.log('IsometricScene: Assets loaded from AssetManager');
      return true;
    } catch (error) {
      console.error('Failed to load assets from AssetManager:', error);
      this.createFallbackSprites();
      return false;
    }
  }

  createFallbackSprites() {
    // Создаем простые графические объекты если изображения не загрузились (8 направлений)
    const colors = {
      'down': 0x667eea,
      'down-right': 0x5a7dd4,
      'down-left': 0x7380f0,
      'right': 0x4ecdc4,
      'left': 0x45b7af,
      'up-right': 0xffe66d,
      'up-left': 0xffd93d,
      'up': 0xff6b6b
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

    // Создаём тайлы для всей области (активная + padding)
    const padding = this.backgroundPadding;

    for (let y = -padding; y < this.gridSize + padding; y++) {
      for (let x = -padding; x < this.gridSize + padding; x++) {
        const isBackground = !(x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize);
        const tile = this.createTile(x, y, isBackground);
        if (isBackground) {
          this.backgroundTiles.push(tile);
        }
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
    const pos = this.getTileCenter(gridX, gridY);

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

  // Конвертация grid-координат в экранные (изометрическая проекция)
  // ВАЖНО: координаты (x, y) - это точная позиция в grid-пространстве
  // Для центра тайла (3, 5) передавайте (3.5, 5.5)
  // Для верхней точки ромба тайла (3, 5) передавайте (3, 5)
  isoToScreen(x, y) {
    const screenX = (x - y) * (this.tileWidth / 2);
    const screenY = (x + y) * (this.tileHeight / 2);
    return { x: screenX, y: screenY };
  }

  // Получить экранные координаты ЦЕНТРА тайла
  getTileCenter(tileX, tileY) {
    return this.isoToScreen(tileX + 0.5, tileY + 0.5);
  }

  // Создание изометрической плитки (спрайт из атласа)
  // isBackground = true для фоновых тайлов (трава), false для активных (пол)
  createTile(x, y, isBackground = false) {
    const tileContainer = new Container();

    // Выбираем атлас тайлов
    const tiles = isBackground ? this.grassTiles : this.grassTiles; //floorTiles

    if (tiles && tiles.length > 0) {
      // Выбираем случайный тайл из атласа
      const tileIndex = Math.floor(Math.random() * tiles.length);
      const texture = tiles[tileIndex];

      const tileSprite = new Sprite(texture);

      // Якорь в центре спрайта
      tileSprite.anchor.set(0.5, 0.5);

      // Равномерное масштабирование (сохраняем пропорции изометрического тайла)
      tileSprite.scale.set(this.grassTileScale);

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
          fontSize: 30,
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

    // Позиционируем тайл в центре
    const screenPos = this.getTileCenter(x, y);
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

      // Визуализация радиуса коллизии (изометрический ромб)
      // В grid-координатах это круг радиусом playerCollisionRadius
      // В изометрии круг превращается в ромб
      const collisionViz = new Graphics();
      const r = this.playerCollisionRadius;
      // Конвертируем 4 точки круга в grid-пространстве в экранные координаты
      // Точки: (r, 0), (0, r), (-r, 0), (0, -r) относительно центра персонажа
      const p1 = { x: r * (this.tileWidth / 2), y: r * (this.tileHeight / 2) };      // (+r, 0)
      const p2 = { x: -r * (this.tileWidth / 2), y: r * (this.tileHeight / 2) };     // (0, +r)
      const p3 = { x: -r * (this.tileWidth / 2), y: -r * (this.tileHeight / 2) };    // (-r, 0)
      const p4 = { x: r * (this.tileWidth / 2), y: -r * (this.tileHeight / 2) };     // (0, -r)

      collisionViz.moveTo(p1.x, p1.y);
      collisionViz.lineTo(p2.x, p2.y);
      collisionViz.lineTo(p3.x, p3.y);
      collisionViz.lineTo(p4.x, p4.y);
      collisionViz.lineTo(p1.x, p1.y);
      collisionViz.stroke({ width: 2, color: 0xff0000, alpha: 0.8 });
      collisionViz.fill({ color: 0xff0000, alpha: 0.2 });
      character.addChild(collisionViz);
    }

    // Тень под персонажем
    const shadow = new Graphics();
    shadow.ellipse(0, this.shadowOffsetY, 25, 10);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    character.addChild(shadow);

    if (this.ufoTexture) {
      const ufo = new Sprite(this.ufoTexture);
      ufo.anchor.set(0.5, 0.5);
      ufo.scale.set(this.ufoScale);
      ufo.y = this.shadowOffsetY + this.ufoOffsetY;
      character.addChild(ufo);
    }

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
      const basePos = this.isoToScreen(this.playerX, this.playerY);
      character.y = basePos.y - bounceOffset; // Минус, чтобы прыгал вверх

      // Обновляем камеру каждый кадр для плавного следования
      this.updateCamera();

      // Debug: отрисовка пути AI
      this.drawPathDebug();
    };
    this.app.ticker.add(this.idleAnimationFn);

    return character;
  }

  // Обновление позиции персонажа на экране
  updateCharacterPosition() {
    if (!this.character) return;

    const screenPos = this.isoToScreen(this.playerX, this.playerY);
    this.character.x = screenPos.x;
    this.character.y = screenPos.y;

    // Обновляем zIndex для правильной сортировки по глубине
    this.character.zIndex = this.playerX + this.playerY;
  }

  // Обновление позиции камеры (плавное следование за игроком)
  updateCamera() {
    if (!this.character && !this.cameraTarget) return;

    let focusX = 0;
    let focusY = 0;

    if (this.cameraTarget) {
      const screenPos = this.isoToScreen(this.cameraTarget.x, this.cameraTarget.y);
      focusX = screenPos.x;
      focusY = screenPos.y;
    } else if (this.character) {
      focusX = this.character.x;
      focusY = this.character.y;
    }

    // Целевая позиция контейнера - фокус в центре экрана
    const targetX = this.app.screen.width / 2 - focusX;
    const targetY = this.app.screen.height / 2 - focusY;

    // Плавная интерполяция камеры
    this.container.x += (targetX - this.container.x) * this.cameraSmoothing;
    this.container.y += (targetY - this.container.y) * this.cameraSmoothing;
  }

  setCameraTarget(target) {
    if (!target) {
      this.cameraTarget = null;
      return;
    }
    this.cameraTarget = { x: target.x, y: target.y };
  }

  getLocationCenter(location) {
    if (!location) return null;
    const size = location.size || 1;
    return { x: location.x + size / 2, y: location.y + size / 2 };
  }

  // Получить координаты входного тайла для здания
  // Входной тайл - это самый "левый" тайл в изометрии (минимальный screenX)
  // Для здания с позицией (x, y) и размером size это тайл (x, y + size - 1)
  getEntryTile(location) {
    if (!location) return null;
    const size = location.size || 1;
    // Самый левый тайл: x остаётся, y максимальный
    const entryTileX = location.x;
    const entryTileY = location.y + size - 1;
    // Возвращаем центр тайла
    return {
      x: entryTileX + 0.5,
      y: entryTileY + 0.5,
      tileX: entryTileX,
      tileY: entryTileY
    };
  }

  // Debug: отрисовка текущего пути AI
  drawPathDebug() {
    if (!this.debugMode || !this.characterAI) return;

    // Создаём графику если ещё нет
    if (!this.pathDebugGraphics) {
      this.pathDebugGraphics = new Graphics();
      this.pathDebugGraphics.zIndex = 9998; // Поверх всего кроме баббла
      this.sortableContainer.addChild(this.pathDebugGraphics);
    }

    // Очищаем предыдущий путь
    this.pathDebugGraphics.clear();

    const path = this.characterAI.currentPath;
    const currentIndex = this.characterAI.currentPathIndex;

    if (!path || path.length === 0) return;

    // Рисуем линию пути
    // Waypoints хранятся как центры тайлов (3.5, 5.5) - передаём напрямую в isoToScreen
    for (let i = currentIndex; i < path.length; i++) {
      const point = path[i];
      const screenPos = this.isoToScreen(point.x, point.y);

      if (i === currentIndex) {
        // Первая точка - начинаем от текущей позиции персонажа
        const playerScreen = this.isoToScreen(this.playerX, this.playerY);
        this.pathDebugGraphics.moveTo(playerScreen.x, playerScreen.y);
        this.pathDebugGraphics.lineTo(screenPos.x, screenPos.y);
      } else {
        const prevPoint = path[i - 1];
        const prevScreen = this.isoToScreen(prevPoint.x, prevPoint.y);
        this.pathDebugGraphics.moveTo(prevScreen.x, prevScreen.y);
        this.pathDebugGraphics.lineTo(screenPos.x, screenPos.y);
      }
    }
    this.pathDebugGraphics.stroke({ width: 3, color: 0xff6600, alpha: 0.8 });

    // Рисуем точки waypoints
    for (let i = currentIndex; i < path.length; i++) {
      const point = path[i];
      const screenPos = this.isoToScreen(point.x, point.y);

      // Цвет: оранжевый для промежуточных, зелёный для конечной
      const isLast = i === path.length - 1;
      const color = isLast ? 0x00ff00 : 0xff6600;

      this.pathDebugGraphics.circle(screenPos.x, screenPos.y, isLast ? 8 : 5);
      this.pathDebugGraphics.fill({ color, alpha: 1.0 });
      this.pathDebugGraphics.stroke({ width: 2, color: 0x000000, alpha: 1.0 });
    }
  }

  // Показать баббл с анимацией над локацией
  showActivityBubble(locationType, location) {
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

    const locationCenter = this.getLocationCenter(location);
    if (locationCenter) {
      this.setCameraTarget(locationCenter);
    }

    // Позиционируем баббл по центру объекта или персонажа
    // locationCenter уже содержит центр (x + size/2, y + size/2)
    // playerX/playerY - точные координаты
    const anchor = locationCenter || { x: this.playerX, y: this.playerY };
    const screenPos = this.isoToScreen(anchor.x, anchor.y);
    const bubbleOffset = locationCenter ? 0 : this.bubbleOffsetY;
    this.activityBubble.x = screenPos.x;
    this.activityBubble.y = screenPos.y + bubbleOffset;

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
    this.setCameraTarget(null);

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

    const newX = this.playerX + dx;
    const newY = this.playerY + dy;

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

  // Определение направления спрайта по вектору движения (8 направлений)
  updateDirectionByMovement(dx, dy) {
    // Изометрические направления (сетка -> экран):
    // dx=1, dy=0   -> down-right (по X+)
    // dx=-1, dy=0  -> up-left (по X-)
    // dx=0, dy=1   -> down-left (по Y+)
    // dx=0, dy=-1  -> up-right (по Y-)
    // dx=1, dy=1   -> down (диагональ вниз)
    // dx=-1, dy=-1 -> up (диагональ вверх)
    // dx=1, dy=-1  -> right (диагональ вправо)
    // dx=-1, dy=1  -> left (диагональ влево)

    if (dx === 1 && dy === 0) {
      this.setCharacterDirection('down-right');
    } else if (dx === -1 && dy === 0) {
      this.setCharacterDirection('up-left');
    } else if (dx === 0 && dy === 1) {
      this.setCharacterDirection('down-left');
    } else if (dx === 0 && dy === -1) {
      this.setCharacterDirection('up-right');
    } else if (dx === 1 && dy === 1) {
      this.setCharacterDirection('down');
    } else if (dx === -1 && dy === -1) {
      this.setCharacterDirection('up');
    } else if (dx === 1 && dy === -1) {
      this.setCharacterDirection('right');
    } else if (dx === -1 && dy === 1) {
      this.setCharacterDirection('left');
    }
  }

  // Плавная анимация движения
  animateMovement(targetX, targetY) {
    this.isMoving = true;

    const startPos = this.isoToScreen(this.playerX, this.playerY);
    const endPos = this.isoToScreen(targetX, targetY);

    let progress = 0;

    const animateTicker = () => {
      progress += this.moveSpeed;

      if (progress >= 1) {
        // Движение завершено
        this.playerX = targetX;
        this.playerY = targetY;
        this.character.x = endPos.x;
        this.character.y = endPos.y;

        // Обновляем zIndex для правильной сортировки по глубине
        this.character.zIndex = this.playerX + this.playerY;

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

  // ═══════════════════════════════════════════════════════════════
  // СТАРЫЙ КОНТРОЛЛЕР (grid-based движение)
  // ═══════════════════════════════════════════════════════════════
  /*
  setupControls_GridBased() {
    if (!this.controllerMode) return;

    this.keysPressed = { up: false, down: false, left: false, right: false };

    const handleKeyDown = (e) => {
      if (this.isMoving) return;
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.keysPressed.up = true;
      if (key === 's' || key === 'arrowdown') this.keysPressed.down = true;
      if (key === 'a' || key === 'arrowleft') this.keysPressed.left = true;
      if (key === 'd' || key === 'arrowright') this.keysPressed.right = true;

      let dx = 0, dy = 0;
      if (this.keysPressed.up) { dx -= 1; dy -= 1; }
      if (this.keysPressed.down) { dx += 1; dy += 1; }
      if (this.keysPressed.left) { dx -= 1; dy += 1; }
      if (this.keysPressed.right) { dx += 1; dy -= 1; }
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));
      if (dx !== 0 || dy !== 0) this.movePlayer(dx, dy);
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.keysPressed.up = false;
      if (key === 's' || key === 'arrowdown') this.keysPressed.down = false;
      if (key === 'a' || key === 'arrowleft') this.keysPressed.left = false;
      if (key === 'd' || key === 'arrowright') this.keysPressed.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    this.keyDownHandler = handleKeyDown;
    this.keyUpHandler = handleKeyUp;
  }
  */

  // ═══════════════════════════════════════════════════════════════
  // НОВЫЙ КОНТРОЛЛЕР (свободное движение с коллизиями)
  // ═══════════════════════════════════════════════════════════════
  setupControls() {
    if (!this.controllerMode) {
      return;
    }

    // Состояние нажатых клавиш
    this.keysPressed = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // Velocity персонажа
    this.velocityX = 0;
    this.velocityY = 0;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.keysPressed.up = true;
      if (key === 's' || key === 'arrowdown') this.keysPressed.down = true;
      if (key === 'a' || key === 'arrowleft') this.keysPressed.left = true;
      if (key === 'd' || key === 'arrowright') this.keysPressed.right = true;
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.keysPressed.up = false;
      if (key === 's' || key === 'arrowdown') this.keysPressed.down = false;
      if (key === 'a' || key === 'arrowleft') this.keysPressed.left = false;
      if (key === 'd' || key === 'arrowright') this.keysPressed.right = false;
    };

    // Главный цикл движения
    this.movementTickerFn = () => {
      // Вычисляем направление движения (изометрический маппинг)
      let dx = 0;
      let dy = 0;

      if (this.keysPressed.up) { dx -= 1; dy -= 1; }
      if (this.keysPressed.down) { dx += 1; dy += 1; }
      if (this.keysPressed.left) { dx -= 1; dy += 1; }
      if (this.keysPressed.right) { dx += 1; dy -= 1; }

      // Нормализуем по ЭКРАННОЙ длине для одинаковой визуальной скорости
      // Изометрическая проекция: screenX = (dx-dy)*tw/2, screenY = (dx+dy)*th/2
      // Без этого движение влево/вправо визуально в 2 раза быстрее (tileWidth/tileHeight = 2)
      if (dx !== 0 || dy !== 0) {
        const screenDX = (dx - dy) * (this.tileWidth / 2);
        const screenDY = (dx + dy) * (this.tileHeight / 2);
        const screenLen = Math.sqrt(screenDX * screenDX + screenDY * screenDY);

        // Масштабируем к базовой screen-длине (tileHeight = длина для направления W/S)
        const baseScreenLen = this.tileHeight;
        const scale = baseScreenLen / screenLen;
        dx *= scale;
        dy *= scale;
      }

      // Обновляем направление спрайта
      if (dx !== 0 || dy !== 0) {
        this.updateDirectionFromVelocity(dx, dy);
        this.isMoving = true;
      } else {
        this.isMoving = false;
      }

      // Применяем скорость
      const speed = this.playerSpeed;
      let newX = this.playerX + dx * speed;
      let newY = this.playerY + dy * speed;

      // Проверяем коллизии и границы
      const collision = this.checkCollision(newX, newY);

      if (!collision.x) {
        this.playerX = newX;
      }
      if (!collision.y) {
        this.playerY = newY;
      }

      // Обновляем позицию персонажа на экране
      this.updateCharacterPosition();
    };

    this.app.ticker.add(this.movementTickerFn);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    this.keyDownHandler = handleKeyDown;
    this.keyUpHandler = handleKeyUp;
  }

  // Проверка пересечения круга персонажа с границами тайла (AABB)
  checkCircleTileCollision(cx, cy, radius, tileX, tileY) {
    // Тайл (tileX, tileY) визуально центрирован на координатах (tileX, tileY)
    // Его границы в grid-координатах: [tileX-0.5, tileX+0.5] x [tileY-0.5, tileY+0.5]
    const minX = tileX - 0.5;
    const maxX = tileX + 0.5;
    const minY = tileY - 0.5;
    const maxY = tileY + 0.5;

    // Находим ближайшую точку на границе тайла к центру круга
    const closestX = Math.max(minX, Math.min(cx, maxX));
    const closestY = Math.max(minY, Math.min(cy, maxY));

    // Проверяем расстояние до ближайшей точки
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;

    return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
  }

  // Проверка коллизий с объектами и границами
  checkCollision(newX, newY) {
    const radius = this.playerCollisionRadius;
    const result = { x: false, y: false };

    // Проверка границ поля
    if (newX - radius < 0 || newX + radius >= this.gridSize) {
      result.x = true;
    }
    if (newY - radius < 0 || newY + radius >= this.gridSize) {
      result.y = true;
    }

    // Проверка коллизий с объектами (занятые тайлы)
    // Проверяем пересечение круга персонажа с границами занятых тайлов

    // Проверка по X (новая позиция X, текущая Y)
    const tilesX = this.getTilesInRadius(newX, this.playerY, radius);
    for (const tile of tilesX) {
      if (this.isTileOccupied(tile.x, tile.y)) {
        // Проверяем реальное пересечение круга с границами тайла
        if (this.checkCircleTileCollision(newX, this.playerY, radius, tile.x, tile.y)) {
          result.x = true;
          break;
        }
      }
    }

    // Проверка по Y (текущая X, новая позиция Y)
    const tilesY = this.getTilesInRadius(this.playerX, newY, radius);
    for (const tile of tilesY) {
      if (this.isTileOccupied(tile.x, tile.y)) {
        // Проверяем реальное пересечение круга с границами тайла
        if (this.checkCircleTileCollision(this.playerX, newY, radius, tile.x, tile.y)) {
          result.y = true;
          break;
        }
      }
    }

    return result;
  }

  // Получить тайлы в радиусе от позиции
  getTilesInRadius(x, y, radius) {
    const tiles = [];
    // Тайлы центрированы: тайл (tx, ty) имеет границы [tx-0.5, tx+0.5] x [ty-0.5, ty+0.5]
    // Нужно найти все тайлы, чьи границы могут пересекаться с кругом персонажа
    const minX = Math.ceil(x - radius - 0.5);
    const maxX = Math.floor(x + radius + 0.5);
    const minY = Math.ceil(y - radius - 0.5);
    const maxY = Math.floor(y + radius + 0.5);

    for (let tx = minX; tx <= maxX; tx++) {
      for (let ty = minY; ty <= maxY; ty++) {
        tiles.push({ x: tx, y: ty });
      }
    }
    return tiles;
  }

  // Определение направления спрайта по velocity (8 направлений)
  updateDirectionFromVelocity(dx, dy) {
    // Вычисляем угол и определяем направление
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // 8 направлений по углу
    let direction;
    if (angle >= -22.5 && angle < 22.5) {
      direction = 'down-right';
    } else if (angle >= 22.5 && angle < 67.5) {
      direction = 'down';
    } else if (angle >= 67.5 && angle < 112.5) {
      direction = 'down-left';
    } else if (angle >= 112.5 && angle < 157.5) {
      direction = 'left';
    } else if (angle >= 157.5 || angle < -157.5) {
      direction = 'up-left';
    } else if (angle >= -157.5 && angle < -112.5) {
      direction = 'up';
    } else if (angle >= -112.5 && angle < -67.5) {
      direction = 'up-right';
    } else {
      direction = 'right';
    }

    this.setCharacterDirection(direction);
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
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    if (tileX < 0 || tileX >= this.gridSize || tileY < 0 || tileY >= this.gridSize) {
      return;
    }
    const key = `${tileX},${tileY}`;
    this.occupiedTiles.set(key, objectType);
  }

  // Проверка, занята ли клетка
  isTileOccupied(x, y) {
    const key = `${Math.floor(x)},${Math.floor(y)}`;
    return this.occupiedTiles.has(key);
  }

  // Получить тип объекта на клетке
  getObjectAtTile(x, y) {
    const key = `${Math.floor(x)},${Math.floor(y)}`;
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
      'rock': { type: 'rock', tileSize: 1 },
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
    } else if (config && config.type === 'rock' && this.rockTiles && this.rockTiles.length > 0) {
      // Создаём камень из атласа rocks.png (случайный из 4)
      const texture = this.rockTiles[Math.floor(Math.random() * this.rockTiles.length)];
      const rockSprite = new Sprite(texture);

      rockSprite.anchor.set(this.rockAnchorX, this.rockAnchorY);

      // Случайный размер в диапазоне rockSizeMin - rockSizeMax
      const randomSize = this.rockSizeMin + Math.random() * (this.rockSizeMax - this.rockSizeMin);
      const scale = randomSize / 512;
      rockSprite.scale.set(scale);

      decorationContainer.addChild(rockSprite);
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
    // centerX/centerY уже содержат +0.5 для центрирования
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

    // Debug: визуализация общей границы коллизии объекта
    if (this.debugMode) {
      // Для области tileSize x tileSize, занятые тайлы: (x,y) до (x+tileSize-1, y+tileSize-1)
      // Внешние углы этой области - это углы крайних тайлов:
      // - Верхний угол = верхняя точка тайла (x, y)
      // - Правый угол = правая точка тайла (x+tileSize-1, y)
      // - Нижний угол = нижняя точка тайла (x+tileSize-1, y+tileSize-1)
      // - Левый угол = левая точка тайла (x, y+tileSize-1)

      const hw = this.tileWidth / 2;
      const hh = this.tileHeight / 2;

      // Центры крайних тайлов
      const topTileCenter = this.getTileCenter(x, y);
      const rightTileCenter = this.getTileCenter(x + tileSize - 1, y);
      const bottomTileCenter = this.getTileCenter(x + tileSize - 1, y + tileSize - 1);
      const leftTileCenter = this.getTileCenter(x, y + tileSize - 1);

      // Углы области (смещение от центра тайла к его углу)
      const topCorner = { x: topTileCenter.x, y: topTileCenter.y - hh };
      const rightCorner = { x: rightTileCenter.x + hw, y: rightTileCenter.y };
      const bottomCorner = { x: bottomTileCenter.x, y: bottomTileCenter.y + hh };
      const leftCorner = { x: leftTileCenter.x - hw, y: leftTileCenter.y };

      // Позиция объекта (для относительных координат)
      const objPos = this.isoToScreen(centerX, centerY);

      const collisionBorder = new Graphics();
      collisionBorder.moveTo(topCorner.x - objPos.x, topCorner.y - objPos.y);
      collisionBorder.lineTo(rightCorner.x - objPos.x, rightCorner.y - objPos.y);
      collisionBorder.lineTo(bottomCorner.x - objPos.x, bottomCorner.y - objPos.y);
      collisionBorder.lineTo(leftCorner.x - objPos.x, leftCorner.y - objPos.y);
      collisionBorder.lineTo(topCorner.x - objPos.x, topCorner.y - objPos.y);
      collisionBorder.stroke({ width: 3, color: 0x00ffff, alpha: 0.9 });
      collisionBorder.fill({ color: 0x00ffff, alpha: 0.15 });

      decorationContainer.addChild(collisionBorder);

      // Визуализация входного тайла (entry tile) для зданий
      // Самый "левый" тайл в изометрии - это (x, y + tileSize - 1)
      // потому что screenX = (gridX - gridY) * (tileWidth / 2), минимум при max gridY
      if (config && config.type === 'building' && tileSize >= 2) {
        const entryTileX = x;
        const entryTileY = y + tileSize - 1;
        const entryTileCenter = this.getTileCenter(entryTileX, entryTileY);

        // Рисуем входной тайл (жёлтый ромб с пунктирной обводкой)
        const entryTileViz = new Graphics();

        // Координаты углов тайла относительно позиции объекта
        const etTop = { x: entryTileCenter.x - objPos.x, y: entryTileCenter.y - objPos.y - hh };
        const etRight = { x: entryTileCenter.x - objPos.x + hw, y: entryTileCenter.y - objPos.y };
        const etBottom = { x: entryTileCenter.x - objPos.x, y: entryTileCenter.y - objPos.y + hh };
        const etLeft = { x: entryTileCenter.x - objPos.x - hw, y: entryTileCenter.y - objPos.y };

        // Заливка входного тайла
        entryTileViz.moveTo(etTop.x, etTop.y);
        entryTileViz.lineTo(etRight.x, etRight.y);
        entryTileViz.lineTo(etBottom.x, etBottom.y);
        entryTileViz.lineTo(etLeft.x, etLeft.y);
        entryTileViz.lineTo(etTop.x, etTop.y);
        entryTileViz.fill({ color: 0xffff00, alpha: 0.4 });
        entryTileViz.stroke({ width: 3, color: 0xffff00, alpha: 1.0 });

        // Маркер центра входного тайла
        const entryMarker = new Graphics();
        entryMarker.circle(entryTileCenter.x - objPos.x, entryTileCenter.y - objPos.y, 8);
        entryMarker.fill({ color: 0xffff00, alpha: 1.0 });
        entryMarker.stroke({ width: 2, color: 0x000000, alpha: 1.0 });

        // Текст "ENTRY" над тайлом
        const entryText = new Text({
          text: 'ENTRY',
          style: {
            fontFamily: 'Arial',
            fontSize: 16,
            fontWeight: 'bold',
            fill: 0xffff00,
            stroke: { color: 0x000000, width: 3 },
            align: 'center',
          }
        });
        entryText.anchor.set(0.5);
        entryText.x = entryTileCenter.x - objPos.x;
        entryText.y = entryTileCenter.y - objPos.y - 20;

        decorationContainer.addChild(entryTileViz);
        decorationContainer.addChild(entryMarker);
        decorationContainer.addChild(entryText);
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
      // 40% деревья, 40% кусты, 20% камни
      const rand = Math.random();
      const type = rand < 0.4 ? 'tree' : (rand < 0.8 ? 'bush' : 'rock');
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
    // Добавляем контейнер для сортируемых объектов поверх тайлов
    this.container.addChild(this.sortableContainer);

    // Добавляем здания в сортируемый контейнер
    Object.values(this.buildingLocations).forEach((location) => {
      this.sortableContainer.addChild(this.createDecoration(location.x, location.y, location.type));
    });

    // Добавляем случайную растительность вокруг активного поля
    this.createVegetation();

    // Создаем персонажа и добавляем в сортируемый контейнер
    this.character = this.createCharacter();
    this.sortableContainer.addChild(this.character);

    this.rootContainer.addChild(this.container);

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

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.container.visible = false;
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }

    if (this.idleAnimationFn) {
      this.app.ticker.remove(this.idleAnimationFn);
    }
    if (this.movementTickerFn) {
      this.app.ticker.remove(this.movementTickerFn);
    }

    if (this.characterAI) {
      this.aiWasRunning = !this.controllerMode;
      this.characterAI.stop();
    }

    Object.values(this.activityAnimations || {}).forEach((anim) => {
      if (anim?.stop) {
        anim.stop();
      }
    });
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    if (this.rootContainer && !this.container.parent) {
      this.rootContainer.addChild(this.container);
    }
    this.container.visible = true;

    if (this.idleAnimationFn) {
      this.app.ticker.add(this.idleAnimationFn);
    }
    if (this.movementTickerFn) {
      this.app.ticker.add(this.movementTickerFn);
    }

    if (this.aiWasRunning && this.characterAI) {
      this.characterAI.start();
      this.aiWasRunning = false;
    }

    Object.values(this.activityAnimations || {}).forEach((anim) => {
      if (anim?.play) {
        anim.play();
      }
    });
  }

  destroy() {
    // Останавливаем все тикеры
    if (this.movementTickerFn) {
      this.app.ticker.remove(this.movementTickerFn);
      this.movementTickerFn = null;
    }
    if (this.idleAnimationFn) {
      this.app.ticker.remove(this.idleAnimationFn);
      this.idleAnimationFn = null;
    }

    // Останавливаем AI если он запущен
    if (this.characterAI) {
      this.characterAI.stop();
      this.characterAI = null;
    }

    // Очищаем ссылки на анимации (сами анимации остаются в AssetManager)
    this.activityAnimations = null;

    // Очищаем ссылки на спрайты персонажа
    this.characterSprites = {};
    this.character = null;

    // Очищаем фоновые тайлы
    if (this.backgroundTiles) {
      this.backgroundTiles = [];
    }

    // Очищаем стены
    if (this.walls) {
      this.walls = [];
    }

    // Очищаем баббл
    if (this.activityBubble) {
      this.activityBubble.destroy({ children: true, texture: false, baseTexture: false });
      this.activityBubble = null;
    }

    // Очищаем карту занятых тайлов
    if (this.occupiedTiles) {
      this.occupiedTiles.clear();
    }

    // Очищаем debug графику пути
    if (this.pathDebugGraphics) {
      this.pathDebugGraphics.destroy();
      this.pathDebugGraphics = null;
    }

    // Удаляем обработчики клавиатуры
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
    if (this.keyUpHandler) {
      window.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = null;
    }

    // Очищаем ссылки на текстуры (сами текстуры остаются в AssetManager)
    this.grassTiles = null;
    this.buildingTiles = null;
    this.treeTiles = null;
    this.rockTiles = null;
    this.ufoTexture = null;

    // Удаляем контейнер из родителя и уничтожаем
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    // НЕ уничтожаем текстуры - они управляются AssetManager
    this.container.destroy({ children: true, texture: false, baseTexture: false });
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
