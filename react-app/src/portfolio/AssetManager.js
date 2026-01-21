import { Assets, Texture, Rectangle, extensions } from 'pixi.js';
import { AnimatedGIF, AnimatedGIFAsset } from '@pixi/gif';

// Регистрируем GIF парсер в PixiJS
extensions.add(AnimatedGIFAsset);

/**
 * Конфигурация бандлов ассетов
 * Каждый бандл содержит ассеты для конкретной сцены
 */
const BUNDLE_CONFIG = {
  // Главная изометрическая сцена
  main: {
    name: 'main',
    assets: [
      { alias: 'grass', src: '/assets/grass.png' },
      { alias: 'homes', src: '/assets/homes.png' },
      { alias: 'trees', src: '/assets/trees.png' },
      { alias: 'rocks', src: '/assets/rocks.png' },
      { alias: 'idle', src: '/assets/idle.png' },
      { alias: 'ufo', src: '/assets/ufo.png' },
      { alias: 'sleep', src: '/assets/sleep.gif' },
      { alias: 'eat', src: '/assets/eat.gif' },
      { alias: 'work', src: '/assets/work.gif' },
      { alias: 'casesAnim', src: '/assets/cases.gif' },
    ]
  },
  // Сцена кейсов
  cases: {
    name: 'cases',
    assets: [
      { alias: 'casesFrame', src: '/assets/cases_frame.jpg' },
      { alias: 'casesFloor', src: '/assets/cases_floor.jpg' },
    ]
  }
};

/**
 * AssetManager - централизованный загрузчик и хранилище ассетов
 * Поддерживает загрузку по бандлам для разных сцен
 */
export class AssetManager {
  constructor() {
    // Состояние бандлов
    this.bundles = {
      main: { loaded: false, data: {} },
      cases: { loaded: false, data: {} }
    };

    // Флаг полной загрузки (все бандлы)
    this.allLoaded = false;
  }

  /**
   * Загрузка конкретного бандла
   * @param {string} bundleName - имя бандла ('main', 'cases', etc.)
   */
  async loadBundle(bundleName) {
    const config = BUNDLE_CONFIG[bundleName];
    if (!config) {
      console.error(`AssetManager: Unknown bundle "${bundleName}"`);
      return false;
    }

    const bundle = this.bundles[bundleName];
    if (bundle.loaded) {
      console.log(`AssetManager: Bundle "${bundleName}" already loaded`);
      return true;
    }

    console.log(`AssetManager: Loading bundle "${bundleName}"...`);

    try {
      // Загружаем все ассеты бандла параллельно
      const loadPromises = config.assets.map(asset =>
        Assets.load(asset.src).then(texture => ({ alias: asset.alias, texture }))
      );

      const results = await Promise.all(loadPromises);

      // Сохраняем загруженные текстуры
      const rawTextures = {};
      results.forEach(({ alias, texture }) => {
        rawTextures[alias] = texture;
      });

      // Парсим текстуры в зависимости от бандла
      bundle.data = this.parseBundle(bundleName, rawTextures);
      bundle.loaded = true;

      console.log(`AssetManager: Bundle "${bundleName}" loaded successfully`);
      return true;

    } catch (error) {
      console.error(`AssetManager: Failed to load bundle "${bundleName}":`, error);
      throw error;
    }
  }

  /**
   * Загрузка нескольких бандлов
   * @param {string[]} bundleNames - массив имён бандлов
   */
  async loadBundles(bundleNames) {
    const results = await Promise.all(
      bundleNames.map(name => this.loadBundle(name))
    );
    return results.every(r => r === true);
  }

  /**
   * Загрузка всех бандлов (для совместимости и начальной загрузки)
   */
  async loadAll() {
    if (this.allLoaded) return true;

    console.log('AssetManager: Loading all bundles...');

    const bundleNames = Object.keys(BUNDLE_CONFIG);
    const success = await this.loadBundles(bundleNames);

    if (success) {
      this.allLoaded = true;
      console.log('AssetManager: All bundles loaded successfully');
    }

    return success;
  }

  /**
   * Парсинг загруженных текстур бандла
   */
  parseBundle(bundleName, rawTextures) {
    switch (bundleName) {
      case 'main':
        return this.parseMainBundle(rawTextures);
      case 'cases':
        return this.parseCasesBundle(rawTextures);
      default:
        return rawTextures;
    }
  }

