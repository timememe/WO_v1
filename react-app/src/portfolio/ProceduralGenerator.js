import { Graphics, Container, RenderTexture, Sprite } from 'pixi.js';

/**
 * Процедурные генераторы для изометрической сцены
 * - LakeGenerator: озёра с органичными формами
 * - GroundPatchGenerator: натоптанная земля под зданиями
 * Используют Simplex Noise для создания естественных форм
 */

// ═══════════════════════════════════════════════════════════════
// SIMPLEX NOISE (упрощённая реализация)
// ═══════════════════════════════════════════════════════════════

class SimplexNoise {
  constructor(seed = Math.random() * 10000) {
    this.seed = seed;
    this.perm = this.buildPermutationTable();
  }

  buildPermutationTable() {
    const perm = [];
    for (let i = 0; i < 256; i++) perm[i] = i;

    // Fisher-Yates shuffle с seed
    let n = 256;
    const random = this.seededRandom(this.seed);
    while (n > 1) {
      const k = Math.floor(random() * n);
      n--;
      [perm[n], perm[k]] = [perm[k], perm[n]];
    }

    // Дублируем для избежания переполнения
    return [...perm, ...perm];
  }

  seededRandom(seed) {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  dot2(g, x, y) {
    return g[0] * x + g[1] * y;
  }

  noise2D(x, y) {
    const grad3 = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1],
    ];

    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.perm[ii + this.perm[jj]] % 8;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;

    let n0, n1, n2;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot2(grad3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot2(grad3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot2(grad3[gi2], x2, y2);
    }

    // Возвращаем значение в диапазоне [-1, 1]
    return 70 * (n0 + n1 + n2);
  }

  // Fractal Brownian Motion для более интересных форм
  fbm(x, y, octaves = 4, lacunarity = 2, persistence = 0.5) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }
}

// ═══════════════════════════════════════════════════════════════
// ПАЛИТРА SEGA GENESIS
// ═══════════════════════════════════════════════════════════════

const GENESIS_PALETTE = {
  // Вода
  waterDeep: 0x1a3a5c,      // Глубокая вода
  waterMid: 0x2a5a8c,       // Средняя глубина
  waterShallow: 0x4a8abc,   // Мелководье
  waterHighlight: 0x6abaec, // Блики на воде

  // Берег (земляные/грязевые тона)
  wetSand: 0x4a3a2a,        // Мокрая земля (тёмно-коричневый)
  sand: 0x5a4a3a,           // Грязь (коричневый)
  pebbles: 0x6a5a4a,        // Сухая земля (светло-коричневый)

  // Переход к траве
  dirtDark: 0x3a2a1a,       // Тёмная земля
  dirtLight: 0x4a3a2a,      // Светлая земля

  // Детали
  shadow: 0x1a2a3a,         // Тень
  foam: 0xdaeaff,           // Пена
};

// ═══════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КЛАСС ГЕНЕРАТОРА ОЗЁР
// ═══════════════════════════════════════════════════════════════

export class LakeGenerator {
  constructor(options = {}) {
    this.tileWidth = options.tileWidth || 128;
    this.tileHeight = options.tileHeight || 64;
    this.pixelSize = options.pixelSize || 2; // Размер "пикселя" для ретро-стиля
    this.seed = options.seed ?? Math.random() * 10000;
    this.noise = new SimplexNoise(this.seed);

    this.waterFrameInterval = options.waterFrameInterval ?? 12;
    this._waterFrameAcc = 0;
    this.waterFrames = [];
    this._waterFrameIndex = 0;
    this.heightMap = null;
    this.lakeWidth = 0;
    this.lakeHeight = 0;
    this.lakeResolution = 0;

    // Настройки слоёв берега
    this.layers = {
      deepWater: 0.3,      // threshold для глубокой воды
      midWater: 0.4,       // threshold для средней воды
      shallowWater: 0.5,   // threshold для мелководья
      wetSand: 0.55,       // мокрый песок
      sand: 0.6,           // сухой песок
      pebbles: 0.65,       // галька
    };

    // Время для анимации
    this.time = 0;
  }

