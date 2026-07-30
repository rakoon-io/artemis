import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

/**
 * COLORATION SYNTAXIQUE des blocs de code.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI PAS `rehype-highlight`
 *
 * Il importe le jeu « commun » de highlight.js INCONDITIONNELLEMENT - trente-sept
 * langages, dont Erlang, Lisp et Perl - avant même de regarder la liste qu'on lui
 * passe : `settings.languages || common`. Le paramètre s'ajoute donc au lot au
 * lieu de le remplacer, et tout part dans le navigateur, puisque le rendu Markdown
 * sert aussi depuis des composants clients (aperçu de l'éditeur, description de
 * ticket). Mesuré : 302 ko de langages pour les trente-sept, 108 pour les treize
 * qu'un wiki de projet écrit réellement.
 *
 * Le parcours qu'il fait tenant en quinze lignes, on le fait ici - et l'on choisit
 * ce qu'on embarque.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ON NE DEVINE PAS LA LANGUE
 *
 * Seul un bloc dont la langue est DÉCLARÉE (« ```sql ») est coloré. La détection
 * automatique se trompe régulièrement sur un extrait de journal, une sortie de
 * terminal ou trois lignes de configuration - et une coloration fausse induit en
 * erreur là où l'absence de coloration ne dit rien.
 */
const lowlight = createLowlight({
  bash,
  css,
  diff,
  ini,
  java,
  json,
  markdown,
  php,
  python,
  sql,
  typescript,
  xml,
  yaml,
});

/** Alias usuels : personne n'écrit « ```typescript » pour trois lignes de JS. */
const ALIASES: Record<string, string> = {
  js: "typescript",
  jsx: "typescript",
  ts: "typescript",
  tsx: "typescript",
  javascript: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  html: "xml",
  svg: "xml",
  yml: "yaml",
  py: "python",
  md: "markdown",
  toml: "ini",
  conf: "ini",
  patch: "diff",
};

/** Nœud hast, réduit à ce dont ce module a besoin. */
interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

/** Classes d'un nœud, quelle que soit la forme sous laquelle elles arrivent. */
function classList(node: HastNode): string[] {
  const raw = node.properties?.className;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return raw.split(/\s+/);
  return [];
}

/** Texte brut d'un bloc de code (hast n'y met que des nœuds texte). */
function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/**
 * Greffon rehype : colore les `<pre><code class="language-…">`.
 *
 * Les blocs sans langue, ou dans une langue non embarquée, sont laissés tels
 * quels - ils gardent leur mise en forme monospace, simplement sans couleur.
 */
export function rehypeWikiHighlight() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      for (const child of node.children ?? []) walk(child);
      if (node.type !== "element" || node.tagName !== "pre") return;

      const code = node.children?.find(
        (c) => c.type === "element" && c.tagName === "code",
      );
      if (!code) return;

      const declared = classList(code)
        .find((c) => c.startsWith("language-"))
        ?.slice("language-".length)
        .toLowerCase();
      if (!declared) return;

      const language = ALIASES[declared] ?? declared;
      if (!lowlight.registered(language)) return;

      const result = lowlight.highlight(language, textOf(code)) as HastNode;
      code.children = result.children ?? [];
      // `hljs` porte la couleur de base ; la classe de langue est conservée,
      // elle documente le bloc et sert au style comme au débogage.
      code.properties = {
        ...code.properties,
        className: [...classList(code), "hljs"],
      };
    };
    walk(tree);
  };
}
