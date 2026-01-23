import { Container, Sprite, Graphics, Text } from 'pixi.js';

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
  { name: 'COPYWRITING', value: 90, color: 0x6dff9d },
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

// ═══════════════════════════════════════════════════════════════

export class AboutScene {
  constructor(app, options = {}, rootContainer = null, assetManager = null) {
    this.app = app;
    this.rootContainer = rootContainer || this.app.stage;
    this.assetManager = assetManager;
    this.sceneId = 'about';

    this.backgroundColor = options.backgroundColor ?? 0x000000;

    this.container = new Container();
    this.background = new Graphics();
    this.contentContainer = new Container();

    this.container.addChild(this.background);
    this.container.addChild(this.contentContainer);
    this.rootContainer.addChild(this.container);

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
    };

    this.init();
  }

  async init() {
    this.createBackground();
    this.createCharacterCard();
    this.bindResize();
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
      this.createBackground();
      this.layoutContent();
    };
    this.app.renderer.on('resize', this.resizeHandler);
  }

  createCharacterCard() {
    this.contentContainer.removeChildren().forEach((child) => {
      child.destroy({ children: true, texture: false, baseTexture: false });
    });

    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // Размеры карточки
    const cardWidth = Math.min(520, width - 40);
    const cardHeight = Math.min(680, height - 40);
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    // Основная панель карточки
    const cardPanel = this.createPanel(cardX, cardY, cardWidth, cardHeight);
    this.contentContainer.addChild(cardPanel);

    // Внутренний отступ
    const padding = 20;
    const innerX = cardX + padding;
    const innerY = cardY + padding;
    const innerWidth = cardWidth - padding * 2;

    let currentY = innerY;

    // === HEADER: Фото + Имя ===
    const photoSize = Math.min(150, innerWidth * 0.35);
    const headerHeight = photoSize + 10;

    // Рамка для фото (квадратная, пиксельная)
    const photoFrame = this.createPhotoFrame(innerX, currentY, photoSize);
    this.contentContainer.addChild(photoFrame);

    // Имя и титул справа от фото
    const nameX = innerX + photoSize + 16;
    const nameWidth = innerWidth - photoSize - 16;

    const nameText = new Text({
      text: PROFILE.name,
      style: {
        fill: this.colors.textPrimary,
        fontSize: 48,
        fontFamily: 'Sonic Genesis, monospace',
        fontWeight: 'bold',
        letterSpacing: 2,
      },
    });
    nameText.x = nameX;
    nameText.y = currentY + 8;
    this.contentContainer.addChild(nameText);

    const titleText = new Text({
      text: PROFILE.title,
      style: {
        fill: this.colors.accent,
        fontSize: 17,
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 1,
      },
    });
    titleText.x = nameX;
    titleText.y = currentY + 58;
    this.contentContainer.addChild(titleText);

    // Уровень / класс
    const levelText = new Text({
      text: PROFILE.level,
      style: {
        fill: this.colors.accentAlt,
        fontSize: 21,
        fontFamily: 'Sonic Genesis, monospace',
        fontWeight: 'bold',
      },
    });
    levelText.x = nameX;
    levelText.y = currentY + 85;
    this.contentContainer.addChild(levelText);

    // Локация
    const locationText = new Text({
      text: PROFILE.location,
      style: {
        fill: this.colors.textSecondary,
        fontSize: 15,
        fontFamily: 'Sonic Genesis, monospace',
      },
    });
    locationText.x = nameX;
    locationText.y = currentY + 115;
    this.contentContainer.addChild(locationText);

    currentY += headerHeight + 20;

    // === DIVIDER ===
    const divider = new Graphics();
    divider.moveTo(innerX, currentY);
    divider.lineTo(innerX + innerWidth, currentY);
    divider.stroke({ width: 2, color: this.colors.panelBorder, alpha: 0.8 });
    this.contentContainer.addChild(divider);

    currentY += 16;

    // === STATS SECTION ===
    const statsTitle = new Text({
      text: 'STATS',
      style: {
        fill: this.colors.textSecondary,
        fontSize: 15,
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 3,
      },
    });
    statsTitle.x = innerX;
    statsTitle.y = currentY;
    this.contentContainer.addChild(statsTitle);

    currentY += 28;

    // Характеристики
    const stats = STATS;

    const statHeight = 42;
    const statGap = 12;

    stats.forEach((stat, index) => {
      const statY = currentY + index * (statHeight + statGap);
      const statBar = this.createStatBar(innerX, statY, innerWidth, statHeight, stat);
      this.contentContainer.addChild(statBar);
    });

    currentY += stats.length * (statHeight + statGap) + 16;

    // === DIVIDER 2 ===
    const divider2 = new Graphics();
    divider2.moveTo(innerX, currentY);
    divider2.lineTo(innerX + innerWidth, currentY);
    divider2.stroke({ width: 2, color: this.colors.panelBorder, alpha: 0.8 });
    this.contentContainer.addChild(divider2);

    currentY += 16;

    // === SKILLS / TAGS ===
    const skillsTitle = new Text({
      text: 'SKILLS',
      style: {
        fill: this.colors.textSecondary,
        fontSize: 15,
        fontFamily: 'Sonic Genesis, monospace',
        letterSpacing: 3,
      },
    });
    skillsTitle.x = innerX;
    skillsTitle.y = currentY;
    this.contentContainer.addChild(skillsTitle);

    currentY += 28;

    const tagsContainer = this.createSkillTags(innerX, currentY, innerWidth, SKILLS);
    this.contentContainer.addChild(tagsContainer);

    // === SCANLINES OVERLAY (для ретро-эффекта) ===
    const scanlines = this.createScanlines(cardX, cardY, cardWidth, cardHeight);
    this.contentContainer.addChild(scanlines);
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

    // Название стата
    const nameText = new Text({
      text: stat.name,
      style: {
        fill: this.colors.textPrimary,
        fontSize: 15,
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
        fontSize: 18,
        fontFamily: 'Sonic Genesis, monospace',
        fontWeight: 'bold',
      },
    });
    valueText.anchor.set(1, 0);
    valueText.x = x + width;
    valueText.y = y - 2;
    container.addChild(valueText);

    // Полоса прогресса
    const barY = y + 20;
    const barHeight = height - 20;
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

    const tagPaddingX = 14;
    const tagPaddingY = 8;
    const tagGap = 10;
    const tagHeight = 32;
    const fontSize = 14;

    let currentX = x;
    let currentY = y;

    skills.forEach((skill) => {
      // Измеряем ширину текста
      const tempText = new Text({
        text: skill.toUpperCase(),
        style: { fontSize, fontFamily: 'Sonic Genesis, monospace' },
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
      accent.rect(currentX, currentY + 4, 2, tagHeight - 8);
      accent.fill({ color: this.colors.accent, alpha: 0.8 });
      container.addChild(accent);

      // Текст тега
      const tagText = new Text({
        text: skill.toUpperCase(),
        style: {
          fill: this.colors.textPrimary,
          fontSize,
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

  layoutContent() {
    this.createCharacterCard();
  }

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.container.visible = false;
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    if (this.rootContainer && !this.container.parent) {
      this.rootContainer.addChild(this.container);
    }
    this.container.visible = true;
  }

  destroy() {
    if (this.resizeHandler) {
      this.app.renderer.off('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }

    this.container.destroy({ children: true, texture: false, baseTexture: false });
  }

  getAIStatus() {
    return null;
  }
}
