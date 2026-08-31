import { useCallback, useEffect, useRef, useState } from 'react';
import { BUFFS, UI } from './getabuffData';
import './Getabuff.css';

const LANGS = ['ru', 'en'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function initLang() {
  try {
    const saved = localStorage.getItem('getabuff_lang');
    if (saved && LANGS.includes(saved)) return saved;
  } catch { /* localStorage may be unavailable */ }
  const browser = typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2) : null;
  return LANGS.includes(browser) ? browser : 'ru';
}

export default function Getabuff() {
  const [lang, setLang] = useState(initLang);
  const [current, setCurrent] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [rolled, setRolled] = useState(false);
  const lastIdx = useRef(-1);

  const t = UI[lang];

  useEffect(() => {
    try { localStorage.setItem('getabuff_lang', lang); } catch { /* ignore */ }
  }, [lang]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'getabuff';
    return () => { document.title = prev; };
  }, []);

  const pickIdx = useCallback(() => {
    let i;
    do { i = Math.floor(Math.random() * BUFFS.length); }
    while (BUFFS.length > 1 && i === lastIdx.current);
    lastIdx.current = i;
    return i;
  }, []);

  const spin = useCallback(async () => {
    if (rolling) return;
    setRolling(true);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      for (let i = 0; i < 6; i++) {
        setCurrent(BUFFS[Math.floor(Math.random() * BUFFS.length)]);
        // eslint-disable-next-line no-await-in-loop
        await sleep(58 + i * 24);
      }
    }

    setCurrent(BUFFS[pickIdx()]);
    setRolled(true);
    setRolling(false);
  }, [rolling, pickIdx]);

  return (
    <div className="getabuff">
      <div className="gb-lang" role="group" aria-label="Language">
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            className={l === lang ? 'is-active' : ''}
            aria-pressed={l === lang}
            onClick={() => setLang(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <main className="gb-main">
        <h1 className="gb-title">
          {t.titleBefore}
          <em>{t.titleEm}</em>
          {t.titleAfter}
        </h1>

        <button type="button" className="gb-btn" onClick={spin} disabled={rolling}>
          <span>{t.roll}</span>
        </button>

        <div className="gb-result" aria-live="polite">
          {current && (
            <div className={`gb-card${rolling ? ' is-rolling' : ''}`} style={{ '--tier': `var(--gb-${current.rarity})` }}>
              <div className="gb-tier">{t.tiers[current.rarity]}</div>
              <div className="gb-item">{current[lang].item}</div>
              <div className="gb-rule" />
              <p className="gb-buff">{current[lang].buff}</p>
              <p className="gb-flavor">{current[lang].flavor}</p>
            </div>
          )}
        </div>

        {rolled && !rolling && (
          <button type="button" className="gb-again" onClick={spin}>
            {t.again}
          </button>
        )}
      </main>

      <footer className="gb-footer">{t.footer}</footer>
    </div>
  );
}
