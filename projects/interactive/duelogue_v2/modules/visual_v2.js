// ============================================
// DUELOGUE v2 - VISUAL MANAGER (Simplified)
// ============================================
// Упрощённая версия визуального менеджера для v2
// Без statsOverlay и pointsOverlay

const VisualState = {
    IDLE: 'idle',
    PLAYER_TURN: 'player',
    ENEMY_TURN: 'enemy'
};

class VisualManager {
    constructor() {
        // DOM элементы
        this.visualImage = document.getElementById('visualImage');
        this.visualBackground = document.getElementById('visualBackground');
        this.speechBubble = document.getElementById('speechBubble');

        // Визуальные ассеты для каждого состояния
        this.assets = {
            [VisualState.IDLE]: {
                image: '../duelogue/images/anim/idle2.gif',
                background: '../duelogue/images/anim/exp_bg.gif'
            },
            [VisualState.PLAYER_TURN]: {
                image: '../duelogue/images/anim/talk_blue.gif',
                background: '../duelogue/images/anim/exp_bg.gif'
            },
            [VisualState.ENEMY_TURN]: {
                image: '../duelogue/images/anim/talk_red.gif',
                background: '../duelogue/images/anim/exp_bg.gif'
            }
        };

        // Настройки анимации текста
        this.baseCharDelay = 55;
        this.textPauseMs = 1500;

        // Внутреннее состояние
        this.currentState = VisualState.IDLE;
        this.isAnimating = false;
        this.typingTimeout = null;
        this.pauseTimeout = null;
        this.currentAnimationResolve = null;
        this.isDestroyed = false;
    }

    // ============================================
    // ОСНОВНОЙ ПУБЛИЧНЫЙ API
    // ============================================

    async showIdle() {
        return this.transitionToState(VisualState.IDLE, '');
    }

    async showPlayerTurn(speechText) {
        return this.transitionToState(VisualState.PLAYER_TURN, speechText);
    }

    async showEnemyTurn(speechText) {
        return this.transitionToState(VisualState.ENEMY_TURN, speechText);
    }

    // ============================================
    // ВНУТРЕННЯЯ ЛОГИКА ПЕРЕХОДОВ
    // ============================================

    async transitionToState(newState, speechText = '') {
        this.cancelCurrentAnimation();
        this.currentState = newState;
        this.isAnimating = true;

        try {
            this.loadVisualAssets(newState);

            if (speechText && speechText.trim() !== '') {
                await this.animateText(speechText);
            }

            this.isAnimating = false;

        } catch (error) {
            console.error('Ошибка при переходе в состояние:', newState, error);
            this.isAnimating = false;
            throw error;
        }
    }

    loadVisualAssets(state) {
        const assets = this.assets[state];
        if (!assets) {
            console.warn(`Нет ассетов для состояния: ${state}`);
            return;
        }

        if (assets.image) {
            if (this.visualImage.src.includes(assets.image.split('?')[0])) {
                this.visualImage.src = '';
                setTimeout(() => {
                    this.visualImage.src = assets.image;
                }, 10);
            } else {
                this.visualImage.src = assets.image;
            }
        }

        if (assets.background) {
            if (this.visualBackground.src.includes(assets.background.split('?')[0])) {
                this.visualBackground.src = '';
                setTimeout(() => {
                    this.visualBackground.src = assets.background;
                }, 10);
            } else {
                this.visualBackground.src = assets.background;
            }
        }
    }

    async animateText(text) {
        this.speechBubble.textContent = '';
        this.speechBubble.classList.remove('visible');

        await this.delay(300);

        return new Promise((resolve) => {
            if (this.isDestroyed) {
                resolve();
                return;
            }

            this.currentAnimationResolve = () => {
                resolve();
                this.currentAnimationResolve = null;
            };

            this.speechBubble.classList.add('visible');

            let index = 0;
            const typeNext = () => {
                if (this.isDestroyed) {
                    if (this.currentAnimationResolve) {
                        this.currentAnimationResolve();
                    }
                    return;
                }

                if (index < text.length) {
                    this.speechBubble.textContent += text[index];
                    const delay = this.getCharDelay(text[index]);
                    index++;
                    this.typingTimeout = setTimeout(typeNext, delay);
                } else {
                    this.typingTimeout = null;
                    this.pauseTimeout = setTimeout(() => {
                        this.pauseTimeout = null;
                        this.speechBubble.classList.remove('visible');
                        if (this.currentAnimationResolve && !this.isDestroyed) {
                            this.currentAnimationResolve();
                        }
                    }, this.textPauseMs);
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

    cancelCurrentAnimation() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
            this.pauseTimeout = null;
        }

        if (this.currentAnimationResolve) {
            this.currentAnimationResolve();
            this.currentAnimationResolve = null;
        }

        this.speechBubble.textContent = '';
        this.speechBubble.classList.remove('visible');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getCurrentState() {
        return this.currentState;
    }

    isCurrentlyAnimating() {
        return this.isAnimating;
    }

    destroy() {
        console.log('🧹 Destroying VisualManager');
        this.isDestroyed = true;
        this.cancelCurrentAnimation();

        this.visualImage = null;
        this.visualBackground = null;
        this.speechBubble = null;
        this.currentAnimationResolve = null;
    }
}

console.log('✅ Модуль visual_v2.js загружен');
