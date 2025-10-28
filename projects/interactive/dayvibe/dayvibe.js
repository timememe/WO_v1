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

            tile.onclick = () => switchToLoop(i);
        } else {
            tile.classList.add('empty');
            const emptyText = document.createElement('div');
            emptyText.className = 'loop-empty-text';
            emptyText.textContent = '+';
            tile.appendChild(emptyText);
        }

        grid.appendChild(tile);
    }

    // Обновляем состояние кнопки Generate Transition
    updateTransitionButtonState();
}

// Обновление состояния кнопки перехода
function updateTransitionButtonState() {
    const transitionBtn = document.getElementById('transitionBtn');
    // Кнопка активна только если есть минимум 2 лупа
    transitionBtn.disabled = loops.length < 2;
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
        updateLoopsGrid();

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

    statusText.textContent = text;
    isPlaying = playing;

    if (playing) {
        statusIndicator.classList.add('active');
        statusIndicator.classList.remove('stopped');
        playBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        statusIndicator.classList.remove('active');
        statusIndicator.classList.add('stopped');
        playBtn.disabled = false;
        stopBtn.disabled = true;
    }
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
        console.log("--- CODE TO BE EVALUATED ---");
        console.log(code);
        console.log("----------------------------");
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

// Загрузка примера
function loadExample() {
    const exampleCode = `// DAYVIBE Example - Roland TR-909 Beat
s("rolandtr909bd rolandtr909sd rolandtr909hh rolandtr909sd")
  .gain(0.8)

// Try also:
// s("rolandtr808bd*2, rolandtr808sd(3,8)")
// s("bd cp sd cp").speed("1 2 0.5 1.5")`;

    document.getElementById('codeEditor').value = exampleCode;
}

// AI Generation functions
// ВАЖНО: Это должен быть URL сервера на Render, а не статического сайта!
// Замени YOUR_SERVICE_NAME на имя твоего сервиса на Render
const API_URL = 'https://wo-server-v1.onrender.com/api/generate-strudel-script';

function openAIPrompt() {
    document.getElementById('aiModal').style.display = 'flex';
    document.getElementById('aiPromptInput').value = '';
    document.getElementById('aiStatus').textContent = '';
    document.getElementById('aiStatus').className = 'ai-status';
}

function closeAIPrompt() {
    document.getElementById('aiModal').style.display = 'none';
}

async function generateScript() {
    const promptInput = document.getElementById('aiPromptInput');
    const statusDiv = document.getElementById('aiStatus');
    const generateBtn = document.querySelector('.btn-generate');

    const prompt = promptInput.value.trim();

    if (!prompt) {
        statusDiv.textContent = 'Пожалуйста, опиши что хочешь услышать';
        statusDiv.className = 'ai-status error';
        return;
    }

    if (prompt.length > 300) {
        statusDiv.textContent = 'Промпт слишком длинный (максимум 300 символов)';
        statusDiv.className = 'ai-status error';
        return;
    }

    try {
        // UI: начало генерации
        generateBtn.disabled = true;
        statusDiv.textContent = 'Генерация скрипта...';
        statusDiv.className = 'ai-status loading';

        // Отправка запроса
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        // Читаем тело ответа как текст для диагностики
        const responseText = await response.text();
        console.log('Response text:', responseText);

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

        // Проверка на пустой ответ
        if (!responseText || responseText.trim() === '') {
            throw new Error('Сервер вернул пустой ответ. Возможно endpoint еще не задеплоился на Render. Попробуй через несколько минут.');
        }

        const data = JSON.parse(responseText);

        // Вставляем сгенерированный код в редактор
        document.getElementById('codeEditor').value = data.code;

        // UI: успех
        statusDiv.textContent = '✅ Скрипт сгенерирован! Закрой окно и нажми Play';
        statusDiv.className = 'ai-status success';

        // Автозакрытие через 2 секунды
        setTimeout(() => {
            closeAIPrompt();
        }, 2000);

    } catch (error) {
        console.error('❌ Ошибка генерации:', error);
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.className = 'ai-status error';
    } finally {
        generateBtn.disabled = false;
    }
}

// Закрытие модального окна по клику вне его
document.addEventListener('click', (e) => {
    const aiModal = document.getElementById('aiModal');
    const transitionModal = document.getElementById('transitionModal');

    if (e.target === aiModal) {
        closeAIPrompt();
    }
    if (e.target === transitionModal) {
        closeTransitionPrompt();
    }
});

// Transition Generation functions
const TRANSITION_API_URL = 'https://wo-server-v1.onrender.com/api/generate-strudel-transition';

function openTransitionPrompt() {
    if (loops.length < 2) {
        alert('Нужно минимум 2 лупа для генерации перехода!');
        return;
    }

    // Заполняем селекты лупами
    const fromSelect = document.getElementById('fromLoopSelect');
    const toSelect = document.getElementById('toLoopSelect');

    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';

    loops.forEach((loop, index) => {
        const optionFrom = document.createElement('option');
        optionFrom.value = index;
        optionFrom.textContent = loop.name || `Loop ${index + 1}`;
        fromSelect.appendChild(optionFrom);

        const optionTo = document.createElement('option');
        optionTo.value = index;
        optionTo.textContent = loop.name || `Loop ${index + 1}`;
        toSelect.appendChild(optionTo);
    });

    // По умолчанию выбираем первый и второй лупы
    fromSelect.value = '0';
    toSelect.value = loops.length > 1 ? '1' : '0';

    document.getElementById('transitionModal').style.display = 'flex';
    document.getElementById('transitionStatus').textContent = '';
    document.getElementById('transitionStatus').className = 'ai-status';
}

function closeTransitionPrompt() {
    document.getElementById('transitionModal').style.display = 'none';
}

async function generateTransition() {
    const fromSelect = document.getElementById('fromLoopSelect');
    const toSelect = document.getElementById('toLoopSelect');
    const statusDiv = document.getElementById('transitionStatus');
    const generateBtn = document.querySelector('#transitionModal .btn-generate');

    const fromIndex = parseInt(fromSelect.value);
    const toIndex = parseInt(toSelect.value);

    if (fromIndex === toIndex) {
        statusDiv.textContent = 'Выбери разные лупы для перехода!';
        statusDiv.className = 'ai-status error';
        return;
    }

    const fromLoop = loops[fromIndex];
    const toLoop = loops[toIndex];

    try {
        // UI: начало генерации
        generateBtn.disabled = true;
        statusDiv.textContent = 'Генерация перехода...';
        statusDiv.className = 'ai-status loading';

        // Отправка запроса
        const response = await fetch(TRANSITION_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fromLoop: fromLoop.code,
                toLoop: toLoop.code
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

        // Вставляем переход между выбранными лупами
        const transitionLoop = {
            code: data.code,
            name: `Transition ${fromIndex + 1}→${toIndex + 1}`
        };

        // Вставляем переход после fromLoop
        const insertIndex = Math.max(fromIndex, toIndex);
        loops.splice(insertIndex, 0, transitionLoop);

        // Обновляем грид
        updateLoopsGrid();

        // Вставляем код в редактор
        document.getElementById('codeEditor').value = data.code;

        // UI: успех
        statusDiv.textContent = '✅ Переход создан! Закрой окно и нажми Play';
        statusDiv.className = 'ai-status success';

        // Автозакрытие через 2 секунды
        setTimeout(() => {
            closeTransitionPrompt();
        }, 2000);

    } catch (error) {
        console.error('❌ Ошибка генерации перехода:', error);
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.className = 'ai-status error';
    } finally {
        generateBtn.disabled = false;
    }
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
});

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
    createVisualizer();
    updateLoopsGrid(); // Инициализируем пустой грид лупов
    initDayvibe();

    console.log('🎵 DAYVIBE initialized');
    console.log('⌨️  Hotkeys: Ctrl+Enter (Play) | Ctrl+. (Stop)');
});
