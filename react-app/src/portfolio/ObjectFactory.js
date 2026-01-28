import { Graphics, Container, Sprite, Text } from 'pixi.js';
import { LakeGenerator, GroundPatchGenerator } from './ProceduralGenerator';

/**
 * ObjectFactory - создание объектов на карте (здания, деревья, озёра и т.д.)
 * Вынесено из IsometricScene для уменьшения размера файла
 */
export class ObjectFactory {
  constructor(scene) {
    this.scene = scene;
  }

  // Создание здания из тайлов атласа (стены + крыша)
  createBuilding(x, y, wallIndex = 0, roofIndex = 0) {
    const scene = this.scene;
    const buildingContainer = new Container();

    const leftWalls = scene.buildingWalls?.left || [];
    const rightWalls = scene.buildingWalls?.right || [];
    const roofs = scene.roofTiles || [];

    // Левая стена
    if (leftWalls.length > 0) {
      const leftTexture = leftWalls[wallIndex % leftWalls.length];
      const leftSprite = new Sprite(leftTexture);
      leftSprite.anchor.set(1, 1);
      leftSprite.x = scene.buildingWallOffsetX || 0;
      leftSprite.y = scene.buildingWallOffsetY || 0;
      buildingContainer.addChild(leftSprite);
    }

    // Правая стена
    if (rightWalls.length > 0) {
      const rightTexture = rightWalls[wallIndex % rightWalls.length];
      const rightSprite = new Sprite(rightTexture);
      rightSprite.anchor.set(0, 1);
      rightSprite.x = scene.buildingWallOffsetX || 0;
      rightSprite.y = scene.buildingWallOffsetY || 0;
      buildingContainer.addChild(rightSprite);
    }

    // Крыша
    if (roofs.length > 0) {
      const roofTexture = roofs[roofIndex % roofs.length];
      const roofSprite = new Sprite(roofTexture);
      roofSprite.anchor.set(0.5, 1);
      roofSprite.x = scene.buildingRoofOffsetX || 0;
      const wallHeight = leftWalls.length > 0 ? leftWalls[0].height : 96;
      roofSprite.y = -wallHeight + (scene.buildingRoofOffsetY || 10);
      buildingContainer.addChild(roofSprite);
    }

    return buildingContainer;
  }

  // Создание декораций (деревья, камни, здания и т.д.)
  createDecoration(x, y, type = 'tree') {
    const scene = this.scene;
    const decorationContainer = new Container();

    const objectConfig = {
      'projects': { type: 'building', tileSize: 2 },
      'home': { type: 'building', tileSize: 2 },
      'cases': { type: 'building', tileSize: 2 },
      'cafe': { type: 'building', tileSize: 2 },
      'tree': { type: 'tree', tileSize: 1 },
      'bush': { type: 'bush', tileSize: 1 },
      'rock': { type: 'rock', tileSize: 1 },
    };

    const config = objectConfig[type];

    if (config && config.type === 'building' && scene.buildingTiles && scene.buildingTiles[type]) {
      const buildingTexture = scene.buildingTiles[type];
      const buildingSprite = new Sprite(buildingTexture);
      buildingSprite.anchor.set(scene.buildingAnchorX, scene.buildingAnchorY);
      const scale = scene.buildingSize / 512;
      buildingSprite.scale.set(scale);
      decorationContainer.addChild(buildingSprite);
    } else if (config && config.type === 'tree' && scene.treeTiles && scene.treeTiles.trees.length > 0) {
      const trees = scene.treeTiles.trees;
      const texture = trees[Math.floor(Math.random() * trees.length)];
      const treeSprite = new Sprite(texture);
      treeSprite.anchor.set(scene.treeAnchorX, scene.treeAnchorY);
      const randomSize = scene.treeSizeMin + Math.random() * (scene.treeSizeMax - scene.treeSizeMin);
      const scale = randomSize / 512;
      treeSprite.scale.set(scale);
      decorationContainer.addChild(treeSprite);
    } else if (config && config.type === 'bush' && scene.treeTiles && scene.treeTiles.bushes.length > 0) {
      const bushes = scene.treeTiles.bushes;
      const texture = bushes[Math.floor(Math.random() * bushes.length)];
      const bushSprite = new Sprite(texture);
      bushSprite.anchor.set(scene.bushAnchorX, scene.bushAnchorY);
      const randomSize = scene.bushSizeMin + Math.random() * (scene.bushSizeMax - scene.bushSizeMin);
      const scale = randomSize / 512;
      bushSprite.scale.set(scale);
      decorationContainer.addChild(bushSprite);
    } else if (config && config.type === 'rock' && scene.rockTiles && scene.rockTiles.length > 0) {
      const texture = scene.rockTiles[Math.floor(Math.random() * scene.rockTiles.length)];
      const rockSprite = new Sprite(texture);
      rockSprite.anchor.set(scene.rockAnchorX, scene.rockAnchorY);
      const randomSize = scene.rockSizeMin + Math.random() * (scene.rockSizeMax - scene.rockSizeMin);
      const scale = randomSize / 512;
      rockSprite.scale.set(scale);
      decorationContainer.addChild(rockSprite);
    } else if (config) {
      const placeholder = new Graphics();
      const size = config.size || 64;
      placeholder.rect(-size/4, -size/4, size/2, size/2);
      placeholder.fill(0x888888);
      decorationContainer.addChild(placeholder);
    } else {
      const decoration = new Graphics();
      decoration.rect(-10, -10, 20, 20);
      decoration.fill(0xff00ff);
      decorationContainer.addChild(decoration);
    }

    // Позиционирование
    const tileSize = config?.tileSize || 1;
    let centerX = x;
    let centerY = y;

    if (tileSize === 2) {
      centerX = x + 0.5;
      centerY = y + 0.5;
    }

    const screenPos = scene.isoToScreen(centerX, centerY);
    decorationContainer.x = screenPos.x;
    decorationContainer.y = screenPos.y;
    decorationContainer.gridX = centerX;
    decorationContainer.gridY = centerY;

    // zIndex: формула для правильной сортировки в изометрии
    // Основной ключ: (x+y) - глубина на экране (screenY пропорционален x+y)
    // Вторичный ключ: Max(x,y) - для тайлов на одной глубине
    // Для объектов размером > 1 используем "передний" угол (самый близкий к камере)
    const frontX = x + tileSize - 1;
    const frontY = y + tileSize - 1;
    decorationContainer.zIndex = (frontX + frontY) * 100 + Math.max(frontX, frontY);
    decorationContainer.baseZIndex = decorationContainer.zIndex;
    decorationContainer.objectType = config?.type || type;

    // Регистрируем занятые клетки
    for (let dx = 0; dx < tileSize; dx++) {
      for (let dy = 0; dy < tileSize; dy++) {
        scene.registerOccupiedTile(x + dx, y + dy, type);
      }
    }

    // Debug визуализация
    if (scene.debugMode) {
      this.addDebugVisualization(decorationContainer, x, y, tileSize, config, centerX, centerY);
    }

    return decorationContainer;
  }

