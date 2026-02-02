"use client";

type Nullable<T> = T | null;

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Frame {
  dataUrl: string;
  width: number;
  height: number;
  contentBounds: BoundingBox;
}

export interface CustomBackgroundLayers {
  layer1Url: Nullable<string>;
  layer2Url: Nullable<string>;
  layer3Url: Nullable<string>;
}

export interface LevelFrames {
  walkFrames: Frame[];
  jumpFrames: Frame[];
  attackFrames: Frame[];
  idleFrames: Frame[];
}

export interface LevelConfig {
  PIXI: any;
  parent: any;
  ticker?: any;
  frames: LevelFrames;
  fps?: number;
  customBackgroundLayers?: CustomBackgroundLayers;
  worldWidth?: number;
  worldHeight?: number;
  groundY?: number;
  moveSpeed?: number;
  jumpVelocity?: number;
  gravity?: number;
  attachKeyboard?: boolean;
  defaultParallaxLayers?: { url: string; speed: number }[];
  customParallaxSpeeds?: number[];
}

export interface LevelHandle {
  container: any;
  update: (deltaSeconds: number) => void;
  setFrames: (frames: LevelFrames) => void;
  setCustomBackgroundLayers: (layers?: CustomBackgroundLayers) => void;
  setFps: (fps: number) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  handleKeyUp: (e: KeyboardEvent) => void;
  destroy: () => void;
}

const DEFAULT_PARALLAX_LAYERS = [
  { url: "https://raw.githubusercontent.com/meiliizzsuju/game-parallax-backgrounds/main/assets/layer-1.png", speed: 0 },
  { url: "https://raw.githubusercontent.com/meiliizzsuju/game-parallax-backgrounds/main/assets/layer-2.png", speed: 0.1 },
  { url: "https://raw.githubusercontent.com/meiliizzsuju/game-parallax-backgrounds/main/assets/layer-3.png", speed: 0.3 },
  { url: "https://raw.githubusercontent.com/meiliizzsuju/game-parallax-backgrounds/main/assets/layer-4.png", speed: 0.5 },
  { url: "https://raw.githubusercontent.com/meiliizzsuju/game-parallax-backgrounds/main/assets/layer-5.png", speed: 0.7 },
];

const DEFAULT_CUSTOM_PARALLAX_SPEEDS = [0, 0.3, 0.6];

const waitForTexture = (texture: any) =>
  new Promise<void>((resolve) => {
    if (texture.baseTexture?.valid) {
      resolve();
      return;
    }
    const onLoaded = () => {
      texture.baseTexture?.off?.("loaded", onLoaded);
      resolve();
    };
    texture.baseTexture?.on?.("loaded", onLoaded);
  });

