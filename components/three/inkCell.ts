import * as THREE from "three";

const inkCellVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const inkCellFragmentShader = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uShadowColor;
  uniform vec3 uHighlightColor;
  uniform vec3 uInkOutlineColor;
  uniform vec3 uLightPos;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPos - vWorldPosition);
    vec3 V = normalize(vViewPosition);

    float NdotL = dot(N, L);
    float diffuse = clamp(NdotL * 0.5 + 0.5, 0.0, 1.0);

    float NdotV = max(dot(N, V), 0.0);
    float rim = pow(1.0 - NdotV, 3.2);

    vec3 col = uBaseColor;
    if (diffuse < 0.38) {
      col = uShadowColor;
    } else if (diffuse > 0.78) {
      col = uHighlightColor;
    }

    if (rim > 0.55) {
      col = mix(col, uInkOutlineColor, clamp((rim - 0.55) * 4.0, 0.0, 0.95));
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

export type InkTone = "ebony" | "ivory";

export function makeInkMaterial(tone: InkTone) {
  const dark = tone === "ebony";
  return new THREE.ShaderMaterial({
    vertexShader: inkCellVertexShader,
    fragmentShader: inkCellFragmentShader,
    uniforms: {
      uBaseColor: {
        value: new THREE.Color(dark ? 0x1a1512 : 0xcbc3b3),
      },
      uShadowColor: {
        value: new THREE.Color(dark ? 0x0a0807 : 0x9d9484),
      },
      uHighlightColor: {
        value: new THREE.Color(dark ? 0x38302a : 0xe7dfd2),
      },
      uInkOutlineColor: {
        value: new THREE.Color(dark ? 0x050403 : 0x1a1512),
      },
      uLightPos: { value: new THREE.Vector3(6, 12, 8) },
    },
  });
}

export function createLathe(points: [number, number][], segments = 48) {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
}
