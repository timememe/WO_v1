import { Assets, Texture, Rectangle, extensions } from 'pixi.js';
import { AnimatedGIF, AnimatedGIFAsset } from '@pixi/gif';

// Регистрируем GIF парсер в PixiJS
extensions.add(AnimatedGIFAsset);

/**
 * AssetManager - централизованный загрузчик и хранилище ассетов
 * Загружает все текстуры один раз при старте приложения
 * и предоставляет доступ к ним для всех сцен
 */
export class AssetManager {
  constructor() {
    this.loaded = false;
    this.textures = {};
    this.atlases = {};
    this.animations = {};
  }

  /**
   * Загрузка всех ассетов приложения
   */
  async loadAll() {
    if (this.loaded) return;

    console.log('AssetManager: Starting to load all assets...');

    try {
      // Загружаем все базовые текстуры параллельно
      const [
        grassBase,
        homesBase,
        treesBase,
        rocksBase,
        idleBase,
        ufoTexture,
        casesFrameTexture,
        sleepGif,
        eatGif,
        workGif,
        casesGif
      ] = await Promise.all([
        Assets.load('/assets/grass.png'),
        Assets.load('/assets/homes.png'),
        Assets.load('/assets/trees.png'),
        Assets.load('/assets/rocks.png'),
        Assets.load('/assets/idle.png'),
        Assets.load('/assets/ufo.png'),
        Assets.load('/assets/cases_frame.jpg'),
        Assets.load('/assets/sleep.gif'),
        Assets.load('/assets/eat.gif'),
        Assets.load('/assets/work.gif'),
        Assets.load('/assets/cases.gif')
      ]);

      // Парсим атласы
      this.atlases.grass = this.parseGrassAtlas(grassBase);
      this.atlases.buildings = this.parseBuildingsAtlas(homesBase);
      this.atlases.trees = this.parseTreesAtlas(treesBase);
      this.atlases.rocks = this.parseRocksAtlas(rocksBase);
      this.atlases.character = this.parseCharacterAtlas(idleBase);

      // Одиночные текстуры
      this.textures.ufo = ufoTexture;
      this.textures.casesFrame = casesFrameTexture;

      // GIF анимации
      this.animations.sleep = sleepGif;
      this.animations.eat = eatGif;
      this.animations.work = workGif;
      this.animations.cases = casesGif;

      this.loaded = true;
      console.log('AssetManager: All assets loaded successfully');

    } catch (error) {
      console.error('AssetManager: Failed to load assets:', error);
      throw error;
    }
  }

  /**
   * Парсинг атласа травы (grass.png - 1536x1536, спрайты 512x512 = 9 тайлов)
   */
  parseGrassAtlas(baseTexture) {
    const tileSize = 512;
    const tiles = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const frame = new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize);
        tiles.push(new Texture({
          source: baseTexture.source,
          frame: frame,
          orig: frame,
        }));
      }
    }

    console.log(`AssetManager: Parsed grass atlas - ${tiles.length} tiles`);
    return tiles;
  }

  /**
   * Парсинг атласа зданий (homes.png - 1024x1024, 4 изображения 512x512)
   * Порядок: [0,0] home, [1,0] cafe, [0,1] cases, [1,1] projects
   */
  parseBuildingsAtlas(baseTexture) {
    const tileSize = 512;
    const tiles = {};

    const positions = {
      'home': { col: 0, row: 0 },
      'projects': { col: 1, row: 1 },
      'cases': { col: 0, row: 1 },
      'cafe': { col: 1, row: 0 }
    };

    for (const [name, pos] of Object.entries(positions)) {
      const frame = new Rectangle(pos.col * tileSize, pos.row * tileSize, tileSize, tileSize);
      tiles[name] = new Texture({
        source: baseTexture.source,
        frame: frame,
        orig: frame,
      });
    }

    console.log(`AssetManager: Parsed buildings atlas - ${Object.keys(tiles).join(', ')}`);
    return tiles;
  }

  /**
   * Парсинг атласа деревьев (trees.png - 1536x1024, спрайты 512x512)
   * Ряд 0: кусты (3 шт), Ряд 1: деревья (3 шт)
   */
  parseTreesAtlas(baseTexture) {
    const tileSize = 512;
    const result = {
      bushes: [],
      trees: []
    };

    // Ряд 0 - кусты
    for (let col = 0; col < 3; col++) {
      const frame = new Rectangle(col * tileSize, 0, tileSize, tileSize);
      result.bushes.push(new Texture({
        source: baseTexture.source,
        frame: frame,
        orig: frame,
      }));
    }

    // Ряд 1 - деревья
    for (let col = 0; col < 3; col++) {
      const frame = new Rectangle(col * tileSize, tileSize, tileSize, tileSize);
      result.trees.push(new Texture({
        source: baseTexture.source,
        frame: frame,
        orig: frame,
      }));
    }

    console.log(`AssetManager: Parsed trees atlas - ${result.bushes.length} bushes, ${result.trees.length} trees`);
    return result;
  }

  /**
   * Парсинг атласа камней (rocks.png - 1024x1024, спрайты 512x512 = 4 камня)
   */
  parseRocksAtlas(baseTexture) {
    const tileSize = 512;
    const rocks = [];

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

    console.log(`AssetManager: Parsed rocks atlas - ${rocks.length} rocks`);
    return rocks;
  }

  /**
   * Парсинг атласа персонажа (idle.png - 2560x512, спрайты 512x512 = 5 направлений)
   * 1-down, 2-down-right, 3-right, 4-up-right, 5-up
   */
  parseCharacterAtlas(baseTexture) {
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

    // Маппинг на 8 направлений
    const directions = {
      'down': { texture: textures[0], mirror: false },
      'down-right': { texture: textures[1], mirror: false },
      'down-left': { texture: textures[1], mirror: true },
      'right': { texture: textures[2], mirror: false },
      'left': { texture: textures[2], mirror: true },
      'up-right': { texture: textures[3], mirror: false },
      'up-left': { texture: textures[3], mirror: true },
      'up': { texture: textures[4], mirror: false },
    };

    console.log(`AssetManager: Parsed character atlas - 8 directions from 5 sprites`);
    return directions;
  }

  /**
   * Получить текстуры травы
   */
  getGrassTiles() {
    return this.atlases.grass || [];
  }

  /**
   * Получить текстуры зданий
   */
  getBuildingTiles() {
    return this.atlases.buildings || {};
  }

  /**
   * Получить текстуры деревьев и кустов
   */
  getTreeTiles() {
    return this.atlases.trees || { bushes: [], trees: [] };
  }

  /**
   * Получить текстуры камней
   */
  getRockTiles() {
    return this.atlases.rocks || [];
  }

  /**
   * Получить текстуры персонажа (с информацией о зеркалировании)
   */
  getCharacterTextures() {
    return this.atlases.character || {};
  }

  /**
   * Получить текстуру UFO
   */
  getUfoTexture() {
    return this.textures.ufo || null;
  }

  /**
   * Получить текстуру для CasesScene
   */
  getCasesFrameTexture() {
    return this.textures.casesFrame || null;
  }

  /**
   * Получить GIF анимации
   */
  getActivityAnimations() {
    return this.animations || {};
  }

  /**
   * Проверка загружены ли ассеты
   */
  isLoaded() {
    return this.loaded;
  }
}

// Синглтон для глобального доступа
let instance = null;

export function getAssetManager() {
  if (!instance) {
    instance = new AssetManager();
  }
  return instance;
}
