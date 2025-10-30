// DAYVIBE - Live Coding Music with Strudel
// State
let isPlaying = false;
let animationFrame = null;
let repl = null;
let currentPattern = null;
let panicTimeout = null;
let scheduler = null;
let audioContext = null;
let activeNodes = []; // Отслеживаем все активные аудио ноды
let isTransitioning = false; // Флаг для предотвращения двойных переключений

// Loops management
let loops = []; // Массив лупов { code: string, name: string }
let currentLoopIndex = -1; // Индекс активного лупа
const MAX_LOOPS = 8;

// Инициализация Strudel через @strudel/web
async function initDayvibe() {
    try {
        // Ждем пока загрузится initStrudel из @strudel/web
        if (typeof window.initStrudel === 'undefined') {
            console.warn('⏳ Waiting for Strudel to load...');
            setTimeout(initDayvibe, 100);
            return;
        }

        console.log('🔧 Initializing Strudel with @strudel/web...');

        // Вызываем глобальную initStrudel() из @strudel/web с загрузкой сэмплов
        await window.initStrudel({
            prebake: async () => {
                // Загружаем базовые Dirt-Samples
                await samples('github:tidalcycles/Dirt-Samples');
                console.log('✅ Dirt-Samples loaded');

                // Загружаем драм-машины вручную (нет strudel.json в репо)
                const drumMachinesBaseUrl = 'https://raw.githubusercontent.com/ritchse/tidal-drum-machines/main/machines/';

                // Roland TR-909
                await samples({
                    rolandtr909bd: ['RolandTR909/rolandtr909-bd/Bassdrum-01.wav', 'RolandTR909/rolandtr909-bd/Bassdrum-02.wav', 'RolandTR909/rolandtr909-bd/Bassdrum-03.wav', 'RolandTR909/rolandtr909-bd/Bassdrum-04.wav'],
                    rolandtr909sd: ['RolandTR909/rolandtr909-sd/sd01.wav', 'RolandTR909/rolandtr909-sd/sd02.wav', 'RolandTR909/rolandtr909-sd/sd03.wav'],
                    rolandtr909hh: ['RolandTR909/rolandtr909-hh/hh01.wav', 'RolandTR909/rolandtr909-hh/hh02.wav', 'RolandTR909/rolandtr909-hh/hh03.wav'],
                    rolandtr909oh: ['RolandTR909/rolandtr909-oh/oh01.wav', 'RolandTR909/rolandtr909-oh/oh02.wav', 'RolandTR909/rolandtr909-oh/oh03.wav'],
                    rolandtr909cp: ['RolandTR909/rolandtr909-cp/cp01.wav', 'RolandTR909/rolandtr909-cp/cp02.wav', 'RolandTR909/rolandtr909-cp/cp03.wav'],
                }, drumMachinesBaseUrl);
                console.log('✅ Roland TR-909 loaded');

                // Roland TR-808
                await samples({
                    rolandtr808bd: ['RolandTR808/rolandtr808-bd/BD0000.WAV', 'RolandTR808/rolandtr808-bd/BD2500.WAV', 'RolandTR808/rolandtr808-bd/BD5000.WAV'],
                    rolandtr808sd: ['RolandTR808/rolandtr808-sd/SD0000.WAV', 'RolandTR808/rolandtr808-sd/SD0010.WAV', 'RolandTR808/rolandtr808-sd/SD0025.WAV'],
                    rolandtr808hh: ['RolandTR808/rolandtr808-hh/CH.WAV', 'RolandTR808/rolandtr808-hh/CHH.WAV'],
                    rolandtr808oh: ['RolandTR808/rolandtr808-oh/OH00.WAV', 'RolandTR808/rolandtr808-oh/OH10.WAV', 'RolandTR808/rolandtr808-oh/OH25.WAV'],
                    rolandtr808cp: ['RolandTR808/rolandtr808-cp/cp0.wav', 'RolandTR808/rolandtr808-cp/cp1.wav', 'RolandTR808/rolandtr808-cp/cp2.wav'],
                }, drumMachinesBaseUrl);
                console.log('✅ Roland TR-808 loaded');
            },
        });

        console.log('✅ Strudel initialized with samples!');
        console.log('🔍 Functions available:');
        console.log('- sound:', typeof sound);
        console.log('- note:', typeof note);
        console.log('- evaluate:', typeof evaluate);
        console.log('- hush:', typeof hush);

        // Сохраняем ссылку на scheduler для более надежной остановки
        if (typeof getScheduler === 'function') {
            scheduler = getScheduler();
            console.log('✅ Scheduler ref saved:', scheduler);

            // Сохраняем ссылку на аудио-контекст
            if (scheduler.audioContext) {
                audioContext = scheduler.audioContext;
                console.log('✅ AudioContext ref saved:', audioContext.state);
            }
        }

        // Создаем простую обертку для REPL
        repl = {
            evaluate: async (code) => {
                try {
                    console.log('🎵 Evaluating code with @strudel/web...');

                    // ПАТЧ: AI генерирует некорректный код с .fade(). Заменяем его на рабочий xfade().
                    let patchedCode = code;
                    if (patchedCode.includes('.fade(')) {
                        console.warn('⚠️ Обнаружен .fade(). Применяю патч для совместимости.');
                        // Заменяем неверный паттерн "stack(...).fade(...)" на правильный "xfade(...)"
                        patchedCode = patchedCode.replace(/stack\s*\(([\s\S]*)\)\s*\.fade\s*\([^)]*\)/g, 'xfade($1)');
                        console.log('✨ Исправленный код:', patchedCode);
                    }

                    // Используем глобальную evaluate() из @strudel/web с исправленным кодом
                    const result = await evaluate(patchedCode);
                    console.log('✅ Code evaluated, result:', result);

                    return result;
                } catch (err) {
                    console.error('❌ Eval error:', err);
                    throw err;
                }
            },
            stop: () => {
                try {
                    console.log('⏹️ REPL stop called...');

                    // Используем scheduler.stop() вместо hush()
                    if (scheduler && typeof scheduler.stop === 'function') {
                        scheduler.stop();
                        console.log('✅ Scheduler stopped!');
                    } else if (typeof hush === 'function') {
                        hush();
                        console.log('✅ Hush called!');
                    }
                } catch (err) {
                    console.error('❌ Stop error:', err);
                }
            }
        };

        updateStatus('Ready', false);
        console.log('✅ DAYVIBE ready to rock! 🎵');

        // Подключаем live reload mode
        setupLiveReload();
        console.log('✅ Live reload mode enabled (active during playback)');
    } catch (error) {
        console.error('❌ Failed to initialize Strudel:', error);
        updateStatus('Error', false);
        alert('Ошибка загрузки Strudel. Попробуй обновить страницу.');
    }
}

