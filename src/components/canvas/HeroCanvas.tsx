"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { siteConfig } from "@/config/site";
import { BeadArches } from "./BeadArches";
import { Studio } from "./Studio";

export default function HeroCanvas() {
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  // Start sharp; drop resolution if the GPU can't hold the frame rate.
  const [dpr, setDpr] = useState(1.5);
  const [env] = useState(() => ({
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    lowDetail: window.innerWidth < 768,
  }));

  // Stop rendering once the hero has scrolled out of view.
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(wrapper.current!);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapper} className="h-full w-full">
      <Canvas
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, -0.9, 11], fov: 32 }}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} />
        <color attach="background" args={[siteConfig.scene.background]} />
        <fog attach="fog" args={[siteConfig.scene.background, 10, 17]} />
        <Studio />
        <BeadArches reducedMotion={env.reducedMotion} lowDetail={env.lowDetail} />
        <EffectComposer multisampling={4}>
          <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.35} />
          <Vignette offset={0.25} darkness={0.75} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
