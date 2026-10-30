import type { ComponentType } from "react";
import type { SectionId } from "@/config/site";
import { Work } from "./Work";
import { Experience } from "./Experience";
import { Capabilities } from "./Capabilities";
import { Education } from "./Education";
import { TerminalSection } from "./terminal/TerminalSection";
import { Contact } from "./contact/Contact";

export { Hero } from "./hero/Hero";

// Maps the ids in siteConfig.sections to components, so order/visibility is controlled from config.
export const sectionComponents: Record<SectionId, ComponentType> = {
  work: Work,
  experience: Experience,
  capabilities: Capabilities,
  education: Education,
  terminal: TerminalSection,
  contact: Contact,
};