  /**
   * Генерирует карту высот для озера
   * @param {number} centerX - Центр озера в grid координатах
   * @param {number} centerY - Центр озера в grid координатах
   * @param {number} radius - Радиус озера в тайлах
   * @param {number} resolution - Разрешение карты
   */
  generateHeightMap(centerX, centerY, radius, resolution = 64) {
    const map = [];
    const scale = 0.15; // Масштаб шума

    for (let y = 0; y < resolution; y++) {
      map[y] = [];
      for (let x = 0; x < resolution; x++) {
        // Нормализованные координаты (-1 до 1)
        const nx = (x / resolution - 0.5) * 2;
        const ny = (y / resolution - 0.5) * 2;

        // Расстояние от центра (для круглой формы)
        const dist = Math.sqrt(nx * nx + ny * ny);

        // Базовый шум
        const noiseVal = this.noise.fbm(
          centerX + nx * radius * scale,
          centerY + ny * radius * scale,
          4, 2, 0.5
        );

        // Комбинируем с радиальным градиентом
        // Чем ближе к центру, тем "глубже" (меньше значение)
        const radialGradient = dist;

        // Добавляем искажение края шумом
        const edgeNoise = this.noise.fbm(
          centerX + nx * 3,
          centerY + ny * 3,
          2, 2, 0.5
        ) * 0.3;

        // Финальное значение
        let value = radialGradient + edgeNoise + noiseVal * 0.2;

        // Нормализуем к 0-1
        value = Math.max(0, Math.min(1, value));

        map[y][x] = value;
      }
    }

    return map;
  }

  /**
   * Создаёт контейнер с озером
   * @param {number} gridX - Позиция X в grid координатах
   * @param {number} gridY - Позиция Y в grid координатах
   * @param {number} radius - Радиус озера в тайлах
   */
  createLake(gridX, gridY, radius = 3, debugMode = false) {
    const container = new Container();
    container.label = 'lake';

    const resolution = 256;
    const heightMap = this.generateHeightMap(gridX, gridY, radius, resolution);

    // Размер озера в пикселях
    const lakeWidth = radius * this.tileWidth * 2;
    const lakeHeight = radius * this.tileHeight * 2;

    // DEBUG: яркий прямоугольник чтобы увидеть границы озера
    if (debugMode) {
      const debugBg = new Graphics();
      debugBg.rect(0, 0, lakeWidth, lakeHeight);
      debugBg.fill({ color: 0xff0000, alpha: 0.3 });
      container.addChild(debugBg);
    }

    // Рисуем слои от глубины к берегу
    this.heightMap = heightMap;
    this.lakeWidth = lakeWidth;
    this.lakeHeight = lakeHeight;
    this.lakeResolution = resolution;
    const waterFrameOffsets = [0, 6, 12];
    this.waterFrames = [];
    this._waterFrameIndex = 0;

    for (let i = 0; i < waterFrameOffsets.length; i++) {
      const frame = new Graphics();
      frame.label = `lakeWaterFrame${i}`;
      this.drawWaterLayers(frame, heightMap, lakeWidth, lakeHeight, resolution, waterFrameOffsets[i]);
      frame.visible = i === 0;
      container.addChild(frame);
      this.waterFrames.push(frame);
    }
    this.drawShoreDetails(container, heightMap, lakeWidth, lakeHeight, resolution);
    // Волны/блики отключены
    // this.drawWaterEffects(container, heightMap, lakeWidth, lakeHeight, resolution);

    // Позиционируем контейнер
    container.pivot.set(lakeWidth / 2, lakeHeight / 2);

    return container;
  }

