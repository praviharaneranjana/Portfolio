"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import type { DirectionalLight } from "three";
import { siteConfig } from "@/config/site";

// Studio lighting: softboxes baked into an environment map for reflections, plus a key light that follows the mouse.
export function Studio() {
  const key = useRef<DirectionalLight>(null);

  useFrame(({ pointer }) => {
    if (!key.current) return;
    key.current.position.x += (pointer.x * 7 - key.current.position.x) * 0.04;
    key.current.position.y += (6 + pointer.y * 3 - key.current.position.y) * 0.04;
  });

  return (
    <>
      <ambientLight intensity={0.05} />
      <directionalLight ref={key} position={[0, 6, 6]} intensity={2.4} color={siteConfig.scene.keyLight} />
      <directionalLight position={[-8, 2, -4]} intensity={3} color="#dfe3ea" />
      <directionalLight position={[8, -1, -3]} intensity={0.5} color={siteConfig.scene.rimLight} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[-7, 1, 0]} rotation-y={Math.PI / 2} scale={[3, 10, 1]} />
        <Lightformer
          form="rect"
          intensity={0.25}
          color={siteConfig.scene.rimLight}
          position={[7, 0, 0]}
          rotation-y={-Math.PI / 2}
          scale={[3, 8, 1]}
        />
      </Environment>
    </>
  );
}
