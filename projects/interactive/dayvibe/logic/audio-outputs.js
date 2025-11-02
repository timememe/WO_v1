// DAYVIBE - Audio Output Management
// ===================================
// Manages audio output device selection for dual Strudel instances

import { sequencerBridge, loopsBridge } from './audio-bridge.js';

// Populate audio output selectors with available devices
export async function populateAudioOutputs() {
    try {
        console.log('🔊 Populating audio output selectors...');

        // Get available outputs from both bridges
        const [sequencerOutputs, loopsOutputs] = await Promise.all([
            sequencerBridge.getAudioOutputs(),
            loopsBridge.getAudioOutputs()
        ]);

        console.log('Sequencer outputs:', sequencerOutputs);
        console.log('Loops outputs:', loopsOutputs);

        // Populate Sequencer selector
        const sequencerSelect = document.getElementById('sequencerOutput');
        if (sequencerSelect && sequencerOutputs.outputs) {
            sequencerSelect.innerHTML = '<option value="">Default Output</option>';
            sequencerOutputs.outputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.label;
                sequencerSelect.appendChild(option);
            });
        }

        // Populate Loops selector
        const loopsSelect = document.getElementById('loopsOutput');
        if (loopsSelect && loopsOutputs.outputs) {
            loopsSelect.innerHTML = '<option value="">Default Output</option>';
            loopsOutputs.outputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.label;
                loopsSelect.appendChild(option);
            });
        }

        console.log('✅ Audio output selectors populated');

    } catch (error) {
        console.error('❌ Failed to populate audio outputs:', error);
    }
}

// Change Sequencer audio output
export async function changeSequencerOutput(deviceId) {
    try {
        console.log(`🔊 Changing Sequencer output to: ${deviceId || 'Default'}`);
        await sequencerBridge.setAudioOutput(deviceId);
        console.log('✅ Sequencer output changed');
    } catch (error) {
        console.error('❌ Failed to change Sequencer output:', error);
        alert('Failed to change Sequencer output. Check console for details.');
    }
}

// Change Loops audio output
export async function changeLoopsOutput(deviceId) {
    try {
        console.log(`🔊 Changing Loops output to: ${deviceId || 'Default'}`);
        await loopsBridge.setAudioOutput(deviceId);
        console.log('✅ Loops output changed');
    } catch (error) {
        console.error('❌ Failed to change Loops output:', error);
        alert('Failed to change Loops output. Check console for details.');
    }
}
