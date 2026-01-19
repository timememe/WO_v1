import { Filter, GlProgram } from 'pixi.js';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uCurvature;
uniform float uScanlineIntensity;
uniform float uScanlineCount;
uniform float uVignetteIntensity;
uniform float uBrightness;
uniform float uChromaOffset;
uniform vec2 uResolution;

// Искривление экрана (barrel distortion)
vec2 curveRemapUV(vec2 uv) {
    vec2 cuv = uv * 2.0 - 1.0;
    vec2 offset = abs(cuv.yx) / vec2(uCurvature, uCurvature);
    cuv = cuv + cuv * offset * offset;
    cuv = cuv * 0.5 + 0.5;
    return cuv;
}

void main(void) {
    // Применяем искривление
    vec2 uv = curveRemapUV(vTextureCoord);

    // Проверяем границы после искривления
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        finalColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Хроматическая аберрация (смещение RGB каналов)
    float chromaOffset = uChromaOffset * 0.001;
    float r = texture(uTexture, vec2(uv.x + chromaOffset, uv.y)).r;
    float g = texture(uTexture, uv).g;
    float b = texture(uTexture, vec2(uv.x - chromaOffset, uv.y)).b;
    float a = texture(uTexture, uv).a;

    vec3 color = vec3(r, g, b);

    // Scanlines (горизонтальные линии)
    float scanline = sin(uv.y * uScanlineCount + uTime * 0.5) * 0.5 + 0.5;
    scanline = pow(scanline, 1.5);
    color *= 1.0 - (scanline * uScanlineIntensity);

    // Вертикальные полосы (RGB субпиксели) - опционально
    float vertLine = sin(uv.x * uResolution.x * 3.14159) * 0.5 + 0.5;
    color *= 0.95 + vertLine * 0.05;

    // Виньетирование (затемнение по краям)
    vec2 vigUV = uv * (1.0 - uv.xy);
    float vig = vigUV.x * vigUV.y * 15.0;
    vig = pow(vig, uVignetteIntensity);
    color *= vig;

    // Яркость
    color *= uBrightness;

    // Небольшое мерцание
    float flicker = 1.0 - (sin(uTime * 8.0) * 0.02);
    color *= flicker;

    finalColor = vec4(color, a);
}
`;

export class CRTFilter extends Filter {
  constructor(options = {}) {
    const glProgram = GlProgram.from({
      vertex,
      fragment,
      name: 'crt-filter',
    });

    super({
      glProgram,
      resources: {
        crtUniforms: {
          uTime: { value: 0, type: 'f32' },
          uCurvature: { value: options.curvature ?? 6.0, type: 'f32' },
          uScanlineIntensity: { value: options.scanlineIntensity ?? 0.15, type: 'f32' },
          uScanlineCount: { value: options.scanlineCount ?? 800.0, type: 'f32' },
          uVignetteIntensity: { value: options.vignetteIntensity ?? 0.3, type: 'f32' },
          uBrightness: { value: options.brightness ?? 1.2, type: 'f32' },
          uChromaOffset: { value: options.chromaOffset ?? 1.0, type: 'f32' },
          uResolution: { value: [800, 600], type: 'vec2<f32>' },
        },
      },
    });

    this._time = 0;
  }

  get time() { return this._time; }
  set time(value) {
    this._time = value;
    this.resources.crtUniforms.uniforms.uTime = value;
  }

  get curvature() { return this.resources.crtUniforms.uniforms.uCurvature; }
  set curvature(value) { this.resources.crtUniforms.uniforms.uCurvature = value; }

  get scanlineIntensity() { return this.resources.crtUniforms.uniforms.uScanlineIntensity; }
  set scanlineIntensity(value) { this.resources.crtUniforms.uniforms.uScanlineIntensity = value; }

  get scanlineCount() { return this.resources.crtUniforms.uniforms.uScanlineCount; }
  set scanlineCount(value) { this.resources.crtUniforms.uniforms.uScanlineCount = value; }

  get vignetteIntensity() { return this.resources.crtUniforms.uniforms.uVignetteIntensity; }
  set vignetteIntensity(value) { this.resources.crtUniforms.uniforms.uVignetteIntensity = value; }

  get brightness() { return this.resources.crtUniforms.uniforms.uBrightness; }
  set brightness(value) { this.resources.crtUniforms.uniforms.uBrightness = value; }

  get chromaOffset() { return this.resources.crtUniforms.uniforms.uChromaOffset; }
  set chromaOffset(value) { this.resources.crtUniforms.uniforms.uChromaOffset = value; }

  setResolution(width, height) {
    this.resources.crtUniforms.uniforms.uResolution = [width, height];
  }
}