// Создание визуализатора
function createVisualizer() {
    const visualizer = document.getElementById('visualizer');
    for (let i = 0; i < 32; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        visualizer.appendChild(bar);
    }
}

// Анимация визуализатора
function animateVisualizer() {
    if (!isPlaying) return;

    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach(bar => {
        const height = Math.random() * 90 + 10;
        bar.style.height = height + '%';
    });

    animationFrame = requestAnimationFrame(animateVisualizer);
}

// Остановка визуализатора
function stopVisualizer() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach(bar => {
        bar.style.height = '10%';
    });
}

// Обновление грида лупов
function updateLoopsGrid() {
    const grid = document.getElementById('loopsGrid');
    grid.innerHTML = '';

    for (let i = 0; i < MAX_LOOPS; i++) {
        const tile = document.createElement('div');
        tile.className = 'loop-tile';

        if (loops[i]) {
            tile.classList.add('active');
            if (i === currentLoopIndex) {
                tile.classList.add('playing');
            }

            const loopName = document.createElement('div');
            loopName.className = 'loop-name';
            loopName.textContent = loops[i].name || `Loop ${i + 1}`;
            tile.appendChild(loopName);

            // Кнопки управления лупом
            const controls = document.createElement('div');
            controls.className = 'loop-controls-mini';

            // Кнопка удаления
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'loop-btn-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete loop';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteLoop(i);
            };

            // Кнопка вверх
            const upBtn = document.createElement('button');
            upBtn.className = 'loop-btn-move';
            upBtn.innerHTML = '▲';
            upBtn.title = 'Move up';
            upBtn.disabled = i === 0;
            upBtn.onclick = (e) => {
                e.stopPropagation();
                moveLoopUp(i);
            };

            // Кнопка вниз
            const downBtn = document.createElement('button');
            downBtn.className = 'loop-btn-move';
            downBtn.innerHTML = '▼';
            downBtn.title = 'Move down';
            downBtn.disabled = i === loops.length - 1;
            downBtn.onclick = (e) => {
                e.stopPropagation();
                moveLoopDown(i);
            };

            controls.appendChild(upBtn);
            controls.appendChild(downBtn);
            controls.appendChild(deleteBtn);
            tile.appendChild(controls);

            // Клик по тайлу для переключения
            tile.onclick = (e) => {
                if (!e.target.classList.contains('loop-btn-delete') &&
                    !e.target.classList.contains('loop-btn-move')) {
                    switchToLoop(i);
                }
            };
        } else {
            tile.classList.add('empty');
            const emptyText = document.createElement('div');
            emptyText.className = 'loop-empty-text';
            emptyText.textContent = '+';
            tile.appendChild(emptyText);
        }

        grid.appendChild(tile);
    }

    // Обновляем состояние AI кнопок
    updateAIButtonsState();
}

// Обновление состояния AI кнопок
function updateAIButtonsState() {
    const transitionBtn = document.getElementById('transitionBtn');
    const continueBtn = document.getElementById('continueBtn');

    // Transition кнопка активна только если есть минимум 2 лупа
    transitionBtn.disabled = loops.length < 2;

    // Continue кнопка активна если есть хотя бы 1 луп
    continueBtn.disabled = loops.length < 1;
}

// Удалить луп из очереди
function deleteLoop(index) {
    if (index < 0 || index >= loops.length) {
        return;
    }

    const loopName = loops[index].name || `Loop ${index + 1}`;

    if (!confirm(`Удалить "${loopName}"?`)) {
        return;
    }

    // Удаляем луп из массива
    loops.splice(index, 1);

    // Корректируем currentLoopIndex
    if (currentLoopIndex === index) {
        // Если удаляем активный луп
        if (loops.length === 0) {
            currentLoopIndex = -1;
            stopCode(); // Останавливаем воспроизведение
        } else if (currentLoopIndex >= loops.length) {
            currentLoopIndex = loops.length - 1;
        }
        // Переключаемся на новый текущий луп если есть
        if (currentLoopIndex >= 0 && isPlaying) {
            switchToLoop(currentLoopIndex);
        }
    } else if (currentLoopIndex > index) {
        // Если удаляем луп перед текущим, сдвигаем индекс
        currentLoopIndex--;
    }

    updateLoopsGrid();
    console.log(`🗑️ Удален луп ${index}: ${loopName}`);
}

// Переместить луп вверх
function moveLoopUp(index) {
    if (index <= 0 || index >= loops.length) {
        return;
    }

    // Меняем местами с предыдущим
    [loops[index - 1], loops[index]] = [loops[index], loops[index - 1]];

    // Корректируем currentLoopIndex
    if (currentLoopIndex === index) {
        currentLoopIndex = index - 1;
    } else if (currentLoopIndex === index - 1) {
        currentLoopIndex = index;
    }

    updateLoopsGrid();
    console.log(`⬆️ Луп ${index} перемещен вверх`);
}

// Переместить луп вниз
function moveLoopDown(index) {
    if (index < 0 || index >= loops.length - 1) {
        return;
    }

    // Меняем местами со следующим
    [loops[index], loops[index + 1]] = [loops[index + 1], loops[index]];

    // Корректируем currentLoopIndex
    if (currentLoopIndex === index) {
        currentLoopIndex = index + 1;
    } else if (currentLoopIndex === index + 1) {
        currentLoopIndex = index;
    }

    updateLoopsGrid();
    console.log(`⬇️ Луп ${index} перемещен вниз`);
}

// Добавить луп в очередь
function addLoop() {
    if (loops.length >= MAX_LOOPS) {
        alert('Максимум 8 лупов!');
        return;
    }

    const code = document.getElementById('codeEditor').value.trim();
    if (!code) {
        alert('Напиши код для лупа!');
        return;
    }

    loops.push({
        code: code,
        name: `Loop ${loops.length + 1}`
    });

    updateLoopsGrid();
}

// Переключиться на следующий луп
async function nextLoop() {
    if (loops.length < 2) return;
    const nextIndex = (currentLoopIndex + 1) % loops.length;
    await switchToLoop(nextIndex);
}

// Переключиться на предыдущий луп
async function prevLoop() {
    if (loops.length < 2) return;
    let prevIndex = currentLoopIndex - 1;
    if (prevIndex < 0) {
        prevIndex = loops.length - 1;
    }
    await switchToLoop(prevIndex);
}

