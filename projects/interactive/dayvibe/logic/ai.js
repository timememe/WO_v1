// DAYVIBE AI - Context Analysis, API Integration, Mode Management
// ================================================================

import {
    loops, currentLoopIndex, currentAIMode, savedCode,
    setCurrentAIMode, setSavedCode
} from './core.js';
import { updateLoopsGrid, switchToLoop, saveOriginalCode, checkEditorChanges } from './loops.js';

// ============== API ENDPOINTS ==============

const API_URL = 'https://wo-server-v1.onrender.com/api/generate-strudel-script';
const EDIT_API_URL = 'https://wo-server-v1.onrender.com/api/edit-strudel-loop';
const CONTINUE_API_URL = 'https://wo-server-v1.onrender.com/api/generate-strudel-continuation';
const TRANSITION_API_URL = 'https://wo-server-v1.onrender.com/api/generate-strudel-transition';

// ============== MODE MANAGEMENT ==============

export function setEditorMode(mode, title, placeholder) {
    const container = document.getElementById('editorContainer');
    const editorTitle = document.getElementById('editorTitle');
    const codeEditor = document.getElementById('codeEditor');
    const slidersGridView = document.getElementById('slidersGridView');
    const editorStatus = document.getElementById('editorStatus');
    const generateBtn = document.getElementById('generateBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const editBtn = document.getElementById('editBtn');
    const addToLoopsBtn = document.getElementById('addToLoopsBtn');
    const updateBtn = document.getElementById('updateBtn');
    const slidersBtn = document.getElementById('slidersBtn');

    setCurrentAIMode(mode);
    container.setAttribute('data-mode', mode);
    editorTitle.textContent = title;
    if (placeholder) codeEditor.placeholder = placeholder;

    if (mode === 'normal') {
        // Обычный режим
        codeEditor.style.display = 'block';
        slidersGridView.style.display = 'none';
        generateBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        editBtn.style.display = 'inline-block';
        addToLoopsBtn.style.display = 'none';
        editorStatus.classList.remove('active');
        // Восстанавливаем стандартный onclick handler для updateBtn
        updateBtn.onclick = () => window.updateCurrentLoop();
        // Update Loop кнопка контролируется checkEditorChanges()
        checkEditorChanges();
        // Управляем видимостью кнопки слайдеров
        if (window.updateSlidersButtonVisibility) {
            window.updateSlidersButtonVisibility();
        }
    } else if (mode === 'sliders') {
        // Режим слайдеров
        codeEditor.style.display = 'none';
        slidersGridView.style.display = 'block';
        generateBtn.style.display = 'none';
        cancelBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
        addToLoopsBtn.style.display = 'none';
        updateBtn.style.display = 'none';
        slidersBtn.style.display = 'none';
        editorStatus.classList.remove('active');
    } else {
        // AI режим
        codeEditor.style.display = 'block';
        slidersGridView.style.display = 'none';
        generateBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
        addToLoopsBtn.style.display = 'none';
        updateBtn.style.display = 'none'; // Скрываем в AI режиме
        slidersBtn.style.display = 'none'; // Скрываем в AI режиме
    }
}

export function openGenerateMode() {
    setSavedCode(document.getElementById('codeEditor').value);
    document.getElementById('codeEditor').value = '';
    setEditorMode(
        'generate',
        '✨ AI Generate Loop',
        'Опиши что хочешь услышать...\n\nНапример:\n- Быстрый techno паттерн с 909 kick\n- Медленный ambient с pad звуками\n- Jungle breaks с басом'
    );
}

export function openEditMode() {
    if (currentLoopIndex < 0) {
        alert('Сначала выбери луп для редактирования');
        return;
    }

    setSavedCode(document.getElementById('codeEditor').value);
    document.getElementById('codeEditor').value = '';
    setEditorMode(
        'edit',
        '✏️ AI Edit Loop',
        'Опиши что изменить в лупе...\n\nНапример:\n- Сделай медленнее\n- Добавь reverb\n- Замени kick на другой\n- Упрости ритм'
    );
}

export function openContinueMode() {
    if (currentLoopIndex < 0) {
        alert('Сначала выбери луп для продолжения');
        return;
    }

    setSavedCode(document.getElementById('codeEditor').value);
    document.getElementById('codeEditor').value = '';
    setEditorMode(
        'continue',
        '➡️ AI Continue Loop',
        'Опиши как развить этот луп...\n\nНапример:\n- Добавь hi-hats и эволюционируй\n- Усложни ритм\n- Сделай более мелодичным'
    );
}

export function openTransitionMode() {
    if (loops.length < 2) {
        alert('Нужно минимум 2 лупа для создания перехода');
        return;
    }

    setSavedCode(document.getElementById('codeEditor').value);

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

export function cancelAIMode() {
    const codeEditor = document.getElementById('codeEditor');

    // Если выходим из режима слайдеров - не восстанавливаем savedCode
    // т.к. код уже обновлен через слайдеры
    if (currentAIMode !== 'sliders') {
        codeEditor.value = savedCode;
    }

    codeEditor.readOnly = false;
    setEditorMode('normal', 'Code Editor', '// Напиши свой Strudel-паттерн или загрузи пример...\n// Нажми Play чтобы запустить!');
    setSavedCode('');
}

export async function executeAIGeneration() {
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

export function addGeneratedLoop() {
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

    const newLoopIndex = loops.length - 1;

    updateLoopsGrid();

    // Переходим в обычный режим, сохраняя код
    setSavedCode(code);
    cancelAIMode();

    // Переключаемся на только что добавленный луп
    switchToLoop(newLoopIndex);

    // Обновляем отслеживание изменений
    saveOriginalCode();
    checkEditorChanges();

    console.log(`✅ Добавлен AI луп ${loops.length}, переключились на него`);
}

export function applyEditedLoop() {
    if (currentLoopIndex < 0) {
        alert('Нет активного лупа для обновления');
        return;
    }

    const codeEditor = document.getElementById('codeEditor');
    const code = codeEditor.value.trim();

    if (!code) {
        alert('Редактор пустой');
        return;
    }

    // Обновляем текущий луп с отредактированным кодом
    loops[currentLoopIndex].code = code;
    loops[currentLoopIndex].name = `Loop ${currentLoopIndex + 1} (edited)`;

    updateLoopsGrid();

    // Обновляем savedCode чтобы cancelAIMode не восстановил старый код
    setSavedCode(code);

    // Переходим в обычный режим
    cancelAIMode();

    // Обновляем отслеживание изменений
    saveOriginalCode();
    checkEditorChanges();

    console.log(`✅ Луп ${currentLoopIndex + 1} обновлен через Edit mode`);
}

// ============== MUSICAL CONTEXT ANALYSIS ==============

export function analyzeMusicalContext(code) {
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

export function buildContextualPrompt(userPrompt, musicContext) {
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

// ============== AI GENERATION FUNCTIONS ==============

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

        const response = await fetch(EDIT_API_URL, {
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

        statusDiv.textContent = '✅ Луп отредактирован!';
        statusDiv.className = 'editor-status active success';

        // Показываем кнопку Update Loop для Edit mode с правильным обработчиком
        const updateBtn = document.getElementById('updateBtn');
        updateBtn.onclick = () => window.applyEditedLoop();
        updateBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('❌ Ошибка редактирования:', error);
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.className = 'editor-status active error';
    } finally {
        generateBtn.disabled = false;
    }
}

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
