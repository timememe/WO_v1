import { Container, Graphics } from 'pixi.js';

// ═══════════════════════════════════════════════════════════════
// НАСТРОЙКИ ЭФФЕКТА ЛЕПЕСТКОВ
// ═══════════════════════════════════════════════════════════════
const PETALS_CONFIG = {
  // Слои глубины: far = за фоном, mid = между тайлами и полом, near = перед полом
  layers: [
    { depth: 'far',  count: 40,  scale: [0.4, 0.7], speed: [0.3, 0.6], alpha: [0.3, 0.5], parallax: 0.2 },
    { depth: 'mid',  count: 60, scale: [0.6, 1.0], speed: [0.5, 1.0], alpha: [0.5, 0.8], parallax: 0.5 },
    { depth: 'near', count: 20,  scale: [1.0, 1.5], speed: [0.8, 1.4], alpha: [0.6, 0.9], parallax: 0.9 },
  ],
  // Размер базового лепестка в px
  baseSize: 6,
  // Горизонтальный дрейф
  drift: { min: -0.3, max: 0.3 },
  // Амплитуда покачивания
  sway: { amplitude: 20, frequency: 0.02 },
  // Палитра цветов лепестков (пиксельный стиль)
  colors: [0xc0392b, 0xe74c3c, 0xd4a017, 0xe67e22, 0xf39c12, 0x8b4513],
  // Ветер (глобальный горизонтальный снос)
  wind: 0.15,
};

// ═══════════════════════════════════════════════════════════════
// PIXEL PETALS EFFECT
// ═══════════════════════════════════════════════════════════════

class Petal {
  constructor(screenW, screenH, layerConfig, spawnWidth) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.spawnWidth = spawnWidth || screenW;
    this.layerConfig = layerConfig;

    // Случайные параметры в пределах диапазона слоя
    this.scale = rand(layerConfig.scale[0], layerConfig.scale[1]);
    this.fallSpeed = rand(layerConfig.speed[0], layerConfig.speed[1]);
    this.alpha = rand(layerConfig.alpha[0], layerConfig.alpha[1]);
    this.driftX = rand(PETALS_CONFIG.drift.min, PETALS_CONFIG.drift.max) + PETALS_CONFIG.wind;
    this.swayOffset = rand(0, Math.PI * 2);
    this.swayAmp = PETALS_CONFIG.sway.amplitude * this.scale;
    this.swayFreq = PETALS_CONFIG.sway.frequency * rand(0.7, 1.3);
    this.rotation = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-0.02, 0.02);
    this.color = PETALS_CONFIG.colors[Math.floor(rand(0, PETALS_CONFIG.colors.length))];

    // Стартовая позиция — разброс по всей ширине сцены (центрировано в 0)
    const halfW = this.spawnWidth / 2;
    this.x = rand(-halfW, halfW);
    this.y = rand(-screenH * 0.2, screenH);
    this.baseX = this.x;
    this.time = rand(0, 1000);

    // Графика
    this.gfx = new Graphics();
    this.draw();
    this.sync();
  }

  draw() {
    const s = PETALS_CONFIG.baseSize * this.scale;
    const g = this.gfx;
    g.clear();
    // Пиксельный лепесток: маленький ромб/квадрат
    g.moveTo(0, -s);
    g.lineTo(s * 0.6, 0);
    g.lineTo(0, s * 0.8);
    g.lineTo(-s * 0.6, 0);
    g.closePath();
    g.fill({ color: this.color, alpha: this.alpha });
    g.pivot?.set?.(0, 0);
  }

  update(dt) {
    this.time += dt;
    this.y += this.fallSpeed * dt * 60;
    this.baseX += this.driftX * dt * 60;
    this.x = this.baseX + Math.sin(this.time * this.swayFreq) * this.swayAmp;
    this.rotation += this.rotSpeed * dt * 60;

    // Респавн сверху когда вышел за экран
    const halfW = this.spawnWidth / 2;
    if (this.y > this.screenH * 1.1) {
      this.y = -PETALS_CONFIG.baseSize * 4;
      this.baseX = rand(-halfW, halfW);
      this.x = this.baseX;
    }
    // Горизонтальный wrap по ширине сцены
    if (this.baseX > halfW + 40) this.baseX = -halfW - 40;
    if (this.baseX < -halfW - 40) this.baseX = halfW + 40;

    this.sync();
  }

  sync() {
    this.gfx.x = this.x;
    this.gfx.y = this.y;
    this.gfx.rotation = this.rotation;
  }

  resize(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
  }

  destroy() {
    this.gfx.destroy();
  }
}

