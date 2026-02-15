import { useState, useEffect, useRef, useCallback } from 'react';
import { Application, Container, Rectangle, Ticker } from 'pixi.js';
import { IsometricScene } from '../portfolio/IsometricScene';
import { CasesScene } from '../portfolio/CasesScene';
import { AboutScene } from '../portfolio/AboutScene';
import { ProjectsScene } from '../portfolio/ProjectsScene';
import { CRTFilter } from '../portfolio/CRTFilter';
import { getAssetManager } from '../portfolio/AssetManager';
import { useI18n } from '../i18n';
import './Sup.css';

export default function Sup() {
  const { t, lang, toggleLanguage } = useI18n();
  const GAME_FPS = 60;
  const [activeSection, setActiveSection] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showCrtControls, setShowCrtControls] = useState(false);
  const [controllerMode, setControllerMode] = useState(false); // true = manual, false = AI
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickThumbRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const sceneRef = useRef(null);
  const mainSceneRef = useRef(null);
  const casesSceneRef = useRef(null);
  const aboutSceneRef = useRef(null);
  const projectsSceneRef = useRef(null);
  const sceneTypeRef = useRef('main');
  const crtFilterRef = useRef(null);
  const crtTickerRef = useRef(null);
  const crtContainerRef = useRef(null);  // Контейнер для CRT фильтра
  const crtBaseRef = useRef(null);
  const transitionRef = useRef({ active: false, t: 0, loopTimer: 0 });
  const transitionSettingsRef = useRef({
    loop: false,
    interval: 2.5,
    duration: 1,
    strength: 0.8,
    brightnessBoost: 1,
    vignetteBoost: 0.25,
    chromaBoost: 0.85,
    scanlineBoost: 0.08,
    flickerBoost: 0.02,
  });
  const sceneRootRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  const assetManagerRef = useRef(null);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState({
    loaded: 0,
    total: 0,
    percent: 0,
    eta: null,
    label: '',
  });
  const loadStartRef = useRef(null);
  const enableCrtShader = true;
  const crtDefaults = {
    curvature: 12.0,
    scanlineIntensity: 0.15,
    scanlineCount: 1200.0,
    scanlineSpeed: 0.5,
    vignetteIntensity: 0.25,
    brightness: 1.3,
    chromaOffset: 0.8,
    flickerSpeed: 8.0,
    flickerIntensity: 0.02,
  };

  const [crtCurvatureEnabled, setCrtCurvatureEnabled] = useState(true);
  const [crtCurvature, setCrtCurvature] = useState(crtDefaults.curvature);
  const [crtScanlinesEnabled, setCrtScanlinesEnabled] = useState(true);
  const [crtScanlineIntensity, setCrtScanlineIntensity] = useState(crtDefaults.scanlineIntensity);
  const [crtScanlineCount, setCrtScanlineCount] = useState(crtDefaults.scanlineCount);
  const [crtScanlineSpeed, setCrtScanlineSpeed] = useState(crtDefaults.scanlineSpeed);
  const [crtVignetteEnabled, setCrtVignetteEnabled] = useState(true);
  const [crtVignetteIntensity, setCrtVignetteIntensity] = useState(crtDefaults.vignetteIntensity);
  const [crtBrightnessEnabled, setCrtBrightnessEnabled] = useState(true);
  const [crtBrightness, setCrtBrightness] = useState(crtDefaults.brightness);
  const [crtChromaEnabled, setCrtChromaEnabled] = useState(true);
  const [crtChromaOffset, setCrtChromaOffset] = useState(crtDefaults.chromaOffset);
  const [crtFlickerEnabled, setCrtFlickerEnabled] = useState(true);
  const [crtFlickerSpeed, setCrtFlickerSpeed] = useState(crtDefaults.flickerSpeed);
  const [crtFlickerIntensity, setCrtFlickerIntensity] = useState(crtDefaults.flickerIntensity);

  const [transitionLoop, setTransitionLoop] = useState(false);
  const [transitionInterval, setTransitionInterval] = useState(2.5);
  const [transitionDuration, setTransitionDuration] = useState(1.5);
  const [transitionStrength, setTransitionStrength] = useState(1);
  const [transitionBrightnessBoost, setTransitionBrightnessBoost] = useState(1);
  const [transitionVignetteBoost, setTransitionVignetteBoost] = useState(1.5);
  const [transitionChromaBoost, setTransitionChromaBoost] = useState(0.85);
  const [transitionScanlineBoost, setTransitionScanlineBoost] = useState(0.08);
  const [transitionFlickerBoost, setTransitionFlickerBoost] = useState(0.02);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const applyCrtSettings = useCallback(() => {
    const filter = crtFilterRef.current;
    if (!filter) return;

    const base = {
      curvature: crtCurvatureEnabled ? crtCurvature : 1000,
      scanlineIntensity: crtScanlinesEnabled ? crtScanlineIntensity : 0,
      scanlineCount: crtScanlineCount,
      scanlineSpeed: crtScanlinesEnabled ? crtScanlineSpeed : 0,
      vignetteIntensity: crtVignetteEnabled ? crtVignetteIntensity : 0,
      brightness: crtBrightnessEnabled ? crtBrightness : 1,
      chromaOffset: crtChromaEnabled ? crtChromaOffset : 0,
      flickerSpeed: crtFlickerEnabled ? crtFlickerSpeed : 0,
      flickerIntensity: crtFlickerEnabled ? crtFlickerIntensity : 0,
      enabled: {
        curvature: crtCurvatureEnabled,
        scanlines: crtScanlinesEnabled,
        vignette: crtVignetteEnabled,
        brightness: crtBrightnessEnabled,
        chroma: crtChromaEnabled,
        flicker: crtFlickerEnabled,
      },
    };

    crtBaseRef.current = base;
    filter.curvature = base.curvature;
    filter.scanlineIntensity = base.scanlineIntensity;
    filter.scanlineCount = base.scanlineCount;
    filter.scanlineSpeed = base.scanlineSpeed;
    filter.vignetteIntensity = base.vignetteIntensity;
    filter.brightness = base.brightness;
    filter.chromaOffset = base.chromaOffset;
    filter.flickerSpeed = base.flickerSpeed;
    filter.flickerIntensity = base.flickerIntensity;
  }, [
    crtCurvatureEnabled,
    crtCurvature,
    crtScanlinesEnabled,
    crtScanlineIntensity,
    crtScanlineCount,
    crtScanlineSpeed,
    crtVignetteEnabled,
    crtVignetteIntensity,
    crtBrightnessEnabled,
    crtBrightness,
    crtChromaEnabled,
    crtChromaOffset,
    crtFlickerEnabled,
    crtFlickerSpeed,
    crtFlickerIntensity,
  ]);

  const triggerTransitionPulse = useCallback(() => {
    const state = transitionRef.current;
    state.active = true;
    state.t = 0;
    state.loopTimer = 0;
  }, []);

  useEffect(() => {
    transitionSettingsRef.current = {
      loop: transitionLoop,
      interval: transitionInterval,
      duration: transitionDuration,
      strength: transitionStrength,
      brightnessBoost: transitionBrightnessBoost,
      vignetteBoost: transitionVignetteBoost,
      chromaBoost: transitionChromaBoost,
      scanlineBoost: transitionScanlineBoost,
      flickerBoost: transitionFlickerBoost,
    };
  }, [
    transitionLoop,
    transitionInterval,
    transitionDuration,
    transitionStrength,
    transitionBrightnessBoost,
    transitionVignetteBoost,
    transitionChromaBoost,
    transitionScanlineBoost,
    transitionFlickerBoost,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const debugFlag = url.searchParams.has('debug') || url.hash.includes('debug');
    setShowCrtControls(debugFlag);
  }, []);


  useEffect(() => {
    // Инициализация Pixi.js
    const initPixi = async () => {
      if (!canvasRef.current || appRef.current) return;

      const app = new Application();
      await app.init({
        canvas: canvasRef.current,
        resizeTo: canvasRef.current.parentElement,
        backgroundColor: 0x1a1a2e,
        antialias: true,
      });

      appRef.current = app;

      const gameTicker = new Ticker();
      gameTicker.maxFPS = GAME_FPS;
      gameTicker.start();
      appRef.current.gameTicker = gameTicker;

      crtContainerRef.current = new Container();
      crtContainerRef.current.filterArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
      app.stage.addChild(crtContainerRef.current);

      sceneRootRef.current = new Container();
      crtContainerRef.current.addChild(sceneRootRef.current);

      // Инициализируем AssetManager и загружаем все ассеты
      const assetManager = getAssetManager();
      assetManagerRef.current = assetManager;

      try {
        loadStartRef.current = performance.now();
        await assetManager.loadAll((info) => {
          if (!loadStartRef.current) {
            loadStartRef.current = performance.now();
          }
          const now = performance.now();
          const loaded = info?.loaded ?? 0;
          const total = info?.total ?? 0;
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
          const elapsed = (now - loadStartRef.current) / 1000;
          const avg = loaded > 0 ? elapsed / loaded : 0;
          const eta = loaded > 0 && total > 0 ? Math.max(0, Math.ceil(avg * (total - loaded))) : null;
          const rawLabel = info?.alias || (info?.src ? info.src.split('/').pop() : '');
          const label = info?.bundle ? `${info.bundle} / ${rawLabel}` : rawLabel;

          setLoadProgress({
            loaded,
            total,
            percent,
            eta,
            label,
          });
        });
        setAssetsLoaded(true);
      } catch (error) {
        console.error('Failed to load assets:', error);
        return;
      }

      // Создаем изометрическую сцену с предзагруженными ассетами
      mainSceneRef.current = new IsometricScene(app, sceneRootRef.current, assetManager);
      mainSceneRef.current.setLanguage(lang);
      sceneRef.current = mainSceneRef.current;
      sceneTypeRef.current = 'main';

      if (enableCrtShader && !crtFilterRef.current) {
        const crtFilter = new CRTFilter({
          curvature: crtDefaults.curvature,
          scanlineIntensity: crtDefaults.scanlineIntensity,
          scanlineCount: crtDefaults.scanlineCount,
          scanlineSpeed: crtDefaults.scanlineSpeed,
          vignetteIntensity: crtDefaults.vignetteIntensity,
          brightness: crtDefaults.brightness,
          chromaOffset: crtDefaults.chromaOffset,
          flickerSpeed: crtDefaults.flickerSpeed,
          flickerIntensity: crtDefaults.flickerIntensity,
        });
        crtFilter.setResolution(app.screen.width, app.screen.height);
        crtFilterRef.current = crtFilter;
        applyCrtSettings();

        // Применяем CRT к отдельному контейнеру, чтобы не конфликтовать с stage
        crtContainerRef.current.filters = [crtFilter];

        crtTickerRef.current = () => {
          const filter = crtFilterRef.current;
          if (!filter) return;

          const dt = app.ticker.deltaMS / 1000;
          filter.time += dt;

          const base = crtBaseRef.current;
          const settings = transitionSettingsRef.current;
          if (!base || !settings) return;

          const state = transitionRef.current;
          if (settings.loop) {
            const interval = Math.max(0.1, settings.interval);
            state.loopTimer += dt;
            if (state.loopTimer >= interval) {
              state.loopTimer = 0;
              state.active = true;
              state.t = 0;
            }
          }

          let pulse = 0;
          if (state.active) {
            const duration = Math.max(0.05, settings.duration);
            state.t += dt;
            const progress = clamp(state.t / duration, 0, 1);
            const decay = 1 - progress;
            pulse = decay * decay;
            if (progress >= 1) {
              state.active = false;
            }
          }

          const amount = pulse * (settings.strength ?? 1);
          const enabled = base.enabled || {};

          const brightness = enabled.brightness
            ? clamp(base.brightness + settings.brightnessBoost * amount, 0.2, 4)
            : base.brightness;
          const vignetteIntensity = enabled.vignette
            ? clamp(base.vignetteIntensity + settings.vignetteBoost * amount, 0, 2.5)
            : base.vignetteIntensity;
          const chromaOffset = enabled.chroma
            ? clamp(base.chromaOffset + settings.chromaBoost * amount, 0, 3)
            : base.chromaOffset;
          const scanlineIntensity = enabled.scanlines
            ? clamp(base.scanlineIntensity + settings.scanlineBoost * amount, 0, 0.6)
            : base.scanlineIntensity;
          const flickerIntensity = enabled.flicker
            ? clamp(base.flickerIntensity + settings.flickerBoost * amount, 0, 0.2)
            : base.flickerIntensity;

          filter.brightness = brightness;
          filter.vignetteIntensity = vignetteIntensity;
          filter.chromaOffset = chromaOffset;
          filter.scanlineIntensity = scanlineIntensity;
          filter.flickerIntensity = flickerIntensity;
        };
        app.ticker.add(crtTickerRef.current);
      }

      resizeHandlerRef.current = () => {
        if (crtFilterRef.current) {
          crtFilterRef.current.setResolution(app.screen.width, app.screen.height);
        }
        // Обновляем filterArea при ресайзе
        if (crtContainerRef.current) {
          crtContainerRef.current.filterArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
        }
      };
      app.renderer.on('resize', resizeHandlerRef.current);
    };

    initPixi();

    return () => {
      if (mainSceneRef.current) {
        mainSceneRef.current.destroy();
      }
      if (casesSceneRef.current) {
        casesSceneRef.current.destroy();
      }
      if (aboutSceneRef.current) {
        aboutSceneRef.current.destroy();
      }
      if (appRef.current) {
        if (appRef.current.gameTicker) {
          appRef.current.gameTicker.stop();
          appRef.current.gameTicker.destroy();
          appRef.current.gameTicker = null;
        }
        if (crtTickerRef.current) {
          appRef.current.ticker.remove(crtTickerRef.current);
          crtTickerRef.current = null;
        }
        if (resizeHandlerRef.current) {
          appRef.current.renderer.off('resize', resizeHandlerRef.current);
          resizeHandlerRef.current = null;
        }
        if (crtFilterRef.current) {
          if (crtContainerRef.current) {
            crtContainerRef.current.filters = [];
          }
          crtFilterRef.current.destroy();
          crtFilterRef.current = null;
        }
        if (crtContainerRef.current) {
          appRef.current.stage.removeChild(crtContainerRef.current);
          crtContainerRef.current.destroy({ children: true });
          crtContainerRef.current = null;
          sceneRootRef.current = null;
        }
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);


  useEffect(() => {
    applyCrtSettings();
  }, [applyCrtSettings]);

  // Обновление сцены при смене секции
  useEffect(() => {
    if (!appRef.current || !assetManagerRef.current) return;

    const assetManager = assetManagerRef.current;
    const ensureCrt = () => {
      if (!enableCrtShader) return;
      if (crtContainerRef.current && crtFilterRef.current) {
        crtContainerRef.current.filters = [crtFilterRef.current];
      }
    };

    // Функция для паузы всех сцен кроме указанной (Hide/Show паттерн)
    const pauseOtherScenes = (keepScene) => {
      if (keepScene !== 'main' && mainSceneRef.current) {
        mainSceneRef.current.pause();
      }
      if (keepScene !== 'cases' && casesSceneRef.current) {
        casesSceneRef.current.pause();
      }
      if (keepScene !== 'about' && aboutSceneRef.current) {
        aboutSceneRef.current.pause();
      }
      if (keepScene !== 'projects' && projectsSceneRef.current) {
        projectsSceneRef.current.pause();
      }
    };

    if (activeSection === 'cases') {
      if (sceneTypeRef.current !== 'cases') {
        pauseOtherScenes('cases');

        // Создаём CasesScene только если ещё не существует
        if (!casesSceneRef.current) {
          casesSceneRef.current = new CasesScene(
            appRef.current,
            {
              tileGap: 0,
              tileOverlap: 20,
              backgroundColor: 0x000000,
              debugMode: false,
              lang: lang,
            },
            sceneRootRef.current,
            assetManager
          );
        } else {
          // Сцена уже есть - обновляем язык и возобновляем
          casesSceneRef.current.setLanguage(lang);
          casesSceneRef.current.resume();
        }

        sceneRef.current = casesSceneRef.current;
        sceneTypeRef.current = 'cases';
        setAiStatus(null);
        setActiveCaseIndex(0);
        ensureCrt();
        triggerTransitionPulse();
      }
    } else if (activeSection === 'about') {
      if (sceneTypeRef.current !== 'about') {
        pauseOtherScenes('about');

        // Создаём AboutScene только если ещё не существует
        if (!aboutSceneRef.current) {
          aboutSceneRef.current = new AboutScene(
            appRef.current,
            { backgroundColor: 0x000000, lang: lang },
            sceneRootRef.current,
            assetManager
          );
        } else {
          aboutSceneRef.current.setLanguage(lang);
          aboutSceneRef.current.resume();
        }

        sceneRef.current = aboutSceneRef.current;
        sceneTypeRef.current = 'about';
        setAiStatus(null);
        ensureCrt();
        triggerTransitionPulse();
      }
    } else if (activeSection === 'projects') {
      if (sceneTypeRef.current !== 'projects') {
        pauseOtherScenes('projects');

        if (!projectsSceneRef.current) {
          projectsSceneRef.current = new ProjectsScene(
            appRef.current,
            {
              tileGap: 0,
              tileOverlap: 20,
              backgroundColor: 0x000000,
              debugMode: false,
              lang: lang,
            },
            sceneRootRef.current,
            assetManager
          );
        } else {
          projectsSceneRef.current.setLanguage(lang);
          projectsSceneRef.current.resume();
        }

        sceneRef.current = projectsSceneRef.current;
        sceneTypeRef.current = 'projects';
        setAiStatus(null);
        setActiveCaseIndex(0);
        ensureCrt();
        triggerTransitionPulse();
      }
    } else {
      if (sceneTypeRef.current !== 'main') {
        pauseOtherScenes('main');

        // Создаём IsometricScene только если ещё не существует
        if (!mainSceneRef.current) {
          mainSceneRef.current = new IsometricScene(
            appRef.current,
            sceneRootRef.current,
            assetManager
          );
          mainSceneRef.current.setLanguage(lang);

          // Синхронизируем режим управления с React state (только при создании)
          if (mainSceneRef.current.getControllerMode() !== controllerMode) {
            mainSceneRef.current.setControllerMode(controllerMode);
          }
        } else {
          // Сцена уже есть - просто возобновляем
          mainSceneRef.current.resume();
        }

        sceneRef.current = mainSceneRef.current;
        sceneTypeRef.current = 'main';
        if (activeSection && mainSceneRef.current?.updateSection) {
          mainSceneRef.current.updateSection(activeSection);
        }
        ensureCrt();
        triggerTransitionPulse();
      } else if (mainSceneRef.current?.updateSection) {
        mainSceneRef.current.updateSection(activeSection);
      }
    }
  }, [activeSection, triggerTransitionPulse]);

  // Обновление статусов AI и debug info
  useEffect(() => {
    const updateStatus = () => {
      if (sceneRef.current?.getAIStatus) {
        const status = sceneRef.current.getAIStatus();
        setAiStatus(status || null);
      }
      // Обновляем debug info (FPS, время)
      if (sceneRef.current?.getDebugInfo) {
        const info = sceneRef.current.getDebugInfo();
        setDebugInfo(info || null);
      }
    };

    // Обновляем статусы каждые 500ms
    const interval = setInterval(updateStatus, 500);

    return () => clearInterval(interval);
  }, []);

  // Определение touch устройства
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Обновление языка в сценах при смене
  useEffect(() => {
    if (casesSceneRef.current?.setLanguage) {
      casesSceneRef.current.setLanguage(lang);
    }
    if (mainSceneRef.current?.setLanguage) {
      mainSceneRef.current.setLanguage(lang);
    }
    if (aboutSceneRef.current) {
      aboutSceneRef.current.setLanguage(lang);
    }
  }, [lang]);

  // Переключение режима управления
  const handleControllerModeToggle = () => {
    const newMode = !controllerMode;
    setControllerMode(newMode);
    if (mainSceneRef.current?.setControllerMode) {
      mainSceneRef.current.setControllerMode(newMode);
    }
  };

  // Обработчики виртуального джойстика (floating - появляется в месте касания)
  const joystickSize = 120;
  const joystickCenterRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef(null); // Для определения тап vs свайп в cases

  const handleTouchStart = (e) => {
    // В main сцене — только в ручном режиме, в cases — всегда
    const isMain = sceneTypeRef.current === 'main';
    const isCases = sceneTypeRef.current === 'cases';
    const isProjects = sceneTypeRef.current === 'projects';
    if (isMain && !controllerMode) return;
    if (!isMain && !isCases && !isProjects) return;

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Сохраняем центр джойстика
    joystickCenterRef.current = { x, y };

    if (isCases || isProjects) {
      // Cases/Projects: не активируем джойстик сразу — ждём свайп, чтобы тапы проходили в Pixi
      touchStartRef.current = { x, y, moved: false };
    } else {
      // Main: сразу активируем джойстик
      setJoystickPos({ x: x - joystickSize / 2, y: y - joystickSize / 2 });
      setJoystickActive(true);
    }
  };

  const TOUCH_DRAG_THRESHOLD = 12; // px — порог для отличия тапа от свайпа

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const centerX = joystickCenterRef.current.x;
    const centerY = joystickCenterRef.current.y;

    // Cases: определяем, свайп это или тап
    if (touchStartRef.current && !touchStartRef.current.moved) {
      const moveDist = Math.sqrt(
        (touch.clientX - touchStartRef.current.x) ** 2 +
        (touch.clientY - touchStartRef.current.y) ** 2
      );
      if (moveDist < TOUCH_DRAG_THRESHOLD) return; // Ещё не свайп
      // Порог пройден — активируем джойстик
      touchStartRef.current.moved = true;
      setJoystickPos({ x: centerX - joystickSize / 2, y: centerY - joystickSize / 2 });
      setJoystickActive(true);
    }

    if (!joystickActive && !(touchStartRef.current?.moved)) return;

    const maxRadius = joystickSize / 2 - 20;

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;

    // Ограничиваем радиус
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    // Обновляем визуальное положение thumb
    if (joystickThumbRef.current) {
      joystickThumbRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    // Определяем направления (с deadzone) - 8 направлений
    const deadzone = 0.25;
    const normalizedX = dx / maxRadius;
    const normalizedY = dy / maxRadius;

    // Независимая проверка каждой оси для поддержки диагоналей
    const keys = {
      up: normalizedY < -deadzone,
      down: normalizedY > deadzone,
      left: normalizedX < -deadzone,
      right: normalizedX > deadzone,
    };

    // Отправляем в активную сцену
    if (sceneTypeRef.current === 'cases') {
      casesSceneRef.current?.setKeysPressed?.(keys);
    } else if (sceneTypeRef.current === 'projects') {
      projectsSceneRef.current?.setKeysPressed?.(keys);
    } else {
      mainSceneRef.current?.setKeysPressed?.(keys);
    }
  };

  const handleTouchEnd = (e) => {
    // Cases: если палец подняли без свайпа — это тап, пробрасываем в canvas (Pixi)
    if (touchStartRef.current && !touchStartRef.current.moved) {
      const { x, y } = touchStartRef.current;
      touchStartRef.current = null;
      // Форвардим тап в canvas для Pixi-кнопок (навигация слайдов)
      const canvas = canvasRef.current;
      if (canvas) {
        const pointerDown = new PointerEvent('pointerdown', {
          clientX: x, clientY: y,
          pointerId: 1, pointerType: 'touch',
          bubbles: true, cancelable: true,
          screenX: x, screenY: y,
        });
        const pointerUp = new PointerEvent('pointerup', {
          clientX: x, clientY: y,
          pointerId: 1, pointerType: 'touch',
          bubbles: true, cancelable: true,
          screenX: x, screenY: y,
        });
        canvas.dispatchEvent(pointerDown);
        canvas.dispatchEvent(pointerUp);
      }
      return;
    }

    touchStartRef.current = null;
    setJoystickActive(false);
    if (joystickThumbRef.current) {
      joystickThumbRef.current.style.transform = 'translate(0, 0)';
    }
    const resetKeys = { up: false, down: false, left: false, right: false };
    if (sceneTypeRef.current === 'cases') {
      casesSceneRef.current?.setKeysPressed?.(resetKeys);
    } else if (sceneTypeRef.current === 'projects') {
      projectsSceneRef.current?.setKeysPressed?.(resetKeys);
    } else {
      mainSceneRef.current?.setKeysPressed?.(resetKeys);
    }
  };

  return (
    <div className="sup-game-container">
        {/* ВЕРХНЯЯ ЧАСТЬ - GAME VIEWPORT (16:9) */}
        <div className="sup-viewport">
          <div className={`sup-viewport-inner ${activeSection === 'cases' || activeSection === 'projects' ? 'is-cases' : ''}`}>
            <canvas ref={canvasRef} className="sup-canvas"></canvas>

            {/* DEBUG OVERLAY - FPS (only in debug mode) */}
            {showCrtControls && debugInfo && assetsLoaded && (
              <div className="sup-debug-overlay">
                <div className="sup-debug-fps" style={{
                  color: debugInfo.fps?.avg >= 55 ? '#0f0' : debugInfo.fps?.avg >= 30 ? '#ff0' : '#f00'
                }}>
                  FPS: {debugInfo.fps?.current} | AVG: {debugInfo.fps?.avg} | MIN: {debugInfo.fps?.min} | MAX: {debugInfo.fps?.max}
                </div>
              </div>
            )}

            {!assetsLoaded && (
              <div className="sup-loader">
                <div className="sup-loader-panel">
                  <div className="sup-loader-title">{t.loading.title}</div>
                  <div className="sup-loader-bar">
                    <span
                      className="sup-loader-bar-fill"
                      style={{ width: `${loadProgress.percent}%` }}
                    ></span>
                  </div>
                  <div className="sup-loader-meta">
                    <span>{loadProgress.loaded}/{loadProgress.total}</span>
                    <span>{loadProgress.percent}%</span>
                    <span>{loadProgress.eta !== null ? `~${loadProgress.eta}s` : '...'}</span>
                  </div>
                  {loadProgress.label && (
                    <div className="sup-loader-current">{loadProgress.label}</div>
                  )}
                </div>
              </div>
            )}

            {/* OVERLAY - AI STATUS */}
            {aiStatus && sceneTypeRef.current === 'main' && (
              <div className="sup-genesis-hud">
                {[
                  { key: 'energy', label: t.hud.energy, value: aiStatus.needs.energy },
                  { key: 'hunger', label: t.hud.hunger, value: aiStatus.needs.hunger },
                  { key: 'fun', label: t.hud.fun, value: aiStatus.needs.fun },
                  { key: 'social', label: t.hud.social, value: aiStatus.needs.social },
                ].map(({ key, label, value }) => (
                  <div key={key} className={`sup-sega-stat is-${key}`}>
                    <span className="sup-sega-label">{label}</span>
                    <div className="sup-sega-bar">
                      {[...Array(10)].map((_, i) => (
                        <span
                          key={i}
                          className={`sup-sega-cell ${i < Math.round(value / 10) ? 'is-filled' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* SEGA-STYLE DAY TIMER */}
                {debugInfo?.time && (
                  <div className="sup-sega-timer">
                    <div className="sup-sega-timer-row">
                      <span className="sup-sega-timer-label">DAY</span>
                      <span className="sup-sega-timer-value">{String(debugInfo.time.day).padStart(2, '0')}</span>
                    </div>
                    <div className="sup-sega-timer-row">
                      <span className="sup-sega-timer-label">TIME</span>
                      <span className="sup-sega-timer-value">
                        {String(debugInfo.time.hour).padStart(2, '0')}
                        <span style={{ fontFamily: 'Arial, sans-serif' }}>:</span>
                        {String(debugInfo.time.minute).padStart(2, '0')}
                      </span>
                    </div>
                    <div className={`sup-sega-timer-period is-${debugInfo.time.timeOfDay}`}>
                      {debugInfo.time.timeOfDayName}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Touch area for floating joystick */}
            {isTouchDevice && ((controllerMode && sceneTypeRef.current === 'main') || sceneTypeRef.current === 'cases' || sceneTypeRef.current === 'projects') && (
              <div
                className="sup-touch-area"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              />
            )}

            {/* Floating Virtual Joystick - appears at touch position */}
            {joystickActive && (
              <div
                className="sup-joystick is-active"
                style={{ left: joystickPos.x, top: joystickPos.y }}
              >
                <div className="sup-joystick-base">
                  <div ref={joystickThumbRef} className="sup-joystick-thumb"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* НИЖНЯЯ ЧАСТЬ - GAME UI / CONTROL PANEL */}
        <div className="sup-control-panel">
          {activeSection === 'cases' ? (
            <div className="sup-cases-panel">
              <div className="sup-cases-controls">
                <div className="sup-cases-nav">
                  <button
                    className="sup-cases-button"
                    onClick={() => {
                      const nextIndex = Math.max(0, activeCaseIndex - 1);
                      setActiveCaseIndex(nextIndex);
                      casesSceneRef.current?.setActiveTile?.(nextIndex);
                    }}
                  >
                    ←
                  </button>
                  <button
                    className="sup-cases-button"
                    onClick={() => {
                      const total = casesSceneRef.current?.tileCount ?? 1;
                      const nextIndex = Math.min(total - 1, activeCaseIndex + 1);
                      setActiveCaseIndex(nextIndex);
                      casesSceneRef.current?.setActiveTile?.(nextIndex);
                    }}
                  >
                    →
                  </button>
                </div>
                <button
                  className="sup-cases-button is-back"
                  onClick={() => setActiveSection(null)}
                >
                  {t.controls.backToScene}
                </button>
              </div>

            </div>
          ) : activeSection === 'projects' ? (
            <div className="sup-cases-panel">
              <div className="sup-cases-controls">
                <div className="sup-cases-nav">
                  <button
                    className="sup-cases-button"
                    onClick={() => {
                      const nextIndex = Math.max(0, activeCaseIndex - 1);
                      setActiveCaseIndex(nextIndex);
                      projectsSceneRef.current?.setActiveTile?.(nextIndex);
                    }}
                  >
                    ←
                  </button>
                  <button
                    className="sup-cases-button"
                    onClick={() => {
                      const total = projectsSceneRef.current?.tileCount ?? 1;
                      const nextIndex = Math.min(total - 1, activeCaseIndex + 1);
                      setActiveCaseIndex(nextIndex);
                      projectsSceneRef.current?.setActiveTile?.(nextIndex);
                    }}
                  >
                    →
                  </button>
                </div>
                <button
                  className="sup-cases-button is-back"
                  onClick={() => setActiveSection(null)}
                >
                  {t.controls.backToScene}
                </button>
              </div>
            </div>
          ) : activeSection === 'about' ? (
            <div className="sup-about-panel">
              <div className="sup-about-controls">
                <button
                  className="sup-cases-button is-back"
                  onClick={() => setActiveSection(null)}
                >
                  {t.controls.backToScene}
                </button>
              </div>
            </div>
          ) : (
            <div className="sup-main-nav">
              {/* Переключатель языка */}
              <div className="sup-lang-toggle sup-toggle-row">
                <button
                  className={`sup-toggle-switch ${lang === 'ru' ? 'is-on' : ''}`}
                  onClick={toggleLanguage}
                  aria-label="Toggle language"
                >
                  <span className="sup-toggle-thumb"></span>
                </button>
                <span className="sup-toggle-value">{lang === 'ru' ? 'RU' : 'EN'}</span>
              </div>

              {/* Mode Toggle */}
              <div className="sup-mode-toggle sup-toggle-row">
                <button
                  className={`sup-toggle-switch ${controllerMode ? 'is-on' : ''}`}
                  onClick={handleControllerModeToggle}
                  aria-label="Toggle control mode"
                >
                  <span className="sup-toggle-thumb"></span>
                </button>
                <span className="sup-toggle-value">
                  {controllerMode ? t.controls.manual : t.controls.ai}
                </span>
              </div>

              {showCrtControls && (
                <div className="sup-crt-controls">
                <div className="sup-crt-title">CRT FX</div>
                <div className="sup-crt-grid">
                  <div className="sup-crt-group">
                    <div className="sup-crt-group-header">
                      <label className="sup-crt-toggle">
                        <input
                          className="sup-crt-check"
                          type="checkbox"
                          checked={crtCurvatureEnabled}
                          onChange={(e) => setCrtCurvatureEnabled(e.target.checked)}
                        />
                        <span>Curvature</span>
                      </label>
                      <span className="sup-crt-value">{crtCurvature.toFixed(1)}</span>
                    </div>
                    <input
                      className="sup-crt-slider"
                      type="range"
                      min="2"
                      max="30"
                      step="0.5"
                      value={crtCurvature}
                      onChange={(e) => setCrtCurvature(Number(e.target.value))}
                      disabled={!crtCurvatureEnabled}
                    />
                  </div>

                  <div className="sup-crt-group">
                    <div className="sup-crt-group-header">
                      <label className="sup-crt-toggle">
                        <input
                          className="sup-crt-check"
                          type="checkbox"
                          checked={crtScanlinesEnabled}
                          onChange={(e) => setCrtScanlinesEnabled(e.target.checked)}
                        />
                        <span>Scanlines</span>
                      </label>
                    </div>
                    <div className="sup-crt-slider-row">
                      <span className="sup-crt-label">Intensity</span>
                      <span className="sup-crt-value">{crtScanlineIntensity.toFixed(3)}</span>
                    </div>
                    <input
                      className="sup-crt-slider"
                      type="range"
                      min="0"
                      max="0.3"
                      step="0.005"
                      value={crtScanlineIntensity}
                      onChange={(e) => setCrtScanlineIntensity(Number(e.target.value))}
                      disabled={!crtScanlinesEnabled}
                    />
                    <div className="sup-crt-slider-row">
                      <span className="sup-crt-label">Count</span>
                      <span className="sup-crt-value">{Math.round(crtScanlineCount)}</span>
                    </div>
                    <input
                      className="sup-crt-slider"
                      type="range"
                      min="200"
                      max="2000"
                      step="50"
                      value={crtScanlineCount}
                      onChange={(e) => setCrtScanlineCount(Number(e.target.value))}
                      disabled={!crtScanlinesEnabled}
                    />
                    <div className="sup-crt-slider-row">
                      <span className="sup-crt-label">Speed</span>
                      <span className="sup-crt-value">{crtScanlineSpeed.toFixed(2)}</span>
                    </div>
                    <input
                      className="sup-crt-slider"
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={crtScanlineSpeed}
                      onChange={(e) => setCrtScanlineSpeed(Number(e.target.value))}
                      disabled={!crtScanlinesEnabled}
                    />
                  </div>

                  <div className="sup-crt-group">
                    <div className="sup-crt-group-header">
                      <label className="sup-crt-toggle">
                        <input
                          className="sup-crt-check"
                          type="checkbox"
                          checked={crtVignetteEnabled}
                          onChange={(e) => setCrtVignetteEnabled(e.target.checked)}
                        />
                        <span>Vignette</span>
                      </label>
                      <span className="sup-crt-value">{crtVignetteIntensity.toFixed(2)}</span>
                    </div>
                    <input
                      className="sup-crt-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={crtVignetteIntensity}
                      onChange={(e) => setCrtVignetteIntensity(Number(e.target.value))}
                      disabled={!crtVignetteEnabled}
                    />
                  </div>

                  <div className="sup-crt-group">
                    <div className="sup-crt-group-header">
                      <label className="sup-crt-toggle">
                        <input
                          className="sup-crt-check"
                          type="checkbox"
                          checked={crtBrightnessEnabled}
                          onChange={(e) => setCrtBrightnessEnabled(e.target.checked)}
                        />
                        <span>Brightness</span>
                      </label>
                      <span className="sup-crt-value">{crtBrightness.toFixed(2)}</span>
                    </div>
                    <input
                      className="sup-crt-slider"
                      type="range"
                      min="0.6"
                      max="1.8"
                      step="0.02"
                      value={crtBrightness}
                      onChange={(e) => setCrtBrightness(Number(e.target.value))}
                      disabled={!crtBrightnessEnabled}
                    />
                  </div>

                  <div className="sup-crt-group">
                    <div className="sup-crt-group-header">
                      <label className="sup-crt-toggle">
                        <input
                          className="sup-crt-check"
                          type="checkbox"
                          checked={crtChromaEnabled}
                          onChange={(e) => setCrtChromaEnabled(e.target.checked)}
                        />
                        <span>Chroma</span>
                      </label>
                      <span className="sup-crt-value">{crtChromaOffset.toFixed(2)}</span>
                    </div>
                    <input
                      className="sup-crt-slider"
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={crtChromaOffset}
                      onChange={(e) => setCrtChromaOffset(Number(e.target.value))}
                      disabled={!crtChromaEnabled}
                    />
                  </div>

                  <div className="sup-crt-group">
                    <div className="sup-crt-group-header">
                      <label className="sup-crt-toggle">
                        <input
                          className="sup-crt-check"
                          type="checkbox"
                          checked={crtFlickerEnabled}
                          onChange={(e) => setCrtFlickerEnabled(e.target.checked)}
                        />
                        <span>Flicker</span>
                      </label>
                    </div>
                    <div className="sup-crt-slider-row">
                      <span className="sup-crt-label">Intensity</span>
                      <span className="sup-crt-value">{crtFlickerIntensity.toFixed(3)}</span>
                    </div>
                    <input
                      className="sup-crt-slider"
                      type="range"
                      min="0"
                      max="0.08"
                      step="0.001"
                      value={crtFlickerIntensity}
                      onChange={(e) => setCrtFlickerIntensity(Number(e.target.value))}
                      disabled={!crtFlickerEnabled}
                    />
                    <div className="sup-crt-slider-row">
                      <span className="sup-crt-label">Speed</span>
                      <span className="sup-crt-value">{crtFlickerSpeed.toFixed(2)}</span>
                    </div>
                    <input
                      className="sup-crt-slider"
                      type="range"
                      min="0"
                      max="12"
                      step="0.1"
                      value={crtFlickerSpeed}
                      onChange={(e) => setCrtFlickerSpeed(Number(e.target.value))}
                      disabled={!crtFlickerEnabled}
                    />
                  </div>
                </div>

                <div className="sup-crt-divider"></div>

                <div className="sup-crt-transition">
                  <div className="sup-crt-transition-header">
                    <div className="sup-crt-title">Transition Test</div>
                    <div className="sup-crt-transition-actions">
                      <label className="sup-crt-toggle sup-crt-toggle-inline">
                        <input
                          className="sup-crt-check"
                          type="checkbox"
                          checked={transitionLoop}
                          onChange={(e) => setTransitionLoop(e.target.checked)}
                        />
                        <span>Loop</span>
                      </label>
                      <button
                        type="button"
                        className="sup-crt-button"
                        onClick={triggerTransitionPulse}
                      >
                        Pulse
                      </button>
                    </div>
                  </div>

                  <div className="sup-crt-grid">
                    <div className="sup-crt-group">
                      <div className="sup-crt-group-header">
                        <span className="sup-crt-label">Interval (s)</span>
                        <span className="sup-crt-value">{transitionInterval.toFixed(2)}</span>
                      </div>
                      <input
                        className="sup-crt-slider"
                        type="range"
                        min="0.3"
                        max="8"
                        step="0.1"
                        value={transitionInterval}
                        onChange={(e) => setTransitionInterval(Number(e.target.value))}
                      />
                    </div>

                    <div className="sup-crt-group">
                      <div className="sup-crt-group-header">
                        <span className="sup-crt-label">Duration (s)</span>
                        <span className="sup-crt-value">{transitionDuration.toFixed(2)}</span>
                      </div>
                      <input
                        className="sup-crt-slider"
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.05"
                        value={transitionDuration}
                        onChange={(e) => setTransitionDuration(Number(e.target.value))}
                      />
                    </div>

                    <div className="sup-crt-group">
                      <div className="sup-crt-group-header">
                        <span className="sup-crt-label">Strength</span>
                        <span className="sup-crt-value">{transitionStrength.toFixed(2)}</span>
                      </div>
                      <input
                        className="sup-crt-slider"
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={transitionStrength}
                        onChange={(e) => setTransitionStrength(Number(e.target.value))}
                      />
                    </div>

                    <div className="sup-crt-group">
                      <div className="sup-crt-group-header">
                        <span className="sup-crt-label">Brightness Boost</span>
                        <span className="sup-crt-value">{transitionBrightnessBoost.toFixed(2)}</span>
                      </div>
                      <input
                        className="sup-crt-slider"
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={transitionBrightnessBoost}
                        onChange={(e) => setTransitionBrightnessBoost(Number(e.target.value))}
                      />
                    </div>

                    <div className="sup-crt-group">
                      <div className="sup-crt-group-header">
                        <span className="sup-crt-label">Vignette Boost</span>
                        <span className="sup-crt-value">{transitionVignetteBoost.toFixed(2)}</span>
                      </div>
                      <input
                        className="sup-crt-slider"
                        type="range"
                        min="0"
                        max="2"
                        step="0.02"
                        value={transitionVignetteBoost}
                        onChange={(e) => setTransitionVignetteBoost(Number(e.target.value))}
                      />
                    </div>

                    <div className="sup-crt-group">
                      <div className="sup-crt-group-header">
                        <span className="sup-crt-label">Chroma Boost</span>
                        <span className="sup-crt-value">{transitionChromaBoost.toFixed(2)}</span>
                      </div>
                      <input
                        className="sup-crt-slider"
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={transitionChromaBoost}
                        onChange={(e) => setTransitionChromaBoost(Number(e.target.value))}
                      />
                    </div>

                    <div className="sup-crt-group">
                      <div className="sup-crt-group-header">
                        <span className="sup-crt-label">Scanline Boost</span>
                        <span className="sup-crt-value">{transitionScanlineBoost.toFixed(3)}</span>
                      </div>
                      <input
                        className="sup-crt-slider"
                        type="range"
                        min="0"
                        max="0.3"
                        step="0.005"
                        value={transitionScanlineBoost}
                        onChange={(e) => setTransitionScanlineBoost(Number(e.target.value))}
                      />
                    </div>

                    <div className="sup-crt-group">
                      <div className="sup-crt-group-header">
                        <span className="sup-crt-label">Flicker Boost</span>
                        <span className="sup-crt-value">{transitionFlickerBoost.toFixed(3)}</span>
                      </div>
                      <input
                        className="sup-crt-slider"
                        type="range"
                        min="0"
                        max="0.08"
                        step="0.002"
                        value={transitionFlickerBoost}
                        onChange={(e) => setTransitionFlickerBoost(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              )}

              <div className="sup-menu">
                <button
                  className={`sup-menu-item ${activeSection === 'about' ? 'active' : ''}`}
                  onClick={() => setActiveSection('about')}
                >
                  <div className="sup-menu-content">
                    <h3>{t.menu.about}</h3>
                    <p>{t.menu.aboutDesc}</p>
                  </div>
                  <span className="sup-menu-arrow">→</span>
                </button>

                <button
                  className={`sup-menu-item ${activeSection === 'cases' ? 'active' : ''}`}
                  onClick={() => setActiveSection('cases')}
                >
                  <div className="sup-menu-content">
                    <h3>{t.menu.cases}</h3>
                    <p>{t.menu.casesDesc}</p>
                  </div>
                  <span className="sup-menu-arrow">→</span>
                </button>

                <button
                  className={`sup-menu-item ${activeSection === 'projects' ? 'active' : ''}`}
                  onClick={() => setActiveSection('projects')}
                >
                  <div className="sup-menu-content">
                    <h3>{t.menu.projects}</h3>
                    <p>{t.menu.projectsDesc}</p>
                  </div>
                  <span className="sup-menu-arrow">→</span>
                </button>

                <button
                  className={`sup-menu-item ${activeSection === 'old-portfolio' ? 'active' : ''}`}
                  onClick={() => setActiveSection('old-portfolio')}
                >
                  <div className="sup-menu-content">
                    <h3>{t.menu.old}</h3>
                    <p>{t.menu.oldDesc}</p>
                  </div>
                  <span className="sup-menu-arrow">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
