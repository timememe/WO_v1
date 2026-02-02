import { useEffect, useRef } from 'react';
import { Application, Container } from 'pixi.js';
import { CasesScene } from '../portfolio/CasesScene';
import { getAssetManager } from '../portfolio/AssetManager';

export default function CasesTest() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    let destroyed = false;
    let scene = null;

    const init = async () => {
      if (!canvasRef.current || appRef.current) return;

      const app = new Application();
      await app.init({
        canvas: canvasRef.current,
        resizeTo: canvasRef.current.parentElement,
        backgroundColor: 0x111122,
        antialias: true,
      });
      if (destroyed) { app.destroy(true); return; }
      appRef.current = app;

      const root = new Container();
      app.stage.addChild(root);

      const assetManager = getAssetManager();
      try {
        await assetManager.loadAll((info) => {
          console.log('Loading:', info?.alias || info?.src);
        });
        console.log('Assets loaded');
      } catch (e) {
        console.error('Asset load failed:', e);
      }
      if (destroyed) { app.destroy(true); return; }

      scene = new CasesScene(
        app,
        { tileGap: 0, tileOverlap: 20, backgroundColor: 0x111122, debugMode: true },
        root,
        assetManager,
      );
      console.log('CasesScene created, tiles:', scene.tiles?.length, 'screen:', app.screen.width, app.screen.height);
    };

    init();

    return () => {
      destroyed = true;
      if (scene) scene.destroy();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#111122' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
