import { describe, expect, it } from "vitest";
import { declaredTooLarge, keyLooksIssued } from "./upload-guard";

const requete = (contentLength?: string) =>
  new Request("http://x/", {
    method: "PUT",
    headers: contentLength ? { "content-length": contentLength } : {},
  });

describe("declaredTooLarge", () => {
  it("refuse sur la taille ANNONCÉE, sans lire le corps", () => {
    expect(declaredTooLarge(requete("999999999"), 10_000)).toBe(true);
  });

  it("laisse passer ce qui tient dans le plafond", () => {
    expect(declaredTooLarge(requete("5000"), 10_000)).toBe(false);
  });

  it("ne bloque pas en l'absence d'annonce - le contrôle réel suit", () => {
    // Sans en-tête, `Number(null)` vaut 0 : on ne doit pas refuser à tort.
    expect(declaredTooLarge(requete(), 10_000)).toBe(false);
  });

  it("ignore une annonce illisible plutôt que de s'y fier", () => {
    expect(declaredTooLarge(requete("beaucoup"), 10_000)).toBe(false);
  });
});

describe("keyLooksIssued", () => {
  const bonne = "attachments/tick123/a1b2c3d4e5f6-photo.png";

  it("accepte une clé de la forme émise par le serveur", () => {
    expect(keyLooksIssued(bonne, "attachments", "tick123")).toBe(true);
  });

  it("refuse une clé qui prétend appartenir à un autre ticket", () => {
    expect(keyLooksIssued(bonne, "attachments", "autre")).toBe(false);
  });

  it("refuse le franchissement d'espace de nommage", () => {
    expect(keyLooksIssued(bonne, "wiki", "tick123")).toBe(false);
  });

  it("refuse une clé sans troisième segment - c'est elle qui enlisait le dossier", () => {
    expect(keyLooksIssued("attachments/tick123", "attachments", "tick123")).toBe(false);
  });

  it("refuse un segment supplémentaire", () => {
    expect(
      keyLooksIssued("attachments/tick123/x/a1b2c3d4e5f6-p.png", "attachments", "tick123"),
    ).toBe(false);
  });

  it("refuse un nom sans le préfixe aléatoire : c'est lui qui empêche de deviner", () => {
    expect(keyLooksIssued("attachments/tick123/photo.png", "attachments", "tick123")).toBe(false);
  });

  it("refuse une remontée de chemin", () => {
    expect(keyLooksIssued("attachments/../etc/passwd", "attachments", "..")).toBe(false);
  });
});
