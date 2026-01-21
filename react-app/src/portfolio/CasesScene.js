import { Container, Sprite, Graphics, TilingSprite } from 'pixi.js';

export class CasesScene {
  constructor(app, options = {}, rootContainer = null, assetManager = null) {
    this.app = app;
    this.rootContainer = rootContainer || this.app.stage;
    this.assetManager = assetManager;
    this.sceneId = 'cases';

    this.tileCount = options.tileCount || 5;
    this.floorTopWidth = 980;
    this.floorHeightRatio = 1 / 3;
    this.floorBottomScale = 1.25;
    this.tileWidth = options.tileWidth || this.floorTopWidth;
    this.tileHeight = options.tileHeight || 512;
    this.tileGap = options.tileGap ?? 0;
    this.tileOverlap = options.tileOverlap ?? 2;
    this.backgroundColor = options.backgroundColor ?? 0x000000;
    this.debugMode = options.debugMode ?? false;
    this.floorTexture = null;

    this.container = new Container();
    this.tilesContainer = new Container();
    this.background = new Graphics();
    this.container.addChild(this.background);
    this.container.addChild(this.tilesContainer);
    this.rootContainer.addChild(this.container);

    this.activeIndex = 0;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
    this.cameraSmoothing = 0.08;
    this.cameraTickerFn = null;
    this.isPaused = false;
    this.resizeHandler = null;

    this.init();
  }

  async init() {
    this.loadAssets();
    this.createBackground();
    this.createTiles();
    this.centerOnIndex(0, true);
    this.startCamera();
    this.bindResize();
  }

  createBackground() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: this.backgroundColor, alpha: 1 });
    this.background.x = -this.container.x;
    this.background.y = -this.container.y;

  }

  bindResize() {
    this.resizeHandler = () => {
      this.createBackground();
      this.rebuildTiles();
    };
    this.app.renderer.on('resize', this.resizeHandler);
  }

  loadAssets() {
    // Получаем предзагруженную текстуру из AssetManager
    if (this.assetManager) {
      this.tileTexture = this.assetManager.getCasesFrameTexture();
      this.floorTexture = this.assetManager.getCasesFloorTexture();
      console.log('CasesScene: Texture loaded from AssetManager');
    } else {
      console.error('CasesScene: AssetManager not provided');
      this.tileTexture = null;
    }
  }

  createTiles() {
    this.tiles = [];
    const step = this.tileWidth + this.tileGap - this.tileOverlap;
    const totalWidth = this.tileCount * this.tileWidth + (this.tileCount - 1) * (this.tileGap - this.tileOverlap);
    const startX = -totalWidth / 2 + this.tileWidth / 2;
    const floorHeight = Math.round(this.app.screen.height * this.floorHeightRatio);
    const floorTopY = this.tileHeight / 2;

    for (let i = 0; i < this.tileCount; i++) {
      const tileGroup = new Container();
      tileGroup.x = startX + i * step;
      tileGroup.y = 0;

      const floorTopWidth = this.tileWidth;
      const floorBottomWidth = Math.round(this.tileWidth * this.floorBottomScale);
      const halfTop = floorTopWidth / 2;
      const halfBottom = floorBottomWidth / 2;

      if (this.floorTexture) {
        const floorTile = new TilingSprite({
          texture: this.floorTexture,
          width: floorBottomWidth,
          height: floorHeight,
        });
        const texW = this.floorTexture.width || 1;
        const texH = this.floorTexture.height || 1;
        floorTile.tileScale.set(floorBottomWidth / texW, floorHeight / texH);
        floorTile.x = -halfBottom;
        floorTile.y = floorTopY;

        const floorMask = new Graphics();
        floorMask.moveTo(-halfBottom, floorTopY + floorHeight);
        floorMask.lineTo(halfBottom, floorTopY + floorHeight);
        floorMask.lineTo(halfTop, floorTopY);
        floorMask.lineTo(-halfTop, floorTopY);
        floorMask.lineTo(-halfBottom, floorTopY + floorHeight);
        floorMask.fill({ color: 0xffffff, alpha: 1 });

        floorTile.mask = floorMask;
        tileGroup.addChild(floorTile);
        tileGroup.addChild(floorMask);
      } else {
        const floorGfx = new Graphics();
        floorGfx.moveTo(-halfBottom, floorTopY + floorHeight);
        floorGfx.lineTo(halfBottom, floorTopY + floorHeight);
        floorGfx.lineTo(halfTop, floorTopY);
        floorGfx.lineTo(-halfTop, floorTopY);
        floorGfx.lineTo(-halfBottom, floorTopY + floorHeight);
        floorGfx.fill({ color: 0x0a0a0a, alpha: 1 });
        tileGroup.addChild(floorGfx);
      }

      if (this.debugMode) {
        const floorOutline = new Graphics();
        floorOutline.moveTo(-halfBottom, floorTopY + floorHeight);
        floorOutline.lineTo(halfBottom, floorTopY + floorHeight);
        floorOutline.lineTo(halfTop, floorTopY);
        floorOutline.lineTo(-halfTop, floorTopY);
        floorOutline.lineTo(-halfBottom, floorTopY + floorHeight);
        floorOutline.stroke({ width: 2, color: 0x00ffff, alpha: 0.7 });
        tileGroup.addChild(floorOutline);
      }

      let tile = null;
      if (this.tileTexture) {
        tile = new Sprite(this.tileTexture);
        tile.anchor.set(0.5, 0.5);
        const textureWidth = tile.texture?.width || 1;
        const textureHeight = tile.texture?.height || 1;
        tile.scale.set(this.tileWidth / textureWidth, this.tileHeight / textureHeight);
        tile.y = 0;
        tileGroup.addChild(tile);
      }

      if (this.debugMode) {
        const tileOutline = new Graphics();
        tileOutline.rect(-this.tileWidth / 2, -this.tileHeight / 2, this.tileWidth, this.tileHeight);
        tileOutline.stroke({ width: 2, color: 0xff66cc, alpha: 0.7 });
        tileGroup.addChild(tileOutline);
      }

      this.tilesContainer.addChild(tileGroup);
      this.tiles.push(tileGroup);
    }
  }

  clearTiles() {
    this.tilesContainer.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });
    this.tiles = [];
  }

  rebuildTiles() {
    this.clearTiles();
    this.createTiles();
    this.centerOnIndex(this.activeIndex, true);
  }

  startCamera() {
    this.cameraTickerFn = () => this.updateCamera();
    this.app.ticker.add(this.cameraTickerFn);
  }

  updateCamera() {
    const targetX = this.cameraTargetX;
    this.container.x += (targetX - this.container.x) * this.cameraSmoothing;
    this.container.y += (this.cameraTargetY - this.container.y) * 0.08;
    if (this.background) {
      this.background.x = -this.container.x;
      this.background.y = -this.container.y;
    }
  }

  centerOnIndex(index, immediate = false) {
    const clamped = Math.max(0, Math.min(this.tileCount - 1, index));
    this.activeIndex = clamped;
    const targetTile = this.tiles?.[clamped];
    if (!targetTile) return;

    const targetX = this.app.screen.width / 2 - targetTile.x;
    this.cameraTargetX = targetX;
    this.cameraTargetY = this.tileHeight / 2;
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
    if (this.resizeHandler) {
      this.app.renderer.off('resize', this.resizeHandler);
      this.resizeHandler = null;
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
