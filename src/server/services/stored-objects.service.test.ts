import { afterEach, describe, expect, it, vi } from "vitest";
import { forgetObjects } from "./stored-objects.service";

describe("forgetObjects", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("efface chaque clé", async () => {
    const vues: string[] = [];
    await forgetObjects(["a", "b", "c"], async (k) => {
      vues.push(k);
    });
    expect(vues).toEqual(["a", "b", "c"]);
  });

  it("ne touche à rien quand il n'y a rien à effacer", async () => {
    const effacer = vi.fn(async () => {});
    await forgetObjects([], effacer);
    expect(effacer).not.toHaveBeenCalled();
  });

  it("NE LÈVE PAS quand le stockage refuse", async () => {
    /**
     * Le point de tout le module. La suppression en base a déjà eu lieu quand
     * on arrive ici : lever ferait afficher « échec » sur une opération
     * accomplie, et inviterait à réessayer une suppression qui n'a plus rien à
     * supprimer. Passer de `allSettled` à `all` suffirait à rompre cela.
     */
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      forgetObjects(["a"], async () => {
        throw new Error("seau injoignable");
      }),
    ).resolves.toBeUndefined();
  });

  it("continue après un échec, au lieu de s'arrêter au premier", async () => {
    // Un objet récalcitrant ne doit pas mettre les suivants à l'abri : chacun
    // laissé en place est un document qu'on a promis d'avoir effacé.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const effaces: string[] = [];
    await forgetObjects(["a", "b", "c"], async (k) => {
      if (k === "a") throw new Error("refus");
      effaces.push(k);
    });
    expect(effaces).toEqual(["b", "c"]);
  });

  it("journalise la clé restée en place, et non le seul décompte", async () => {
    // Sans la clé, l'objet est introuvable : la ligne qui le désignait vient
    // d'être supprimée, et plus rien au monde ne dit qu'il existe.
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    await forgetObjects(["wiki/p1/abc-secret.pdf"], async () => {
      throw new Error("refus");
    });
    expect(journal).toHaveBeenCalledWith(
      expect.stringContaining("wiki/p1/abc-secret.pdf"),
      expect.anything(),
    );
  });
});
