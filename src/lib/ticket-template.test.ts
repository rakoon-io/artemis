import { describe, expect, it } from "vitest";
import {
  checkReportDescription,
  emptyReport,
  missingReportSections,
  normalizeHeading,
  parseReport,
  reportHeadings,
  reportRequirementMessage,
  sectionForHeading,
  serializeReport,
  REPORT_SECTIONS,
  REQUIRED_REPORT_SECTIONS,
} from "./ticket-template";

/**
 * Le contrat de ce module tient en une phrase : ce qui est écrit doit pouvoir
 * être relu, quelle que soit la langue de qui relit, et rien ne doit disparaître
 * en chemin. Les cas ci-dessous sont donc ordonnés du plus structurel au plus
 * tordu, et les derniers sont les plus importants : ce sont ceux qui protègent
 * du seul dommage irréparable, la perte de texte.
 */

const FR_REPORT = [
  "## Observation",
  "",
  "Le bouton « Enregistrer » ne réagit pas.",
  "",
  "## Attendu",
  "",
  "Le formulaire est soumis et un toast confirme.",
  "",
  "## Contexte",
  "",
  "Firefox 128, écran Paramètres.",
].join("\n");

describe("normalizeHeading", () => {
  it("ignore accents, casse, emphase et deux-points", () => {
    const forms = [
      "Attendu",
      "attendu",
      "ATTENDU",
      "  Attendu  ",
      "**Attendu**",
      "Attendu :",
      "_Attendu_",
    ];
    for (const form of forms) expect(normalizeHeading(form)).toBe("attendu");
  });

  it("réduit « Alignement aux spécifications » à une forme sans accent", () => {
    expect(normalizeHeading("Alignement aux spécifications")).toBe(
      "alignement aux specifications",
    );
  });
});

describe("sectionForHeading", () => {
  it("reconnaît les intitulés canoniques français", () => {
    expect(sectionForHeading("Observation")).toBe("observation");
    expect(sectionForHeading("Attendu")).toBe("expected");
    expect(sectionForHeading("Contexte")).toBe("context");
    expect(sectionForHeading("Alignement aux spécifications")).toBe("specs");
  });

  it("reconnaît les intitulés canoniques anglais", () => {
    expect(sectionForHeading("Observed")).toBe("observation");
    expect(sectionForHeading("Expected")).toBe("expected");
    expect(sectionForHeading("Context")).toBe("context");
    expect(sectionForHeading("Specification alignment")).toBe("specs");
  });

  it("renvoie null sur un intitulé étranger au modèle", () => {
    expect(sectionForHeading("Notes")).toBeNull();
    expect(sectionForHeading("Étapes de reproduction")).toBeNull();
  });

  it("couvre les intitulés écrits par les DEUX langues, sans exception", () => {
    // Garde-fou du contrat central : tout ce que `serializeReport` peut écrire
    // doit être relu. Sans ce test, ajouter une langue au dictionnaire sans
    // enrichir la table d'alias passerait inaperçu jusqu'à la première perte.
    for (const locale of ["fr", "en"] as const) {
      const headings = reportHeadings(locale);
      for (const section of REPORT_SECTIONS) {
        expect(sectionForHeading(headings[section])).toBe(section);
      }
    }
  });
});

describe("serializeReport", () => {
  it("écrit les rubriques en titres de niveau 2, dans l'ordre du modèle", () => {
    const body = {
      observation: "Le bouton « Enregistrer » ne réagit pas.",
      expected: "Le formulaire est soumis et un toast confirme.",
      context: "Firefox 128, écran Paramètres.",
      specs: "",
    };
    expect(serializeReport(body, "fr")).toBe(FR_REPORT);
  });

  it("omet une rubrique vide plutôt que d'écrire un titre orphelin", () => {
    const out = serializeReport(
      { ...emptyReport(), observation: "a", expected: "b", context: "c" },
      "fr",
    );
    expect(out).not.toContain("Alignement");
  });

  it("écrit les intitulés anglais en anglais", () => {
    const out = serializeReport(
      { observation: "a", expected: "b", context: "c", specs: "d" },
      "en",
    );
    expect(out).toContain("## Observed");
    expect(out).toContain("## Expected");
    expect(out).toContain("## Context");
    expect(out).toContain("## Specification alignment");
  });

  it("rejette la ponctuation parasite : les corps sont détourés", () => {
    const out = serializeReport(
      { observation: "  a  \n\n", expected: "b", context: "c", specs: "" },
      "fr",
    );
    expect(out).toBe("## Observation\n\na\n\n## Attendu\n\nb\n\n## Contexte\n\nc");
  });
});