// Переключиться на конкретный луп с переходом по циклу
async function switchToLoop(index) {
    // Не переключаться, если это тот же луп, идет переход или лупа не существует
    if (!loops[index] || isTransitioning || index === currentLoopIndex) {
        return;
    }

    const performSwitch = async () => {
        console.log(`🚀 Switching to loop ${index + 1}`);
        currentLoopIndex = index;
        const loop = loops[index];
        document.getElementById('codeEditor').value = loop.code;

        // Сохраняем оригинальный код и проверяем состояние кнопки
        saveOriginalCode();
        checkEditorChanges();

        updateLoopsGrid();

        // Обновляем слайдеры для нового кода
        renderCodeSliders();

        if (isPlaying) {
            await playCode();
        }
    };

    // Если музыка играет и scheduler доступен, планируем переход
    if (isPlaying && scheduler && typeof scheduler.nextCycle === 'function') {
        isTransitioning = true;
        console.log(`⏳ Scheduling transition to loop ${index + 1} for next cycle...`);
        
        await scheduler.nextCycle();
        
        await performSwitch();
        isTransitioning = false;
    } else {
        // Иначе (если музыка не играет) переключаемся мгновенно
        await performSwitch();
    }
}

// Обновление статуса
function updateStatus(text, playing) {
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const editorTitle = document.getElementById('editorTitle');

    statusText.textContent = text;
    isPlaying = playing;

    if (playing) {
        statusIndicator.classList.add('active');
        statusIndicator.classList.remove('stopped');
        playBtn.disabled = true;
        stopBtn.disabled = false;

        // Показываем индикатор Live Mode
        if (currentLoopIndex >= 0 && currentAIMode === 'normal') {
            editorTitle.textContent = 'Code Editor 🔴 LIVE';
        }
    } else {
        statusIndicator.classList.remove('active');
        statusIndicator.classList.add('stopped');
        playBtn.disabled = false;
        stopBtn.disabled = true;

        // Убираем индикатор Live Mode
        if (currentAIMode === 'normal') {
            editorTitle.textContent = 'Code Editor';
        }
    }

    // Обновляем видимость кнопки Update Loop
    // (скрывается во время воспроизведения, т.к. работает live reload)
    checkEditorChanges();
}

// Воспроизведение кода
async function playCode() {
    const code = document.getElementById('codeEditor').value.trim();

    if (!code) {
        alert('Напиши код или загрузи пример!');
        return;
    }

    if (!repl) {
        alert('Strudel еще загружается... Подожди секунду.');
        return;
    }

    try {
        // Если это первый запуск и нет лупов - создаем первый луп
        if (loops.length === 0) {
            loops.push({
                code: code,
                name: 'Loop 1'
            });
            currentLoopIndex = 0;
            updateLoopsGrid();
        }

        console.log('▶ Playing code:', code);

        // ВАЖНО: Полностью останавливаем всё перед новым запуском
        console.log('🔧 Stopping any previous playback...');

        // Отменяем любые отложенные операции
        if (panicTimeout) {
            clearTimeout(panicTimeout);
            panicTimeout = null;
        }

        // Останавливаем предыдущий паттерн
        if (currentPattern && typeof currentPattern.stop === 'function') {
            currentPattern.stop();
        }

        // Останавливаем scheduler
        if (scheduler && typeof scheduler.stop === 'function') {
            scheduler.stop();
        }

        // Вызываем hush для очистки
        if (typeof hush === 'function') {
            hush();
        }

        // Небольшая задержка чтобы Strudel успел очиститься
        await new Promise(resolve => setTimeout(resolve, 50));

        // Убеждаемся что аудио-контекст активен (resume если был suspended)
        if (audioContext && audioContext.state === 'suspended') {
            console.log('🔧 Resuming audio context...');
            await audioContext.resume();
        }

        // Запускаем scheduler снова перед новым evaluate
        if (scheduler && typeof scheduler.start === 'function') {
            console.log('🔧 Starting scheduler...');
            scheduler.start();
        }

        updateStatus('Playing...', true);

        // Evaluate код через REPL
        currentPattern = await repl.evaluate(code);

        // Запуск визуализатора
        animateVisualizer();

        console.log('✅ Code executed successfully');
    } catch (error) {
        console.error('❌ Playback error:', error);
        updateStatus('Error', false);
        isPlaying = false;
        stopVisualizer();
        alert('Ошибка в коде:\n' + error.message);
    }
}

// Утилита: мгновенная остановка через правильный API Strudel
async function killAllAudioSources() {
    try {
        // Evaluate пустой код для триггера [cyclist] stop
        if (typeof evaluate === 'function') {
            try {
                await evaluate('silence');
            } catch (e) {
                // Silent fail
            }
        }

        // Прямой доступ к cyclist через window
        if (typeof window.cyclist !== 'undefined' && window.cyclist) {
            try {
                if (typeof window.cyclist.stop === 'function') {
                    window.cyclist.stop();
                }
            } catch (e) {
                // Silent fail
            }
        }

        // scheduler stop
        if (scheduler && typeof scheduler.stop === 'function') {
            scheduler.stop();
        }
    } catch (err) {
        console.error('❌ Stop failed:', err);
    }
}

// Остановка воспроизведения
async function stopCode() {
    try {
        // Отменяем любые отложенные операции
        if (panicTimeout) {
            clearTimeout(panicTimeout);
            panicTimeout = null;
        }

        // Очищаем UI и флаг
        isPlaying = false;
        stopVisualizer();

        // Очищаем ссылку на паттерн
        if (currentPattern) {
            try {
                if (typeof currentPattern.stop === 'function') {
                    currentPattern.stop();
                }
            } catch (e) {
                // Silent fail
            }
            currentPattern = null;
        }

        // Вызываем Strudel API для остановки
        await killAllAudioSources();

        // Дополнительно: hush() для полной очистки
        if (typeof hush === 'function') {
            hush();
        }

        // Обновляем UI статус
        updateStatus('Stopped', false);
    } catch (error) {
        console.error('❌ Stop error:', error);

        // Аварийная остановка
        try {
            if (currentPattern) {
                if (typeof currentPattern.stop === 'function') {
                    currentPattern.stop();
                }
                currentPattern = null;
            }

            if (typeof hush === 'function') {
                hush();
            }
        } catch (e) {
            console.error('❌ Emergency stop failed:', e);
        }

        // В любом случае обновляем UI
        isPlaying = false;
        updateStatus('Stopped', false);
        stopVisualizer();
    }
}

// Загрузка примера (можно вызвать из консоли)
function loadExample() {
    const exampleCode = `// DAYVIBE Example - Roland TR-909 Beat
s("rolandtr909bd rolandtr909sd rolandtr909hh rolandtr909sd")
  .gain(0.8)
  .speed(1.0)
  .room(0.3)
  .pan(0.0)

// Try also:
// s("rolandtr808bd*2, rolandtr808sd(3,8)")
// s("bd cp sd cp").speed("1 2 0.5 1.5")`;

    document.getElementById('codeEditor').value = exampleCode;

    // Рендерим слайдеры для примера
    renderCodeSliders();

    console.log('✅ Example code loaded! Try the sliders in the bottom-right corner.');
}

