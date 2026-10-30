"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3, type Group, type SpotLight } from "three";
import { sound } from "./sound";

export type CarInput = {
  forward: number; // -1 (reverse) to 1 (forward)
  turn: number; // -1 (left) to 1 (right)
};

type RCCarProps = {
  inputRef: React.RefObject<CarInput>;
  onPositionUpdate: (pos: Vector3, speed: number) => void;
  isBypassing: boolean;
  isUnlocked: boolean;
};

export function RCCar({ inputRef, onPositionUpdate, isBypassing, isUnlocked }: RCCarProps) {
  const group = useRef<Group>(null);
  const chassis = useRef<Group>(null);
  const sensorTurret = useRef<Group>(null);
  const wheelFL = useRef<Group>(null);
  const wheelFR = useRef<Group>(null);
  const wheelBL = useRef<Group>(null);
  const wheelBR = useRef<Group>(null);
  const leftHeadlight = useRef<SpotLight>(null);
  const rightHeadlight = useRef<SpotLight>(null);

  // Vehicle physics state
  const pos = useRef(new Vector3(0, -2.46, 12.0));
  const speed = useRef(0);
  const heading = useRef(0); // 0 radians = facing -Z (towards gate)
  const steerAngle = useRef(0);
  const wheelRot = useRef(0);

  // Materials - Realistic military tactical finish (matte composite, dark steel, rugged rubber)
  const armorMat = useMemo(
    () => ({
      color: "#1c1e22",
      roughness: 0.68,
      metalness: 0.35,
    }),
    [],
  );

  const darkSteelMat = useMemo(
    () => ({
      color: "#121417",
      roughness: 0.45,
      metalness: 0.85,
    }),
    [],
  );

  const treadRubberMat = useMemo(
    () => ({
      color: "#151618",
      roughness: 0.88,
      metalness: 0.05,
    }),
    [],
  );

  const beadlockRimMat = useMemo(
    () => ({
      color: "#2a2d34",
      roughness: 0.35,
      metalness: 0.9,
    }),
    [],
  );

  const lensGlassMat = useMemo(
    () => ({
      color: "#0a1926",
      roughness: 0.05,
      metalness: 0.95,
    }),
    [],
  );

  const statusLedMat = useMemo(
    () => ({
      color: "#38bdf8",
      emissive: "#0284c7",
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    const input = inputRef.current || { forward: 0, turn: 0 };

    if (isUnlocked) {
      // Auto-drive boost through the open gate doors into the portal
      speed.current = MathUtils.lerp(speed.current, 11.5, dt * 2.8);
      heading.current = MathUtils.lerp(heading.current, 0, dt * 6);
      pos.current.x = MathUtils.lerp(pos.current.x, 0, dt * 4);
      // Drive through Z = 0 into negative Z
      pos.current.z -= speed.current * dt;
    } else if (isBypassing) {
      // Hold steady while unlocking sequence takes place
      speed.current = MathUtils.lerp(speed.current, 0, dt * 8);
    } else {
      // Responsive, snappy arcade RC physics
      const maxForward = 7.5;
      const maxReverse = -3.5;
      const accelRate = 16.0;
      const dragRate = 8.5;
      const turnRate = 3.2;

      if (input.forward > 0) {
        speed.current = Math.min(speed.current + accelRate * input.forward * dt, maxForward);
      } else if (input.forward < 0) {
        speed.current = Math.max(speed.current + accelRate * input.forward * dt, maxReverse);
      } else {
        // Natural friction/braking
        if (speed.current > 0) {
          speed.current = Math.max(speed.current - dragRate * dt, 0);
        } else if (speed.current < 0) {
          speed.current = Math.min(speed.current + dragRate * dt, 0);
        }
      }

      // Responsive steering
      const targetSteer = -input.turn * 0.52;
      steerAngle.current = MathUtils.lerp(steerAngle.current, targetSteer, dt * 14);

      // Turn vehicle: allow small pivot even at very low speeds so it never gets stuck
      if (Math.abs(input.turn) > 0.05) {
        const turnMult = Math.abs(speed.current) > 0.1 ? (speed.current > 0 ? 1 : -1) : 0.4;
        heading.current += steerAngle.current * turnRate * dt * turnMult;
      }

      // Move vehicle along heading vector
      const forwardX = -Math.sin(heading.current);
      const forwardZ = -Math.cos(heading.current);

      pos.current.x += forwardX * speed.current * dt;
      pos.current.z += forwardZ * speed.current * dt;

      // Realistic hangar boundaries
      pos.current.x = MathUtils.clamp(pos.current.x, -4.5, 4.5);
      pos.current.z = MathUtils.clamp(pos.current.z, 2.0, 15.0);
    }

    // Apply vehicle position & heading
    group.current.position.copy(pos.current);
    group.current.rotation.y = heading.current;

    // Body roll on cornering & pitch on acceleration
    if (chassis.current) {
      const roll = steerAngle.current * speed.current * 0.06;
      const pitch = (input.forward > 0 ? 0.03 : input.forward < 0 ? -0.04 : 0) + (speed.current * 0.005);
      chassis.current.rotation.z = MathUtils.lerp(chassis.current.rotation.z, -roll, dt * 10);
      chassis.current.rotation.x = MathUtils.lerp(chassis.current.rotation.x, -pitch, dt * 10);
      // Realistic chassis suspension travel
      chassis.current.position.y = Math.sin(state.clock.elapsedTime * 30) * (Math.abs(speed.current) * 0.002);
    }

    // Sensor turret subtle stabilization tracking
    if (sensorTurret.current) {
      sensorTurret.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.12 - steerAngle.current * 0.4;
    }

    // Wheel rotation and steering
    wheelRot.current -= (speed.current / 0.2) * dt;
    if (wheelFL.current && wheelFR.current) {
      wheelFL.current.rotation.y = steerAngle.current;
      wheelFR.current.rotation.y = steerAngle.current;
      wheelFL.current.rotation.x = wheelRot.current;
      wheelFR.current.rotation.x = wheelRot.current;
    }
    if (wheelBL.current && wheelBR.current) {
      wheelBL.current.rotation.x = wheelRot.current;
      wheelBR.current.rotation.x = wheelRot.current;
    }

    // Update sound engine pitch
    sound.updateEngine(Math.abs(speed.current) / 7.5);

    onPositionUpdate(pos.current, speed.current);
  });

  return (
    <group ref={group} position={[0, -2.46, 12.0]}>
      {/* Armored Chassis & Components */}
      <group ref={chassis}>
        {/* Main Lower Skid Plate & Chassis Base */}
        <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.74, 0.1, 1.28]} />
          <meshStandardMaterial {...darkSteelMat} />
        </mesh>

        {/* Sloped Armored Upper Hull (Chamfered Stealth Panels) */}
        <mesh position={[0, 0.24, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.68, 0.12, 1.05]} />
          <meshStandardMaterial {...armorMat} />
        </mesh>

        {/* Angular Side Armor Sponson Plates */}
        <mesh position={[-0.37, 0.22, 0]} rotation={[0, 0, 0.18]} castShadow>
          <boxGeometry args={[0.06, 0.14, 0.95]} />
          <meshStandardMaterial {...armorMat} />
        </mesh>
        <mesh position={[0.37, 0.22, 0]} rotation={[0, 0, -0.18]} castShadow>
          <boxGeometry args={[0.06, 0.14, 0.95]} />
          <meshStandardMaterial {...armorMat} />
        </mesh>

        {/* Heavy Duty Tubular Steel Front Bull-Bar */}
        <mesh position={[0, 0.18, -0.68]} castShadow>
          <boxGeometry args={[0.7, 0.08, 0.06]} />
          <meshStandardMaterial {...darkSteelMat} />
        </mesh>
        <mesh position={[-0.32, 0.23, -0.66]}>
          <boxGeometry args={[0.04, 0.12, 0.04]} />
          <meshStandardMaterial {...darkSteelMat} />
        </mesh>
        <mesh position={[0.32, 0.23, -0.66]}>
          <boxGeometry args={[0.04, 0.12, 0.04]} />
          <meshStandardMaterial {...darkSteelMat} />
        </mesh>

        {/* Tactical Optic Sensor Turret (FLIR / Recon Head) */}
        <group ref={sensorTurret} position={[0, 0.35, -0.12]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.15, 0.1, 16]} />
            <meshStandardMaterial {...darkSteelMat} />
          </mesh>
          {/* Optics Housing */}
          <mesh position={[0, 0.06, -0.06]} castShadow>
            <boxGeometry args={[0.18, 0.08, 0.12]} />
            <meshStandardMaterial {...armorMat} />
          </mesh>
          {/* Camera Apertures with Coated Lenses */}
          <mesh position={[-0.05, 0.06, -0.12]}>
            <circleGeometry args={[0.026, 16]} />
            <meshStandardMaterial {...lensGlassMat} />
          </mesh>
          <mesh position={[0.05, 0.06, -0.12]}>
            <circleGeometry args={[0.022, 16]} />
            <meshStandardMaterial {...lensGlassMat} />
          </mesh>
          {/* Subtle Recon Telemetry LED */}
          <mesh position={[0, 0.11, -0.04]}>
            <sphereGeometry args={[0.015, 12, 12]} />
            <meshStandardMaterial {...statusLedMat} />
          </mesh>
        </group>

        {/* Dual High-Gain Carbon Fiber Antennas */}
        <mesh position={[0.22, 0.48, 0.42]} rotation={[0.08, 0, 0.04]}>
          <cylinderGeometry args={[0.006, 0.009, 0.36, 8]} />
          <meshStandardMaterial {...darkSteelMat} />
        </mesh>
        <mesh position={[-0.22, 0.44, 0.44]} rotation={[0.06, 0, -0.04]}>
          <cylinderGeometry args={[0.006, 0.009, 0.3, 8]} />
          <meshStandardMaterial {...darkSteelMat} />
        </mesh>

        {/* Twin Recessed Headlights */}
        <mesh position={[-0.24, 0.2, -0.66]}>
          <boxGeometry args={[0.1, 0.04, 0.02]} />
          <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={1.8} />
        </mesh>
        <mesh position={[0.24, 0.2, -0.66]}>
          <boxGeometry args={[0.1, 0.04, 0.02]} />
          <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={1.8} />
        </mesh>

        {/* Smooth, Realistic Headlight Spotlights without eye-searing flicker */}
        <spotLight
          ref={leftHeadlight}
          position={[-0.24, 0.22, -0.7]}
          target-position={[-0.24, -0.4, -6.5]}
          color="#f1f5f9"
          intensity={8.0}
          angle={Math.PI / 5.5}
          penumbra={0.6}
          distance={14}
          decay={1.4}
        />
        <spotLight
          ref={rightHeadlight}
          position={[0.24, 0.22, -0.7]}
          target-position={[0.24, -0.4, -6.5]}
          color="#f1f5f9"
          intensity={8.0}
          angle={Math.PI / 5.5}
          penumbra={0.6}
          distance={14}
          decay={1.4}
        />

        {/* Rear Tactical Tail Lights */}
        <mesh position={[-0.28, 0.2, 0.64]}>
          <boxGeometry args={[0.08, 0.03, 0.02]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.28, 0.2, 0.64]}>
          <boxGeometry args={[0.08, 0.03, 0.02]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* 4 Heavy-Duty All-Terrain Wheels with Suspension Struts */}
      {/* Front Left */}
      <group position={[-0.43, 0.16, -0.38]}>
        <group ref={wheelFL} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.19, 0.19, 0.15, 24]} />
            <meshStandardMaterial {...treadRubberMat} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.09, 16]} />
            <meshStandardMaterial {...beadlockRimMat} />
          </mesh>
        </group>
      </group>

      {/* Front Right */}
      <group position={[0.43, 0.16, -0.38]}>
        <group ref={wheelFR} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.19, 0.19, 0.15, 24]} />
            <meshStandardMaterial {...treadRubberMat} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.09, 16]} />
            <meshStandardMaterial {...beadlockRimMat} />
          </mesh>
        </group>
      </group>

      {/* Rear Left */}
      <group position={[-0.43, 0.17, 0.4]}>
        <group ref={wheelBL} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.16, 24]} />
            <meshStandardMaterial {...treadRubberMat} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
            <meshStandardMaterial {...beadlockRimMat} />
          </mesh>
        </group>
      </group>

      {/* Rear Right */}
      <group position={[0.43, 0.17, 0.4]}>
        <group ref={wheelBR} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.16, 24]} />
            <meshStandardMaterial {...treadRubberMat} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
            <meshStandardMaterial {...beadlockRimMat} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
