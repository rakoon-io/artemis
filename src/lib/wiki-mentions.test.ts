import { describe, expect, it } from "vitest";
import {
  rankMentions,
  userLabel,
  userMentionMarkdown,
  type TicketRef,
  type UserRef,
} from "./wiki-mentions";

const t = (key: string, title: string): TicketRef => ({ id: key, key, title });
const u = (name: string | null, email: string): UserRef => ({ id: email, name, email });

const TICKETS = [
  t("QUA-50", "Obtenir les listes de référence EDC"),
  t("QUA-5", "Permettre la saisie de plusieurs diplômes"),
  t("QUA-12", "Éditer le contrat sans perdre Vanessa"),
];
const USERS = [
  u("Vanessa Silva", "vanessa.silva@edcparis.edu"),
  u("Thomas Broussard", "t.broussard@way-up.io"),
  u(null, "gaelle.brune@edcparis.edu"),
];

describe("userLabel", () => {
  it("prend le nom quand il existe", () => {
    expect(userLabel(USERS[0])).toBe("Vanessa Silva");
  });

  it("retombe sur la partie utile de l'adresse", () => {
    expect(userLabel(USERS[2])).toBe("gaelle.brune");
  });
});

describe("userMentionMarkdown", () => {
  it("produit un lien qui se suffit à lui-même", () => {
    expect(userMentionMarkdown(USERS[0])).toBe(
      "[@Vanessa Silva](mailto:vanessa.silva@edcparis.edu)",
    );
  });

  it("échappe ce qui refermerait l'étiquette avant l'heure", () => {
    // Sans cela, le lien s'arrêterait au premier crochet et le reste du nom
    // s'afficherait en toutes lettres, syntaxe comprise.
    const brut = u("Ana [DSI]", "ana@x.io");
    expect(userMentionMarkdown(brut)).toBe("[@Ana \\[DSI\\]](mailto:ana@x.io)");
  });
});

describe("rankMentions", () => {
  it("fait découvrir les deux natures quand rien n'est tapé", () => {
    const r = rankMentions(TICKETS, USERS, "");
    expect(r.slice(0, 3).every((m) => m.kind === "user")).toBe(true);
    expect(r.some((m) => m.kind === "ticket")).toBe(true);
  });

  it("place une personne avant un titre de tâche qui contient le même mot", () => {
    // « Vanessa » figure dans le titre de QUA-12 : le nom doit primer.
    const r = rankMentions(TICKETS, USERS, "vanessa");
    expect(r[0].kind).toBe("user");
  });

  it("laisse la clef de tâche l'emporter", () => {
    const r = rankMentions(TICKETS, USERS, "qua-5");
    expect(r[0]).toMatchObject({ kind: "ticket" });
    expect(r[0].kind === "ticket" && r[0].ticket.key).toBe("QUA-5");
  });

  it("trouve une personne par un mot du milieu de son nom", () => {
    const r = rankMentions(TICKETS, USERS, "silva");
    expect(r[0].kind === "user" && r[0].user.email).toBe("vanessa.silva@edcparis.edu");
  });

  it("trouve une personne sans nom par son adresse", () => {
    const r = rankMentions(TICKETS, USERS, "gaelle");
    expect(r[0].kind === "user" && r[0].user.email).toBe("gaelle.brune@edcparis.edu");
  });

  it("ne propose personne quand aucune personne n'est fournie", () => {
    const r = rankMentions(TICKETS, [], "vanessa");
    expect(r.every((m) => m.kind === "ticket")).toBe(true);
  });
});
