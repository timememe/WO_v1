// DAYVIBE - Main Entry Point
// ===========================

import { initDayvibe } from './logic/core.js';
import { updateLoopsGrid, updateSequencerGrid, setupLiveReload, nextLoop, prevLoop, updateCurrentLoop, checkEditorChanges } from './logic/loops.js';
import {
    openGenerateMode, openEditMode, openContinueMode, openTransitionMode,
    cancelAIMode, executeAIGeneration, addGeneratedLoop, applyEditedLoop
} from './logic/ai.js';
import {
    createVisualizer, updateStatus, playCode, stopCode, loadExample,
    openSlidersMode, updateSlidersButtonVisibility, setupHotkeys, setupEditorListeners
} from './logic/ui.js';
import { initAudioBridges, getSequencerBridge, getLoopsBridge } from './logic/audio-bridge.js';
import { populateAudioOutputs, changeSequencerOutput, changeLoopsOutput } from './logic/audio-outputs.js';

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
window.changeSequencerOutput = changeSequencerOutput;
window.changeLoopsOutput = changeLoopsOutput;

// Export bridge getters for testing
window.getSequencerBridge = getSequencerBridge;
window.getLoopsBridge = getLoopsBridge;

// Test function for dual audio
window.testDualAudio = async () => {
    console.log('🎵 Testing dual audio output...');

    try {
        // Play different patterns in each instance
        console.log('Playing bd on Sequencer (Master)...');
        await getSequencerBridge().evaluate('sound("bd hh sd hh")');

        console.log('Playing cp on Loops (Cue)...');
        await getLoopsBridge().evaluate('sound("cp cp")');

        console.log('✅ Both instances playing! Check your audio outputs.');
        console.log('💡 To stop: testDualAudioStop()');

        return true;
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
};

window.testDualAudioStop = async () => {
    console.log('⏹️ Stopping both instances...');
    await Promise.all([
        getSequencerBridge().stop(),
        getLoopsBridge().stop()
    ]);
    console.log('✅ Both stopped');
};

// ============== INITIALIZATION ==============

async function initApp() {
    try {
        console.log('🎵 DAYVIBE starting...');

        // 1. Создаем визуализатор
        createVisualizer();

        // 2. Инициализируем оба грида
        updateSequencerGrid();
        updateLoopsGrid();

        // 3. Инициализируем Audio Bridges (Dual Strudel Instances)
        console.log('🔧 Initializing dual Strudel instances...');
        await initAudioBridges();
        console.log('✅ Dual audio system ready');

        // 4. Populate audio output selectors
        await populateAudioOutputs();

        // 5. Инициализируем основной Strudel (для UI, может не понадобиться)
        // await initDayvibe();

        // 6. Настраиваем live reload
        setupLiveReload();
        console.log('✅ Live reload mode enabled (active during playback)');

        // 7. Настраиваем hotkeys
        setupHotkeys();

        // 8. Настраиваем editor listeners
        setupEditorListeners();

        // 9. Обновляем статус
        updateStatus('Ready', false);

        console.log('✅ DAYVIBE initialized');
        console.log('');
        console.log('🎵 DUAL AUDIO SYSTEM');
        console.log('   ✓ Sequencer Instance: Ready (Master output)');
        console.log('   ✓ Loops Instance: Ready (Cue output)');
        console.log('');
        console.log('🧪 Test Commands:');
        console.log('   testDualAudio() - Play different patterns in both instances');
        console.log('   testDualAudioStop() - Stop both instances');
        console.log('');
        console.log('⌨️  Hotkeys:');
        console.log('   Ctrl+Enter - Play');
        console.log('   Ctrl+. - Stop');
        console.log('');
        console.log('🎯 Smart AI Features:');
        console.log('   ✓ Auto-detects BPM, tempo, samples from your loops');
        console.log('   ✓ Preserves musical context in Continue/Edit/Transition modes');
        console.log('   ✓ Check console for context analysis during generation');

    } catch (error) {
        console.error('❌ Failed to initialize DAYVIBE:', error);
        updateStatus('Error', false);
        alert('Ошибка загрузки DAYVIBE. Попробуй обновить страницу.');
    }
}

// ============== START ==============

window.addEventListener('DOMContentLoaded', initApp);
