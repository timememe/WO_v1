# DAYVIBE - Modular Architecture

## Обзор модульной структуры

Проект разбит на **4 ключевых масштабируемых модуля**:

```
dayvibe/
├── app.js              # Точка входа, инициализация
├── core.js             # State + Strudel initialization
├── loops.js            # Loop management + navigation + live reload
├── ai.js               # Context analysis + AI API + modes
├── ui.js               # Playback + visualizer + sliders + events
├── dayvibe.html        # HTML структура
├── dayvibe.css         # Стили
└── dayvibe.js          # DEPRECATED: старый монолитный файл (backup)
```

---

## 1️⃣ core.js - Ядро системы

**Зона ответственности:** State management + инициализация Strudel

### Exports:
- **State variables:** `isPlaying`, `loops`, `currentLoopIndex`, `scheduler`, `audioContext`, etc.
- **Setters:** `setIsPlaying()`, `setCurrentLoopIndex()`, `addLoop()`, `removeLoop()`
- **Init:** `initDayvibe()` - загрузка Strudel + samples

### Ключевые функции:
- `initDayvibe()` - асинхронная инициализация Strudel с TR-909/TR-808 samples
- `repl.evaluate(code)` - обертка для Strudel evaluate с патчем `.fade()`
- `repl.stop()` - остановка через scheduler

### Зависимости:
- Strudel globals (`window.initStrudel`, `evaluate`, `hush`, `getScheduler`)

---

## 2️⃣ loops.js - Менеджер лупов

**Зона ответственности:** CRUD операции, навигация, live reload

### Exports:
- `updateLoopsGrid()` - рендеринг 8 тайлов
- `deleteLoop(index)`, `moveLoopUp(index)`, `moveLoopDown(index)` - CRUD
- `switchToLoop(index)` - cycle-synced переключение
- `nextLoop()`, `prevLoop()` - навигация
- `updateCurrentLoop()` - сохранение изменений
- `liveReloadCode()` - debounced re-evaluation (500ms)
- `checkEditorChanges()` - показ кнопки Update

### Зависимости:
- Импорты из `core.js`: `loops`, `currentLoopIndex`, `scheduler`, `repl`
- Импорты из `ui.js`: `stopCode()` (через window)

### Особенности:
- Cycle-synced switching через `scheduler.nextCycle()`
- Live reload только при `isPlaying && currentAIMode === 'normal'`
- Auto-update loop names с меткой "(edited)"

---

## 3️⃣ ai.js - AI Generation

**Зона ответственности:** Musical context analysis + API calls + режимы

### Exports:
- **Mode management:** `setEditorMode()`, `openGenerateMode()`, `openEditMode()`, `openContinueMode()`, `openTransitionMode()`
- **Execution:** `executeAIGeneration()`, `addGeneratedLoop()`
- **Analysis:** `analyzeMusicalContext(code)` - извлечение BPM/tempo/samples/effects
- **Prompts:** `buildContextualPrompt(userPrompt, context)` - добавление контекста

### API Endpoints:
| Mode | Endpoint | Context |
|------|----------|---------|
| Generate | `/generate-strudel-script` | None |
| Edit | `/edit-strudel-loop` | Musical context (BPM, samples, complexity) |
| Continue | `/generate-strudel-continuation` | Musical context |
| Transition | `/generate-strudel-transition` | Dual-loop diff (BPM, tempo, samples) |

### Музыкальный контекст:
- **BPM detection:** `.speed()`, `.fast()`, `.slow()` patterns
- **Tempo classification:** slow/normal/fast
- **Samples extraction:** `s("bd sd hh")` → `['bd', 'sd', 'hh']`
- **Complexity:** simple (< 3 methods), medium (3-6), complex (> 6)
- **Effects:** reverb, delay, filter, dynamics
- **Structure:** euclidean, rhythmic, basic

### Зависимости:
- Импорты из `core.js`: `loops`, `currentLoopIndex`, `savedCode`
- Импорты из `loops.js`: `updateLoopsGrid()`, `switchToLoop()`

