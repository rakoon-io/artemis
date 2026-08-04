"use client";

import { useEffect } from "react";

/**
 * Empêche le NAVIGATEUR d'ouvrir un fichier lâché à côté d'une zone de dépôt.
 *
 * Sans cela, un dépôt manqué de quelques pixels remplace l'application par
 * l'image - et emporte au passage ce qui était en cours d'édition. Le geste est
 * neutralisé pour les seuls glissements de FICHIERS : le reste, y compris le
 * déplacement des cartes du tableau ou d'un bloc dans l'éditeur, ne voit rien.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI IL VIT ICI
 *
 * Il était écrit dans `wiki-attachments.tsx`, où il servait seul. Les pièces
 * jointes d'un ticket ont le même besoin, au pixel près - et une seconde copie
 * aurait été une seconde chose à corriger le jour où l'une se révèle fausse.
 * Ce dépôt a déjà payé ce prix : cinq voies d'écriture, quatre qui vérifiaient
 * le type déclaré, une qui l'avait oublié.
 */
export function useStrayFileDropGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const carriesFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const swallow = (event: DragEvent) => {
      if (carriesFiles(event)) event.preventDefault();
    };
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, [active]);
}
