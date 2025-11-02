// DAYVIBE LOOPS - Loop Management, Navigation, Live Reload
// ==========================================================

import {
    loops, currentLoopIndex, MAX_LOOPS, isPlaying, isTransitioning, repl, scheduler,
    originalLoopCode, currentAIMode, liveReloadTimeout,
    setCurrentLoopIndex, setIsTransitioning, removeLoop, swapLoops,
    setOriginalLoopCode, setLiveReloadTimeout
} from './core.js';
import { LoopTile } from '../design/components.js';

// ============== LOOP CRUD ==============

export function updateLoopsGrid() {
    const grid = document.getElementById('loopsGrid');
    grid.innerHTML = '';

    for (let i = 0; i < MAX_LOOPS; i++) {
        const tile = LoopTile({
            index: i,
            loop: loops[i] || null,
            isActive: i === currentLoopIndex,
            isPlaying: i === currentLoopIndex && isPlaying,
            onSelect: (index) => switchToLoop(index),
            onDelete: (index) => deleteLoop(index),
            onMoveUp: (index) => moveLoopUp(index),
            onMoveDown: (index) => moveLoopDown(index),
            canMoveUp: i > 0 && loops[i],
            canMoveDown: i < loops.length - 1 && loops[i],
        });

        grid.appendChild(tile);
    }

    // Обновляем состояние AI кнопок
    updateAIButtonsState();
}

// Sequencer Grid (пока просто клон, позже будет независимым)
export function updateSequencerGrid() {
    const grid = document.getElementById('sequencerGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Пока рендерим те же loops что и в основном гриде
    for (let i = 0; i < MAX_LOOPS; i++) {
        const tile = LoopTile({
            index: i,
            loop: loops[i] || null,
            isActive: false, // Sequencer не активен пока
            isPlaying: false,
            onSelect: (index) => console.log('Sequencer tile clicked:', index),
            onDelete: (index) => console.log('Sequencer delete:', index),
            onMoveUp: null, // Пока без перемещения
            onMoveDown: null,
            canMoveUp: false,
            canMoveDown: false,
        });

        grid.appendChild(tile);
    }
}

export function updateAIButtonsState() {
    const transitionBtn = document.getElementById('transitionBtn');
    const continueBtn = document.getElementById('continueBtn');

    // Transition кнопка активна только если есть минимум 2 лупа
    transitionBtn.disabled = loops.length < 2;

    // Continue кнопка активна если есть хотя бы 1 луп
    continueBtn.disabled = loops.length < 1;
}

export function deleteLoop(index) {
    if (index < 0 || index >= loops.length) {
        return;
    }

    const loopName = loops[index].name || `Loop ${index + 1}`;

    if (!confirm(`Удалить "${loopName}"?`)) {
        return;
    }

    // Удаляем луп из массива
    removeLoop(index);

    // Корректируем currentLoopIndex
    if (currentLoopIndex === index) {
        // Если удаляем активный луп
        if (loops.length === 0) {
            setCurrentLoopIndex(-1);
            // Останавливаем воспроизведение (импортируем из ui.js)
            if (window.stopCode) window.stopCode();
        } else if (currentLoopIndex >= loops.length) {
            setCurrentLoopIndex(loops.length - 1);
        }
        // Переключаемся на новый текущий луп если есть
        if (currentLoopIndex >= 0 && isPlaying) {
            switchToLoop(currentLoopIndex);
        }
    } else if (currentLoopIndex > index) {
        // Если удаляем луп перед текущим, сдвигаем индекс
        setCurrentLoopIndex(currentLoopIndex - 1);
    }

    updateLoopsGrid();
    console.log(`🗑️ Удален луп ${index}: ${loopName}`);
}

export function moveLoopUp(index) {
    if (index <= 0 || index >= loops.length) {
        return;
    }

    // Меняем местами с предыдущим
    swapLoops(index - 1, index);

    // Корректируем currentLoopIndex
    if (currentLoopIndex === index) {
        setCurrentLoopIndex(index - 1);
    } else if (currentLoopIndex === index - 1) {
        setCurrentLoopIndex(index);
    }

    updateLoopsGrid();
    console.log(`⬆️ Луп ${index} перемещен вверх`);
}

export function moveLoopDown(index) {
    if (index < 0 || index >= loops.length - 1) {
        return;
    }

    // Меняем местами со следующим
    swapLoops(index, index + 1);

    // Корректируем currentLoopIndex
    if (currentLoopIndex === index) {
        setCurrentLoopIndex(index + 1);
    } else if (currentLoopIndex === index + 1) {
        setCurrentLoopIndex(index);
    }

    updateLoopsGrid();
    console.log(`⬇️ Луп ${index} перемещен вниз`);
}

export function addLoop() {
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

// ============== NAVIGATION ==============

export async function nextLoop() {
    if (loops.length < 2) return;
    const nextIndex = (currentLoopIndex + 1) % loops.length;
    await switchToLoop(nextIndex);
}

export async function prevLoop() {
    if (loops.length < 2) return;
    let prevIndex = currentLoopIndex - 1;
    if (prevIndex < 0) {
        prevIndex = loops.length - 1;
    }
    await switchToLoop(prevIndex);
}

export async function switchToLoop(index) {
    // Не переключаться, если это тот же луп, идет переход или лупа не существует
    if (!loops[index] || isTransitioning || index === currentLoopIndex) {
        return;
    }

    const performSwitch = async () => {
        console.log(`🚀 Switching to loop ${index + 1}`);
        setCurrentLoopIndex(index);
        const loop = loops[index];
        document.getElementById('codeEditor').value = loop.code;

        // Сохраняем оригинальный код и проверяем состояние кнопки
        saveOriginalCode();
        checkEditorChanges();

        updateLoopsGrid();

        // Обновляем видимость кнопки слайдеров для нового кода
        if (window.updateSlidersButtonVisibility) {
            window.updateSlidersButtonVisibility();
        }

        if (isPlaying) {
            // Вызываем playCode из ui.js
            if (window.playCode) {
                await window.playCode();
            }
        }
    };

    // Если музыка играет и scheduler доступен, планируем переход
    if (isPlaying && scheduler && typeof scheduler.nextCycle === 'function') {
        setIsTransitioning(true);
        console.log(`⏳ Scheduling transition to loop ${index + 1} for next cycle...`);

        await scheduler.nextCycle();

        await performSwitch();
        setIsTransitioning(false);
    } else {
        // Иначе (если музыка не играет) переключаемся мгновенно
        await performSwitch();
    }
}

// ============== UPDATE & TRACKING ==============

export function updateCurrentLoop() {
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

export function checkEditorChanges() {
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

export function saveOriginalCode() {
    const editor = document.getElementById('codeEditor');
    setOriginalLoopCode(editor.value);
}

// ============== LIVE RELOAD ==============

export function setupLiveReload() {
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
        const timeout = setTimeout(() => {
            liveReloadCode();
        }, 500);
        setLiveReloadTimeout(timeout);
    });
}

export async function liveReloadCode() {
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
