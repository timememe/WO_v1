import { Container, Sprite } from 'pixi.js';

export class CasesScene {
  constructor(app, options = {}, rootContainer = null, assetManager = null) {
    this.app = app;
    this.rootContainer = rootContainer || this.app.stage;
    this.assetManager = assetManager;
    this.sceneId = 'cases';

    this.tileCount = options.tileCount || 5;
    this.tileWidth = options.tileWidth || 512;
    this.tileHeight = options.tileHeight || 512;
    this.tileGap = options.tileGap || 60;

    this.container = new Container();
    this.tilesContainer = new Container();
    this.container.addChild(this.tilesContainer);
    this.rootContainer.addChild(this.container);

    this.activeIndex = 0;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
    this.cameraSmoothing = 0.08;
    this.cameraTickerFn = null;
    this.isPaused = false;

    this.init();
  }

  async init() {
    this.loadAssets();
    this.createTiles();
    this.centerOnIndex(0, true);
    this.startCamera();
  }

  loadAssets() {
    // Получаем предзагруженную текстуру из AssetManager
    if (this.assetManager) {
      this.tileTexture = this.assetManager.getCasesFrameTexture();
      console.log('CasesScene: Texture loaded from AssetManager');
    } else {
      console.error('CasesScene: AssetManager not provided');
      this.tileTexture = null;
    }
  }

  createTiles() {
    this.tiles = [];
    const totalWidth = this.tileCount * this.tileWidth + (this.tileCount - 1) * this.tileGap;
    const startX = -totalWidth / 2 + this.tileWidth / 2;

    for (let i = 0; i < this.tileCount; i++) {
      const tile = new Sprite(this.tileTexture);
      tile.anchor.set(0.5, 0.5);
      tile.x = startX + i * (this.tileWidth + this.tileGap);
      tile.y = 0;
      this.tilesContainer.addChild(tile);
      this.tiles.push(tile);
    }
  }

  startCamera() {
    this.cameraTickerFn = () => this.updateCamera();
    this.app.ticker.add(this.cameraTickerFn);
  }

  updateCamera() {
    const targetX = this.cameraTargetX;
    this.container.x += (targetX - this.container.x) * this.cameraSmoothing;
    this.container.y += (this.cameraTargetY - this.container.y) * 0.08;
  }

  centerOnIndex(index, immediate = false) {
    const clamped = Math.max(0, Math.min(this.tileCount - 1, index));
    this.activeIndex = clamped;
    const targetTile = this.tiles?.[clamped];
    if (!targetTile) return;

    const targetX = this.app.screen.width / 2 - targetTile.x;
    this.cameraTargetX = targetX;
    this.cameraTargetY = this.app.screen.height / 2;
    if (immediate) {
      this.container.x = targetX;
      this.container.y = this.cameraTargetY;
    }
  }

  setActiveTile(index) {
    this.centerOnIndex(index, false);
  }

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.container.visible = false;
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    if (this.cameraTickerFn) {
      this.app.ticker.remove(this.cameraTickerFn);
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    if (this.rootContainer && !this.container.parent) {
      this.rootContainer.addChild(this.container);
    }
    this.container.visible = true;
    if (this.cameraTickerFn) {
      this.app.ticker.add(this.cameraTickerFn);
    }
  }

  destroy() {
    if (this.cameraTickerFn) {
      this.app.ticker.remove(this.cameraTickerFn);
      this.cameraTickerFn = null;
    }

    // Очищаем массив тайлов (текстуры остаются в AssetManager)
    this.tiles = [];
    this.tileTexture = null;

    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }

    // Уничтожаем контейнер и все дочерние объекты
    // НЕ уничтожаем текстуры - они управляются AssetManager
    this.container.destroy({ children: true, texture: false, baseTexture: false });
  }

  getAIStatus() {
    return null;
  }
}