// AI Generation functions
// ВАЖНО: Это должен быть URL сервера на Render, а не статического сайта!
// Замени YOUR_SERVICE_NAME на имя твоего сервиса на Render
const API_URL = 'https://wo-server-v1.onrender.com/api/generate-strudel-script';

// === Editor AI Mode Management ===

let currentAIMode = 'normal'; // 'normal', 'generate', 'edit', 'continue', 'transition'
let savedCode = ''; // Сохраняем код перед входом в AI режим

function setEditorMode(mode, title, placeholder) {
    const container = document.getElementById('editorContainer');
    const editorTitle = document.getElementById('editorTitle');
    const codeEditor = document.getElementById('codeEditor');
    const editorStatus = document.getElementById('editorStatus');
    const generateBtn = document.getElementById('generateBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const editBtn = document.getElementById('editBtn');
    const addToLoopsBtn = document.getElementById('addToLoopsBtn');
    const updateBtn = document.getElementById('updateBtn');

    currentAIMode = mode;
    container.setAttribute('data-mode', mode);
    editorTitle.textContent = title;
    codeEditor.placeholder = placeholder;

    if (mode === 'normal') {
        // Обычный режим
        generateBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        editBtn.style.display = 'inline-block';
        addToLoopsBtn.style.display = 'none';
        editorStatus.classList.remove('active');
        // Update Loop кнопка контролируется checkEditorChanges()
        checkEditorChanges();
        // Включаем слайдеры
        renderCodeSliders();
    } else {
        // AI режим
        generateBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
        addToLoopsBtn.style.display = 'none';
        updateBtn.style.display = 'none'; // Скрываем в AI режиме
        // Скрываем слайдеры в AI режиме
        renderCodeSliders();
    }
}

function openGenerateMode() {
    savedCode = document.getElementById('codeEditor').value;
    document.getElementById('codeEditor').value = '';
    setEditorMode(
        'generate',
        '✨ AI Generate Loop',
        'Опиши что хочешь услышать...\n\nНапример:\n- Быстрый techno паттерн с 909 kick\n- Медленный ambient с pad звуками\n- Jungle breaks с басом'
    );
}

function openEditMode() {
    if (currentLoopIndex < 0) {
        alert('Сначала выбери луп для редактирования');
        return;
    }

    savedCode = document.getElementById('codeEditor').value;
    document.getElementById('codeEditor').value = '';
    setEditorMode(
        'edit',
        '✏️ AI Edit Loop',
        'Опиши что изменить в лупе...\n\nНапример:\n- Сделай медленнее\n- Добавь reverb\n- Замени kick на другой\n- Упрости ритм'
    );
}

function openContinueMode() {
    if (currentLoopIndex < 0) {
        alert('Сначала выбери луп для продолжения');
        return;
    }

    savedCode = document.getElementById('codeEditor').value;
    document.getElementById('codeEditor').value = '';
    setEditorMode(
        'continue',
        '➡️ AI Continue Loop',
        'Опиши как развить этот луп...\n\nНапример:\n- Добавь hi-hats и эволюционируй\n- Усложни ритм\n- Сделай более мелодичным'
    );
}

function openTransitionMode() {
    if (loops.length < 2) {
        alert('Нужно минимум 2 лупа для создания перехода');
        return;
    }

    savedCode = document.getElementById('codeEditor').value;

    // Для transition показываем селекторы
    let loopOptions = '';
    loops.forEach((loop, i) => {
        const loopName = loop.name || `Loop ${i + 1}`;
        loopOptions += `<option value="${i}">${loopName}</option>`;
    });

    const promptText = `From Loop: [выбери ниже]\nTo Loop: [выбери ниже]\n\nСоздаст плавный переход между выбранными лупами`;

    document.getElementById('codeEditor').value = promptText;
    document.getElementById('codeEditor').readOnly = true;

    setEditorMode(
        'transition',
        '🔄 AI Make Transition',
        'Transition mode'
    );

    // Добавляем селекторы в editorStatus
    const editorStatus = document.getElementById('editorStatus');
    editorStatus.innerHTML = `
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <select id="transitionFromLoop" style="padding: 8px; background: #0d1117; color: #c9d1d9; border: 2px solid #444; border-radius: 4px;">
                ${loopOptions}
            </select>
            <span style="color: #888;">→</span>
            <select id="transitionToLoop" style="padding: 8px; background: #0d1117; color: #c9d1d9; border: 2px solid #444; border-radius: 4px;">
                ${loopOptions}
            </select>
        </div>
    `;
    editorStatus.classList.add('active');

    // Устанавливаем значения по умолчанию
    setTimeout(() => {
        const fromSelect = document.getElementById('transitionFromLoop');
        const toSelect = document.getElementById('transitionToLoop');
        if (currentLoopIndex >= 0) {
            fromSelect.value = currentLoopIndex;
            toSelect.value = currentLoopIndex < loops.length - 1 ? currentLoopIndex + 1 : 0;
        }
    }, 0);
}

function cancelAIMode() {
    const codeEditor = document.getElementById('codeEditor');
    codeEditor.value = savedCode;
    codeEditor.readOnly = false;
    setEditorMode('normal', 'Code Editor', '// Напиши свой Strudel-паттерн или загрузи пример...\n// Нажми Play чтобы запустить!');
    savedCode = '';
}

async function executeAIGeneration() {
    const mode = currentAIMode;

    switch (mode) {
        case 'generate':
            await generateScript();
            break;
        case 'edit':
            await editLoop();
            break;
        case 'continue':
            await generateContinuation();
            break;
        case 'transition':
            await generateTransition();
            break;
    }
}

function addGeneratedLoop() {
    const codeEditor = document.getElementById('codeEditor');
    const code = codeEditor.value.trim();

    if (!code) {
        alert('Нет сгенерированного кода для добавления');
        return;
    }

    // Добавляем в loops
    loops.push({
        code: code,
        name: `AI Loop ${loops.length + 1}`
    });

    updateLoopsGrid();

    // Переходим в обычный режим, сохраняя код
    savedCode = code;
    cancelAIMode();

    // Обновляем отслеживание изменений
    saveOriginalCode();
    checkEditorChanges();

    console.log(`✅ Добавлен AI луп ${loops.length}`);
}

// === Update Current Loop ===

function updateCurrentLoop() {
    if (currentLoopIndex < 0) {
        alert('Сначала выбери луп для обновления');
        return;
    }

    const editor = document.getElementById('codeEditor');
    const code = editor.value.trim();

    if (!code) {
        alert('Редактор пустой');
        return;
    }

    // Обновляем код текущего лупа
    loops[currentLoopIndex].code = code;
    loops[currentLoopIndex].name = `Loop ${currentLoopIndex + 1} (edited)`;

    // Обновляем грид
    updateLoopsGrid();

    // Если луп играет - перезагружаем его
    if (isPlaying && currentLoopIndex >= 0) {
        switchToLoop(currentLoopIndex);
    }

    console.log(`✅ Loop ${currentLoopIndex + 1} updated`);

    // Сохраняем новый код как оригинальный и скрываем кнопку
    saveOriginalCode();
    checkEditorChanges();
}

// === Track Editor Changes ===

let originalLoopCode = ''; // Хранит оригинальный код текущего лупа

function checkEditorChanges() {
    const editor = document.getElementById('codeEditor');
    const updateBtn = document.getElementById('updateBtn');

    // Показываем кнопку только если:
    // 1. Есть выбранный луп (currentLoopIndex >= 0)
    // 2. Код был изменен
    // 3. Не находимся в AI режиме
    // 4. Луп НЕ играет (при воспроизведении работает live reload)
    if (currentLoopIndex < 0 || currentAIMode !== 'normal' || isPlaying) {
        updateBtn.style.display = 'none';
        return;
    }

    const currentCode = editor.value.trim();
    const originalCode = originalLoopCode.trim();

    // Показываем кнопку только если код изменился
    if (currentCode && currentCode !== originalCode) {
        updateBtn.style.display = 'inline-block';
    } else {
        updateBtn.style.display = 'none';
    }
}

function saveOriginalCode() {
    const editor = document.getElementById('codeEditor');
    originalLoopCode = editor.value;
}

// === Live Reload Mode ===

let liveReloadTimeout = null;

function setupLiveReload() {
    const editor = document.getElementById('codeEditor');

    editor.addEventListener('input', () => {
        // Live reload только если:
        // 1. Луп играет
        // 2. Есть выбранный луп
        // 3. Не в AI режиме
        if (!isPlaying || currentLoopIndex < 0 || currentAIMode !== 'normal') {
            return;
        }

        // Debounce 500ms - ждём паузу в наборе
        clearTimeout(liveReloadTimeout);
        liveReloadTimeout = setTimeout(() => {
            liveReloadCode();
        }, 500);
    });
}

async function liveReloadCode() {
    const code = document.getElementById('codeEditor').value.trim();

    if (!code) return;

    try {
        // Обновляем луп в массиве
        loops[currentLoopIndex].code = code;

        // Патчим AI ошибки (как в playCode)
        let patchedCode = code.replace(/\.fade\(/g, '.xfade(');

        // Применяем код к текущему реплу
        await repl.evaluate(patchedCode);

        // Обновляем грид (название может измениться)
        updateLoopsGrid();

        console.log('🔄 Live reload applied');
    } catch (error) {
        console.warn('⚠️ Live reload error:', error.message);
        // Не показываем alert при ошибках live reload - просто логируем
    }
}

// === Edit Loop with AI ===

async function editLoop() {
    const codeEditor = document.getElementById('codeEditor');
    const statusDiv = document.getElementById('editorStatus');
    const generateBtn = document.getElementById('generateBtn');
    const addToLoopsBtn = document.getElementById('addToLoopsBtn');

    const userPrompt = codeEditor.value.trim();

    if (!userPrompt) {
        statusDiv.textContent = 'Опиши что нужно изменить';
        statusDiv.className = 'editor-status active error';
        return;
    }

    if (userPrompt.length > 300) {
        statusDiv.textContent = 'Промпт слишком длинный (максимум 300 символов)';
        statusDiv.className = 'editor-status active error';
        return;
    }

    const currentLoop = savedCode; // savedCode содержит оригинальный код

    // Анализируем музыкальный контекст текущего лупа
    const musicContext = analyzeMusicalContext(currentLoop);
    const contextualPrompt = buildContextualPrompt(userPrompt, musicContext);

    console.log('🎵 Musical context for edit:', musicContext);
    console.log('📝 Enhanced edit prompt:', contextualPrompt);

    // Показываем контекст в статусе
    let contextHint = '';
    if (musicContext) {
        if (musicContext.bpm) contextHint += ` BPM:${musicContext.bpm}`;
        if (musicContext.complexity) contextHint += ` [${musicContext.complexity}]`;
    }

    try {
        generateBtn.disabled = true;
        statusDiv.textContent = `Редактирование лупа...${contextHint}`;
        statusDiv.className = 'editor-status active loading';

        const response = await fetch('https://wo-server-v1.onrender.com/api/edit-strudel-loop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: contextualPrompt,
                currentLoop
            })
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = 'Ошибка сервера';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        if (!responseText || responseText.trim() === '') {
            throw new Error('Сервер вернул пустой ответ');
        }

        const data = JSON.parse(responseText);

        // Обновляем код в редакторе
        codeEditor.value = data.code;

        // Обновляем луп
        loops[currentLoopIndex].code = data.code;
        loops[currentLoopIndex].name = `Loop ${currentLoopIndex + 1} (edited)`;
        updateLoopsGrid();

        statusDiv.textContent = '✅ Луп отредактирован!';
        statusDiv.className = 'editor-status active success';

        // Показываем кнопку Add to Loops
        addToLoopsBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('❌ Ошибка редактирования:', error);
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.className = 'editor-status active error';
    } finally {
        generateBtn.disabled = false;
    }
}

async function generateScript() {
    const codeEditor = document.getElementById('codeEditor');
    const statusDiv = document.getElementById('editorStatus');
    const generateBtn = document.getElementById('generateBtn');
    const addToLoopsBtn = document.getElementById('addToLoopsBtn');

    const prompt = codeEditor.value.trim();

    if (!prompt) {
        statusDiv.textContent = 'Пожалуйста, опиши что хочешь услышать';
        statusDiv.className = 'editor-status active error';
        return;
    }

    if (prompt.length > 300) {
        statusDiv.textContent = 'Промпт слишком длинный (максимум 300 символов)';
        statusDiv.className = 'editor-status active error';
        return;
    }

    try {
        // UI: начало генерации
        generateBtn.disabled = true;
        statusDiv.textContent = 'Генерация скрипта...';
        statusDiv.className = 'editor-status active loading';

        // Отправка запроса
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = 'Ошибка сервера';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        if (!responseText || responseText.trim() === '') {
            throw new Error('Сервер вернул пустой ответ');
        }

        const data = JSON.parse(responseText);

        // Вставляем сгенерированный код в редактор
        codeEditor.value = data.code;

        // UI: успех
        statusDiv.textContent = '✅ Скрипт сгенерирован!';
        statusDiv.className = 'editor-status active success';

        // Показываем кнопку Add to Loops
        addToLoopsBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('❌ Ошибка генерации:', error);
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.className = 'editor-status active error';
    } finally {
        generateBtn.disabled = false;
    }
}


// Transition Generation functions
const TRANSITION_API_URL = 'https://wo-server-v1.onrender.com/api/generate-strudel-transition';

async function generateTransition() {
    const fromSelect = document.getElementById('transitionFromLoop');
    const toSelect = document.getElementById('transitionToLoop');
    const codeEditor = document.getElementById('codeEditor');
    const statusDiv = document.getElementById('editorStatus');
    const generateBtn = document.getElementById('generateBtn');
    const addToLoopsBtn = document.getElementById('addToLoopsBtn');

    const fromIndex = parseInt(fromSelect.value);
    const toIndex = parseInt(toSelect.value);

    if (fromIndex === toIndex) {
        statusDiv.textContent = 'Выбери разные лупы для перехода!';
        statusDiv.className = 'editor-status active error';
        return;
    }

    const fromLoop = loops[fromIndex];
    const toLoop = loops[toIndex];

    // Анализируем контекст обоих лупов
    const fromContext = analyzeMusicalContext(fromLoop.code);
    const toContext = analyzeMusicalContext(toLoop.code);

    // Создаем специальный контекст для перехода
    let transitionInfo = [];

    if (fromContext && toContext) {
        if (fromContext.bpm && toContext.bpm) {
            transitionInfo.push(`BPM: ${fromContext.bpm} → ${toContext.bpm}`);
        }
        if (fromContext.tempo !== toContext.tempo) {
            transitionInfo.push(`Tempo: ${fromContext.tempo} → ${toContext.tempo}`);
        }
        if (fromContext.samples.length > 0 && toContext.samples.length > 0) {
            transitionInfo.push(`Samples: ${fromContext.samples.slice(0, 3).join(', ')} → ${toContext.samples.slice(0, 3).join(', ')}`);
        }
        transitionInfo.push(`Style: ${fromContext.complexity} → ${toContext.complexity}`);
    }

    const transitionContext = transitionInfo.length > 0 ? transitionInfo.join(' | ') : '';

    console.log('🎵 Transition analysis:', { fromContext, toContext, transitionContext });

    // Показываем контекст перехода в статусе
    let contextHint = '';
    if (fromContext && toContext) {
        if (fromContext.bpm && toContext.bpm) {
            contextHint = ` ${fromContext.bpm}→${toContext.bpm} BPM`;
        }
    }

    try {
        // UI: начало генерации
        generateBtn.disabled = true;
        statusDiv.textContent = `Генерация перехода...${contextHint}`;
        statusDiv.className = 'editor-status active loading';

        // Отправка запроса с контекстом
        const response = await fetch(TRANSITION_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fromLoop: fromLoop.code,
                toLoop: toLoop.code,
                context: transitionContext // Добавляем контекст перехода
            })
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = 'Ошибка сервера';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        if (!responseText || responseText.trim() === '') {
            throw new Error('Сервер вернул пустой ответ');
        }

        const data = JSON.parse(responseText);

        // Вставляем код в редактор
        codeEditor.value = data.code;
        codeEditor.readOnly = false;

        // UI: успех
        statusDiv.textContent = `✅ Переход создан! (${fromLoop.name || 'Loop ' + (fromIndex + 1)} → ${toLoop.name || 'Loop ' + (toIndex + 1)})`;
        statusDiv.className = 'editor-status active success';

        // Показываем кнопку Add to Loops
        addToLoopsBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('❌ Ошибка генерации перехода:', error);
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.className = 'editor-status active error';
    } finally {
        generateBtn.disabled = false;
    }
}

