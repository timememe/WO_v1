// Визуальный менеджер для ДУЕЛОГ
// Управляет анимациями, речевыми пузырями и визуальными эффектами
// Архитектура: жёсткие состояния с чёткими переходами

// ============================================
// ВИЗУАЛЬНЫЕ СОСТОЯНИЯ
// ============================================
const VisualState = {
    IDLE: 'idle',           // Ожидание хода игрока (статичная картинка)
    PLAYER_TURN: 'player',  // Ход игрока (анимация игрока)
    ENEMY_TURN: 'enemy'     // Ход противника (анимация противника)
};

class VisualManager {
    constructor() {
        // DOM элементы
        this.visualImage = document.getElementById('visualImage');
        this.visualBackground = document.getElementById('visualBackground');
        this.speechBubble = document.getElementById('speechBubble');
        this.statsOverlay = document.getElementById('statsOverlay');
        this.pointsOverlay = document.getElementById('pointsOverlay');

        // Визуальные ассеты для каждого состояния
        this.assets = {
            [VisualState.IDLE]: {
                image: 'images/main.png',
                background: 'images/anim/exp_bg.gif',
                showStats: true
            },
            [VisualState.PLAYER_TURN]: {
                image: 'images/anim/talk_blue.gif',
                background: 'images/anim/exp_bg.gif',
                showStats: false
            },
            [VisualState.ENEMY_TURN]: {
                image: 'images/anim/talk_red.gif',
                background: 'images/anim/exp_bg.gif',
                showStats: false
            }
        };

        // Настройки анимации текста
        this.baseCharDelay = 55;        // ~18 символов в секунду
        this.textPauseMs = 1500;        // Пауза после завершения печати текста

        // Внутреннее состояние
        this.currentState = VisualState.IDLE;
        this.isAnimating = false;       // Флаг активной анимации
        this.typingTimeout = null;
        this.pauseTimeout = null;
        this.currentAnimationResolve = null;
        this.isDestroyed = false;
    }

    // ============================================
    // ОСНОВНОЙ ПУБЛИЧНЫЙ API
    // ============================================

    /**
     * Переход в состояние IDLE (ожидание хода игрока)
     * Показывает статичную картинку и статистику
     */
    async showIdle() {
        return this.transitionToState(VisualState.IDLE, '');
    }

    /**
     * Показ хода игрока
     * @param {string} speechText - Текст для отображения
     * @returns {Promise} - Резолвится после завершения анимации + текста + паузы
     */
    async showPlayerTurn(speechText) {
        return this.transitionToState(VisualState.PLAYER_TURN, speechText);
    }

    /**
     * Показ хода противника
     * @param {string} speechText - Текст для отображения
     * @returns {Promise} - Резолвится после завершения анимации + текста + паузы
     */
    async showEnemyTurn(speechText) {
        return this.transitionToState(VisualState.ENEMY_TURN, speechText);
    }

    // ============================================
    // ВНУТРЕННЯЯ ЛОГИКА ПЕРЕХОДОВ
    // ============================================

    /**
     * Единая точка перехода между состояниями
     * Гарантирует: отмену предыдущей анимации → синхронный показ GIF и текста
     */
    async transitionToState(newState, speechText = '') {
        // 1. Отменяем любую текущую анимацию
        this.cancelCurrentAnimation();

        // 2. Обновляем текущее состояние
        this.currentState = newState;
        this.isAnimating = true;

        try {
            // 3. Обновляем оверлеи (статистика/очки)
            this.updateOverlays(newState);

            // 4. Загружаем GIF (мгновенно из кэша)
            this.loadVisualAssets(newState);

            // 5. Запускаем анимацию текста параллельно с GIF
            if (speechText && speechText.trim() !== '') {
                await this.animateText(speechText);
            }

            // 6. Помечаем анимацию как завершённую
            this.isAnimating = false;

        } catch (error) {
            console.error('Ошибка при переходе в состояние:', newState, error);
            this.isAnimating = false;
            throw error;
        }
    }

    /**
     * Загрузка визуальных ассетов для состояния
     * Использует предзагруженные из loader.js ассеты (из кэша браузера)
     */
    loadVisualAssets(state) {
        const assets = this.assets[state];
        if (!assets) {
            console.warn(`Нет ассетов для состояния: ${state}`);
            return;
        }

        // Форсируем перезагрузку GIF через timestamp для рестарта анимации
        // GIF уже в кэше браузера благодаря loader.js, поэтому загрузка мгновенная
        const timestamp = Date.now();

        // Обновляем источники (мгновенно из кэша)
        if (assets.image) {
            this.visualImage.src = `${assets.image}?t=${timestamp}`;
        }
        if (assets.background) {
            this.visualBackground.src = `${assets.background}?t=${timestamp}`;
        }
    }

