import { Container, Sprite, Graphics, TilingSprite, Text } from 'pixi.js';

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
    this.casesData = options.casesData ?? [];
    this.contentBoxScale = 0.7;
    this.dialogPadding = 20;
    this.dialogHeight = 170;

    this.container = new Container();
    this.tilesContainer = new Container();
    this.background = new Graphics();
    this.container.addChild(this.background);
    this.container.addChild(this.tilesContainer);
    this.dialogContainer = new Container();
    this.container.addChild(this.dialogContainer);
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
    this.createDialog();
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

      const contentContainer = new Container();
      contentContainer.label = 'content';
      contentContainer.x = 0;
      contentContainer.y = 0;
      tileGroup.addChild(contentContainer);
      this.renderTileContent(i, contentContainer);

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

  createDialog() {
    this.dialogContainer.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });

    const dialogWidth = Math.round(this.app.screen.width * 0.88);
    const dialogHeight = this.dialogHeight;
    const dialog = new Graphics();
    dialog.roundRect(0, 0, dialogWidth, dialogHeight, 16);
    dialog.fill({ color: 0x0b0f1d, alpha: 0.9 });
    dialog.stroke({ width: 2, color: 0x1c2a4a, alpha: 0.9 });

    const title = new Text({
      text: '',
      style: {
        fill: 0xffffff,
        fontSize: 22,
        fontFamily: 'Sonic Genesis, monospace',
      },
    });
    title.anchor.set(0, 0);
    title.x = this.dialogPadding;
    title.y = 18;

    const body = new Text({
      text: '',
      style: {
        fill: 0xc7d3f1,
        fontSize: 16,
        fontFamily: 'Sonic Genesis, monospace',
        wordWrap: true,
        wordWrapWidth: dialogWidth - this.dialogPadding * 2 - 80,
        lineHeight: 20,
      },
    });
    body.anchor.set(0, 0);
    body.x = this.dialogPadding;
    body.y = 54;

    const leftArrow = new Graphics();
    leftArrow.moveTo(0, 12);
    leftArrow.lineTo(20, 0);
    leftArrow.lineTo(20, 24);
    leftArrow.closePath();
    leftArrow.fill({ color: 0x4de3ff, alpha: 0.9 });
    leftArrow.x = dialogWidth - 72;
    leftArrow.y = dialogHeight - 44;
    leftArrow.eventMode = 'static';
    leftArrow.cursor = 'pointer';
    leftArrow.on('pointertap', () => this.nextText(-1));

    const rightArrow = new Graphics();
    rightArrow.moveTo(20, 12);
    rightArrow.lineTo(0, 0);
    rightArrow.lineTo(0, 24);
    rightArrow.closePath();
    rightArrow.fill({ color: 0x4de3ff, alpha: 0.9 });
    rightArrow.x = dialogWidth - 36;
    rightArrow.y = dialogHeight - 44;
    rightArrow.eventMode = 'static';
    rightArrow.cursor = 'pointer';
    rightArrow.on('pointertap', () => this.nextText(1));

    const pageIndicator = new Text({
      text: '',
      style: {
        fill: 0x9fb8ff,
        fontSize: 14,
        fontFamily: 'Sonic Genesis, monospace',
      },
    });
    pageIndicator.anchor.set(0.5, 0);
    pageIndicator.x = dialogWidth - 54;
    pageIndicator.y = 18;

    this.dialogContainer.addChild(dialog);
    this.dialogContainer.addChild(title);
    this.dialogContainer.addChild(body);
    this.dialogContainer.addChild(leftArrow);
    this.dialogContainer.addChild(rightArrow);
    this.dialogContainer.addChild(pageIndicator);

    this.dialogBox = dialog;
    this.dialogTitle = title;
    this.dialogBody = body;
    this.dialogLeft = leftArrow;
    this.dialogRight = rightArrow;
    this.dialogPage = pageIndicator;

    this.updateDialogForCase(this.activeIndex);
  }

  updateDialogForCase(index) {
    const caseData = this.casesData?.[index];
    if (!caseData) return;
    const title = caseData.title || `CASE ${index + 1}`;
    const blocks = caseData.textBlocks || [];
    const active = caseData.activeTextIndex ?? 0;
    const block = blocks[active] || '';

    if (this.dialogTitle) this.dialogTitle.text = title;
    if (this.dialogBody) this.dialogBody.text = block;
    const showArrows = blocks.length > 1;
    if (this.dialogLeft) this.dialogLeft.visible = showArrows;
    if (this.dialogRight) this.dialogRight.visible = showArrows;
    if (this.dialogPage) {
      this.dialogPage.text = blocks.length > 0 ? `${active + 1}/${blocks.length}` : '';
      this.dialogPage.visible = blocks.length > 1;
    }
  }

  renderTileContent(index, container) {
    container.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });

    const caseData = this.casesData[index];
    if (!caseData || !caseData.contents || caseData.contents.length === 0) {
      if (this.debugMode) {
        const placeholder = new Graphics();
        const box = this.getContentBox();
        placeholder.rect(-box.width / 2, -box.height / 2, box.width, box.height);
        placeholder.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
        container.addChild(placeholder);

        const label = new Text({
          text: `CASE ${index + 1}`,
          style: { fill: 0xffffff, fontSize: 18, fontFamily: 'monospace' },
        });
        label.anchor.set(0.5);
        container.addChild(label);
      }
      return;
    }

    const activeIndex = caseData.activeIndex ?? 0;
    const contentItem = caseData.contents[activeIndex];
    if (!contentItem) {
      return;
    }

    const contentNode = contentItem.createDisplayObject
      ? contentItem.createDisplayObject()
      : contentItem.displayObject;
    if (!contentNode) {
      return;
    }
    contentNode.anchor?.set?.(0.5, 0.5);
    const box = this.getContentBox();
    this.fitDisplayObject(contentNode, box.width, box.height);
    contentNode.x = 0;
    contentNode.y = 0;
    container.addChild(contentNode);
  }

  getContentBox() {
    return {
      width: Math.round(this.tileWidth * this.contentBoxScale),
      height: Math.round(this.tileHeight * this.contentBoxScale),
    };
  }

  fitDisplayObject(node, maxW, maxH) {
    const w = node.width || 1;
    const h = node.height || 1;
    const scale = Math.min(maxW / w, maxH / h);
    node.scale?.set?.(scale);
  }

  setCasesData(casesData) {
    this.casesData = casesData || [];
    this.rebuildTiles();
    this.updateDialogForCase(this.activeIndex);
  }

  setActiveContent(tileIndex, contentIndex) {
    const caseData = this.casesData?.[tileIndex];
    if (!caseData) return;
    caseData.activeIndex = Math.max(0, Math.min(caseData.contents.length - 1, contentIndex));
    const tileGroup = this.tiles?.[tileIndex];
    const contentContainer = tileGroup?.children?.find((child) => child.label === 'content');
    if (contentContainer) {
      this.renderTileContent(tileIndex, contentContainer);
    }
  }

  nextContent(tileIndex, direction = 1) {
    const caseData = this.casesData?.[tileIndex];
    if (!caseData || !caseData.contents || caseData.contents.length === 0) return;
    const current = caseData.activeIndex ?? 0;
    const next = (current + direction + caseData.contents.length) % caseData.contents.length;
    this.setActiveContent(tileIndex, next);
  }

  nextText(direction = 1) {
    const caseData = this.casesData?.[this.activeIndex];
    if (!caseData || !caseData.textBlocks || caseData.textBlocks.length === 0) return;
    const current = caseData.activeTextIndex ?? 0;
    const next = (current + direction + caseData.textBlocks.length) % caseData.textBlocks.length;
    caseData.activeTextIndex = next;
    this.updateDialogForCase(this.activeIndex);
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
    if (this.dialogContainer && this.dialogBox) {
      this.dialogContainer.x = -this.container.x + (this.app.screen.width - this.dialogBox.width) / 2;
      this.dialogContainer.y = -this.container.y + this.app.screen.height - this.dialogBox.height - 28;
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
    this.updateDialogForCase(this.activeIndex);
  }

  setActiveTile(index) {
    this.centerOnIndex(index, false);
    this.updateDialogForCase(index);
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