  /**
   * Рисует воду (один плотный цвет)
   */
  drawWaterLayers(graphics, heightMap, width, height, resolution, timeOffset = 0) {
    const cellW = width / resolution;
    const cellH = height / resolution;

    // ?????????? ?????? ???????? - ?????? ?????? "????????????" ??????????
    const waterThreshold = this.layers.shallowWater;
    const t = timeOffset * 0.15;

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const value = heightMap[y][x];

        if (value < waterThreshold) {
          const px = x * cellW;
          const py = y * cellH;

          graphics.rect(px, py, cellW + 1, cellH + 1);
          graphics.fill({ color: GENESIS_PALETTE.waterDeep, alpha: 1 });

          const edgeBand = waterThreshold - value;
          const featherNoise = this.noise.noise2D(x * 1.7 + t, y * 1.7 + t * 0.8);

          // ?????????? ?? ?????? ????
          if (edgeBand < 0.06) {
            if (featherNoise > 0.3) {
              const alpha = Math.min(0.75, 0.35 + featherNoise * 0.25);
              graphics.rect(px, py, cellW + 1, cellH + 1);
              graphics.fill({ color: GENESIS_PALETTE.foam, alpha });
            }
          }

          // ?????? "???????" ?? ????? ????
          if (value < waterThreshold - 0.08) {
            const wave = Math.sin((x + y) * 0.35 + t * 1.2);
            if (featherNoise > 0.6 && wave > 0.2) {
              const alpha = 0.12 + (featherNoise - 0.6) * 0.2;
              graphics.rect(px, py, cellW + 1, cellH + 1);
              graphics.fill({ color: GENESIS_PALETTE.foam, alpha });
            }
          }
        }
      }
    }

  }

  /**
   * Рисует берег (тонкая линия одного цвета)
   */
  drawShoreDetails(container, heightMap, width, height, resolution) {
    const graphics = new Graphics();
    const cellW = width / resolution;
    const cellH = height / resolution;

    const waterThreshold = this.layers.shallowWater;
    const shoreThreshold = this.layers.wetSand;

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const value = heightMap[y][x];
        const detail = this.noise.fbm(
          (x / resolution) * 7 + this.seed,
          (y / resolution) * 7 - this.seed,
          3, 2, 0.5
        );
        const grain = this.noise.noise2D(x * 2.2, y * 2.2);
        const jittered = Math.max(0, Math.min(1, value + detail * 0.05));

        if (jittered >= waterThreshold && jittered < shoreThreshold) {
          let alpha = 1;
          if (grain > 0.35 && jittered < waterThreshold + 0.03) {
            alpha = 0.75;
          } else if (grain < -0.35 && jittered > shoreThreshold - 0.03) {
            alpha = 0.75;
          }
          alpha = Math.max(0.7, Math.min(1, alpha + detail * 0.06));

          const px = x * cellW;
          const py = y * cellH;

          graphics.rect(px, py, cellW + 1, cellH + 1);
          graphics.fill({ color: GENESIS_PALETTE.wetSand, alpha });
        }
      }
    }

    container.addChild(graphics);
  }

  /**
   * Добавляет камешки на берег
   */
  addPebbles(graphics, heightMap, width, height, resolution) {
    const pebbleCount = Math.floor(resolution * 0.8);
    const pixelW = width / resolution;
    const pixelH = height / resolution;

    for (let i = 0; i < pebbleCount; i++) {
      const x = Math.floor(this.noise.noise2D(i * 0.7, this.seed) * 0.5 * resolution + resolution / 2);
      const y = Math.floor(this.noise.noise2D(this.seed, i * 0.7) * 0.5 * resolution + resolution / 2);

      if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
        const value = heightMap[y][x];

        // Камешки только на берегу
        if (value >= this.layers.wetSand && value < this.layers.pebbles) {
          const px = Math.floor(x * pixelW / this.pixelSize) * this.pixelSize;
          const py = Math.floor(y * pixelH / this.pixelSize) * this.pixelSize;

          const pebbleSize = this.pixelSize * (1 + Math.floor(Math.abs(this.noise.noise2D(i, i)) * 2));
          const shade = Math.abs(this.noise.noise2D(i * 2, i * 2));
          const color = shade > 0.5 ? GENESIS_PALETTE.pebbles : GENESIS_PALETTE.dirtDark;

          graphics.rect(px, py, pebbleSize, pebbleSize);
          graphics.fill({ color, alpha: 1 });
        }
      }
    }
  }

  /**
   * Рисует эффекты воды (блики, волны)
   */
  drawWaterEffects(container, heightMap, width, height, resolution) {
    const graphics = new Graphics();
    const pixelW = width / resolution;
    const pixelH = height / resolution;

    // Блики на воде
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const value = heightMap[y][x];

        if (value < this.layers.shallowWater) {
          // Волнистый паттерн для бликов
          const wavePattern = Math.sin(x * 0.3 + y * 0.2 + this.time * 0.1) * 0.5 + 0.5;
          const highlightNoise = this.noise.noise2D(x * 0.2, y * 0.2);

          if (wavePattern > 0.7 && highlightNoise > 0.3 && value < this.layers.midWater) {
            const px = Math.floor(x * pixelW / this.pixelSize) * this.pixelSize;
            const py = Math.floor(y * pixelH / this.pixelSize) * this.pixelSize;

            graphics.rect(px, py, this.pixelSize * 2, this.pixelSize);
            graphics.fill({ color: GENESIS_PALETTE.waterHighlight, alpha: 0.6 });
          }
        }
      }
    }

    // Пена на границе воды
    for (let y = 1; y < resolution - 1; y++) {
      for (let x = 1; x < resolution - 1; x++) {
        const value = heightMap[y][x];

        // Находим границу воды
        if (value >= this.layers.shallowWater - 0.05 && value < this.layers.shallowWater) {
          const foamNoise = this.noise.noise2D(x * 0.4 + this.time * 0.05, y * 0.4);

          if (foamNoise > 0.2) {
            const px = Math.floor(x * pixelW / this.pixelSize) * this.pixelSize;
            const py = Math.floor(y * pixelH / this.pixelSize) * this.pixelSize;

            graphics.rect(px, py, this.pixelSize, this.pixelSize);
            graphics.fill({ color: GENESIS_PALETTE.foam, alpha: 0.7 });
          }
        }
      }
    }

    container.addChild(graphics);
  }

  /**
   * Обновляет анимацию воды
   */

    update(deltaTime = 1) {
    this.time += deltaTime;
    this._waterFrameAcc += deltaTime;
    if (this._waterFrameAcc >= this.waterFrameInterval) {
      this._waterFrameAcc = 0;
      if (this.waterFrames.length > 0) {
        this.waterFrames[this._waterFrameIndex].visible = false;
        this._waterFrameIndex = (this._waterFrameIndex + 1) % this.waterFrames.length;
        this.waterFrames[this._waterFrameIndex].visible = true;
      }
    }
  }

  /**
   * Конвертирует grid позицию в изометрические координаты
   */
  gridToIso(gridX, gridY) {
    return {
      x: (gridX - gridY) * (this.tileWidth / 2),
      y: (gridX + gridY) * (this.tileHeight / 2),
    };
  }

  /**
   * Создаёт озеро и позиционирует его в изометрической сетке
   */
  createLakeAtGrid(gridX, gridY, radius = 3, debugMode = false) {
    const lake = this.createLake(gridX, gridY, radius, debugMode);
    const isoPos = this.gridToIso(gridX, gridY);

    lake.x = isoPos.x;
    lake.y = isoPos.y;

    // Z-index для правильной сортировки
    lake.zIndex = (gridX + gridY) * 10;

    return lake;
  }
}

