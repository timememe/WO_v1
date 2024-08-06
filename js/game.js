// Game constants
const GRID_SIZE = 40;
const CELL_SIZE = 20;
const INITIAL_SNAKE_LENGTH = 3;


let MAX_HUNGER = 100;
let MAX_HEALTH = 100;
let MAX_SANITY = 100;
let CAREER_MULTIPLIER = 1.1;

const SNAKE_GLOW = 'rgba(0, 255, 0, 0.8)';
const ENEMY_GLOW = 'rgba(255, 0, 0, 0.8)';
const EVENT_GLOW = 'rgba(255, 255, 0, 0.8)';
const FOOD_GLOW = 'rgba(0, 255, 255, 0.8)';

// Colors
const ENEMY_COLORS = {
    hunger: 'orange',
    health: 'red',
    sanity: 'purple'
};
const FOOD_COLORS = {
    normal: 'green',
    special: 'gold'
};

// Game variables
let canvas, ctx;
let snake, food;
let direction;
let score;
let gameLoop;
let hunger, health, sanity;
let dayNightCycle, dayLength;
let gameOverCause;
let enemies = [];
let currentEvent = null;
let eventAreas = [];
let eventLog = [];

let career = 0;
let careerMax = 5;
let level = 1;
let enemyDamageMultiplier = 1;

function adjustLogAreaForMobile() {
    if (isMobile()) {
        const logArea = document.getElementById('log-area');
        
        if (logArea) {
            // Удаляем logArea из его текущего положения
            logArea.parentNode.removeChild(logArea);
            
            // Стилизуем logArea для мобильной версии
            logArea.style.position = 'fixed';
            logArea.style.bottom = '0';
            logArea.style.left = '0';
            logArea.style.width = '100%';
            logArea.style.maxHeight = '30%'; // Занимает не более 30% высоты экрана
            logArea.style.overflowY = 'auto';
            logArea.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            logArea.style.color = 'white';
            logArea.style.padding = '10px';
            logArea.style.boxSizing = 'border-box';
            logArea.style.zIndex = '1000'; // Убедимся, что лог отображается поверх игры
            logArea.style.transition = 'transform 0.3s ease-in-out';
            logArea.style.transform = 'translateY(100%)'; // Изначально скрыт
            logArea.style.wordWrap = 'break-word'; // Добавляем перенос слов
            logArea.style.whiteSpace = 'pre-wrap'; // Сохраняем пробелы и переносы строк

            // Добавляем кнопку для открытия/закрытия лога
            const toggleButton = document.createElement('button');
            toggleButton.textContent = 'Log';
            toggleButton.style.position = 'fixed';
            toggleButton.style.bottom = '0';
            toggleButton.style.right = '10px';
            toggleButton.style.zIndex = '1001';
            toggleButton.style.padding = '5px 10px';
            toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            toggleButton.style.color = 'white';
            toggleButton.style.border = 'none';
            toggleButton.style.borderTopLeftRadius = '5px';
            toggleButton.style.borderTopRightRadius = '5px';

            toggleButton.addEventListener('click', () => {
                if (logArea.style.transform === 'translateY(100%)') {
                    logArea.style.transform = 'translateY(0)';
                } else {
                    logArea.style.transform = 'translateY(100%)';
                }
            });

            // Добавляем элементы обратно в body
            document.body.appendChild(logArea);
            document.body.appendChild(toggleButton);
        }

        // Скрываем event-log, созданный скриптом, если он есть
        const eventLog = document.getElementById('event-log');
        if (eventLog) {
            eventLog.style.display = 'none';
        } 
    }
}