  /**
   * Парсинг бандла главной сцены
   */
  parseMainBundle(raw) {
    return {
      // Атласы
      grass: this.parseGrassAtlas(raw.grass),
      buildings: this.parseBuildingsAtlas(raw.homes),
      trees: this.parseTreesAtlas(raw.trees),
      rocks: this.parseRocksAtlas(raw.rocks),
      character: this.parseCharacterAtlas(raw.idle),

      // Текстуры
      ufo: raw.ufo,

      // GIF анимации
      animations: {
        sleep: raw.sleep,
        eat: raw.eat,
        work: raw.work,
        cases: raw.casesAnim
      }
    };
  }

  /**
   * Парсинг бандла сцены кейсов
   */
  parseCasesBundle(raw) {
    return {
      casesFrame: raw.casesFrame,
      casesFloor: raw.casesFloor
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ПАРСЕРЫ АТЛАСОВ
  // ═══════════════════════════════════════════════════════════════

  /**
   * Парсинг атласа травы (1536x1536, спрайты 512x512 = 9 тайлов)
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

    console.log(`  -> Parsed grass atlas: ${tiles.length} tiles`);
    return tiles;
  }

  /**
   * Парсинг атласа зданий (1024x1024, 4 изображения 512x512)
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

    console.log(`  -> Parsed buildings atlas: ${Object.keys(tiles).join(', ')}`);
    return tiles;
  }

  /**
   * Парсинг атласа деревьев (1536x1024, спрайты 512x512)
   */
  parseTreesAtlas(baseTexture) {
    const tileSize = 512;
    const result = { bushes: [], trees: [] };

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

    console.log(`  -> Parsed trees atlas: ${result.bushes.length} bushes, ${result.trees.length} trees`);
    return result;
  }

  /**
   * Парсинг атласа камней (1024x1024, спрайты 512x512 = 4 камня)
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

    console.log(`  -> Parsed rocks atlas: ${rocks.length} rocks`);
    return rocks;
  }

  /**
   * Парсинг атласа персонажа (2560x512, спрайты 512x512 = 5 направлений)
   */
  parseCharacterAtlas(baseTexture) {
    const tileSize = 512;
    const textures = [];

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

    console.log(`  -> Parsed character atlas: 8 directions`);
    return directions;
  }

  // ═══════════════════════════════════════════════════════════════
  // ПРОВЕРКИ СОСТОЯНИЯ
  // ═══════════════════════════════════════════════════════════════

  /**
   * Проверка загружен ли конкретный бандл
   */
  isBundleLoaded(bundleName) {
    return this.bundles[bundleName]?.loaded || false;
  }

  /**
   * Проверка загружены ли все бандлы
   */
  isLoaded() {
    return this.allLoaded;
  }

  /**
   * Получить данные бандла
   */
  getBundle(bundleName) {
    return this.bundles[bundleName]?.data || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // ГЕТТЕРЫ ДЛЯ ГЛАВНОЙ СЦЕНЫ (main bundle)
  // ═══════════════════════════════════════════════════════════════

  getGrassTiles() {
    return this.bundles.main.data?.grass || [];
  }

  getBuildingTiles() {
    return this.bundles.main.data?.buildings || {};
  }

  getTreeTiles() {
    return this.bundles.main.data?.trees || { bushes: [], trees: [] };
  }

  getRockTiles() {
    return this.bundles.main.data?.rocks || [];
  }

  getCharacterTextures() {
    return this.bundles.main.data?.character || {};
  }

  getUfoTexture() {
    return this.bundles.main.data?.ufo || null;
  }

  getActivityAnimations() {
    return this.bundles.main.data?.animations || {};
  }

  // ═══════════════════════════════════════════════════════════════
  // ГЕТТЕРЫ ДЛЯ СЦЕНЫ КЕЙСОВ (cases bundle)
  // ═══════════════════════════════════════════════════════════════

  getCasesFrameTexture() {
    return this.bundles.cases.data?.casesFrame || null;
  }

  getCasesFloorTexture() {
    return this.bundles.cases.data?.casesFloor || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // УТИЛИТЫ
  // ═══════════════════════════════════════════════════════════════

  /**
   * Получить список доступных бандлов
   */
  getAvailableBundles() {
    return Object.keys(BUNDLE_CONFIG);
  }

  /**
   * Получить конфигурацию бандла
   */
  getBundleConfig(bundleName) {
    return BUNDLE_CONFIG[bundleName] || null;
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