describe("parseReport", () => {
  it("relit ce que serializeReport a écrit (aller-retour français)", () => {
    const parsed = parseReport(FR_REPORT);
    expect(parsed).not.toBeNull();
    expect(parsed!.sections.observation).toBe(
      "Le bouton « Enregistrer » ne réagit pas.",
    );
    expect(parsed!.sections.expected).toBe(
      "Le formulaire est soumis et un toast confirme.",
    );
    expect(parsed!.sections.context).toBe("Firefox 128, écran Paramètres.");
    expect(parsed!.sections.specs).toBe("");
    expect(parsed!.extra).toBe("");
    expect(serializeReport(parsed!.sections, "fr", parsed!.extra)).toBe(FR_REPORT);
  });

  it("relit un rapport rédigé dans l'AUTRE langue", () => {
    // Le cas qui justifie toute la table d'alias : un ticket écrit en anglais
    // reste modifiable par une interface en français, et réciproquement.
    const english = serializeReport(
      { observation: "a", expected: "b", context: "c", specs: "d" },
      "en",
    );
    const parsed = parseReport(english);
    expect(parsed).not.toBeNull();
    expect(parsed!.sections).toEqual({
      observation: "a",
      expected: "b",
      context: "c",
      specs: "d",
    });
    // …et se réécrit alors en français, sans rien perdre.
    expect(serializeReport(parsed!.sections, "fr")).toContain("## Attendu");
  });

  it("accepte les rubriques dans le désordre", () => {
    const parsed = parseReport(
      "## Contexte\n\nc\n\n## Observation\n\no\n\n## Attendu\n\na",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.sections.observation).toBe("o");
    expect(parsed!.sections.context).toBe("c");
  });

  it("accepte une rubrique présente mais vide (c'est la validation qui tranche)", () => {
    const parsed = parseReport("## Observation\n\n## Attendu\n\nb\n\n## Contexte\n\nc");
    expect(parsed).not.toBeNull();
    expect(parsed!.sections.observation).toBe("");
    expect(missingReportSections(parsed!.sections)).toEqual(["observation"]);
  });

  it("conserve le Markdown riche à l'intérieur d'une rubrique", () => {
    const body = "- un\n- deux\n\n**gras** et `code`";
    const parsed = parseReport(
      `## Observation\n\n${body}\n\n## Attendu\n\nb\n\n## Contexte\n\nc`,
    );
    expect(parsed!.sections.observation).toBe(body);
  });

  // ── Les refus : chacun protège d'une perte ou d'un déplacement de texte ──

  it("refuse une description libre", () => {
    expect(parseReport("Ça ne marche pas.")).toBeNull();
  });

  it("refuse une description vide ou absente", () => {
    expect(parseReport("")).toBeNull();
    expect(parseReport("   \n  ")).toBeNull();
    expect(parseReport(null)).toBeNull();
    expect(parseReport(undefined)).toBeNull();
  });

  it("refuse un préambule : le formulaire n'aurait nulle part où le remettre", () => {
    expect(
      parseReport(`Petit mot d'introduction.\n\n${FR_REPORT}`),
    ).toBeNull();
  });

  it("refuse un titre inconnu AVANT la première rubrique", () => {
    expect(parseReport(`## Notes\n\nx\n\n${FR_REPORT}`)).toBeNull();
  });

  it("refuse une rubrique en double", () => {
    expect(
      parseReport(
        "## Observation\n\na\n\n## Attendu\n\nb\n\n## Contexte\n\nc\n\n## Observation\n\nd",
      ),
    ).toBeNull();
  });

  it("refuse une rubrique obligatoire absente", () => {
    expect(parseReport("## Observation\n\na\n\n## Attendu\n\nb")).toBeNull();
  });

  it("refuse une rubrique reconnue APRÈS un titre inconnu (l'ordre changerait)", () => {
    expect(
      parseReport(
        "## Observation\n\na\n\n## Attendu\n\nb\n\n## Notes\n\nx\n\n## Contexte\n\nc",
      ),
    ).toBeNull();
  });

  // ── La zone libre de fin : conservée, jamais perdue ──

  it("conserve un titre inconnu placé APRÈS la dernière rubrique", () => {
    const source = `${FR_REPORT}\n\n## Notes\n\nÀ revoir avec Claire.`;
    const parsed = parseReport(source);
    expect(parsed).not.toBeNull();
    expect(parsed!.extra).toBe("## Notes\n\nÀ revoir avec Claire.");
    expect(serializeReport(parsed!.sections, "fr", parsed!.extra)).toBe(source);
  });

  it("range le texte collé en fin de description dans la dernière rubrique", () => {
    // Le bouton « Insérer dans la description » du champ de pièces jointes
    // ajoute du texte brut à la fin : il n'introduit pas de titre, donc il est
    // simplement absorbé par la dernière rubrique. Rien ne se perd.
    const parsed = parseReport(`${FR_REPORT}\n\njournal.txt : NullPointer`);
    expect(parsed!.sections.context).toBe(
      "Firefox 128, écran Paramètres.\n\njournal.txt : NullPointer",
    );
  });

  // ── Les blocs de code : des données, pas de la structure ──

  it("ignore un titre situé dans un bloc de code clôturé", () => {
    const source = [
      "## Observation",
      "",
      "```md",
      "## Attendu",
      "ceci est un exemple, pas une rubrique",
      "```",
      "",
      "## Attendu",
      "",
      "b",
      "",
      "## Contexte",
      "",
      "c",
    ].join("\n");
    const parsed = parseReport(source);
    expect(parsed).not.toBeNull();
    expect(parsed!.sections.observation).toContain("ceci est un exemple");
    expect(parsed!.sections.expected).toBe("b");
  });

  it("ignore aussi un titre dans un bloc délimité par des tildes", () => {
    const source =
      "## Observation\n\n~~~\n## Contexte\n~~~\n\n## Attendu\n\nb\n\n## Contexte\n\nc";
    const parsed = parseReport(source);
    expect(parsed).not.toBeNull();
    expect(parsed!.sections.context).toBe("c");
  });

  it("tolère les fins de ligne Windows", () => {
    const parsed = parseReport(FR_REPORT.replace(/\n/g, "\r\n"));
    expect(parsed).not.toBeNull();
    expect(parsed!.sections.context).toBe("Firefox 128, écran Paramètres.");
  });

  it("accepte les variantes d'écriture d'un titre", () => {
    const parsed = parseReport(
      "### observation :\n\na\n\n#### **Résultat attendu**\n\nb\n\n## Environnement\n\nc",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.sections.observation).toBe("a");
    expect(parsed!.sections.expected).toBe("b");
    expect(parsed!.sections.context).toBe("c");
  });
});