// ═══════════════════════════════════════════════════════════════
// ГЕНЕРАТОР НАТОПТАННОЙ ЗЕМЛИ ПОД ЗДАНИЯМИ
// ═══════════════════════════════════════════════════════════════

export class GroundPatchGenerator {
  constructor(options = {}) {
    this.tileWidth = options.tileWidth || 128;
    this.tileHeight = options.tileHeight || 64;
    this.seed = options.seed ?? Math.random() * 10000;
    this.noise = new SimplexNoise(this.seed);

    // Три тона под палитру травы
    this.colors = {
      inner: 0x37310c,   // Центр - тёмно-коричневый
      middle: 0x4f841f,  // Средний - тёмно-зелёный
      outer: 0x055618,   // Край - светло-зелёный
    };

    // Пороги для слоёв
    this.layers = {
      inner: 0.30,   // Центральная зона
      middle: 0.50,  // Средняя зона
      outer: 0.72,   // Внешняя зона
    };
  }

  /**
   * Генерирует карту для пятна земли с неровными краями
   */
  generateGroundMap(centerX, centerY, sizeX, sizeY, resolution = 128) {
    const map = [];
    const scale = 0.2;

    for (let y = 0; y < resolution; y++) {
      map[y] = [];
      for (let x = 0; x < resolution; x++) {
        // Нормализованные координаты (-1 до 1)
        const nx = (x / resolution - 0.5) * 2;
        const ny = (y / resolution - 0.5) * 2;

        // Расстояние от центра (эллипс для прямоугольной формы)
        const dist = Math.sqrt((nx * nx) + (ny * ny));

        // Шум для неровных краёв
        const edgeNoise = this.noise.fbm(
          centerX + nx * 2,
          centerY + ny * 2,
          3, 2, 0.5
        ) * 0.25;

        // Финальное значение - чем меньше, тем "внутри" пятна
        let value = dist + edgeNoise;
        value = Math.max(0, Math.min(1, value));

        map[y][x] = value;
      }
    }

    return map;
  }

