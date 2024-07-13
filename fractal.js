const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawAnimatedFractal();
});

function drawCircle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'white';
    ctx.stroke();
}

function drawFractal(x, y, radius, depth) {
    if (depth === 0 || radius < 1) return;

    drawCircle(x, y, radius);

    const newRadius = radius / 2;
    drawFractal(x + newRadius, y, newRadius, depth - 1);
    drawFractal(x - newRadius, y, newRadius, depth - 1);
    drawFractal(x, y + newRadius, newRadius, depth - 1);
    drawFractal(x, y - newRadius, newRadius, depth - 1);
}

let angle = 0;
function drawAnimatedFractal() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    drawFractal(canvas.width / 2, canvas.height / 2, canvas.width / 4, 5);

    ctx.restore();

    angle += 0.01;
    requestAnimationFrame(drawAnimatedFractal);
}

drawAnimatedFractal(); // Initial call to start the animation
