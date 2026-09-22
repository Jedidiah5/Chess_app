"use client";

/**
 * Marketing-only scene. Must never be imported from (app)/ or play routes.
 *
 * Paper & Ink King (ebony) and Queen (ivory) on a slow dual orbit with a
 * stepped cel / ink-rim shader. Pointer/touch gently tips the pair.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const PAPER = "#EAE3D2";

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

type InkTone = "ebony" | "ivory";

function makeInkMaterial(tone: InkTone) {
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

function createLathe(points: [number, number][], segments = 48) {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
}

const KING_PROFILE: [number, number][] = [
  [0.0, 0.0],
  [1.7, 0.0],
  [1.7, 0.22],
  [1.58, 0.32],
  [1.52, 0.46],
  [1.52, 0.65],
  [1.38, 0.82],
  [1.32, 1.0],
  [1.18, 1.3],
  [1.02, 1.68],
  [0.92, 2.15],
  [0.82, 2.75],
  [0.72, 3.45],
  [0.65, 4.2],
  [0.68, 4.5],
  [0.85, 4.7],
  [1.08, 4.9],
  [1.12, 5.1],
  [0.92, 5.3],
  [1.05, 5.52],
  [1.26, 5.86],
  [1.3, 6.28],
  [1.15, 6.58],
  [0.85, 6.7],
  [0.0, 6.7],
];

const QUEEN_PROFILE: [number, number][] = [
  [0.0, 0.0],
  [1.65, 0.0],
  [1.65, 0.2],
  [1.52, 0.28],
  [1.44, 0.42],
  [1.42, 0.6],
  [1.28, 0.78],
  [1.2, 0.98],
  [1.05, 1.35],
  [0.88, 1.85],
  [0.72, 2.55],
  [0.62, 3.35],
  [0.56, 4.15],
  [0.62, 4.5],
  [0.78, 4.7],
  [1.02, 4.9],
  [1.04, 5.12],
  [0.86, 5.3],
  [1.05, 5.55],
  [1.28, 5.95],
  [1.44, 6.4],
  [1.36, 6.6],
  [0.98, 6.62],
  [0.0, 6.62],
];

function King({ material }: { material: THREE.ShaderMaterial }) {
  const body = useMemo(() => createLathe(KING_PROFILE), []);
  return (
    <group>
      <mesh geometry={body} material={material} />
      <mesh position={[0, 7.2, 0]} material={material}>
        <boxGeometry args={[0.24, 1.05, 0.22]} />
      </mesh>
      <mesh position={[0, 7.35, 0]} material={material}>
        <boxGeometry args={[0.8, 0.24, 0.22]} />
      </mesh>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 5.0, 0]}
        material={material}
      >
        <torusGeometry args={[1.12, 0.07, 12, 40]} />
      </mesh>
    </group>
  );
}

function Queen({
  ivory,
  ebony,
}: {
  ivory: THREE.ShaderMaterial;
  ebony: THREE.ShaderMaterial;
}) {
  const body = useMemo(() => createLathe(QUEEN_PROFILE), []);
  const petals = useMemo(() => {
    const out: { cx: number; cz: number; angle: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      out.push({
        angle,
        cx: Math.cos(angle) * 1.36,
        cz: Math.sin(angle) * 1.36,
      });
    }
    return out;
  }, []);

  return (
    <group>
      <mesh geometry={body} material={ivory} />
      {petals.map((p, i) => (
        <group key={i}>
          <mesh
            position={[p.cx, 6.82, p.cz]}
            rotation={[Math.sin(p.angle) * 0.18, 0, -Math.cos(p.angle) * 0.18]}
            material={ivory}
          >
            <coneGeometry args={[0.14, 0.55, 8]} />
          </mesh>
          <mesh
            position={[p.cx * 1.04, 7.1, p.cz * 1.04]}
            material={ebony}
          >
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 6.9, 0]} material={ivory}>
        <sphereGeometry args={[0.36, 20, 20]} />
      </mesh>
      <mesh position={[0, 7.34, 0]} material={ebony}>
        <coneGeometry args={[0.12, 0.28, 10]} />
      </mesh>
    </group>
  );
}

function PointerRig({
  onPointer,
}: {
  onPointer: (x: number, y: number) => void;
}) {
  const { gl } = useThree();
  const cb = useRef(onPointer);
  cb.current = onPointer;

  useEffect(() => {
    const el = gl.domElement;
    const handle = (e: PointerEvent | TouchEvent) => {
      const clientX =
        "touches" in e ? e.touches[0]?.clientX : (e as PointerEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0]?.clientY : (e as PointerEvent).clientY;
      if (clientX == null || clientY == null) return;
      const rect = el.getBoundingClientRect();
      const x = (clientX - rect.left) / (rect.width || 1);
      const y = (clientY - rect.top) / (rect.height || 1);
      cb.current((x - 0.5) * 2, (y - 0.5) * 2);
    };
    el.addEventListener("pointermove", handle, { passive: true });
    el.addEventListener("touchmove", handle, { passive: true });
    return () => {
      el.removeEventListener("pointermove", handle);
      el.removeEventListener("touchmove", handle);
    };
  }, [gl]);

  return null;
}

function OrbitingRoyals({ frozen }: { frozen: boolean }) {
  const ebony = useMemo(() => makeInkMaterial("ebony"), []);
  const ivory = useMemo(() => makeInkMaterial("ivory"), []);
  const scenePivot = useRef<THREE.Group>(null);
  const kingRef = useRef<THREE.Group>(null);
  const queenRef = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const clock = useRef(0);

  useFrame((_, delta) => {
    if (frozen) return;
    clock.current += delta;
    const time = clock.current;
    const p = pointer.current;
    p.x += (p.tx - p.x) * 0.05;
    p.y += (p.ty - p.y) * 0.05;

    const orbitSpeed = 0.45;
    const orbitRadius = 2.2;
    const angleKing = time * orbitSpeed;
    const angleQueen = angleKing + Math.PI;

    if (kingRef.current) {
      kingRef.current.position.set(
        Math.cos(angleKing) * orbitRadius,
        -1.5 + Math.sin(time * 1.4) * 0.12,
        Math.sin(angleKing) * (orbitRadius * 0.85),
      );
      kingRef.current.rotation.set(
        -0.2 + Math.cos(time * 0.8) * 0.06 - p.y * 0.1,
        angleKing * 0.55,
        -0.32 + Math.sin(time * 0.9) * 0.06 + p.x * 0.1,
      );
    }

    if (queenRef.current) {
      queenRef.current.position.set(
        Math.cos(angleQueen) * orbitRadius,
        0.2 + Math.cos(time * 1.3) * 0.12,
        Math.sin(angleQueen) * (orbitRadius * 0.85),
      );
      queenRef.current.rotation.set(
        -0.14 + Math.cos(time * 0.95 + 1) * 0.06 - p.y * 0.08,
        angleQueen * 0.55,
        -0.28 + Math.sin(time * 0.85 + 1) * 0.06 + p.x * 0.08,
      );
    }

    if (scenePivot.current) {
      scenePivot.current.rotation.y = p.x * 0.2;
      scenePivot.current.rotation.x = -p.y * 0.1;
    }
  });

  return (
    <>
      <PointerRig
        onPointer={(x, y) => {
          pointer.current.tx = x;
          pointer.current.ty = y;
        }}
      />
      <group ref={scenePivot} position={[0.1, -0.6, 0]}>
        <group ref={kingRef} scale={0.613}>
          <King material={ebony} />
        </group>
        <group ref={queenRef} scale={0.587}>
          <Queen ivory={ivory} ebony={ebony} />
        </group>
      </group>
    </>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = size.width < 640;
    cam.fov = narrow ? 46 : 40;
    cam.position.set(0, narrow ? 0.6 : 1.0, narrow ? 11.5 : 14.5);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function SceneContent({ frozen }: { frozen: boolean }) {
  return (
    <>
      <ResponsiveCamera />
      <ambientLight intensity={1.4} color="#f5eedc" />
      <directionalLight position={[5, 12, 8]} intensity={1.8} color="#fffdf7" />
      <directionalLight position={[-6, 8, -5]} intensity={1.1} color="#e2d7c5" />
      <OrbitingRoyals frozen={frozen} />
    </>
  );
}

export type PaperRoyalsSceneProps = {
  className?: string;
  freeze?: boolean;
};

export function PaperRoyalsScene({ className, freeze }: PaperRoyalsSceneProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const frozen = freeze ?? reducedMotion;

  return (
    <div className={className} style={{ background: "transparent" }}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 1.0, 14.5], fov: 40, near: 0.1, far: 100 }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <SceneContent frozen={frozen} />
      </Canvas>
    </div>
  );
}

export { PAPER as ROYALS_PAPER };
