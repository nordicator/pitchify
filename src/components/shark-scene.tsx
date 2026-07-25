"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";

function Shark() {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

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
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.55, 0.65]} />
        <meshStandardMaterial color={hovered ? "#5fa7ff" : "#2f5d96"} />
      </mesh>
      <mesh position={[1.05, 0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshStandardMaterial color={hovered ? "#4d89e6" : "#3f73b5"} />
      </mesh>
      <mesh position={[-0.7, 0.08, 0]} rotation={[0, 0, Math.PI / 6]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.16, 0.22]} />
        <meshStandardMaterial color="#142f57" />
      </mesh>
      <mesh position={[-0.85, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.3, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.16, 0.16, 0.35]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.1, 0.18]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.16, 0.16, -0.35]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.1, 0.18]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[-0.3, -0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.2, 0.18]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

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
