const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function drawCircle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
}

function drawFractal(x, y, radius, depth) {
    if (depth === 0) return;

    drawCircle(x, y, radius);

    const newRadius = radius / 2;
    drawFractal(x + newRadius, y, newRadius, depth - 1);
    drawFractal(x - newRadius, y, newRadius, depth - 1);
    drawFractal(x, y + newRadius, newRadius, depth - 1);
    drawFractal(x, y - newRadius, newRadius, depth - 1);
}

drawFractal(canvas.width / 2, canvas.height / 2, canvas.width / 4, 5);