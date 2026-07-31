import { describe, expect, it } from "vitest";
import { readImageWidth, withImageWidth } from "./wiki-image-size";

describe("readImageWidth", () => {
  it("lit la largeur et rend l'adresse sans elle", () => {
    expect(readImageWidth("/api/wiki-files/abc?w=480")).toEqual({
      src: "/api/wiki-files/abc",
      width: 480,
    });
  });

  it("rend une adresse ordinaire inchangée", () => {
    const src = "/api/wiki-files/abc";
    expect(readImageWidth(src)).toEqual({ src, width: null });
  });

  it("préserve les autres paramètres", () => {
    expect(readImageWidth("/img?v=2&w=300&t=1")).toEqual({
      src: "/img?v=2&t=1",
      width: 300,
    });
  });

  it("préserve le fragment", () => {
    expect(readImageWidth("/img?w=300#haut")).toEqual({
      src: "/img#haut",
      width: 300,
    });
  });

  it("retire une largeur illisible plutôt que de la recopier", () => {
    // La laisser en place l'aurait fait réapparaître à chaque enregistrement.
    expect(readImageWidth("/img?w=beaucoup")).toEqual({ src: "/img", width: null });
  });

  it("refuse les valeurs aberrantes", () => {
    expect(readImageWidth("/img?w=3").width).toBeNull();
    expect(readImageWidth("/img?w=99999").width).toBeNull();
    expect(readImageWidth("/img?w=-40").width).toBeNull();
  });

  it("ne confond pas « w » avec un paramètre qui commence pareil", () => {
    const src = "/img?width=3&wrap=1";
    expect(readImageWidth(src)).toEqual({ src, width: null });
  });

  it("supporte une adresse absolue", () => {
    expect(readImageWidth("https://exemple.fr/a.png?w=120")).toEqual({
      src: "https://exemple.fr/a.png",
      width: 120,
    });
  });
});

describe("withImageWidth", () => {
  it("écrit la largeur", () => {
    expect(withImageWidth("/img", 480)).toBe("/img?w=480");
  });

  it("remplace celle qui s'y trouvait", () => {
    expect(withImageWidth("/img?w=100", 480)).toBe("/img?w=480");
  });

  it("s'ajoute aux paramètres existants", () => {
    expect(withImageWidth("/img?v=2", 480)).toBe("/img?v=2&w=480");
  });

  it("se place avant le fragment", () => {
    expect(withImageWidth("/img#haut", 480)).toBe("/img?w=480#haut");
  });

  it("retire la largeur quand on rend sa taille propre à l'image", () => {
    expect(withImageWidth("/img?w=480", null)).toBe("/img");
    expect(withImageWidth("/img?v=2&w=480", null)).toBe("/img?v=2");
  });

  it("arrondit : un glissement donne des décimales", () => {
    expect(withImageWidth("/img", 480.7)).toBe("/img?w=481");
  });

  it("ignore une valeur aberrante au lieu de l'écrire", () => {
    expect(withImageWidth("/img", 5)).toBe("/img");
    expect(withImageWidth("/img?w=200", 99999)).toBe("/img");
  });

  it("fait l'aller-retour", () => {
    const src = withImageWidth("/api/wiki-files/abc", 512);
    expect(readImageWidth(src)).toEqual({ src: "/api/wiki-files/abc", width: 512 });
  });
});
