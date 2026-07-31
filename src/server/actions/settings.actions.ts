"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { assert, isAdmin } from "@/lib/policies";
import { instanceSettingsSchema } from "@/lib/validators";
import { saveInstanceSettings } from "@/server/services/settings.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Action RÉGLAGES D'INSTANCE - réservée aux administrateurs.
 *
 * C'est un réglage GLOBAL : il change ce que voient tous les utilisateurs, et
 * jusqu'à l'icône de l'application installée sur leur machine. « L'UI masque, le
 * serveur impose » - la page se cache aux non-administrateurs, cette action le
 * leur refuse.
 */
export async function saveInstanceSettingsAction(
  input: z.input<typeof instanceSettingsSchema>,
): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), "Réglage réservé aux administrateurs.");
    const data = instanceSettingsSchema.parse(input);

    await saveInstanceSettings({
      // La chaîne vide EFFACE (retour à l'environnement, puis au défaut) ; c'est
      // la seule façon de revenir en arrière depuis un formulaire, où l'on vide
      // un champ, on n'y écrit pas « null ».
      instanceLabel: data.label?.trim() || null,
      instanceColor: data.color?.trim() || null,
    });

    // Tout est touché : la pastille vit dans la coque, donc sur chaque page ; le
    // manifeste et les icônes portent le nom et la couleur.
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