describe("checkReportDescription", () => {
  it("valide un rapport complet", () => {
    expect(checkReportDescription(FR_REPORT)).toEqual({ ok: true });
  });

  it("réclame les trois rubriques sur une description libre ou absente", () => {
    for (const value of [null, undefined, "", "texte libre"]) {
      const res = checkReportDescription(value);
      expect(res.ok).toBe(false);
      expect(res.ok === false && res.missing).toEqual(REQUIRED_REPORT_SECTIONS);
    }
  });

  it("ne réclame que la rubrique restée vide", () => {
    const res = checkReportDescription(
      "## Observation\n\na\n\n## Attendu\n\n## Contexte\n\nc",
    );
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.missing).toEqual(["expected"]);
  });

  it("n'exige jamais « Alignement aux spécifications »", () => {
    expect(checkReportDescription(FR_REPORT)).toEqual({ ok: true });
    expect(REQUIRED_REPORT_SECTIONS).not.toContain("specs");
  });

  it("valide un rapport rédigé en anglais", () => {
    const english = serializeReport(
      { observation: "a", expected: "b", context: "c", specs: "" },
      "en",
    );
    expect(checkReportDescription(english)).toEqual({ ok: true });
  });
});

describe("reportRequirementMessage", () => {
  it("énumère les rubriques manquantes en français", () => {
    expect(reportRequirementMessage("Bug", ["observation"])).toBe(
      "Le type « Bug » impose un modèle de ticket : la description doit renseigner « Observation ».",
    );
    expect(reportRequirementMessage("Bug", ["observation", "expected"])).toBe(
      "Le type « Bug » impose un modèle de ticket : la description doit renseigner « Observation » et « Attendu ».",
    );
    expect(
      reportRequirementMessage("Bug", REQUIRED_REPORT_SECTIONS),
    ).toBe(
      "Le type « Bug » impose un modèle de ticket : la description doit renseigner « Observation », « Attendu » et « Contexte ».",
    );
  });
});

