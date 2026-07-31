"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { saveInstanceSettingsAction } from "@/server/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_LABEL } from "@/lib/instance";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * RÉGLAGE DE L'APPARENCE DE L'INSTANCE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ON VOIT CE QU'ON RÈGLE
 *
 * L'aperçu est peint ICI, en direct, avec les valeurs saisies - et non recopié
 * de l'icône engendrée. Attendre l'enregistrement pour découvrir une couleur
 * illisible obligerait à un aller-retour par essai ; or on choisit une couleur à
 * l'œil, pas en lisant un code hexadécimal.
 *
 * L'aperçu reste une IMITATION, à dessein : dessiner l'icône réelle supposerait
 * de rejouer le moteur d'images dans le navigateur. Il en rend la disposition -
 * dégradé, emblème, bande d'étiquette -, ce qui suffit à juger la lisibilité.
 * L'icône véritable est affichée à côté, telle qu'elle est servie.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN CHAMP VIDE N'EST PAS UNE ABSENCE DE CHOIX
 *
 * Vider un champ REND LA MAIN à l'environnement, puis au défaut. C'est le seul
 * geste possible dans un formulaire pour dire « je n'impose rien » - on ne peut
 * pas y écrire « null ». Les mentions sous les champs disent ce qui prendra le
 * relais, faute de quoi vider un champ serait un saut dans le vide.
 */
export function InstanceSettingsForm({
  label: labelInitial,
  color: colorInitial,
  fallbackLabel,
  fallbackColor,
  token,
  envLabel,
  envColor,
}: {
  /** Ce qui est ENREGISTRÉ ; vide si rien n'a jamais été réglé ici. */
  label: string;
  color: string;
  /** Ce qui prendrait le relais si l'on vidait le champ. */
  fallbackLabel: string | null;
  fallbackColor: string;
  token: string;
  /** Valeurs venues de l'environnement, pour le dire dans les mentions. */
  envLabel: string | null;
  envColor: string | null;
}) {
  const t = useDict();
  const router = useRouter();
  const [label, setLabel] = useState(labelInitial);
  const [color, setColor] = useState(colorInitial);
  const [pending, setPending] = useState(false);

  const valide = color === "" || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
  /**
   * L'aperçu montre CE QUI S'APPLIQUERA si l'on enregistre maintenant - et non
   * ce qui s'applique en ce moment. Un champ qu'on vide doit donc y faire
   * apparaître le relais, sans quoi l'aperçu contredirait la mention posée
   * juste en dessous.
   *
   * Une couleur en cours de frappe est ignorée tant qu'elle est incomplète :
   * l'aperçu retombe sur le relais plutôt que de clignoter en noir à chaque
   * caractère.
   */
  const apercuColor = valide && color ? color : fallbackColor;
  const apercuLabel = label.trim() || (fallbackLabel ?? "");

  async function submit() {
    setPending(true);
    const res = await saveInstanceSettingsAction({ label, color });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.admin.instance.saved);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="instance-label">{t.admin.instance.labelField}</Label>
            <Input
              id="instance-label"
              value={label}
              maxLength={MAX_LABEL}
              placeholder={t.admin.instance.labelPlaceholder}
              onChange={(e) => setLabel(e.target.value)}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              {envLabel
                ? fmt(t.admin.instance.labelInherited, { value: envLabel })
                : t.admin.instance.labelHint}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instance-color">{t.admin.instance.colorField}</Label>
            <div className="flex items-center gap-2">
              {/* Le sélecteur natif et le champ texte écrivent la MÊME valeur :
                  on choisit à l'œil, ou l'on colle un code de charte. */}
              <Input
                type="color"
                aria-label={t.admin.instance.colorField}
                value={apercuColor}
                onChange={(e) => setColor(e.target.value)}
                disabled={pending}
                className="h-9 w-14 shrink-0 p-1"
              />
              <Input
                id="instance-color"
                value={color}
                placeholder={t.admin.instance.colorPlaceholder}
                onChange={(e) => setColor(e.target.value)}
                disabled={pending}
                aria-invalid={!valide}
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {!valide
                ? t.admin.instance.colorInvalid
                : envColor
                  ? fmt(t.admin.instance.colorInherited, { value: envColor })
                  : t.admin.instance.colorHint}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2">
          <Apercu color={apercuColor} label={apercuLabel} />
          <span className="text-xs text-muted-foreground">
            {t.admin.instance.preview}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2">
          {/* L'icône RÉELLE, telle qu'elle est servie - le jeton garantit qu'on
              ne regarde pas une version mise en cache. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/icons/192?v=${token}`}
            alt=""
            width={72}
            height={72}
            className="rounded-2xl"
          />
          <span className="text-xs text-muted-foreground">
            {t.admin.instance.current}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending || !valide} onClick={() => void submit()}>
          {pending && <Loader2 className="animate-spin" />}
          {t.common.save}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t.admin.instance.installedHint}
        </p>
      </div>
    </div>
  );
}

/** Imitation de l'icône, peinte avec les valeurs en cours de saisie. */
function Apercu({ color, label }: { color: string; label: string }) {
  return (
    <div
      className="relative flex size-[72px] items-center justify-center overflow-hidden rounded-2xl"
      style={{
        backgroundImage: `linear-gradient(135deg, ${assombrir(color, 0.22)}, ${color})`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden
        className="size-[62%] text-white"
        style={{ marginTop: label ? -9 : 0 }}
      >
        <path
          d="M50.31 13.66 A26 26 0 1 1 86.34 49.69 A27 27 0 0 0 50.31 13.66 Z"
          fill="currentColor"
        />
        <g
          transform="rotate(-45 50 50)"
          stroke="currentColor"
          strokeWidth={8.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M38 20 Q62 50 38 80" />
          <path d="M38 20 L28 50 L38 80" />
          <path d="M24 50 H72" />
          <path d="M63 43 L76 50 L63 57" />
          <path d="M24 50 L33 44" />
          <path d="M24 50 L33 56" />
        </g>
      </svg>
      {label && (
        <span className="absolute inset-x-0 bottom-0 flex h-[26%] items-center justify-center truncate bg-black/40 px-1 text-[9px] font-bold uppercase leading-none text-white">
          {label}
        </span>
      )}
    </div>
  );
}

/** Même assombrissement que l'icône servie, pour que l'aperçu ne mente pas. */
function assombrir(hex: string, part: number): string {
  const plein =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const canaux = [1, 3, 5].map((i) =>
    Math.round(parseInt(plein.slice(i, i + 2), 16) * (1 - part)),
  );
  return `#${canaux.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
