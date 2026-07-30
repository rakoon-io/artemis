import { describe, expect, it } from "vitest";
import {
  countMeetingItems,
  serializeMeeting,
  formatItemRef,
  meetingActions,
  meetingDraft,
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
    expect(meeting.themes[0].notesBefore).toContain("Un paragraphe de contexte.");
    expect(meeting.themes[0].items).toHaveLength(1);
  });

  it("rattache une ligne indentée à l'item qu'elle prolonge", () => {
    const meeting = parseMeeting(
      "## Budget\n\n- (action) Relancer le prestataire\n  sur le devis de janvier.",
    )!;
    expect(meeting.themes[0].items[0].text).toBe(
      "Relancer le prestataire sur le devis de janvier.",
    );
    expect(meeting.themes[0].notesAfter).not.toContain("janvier");
  });

  it("traite les titres plus profonds comme du contenu, non comme des thèmes", () => {
    const meeting = parseMeeting(
      "## Budget\n\n### Détail\n\n- (info) Validé\n\n## Recrutement\n\n- (info) En cours",
    )!;
    expect(meeting.themes.map((t) => t.title)).toEqual(["Budget", "Recrutement"]);
    expect(meeting.themes[0].notesBefore).toContain("### Détail");
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
    expect(meeting.themes[0].notesBefore).toBe("Rien à signaler.");
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

describe("serializeMeeting", () => {
  it("réécrit un compte rendu à l'identique après relecture", () => {
    // LA propriété qui autorise l'édition graphique : réécrire toute la page à
    // chaque enregistrement ne doit rien déplacer ni rien perdre.
    const once = parseMeeting(CR)!;
    const twice = parseMeeting(serializeMeeting(once))!;
    expect(twice).toEqual(once);
  });

  it("conserve le préambule et les notes, avant comme après la liste", () => {
    const source = [
      "Ordre du jour.",
      "",
      "## Budget",
      "",
      "Un paragraphe de contexte.",
      "",
      "- (info) Validé",
      "",
      "Une remarque de fin.",
    ].join("\n");
    const parsed = parseMeeting(source)!;
    const rewritten = parseMeeting(serializeMeeting(parsed))!;
    expect(rewritten.preamble).toBe("Ordre du jour.");
    expect(rewritten.themes[0].notesBefore).toBe("Un paragraphe de contexte.");
    expect(rewritten.themes[0].notesAfter).toBe("Une remarque de fin.");
  });

  it("écrit la nature de chaque point explicitement", () => {
    // Y compris « (info) », que l'analyseur déduirait : le Markdown reste ainsi
    // auto-descriptif pour qui le rouvre dans un éditeur de texte.
    const out = serializeMeeting(parseMeeting(CR)!);
    expect(out).toContain("- (info) Le budget 2026 est validé.");
    expect(out).toContain("- (action) Relancer le prestataire sur le devis.");
  });

  it("n'écrit ni lettre ni référence : elles se déduisent de la position", () => {
    const out = serializeMeeting(parseMeeting(CR)!);
    expect(out).not.toContain("A-01");
    expect(out).not.toContain("A.");
  });

  it("respecte le niveau de titre d'origine", () => {
    const parsed = parseMeeting("### Budget\n\n- (info) Validé")!;
    expect(serializeMeeting(parsed)).toContain("### Budget");
  });

  it("ignore un point vidé de son texte", () => {
    const parsed = parseMeeting("## Budget\n\n- (info) Validé")!;
    parsed.themes[0].items.push({ ref: "A-02", kind: "action", text: "   " });
    expect(serializeMeeting(parsed)).toBe("## Budget\n\n- (info) Validé");
  });

  it("réordonner les thèmes renumérote les références", () => {
    const parsed = parseMeeting(CR)!;
    parsed.themes.reverse();
    const again = parseMeeting(serializeMeeting(parsed))!;
    expect(again.themes[0].title).toBe("Recrutement");
    expect(again.themes[0].items[0].ref).toBe("A-01");
  });
});

describe("meetingDraft — l'éditeur ne perd jamais ce qu'il n'a pas su relire", () => {
  it("garde en préambule une page sans aucun titre de thème", () => {
    const page = "**Présents :** Alice, Bob\n\n**Ordre du jour :** budget";
    const draft = meetingDraft(page);
    expect(draft.themes).toEqual([]);
    expect(draft.preamble).toBe(page);
  });

  it("réécrit cette page à l'identique : enregistrer n'efface rien", () => {
    // La régression que ce test verrouille : `parseMeeting` rendant `null`,
    // l'éditeur repartait d'un préambule vide et réécrivait la page en chaîne
    // vide. Un seul clic sur « Enregistrer » suffisait à tout perdre.
    const page = "**Présents :**\n\n**Ordre du jour :**";
    expect(serializeMeeting(meetingDraft(page))).toBe(page);
  });

  it("laisse intacte une page qui a bien des thèmes", () => {
    const draft = meetingDraft(CR);
    expect(draft.themes.length).toBe(parseMeeting(CR)!.themes.length);
    expect(draft.preamble).toBe(parseMeeting(CR)!.preamble);
  });

  it("rend un brouillon vide, jamais nul, sur une page vide", () => {
    expect(meetingDraft("")).toEqual({ preamble: "", themes: [], headingLevel: 2 });
    expect(meetingDraft(null)).toEqual({ preamble: "", themes: [], headingLevel: 2 });
  });

  it("propose le niveau 2 par défaut, comme le reste du wiki", () => {
    expect(meetingDraft("du texte").headingLevel).toBe(2);
  });
});

describe("point sur plusieurs lignes", () => {
  // Depuis que la touche Entrée saute une ligne dans l'éditeur, un point
  // multiligne est le cas ORDINAIRE. Il l'était si peu auparavant que la
  // réécriture posait la deuxième ligne sans indentation : à la relecture,
  // elle quittait le point et se retrouvait en texte libre du thème.
  const md =
    "## Budget\n\n- (info) Le budget est validé.\n- (action) Relancer le prestataire\\\n  avant vendredi.";

  it("la suite reste dans le point, et n'échoue pas en note", () => {
    const theme = parseMeeting(md)!.themes[0];
    expect(theme.items).toHaveLength(2);
    expect(theme.items[1].text).toBe("Relancer le prestataire\navant vendredi.");
    expect(theme.notesAfter).toBe("");
  });

  it("l'aller-retour rend exactement le même Markdown", () => {
    expect(serializeMeeting(parseMeeting(md)!)).toBe(md);
  });

  it("le saut de ligne saisi survit à l'enregistrement", () => {
    const written = serializeMeeting({
      preamble: "",
      headingLevel: 2,
      themes: [
        {
          letter: "A",
          title: "Budget",
          notesBefore: "",
          notesAfter: "",
          items: [
            { ref: "A-01", kind: "action", text: "Relancer le prestataire\navant vendredi." },
          ],
        },
      ],
    });
    expect(parseMeeting(written)!.themes[0].items[0].text).toBe(
      "Relancer le prestataire\navant vendredi.",
    );
  });

  it("un simple repli de ligne reste recollé par une espace", () => {
    // Sans antislash, Markdown ne voit qu'un paragraphe replié : c'est une
    // espace, et une page écrite à la main doit continuer de se lire ainsi.
    const plie = "## Budget\n\n- (info) Une phrase\n  qui continue.";
    expect(parseMeeting(plie)!.themes[0].items[0].text).toBe("Une phrase qui continue.");
  });

  it("un point vidé ne décale plus la nature des suivants", () => {
    const written = serializeMeeting({
      preamble: "",
      headingLevel: 2,
      themes: [
        {
          letter: "A",
          title: "Budget",
          notesBefore: "",
          notesAfter: "",
          items: [
            { ref: "A-01", kind: "info", text: "   " },
            { ref: "A-02", kind: "action", text: "Relancer." },
          ],
        },
      ],
    });
    expect(written).toContain("- (action) Relancer.");
    expect(written).not.toContain("- (info) Relancer.");
  });
});
