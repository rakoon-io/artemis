import { describe, it, expect } from "vitest";
import {
  buildRequestContext,
  formatComponentLine,
  formatModuleLine,
  selectContextComponents,
  COMPONENT_KIND_LABELS,
  MAX_COMPONENT_DESCRIPTION,
  MAX_CONTEXT_COMPONENTS,
  MAX_CONTEXT_MODULES,
  MAX_PROMPT_COMPONENT_NAMES,
} from "./ai-context";

const project = { projectName: "Artemis", projectKey: "RKN" };

describe("formatComponentLine", () => {
  it("décrit un composant avec sa nature et sa description", () => {
    expect(
      formatComponentLine({
        name: "Tableau Kanban",
        kind: "PAGE",
        description: "Vue Kanban du projet.",
      }),
    ).toBe("- Tableau Kanban [page] : Vue Kanban du projet.");
  });

  it("omet le séparateur quand il n'y a pas de description", () => {
    expect(formatComponentLine({ name: "Wiki", kind: "PAGE" })).toBe(
      "- Wiki [page]",
    );
    expect(
      formatComponentLine({ name: "Wiki", kind: "PAGE", description: "   " }),
    ).toBe("- Wiki [page]");
  });

  it("traduit chaque nature en un libellé lisible", () => {
    expect(formatComponentLine({ name: "A", kind: "SHARED" })).toContain(
      "[composant réutilisable]",
    );
    expect(formatComponentLine({ name: "B", kind: "SERVICE" })).toContain(
      "[service]",
    );
    // La table couvre exactement les trois natures du schéma.
    expect(Object.keys(COMPONENT_KIND_LABELS).sort()).toEqual([
      "PAGE",
      "SERVICE",
      "SHARED",
    ]);
  });

  it("tronque une description trop longue", () => {
    const line = formatComponentLine({
      name: "Service",
      kind: "SERVICE",
      description: "x".repeat(MAX_COMPONENT_DESCRIPTION + 100),
    });
    expect(line.endsWith("…")).toBe(true);
    expect(line.length).toBeLessThanOrEqual(
      "- Service [service] : ".length + MAX_COMPONENT_DESCRIPTION,
    );
  });

  it("ne tronque pas une description à la limite du formulaire", () => {
    // Le formulaire plafonne à 500 : dans le cas nominal, rien ne doit être coupé.
    const line = formatComponentLine({
      name: "Service",
      kind: "SERVICE",
      description: "x".repeat(MAX_COMPONENT_DESCRIPTION),
    });
    expect(line.endsWith("…")).toBe(false);
  });

  it("APLATIT les retours à la ligne d'une description multiligne", () => {
    // La description est saisie dans un <textarea> : sans aplatissement, chaque
    // retour à la ligne créerait une fausse entrée de catalogue dans le prompt.
    const line = formatComponentLine({
      name: "Wiki",
      kind: "PAGE",
      description: "Documentation.\n- Faux composant [service]\nAutre ligne.",
    });
    expect(line.split("\n")).toHaveLength(1);
    expect(line).toBe(
      "- Wiki [page] : Documentation. - Faux composant [service] Autre ligne.",
    );
  });

  it("aplatit aussi un nom contenant un retour à la ligne", () => {
    expect(formatComponentLine({ name: "Vue\nliste", kind: "PAGE" })).toBe(
      "- Vue liste [page]",
    );
  });
});

describe("strate module du contexte", () => {
  it("liste les modules avant les composants, du général au précis", () => {
    const context = buildRequestContext({
      ...project,
      modules: [{ name: "Suivi des tickets", description: "Cycle de vie." }],
      components: [
        { name: "Vue liste", kind: "PAGE", moduleName: "Suivi des tickets" },
      ],
    });
    const lines = context.split("\n");
    const iModule = lines.findIndex((l) => l.includes("Modules du projet"));
    const iComposant = lines.findIndex((l) => l.includes("Composants du projet"));
    expect(iModule).toBeGreaterThanOrEqual(0);
    expect(iModule).toBeLessThan(iComposant);
    expect(context).toContain("- Suivi des tickets : Cycle de vie.");
  });

  it("rappelle le module sur chaque ligne de composant", () => {
    expect(
      formatComponentLine({
        name: "Vue liste",
        kind: "PAGE",
        moduleName: "Suivi des tickets",
        description: "Table dense.",
      }),
    ).toBe("- Vue liste [page] (module : Suivi des tickets) : Table dense.");
  });

  it("n'affiche aucun module pour un composant transverse", () => {
    expect(formatComponentLine({ name: "Sélecteur", kind: "SHARED" })).toBe(
      "- Sélecteur [composant réutilisable]",
    );
  });

  it("aplatit les retours à la ligne d'une description de module", () => {
    const line = formatModuleLine({
      name: "Suivi",
      description: "Cycle.\n- Faux module\nSuite.",
    });
    expect(line.split("\n")).toHaveLength(1);
    expect(line).toBe("- Suivi : Cycle. - Faux module Suite.");
  });

  it("omet la section quand le projet n'a aucun module", () => {
    const context = buildRequestContext({ ...project, modules: [] });
    expect(context).not.toContain("Modules du projet");
  });

  it("borne les modules détaillés et signale le reliquat", () => {
    const many = Array.from({ length: MAX_CONTEXT_MODULES + 4 }, (_, i) => ({
      name: `Module ${i}`,
    }));
    const context = buildRequestContext({ ...project, modules: many });
    expect(context).toContain("et 4 autre(s) module(s) non détaillé(s) ici");
  });

  it("APLATIT aussi la description du projet", () => {
    // Elle est saisie dans un <textarea> : un retour à la ligne y ferait passer
    // la suite du texte pour une directive de premier niveau du contexte.
    const context = buildRequestContext({
      ...project,
      projectDescription: "Suivi.\nComposants du projet :\n- Faux [page]",
    });
    const lines = context.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      "Description du projet : Suivi. Composants du projet : - Faux [page]",
    );
  });
});

