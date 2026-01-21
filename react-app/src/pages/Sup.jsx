import { useState, useEffect, useRef } from 'react';
import { Application, Container, Rectangle } from 'pixi.js';
import Layout from '../components/Layout/Layout';
import { IsometricScene } from '../portfolio/IsometricScene';
import { CasesScene } from '../portfolio/CasesScene';
import { CRTFilter } from '../portfolio/CRTFilter';
import { getAssetManager } from '../portfolio/AssetManager';
import './Sup.css';

export default function Sup() {
  const [activeSection, setActiveSection] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const sceneRef = useRef(null);
  const mainSceneRef = useRef(null);
  const casesSceneRef = useRef(null);
  const sceneTypeRef = useRef('main');
  const crtFilterRef = useRef(null);
  const crtTickerRef = useRef(null);
  const crtContainerRef = useRef(null);  // Контейнер для CRT фильтра
  const sceneRootRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  const assetManagerRef = useRef(null);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const enableCrtShader = true;
  const crtDefaults = {
    curvature: 12.0,
    scanlineIntensity: 0.15,
    scanlineCount: 1200.0,
    vignetteIntensity: 0.25,
    brightness: 1.3,
    chromaOffset: 0.8,
  };

  const casesData = [
    { title: 'Case 01', text: 'First test tile: overview and context.' },
    { title: 'Case 02', text: 'Second tile: process and approach.' },
    { title: 'Case 03', text: 'Third tile: outcome and impact.' },
    { title: 'Case 04', text: 'Fourth tile: visuals and systems.' },
    { title: 'Case 05', text: 'Fifth tile: notes and next steps.' },
  ];

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
        await assetManager.loadAll();
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

    if (activeSection === 'cases') {
      if (sceneTypeRef.current !== 'cases') {
        // Полностью уничтожаем главную сцену
        if (mainSceneRef.current) {
          mainSceneRef.current.destroy();
          mainSceneRef.current = null;
        }

        // Уничтожаем старую CasesScene если есть
        if (casesSceneRef.current) {
          casesSceneRef.current.destroy();
          casesSceneRef.current = null;
        }

        // Создаём новую CasesScene с предзагруженными ассетами
        casesSceneRef.current = new CasesScene(
          appRef.current,
          { tileCount: 5, tileGap: 0, tileOverlap: 20, backgroundColor: 0x000000, debugMode: true },
          sceneRootRef.current,
          assetManager
        );

        sceneRef.current = casesSceneRef.current;
        sceneTypeRef.current = 'cases';
        setAiStatus(null);
        setActiveCaseIndex(0);
        ensureCrt();
      }
    } else {
      if (sceneTypeRef.current !== 'main') {
        // Полностью уничтожаем CasesScene
        if (casesSceneRef.current) {
          casesSceneRef.current.destroy();
          casesSceneRef.current = null;
        }

        // Создаём новую IsometricScene с предзагруженными ассетами
        mainSceneRef.current = new IsometricScene(
          appRef.current,
          sceneRootRef.current,
          assetManager
        );

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

  return (
    <Layout showHeader={false}>
      <div className="sup-game-container">
        {/* ВЕРХНЯЯ ЧАСТЬ - GAME VIEWPORT (16:9) */}
        <div className="sup-viewport">
          <div className={`sup-viewport-inner ${activeSection === 'cases' ? 'is-cases' : ''}`}>
            <canvas ref={canvasRef} className="sup-canvas"></canvas>

            {/* OVERLAY - AI STATUS */}
            {aiStatus && sceneTypeRef.current === 'main' && (
              <>
                <div className="sup-status-bar">
                  <div className="sup-status-bar-item">
                    <span className="sup-status-bar-label">State:</span>
                    <span className="sup-status-bar-value">{aiStatus.state}</span>
                  </div>
                  <div className="sup-status-bar-divider">|</div>
                  <div className="sup-status-bar-item">
                    <span className="sup-status-bar-label">Activity:</span>
                    <span className="sup-status-bar-value">{aiStatus.activity}</span>
                  </div>
                  {aiStatus.goal && (
                    <>
                      <div className="sup-status-bar-divider">|</div>
                      <div className="sup-status-bar-item">
                        <span className="sup-status-bar-label">Goal:</span>
                        <span className="sup-status-bar-value">{aiStatus.goal}</span>
                      </div>
                    </>
                  )}
                  {aiStatus.actionTimer > 0 && (
                    <>
                      <div className="sup-status-bar-divider">|</div>
                      <div className="sup-status-bar-item">
                        <span className="sup-status-bar-value">{aiStatus.actionTimer}s</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="sup-genesis-hud">
                  <div className="sup-genesis-hud-grid">
                    <div className="sup-hud-tile sup-hud-need is-energy">
                      <span className="sup-hud-label">Energy</span>
                      <div className="sup-hud-need-bar">
                        <div
                          className="sup-hud-need-fill"
                          style={{ width: `${aiStatus.needs.energy}%` }}
                        ></div>
                      </div>
                      <span className="sup-hud-value">{aiStatus.needs.energy}%</span>
                    </div>

                    <div className="sup-hud-tile sup-hud-need is-hunger">
                      <span className="sup-hud-label">Hunger</span>
                      <div className="sup-hud-need-bar">
                        <div
                          className="sup-hud-need-fill"
                          style={{ width: `${aiStatus.needs.hunger}%` }}
                        ></div>
                      </div>
                      <span className="sup-hud-value">{aiStatus.needs.hunger}%</span>
                    </div>

                    <div className="sup-hud-tile sup-hud-need is-fun">
                      <span className="sup-hud-label">Fun</span>
                      <div className="sup-hud-need-bar">
                        <div
                          className="sup-hud-need-fill"
                          style={{ width: `${aiStatus.needs.fun}%` }}
                        ></div>
                      </div>
                      <span className="sup-hud-value">{aiStatus.needs.fun}%</span>
                    </div>

                    <div className="sup-hud-tile sup-hud-need is-social">
                      <span className="sup-hud-label">Social</span>
                      <div className="sup-hud-need-bar">
                        <div
                          className="sup-hud-need-fill"
                          style={{ width: `${aiStatus.needs.social}%` }}
                        ></div>
                      </div>
                      <span className="sup-hud-value">{aiStatus.needs.social}%</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* НИЖНЯЯ ЧАСТЬ - GAME UI / CONTROL PANEL */}
        <div className="sup-control-panel">
          {activeSection === 'cases' ? (
            <div className="sup-cases-panel">
              <div className="sup-cases-controls">
                <button
                  className="sup-cases-button is-back"
                  onClick={() => setActiveSection(null)}
                >
                  Back to Scene
                </button>
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
                      const nextIndex = Math.min(casesData.length - 1, activeCaseIndex + 1);
                      setActiveCaseIndex(nextIndex);
                      casesSceneRef.current?.setActiveTile?.(nextIndex);
                    }}
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="sup-cases-info">
                <h3>{casesData[activeCaseIndex]?.title}</h3>
                <p>{casesData[activeCaseIndex]?.text}</p>
              </div>
            </div>
          ) : (
            <div className="sup-menu">
              <button
                className={`sup-menu-item ${activeSection === 'cases' ? 'active' : ''}`}
                onClick={() => setActiveSection('cases')}
              >
                <div className="sup-menu-content">
                  <h3>CASES</h3>
                  <p>Client projects & case studies</p>
                </div>
                <span className="sup-menu-arrow">→</span>
              </button>

              <button
                className={`sup-menu-item ${activeSection === 'projects' ? 'active' : ''}`}
                onClick={() => setActiveSection('projects')}
              >
                <div className="sup-menu-content">
                  <h3>PROJECTS</h3>
                  <p>Personal & experimental work</p>
                </div>
                <span className="sup-menu-arrow">→</span>
              </button>

              <button
                className={`sup-menu-item ${activeSection === 'old-portfolio' ? 'active' : ''}`}
                onClick={() => setActiveSection('old-portfolio')}
              >
                <div className="sup-menu-content">
                  <h3>OLD</h3>
                  <p>Archive & previous works</p>
                </div>
                <span className="sup-menu-arrow">→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
