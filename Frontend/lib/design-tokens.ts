/**
 * Design tokens — a single source of truth for inline-style colours that
 * can't easily be expressed with Tailwind utility classes (e.g. dynamic
 * border/shadow colours, SVG stroke colours, CSS custom props on elements).
 *
 * Values are kept in sync with the CSS variables defined in globals.css.
 */

/** Palette — inline colour helpers. */
export const P = {
  /** Main brand accent (emerald). */
  primary: "#10b981",
  /** Readable accent on white surfaces. */
  primaryText: "#059669",
  /** Body / heading text (slate-900). */
  text: "#0f172a",
  /** Secondary / muted text (slate-500). */
  muted: "#64748b",
  /** Subtle tinted fill (light grey). */
  subtle: "#f4f4f5",
  /** Border colour. */
  border: "#ececf0",
  /** Green success / positive state (same as primary). */
  green: "#10b981",
  /** Gold star / rating colour. */
  star: "#f59e0b",
  /** White card surface. */
  card: "#ffffff",
} as const;

/** Background fills. */
export const BG = {
  /** Primary page / card background. */
  main: "#ffffff",
  /** Subtle off-white section background. */
  subtle: "#fafafa",
} as const;

/** Reusable elevation shadow. */
export const cardShadow =
  "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px rgba(15,23,42,0.05)";
