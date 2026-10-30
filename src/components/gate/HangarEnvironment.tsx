"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3, type Points, type MeshStandardMaterial } from "three";

type HangarProps = {
  inAccessZone: boolean;
};

export function HangarEnvironment({ inAccessZone }: HangarProps) {
  const terminalGlow = useRef<MeshStandardMaterial>(null);
  const particlesRef = useRef<Points>(null);

  // Atmospheric dust / sparks floating in the hangar
  const particleCount = 120;
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = -2.6 + Math.random() * 4.5;
      pos[i * 3 + 2] = -2 + Math.random() * 20;
      spd[i] = 0.2 + Math.random() * 0.4;
    }
    return [pos, spd];
  }, []);

  useFrame((state, delta) => {
    // Pulse terminal console glow when in access zone
    if (terminalGlow.current) {
      const targetIntensity = inAccessZone ? 3.5 + Math.sin(state.clock.elapsedTime * 8) * 1.5 : 0.8;
      terminalGlow.current.emissiveIntensity = MathUtils.lerp(
        terminalGlow.current.emissiveIntensity,
        targetIntensity,
        delta * 6,
      );
    }

    // Drift particles gently
    if (particlesRef.current) {
      const array = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        array[i * 3 + 1] += speeds[i] * delta * 0.4;
        if (array[i * 3 + 1] > 2.5) {
          array[i * 3 + 1] = -2.6;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Main Tactical Hangar Floor */}
      <mesh position={[0, -2.65, 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 26]} />
        <meshStandardMaterial
          color="#0c0d10"
          metalness={0.75}
          roughness={0.35}
        />
      </mesh>

      {/* Runway Guide Strips towards Gate */}
      <mesh position={[0, -2.645, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 22]} />
        <meshBasicMaterial color="#ff4d30" opacity={0.35} transparent />
      </mesh>
      <mesh position={[-2.4, -2.645, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 22]} />
        <meshBasicMaterial color="#ffffff" opacity={0.12} transparent />
      </mesh>
      <mesh position={[2.4, -2.645, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 22]} />
        <meshBasicMaterial color="#ffffff" opacity={0.12} transparent />
      </mesh>

      {/* Access / Interaction Zone Marker on Floor (Yellow / Cyan Hazard Grid) */}
      <group position={[0, -2.64, 3.2]}>
        {/* Outer boundary ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 1.86, 32]} />
          <meshBasicMaterial color={inAccessZone ? "#00f0ff" : "#ff4d30"} opacity={inAccessZone ? 0.8 : 0.25} transparent />
        </mesh>
        {/* Subtle inner pulsation */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.78, 32]} />
          <meshBasicMaterial color={inAccessZone ? "#00f0ff" : "#ff4d30"} opacity={inAccessZone ? 0.08 : 0.02} transparent />
        </mesh>
      </group>

      {/* Tactical Access Terminal Console on the right of the gate */}
      <group position={[2.8, -2.1, 1.8]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.35, 1.1, 0.35]} />
          <meshStandardMaterial color="#1a1c22" metalness={0.9} roughness={0.3} />
        </mesh>
        {/* Terminal Screen & Hologram Emitter */}
        <mesh position={[0, 0.45, 0.16]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.28, 0.22, 0.04]} />
          <meshStandardMaterial
            ref={terminalGlow}
            color="#00f0ff"
            emissive={inAccessZone ? "#00f0ff" : "#ff4d30"}
            emissiveIntensity={1.2}
          />
        </mesh>
        {/* Hologram Pulse Ring */}
        <mesh position={[0, 0.75, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.18, 16]} />
          <meshBasicMaterial color={inAccessZone ? "#00f0ff" : "#ff4d30"} opacity={inAccessZone ? 0.6 : 0.2} transparent />
        </mesh>
      </group>

      {/* Side Corridor Boundary Lights / Pylons */}
      {[-5.2, 5.2].map((x) =>
        [2, 6, 10, 14].map((z) => (
          <group key={`${x}-${z}`} position={[x, -2.1, z]}>
            <mesh>
              <cylinderGeometry args={[0.06, 0.08, 1.1, 12]} />
              <meshStandardMaterial color="#22252c" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.52, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.06, 12]} />
              <meshStandardMaterial
                color="#00f0ff"
                emissive="#00f0ff"
                emissiveIntensity={inAccessZone ? 2.5 : 0.8}
              />
            </mesh>
          </group>
        )),
      )}

      {/* Atmospheric Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#00f0ff"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
