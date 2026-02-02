import { Container, Sprite, Graphics, TilingSprite, Text } from 'pixi.js';

// ═══════════════════════════════════════════════════════════════
// КОНТЕНТНЫЕ ДАННЫЕ КЕЙСОВ
// ═══════════════════════════════════════════════════════════════
const CASES_DATA = [
  {
    title: 'OREO X PACMAN',
    category: 'Разработка игр',
    mediaKey: 'oreo_pacman2',
    textBlocks: [
      'Game contest for Oreo and Bandai Namco, where users could play Oreo version of Pacman and win prizes!',
      'I have fully redevelop original Pacman game with Bandai Namco guidelines, so the Pacman spirit wouldnt dissapear.',
      'Also i made offline version and directed final offline battle between blogers and finalists of contest',
    ],
  },
  { title: '7DAYS', category: 'Разработка NPC кампаний', textBlocks: ['Second tile: process and approach.'] },
  { title: 'DREAME AI', category: 'Разработка ИИ механик и офлайн стендов', textBlocks: ['Third tile: outcome and impact.'] },
  { title: 'LOREAL ML', category: 'Обучение ИИ моделей', textBlocks: ['Fourth tile: visuals and systems.'] },
  { title: 'DIROL SMM', category: 'Создание ИИ контента', textBlocks: ['Fifth tile: notes and next steps.'] },
];

export class CasesScene {
  constructor(app, options = {}, rootContainer = null, assetManager = null) {
    this.app = app;
    this.rootContainer = rootContainer || this.app.stage;
    this.assetManager = assetManager;
    this.sceneId = 'cases';

    this.tileCount = options.tileCount || 5;
    this.tileWidth = options.tileWidth || 980;
    this.tileHeight = options.tileHeight || 512;
    this.tileGap = options.tileGap ?? 0;
    this.tileOverlap = options.tileOverlap ?? 2;
    this.backgroundColor = options.backgroundColor ?? 0x000000;
    this.debugMode = options.debugMode ?? false;
    this.casesData = [];
    this.contentBoxScale = 0.7;
    this.paddingTiles = options.paddingTiles ?? 1;
    this.dialogPadding = 20;
    this.dialogHeight = 170;
    this.bottomPadding = 160;

    // ── Параллакс ──
    this.parallaxFactor = options.parallaxFactor ?? 0.3; // Скорость дальнего слоя (0 = статичный, 1 = как тайлы)

    this.container = new Container();
    this.parallaxContainer = new Container();
    this.characterContainer = new Container();
    this.tilesContainer = new Container();
    this.background = new Graphics();
    this.container.addChild(this.background);
    this.container.addChild(this.parallaxContainer);
    this.container.addChild(this.characterContainer);
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
    this.parallaxLayers = [];

    // ── Сайдскроллер-персонаж ──
    this.characterMode = false;
    this.charX = 0;
    this.charSpeed = 4;
    this.charSprite = null;
    this.charIdleFrames = [];
    this.charWalkFrames = [];
    this.charFrameIndex = 0;
    this.charFrameTime = 0;
    this.charFps = 6;
    this.charDirection = 'right';
    this.inputKeys = new Set();
    this.keydownHandler = null;
    this.keyupHandler = null;

    this.init();
  }