    /**
     * Обновление видимости оверлеев (статистика/очки)
     */
    updateOverlays(state) {
        const assets = this.assets[state];
        const showStats = assets?.showStats ?? false;

        if (showStats) {
            this.statsOverlay.classList.add('visible');
            this.pointsOverlay.classList.add('visible');
        } else {
            this.statsOverlay.classList.remove('visible');
            this.pointsOverlay.classList.remove('visible');
        }
    }

    /**
     * Анимация текста с эффектом печати + пауза после завершения
     */
    async animateText(text) {
        // Очищаем и скрываем пузырь перед началом
        this.speechBubble.textContent = '';
        this.speechBubble.classList.remove('visible');

        // Минимальная задержка для синхронизации с началом GIF
        await this.delay(50);

        return new Promise((resolve) => {
            if (this.isDestroyed) {
                resolve();
                return;
            }

            // Сохраняем resolve для возможной отмены
            this.currentAnimationResolve = () => {
                resolve();
                this.currentAnimationResolve = null;
            };

            // Показываем пузырь
            this.speechBubble.classList.add('visible');

            // Печать текста посимвольно
            let index = 0;
            const typeNext = () => {
                if (this.isDestroyed) {
                    if (this.currentAnimationResolve) {
                        this.currentAnimationResolve();
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
                    // Печать завершена - ждём паузу перед скрытием
                    this.typingTimeout = null;
                    this.pauseTimeout = setTimeout(() => {
                        this.pauseTimeout = null;
                        // Скрываем пузырь
                        this.speechBubble.classList.remove('visible');
                        // Резолвим промис
                        if (this.currentAnimationResolve && !this.isDestroyed) {
                            this.currentAnimationResolve();
                        }
                    }, this.textPauseMs);
                }
            };

            typeNext();
        });
    }

    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ============================================

    /**
     * Вычисление задержки для символа (пунктуация = дольше)
     */
    getCharDelay(char) {
        if (!char) return this.baseCharDelay;
        if (char === ' ') return Math.max(20, Math.floor(this.baseCharDelay * 0.6));
        if (char === '\n') return this.baseCharDelay * 1.2;
        if (/[.!?]/.test(char)) return this.baseCharDelay + 220;
        if (/[,:;]/.test(char)) return this.baseCharDelay + 140;
        return this.baseCharDelay;
    }

    /**
     * Отмена текущей анимации
     */
    cancelCurrentAnimation() {
        // Очищаем все таймауты
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
            this.pauseTimeout = null;
        }

        // Резолвим текущий промис если есть
        if (this.currentAnimationResolve) {
            this.currentAnimationResolve();
            this.currentAnimationResolve = null;
        }

        // Очищаем речевой пузырь
        this.speechBubble.textContent = '';
        this.speechBubble.classList.remove('visible');
    }

    /**
     * Промис-обёртка для задержки
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Получить текущее состояние
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Проверка активной анимации
     */
    isCurrentlyAnimating() {
        return this.isAnimating;
    }

    // ============================================
    // УСТАРЕВШИЕ МЕТОДЫ (для обратной совместимости)
    // ============================================

    /**
     * @deprecated Используйте showIdle(), showPlayerTurn(), showEnemyTurn()
     */
    async setVisual(state, text = '') {
        console.warn('setVisual() устарел, используйте showIdle/showPlayerTurn/showEnemyTurn');

        switch(state) {
            case 'idle':
                return this.showIdle();
            case 'player':
                return this.showPlayerTurn(text);
            case 'enemy':
                return this.showEnemyTurn(text);
            default:
                return this.showIdle();
        }
    }

    /**
     * @deprecated Используйте showPlayerTurn() или showEnemyTurn()
     */
    async showSpeech(text, who) {
        console.warn('showSpeech() устарел, используйте showPlayerTurn/showEnemyTurn');
        if (who === 'player') {
            return this.showPlayerTurn(text);
        } else {
            return this.showEnemyTurn(text);
        }
    }

    // ============================================
    // ОЧИСТКА РЕСУРСОВ
    // ============================================

    /**
     * Полное уничтожение менеджера
     */
    destroy() {
        console.log('🧹 Destroying VisualManager');
        this.isDestroyed = true;
        this.cancelCurrentAnimation();

        // Очищаем ссылки на DOM
        this.visualImage = null;
        this.visualBackground = null;
        this.speechBubble = null;
        this.statsOverlay = null;
        this.pointsOverlay = null;
        this.currentAnimationResolve = null;
    }
}

console.log('✅ Модуль visual.js загружен (v2.0 - State Machine Architecture)');
