import { useCallback, useEffect, useRef, useState } from 'react';
import { BUFFS, UI } from './getabuffData';
import './Getabuff.css';

const LANGS = ['ru', 'en', 'es', 'fr', 'zh', 'hi', 'ar'];
const LANG_NAMES = {
  ru: 'Русский', en: 'English', es: 'Español', fr: 'Français',
  zh: '中文', hi: 'हिन्दी', ar: 'العربية',
};
const RTL = new Set(['ar']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Спрайтшиты: 2×2, порядок ячеек top-left, top-right, bottom-left, bottom-right.
// Порядок предметов в BUFFS совпадает с public/assets/getabuff/spritesheets.json,
// поэтому лист и ячейку считаем прямо из индекса.
const SPRITE_BASE = '/assets/getabuff/';
const SHEET_COUNT = Math.ceil(BUFFS.length / 4);
const CELL_POS = ['0% 0%', '100% 0%', '0% 100%', '100% 100%'];

const sheetUrl = (n) => `${SPRITE_BASE}getabuff-items-${String(n).padStart(2, '0')}.png`;

function spriteStyle(idx) {
  return {
    backgroundImage: `url(${sheetUrl(Math.floor(idx / 4) + 1)})`,
    backgroundPosition: CELL_POS[idx % 4],
  };
}

// Локальная дата (не UTC) — «один бафф в день» считаем по календарю пользователя.
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function validIdx(v) {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n >= 0 && n < BUFFS.length ? n : null;
}

function initDaily() {
  try {
    const { d, i } = JSON.parse(localStorage.getItem('getabuff_daily') || '{}');
    if (d === todayKey()) return validIdx(i);
  } catch { /* ignore */ }
  return null;
}

function initLang() {
  const q = readParam('lang');
  if (q && LANGS.includes(q)) return q;
  try {
    const saved = localStorage.getItem('getabuff_lang');
    if (saved && LANGS.includes(saved)) return saved;
  } catch { /* ignore */ }
  const browser = typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2) : null;
  return LANGS.includes(browser) ? browser : 'en';
}

export default function Getabuff() {
  const [lang, setLang] = useState(initLang);
  const [sharedIdx] = useState(() => validIdx(readParam('b')));
  const [dailyIdx, setDailyIdx] = useState(initDaily);
  const [currentIdx, setCurrentIdx] = useState(() => {
    const s = validIdx(readParam('b'));
    return s != null ? s : initDaily();
  });
  const [rolling, setRolling] = useState(false);
  const [copied, setCopied] = useState(false);
  const preloaded = useRef(false);

  const t = UI[lang];
  const rtl = RTL.has(lang);
  const current = currentIdx == null ? null : BUFFS[currentIdx];
  const claimed = dailyIdx != null;
  const mine = claimed && currentIdx === dailyIdx;
  const showingShared = !mine && currentIdx != null && currentIdx === sharedIdx;

  useEffect(() => {
    try { localStorage.setItem('getabuff_lang', lang); } catch { /* ignore */ }
  }, [lang]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'getabuff';
    return () => { document.title = prev; };
  }, []);

  const preloadSheets = useCallback(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    for (let n = 1; n <= SHEET_COUNT; n++) {
      const img = new Image();
      img.src = sheetUrl(n);
    }
  }, []);

  const spin = useCallback(async () => {
    if (rolling || dailyIdx != null) return;
    preloadSheets();
    setRolling(true);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      for (let i = 0; i < 6; i++) {
        setCurrentIdx(Math.floor(Math.random() * BUFFS.length));
        await sleep(58 + i * 24);
      }
    }

    const idx = Math.floor(Math.random() * BUFFS.length);
    setCurrentIdx(idx);
    setDailyIdx(idx);
    try {
      localStorage.setItem('getabuff_daily', JSON.stringify({ d: todayKey(), i: idx }));
    } catch { /* ignore */ }
    try { window.history.replaceState(null, '', '/getabuff'); } catch { /* ignore */ }
    setRolling(false);
  }, [rolling, dailyIdx, preloadSheets]);

  const share = useCallback(async () => {
    if (currentIdx == null) return;
    const b = BUFFS[currentIdx][lang];
    const url = `${window.location.origin}/getabuff?b=${currentIdx}&lang=${lang}`;
    const text = t.shareText.replace('{item}', b.item).replace('{buff}', b.buff);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'getabuff', text, url });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.share, `${text}\n${url}`);
    }
  }, [currentIdx, lang, t]);

  return (
    <div className="getabuff" dir={rtl ? 'rtl' : 'ltr'} lang={lang}>
      <select
        className="gb-lang"
        aria-label="Language"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>{LANG_NAMES[l]}</option>
        ))}
      </select>

      <div className="gb-scroll">
        <main className="gb-main">
          <h1 className="gb-title">
            {t.titleBefore}
            <em>{t.titleEm}</em>
            {t.titleAfter}
          </h1>

          <button type="button" className="gb-btn" onClick={spin} disabled={rolling || claimed}>
            <span>{claimed ? t.claimed : t.roll}</span>
          </button>

          <div className="gb-result" aria-live="polite">
            {current && (
              <div className={`gb-card${rolling ? ' is-rolling' : ''}`} style={{ '--tier': `var(--gb-${current.rarity})` }}>
                {showingShared && <div className="gb-note">{t.sharedNote}</div>}
                <div className="gb-sprite-wrap">
                  <div className="gb-sprite" style={spriteStyle(currentIdx)} aria-hidden="true" />
                </div>
                <div className="gb-tier">{t.tiers[current.rarity]}</div>
                <div className="gb-item">{current[lang].item}</div>
                <div className="gb-rule" />
                <p className="gb-buff">{current[lang].buff}</p>
                <p className="gb-flavor">{current[lang].flavor}</p>
              </div>
            )}
          </div>

          {mine && !rolling && (
            <button type="button" className={`gb-share${copied ? ' is-copied' : ''}`} onClick={share}>
              {copied ? t.copied : t.share}
            </button>
          )}
          {claimed && !mine && !rolling && (
            <button type="button" className="gb-again" onClick={() => setCurrentIdx(dailyIdx)}>
              {t.showMine}
            </button>
          )}
        </main>
      </div>

      <footer className="gb-footer">{t.footer}</footer>
    </div>
  );
}
