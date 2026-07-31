/**
 * ARTEFACTS laissés par l'éditeur en mise en forme.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA LIGNE VIDE DEVENAIT DU HTML
 *
 * Milkdown tient à conserver les lignes vides que l'on tape, ce que Markdown ne
 * sait pas faire : deux blocs y sont TOUJOURS séparés d'une ligne blanche, il
 * n'existe aucune façon d'en écrire deux. Sa parade est d'écrire une balise à la
 * place :
 *
 *     Un paragraphe.
 *
 *     <br />
 *
 *     Un autre.
 *
 * (`preset-commonmark`, sérialisation du paragraphe : un paragraphe vide qui
 * n'est pas le dernier nœud devient un nœud `html` valant « <br /> ».)
 *
 * Le rendu n'interprétant pas le HTML - c'est ce qui met les pages à l'abri de
 * l'injection -, la balise s'affichait EN TOUTES LETTRES au milieu du texte.
 * Il suffisait d'appuyer deux fois sur Entrée pour en fabriquer une.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ON REMPLACE LA LIGNE, ON NE LA SUPPRIME PAS
 *
 * Le rendu repère les encarts et les ancres du sommaire par NUMÉRO DE LIGNE.
 * Retirer une ligne décalerait tout ce qui suit et déplacerait ces repères d'un
 * cran. La ligne est donc vidée, jamais enlevée : le texte garde exactement
 * autant de lignes qu'avant, et Markdown ignore les lignes blanches en trop.
 */

/**
 * Une ligne qui n'est QU'une balise de saut, PRÉFIXE DE BLOC MIS À PART.
 *
 * Le préfixe compte : dans une citation, la ligne s'écrit « > <br /> », et dans
 * une liste elle porte le marqueur de l'élément. Ne reconnaître que la balise
 * nue laissait donc l'artefact partout où la ligne vide se trouvait dans un
 * bloc - c'est-à-dire, en pratique, dans les encarts.
 *
 * Le « ^…$ » reste essentiel : un `<br>` au milieu d'une cellule de tableau est
 * un usage légitime, et fréquent.
 */
const BREAK_LINE_RE = /^([ \t>]*(?:[-*+] |\d+[.)] )?[ \t]*)<br\s*\/?>[ \t]*$/i;
/** Ouverture ou fermeture d'un bloc de code clôturé. */
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/;

/**
 * Vide les lignes qui ne portent qu'une balise de saut.
 *
 * Appliqué des DEUX côtés : à l'enregistrement, pour ne plus en écrire ; à la
 * lecture, pour que les pages enregistrées avant ce correctif cessent d'en
 * afficher sans qu'il faille les rouvrir une à une.
 */
export function stripEditorArtifacts(markdown: string): string {
  // Sortie immédiate dans le cas courant. Le test doit ignorer la casse comme
  // le fait le motif ci-dessus, sans quoi « <BR/> » échapperait au nettoyage.
  if (!/<br/i.test(markdown)) return markdown;

  let insideFence: string | null = null;
  return markdown
    .split("\n")
    .map((line) => {
      const fence = FENCE_RE.exec(line);
      if (fence) {
        const marker = fence[1][0];
        if (insideFence === null) insideFence = marker;
        else if (insideFence === marker) insideFence = null;
        return line;
      }
      // Dans un bloc de code, « <br /> » est un exemple que l'on montre.
      if (insideFence !== null) return line;

      const found = BREAK_LINE_RE.exec(line);
      if (!found) return line;
      // Le préfixe est RENDU : retirer le « > » d'une citation la couperait en
      // deux, et le marqueur d'un élément de liste ferait de même. Une simple
      // indentation, elle, ne porte rien - une ligne blanche reste blanche.
      return found[1].trim() ? found[1] : "";
    })
    .join("\n");
}
