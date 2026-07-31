import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind de façon sûre (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * FUSEAU D'AFFICHAGE.
 *
 * Une date est mise en forme là où la page est rendue : sur le SERVEUR pour une
 * page de wiki ou de ticket, dans le NAVIGATEUR pour un tableau. Sans fuseau
 * explicite, chacun emploie le sien - et un serveur en UTC affiche « 00:38 » là
 * où l'équipe, à Paris, a enregistré à 02:38.
 *
 * L'écart passait inaperçu tant qu'on n'affichait que le jour. Il saute aux yeux
 * dès qu'on affiche l'heure, et il rend un historique trompeur : deux
 * enregistrements identiques paraissent faits à des heures différentes selon la
 * page qui les montre.
 *
 * `NEXT_PUBLIC_TIME_ZONE` fixe donc le fuseau des DEUX côtés. Sans elle, on
 * garde celui de la machine - ce qui suffit quand le serveur et le navigateur
 * tournent au même endroit, mais pas quand le serveur est un conteneur en UTC.
 */
const DISPLAY_TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || undefined;

/** Une date qu'on ne sait pas lire ne doit pas faire tomber la page. */
function readDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formate un JOUR en français court (ex : 9 juil. 2026).
 *
 * Pour ce qui est un jour et rien d'autre : la date d'une réunion, les bornes
 * d'un sprint, la dernière relecture d'une page. Y ajouter une heure ne dirait
 * rien de plus - une réunion du 9 juillet ne s'est pas tenue « à 00:00 ».
 */
export function formatDate(
  date: Date | string | null | undefined,
  timeZone = DISPLAY_TIME_ZONE,
): string {
  const d = readDate(date);
  if (!d) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(d);
}

/**
 * Formate l'HEURE seule (ex : 14:32).
 *
 * Pour les colonnes serrées, où l'heure se met sous le jour plutôt qu'à sa
 * suite : le tableau des tickets compte onze colonnes et débordait déjà de sa
 * largeur, une date allongée d'un tiers l'aurait poussé plus loin encore.
 */
export function formatTime(
  date: Date | string | null | undefined,
  timeZone = DISPLAY_TIME_ZONE,
): string {
  const d = readDate(date);
  if (!d) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

/**
 * Formate un INSTANT (ex : 9 juil. 2026, 14:32).
 *
 * Pour ce qui s'est produit à un moment précis : une révision, un commentaire,
 * la création ou la dernière modification. Le jour seul ne suffit pas à
 * distinguer deux versions enregistrées à dix minutes d'intervalle - or c'est
 * exactement ce qu'un historique doit permettre de faire.
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  timeZone = DISPLAY_TIME_ZONE,
): string {
  const d = readDate(date);
  if (!d) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

/** Initiales à partir d'un nom ou d'un e-mail. */
export function initials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "?";
  const base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
