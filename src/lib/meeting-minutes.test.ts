import { describe, expect, it } from "vitest";
import {
  countMeetingItems,
  formatItemRef,
  meetingActions,
  parseMeeting,
  readItemKind,
  themeLetter,
} from "./meeting-minutes";

/**
 * Deux exigences dominent : les RÉFÉRENCES doivent être justes (c'est par elles
 * qu'on cite un point en réunion suivante) et RIEN ne doit disparaître de la page
 * - un compte rendu reste avant tout une page de wiki que l'on écrit librement.
 */

const CR = [
  "Réunion hebdomadaire du 30 juillet.",
  "Présents : Claire, Marc.",
  "",
  "## Budget",
  "",
  "- (info) Le budget 2026 est validé.",
  "- (action) Relancer le prestataire sur le devis.",
  "",
  "## Recrutement",
  "",
  "- [ ] Publier l'offre de développeur.",
  "- Entretien de Léa reporté.",
].join("\n");

describe("themeLetter", () => {
  it("suit l'alphabet à partir de A", () => {
    expect(themeLetter(0)).toBe("A");
    expect(themeLetter(1)).toBe("B");
    expect(themeLetter(25)).toBe("Z");
  });

  it("passe à deux lettres au-delà de Z plutôt que de déborder", () => {
    // Sans ce repli, le 27e thème s'appellerait « [ » (65 + 26).
    expect(themeLetter(26)).toBe("AA");
    expect(themeLetter(27)).toBe("AB");
  });
});

describe("formatItemRef", () => {
  it("aligne la colonne sur deux chiffres", () => {
    expect(formatItemRef("A", 1)).toBe("A-01");
    expect(formatItemRef("B", 9)).toBe("B-09");
    expect(formatItemRef("A", 10)).toBe("A-10");
  });

  it("ne tronque pas au-delà de 99", () => {
    expect(formatItemRef("A", 100)).toBe("A-100");
  });
});

describe("readItemKind", () => {
  it("reconnaît un marqueur explicite, quelle que soit sa graphie", () => {
    for (const raw of ["(action) Relancer", "(Action) Relancer", "(ACTION) Relancer"]) {
      expect(readItemKind(raw)).toEqual({ kind: "action", text: "Relancer" });
    }
    for (const raw of ["(info) Validé", "(information) Validé", "(Infos) Validé"]) {
      expect(readItemKind(raw)).toEqual({ kind: "info", text: "Validé" });
    }
  });

  it("accepte les marqueurs accentués", () => {
    expect(readItemKind("(décision) Retenir l'option B").kind).toBe("action");
    expect(readItemKind("(à faire) Rappeler Marc").kind).toBe("action");
  });

  it("traite la case à cocher comme une action", () => {
    // La barre d'outils Markdown produit « - [ ] » : une action sans rien
    // apprendre de nouveau à l'utilisateur.
    expect(readItemKind("[ ] Publier l'offre")).toEqual({
      kind: "action",
      text: "Publier l'offre",
    });
    expect(readItemKind("[x] Publier l'offre").kind).toBe("action");
  });

  it("classe en INFORMATION un item non qualifié", () => {
    // Le sens du défaut compte : oublier une action est moins grave que d'en
    // inventer une que personne n'a prise.
    expect(readItemKind("Entretien reporté")).toEqual({
      kind: "info",
      text: "Entretien reporté",
    });
  });

  it("laisse intacte une parenthèse qui n'est pas un marqueur connu", () => {
    expect(readItemKind("(cf. annexe) Voir le détail")).toEqual({
      kind: "info",
      text: "(cf. annexe) Voir le détail",
    });
  });
});

