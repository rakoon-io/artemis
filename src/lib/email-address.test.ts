import { describe, expect, it } from "vitest";
import { canonicalEmail, emailSchema } from "./email-address";
import {
  adminCreateUserSchema,
  credentialsSchema,
  registerSchema,
} from "./validators";

describe("canonicalEmail", () => {
  it("abaisse la casse", () => {
    expect(canonicalEmail("Admin@Rakoon.IO")).toBe("admin@rakoon.io");
  });

  it("rogne les espaces autour", () => {
    expect(canonicalEmail("  admin@rakoon.io\n")).toBe("admin@rakoon.io");
  });

  it("abaisse aussi la partie locale, et non le seul domaine", () => {
    // Choix assumé : deux comptes pour une même boîte est une faute invisible
    // qui se retourne en usurpation ; refuser une inscription est une gêne
    // visible, qu'un administrateur règle. Cf. l'en-tête du module.
    expect(canonicalEmail("Jean.Dupont@example.com")).toBe(
      "jean.dupont@example.com",
    );
  });

  it("ne touche ni aux points ni au sous-adressage", () => {
    // Ces règles sont propres à certains fournisseurs. Les appliquer à tous
    // fondrait deux adresses légitimement distinctes en un seul compte.
    expect(canonicalEmail("jean+artemis@example.com")).toBe(
      "jean+artemis@example.com",
    );
    expect(canonicalEmail("j.e.a.n@example.com")).toBe("j.e.a.n@example.com");
  });

  it("est idempotente", () => {
    const une = canonicalEmail("  Admin@Rakoon.IO ");
    expect(canonicalEmail(une)).toBe(une);
  });

  it("ne dépend pas de la locale du processus", () => {
    // `toLocaleLowerCase("tr")` transformerait « I » en « ı », un AUTRE
    // caractère : l'identité d'un compte dépendrait alors du serveur qui
    // l'écrit. On veut la même sortie partout.
    expect(canonicalEmail("ILKAY@example.com")).toBe("ilkay@example.com");
  });
});

describe("emailSchema", () => {
  it("canonise avant de valider, et non l'inverse", () => {
    // L'ordre compte : valider d'abord refuserait une saisie entourée
    // d'espaces, que les collages produisent constamment.
    expect(emailSchema.parse("  Admin@Rakoon.IO  ")).toBe("admin@rakoon.io");
  });

  it("refuse toujours ce qui n'est pas une adresse", () => {
    expect(emailSchema.safeParse("pas-une-adresse").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("les schémas qui portent une identité", () => {
  /**
   * LE POINT DE LA MANŒUVRE.
   *
   * Mesuré avant correction : un POST non authentifié sur `/api/register`
   * portant `Admin@Rakoon.io` répondait 201 alors que `admin@rakoon.io`
   * existait - deux comptes, une seule boîte aux lettres, indiscernables dans
   * la liste des membres. Ces trois schémas sont les frontières par lesquelles
   * une adresse entre ; si l'un d'eux laisse passer la casse, le doublon
   * revient.
   */
  it("l'inscription canonise", () => {
    const r = registerSchema.parse({
      name: "Sosie",
      email: "Admin@Rakoon.io",
      password: "motdepasse",
    });
    expect(r.email).toBe("admin@rakoon.io");
  });

  it("la connexion canonise - sinon le titulaire ne se retrouve pas", () => {
    const r = credentialsSchema.parse({
      email: "Admin@Rakoon.io",
      password: "x",
    });
    expect(r.email).toBe("admin@rakoon.io");
  });

  it("la création par un administrateur canonise", () => {
    const r = adminCreateUserSchema.parse({
      name: "Titulaire",
      email: "Nouveau@Rakoon.io",
      role: "REPORTER",
    });
    expect(r.email).toBe("nouveau@rakoon.io");
  });
});