describe("parseReport : les sous-titres appartiennent au corps de la rubrique", () => {
  // Régression. Un « ### » écrit dans une rubrique passait pour une nouvelle
  // section : toute la relecture échouait et le serveur réclamait des rubriques
  // qui étaient sous les yeux de l'utilisateur.
  it("garde un sous-titre plus PROFOND dans le corps", () => {
    const source = [
      "## Observation",
      "",
      "Le bouton plante.",
      "",
      "### Étapes de reproduction",
      "",
      "1. Ouvrir l'écran",
      "",
      "## Attendu",
      "",
      "b",
      "",
      "## Contexte",
      "",
      "c",
    ].join("\n");
    const parsed = parseReport(source);
    expect(parsed).not.toBeNull();
    expect(parsed!.sections.observation).toContain("### Étapes de reproduction");
    expect(parsed!.sections.observation).toContain("1. Ouvrir l'écran");
    expect(parsed!.sections.expected).toBe("b");
    expect(parsed!.extra).toBe("");
  });

  it("garde aussi un titre plus HAUT dans le corps (trace collée, « # … »)", () => {
    const parsed = parseReport(
      "## Observation\n\no\n\n## Attendu\n\ne\n\n## Contexte\n\nFirefox 128\n\n# note interne\nsuite du contexte",
    );
    expect(parsed).not.toBeNull();
    // Le point de la régression : ces deux lignes étaient déplacées en fin de
    // description, hors de toute rubrique et donc inatteignables au formulaire.
    expect(parsed!.sections.context).toContain("# note interne");
    expect(parsed!.sections.context).toContain("suite du contexte");
    expect(parsed!.extra).toBe("");
  });

  it("continue de reconnaître un modèle entièrement rédigé en « ### »", () => {
    const parsed = parseReport(
      "### Observation\n\no\n\n### Attendu\n\ne\n\n### Contexte\n\nc",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.sections.observation).toBe("o");
  });

  it("traite toujours en zone libre un titre inconnu de MÊME niveau", () => {
    const parsed = parseReport(
      "## Observation\n\no\n\n## Attendu\n\ne\n\n## Contexte\n\nc\n\n## Notes\n\nx",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.extra).toBe("## Notes\n\nx");
  });

  it("le formulaire de création et le serveur s'accordent enfin", () => {
    // Ce que produisait le dialogue : une rubrique contenant un sous-titre.
    const composed = serializeReport(
      {
        observation: "Le bouton plante.\n\n### Étapes\n\n1. ouvrir",
        expected: "e",
        context: "c",
        specs: "",
      },
      "fr",
    );
    expect(checkReportDescription(composed)).toEqual({ ok: true });
  });
});
