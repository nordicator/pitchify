"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Text3D, Center } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";

function JudgeChair({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.1;
    }
  });

  return (
    <group ref={ref} position={position}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        {/* Chair base */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.8, 0.1, 0.8]} />
          <meshStandardMaterial color="#2d2b55" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Chair back */}
        <mesh position={[0, 0.6, -0.35]}>
          <boxGeometry args={[0.8, 1.1, 0.1]} />
          <meshStandardMaterial color="#3b3775" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Armrests */}
        <mesh position={[-0.4, 0.3, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.6]} />
          <meshStandardMaterial color="#2d2b55" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.4, 0.3, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.6]} />
          <meshStandardMaterial color="#2d2b55" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Figure silhouette (abstract sphere head) */}
        <mesh position={[0, 1.4, -0.1]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#4338ca" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Body */}
        <mesh position={[0, 0.8, 0]}>
          <capsuleGeometry args={[0.2, 0.4, 8, 16]} />
          <meshStandardMaterial color="#4338ca" metalness={0.4} roughness={0.5} />
        </mesh>
      </Float>
    </group>
  );
}

function Stage() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 2, -3]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.3} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function JudgesScene() {
  const positions: [number, number, number][] = [
    [-3, 0, -1],
    [-1.5, 0, -0.5],
    [0, 0, -1],
    [1.5, 0, -0.5],
    [3, 0, -1],
  ];

  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 50 }}
      className="h-full w-full"
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[0, 5, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[0, 4, 3]} intensity={2} color="#6366f1" />
      <pointLight position={[-3, 3, 2]} intensity={1.2} color="#8b5cf6" />
      <pointLight position={[3, 3, 2]} intensity={1.2} color="#6366f1" />
      <spotLight
        position={[0, 6, 1]}
        angle={0.5}
        penumbra={0.6}
        intensity={2}
        color="#e2e8f0"
      />
      <Stage />
      {positions.map((pos, i) => (
        <JudgeChair key={i} position={pos} />
      ))}
      <Environment preset="studio" />
    </Canvas>
  );
}
