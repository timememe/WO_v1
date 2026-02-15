import { Container, Sprite, Graphics, TilingSprite, Text } from 'pixi.js';
import { getLocale, GAME_FONT } from '../i18n';

// ═══════════════════════════════════════════════════════════════
// КОНТЕНТНЫЕ ДАННЫЕ ПРОЕКТОВ (только ключи и медиа)
// ═══════════════════════════════════════════════════════════════
const PROJECTS_DATA = [
  {
    localeKey: 'deulogue',
    mediaKey: 'duelogue_0',
  },
  {
    localeKey: 'agentCommander',
    mediaKey: 'AC_0',
  },
  {
    localeKey: 'kdw',
    mediaKey: 'kdw_0',
  },
];

export class ProjectsScene {
  constructor(app, options = {}, rootContainer = null, assetManager = null) {
    this.app = app;
    this.rootContainer = rootContainer || this.app.stage;
    this.assetManager = assetManager;
    this.sceneId = 'projects';

    // Локализация
    this.lang = options.lang || 'en';
    this.locale = getLocale(this.lang);
    this.font = GAME_FONT;

    this.tileCount = options.tileCount || 3;
    this.tileWidthRatio = options.tileWidthRatio ?? 0.85;
    this.tileWidth = options.tileWidth || 980;
    this.tileHeight = options.tileHeight || 512;
    this.tileGap = options.tileGap ?? 0;
    this.tileOverlap = options.tileOverlap ?? 2;
    this.baseTileWidth = this.tileWidth;
    this.baseTileHeight = this.tileHeight;
    this.backgroundColor = options.backgroundColor ?? 0x000000;
    this.debugMode = options.debugMode ?? false;
    this.projectsData = [];
    this.contentBoxScale = 0.7;
    this.contentBoxWidth = null;
    this.contentBoxHeight = null;
    this.paddingTiles = options.paddingTiles ?? 1;
    this.dialogPadding = 20;
    this.dialogHeight = 170;
    this.bottomPadding = 160;
    this.dialogTitleFontSize = 22;
    this.dialogBodyFontSize = 16;
    this.dialogBodyLineHeight = 20;
    this.dialogCategoryFontSize = 32;
    this.dialogTitleMinFontSize = 12;
    this.dialogBodyMinFontSize = 12;
    this.dialogCategoryMinFontSize = 14;
    this.dialogRightGutter = 80;

    // ── Персонаж: позиция и размер ──
    this.charGroundOffset = options.charGroundOffset ?? 0.3;
    this.charHeight = options.charHeight ?? 160;

    // ── Speech Bubble ──
    this.bubbleOffsetY = options.bubbleOffsetY ?? 20;

    // ── Параллакс ──
    this.parallaxFactor = options.parallaxFactor ?? 0.3;

    this.container = new Container();
    this.parallaxBgContainer = new Container();
    this.tilesContainer = new Container();
    this.parallaxFloorContainer = new Container();
    this.characterContainer = new Container();
    this.background = new Graphics();
    this.container.addChild(this.background);
    this.container.addChild(this.parallaxBgContainer);
    this.container.addChild(this.tilesContainer);
    this.container.addChild(this.parallaxFloorContainer);
    this.container.addChild(this.characterContainer);
    this.dialogContainer = new Container();
    this.container.addChild(this.dialogContainer);
    this.speechBubbleContainer = new Container();
    this.container.addChild(this.speechBubbleContainer);
    this.rootContainer.addChild(this.container);

    this.activeIndex = 0;
    this.cameraTargetX = 0;
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

    // ── Пасхалка: выход за границы тайлов ──
    this.beyondZone = 0;
    this.beyondMessages = this.locale.beyond || [];

    this.init();
  }

