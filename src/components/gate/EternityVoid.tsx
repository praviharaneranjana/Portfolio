"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { type Group, type Mesh, type PointLight, MathUtils } from "three";

type EternityVoidProps = {
  isUnlocked: boolean;
};

export function EternityVoid({ isUnlocked }: EternityVoidProps) {
  const portalCore = useRef<Mesh>(null);
  const ringInner = useRef<Group>(null);
  const ringOuter = useRef<Group>(null);
  const portalLight = useRef<PointLight>(null);
  const particlesRef = useRef<Group>(null);

  // Materials for the "Really Dark Place" Void & Door to Eternity
  const voidFloorMat = useMemo(
    () => ({
      color: "#020305",
      roughness: 0.18,
      metalness: 0.88,
    }),
    [],
  );

  const voidMonolithMat = useMemo(
    () => ({
      color: "#08090d",
      roughness: 0.55,
      metalness: 0.82,
    }),
    [],
  );

  const portalFrameMat = useMemo(
    () => ({
      color: "#0a0c10",
      roughness: 0.35,
      metalness: 0.95,
    }),
    [],
  );

  const archPositions = useMemo(() => [-6, -14, -22, -30], []);

  // Floating cosmic dust particles inside the void
  const particlePoints = useMemo(() => {
    const points: [number, number, number][] = [];
    for (let i = 0; i < 45; i++) {
      points.push([
        (Math.random() - 0.5) * 8,
        -2.2 + Math.random() * 4.5,
        -4 - Math.random() * 32,
      ]);
    }
    return points;
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Smooth gyroscopic rotation of the Door to Eternity portal rings
    if (ringInner.current) {
      ringInner.current.rotation.z = time * 0.45;
    }
    if (ringOuter.current) {
      ringOuter.current.rotation.z = -time * 0.28;
    }

    // Portal core breathing glow
    if (portalCore.current) {
      const pulse = 1.0 + Math.sin(time * 3.5) * 0.25;
      portalCore.current.scale.set(pulse, pulse, 1);
    }

    // Portal light intensity flares when unlocked
    if (portalLight.current) {
      const targetIntensity = isUnlocked ? 95 + Math.sin(time * 6) * 15 : 25;
      portalLight.current.intensity = MathUtils.lerp(
        portalLight.current.intensity,
        targetIntensity,
        delta * 3,
      );
    }

    // Gentle floating particle drift
    if (particlesRef.current) {
      particlesRef.current.position.y = Math.sin(time * 0.8) * 0.08;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. ULTRA-DARK REFLECTIVE RUNWAY FLOOR (Extends deep into negative Z) */}
      <mesh position={[0, -2.65, -24]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 48]} />
        <meshStandardMaterial {...voidFloorMat} />
      </mesh>

      {/* 2. NEON CYBER RUNWAY STRIPS (Guiding the vehicle into the darkness) */}
      {[-2.0, 2.0].map((x) => (
        <mesh key={`rail-${x}`} position={[x, -2.645, -22]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, 44]} />
          <meshBasicMaterial color="#00f0ff" opacity={0.65} transparent />
        </mesh>
      ))}

      {/* Center glowing dash markers */}
      {[-4, -10, -16, -22, -28, -34].map((z) => (
        <mesh key={`dash-${z}`} position={[0, -2.645, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 1.8]} />
          <meshBasicMaterial color="#38bdf8" opacity={0.5} transparent />
        </mesh>
      ))}

      {/* 3. SEQUENTIAL DARK MONOLITHIC PORTAL ARCHES (Framing the void tunnel) */}
      {archPositions.map((z, idx) => (
        <group key={`arch-${z}`} position={[0, 0, z]}>
          {/* Left Column */}
          <mesh position={[-4.5, -0.4, 0]} castShadow>
            <boxGeometry args={[0.55, 4.5, 0.45]} />
            <meshStandardMaterial {...voidMonolithMat} />
          </mesh>
          {/* Right Column */}
          <mesh position={[4.5, -0.4, 0]} castShadow>
            <boxGeometry args={[0.55, 4.5, 0.45]} />
            <meshStandardMaterial {...voidMonolithMat} />
          </mesh>
          {/* Top Bulkhead Crossbeam */}
          <mesh position={[0, 1.85, 0]} castShadow>
            <boxGeometry args={[9.55, 0.5, 0.45]} />
            <meshStandardMaterial {...voidMonolithMat} />
          </mesh>

          {/* Glowing Inner Arch Neon Accent Ring */}
          <mesh position={[-4.18, -0.4, 0]}>
            <boxGeometry args={[0.04, 4.4, 0.08]} />
            <meshBasicMaterial color={idx % 2 === 0 ? "#00f0ff" : "#818cf8"} opacity={0.7} transparent />
          </mesh>
          <mesh position={[4.18, -0.4, 0]}>
            <boxGeometry args={[0.04, 4.4, 0.08]} />
            <meshBasicMaterial color={idx % 2 === 0 ? "#00f0ff" : "#818cf8"} opacity={0.7} transparent />
          </mesh>
          <mesh position={[0, 1.58, 0]}>
            <boxGeometry args={[8.4, 0.04, 0.08]} />
            <meshBasicMaterial color={idx % 2 === 0 ? "#00f0ff" : "#818cf8"} opacity={0.7} transparent />
          </mesh>
        </group>
      ))}

      {/* 4. THE GRAND "DOOR TO ETERNITY" MONOLITHIC PORTAL (At Z = -36.0) */}
      <group position={[0, -0.2, -36.0]}>
        {/* Outer Heavy Octagonal / Arch Frame */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[6.8, 6.2, 0.9]} />
          <meshStandardMaterial {...portalFrameMat} />
        </mesh>

        {/* Portal Gateway Carve-Out (Inner Opening) */}
        <mesh position={[0, 0, 0.1]}>
          <boxGeometry args={[4.2, 4.8, 1.0]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* Outer Concentric Gyroscopic Ring */}
        <group ref={ringOuter} position={[0, 0, 0.2]}>
          <mesh>
            <torusGeometry args={[2.2, 0.06, 16, 48]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={1.8}
              roughness={0.2}
            />
          </mesh>
          {/* Gyro Node Spheres */}
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, i) => (
            <mesh
              key={i}
              position={[Math.cos(ang) * 2.2, Math.sin(ang) * 2.2, 0]}
            >
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>

        {/* Inner Gyroscopic Ring */}
        <group ref={ringInner} position={[0, 0, 0.35]}>
          <mesh>
            <torusGeometry args={[1.5, 0.05, 16, 36]} />
            <meshStandardMaterial
              color="#a855f7"
              emissive="#7e22ce"
              emissiveIntensity={2.2}
              roughness={0.2}
            />
          </mesh>
        </group>

        {/* RADIANT EVENT-HORIZON PORTAL CORE ("Door to Eternity") */}
        <mesh ref={portalCore} position={[0, 0, 0.15]}>
          <planeGeometry args={[2.4, 3.6]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.88}
          />
        </mesh>

        {/* Vertical Infinity Light Beam (Shooting into the heavens) */}
        <mesh position={[0, 4.5, 0]}>
          <cylinderGeometry args={[0.18, 0.35, 12, 16]} />
          <meshBasicMaterial color="#00f0ff" opacity={0.4} transparent />
        </mesh>

        {/* High-intensity Volumetric Backlight Spill from inside the Eternity Portal */}
        <pointLight
          ref={portalLight}
          position={[0, 0, 1.5]}
          color="#38bdf8"
          intensity={45}
          distance={35}
          decay={1.2}
        />
        <pointLight
          position={[0, 0, -2.0]}
          color="#a855f7"
          intensity={65}
          distance={25}
          decay={1.1}
        />
      </group>

      {/* 5. FLOATING COSMIC DUST / AMBIENT PARTICLES */}
      <group ref={particlesRef}>
        {particlePoints.map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? "#38bdf8" : i % 3 === 1 ? "#c084fc" : "#f8fafc"}
              transparent
              opacity={0.65}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