/**
 * PixelPetalsEffect — пиксельные лепестки с учётом глубины слоёв сцены.
 *
 * Использование:
 *   const fx = new PixelPetalsEffect(app);
 *   // Вставляем контейнеры между слоями сцены:
 *   fx.attachToScene(sceneContainer, {
 *     far:  indexAfterBg,      // после parallaxBgContainer
 *     mid:  indexAfterTiles,   // после tilesContainer
 *     near: indexAfterFloor,   // после parallaxFloorContainer
 *   });
 *   // В тикере:
 *   fx.update(dt);
 *   // При ресайзе:
 *   fx.resize(newW, newH);
 */
export class PixelPetalsEffect {
  /**
   * @param {Application} app
   * @param {Object} config — переопределения PETALS_CONFIG
   * @param {number} sceneWidth — полная ширина сцены (все тайлы). По умолчанию screenW * 3
   */
  constructor(app, config = {}, sceneWidth = 0) {
    this.app = app;
    this.config = { ...PETALS_CONFIG, ...config };
    if (config.layers) this.config.layers = config.layers;
    this.sceneWidth = sceneWidth || this.app.screen.width * 3;

    this.depthContainers = {};
    this.depthPetals = {};
    this.attached = false;

    this._createPetals();
  }

  _createPetals() {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    for (const layerCfg of this.config.layers) {
      const container = new Container();
      container.label = `petals_${layerCfg.depth}`;
      const petals = [];

      for (let i = 0; i < layerCfg.count; i++) {
        const petal = new Petal(screenW, screenH, layerCfg, this.sceneWidth);
        container.addChild(petal.gfx);
        petals.push(petal);
      }

      this.depthContainers[layerCfg.depth] = container;
      this.depthPetals[layerCfg.depth] = petals;
    }
  }

  /**
   * Вставляет контейнеры лепестков между слоями сцены.
   * @param {Container} sceneContainer — главный контейнер сцены
   * @param {Object} layerIndices — { far: number, mid: number, near: number }
   *   Индекс = позиция в children, куда вставить (addChildAt).
   *   Считаем от 0: bg=0, tiles=1, floor=2, character=3...
   */
  attachToScene(sceneContainer, layerIndices) {
    if (this.attached) return;

    // Сортируем по индексу в обратном порядке чтобы вставки не сдвигали позиции
    const entries = Object.entries(layerIndices).sort((a, b) => b[1] - a[1]);
    for (const [depth, index] of entries) {
      const container = this.depthContainers[depth];
      if (container) {
        const safeIndex = Math.min(index, sceneContainer.children.length);
        sceneContainer.addChildAt(container, safeIndex);
      }
    }
    this.attached = true;
  }

  /**
   * Обновляет камеру — лепестки следуют за камерой с учётом параллакса глубины.
   * Вызывать из updateCamera() сцены.
   * @param {number} cameraX — текущий container.x сцены (отрицательный при сдвиге вправо)
   */
  updateCamera(cameraX) {
    for (const layerCfg of this.config.layers) {
      const container = this.depthContainers[layerCfg.depth];
      if (!container) continue;
      // Лепестки фиксированы к экрану, но с параллаксом
      container.x = -cameraX * (1 - layerCfg.parallax);
      container.y = 0;
    }
  }

  /**
   * Обновление анимации. Вызывать каждый кадр.
   * @param {number} dt — дельта времени в секундах
   */
  update(dt) {
    for (const depth in this.depthPetals) {
      const petals = this.depthPetals[depth];
      for (const petal of petals) {
        petal.update(dt);
      }
    }
  }