function init() {
    canvas = document.getElementById('game-board');
    ctx = canvas.getContext('2d');

    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;
    canvas.style.boxShadow = '0 0 10px white';

    resetGame();

    // Remove event button listeners
    document.getElementById('button-left').removeEventListener('click', () => handleEvent('left'));
    document.getElementById('button-right').removeEventListener('click', () => handleEvent('right'));

    if (isMobile()) {
        setupTouchControls();
        adjustLogAreaForMobile(); // Вызываем функцию здесь
    } else {
        document.addEventListener('keydown', changeDirection);
    }

    showTutorial();
    updateEventLogDisplay();
    gameLoop = setInterval(update, 100);
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Reset the game state
function resetGame() {
    snake = [{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }];
    for (let i = 1; i < INITIAL_SNAKE_LENGTH; i++) {
        snake.push({ x: snake[0].x - i, y: snake[0].y });
    }
    direction = 'right';
    score = 0;
    hunger = MAX_HUNGER;
    health = MAX_HEALTH;
    sanity = MAX_SANITY;
    dayNightCycle = 0;
    dayLength = 300; // 30 seconds at 100ms intervals
    gameOverCause = '';
    enemies = [];
    currentEvent = null;
    eventAreas = [];
    career = 0;
    careerMax = 10;
    level = 1;
    enemyDamageMultiplier = 1;
    eventLog = []; // Очищаем лог событий
    updateEventLogDisplay(); // Обновляем отображение лога
    updateScore();
    createFood();
    updateEventText("");
}

// Create food at a random position
function createFood() {
    food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
        type: Math.random() < 0.2 ? 'special' : 'normal'
    };
}

// Enemy class
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = this.getColorByType();
        this.moveCooldown = 0;
        this.body = [];
    }

    getColorByType() {
        return ENEMY_COLORS[this.type];
    }

    move() {
        if (this.moveCooldown > 0) {
            this.moveCooldown--;
            return;
        }

        const directions = ['up', 'down', 'left', 'right'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        switch (direction) {
            case 'up': this.y = (this.y - 1 + GRID_SIZE) % GRID_SIZE; break;
            case 'down': this.y = (this.y + 1) % GRID_SIZE; break;
            case 'left': this.x = (this.x - 1 + GRID_SIZE) % GRID_SIZE; break;
            case 'right': this.x = (this.x + 1) % GRID_SIZE; break;
        }

        // Обновляем положение тела
        for (let i = this.body.length - 1; i > 0; i--) {
            this.body[i].x = this.body[i-1].x;
            this.body[i].y = this.body[i-1].y;
        }
        if (this.body.length > 0) {
            this.body[0].x = this.x;
            this.body[0].y = this.y;
        }

        this.moveCooldown = 5; // Enemies move every 5 frames
    }
}

// Function to spawn enemies
function spawnEnemies() {
    const desiredEnemyCount = 3;
    while (enemies.length < desiredEnemyCount) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        const types = ['hunger', 'health', 'sanity'];
        const type = types[Math.floor(Math.random() * types.length)];
        enemies.push(new Enemy(x, y, type));
    }
}

// Function to check enemy collision
function checkEnemyCollision() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = 0; j < snake.length; j++) {
            const segment = snake[j];
            if (segment.x === enemy.x && segment.y === enemy.y) {
                const damage = 10 * enemyDamageMultiplier;
                switch(enemy.type) {
                    case 'hunger':
                        hunger = Math.max(0, hunger - damage);
                        break;
                    case 'health':
                        health = Math.max(0, health - damage);
                        break;
                    case 'sanity':
                        sanity = Math.max(0, sanity - damage);
                        break;
                }
                
                // Remove the enemy
                enemies.splice(i, 1);
                
                // Remove last segment of snake if collision is not with head
                if (j !== 0 && snake.length > 1) {
                    snake.pop();
                }
                
                addToEventLog(`Столкновение с ${enemy.type} врагом! -${damage} ${enemy.type}`);
                
                setTimeout(spawnEnemies, 2000);
                
                return;
            }
        }
    }
}

