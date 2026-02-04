import { useState, useEffect, useRef } from 'react';
import { Application, Container, Rectangle } from 'pixi.js';
import { IsometricScene } from '../portfolio/IsometricScene';
import { CasesScene } from '../portfolio/CasesScene';
import { AboutScene } from '../portfolio/AboutScene';
import { CRTFilter } from '../portfolio/CRTFilter';
import { getAssetManager } from '../portfolio/AssetManager';
import { useI18n } from '../i18n';
import './Sup.css';

export default function Sup() {
  const { t, lang, toggleLanguage } = useI18n();
  const [activeSection, setActiveSection] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
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
  const sceneTypeRef = useRef('main');
  const crtFilterRef = useRef(null);
  const crtTickerRef = useRef(null);
  const crtContainerRef = useRef(null);  // Контейнер для CRT фильтра
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
    vignetteIntensity: 0.25,
    brightness: 1.3,
    chromaOffset: 0.8,
  };


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
      sceneRef.current = mainSceneRef.current;
      sceneTypeRef.current = 'main';

      if (enableCrtShader && !crtFilterRef.current) {
        const crtFilter = new CRTFilter({
          curvature: crtDefaults.curvature,
          scanlineIntensity: crtDefaults.scanlineIntensity,
          scanlineCount: crtDefaults.scanlineCount,
          vignetteIntensity: crtDefaults.vignetteIntensity,
          brightness: crtDefaults.brightness,
          chromaOffset: crtDefaults.chromaOffset,
        });
        crtFilter.setResolution(app.screen.width, app.screen.height);
        crtFilterRef.current = crtFilter;

        // Применяем CRT к отдельному контейнеру, чтобы не конфликтовать с stage
        crtContainerRef.current.filters = [crtFilter];

        crtTickerRef.current = () => {
          if (crtFilterRef.current) {
            crtFilterRef.current.time += 0.016;
          }
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
      }
    } else if (activeSection === 'about') {
      if (sceneTypeRef.current !== 'about') {
        pauseOtherScenes('about');

        // Создаём AboutScene только если ещё не существует
        if (!aboutSceneRef.current) {
          aboutSceneRef.current = new AboutScene(
            appRef.current,
            { backgroundColor: 0x000000 },
            sceneRootRef.current,
            assetManager
          );
        } else {
          // Сцена уже есть - просто возобновляем
          aboutSceneRef.current.resume();
        }

        sceneRef.current = aboutSceneRef.current;
        sceneTypeRef.current = 'about';
        setAiStatus(null);
        ensureCrt();
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
      } else if (mainSceneRef.current?.updateSection) {
        mainSceneRef.current.updateSection(activeSection);
      }
    }
  }, [activeSection]);

  // Обновление статусов AI
  useEffect(() => {
    const updateStatus = () => {
      if (sceneRef.current?.getAIStatus) {
        const status = sceneRef.current.getAIStatus();
        setAiStatus(status || null);
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
    // TODO: добавить setLanguage для AboutScene когда будет реализовано
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

  const handleTouchStart = (e) => {
    if (!controllerMode || sceneTypeRef.current !== 'main') return;

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Сохраняем центр джойстика
    joystickCenterRef.current = { x, y };

    // Позиционируем джойстик в месте касания
    setJoystickPos({ x: x - joystickSize / 2, y: y - joystickSize / 2 });
    setJoystickActive(true);
  };

  const handleTouchMove = (e) => {
    if (!joystickActive || !mainSceneRef.current) return;

    const touch = e.touches[0];
    const centerX = joystickCenterRef.current.x;
    const centerY = joystickCenterRef.current.y;
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

    mainSceneRef.current.setKeysPressed?.(keys);
  };

  const handleTouchEnd = () => {
    setJoystickActive(false);
    if (joystickThumbRef.current) {
      joystickThumbRef.current.style.transform = 'translate(0, 0)';
    }
    mainSceneRef.current?.setKeysPressed?.({
      up: false,
      down: false,
      left: false,
      right: false,
    });
  };

  return (
    <div className="sup-game-container">
        {/* ВЕРХНЯЯ ЧАСТЬ - GAME VIEWPORT (16:9) */}
        <div className="sup-viewport">
          <div className={`sup-viewport-inner ${activeSection === 'cases' ? 'is-cases' : ''}`}>
            <canvas ref={canvasRef} className="sup-canvas"></canvas>

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
              </div>
            )}

            {/* Touch area for floating joystick */}
            {isTouchDevice && controllerMode && sceneTypeRef.current === 'main' && (
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