  resize(screenW, screenH) {
    for (const depth in this.depthPetals) {
      for (const petal of this.depthPetals[depth]) {
        petal.resize(screenW, screenH);
      }
    }
  }

  destroy() {
    for (const depth in this.depthPetals) {
      for (const petal of this.depthPetals[depth]) {
        petal.destroy();
      }
    }
    for (const depth in this.depthContainers) {
      const c = this.depthContainers[depth];
      if (c.parent) c.parent.removeChild(c);
      c.destroy({ children: true });
    }
    this.depthContainers = {};
    this.depthPetals = {};
    this.attached = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// TV GLITCH EFFECT
// ═══════════════════════════════════════════════════════════════

const GLITCH_CONFIG = {
  duration: 350,          // Общая длительность эффекта (ms)
  phases: 3,              // Сколько раз перерисовать глитч за время эффекта
  stripCount: [4, 8],     // Мин/макс горизонтальных полос сдвига
  stripShift: [10, 40],   // Мин/макс сдвиг полосы по X (px)
  stripHeight: [4, 20],   // Мин/макс высота полосы
  noiseLines: [6, 14],    // Мин/макс линий помех
  scanlineAlpha: 0.3,     // Прозрачность scanlines
  rgbShift: 3,            // Сдвиг RGB каналов (px)
  flashAlpha: 0.4,        // Яркость белой вспышки
  colors: {
    noise: [0x00ff41, 0xff0040, 0x00d4ff, 0xffffff, 0xffff00],
    bars: [0x000000, 0x111111, 0x222222],
  },
};

/**
 * TVGlitchEffect — эффект ТВ-глитча при переключении контента.
 *
 * Использование:
 *   const glitch = new TVGlitchEffect(ticker);
 *   // При переключении слайда:
 *   glitch.play(contentContainer, width, height);
 */
export class TVGlitchEffect {
  constructor(ticker) {
    this.ticker = ticker;
    this.overlay = null;
    this.tickerFn = null;
    this.startTime = 0;
    this.target = null;
    this.playing = false;
  }

  /**
   * Запускает глитч поверх контейнера.
   * @param {Container} target — контейнер контента тайла
   * @param {number} w — ширина области
   * @param {number} h — высота области
   * @param {Object} config — переопределения GLITCH_CONFIG
   */
  play(target, w, h, config = {}) {
    // Если уже играет — останавливаем предыдущий
    if (this.playing) this.stop();

    const cfg = { ...GLITCH_CONFIG, ...config };
    this.target = target;
    this.origX = target.x;
    this.origY = target.y;
    this.playing = true;
    this.startTime = performance.now();

    const overlay = new Container();
    overlay.label = 'glitch_overlay';
    this.overlay = overlay;
    target.addChild(overlay);

    let lastPhase = -1;
    const totalPhases = cfg.phases;
    const phaseDuration = cfg.duration / totalPhases;

    this.tickerFn = () => {
      const elapsed = performance.now() - this.startTime;
      const progress = elapsed / cfg.duration; // 0..1

      if (progress >= 1) {
        this.stop();
        return;
      }

      const currentPhase = Math.floor(elapsed / phaseDuration);
      if (currentPhase !== lastPhase) {
        lastPhase = currentPhase;
        this._drawGlitch(overlay, w, h, cfg, progress);
      }

      // Тряска самого контейнера контента
      const intensity = 1 - progress;
      const shakeX = (Math.random() - 0.5) * cfg.stripShift[0] * 0.4 * intensity;
      const shakeY = (Math.random() - 0.5) * 6 * intensity;
      target.x = this.origX + shakeX;
      target.y = this.origY + shakeY;
    };

    this.ticker.add(this.tickerFn);
  }

  _drawGlitch(overlay, w, h, cfg, progress) {
    // Очищаем предыдущий кадр глитча
    overlay.removeChildren().forEach(c => c.destroy());

    const halfW = w / 2;
    const halfH = h / 2;
    const intensity = 1 - progress * 0.6; // Затухание к концу

    // 1. Белая вспышка (сильнее в начале)
    if (progress < 0.3) {
      const flash = new Graphics();
      flash.rect(-halfW, -halfH, w, h);
      flash.fill({ color: 0xffffff, alpha: cfg.flashAlpha * (1 - progress / 0.3) });
      overlay.addChild(flash);
    }

    // 2. Горизонтальные полосы сдвига (основной глитч)
    const stripCount = Math.floor(rand(cfg.stripCount[0], cfg.stripCount[1]) * intensity);
    for (let i = 0; i < stripCount; i++) {
      const stripH = rand(cfg.stripHeight[0], cfg.stripHeight[1]);
      const stripY = rand(-halfH, halfH - stripH);
      const shift = rand(cfg.stripShift[0], cfg.stripShift[1]) * (Math.random() > 0.5 ? 1 : -1) * intensity;
      const barColor = cfg.colors.bars[Math.floor(rand(0, cfg.colors.bars.length))];

      const strip = new Graphics();
      strip.rect(-halfW + shift, stripY, w, stripH);
      strip.fill({ color: barColor, alpha: rand(0.3, 0.7) * intensity });
      overlay.addChild(strip);
    }

    // 3. Цветные линии помех (RGB noise)
    const noiseCount = Math.floor(rand(cfg.noiseLines[0], cfg.noiseLines[1]) * intensity);
    for (let i = 0; i < noiseCount; i++) {
      const y = rand(-halfH, halfH);
      const lineW = rand(w * 0.2, w);
      const x = rand(-halfW, halfW - lineW);
      const color = cfg.colors.noise[Math.floor(rand(0, cfg.colors.noise.length))];

      const line = new Graphics();
      line.rect(x, y, lineW, rand(1, 3));
      line.fill({ color, alpha: rand(0.3, 0.8) * intensity });
      overlay.addChild(line);
    }

    // 4. RGB сдвиг (цветные полупрозрачные прямоугольники)
    const rgbShift = cfg.rgbShift * intensity;
    if (rgbShift > 0.5) {
      const rShift = new Graphics();
      rShift.rect(-halfW + rgbShift, -halfH, w, h);
      rShift.fill({ color: 0xff0000, alpha: 0.08 * intensity });
      overlay.addChild(rShift);

      const bShift = new Graphics();
      bShift.rect(-halfW - rgbShift, -halfH, w, h);
      bShift.fill({ color: 0x0000ff, alpha: 0.08 * intensity });
      overlay.addChild(bShift);
    }

    // 5. Scanlines
    const scanlines = new Graphics();
    for (let y = -halfH; y < halfH; y += 3) {
      scanlines.rect(-halfW, y, w, 1);
    }
    scanlines.fill({ color: 0x000000, alpha: cfg.scanlineAlpha * intensity * 0.5 });
    overlay.addChild(scanlines);
  }

  stop() {
    if (this.tickerFn) {
      this.ticker.remove(this.tickerFn);
      this.tickerFn = null;
    }
    // Возвращаем контейнер на место
    if (this.target) {
      this.target.x = this.origX;
      this.target.y = this.origY;
    }
    if (this.overlay) {
      if (this.overlay.parent) this.overlay.parent.removeChild(this.overlay);
      this.overlay.destroy({ children: true });
      this.overlay = null;
    }
    this.playing = false;
    this.target = null;
  }

  destroy() {
    this.stop();
  }
}

// ═══════════════════════════════════════════════════════════════
// LIGHT BEAM EFFECT
// ═══════════════════════════════════════════════════════════════

const BEAM_CONFIG = {
  color: 0x4de3ff,          // Цвет луча (как рамка заголовка)
  bottomWidth: 0.15,        // Ширина основания (снизу экрана), доля от contentWidth
  topWidth: 1.2,            // Ширина рассеивания у рамки заголовка, доля от contentWidth
  strips: 30,               // Кол-во полос для имитации градиента
  maxAlpha: 0.95,           // Макс. прозрачность (основание внизу экрана)
  minAlpha: 0.15,              // Мин. прозрачность (верх, у рамки)
  pulseSpeed: 5,          // Скорость пульсации (cycles/sec)
  pulseAmount: 0.05,        // Амплитуда пульсации (0-1)
  particleCount: 36,        // Пылинки в луче
  particleSpeed: [0.2, 0.6],// Скорость подъёма пылинок
  particleSize: [1, 6],     // Размер пылинок
};

/**
 * LightBeamEffect — лучи света от низа экрана до рамки заголовка.
 *
 * Создаётся один экземпляр на сцену. Внутри — отдельный контейнер-слой,
 * который вставляется между средним фоном и тайлами (позади тайлов и пола).
 *
 * Использование:
 *   const beams = new LightBeamEffect(app, config);
 *   beams.setup(tiles, contentWidth, screenH, frameTopY);
 *   beams.attachToScene(sceneContainer, layerIndex);
 *   // В тикере: beams.update(dt);
 *   // При камере: beams.updateCamera(cameraX);
 */
export class LightBeamEffect {
  constructor(app, config = {}) {
    this.app = app;
    this.config = { ...BEAM_CONFIG, ...config };
    this.container = new Container();
    this.container.label = 'light_beams';
    this.beams = [];     // { gfx, particlesContainer, particles[], x }
    this.time = 0;
    this.attached = false;
  }

  /**
   * Создаёт лучи для каждого тайла.
   * @param {Array<{x: number}>} tiles — массив тайлов (нужен только .x)
   * @param {number} contentW — ширина контент-бокса
   * @param {number} screenH — высота экрана
   * @param {number} frameTopY — Y верхней границы рамки заголовка (в координатах сцены)
   */
  setup(tiles, contentW, screenH, frameTopY) {
    // Очищаем старые
    this.container.removeChildren().forEach(c => c.destroy({ children: true }));
    this.beams = [];

    const cfg = this.config;

    for (const tile of tiles) {
      const beamH = screenH - frameTopY; // от frameTopY до screenH
      const bottomHalfW = (contentW * cfg.bottomWidth) / 2;
      const topHalfW = (contentW * cfg.topWidth) / 2;

      const group = new Container();
      group.x = tile.x;
      group.label = 'beam_single';

      // Рисуем трапецию с мягкими краями:
      // Каждая вертикальная полоса разбивается на горизонтальные сегменты,
      // альфа убывает от центра к краям (мягкие края луча)
      const gfx = new Graphics();
      const edgeSegments = 5; // кол-во сегментов для размытия на каждый край
      for (let i = 0; i < cfg.strips; i++) {
        const t0 = i / cfg.strips;
        const t1 = (i + 1) / cfg.strips;

        const y0 = screenH - t0 * beamH;
        const y1 = screenH - t1 * beamH;
        const hw0 = bottomHalfW + (topHalfW - bottomHalfW) * t0;
        const hw1 = bottomHalfW + (topHalfW - bottomHalfW) * t1;

        // Вертикальное затухание
        const fade = 1 - t0;
        const baseAlpha = cfg.minAlpha + (cfg.maxAlpha - cfg.minAlpha) * fade * fade;

        // Центральная часть (яркая, 60% ширины)
        const coreRatio = 0.6;
        const coreHW0 = hw0 * coreRatio;
        const coreHW1 = hw1 * coreRatio;
        gfx.moveTo(-coreHW0, y0);
        gfx.lineTo(coreHW0, y0);
        gfx.lineTo(coreHW1, y1);
        gfx.lineTo(-coreHW1, y1);
        gfx.closePath();
        gfx.fill({ color: cfg.color, alpha: baseAlpha });

        // Мягкие края — сегменты с убывающей альфой от ядра к краю
        for (let s = 0; s < edgeSegments; s++) {
          const s0 = s / edgeSegments;
          const s1 = (s + 1) / edgeSegments;
          // Позиция: от coreHW до hw (правый край)
          const innerHW0 = coreHW0 + (hw0 - coreHW0) * s0;
          const outerHW0 = coreHW0 + (hw0 - coreHW0) * s1;
          const innerHW1 = coreHW1 + (hw1 - coreHW1) * s0;
          const outerHW1 = coreHW1 + (hw1 - coreHW1) * s1;
          // Альфа плавно убывает к краю (квадратичное затухание)
          const edgeFade = 1 - s1;
          const edgeAlpha = baseAlpha * edgeFade * edgeFade;

          // Правый край
          gfx.moveTo(innerHW0, y0);
          gfx.lineTo(outerHW0, y0);
          gfx.lineTo(outerHW1, y1);
          gfx.lineTo(innerHW1, y1);
          gfx.closePath();
          gfx.fill({ color: cfg.color, alpha: edgeAlpha });

          // Левый край (зеркально)
          gfx.moveTo(-innerHW0, y0);
          gfx.lineTo(-outerHW0, y0);
          gfx.lineTo(-outerHW1, y1);
          gfx.lineTo(-innerHW1, y1);
          gfx.closePath();
          gfx.fill({ color: cfg.color, alpha: edgeAlpha });
        }
      }
      group.addChild(gfx);

      // Пылинки
      const particlesContainer = new Container();
      const particles = [];
      for (let i = 0; i < cfg.particleCount; i++) {
        const p = {
          t: rand(0, 1),
          speed: rand(cfg.particleSpeed[0], cfg.particleSpeed[1]),
          size: rand(cfg.particleSize[0], cfg.particleSize[1]),
          xOffset: rand(-0.8, 0.8),
          alpha: rand(0.4, 0.9),
        };
        const dot = new Graphics();
        dot.circle(0, 0, p.size);
        dot.fill({ color: cfg.color, alpha: p.alpha });
        particlesContainer.addChild(dot);
        p.gfx = dot;
        particles.push(p);
      }
      group.addChild(particlesContainer);

      this.container.addChild(group);
      this.beams.push({
        group, gfx, particlesContainer, particles,
        x: tile.x, beamH, bottomHalfW, topHalfW, screenH, frameTopY,
      });
    }
  }

  /**
   * Вставляет контейнер лучей в сцену на нужный z-index.
   * @param {Container} sceneContainer
   * @param {number} index — позиция (между средним фоном и тайлами)
   */
  attachToScene(sceneContainer, index) {
    if (this.attached) return;
    const safeIndex = Math.min(index, sceneContainer.children.length);
    sceneContainer.addChildAt(this.container, safeIndex);
    this.attached = true;
  }

  /**
   * Камера — лучи фиксированы к координатам тайлов, не параллакс.
   * Контейнер уже часть sceneContainer (двигается с камерой).
   */
  updateCamera(cameraX) {
    // Лучи привязаны к координатам тайлов — ничего не двигаем,
    // но вертикально контейнер должен компенсировать container.y если есть
  }

  update(dt) {
    const cfg = this.config;
    this.time += dt;

    const pulse = 1 - cfg.pulseAmount * 0.5 +
      Math.sin(this.time * cfg.pulseSpeed * Math.PI * 2) * cfg.pulseAmount * 0.5;

    for (const beam of this.beams) {
      beam.gfx.alpha = pulse;

      for (const p of beam.particles) {
        p.t += p.speed * dt * 0.15;
        if (p.t > 1) {
          p.t -= 1;
          p.xOffset = rand(-0.8, 0.8);
        }

        const hw = beam.bottomHalfW + (beam.topHalfW - beam.bottomHalfW) * p.t;
        p.gfx.x = p.xOffset * hw;
        p.gfx.y = beam.screenH - p.t * beam.beamH;
        p.gfx.alpha = p.alpha * (1 - p.t * 0.7) * pulse;
      }
    }
  }

  resize(tiles, contentW, screenH, frameTopY) {
    this.setup(tiles, contentW, screenH, frameTopY);
  }

  destroy() {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
    this.beams = [];
    this.attached = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════

function rand(min, max) {
  return min + Math.random() * (max - min);
}