/*
function getRandomEvent() {
    const events = [
        {
            name: "Энергетический всплеск",
            options: [
                { color: "yellow", text: "Жёлтый портал", effect: () => { sanity += 20; return "Ваше здоровье улучшилось!"; } },
                { color: "blue", text: "Синий портал", effect: () => { hunger -= 20; return "Вы чувствуете голод!"; } }
            ]
        },
        {
            name: "Таинственный портал",
            options: [
                { color: "purple", text: "Фиолетовый портал", effect: () => { score += 5; return "Вы нашли сокровище!"; } },
                { color: "green", text: "Зелёный портал", effect: () => { snake.push({...snake[snake.length-1]}); return "Ваша змейка выросла!"; } }
            ]
        }
    ];
    return events[Math.floor(Math.random() * events.length)];
}
*/

function startRandomEvent() {
    if (currentEvent) return; // Don't start a new event if one is in progress
    currentEvent = getRandomEvent(); // This now uses the function from events.js
    updateEventText(currentEvent.name);
    updateEventButtons(currentEvent);
    createEventAreas();
    addToEventLog(`Новое событие: ${currentEvent.name}`);
}

function addToEventLog(event) {
    const distortedEvent = distortText(event, sanity);
    eventLog.push(distortedEvent);
    if (eventLog.length > 5) {
        eventLog.shift();
    }
    updateEventLogDisplay();
}

function updateEventLogDisplay() {
    const desktopLogElement = document.getElementById('event-log');
    const mobileLogArea = document.getElementById('log-area');
    
    const logContent = eventLog.map(event => `<p style="margin: 5px 0; word-wrap: break-word;">${event}</p>`).join('');
    
    if (desktopLogElement) {
        desktopLogElement.innerHTML = logContent;
    }
    
    if (mobileLogArea) {
        mobileLogArea.innerHTML = logContent;
    }
}

function updateEventButtons(event) {
    const leftButton = document.getElementById('button-left');
    const rightButton = document.getElementById('button-right');
    
    if (event) {
        leftButton.style.backgroundColor = event.options[0].color;
        rightButton.style.backgroundColor = event.options[1].color;
        leftButton.textContent = distortText(event.options[0].text, sanity);
        rightButton.textContent = distortText(event.options[1].text, sanity);
        leftButton.style.display = 'inline-block';
        rightButton.style.display = 'inline-block';
    } else {
        leftButton.style.display = 'none';
        rightButton.style.display = 'none';
    }
}

function createEventAreas() {
    eventAreas = currentEvent.options.map(option => {
        return {
            x: Math.floor(Math.random() * (GRID_SIZE - 2)),
            y: Math.floor(Math.random() * (GRID_SIZE - 2)),
            width: 2,
            height: 2,
            color: option.color,
            option: option
        };
    });
}

function checkEventCollision() {
    if (!currentEvent) return;
    const head = snake[0];
    eventAreas.forEach(area => {
        if (head.x >= area.x && head.x < area.x + area.width &&
            head.y >= area.y && head.y < area.y + area.height) {
            resolveEvent(area.option);
        }
    });
}

function resolveEvent(option) {
    const result = option.effect();
    updateEventText(result);
    addToEventLog(option.logText);
    currentEvent = null;
    eventAreas = [];
    updateEventButtons(null);
    setTimeout(() => updateEventText(""), 3000);
}

// Update event text
function updateEventText(text) {
    const distortedText = distortText(text, sanity);
    document.getElementById('event-text').textContent = distortedText;
}

// Update hunger
function updateHunger() {
    hunger = Math.max(0, hunger - 0.1);
}

// Update health
function updateHealth() {
    if (hunger < 30) {
        health = Math.max(0, health - 0.1);
    } else if (hunger > 70 && health < MAX_HEALTH) {
        health = Math.min(MAX_HEALTH, health + 0.05);
    }
    if (sanity < 30) {
        health = Math.max(0, health - 0.05);
    }
    
    // Обновляем отображение здоровья
    document.getElementById('health-value').textContent = Math.round(health);
}

// Update sanity
function updateSanity() {
    if (dayNightCycle < dayLength / 2) {
        sanity = Math.min(MAX_SANITY, sanity + 0.05);
    } else {
        sanity = Math.max(0, sanity - 0.1);
    }
}

