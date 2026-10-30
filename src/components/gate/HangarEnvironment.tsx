"use client";

import { useMemo } from "react";

type HangarProps = {
  inAccessZone: boolean;
};

export function HangarEnvironment({ inAccessZone }: HangarProps) {
  // Materials for realistic military/industrial installation
  const concreteMat = useMemo(
    () => ({
      color: "#0f1114",
      roughness: 0.82,
      metalness: 0.18,
    }),
    [],
  );

  const steelRailMat = useMemo(
    () => ({
      color: "#2b2e36",
      roughness: 0.42,
      metalness: 0.85,
    }),
    [],
  );

  const hazardMat = useMemo(
    () => ({
      color: inAccessZone ? "#38bdf8" : "#d97706",
      roughness: 0.6,
      metalness: 0.1,
    }),
    [inAccessZone],
  );

  const terminalMat = useMemo(
    () => ({
      color: "#181a1f",
      roughness: 0.45,
      metalness: 0.85,
    }),
    [],
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Heavy Industrial Concrete Hangar Floor */}
      <mesh position={[0, -2.65, 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 26]} />
        <meshStandardMaterial {...concreteMat} />
      </mesh>

      {/* Recessed Steel Guide Tracks on Floor */}
      <mesh position={[-2.2, -2.645, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 22]} />
        <meshStandardMaterial {...steelRailMat} />
      </mesh>
      <mesh position={[2.2, -2.645, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 22]} />
        <meshStandardMaterial {...steelRailMat} />
      </mesh>

      {/* Weathered Tactical Stencil Runway Markers */}
      {[-8, -4, 0, 4, 8, 12].map((z) => (
        <mesh key={z} position={[0, -2.646, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, 1.2]} />
          <meshBasicMaterial color="#ffffff" opacity={0.12} transparent />
        </mesh>
      ))}

      {/* Tactical Access Zone Stenciled Markings */}
      <group position={[0, -2.644, 3.2]}>
        {/* Outer Rectangular Safety Perimeter */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 1.86, 32]} />
          <meshBasicMaterial color={hazardMat.color} opacity={inAccessZone ? 0.65 : 0.25} transparent />
        </mesh>
      </group>

      {/* Heavy Industrial Security Console Terminal on right side */}
      <group position={[2.8, -2.1, 1.8]}>
        {/* Terminal Pedestal */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 1.1, 0.38]} />
          <meshStandardMaterial {...terminalMat} />
        </mesh>
        {/* Slanted Display Panel */}
        <mesh position={[0, 0.46, 0.16]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[0.32, 0.22, 0.04]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive={inAccessZone ? "#0284c7" : "#0f172a"}
            emissiveIntensity={inAccessZone ? 0.8 : 0.1}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Structural Bulkhead Columns along Hangar Perimeter */}
      {[-5.4, 5.4].map((x) =>
        [2, 7, 12].map((z) => (
          <group key={`${x}-${z}`} position={[x, -1.2, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.45, 3.2, 0.6]} />
              <meshStandardMaterial {...concreteMat} />
            </mesh>
            {/* Recessed Wall Sconce Work-Light */}
            <mesh position={[x > 0 ? -0.24 : 0.24, 0.8, 0]}>
              <boxGeometry args={[0.06, 0.18, 0.25]} />
              <meshStandardMaterial
                color="#e2e8f0"
                emissive="#94a3b8"
                emissiveIntensity={0.6}
              />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}
