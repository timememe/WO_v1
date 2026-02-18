import { Container, Sprite, Graphics, Text } from 'pixi.js';
import { getLocale, GAME_FONT } from '../i18n';

// ═══════════════════════════════════════════════════════════════
// ДАННЫЕ КАРТОЧКИ ПЕРСОНАЖА - РЕДАКТИРУЙ ЗДЕСЬ
// ═══════════════════════════════════════════════════════════════

const PROFILE = {
  name: 'ROMAN T',
  title: 'CREATIVE DEVELOPER',
  level: 'LVL 33',
  location: 'ALMATY, KZ',
};

const STATS = [
  { name: 'CODING', value: 85, color: 0x4de3ff },
  { name: 'COPYWRITING / SMM', value: 90, color: 0x6dff9d },
  { name: 'DESIGN', value: 75, color: 0xff86b2 },
];

const SKILLS = [
  'JavaScript',
  'React',
  'PixiJS',
  'Node.js',
  'Python',
  'Figma',
  'Three.js',
  'Game Dev',
];

// Секретные флайты (6 кнопок)
const SECRET_FLIGHTS = [
  { id: 'story1', label: 'ORIGINS', icon: '◆' },
  { id: 'story2', label: 'LITERATURE', icon: '◇' },
  { id: 'story3', label: 'SCIENCE', icon: '◈' },
  { id: 'story4', label: 'AWARDS', icon: '◉' },
  { id: 'story5', label: 'SECRETS', icon: '◎' },
  { id: 'story6', label: 'FUTURE', icon: '●' },
];

// ═══════════════════════════════════════════════════════════════

export class AboutScene {
  constructor(app, options = {}, rootContainer = null, assetManager = null) {
    this.app = app;
    this.rootContainer = rootContainer || this.app.stage;
    this.assetManager = assetManager;
    this.sceneId = 'about';

    this.backgroundColor = options.backgroundColor ?? 0x000000;

    // Локализация
    this.lang = options.lang || 'en';
    this.locale = getLocale(this.lang);

    // Состояние историй (6 штук, по imageIndex и textIndex)
    this.storyState = Array.from({ length: 6 }, () => ({ imageIndex: 0, textIndex: 0 }));

    // Параметры системы флайтов (адаптивные)
    this.flightGap = options.flightGap ?? 60;
    this.flightCount = 8; // 1-profile, 2-skills, 3-8 secret stories
    this.navHeight = 60; // Высота навигационной панели
    this.bottomPadding = 160; // Отступ для внешнего меню навигации

    this.container = new Container();
    this.background = new Graphics();
    this.flightsContainer = new Container();
    this.navContainer = new Container();

    this.container.addChild(this.background);
    this.container.addChild(this.flightsContainer);
    this.container.addChild(this.navContainer);
    this.rootContainer.addChild(this.container);

    this.flights = [];
    this.activeIndex = 0;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
    this.cameraSmoothing = 0.08;
    this.cameraTickerFn = null;
    this.isPaused = false;
    this.resizeHandler = null;

    // Цвета в стиле Genesis
    this.colors = {
      panelBg: 0x0b0f1d,
      panelBorder: 0x1c2a4a,
      panelInner: 0x0a0e18,
      accent: 0x4de3ff,
      accentAlt: 0x86f7ff,
      textPrimary: 0xe8f2ff,
      textSecondary: 0x93a9d6,
      statCoding: 0x4de3ff,
      statCopywriting: 0x6dff9d,
      statDesign: 0xff86b2,
      barBg: 0x0a0f22,
      barBorder: 0x1b2744,
      tagBg: 0x182140,
      tagBorder: 0x243150,
      buttonBg: 0x1a2845,
      buttonBorder: 0x2d4a7a,
      buttonHover: 0x2a3f65,
    };

    this.init();
  }

  setLanguage(lang) {
    this.lang = lang;
    this.locale = getLocale(lang);
    // Пересобрать story flights с новыми текстами
    for (let i = 0; i < 6; i++) {
      this.rebuildStoryFlight(i);
    }
  }

  async init() {
    this.calculateFlightSize();
    this.createBackground();
    this.createFlights();
    this.createNavigation();
    this.centerOnIndex(0, true);
    this.startCamera();
    this.bindResize();
  }

  calculateFlightSize() {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    // Флайт должен помещаться с отступами (включая внешнее меню)
    const maxWidth = screenW - 40;
    const maxHeight = screenH - this.navHeight - this.bottomPadding - 20;

    // Базовые размеры (9:16)
    const baseWidth = 360;
    const baseHeight = 640;
    const aspectRatio = 9 / 16;

    // Вычисляем размер, который влезет в экран
    let width = Math.min(baseWidth, maxWidth);
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    this.flightWidth = Math.round(width);
    this.flightHeight = Math.round(height);

    // Масштаб для адаптации шрифтов и элементов
    this.scaleFactor = this.flightWidth / baseWidth;
  }

  // Адаптивный размер шрифта
  fontSize(base) {
    return Math.round(base * this.scaleFactor);
  }