---

## 4️⃣ ui.js - Интерфейс и интерактив

**Зона ответственности:** Playback + visualizer + sliders + events

### Exports:

#### Visualizer:
- `createVisualizer()` - создание 32 баров
- `animateVisualizer()` - RAF loop
- `stopVisualizer()` - сброс

#### Playback:
- `playCode()` - evaluate + start scheduler + visualizer
- `stopCode()` - multi-layer stop (pattern, scheduler, hush, panic)
- `updateStatus(text, playing)` - UI sync

#### Sliders:
- `parseNumbersFromCode(code)` - regex извлечение параметров с context-aware ranges
- `openSlidersMode()` - переключение в grid mode
- `renderSlidersGrid()` - группировка по строкам, создание slider boxes
- `updateCodeWithSliderInGrid(index, value)` - точная замена по `matchIndex`
- `updateSlidersButtonVisibility()` - показ кнопки только при наличии параметров

#### Events:
- `setupHotkeys()` - Ctrl+Enter (play), Ctrl+. (stop)
- `setupEditorListeners()` - input debouncing для слайдеров (300ms)

### Слайдеры - Контекстные диапазоны:
| Function | Min | Max | Step |
|----------|-----|-----|------|
| gain/volume | 0 | 2 | 0.05 |
| speed/fast/slow | 0.1 | 4 | 0.1 |
| note/n | 0 | 127 | 1 |
| pan | -1 | 1 | 0.1 |
| cutoff/lpf/hpf | 100 | 10000 | 100 |
| delay/room/size | 0 | 1 | 0.05 |

### Зависимости:
- Импорты из `core.js`: `isPlaying`, `repl`, `scheduler`, `currentPattern`
- Импорты из `loops.js`: `updateLoopsGrid()`, `checkEditorChanges()`, `liveReloadCode()`
- Импорты из `ai.js`: `setEditorMode()`

---

## 5️⃣ app.js - Точка входа

**Зона ответственности:** Инициализация, глобальные экспорты

### Функции:
- Импорт всех модулей
- Экспорт функций в `window` для inline handlers в HTML
- `initApp()` - последовательная инициализация:
  1. `createVisualizer()`
  2. `updateLoopsGrid()`
  3. `initDayvibe()`
  4. `setupLiveReload()`
  5. `setupHotkeys()`
  6. `setupEditorListeners()`

### Глобальные экспорты (для HTML):
```js
window.playCode
window.stopCode
window.nextLoop
window.prevLoop
window.openGenerateMode
window.openEditMode
window.openContinueMode
window.openTransitionMode
window.openSlidersMode
window.cancelAIMode
window.executeAIGeneration
window.addGeneratedLoop
window.updateCurrentLoop
window.loadExample
```

---

## Диаграмма зависимостей

```
app.js (entry point)
  ├─> core.js (state + init)
  ├─> loops.js
  │    └─> core.js
  │    └─> ui.js (stopCode via window)
  ├─> ai.js
  │    └─> core.js
  │    └─> loops.js
  └─> ui.js
       └─> core.js
       └─> loops.js
       └─> ai.js
```

---

## Преимущества модульной архитектуры

### ✅ Separation of Concerns
- **core.js** - чистая инфраструктура, без логики
- **loops.js** - управление данными
- **ai.js** - работа с API и анализом
- **ui.js** - только DOM и события

### ✅ Testability
- Pure functions (особенно в `ai.js`) легко тестировать
- Можно мокать импорты для unit-тестов
- Пример:
  ```js
  import { analyzeMusicalContext } from './ai.js';

  test('BPM detection', () => {
    const code = 's("bd sd").speed(1.5)';
    const context = analyzeMusicalContext(code);
    expect(context.bpm).toBe(180); // 120 * 1.5
  });
  ```

### ✅ Maintainability
- Легко найти ошибки (изолированы в модулях)
- Понятная структура для новых разработчиков
- Изменения в одном модуле не ломают другие

