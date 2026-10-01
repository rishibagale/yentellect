/**
 * Yentellect — Mode Registry (hidden-mode code lives here)
 *
 * Rule: the four non-active modes (Convergent, Divergent, Metacognitive, DMN)
 * are hidden behind the Settings "Beta modes" toggle (default off). Their data
 * is preserved in this file and MUST NOT be deleted. Nothing in `workbench/`
 * may import this except the lens switcher (Stage 5) and the Settings toggle.
 *
 * Only this file is allowed to know about modes. The workbench UI deals in
 * *lenses* (see `LensId`), which are a presentation concept, not modes.
 */

/** All six modes, preserved verbatim. Hidden set must not be surfaced when beta is off. */
export const ACTIVE_LENSES = ["ANALOGICAL", "SYSTEMS"] as const;
export const BETA_MODES = [
  "CONVERGENT",
  "DIVERGENT",
  "METACOGNITIVE",
  "DMN",
] as const;

export type ThinkingMode =
  | (typeof ACTIVE_LENSES)[number]
  | (typeof BETA_MODES)[number];

/**
 * A lens is how the UI refers to a selectable reasoning view.
 * Today that is exactly the two active modes; when "Beta modes" is on,
 * the four beta modes join the switcher with a "Beta" badge.
 */
export type LensId = ThinkingMode;

export interface ModeInfo {
  mode: ThinkingMode;
  label: string;
  tagline: string;
}

/** Labels and taglines for all six modes. Preserved: do not delete the beta rows. */
export const MODES: Record<ThinkingMode, ModeInfo> = {
  ANALOGICAL: {
    mode: "ANALOGICAL",
    label: "Analogical",
    tagline: "Cross-domain structural mapping",
  },
  SYSTEMS: {
    mode: "SYSTEMS",
    label: "Systems",
    tagline: "Causal chains and feedback loops",
  },
  CONVERGENT: {
    mode: "CONVERGENT",
    label: "Convergent",
    tagline: "Precision under constraint",
  },
  DIVERGENT: {
    mode: "DIVERGENT",
    label: "Divergent",
    tagline: "Ideational fluency",
  },
  METACOGNITIVE: {
    mode: "METACOGNITIVE",
    label: "Metacognitive",
    tagline: "Reasoning about reasoning",
  },
  DMN: {
    mode: "DMN",
    label: "DMN",
    tagline: "Open wandering and insight incubation",
  },
};

/** Legacy color map, retained for compatibility. The workbench intentionally
 *  does NOT use mode colors: lenses are distinguished by icon and label. */
export const MODE_COLORS: Record<ThinkingMode, string> = {
  ANALOGICAL: "#F59E0B",
  SYSTEMS: "#EF4444",
  CONVERGENT: "#3B82F6",
  DIVERGENT: "#8B5CF6",
  METACOGNITIVE: "#10B981",
  DMN: "#6366F1",
};

/** Visible lens list for a given beta state. Single source of truth for the
 *  lens switcher, palette lens commands, and status bar. */
export function visibleLenses(betaModes: boolean): ThinkingMode[] {
  return betaModes ? [...ACTIVE_LENSES, ...BETA_MODES] : [...ACTIVE_LENSES];
}
