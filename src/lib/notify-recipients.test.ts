import { describe, it, expect } from "vitest";
import { commentRecipients, truncate, type Person } from "./notify-recipients";
import { ticketEmailHtml } from "./email";

const reporter: Person = { id: "rep", email: "rep@rakoon.io", name: "Rem" };
const assignee: Person = { id: "asg", email: "asg@rakoon.io", name: "Ada" };

describe("commentRecipients", () => {
  it("notifie rapporteur et assigne, sauf l'auteur", () => {
    const emails = commentRecipients(reporter, assignee, "someone").map((p) => p.email);
    expect(emails.sort()).toEqual(["asg@rakoon.io", "rep@rakoon.io"]);
  });

  it("exclut l'auteur du commentaire", () => {
    expect(commentRecipients(reporter, assignee, "rep").map((p) => p.id)).toEqual(["asg"]);
    expect(commentRecipients(reporter, assignee, "asg").map((p) => p.id)).toEqual(["rep"]);
  });

  it("deduplique quand rapporteur = assigne", () => {
    expect(commentRecipients(reporter, reporter, "other").map((p) => p.id)).toEqual(["rep"]);
  });

  it("ignore les personnes sans e-mail et les absents", () => {
    const noEmail: Person = { id: "x", email: null, name: "X" };
    expect(commentRecipients(noEmail, null, "other")).toEqual([]);
    expect(commentRecipients(null, assignee, "other").map((p) => p.id)).toEqual(["asg"]);
  });
});

describe("truncate", () => {
  it("laisse un texte court intact", () => {
    expect(truncate("court", 10)).toBe("court");
  });
  it("tronque et ajoute une ellipse", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcde...");
  });
});

describe("ticketEmailHtml", () => {
  it("contient la cle, le titre et le lien", () => {
    const html = ticketEmailHtml({
      heading: "Nouveau commentaire",
      intro: "intro",
      ticketKey: "RKN-3",
      ticketTitle: "Limite de WIP",
      url: "https://artemis.example/projects/RKN/tickets/abc",
    });
    expect(html).toContain("RKN-3");
    expect(html).toContain("Limite de WIP");
    expect(html).toContain("https://artemis.example/projects/RKN/tickets/abc");
    expect(html).toContain("#800020"); // marque Artemis
  });

  it("echappe le HTML et affiche la citation quand fournie", () => {
    const html = ticketEmailHtml({
      heading: "h",
      intro: "i",
      ticketKey: "RKN-1",
      ticketTitle: "<script>",
      url: "https://x/y",
      quote: "a & b <b>",
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("a &amp; b &lt;b&gt;");
    expect(html).toContain("blockquote");
  });
});