// Update day/night cycle
function updateDayNightCycle() {
    dayNightCycle = (dayNightCycle + 1) % dayLength;
}

// Update game state
function update() {
    moveSnake();
    spawnEnemies();
    enemies.forEach(enemy => enemy.move());
    
    if (checkCollision() || health <= 0) {
        gameOver();
        return;
    }
    
    checkEnemyCollision();
    checkEventCollision();
    
    if (snake[0].x === food.x && snake[0].y === food.y) {
        score++;
        career++;
        if (food.type === 'normal') {
            health = Math.min(MAX_HEALTH, health + 20);
        } else if (food.type === 'special') {
            hunger = Math.min(MAX_HUNGER, hunger + 20);
            sanity = Math.min(MAX_SANITY, sanity + 30);
        }

        if (career >= careerMax) {
            levelUp();
        }

        updateScore();
        createFood();
    } else {
        snake.pop();
    }
    
    updateHunger();
    updateHealth();
    updateSanity();
    updateStatusBars();
    updateDayNightCycle();
    
    if (!currentEvent && Math.random() < 0.01) {
        startRandomEvent();
    }
    
    draw();
}

// Move the snake
function moveSnake() {
    const head = { x: snake[0].x, y: snake[0].y };
    switch (direction) {
        case 'up': head.y = (head.y - 1 + GRID_SIZE) % GRID_SIZE; break;
        case 'down': head.y = (head.y + 1) % GRID_SIZE; break;
        case 'left': head.x = (head.x - 1 + GRID_SIZE) % GRID_SIZE; break;
        case 'right': head.x = (head.x + 1) % GRID_SIZE; break;
    }
    snake.unshift(head);
}

// Check for collisions
function checkCollision() {
    const head = snake[0];
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOverCause = 'Змейка врезалась в себя!';
            return true;
        }
    }
    return false;
}

function levelUp() {
    level++;
    pauseGame();
    showLevelUpPopup();
}

function pauseGame() {
    clearInterval(gameLoop);
}

function resumeGame() {
    gameLoop = setInterval(update, 100);
}

function createPopup(id, content) {
    const overlay = document.createElement('div');
    overlay.id = 'popup-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.zIndex = '1000';

    const popup = document.createElement('div');
    popup.id = id;
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = '#222';
    popup.style.color = 'white';
    popup.style.padding = '20px';
    popup.style.borderRadius = '10px';
    popup.style.zIndex = '1001';
    popup.style.textAlign = 'center';
    popup.style.boxShadow = '0 0 20px white';
    popup.innerHTML = content;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    return popup;
}

function showTutorial() {
    const content = isMobile() ?
        "<h2>Как играть</h2><p>Свайпай змейкой</p>" :
        "<h2>Как играть</h2><p>Двигай стрелками</p>";
    
    const popup = createPopup('tutorial-popup', content);
    const closeButton = document.createElement('button');
    closeButton.textContent = "Понятно";
    closeButton.onclick = () => {
        document.getElementById('tutorial-popup').remove();
        document.getElementById('popup-overlay').remove();
    };
    popup.appendChild(closeButton);
}

function showLevelUpPopup() {
    const content = `
        <h2>Уровень повышен!</h2>
        <p>Выберите характеристику для улучшения:</p>
        <button id="upgrade-health">Здоровье</button>
        <button id="upgrade-hunger">Голод</button>
        <button id="upgrade-sanity">Рассудок</button>
    `;
    const popup = createPopup('level-up-popup', content);

    // Стилизуем кнопки
    const buttons = popup.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.margin = '5px';
        button.style.padding = '10px 20px';
        button.style.fontSize = '16px';
        button.style.cursor = 'pointer';
        button.style.backgroundColor = '#444';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
    });

    // Добавляем обработчики событий для кнопок
    document.getElementById('upgrade-health').addEventListener('click', () => upgradeCharacteristic('health'));
    document.getElementById('upgrade-hunger').addEventListener('click', () => upgradeCharacteristic('hunger'));
    document.getElementById('upgrade-sanity').addEventListener('click', () => upgradeCharacteristic('sanity'));
}

