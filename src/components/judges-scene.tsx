"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import type { Group } from "three";

function useLoadFBX(url: string) {
  const [model, setModel] = useState<Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Defer loading to let the canvas stabilize first
    const timeout = setTimeout(async () => {
      try {
        const { FBXLoader } = await import(
          "three/examples/jsm/loaders/FBXLoader.js"
        );
        const loader = new FBXLoader();
        loader.load(
          url,
          (fbx) => {
            if (cancelled) return;
            // Replace all materials with a simple one to avoid GPU memory issues
            const mat = new THREE.MeshPhongMaterial({
              color: "#4338ca",
              specular: "#6366f1",
              shininess: 30,
            });
            fbx.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                // Dispose heavy textures
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach((m) => m.dispose());
                } else if (mesh.material) {
                  (mesh.material as THREE.Material).dispose();
                }
                mesh.material = mat;
                // Reduce geometry if too heavy
                mesh.frustumCulled = true;
              }
            });
            setModel(fbx);
          },
          undefined,
          () => { /* silently fail */ },
        );
      } catch {
        /* silently fail */
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [url]);

  return model;
}

function JudgeModel({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  const model = useLoadFBX("/joe.fbx");

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.05;
    }
  });

  if (!model) return null;

  return (
    <group ref={ref} position={position}>
      <primitive object={model} scale={0.01} />
    </group>
  );
}

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
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.8, 0.1, 0.8]} />
          <meshStandardMaterial color="#2d2b55" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.6, -0.35]}>
          <boxGeometry args={[0.8, 1.1, 0.1]} />
          <meshStandardMaterial color="#3b3775" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[-0.4, 0.3, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.6]} />
          <meshStandardMaterial color="#2d2b55" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.4, 0.3, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.6]} />
          <meshStandardMaterial color="#2d2b55" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.4, -0.1]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#4338ca" metalness={0.4} roughness={0.5} />
        </mesh>
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#2e2a5e" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2, -3]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#252150" metalness={0.2} roughness={0.6} />
      </mesh>
    </group>
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
  const positions: [number, number, number][] = [
    [-3, 0, -1],
    [-1.5, 0, -0.5],
    [1.5, 0, -0.5],
    [3, 0, -1],
  ];

  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 50 }}
      className="h-full w-full"
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <ContextLossHandler />
      <ambientLight intensity={2.5} />
      <directionalLight position={[0, 5, 5]} intensity={3} color="#ffffff" />
      <directionalLight position={[0, 3, 8]} intensity={2} color="#e2e8f0" />
      <pointLight position={[0, 4, 3]} intensity={3} color="#818cf8" />
      <pointLight position={[-3, 3, 2]} intensity={2} color="#a78bfa" />
      <pointLight position={[3, 3, 2]} intensity={2} color="#818cf8" />
      <spotLight
        position={[0, 6, 2]}
        angle={0.6}
        penumbra={0.5}
        intensity={4}
        color="#ffffff"
      />
      <Stage />
      <JudgeModel position={[0, -0.5, -1]} />
      {positions.map((pos, i) => (
        <JudgeChair key={i} position={pos} />
      ))}
    </Canvas>
  );
}