### ✅ Scalability
- Легко добавить новые AI режимы (в `ai.js`)
- Легко добавить новые UI компоненты (в `ui.js`)
- Можно расширить лупы до 16/32 (изменить `MAX_LOOPS` в `core.js`)

### ✅ Reusability
- `loops.js` можно переиспользовать в других проектах
- `ai.js` можно использовать как библиотеку для анализа Strudel кода

---

## Сравнение: Было vs Стало

| Параметр | Монолит (dayvibe.js) | Модули |
|----------|----------------------|--------|
| Строк в файле | 1993 | core: 205, loops: 357, ai: 655, ui: 656, app: 60 |
| Тестируемость | ❌ Низкая | ✅ Высокая |
| Переиспользование | ❌ Невозможно | ✅ Легко |
| Onboarding | ❌ Сложно (нужно читать все) | ✅ Просто (модуль = контекст) |
| Коллаборация | ❌ Конфликты при merge | ✅ Разные люди - разные модули |
| Рефакторинг | ❌ Опасно (ломается всё) | ✅ Безопасно (изолированные изменения) |

---

## Как работать с модулями

### Добавление новой фичи

**Пример: Добавить кнопку "Random Loop"**

1. **Логика генерации** → `ai.js`:
   ```js
   export function generateRandomLoop() {
     const randomPrompts = ['fast techno', 'slow ambient', 'jungle breaks'];
     const prompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
     // ... вызов API
   }
   ```

2. **UI кнопка** → `ui.js` (или `loops.js` если связано с лупами):
   ```js
   export function setupRandomButton() {
     const btn = document.getElementById('randomBtn');
     btn.onclick = generateRandomLoop;
   }
   ```

3. **Экспорт в window** → `app.js`:
   ```js
   import { generateRandomLoop } from './ai.js';
   window.generateRandomLoop = generateRandomLoop;
   ```

4. **HTML** → `dayvibe.html`:
   ```html
   <button onclick="generateRandomLoop()">🎲 Random</button>
   ```

### Дебаггинг

1. **Проблемы с воспроизведением?** → Смотри `ui.js` (`playCode`, `stopCode`)
2. **Лупы не переключаются?** → Смотри `loops.js` (`switchToLoop`)
3. **AI не работает?** → Смотри `ai.js` (проверь endpoints, context)
4. **State не синхронизируется?** → Смотри `core.js` (setters)

---

## Следующие шаги

### Фаза 1: Тестирование
- [ ] Убедиться что всё работает в браузере
- [ ] Проверить hot reload
- [ ] Проверить AI modes

### Фаза 2: Unit Tests
- [ ] Jest setup
- [ ] Тесты для `analyzeMusicalContext`
- [ ] Тесты для `parseNumbersFromCode`
- [ ] Тесты для `buildContextualPrompt`

### Фаза 3: TypeScript Migration
- [ ] Переименовать `.js` → `.ts`
- [ ] Добавить types для state
- [ ] Добавить interfaces для Loop, MusicContext

### Фаза 4: Build System
- [ ] Webpack/Vite для бандлинга
- [ ] Минификация для продакшена
- [ ] Source maps для дебага

---

## FAQ

**Q: Почему не используется React/Vue?**
A: Vanilla JS + ES6 modules достаточно для текущего функционала. Фреймворк можно добавить позже без полного переписывания (модули уже разделены).

**Q: Можно ли вернуть монолитный файл?**
A: Да, старый `dayvibe.js` сохранен как backup. Просто замени `app.js` на `dayvibe.js` в HTML.

**Q: Как работает live reload через модули?**
A: `ui.js` импортирует `liveReloadCode()` из `loops.js`, который имеет доступ к `repl` из `core.js`. Всё через ES6 импорты.

**Q: Можно ли использовать эти модули в Node.js?**
A: Частично. `ai.js` (анализ контекста) и `loops.js` (CRUD) могут работать в Node. `ui.js` и `core.js` зависят от browser APIs.

---

**Автор:** MINECONT
**Проект:** WORLD_ORDER
**Версия:** v2.0 (Modular)
**Дата:** 2025
