import { describe, it, expect } from "vitest";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_COLORS,
  buildActivity,
  emptyActivity,
  mentionNeedle,
  keepMostRecent,
  MAX_CITATIONS,
  mentionsEmail,
  pickVisible,
  ticketActivityState,
  type ColumnBounds,
  type TicketSource,
  type WikiSource,
} from "./my-activity";

/** Workflow par défaut : Backlog(0) … Terminé(4). */
const defaut: ColumnBounds = { first: 0, last: 4 };

const t = (projectId: string, order: number, key = `${projectId}-${order}`) => ({
  key,
  projectId,
  column: { order },
});

describe("ticketActivityState", () => {
  it("range la colonne d'entrée dans « à faire »", () => {
    expect(ticketActivityState(t("p", 0), defaut)).toBe("todo");
  });

  it("range la dernière colonne dans « terminé »", () => {
    expect(ticketActivityState(t("p", 4), defaut)).toBe("done");
  });

  it("range les colonnes intermédiaires dans « en cours »", () => {
    expect(ticketActivityState(t("p", 1), defaut)).toBe("doing");
    expect(ticketActivityState(t("p", 2), defaut)).toBe("doing");
    expect(ticketActivityState(t("p", 3), defaut)).toBe("doing");
  });

  it("se fie au rang, pas au nom : un workflow à 2 colonnes n'a pas d'« en cours »", () => {
    const court: ColumnBounds = { first: 0, last: 1 };
    expect(ticketActivityState(t("p", 0), court)).toBe("todo");
    expect(ticketActivityState(t("p", 1), court)).toBe("done");
  });

  it("compte tout comme terminé quand l'entrée est aussi la sortie", () => {
    expect(ticketActivityState(t("p", 0), { first: 0, last: 0 })).toBe("done");
  });

  it("tient un rang au-delà de la dernière colonne pour terminé", () => {
    expect(ticketActivityState(t("p", 9), defaut)).toBe("done");
  });
});

