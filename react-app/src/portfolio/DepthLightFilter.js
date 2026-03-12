import { Filter, GlProgram, Texture } from 'pixi.js';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vMaxUV;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
    vMaxUV = uOutputFrame.zw * uInputSize.zw;
}
`;

const fragment = `
in vec2 vTextureCoord;
in vec2 vMaxUV;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uNormalMap;
uniform highp vec4 uInputSize;
uniform vec2 uLightPos;         // Light position in sprite UV space (can be outside 0-1)
uniform float uLightRadius;     // Falloff radius in UV space
uniform float uDiffuseStrength; // Diffuse highlight intensity
uniform float uSpecular;        // Specular highlight intensity
uniform vec3 uLightColor;       // Light tint color
uniform float uLightHeight;     // How high above the surface the light is
uniform vec4 uNormalFrame;      // xy = UV offset, zw = UV size (within spritesheet)

void main(void) {
    vec4 color = texture(uTexture, vTextureCoord);

    if (color.a < 0.01) {
        finalColor = color;
        return;
    }

    vec2 spriteUV = vTextureCoord / vMaxUV;

    // Remap to normal map spritesheet UV
    vec2 normalUV = uNormalFrame.xy + spriteUV * uNormalFrame.zw;

    vec3 normalSample = texture(uNormalMap, normalUV).rgb;
    vec3 normal = normalize(normalSample * 2.0 - 1.0);

    // Point light direction from pixel toward light source
    vec3 lightDir = normalize(vec3(
        uLightPos.x - spriteUV.x,
        uLightPos.y - spriteUV.y,
        uLightHeight
    ));

    // Distance attenuation (soft falloff)
    float dist = distance(spriteUV, uLightPos);
    float attenuation = 1.0 - smoothstep(0.0, uLightRadius, dist);
    attenuation *= attenuation; // Quadratic falloff for more natural look

    // Lambert diffuse
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Blinn-Phong specular
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 24.0) * uSpecular;

    // Additive only — no darkening, just warm highlights
    vec3 highlight = (color.rgb * diffuse * uDiffuseStrength + vec3(1.0) * spec) * uLightColor * attenuation;

    finalColor = vec4(color.rgb + highlight, color.a);
}
`;

function getNormalFrame(tex) {
  if (!tex || !tex.source) return [0, 0, 1, 1];
  const frame = tex.frame;
  const srcW = tex.source.width;
  const srcH = tex.source.height;
  return [
    frame.x / srcW,
    frame.y / srcH,
    frame.width / srcW,
    frame.height / srcH,
  ];
}

export class DepthLightFilter extends Filter {
  constructor(normalTexture, options = {}) {
    const glProgram = GlProgram.from({
      vertex,
      fragment,
      name: 'depth-light-filter',
    });

    const normalSource = normalTexture?.source ?? Texture.WHITE.source;
    const normalFrame = getNormalFrame(normalTexture);
    const lightColor = options.lightColor ?? [1.0, 0.85, 0.5]; // Warm yellow

    super({
      glProgram,
      padding: 0,
      resources: {
        depthLightUniforms: {
          uLightPos: { value: [0.5, 0.5], type: 'vec2<f32>' },
          uLightRadius: { value: options.lightRadius ?? 1.5, type: 'f32' },
          uDiffuseStrength: { value: options.diffuseStrength ?? 0.5, type: 'f32' },
          uSpecular: { value: options.specular ?? 0.35, type: 'f32' },
          uLightColor: { value: new Float32Array(lightColor), type: 'vec3<f32>' },
          uLightHeight: { value: options.lightHeight ?? 0.35, type: 'f32' },
          uNormalFrame: { value: new Float32Array(normalFrame), type: 'vec4<f32>' },
        },
        uNormalMap: normalSource,
        uNormalMapSampler: normalSource.style,
      },
    });
  }

  setNormalTexture(normalTexture) {
    if (normalTexture?.source) {
      this.resources.uNormalMap = normalTexture.source;
      const frame = getNormalFrame(normalTexture);
      this.resources.depthLightUniforms.uniforms.uNormalFrame = new Float32Array(frame);
    }
  }

  get lightPos() { return this.resources.depthLightUniforms.uniforms.uLightPos; }
  set lightPos(value) { this.resources.depthLightUniforms.uniforms.uLightPos = value; }

  get lightRadius() { return this.resources.depthLightUniforms.uniforms.uLightRadius; }
  set lightRadius(value) { this.resources.depthLightUniforms.uniforms.uLightRadius = value; }

  get diffuseStrength() { return this.resources.depthLightUniforms.uniforms.uDiffuseStrength; }
  set diffuseStrength(value) { this.resources.depthLightUniforms.uniforms.uDiffuseStrength = value; }

  get specular() { return this.resources.depthLightUniforms.uniforms.uSpecular; }
  set specular(value) { this.resources.depthLightUniforms.uniforms.uSpecular = value; }

  get lightColor() { return this.resources.depthLightUniforms.uniforms.uLightColor; }
  set lightColor(value) { this.resources.depthLightUniforms.uniforms.uLightColor = new Float32Array(value); }

  get lightHeight() { return this.resources.depthLightUniforms.uniforms.uLightHeight; }
  set lightHeight(value) { this.resources.depthLightUniforms.uniforms.uLightHeight = value; }
}