describe("parseMeeting", () => {
  it("découpe en thèmes et leur attribue une lettre dans l'ordre", () => {
    const meeting = parseMeeting(CR)!;
    expect(meeting.themes.map((t) => [t.letter, t.title])).toEqual([
      ["A", "Budget"],
      ["B", "Recrutement"],
    ]);
  });

  it("numérote les items par thème, en repartant de 01", () => {
    const meeting = parseMeeting(CR)!;
    expect(meeting.themes[0].items.map((i) => i.ref)).toEqual(["A-01", "A-02"]);
    expect(meeting.themes[1].items.map((i) => i.ref)).toEqual(["B-01", "B-02"]);
  });

  it("qualifie chaque item", () => {
    const meeting = parseMeeting(CR)!;
    expect(meeting.themes[0].items.map((i) => i.kind)).toEqual(["info", "action"]);
    expect(meeting.themes[1].items.map((i) => i.kind)).toEqual(["action", "info"]);
  });

  it("conserve le texte qui précède le premier thème", () => {
    const meeting = parseMeeting(CR)!;
    expect(meeting.preamble).toContain("Réunion hebdomadaire");
    expect(meeting.preamble).toContain("Présents : Claire, Marc.");
  });

  it("conserve les lignes non listées d'un thème", () => {
    const meeting = parseMeeting(
      "## Budget\n\nUn paragraphe de contexte.\n\n- (info) Validé",
    )!;
    expect(meeting.themes[0].notes).toContain("Un paragraphe de contexte.");
    expect(meeting.themes[0].items).toHaveLength(1);
  });

  it("rattache une ligne indentée à l'item qu'elle prolonge", () => {
    const meeting = parseMeeting(
      "## Budget\n\n- (action) Relancer le prestataire\n  sur le devis de janvier.",
    )!;
    expect(meeting.themes[0].items[0].text).toBe(
      "Relancer le prestataire sur le devis de janvier.",
    );
    expect(meeting.themes[0].notes).not.toContain("janvier");
  });

  it("traite les titres plus profonds comme du contenu, non comme des thèmes", () => {
    const meeting = parseMeeting(
      "## Budget\n\n### Détail\n\n- (info) Validé\n\n## Recrutement\n\n- (info) En cours",
    )!;
    expect(meeting.themes.map((t) => t.title)).toEqual(["Budget", "Recrutement"]);
    expect(meeting.themes[0].notes).toContain("### Détail");
  });

  it("ignore une puce écrite dans un bloc de code", () => {
    const meeting = parseMeeting(
      "## Budget\n\n```\n- (action) ceci est un exemple\n```\n\n- (info) Validé",
    )!;
    expect(meeting.themes[0].items).toHaveLength(1);
    expect(meeting.themes[0].items[0].text).toBe("Validé");
  });

  it("accepte des thèmes écrits au niveau 3", () => {
    const meeting = parseMeeting("### Budget\n\n- (info) Validé")!;
    expect(meeting.themes[0].letter).toBe("A");
  });

  it("tolère les fins de ligne Windows", () => {
    const meeting = parseMeeting(CR.replace(/\n/g, "\r\n"))!;
    expect(meeting.themes).toHaveLength(2);
  });

  it("renvoie null quand la page ne comporte aucun thème", () => {
    expect(parseMeeting("Juste du texte libre.")).toBeNull();
    expect(parseMeeting("")).toBeNull();
    expect(parseMeeting(null)).toBeNull();
    expect(parseMeeting(undefined)).toBeNull();
  });

  it("accepte un thème sans aucun item", () => {
    const meeting = parseMeeting("## Divers\n\nRien à signaler.")!;
    expect(meeting.themes[0].items).toEqual([]);
    expect(meeting.themes[0].notes).toBe("Rien à signaler.");
  });
});

describe("meetingActions", () => {
  it("ne retient que les actions, dans l'ordre de lecture", () => {
    const actions = meetingActions(parseMeeting(CR)!);
    expect(actions.map((a) => a.ref)).toEqual(["A-02", "B-01"]);
    expect(actions.map((a) => a.text)).toEqual([
      "Relancer le prestataire sur le devis.",
      "Publier l'offre de développeur.",
    ]);
  });

  it("rappelle le thème d'origine de chaque action", () => {
    // Le récapitulatif est lu hors contexte : sans le thème, « A-02 » ne dit rien.
    const actions = meetingActions(parseMeeting(CR)!);
    expect(actions[0].themeTitle).toBe("Budget");
    expect(actions[1].themeLetter).toBe("B");
  });

  it("renvoie une liste vide quand la réunion n'a produit aucune action", () => {
    const meeting = parseMeeting("## Divers\n\n- (info) Rien à signaler")!;
    expect(meetingActions(meeting)).toEqual([]);
  });
});

describe("countMeetingItems", () => {
  it("compte tous les items, toutes natures confondues", () => {
    expect(countMeetingItems(parseMeeting(CR)!)).toBe(4);
  });
});