// === Musical Context Analysis ===

// Анализ музыкального контекста из кода
function analyzeMusicalContext(code) {
    if (!code || !code.trim()) {
        return null;
    }

    const context = {
        bpm: null,
        tempo: 'normal',
        samples: [],
        structure: null,
        complexity: 'medium',
        effects: []
    };

    // Извлекаем BPM/tempo модификаторы
    const speedMatch = code.match(/\.speed\s*\(\s*([\d.]+)\s*\)/);
    if (speedMatch) {
        const speed = parseFloat(speedMatch[1]);
        context.bpm = Math.round(120 * speed); // Базовый BPM = 120
        if (speed < 0.8) context.tempo = 'slow';
        else if (speed > 1.2) context.tempo = 'fast';
    }

    const fastMatch = code.match(/\.fast\s*\(\s*([\d.]+)\s*\)/);
    if (fastMatch) {
        context.tempo = 'fast';
        context.bpm = Math.round(120 * parseFloat(fastMatch[1]));
    }

    const slowMatch = code.match(/\.slow\s*\(\s*([\d.]+)\s*\)/);
    if (slowMatch) {
        context.tempo = 'slow';
        context.bpm = Math.round(120 / parseFloat(slowMatch[1]));
    }

    // Извлекаем используемые сэмплы
    const sampleMatches = code.matchAll(/s\s*\(\s*["']([^"']+)["']\s*\)/g);
    for (const match of sampleMatches) {
        const samples = match[1].split(/[\s,]+/).filter(s => s.length > 0);
        context.samples.push(...samples);
    }
    context.samples = [...new Set(context.samples)]; // Уникальные

    // Определяем сложность по количеству эффектов/методов
    const methodCount = (code.match(/\.\w+\(/g) || []).length;
    if (methodCount < 3) context.complexity = 'simple';
    else if (methodCount > 6) context.complexity = 'complex';

    // Извлекаем эффекты
    if (code.includes('.room(')) context.effects.push('reverb');
    if (code.includes('.delay(')) context.effects.push('delay');
    if (code.includes('.lpf(') || code.includes('.hpf(')) context.effects.push('filter');
    if (code.includes('.gain(') || code.includes('.volume(')) context.effects.push('dynamics');

    // Определяем структуру паттерна (euclidean, mini-notation)
    if (code.includes('euclid')) context.structure = 'euclidean';
    else if (code.match(/["'][^"']*\*\d+[^"']*["']/)) context.structure = 'rhythmic';
    else context.structure = 'basic';

    return context;
}

// Создание контекстного промпта для AI
function buildContextualPrompt(userPrompt, musicContext) {
    if (!musicContext) {
        return userPrompt;
    }

    let contextInfo = [];

    // BPM/Tempo
    if (musicContext.bpm) {
        contextInfo.push(`BPM: ${musicContext.bpm}`);
    } else if (musicContext.tempo !== 'normal') {
        contextInfo.push(`Tempo: ${musicContext.tempo}`);
    }

    // Samples
    if (musicContext.samples.length > 0) {
        contextInfo.push(`Using samples: ${musicContext.samples.slice(0, 5).join(', ')}`);
    }

    // Complexity
    contextInfo.push(`Complexity: ${musicContext.complexity}`);

    // Structure
    if (musicContext.structure) {
        contextInfo.push(`Structure: ${musicContext.structure}`);
    }

    // Effects
    if (musicContext.effects.length > 0) {
        contextInfo.push(`Effects: ${musicContext.effects.join(', ')}`);
    }

    // Формируем финальный промпт
    const contextString = contextInfo.join(' | ');
    return `[Context: ${contextString}]\n\nUser request: ${userPrompt}`;
}

// Continue Loop Generation functions
const CONTINUE_API_URL = 'https://wo-server-v1.onrender.com/api/generate-strudel-continuation';

async function generateContinuation() {
    const codeEditor = document.getElementById('codeEditor');
    const statusDiv = document.getElementById('editorStatus');
    const generateBtn = document.getElementById('generateBtn');
    const addToLoopsBtn = document.getElementById('addToLoopsBtn');
    const userPrompt = codeEditor.value.trim();

    if (!userPrompt) {
        statusDiv.textContent = 'Пожалуйста, опиши как развить луп';
        statusDiv.className = 'editor-status active error';
        return;
    }

    // Берем текущий луп как базу для продолжения (из savedCode)
    const previousLoop = savedCode;

    // Анализируем музыкальный контекст
    const musicContext = analyzeMusicalContext(previousLoop);
    const contextualPrompt = buildContextualPrompt(userPrompt, musicContext);

    console.log('🎵 Musical context:', musicContext);
    console.log('📝 Enhanced prompt:', contextualPrompt);

    // Показываем найденный контекст пользователю
    let contextHint = '';
    if (musicContext) {
        if (musicContext.bpm) contextHint += ` BPM:${musicContext.bpm}`;
        if (musicContext.samples.length > 0) contextHint += ` [${musicContext.samples.slice(0, 2).join(', ')}]`;
    }

    try {
        // UI: начало генерации
        generateBtn.disabled = true;
        statusDiv.textContent = `Генерация продолжения...${contextHint}`;
        statusDiv.className = 'editor-status active loading';

        // Отправка запроса с контекстным промптом
        const response = await fetch(CONTINUE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: contextualPrompt,
                previousLoop: previousLoop
            })
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = 'Ошибка сервера';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        if (!responseText || responseText.trim() === '') {
            throw new Error('Сервер вернул пустой ответ');
        }

        const data = JSON.parse(responseText);

        // Вставляем код в редактор
        codeEditor.value = data.code;

        // UI: успех
        statusDiv.textContent = '✅ Продолжение сгенерировано!';
        statusDiv.className = 'editor-status active success';

        // Показываем кнопку Add to Loops
        addToLoopsBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('❌ Ошибка генерации продолжения:', error);
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.className = 'editor-status active error';
    } finally {
        generateBtn.disabled = false;
    }
}


// === Interactive Code Sliders ===

let codeSliders = []; // Массив найденных слайдеров { value, start, end, line, context }
let slidersEnabled = true; // Можно отключать слайдеры
let slidersPanelExpanded = false; // Состояние панели (свернута/развернута)
let isUpdatingSlider = false; // Флаг для предотвращения конкурентных обновлений
let sliderUpdateTimeout = null; // Таймаут для debounce рендеринга

// Парсинг чисел из кода
function parseNumbersFromCode(code) {
    const lines = code.split('\n');
    const numbers = [];

    lines.forEach((line, lineIndex) => {
        // Пропускаем комментарии
        if (line.trim().startsWith('//')) return;

        // Регулярка для чисел (целые и дробные, включая отрицательные)
        // Ищем числа в контексте функций: .func(0.5) или func(2)
        const numberRegex = /([a-z_]\w*)\s*\(\s*(-?\d+\.?\d*)\s*\)/gi;
        let match;

        while ((match = numberRegex.exec(line)) !== null) {
            const funcName = match[1];
            const numValue = parseFloat(match[2]);
            const numStart = match.index + match[1].length + 1; // После "func("
            const numEnd = numStart + match[2].length;
            const originalMatch = match[0]; // Сохраняем весь матч для точной замены

            // Определяем разумные границы для слайдера в зависимости от контекста
            let min = 0;
            let max = 1;
            let step = 0.01;

            // Эвристика для разных параметров
            if (funcName === 'gain' || funcName === 'volume' || funcName === 'amp') {
                min = 0;
                max = 2;
                step = 0.05;
            } else if (funcName === 'speed' || funcName === 'fast' || funcName === 'slow') {
                min = 0.1;
                max = 4;
                step = 0.1;
            } else if (funcName === 'note' || funcName === 'n') {
                min = 0;
                max = 127;
                step = 1;
            } else if (funcName === 'pan') {
                min = -1;
                max = 1;
                step = 0.1;
            } else if (funcName === 'cutoff' || funcName === 'lpf' || funcName === 'hpf') {
                min = 100;
                max = 10000;
                step = 100;
            } else if (funcName === 'delay' || funcName === 'room' || funcName === 'size') {
                min = 0;
                max = 1;
                step = 0.05;
            } else {
                // По умолчанию
                if (numValue > 10) {
                    min = 0;
                    max = numValue * 2;
                    step = 1;
                } else if (numValue > 1) {
                    min = 0;
                    max = 10;
                    step = 0.5;
                } else {
                    min = 0;
                    max = 2;
                    step = 0.05;
                }
            }

            numbers.push({
                value: numValue,
                start: numStart,
                end: numEnd,
                line: lineIndex,
                lineText: line,
                context: funcName,
                originalMatch: originalMatch,
                matchIndex: match.index, // Позиция всего матча для точной замены
                uniqueId: `${lineIndex}_${match.index}_${funcName}`, // Уникальный ID
                min,
                max,
                step
            });
        }
    });

    return numbers;
}

// Переключение панели слайдеров
function toggleSlidersPanel() {
    slidersPanelExpanded = !slidersPanelExpanded;
    const overlay = document.getElementById('codeSlidersOverlay');
    const toggleBtn = document.getElementById('slidersToggleBtn');

    if (slidersPanelExpanded) {
        overlay.classList.remove('collapsed');
        toggleBtn.textContent = '×';
    } else {
        overlay.classList.add('collapsed');
        toggleBtn.textContent = '🎚️';
    }

    console.log(`🎚️ Sliders panel ${slidersPanelExpanded ? 'expanded' : 'collapsed'}`);
}

// Рендеринг слайдеров
function renderCodeSliders() {
    // Не рендерим во время обновления
    if (isUpdatingSlider) {
        return;
    }

    const toggleBtn = document.getElementById('slidersToggleBtn');
    const panel = document.getElementById('codeSlidersPanel');

    if (!slidersEnabled || currentAIMode !== 'normal') {
        // Скрываем всю панель в AI режиме
        panel.style.display = 'none';
        return;
    }

    const textarea = document.getElementById('codeEditor');
    const overlay = document.getElementById('codeSlidersOverlay');
    const code = textarea.value;

    if (!code.trim()) {
        overlay.innerHTML = '';
        panel.style.display = 'none';
        return;
    }

    // Парсим числа
    codeSliders = parseNumbersFromCode(code);

    // Очищаем overlay
    overlay.innerHTML = '';

    // Если нет слайдеров, скрываем панель
    if (codeSliders.length === 0) {
        panel.style.display = 'none';
        toggleBtn.classList.remove('has-sliders');
        return;
    }

    // Показываем панель и обновляем кнопку
    panel.style.display = 'block';
    toggleBtn.classList.add('has-sliders');

    // Создаем слайдеры в вертикальном списке
    codeSliders.forEach((num, index) => {
        const slider = document.createElement('div');
        slider.className = 'code-slider';
        slider.dataset.index = index;

        // Header с названием и значением
        const header = document.createElement('div');
        header.className = 'slider-header';

        const label = document.createElement('span');
        label.className = 'slider-label';
        label.textContent = num.context;

        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'slider-value';
        valueDisplay.textContent = num.value.toFixed(num.step >= 1 ? 0 : 2);

        header.appendChild(label);
        header.appendChild(valueDisplay);

        // Range input
        const input = document.createElement('input');
        input.type = 'range';
        input.min = num.min;
        input.max = num.max;
        input.step = num.step;
        input.value = num.value;

        // Обработчик изменения с debounce для каждого слайдера
        let sliderDebounce = null;
        input.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);

            // Обновляем отображаемое значение мгновенно
            valueDisplay.textContent = newValue.toFixed(num.step >= 1 ? 0 : 2);

            // Обновляем код с debounce
            clearTimeout(sliderDebounce);
            sliderDebounce = setTimeout(() => {
                updateCodeWithSlider(index, newValue);
            }, 50); // Короткий debounce для плавности
        });

        slider.appendChild(header);
        slider.appendChild(input);
        overlay.appendChild(slider);
    });
}

