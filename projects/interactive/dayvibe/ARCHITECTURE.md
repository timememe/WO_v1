# DAYVIBE - Architecture Overview

## Project Summary
DAYVIBE - AI-powered live coding music interface built on Strudel (TidalCycles for JavaScript). Enables real-time music creation with AI generation, interactive parameter control, and loop management.

## Tech Stack
- **Engine**: Strudel (@strudel/web) - live coding pattern language
- **AI Backend**: WO Server v1 (Render) - Claude API integration for code generation
- **Frontend**: Vanilla JS + CSS (no frameworks)
- **Samples**: Dirt-Samples, Roland TR-808/909 drum machines

---

## File Structure

```
dayvibe/
├── dayvibe.html          # UI structure, containers, buttons
├── dayvibe.css           # Styles, responsive design, animations
├── dayvibe.js            # Core logic (all features)
└── ARCHITECTURE.md       # This file
```

---

## Core Architecture

### 1. State Management
**Location**: `dayvibe.js` lines 1-16

Global state variables:
```javascript
// Playback state
isPlaying, animationFrame, repl, currentPattern, scheduler, audioContext

// Loop management
loops[], currentLoopIndex, MAX_LOOPS = 8

// Transition control
isTransitioning

// UI state
currentAIMode, savedCode, originalLoopCode

// Sliders state
codeSliders[], slidersEnabled, isUpdatingSlider
```

### 2. Module Breakdown

#### A. Strudel Integration
**Lines**: 18-135
**Purpose**: Initialize Strudel engine, load samples, create REPL wrapper

**Key Functions**:
- `initDayvibe()` - async initialization, sample loading
- `repl.evaluate(code)` - execute Strudel code
- `repl.stop()` - stop playback via scheduler

**Sample Banks**:
- Dirt-Samples (TidalCycles defaults)
- Roland TR-909 (bd, sd, hh, oh, cp)
- Roland TR-808 (bd, sd, hh, oh, cp)

**Patches**:
- `.fade()` → `.xfade()` fix for AI-generated code compatibility

---

#### B. Visualizer
**Lines**: 137-171
**Purpose**: Background audio visualizer (32 bars)

**Functions**:
- `createVisualizer()` - generate 32 bar elements
- `animateVisualizer()` - RAF loop, random heights
- `stopVisualizer()` - cancel RAF, reset bars

**Design**: Positioned as backdrop (z-index: 0) with low opacity (0.25) and blur

---

#### C. Loop Management System
**Lines**: 173-423
**Purpose**: CRUD operations for 8 loop slots

**Data Structure**:
```javascript
loops = [
  { code: "s('bd sd')", name: "Loop 1" },
  ...
]
```

**Key Functions**:
- `updateLoopsGrid()` - render 8 tiles with controls
- `addLoop()` / `deleteLoop(index)` - CRUD
- `moveLoopUp/Down(index)` - reordering
- `switchToLoop(index)` - cycle-synchronized switching
- `nextLoop()` / `prevLoop()` - navigation

**Features**:
- Visual states: empty, active, playing
- Mini controls: delete (×), move up (▲), move down (▼)
- Click tile to switch
- Auto-updates AI button states (continue/transition availability)

---

#### D. Playback Control
**Lines**: 425-637
**Purpose**: Play/stop with robust audio cleanup

**Key Functions**:
- `playCode()` - evaluate code, start visualizer, auto-create first loop
- `stopCode()` - multi-layer stop (pattern, scheduler, hush, panic)
- `killAllAudioSources()` - emergency audio cleanup
- `updateStatus(text, playing)` - UI sync, button states

**Edge Cases Handled**:
- AudioContext resume from suspended state
- Scheduler cleanup before new playback
- Live mode indicator (🔴 LIVE) during playback
- First-play auto-loop creation

---

#### E. AI Generation System
**Lines**: 661-1448
**Purpose**: 4 AI modes with musical context awareness

##### Mode System
**Lines**: 671-724

