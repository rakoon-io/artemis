/**
 * Catalogue des thèmes de l'interface - plusieurs palettes **claires** et **sombres**,
 * plus l'option « Système ». Chaque thème = une classe CSS unique posée sur `<html>`
 * (voir les blocs de tokens dans `globals.css`). Les palettes définissent les neutres
 * et surfaces ; la couleur d'accent (`--primary`) est l'indigo/violet crépusculaire
 * d'Artemis, et peut être surchargée par projet via `accentColor`.
 */

export type ThemeMode = "light" | "dark";

export interface ThemeDef {
  /** Identifiant next-themes = nom de la classe CSS appliquée sur `<html>`. */
  id: string;
  label: string;
  mode: ThemeMode;
  /**
   * Couleurs d'aperçu (CSS `oklch`) pour la vignette du sélecteur : le fond, une
   * surface/carte (révèle la teinte de la palette), la bordure, la couleur
   * d'accent et le texte. Ce sont les jetons RÉELS de la palette - la vignette
   * n'invente rien, sans quoi elle promettrait ce qu'on n'obtiendrait pas.
   */
  swatch: {
    bg: string;
    surface: string;
    border: string;
    primary: string;
    fg: string;
  };
}

const ARTEMIS_LIGHT = "oklch(0.505 0.175 285)";
const ARTEMIS_DARK = "oklch(0.63 0.16 287)";

export const THEMES: ThemeDef[] = [
  // ── Claires ──────────────────────────────────────────────────────────────
  {
    id: "light",
    label: "Artemis Clair",
    mode: "light",
    swatch: {
      bg: "oklch(0.995 0 0)",
      surface: "oklch(0.967 0 0)",
      border: "oklch(0.84 0 0)",
      primary: ARTEMIS_LIGHT,
      fg: "oklch(0.16 0 0)",
    },
  },
  {
    id: "sand",
    label: "Sable",
    mode: "light",
    swatch: {
      bg: "oklch(0.986 0.008 82)",
      surface: "oklch(0.945 0.014 82)",
      border: "oklch(0.82 0.02 82)",
      primary: ARTEMIS_LIGHT,
      fg: "oklch(0.20 0.012 66)",
    },
  },
  {
    id: "mist",
    label: "Brume",
    mode: "light",
    swatch: {
      bg: "oklch(0.986 0.006 250)",
      surface: "oklch(0.952 0.012 250)",
      border: "oklch(0.825 0.02 250)",
      primary: ARTEMIS_LIGHT,
      fg: "oklch(0.21 0.02 262)",
    },
  },
  {
    id: "sage",
    label: "Menthe",
    mode: "light",
    swatch: {
      bg: "oklch(0.986 0.008 162)",
      surface: "oklch(0.95 0.014 160)",
      border: "oklch(0.825 0.022 160)",
      primary: ARTEMIS_LIGHT,
      fg: "oklch(0.20 0.015 168)",
    },
  },
  // ── Sombres ──────────────────────────────────────────────────────────────
  {
    id: "dark",
    label: "Artemis Nuit",
    mode: "dark",
    swatch: {
      bg: "oklch(0.17 0.03 280)",
      surface: "oklch(0.265 0.03 283)",
      border: "oklch(0.75 0.05 285 / 26%)",
      primary: ARTEMIS_DARK,
      fg: "oklch(0.97 0.01 285)",
    },
  },
  {
    id: "midnight",
    label: "Minuit",
    mode: "dark",
    swatch: {
      bg: "oklch(0.155 0.024 260)",
      surface: "oklch(0.28 0.032 260)",
      border: "oklch(0.8 0.04 258 / 26%)",
      primary: ARTEMIS_DARK,
      fg: "oklch(0.96 0.01 250)",
    },
  },
  {
    id: "slate",
    label: "Ardoise",
    mode: "dark",
    swatch: {
      bg: "oklch(0.21 0.012 250)",
      surface: "oklch(0.305 0.016 250)",
      border: "oklch(0.9 0.02 250 / 20%)",
      primary: ARTEMIS_DARK,
      fg: "oklch(0.965 0.005 250)",
    },
  },
  {
    id: "carbon",
    label: "Carbone",
    mode: "dark",
    swatch: {
      bg: "oklch(0.08 0 0)",
      surface: "oklch(0.185 0 0)",
      border: "oklch(1 0 0 / 19%)",
      primary: ARTEMIS_DARK,
      fg: "oklch(0.98 0 0)",
    },
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
