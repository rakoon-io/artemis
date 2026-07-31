/**
 * Repli du créneau : rien dans la barre du haut.
 *
 * En principe inatteignable - le fourre-tout voisin couvre toutes les routes de
 * l'espace connecté. Next l'exige néanmoins dès qu'un second créneau existe
 * ailleurs dans l'arbre (celui de la fiche de ticket) : sans ce fichier, la
 * compilation s'arrête. On le garde donc, et il dit la même chose que le
 * fourre-tout dirait : hors projet, pas de bandeau.
 */
export default function NoProjectBar() {
  return null;
}