  init() {
    this.loadAssets();
    this.buildProjectsData();
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
      this.createDialog();
      this.centerOnIndex(this.activeIndex, true);
      if (this.charSprite) {
        this.charSprite.y = this.groundY;
      }
      this.bubbleWidth = Math.min(280, this.app.screen.width * 0.7);
      if (this.bubbleBody) {
        this.bubbleBody.style.wordWrapWidth = this.bubbleWidth - this.bubblePadding * 2;
      }
      this.updateBubbleBackground();
    };
    this.app.renderer.on('resize', this.resizeHandler);
  }

  loadAssets() {
    if (this.assetManager) {
      console.log('ProjectsScene: Textures loaded from AssetManager');
    } else {
      console.error('ProjectsScene: AssetManager not provided');
    }
  }

  buildProjectsData() {
    const createDisplayObjectFromMedia = (media) => {
      if (!media) return null;
      if (media.clone && typeof media.clone === 'function') {
        return media.clone();
      }
      if (media.source || media.baseTexture || media.frame) {
        return new Sprite(media);
      }
      return media;
    };

    this.projectsData = PROJECTS_DATA.map((item) => {
      const localized = this.locale.projects?.[item.localeKey] || {};
      const title = localized.title || item.localeKey.toUpperCase();
      const category = localized.category || '';
      const textBlocks = localized.slides || [];

      let contents = [];

      if (item.mediaKeys && this.assetManager) {
        contents = item.mediaKeys.map((key) => {
          const media = this.assetManager.getProjectScreenMedia?.(key);
          return media
            ? { createDisplayObject: () => createDisplayObjectFromMedia(media) }
            : null;
        }).filter(Boolean);
      } else if (item.mediaKey && this.assetManager) {
        const media = this.assetManager.getProjectScreenMedia?.(item.mediaKey);
        if (media) {
          contents = [{ createDisplayObject: () => createDisplayObjectFromMedia(media) }];
        }
      }

      return {
        title,
        category,
        textBlocks,
        contents,
        syncMediaWithText: !!item.mediaKeys,
      };
    });
    this.tileCount = this.projectsData.length;
  }

  setLanguage(lang) {
    this.lang = lang;
    this.locale = getLocale(lang);
    this.beyondMessages = this.locale.beyond || [];
    this.buildProjectsData();
    this.updateDialogForProject(this.activeIndex);
  }

  // ═══════════════════════════════════════════════════════════════
  // ПАРАЛЛАКС-СЛОИ
  // ═══════════════════════════════════════════════════════════════

  createParallaxLayers() {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    const layerDefs = [
      { texture: this.assetManager?.getProjectsBg?.(), speed: 0, isFloor: false },
      { texture: this.assetManager?.getProjectsMidBg?.(), speed: 0.3, isFloor: false },
      { texture: this.assetManager?.getProjectsGround?.(), speed: 0.6, isFloor: true },
    ];

    const refTexture = layerDefs.find(l => l.texture)?.texture;
    const texH = refTexture?.height || 336;
    const scale = screenH / texH;
    this.sceneHeight = screenH;

    this.groundY = screenH / 2 + screenH * this.charGroundOffset;

    this.tileWidth = this.baseTileWidth;
    this.tileHeight = this.baseTileHeight;

    const targetContentWidth = Math.round(screenW * this.tileWidthRatio * this.contentBoxScale);
    const maxContentWidth = Math.round(this.tileWidth * this.contentBoxScale);
    this.contentBoxWidth = Math.min(targetContentWidth, maxContentWidth);
    this.contentBoxHeight = Math.round(this.tileHeight * this.contentBoxScale);

    this.tilesY = this.tileHeight / 2;

    // Задний и средний слои занимают верхние 2/3 экрана (отступ снизу на треть)
    const bgHeight = Math.round(screenH * 2 / 3);

    for (const layerDef of layerDefs) {
      if (!layerDef.texture) continue;
      const layerH = layerDef.isFloor ? screenH : bgHeight;
      const texH_layer = layerDef.texture.height || 336;
      const layerScale = layerH / texH_layer;

      const layer = new TilingSprite({
        texture: layerDef.texture,
        width: screenW,
        height: layerH,
      });
      layer.tileScale.set(layerScale, layerScale);
      layer.parallaxFactor = layerDef.speed;

      const target = layerDef.isFloor ? this.parallaxFloorContainer : this.parallaxBgContainer;
      target.addChild(layer);
      this.parallaxLayers.push(layer);
    }
  }

  rebuildParallaxLayers() {
    for (const cont of [this.parallaxBgContainer, this.parallaxFloorContainer]) {
      cont.removeChildren().forEach((child) => {
        child.destroy({ children: true, texture: false, baseTexture: false });
      });
    }
    this.parallaxLayers = [];
    this.createParallaxLayers();
  }

  // ═══════════════════════════════════════════════════════════════
  // ТАЙЛЫ
  // ═══════════════════════════════════════════════════════════════

  addTileVisuals(tileGroup) {
    // Placeholder
  }

  createTiles() {
    this.tiles = [];
    const step = this.tileWidth + this.tileGap - this.tileOverlap;
    const totalWidth = this.tileCount * this.tileWidth + (this.tileCount - 1) * (this.tileGap - this.tileOverlap);
    const startX = -totalWidth / 2 + this.tileWidth / 2;

    const tileY = this.tilesY ?? this.app.screen.height / 2;

    for (let p = this.paddingTiles; p > 0; p--) {
      const padGroup = new Container();
      padGroup.x = startX - p * step;
      padGroup.y = tileY;
      this.addTileVisuals(padGroup);
      this.tilesContainer.addChild(padGroup);
    }

    for (let i = 0; i < this.tileCount; i++) {
      const tileGroup = new Container();
      tileGroup.x = startX + i * step;
      tileGroup.y = tileY;

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

    for (let p = 1; p <= this.paddingTiles; p++) {
      const padGroup = new Container();
      padGroup.x = startX + (this.tileCount - 1 + p) * step;
      padGroup.y = tileY;
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

    const dialogBg = new Graphics();
    this.dialogBg = dialogBg;

    const categoryLabel = new Text({
      text: '',
      style: {
        fill: 0x4de3ff,
        fontSize: this.dialogCategoryFontSize,
        fontFamily: this.font,
        fontWeight: 'bold',
      },
    });
    categoryLabel.anchor.set(0.5, 1);

    const title = new Text({
      text: '',
      style: {
        fill: 0xffffff,
        fontSize: this.dialogTitleFontSize,
        fontFamily: this.font,
      },
    });
    title.anchor.set(0.5, 1);

    this.dialogContainer.addChild(dialogBg);
    this.dialogContainer.addChild(categoryLabel);
    this.dialogContainer.addChild(title);

    this.dialogCategory = categoryLabel;
    this.dialogTitle = title;

    this.createSpeechBubble();

    this.updateDialogForProject(this.activeIndex);
  }

  updateDialogBackground() {
    if (!this.dialogBg || !this.dialogCategory || !this.dialogTitle) return;

    const padding = 12;
    const catH = this.dialogCategory.height;
    const titleH = this.dialogTitle.height;

    const box = this.getContentBox();
    const framePadding = 10;
    const totalW = box.width + framePadding * 2;
    const totalH = catH + titleH + 8 + padding * 2;

    const maxTextW = totalW - padding * 2;
    this.dialogCategory.scale.x = 1;
    const catNatW = this.dialogCategory.width;
    if (catNatW > maxTextW) {
      this.dialogCategory.scale.x = maxTextW / catNatW;
    }
    this.dialogTitle.scale.x = 1;
    const titleNatW = this.dialogTitle.width;
    if (titleNatW > maxTextW) {
      this.dialogTitle.scale.x = maxTextW / titleNatW;
    }

    this.dialogBg.clear();
    this.dialogBg.roundRect(-totalW / 2, -totalH, totalW, totalH, 8);
    this.dialogBg.fill({ color: 0x000000, alpha: 0.7 });
    this.dialogBg.stroke({ width: 2, color: 0x4de3ff, alpha: 0.8 });

    this.dialogCategory.x = 0;
    this.dialogCategory.y = -titleH - 8 - padding;
    this.dialogTitle.x = 0;
    this.dialogTitle.y = -padding;
  }

  createSpeechBubble() {
    this.speechBubbleContainer.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });

    const bubbleWidth = Math.min(280, this.app.screen.width * 0.7);
    const bubblePadding = 14;
    const tailHeight = 12;

    const navContainer = new Container();

    const navBg = new Graphics();
    navBg.roundRect(-50, -4, 100, 28, 14);
    navBg.fill({ color: 0x000000, alpha: 0.8 });
    navBg.stroke({ width: 2, color: 0xffffff, alpha: 0.9 });

    const leftArrow = new Graphics();
    leftArrow.moveTo(0, 8);
    leftArrow.lineTo(12, 0);
    leftArrow.lineTo(12, 16);
    leftArrow.closePath();
    leftArrow.fill({ color: 0x4de3ff, alpha: 1 });
    leftArrow.x = -38;
    leftArrow.y = 2;
    leftArrow.eventMode = 'static';
    leftArrow.cursor = 'pointer';
    leftArrow.on('pointertap', () => this.nextText(-1));

    const rightArrow = new Graphics();
    rightArrow.moveTo(12, 8);
    rightArrow.lineTo(0, 0);
    rightArrow.lineTo(0, 16);
    rightArrow.closePath();
    rightArrow.fill({ color: 0x4de3ff, alpha: 1 });
    rightArrow.x = 26;
    rightArrow.y = 2;
    rightArrow.eventMode = 'static';
    rightArrow.cursor = 'pointer';
    rightArrow.on('pointertap', () => this.nextText(1));

    const pageIndicator = new Text({
      text: '',
      style: {
        fill: 0xffffff,
        fontSize: 12,
        fontFamily: this.font,
      },
    });
    pageIndicator.anchor.set(0.5, 0.5);
    pageIndicator.y = 10;

    navContainer.addChild(navBg);
    navContainer.addChild(leftArrow);
    navContainer.addChild(pageIndicator);
    navContainer.addChild(rightArrow);

    this.navBg = navBg;

    const bubbleBody = new Text({
      text: '',
      style: {
        fill: 0x333333,
        fontSize: this.dialogBodyFontSize,
        fontFamily: this.font,
        wordWrap: true,
        wordWrapWidth: bubbleWidth - bubblePadding * 2,
        lineHeight: this.dialogBodyLineHeight,
        align: 'left',
      },
    });
    bubbleBody.anchor.set(0, 0);

    const bubbleBg = new Graphics();
    bubbleBg.eventMode = 'static';
    bubbleBg.cursor = 'pointer';
    bubbleBg.on('pointertap', () => this.nextText(1));

    bubbleBody.eventMode = 'static';
    bubbleBody.cursor = 'pointer';
    bubbleBody.on('pointertap', () => this.nextText(1));

    this.speechBubbleContainer.addChild(navContainer);
    this.speechBubbleContainer.addChild(bubbleBg);
    this.speechBubbleContainer.addChild(bubbleBody);

    this.bubbleNav = navContainer;
    this.bubbleLeft = leftArrow;
    this.bubbleRight = rightArrow;
    this.bubblePage = pageIndicator;
    this.bubbleBg = bubbleBg;
    this.bubbleBody = bubbleBody;
    this.bubbleWidth = bubbleWidth;
    this.bubblePadding = bubblePadding;
    this.bubbleTailHeight = tailHeight;
  }

  updateBubbleBackground() {
    if (!this.bubbleBg || !this.bubbleBody) return;

    const padding = this.bubblePadding;
    const tailHeight = this.bubbleTailHeight;
    const textW = Math.max(60, this.bubbleBody.width);
    const textH = Math.max(20, this.bubbleBody.height);
    const bubbleW = textW + padding * 2;
    const bubbleH = textH + padding * 2;

    this.bubbleBg.clear();

    this.bubbleBg.roundRect(-bubbleW / 2, -bubbleH - tailHeight, bubbleW, bubbleH, 8);
    this.bubbleBg.fill({ color: 0xffffff, alpha: 0.95 });
    this.bubbleBg.stroke({ width: 3, color: 0x333333 });

    this.bubbleBg.moveTo(-8, -tailHeight);
    this.bubbleBg.lineTo(0, 0);
    this.bubbleBg.lineTo(8, -tailHeight);
    this.bubbleBg.fill({ color: 0xffffff, alpha: 0.95 });
    this.bubbleBg.stroke({ width: 2, color: 0x333333 });

    this.bubbleBg.moveTo(-7, -tailHeight - 1);
    this.bubbleBg.lineTo(7, -tailHeight - 1);
    this.bubbleBg.stroke({ width: 3, color: 0xffffff });

    this.bubbleBody.x = -bubbleW / 2 + padding;
    this.bubbleBody.y = -bubbleH - tailHeight + padding;

    if (this.bubbleNav) {
      this.bubbleNav.y = -bubbleH - tailHeight - 30;
    }
  }

  updateDialogForProject(index, syncMedia = false) {
    const projectData = this.projectsData?.[index];
    if (!projectData) return;
    const title = projectData.title || `PROJECT ${index + 1}`;
    const category = projectData.category || '';
    const blocks = projectData.textBlocks || [];
    const active = projectData.activeTextIndex ?? 0;
    const block = blocks[active] || '';

    if (this.dialogContainer) this.dialogContainer.visible = true;

    if (this.dialogCategory) this.dialogCategory.text = category;
    if (this.dialogTitle) this.dialogTitle.text = title;

    if (this.bubbleBody) this.bubbleBody.text = block;
    const showArrows = blocks.length > 1;
    if (this.bubbleLeft) this.bubbleLeft.visible = showArrows;
    if (this.bubbleRight) this.bubbleRight.visible = showArrows;
    if (this.navBg) this.navBg.visible = showArrows;
    if (this.bubblePage) {
      this.bubblePage.text = blocks.length > 0 ? `${active + 1}/${blocks.length}` : '';
      this.bubblePage.visible = showArrows;
    }

    this.updateBubbleBackground();
    this.updateDialogBackground();
    this.fitDialogText();

    if (syncMedia && projectData.syncMediaWithText && projectData.contents.length > 0) {
      const mediaIndex = Math.min(active, projectData.contents.length - 1);
      if (projectData.activeIndex !== mediaIndex) {
        this.setActiveContent(index, mediaIndex);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // КОНТЕНТ ТАЙЛОВ
  // ═══════════════════════════════════════════════════════════════

  renderTileContent(index, container) {
    container.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });

    const projectData = this.projectsData[index];
    if (!projectData || !projectData.contents || projectData.contents.length === 0) {
      // Плейсхолдер для проектов без медиа
      const placeholder = new Graphics();
      const box = this.getContentBox();
      const framePadding = 10;

      // Рамка в стиле голограммы
      const holoColor = 0x4de3ff;
      placeholder.roundRect(-box.width / 2 - framePadding, -box.height / 2 - framePadding, box.width + framePadding * 2, box.height + framePadding * 2, 4);
      placeholder.fill({ color: holoColor, alpha: 0.1 });
      placeholder.stroke({ width: 2, color: holoColor, alpha: 0.6 });
      container.addChild(placeholder);

      const label = new Text({
        text: projectData?.title || `PROJECT ${index + 1}`,
        style: { fill: 0x4de3ff, fontSize: 24, fontFamily: this.font },
      });
      label.anchor.set(0.5);
      container.addChild(label);
      return;
    }

    const activeIndex = projectData.activeIndex ?? 0;
    const contentItem = projectData.contents[activeIndex];
    if (!contentItem) return;

    const contentNode = contentItem.createDisplayObject
      ? contentItem.createDisplayObject()
      : contentItem.displayObject;
    if (!contentNode) return;

    const box = this.getContentBox();
    const framePadding = 10;
    const frameX = -box.width / 2 - framePadding;
    const frameY = -box.height / 2 - framePadding;
    const frameW = box.width + framePadding * 2;
    const frameH = box.height + framePadding * 2;
    const radius = 4;

    const holoColor = 0x4fc3f7;
    const holoColorDark = 0x0288d1;

    const frame = new Graphics();

    frame.roundRect(frameX - 4, frameY - 4, frameW + 8, frameH + 8, radius + 2);
    frame.stroke({ width: 6, color: holoColor, alpha: 0.15 });
    frame.roundRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4, radius + 1);
    frame.stroke({ width: 3, color: holoColor, alpha: 0.25 });

    frame.roundRect(frameX, frameY, frameW, frameH, radius);
    frame.fill({ color: holoColor, alpha: 0.15 });
    frame.stroke({ width: 2, color: holoColor, alpha: 0.9 });

    const cornerSize = 16;
    const corners = [
      [frameX, frameY],
      [frameX + frameW - cornerSize, frameY],
      [frameX, frameY + frameH - cornerSize],
      [frameX + frameW - cornerSize, frameY + frameH - cornerSize],
    ];

    corners.forEach(([cx, cy], i) => {
      frame.moveTo(cx + (i % 2 === 0 ? 0 : cornerSize), cy);
      frame.lineTo(cx + (i % 2 === 0 ? cornerSize : 0), cy);
      frame.moveTo(cx + (i % 2 === 0 ? 0 : cornerSize), cy);
      frame.lineTo(cx + (i % 2 === 0 ? 0 : cornerSize), cy + (i < 2 ? cornerSize : -cornerSize + cornerSize));
      frame.stroke({ width: 3, color: holoColor, alpha: 1 });
    });

    const scanlines = new Graphics();
    for (let y = frameY; y < frameY + frameH; y += 4) {
      scanlines.moveTo(frameX, y);
      scanlines.lineTo(frameX + frameW, y);
    }
    scanlines.stroke({ width: 1, color: holoColorDark, alpha: 0.12 });

    container.addChild(frame);
    container.addChild(scanlines);

    contentNode.anchor?.set?.(0.5, 0.5);
    this.fitDisplayObject(contentNode, box.width, box.height);
    contentNode.x = 0;
    contentNode.y = 0;
    container.addChild(contentNode);
  }

  getContentBox() {
    if (this.contentBoxWidth && this.contentBoxHeight) {
      return {
        width: this.contentBoxWidth,
        height: this.contentBoxHeight,
      };
    }
    return {
      width: Math.round(this.tileWidth * this.contentBoxScale),
      height: Math.round(this.tileHeight * this.contentBoxScale),
    };
  }

  fitDialogText() {
    const maxTextWidth = this.app.screen.width * 0.8;

    if (this.dialogCategory) {
      this.fitTextToBox(this.dialogCategory, {
        maxWidth: maxTextWidth,
        maxHeight: 40,
        maxFontSize: this.dialogCategoryFontSize,
        minFontSize: this.dialogCategoryMinFontSize,
        wordWrap: false,
      });
    }

    if (this.dialogTitle) {
      this.fitTextToBox(this.dialogTitle, {
        maxWidth: maxTextWidth,
        maxHeight: 30,
        maxFontSize: this.dialogTitleFontSize,
        minFontSize: this.dialogTitleMinFontSize,
        wordWrap: true,
      });
    }

    if (this.bubbleBody) {
      this.fitTextToBox(this.bubbleBody, {
        maxWidth: this.bubbleWidth - this.bubblePadding * 2,
        maxHeight: 120,
        maxFontSize: this.dialogBodyFontSize,
        minFontSize: this.dialogBodyMinFontSize,
        wordWrap: true,
        lineHeightRatio: this.dialogBodyLineHeight / this.dialogBodyFontSize,
      });
      this.updateBubbleBackground();
    }
  }

  fitTextToBox(textObject, options) {
    if (!textObject || !options) return;
    const {
      maxWidth,
      maxHeight,
      maxFontSize,
      minFontSize,
      wordWrap,
      lineHeightRatio,
    } = options;

    if (!maxWidth || !maxHeight) return;
    const style = textObject.style;
    style.wordWrap = !!wordWrap;
    style.wordWrapWidth = maxWidth;

    let size = maxFontSize;
    const ratio = lineHeightRatio || 1.2;
    const guard = Math.max(1, maxFontSize - minFontSize + 2);

    for (let i = 0; i < guard; i += 1) {
      style.fontSize = size;
      if (lineHeightRatio) {
        style.lineHeight = Math.round(size * ratio);
      }
      textObject.onViewUpdate?.();
      if (textObject.width <= maxWidth + 0.5 && textObject.height <= maxHeight + 0.5) {
        break;
      }
      size -= 1;
      if (size < minFontSize) {
        style.fontSize = minFontSize;
        if (lineHeightRatio) {
          style.lineHeight = Math.round(minFontSize * ratio);
        }
        textObject.onViewUpdate?.();
        break;
      }
    }
  }

  fitDisplayObject(node, maxW, maxH) {
    const w = node.width || 1;
    const h = node.height || 1;
    const scale = Math.min(maxW / w, maxH / h);
    node.scale?.set?.(scale);
  }

  setProjectsData(projectsData) {
    this.projectsData = projectsData || [];
    this.rebuildTiles();
    this.updateDialogForProject(this.activeIndex);
  }

  setActiveContent(tileIndex, contentIndex) {
    const projectData = this.projectsData?.[tileIndex];
    if (!projectData) return;
    projectData.activeIndex = Math.max(0, Math.min(projectData.contents.length - 1, contentIndex));
    const tileGroup = this.tiles?.[tileIndex];
    const contentContainer = tileGroup?.children?.find((child) => child.label === 'content');
    if (contentContainer) {
      this.renderTileContent(tileIndex, contentContainer);
    }
  }

  nextContent(tileIndex, direction = 1) {
    const projectData = this.projectsData?.[tileIndex];
    if (!projectData || !projectData.contents || projectData.contents.length === 0) return;
    const current = projectData.activeIndex ?? 0;
    const next = (current + direction + projectData.contents.length) % projectData.contents.length;
    this.setActiveContent(tileIndex, next);
  }

  nextText(direction = 1) {
    const projectData = this.projectsData?.[this.activeIndex];
    if (!projectData || !projectData.textBlocks || projectData.textBlocks.length === 0) return;
    const current = projectData.activeTextIndex ?? 0;
    const next = (current + direction + projectData.textBlocks.length) % projectData.textBlocks.length;
    projectData.activeTextIndex = next;
    this.updateDialogForProject(this.activeIndex);

    if (projectData.syncMediaWithText && projectData.contents.length > 0) {
      const mediaIndex = Math.min(next, projectData.contents.length - 1);
      this.setActiveContent(this.activeIndex, mediaIndex);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // САЙДСКРОЛЛЕР-ПЕРСОНАЖ
  // ═══════════════════════════════════════════════════════════════

  createCharacter() {
    this.charX = this.tiles?.[0]?.x ?? 0;

    this.charIdleFrames = this.assetManager?.getProjectsCharSideIdle?.() || [];
    this.charWalkFrames = this.assetManager?.getProjectsCharSideWalk?.() || [];

    this.charSprite = new Sprite();
    this.charSprite.anchor.set(0.5, 1);
    this.charSprite.x = this.charX;
    this.charSprite.y = this.groundY;

    if (this.charIdleFrames.length > 0) {
      this.charSprite.texture = this.charIdleFrames[0];
    }

    const texH = this.charSprite.texture?.height || 256;
    this.charSprite.scale.set(this.charHeight / texH);

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

    this.charSprite.x = this.charX;
    const texH = this.charSprite.texture?.height || 256;
    const s = this.charHeight / texH;
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

  setKeysPressed(keys) {
    if (keys.left) this.inputKeys.add('left'); else this.inputKeys.delete('left');
    if (keys.right) this.inputKeys.add('right'); else this.inputKeys.delete('right');
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
      this.updateDialogForProject(this.activeIndex);
    }
  }

  checkBeyondBounds() {
    if (!this.tiles || this.tiles.length === 0) return;

    const firstTileX = this.tiles[0].x;
    const lastTileX = this.tiles[this.tiles.length - 1].x;
    const halfTile = this.tileWidth / 2;
    const leftEdge = firstTileX - halfTile;
    const rightEdge = lastTileX + halfTile;
    const zoneStep = this.tileWidth * 0.5;

    let overflow = 0;
    if (this.charX < leftEdge) {
      overflow = leftEdge - this.charX;
    } else if (this.charX > rightEdge) {
      overflow = this.charX - rightEdge;
    }

    let newZone = 0;
    if (overflow > 0) {
      newZone = Math.min(this.beyondMessages.length, Math.floor(overflow / zoneStep) + 1);
    }

    if (newZone !== this.beyondZone) {
      this.beyondZone = newZone;
      if (newZone > 0 && this.beyondMessages[newZone - 1]) {
        this.showBeyondMessage(this.beyondMessages[newZone - 1]);
      } else if (newZone === 0) {
        this.updateDialogForProject(this.activeIndex);
      }
    }
  }

  showBeyondMessage(text) {
    if (this.bubbleBody) this.bubbleBody.text = text;
    if (this.bubbleLeft) this.bubbleLeft.visible = false;
    if (this.bubbleRight) this.bubbleRight.visible = false;
    if (this.navBg) this.navBg.visible = false;
    if (this.bubblePage) this.bubblePage.visible = false;
    if (this.dialogContainer) this.dialogContainer.visible = false;
    this.updateBubbleBackground();
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
    this.getTicker().add(this.cameraTickerFn);
  }

  getTicker() {
    return this.app?.gameTicker ?? this.app?.ticker;
  }

  updateCamera() {
    const dt = this.getTicker().deltaMS / 1000;
    this.updateCharacter(dt);

    if (this.characterMode) {
      this.cameraTargetX = this.app.screen.width / 2 - this.charX;
      this.updateActiveIndexFromCharacter();
      this.checkBeyondBounds();
    }

    const prevX = this.container.x;
    this.container.x += (this.cameraTargetX - this.container.x) * this.cameraSmoothing;
    const dx = this.container.x - prevX;

    if (this.background) {
      this.background.x = -this.container.x;
      this.background.y = 0;
    }

    for (const layer of this.parallaxLayers) {
      const factor = layer.parallaxFactor ?? this.parallaxFactor;
      layer.x = -this.container.x;
      layer.y = 0;
      layer.tilePosition.x += dx * (1 - factor);
    }

    const activeTile = this.tiles?.[this.activeIndex];
    if (this.dialogContainer && activeTile) {
      const box = this.getContentBox();
      const framePadding = 10;
      const frameTop = activeTile.y - box.height / 2 - framePadding;
      this.dialogContainer.x = activeTile.x;
      this.dialogContainer.y = frameTop - 2;
    }

    if (this.speechBubbleContainer && this.charSprite) {
      this.speechBubbleContainer.x = this.charSprite.x;
      this.speechBubbleContainer.y = this.charSprite.y - this.charHeight + this.bubbleOffsetY;
    }
  }

  centerOnIndex(index, immediate = false) {
    const clamped = Math.max(0, Math.min(this.tileCount - 1, index));
    this.activeIndex = clamped;
    const targetTile = this.tiles?.[clamped];
    if (!targetTile) return;

    const targetX = this.app.screen.width / 2 - targetTile.x;
    this.cameraTargetX = targetX;
    if (immediate) {
      this.container.x = targetX;
      this.container.y = 0;
    }
    this.updateDialogForProject(this.activeIndex);
  }

  setActiveTile(index) {
    this.characterMode = false;
    this.centerOnIndex(index, false);
    this.updateDialogForProject(index, true);
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
      this.getTicker().remove(this.cameraTickerFn);
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
      this.getTicker().add(this.cameraTickerFn);
    }
    this.bindKeyboard();
  }

  destroy() {
    this.unbindKeyboard();
    if (this.cameraTickerFn) {
      this.getTicker().remove(this.cameraTickerFn);
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

    this.bubbleBg = null;
    this.bubbleBody = null;
    this.bubbleNav = null;
    this.dialogCategory = null;
    this.dialogTitle = null;

    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true, texture: false, baseTexture: false });
  }

  getAIStatus() {
    return null;
  }
}
