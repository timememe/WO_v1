const canvas = document.getElementById('fractalCanvas');
const gl = canvas.getContext('webgl');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

if (!gl) {
    console.error('WebGL not supported');
}

const vertexShaderSource = `
attribute vec4 a_position;
void main() {
    gl_Position = a_position;
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

vec2 complexMultiply(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 c = uv * 2.0 - 1.0;
    c.x *= u_resolution.x / u_resolution.y;

    vec2 z = vec2(0.0);
    float iterations = 100.0;
    for (float i = 0.0; i < iterations; i++) {
        if (length(z) > 2.0) break;
        z = complexMultiply(z, z) + c;
    }

    float color = length(z) / 2.0;
    gl_FragColor = vec4(vec3(color), 1.0);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

const success = gl.getProgramParameter(program, gl.LINK_STATUS);
if (!success) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
const timeUniformLocation = gl.getUniformLocation(program, 'u_time');

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
]), gl.STATIC_DRAW);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.useProgram(program);
gl.enableVertexAttribArray(positionAttributeLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

function render(time) {
    time *= 0.001;  // convert to seconds
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(timeUniformLocation, time);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);
