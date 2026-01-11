# Isometric Portfolio Game - Структура проекта

## Обзор

Интерактивная портфолио-страница на `/sup` роуте с изометрической 2D игрой, где персонаж автономно перемещается по карте, симулируя жизнь в стиле тамагочи.

## Архитектура

```
/sup route
├── Sup.jsx              - React компонент страницы
├── Sup.css              - Стили страницы
└── game/
    ├── IsometricScene.js - Основная игровая сцена (Pixi.js)
    └── CharacterAI.js    - AI система управления персонажем
```

## Визуальная структура

```
┌─────────────────────────────────────────┐
│         GAME VIEWPORT (16:9)            │
│    Изометрическая сцена с Pixi.js       │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│         STATUS PANEL                    │
│  ┌──────┐  ┌───────────┐  ┌──────────┐ │
│  │STATE │  │   NEEDS   │  │ ACTIVITY │ │
│  └──────┘  └───────────┘  └──────────┘ │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│         CONTROL PANEL                   │
│  [CASES]  [PROJECTS]  [OLD PORTFOLIO]   │
└─────────────────────────────────────────┘
```

## IsometricScene.js

### Основная функциональность
- Изометрическая сетка 8x8 тайлов
- Система сортировки по глубине (z-index)
- Персонаж с 4-направленными спрайтами
- Плавная камера, следующая за персонажем
- Два режима управления: ручной (WASD) или AI

### Конфигурация

```javascript
// Размеры сетки
this.tileWidth = 128;
this.tileHeight = 64;
this.gridSize = 8;

// Персонаж
this.spriteScale = 0.05;        // Масштаб спрайта
this.spriteOffsetY = 10;        // Смещение относительно тени
this.shadowOffsetY = 0;         // Смещение тени

// Движение
this.moveSpeed = 0.15;          // Скорость движения (0-1)
this.cameraSmoothing = 0.1;     // Плавность камеры (0-1)

// Режимы
this.debugMode = false;         // Отладочная графика
this.controllerMode = false;    // true = WASD, false = AI
```

### Объекты на карте

```javascript
objectConfig = {
  'projects': { size: 128, anchor: [0.5, 0.5], depthBonus: 0 },
  'tree':     { size: 128, anchor: [0.5, 0.35], depthBonus: 3 },
  'home':     { size: 128, anchor: [0.5, 0.5], depthBonus: 0 },
  'cases':    { size: 128, anchor: [0.5, 0.5], depthBonus: 0 },
}
```

**depthBonus** - дополнительные "тайлы глубины" для высоких объектов (дерево = 3, перекрывает персонажа на 3 тайла выше)

### Система координат

```javascript
// Изометрическая проекция
isoToScreen(x, y) {
  const screenX = (x - y) * (tileWidth / 2);
  const screenY = (x + y) * (tileHeight / 2);
  const centerOffsetY = tileHeight / 2;
  return { x: screenX, y: screenY + centerOffsetY };
}
```

## CharacterAI.js

### Тамагочи система

**Потребности** (0-100, уменьшаются со временем):

```javascript
needs = {
  energy: 100,   // -0.5/сек
  hunger: 100,   // -0.3/сек
  fun: 100,      // -0.4/сек
  social: 100,   // -0.2/сек
}
```

**Активности**:

| Активность | Локация        | Восстанавливает         | Длительность |
|-----------|----------------|------------------------|--------------|
| rest      | home (4, 2)    | energy +30             | 3s           |
| eat       | home (4, 2)    | hunger +40             | 2s           |
| work      | projects/cases | fun +20                | 5s           |
| play      | tree (1, 1)    | fun +30                | 4s           |
| socialize | tree (1, 1)    | social +25             | 3s           |

### Логика AI

```
Цикл обновления (1 раз в секунду):
1. Уменьшить все потребности
2. Если персонаж движется → пропустить
3. Если выполняется действие → уменьшить таймер
4. Если idle → выбрать активность (самая низкая потребность)
5. Построить путь к цели (сначала по X, потом по Y)
6. Следовать по пути шаг за шагом
7. По достижении → выполнить действие
8. Восстановить потребности → вернуться в idle
```

### Методы API

```javascript
characterAI.start()        // Запуск AI
characterAI.stop()         // Остановка AI
characterAI.getStatus()    // Получить статус для UI
  -> {
    state: string,           // 'idle' | 'walking' | 'performing_action'
    activity: string,        // 'rest' | 'eat' | 'work' | 'play' | 'socialize'
    needs: { energy, hunger, fun, social },
    goal: string,            // 'home' | 'projects' | 'cases' | 'tree'
    actionTimer: number      // Секунды до завершения действия
  }
```

## Sup.jsx - React компонент

### State

```javascript
const [activeSection, setActiveSection] = useState(null);  // Активная секция меню
const [aiStatus, setAiStatus] = useState(null);            // Статус AI (обновляется каждые 500ms)
```

### Refs

```javascript
const canvasRef = useRef(null);    // Canvas элемент для Pixi.js
const appRef = useRef(null);       // Pixi.js Application
const sceneRef = useRef(null);     // IsometricScene instance
```

### Effects

1. **Инициализация Pixi.js** - создает Application и IsometricScene
2. **Обновление секции** - вызывает `scene.updateSection(activeSection)` при смене
3. **Обновление статусов** - каждые 500ms получает статус AI для UI

## Ассеты

```
public/assets/
├── tile_grass_512.png      - Тайл травы (512x512)
├── me_idle_f.png           - Персонаж спереди (2048x2048)
├── me_idle_b.png           - Персонаж сзади (2048x2048)
├── obj_tree.png            - Дерево (512x512)
├── obj_home.png            - Дом (512x512)
├── obj_projects.png        - Объект проектов (512x512)
└── obj_cases.png           - Объект кейсов (512x512)
```

## Технологии

- **React** - UI компоненты
- **Pixi.js v8** - 2D рендеринг (WebGL/Canvas)
- **Vite** - Build tool с HMR
- **JavaScript ES6+** - Современный синтаксис

## Как использовать

1. Открыть `/sup` роут в браузере
2. Персонаж автоматически начнет перемещаться (AI режим)
3. Статусы отображаются в панели между viewport и меню
4. Переключить на ручное управление: `controllerMode = true` в `IsometricScene.js`

## Debug режим

```javascript
// В IsometricScene.js
this.debugMode = true;
```

**Показывает**:
- Границы тайлов (зеленые ромбы)
- Координаты тайлов
- Центры тайлов (фиолетовые точки)
- Позицию персонажа (красная точка)

## Будущие улучшения

- [ ] Интерактивные объекты (клик для взаимодействия)
- [ ] Больше анимаций персонажа (ходьба, действия)
- [ ] Столкновения с объектами
- [ ] Смена сцен через control panel кнопки
- [ ] Сохранение состояния AI в localStorage
- [ ] Звуковые эффекты
- [ ] Частицы и эффекты окружения
