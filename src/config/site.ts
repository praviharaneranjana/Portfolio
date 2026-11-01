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
   * Rolling balls: beaded balls that start on the hero pillars and roll down the page with the content as the visitor
   * scrolls. Any element with a `data-ball-floor` attribute is a ledge. See docs/3D.md.
   */
  balls: {
    enabled: true,
    count: 3,
    /** Ball radius in CSS pixels. */
    radius: { desktop: 24, mobile: 14 },
    /**
     * One finish per ball (cycled if `count` is larger). Light enough to stand out on the near-black page:
     * satin pearl, the coral accent, and polished steel. `core` is the shadowed inside seen between the beads.
     */
    materials: [
      { color: "#ece6dc", core: "#4a4640", roughness: 0.3, metalness: 0.25, clearcoat: 0.7, envMapIntensity: 1.1 },
      { color: "#ff5a3d", core: "#3d120b", roughness: 0.36, metalness: 0.1, clearcoat: 0.6, envMapIntensity: 0.9 },
      { color: "#c9ced6", core: "#33373d", roughness: 0.24, metalness: 0.55, clearcoat: 0.4, envMapIntensity: 1.3 },
    ],
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
