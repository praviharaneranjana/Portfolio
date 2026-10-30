"use client";

import dynamic from "next/dynamic";
import { siteConfig } from "@/config/site";

// three.js needs `window`, so the scene is client-only and code-split from the main bundle.
const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

export function HeroScene() {
  if (!siteConfig.scene.enabled) return null;
  return <HeroCanvas />;
}