// Обновление кода при изменении слайдера
function updateCodeWithSlider(sliderIndex, newValue) {
    // Блокируем конкурентные обновления
    if (isUpdatingSlider) {
        return;
    }

    isUpdatingSlider = true;

    try {
        const textarea = document.getElementById('codeEditor');
        const num = codeSliders[sliderIndex];

        if (!num) {
            isUpdatingSlider = false;
            return;
        }

        // Получаем СВЕЖИЙ код из textarea
        const lines = textarea.value.split('\n');
        const line = lines[num.line];

        if (!line) {
            console.warn('⚠️ Line not found');
            isUpdatingSlider = false;
            return;
        }

        // Формируем новое значение
        const newValueStr = num.step >= 1 ? Math.round(newValue).toString() : newValue.toFixed(2);

        // ВАЖНО: Находим ВСЕ вхождения паттерна на этой строке
        const funcPattern = new RegExp(`(${num.context})\\s*\\(\\s*(-?\\d+\\.?\\d*)\\s*\\)`, 'gi');
        const matches = [];
        let match;

        while ((match = funcPattern.exec(line)) !== null) {
            matches.push({
                index: match.index,
                fullMatch: match[0],
                funcName: match[1],
                value: match[2]
            });
        }

        // Находим матч, который соответствует нашему слайдеру по позиции
        const targetMatch = matches.find(m => m.index === num.matchIndex);

        if (!targetMatch) {
            console.warn('⚠️ Slider update failed - specific match not found');
            isUpdatingSlider = false;
            return;
        }

        // Заменяем КОНКРЕТНОЕ вхождение по позиции
        const before = line.substring(0, targetMatch.index);
        const after = line.substring(targetMatch.index + targetMatch.fullMatch.length);
        const newFunctionCall = `${targetMatch.funcName}(${newValueStr})`;
        const newLine = before + newFunctionCall + after;

        // Проверяем что замена произошла корректно
        if (!newLine || newLine.trim() === '') {
            console.warn('⚠️ Slider update failed - invalid replacement');
            isUpdatingSlider = false;
            return;
        }

        lines[num.line] = newLine;

        // Обновляем textarea
        const newCode = lines.join('\n');
        textarea.value = newCode;

        // Обновляем текущий луп если есть
        if (currentLoopIndex >= 0 && loops[currentLoopIndex]) {
            loops[currentLoopIndex].code = newCode;
        }

        // Триггерим live reload если играет
        if (isPlaying && currentLoopIndex >= 0) {
            clearTimeout(liveReloadTimeout);
            liveReloadTimeout = setTimeout(() => {
                liveReloadCode();
            }, 150); // Увеличен debounce для стабильности
        }

        // Отменяем предыдущий таймаут рендеринга
        clearTimeout(sliderUpdateTimeout);

        // Перерендериваем слайдеры с новыми позициями (с debounce)
        sliderUpdateTimeout = setTimeout(() => {
            renderCodeSliders();
            isUpdatingSlider = false;
        }, 200); // Увеличен debounce для стабильности

    } catch (error) {
        console.error('❌ Slider update error:', error);
        isUpdatingSlider = false;
    }
}

