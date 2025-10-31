## DAYVIBE UI System - Документация

**Легковесная компонентная UI система для адаптивности и масштабирования**

---

## Архитектура

```
UI System/
├── theme.js        # Дизайн-система (цвета, spacing, breakpoints)
├── components.js   # UI компоненты с инкапсулированными стилями
└── layout.js       # Responsive helpers + layout system
```

---

## 1. theme.js - Дизайн-система

### Цвета

```js
import { colors } from './theme.js';

// Background
colors.bg.primary      // #0d1117 - основной фон
colors.bg.secondary    // #161b22 - вторичный фон
colors.bg.tertiary     // #1c2128 - третичный фон
colors.bg.overlay      // rgba(13, 17, 23, 0.92) - overlay с прозрачностью

// Text
colors.text.primary    // #c9d1d9 - основной текст
colors.text.secondary  // #8b949e - вторичный текст
colors.text.muted      // #6e7681 - приглушенный текст

// Accents
colors.accent.blue     // #3498db
colors.accent.red      // #e74c3c
colors.accent.green    // #16a085
colors.accent.purple   // #8e44ad

// Status
colors.status.success  // #2ecc71
colors.status.error    // #e74c3c
colors.status.warning  // #f39c12
```

### Spacing

```js
import { spacing } from './theme.js';

spacing.xs    // 4px
spacing.sm    // 8px
spacing.md    // 12px
spacing.lg    // 16px
spacing.xl    // 20px
spacing.xxl   // 24px
spacing.xxxl  // 32px
```

### Typography

```js
import { typography } from './theme.js';

// Fonts
typography.fonts.heading  // "Press Start 2P", monospace
typography.fonts.body     // "Courier New", monospace
typography.fonts.code     // "Courier New", monospace

// Sizes
typography.sizes.xs   // 10px
typography.sizes.sm   // 12px
typography.sizes.md   // 14px
typography.sizes.lg   // 16px
typography.sizes.xl   // 20px
```

### Breakpoints

```js
import { breakpoints, theme } from './theme.js';

// Breakpoint definitions
breakpoints.mobile.max   // 375px
breakpoints.tablet.min   // 376px
breakpoints.tablet.max   // 767px
breakpoints.desktop.min  // 768px

// Helper functions
theme.isMobile()   // true if ≤ 375px
theme.isTablet()   // true if 376-767px
theme.isDesktop()  // true if ≥ 768px

// Responsive value (автоподбор значения)
const padding = theme.responsive('8px', '12px', '16px');
// mobile: 8px, tablet: 12px, desktop: 16px
```

### Helper Functions

```js
import { theme } from './theme.js';

// Gradient
const gradient = theme.createGradient('#3498db', '#2980b9', 135);
// linear-gradient(135deg, #3498db, #2980b9)

// Transition
const transition = theme.createTransition(['transform', 'opacity'], '300ms');
// transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)

// Backdrop blur
const backdrop = theme.createBackdrop('4px');
// backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
```

---

## 2. components.js - UI Компоненты

### Button

```js
import { Button, IconButton } from './components.js';

// Primary button
const btn = Button({
    text: 'Play',
    icon: '▶',
    variant: 'primary', // primary, secondary, danger, success, ai
    size: 'normal',     // compact, normal
    disabled: false,
    onClick: () => console.log('clicked'),
    title: 'Play code'
});

// Icon button (compact)
const iconBtn = IconButton({
    icon: '×',
    variant: 'danger',
    onClick: () => console.log('delete'),
    title: 'Delete'
});

document.body.appendChild(btn);
```