**Modes**:
1. **normal** - code editor, edit/update/sliders buttons
2. **generate** - blank prompt for new loop
3. **edit** - modify current loop with instructions
4. **continue** - evolve current loop (BPM/sample aware)
5. **transition** - smooth transition between 2 loops
6. **sliders** - grid view of parameter controls

**Mode Switching**:
- `setEditorMode(mode, title, placeholder)` - central mode controller
- Shows/hides: textarea, sliders grid, buttons
- Updates editor title and container data-mode attribute

##### AI Endpoints
**Base URL**: `https://wo-server-v1.onrender.com/api/`

| Mode | Endpoint | Input | Context |
|------|----------|-------|---------|
| Generate | `/generate-strudel-script` | prompt | None |
| Edit | `/edit-strudel-loop` | prompt, currentLoop | Musical context |
| Continue | `/generate-strudel-continuation` | prompt, previousLoop | Musical context |
| Transition | `/generate-strudel-transition` | fromLoop, toLoop, context | Both loops analyzed |

##### Musical Context Analysis
**Lines**: 1258-1359

`analyzeMusicalContext(code)` extracts:
- **BPM**: from `.speed()`, `.fast()`, `.slow()` modifiers
- **Tempo**: slow/normal/fast classification
- **Samples**: extracted from `s("...")` patterns
- **Complexity**: method count → simple/medium/complex
- **Effects**: reverb, delay, filter, dynamics detection
- **Structure**: euclidean, rhythmic, basic patterns

Used to build enhanced prompts: `[Context: BPM:140 | Samples: bd, sd | Complexity: medium]`

##### AI Functions
- `openGenerateMode()` - blank slate generation
- `openEditMode()` - edit with context preservation
- `openContinueMode()` - evolve with BPM/sample matching
- `openTransitionMode()` - dual-loop selectors, context diff
- `executeAIGeneration()` - routes to correct generator
- `addGeneratedLoop()` - adds to loops array, auto-switches to new loop
- `cancelAIMode()` - returns to normal mode (preserves code in sliders mode)

---

#### F. Loop Update & Live Reload
**Lines**: 857-973
**Purpose**: Track changes, update loops, live coding during playback

**Functions**:
- `updateCurrentLoop()` - save edited loop, mark as "(edited)"
- `checkEditorChanges()` - show/hide Update button based on code diff
- `saveOriginalCode()` - snapshot for comparison
- `setupLiveReload()` - debounced input listener (500ms)
- `liveReloadCode()` - apply changes during playback without stop

**Live Reload Conditions**:
- Only when `isPlaying && currentLoopIndex >= 0 && currentAIMode === 'normal'`
- Debounced 500ms to avoid rapid re-evaluation
- Updates loop in array automatically
- Errors logged but don't interrupt playback

---

#### G. Interactive Sliders System
**Lines**: 1450-1822
**Purpose**: Parse numeric parameters, create interactive controls

##### Parameter Parsing
**Function**: `parseNumbersFromCode(code)`
**Lines**: 1459-1560

**Logic**:
- Regex: `/([a-z_]\w*)\s*\(\s*(-?\d+\.?\d*)\s*\)/gi`
- Extracts: function name, value, position, line number
- Context-aware ranges:
  - `gain/volume/amp`: 0-2, step 0.05
  - `speed/fast/slow`: 0.1-4, step 0.1
  - `note/n`: 0-127, step 1
  - `pan`: -1 to 1, step 0.1
  - `cutoff/lpf/hpf`: 100-10000, step 100
  - `delay/room/size`: 0-1, step 0.05
- Stores: `uniqueId`, `matchIndex` for precise replacement

##### Sliders Grid Mode
**Lines**: 1565-1687

**Structure**:
```
┌─────────────────────────────────────┐
│ s("bd sd hh sd").gain(0.8)          │ ← Line header (code preview)
├─────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │gain  │ │speed │ │room  │         │ ← Sliders grid
│ │ 0.80 │ │ 1.00 │ │ 0.30 │         │
│ │━━●━━ │ │━━●━━ │ │━━●━━ │         │
│ └──────┘ └──────┘ └──────┘         │
└─────────────────────────────────────┘
```

