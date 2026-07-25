"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import type { Group } from "three";

function JudgeFigure({
  position,
  delay = 0,
  accentColor = "#3b82f6",
}: {
  position: [number, number, number];
  delay?: number;
  accentColor?: string;
}) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      ref.current.rotation.y = Math.sin(t * 0.4 + delay) * 0.08;
      ref.current.position.y = position[1] + Math.sin(t * 0.6 + delay) * 0.02;
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Body — cone */}
      <mesh position={[0, 0.55, 0]}>
        <coneGeometry args={[0.35, 1.1, 8]} />
        <meshStandardMaterial
          color={accentColor}
          metalness={0.3}
          roughness={0.5}
          emissive={accentColor}
          emissiveIntensity={0.1}
        />
      </mesh>
      {/* Head — sphere */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={accentColor}
          metalness={0.3}
          roughness={0.5}
          emissive={accentColor}
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  );
}

function JudgeChair({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF("/chair.glb");

  return (
    <group position={position}>
      <primitive object={scene.clone()} scale={0.5} />
    </group>
  );
}

useGLTF.preload("/chair.glb");


function SpotlightCone({
  position,
  color = "#818cf8",
}: {
  position: [number, number, number];
  color?: string;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.04 + Math.sin(state.clock.elapsedTime * 0.8) * 0.015;
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={[0, 0, 0]}>
      <coneGeometry args={[1.5, 5, 32, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.05}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function useWoodTexture() {
  const texture = useRef<THREE.CanvasTexture | null>(null);

  if (!texture.current) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#8B5E3C";
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 200; i++) {
      const y = Math.random() * 512;
      const width = 512;
      const height = 1 + Math.random() * 3;
      ctx.fillStyle = `rgba(${60 + Math.random() * 40}, ${30 + Math.random() * 20}, ${10 + Math.random() * 15}, ${0.15 + Math.random() * 0.2})`;
      ctx.fillRect(0, y, width, height);
    }

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 512;
      ctx.strokeStyle = `rgba(50, 25, 10, ${0.1 + Math.random() * 0.1})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 20, 512);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    texture.current = tex;
  }

  return texture.current;
}

function Stage() {
  const woodTex = useWoodTexture();

  return (
    <group>
      {/* Wood floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial
          map={woodTex}
          color="#a0714f"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 2.5, -4]}>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#222225" metalness={0.1} roughness={0.9} />
      </mesh>
      {/* Accent light strips on back wall */}
      <mesh position={[-4, 2.5, -3.95]}>
        <boxGeometry args={[0.02, 5, 0.02]} />
        <meshStandardMaterial
          color="#f0c866"
          emissive="#f0c866"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[4, 2.5, -3.95]}>
        <boxGeometry args={[0.02, 5, 0.02]} />
        <meshStandardMaterial
          color="#f0c866"
          emissive="#f0c866"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 4.9, -3.95]}>
        <boxGeometry args={[8, 0.02, 0.02]} />
        <meshStandardMaterial
          color="#f0c866"
          emissive="#f0c866"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 80;

  const positions = useRef(
    Float32Array.from({ length: count * 3 }, (_, i) => {
      if (i % 3 === 0) return (Math.random() - 0.5) * 12;
      if (i % 3 === 1) return Math.random() * 5;
      return (Math.random() - 0.5) * 8;
    }),
  );

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.001;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions.current, 3]}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#ffeedd"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function ContextLossHandler() {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLoss = (e: Event) => {
      e.preventDefault();
    };
    canvas.addEventListener("webglcontextlost", handleLoss);
    canvas.addEventListener("webglcontextrestored", () => {
      gl.setSize(canvas.clientWidth, canvas.clientHeight);
    });
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLoss);
    };
  }, [gl]);

  return null;
}

export function JudgesScene() {
  const judges: {
    pos: [number, number, number];
    chairPos: [number, number, number];
    color: string;
    delay: number;
  }[] = [
    { pos: [-2.2, 0, 0], chairPos: [-2.2, 0, 0], color: "#e63946", delay: 0 },
    { pos: [-0.75, 0, 0.3], chairPos: [-0.75, 0, 0.3], color: "#2a9d8f", delay: 1 },
    { pos: [0.75, 0, 0.3], chairPos: [0.75, 0, 0.3], color: "#e9c46a", delay: 2 },
    { pos: [2.2, 0, 0], chairPos: [2.2, 0, 0], color: "#3b82f6", delay: 3 },
  ];

  return (
    <Canvas
      camera={{ position: [0, 3.2, 5.5], fov: 45 }}
      className="h-full w-full"
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <ContextLossHandler />
      <fog attach="fog" args={["#1a1a1f", 8, 22]} />
      <color attach="background" args={["#1a1a1f"]} />

      {/* Lighting */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[0, 5, 3]} intensity={3} color="#fff8f0" />
      <directionalLight position={[0, 3, 6]} intensity={2} color="#ffffff" />
      <pointLight position={[0, 4, 2]} intensity={3} color="#ffeedd" distance={12} decay={2} />
      <pointLight position={[-3, 3, 1]} intensity={2} color="#ffffff" distance={10} decay={2} />
      <pointLight position={[3, 3, 1]} intensity={2} color="#ffffff" distance={10} decay={2} />
      <spotLight
        position={[0, 6, 2]}
        angle={0.5}
        penumbra={0.6}
        intensity={5}
        color="#ffffff"
        castShadow
      />
      <spotLight
        position={[-2.5, 5, 3]}
        angle={0.4}
        penumbra={0.8}
        intensity={2.5}
        color="#fff8f0"
      />
      <spotLight
        position={[2.5, 5, 3]}
        angle={0.4}
        penumbra={0.8}
        intensity={2.5}
        color="#fff8f0"
      />

      <Stage />
      <Particles />

      {/* Volumetric spotlight cones */}
      <SpotlightCone position={[0, 2.5, 1]} color="#ffeedd" />
      <SpotlightCone position={[-2.5, 2.5, 0.5]} color="#ffeedd" />
      <SpotlightCone position={[2.5, 2.5, 0.5]} color="#ffeedd" />

      {/* Judge figures and chairs */}
      {judges.map((j, i) => (
        <group key={i}>
          <JudgeChair position={j.chairPos} />
          <JudgeFigure position={[j.pos[0], j.pos[1] + 0.5, j.pos[2]]} delay={j.delay} accentColor={j.color} />
        </group>
      ))}

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.4} darkness={0.4} />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0005, 0.0005)}
        />
      </EffectComposer>
    </Canvas>
  );
}