  /**
   * Создаёт пятно натоптанной земли
   * @param {number} gridX - Позиция X в grid координатах
   * @param {number} gridY - Позиция Y в grid координатах
   * @param {number} sizeInTiles - Размер в тайлах (например 2 для 2x2)
   */
  createGroundPatch(gridX, gridY, sizeInTiles = 2, debugMode = false) {
    const container = new Container();
    container.label = 'groundPatch';

    const resolution = 128;
    const groundMap = this.generateGroundMap(gridX, gridY, sizeInTiles, sizeInTiles, resolution);

    // Размер пятна в пикселях (чуть больше здания для естественности)
    const padding = 0.3; // Выступ за границы здания
    const patchWidth = (sizeInTiles + padding) * this.tileWidth;
    const patchHeight = (sizeInTiles + padding) * this.tileHeight;

    // DEBUG
    if (debugMode) {
      const debugBg = new Graphics();
      debugBg.rect(0, 0, patchWidth, patchHeight);
      debugBg.fill({ color: 0x00ff00, alpha: 0.3 });
      container.addChild(debugBg);
    }

    // Рисуем землю
    this.drawGround(container, groundMap, patchWidth, patchHeight, resolution);

    // Центрируем контейнер
    container.pivot.set(patchWidth / 2, patchHeight / 2);

    return container;
  }

  /**
   * Рисует натоптанную землю (два тона)
   */
  drawGround(container, groundMap, width, height, resolution) {
    const graphics = new Graphics();
    const cellW = width / resolution;
    const cellH = height / resolution;

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const value = groundMap[y][x];
        const detail = this.noise.fbm(
          (x / resolution) * 8 + this.seed,
          (y / resolution) * 8 - this.seed,
          3, 2, 0.5
        );
        const grain = this.noise.noise2D(x * 1.8, y * 1.8);
        const jittered = Math.max(0, Math.min(1, value + detail * 0.06));

        let color = null;
        if (jittered < this.layers.inner) {
          color = this.colors.inner;
        } else if (jittered < this.layers.middle) {
          color = this.colors.middle;
        } else if (jittered < this.layers.outer) {
          color = this.colors.outer;
        }

        if (color !== null) {
          if (color === this.colors.middle) {
            if (grain > 0.35 && jittered < this.layers.middle + 0.04) {
              color = this.colors.inner;
            } else if (grain < -0.35 && jittered > this.layers.middle - 0.04) {
              color = this.colors.outer;
            }
          } else if (color === this.colors.outer && grain > 0.5 && jittered > this.layers.outer - 0.05) {
            color = this.colors.middle;
          }

          let alpha = 1;
          if (color === this.colors.outer) {
            alpha = 0.85;
          } else if (color === this.colors.middle) {
            alpha = 0.93;
          }
          alpha = Math.max(0.78, Math.min(1, alpha + detail * 0.05));

          const px = x * cellW;
          const py = y * cellH;

          graphics.rect(px, py, cellW + 1, cellH + 1);
          graphics.fill({ color, alpha });
        }
      }
    }

    container.addChild(graphics);
  }

  /**
   * Конвертирует grid позицию в изометрические координаты
   */
  gridToIso(gridX, gridY) {
    return {
      x: (gridX - gridY) * (this.tileWidth / 2),
      y: (gridX + gridY) * (this.tileHeight / 2),
    };
  }

  /**
   * Создаёт пятно земли и позиционирует в изометрической сетке
   */
  createGroundPatchAtGrid(gridX, gridY, sizeInTiles = 2, debugMode = false) {
    const patch = this.createGroundPatch(gridX, gridY, sizeInTiles, debugMode);

    // Центр здания (для 2x2 здания на позиции gridX, gridY центр будет в gridX+1, gridY+1)
    const centerX = gridX + sizeInTiles / 2;
    const centerY = gridY + sizeInTiles / 2;
    const isoPos = this.gridToIso(centerX, centerY);

    patch.x = isoPos.x;
    patch.y = isoPos.y;

    // zIndex чуть выше травы, но ниже озёр
    patch.zIndex = 5;

    return patch;
  }
}

export { GENESIS_PALETTE, SimplexNoise };