**Functions**:
- `openSlidersMode()` - switch to sliders grid view
- `renderSlidersGrid()` - group sliders by line, create grid layout
- `updateCodeWithSliderInGrid(index, value)` - update code, re-render grid
- `updateSlidersButtonVisibility()` - show button only if params exist

**Grid Layout**:
- CSS Grid: `repeat(auto-fill, minmax(120px, 1fr))`
- Scrollable container (max-height: 400px)
- Grouped by code line with preview header
- Label + value on same line above slider

##### Code Update Logic
**Lines**: 1724-1818

**Challenge**: Multiple params with same name on one line
**Solution**: Match by `matchIndex` (character position)

**Process**:
1. Parse line to find all matches
2. Locate target match by stored position
3. Replace only that specific occurrence
4. Update textarea + current loop
5. Trigger live reload if playing
6. Re-render grid with debounce (200ms)

**Concurrency Control**:
- `isUpdatingSlider` flag prevents race conditions
- `sliderUpdateTimeout` debounces re-renders

---

#### H. Hotkeys & Event Listeners
**Lines**: 1756-1820

**Hotkeys**:
- `Ctrl+Enter` - Play
- `Ctrl+.` - Stop
- `Ctrl+Shift+S` - Toggle sliders (legacy, now uses grid mode)

**Input Listeners**:
- Code editor input → `checkEditorChanges()` + slider re-render (300ms debounce)
- Code editor scroll → slider position update
- Window resize → slider re-render

---

## UI Architecture

### HTML Structure (`dayvibe.html`)

```
app-wrapper (9:16 container)
├── visualizer-bg (32 bars, z-index: 0)
└── container (scrollable, z-index: 1)
    ├── header
    │   ├── header-left (title + subtitle)
    │   └── header-right (status indicator + text)
    ├── loops-container
    │   ├── loops-header
    │   └── loops-grid (8 tiles)
    ├── controls-wrapper
    │   ├── compact-controls (playback + switchloop buttons)
    │   └── ai-tile (3 AI buttons)
    └── editor-container [data-mode]
        ├── editor-header (title + "Strudel" badge)
        ├── textarea#codeEditor
        ├── sliders-grid-view (hidden by default)
        │   └── sliders-grid-content
        ├── editor-status (for transition selectors, messages)
        └── editor-footer (action buttons)
```

### CSS Architecture (`dayvibe.css`)