  createBackground() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: this.backgroundColor, alpha: 1 });
  }

  bindResize() {
    this.resizeHandler = () => {
      this.calculateFlightSize();
      this.createBackground();
      this.rebuildFlights();
      this.createNavigation();
    };
    this.app.renderer.on('resize', this.resizeHandler);
  }

  // ═══════════════════════════════════════════════════════════════
  // СИСТЕМА ФЛАЙТОВ
  // ═══════════════════════════════════════════════════════════════

  createFlights() {
    this.flights = [];
    const step = this.flightWidth + this.flightGap;
    const totalWidth = this.flightCount * this.flightWidth + (this.flightCount - 1) * this.flightGap;
    const startX = -totalWidth / 2 + this.flightWidth / 2;

    for (let i = 0; i < this.flightCount; i++) {
      const flightContainer = new Container();
      flightContainer.x = startX + i * step;
      flightContainer.y = 0;

      // Отрисовка содержимого флайта
      this.renderFlightContent(i, flightContainer);

      this.flightsContainer.addChild(flightContainer);
      this.flights.push(flightContainer);
    }
  }

  renderFlightContent(index, container) {
    container.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });

    switch (index) {
      case 0:
        this.renderProfileFlight(container);
        break;
      case 1:
        this.renderSkillsFlight(container);
        break;
      default:
        this.renderSecretFlight(container, index - 2);
        break;
    }
  }

  clearFlights() {
    this.flightsContainer.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });
    this.flights = [];
  }

  rebuildFlights() {
    this.clearFlights();
    this.createFlights();
    this.centerOnIndex(this.activeIndex, true);
  }

  // ═══════════════════════════════════════════════════════════════
  // FLIGHT 1: ПРОФИЛЬ + 6 КНОПОК
  // ═══════════════════════════════════════════════════════════════

  renderProfileFlight(container) {
    const cardWidth = this.flightWidth;
    const cardHeight = this.flightHeight;
    const cardX = -cardWidth / 2;
    const cardY = -cardHeight / 2;
    const s = this.scaleFactor;

    // Основная панель карточки
    const cardPanel = this.createPanel(cardX, cardY, cardWidth, cardHeight);
    container.addChild(cardPanel);

    // Внутренний отступ
    const padding = Math.round(20 * s);
    const innerX = cardX + padding;
    const innerY = cardY + padding;
    const innerWidth = cardWidth - padding * 2;

    let currentY = innerY;

    // === HEADER: Фото + Имя ===
    const photoSize = Math.round(Math.min(150 * s, innerWidth * 0.35));
    const headerHeight = photoSize + Math.round(10 * s);

    // Рамка для фото
    const photoFrame = this.createPhotoFrame(innerX, currentY, photoSize);
    container.addChild(photoFrame);

    // Имя и титул справа от фото
    const nameX = innerX + photoSize + Math.round(16 * s);

    const nameText = new Text({
      text: PROFILE.name,
      style: {
        fill: this.colors.textPrimary,
        fontSize: this.fontSize(48),
        fontFamily: 'Sonic Genesis, monospace',
        fontWeight: 'bold',
        letterSpacing: 2,
      },
    });
    nameText.x = nameX;
    nameText.y = currentY + Math.round(8 * s);
    container.addChild(nameText);

    const titleText = new Text({
      text: PROFILE.title,
      style: {
        fill: this.colors.accent,
        fontSize: this.fontSize(17),
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 1,
      },
    });
    titleText.x = nameX;
    titleText.y = currentY + Math.round(58 * s);
    container.addChild(titleText);

    const levelText = new Text({
      text: PROFILE.level,
      style: {
        fill: this.colors.accentAlt,
        fontSize: this.fontSize(21),
        fontFamily: 'Sonic Genesis, monospace',
        fontWeight: 'bold',
      },
    });
    levelText.x = nameX;
    levelText.y = currentY + Math.round(85 * s);
    container.addChild(levelText);

    const locationText = new Text({
      text: PROFILE.location,
      style: {
        fill: this.colors.textSecondary,
        fontSize: this.fontSize(15),
        fontFamily: 'Sonic Genesis, monospace',
      },
    });
    locationText.x = nameX;
    locationText.y = currentY + Math.round(115 * s);
    container.addChild(locationText);

    currentY += headerHeight + Math.round(20 * s);

    // === DIVIDER ===
    const divider = new Graphics();
    divider.moveTo(innerX, currentY);
    divider.lineTo(innerX + innerWidth, currentY);
    divider.stroke({ width: 2, color: this.colors.panelBorder, alpha: 0.8 });
    container.addChild(divider);

    currentY += Math.round(16 * s);

    // === STATS SECTION ===
    const statsTitle = new Text({
      text: 'STATS',
      style: {
        fill: this.colors.textSecondary,
        fontSize: this.fontSize(15),
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 3,
      },
    });
    statsTitle.x = innerX;
    statsTitle.y = currentY;
    container.addChild(statsTitle);

    currentY += Math.round(28 * s);

    const statHeight = Math.round(42 * s);
    const statGap = Math.round(12 * s);

    STATS.forEach((stat, index) => {
      const statY = currentY + index * (statHeight + statGap);
      const statBar = this.createStatBar(innerX, statY, innerWidth, statHeight, stat);
      container.addChild(statBar);
    });

    currentY += STATS.length * (statHeight + statGap) + Math.round(16 * s);

    // === DIVIDER 2 ===
    const divider2 = new Graphics();
    divider2.moveTo(innerX, currentY);
    divider2.lineTo(innerX + innerWidth, currentY);
    divider2.stroke({ width: 2, color: this.colors.panelBorder, alpha: 0.8 });
    container.addChild(divider2);

    currentY += Math.round(16 * s);

    // === SECRET STORIES BUTTONS (вместо скиллов) ===
    const storiesTitle = new Text({
      text: 'MY STORY',
      style: {
        fill: this.colors.textSecondary,
        fontSize: this.fontSize(15),
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 3,
      },
    });
    storiesTitle.x = innerX;
    storiesTitle.y = currentY;
    container.addChild(storiesTitle);

    currentY += Math.round(28 * s);

    // Горизонтальный грид из 6 кнопок (3x2)
    const buttonsGrid = this.createStoryButtons(innerX, currentY, innerWidth);
    container.addChild(buttonsGrid);

    // === SCANLINES OVERLAY ===
    const scanlines = this.createScanlines(cardX, cardY, cardWidth, cardHeight);
    container.addChild(scanlines);
  }

  createStoryButtons(x, y, maxWidth) {
    const container = new Container();
    const s = this.scaleFactor;

    const gapX = Math.round(10 * s);
    const gapY = Math.round(10 * s);
    const buttonWidth = (maxWidth - gapX * 2) / 3;
    const buttonHeight = Math.round(48 * s);

    SECRET_FLIGHTS.forEach((story, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const btnX = x + col * (buttonWidth + gapX);
      const btnY = y + row * (buttonHeight + gapY);

      const button = this.createStoryButton(btnX, btnY, buttonWidth, buttonHeight, story, index);
      container.addChild(button);
    });

    return container;
  }

  createStoryButton(x, y, width, height, story, index) {
    const container = new Container();
    const s = this.scaleFactor;

    // Фон кнопки
    const bg = new Graphics();
    bg.roundRect(x, y, width, height, 4);
    bg.fill({ color: this.colors.buttonBg, alpha: 0.9 });
    bg.stroke({ width: 2, color: this.colors.buttonBorder, alpha: 1 });
    container.addChild(bg);

    // Левый акцент
    const accent = new Graphics();
    accent.rect(x + 2, y + Math.round(6 * s), 3, height - Math.round(12 * s));
    accent.fill({ color: this.colors.accent, alpha: 0.7 });
    container.addChild(accent);

    // Иконка
    const iconText = new Text({
      text: story.icon,
      style: {
        fill: this.colors.accent,
        fontSize: this.fontSize(16),
        fontFamily: 'Sonic Genesis, monospace',
      },
    });
    iconText.x = x + Math.round(12 * s);
    iconText.y = y + (height - iconText.height) / 2;
    container.addChild(iconText);

    // Текст кнопки
    const labelText = new Text({
      text: story.label,
      style: {
        fill: this.colors.textPrimary,
        fontSize: this.fontSize(11),
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 1,
      },
    });
    labelText.x = x + Math.round(28 * s);
    labelText.y = y + (height - labelText.height) / 2;
    container.addChild(labelText);

    // Интерактивность
    container.eventMode = 'static';
    container.cursor = 'pointer';

    container.on('pointerover', () => {
      bg.clear();
      bg.roundRect(x, y, width, height, 4);
      bg.fill({ color: this.colors.buttonHover, alpha: 0.95 });
      bg.stroke({ width: 2, color: this.colors.accent, alpha: 1 });
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.roundRect(x, y, width, height, 4);
      bg.fill({ color: this.colors.buttonBg, alpha: 0.9 });
      bg.stroke({ width: 2, color: this.colors.buttonBorder, alpha: 1 });
    });

    container.on('pointertap', () => {
      // Переход к секретному флайту (index + 2, т.к. 0=profile, 1=skills)
      this.setActiveFlight(index + 2);
    });

    return container;
  }

  // ═══════════════════════════════════════════════════════════════
  // FLIGHT 2: SKILLS
  // ═══════════════════════════════════════════════════════════════

  renderSkillsFlight(container) {
    const cardWidth = this.flightWidth;
    const cardHeight = this.flightHeight;
    const cardX = -cardWidth / 2;
    const cardY = -cardHeight / 2;
    const s = this.scaleFactor;

    // Основная панель
    const cardPanel = this.createPanel(cardX, cardY, cardWidth, cardHeight);
    container.addChild(cardPanel);

    const padding = Math.round(20 * s);
    const innerX = cardX + padding;
    const innerY = cardY + padding;
    const innerWidth = cardWidth - padding * 2;

    let currentY = innerY;

    // === TITLE ===
    const title = new Text({
      text: 'SKILLS & TECH',
      style: {
        fill: this.colors.textPrimary,
        fontSize: this.fontSize(32),
        fontFamily: 'Sonic Genesis, monospace',
        fontWeight: 'bold',
        letterSpacing: 2,
      },
    });
    title.x = innerX;
    title.y = currentY;
    container.addChild(title);

    currentY += Math.round(50 * s);

    // === DIVIDER ===
    const divider = new Graphics();
    divider.moveTo(innerX, currentY);
    divider.lineTo(innerX + innerWidth, currentY);
    divider.stroke({ width: 2, color: this.colors.panelBorder, alpha: 0.8 });
    container.addChild(divider);

    currentY += Math.round(20 * s);

    // === SUBTITLE ===
    const subtitle = new Text({
      text: 'Technologies I work with',
      style: {
        fill: this.colors.textSecondary,
        fontSize: this.fontSize(14),
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 1,
      },
    });
    subtitle.x = innerX;
    subtitle.y = currentY;
    container.addChild(subtitle);

    currentY += Math.round(40 * s);

    // === SKILL TAGS ===
    const tagsContainer = this.createSkillTags(innerX, currentY, innerWidth, SKILLS);
    container.addChild(tagsContainer);

    // === SCANLINES OVERLAY ===
    const scanlines = this.createScanlines(cardX, cardY, cardWidth, cardHeight);
    container.addChild(scanlines);
  }

  // ═══════════════════════════════════════════════════════════════
  // FLIGHTS 3-8: SECRET STORIES (PLACEHOLDERS)
  // ═══════════════════════════════════════════════════════════════

  renderSecretFlight(container, storyIndex) {
    const cardWidth = this.flightWidth;
    const cardHeight = this.flightHeight;
    const cardX = -cardWidth / 2;
    const cardY = -cardHeight / 2;
    const s = this.scaleFactor;

    const story = SECRET_FLIGHTS[storyIndex] || { label: 'UNKNOWN', icon: '?' };
    const state = this.storyState[storyIndex];
    const images = this.assetManager?.getAboutStoryImages?.(storyIndex) || [];
    const storyKey = `story${storyIndex + 1}`;
    const slides = this.locale.about?.stories?.[storyKey]?.slides || [];

    // Основная панель-рамка
    const cardPanel = this.createPanel(cardX, cardY, cardWidth, cardHeight);
    container.addChild(cardPanel);

    const padding = Math.round(8 * s);

    // === ИЗОБРАЖЕНИЕ — заполняет весь кард ===
    const imgIndex = state.imageIndex;
    const texture = images[imgIndex];
    if (texture) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      // Cover: заполнить весь кард, обрезая лишнее
      const scaleImg = Math.max(
        (cardWidth - padding * 2) / (texture.width || 1),
        (cardHeight - padding * 2) / (texture.height || 1)
      );
      sprite.scale.set(scaleImg);
      sprite.x = 0;
      sprite.y = 0;

      // Маска для обрезки по рамке карда
      const mask = new Graphics();
      mask.roundRect(cardX + padding, cardY + padding, cardWidth - padding * 2, cardHeight - padding * 2, 2);
      mask.fill({ color: 0xffffff });
      container.addChild(mask);
      sprite.mask = mask;

      // Тап по картинке — следующий текстовый слайд
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      sprite.on('pointertap', () => this.nextStoryText(storyIndex, 1));

      container.addChild(sprite);
    }

    // === OVERLAY: Заголовок поверх изображения (верх) ===
    const titlePadding = Math.round(14 * s);
    const titleBg = new Graphics();
    titleBg.roundRect(cardX + titlePadding, cardY + titlePadding, cardWidth - titlePadding * 2, Math.round(44 * s), 6);
    titleBg.fill({ color: 0x000000, alpha: 0.7 });
    container.addChild(titleBg);

    const titleText = new Text({
      text: `${story.icon} ${story.label}`,
      style: {
        fill: this.colors.accent,
        fontSize: this.fontSize(24),
        fontFamily: GAME_FONT,
        fontWeight: 'bold',
        letterSpacing: 2,
      },
    });
    titleText.anchor.set(0.5, 0.5);
    titleText.x = 0;
    titleText.y = cardY + titlePadding + Math.round(22 * s);
    container.addChild(titleText);

    // === Счётчик изображений (верхний правый угол) ===
    if (images.length > 1) {
      const counterBg = new Graphics();
      counterBg.roundRect(cardX + cardWidth - titlePadding - Math.round(56 * s), cardY + titlePadding + Math.round(48 * s), Math.round(56 * s), Math.round(24 * s), 4);
      counterBg.fill({ color: 0x000000, alpha: 0.6 });
      container.addChild(counterBg);

      const imgCounter = new Text({
        text: `${imgIndex + 1}/${images.length}`,
        style: {
          fill: 0xffffff,
          fontSize: this.fontSize(12),
          fontFamily: GAME_FONT,
        },
      });
      imgCounter.anchor.set(0.5, 0.5);
      imgCounter.x = cardX + cardWidth - titlePadding - Math.round(28 * s);
      imgCounter.y = cardY + titlePadding + Math.round(60 * s);
      container.addChild(imgCounter);

      // Стрелки навигации по изображениям (по бокам карда)
      const arrowY = 0; // Центр карда
      const arrowPad = Math.round(12 * s);

      const leftImg = new Graphics();
      leftImg.moveTo(0, 12);
      leftImg.lineTo(14, 0);
      leftImg.lineTo(14, 24);
      leftImg.closePath();
      leftImg.fill({ color: 0xffffff, alpha: 0.8 });
      leftImg.x = cardX + arrowPad;
      leftImg.y = arrowY - 12;
      leftImg.eventMode = 'static';
      leftImg.cursor = 'pointer';
      leftImg.on('pointertap', () => this.nextStoryImage(storyIndex, -1));
      container.addChild(leftImg);

      const rightImg = new Graphics();
      rightImg.moveTo(14, 12);
      rightImg.lineTo(0, 0);
      rightImg.lineTo(0, 24);
      rightImg.closePath();
      rightImg.fill({ color: 0xffffff, alpha: 0.8 });
      rightImg.x = cardX + cardWidth - arrowPad - 14;
      rightImg.y = arrowY - 12;
      rightImg.eventMode = 'static';
      rightImg.cursor = 'pointer';
      rightImg.on('pointertap', () => this.nextStoryImage(storyIndex, 1));
      container.addChild(rightImg);
    }

    // === OVERLAY: Speech Bubble поверх изображения (низ) ===
    if (slides.length > 0) {
      const bubblePadding = Math.round(14 * s);
      const bubbleMargin = Math.round(16 * s);
      const bubbleWidth = cardWidth - bubbleMargin * 2;
      const textIndex = state.textIndex;
      const fullText = slides[textIndex] || '';

      // Фон бабла
      const bubbleBg = new Graphics();
      const bubbleBody = new Text({
        text: fullText,
        style: {
          fill: 0xffffff,
          fontSize: this.fontSize(13),
          fontFamily: GAME_FONT,
          wordWrap: true,
          wordWrapWidth: bubbleWidth - bubblePadding * 2,
          lineHeight: Math.round(this.fontSize(13) * 1.4),
          align: 'left',
        },
      });

      const bubbleH = Math.max(Math.round(50 * s), bubbleBody.height + bubblePadding * 2);
      const backBtnHeight = Math.round(40 * s);
      const bubbleY = cardY + cardHeight - bubbleMargin - backBtnHeight - Math.round(12 * s) - bubbleH;

      bubbleBg.roundRect(cardX + bubbleMargin, bubbleY, bubbleWidth, bubbleH, 8);
      bubbleBg.fill({ color: 0x000000, alpha: 0.75 });
      bubbleBg.stroke({ width: 2, color: this.colors.accent, alpha: 0.6 });

      bubbleBody.x = cardX + bubbleMargin + bubblePadding;
      bubbleBody.y = bubbleY + bubblePadding;

      // Тап по баблу — следующий слайд
      bubbleBg.eventMode = 'static';
      bubbleBg.cursor = 'pointer';
      bubbleBg.on('pointertap', () => this.nextStoryText(storyIndex, 1));
      bubbleBody.eventMode = 'static';
      bubbleBody.cursor = 'pointer';
      bubbleBody.on('pointertap', () => this.nextStoryText(storyIndex, 1));

      container.addChild(bubbleBg);
      container.addChild(bubbleBody);

      // Счётчик слайдов
      if (slides.length > 1) {
        const pageBg = new Graphics();
        pageBg.roundRect(cardX + bubbleMargin + bubbleWidth - Math.round(48 * s), bubbleY - Math.round(22 * s), Math.round(48 * s), Math.round(20 * s), 4);
        pageBg.fill({ color: 0x000000, alpha: 0.6 });
        container.addChild(pageBg);

        const pageText = new Text({
          text: `${textIndex + 1}/${slides.length}`,
          style: {
            fill: this.colors.accent,
            fontSize: this.fontSize(11),
            fontFamily: GAME_FONT,
          },
        });
        pageText.anchor.set(0.5, 0.5);
        pageText.x = cardX + bubbleMargin + bubbleWidth - Math.round(24 * s);
        pageText.y = bubbleY - Math.round(12 * s);
        container.addChild(pageText);
      }

      // Typewriter-анимация: печатаем посимвольно только если этот флайт активен
      const flightIndex = storyIndex + 2;
      if (this.activeIndex === flightIndex) {
        bubbleBody.text = '';
        this._runTypewriter(bubbleBody, fullText, storyIndex, textIndex);
      }
    }

    // === Кнопка назад (поверх, внизу) ===
    const backBtnY = cardY + cardHeight - Math.round(16 * s) - Math.round(40 * s);
    const backButton = this.createBackButton(cardX + Math.round(16 * s), backBtnY, cardWidth - Math.round(32 * s));
    container.addChild(backButton);
  }

  _runTypewriter(textObj, fullText, storyIndex, textIndex) {
    // Отменяем предыдущую анимацию если есть
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }

    let charIndex = 0;
    const speed = 30; // мс на символ

    this._typewriterTimer = setInterval(() => {
      // Если сцена или текст изменились — останавливаем
      const state = this.storyState[storyIndex];
      if (!state || state.textIndex !== textIndex || !textObj.parent) {
        clearInterval(this._typewriterTimer);
        this._typewriterTimer = null;
        return;
      }

      charIndex++;
      textObj.text = fullText.slice(0, charIndex);

      if (charIndex >= fullText.length) {
        clearInterval(this._typewriterTimer);
        this._typewriterTimer = null;
      }
    }, speed);
  }

  nextStoryImage(storyIndex, dir) {
    const state = this.storyState[storyIndex];
    const images = this.assetManager?.getAboutStoryImages?.(storyIndex) || [];
    if (images.length === 0) return;
    state.imageIndex = (state.imageIndex + dir + images.length) % images.length;
    this.rebuildStoryFlight(storyIndex);
  }

  nextStoryText(storyIndex, dir) {
    const state = this.storyState[storyIndex];
    const storyKey = `story${storyIndex + 1}`;
    const slides = this.locale.about?.stories?.[storyKey]?.slides || [];
    if (slides.length === 0) return;
    state.textIndex = (state.textIndex + dir + slides.length) % slides.length;
    // Синхронизируем картинку с текстовым слайдом
    const images = this.assetManager?.getAboutStoryImages?.(storyIndex) || [];
    if (images.length > 0) {
      state.imageIndex = state.textIndex % images.length;
    }
    this.rebuildStoryFlight(storyIndex);
  }

  rebuildStoryFlight(storyIndex) {
    const flightIndex = storyIndex + 2; // 0=profile, 1=skills, 2+=stories
    const flightContainer = this.flights?.[flightIndex];
    if (flightContainer) {
      this.renderFlightContent(flightIndex, flightContainer);
    }
  }

  createBackButton(x, y, maxWidth) {
    const container = new Container();
    const s = this.scaleFactor;

    const buttonWidth = Math.round(140 * s);
    const buttonHeight = Math.round(36 * s);
    const btnX = x + (maxWidth - buttonWidth) / 2;

    // Фон кнопки
    const bg = new Graphics();
    bg.roundRect(btnX, y, buttonWidth, buttonHeight, 4);
    bg.fill({ color: this.colors.buttonBg, alpha: 0.9 });
    bg.stroke({ width: 2, color: this.colors.buttonBorder, alpha: 1 });
    container.addChild(bg);

    // Текст
    const labelText = new Text({
      text: '← BACK',
      style: {
        fill: this.colors.textPrimary,
        fontSize: this.fontSize(14),
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 1,
      },
    });
    labelText.anchor.set(0.5);
    labelText.x = btnX + buttonWidth / 2;
    labelText.y = y + buttonHeight / 2;
    container.addChild(labelText);

    // Интерактивность
    container.eventMode = 'static';
    container.cursor = 'pointer';

    container.on('pointerover', () => {
      bg.clear();
      bg.roundRect(btnX, y, buttonWidth, buttonHeight, 4);
      bg.fill({ color: this.colors.buttonHover, alpha: 0.95 });
      bg.stroke({ width: 2, color: this.colors.accent, alpha: 1 });
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.roundRect(btnX, y, buttonWidth, buttonHeight, 4);
      bg.fill({ color: this.colors.buttonBg, alpha: 0.9 });
      bg.stroke({ width: 2, color: this.colors.buttonBorder, alpha: 1 });
    });

    container.on('pointertap', () => {
      this.setActiveFlight(0); // Назад к профилю
    });

    return container;
  }

  // ═══════════════════════════════════════════════════════════════
  // CAMERA & NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  startCamera() {
    this.cameraTickerFn = () => this.updateCamera();
    this.getTicker().add(this.cameraTickerFn);
  }

  getTicker() {
    return this.app?.gameTicker ?? this.app?.ticker;
  }

  updateCamera() {
    const targetX = this.cameraTargetX;
    this.container.x += (targetX - this.container.x) * this.cameraSmoothing;
    this.container.y += (this.cameraTargetY - this.container.y) * 0.08;
    if (this.background) {
      this.background.x = -this.container.x;
      this.background.y = -this.container.y;
    }
    // Навигация фиксирована относительно экрана
    if (this.navContainer) {
      this.navContainer.x = -this.container.x;
      this.navContainer.y = -this.container.y;
    }
  }

  centerOnIndex(index, immediate = false) {
    const clamped = Math.max(0, Math.min(this.flightCount - 1, index));
    this.activeIndex = clamped;
    const targetFlight = this.flights?.[clamped];
    if (!targetFlight) return;

    const targetX = this.app.screen.width / 2 - targetFlight.x;
    this.cameraTargetX = targetX;
    // Центрируем с учетом отступа для внешнего меню
    this.cameraTargetY = (this.app.screen.height - this.bottomPadding) / 2;
    if (immediate) {
      this.container.x = targetX;
      this.container.y = this.cameraTargetY;
    }
  }

  setActiveFlight(index) {
    this.centerOnIndex(index, false);
    this.updateNavigation();
    // Если это story flight (index >= 2), пересобираем чтобы запустить typewriter
    if (index >= 2) {
      const storyIndex = index - 2;
      this.rebuildStoryFlight(storyIndex);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  createNavigation() {
    this.navContainer.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });

    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    // Навигационная панель над внешним меню
    const navWidth = Math.min(300, screenW - 40);
    const navHeight = 48;
    const navX = (screenW - navWidth) / 2;
    const navY = screenH - this.bottomPadding - navHeight - 16;

    // Фон панели
    const navBg = new Graphics();
    navBg.roundRect(0, 0, navWidth, navHeight, 8);
    navBg.fill({ color: this.colors.panelBg, alpha: 0.95 });
    navBg.stroke({ width: 2, color: this.colors.panelBorder, alpha: 1 });
    navBg.x = navX;
    navBg.y = navY;
    this.navContainer.addChild(navBg);

    // Левая стрелка
    const leftArrow = new Graphics();
    leftArrow.moveTo(0, 12);
    leftArrow.lineTo(16, 0);
    leftArrow.lineTo(16, 24);
    leftArrow.closePath();
    leftArrow.fill({ color: this.colors.accent, alpha: 0.9 });
    leftArrow.x = navX + 20;
    leftArrow.y = navY + (navHeight - 24) / 2;
    leftArrow.eventMode = 'static';
    leftArrow.cursor = 'pointer';
    leftArrow.on('pointertap', () => this.prevFlight());
    leftArrow.on('pointerover', () => { leftArrow.alpha = 0.7; });
    leftArrow.on('pointerout', () => { leftArrow.alpha = 1; });
    this.navContainer.addChild(leftArrow);
    this.navLeftArrow = leftArrow;

    // Правая стрелка
    const rightArrow = new Graphics();
    rightArrow.moveTo(16, 12);
    rightArrow.lineTo(0, 0);
    rightArrow.lineTo(0, 24);
    rightArrow.closePath();
    rightArrow.fill({ color: this.colors.accent, alpha: 0.9 });
    rightArrow.x = navX + navWidth - 36;
    rightArrow.y = navY + (navHeight - 24) / 2;
    rightArrow.eventMode = 'static';
    rightArrow.cursor = 'pointer';
    rightArrow.on('pointertap', () => this.nextFlight());
    rightArrow.on('pointerover', () => { rightArrow.alpha = 0.7; });
    rightArrow.on('pointerout', () => { rightArrow.alpha = 1; });
    this.navContainer.addChild(rightArrow);
    this.navRightArrow = rightArrow;

    // Индикатор страницы
    const pageText = new Text({
      text: `${this.activeIndex + 1} / ${this.flightCount}`,
      style: {
        fill: this.colors.textPrimary,
        fontSize: 16,
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 2,
      },
    });
    pageText.anchor.set(0.5);
    pageText.x = navX + navWidth / 2;
    pageText.y = navY + navHeight / 2;
    this.navContainer.addChild(pageText);
    this.navPageText = pageText;

    // Навигация фиксирована относительно экрана
    this.navContainer.x = -this.container.x;
    this.navContainer.y = -this.container.y;

    this.updateNavigation();
  }

  updateNavigation() {
    if (this.navPageText) {
      this.navPageText.text = `${this.activeIndex + 1} / ${this.flightCount}`;
    }
    // Скрыть стрелки на краях
    if (this.navLeftArrow) {
      this.navLeftArrow.visible = this.activeIndex > 0;
    }
    if (this.navRightArrow) {
      this.navRightArrow.visible = this.activeIndex < this.flightCount - 1;
    }
  }

  prevFlight() {
    if (this.activeIndex > 0) {
      this.setActiveFlight(this.activeIndex - 1);
    }
  }

  nextFlight() {
    if (this.activeIndex < this.flightCount - 1) {
      this.setActiveFlight(this.activeIndex + 1);
    }
  }

  createPanel(x, y, width, height) {
    const panel = new Graphics();

    // Основной фон
    panel.roundRect(x, y, width, height, 4);
    panel.fill({ color: this.colors.panelBg, alpha: 0.95 });

    // Внешняя рамка (толстая)
    panel.roundRect(x, y, width, height, 4);
    panel.stroke({ width: 3, color: this.colors.panelBorder, alpha: 1 });

    // Внутренняя рамка (тонкая, светлая)
    panel.roundRect(x + 4, y + 4, width - 8, height - 8, 2);
    panel.stroke({ width: 1, color: 0x2a3a5a, alpha: 0.5 });

    // Угловые акценты (пиксельный стиль)
    const cornerSize = 8;
    const cornerColor = this.colors.accent;

    // Верхний левый
    panel.rect(x, y, cornerSize, 3);
    panel.fill({ color: cornerColor, alpha: 0.8 });
    panel.rect(x, y, 3, cornerSize);
    panel.fill({ color: cornerColor, alpha: 0.8 });

    // Верхний правый
    panel.rect(x + width - cornerSize, y, cornerSize, 3);
    panel.fill({ color: cornerColor, alpha: 0.8 });
    panel.rect(x + width - 3, y, 3, cornerSize);
    panel.fill({ color: cornerColor, alpha: 0.8 });

    // Нижний левый
    panel.rect(x, y + height - 3, cornerSize, 3);
    panel.fill({ color: cornerColor, alpha: 0.8 });
    panel.rect(x, y + height - cornerSize, 3, cornerSize);
    panel.fill({ color: cornerColor, alpha: 0.8 });

    // Нижний правый
    panel.rect(x + width - cornerSize, y + height - 3, cornerSize, 3);
    panel.fill({ color: cornerColor, alpha: 0.8 });
    panel.rect(x + width - 3, y + height - cornerSize, 3, cornerSize);
    panel.fill({ color: cornerColor, alpha: 0.8 });

    return panel;
  }

  createPhotoFrame(x, y, size) {
    const container = new Container();
    const borderWidth = 3;
    const innerBorder = 2;
    const innerSize = size - (borderWidth + innerBorder) * 2;

    // Фон фото (темный)
    const photoBg = new Graphics();
    photoBg.rect(x, y, size, size);
    photoBg.fill({ color: this.colors.panelInner, alpha: 1 });
    container.addChild(photoBg);

    // Получаем текстуру фото из AssetManager
    const photoTexture = this.assetManager?.getAboutPhoto?.();

    if (photoTexture) {
      // Отображаем фото
      const photoSprite = new Sprite(photoTexture);
      photoSprite.anchor.set(0.5, 0.5);

      // Масштабируем чтобы вписать в рамку
      const scale = Math.min(
        innerSize / photoTexture.width,
        innerSize / photoTexture.height
      );
      photoSprite.scale.set(scale);

      // Позиционируем по центру рамки
      photoSprite.x = x + size / 2;
      photoSprite.y = y + size / 2;

      container.addChild(photoSprite);
    } else {
      // Placeholder иконка (силуэт) если фото нет
      const iconSize = size * 0.5;
      const iconX = x + (size - iconSize) / 2;
      const iconY = y + (size - iconSize) / 2;

      const icon = new Graphics();
      // Голова
      icon.circle(iconX + iconSize / 2, iconY + iconSize * 0.3, iconSize * 0.25);
      icon.fill({ color: this.colors.textSecondary, alpha: 0.4 });
      // Тело
      icon.ellipse(iconX + iconSize / 2, iconY + iconSize * 0.85, iconSize * 0.35, iconSize * 0.25);
      icon.fill({ color: this.colors.textSecondary, alpha: 0.4 });

      container.addChild(icon);

      // Текст "PHOTO"
      const photoLabel = new Text({
        text: 'PHOTO',
        style: {
          fill: this.colors.textSecondary,
          fontSize: 12,
          fontFamily: 'Sonic Genesis, monospace',
          letterSpacing: 1,
        },
      });
      photoLabel.anchor.set(0.5);
      photoLabel.x = x + size / 2;
      photoLabel.y = y + size - 16;
      photoLabel.alpha = 0.5;
      container.addChild(photoLabel);
    }

    // Пиксельная рамка (поверх фото)
    const frame = new Graphics();

    // Внешняя рамка
    frame.rect(x, y, size, borderWidth);
    frame.fill({ color: this.colors.accent, alpha: 1 });
    frame.rect(x, y + size - borderWidth, size, borderWidth);
    frame.fill({ color: this.colors.accent, alpha: 1 });
    frame.rect(x, y, borderWidth, size);
    frame.fill({ color: this.colors.accent, alpha: 1 });
    frame.rect(x + size - borderWidth, y, borderWidth, size);
    frame.fill({ color: this.colors.accent, alpha: 1 });

    // Внутренняя рамка (темнее)
    frame.rect(x + borderWidth, y + borderWidth, size - borderWidth * 2, innerBorder);
    frame.fill({ color: this.colors.panelBorder, alpha: 1 });
    frame.rect(x + borderWidth, y + size - borderWidth - innerBorder, size - borderWidth * 2, innerBorder);
    frame.fill({ color: this.colors.panelBorder, alpha: 1 });
    frame.rect(x + borderWidth, y + borderWidth, innerBorder, size - borderWidth * 2);
    frame.fill({ color: this.colors.panelBorder, alpha: 1 });
    frame.rect(x + size - borderWidth - innerBorder, y + borderWidth, innerBorder, size - borderWidth * 2);
    frame.fill({ color: this.colors.panelBorder, alpha: 1 });

    container.addChild(frame);

    return container;
  }

  createStatBar(x, y, width, height, stat) {
    const container = new Container();
    const s = this.scaleFactor;

    // Название стата
    const nameText = new Text({
      text: stat.name,
      style: {
        fill: this.colors.textPrimary,
        fontSize: this.fontSize(15),
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 1,
      },
    });
    nameText.x = x;
    nameText.y = y;
    container.addChild(nameText);

    // Значение справа
    const valueText = new Text({
      text: `${stat.value}`,
      style: {
        fill: stat.color,
        fontSize: this.fontSize(18),
        fontFamily: 'Sonic Genesis, monospace',
        fontWeight: 'bold',
      },
    });
    valueText.anchor.set(1, 0);
    valueText.x = x + width;
    valueText.y = y - Math.round(2 * s);
    container.addChild(valueText);

    // Полоса прогресса
    const barY = y + Math.round(20 * s);
    const barHeight = height - Math.round(20 * s);
    const barWidth = width;

    // Фон полосы
    const barBg = new Graphics();
    barBg.rect(x, barY, barWidth, barHeight);
    barBg.fill({ color: this.colors.barBg, alpha: 1 });
    barBg.stroke({ width: 1, color: this.colors.barBorder, alpha: 1 });
    container.addChild(barBg);

    // Заполнение полосы
    const fillWidth = (barWidth - 4) * (stat.value / 100);
    const barFill = new Graphics();
    barFill.rect(x + 2, barY + 2, fillWidth, barHeight - 4);
    barFill.fill({ color: stat.color, alpha: 1 });
    container.addChild(barFill);

    // Блики на полосе (сегменты)
    const segmentCount = 10;
    const segmentWidth = (barWidth - 4) / segmentCount;
    for (let i = 0; i < segmentCount; i++) {
      const segX = x + 2 + i * segmentWidth;
      if (segX < x + 2 + fillWidth - 2) {
        const highlight = new Graphics();
        highlight.rect(segX, barY + 2, 2, (barHeight - 4) / 2);
        highlight.fill({ color: 0xffffff, alpha: 0.2 });
        container.addChild(highlight);
      }
    }

    // Градиентный блик сверху
    const topHighlight = new Graphics();
    topHighlight.rect(x + 2, barY + 2, Math.min(fillWidth, barWidth - 4), 2);
    topHighlight.fill({ color: 0xffffff, alpha: 0.3 });
    container.addChild(topHighlight);

    return container;
  }

  createSkillTags(x, y, maxWidth, skills) {
    const container = new Container();
    const s = this.scaleFactor;

    const tagPaddingX = Math.round(14 * s);
    const tagGap = Math.round(10 * s);
    const tagHeight = Math.round(32 * s);
    const fSize = this.fontSize(14);

    let currentX = x;
    let currentY = y;

    skills.forEach((skill) => {
      // Измеряем ширину текста
      const tempText = new Text({
        text: skill.toUpperCase(),
        style: { fontSize: fSize, fontFamily: 'Sonic Genesis, monospace' },
      });
      const tagWidth = tempText.width + tagPaddingX * 2;

      // Перенос на новую строку если не помещается
      if (currentX + tagWidth > x + maxWidth && currentX !== x) {
        currentX = x;
        currentY += tagHeight + tagGap;
      }

      // Фон тега
      const tagBg = new Graphics();
      tagBg.roundRect(currentX, currentY, tagWidth, tagHeight, 4);
      tagBg.fill({ color: this.colors.tagBg, alpha: 0.9 });
      tagBg.stroke({ width: 1, color: this.colors.tagBorder, alpha: 1 });
      container.addChild(tagBg);

      // Левый акцент
      const accent = new Graphics();
      accent.rect(currentX, currentY + Math.round(4 * s), 2, tagHeight - Math.round(8 * s));
      accent.fill({ color: this.colors.accent, alpha: 0.8 });
      container.addChild(accent);

      // Текст тега
      const tagText = new Text({
        text: skill.toUpperCase(),
        style: {
          fill: this.colors.textPrimary,
          fontSize: fSize,
          fontFamily: 'Sonic Genesis, monospace',
          letterSpacing: 1,
        },
      });
      tagText.x = currentX + tagPaddingX;
      tagText.y = currentY + (tagHeight - tagText.height) / 2;
      container.addChild(tagText);

      currentX += tagWidth + tagGap;
    });

    return container;
  }

  createScanlines(x, y, width, height) {
    const scanlines = new Graphics();
    const lineGap = 3;

    for (let i = 0; i < height; i += lineGap) {
      scanlines.rect(x, y + i, width, 1);
    }
    scanlines.fill({ color: 0x000000, alpha: 0.08 });

    return scanlines;
  }

  // ═══════════════════════════════════════════════════════════════
  // LIFECYCLE METHODS
  // ═══════════════════════════════════════════════════════════════

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }
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
  }

  destroy() {
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }
    if (this.cameraTickerFn) {
      this.getTicker().remove(this.cameraTickerFn);
      this.cameraTickerFn = null;
    }
    if (this.resizeHandler) {
      this.app.renderer.off('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    this.flights = [];

    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }

    this.container.destroy({ children: true, texture: false, baseTexture: false });
  }

  getAIStatus() {
    return null;
  }
}
