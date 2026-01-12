import { useState, useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import Layout from '../components/Layout/Layout';
import { IsometricScene } from '../game/IsometricScene';
import './Sup.css';

export default function Sup() {
  const [activeSection, setActiveSection] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const sceneRef = useRef(null);

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

      // Создаем изометрическую сцену
      sceneRef.current = new IsometricScene(app);
    };

    initPixi();

    return () => {
      if (sceneRef.current) {
        sceneRef.current.destroy();
      }
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // Обновление сцены при смене секции
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateSection(activeSection);
    }
  }, [activeSection]);

  // Обновление статусов AI
  useEffect(() => {
    const updateStatus = () => {
      if (sceneRef.current) {
        const status = sceneRef.current.getAIStatus();
        setAiStatus(status);
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
          <div className="sup-viewport-inner">
            <canvas ref={canvasRef} className="sup-canvas"></canvas>

            {/* OVERLAY - AI STATUS */}
            {aiStatus && (
              <>
                {/* СТРОКА СТАТУСА - STATE & ACTIVITY */}
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

                {/* NEEDS OVERLAY */}
                <div className="sup-needs-overlay">
                  <div className="sup-need-item">
                    <span className="sup-need-label">Energy</span>
                    <div className="sup-need-bar">
                      <div
                        className="sup-need-fill"
                        style={{ width: `${aiStatus.needs.energy}%`, backgroundColor: '#667eea' }}
                      ></div>
                    </div>
                    <span className="sup-need-value">{aiStatus.needs.energy}%</span>
                  </div>

                  <div className="sup-need-item">
                    <span className="sup-need-label">Hunger</span>
                    <div className="sup-need-bar">
                      <div
                        className="sup-need-fill"
                        style={{ width: `${aiStatus.needs.hunger}%`, backgroundColor: '#00ff88' }}
                      ></div>
                    </div>
                    <span className="sup-need-value">{aiStatus.needs.hunger}%</span>
                  </div>

                  <div className="sup-need-item">
                    <span className="sup-need-label">Fun</span>
                    <div className="sup-need-bar">
                      <div
                        className="sup-need-fill"
                        style={{ width: `${aiStatus.needs.fun}%`, backgroundColor: '#f59e0b' }}
                      ></div>
                    </div>
                    <span className="sup-need-value">{aiStatus.needs.fun}%</span>
                  </div>

                  <div className="sup-need-item">
                    <span className="sup-need-label">Social</span>
                    <div className="sup-need-bar">
                      <div
                        className="sup-need-fill"
                        style={{ width: `${aiStatus.needs.social}%`, backgroundColor: '#ec4899' }}
                      ></div>
                    </div>
                    <span className="sup-need-value">{aiStatus.needs.social}%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* НИЖНЯЯ ЧАСТЬ - GAME UI / CONTROL PANEL */}
        <div className="sup-control-panel">
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
        </div>
      </div>
    </Layout>
  );
}
