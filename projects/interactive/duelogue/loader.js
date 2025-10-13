// Система загрузки игры
class GameLoader {
    constructor() {
        this.loadingScreen = document.getElementById('loadingScreen');
        this.loadingText = document.getElementById('loadingText');
        this.loadingDetails = document.getElementById('loadingDetails');
        this.progressBar = document.getElementById('loadingProgressBar');
        this.progress = 0;
        this.loadingSteps = [];
    }

    async init() {
        this.loadingSteps = [
            { name: 'Загрузка модулей игры', weight: 20, action: () => this.waitForModules() },
            { name: 'Инициализация колод карт', weight: 20, action: () => this.initializeDecks() },
            { name: 'Подготовка визуальных ресурсов', weight: 30, action: () => this.preloadVisuals() },
            { name: 'Инициализация игрового движка', weight: 15, action: () => this.initializeEngine() },
            { name: 'Финализация запуска', weight: 15, action: () => this.finalize() }
        ];

        for (const step of this.loadingSteps) {
            this.updateDetails(step.name);
            await step.action();
            this.updateProgress(step.weight);
            await this.delay(300); // Небольшая задержка для плавности
        }

        await this.delay(500);
        this.hideLoadingScreen();
    }

    waitForModules() {
        return new Promise((resolve) => {
            // Проверяем загрузку всех необходимых модулей
            const checkModules = () => {
                if (typeof DECKS_DATA !== 'undefined' &&
                    typeof CARDS_DATA !== 'undefined' &&
                    typeof CardManager !== 'undefined' &&
                    typeof VisualManager !== 'undefined' &&
                    typeof UIManager !== 'undefined' &&
                    typeof GameEngine !== 'undefined') {
                    console.log('✅ Все модули загружены');
                    resolve();
                } else {
                    setTimeout(checkModules, 50);
                }
            };
            checkModules();
        });
    }

    async initializeDecks() {
        // Проверяем доступность колод
        if (typeof DECKS_DATA !== 'undefined') {
            console.log('✅ Колоды инициализированы:', DECKS_DATA.decks.length);
        }
        return Promise.resolve();
    }

    async preloadVisuals() {
        // Проверка визуальных ресурсов (необязательно)
        // Изображения не критичны для игры, используются цветные фоны
        console.log('✅ Визуальная система готова (используются градиентные фоны)');
        return Promise.resolve();
    }

    async initializeEngine() {
        // Инициализация игрового движка
        if (typeof gameEngine !== 'undefined') {
            console.log('✅ Игровой движок готов');
        }
        return Promise.resolve();
    }

    async finalize() {
        // Финальная подготовка
        console.log('✅ Игра готова к запуску');
        return Promise.resolve();
    }

    updateProgress(increment) {
        this.progress += increment;
        this.progress = Math.min(this.progress, 100);
        this.progressBar.style.width = `${this.progress}%`;
        this.loadingText.textContent = `Загрузка... ${Math.round(this.progress)}%`;
    }

    updateDetails(text) {
        this.loadingDetails.textContent = text;
    }

    hideLoadingScreen() {
        this.loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
            // Показываем главное меню
            const menuScreen = document.getElementById('menuScreen');
            if (menuScreen) {
                menuScreen.classList.remove('hidden');
            }
            console.log('✅ Экран загрузки скрыт, игра запущена');
        }, 500);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Инициализация загрузчика при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    const loader = new GameLoader();
    loader.init();
});

console.log('✅ Модуль loader.js загружен');
