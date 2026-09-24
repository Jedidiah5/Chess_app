"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  createLathe,
  makeInkMaterial,
  type InkTone,
} from "@/components/three/inkCell";

const PAWN_PROFILE: [number, number][] = [
  [0.0, 0.0],
  [1.45, 0.0],
  [1.45, 0.2],
  [1.34, 0.3],
  [1.28, 0.45],
  [1.28, 0.62],
  [1.12, 0.78],
  [1.0, 0.95],
  [0.82, 1.3],
  [0.66, 1.9],
  [0.55, 2.55],
  [0.5, 2.95],
  [0.72, 3.08],
  [0.94, 3.22],
  [0.94, 3.38],
  [0.62, 3.5],
  [0.42, 3.58],
  [0.0, 3.58],
];

const HEAD_Y = 4.2;
const HEAD_RADIUS = 0.8;
const PAWN_CENTER_Y = 2.5;

function Pawn({ material }: { material: THREE.ShaderMaterial }) {
  const body = useMemo(() => createLathe(PAWN_PROFILE, 56), []);
  return (
    <group position={[0, -PAWN_CENTER_Y, 0]}>
      <mesh geometry={body} material={material} />
      <mesh position={[0, HEAD_Y, 0]} material={material}>
        <sphereGeometry args={[HEAD_RADIUS, 40, 32]} />
      </mesh>
    </group>
  );
}

function FloatingPawn({ tone, frozen }: { tone: InkTone; frozen: boolean }) {
  const material = useMemo(() => makeInkMaterial(tone), [tone]);
  const pawnRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const clock = useRef(0);

  useEffect(() => {
    const handle = (e: PointerEvent) => {
      pointer.current.tx = (e.clientX / (window.innerWidth || 1) - 0.5) * 2;
      pointer.current.ty = (e.clientY / (window.innerHeight || 1) - 0.5) * 2;
    };
    window.addEventListener("pointermove", handle, { passive: true });
    return () => window.removeEventListener("pointermove", handle);
  }, []);

  useFrame((_, delta) => {
    if (frozen) return;
    clock.current += delta;
    const time = clock.current;
    const p = pointer.current;
    p.x += (p.tx - p.x) * 0.05;
    p.y += (p.ty - p.y) * 0.05;

    const bob = Math.sin(time * 1.3) * 0.18;

    if (pawnRef.current) {
      pawnRef.current.position.y = 0.35 + bob;
      pawnRef.current.rotation.set(
        -0.12 + Math.cos(time * 0.8) * 0.05 + p.y * 0.14,
        time * 0.35 + p.x * 0.4,
        -0.1 + Math.sin(time * 0.9) * 0.05 - p.x * 0.12,
      );
    }

    if (shadowRef.current) {
      const s = 1 - bob * 0.35;
      shadowRef.current.scale.set(s, s, s);
      (shadowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.16 - bob * 0.08;
    }
  });

  return (
    <>
      <group ref={pawnRef} position={[0, 0.35, 0]} rotation={[-0.12, 0.6, -0.1]}>
        <Pawn material={material} />
      </group>
      <mesh
        ref={shadowRef}
        position={[0, -2.55, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[1.5, 48]} />
        <meshBasicMaterial
          color="#1F1915"
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = size.width < 360;
    cam.fov = narrow ? 40 : 36;
    cam.position.set(0, 1.2, 11);
    cam.lookAt(0, -0.2, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

export type InkPawnSceneProps = {
  className?: string;
  tone?: InkTone;
};

export function InkPawnScene({ className, tone = "ebony" }: InkPawnSceneProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className={className} style={{ background: "transparent" }}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 1.2, 11], fov: 36, near: 0.1, far: 100 }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <ResponsiveCamera />
        <ambientLight intensity={1.4} color="#f5eedc" />
        <directionalLight position={[5, 12, 8]} intensity={1.8} color="#fffdf7" />
        <FloatingPawn tone={tone} frozen={reducedMotion} />
      </Canvas>
    </div>
  );
}
