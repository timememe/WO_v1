// DAYVIBE - Main Entry Point
// ===========================

import { initDayvibe } from './logic/core.js';
import { updateLoopsGrid, setupLiveReload, nextLoop, prevLoop, updateCurrentLoop, checkEditorChanges } from './logic/loops.js';
import {
    openGenerateMode, openEditMode, openContinueMode, openTransitionMode,
    cancelAIMode, executeAIGeneration, addGeneratedLoop, applyEditedLoop
} from './logic/ai.js';
import {
    createVisualizer, updateStatus, playCode, stopCode, loadExample,
    openSlidersMode, updateSlidersButtonVisibility, setupHotkeys, setupEditorListeners
} from './logic/ui.js';

// ============== GLOBAL EXPORTS FOR HTML ==============
// Экспортируем функции в window для использования в inline onclick handlers

window.playCode = playCode;
window.stopCode = stopCode;
window.nextLoop = nextLoop;
window.prevLoop = prevLoop;
window.openGenerateMode = openGenerateMode;
window.openEditMode = openEditMode;
window.openContinueMode = openContinueMode;
window.openTransitionMode = openTransitionMode;
window.openSlidersMode = openSlidersMode;
window.cancelAIMode = cancelAIMode;
window.executeAIGeneration = executeAIGeneration;
window.addGeneratedLoop = addGeneratedLoop;
window.applyEditedLoop = applyEditedLoop;
window.updateCurrentLoop = updateCurrentLoop;
window.updateSlidersButtonVisibility = updateSlidersButtonVisibility;
window.loadExample = loadExample;

// ============== INITIALIZATION ==============

async function initApp() {
    try {
        console.log('🎵 DAYVIBE starting...');

        // 1. Создаем визуализатор
        createVisualizer();

        // 2. Инициализируем пустой грид лупов
        updateLoopsGrid();

        // 3. Инициализируем Strudel
        await initDayvibe();

        // 4. Настраиваем live reload
        setupLiveReload();
        console.log('✅ Live reload mode enabled (active during playback)');

        // 5. Настраиваем hotkeys
        setupHotkeys();

        // 6. Настраиваем editor listeners
        setupEditorListeners();

        // 7. Обновляем статус
        updateStatus('Ready', false);

        console.log('✅ DAYVIBE initialized');
        console.log('⌨️  Hotkeys:');
        console.log('   Ctrl+Enter - Play');
        console.log('   Ctrl+. - Stop');
        console.log('');
        console.log('🎯 Smart AI Features:');
        console.log('   ✓ Auto-detects BPM, tempo, samples from your loops');
        console.log('   ✓ Preserves musical context in Continue/Edit/Transition modes');
        console.log('   ✓ Check console for context analysis during generation');
        console.log('');
        console.log('💡 Tip: Type loadExample() to load example code with sliders');

    } catch (error) {
        console.error('❌ Failed to initialize DAYVIBE:', error);
        updateStatus('Error', false);
        alert('Ошибка загрузки DAYVIBE. Попробуй обновить страницу.');
    }
}

// ============== START ==============

window.addEventListener('DOMContentLoaded', initApp);