function upgradeCharacteristic(characteristic) {
    switch(characteristic) {
        case 'health':
            MAX_HEALTH = Math.floor(MAX_HEALTH * 1.1);
            health = MAX_HEALTH;
            break;
        case 'hunger':
            MAX_HUNGER = Math.floor(MAX_HUNGER * 1.1);
            hunger = MAX_HUNGER;
            break;
        case 'sanity':
            MAX_SANITY = Math.floor(MAX_SANITY * 1.1);
            sanity = MAX_SANITY;
            break;
    }

    if (level > 5) {
        extendRandomEnemy();
    }

    document.getElementById('level-up-popup').remove();
    document.getElementById('popup-overlay').remove();
    
    career = 0;
    careerMax = Math.floor(careerMax * (level <= 5 ? CAREER_MULTIPLIER : 2));
    enemyDamageMultiplier += 0.05;
    spawnAdditionalEnemy();
    
    addToEventLog(`Уровень повышен до ${level}! ${characteristic} улучшен.`);
    
    resumeGame();
}

function extendRandomEnemy() {
    if (enemies.length > 0) {
        const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
        randomEnemy.body = randomEnemy.body || [];
        randomEnemy.body.push({x: randomEnemy.x, y: randomEnemy.y});
    }
}

function spawnAdditionalEnemy() {
    const types = ['hunger', 'health', 'sanity'];
    const type = types[Math.floor(Math.random() * types.length)];
    enemies.push(new Enemy(
        Math.floor(Math.random() * GRID_SIZE),
        Math.floor(Math.random() * GRID_SIZE),
        type
    ));
}

function showGameOverPopup() {
    const content = `
        <h2>Игра окончена!</h2>
        <p>${gameOverCause}</p>
        <p>Ваш счет: ${score}</p>
        <button id="restart-button">Начать заново</button>
    `;
    const popup = createPopup('game-over-popup', content);
    document.getElementById('restart-button').addEventListener('click', () => {
        document.getElementById('game-over-popup').remove();
        document.getElementById('popup-overlay').remove();
        resetGame();
        gameLoop = setInterval(update, 100);
    });

    const button = popup.querySelector('button');
    button.style.margin = '5px';
    button.style.padding = '10px 20px';
    button.style.fontSize = '16px';
    button.style.cursor = 'pointer';

    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.3s ease-in-out';
    setTimeout(() => {
        popup.style.opacity = '1';
    }, 10);
}

function gameOver() {
    clearInterval(gameLoop);
    
    if (health <= 0) {
        gameOverCause = 'У змейки закончилось здоровье!';
    }
    
    addToEventLog(`Игра окончена: ${gameOverCause}`);
    
    showGameOverPopup();
}

// Change snake direction based on key press
function changeDirection(event) {
    const key = event.key;
    if (key === 'ArrowUp' && direction !== 'down') direction = 'up';
    if (key === 'ArrowDown' && direction !== 'up') direction = 'down';
    if (key === 'ArrowLeft' && direction !== 'right') direction = 'left';
    if (key === 'ArrowRight' && direction !== 'left') direction = 'right';
}

// Draw the game state
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply day/night filter
    ctx.fillStyle = dayNightCycle >= dayLength / 2 ? 'rgba(72, 61, 139, 0.3)' : 'rgba(173, 216, 230, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw snake
    ctx.shadowBlur = 10;
    ctx.shadowColor = SNAKE_GLOW;
    ctx.fillStyle = 'green';
    snake.forEach(segment => {
        ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    // Draw food
    ctx.shadowColor = FOOD_GLOW;
    ctx.fillStyle = FOOD_COLORS[food.type];
    ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Draw enemies
    enemies.forEach(enemy => {
        ctx.shadowColor = ENEMY_GLOW;
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x * CELL_SIZE, enemy.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        enemy.body.forEach(segment => {
            ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        });
    });

    // Draw event areas
    eventAreas.forEach(area => {
        ctx.shadowColor = EVENT_GLOW;
        ctx.fillStyle = area.color;
        ctx.fillRect(area.x * CELL_SIZE, area.y * CELL_SIZE, area.width * CELL_SIZE, area.height * CELL_SIZE);
    });

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Draw level
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Уровень: ${level}`, 10, 30);

    /*
    // Draw career progress
    ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';  // Полупрозрачный синий
    const progressWidth = (career / careerMax) * (canvas.width - 20);
    ctx.fillRect(10, canvas.height - 30, progressWidth, 20);
    
    // Draw career progress border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, canvas.height - 30, canvas.width - 20, 20);
    */

    // Draw career progress text
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${career}/${careerMax}`, canvas.width / 2, canvas.height - 15);

    // Update status bars
    updateStatusBars();
}

function setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, false);

    document.addEventListener('touchend', function(e) {
        let touchEndX = e.changedTouches[0].screenX;
        let touchEndY = e.changedTouches[0].screenY;

        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, false);
}

function handleSwipe(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && direction !== 'left') direction = 'right';
        else if (dx < 0 && direction !== 'right') direction = 'left';
    } else {
        if (dy > 0 && direction !== 'up') direction = 'down';
        else if (dy < 0 && direction !== 'down') direction = 'up';
    }
}

function distortText(text, sanityLevel) {
    if (sanityLevel > 80) return text; // Нормальный уровень, без искажений

    const glitchChars = '!@#$%^&*()_+-={}[]|;:,.<>?';
    let distortedText = '';

    // Определяем уровень искажения
    let distortionLevel = 0;
    if (sanityLevel <= 30) distortionLevel = 3;
    else if (sanityLevel <= 60) distortionLevel = 2;
    else if (sanityLevel <= 80) distortionLevel = 1;

    for (let char of text) {
        if (Math.random() < distortionLevel * 0.1) {
            // Заменяем символ на случайный глич-символ
            distortedText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
        } else if (Math.random() < distortionLevel * 0.2 && char !== ' ') {
            // Искажаем символ
            distortedText += String.fromCharCode(char.charCodeAt(0) + Math.floor(Math.random() * 5) - 2);
        } else {
            distortedText += char;
        }
    }

    if (distortionLevel === 3) {
        // Добавляем случайные глитч-вставки для самого низкого уровня sanity
        const glitchInsert = glitchChars[Math.floor(Math.random() * glitchChars.length)].repeat(Math.floor(Math.random() * 3) + 1);
        const insertPosition = Math.floor(Math.random() * distortedText.length);
        distortedText = distortedText.slice(0, insertPosition) + glitchInsert + distortedText.slice(insertPosition);
    }

    return distortedText;
}

function updateStatusBars() {
    updateStatusBar('hunger', hunger, MAX_HUNGER);
    updateStatusBar('health', health, MAX_HEALTH);
    updateStatusBar('sanity', sanity, MAX_SANITY);
    updateStatusBar('career', career, careerMax);
}

function updateStatusBar(id, value, maxValue) {
    const bar = document.getElementById(`${id}-bar`);
    const span = document.getElementById(`${id}-value`);
    const percentage = (value / maxValue) * 100;
    
    bar.style.background = `linear-gradient(to right, ${getColor(id)} ${percentage}%, #555 ${percentage}%)`;
    
    const statusText = id === 'career' ? `${Math.round(value)}/${maxValue}` : Math.round(value).toString();
    const distortedStatusText = distortText(statusText, sanity);
    span.textContent = distortedStatusText;
}

function getColor(id) {
    switch(id) {
        case 'hunger': return '#ffa500';
        case 'health': return '#ff0000';
        case 'sanity': return '#800080';
        case 'career': return '#0000ff';
        default: return '#ddd';
    }
}

// Update score display
function updateScore() {
    const scoreText = `Score: ${score}`;
    const distortedScoreText = distortText(scoreText, sanity);
    document.getElementById('score-value').textContent = distortedScoreText;
}

// Start the game when the page loads
window.onload = init;