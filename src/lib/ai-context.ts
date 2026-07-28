import type { ComponentKind } from "@prisma/client";

/**
 * Assemblage du CONTEXTE d'une demande adressée à l'IA - module PUR : aucun
 * accès base, aucun appel réseau, aucune dépendance runtime (l'import de
 * `ComponentKind` est un import de type, effacé à la compilation). Il est donc
 * testable isolément (voir ai-context.test.ts).
 *
 * Le contexte se compose en QUATRE strates, de la plus stable à la plus volatile :
 *   1. le PROJET  - nom, clé, description : de quoi parle-t-on globalement ;
 *   2. les MODULES - les domaines fonctionnels à grosse maille, qui donnent la
 *      carte du produit avant d'en détailler les briques ;
 *   3. les COMPOSANTS - le catalogue des briques du produit (page / composant
 *      réutilisable / service) avec leur description et leur module : à quelle
 *      partie du produit une demande peut se rattacher ;
 *   4. les CONSIGNES - le texte libre saisi par l'utilisateur pour cette demande.
 *
 * Le résultat est un bloc de texte lisible injecté dans le prompt système.
 */

/** Libellés FR des natures de composant, tels qu'écrits dans le prompt. */
export const COMPONENT_KIND_LABELS: Record<ComponentKind, string> = {
  PAGE: "page",
  SHARED: "composant réutilisable",
  SERVICE: "service",
};

/** Composant tel qu'il apparaît dans le contexte (sous-ensemble du modèle). */
export interface ComponentContext {
  name: string;
  kind: ComponentKind;
  description?: string | null;
  /** Nom du module de rattachement, s'il en a un (composants transverses : non). */
  moduleName?: string | null;
}

/** Module fonctionnel tel qu'il apparaît dans le contexte. */
export interface ModuleContext {
  name: string;
  description?: string | null;
}

export interface RequestContextInput {
  projectName: string;
  projectKey: string;
  projectDescription?: string | null;
  /** Modules fonctionnels du projet (peut être vide : la section est omise). */
  modules?: ModuleContext[];
  /** Catalogue de composants du projet (peut être vide : la section est omise). */
  components?: ComponentContext[];
  /** Consignes libres saisies par l'utilisateur pour cette demande. */
  instructions?: string | null;
}

/**
 * Garde-fous de taille : le contexte part dans chaque appel au modèle, on borne
 * donc le catalogue listé et la longueur de chaque description. La borne de
 * description reprend celle du formulaire (`createComponentSchema`) : dans le
 * cas nominal rien n'est donc tronqué, contrairement à ce que laisserait croire
 * une borne plus basse ; elle ne sert que de filet pour des données injectées
 * hors formulaire (import, MCP, écriture directe en base).
 */
export const MAX_CONTEXT_COMPONENTS = 40;
export const MAX_COMPONENT_DESCRIPTION = 500;

/**
 * Deux bornes distinctes, parce que les deux usages du catalogue n'ont pas le
 * même coût. DÉCRIRE un composant (nom + nature + description) coûte cher : on
 * s'arrête à `MAX_CONTEXT_COMPONENTS`. Le simple ÉNONCÉ d'un nom, qui sert au
 * modèle à répondre une valeur exacte, coûte quelques jetons : le borner à 40
 * rendrait les composants suivants impossibles à suggérer, pour une économie
 * dérisoire. On en admet donc bien davantage, tout en gardant un plafond pour
 * qu'un catalogue démesuré ne fasse pas exploser le prompt.
 */
export const MAX_PROMPT_COMPONENT_NAMES = 200;

/** Borne des modules décrits : ils sont bien moins nombreux que les composants. */
export const MAX_CONTEXT_MODULES = 30;

/**
 * Réduit toute suite de blancs - RETOURS À LA LIGNE COMPRIS - à une espace
 * simple. Indispensable : la description d'un composant est saisie dans un
 * `<textarea>`, donc multiligne. Sans cet aplatissement, un retour à la ligne
 * ferait passer la suite du texte pour une nouvelle entrée du catalogue, voire
 * pour une consigne de premier niveau, et corromprait la structure du contexte.
 */
