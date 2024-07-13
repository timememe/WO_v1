const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawAnimatedFractal(performance.now());
});

function drawCircle(x, y, radius, lineWidth, isLargest) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = 'white';

    if (isLargest) {
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 15;
    } else {
        ctx.shadowBlur = 0;
    }

    ctx.stroke();
    ctx.shadowBlur = 0; // Сбросим значение, чтобы не повлияло на последующие элементы
}

function drawFractal(x, y, radius, depth, time, isLargest) {
    if (depth === 0 || radius < 1) return;

    const cycleTime = 2000; // Время одного цикла в миллисекундах
    const t = (time % cycleTime) / cycleTime;
    let animatedRadius;

    if (isLargest) {
        animatedRadius = radius * t * 3; // Постоянное увеличение самого большого круга в течение цикла
    } else {
        animatedRadius = radius * Math.abs(Math.sin(t * Math.PI));
    }

    const lineWidth = Math.pow(2, depth - 1);

    drawCircle(x, y, animatedRadius, lineWidth, isLargest);

    const newRadius = radius / 2;
    drawFractal(x + newRadius, y, newRadius, depth - 1, time, false);
    drawFractal(x - newRadius, y, newRadius, depth - 1, time, false);
    drawFractal(x, y + newRadius, newRadius, depth - 1, time, false);
    drawFractal(x, y - newRadius, newRadius, depth - 1, time, false);
}

function drawSecondFractal(x, y, radius, depth, time, isLargest) {
    if (depth === 0 || radius < 1) return;

    const cycleTime = 2000; // Время одного цикла в миллисекундах
    const t = (time % cycleTime) / cycleTime;
    let animatedRadius;

    if (isLargest) {
        animatedRadius = radius * t * 3; // Постоянное увеличение самого большого круга в течение цикла
    } else {
        animatedRadius = radius * Math.abs(Math.sin(t * Math.PI));
    }

    const lineWidth = Math.pow(2, depth - 1);

    drawCircle(x, y, animatedRadius, lineWidth, isLargest);

    const newRadius = radius / 2;
    drawFractal(x + newRadius, y, newRadius, depth - 1, time, false);
    drawFractal(x - newRadius, y, newRadius, depth - 1, time, false);
    drawFractal(x, y + newRadius, newRadius, depth - 1, time, false);
    drawFractal(x, y - newRadius, newRadius, depth - 1, time, false);
}

function drawThirdFractal(x, y, radius, depth, time, isLargest) {
    if (depth === 0 || radius < 1) return;

    const cycleTime = 2000; // Время одного цикла в миллисекундах
    const t = (time % cycleTime) / cycleTime;
    let animatedRadius;

    if (isLargest) {
        animatedRadius = radius * t * 3; // Постоянное увеличение самого большого круга в течение цикла
    } else {
        animatedRadius = radius * Math.abs(Math.sin(t * Math.PI));
    }

    const lineWidth = Math.pow(2, depth - 1);

    drawCircle(x, y, animatedRadius, lineWidth, isLargest);

    const newRadius = radius / 2;
    drawFractal(x + newRadius, y, newRadius, depth - 1, time, false);
    drawFractal(x - newRadius, y, newRadius, depth - 1, time, false);
    drawFractal(x, y + newRadius, newRadius, depth - 1, time, false);
    drawFractal(x, y - newRadius, newRadius, depth - 1, time, false);
}

let angle = 0;
let reverseAngle = 0;
let startTime = null;
let showFirst = false;
let showSecond = false;
let showThird = false;

function drawAnimatedFractal(time) {
    if (!startTime) startTime = time;
    const elapsedTime = time - startTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Определяем, когда показывать каждый набор кругов
    if (elapsedTime > 0) showFirst = true;
    if (elapsedTime > 2000) showSecond = true;
    if (elapsedTime > 4000) showThird = true;

    // Рисуем первый набор кругов
    if (showFirst) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        drawFractal(canvas.width / 2, canvas.height / 2, canvas.width / 4, 5, time, true);

        ctx.restore();
    }

    // Рисуем второй набор кругов
    if (showSecond) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(reverseAngle);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        drawSecondFractal(canvas.width / 2, canvas.height / 2, canvas.width / 2, 5, time, true);

        ctx.restore();
    }

    // Рисуем третий набор кругов
    if (showThird) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        drawThirdFractal(canvas.width / 2, canvas.height / 2, canvas.width / 1.5, 5, time, true);

        ctx.restore();
    }

    // Обновляем углы вращения
    angle += 0.01;
    reverseAngle -= 0.01;

    // Если прошел полный цикл (6 секунд), сбрасываем таймеры и начнем заново
    if (elapsedTime > 6000) {
        startTime = time;
        showFirst = false;
        showSecond = false;
        showThird = false;
    }

    requestAnimationFrame(drawAnimatedFractal);
}

requestAnimationFrame(drawAnimatedFractal); // Initial call to start the animation
