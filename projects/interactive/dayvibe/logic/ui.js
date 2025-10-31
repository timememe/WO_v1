// DAYVIBE UI - Playback, Visualizer, Sliders, Events
// ====================================================

import {
    isPlaying, animationFrame, repl, currentPattern, panicTimeout, scheduler, audioContext,
    loops, currentLoopIndex, currentAIMode, savedCode, codeSliders,
    isUpdatingSlider, sliderUpdateTimeout, liveReloadTimeout,
    setIsPlaying, setAnimationFrame, setCurrentPattern, setPanicTimeout,
    setCurrentLoopIndex, addLoop, setSavedCode, setCodeSliders,
    setIsUpdatingSlider, setSliderUpdateTimeout, setLiveReloadTimeout
} from './core.js';
import { updateLoopsGrid, checkEditorChanges, liveReloadCode } from './loops.js';
import { setEditorMode } from './ai.js';
import { SliderLineGroup } from '../design/components.js';

// ============== VISUALIZER ==============

export function createVisualizer() {
    const visualizer = document.getElementById('visualizer');
    for (let i = 0; i < 32; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        visualizer.appendChild(bar);
    }
}

function animateVisualizer() {
    if (!isPlaying) return;

    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach(bar => {
        const height = Math.random() * 90 + 10;
        bar.style.height = height + '%';
    });

    setAnimationFrame(requestAnimationFrame(animateVisualizer));
}

function stopVisualizer() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        setAnimationFrame(null);
    }

    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach(bar => {
        bar.style.height = '10%';
    });
}

// ============== PLAYBACK CONTROL ==============

export function updateStatus(text, playing) {
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const editorTitle = document.getElementById('editorTitle');

    statusText.textContent = text;
    setIsPlaying(playing);

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

export async function playCode() {
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
            addLoop({
                code: code,
                name: 'Loop 1'
            });
            setCurrentLoopIndex(0);
            updateLoopsGrid();
        }

        console.log('▶ Playing code:', code);

        // ВАЖНО: Полностью останавливаем всё перед новым запуском
        console.log('🔧 Stopping any previous playback...');

        // Отменяем любые отложенные операции
        if (panicTimeout) {
            clearTimeout(panicTimeout);
            setPanicTimeout(null);
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
        const pattern = await repl.evaluate(code);
        setCurrentPattern(pattern);

        // Запуск визуализатора
        animateVisualizer();

        console.log('✅ Code executed successfully');
    } catch (error) {
        console.error('❌ Playback error:', error);
        updateStatus('Error', false);
        setIsPlaying(false);
        stopVisualizer();
        alert('Ошибка в коде:\n' + error.message);
    }
}

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

export async function stopCode() {
    try {
        // Отменяем любые отложенные операции
        if (panicTimeout) {
            clearTimeout(panicTimeout);
            setPanicTimeout(null);
        }

        // Очищаем UI и флаг
        setIsPlaying(false);
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
            setCurrentPattern(null);
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
                setCurrentPattern(null);
            }

            if (typeof hush === 'function') {
                hush();
            }
        } catch (e) {
            console.error('❌ Emergency stop failed:', e);
        }

        // В любом случае обновляем UI
        setIsPlaying(false);
        updateStatus('Stopped', false);
        stopVisualizer();
    }
}

