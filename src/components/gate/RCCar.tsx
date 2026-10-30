"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3, type Group, type Mesh, type SpotLight, type MeshStandardMaterial } from "three";
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
  const wheelFL = useRef<Group>(null);
  const wheelFR = useRef<Group>(null);
  const wheelBL = useRef<Group>(null);
  const wheelBR = useRef<Group>(null);
  const leftHeadlight = useRef<SpotLight>(null);
  const rightHeadlight = useRef<SpotLight>(null);
  const antennaLed = useRef<MeshStandardMaterial>(null);
  const hackBeam = useRef<Mesh>(null);

  // Physics state
  const pos = useRef(new Vector3(0, -2.46, 12.5)); // Start in corridor facing gate (-Z)
  const speed = useRef(0);
  const heading = useRef(0); // 0 radians = facing -Z
  const steerAngle = useRef(0);
  const wheelRot = useRef(0);

  // Auto-drive boost when unlocked/bypassing
  const bypassTimer = useRef(0);

  // Reusable materials
  const bodyMat = useMemo(
    () => ({
      color: "#181a1f",
      metalness: 0.85,
      roughness: 0.25,
    }),
    [],
  );

  const accentMat = useMemo(
    () => ({
      color: "#ff4d30",
      emissive: "#ff4d30",
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.3,
    }),
    [],
  );

  const cyanLedMat = useMemo(
    () => ({
      color: "#00f0ff",
      emissive: "#00f0ff",
      emissiveIntensity: 2.2,
      roughness: 0.1,
    }),
    [],
  );

  const wheelMat = useMemo(
    () => ({
      color: "#111215",
      roughness: 0.8,
      metalness: 0.1,
    }),
    [],
  );

  const rimMat = useMemo(
    () => ({
      color: "#3a3d45",
      metalness: 0.9,
      roughness: 0.2,
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.1);
    const input = inputRef.current || { forward: 0, turn: 0 };

    if (isBypassing || isUnlocked) {
      bypassTimer.current += dt;
      // During bypass, car holds steady, fires hack beam, then charges forward through gate!
      if (isUnlocked) {
        // Accelerate forward into the vault!
        speed.current = MathUtils.lerp(speed.current, 14, dt * 3.5);
        heading.current = MathUtils.lerp(heading.current, 0, dt * 5);
        pos.current.x = MathUtils.lerp(pos.current.x, 0, dt * 4);
      } else {
        speed.current = MathUtils.lerp(speed.current, 0, dt * 6);
      }
    } else {
      // Normal arcade driving controls
      const maxSpeed = 8.5;
      const reverseSpeed = -3.8;
      const accel = 14.0;
      const friction = 7.5;
      const turnRate = 2.8;

      if (input.forward > 0) {
        speed.current = Math.min(speed.current + accel * input.forward * dt, maxSpeed);
      } else if (input.forward < 0) {
        speed.current = Math.max(speed.current + accel * input.forward * dt, reverseSpeed);
      } else {
        // Coasting friction
        if (speed.current > 0) {
          speed.current = Math.max(speed.current - friction * dt, 0);
        } else if (speed.current < 0) {
          speed.current = Math.min(speed.current + friction * dt, 0);
        }
      }

      // Steering angle with snappy response
      const targetSteer = -input.turn * 0.55;
      steerAngle.current = MathUtils.lerp(steerAngle.current, targetSteer, dt * 12);

      // Turn vehicle based on speed and steer angle
      if (Math.abs(speed.current) > 0.05) {
        const dir = speed.current > 0 ? 1 : -1;
        heading.current += steerAngle.current * turnRate * dt * dir;
      }
    }

    // Move car in direction of heading
    // heading = 0 means forward is -Z (towards gate)
    const forwardX = -Math.sin(heading.current);
    const forwardZ = -Math.cos(heading.current);

    pos.current.x += forwardX * speed.current * dt;
    pos.current.z += forwardZ * speed.current * dt;

    // Boundaries in the hangar
    pos.current.x = MathUtils.clamp(pos.current.x, -4.8, 4.8);
    // Don't drive through closed gate before bypass
    if (!isUnlocked) {
      pos.current.z = MathUtils.clamp(pos.current.z, 2.0, 15.0);
    }

    // Update group position and orientation
    group.current.position.copy(pos.current);
    group.current.rotation.y = heading.current;

    // Suspension tilt & roll
    if (chassis.current) {
      const roll = (steerAngle.current * speed.current) * 0.08;
      const pitch = (input.forward * 0.06) + (speed.current > 0 ? 0.02 : 0);
      chassis.current.rotation.z = MathUtils.lerp(chassis.current.rotation.z, -roll, dt * 10);
      chassis.current.rotation.x = MathUtils.lerp(chassis.current.rotation.x, -pitch, dt * 10);
      // Subtle engine vibration
      chassis.current.position.y = Math.sin(state.clock.elapsedTime * 45) * 0.004;
    }

    // Wheel spin & steer
    wheelRot.current -= (speed.current / 0.18) * dt;
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

    // Antenna LED pulse
    if (antennaLed.current) {
      antennaLed.current.emissiveIntensity = 1.0 + Math.sin(state.clock.elapsedTime * 8) * 0.8;
    }

    // Hack laser beam animation during bypass
    if (hackBeam.current) {
      if (isBypassing && !isUnlocked) {
        hackBeam.current.visible = true;
        const scaleZ = Math.min(1, bypassTimer.current * 4);
        hackBeam.current.scale.set(1 + Math.sin(state.clock.elapsedTime * 30) * 0.3, 1, scaleZ);
      } else {
        hackBeam.current.visible = false;
      }
    }

    // Update engine sound pitch
    sound.updateEngine(Math.abs(speed.current) / 8.5);

    // Notify parent about position for distance calculation and camera tracking
    onPositionUpdate(pos.current, speed.current);
  });

  return (
    <group ref={group} position={[0, -2.46, 12.5]}>
      {/* Chassis Body */}
      <group ref={chassis}>
        {/* Main armored hull */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.76, 0.14, 1.25]} />
          <meshStandardMaterial {...bodyMat} />
        </mesh>

        {/* Cockpit / Sensor canopy */}
        <mesh position={[0, 0.28, -0.05]} castShadow>
          <boxGeometry args={[0.54, 0.12, 0.65]} />
          <meshStandardMaterial color="#0b0c0e" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Reconnaissance Scanner Turret */}
        <mesh position={[0, 0.37, -0.1]}>
          <cylinderGeometry args={[0.14, 0.16, 0.08, 16]} />
          <meshStandardMaterial {...bodyMat} />
        </mesh>
        <mesh position={[0, 0.39, -0.1]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial {...cyanLedMat} />
        </mesh>

        {/* Tactical Accent Trims */}
        <mesh position={[0, 0.26, 0.32]}>
          <boxGeometry args={[0.62, 0.04, 0.05]} />
          <meshStandardMaterial {...accentMat} />
        </mesh>
        <mesh position={[0, 0.21, -0.63]}>
          <boxGeometry args={[0.7, 0.04, 0.04]} />
          <meshStandardMaterial {...accentMat} />
        </mesh>

        {/* Rear Wing / Spoiler */}
        <mesh position={[0, 0.36, 0.58]}>
          <boxGeometry args={[0.82, 0.03, 0.18]} />
          <meshStandardMaterial {...bodyMat} />
        </mesh>
        <mesh position={[-0.34, 0.26, 0.56]}>
          <boxGeometry args={[0.04, 0.18, 0.1]} />
          <meshStandardMaterial {...bodyMat} />
        </mesh>
        <mesh position={[0.34, 0.26, 0.56]}>
          <boxGeometry args={[0.04, 0.18, 0.1]} />
          <meshStandardMaterial {...bodyMat} />
        </mesh>

        {/* Antenna */}
        <mesh position={[0.26, 0.44, 0.4]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.26, 0.6, 0.4]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial ref={antennaLed} color="#ff3333" emissive="#ff3333" emissiveIntensity={2} />
        </mesh>

        {/* Headlight Lenses */}
        <mesh position={[-0.26, 0.18, -0.63]}>
          <boxGeometry args={[0.12, 0.06, 0.02]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} />
        </mesh>
        <mesh position={[0.26, 0.18, -0.63]}>
          <boxGeometry args={[0.12, 0.06, 0.02]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} />
        </mesh>

        {/* Real Headlight Spotlights pointing forward */}
        <spotLight
          ref={leftHeadlight}
          position={[-0.26, 0.18, -0.65]}
          target-position={[-0.26, -0.2, -8.0]}
          color="#ffffff"
          intensity={14}
          angle={Math.PI / 6}
          penumbra={0.4}
          distance={16}
          decay={1.2}
        />
        <spotLight
          ref={rightHeadlight}
          position={[0.26, 0.18, -0.65]}
          target-position={[0.26, -0.2, -8.0]}
          color="#ffffff"
          intensity={14}
          angle={Math.PI / 6}
          penumbra={0.4}
          distance={16}
          decay={1.2}
        />

        {/* Rear Tail / Brake lights */}
        <mesh position={[-0.28, 0.18, 0.63]}>
          <boxGeometry args={[0.1, 0.04, 0.02]} />
          <meshStandardMaterial color="#ff1100" emissive="#ff1100" emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[0.28, 0.18, 0.63]}>
          <boxGeometry args={[0.1, 0.04, 0.02]} />
          <meshStandardMaterial color="#ff1100" emissive="#ff1100" emissiveIntensity={1.5} />
        </mesh>

        {/* Ground Scanner Laser Cone (subtle forward indicator) */}
        <mesh position={[0, 0.02, -1.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 2.4]} />
          <meshBasicMaterial
            color="#00f0ff"
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>

        {/* Hacking Data Laser Beam (fires towards gate when bypassing) */}
        <mesh ref={hackBeam} position={[0, 0.4, -4.5]} visible={false}>
          <cylinderGeometry args={[0.03, 0.06, 8, 12]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* 4 Wheels */}
      {/* Front Left */}
      <group position={[-0.44, 0.16, -0.42]}>
        <group ref={wheelFL} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.14, 20]} />
            <meshStandardMaterial {...wheelMat} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.08, 16]} />
            <meshStandardMaterial {...rimMat} />
          </mesh>
        </group>
      </group>

      {/* Front Right */}
      <group position={[0.44, 0.16, -0.42]}>
        <group ref={wheelFR} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.14, 20]} />
            <meshStandardMaterial {...wheelMat} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.08, 16]} />
            <meshStandardMaterial {...rimMat} />
          </mesh>
        </group>
      </group>

      {/* Rear Left */}
      <group position={[-0.44, 0.16, 0.42]}>
        <group ref={wheelBL} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.16, 20]} />
            <meshStandardMaterial {...wheelMat} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.09, 16]} />
            <meshStandardMaterial {...rimMat} />
          </mesh>
        </group>
      </group>

      {/* Rear Right */}
      <group position={[0.44, 0.16, 0.42]}>
        <group ref={wheelBR} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.16, 20]} />
            <meshStandardMaterial {...wheelMat} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.09, 16]} />
            <meshStandardMaterial {...rimMat} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