export function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Aplatit puis tronque proprement un texte trop long (ellipse en fin). */
function clamp(text: string, max: number): string {
  const flat = collapse(text);
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Décrit un composant en une ligne : « - Nom [nature] : description ».
 * La description est facultative ; la nature est toujours présente pour que le
 * modèle distingue un écran d'un service.
 */
export function formatComponentLine(component: ComponentContext): string {
  const kind = COMPONENT_KIND_LABELS[component.kind] ?? component.kind;
  const moduleName = component.moduleName?.trim();
  // Le module est rappelé sur chaque composant : le modèle peut ainsi relier une
  // demande formulée à grosse maille (« le module utilisateurs ») à une brique
  // précise, sans avoir à recouper deux listes.
  const scope = moduleName ? ` (module : ${collapse(moduleName)})` : "";
  const base = `- ${collapse(component.name)} [${kind}]${scope}`;
  const description = component.description?.trim();
  return description
    ? `${base} : ${clamp(description, MAX_COMPONENT_DESCRIPTION)}`
    : base;
}

/** Décrit un module en une ligne : « - Nom : description ». */
export function formatModuleLine(module: ModuleContext): string {
  const base = `- ${collapse(module.name)}`;
  const description = module.description?.trim();
  return description
    ? `${base} : ${clamp(description, MAX_COMPONENT_DESCRIPTION)}`
    : base;
}

/**
 * Porte d'entrée UNIQUE du catalogue vers le prompt. Écarte d'abord les entrées
 * sans nom exploitable (inutiles au modèle, et elles fausseraient le
 * rapprochement par nom fait ensuite côté action), puis applique les deux bornes.
 *
 * Renvoie :
 *  - `described` : les composants détaillés dans le bloc de contexte ;
 *  - `named`     : les noms proposés au modèle comme valeurs exactes possibles -
 *                  sur-ensemble de `described` ;
 *  - `undescribed` : combien de `named` ne sont pas détaillés, pour que le bloc
 *                  de contexte le dise au lieu de laisser croire qu'ils sont
 *                  inconnus du modèle.
 */
export function selectContextComponents<T extends { name: string }>(
  components: T[] | undefined,
): { described: T[]; named: T[]; undescribed: number } {
  const usable = (components ?? []).filter((c) => c.name.trim());
  const named = usable.slice(0, MAX_PROMPT_COMPONENT_NAMES);
  const described = named.slice(0, MAX_CONTEXT_COMPONENTS);
  return { described, named, undescribed: named.length - described.length };
}

/** Assemble le bloc de contexte lisible à partir des trois strates. */
export function buildRequestContext(input: RequestContextInput): string {
  const lines: string[] = [
    `Projet : ${input.projectName} (${input.projectKey}).`,
  ];

  // Aplatie comme les autres textes libres : la description de projet est saisie
  // dans un `<textarea>`, et un retour à la ligne y ferait passer la suite pour
  // une directive de premier niveau du contexte.
  const description = input.projectDescription
    ? collapse(input.projectDescription)
    : "";
  if (description) lines.push(`Description du projet : ${description}`);

  // Les modules d'abord : ils donnent la carte du produit à grosse maille, sur
  // laquelle les composants listés ensuite viennent se placer.
  const usableModules = (input.modules ?? []).filter((m) => m.name.trim());
  const modules = usableModules.slice(0, MAX_CONTEXT_MODULES);
  if (modules.length > 0) {
    lines.push(
      "Modules du projet (domaines fonctionnels, du plus général au plus précis) :",
      ...modules.map(formatModuleLine),
    );
    // Signalé explicitement, comme pour les composants : sans cette ligne, le
    // modèle croirait la liste exhaustive alors que des composants listés plus
    // bas citent un module absent d'ici.
    const omitted = usableModules.length - modules.length;
    if (omitted > 0) {
      lines.push(`- (… et ${omitted} autre(s) module(s) non détaillé(s) ici)`);
    }
  }

  const { described, undescribed } = selectContextComponents(input.components);
  if (described.length > 0) {
    lines.push(
      "Composants du projet (rattache chaque ticket au composant concerné en",
      "reprenant son nom EXACT ; laisse vide si aucun ne correspond) :",
      ...described.map(formatComponentLine),
    );
    if (undescribed > 0) {
      // Formulation importante : ces composants SONT proposés au modèle (leur
      // nom figure dans les règles), seule leur description manque ici. Les
      // annoncer comme « non listés » inciterait le modèle à les ignorer.
      lines.push(
        `- (… et ${undescribed} autre(s) composant(s) sélectionnables, non détaillés ici)`,
      );
    }
  }

  const instructions = input.instructions?.trim();
  if (instructions) lines.push(`Consignes de l'utilisateur : ${instructions}`);

  return lines.join("\n");
}