  // Debug визуализация для createDecoration
  addDebugVisualization(container, x, y, tileSize, config, centerX, centerY) {
    const scene = this.scene;
    const hw = scene.tileWidth / 2;
    const hh = scene.tileHeight / 2;

    const topTileCenter = scene.getTileCenter(x, y);
    const rightTileCenter = scene.getTileCenter(x + tileSize - 1, y);
    const bottomTileCenter = scene.getTileCenter(x + tileSize - 1, y + tileSize - 1);
    const leftTileCenter = scene.getTileCenter(x, y + tileSize - 1);

    const topCorner = { x: topTileCenter.x, y: topTileCenter.y - hh };
    const rightCorner = { x: rightTileCenter.x + hw, y: rightTileCenter.y };
    const bottomCorner = { x: bottomTileCenter.x, y: bottomTileCenter.y + hh };
    const leftCorner = { x: leftTileCenter.x - hw, y: leftTileCenter.y };

    const objPos = scene.isoToScreen(centerX, centerY);

    const collisionBorder = new Graphics();
    collisionBorder.moveTo(topCorner.x - objPos.x, topCorner.y - objPos.y);
    collisionBorder.lineTo(rightCorner.x - objPos.x, rightCorner.y - objPos.y);
    collisionBorder.lineTo(bottomCorner.x - objPos.x, bottomCorner.y - objPos.y);
    collisionBorder.lineTo(leftCorner.x - objPos.x, leftCorner.y - objPos.y);
    collisionBorder.lineTo(topCorner.x - objPos.x, topCorner.y - objPos.y);
    collisionBorder.stroke({ width: 3, color: 0x00ffff, alpha: 0.9 });
    collisionBorder.fill({ color: 0x00ffff, alpha: 0.15 });
    container.addChild(collisionBorder);

    // Entry tile визуализация для зданий
    if (config && config.type === 'building' && tileSize >= 2) {
      const entryTileX = x;
      const entryTileY = y + tileSize - 1;
      const entryTileCenter = scene.getTileCenter(entryTileX, entryTileY);

      const entryTileViz = new Graphics();
      const etTop = { x: entryTileCenter.x - objPos.x, y: entryTileCenter.y - objPos.y - hh };
      const etRight = { x: entryTileCenter.x - objPos.x + hw, y: entryTileCenter.y - objPos.y };
      const etBottom = { x: entryTileCenter.x - objPos.x, y: entryTileCenter.y - objPos.y + hh };
      const etLeft = { x: entryTileCenter.x - objPos.x - hw, y: entryTileCenter.y - objPos.y };

      entryTileViz.moveTo(etTop.x, etTop.y);
      entryTileViz.lineTo(etRight.x, etRight.y);
      entryTileViz.lineTo(etBottom.x, etBottom.y);
      entryTileViz.lineTo(etLeft.x, etLeft.y);
      entryTileViz.lineTo(etTop.x, etTop.y);
      entryTileViz.fill({ color: 0xffff00, alpha: 0.4 });
      entryTileViz.stroke({ width: 3, color: 0xffff00, alpha: 1.0 });

      const entryMarker = new Graphics();
      entryMarker.circle(entryTileCenter.x - objPos.x, entryTileCenter.y - objPos.y, 8);
      entryMarker.fill({ color: 0xffff00, alpha: 1.0 });
      entryMarker.stroke({ width: 2, color: 0x000000, alpha: 1.0 });

      const entryText = new Text({
        text: 'ENTRY',
        style: {
          fontFamily: 'Arial',
          fontSize: 16,
          fontWeight: 'bold',
          fill: 0xffff00,
          stroke: { color: 0x000000, width: 3 },
          align: 'center',
        }
      });
      entryText.anchor.set(0.5);
      entryText.x = entryTileCenter.x - objPos.x;
      entryText.y = entryTileCenter.y - objPos.y - 20;

      container.addChild(entryTileViz);
      container.addChild(entryMarker);
      container.addChild(entryText);
    }
  }