export function createPixiLevel({
  PIXI,
  parent,
  ticker,
  frames,
  fps = 8,
  customBackgroundLayers,
  worldWidth = 800,
  worldHeight = 400,
  groundY = 340,
  moveSpeed = 3,
  jumpVelocity = -12,
  gravity = 0.6,
  attachKeyboard = false,
  defaultParallaxLayers = DEFAULT_PARALLAX_LAYERS,
  customParallaxSpeeds = DEFAULT_CUSTOM_PARALLAX_SPEEDS,
}: LevelConfig): LevelHandle {
  const container = new PIXI.Container();
  parent.addChild(container);

  const backgroundContainer = new PIXI.Container();
  const actorContainer = new PIXI.Container();
  container.addChild(backgroundContainer);
  container.addChild(actorContainer);

  const state = {
    x: worldWidth / 2,
    y: 0,
    velocityY: 0,
    direction: "right" as "left" | "right",
    isWalking: false,
    isJumping: false,
    isAttacking: false,
    walkFrameIndex: 0,
    jumpFrameIndex: 0,
    attackFrameIndex: 0,
    idleFrameIndex: 0,
    frameTime: 0,
    jumpFrameTime: 0,
    attackFrameTime: 0,
    idleFrameTime: 0,
  };

  const input = new Set<string>();
  let cameraX = 0;
  let timeSeconds = 0;
  let fpsValue = fps;

  let walkTextures: any[] = [];
  let jumpTextures: any[] = [];
  let attackTextures: any[] = [];
  let idleTextures: any[] = [];

  let walkFrameData: Frame[] = [];
  let jumpFrameData: Frame[] = [];
  let attackFrameData: Frame[] = [];
  let idleFrameData: Frame[] = [];

  const shadow = new PIXI.Graphics();
  actorContainer.addChild(shadow);

  const characterSprite = new PIXI.Sprite();
  characterSprite.anchor.set(0, 0);
  actorContainer.addChild(characterSprite);

  const defaultBgSprites: any[] = [];
  let defaultBgReady = false;

  const customBgSprites: any[] = [];
  let customBgReady = false;
  let customBgUrls: string[] = [];

  const createDefaultParallax = async () => {
    backgroundContainer.removeChildren();
    defaultBgSprites.length = 0;
    defaultBgReady = false;

    for (const layer of defaultParallaxLayers) {
      const texture = PIXI.Texture.from(layer.url);
      await waitForTexture(texture);
      const sprite = new PIXI.TilingSprite(texture, worldWidth, worldHeight);
      const scale = worldHeight / texture.height;
      sprite.tileScale.set(scale);
      sprite.width = worldWidth;
      sprite.height = worldHeight;
      backgroundContainer.addChild(sprite);
      defaultBgSprites.push({ sprite, speed: layer.speed, scale });
    }
    defaultBgReady = defaultBgSprites.length === defaultParallaxLayers.length;
  };

  const createCustomParallax = async (layers: CustomBackgroundLayers) => {
    customBgReady = false;
    customBgSprites.length = 0;
    backgroundContainer.removeChildren();

    const urls = [layers.layer1Url, layers.layer2Url, layers.layer3Url].filter(
      (url): url is string => Boolean(url),
    );
    customBgUrls = urls;

    for (const url of urls) {
      const texture = PIXI.Texture.from(url);
      await waitForTexture(texture);
      const sprite = new PIXI.Sprite(texture);
      const scale = worldHeight / texture.height;
      sprite.scale.set(scale);
      sprite.y = 0;
      backgroundContainer.addChild(sprite);
      customBgSprites.push({ sprite, scale, texture });
    }
    customBgReady = customBgSprites.length === urls.length && urls.length > 0;
  };

  const loadFrames = async (frameList: Frame[], target: "walk" | "jump" | "attack" | "idle") => {
    const textures = [];
    for (const frame of frameList) {
      const texture = PIXI.Texture.from(frame.dataUrl);
      await waitForTexture(texture);
      textures.push(texture);
    }

    if (target === "walk") {
      walkTextures = textures;
      walkFrameData = frameList;
    } else if (target === "jump") {
      jumpTextures = textures;
      jumpFrameData = frameList;
    } else if (target === "attack") {
      attackTextures = textures;
      attackFrameData = frameList;
    } else {
      idleTextures = textures;
      idleFrameData = frameList;
    }
  };

  const setFrames = (nextFrames: LevelFrames) => {
    if (nextFrames.walkFrames.length > 0) {
      void loadFrames(nextFrames.walkFrames, "walk");
    }
    if (nextFrames.jumpFrames.length > 0) {
      void loadFrames(nextFrames.jumpFrames, "jump");
    }
    if (nextFrames.attackFrames.length > 0) {
      void loadFrames(nextFrames.attackFrames, "attack");
    }
    if (nextFrames.idleFrames.length > 0) {
      void loadFrames(nextFrames.idleFrames, "idle");
    }
  };

  const setCustomBackgroundLayers = (layers?: CustomBackgroundLayers) => {
    if (!layers?.layer1Url) {
      customBgReady = false;
      customBgUrls = [];
      void createDefaultParallax();
      return;
    }
    const urls = [layers.layer1Url, layers.layer2Url, layers.layer3Url].filter(
      (url): url is string => Boolean(url),
    );
    if (urls.join("|") === customBgUrls.join("|")) {
      return;
    }
    void createCustomParallax(layers);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") input.add("right");
    if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") input.add("left");
    if ((e.key === "w" || e.key === "W" || e.key === "ArrowUp") && !state.isJumping && !state.isAttacking) {
      state.isJumping = true;
      state.velocityY = jumpVelocity;
      state.jumpFrameIndex = 0;
      state.jumpFrameTime = 0;
    }
    if ((e.key === "j" || e.key === "J") && !state.isAttacking) {
      state.isAttacking = true;
      state.attackFrameIndex = 0;
      state.attackFrameTime = 0;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") input.delete("right");
    if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") input.delete("left");
  };

  const update = (deltaSeconds: number) => {
    timeSeconds += deltaSeconds;

    const movingHorizontally = input.has("right") || input.has("left");
    state.isWalking = movingHorizontally && !state.isJumping && !state.isAttacking;

    const canMove = !state.isAttacking || state.isJumping;
    const moveAmount = moveSpeed * deltaSeconds * 60;
    if (canMove) {
      if (input.has("right")) {
        state.direction = "right";
        state.x += moveAmount;
        cameraX += moveAmount;
      }
      if (input.has("left")) {
        state.direction = "left";
        state.x -= moveAmount;
        cameraX -= moveAmount;
      }
    }

    state.x = Math.max(50, Math.min(worldWidth - 50, state.x));

    if (state.isJumping) {
      const physicsScale = deltaSeconds * 60;
      state.velocityY += gravity * physicsScale;
      state.y += state.velocityY * physicsScale;

      if (state.y >= 0) {
        state.y = 0;
        state.velocityY = 0;
        state.isJumping = false;
        state.jumpFrameIndex = 0;
        state.jumpFrameTime = 0;
      }
    }

    if (customBgReady && customBgSprites.length > 0) {
      const fastestSpeed = Math.max(...customParallaxSpeeds);
      let maxCameraX = Infinity;

      const reference = customBgSprites[0];
      if (reference?.texture?.width) {
        const scaledWidth = reference.texture.width * reference.scale;
        const maxOffset = Math.max(0, scaledWidth - worldWidth);
        if (fastestSpeed > 0) {
          maxCameraX = Math.min(maxCameraX, maxOffset / fastestSpeed);
        }
      }
      const clampedCameraX = Math.max(0, Math.min(maxCameraX === Infinity ? 0 : maxCameraX, cameraX));

      customBgSprites.forEach((layer, index) => {
        const speed = customParallaxSpeeds[index] ?? 0;
        layer.sprite.x = -clampedCameraX * speed;
      });
    } else if (defaultBgReady && defaultBgSprites.length > 0) {
      defaultBgSprites.forEach((layer) => {
        const offset = cameraX * layer.speed;
        layer.sprite.tilePosition.x = -(offset / layer.scale);
      });
    }

    if (state.isWalking && walkTextures.length > 0) {
      state.frameTime += deltaSeconds;
      const frameDuration = 1 / fpsValue;
      if (state.frameTime >= frameDuration) {
        state.frameTime -= frameDuration;
        state.walkFrameIndex = (state.walkFrameIndex + 1) % walkTextures.length;
      }
    } else if (!state.isJumping && !state.isAttacking) {
      state.walkFrameIndex = 0;
      state.frameTime = 0;
    }

    if (!state.isWalking && !state.isJumping && !state.isAttacking && idleTextures.length > 0) {
      state.idleFrameTime += deltaSeconds;
      const idleFrameDuration = 1 / (fpsValue * 0.5);
      if (state.idleFrameTime >= idleFrameDuration) {
        state.idleFrameTime -= idleFrameDuration;
        state.idleFrameIndex = (state.idleFrameIndex + 1) % idleTextures.length;
      }
    }

    if (state.isJumping && jumpTextures.length > 0 && !state.isAttacking) {
      state.jumpFrameTime += deltaSeconds;
      const jumpFrameDuration = 1 / (fpsValue * 0.8);
      if (state.jumpFrameTime >= jumpFrameDuration) {
        state.jumpFrameTime -= jumpFrameDuration;
        if (state.jumpFrameIndex < jumpTextures.length - 1) {
          state.jumpFrameIndex += 1;
        }
      }
    }

    if (state.isAttacking && attackTextures.length > 0) {
      state.attackFrameTime += deltaSeconds;
      const attackFrameDuration = 1 / (fpsValue * 1.2);
      if (state.attackFrameTime >= attackFrameDuration) {
        state.attackFrameTime -= attackFrameDuration;
        state.attackFrameIndex += 1;
        if (state.attackFrameIndex >= attackTextures.length) {
          state.isAttacking = false;
          state.attackFrameIndex = 0;
          state.attackFrameTime = 0;
        }
      }
    }

    let currentTexture: any = null;
    let currentFrame: Frame | null = null;
    if (state.isAttacking && attackTextures.length > 0) {
      const idx = Math.min(state.attackFrameIndex, attackTextures.length - 1);
      currentTexture = attackTextures[idx];
      currentFrame = attackFrameData[idx] || null;
    } else if (state.isJumping && jumpTextures.length > 0) {
      currentTexture = jumpTextures[state.jumpFrameIndex];
      currentFrame = jumpFrameData[state.jumpFrameIndex] || null;
    } else if (state.isWalking && walkTextures.length > 0) {
      currentTexture = walkTextures[state.walkFrameIndex];
      currentFrame = walkFrameData[state.walkFrameIndex] || null;
    } else if (idleTextures.length > 0) {
      currentTexture = idleTextures[state.idleFrameIndex];
      currentFrame = idleFrameData[state.idleFrameIndex] || null;
    } else if (walkTextures.length > 0) {
      currentTexture = walkTextures[0];
      currentFrame = walkFrameData[0] || null;
    }

    if (currentTexture && currentFrame) {
      const referenceFrame = walkFrameData.length > 0 ? walkFrameData[0] : currentFrame;
      const referenceHeight = referenceFrame.contentBounds.height || 1;
      const targetContentHeight = 80;
      const baseScale = targetContentHeight / referenceHeight;
      const isAttack = state.isAttacking && attackTextures.length > 0;
      const scale = baseScale * (isAttack ? 1.35 : 1.0);

      const contentBounds = currentFrame.contentBounds;
      const feetY = contentBounds.y + contentBounds.height;
      const contentCenterX = contentBounds.x + contentBounds.width / 2;

      characterSprite.texture = currentTexture;
      characterSprite.pivot.set(contentCenterX, feetY);
      characterSprite.scale.set(state.direction === "left" ? -scale : scale, scale);

      const bob =
        state.isWalking && !state.isJumping && !state.isAttacking
          ? Math.sin(timeSeconds * 18) * 2
          : 0;

      characterSprite.position.set(state.x, groundY + bob + state.y);

      shadow.clear();
      const shadowScale = Math.max(0.3, 1 + state.y / 100);
      shadow.beginFill(0x000000, 0.4 * shadowScale);
      shadow.drawEllipse(
        state.x,
        groundY + 2,
        (contentBounds.width * scale) / 3 * shadowScale,
        6 * shadowScale,
      );
      shadow.endFill();
    }
  };

  if (attachKeyboard) {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }

  void createDefaultParallax();
  setFrames(frames);
  if (customBackgroundLayers?.layer1Url) {
    setCustomBackgroundLayers(customBackgroundLayers);
  }

  const tickerFn = (delta: number) => {
    const deltaSeconds = ticker?.deltaMS ? ticker.deltaMS / 1000 : delta / 60;
    update(deltaSeconds);
  };

  if (ticker?.add) {
    ticker.add(tickerFn);
  }

  return {
    container,
    update,
    setFrames,
    setCustomBackgroundLayers,
    setFps: (nextFps) => {
      fpsValue = nextFps;
    },
    handleKeyDown,
    handleKeyUp,
    destroy: () => {
      if (attachKeyboard) {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      }
      if (ticker?.remove) {
        ticker.remove(tickerFn);
      }
      container.removeFromParent();
      container.destroy({ children: true });
    },
  };
}
