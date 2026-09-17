"use client";

/**
 * Marketing-only scene. Must never be imported from (app)/ or play routes.
 *
 * Two slim paper-craft pawns orbiting a shared centre on one slow, constant,
 * linear revolution — no easing, no bounce. Facets come from low-segment lathe
 * geometry plus flat shading; the ink contour is a back-face hull. Lighting is
 * deliberately flat so the pair reads as printed tone, not shiny plastic.
 */

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CREAM = "#fbf6ec";
const INK = "#241d15";
const PAPER = "#e8dfcc";

/** One full revolution, very slow and constant. */
const ORBIT_SECONDS = 74;
const SELF_SPIN_SECONDS = 46;
const ORBIT_RADIUS = 0.7;
/** Ring tilt. Steep enough that the far pawn clears the near one at the crossings. */
const ORBIT_TILT = 0.46;

/**
 * Slim Staunton pawn as lathe points (x = radius, y = height).
 * Straight plinth wall, a stem with real weight, and a head narrower than
 * the base — tall and drawn, never squat.
 */
const PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.34, 0.0],
  [0.345, 0.046], // plinth wall
  [0.3, 0.076], // chamfer
  [0.256, 0.096],
  [0.226, 0.116],
  [0.246, 0.136], // collar ring
  [0.226, 0.156],
  [0.176, 0.186], // stem springs from the collar
  [0.156, 0.28],
  [0.138, 0.4],
  [0.126, 0.52],
  [0.118, 0.602], // neck, narrowest point
  [0.15, 0.646], // ring beneath the head
  [0.116, 0.676],
  [0.146, 0.716], // head
  [0.185, 0.786],
  [0.19, 0.85], // head at its widest
  [0.16, 0.915],
  [0.096, 0.962],
  [0.0, 0.98],
];

/**
 * One shared geometry for the whole page. Module scope on purpose: a
 * per-component instance plus an unmount dispose gets torn down by StrictMode's
 * double effect invoke in dev, leaving the second mount with dead buffers.
 */
let pawnGeometry: THREE.LatheGeometry | null = null;

function getPawnGeometry() {
  if (!pawnGeometry) {
    const pts = PROFILE.map(([x, y]) => new THREE.Vector2(x, y));
    // Low segment count is deliberate: visible facets read as folded paper.
    pawnGeometry = new THREE.LatheGeometry(pts, 20);
  }
  return pawnGeometry;
}

function Pawn({ tone }: { tone: "cream" | "ink" }) {
  const geometry = getPawnGeometry();
  const isCream = tone === "cream";

  return (
    <group>
      {/* Ink contour — back-face hull, inflated a hair */}
      <mesh geometry={geometry} scale={[1.07, 1.03, 1.07]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={isCream ? CREAM : INK}
          roughness={1}
          metalness={0}
          flatShading
        />
      </mesh>

      {/* Cast shadow as a flat printed ellipse — no shadow map, no grey smear */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0.03, 0.004, 0.12]}
        scale={[1, 0.82, 1]}
      >
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial
          color="#6b4a22"
          transparent
          opacity={0.13}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function OrbitingPawns({ frozen }: { frozen: boolean }) {
  const orbit = useRef<THREE.Group>(null);
  const cream = useRef<THREE.Group>(null);
  const ink = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (frozen) return;
    const orbitStep = (delta * Math.PI * 2) / ORBIT_SECONDS;
    const selfStep = (delta * Math.PI * 2) / SELF_SPIN_SECONDS;
    if (orbit.current) orbit.current.rotation.y += orbitStep;
    // Counter-spin the pair so it never reads as one rigid prop.
    if (cream.current) cream.current.rotation.y += selfStep;
    if (ink.current) ink.current.rotation.y -= selfStep;
  });

  return (
    // Shifted down so the pair is centred on the origin the camera aims at.
    // The ring is tilted enough that the far pawn rides higher in frame — that
    // is what keeps the two from collapsing into one silhouette mid-sweep.
    <group rotation={[ORBIT_TILT, 0, 0.035]} position={[0, -0.36, 0]}>
      {/* Open just off the flat row, so first paint already has depth. */}
      <group ref={orbit} rotation={[0, Math.PI * 0.1, 0]}>
        <group ref={cream} position={[-ORBIT_RADIUS, 0, 0]}>
          <Pawn tone="cream" />
        </group>
        <group ref={ink} position={[ORBIT_RADIUS, 0, 0]} scale={0.97}>
          <Pawn tone="ink" />
        </group>
      </group>
    </group>
  );
}

function SceneContent({ frozen }: { frozen: boolean }) {
  return (
    <>
      <color attach="background" args={[PAPER]} />

      {/* Flat, warm key: enough to model the facets, not enough to gloss them */}
      <ambientLight intensity={1.02} color="#fff7ea" />
      <directionalLight position={[2.4, 3.6, 3.4]} intensity={0.5} color="#ffeed6" />
      <directionalLight position={[-3.2, 1.2, -1.4]} intensity={0.14} color="#c9b596" />

      <OrbitingPawns frozen={frozen} />
    </>
  );
}

export type PaperPawnsSceneProps = {
  className?: string;
  freeze?: boolean;
};

export function PaperPawnsScene({ className, freeze }: PaperPawnsSceneProps) {
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
    <div className={className} style={{ background: PAPER }}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.16, 4.95], fov: 30, near: 0.1, far: 30 }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <SceneContent frozen={frozen} />
      </Canvas>
    </div>
  );
}
