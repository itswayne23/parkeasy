"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, MeshDistortMaterial, RoundedBox, Text3D, Torus } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";

function ParkingCore() {
  const group = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.14;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.45) * 0.08;
  });

  return (
    <group ref={group}>
      <Float speed={1.8} rotationIntensity={0.55} floatIntensity={0.95}>
        <RoundedBox args={[2.9, 0.34, 2.9]} radius={0.22} smoothness={5} rotation={[1.12, 0.38, -0.25]}>
          <meshStandardMaterial color="#0d1b2d" metalness={0.55} roughness={0.24} />
        </RoundedBox>
      </Float>

      <Float speed={2.2} rotationIntensity={0.85} floatIntensity={1.1}>
        <RoundedBox position={[-1.42, 0.88, -0.26]} args={[0.74, 1.8, 0.74]} radius={0.18} smoothness={5}>
          <meshStandardMaterial color="#5cd6ff" metalness={0.6} roughness={0.16} emissive="#0d3550" emissiveIntensity={0.45} />
        </RoundedBox>
      </Float>

      <Float speed={2.6} rotationIntensity={0.9} floatIntensity={1.2}>
        <RoundedBox position={[0, 1.2, 0.15]} args={[0.86, 2.3, 0.86]} radius={0.2} smoothness={5}>
          <meshStandardMaterial color="#71f2cf" metalness={0.48} roughness={0.18} emissive="#10392f" emissiveIntensity={0.3} />
        </RoundedBox>
      </Float>

      <Float speed={2.1} rotationIntensity={0.65} floatIntensity={0.8}>
        <RoundedBox position={[1.38, 0.72, -0.2]} args={[0.68, 1.5, 0.68]} radius={0.18} smoothness={5}>
          <meshStandardMaterial color="#ff9f80" metalness={0.35} roughness={0.22} emissive="#4f1f18" emissiveIntensity={0.26} />
        </RoundedBox>
      </Float>

      <Torus args={[2.7, 0.02, 16, 120]} rotation={[1.18, 0.25, 0.15]}>
        <meshStandardMaterial color="#6ea7ff" emissive="#6ea7ff" emissiveIntensity={0.7} transparent opacity={0.7} />
      </Torus>
      <Torus args={[2.15, 0.018, 16, 120]} rotation={[1.18, 0.25, 0.15]}>
        <meshStandardMaterial color="#71f2cf" emissive="#71f2cf" emissiveIntensity={0.65} transparent opacity={0.72} />
      </Torus>

      <mesh position={[0, -0.28, 0]} rotation={[-1.2, 0, 0]}>
        <circleGeometry args={[2.2, 64]} />
        <MeshDistortMaterial color="#0a2236" speed={1.6} distort={0.18} roughness={0.2} metalness={0.5} />
      </mesh>
    </group>
  );
}

export function HeroScene() {
  return (
    <div className="canvas-shell">
      <Canvas camera={{ position: [0, 1.8, 6.5], fov: 42 }}>
        <color attach="background" args={["#08111f"]} />
        <ambientLight intensity={1.3} />
        <directionalLight position={[4, 7, 4]} intensity={2.2} color="#ffffff" />
        <pointLight position={[-4, 2, 2]} intensity={18} color="#62a7ff" />
        <pointLight position={[3, 3, 3]} intensity={14} color="#67f0cb" />
        <ParkingCore />
        <Environment preset="city" />
      </Canvas>
      <div className="canvas-overlay canvas-overlay-top">
        <span className="mini-label">Realtime parking mesh</span>
        <strong>324 active nodes</strong>
        <span>Residential and operator supply coexisting in one live layer.</span>
      </div>
      <div className="canvas-overlay canvas-overlay-bottom">
        <span className="mini-label">Host revenue pulse</span>
        <strong>Rs 18.4k</strong>
        <span>Idle parking transformed into recurring income.</span>
      </div>
    </div>
  );
}