// Обработчики для включения/выключения слайдеров
function toggleCodeSliders() {
    slidersEnabled = !slidersEnabled;
    renderCodeSliders();
    console.log(`🎚️ Code sliders ${slidersEnabled ? 'enabled' : 'disabled'}`);
}

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isPlaying) {
            playCode();
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        if (isPlaying) {
            stopCode();
        }
    }
    // Toggle sliders с Ctrl+Shift+S
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        toggleCodeSliders();
    }
});

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
    createVisualizer();
    updateLoopsGrid(); // Инициализируем пустой грид лупов
    initDayvibe();

    // Добавляем отслеживание изменений в code editor
    const codeEditor = document.getElementById('codeEditor');
    if (codeEditor) {
        codeEditor.addEventListener('input', checkEditorChanges);

        // Рендерим слайдеры при вводе (с debounce)
        let sliderRenderTimeout;
        codeEditor.addEventListener('input', () => {
            clearTimeout(sliderRenderTimeout);
            sliderRenderTimeout = setTimeout(() => {
                renderCodeSliders();
            }, 300);
        });

        // Рендерим слайдеры при скролле
        codeEditor.addEventListener('scroll', () => {
            renderCodeSliders();
        });
    }

    // Рендерим слайдеры при ресайзе окна
    window.addEventListener('resize', () => {
        renderCodeSliders();
    });

    console.log('🎵 DAYVIBE initialized');
    console.log('⌨️  Hotkeys:');
    console.log('   Ctrl+Enter - Play');
    console.log('   Ctrl+. - Stop');
    console.log('   Ctrl+Shift+S - Toggle Sliders Panel');
    console.log('');
    console.log('🎯 Smart AI Features:');
    console.log('   ✓ Auto-detects BPM, tempo, samples from your loops');
    console.log('   ✓ Preserves musical context in Continue/Edit/Transition modes');
    console.log('   ✓ Check console for context analysis during generation');
    console.log('');
    console.log('💡 Tip: Type loadExample() to load example code with sliders');
});
