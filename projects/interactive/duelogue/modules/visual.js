// Визуальный менеджер для ДУЕЛОГ
// Управляет анимациями, речевыми пузырями и визуальными эффектами

class VisualManager {
    constructor() {
        this.visualImage = document.getElementById('visualImage');
        this.visualBackground = document.getElementById('visualBackground');
        this.speechBubble = document.getElementById('speechBubble');
        this.statsOverlay = document.getElementById('statsOverlay');
        this.pointsOverlay = document.getElementById('pointsOverlay');
        this.assets = {
            idle: { image: 'images/main.png', background: 'images/anim/exp_bg.gif' },
            player: { image: 'images/anim/talk_blue.gif', background: 'images/anim/exp_bg.gif' },
            enemy: { image: 'images/anim/talk_red.gif', background: 'images/anim/exp_bg.gif' }
        };
        this.baseCharDelay = 55; // ~18 символов в секунду
        this.readingPauseMs = 3000;
        this.typingTimeout = null;
        this.pauseTimeout = null;
        this.currentSpeechResolve = null;
        this.isDestroyed = false;
        this.currentState = 'idle'; // Отслеживаем текущее состояние
        this.pendingVisualChange = null; // Очередь изменений визуала
    }

    async setVisual(state, text = '') {
        // Отменяем предыдущую анимацию и речь
        this.cancelSpeech();

        // Сохраняем текущее состояние
        this.currentState = state;

        const assets = this.assets[state] ?? this.assets.idle;

        // Сначала скрываем речевой пузырь
        this.speechBubble.classList.remove('visible');

        // Обновляем визуал с небольшой задержкой для синхронизации
        if (assets) {
            // Форсируем перезагрузку GIF добавлением таймстампа
            const timestamp = new Date().getTime();
            this.visualImage.src = `${assets.image}?t=${timestamp}`;
            this.visualBackground.src = `${assets.background}?t=${timestamp}`;
        }

        // Обновляем видимость оверлеев
        if (state === 'idle') {
            this.statsOverlay.classList.add('visible');
            this.pointsOverlay.classList.add('visible');
        } else {
            this.statsOverlay.classList.remove('visible');
            this.pointsOverlay.classList.remove('visible');
        }

        // Небольшая задержка перед показом текста для синхронизации с анимацией
        if (text) {
            await this.delay(100);
        }

        // Показываем речевой пузырь
        return this.showSpeechBubble(text);
    }

    showSpeechBubble(text) {
        // Очищаем и прячем пузырь
        this.speechBubble.textContent = '';
        this.speechBubble.classList.remove('visible');

        if (!text || text.trim() === '') {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            // Проверяем, не уничтожен ли менеджер
            if (this.isDestroyed) {
                resolve();
                return;
            }

            // Сохраняем resolve для возможной отмены
            this.currentSpeechResolve = () => {
                resolve();
                this.currentSpeechResolve = null;
            };

            // Показываем пузырь
            this.speechBubble.classList.add('visible');

            let index = 0;
            const typeNext = () => {
                // Проверка безопасности: останавливаемся если уничтожено
                if (this.isDestroyed) {
                    if (this.currentSpeechResolve) {
                        this.currentSpeechResolve();
                    }
                    return;
                }

                if (index < text.length) {
                    // Добавляем следующий символ
                    this.speechBubble.textContent += text[index];
                    const delay = this.getCharDelay(text[index]);
                    index++;
                    this.typingTimeout = setTimeout(typeNext, delay);
                } else {
                    // Печать завершена, ждём перед скрытием
                    this.typingTimeout = null;
                    this.pauseTimeout = setTimeout(() => {
                        this.pauseTimeout = null;
                        // Скрываем пузырь
                        this.speechBubble.classList.remove('visible');
                        // Резолвим промис если всё ещё активно
                        if (this.currentSpeechResolve && !this.isDestroyed) {
                            this.currentSpeechResolve();
                        }
                    }, this.readingPauseMs);
                }
            };

            typeNext();
        });
    }

    getCharDelay(char) {
        if (!char) return this.baseCharDelay;
        if (char === ' ') return Math.max(20, Math.floor(this.baseCharDelay * 0.6));
        if (char === '\n') return this.baseCharDelay * 1.2;
        if (/[.!?]/.test(char)) return this.baseCharDelay + 220;
        if (/[,:;]/.test(char)) return this.baseCharDelay + 140;
        return this.baseCharDelay;
    }

    cancelSpeech() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
            this.pauseTimeout = null;
        }
        if (this.currentSpeechResolve) {
            this.currentSpeechResolve();
            this.currentSpeechResolve = null;
        }
        this.speechBubble.textContent = '';
        this.speechBubble.classList.remove('visible');
    }

    async showSpeech(text, who) {
        // Вспомогательный метод для показа речи с правильным визуалом
        return this.setVisual(who, text);
    }

    // Вспомогательный метод для задержки
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Метод для полной очистки ресурсов
    destroy() {
        console.log('🧹 Destroying VisualManager');
        this.isDestroyed = true;
        this.cancelSpeech();

        // Clear any references
        this.visualImage = null;
        this.visualBackground = null;
        this.speechBubble = null;
        this.statsOverlay = null;
        this.pointsOverlay = null;
        this.currentSpeechResolve = null;
        this.pendingVisualChange = null;
    }
}

console.log('✅ Модуль visual.js загружен');