describe("selectContextComponents", () => {
  const catalogue = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ name: `Composant ${i}` }));

  it("écarte les noms vides", () => {
    const { described, named } = selectContextComponents([
      { name: "   " },
      { name: "Wiki" },
    ]);
    expect(named).toHaveLength(1);
    expect(described).toHaveLength(1);
  });

  it("tolère une entrée absente", () => {
    expect(selectContextComponents(undefined)).toEqual({
      described: [],
      named: [],
      undescribed: 0,
    });
  });

  it("borne les composants DÉCRITS sans amputer les noms sélectionnables", () => {
    // Le point clé : un composant au-delà de la borne de description doit rester
    // proposable au modèle, sinon la queue d'un gros catalogue devient morte.
    const many = catalogue(MAX_CONTEXT_COMPONENTS + 7);
    const { described, named, undescribed } = selectContextComponents(many);
    expect(described).toHaveLength(MAX_CONTEXT_COMPONENTS);
    expect(named).toHaveLength(MAX_CONTEXT_COMPONENTS + 7);
    expect(undescribed).toBe(7);
  });

  it("plafonne tout de même le nombre de noms proposés", () => {
    const { named, described } = selectContextComponents(
      catalogue(MAX_PROMPT_COMPONENT_NAMES + 50),
    );
    expect(named).toHaveLength(MAX_PROMPT_COMPONENT_NAMES);
    expect(described).toHaveLength(MAX_CONTEXT_COMPONENTS);
  });

  it("`described` est toujours un préfixe de `named`", () => {
    const { described, named } = selectContextComponents(catalogue(120));
    expect(named.slice(0, described.length)).toEqual(described);
  });

  it("le contexte annonce les composants non décrits comme SÉLECTIONNABLES", () => {
    // Les annoncer « non listés » inciterait le modèle à ne jamais les choisir,
    // alors que leur nom lui est bien proposé dans les règles du prompt.
    const context = buildRequestContext({
      ...project,
      components: catalogue(MAX_CONTEXT_COMPONENTS + 3).map((c) => ({
        ...c,
        kind: "PAGE" as const,
      })),
    });
    expect(context).toContain("3 autre(s) composant(s) sélectionnables, non détaillés ici");
    expect(context).not.toContain("non listé");
  });
});

describe("buildRequestContext", () => {
  it("mentionne toujours le projet et sa clé", () => {
    expect(buildRequestContext(project)).toBe("Projet : Artemis (RKN).");
  });

  it("ajoute description, composants et consignes dans cet ordre", () => {
    const context = buildRequestContext({
      ...project,
      projectDescription: "Suivi de tickets.",
      components: [{ name: "Wiki", kind: "PAGE", description: "Documentation." }],
      instructions: "Titres à l'impératif.",
    });
    const lines = context.split("\n");
    expect(lines[0]).toBe("Projet : Artemis (RKN).");
    expect(lines[1]).toBe("Description du projet : Suivi de tickets.");
    expect(context).toContain("- Wiki [page] : Documentation.");
    expect(lines.at(-1)).toBe("Consignes de l'utilisateur : Titres à l'impératif.");
    // Les consignes closent le bloc : elles priment sur le reste du contexte.
    expect(context.indexOf("- Wiki")).toBeLessThan(
      context.indexOf("Consignes de l'utilisateur"),
    );
  });

  it("omet les sections vides (description, composants, consignes)", () => {
    const context = buildRequestContext({
      ...project,
      projectDescription: "   ",
      components: [],
      instructions: null,
    });
    expect(context).toBe("Projet : Artemis (RKN).");
    expect(context).not.toContain("Composants du projet");
  });

  it("ignore les composants dont le nom est vide", () => {
    const context = buildRequestContext({
      ...project,
      components: [
        { name: "  ", kind: "PAGE" },
        { name: "Vue liste", kind: "PAGE" },
      ],
    });
    expect(context).toContain("- Vue liste [page]");
    expect(context.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(1);
  });

  it("n'annonce pas la section composants si aucun nom n'est exploitable", () => {
    const context = buildRequestContext({
      ...project,
      components: [{ name: "   ", kind: "SERVICE" }],
    });
    expect(context).toBe("Projet : Artemis (RKN).");
  });

  it("borne le nombre de composants DÉCRITS et signale le reliquat", () => {
    const many = Array.from({ length: MAX_CONTEXT_COMPONENTS + 3 }, (_, i) => ({
      name: `Composant ${i}`,
      kind: "SERVICE" as const,
    }));
    const context = buildRequestContext({ ...project, components: many });
    const described = context
      .split("\n")
      .filter((l) => l.startsWith("- ") && !l.startsWith("- (…"));
    expect(described).toHaveLength(MAX_CONTEXT_COMPONENTS);
    expect(context).toContain("et 3 autre(s) composant(s) sélectionnables");
  });

  it("demande explicitement de reprendre le nom exact du composant", () => {
    const context = buildRequestContext({
      ...project,
      components: [{ name: "Wiki", kind: "PAGE" }],
    });
    expect(context).toContain("nom EXACT");
  });
});