describe("palette", () => {
  it("donne une couleur à chaque catégorie, sans doublon", () => {
    const couleurs = ACTIVITY_CATEGORIES.map((c) => ACTIVITY_COLORS[c]);
    expect(couleurs).toHaveLength(4);
    expect(couleurs.every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
    expect(new Set(couleurs).size).toBe(4);
  });

  it("garde l'ordre de lecture : à faire, en cours, terminé, citations", () => {
    expect([...ACTIVITY_CATEGORIES]).toEqual(["todo", "doing", "done", "wiki"]);
  });
});

describe("mentionNeedle", () => {
  it("cherche l'adresse sous sa forme de lien", () => {
    expect(mentionNeedle("Ada@Rakoon.io")).toBe("mailto:ada@rakoon.io");
  });
  it("ignore les espaces autour", () => {
    expect(mentionNeedle("  ada@rakoon.io ")).toBe("mailto:ada@rakoon.io");
  });
});

describe("mentionsEmail", () => {
  const page = "Voir avec [@Ada L](mailto:ada@rakoon.io) pour la suite.";

  it("reconnaît une citation", () => {
    expect(mentionsEmail(page, "ada@rakoon.io")).toBe(true);
  });

  it("ne confond pas une adresse dont l'autre est le préfixe", () => {
    const autre = "[@Ada](mailto:ada@rakoon.io.uk)";
    expect(mentionsEmail(autre, "ada@rakoon.io")).toBe(false);
  });

  it("reste insensible à la casse", () => {
    expect(mentionsEmail("(mailto:Ada@Rakoon.IO)", "ada@rakoon.io")).toBe(true);
    expect(mentionsEmail(page, "ADA@RAKOON.IO")).toBe(true);
  });

  it("traite les points et le plus comme des caractères, pas des motifs", () => {
    // Sans échappement, « a.a@x.io » accepterait « aXa@x.io ».
    expect(mentionsEmail("(mailto:aXa@x.io)", "a.a@x.io")).toBe(false);
    expect(mentionsEmail("(mailto:a.a@x.io)", "a.a@x.io")).toBe(true);
    expect(mentionsEmail("(mailto:a+b@x.io)", "a+b@x.io")).toBe(true);
  });

  it("ne dit rien d'une page qui ne cite personne", () => {
    expect(mentionsEmail("Une page sans lien.", "ada@rakoon.io")).toBe(false);
  });

  it("refuse une adresse vide plutôt que de tout accepter", () => {
    expect(mentionsEmail(page, "   ")).toBe(false);
  });

  it("reconnaît la citation d'un nom échappé", () => {
    expect(mentionsEmail("[@Ana \\[DSI\\]](mailto:ana@x.io)", "ana@x.io")).toBe(
      true,
    );
  });
});

// ─── chronologie ─────────────────────────────────────────────────────────────

const at = (iso: string) => new Date(iso);

const ticket = (
  id: string,
  order: number,
  iso: string,
  projectId = "p",
): TicketSource => ({
  id,
  key: `P-${id}`,
  title: `Ticket ${id}`,
  projectId,
  updatedAt: at(iso),
  project: { key: "P" },
  column: { name: `col${order}`, order },
});

const wiki = (id: string, iso: string, slug: string | null = null): WikiSource => ({
  id,
  title: `Page ${id}`,
  slug,
  updatedAt: at(iso),
  project: { key: "P" },
});

const bounds = new Map([["p", defaut]]);

describe("buildActivity", () => {
  it("compte chaque catégorie et le total", () => {
    const a = buildActivity(
      [
        ticket("1", 0, "2026-01-01"),
        ticket("2", 2, "2026-01-02"),
        ticket("3", 4, "2026-01-03"),
      ],
      bounds,
      [wiki("w1", "2026-01-04")],
    );
    expect(a.counts).toEqual({ todo: 1, doing: 1, done: 1, wiki: 1, total: 4 });
  });

  it("mêle tickets et pages, du plus récent au plus ancien", () => {
    const a = buildActivity(
      [ticket("1", 0, "2026-01-01"), ticket("2", 2, "2026-01-05")],
      bounds,
      [wiki("w1", "2026-01-03")],
    );
    expect(a.entries.map((e) => e.id)).toEqual(["2", "w1", "1"]);
  });

  it("départage deux dates identiques de façon déterministe", () => {
    const a = buildActivity(
      [ticket("b", 0, "2026-01-01"), ticket("a", 0, "2026-01-01")],
      bounds,
      [],
    );
    expect(a.entries.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("porte le nom réel de la colonne sur chaque ticket", () => {
    const a = buildActivity([ticket("1", 3, "2026-01-01")], bounds, []);
    const e = a.entries[0];
    expect(e.kind).toBe("ticket");
    if (e.kind === "ticket") {
      expect(e.status).toBe("col3");
      expect(e.category).toBe("doing");
      expect(e.projectKey).toBe("P");
    }
  });

  it("prend le slug d'une page, ou son identifiant à défaut", () => {
    const a = buildActivity([], bounds, [
      wiki("w1", "2026-01-02", "reunion-du-2"),
      wiki("w2", "2026-01-01", null),
    ]);
    const handles = a.entries.map((e) => (e.kind === "wiki" ? e.handle : ""));
    expect(handles).toEqual(["reunion-du-2", "w2"]);
  });

  it("applique à chaque projet SES propres rangs", () => {
    const deuxProjets = new Map([
      ["court", { first: 0, last: 1 }],
      ["long", defaut],
    ]);
    const a = buildActivity(
      [ticket("c", 1, "2026-01-02", "court"), ticket("l", 1, "2026-01-01", "long")],
      deuxProjets,
      [],
    );
    expect(a.counts.done).toBe(1);
    expect(a.counts.doing).toBe(1);
  });

  it("ignore un ticket dont le projet n'a aucune colonne connue", () => {
    const a = buildActivity([ticket("x", 0, "2026-01-01", "inconnu")], bounds, []);
    expect(a.entries).toEqual([]);
    expect(a.counts.total).toBe(0);
  });

  it("rend une activité vide sans rien", () => {
    expect(buildActivity([], new Map(), [])).toEqual(emptyActivity());
  });

  it("tient une activité faite uniquement de citations", () => {
    const a = buildActivity([], new Map(), [wiki("w1", "2026-01-01")]);
    expect(a.counts).toEqual({ todo: 0, doing: 0, done: 0, wiki: 1, total: 1 });
    expect(a.entries[0].kind).toBe("wiki");
  });
});

describe("emptyActivity", () => {
  it("ne compte rien", () => {
    expect(emptyActivity().counts.total).toBe(0);
    expect(emptyActivity().entries).toEqual([]);
  });
});

describe("keepMostRecent", () => {
  const p = (id: string, iso: string) => ({ id, updatedAt: at(iso) });

  it("garde les plus récents, du plus frais au plus ancien", () => {
    const { kept, hasMore } = keepMostRecent(
      [p("vieux", "2026-01-01"), p("frais", "2026-03-01"), p("moyen", "2026-02-01")],
      2,
    );
    expect(kept.map((x) => x.id)).toEqual(["frais", "moyen"]);
    expect(hasMore).toBe(true);
  });

  it("ne signale rien quand tout tient", () => {
    const { kept, hasMore } = keepMostRecent([p("a", "2026-01-01")], 20);
    expect(kept).toHaveLength(1);
    expect(hasMore).toBe(false);
  });

  it("n'annonce pas de reste quand le compte tombe juste", () => {
    const items = [p("a", "2026-01-01"), p("b", "2026-01-02")];
    expect(keepMostRecent(items, 2).hasMore).toBe(false);
  });

  it("ne modifie pas le tableau reçu", () => {
    const items = [p("a", "2026-01-01"), p("b", "2026-03-01")];
    const copie = [...items];
    keepMostRecent(items, 1);
    expect(items).toEqual(copie);
  });

  it("traite une limite nulle comme « rien, mais il y en avait »", () => {
    expect(keepMostRecent([p("a", "2026-01-01")], 0)).toEqual({
      kept: [],
      hasMore: true,
    });
    expect(keepMostRecent([], 0)).toEqual({ kept: [], hasMore: false });
  });

  it("suit le plafond métier des citations", () => {
    expect(MAX_CITATIONS).toBe(20);
    const pages = Array.from({ length: 25 }, (_, i) =>
      p(`p${i}`, `2026-01-${String(i + 1).padStart(2, "0")}`),
    );
    const { kept, hasMore } = keepMostRecent(pages, MAX_CITATIONS);
    expect(kept).toHaveLength(20);
    expect(hasMore).toBe(true);
    // Les cinq plus anciennes sont celles qu'on laisse.
    expect(kept.map((x) => x.id)).not.toContain("p0");
    expect(kept.map((x) => x.id)).toContain("p24");
  });
});

describe("buildActivity — plafond des citations", () => {
  it("ne signale rien par défaut", () => {
    expect(buildActivity([], new Map(), []).citationsTruncated).toBe(false);
    expect(emptyActivity().citationsTruncated).toBe(false);
  });

  it("porte le drapeau quand on le lui donne", () => {
    const a = buildActivity([], new Map(), [wiki("w", "2026-01-01")], {
      citationsTruncated: true,
    });
    expect(a.citationsTruncated).toBe(true);
    expect(a.counts.wiki).toBe(1);
  });
});

describe("pickVisible", () => {
  /** Chronologie : 12 tickets terminés tout frais, 5 « à faire » plus anciens. */
  const chargee = buildActivity(
    [
      ...Array.from({ length: 12 }, (_, i) =>
        ticket(`done${i}`, 4, `2026-02-${String(i + 10).padStart(2, "0")}`),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        ticket(`todo${i}`, 0, `2026-01-0${i + 1}`),
      ),
    ],
    bounds,
    [],
  ).entries;

  it("rend tout quand tout tient", () => {
    const a = buildActivity([ticket("1", 0, "2026-01-01")], bounds, []).entries;
    expect(pickVisible(a, 12)).toHaveLength(1);
  });

  it("ne dépasse jamais la limite", () => {
    expect(pickVisible(chargee, 12)).toHaveLength(12);
    expect(pickVisible(chargee, 3)).toHaveLength(3);
  });

  it("montre toujours au moins un élément de chaque catégorie annoncée", () => {
    // Le piège : les 12 terminés sont tous plus récents que les « à faire ».
    const vus = pickVisible(chargee, 12);
    const categories = new Set(vus.map((e) => e.category));
    expect(categories.has("done")).toBe(true);
    expect(categories.has("todo")).toBe(true);
  });

  it("garde l'ordre chronologique de la sélection", () => {
    const vus = pickVisible(chargee, 12);
    const dates = vus.map((e) => e.at.getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it("privilégie la fraîcheur une fois chaque catégorie servie", () => {
    const vus = pickVisible(chargee, 12);
    // 1 place réservée au plus récent « à faire », 11 aux terminés les plus frais.
    expect(vus.filter((e) => e.category === "todo")).toHaveLength(1);
    expect(vus.filter((e) => e.category === "done")).toHaveLength(11);
  });

  it("sert les catégories dans l'ordre de lecture quand les places manquent", () => {
    const vus = pickVisible(chargee, 1);
    expect(vus).toHaveLength(1);
    expect(vus[0].category).toBe("todo");
  });

  it("ne rend rien pour une limite nulle ou négative", () => {
    expect(pickVisible(chargee, 0)).toEqual([]);
    expect(pickVisible(chargee, -3)).toEqual([]);
  });

  it("ne duplique jamais un élément", () => {
    const vus = pickVisible(chargee, 12);
    expect(new Set(vus.map((e) => e.id)).size).toBe(vus.length);
  });

  it("représente les quatre catégories quand elles coexistent", () => {
    const melange = buildActivity(
      [
        ...Array.from({ length: 10 }, (_, i) =>
          ticket(`d${i}`, 4, `2026-03-${String(i + 10).padStart(2, "0")}`),
        ),
        ticket("t", 0, "2026-01-01"),
        ticket("g", 2, "2026-01-02"),
      ],
      bounds,
      [wiki("w", "2026-01-03")],
    ).entries;
    const vus = pickVisible(melange, 5);
    expect(new Set(vus.map((e) => e.category))).toEqual(
      new Set(["todo", "doing", "done", "wiki"]),
    );
  });
});
