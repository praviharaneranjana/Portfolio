// Site-wide settings: navigation, section toggles and 3D options.
export const siteConfig = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  title: "Pravihara Abegunasekara — Software Engineer",
  description:
    "Pravihara Abegunasekara is a .NET & full-stack software engineer building enterprise SaaS, applied AI products, mobile apps and Unity games.",

  // Order here = order on the page. Set `enabled: false` to hide a section; `nav: false` keeps it out of the header.
  sections: [
    { id: "work", label: "Work", enabled: true, nav: true },
    { id: "experience", label: "Experience", enabled: true, nav: true },
    { id: "capabilities", label: "Capabilities", enabled: true, nav: true },
    { id: "education", label: "Education", enabled: true, nav: false },
    { id: "terminal", label: "Terminal", enabled: true, nav: true },
    { id: "contact", label: "Contact", enabled: true, nav: false },
  ],

  scene: {
    enabled: true,
    background: "#0e0f10",
    /** Material of the beaded sculpture. */
    material: { color: "#1b1c1f", roughness: 0.42, metalness: 0.55, clearcoat: 0.35 },
    keyLight: "#ffffff",
    rimLight: "#ff4d30",
    /** Animated ripple along the beads. Disabled automatically for prefers-reduced-motion. */
    ripple: true,
  },

  /**
   * Rolling balls: beaded balls (same material as the pillars) that start on the hero pillars and roll down the page
   * as the visitor scrolls. Any element with a `data-ball-floor` attribute is a ledge. See docs/3D.md.
   */
  balls: {
    enabled: true,
    count: 3,
    /** Ball radius in CSS pixels. */
    radius: { desktop: 24, mobile: 10 },
    /**
     * The balls sit on the page without the hero's fog and vignette, so they need a darker, less glossy version of
     * the pillar material to read as the same object.
     */
    material: { color: "#131417", roughness: 0.55, metalness: 0.45, clearcoat: 0.15, envMapIntensity: 0.6 },
  },

  /** Intro: a 3D vault gate (built in Blender, see blender/build_gate.py) the visitor unlocks by turning the wheel. */
  gate: {
    enabled: true,
    model: "/models/gate.glb",
    /** Full turns of the wheel needed to unlock. */
    turns: 1,
    /** Skip the gate on reloads within the same browser tab. */
    oncePerSession: false,
  },
} as const;

export type SectionId = (typeof siteConfig.sections)[number]["id"];