  init() {
    this.loadAssets();
    this.buildCasesData();
    this.createBackground();
    this.createParallaxLayers();
    this.createTiles();
    this.createCharacter();
    this.createDialog();
    this.centerOnIndex(0, true);
    this.startCamera();
    this.bindKeyboard();
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
      this.rebuildParallaxLayers();
      this.rebuildTiles();
    };
    this.app.renderer.on('resize', this.resizeHandler);
  }

  loadAssets() {
    if (this.assetManager) {
      this.wallTexture = this.assetManager.getCasesFrameTexture();
      this.floorTexture = this.assetManager.getCasesFloorTexture();
      console.log('CasesScene: Textures loaded from AssetManager');
    } else {
      console.error('CasesScene: AssetManager not provided');
      this.wallTexture = null;
      this.floorTexture = null;
    }
  }

  buildCasesData() {
    this.casesData = CASES_DATA.map((item) => {
      const media = item.mediaKey && this.assetManager
        ? this.assetManager.getCaseScreenMedia?.(item.mediaKey)
        : null;

      return {
        title: item.title,
        category: item.category,
        textBlocks: item.textBlocks,
        contents: media
          ? [{ createDisplayObject: () => media.clone ? media.clone() : media }]
          : [],
      };
    });
    this.tileCount = this.casesData.length;
  }

  // ═══════════════════════════════════════════════════════════════
  // ПАРАЛЛАКС-СЛОИ
  // ═══════════════════════════════════════════════════════════════

  createParallaxLayers() {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    const layerDefs = [
      { texture: this.assetManager?.getSideBack?.(), speed: 0 },
      { texture: this.assetManager?.getSideExt?.(), speed: 0.3 },
      { texture: this.assetManager?.getSideRoad?.(), speed: 0.6 },
    ];

    for (const layerDef of layerDefs) {
      if (!layerDef.texture) continue;
      const layer = new TilingSprite({
        texture: layerDef.texture,
        width: screenW,
        height: screenH,
      });
      const texH = layerDef.texture.height || 336;
      const scale = screenH / texH;
      layer.tileScale.set(scale, scale);
      layer.parallaxFactor = layerDef.speed;
      this.parallaxContainer.addChild(layer);
      this.parallaxLayers.push(layer);
    }
  }

  rebuildParallaxLayers() {
    this.parallaxContainer.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });
    this.parallaxLayers = [];
    this.createParallaxLayers();
  }

  // ═══════════════════════════════════════════════════════════════
  // ТАЙЛЫ
  // ═══════════════════════════════════════════════════════════════

  addTileVisuals(tileGroup) {
    // Placeholder — визуалы тайлов добавляются здесь при необходимости
  }

  createTiles() {
    this.tiles = [];
    const step = this.tileWidth + this.tileGap - this.tileOverlap;
    const totalWidth = this.tileCount * this.tileWidth + (this.tileCount - 1) * (this.tileGap - this.tileOverlap);
    const startX = -totalWidth / 2 + this.tileWidth / 2;

    // Тайлы-заполнители слева
    for (let p = this.paddingTiles; p > 0; p--) {
      const padGroup = new Container();
      padGroup.x = startX - p * step;
      padGroup.y = 0;
      this.addTileVisuals(padGroup);
      this.tilesContainer.addChild(padGroup);
    }

    // Основные тайлы
    for (let i = 0; i < this.tileCount; i++) {
      const tileGroup = new Container();
      tileGroup.x = startX + i * step;
      tileGroup.y = 0;

      this.addTileVisuals(tileGroup);

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

    // Тайлы-заполнители справа
    for (let p = 1; p <= this.paddingTiles; p++) {
      const padGroup = new Container();
      padGroup.x = startX + (this.tileCount - 1 + p) * step;
      padGroup.y = 0;
      this.addTileVisuals(padGroup);
      this.tilesContainer.addChild(padGroup);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ДИАЛОГ
  // ═══════════════════════════════════════════════════════════════

  createDialog() {
    this.dialogContainer.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });

    const dialogWidth = Math.round(this.app.screen.width * 0.88);
    const dialogHeight = this.dialogHeight;

    // ── Крупный заголовок категории над диалогом ──
    const categoryLabel = new Text({
      text: '',
      style: {
        fill: 0xffffff,
        fontSize: 32,
        fontFamily: 'Sonic Genesis, monospace',
        fontWeight: 'bold',
      },
    });
    categoryLabel.anchor.set(0, 1);
    categoryLabel.x = 0;
    categoryLabel.y = -12;

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

    this.dialogContainer.addChild(categoryLabel);
    this.dialogContainer.addChild(dialog);
    this.dialogContainer.addChild(title);
    this.dialogContainer.addChild(body);
    this.dialogContainer.addChild(leftArrow);
    this.dialogContainer.addChild(rightArrow);
    this.dialogContainer.addChild(pageIndicator);

    this.dialogBox = dialog;
    this.dialogCategory = categoryLabel;
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
    const category = caseData.category || '';
    const blocks = caseData.textBlocks || [];
    const active = caseData.activeTextIndex ?? 0;
    const block = blocks[active] || '';

    if (this.dialogCategory) this.dialogCategory.text = category;
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

  // ═══════════════════════════════════════════════════════════════
  // КОНТЕНТ ТАЙЛОВ
  // ═══════════════════════════════════════════════════════════════

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
    if (!contentItem) return;

    const contentNode = contentItem.createDisplayObject
      ? contentItem.createDisplayObject()
      : contentItem.displayObject;
    if (!contentNode) return;

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

  // ═══════════════════════════════════════════════════════════════
  // САЙДСКРОЛЛЕР-ПЕРСОНАЖ
  // ═══════════════════════════════════════════════════════════════

  createCharacter() {
    const groundY = this.tileHeight / 2 + 40;
    this.groundY = groundY;
    this.charX = this.tiles?.[0]?.x ?? 0;

    // Загружаем фреймы из AssetManager
    this.charIdleFrames = this.assetManager?.getCharSideIdle?.() || [];
    this.charWalkFrames = this.assetManager?.getCharSideWalk?.() || [];

    this.charSprite = new Sprite();
    this.charSprite.anchor.set(0.5, 1); // якорь внизу по центру (ноги)
    this.charSprite.x = this.charX;
    this.charSprite.y = groundY;

    // Начальный кадр
    if (this.charIdleFrames.length > 0) {
      this.charSprite.texture = this.charIdleFrames[0];
    }

    // Масштаб — подгоняем высоту спрайта
    const targetHeight = 80;
    const texH = this.charSprite.texture?.height || 256;
    this.charSprite.scale.set(targetHeight / texH);

    this.characterContainer.addChild(this.charSprite);
  }

  updateCharacter(dt) {
    if (!this.charSprite) return;

    const moveAmount = this.charSpeed * dt * 60;
    let moving = false;

    if (this.inputKeys.has('right')) {
      this.charX += moveAmount;
      this.charDirection = 'right';
      moving = true;
    }
    if (this.inputKeys.has('left')) {
      this.charX -= moveAmount;
      this.charDirection = 'left';
      moving = true;
    }

    if (moving) {
      this.characterMode = true;
    }

    // Анимация
    const frames = moving ? this.charWalkFrames : this.charIdleFrames;
    if (frames.length > 0) {
      this.charFrameTime += dt;
      const frameDuration = 1 / this.charFps;
      if (this.charFrameTime >= frameDuration) {
        this.charFrameTime -= frameDuration;
        this.charFrameIndex = (this.charFrameIndex + 1) % frames.length;
      }
      this.charSprite.texture = frames[this.charFrameIndex];
    }

    // Позиция и направление
    this.charSprite.x = this.charX;
    const targetHeight = 80;
    const texH = this.charSprite.texture?.height || 256;
    const s = targetHeight / texH;
    this.charSprite.scale.set(this.charDirection === 'left' ? -s : s, s);
  }

  bindKeyboard() {
    this.keydownHandler = (e) => {
      const key = e.key;
      if (key === 'd' || key === 'D' || key === 'ArrowRight') this.inputKeys.add('right');
      if (key === 'a' || key === 'A' || key === 'ArrowLeft') this.inputKeys.add('left');
    };
    this.keyupHandler = (e) => {
      const key = e.key;
      if (key === 'd' || key === 'D' || key === 'ArrowRight') this.inputKeys.delete('right');
      if (key === 'a' || key === 'A' || key === 'ArrowLeft') this.inputKeys.delete('left');
    };
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
  }

  unbindKeyboard() {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.keyupHandler) {
      window.removeEventListener('keyup', this.keyupHandler);
      this.keyupHandler = null;
    }
    this.inputKeys.clear();
  }

  updateActiveIndexFromCharacter() {
    if (!this.tiles || this.tiles.length === 0) return;
    let closestIndex = 0;
    let closestDist = Infinity;
    for (let i = 0; i < this.tiles.length; i++) {
      const dist = Math.abs(this.tiles[i].x - this.charX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    }
    if (closestIndex !== this.activeIndex) {
      this.activeIndex = closestIndex;
      this.updateDialogForCase(this.activeIndex);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // КАМЕРА И НАВИГАЦИЯ
  // ═══════════════════════════════════════════════════════════════

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
    // Обновить персонажа
    const dt = this.app.ticker.deltaMS / 1000;
    this.updateCharacter(dt);

    // В режиме персонажа — камера следует за ним
    if (this.characterMode) {
      this.cameraTargetX = this.app.screen.width / 2 - this.charX;
      this.updateActiveIndexFromCharacter();
    }

    const prevX = this.container.x;
    this.container.x += (this.cameraTargetX - this.container.x) * this.cameraSmoothing;
    this.container.y += (this.cameraTargetY - this.container.y) * 0.08;
    const dx = this.container.x - prevX;

    // Фон следует за камерой
    if (this.background) {
      this.background.x = -this.container.x;
      this.background.y = -this.container.y;
    }

    // Параллакс: сдвигаем tilePosition пропорционально движению камеры
    // Низ параллакса совпадает с groundY персонажа
    const groundScreenY = (this.groundY ?? 0) + this.container.y;
    for (const layer of this.parallaxLayers) {
      const factor = layer.parallaxFactor ?? this.parallaxFactor;
      layer.x = -this.container.x;
      layer.y = groundScreenY - layer.height;
      layer.tilePosition.x += dx * (1 - factor);
    }

    // Диалог фиксирован на экране
    if (this.dialogContainer && this.dialogBox) {
      this.dialogContainer.x = -this.container.x + (this.app.screen.width - this.dialogBox.width) / 2;
      this.dialogContainer.y = -this.container.y + this.app.screen.height - this.bottomPadding - this.dialogBox.height - 20;
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
    this.characterMode = false;
    this.centerOnIndex(index, false);
    this.updateDialogForCase(index);
    // Телепортируем персонажа к выбранному тайлу
    const targetTile = this.tiles?.[index];
    if (targetTile) {
      this.charX = targetTile.x;
      if (this.charSprite) this.charSprite.x = this.charX;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ЖИЗНЕННЫЙ ЦИКЛ
  // ═══════════════════════════════════════════════════════════════

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.unbindKeyboard();
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
    this.bindKeyboard();
  }

  destroy() {
    this.unbindKeyboard();
    if (this.cameraTickerFn) {
      this.app.ticker.remove(this.cameraTickerFn);
      this.cameraTickerFn = null;
    }
    if (this.resizeHandler) {
      this.app.renderer.off('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    this.tiles = [];
    this.parallaxLayers = [];
    this.wallTexture = null;
    this.floorTexture = null;

    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true, texture: false, baseTexture: false });
  }

  getAIStatus() {
    return null;
  }
}