**Design System**:
- Base: Dark theme (blacks, grays)
- Accents: Blue (#3498db), Red (#e74c3c), Green (#16a085), Purple (#8e44ad)
- Font: Press Start 2P (pixel font) for headers, Courier New for code
- Layout: Mobile-first, 9:16 aspect ratio on mobile, max 800px height on desktop

**Key Patterns**:
- Semi-transparent blocks: `rgba(13, 17, 23, 0.92) + backdrop-filter: blur(4px)`
- Gradient buttons: 135deg linear gradients with hover lift effect
- Compact controls: 36×36px icon buttons (28×28px on ≤375px screens)
- Responsive grid: CSS Grid with `auto-fill, minmax(120px, 1fr)`

**Breakpoints**:
- `768px+` - Desktop (9:16 container, border, shadow)
- `600px-767px` - Tablet tweaks
- `375px and below` - Small screen optimizations (iPhone SE)

---

## Data Flow Diagrams

### Loop Lifecycle
```
[User] → Generate/Continue → [AI Server] → [addGeneratedLoop]
    → loops.push() → updateLoopsGrid() → switchToLoop(newIndex)
    → saveOriginalCode() → checkEditorChanges()

[User] → Edit code → checkEditorChanges() → Show Update button
    → [User clicks Update] → updateCurrentLoop() → loops[i].code = newCode
    → (if playing) switchToLoop(i) → repl.evaluate()
```

### Playback Flow
```
[User] → Play → playCode()
    ├─→ Create first loop if empty
    ├─→ scheduler.stop() → hush() → wait 50ms
    ├─→ audioContext.resume()
    ├─→ scheduler.start()
    ├─→ repl.evaluate(code) → currentPattern
    └─→ animateVisualizer()

[User] → Stop → stopCode()
    ├─→ isPlaying = false
    ├─→ stopVisualizer()
    ├─→ currentPattern.stop()
    ├─→ killAllAudioSources() → cyclist.stop() → scheduler.stop()
    └─→ hush()
```

### Sliders Flow
```
[User] → Click Sliders button → openSlidersMode()
    └─→ setEditorMode('sliders') → Hide textarea, show grid

renderSlidersGrid()
    ├─→ parseNumbersFromCode() → codeSliders[]
    ├─→ Group by line number
    └─→ Render: line headers + slider boxes

[User] → Move slider → input event (50ms debounce)
    └─→ updateCodeWithSliderInGrid(index, newValue)
        ├─→ Find target match by matchIndex
        ├─→ Replace in line → textarea.value = newCode
        ├─→ loops[currentLoopIndex].code = newCode
        ├─→ (if playing) liveReloadCode() (150ms debounce)
        └─→ renderSlidersGrid() (200ms debounce)
```

### AI Generation Flow
```
[User] → Click AI button → open{Mode}Mode()
    └─→ setEditorMode(mode, title, placeholder)
        └─→ Show generate + cancel buttons

[User] → Enter prompt → Click Generate → executeAIGeneration()
    └─→ Route to correct function (generate/edit/continue/transition)
        ├─→ analyzeMusicalContext(currentLoop) → extract BPM/samples/effects
        ├─→ buildContextualPrompt(userPrompt, context)
        ├─→ POST to API endpoint
        └─→ codeEditor.value = response.code
            └─→ Show "Add to Loops" button

[User] → Add to Loops → addGeneratedLoop()
    ├─→ loops.push({ code, name })
    ├─→ updateLoopsGrid()
    ├─→ cancelAIMode() → return to normal
    └─→ switchToLoop(newIndex) → auto-select new loop
```

---

## Modularity Roadmap

### Current State: Monolithic
- All logic in one 1820-line file
- No separation of concerns
- Hard to test individual features

### Future Modular Structure

```
dayvibe/
├── index.html
├── styles/
│   ├── base.css           # Reset, typography, colors
│   ├── layout.css         # Grid, containers, responsive
│   ├── components.css     # Buttons, tiles, sliders
│   └── animations.css     # Transitions, visualizer
├── modules/
│   ├── core/
│   │   ├── strudel.js     # Init, REPL wrapper
│   │   ├── state.js       # Global state management
│   │   └── utils.js       # Helpers, debounce, etc.
│   ├── audio/
│   │   ├── playback.js    # Play/stop control
│   │   ├── scheduler.js   # Cycle sync, transitions
│   │   └── visualizer.js  # Audio visualization
│   ├── loops/
│   │   ├── manager.js     # CRUD, array operations
│   │   ├── ui.js          # Grid rendering
│   │   └── navigation.js  # Next/prev/switch
│   ├── ai/
│   │   ├── api.js         # Fetch wrappers
│   │   ├── context.js     # Musical analysis
│   │   ├── generators.js  # Generate/edit/continue/transition
│   │   └── modes.js       # Mode switching logic
│   ├── editor/
│   │   ├── modes.js       # Mode state management
│   │   ├── liveReload.js  # Input tracking, debounce
│   │   └── updates.js     # Check changes, save
│   └── sliders/
│       ├── parser.js      # parseNumbersFromCode
│       ├── grid.js        # renderSlidersGrid
│       └── updater.js     # updateCodeWithSlider
├── app.js                 # Main entry, init sequence
└── config.js              # API URLs, constants
```

### Benefits of Modularization
1. **Testability** - Unit test each module independently
2. **Maintainability** - Find bugs faster, clearer responsibilities
3. **Reusability** - Share modules between projects
4. **Team Development** - Multiple devs work on separate modules
5. **Code Splitting** - Lazy load features, faster initial load
6. **Type Safety** - Easier to add TypeScript later

### Migration Strategy
1. **Phase 1**: Extract utilities (no dependencies)
   - `utils.js` - debounce, regex helpers
   - `config.js` - constants, API URLs

2. **Phase 2**: Extract pure functions
   - `parser.js` - parseNumbersFromCode
   - `context.js` - analyzeMusicalContext

3. **Phase 3**: Extract UI modules (depend on DOM)
   - `visualizer.js` - self-contained animation
   - `grid.js` - loops grid rendering

4. **Phase 4**: Extract core logic (depends on state)
   - `manager.js` - loop CRUD with state
   - `playback.js` - play/stop with scheduler

5. **Phase 5**: Centralize state management
   - Consider Redux/Zustand for predictable state
   - Or custom event bus for pub/sub

---

## Performance Considerations

### Current Optimizations
- **Debouncing**:
  - Live reload: 500ms
  - Slider updates: 50ms input → 200ms re-render
  - Slider render: 300ms on code input
- **RAF** for visualizer (not setInterval)
- **Lazy parsing** - sliders only parsed when needed
- **Minimal re-renders** - targeted DOM updates

### Known Bottlenecks
- Regex parsing on every slider move (could cache)
- Full grid re-render on every slider change (could update single slider)
- No virtualization (OK for 8 loops, but limits scalability)

### Future Improvements
1. Virtual scrolling for loop grid (if MAX_LOOPS increases)
2. Web Workers for code parsing (offload main thread)
3. Canvas visualizer (faster than 32 DOM elements)
4. Service Worker for offline AI caching
5. IndexedDB for loop persistence

---

## Security & Error Handling

### Current Safeguards
- **Strudel sandbox** - code evaluated in isolated context
- **Error boundaries** - try/catch in critical paths (playback, AI, sliders)
- **Validation** - prompt length limits (300 chars), loop count limits (8)
- **Graceful degradation** - errors logged but don't crash app

### Potential Risks
- **XSS** - AI-generated code could contain malicious strings (low risk, code not eval'd as HTML)
- **API abuse** - no rate limiting on client side
- **State corruption** - concurrent slider updates mitigated with `isUpdatingSlider` flag

### Recommendations
1. Add rate limiting UI for AI requests
2. Sanitize AI responses (strip unexpected code patterns)
3. Add Sentry/LogRocket for error tracking
4. Implement undo/redo for destructive operations

---

## Browser Compatibility

### Minimum Requirements
- ES6+ (async/await, arrow functions, destructuring)
- Web Audio API (for Strudel)
- CSS Grid + Flexbox
- `fetch` API
- `requestAnimationFrame`

### Tested Browsers
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ⚠️ (potential Web Audio issues)
- Edge 90+ ✅
- Mobile Safari iOS 14+ ⚠️ (requires user gesture for audio)

### Polyfills Needed for Older Browsers
- None currently (targets modern browsers only)

---

## Development Workflow

### Local Development
1. No build step required (vanilla JS)
2. Serve with any static server (e.g., `python -m http.server`)
3. Edit files → refresh browser

### Debugging
- Browser DevTools console for logs
- Strudel logs prefixed with emoji:
  - 🔧 Init/config
  - ✅ Success
  - ❌ Error
  - ⚠️ Warning
  - 🎵 Playback
  - 🎚️ Sliders
  - 🚀 Loop switching

### Testing Strategy (Future)
- **Unit tests**: Parser, context analyzer (pure functions)
- **Integration tests**: Loop CRUD, mode switching
- **E2E tests**: Playwright for full user flows
- **Audio tests**: Mock Strudel REPL, assert patterns

---

## API Documentation

### WO Server Endpoints

#### 1. Generate Loop
```http
POST https://wo-server-v1.onrender.com/api/generate-strudel-script
Content-Type: application/json

{
  "prompt": "Fast techno beat with 909 kick"
}

Response:
{
  "code": "s(\"rolandtr909bd*4, rolandtr909sd(3,8)\").fast(1.5)"
}
```

#### 2. Edit Loop
```http
POST https://wo-server-v1.onrender.com/api/edit-strudel-loop
Content-Type: application/json

{
  "prompt": "[Context: BPM:120 | Samples: bd, sd | Complexity: simple]\n\nUser request: Add reverb",
  "currentLoop": "s(\"bd sd\")"
}

Response:
{
  "code": "s(\"bd sd\").room(0.5)"
}
```

#### 3. Continue Loop
```http
POST https://wo-server-v1.onrender.com/api/generate-strudel-continuation
Content-Type: application/json

{
  "prompt": "[Context: BPM:140 | Using samples: bd, sd, hh | Complexity: medium]\n\nUser request: Add more hi-hats",
  "previousLoop": "s(\"bd sd\").fast(1.4)"
}

Response:
{
  "code": "s(\"bd sd hh*4\").fast(1.4)"
}
```

#### 4. Make Transition
```http
POST https://wo-server-v1.onrender.com/api/generate-strudel-transition
Content-Type: application/json

{
  "fromLoop": "s(\"bd sd\")",
  "toLoop": "s(\"rolandtr808bd*2, rolandtr808sd(3,8)\")",
  "context": "BPM: 120 → 140 | Tempo: normal → fast | Samples: bd, sd → rolandtr808bd, rolandtr808sd | Style: simple → medium"
}

Response:
{
  "code": "xfade(s(\"bd sd\"), s(\"rolandtr808bd*2, rolandtr808sd(3,8)\").fast(1.2))"
}
```

---

## Known Issues & TODOs

### Bugs
- [ ] Transition button doesn't validate same-loop selection properly
- [ ] Live reload can stutter on rapid edits (debounce too short?)
- [ ] Sliders don't appear on first loop load (need to edit code first)

### Features
- [ ] Export loops as JSON (save/load sessions)
- [ ] Undo/redo for loop edits
- [ ] Loop tagging/search
- [ ] BPM detection from audio (not just code)
- [ ] MIDI controller support for sliders
- [ ] Collaborative editing (WebRTC)
- [ ] Audio recording/export (WAV/MP3)

### UX Improvements
- [ ] Onboarding tutorial
- [ ] Keyboard shortcuts overlay (help menu)
- [ ] Dark/light theme toggle
- [ ] Accessibility audit (screen readers, keyboard nav)
- [ ] Mobile gesture controls (swipe to switch loops)

### Performance
- [ ] Virtualize loop grid (if > 8 loops)
- [ ] Memoize context analysis (cache per code hash)
- [ ] Canvas visualizer (replace DOM bars)

### Architecture
- [ ] Modularize codebase (see Modularity Roadmap)
- [ ] Add TypeScript (gradual migration)
- [ ] State management library (Redux/Zustand)
- [ ] Unit tests (Jest + Testing Library)

---

## Contributing Guidelines (Future)

### Code Style
- ES6+ syntax
- 2-space indentation
- Semicolons required
- camelCase for functions/variables
- UPPER_SNAKE_CASE for constants
- Meaningful names (no single-letter except loop indices)

### Commit Messages
- Format: `[module] verb: description`
- Examples:
  - `[loops] fix: delete button not removing from array`
  - `[ai] feat: add temperature control for generation`
  - `[sliders] refactor: extract parsing logic to utils`

### Pull Request Process
1. Fork repo
2. Create feature branch (`feature/slider-presets`)
3. Implement + test locally
4. Update ARCHITECTURE.md if adding new module
5. Submit PR with description + screenshots/demo

---

## Version History

### v1.0 (Current)
- ✅ Strudel integration with sample loading
- ✅ 8-loop management with CRUD
- ✅ AI generation (4 modes)
- ✅ Musical context awareness
- ✅ Interactive sliders grid mode
- ✅ Live reload during playback
- ✅ Cycle-synced loop switching
- ✅ Background visualizer
- ✅ Mobile-responsive design (9:16)

### v0.5 (Previous - before sliders grid)
- ✅ Basic AI generation
- ✅ Loop management
- ✅ Popup sliders panel (deprecated)

---

## License
TBD

## Contact
Project: WORLD_ORDER
Developer: MINECONT
