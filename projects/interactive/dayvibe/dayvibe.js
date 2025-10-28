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

                    // Используем глобальную evaluate() из @strudel/web
                    const result = await evaluate(code);
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

// Debug функция
function debugStrudel() {
    console.log('=== STRUDEL DEBUG ===');
    console.log('typeof strudel:', typeof strudel);
    console.log('strudel keys:', strudel ? Object.keys(strudel) : 'undefined');
    console.log('typeof sound:', typeof sound);
    console.log('typeof window.sound:', typeof window.sound);

    // Проверяем REPL функции
    const replFuncs = ['repl', 'controls', 'silence', 'hush', 'panic', 'getScheduler', 'cyclist'];
    console.log('\nREPL functions:');
    replFuncs.forEach(func => {
        console.log(`- ${func}:`, typeof window[func]);
    });

    // Проверяем scheduler
    if (typeof getScheduler === 'function') {
        const scheduler = getScheduler();
        console.log('\nScheduler:', scheduler);
        console.log('Scheduler methods:', Object.keys(scheduler));
        console.log('Scheduler state:', {
            started: scheduler.started,
            pattern: scheduler.pattern,
            audioContext: scheduler.audioContext?.state
        });
    }

    // Проверяем controls если есть
    if (typeof controls === 'object') {
        console.log('\nControls:', controls);
        console.log('Controls methods:', Object.keys(controls));
    }

    console.log('\nCurrent pattern:', currentPattern);
    if (currentPattern) {
        console.log('Pattern type:', currentPattern.constructor?.name);
        console.log('Pattern methods:', Object.keys(currentPattern));
        console.log('Pattern proto:', Object.getPrototypeOf(currentPattern));
    }

    console.log('\nAll window keys with "play", "start", or "stop":',
        Object.keys(window).filter(k => {
            const lower = k.toLowerCase();
            return lower.includes('play') || lower.includes('start') || lower.includes('stop');
        }).slice(0, 30));
    console.log('===================');
    alert('Check console for debug info');
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
    initDayvibe();

    console.log('🎵 DAYVIBE initialized');
    console.log('⌨️  Hotkeys: Ctrl+Enter (Play) | Ctrl+. (Stop)');
});
