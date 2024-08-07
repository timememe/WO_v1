const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');
const textElement = document.querySelector('.text');

const serverUrl = 'https://wo-server-v1.onrender.com';

async function fetchDailyText() {
    try {
        const response = await fetch(`${serverUrl}/get-news`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        textElement.textContent = data.text;
    } catch (error) {
        console.error('Failed to fetch daily text:', error);
        textElement.textContent = 'Failed to load text. Please try again later.';
    }
}

// Загружаем текст при загрузке страницы
fetchDailyText();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawAnimatedFractal();
});

function drawCircle(x, y, radius, lineWidth) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = 'green';
    ctx.stroke();
}

function drawFractal(x, y, radius, depth, time) {
    if (depth === 0 || radius < 1) return;

    const animatedRadius = radius * Math.abs(Math.sin(time * 0.001));
    const lineWidth = Math.pow(2, depth - 1); // Увеличиваем линию в геометрической прогрессии

    drawCircle(x, y, animatedRadius, lineWidth);

    const newRadius = radius / 2;
    drawFractal(x + newRadius, y, newRadius, depth - 1, time);
    drawFractal(x - newRadius, y, newRadius, depth - 1, time);
    drawFractal(x, y + newRadius, newRadius, depth - 1, time);
    drawFractal(x, y - newRadius, newRadius, depth - 1, time);
}

let angle = 0;
function drawAnimatedFractal(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    drawFractal(canvas.width / 2, canvas.height / 2, canvas.width / 4, 5, time);

    ctx.restore();

    angle += 0.01;
    requestAnimationFrame(drawAnimatedFractal);
}

requestAnimationFrame(drawAnimatedFractal); // Initial call to start the animation
