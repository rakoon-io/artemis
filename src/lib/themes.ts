/**
 * Catalogue des thèmes de l'interface — plusieurs palettes **claires** et **sombres**,
 * plus l'option « Système ». Chaque thème = une classe CSS unique posée sur `<html>`
 * (voir les blocs de tokens dans `globals.css`). Les palettes définissent les neutres
 * et surfaces ; la couleur d'accent (`--primary`) reste le bordeaux Rakoon, et peut
 * être surchargée par projet via `accentColor`.
 */

export type ThemeMode = "light" | "dark";

export interface ThemeDef {
  /** Identifiant next-themes = nom de la classe CSS appliquée sur `<html>`. */
  id: string;
  label: string;
  mode: ThemeMode;
  /** Couleurs d'aperçu (CSS `oklch`) pour la vignette du sélecteur. */
  swatch: { bg: string; primary: string; fg: string };
}

const BORDEAUX_LIGHT = "oklch(0.36 0.13 13)";
const BORDEAUX_DARK = "oklch(0.52 0.155 15)";

export const THEMES: ThemeDef[] = [
  // ── Claires ──────────────────────────────────────────────────────────────
  {
    id: "light",
    label: "Rakoon Clair",
    mode: "light",
    swatch: { bg: "oklch(0.995 0 0)", primary: BORDEAUX_LIGHT, fg: "oklch(0.16 0 0)" },
  },
  {
    id: "sand",
    label: "Sable",
    mode: "light",
    swatch: { bg: "oklch(0.986 0.008 82)", primary: BORDEAUX_LIGHT, fg: "oklch(0.20 0.012 66)" },
  },
  {
    id: "mist",
    label: "Brume",
    mode: "light",
    swatch: { bg: "oklch(0.986 0.006 250)", primary: BORDEAUX_LIGHT, fg: "oklch(0.21 0.02 262)" },
  },
  {
    id: "sage",
    label: "Menthe",
    mode: "light",
    swatch: { bg: "oklch(0.986 0.008 162)", primary: BORDEAUX_LIGHT, fg: "oklch(0.20 0.015 168)" },
  },
  // ── Sombres ──────────────────────────────────────────────────────────────
  {
    id: "dark",
    label: "Rakoon Sombre",
    mode: "dark",
    swatch: { bg: "oklch(0.15 0 0)", primary: BORDEAUX_DARK, fg: "oklch(0.975 0 0)" },
  },
  {
    id: "midnight",
    label: "Minuit",
    mode: "dark",
    swatch: { bg: "oklch(0.155 0.024 260)", primary: BORDEAUX_DARK, fg: "oklch(0.96 0.01 250)" },
  },
  {
    id: "slate",
    label: "Ardoise",
    mode: "dark",
    swatch: { bg: "oklch(0.21 0.012 250)", primary: BORDEAUX_DARK, fg: "oklch(0.965 0.005 250)" },
  },
  {
    id: "carbon",
    label: "Carbone",
    mode: "dark",
    swatch: { bg: "oklch(0.08 0 0)", primary: BORDEAUX_DARK, fg: "oklch(0.98 0 0)" },
  },
];

/** Identifiants passés à next-themes (`themes={THEME_IDS}`). */
export const THEME_IDS: string[] = THEMES.map((t) => t.id);
export const LIGHT_THEMES: ThemeDef[] = THEMES.filter((t) => t.mode === "light");
export const DARK_THEMES: ThemeDef[] = THEMES.filter((t) => t.mode === "dark");

const MODE_BY_ID = new Map(THEMES.map((t) => [t.id, t.mode] as const));

/** Mode clair/sombre d'un identifiant résolu (pour Sonner, l'icône du sélecteur, etc.). */
export function themeMode(id: string | undefined): ThemeMode {
  return (id && MODE_BY_ID.get(id)) || "light";
}