export function loadExample() {
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

// ============== SLIDERS SYSTEM ==============

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

export function openSlidersMode() {
    setSavedCode(document.getElementById('codeEditor').value);
    setEditorMode('sliders', '🎚️ Sliders', '');
    renderSlidersGrid();
    console.log('🎚️ Sliders mode opened');
}

function renderSlidersGrid() {
    const slidersGridContent = document.getElementById('slidersGridContent');
    const textarea = document.getElementById('codeEditor');
    const code = textarea.value;

    if (!code.trim()) {
        slidersGridContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Нет кода для анализа</div>';
        setCodeSliders([]);
        return;
    }

    // Парсим числа и обновляем глобальный массив
    const sliders = parseNumbersFromCode(code);
    setCodeSliders(sliders);

    if (codeSliders.length === 0) {
        slidersGridContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">В коде не найдено параметров для слайдеров</div>';
        return;
    }

    // Группируем слайдеры по строкам
    const lineGroups = {};
    codeSliders.forEach((num, index) => {
        if (!lineGroups[num.line]) {
            lineGroups[num.line] = {
                lineNumber: num.line,
                lineText: num.lineText,
                sliders: []
            };
        }
        lineGroups[num.line].sliders.push({ ...num, originalIndex: index });
    });

    // Очищаем и создаем HTML
    slidersGridContent.innerHTML = '';

    // Сортируем по номеру строки
    const sortedLines = Object.values(lineGroups).sort((a, b) => a.lineNumber - b.lineNumber);

    sortedLines.forEach(group => {
        const lineGroup = SliderLineGroup({
            lineText: group.lineText.trim(),
            sliders: group.sliders.map(num => ({
                label: num.context,
                value: num.value,
                min: num.min,
                max: num.max,
                step: num.step,
                onChange: (newValue) => updateCodeWithSliderInGrid(num.originalIndex, newValue),
                debounce: 50,
            }))
        });

        slidersGridContent.appendChild(lineGroup);
    });
}

function updateCodeWithSliderInGrid(sliderIndex, newValue) {
    // Блокируем конкурентные обновления
    if (isUpdatingSlider) {
        return;
    }

    setIsUpdatingSlider(true);

    try {
        const textarea = document.getElementById('codeEditor');
        const num = codeSliders[sliderIndex];

        if (!num) {
            setIsUpdatingSlider(false);
            return;
        }

        // Получаем СВЕЖИЙ код из textarea
        const lines = textarea.value.split('\n');
        const line = lines[num.line];

        if (!line) {
            console.warn('⚠️ Line not found');
            setIsUpdatingSlider(false);
            return;
        }

        // Формируем новое значение
        const newValueStr = num.step >= 1 ? Math.round(newValue).toString() : newValue.toFixed(2);

        // Находим ВСЕ вхождения паттерна на этой строке
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
            setIsUpdatingSlider(false);
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
            setIsUpdatingSlider(false);
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
            const timeout = setTimeout(() => {
                liveReloadCode();
            }, 150);
            setLiveReloadTimeout(timeout);
        }

        // Перерендериваем сетку через debounce
        clearTimeout(sliderUpdateTimeout);
        const timeout = setTimeout(() => {
            if (currentAIMode === 'sliders') {
                renderSlidersGrid();
            }
            setIsUpdatingSlider(false);
        }, 200);
        setSliderUpdateTimeout(timeout);

    } catch (error) {
        console.error('❌ Slider update error:', error);
        setIsUpdatingSlider(false);
    }
}

export function updateSlidersButtonVisibility() {
    const slidersBtn = document.getElementById('slidersBtn');
    const textarea = document.getElementById('codeEditor');
    const code = textarea.value;

    if (!slidersBtn) return;

    // Показываем кнопку только если:
    // 1. В коде есть параметры для слайдеров
    // 2. Мы в режиме normal
    // 3. Есть выбранный луп
    if (currentAIMode === 'normal' && currentLoopIndex >= 0) {
        const numbers = parseNumbersFromCode(code);
        if (numbers.length > 0) {
            slidersBtn.style.display = 'inline-block';
        } else {
            slidersBtn.style.display = 'none';
        }
    } else {
        slidersBtn.style.display = 'none';
    }
}

function renderCodeSliders() {
    // Просто обновляем видимость кнопки
    updateSlidersButtonVisibility();
}

// ============== HOTKEYS & EVENTS ==============

export function setupHotkeys() {
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
}

export function setupEditorListeners() {
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
}