  // Создание случайной растительности вокруг активного поля
  createVegetation() {
    const scene = this.scene;
    const padding = scene.backgroundPadding;
    const count = scene.vegetationCount;
    const placed = [];

    const availablePositions = [];

    for (let y = -padding; y < scene.gridSize + padding; y++) {
      for (let x = -padding; x < scene.gridSize + padding; x++) {
        if (x >= 0 && x < scene.gridSize && y >= 0 && y < scene.gridSize) {
          continue;
        }
        availablePositions.push({ x, y });
      }
    }

    // Перемешиваем позиции
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }

    let placedCount = 0;
    for (let i = 0; i < availablePositions.length && placedCount < count; i++) {
      const pos = availablePositions[i];

      if (this.isPositionInLake(pos.x, pos.y)) {
        continue;
      }

      const rand = Math.random();
      const type = rand < 0.4 ? 'tree' : (rand < 0.8 ? 'bush' : 'rock');
      const decoration = this.createDecoration(pos.x, pos.y, type);
      scene.sortableContainer.addChild(decoration);
      placed.push(decoration);
      placedCount++;
    }

    console.log(`Placed ${placed.length} vegetation items`);
    return placed;
  }

  // Проверка, находится ли позиция внутри озера
  isPositionInLake(gridX, gridY) {
    const scene = this.scene;
    if (!scene.lakesEnabled || !scene.lakeLocations) return false;

    for (const lakeDef of scene.lakeLocations) {
      const dx = gridX - lakeDef.x;
      const dy = gridY - lakeDef.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < lakeDef.radius + 0.5) {
        return true;
      }
    }
    return false;
  }

  // Создание процедурных озёр
  createLakes() {
    const scene = this.scene;
    if (!scene.lakesEnabled) return;

    scene.lakes = [];

    for (const lakeDef of scene.lakeLocations) {
      const generator = new LakeGenerator({
        tileWidth: scene.tileWidth,
        tileHeight: scene.tileHeight,
        pixelSize: scene.lakePixelSize,
        seed: lakeDef.seed,
      });

      const lake = generator.createLakeAtGrid(lakeDef.x, lakeDef.y, lakeDef.radius, scene.debugMode);
      lake.lakeGenerator = generator;
      lake.lakeDef = lakeDef;
      lake.zIndex = 50;

      scene.container.addChild(lake);
      scene.lakes.push(lake);
    }

    console.log(`Created ${scene.lakes.length} procedural lakes`);
  }

  // Создание натоптанной земли у входов в здания
  createGroundPatches() {
    const scene = this.scene;
    scene.groundPatches = [];

    const generator = new GroundPatchGenerator({
      tileWidth: scene.tileWidth,
      tileHeight: scene.tileHeight,
      seed: 42,
    });

    for (const [name, location] of Object.entries(scene.buildingLocations)) {
      const entryTile = scene.getEntryTile(location);
      if (!entryTile) continue;

      const patch = generator.createGroundPatchAtGrid(
        entryTile.tileX,
        entryTile.tileY,
        1,
        scene.debugMode
      );

      scene.container.addChild(patch);
      scene.groundPatches.push(patch);
    }

    console.log(`Created ${scene.groundPatches.length} ground patches`);
  }
}
