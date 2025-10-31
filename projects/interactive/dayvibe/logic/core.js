// DAYVIBE CORE - State Management + Strudel Initialization
// ============================================================

// ============== STATE ==============
// Playback state
export let isPlaying = false;
export let animationFrame = null;
export let repl = null;
export let currentPattern = null;
export let panicTimeout = null;
export let scheduler = null;
export let audioContext = null;
export let activeNodes = [];
export let isTransitioning = false;

// Loop management
export let loops = [];
export let currentLoopIndex = -1;
export const MAX_LOOPS = 8;

// AI mode state
export let currentAIMode = 'normal';
export let savedCode = '';
export let originalLoopCode = '';

// Sliders state
export let codeSliders = [];
export let slidersEnabled = true;
export let isUpdatingSlider = false;
export let sliderUpdateTimeout = null;
export let liveReloadTimeout = null;

// Setters for external updates
export function setIsPlaying(value) { isPlaying = value; }
export function setAnimationFrame(value) { animationFrame = value; }
export function setRepl(value) { repl = value; }
export function setCurrentPattern(value) { currentPattern = value; }
export function setPanicTimeout(value) { panicTimeout = value; }
export function setScheduler(value) { scheduler = value; }
export function setAudioContext(value) { audioContext = value; }
export function setActiveNodes(value) { activeNodes = value; }
export function setIsTransitioning(value) { isTransitioning = value; }
export function setCurrentLoopIndex(value) { currentLoopIndex = value; }
export function setCurrentAIMode(value) { currentAIMode = value; }
export function setSavedCode(value) { savedCode = value; }
export function setOriginalLoopCode(value) { originalLoopCode = value; }
export function setCodeSliders(value) { codeSliders = value; }
export function setSlidersEnabled(value) { slidersEnabled = value; }
export function setIsUpdatingSlider(value) { isUpdatingSlider = value; }
export function setSliderUpdateTimeout(value) { sliderUpdateTimeout = value; }
export function setLiveReloadTimeout(value) { liveReloadTimeout = value; }

// Array mutations
export function addLoop(loop) { loops.push(loop); }
export function removeLoop(index) { loops.splice(index, 1); }
export function updateLoop(index, loop) { loops[index] = loop; }
export function swapLoops(i, j) { [loops[i], loops[j]] = [loops[j], loops[i]]; }
export function clearLoops() { loops = []; }

// ============== STRUDEL INITIALIZATION ==============

export async function initDayvibe() {
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

        console.log('✅ DAYVIBE core initialized! 🎵');
        return true;

    } catch (error) {
        console.error('❌ Failed to initialize Strudel:', error);
        throw error;
    }
}
