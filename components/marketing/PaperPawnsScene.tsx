"use client";

/**
 * Marketing-only Three.js scene. Must never be imported from (app)/ or play routes.
 * One lathed pawn geometry, two InstancedMeshes (cream / ink); matte; ContactShadows; idle drift.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const CREAM = "#f7f0e2";
const INK = "#2c2419";
const PAPER = "#e6dcc8";

/**
 * Staunton pawn silhouette as lathe points (x = radius, y = height).
 * Slight radius wobble so it reads engraved, not CAD-smooth.
 */
function buildPawnGeometry(): THREE.BufferGeometry {
  // Profile tuned to the 2D engraved pawn: ball head, collar, tapered body, stepped base.
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.46, 0.0),
    new THREE.Vector2(0.48, 0.035),
    new THREE.Vector2(0.4, 0.09),
    new THREE.Vector2(0.38, 0.13),
    // base collar
    new THREE.Vector2(0.42, 0.155),
    new THREE.Vector2(0.4, 0.19),
    new THREE.Vector2(0.29, 0.21),
    // body
    new THREE.Vector2(0.27, 0.34),
    new THREE.Vector2(0.25, 0.48),
    new THREE.Vector2(0.21, 0.58),
    new THREE.Vector2(0.165, 0.66),
    // neck ring
    new THREE.Vector2(0.19, 0.695),
    new THREE.Vector2(0.145, 0.73),
    // ball head
    new THREE.Vector2(0.175, 0.78),
    new THREE.Vector2(0.215, 0.84),
    new THREE.Vector2(0.22, 0.9),
    new THREE.Vector2(0.185, 0.96),
    new THREE.Vector2(0.11, 0.995),
    new THREE.Vector2(0.0, 1.01),
  ];
  const geo = new THREE.LatheGeometry(pts, 64);
  // Weld the lathe seam so normals stay smooth (no paper "fold" line).
  const welded = mergeVertices(geo);
  geo.dispose();
  welded.computeVertexNormals();
  return welded as THREE.LatheGeometry;
}

type PawnDef = {
  position: [number, number, number];
  rotationY: number;
  scale: number;
  ink: boolean;
};

const PAWNS: PawnDef[] = [
  { position: [-0.85, 0, 0.15], rotationY: 0.15, scale: 1.05, ink: false },
  { position: [0.05, 0, -0.1], rotationY: -0.35, scale: 1.0, ink: true },
  { position: [0.95, 0, 0.25], rotationY: 0.55, scale: 0.92, ink: false },
  { position: [0.35, 0, 0.85], rotationY: -0.1, scale: 0.88, ink: true },
];

function useInstancedPawns(
  geometry: THREE.BufferGeometry,
  defs: PawnDef[],
  ink: boolean,
) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const filtered = useMemo(() => defs.filter((d) => d.ink === ink), [defs, ink]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    filtered.forEach((pawn, i) => {
      dummy.position.set(...pawn.position);
      dummy.rotation.set(0, pawn.rotationY, 0);
      dummy.scale.setScalar(pawn.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [filtered]);

  return { meshRef, count: filtered.length, geometry };
}

function Pawns({ frozen }: { frozen: boolean }) {
  const geo = useMemo(() => buildPawnGeometry(), []);
  const group = useRef<THREE.Group>(null);
  const cream = useInstancedPawns(geo, PAWNS, false);
  const ink = useInstancedPawns(geo, PAWNS, true);

  useFrame((_, delta) => {
    if (frozen || !group.current) return;
    group.current.rotation.y += delta * 0.12;
  });

  useEffect(() => {
    return () => {
      geo.dispose();
    };
  }, [geo]);

  return (
    <group ref={group}>
      <instancedMesh
        ref={cream.meshRef}
        args={[geo, undefined, cream.count]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial color={CREAM} roughness={0.92} metalness={0} />
      </instancedMesh>
      <instancedMesh
        ref={ink.meshRef}
        args={[geo, undefined, ink.count]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial color={INK} roughness={0.88} metalness={0} />
      </instancedMesh>
    </group>
  );
}

function CameraDrift({ frozen }: { frozen: boolean }) {
  useFrame((state) => {
    if (frozen) return;
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.18) * 0.18;
    state.camera.position.y = 1.4 + Math.sin(t * 0.11) * 0.05;
    state.camera.position.z = 3.15 + Math.cos(t * 0.14) * 0.08;
    state.camera.lookAt(0, 0.4, 0.1);
  });
  return null;
}

function SceneContent({ frozen }: { frozen: boolean }) {
  return (
    <>
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 6, 14]} />

      <ambientLight intensity={0.55} color="#fff4e6" />
      <directionalLight
        position={[3.5, 5.5, 2.5]}
        intensity={1.15}
        color="#ffe2c0"
      />
      <directionalLight
        position={[-2.5, 2.0, -1.5]}
        intensity={0.35}
        color="#d4c4a8"
      />

      <CameraDrift frozen={frozen} />
      <Pawns frozen={frozen} />

      {/* Ground is the clearColor; ContactShadows alone for grounding. */}
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.28}
        scale={10}
        blur={3.2}
        far={4}
        color="#5c3a1c"
      />
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
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0, 1.4, 3.2], fov: 38, near: 0.1, far: 40 }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <SceneContent frozen={frozen} />
      </Canvas>
    </div>
  );
}