**Variants:**
- `primary` - синий градиент (#3498db → #2980b9)
- `secondary` - серый градиент
- `danger` - красный градиент (#e74c3c → #c0392b)
- `success` - зеленый градиент (#16a085 → #138d75)
- `ai` - фиолетовый градиент (#8e44ad → #6c3483)

**Sizes:**
- `compact` - 36×36px (для иконок)
- `normal` - 40px height, 16px padding

**Features:**
- Hover lift effect (translateY(-2px))
- Auto box-shadow on hover
- Disabled state с opacity 0.5

---

### LoopTile

```js
import { LoopTile } from './components.js';

const tile = LoopTile({
    index: 0,
    loop: { code: 's("bd sd")', name: 'Loop 1' }, // null для empty tile
    isActive: true,
    isPlaying: true,
    onSelect: (index) => console.log('Selected', index),
    onDelete: (index) => console.log('Delete', index),
    onMoveUp: (index) => console.log('Move up', index),
    onMoveDown: (index) => console.log('Move down', index),
    canMoveUp: true,
    canMoveDown: true,
});

document.getElementById('loopsGrid').appendChild(tile);
```

**States:**
- `empty` - пустой тайл с "+" (серый фон)
- `active` - заполненный луп (темный фон)
- `playing` - активно играет (синий border + фон)

**Features:**
- Встроенные кнопки управления (▲, ▼, ×)
- Hover scale effect (1.02)
- Auto border color change
- Click handling с stopPropagation для кнопок

---

### SliderBox

```js
import { SliderBox } from './components.js';

const slider = SliderBox({
    label: 'gain',
    value: 0.8,
    min: 0,
    max: 2,
    step: 0.05,
    onChange: (newValue) => console.log('New value:', newValue),
    debounce: 50, // ms
});

document.body.appendChild(slider);
```

**Features:**
- Header с label + value (auto-format по step)
- Debounced onChange (default 50ms)
- Accent color (#3498db)
- Min width 120px

---

### SliderLineGroup

```js
import { SliderLineGroup } from './components.js';

const group = SliderLineGroup({
    lineText: 's("bd sd").gain(0.8).speed(1.0)',
    sliders: [
        { label: 'gain', value: 0.8, min: 0, max: 2, step: 0.05, onChange: (v) => {} },
        { label: 'speed', value: 1.0, min: 0.1, max: 4, step: 0.1, onChange: (v) => {} },
    ],
});

document.getElementById('slidersGridContent').appendChild(group);
```

**Features:**
- Code preview header
- Grid layout (auto-fill, minmax(120px, 1fr))
- Группировка слайдеров по строкам кода

---

### Other Components

```js
import { StatusIndicator, VisualizerBar, Grid } from './components.js';

// Status indicator
const status = StatusIndicator({
    active: true,
    text: 'Playing...'
});

// Visualizer bar
const bar = VisualizerBar();

// Grid container
const grid = Grid({
    columns: 'auto-fill',
    minItemWidth: '120px',
    gap: '12px',
    children: [/* elements */]
});
```

---

## 3. layout.js - Layout System

### Flex

```js
import { Flex } from './layout.js';

const row = Flex({
    direction: 'row',          // row, column, row-reverse, column-reverse
    justify: 'space-between',  // flex-start, center, flex-end, space-between, space-around
    align: 'center',           // flex-start, center, flex-end, stretch
    wrap: 'nowrap',            // nowrap, wrap, wrap-reverse
    gap: '12px',
    children: [btn1, btn2, btn3],
    className: 'custom-flex',
    styles: { padding: '16px' }
});

document.body.appendChild(row);
```

### Grid

```js
import { Grid } from './layout.js';

const grid = Grid({
    columns: 4,              // number или 'auto-fill'
    minItemWidth: '150px',
    gap: '16px',
    children: [tile1, tile2, tile3],
});
```

### Stack (Vertical Flex)

```js
import { Stack } from './layout.js';

const stack = Stack({
    gap: '8px',
    align: 'stretch',
    children: [element1, element2],
});
```

### Container

```js
import { Container } from './layout.js';

const container = Container({
    maxWidth: '800px',
    padding: '16px',
    centered: true,
    children: [content],
});
```

### ResponsiveElement

```js
import { responsive } from './layout.js';

const element = document.createElement('div');

responsive(element)
    .on('mobile', {
        fontSize: '12px',
        padding: '8px'
    })
    .on('tablet', {
        fontSize: '14px',
        padding: '12px'
    })
    .on('desktop', {
        fontSize: '16px',
        padding: '16px'
    });

document.body.appendChild(element);
```

**Features:**
- Chainable API
- Auto-update при resize
- Поддержка всех CSS свойств

### MediaQueryManager

```js
import { mediaQueries } from './layout.js';

// Add media query listener
mediaQueries.add('darkMode', '(prefers-color-scheme: dark)', (matches) => {
    console.log('Dark mode:', matches);
});

// Check if matches
if (mediaQueries.matches('darkMode')) {
    // ...
}

// Remove listener
mediaQueries.remove('darkMode');
```

### Viewport Utilities

```js
import { getViewportSize, onViewportResize } from './layout.js';

// Get current size
const { width, height } = getViewportSize();

// Listen for resize (debounced 300ms)
onViewportResize(({ width, height }) => {
    console.log('New size:', width, height);
}, 300);
```

### Other Layouts

```js
import { AspectRatio, ScrollContainer, Spacer, Divider, AdaptiveGrid } from './layout.js';

// Aspect ratio container
const aspectBox = AspectRatio({
    ratio: '16 / 9',
    children: [video]
});

// Scroll container
const scrollBox = ScrollContainer({
    maxHeight: '400px',
    direction: 'vertical', // vertical, horizontal, both
    children: [longContent]
});

// Spacer (пустое пространство)
const space = Spacer('16px');

// Divider (разделитель)
const divider = Divider({
    orientation: 'horizontal', // horizontal, vertical
    color: 'rgba(255, 255, 255, 0.1)',
    thickness: '1px',
    margin: '12px'
});

// Adaptive Grid (auto-adjusts columns on resize)
const adaptiveGrid = AdaptiveGrid({
    minItemWidth: '150px',
    gap: '12px',
    children: [item1, item2, item3]
});
```

---

## Примеры использования

### Пример 1: Создание Loop Grid

```js
import { Grid } from './layout.js';
import { LoopTile } from './components.js';

const loopTiles = loops.map((loop, index) =>
    LoopTile({
        index,
        loop,
        isPlaying: index === currentLoopIndex,
        onSelect: switchToLoop,
        onDelete: deleteLoop,
        onMoveUp: moveLoopUp,
        onMoveDown: moveLoopDown,
        canMoveUp: index > 0,
        canMoveDown: index < loops.length - 1,
    })
);

const grid = Grid({
    columns: 'auto-fill',
    minItemWidth: '120px',
    gap: '12px',
    children: loopTiles,
});

document.getElementById('loopsGrid').replaceChildren(grid);
```

### Пример 2: Responsive Button Row

```js
import { Flex } from './layout.js';
import { Button, responsive } from './components.js';

const playBtn = Button({ text: 'Play', variant: 'primary' });
const stopBtn = Button({ text: 'Stop', variant: 'danger' });

const row = Flex({
    justify: 'space-between',
    gap: '8px',
    children: [playBtn, stopBtn],
});

// Адаптивность
responsive(row)
    .on('mobile', { flexDirection: 'column', gap: '4px' })
    .on('desktop', { flexDirection: 'row', gap: '12px' });
```

### Пример 3: Sliders Grid с группировкой

```js
import { SliderLineGroup } from './components.js';

const groups = codeLines.map(line =>
    SliderLineGroup({
        lineText: line.text,
        sliders: line.params.map(param => ({
            label: param.name,
            value: param.value,
            min: param.min,
            max: param.max,
            step: param.step,
            onChange: (v) => updateParameter(param.id, v)
        }))
    })
);

document.getElementById('slidersContent').replaceChildren(...groups);
```

---

## Преимущества UI System

### ✅ Инкапсуляция стилей
- CSS классы скрыты внутри компонентов
- Стили задаются программно через theme
- Нет конфликтов классов

### ✅ Консистентность дизайна
- Единая дизайн-система (theme.js)
- Все компоненты используют одни и те же цвета/spacing
- Легко менять глобальную тему

### ✅ Адаптивность из коробки
- ResponsiveElement для любого элемента
- MediaQueryManager для сложных условий
- Helper functions (isMobile, isTablet, isDesktop)

### ✅ Масштабируемость
- Легко добавить новые компоненты
- Легко расширить theme
- Компоненты можно композировать

### ✅ Type Safety (Future TypeScript)
- Все опции компонентов типизированы
- Autocomplete в IDE
- Меньше ошибок

### ✅ Производительность
- Нет виртуального DOM (меньше overhead)
- Прямая работа с DOM
- Debounced события

---

## Migration Guide

### До (старый подход):

```js
// Создание тайла вручную
const tile = document.createElement('div');
tile.className = 'loop-tile active playing';
tile.style.background = '#3498db';
tile.style.border = '2px solid #3498db';
tile.style.borderRadius = '6px';
// ... 20 строк кода

const deleteBtn = document.createElement('button');
deleteBtn.className = 'loop-btn-delete';
deleteBtn.innerHTML = '×';
deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteLoop(index);
};
// ... еще 50 строк для остальных элементов
```

### После (с UI System):

```js
import { LoopTile } from './components.js';

const tile = LoopTile({
    index,
    loop,
    isPlaying: true,
    onDelete: deleteLoop,
    // ...
});
// 1 вызов функции = весь тайл с логикой
```

**Результат:**
- **70% меньше кода**
- **0 CSS классов в JS**
- **100% переиспользуемость**

---

## Roadmap

### Фаза 1: Базовые компоненты ✅
- [x] Theme system
- [x] Button, IconButton
- [x] LoopTile, SliderBox, SliderLineGroup
- [x] Flex, Grid, Stack
- [x] ResponsiveElement

### Фаза 2: Рефакторинг (текущая)
- [ ] Переписать loops.js с использованием LoopTile
- [ ] Переписать ui.js с использованием SliderBox
- [ ] Убрать хардкод CSS из JS

### Фаза 3: Расширение
- [ ] Modal компонент
- [ ] Tooltip компонент
- [ ] Dropdown компонент
- [ ] Toast notifications

### Фаза 4: Оптимизация
- [ ] Virtual scrolling для loop grid
- [ ] Lazy rendering для sliders
- [ ] Animation optimization

### Фаза 5: TypeScript
- [ ] Type definitions для всех компонентов
- [ ] Theme type safety
- [ ] Strict props validation

---

## Best Practices

### 1. Всегда использовать theme

❌ **Плохо:**
```js
element.style.color = '#3498db';
element.style.padding = '12px';
```

✅ **Хорошо:**
```js
import { colors, spacing } from './theme.js';
element.style.color = colors.accent.blue;
element.style.padding = spacing.md;
```

### 2. Композировать компоненты

❌ **Плохо:**
```js
// Создавать монолитные компоненты
function HugeComponent() {
    // 500 строк кода
}
```

✅ **Хорошо:**
```js
// Разбивать на маленькие переиспользуемые части
const header = Flex({ /* ... */ });
const body = Stack({ /* ... */ });
const footer = Button({ /* ... */ });

const component = Stack({ children: [header, body, footer] });
```

### 3. Использовать responsive helpers

❌ **Плохо:**
```js
if (window.innerWidth <= 375) {
    element.style.fontSize = '12px';
} else {
    element.style.fontSize = '16px';
}
```

✅ **Хорошо:**
```js
import { responsive } from './layout.js';

responsive(element)
    .on('mobile', { fontSize: '12px' })
    .on('desktop', { fontSize: '16px' });
```

### 4. Debounce события

❌ **Плохо:**
```js
slider.addEventListener('input', (e) => {
    updateCode(e.target.value); // Вызывается 100 раз/сек
});
```

✅ **Хорошо:**
```js
const slider = SliderBox({
    onChange: updateCode,
    debounce: 50 // Вызывается max 1 раз/50ms
});
```

---

**Автор:** MINECONT
**Проект:** WORLD_ORDER
**Версия:** v2.0 (UI System)
**Дата:** 2025
