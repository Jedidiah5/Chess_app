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
import { createLathe, makeInkMaterial } from "@/components/three/inkCell";

const PAPER = "#EAE3D2";

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
          <mesh position={[p.cx * 1.04, 7.1, p.cz * 1.04]} material={ebony}>
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
      {/* Offset to the right third so pawns don't overlap centered text */}
      <group ref={scenePivot} position={[4.5, -0.6, 0]}>
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
    const aspect = size.width / size.height;
    const baseZ = 14.5;
    const z = baseZ * Math.max(1, 1.6 / aspect);
    cam.fov = 40;
    cam.position.set(2.5, 1.0, z);
    cam.lookAt(2.5, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const fired = useRef(false);
  const frames = useRef(0);

  useFrame(() => {
    if (fired.current || !onReady) return;
    frames.current += 1;
    if (frames.current >= 3) {
      fired.current = true;
      onReady();
    }
  });

  return null;
}

function SceneContent({
  frozen,
  onReady,
}: {
  frozen: boolean;
  onReady?: () => void;
}) {
  return (
    <>
      <ResponsiveCamera />
      <ambientLight intensity={1.4} color="#f5eedc" />
      <directionalLight position={[5, 12, 8]} intensity={1.8} color="#fffdf7" />
      <directionalLight
        position={[-6, 8, -5]}
        intensity={1.1}
        color="#e2d7c5"
      />
      <OrbitingRoyals frozen={frozen} />
      <ReadySignal onReady={onReady} />
    </>
  );
}

export type PaperRoyalsSceneProps = {
  className?: string;
  freeze?: boolean;
  onReady?: () => void;
  onContextLost?: () => void;
  onContextRestored?: () => void;
};

export function PaperRoyalsScene({
  className,
  freeze,
  onReady,
  onContextLost,
  onContextRestored,
}: PaperRoyalsSceneProps) {
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
          powerPreference: "default",
        }}
        camera={{ position: [2.5, 1.0, 14.5], fov: 40, near: 0.1, far: 100 }}
        style={{ width: "100%", height: "100%", display: "block" }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            onContextLost?.();
          });
          canvas.addEventListener("webglcontextrestored", () => {
            onContextRestored?.();
          });
        }}
      >
        <SceneContent frozen={frozen} onReady={onReady} />
      </Canvas>
    </div>
  );
}

export { PAPER as ROYALS_PAPER };
