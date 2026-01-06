// Модуль редактора колод с AI-генерацией для ДУЕЛОГ
// Управляет созданием и сохранением кастомных колод
class DeckEditorManager {
    constructor(deckManager) {
        this.deckManager = deckManager;
        this.serverUrl = 'https://wo-server-v1.onrender.com/api/generate-deck';
        
        // DOM элементы
        this.deckEditorScreen = document.getElementById('deckEditorScreen');
        this.promptInput = document.getElementById('deckPromptInput');
        this.charCount = document.getElementById('promptCharCount');
        this.statusEl = document.getElementById('deckEditorStatus');
        this.loadingEl = document.getElementById('deckEditorLoading');
        this.generateBtn = document.getElementById('generateDeckBtn');

        this._addEventListeners();
    }

    _addEventListeners() {
        if (this.promptInput) {
            this.promptInput.addEventListener('input', () => {
                if (this.charCount) {
                    this.charCount.textContent = this.promptInput.value.length;
                }
            });
        }
    }

    showEditor() {
        if (this.deckEditorScreen) this.deckEditorScreen.classList.remove('hidden');
        const menuScreen = document.getElementById('menuScreen');
        if (menuScreen) menuScreen.classList.add('hidden');
    }

    closeEditor() {
        if (this.deckEditorScreen) this.deckEditorScreen.classList.add('hidden');
        const menuScreen = document.getElementById('menuScreen');
        if (menuScreen) menuScreen.classList.remove('hidden');

        // Reset form
        if (this.promptInput) this.promptInput.value = '';
        if (this.charCount) this.charCount.textContent = '0';
        if (this.statusEl) this.statusEl.textContent = '';
        if (this.loadingEl) this.loadingEl.style.display = 'none';
    }

    async generateDeck() {
        const prompt = this.promptInput.value.trim();

        if (!prompt) {
            this.statusEl.textContent = '⚠️ Пожалуйста, опишите тему дебатов';
            this.statusEl.style.color = '#f39c12';
            return;
        }

        if (prompt.length < 20) {
            this.statusEl.textContent = '⚠️ Описание слишком короткое. Добавьте больше деталей.';
            this.statusEl.style.color = '#f39c12';
            return;
        }

        if (typeof window.CARDS_REFERENCE_JSON === 'undefined') {
            this.statusEl.textContent = '❌ Ошибка: Референс карт не найден.';
            this.statusEl.style.color = '#e74c3c';
            return;
        }

        this.generateBtn.disabled = true;
        this.generateBtn.style.opacity = '0.6';
        this.generateBtn.style.cursor = 'not-allowed';
        this.loadingEl.style.display = 'block';
        this.statusEl.textContent = '';

        try {
            const cardsReference = JSON.stringify(window.CARDS_REFERENCE_JSON);
            console.log('Отправка запроса на генерацию колоды с референсом из глобальной переменной...');

            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt, cardsReference })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Колода успешно сгенерирована');

            this._addGeneratedDeck(data.deck, data.deckName, data.description);

            this.loadingEl.style.display = 'none';
            this.statusEl.textContent = `✅ Колода "${data.deckName}" создана!`;
            this.statusEl.style.color = '#27ae60';

            setTimeout(() => {
                this.closeEditor();
                if (window.showDeckSelector) {
                    window.showDeckSelector();
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Ошибка генерации колоды:', error);
            this.loadingEl.style.display = 'none';
            this.statusEl.textContent = `❌ Ошибка: ${error.message}. Попробуйте еще раз.`;
            this.statusEl.style.color = '#e74c3c';
        } finally {
            this.generateBtn.disabled = false;
            this.generateBtn.style.opacity = '1';
            this.generateBtn.style.cursor = 'pointer';
        }
    }

    _addGeneratedDeck(deckData, deckName, description) {
        // Generate unique ID
        const deckId = 'custom_' + Date.now();

        // Add to CARDS_DATA
        if (typeof CARDS_DATA === 'undefined') {
            window.CARDS_DATA = {};
        }
        CARDS_DATA[`${deckId}.json`] = deckData;

        // Add to deck manager
        const newDeck = {
            id: deckId,
            name: deckName,
            description: description,
            file: `${deckId}.json`,
            theme: 'custom'
        };

        this.deckManager.decks.push(newDeck);

        // Save to localStorage
        const customDecks = JSON.parse(localStorage.getItem('customDecks') || '[]');
        customDecks.push({
            id: deckId,
            name: deckName,
            description: description,
            data: deckData
        });
        localStorage.setItem('customDecks', JSON.stringify(customDecks));

        console.log(`✅ Колода "${deckName}" добавлена в менеджер`);

        // Refresh deck selector
        if (window.renderDeckSelector) {
            window.renderDeckSelector();
        }
    }

    loadCustomDecks() {
        const customDecks = JSON.parse(localStorage.getItem('customDecks') || '[]');
        console.log(`📦 Загружено ${customDecks.length} кастомных колод`);

        customDecks.forEach(customDeck => {
            // Add to CARDS_DATA
            if (typeof CARDS_DATA === 'undefined') {
                window.CARDS_DATA = {};
            }
            CARDS_DATA[`${customDeck.id}.json`] = customDeck.data;

            // Add to deck manager if not already there
            if (!this.deckManager.decks.find(d => d.id === customDeck.id)) {
                this.deckManager.decks.push({
                    id: customDeck.id,
                    name: customDeck.name,
                    description: customDeck.description,
                    file: `${customDeck.id}.json`,
                    theme: 'custom'
                });
            }
        });
    }
}