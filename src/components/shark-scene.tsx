"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef, useState } from "react";
import type { Group } from "three";

function Shark() {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const { scene } = useGLTF("/shark.glb");

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.4;
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.15;
    groupRef.current.rotation.z = Math.sin(t * 0.4) * 0.05;
  });

  return (
    <group
      ref={groupRef}
      scale={hovered ? 1.05 : 1}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/shark.glb");

export default function SharkScene() {
  return (
    <div className="h-80 w-full cursor-grab active:cursor-grabbing md:h-96">
      <Canvas camera={{ position: [0, 0.5, 4], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 3, 2]} intensity={1} color="#94b8ff" />
        <pointLight position={[-2, -1, 3]} intensity={0.5} color="#2563eb" />
        <Shark />
      </Canvas>
    </div>
  );
}
